import { RotateCw } from 'lucide-react';
import { AIChat } from '@/widgets/AIChat';

export default function AIAdvisorPage() {
  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={refreshPage}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:border-[#5DCAA5]/45 hover:bg-[#5DCAA5]/12"
        >
          <RotateCw size={14} />
          Refresh
        </button>
      </div>
      <AIChat />
    </div>
  );
}
