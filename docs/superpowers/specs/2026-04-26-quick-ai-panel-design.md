# Quick AI Panel — Design Spec
Date: 2026-04-26

## Goal
Add a quick-access AI command button visible on every page so users can record transactions, goals, and budget limits without navigating to the AI Advisor page.

## Placement
Button lives in `Header.tsx`, right of the page title group, left of the existing actions (Add + Bell + Avatar). On desktop: icon + "AI" label. On mobile (sm and below): icon only to save space.

## Component: `QuickAIPanel`
New widget at `src/widgets/QuickAIPanel/QuickAIPanel.tsx`.

### Trigger
- `✨` button in Header; clicking toggles the dropdown open/closed
- Clicking outside (overlay or document click) closes it
- Escape key closes it
- Panel closes automatically after a command executes successfully

### Dropdown position
Anchored below the AI button, right-aligned. Fixed width ~300px. On mobile it stretches to near full width.

### Panel contents
1. **Header row** — "✨ AI-команда" label + close ×
2. **Quick chips** (4 buttons, single-select, click fills template into input):
   - `💸 Расход` → prefills "добавь расход "
   - `💰 Доход` → prefills "добавь доход "
   - `🎯 Цель` → prefills "создай цель "
   - `📊 Лимит` → prefills "поставь лимит "
3. **Input field** — text input, Enter submits, placeholder "или напишите команду..."
4. **Action row** — Mic button (SpeechRecognition, ru-RU) + Submit button
5. **Status area** — shows "Выполняю..." spinner while processing, then success/error message inline (not navigating to AI chat)

### Execution logic
Reuses `detectChatIntent` + direct API calls (same pattern as `AIChat.executeCommand`). Does NOT save to `ai_chats` table — this is a quick action, not a chat history entry. Invalidates relevant React Query caches on success (same keys as AIChat).

## Files to create/modify
- **Create** `src/widgets/QuickAIPanel/QuickAIPanel.tsx`
- **Create** `src/widgets/QuickAIPanel/index.ts`
- **Modify** `src/widgets/Header/Header.tsx` — add button + render `<QuickAIPanel>`
- **Modify** `src/widgets/index.ts` — export QuickAIPanel if needed

## Shared logic extraction (optional, if clean)
The `executeCommand` logic currently lives inside `AIChat`. If straightforward, extract it to `src/shared/lib/executeAICommand.ts` so both `AIChat` and `QuickAIPanel` share it. If extraction is complex, duplicate the minimal subset needed.

## Out of scope
- History of recent commands in the panel (decided against)
- Navigation to AI chat on success
- Saving panel interactions to `ai_chats`
