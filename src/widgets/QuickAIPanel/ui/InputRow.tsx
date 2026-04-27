import type { RefObject } from 'react';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface InputRowProps {
  inputRef: RefObject<HTMLInputElement>;
  value: string;
  interimText: string;
  isListening: boolean;
  isExecuting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicToggle: () => void;
}

export function InputRow({
  inputRef,
  value,
  interimText,
  isListening,
  isExecuting,
  onChange,
  onSubmit,
  onMicToggle,
}: InputRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          placeholder="или напишите команду..."
          disabled={isExecuting}
          className="flex-1 rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#DA7B93] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onMicToggle}
          disabled={isExecuting}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50',
            isListening
              ? 'bg-[#E24B4A] text-white animate-pulse'
              : 'border border-white/20 text-white/60 hover:bg-white/10',
          )}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isExecuting}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DA7B93] text-white transition-colors hover:bg-[#e68fa4] disabled:opacity-50"
        >
          {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {isListening && interimText && (
        <p className="px-1 text-xs italic text-white/40">{interimText}</p>
      )}
    </div>
  );
}
