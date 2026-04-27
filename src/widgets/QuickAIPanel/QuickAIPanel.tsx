// src/widgets/QuickAIPanel/QuickAIPanel.tsx
import { useState, useRef, useEffect, type RefObject } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAuthStore } from '@/entities/user';
import { CHIPS } from './lib/constants';
import { useVoiceInput } from './hooks/useVoiceInput';
import { useQuickAIData } from './hooks/useQuickAIData';
import { useCommandExecutor } from './hooks/useCommandExecutor';
import { ChipBar } from './ui/ChipBar';
import { InputRow } from './ui/InputRow';
import { StatusBar } from './ui/StatusBar';

interface QuickAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  placement?: 'below' | 'above';
}

export function QuickAIPanel({ isOpen, onClose, anchorRef }: QuickAIPanelProps) {
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { allTxns, categories, invalidateAll } = useQuickAIData({ userId: user?.id, isOpen });
  const voice = useVoiceInput();
  const { status, execute, history, clearHistory } = useCommandExecutor({
    categories,
    allTxns,
    onClose,
    invalidateAll,
  });

  // Sync confirmed voice transcript → input
  useEffect(() => {
    if (voice.transcript) setInput(voice.transcript);
  }, [voice.transcript]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Stop voice when panel closes
  useEffect(() => {
    if (!isOpen) voice.stop();
  }, [isOpen, voice.stop]);

  // Reset state on open
  useEffect(() => {
    if (!isOpen) return;
    setInput('');
    setActiveChip(null);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(13,27,38,0.96)] shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Sparkles size={14} className="text-[#DA7B93]" />
          AI-команда
        </span>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10">
          <X size={14} className="text-white/50" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <ChipBar
          chips={CHIPS}
          activeChip={activeChip}
          onChipClick={chip => {
            setInput(chip.template);
            setActiveChip(chip.label);
            inputRef.current?.focus();
          }}
        />

        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {history.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setInput(h)}
                className="max-w-[10rem] truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
              >
                {h}
              </button>
            ))}
            <button
              type="button"
              onClick={clearHistory}
              className="ml-auto text-[10px] text-white/30 transition-colors hover:text-white/60"
            >
              ✕ clear
            </button>
          </div>
        )}

        <InputRow
          inputRef={inputRef as RefObject<HTMLInputElement>}
          value={input}
          interimText={voice.interimText}
          isListening={voice.isListening}
          isExecuting={status.kind === 'executing'}
          onChange={setInput}
          onSubmit={() => execute(input)}
          onMicToggle={voice.isListening ? voice.stop : voice.start}
        />

        <StatusBar status={status} />
      </div>
    </div>
  );
}
