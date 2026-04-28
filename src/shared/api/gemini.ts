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
  systemInstruction?: string;
  retries?: number;
  timeoutMs?: number;
}

const TRANSIENT_STATUSES = new Set([429, 503]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isGeminiErrorText(text: string): boolean {
  return [
    'лимит Gemini',
    'Ключ Gemini',
    'Сетевая ошибка',
    'Не задан VITE_GEMINI_API_KEY',
    'Превышено время ожидания',
    'AI вернул пустой ответ',
    'временно недоступен',
    'временно перегружен',
  ].some((marker) => text.includes(marker));
}

function extractGeminiText(data: unknown): string {
  const candidate = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates?.[0];

  if (!candidate?.content?.parts?.length) {
    return 'AI вернул пустой ответ. Попробуйте уточнить запрос.';
  }

  return candidate.content.parts
    .map((part) => part.text ?? '')
    .join('')
    .trim() || 'AI вернул пустой ответ. Попробуйте уточнить запрос.';
}

async function callGemini(prompt: string, options: GeminiCallOptions | number): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    return 'Не задан VITE_GEMINI_API_KEY в .env.local.';
  }

  const opts: GeminiCallOptions = typeof options === 'number'
    ? { maxOutputTokens: options }
    : options;
  const retries = Math.max(0, opts.retries ?? 1);
  const timeoutMs = Math.max(2_000, opts.timeoutMs ?? 15_000);

  try {
    let lastStatus = 0;
    const uniqueModels = Array.from(new Set(MODEL_CANDIDATES));

    for (const model of uniqueModels) {
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              ...(opts.systemInstruction
                ? { systemInstruction: { parts: [{ text: opts.systemInstruction }] } }
                : {}),
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
            return extractGeminiText(data);
          }

          lastStatus = response.status;
          if (!TRANSIENT_STATUSES.has(response.status)) {
            return mapGeminiError(response.status);
          }

          const isLastAttempt = attempt === retries;
          if (!isLastAttempt) {
            await delay(250 * (attempt + 1));
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            throw error;
          }
          if (attempt === retries) {
            return 'Превышено время ожидания ответа от AI. Попробуйте сократить запрос.';
          }
        } finally {
          clearTimeout(timeout);
        }
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

const FINANCE_ANSWER_FORMAT_PROMPT = `
Формат ответа:
1) Короткий вывод по ситуации (1 предложение).
2) Два конкретных шага с ожидаемым эффектом в ₸.
3) Один риск/предупреждение, если это актуально.
Если данных недостаточно — задай 1 уточняющий вопрос вместо домыслов.
`.trim();

export async function askAI(
  question: string,
  budgetContext: BudgetContext
): Promise<string> {
  return callGemini(
    `Данные бюджета:\n${JSON.stringify(budgetContext, null, 2)}\n\nВопрос пользователя: ${question}`,
    {
      maxOutputTokens: 1000,
      temperature: 0.3,
      systemInstruction: `${FINANCE_SYSTEM_PROMPT}\n\n${FINANCE_ANSWER_FORMAT_PROMPT}`,
      retries: 1,
    },
  );
}

export async function autoCategorize(
  description: string,
  categories: Array<{ id: string; name_ru: string }>
): Promise<string> {
  const categoryList = categories.map((c) => ({ id: c.id, name: c.name_ru }));
  const result = await callGemini(
    [
      'Верни только JSON без markdown.',
      'Строго формат: {"category_id":"<id или empty>"}',
      'Если не уверен — верни {"category_id":"empty"}.',
      `Категории: ${JSON.stringify(categoryList)}`,
      `Транзакция: "${description}"`,
    ].join('\n'),
    {
      maxOutputTokens: 80,
      temperature: 0,
      responseMimeType: 'application/json',
      retries: 1,
    },
  );

  if (isGeminiErrorText(result)) {
    return '';
  }

  try {
    const parsed = JSON.parse(result) as { category_id?: string };
    if (!parsed.category_id || parsed.category_id === 'empty') {
      return '';
    }
    return categories.some((c) => c.id === parsed.category_id) ? parsed.category_id : '';
  } catch {
    const fallbackId = result.trim();
    return categories.some((c) => c.id === fallbackId) ? fallbackId : '';
  }
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

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/\s/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

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

    const transaction = parsed.transaction && typeof parsed.transaction === 'object'
      ? {
        ...parsed.transaction,
        amount: toNumber((parsed.transaction as { amount?: unknown }).amount),
      }
      : undefined;

    const budget = parsed.budget && typeof parsed.budget === 'object'
      ? {
        ...parsed.budget,
        limit_amount: toNumber((parsed.budget as { limit_amount?: unknown }).limit_amount),
      }
      : undefined;

    const goal = parsed.goal && typeof parsed.goal === 'object'
      ? {
        ...parsed.goal,
        target_amount: toNumber((parsed.goal as { target_amount?: unknown }).target_amount),
        current_amount: toNumber((parsed.goal as { current_amount?: unknown }).current_amount),
      }
      : undefined;

    return {
      intent: parsed.intent,
      reply: typeof parsed.reply === 'string' ? parsed.reply : undefined,
      transaction,
      delete_transaction: parsed.delete_transaction,
      budget,
      goal,
    };
  } catch {
    return { intent: 'none' };
  }
}

export type ParsedImportTransaction = {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
};

export async function parseFileWithGemini(file: File): Promise<ParsedImportTransaction[]> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Не задан VITE_GEMINI_API_KEY в .env.local.');
  }

  const arrayBuffer = await file.arrayBuffer();
  // Use Uint8Array chunks to avoid call stack overflow on large files
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  const base64 = btoa(chunks.join(''));
  const mimeType = file.type || 'application/octet-stream';

  const today = new Date().toISOString().split('T')[0];
  const prompt = [
    'Извлеки все финансовые транзакции из этого документа (банковская выписка).',
    'Верни ТОЛЬКО валидный JSON массив без markdown и пояснений.',
    `Формат каждого элемента: {"date":"YYYY-MM-DD","description":"строка","amount":число,"type":"income" или "expense"}`,
    'amount — всегда положительное число. type: income (поступление/зачисление) или expense (расход/списание/оплата).',
    `Если дата не указана, используй ${today}. Если транзакций нет — верни [].`,
  ].join('\n');

  const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: prompt },
            ],
          }],
          // responseMimeType omitted — incompatible with multimodal (inline_data) requests
          generationConfig: { maxOutputTokens: 4000, temperature: 0 },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      const apiMsg = errBody?.error?.message;
      throw new Error(apiMsg ?? mapGeminiError(response.status));
    }

    const data = await response.json();
    const text = extractGeminiText(data);
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start < 0 || end <= start) return [];

    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown[];
    return (parsed as Record<string, unknown>[])
      .filter(item => typeof item === 'object' && item !== null)
      .map(item => ({
        date: typeof item['date'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item['date'] as string)
          ? (item['date'] as string)
          : today,
        description: typeof item['description'] === 'string' ? (item['description'] as string) : '',
        amount: typeof item['amount'] === 'number' ? Math.abs(item['amount'] as number) : 0,
        type: (item['type'] === 'income' ? 'income' : 'expense') as 'income' | 'expense',
      }))
      .filter(item => item.amount > 0);
  } finally {
    clearTimeout(timer);
  }
}

const COMMAND_PATTERNS: Array<{ re: RegExp; intent: ChatCommandIntent['intent'] }> = [
  { re: /(создай|создать|добавь|добавить|запиши|записать).{0,60}(цель|накопл|копил)/i, intent: 'create_goal' },
  { re: /(цель|накопл|копил).{0,60}(создай|создать|добавь|добавить)/i, intent: 'create_goal' },
  { re: /(создай|создать|добавь|добавить|установи|установить|поставь|поставить).{0,50}(бюджет)/i, intent: 'update_budget_limit' },
  { re: /(бюджет).{0,50}(создай|создать|добавь|добавить|установи|установить)/i, intent: 'update_budget_limit' },
  { re: /(создай|создать|добавь|добавить|запиши|записать).{0,40}(расход|трату|трат|покупк)/i, intent: 'create_transaction' },
  { re: /(создай|создать|добавь|добавить|запиши|записать).{0,40}(доход|зарплат|поступлен)/i, intent: 'create_transaction' },
  { re: /(потратил|заплатила|заплатил|купил|купила|оплатил|оплатила|получил|получила).{0,120}\d/i, intent: 'create_transaction' },
  { re: /(потратил|заплатил|купил|оплатил|получил|потратила|заплатила|купила|оплатила|получила)/i, intent: 'create_transaction' },
  { re: /сумма\s+\d/i, intent: 'create_transaction' },
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
    `Вход: "Добавь новый расход сходил в магазин купил минералку оплатил через каспи сумма 320 тенге" → {"intent":"create_transaction","transaction":{"type":"expense","amount":320,"description":"магазин, минералка","account":"kaspi"}}`,
    `Вход: "потратил 1500 на обед наличными" → {"intent":"create_transaction","transaction":{"type":"expense","amount":1500,"description":"обед","account":"cash"}}`,
    `Вход: "удали последний расход" → {"intent":"delete_last_transaction","delete_transaction":{"scope":"last_expense"}}`,
    `Вход: "поставь лимит 50000 на еду" → {"intent":"update_budget_limit","budget":{"limit_amount":50000,"category_name":"еда"}}`,
    '',
    `Вход: "${message}"`,
  ].filter(Boolean).join('\n');

  const response = await callGemini(prompt, {
    maxOutputTokens: 900,
    temperature: 0,
    responseMimeType: 'application/json',
    retries: 1,
  });

  if (isGeminiErrorText(response)) {
    return { intent: 'none' };
  }

  const parsed = safeParseIntent(response);

  // If Gemini still returned none but local pre-filter detected a command — trust the filter
  if (parsed.intent === 'none' && preFilterHint && preFilterHint !== 'none') {
    return { intent: preFilterHint };
  }

  return parsed;
}
