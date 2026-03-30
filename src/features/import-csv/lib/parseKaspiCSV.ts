import type { Transaction } from '@/entities/transaction';

function parseKaspiDate(dateStr: string): string {
  // Kaspi format: DD.MM.YYYY or DD.MM.YYYY HH:MM
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const [datePart] = dateStr.trim().split(' ');
  const [day, month, year] = datePart.split('.');
  if (!day || !month || !year) return new Date().toISOString().split('T')[0];
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseKaspiCSV(csvText: string): Partial<Transaction>[] {
  const lines = csvText.split('\n').slice(1); // skip header
  return lines
    .filter(Boolean)
    .map(line => {
      // Kaspi CSV: Date;Description;Amount;Currency or similar
      const cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
      const [date, description, amountStr] = cols;
      const amount = Math.abs(parseFloat((amountStr ?? '').replace(',', '.').replace(/\s/g, '') || '0'));
      const rawAmount = parseFloat((amountStr ?? '').replace(',', '.').replace(/\s/g, '') || '0');
      return {
        date:        parseKaspiDate(date ?? ''),
        description: description?.trim() ?? '',
        amount,
        type:        rawAmount < 0 ? ('expense' as const) : ('income' as const),
        account:     'kaspi' as const,
        tags:        null,
        ai_categorized: false,
      };
    })
    .filter(t => t.amount && t.amount > 0);
}
