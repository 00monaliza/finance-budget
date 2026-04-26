import type { BudgetContext } from '@/shared/types/budget-context';
import { env } from '@/shared/config/env';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_CANDIDATES = [
  env.GEMINI_MODEL || 'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
];

function mapGeminiError(status: number): string {
  if (status === 429) {
    return 'Превышен лимит Gemini API (429). Для выбранной модели квота исчерпана; попробуйте позже или смените модель/план.';
  }
  if (status === 401 || status === 403) {
    return 'Ключ Gemini недействителен или ограничен. Проверьте VITE_GEMINI_API_KEY и настройки API key.';
  }
  if (status === 503) {
    return 'Модель Gemini временно перегружена (503). Попробуйте повторить запрос через несколько секунд.';
  }
  if (status >= 500) {
    return 'Сервис Gemini временно недоступен. Попробуйте снова позже.';
  }
  return 'Не удалось получить ответ от AI. Попробуйте повторить запрос.';
}

interface GeminiCallOptions {
  maxOutputTokens: number;
  temperature?: number;
  responseMimeType?: 'text/plain' | 'application/json';
}

async function callGemini(prompt: string, options: GeminiCallOptions | number): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    return 'Не задан VITE_GEMINI_API_KEY в .env.local.';
  }

  const opts: GeminiCallOptions = typeof options === 'number'
    ? { maxOutputTokens: options }
    : options;

  try {
    let lastStatus = 0;
    const uniqueModels = Array.from(new Set(MODEL_CANDIDATES));

    for (const model of uniqueModels) {
      const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: opts.maxOutputTokens,
            ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
            ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'AI вернул пустой ответ. Попробуйте уточнить запрос.';
      }

      lastStatus = response.status;
      if (response.status !== 429 && response.status !== 503) {
        return mapGeminiError(response.status);
      }
    }

    return mapGeminiError(lastStatus || 429);
  } catch {
    return 'Сетевая ошибка при обращении к Gemini. Проверьте интернет и доступ к API.';
  }
}

export const FINANCE_SYSTEM_PROMPT = `
Ты — персональный финансовый советник FinanceAI.
Отвечай на русском языке, кратко и конкретно (2-4 предложения).
Используй данные бюджета пользователя для точных советов.
Всегда упоминай конкретные цифры из предоставленных данных.
Валюта — казахстанский тенге (₸).
Не давай общих советов — только на основе реальных цифр пользователя.
`.trim();

export async function askAI(
  question: string,
  budgetContext: BudgetContext
): Promise<string> {
  return callGemini(
    `${FINANCE_SYSTEM_PROMPT}\n\nДанные бюджета:\n${JSON.stringify(budgetContext, null, 2)}\n\nВопрос: ${question}`,
    1000,
  );
}

export async function autoCategorize(
  description: string,
  categories: Array<{ id: string; name_ru: string }>
): Promise<string> {
  const result = await callGemini(
    `Верни ТОЛЬКО id категории из списка. Без объяснений.\nКатегории: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name_ru })))}\nТранзакция: "${description}"\nid категории:`,
    50,
  );

  if (result.includes('лимит') || result.includes('Ключ Gemini') || result.includes('Сетевая ошибка')) {
    return '';
  }

  return result.trim();
}

type CommandTransaction = {
  type?: 'income' | 'expense' | 'transfer';
  amount?: number;
  description?: string;
  date?: string;
  account?: 'main' | 'kaspi' | 'cash';
  category_id?: string;
  category_name?: string;
};

type CommandDeleteTransaction = {
  scope?: 'last' | 'last_expense' | 'last_income';
};

type CommandBudgetLimit = {
  limit_amount?: number;
  category_id?: string;
  category_name?: string;
  period?: 'month' | 'week' | 'year';
  year?: number;
  month?: number;
};

type CommandGoal = {
  name?: string;
  target_amount?: number;
  current_amount?: number;
  deadline?: string;
  icon?: string;
  color?: string;
};

export type ChatCommandIntent = {
  intent:
    | 'none'
    | 'open_management'
    | 'create_transaction'
    | 'delete_last_transaction'
    | 'update_budget_limit'
    | 'create_goal'
    | 'show_commands_help';
  reply?: string;
  transaction?: CommandTransaction;
  delete_transaction?: CommandDeleteTransaction;
  budget?: CommandBudgetLimit;
  goal?: CommandGoal;
};

function safeParseIntent(raw: string): ChatCommandIntent {
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start < 0 || end <= start) {
    return { intent: 'none' };
  }

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<ChatCommandIntent>;

    if (!parsed.intent || ![
      'none',
      'open_management',
      'create_transaction',
      'delete_last_transaction',
      'update_budget_limit',
      'create_goal',
      'show_commands_help',
    ].includes(parsed.intent)) {
      return { intent: 'none' };
    }

    return {
      intent: parsed.intent,
      reply: typeof parsed.reply === 'string' ? parsed.reply : undefined,
      transaction: parsed.transaction,
      delete_transaction: parsed.delete_transaction,
      budget: parsed.budget,
      goal: parsed.goal,
    };
  } catch {
    return { intent: 'none' };
  }
}

// Keyword pre-filter: if message contains an action verb, force command routing.
// Note: \b doesn't work for Cyrillic in JS regex, so we use (?:^|\s|,) boundaries.
const COMMAND_PATTERNS: Array<{ re: RegExp; intent: ChatCommandIntent['intent'] }> = [
  { re: /(создай|создать|добавь|добавить|запиши|записать).{0,60}(цель|накопл|копил)/i, intent: 'create_goal' },
  { re: /(цель|накопл|копил).{0,60}(создай|создать|добавь|добавить)/i, intent: 'create_goal' },
  { re: /(создай|создать|добавь|добавить|запиши|записать).{0,40}(расход|трату|трат|покупк)/i, intent: 'create_transaction' },
  { re: /(создай|создать|добавь|добавить|запиши|записать).{0,40}(доход|зарплат|поступлен)/i, intent: 'create_transaction' },
  { re: /(потратил|заплатил|купил|получил).{0,60}\d/i, intent: 'create_transaction' },
  { re: /(удали|удалить|отмени|отменить|убери|убрать).{0,40}(транзакци|расход|операци|запис)/i, intent: 'delete_last_transaction' },
  { re: /(поставь|поставить|установи|установить|измени|изменить|обнови|обновить).{0,40}(лимит|бюджет)/i, intent: 'update_budget_limit' },
  { re: /(лимит).{0,10}(поставь|поставить|установи|установить|изменить)/i, intent: 'update_budget_limit' },
  { re: /(открой|открыть|перейди|перейти).{0,30}(управлен|транзакци|операци)/i, intent: 'open_management' },
  { re: /(что ты умеешь|какие команды|справк|помощ|help)/i, intent: 'show_commands_help' },
];

function localPreFilter(message: string): ChatCommandIntent['intent'] | null {
  const lower = message.toLowerCase();
  for (const { re, intent } of COMMAND_PATTERNS) {
    if (re.test(lower)) return intent;
  }
  return null;
}

const CURRENT_YEAR = new Date().getFullYear();

export async function detectChatIntent(
  message: string,
  options: {
    categories: Array<{ id: string; name_ru: string; type: 'income' | 'expense' | 'both' }>;
  }
): Promise<ChatCommandIntent> {
  const preFilterHint = localPreFilter(message);

  const prompt = [
    'Ты — строгий парсер команд. Верни ТОЛЬКО валидный JSON, без пояснений, без markdown.',
    '',
    'ПРАВИЛО: Если сообщение содержит глагол действия (создай, добавь, удали, поставь, измени, открой) — это КОМАНДА. Игнорируй весь лишний контекст (зарплаты, советы, объяснения) — извлекай только параметры команды.',
    preFilterHint ? `ПОДСКАЗКА СИСТЕМЫ: intent=${preFilterHint} (используй если сомневаешься)` : '',
    '',
    'JSON-схема ответа:',
    '{"intent":"<intent>","goal"?:{...},"transaction"?:{...},"delete_transaction"?:{...},"budget"?:{...},"reply"?:"<string>"}',
    '',
    'intent = none | create_goal | create_transaction | delete_last_transaction | update_budget_limit | open_management | show_commands_help',
    'create_goal → goal: { name:string, target_amount:number, current_amount?:number, deadline?:"YYYY-MM-DD", icon?:string, color?:string }',
    'create_transaction → transaction: { type:"income"|"expense"|"transfer", amount:number, description?:string, date?:"YYYY-MM-DD", account?:"main"|"kaspi"|"cash", category_id?:string, category_name?:string }',
    'delete_last_transaction → delete_transaction: { scope:"last"|"last_expense"|"last_income" }',
    'update_budget_limit → budget: { limit_amount:number, category_name?:string, category_id?:string, period?:"month"|"week"|"year", year?:number, month?:number }',
    '',
    `Текущий год: ${CURRENT_YEAR}. Месяцы: январь=01 февраль=02 март=03 апрель=04 май=05 июнь=06 июль=07 август=08 сентябрь=09 октябрь=10 ноябрь=11 декабрь=12.`,
    `Категории: ${JSON.stringify(options.categories)}`,
    '',
    'Примеры:',
    `Вход: "создай цель накопить на жильё 3 млн до 9 октября этого года" → {"intent":"create_goal","goal":{"name":"Жильё","target_amount":3000000,"deadline":"${CURRENT_YEAR}-10-09"}}`,
    `Вход: "добавь расход 4500 такси" → {"intent":"create_transaction","transaction":{"type":"expense","amount":4500,"description":"такси"}}`,
    `Вход: "удали последний расход" → {"intent":"delete_last_transaction","delete_transaction":{"scope":"last_expense"}}`,
    `Вход: "поставь лимит 50000 на еду" → {"intent":"update_budget_limit","budget":{"limit_amount":50000,"category_name":"еда"}}`,
    '',
    `Вход: "${message}"`,
  ].filter(Boolean).join('\n');

  const response = await callGemini(prompt, {
    maxOutputTokens: 400,
    temperature: 0,
    responseMimeType: 'application/json',
  });

  if (
    response.includes('лимит Gemini')
    || response.includes('Ключ Gemini')
    || response.includes('Сетевая ошибка')
    || response.includes('Не задан VITE_GEMINI_API_KEY')
  ) {
    return { intent: 'none' };
  }

  const parsed = safeParseIntent(response);

  // If Gemini still returned none but local pre-filter detected a command — trust the filter
  if (parsed.intent === 'none' && preFilterHint && preFilterHint !== 'none') {
    return { intent: preFilterHint };
  }

  return parsed;
}
