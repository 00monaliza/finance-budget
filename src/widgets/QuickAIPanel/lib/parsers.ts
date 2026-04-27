// src/widgets/QuickAIPanel/lib/parsers.ts
import type { Category } from '@/entities/category';

const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();

export function resolveCategoryId(
  txType: 'income' | 'expense' | 'transfer',
  categories: Category[],
  categoryId?: string,
  categoryName?: string,
): string | null {
  if (txType === 'transfer') return null;
  const allowed = categories.filter(c => c.type === txType || c.type === 'both');
  if (categoryId && allowed.some(c => c.id === categoryId)) return categoryId;
  if (categoryName) {
    const src = normalize(categoryName);
    const match = allowed.find(c => {
      const cur = normalize(c.name_ru);
      return cur.includes(src) || src.includes(cur);
    });
    if (match) return match.id;
  }
  return allowed[0]?.id ?? null;
}

export function parseTransactionFromText(text: string): {
  amount?: number;
  account?: 'main' | 'kaspi' | 'cash';
  type?: 'income' | 'expense';
} {
  const lower = text.toLowerCase();
  let amount: number | undefined;
  for (const re of [/сумма\s+(\d[\d\s]*)/, /(\d[\d\s]*)\s*(?:тенге|тг|₸)/, /за\s+(\d[\d\s]*)/]) {
    const m = lower.match(re);
    if (m) {
      const n = parseFloat(m[1].replace(/\s/g, ''));
      if (n > 0) { amount = n; break; }
    }
  }
  if (!amount) {
    const m = lower.match(/\b(\d{2,})\b/);
    if (m) { const n = parseFloat(m[1]); if (n > 0) amount = n; }
  }
  const account: 'main' | 'kaspi' | 'cash' | undefined =
    /каспи|kaspi/i.test(lower) ? 'kaspi' : /налич/i.test(lower) ? 'cash' : undefined;
  const type: 'income' | 'expense' = /доход|зарплат|получил|получила|пришл/i.test(lower) ? 'income' : 'expense';
  return { amount, account, type };
}

const MONTHS: Record<string, string> = {
  январ: '01', феврал: '02', март: '03', апрел: '04', май: '05', мая: '05',
  июн: '06', июл: '07', август: '08', сентябр: '09', октябр: '10', ноябр: '11', декабр: '12',
};

export function parseGoalFromText(text: string): {
  name?: string;
  target_amount?: number;
  deadline?: string;
} {
  const lower = text.toLowerCase();
  const amountMatch = lower.match(/(\d[\d\s]*(?:млн|миллион\w*)?)\s*(?:тенге|тг|₸)?/);
  let target_amount: number | undefined;
  if (amountMatch) {
    const raw = amountMatch[1].replace(/\s/g, '');
    const num = parseFloat(raw);
    target_amount = /млн|миллион/i.test(amountMatch[0]) ? num * 1_000_000 : num;
  }
  let deadline: string | undefined;
  const dm = lower.match(
    /до\s+(\d{1,2})\s+(январ|феврал|март|апрел|май|мая|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/,
  );
  if (dm) {
    const mon = MONTHS[dm[2]] ?? '01';
    const day = String(dm[1]).padStart(2, '0');
    let yr = new Date().getFullYear();
    if (new Date(`${yr}-${mon}-${day}`) < new Date()) yr += 1;
    deadline = `${yr}-${mon}-${day}`;
  }
  const keys = ['жильё','жилье','машин','авто','отпуск','путешеств','ноутбук','телефон','образован','свадьб','ремонт','пенси','бизнес'];
  const found = keys.find(k => lower.includes(k));
  const name = found
    ? found.charAt(0).toUpperCase() + found.slice(1).replace(/[аяеёиоуыэюь]+$/, '')
    : undefined;
  return { name, target_amount, deadline };
}
