import type { BudgetContext } from '@/shared/types/budget-context';

const GEMINI_API_KEY = 'AIzaSyAKynAoSXHzbgQdzn4BtHSGcwZIcAdvDV8';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{
            text: `${FINANCE_SYSTEM_PROMPT}\n\nДанные бюджета:\n${JSON.stringify(budgetContext, null, 2)}\n\nВопрос: ${question}`
          }]
        }
      ],
      generationConfig: { maxOutputTokens: 1000 }
    })
  });
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Ошибка получения ответа';
}

export async function autoCategorize(
  description: string,
  categories: Array<{ id: string; name_ru: string }>
): Promise<string> {
  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{
          text: `Верни ТОЛЬКО id категории из списка. Без объяснений.\nКатегории: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name_ru })))}\nТранзакция: "${description}"\nid категории:`
        }]
      }],
      generationConfig: { maxOutputTokens: 50 }
    })
  });
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}
