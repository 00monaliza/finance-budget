import { useCallback, useRef } from 'react';
import { autoCategorize } from '@/shared/api/gemini';
import type { Category } from '@/entities/category';

export function useAutoCategorize(
  categories: Category[],
  onCategorized: (categoryId: string) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback((description: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!description || description.length < 3) return;

    timerRef.current = setTimeout(async () => {
      try {
        const id = await autoCategorize(description, categories);
        const found = categories.find(c => c.id === id);
        if (found) onCategorized(found.id);
      } catch {
        // Silent fail — user can select manually
      }
    }, 800);
  }, [categories, onCategorized]);

  return { trigger };
}
