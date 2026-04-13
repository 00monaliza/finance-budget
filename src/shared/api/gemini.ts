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

async function callGemini(prompt: string, maxOutputTokens: number): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    return 'Не задан VITE_GEMINI_API_KEY в .env.local.';
  }

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
          generationConfig: { maxOutputTokens },
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
