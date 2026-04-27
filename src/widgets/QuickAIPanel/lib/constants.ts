// src/widgets/QuickAIPanel/lib/constants.ts
export const CHIPS = [
  { label: '💸 Расход',   template: 'добавь расход ' },
  { label: '💰 Доход',    template: 'добавь доход ' },
  { label: '🎯 Цель',     template: 'создай цель ' },
  { label: '📊 Лимит',    template: 'поставь лимит ' },
  { label: '🗑️ Удалить', template: 'удали последний расход' },
] as const;

export type Chip = typeof CHIPS[number];
