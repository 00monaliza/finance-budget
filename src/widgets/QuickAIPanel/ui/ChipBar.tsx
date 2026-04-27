import { cn } from '@/shared/lib/cn';
import type { Chip } from '../lib/constants';

interface ChipBarProps {
  chips: readonly Chip[];
  activeChip: string | null;
  onChipClick: (chip: Chip) => void;
}

export function ChipBar({ chips, activeChip, onChipClick }: ChipBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(chip => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onChipClick(chip)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition-colors',
            activeChip === chip.label
              ? 'border-[#DA7B93]/60 bg-[#DA7B93]/15 text-[#DA7B93]'
              : 'border-white/15 bg-white/6 text-white/70 hover:border-white/30 hover:text-white',
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
