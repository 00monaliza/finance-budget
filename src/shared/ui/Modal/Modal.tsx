import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className={cn(
        'relative z-10 max-h-[calc(100dvh-1.5rem)] w-full overflow-hidden rounded-2xl border border-white/12 bg-[rgba(13,27,38,0.92)] text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:max-h-[calc(100dvh-3rem)]',
        sizeStyles[size]
      )}>
        {title && (
          <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
