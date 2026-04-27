import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Status } from '../hooks/useCommandExecutor';

interface StatusBarProps {
  status: Status;
}

export function StatusBar({ status }: StatusBarProps) {
  if (status.kind === 'idle') return null;

  if (status.kind === 'executing') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-white/55">
        <Loader2 size={12} className="animate-spin" /> Выполняю...
      </p>
    );
  }

  if (status.kind === 'success') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[#5DCAA5]">
        <CheckCircle size={12} /> {status.msg}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-[#E24B4A]">
      <AlertCircle size={12} /> {status.msg}
    </p>
  );
}
