import { env } from '@/shared/config/env';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGeminiInsight(params: {
  income: number;
  expenses: number;
  creditsMonthly: number;
  freeAmount: number;
  goal: string | null;
}): Promise<string> {
  if (!env.GEMINI_API_KEY) return 'Настройте VITE_GEMINI_API_KEY для получения советов.';

  const goalLabels: Record<string, string> = {
    control: 'контролировать расходы',
    save: 'накопить подушку безопасности',
    pay_debts: 'закрыть долги быстрее',
    invest: 'инвестировать свободные средства',
  };

  const prompt = `
Ты — финансовый ассистент Bonssai. Дай один конкретный практичный совет на русском языке (2-3 предложения, без лишних слов).

Данные пользователя:
- Доход: ${params.income.toLocaleString('ru')}₸/мес
- Расходы за месяц: ${params.expenses.toLocaleString('ru')}₸
- Кредитные платежи/мес: ${params.creditsMonthly.toLocaleString('ru')}₸
- Свободно: ${params.freeAmount.toLocaleString('ru')}₸/мес
- Цель: ${params.goal ? goalLabels[params.goal] ?? params.goal : 'не указана'}

Совет должен быть конкретным, с цифрами, без воды.
  `.trim();

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/gemini-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
        }),
      }
    );
    if (!response.ok) return 'Не удалось получить совет. Попробуйте позже.';
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      ?? 'Не удалось получить совет.';
  } catch {
    return 'Сетевая ошибка. Проверьте подключение.';
  }
}
