# PROGRESS — FinanceAI Platform

Последнее обновление: 2026-03-30
Текущая фаза: **Фаза 1 — Основа**

---

## Фаза 1 — Основа

- [x] 1. Инициализация проекта (Vite + TS + Tailwind + FSD структура)
- [x] 2. Настройка Supabase (schema + RLS + seed categories)
- [x] 3. Auth (login / register / logout)
- [x] 4. Layout (Sidebar + Header + роуты)
- [x] 5. shared/ui базовые компоненты (Button, Input, Card, Badge, Modal)

## Фаза 2 — Транзакции

- [x] 6. Добавление транзакции (форма + zod валидация)
- [x] 7. Список транзакций (фильтры + поиск + пагинация)
- [x] 8. AI-категоризация при вводе (Gemini API)
- [x] 9. Импорт CSV Kaspi

## Фаза 3 — Бюджеты и аналитика

- [x] 10. Бюджеты по категориям (лимиты + уведомления)
- [x] 11. Dashboard (метрики + графики Recharts)
- [x] 12. Analytics page (по месяцам, по категориям)
- [x] 13. Цели накоплений (Goals)

## Фаза 4 — AI Советник

- [x] 14. AI Chat страница (Gemini 2.0 Flash)
- [x] 15. История диалогов (сохранение в Supabase)
- [x] 16. Умные уведомления (превышение лимита)

## Фаза 5 — Полировка

- [ ] 17. i18n (ru / kz / en)
- [x] 18. Dark mode
- [ ] 19. PWA (manifest + service worker)
- [ ] 20. Деплой Vercel + DNS ps.kz

---

## Заметки

- API ключи хранить в .env.local (не коммитить)
- Claude Haiku — для авто-категоризации (быстро/дёшево)
- Claude Sonnet — для AI-советника (качество)
- В продакшне: Anthropic API вызывать через Supabase Edge Function
- Глобально применён dark canvas particle фон (layout + auth + dashboard glass UI)
