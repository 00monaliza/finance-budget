// src/widgets/QuickAIPanel/lib/parsers.ts
import type { Category } from '@/entities/category';

const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();

const UNITS: Record<string, number> = {
  ноль: 0,
  один: 1,
  одна: 1,
  одно: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
};

const TEENS: Record<string, number> = {
  десять: 10,
  одиннадцать: 11,
  двенадцать: 12,
  тринадцать: 13,
  четырнадцать: 14,
  пятнадцать: 15,
  шестнадцать: 16,
  семнадцать: 17,
  восемнадцать: 18,
  девятнадцать: 19,
};

const TENS: Record<string, number> = {
  двадцать: 20,
  тридцать: 30,
  сорок: 40,
  пятьдесят: 50,
  шестьдесят: 60,
  семьдесят: 70,
  восемьдесят: 80,
  девяносто: 90,
};

const HUNDREDS: Record<string, number> = {
  сто: 100,
  двести: 200,
  триста: 300,
  четыреста: 400,
  пятьсот: 500,
  шестьсот: 600,
  семьсот: 700,
  восемьсот: 800,
  девятьсот: 900,
};

const SCALES: Record<string, number> = {
  тысяча: 1_000,
  тысячи: 1_000,
  тысяч: 1_000,
  миллион: 1_000_000,
  миллиона: 1_000_000,
  миллионов: 1_000_000,
  млн: 1_000_000,
};

function cleanNumericText(raw: string): string {
  return raw.replace(/[^\d\s.,]/g, '').trim();
}

function parseNumericAmount(raw: string): number | undefined {
  const cleaned = cleanNumericText(raw);
  if (!cleaned) return undefined;

  const compact = cleaned.replace(/\s+/g, '');
  if (!compact) return undefined;

  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(compact)) {
    const grouped = Number(compact.replace(/[.,]/g, ''));
    return grouped > 0 ? grouped : undefined;
  }

  const normalizedDecimal = compact.replace(',', '.');
  const decimalValue = Number(normalizedDecimal);
  if (Number.isFinite(decimalValue) && decimalValue > 0) {
    return decimalValue;
  }

  const digitsOnly = compact.replace(/\D/g, '');
  if (!digitsOnly) return undefined;
  const integerValue = Number(digitsOnly);
  return Number.isFinite(integerValue) && integerValue > 0 ? integerValue : undefined;
}

function toWordToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-я-]/g, '');
}

function isNumberWord(token: string): boolean {
  return token in UNITS || token in TEENS || token in TENS || token in HUNDREDS || token in SCALES;
}

function parseNumberWordsChunk(chunk: string): number | undefined {
  const tokens = chunk
    .split(/\s+/)
    .map(toWordToken)
    .filter(Boolean);

  let total = 0;
  let current = 0;
  let sawAny = false;

  for (const token of tokens) {
    if (token in HUNDREDS) {
      current += HUNDREDS[token];
      sawAny = true;
      continue;
    }
    if (token in TENS) {
      current += TENS[token];
      sawAny = true;
      continue;
    }
    if (token in TEENS) {
      current += TEENS[token];
      sawAny = true;
      continue;
    }
    if (token in UNITS) {
      current += UNITS[token];
      sawAny = true;
      continue;
    }
    if (token in SCALES) {
      const scale = SCALES[token];
      total += (current || 1) * scale;
      current = 0;
      sawAny = true;
      continue;
    }
    if (sawAny) break;
  }

  const result = total + current;
  return sawAny && result > 0 ? result : undefined;
}

function parseAmountFromNumberWords(text: string): number | undefined {
  const lower = text.toLowerCase();
  const candidates = [
    /(?:сумма|на|за|расход|доход|потратил|потратила|получил|получила|добавь|добавить)\s+([а-яё\s-]{2,90})/i,
    /([а-яё\s-]{2,90})\s*(?:тенге|тг|₸)/i,
  ];

  for (const re of candidates) {
    const match = lower.match(re);
    if (!match) continue;
    const parsed = parseNumberWordsChunk(match[1]);
    if (parsed && parsed >= 10) return parsed;
  }

  const tokens = lower.split(/\s+/).map(toWordToken).filter(Boolean);
  let best: number | undefined;

  for (let i = 0; i < tokens.length; i += 1) {
    if (!isNumberWord(tokens[i])) continue;

    const chunk: string[] = [];
    for (let j = i; j < tokens.length; j += 1) {
      if (!isNumberWord(tokens[j])) break;
      chunk.push(tokens[j]);
    }

    if (!chunk.length) continue;
    const parsed = parseNumberWordsChunk(chunk.join(' '));
    if (parsed && (!best || parsed > best)) best = parsed;
    i += chunk.length - 1;
  }

  return best && best >= 10 ? best : undefined;
}

function extractAmountFromText(text: string): number | undefined {
  const lower = text.toLowerCase();

  const numericMatchers = [
    /сумма\s+([\d\s.,]+)/i,
    /([\d\s.,]+)\s*(?:тенге|тг|₸)/i,
    /(?:за|на|расход|доход|потратил|потратила|получил|получила|добавь|добавить)\s+([\d\s.,]+)/i,
    /\b(\d[\d\s.,]*)\b/i,
  ];

  for (const re of numericMatchers) {
    const match = lower.match(re);
    if (!match) continue;
    const parsed = parseNumericAmount(match[1]);
    if (parsed) return parsed;
  }

  return parseAmountFromNumberWords(lower);
}

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
  const amount = extractAmountFromText(lower);
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
  const amountMatch = lower.match(/(\d[\d\s.,]*(?:млн|миллион\w*)?)\s*(?:тенге|тг|₸)?/);
  let target_amount = amountMatch ? parseNumericAmount(amountMatch[1]) : undefined;
  if (!target_amount) {
    target_amount = parseAmountFromNumberWords(lower);
  }
  if (target_amount && /млн|миллион/i.test(amountMatch?.[0] ?? '')) {
    target_amount *= 1_000_000;
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
