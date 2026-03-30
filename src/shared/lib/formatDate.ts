export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date));
}
