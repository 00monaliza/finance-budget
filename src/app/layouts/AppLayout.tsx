import { Outlet } from 'react-router-dom';
import { Header } from '@/widgets/Header';
import { BottomTabBar } from '@/widgets/BottomTabBar';
import { ParticleBackground } from '@/shared/ui';

export function AppLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0d1b26]">
      <Header />
      <main className="relative flex-1 overflow-y-auto bg-[#0d1b26] px-3 py-4 pb-24 sm:px-5 sm:py-5 lg:p-6 lg:pb-6">
        <ParticleBackground />
        <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
      <BottomTabBar />
    </div>
  );
}
