# QuickAIPanel — Refactor & Feature Improvements

**Date:** 2026-04-27  
**Scope:** `src/widgets/QuickAIPanel/`

---

## Goal

Refactor the 429-line monolithic `QuickAIPanel.tsx` into focused hooks and presentational subcomponents. Add three user-facing improvements: live voice transcript, command history, and a "Delete last" chip.

---

## File Structure

```
src/widgets/QuickAIPanel/
├── QuickAIPanel.tsx          (~80 lines — UI orchestration only)
├── index.ts                  (re-export)
├── hooks/
│   ├── useVoiceInput.ts      (SpeechRecognition + live transcript)
│   ├── useCommandExecutor.ts (executeCommand + Status state machine)
│   └── useQuickAIData.ts     (3 useQuery + invalidateAll)
├── lib/
│   ├── parsers.ts            (parseTransactionFromText, parseGoalFromText, resolveCategoryId)
│   └── constants.ts          (CHIPS array)
└── ui/
    ├── ChipBar.tsx           (presentational)
    ├── InputRow.tsx          (presentational)
    └── StatusBar.tsx         (presentational)
```

---

## Hooks

### `useVoiceInput`

```ts
interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;       // confirmed final transcript
  interimText: string;      // live interim text while speaking (shown at reduced opacity)
  start: () => void;
  stop: () => void;
}
```

- Enables `interimResults: true` so interim text updates in real time.
- On `onresult`: if `isFinal` → sets `transcript`, clears `interimText`; else → sets `interimText`.
- On `onerror` / `onend`: clears `interimText`, sets `isListening = false`.
- `InputRow` shows `interimText` overlaid at 40% opacity when `isListening` and `interimText` is non-empty.
- Cleanup on unmount: calls `stop()`.
- Falls back to `alert()` if `SpeechRecognition` is unavailable.

### `useCommandExecutor`

```ts
interface UseCommandExecutorReturn {
  status: Status;
  execute: (text: string) => void;
}
```

- Encapsulates all `executeCommand` logic (create transaction, create goal, delete transaction, update budget, navigate).
- Accepts `{ user, categories, allTxns, queryClient, navigate, onClose, invalidateAll }`.
- Uses internal `isMountedRef` and `isExecutingRef` to prevent double-submit and stale writes.
- On success: adds the command text to history (see below), sets `status = success`.

### `useQuickAIData`

```ts
interface UseQuickAIDataReturn {
  allTxns: Transaction[];
  categories: Category[];
  invalidateAll: () => void;
}
```

- Runs 3 `useQuery` calls (transactions-all, categories, budgets+spent) when `isOpen && !!userId`.
- `budgets` and `spent` are fetched purely for cache warmth — not returned.
- Exports `invalidateAll` which invalidates the 7 known query keys.

---

## Utilities

### `lib/parsers.ts`

Exports:
- `parseTransactionFromText(text)` — local regex fallback for amount/account/type.
- `parseGoalFromText(text)` — local regex fallback for name/target_amount/deadline.
- `resolveCategoryId(type, categories, categoryId?, categoryName?)` — fuzzy category match.

### `lib/constants.ts`

```ts
export const CHIPS = [
  { label: '💸 Расход',  template: 'добавь расход ' },
  { label: '💰 Доход',   template: 'добавь доход ' },
  { label: '🎯 Цель',    template: 'создай цель ' },
  { label: '📊 Лимит',   template: 'поставь лимит ' },
  { label: '🗑️ Удалить', template: 'удали последний расход' },
] as const;
```

---

## Subcomponents (presentational)

All three are pure UI — no internal state, no hooks.

### `ChipBar`
Props: `chips`, `activeChip`, `onChipClick`  
Renders the chip row.

### `InputRow`
Props: `value`, `onChange`, `onKeyDown`, `onSubmit`, `isListening`, `onMicToggle`, `isExecuting`, `inputRef`  
Renders input + mic button + send button.

### `StatusBar`
Props: `status`  
Renders executing / success / error states.

---

## New Features

### 1. Live Voice Transcript
`interimResults: true` in SpeechRecognition. The `onresult` handler distinguishes `isFinal`:
- Not final → sets `interimText` (displayed at 40% opacity inside `InputRow`, does not modify `input` state).
- Final → sets `transcript` (caller sets `input = transcript`), clears `interimText`.

### 2. Command History
- Stored in `localStorage` under key `quickai_history`.
- Max 5 entries, newest first, deduped.
- Updated on every successful execution inside `useCommandExecutor`.
- Displayed in `QuickAIPanel` below the chips as a scrollable row of small buttons.
- Clicking a history item sets the input value.
- A small "✕ clear" button removes history.

### 3. Delete Chip
Fifth chip with template `'удали последний расход'`. Works with existing `delete_last_transaction` intent — no backend changes needed.

---

## Error Handling

No changes to error-handling logic. `useCommandExecutor` preserves all existing error states and messages verbatim.

---

## What Does Not Change

- `detectChatIntent` in `gemini.ts` — untouched.
- `Header.tsx` usage — interface `QuickAIPanelProps` stays identical.
- All entity imports (`createTransaction`, `fetchBudgets`, etc.) — same imports, just moved into hooks.
- Outside-click and Escape handlers — moved into `QuickAIPanel.tsx` (they belong to panel lifecycle).

---

## Out of Scope

- Category autocomplete suggestions
- Animations / transitions beyond what exists
- Backend or API changes
