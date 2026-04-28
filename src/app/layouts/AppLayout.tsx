import { useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Header } from '@/widgets/Header';
import { BottomTabBar } from '@/widgets/BottomTabBar';
import { QuickAIPanel } from '@/widgets/QuickAIPanel';
import { ParticleBackground } from '@/shared/ui';

export function AppLayout() {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const aiFabRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0d1b26]">
      <Header />
      <main className="relative flex-1 overflow-y-auto bg-[#0d1b26] px-3 py-4 pb-24 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <ParticleBackground />
        <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>

      {/* AI FAB */}
      <div className="fixed bottom-[4.5rem] right-4 z-40 sm:right-6">
        <button
          ref={aiFabRef}
          type="button"
          onClick={() => setShowAIPanel(v => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#DA7B93]/50 bg-[rgba(13,27,38,0.92)] shadow-[0_4px_20px_rgba(218,123,147,0.35)] backdrop-blur-md transition-all hover:scale-105 hover:shadow-[0_4px_28px_rgba(218,123,147,0.55)] active:scale-95"
          aria-label="Открыть AI-ассистент"
        >
          <Sparkles size={20} className="text-[#DA7B93]" />
        </button>
        <QuickAIPanel
          isOpen={showAIPanel}
          onClose={() => setShowAIPanel(false)}
          anchorRef={aiFabRef}
          placement="above"
        />
      </div>

      <BottomTabBar />
    </div>
  );
}
