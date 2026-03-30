import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type BadgeVariant = 'income' | 'expense' | 'transfer' | 'neutral' | 'warning';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  income:   'bg-[#1D9E75]/12 text-[#1D9E75]',
  expense:  'bg-[#E24B4A]/12 text-[#E24B4A]',
  transfer: 'bg-[#378ADD]/12 text-[#378ADD]',
  neutral:  'bg-gray-100 text-gray-600',
  warning:  'bg-[#EF9F27]/12 text-[#EF9F27]',
};

const dotStyles: Record<BadgeVariant, string> = {
  income:   'bg-[#1D9E75]',
  expense:  'bg-[#E24B4A]',
  transfer: 'bg-[#378ADD]',
  neutral:  'bg-gray-400',
  warning:  'bg-[#EF9F27]',
};

export function Badge({ variant = 'neutral', dot, children, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
}
