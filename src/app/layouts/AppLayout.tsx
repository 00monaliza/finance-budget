import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/widgets/Sidebar';
import { Header } from '@/widgets/Header';
import { ParticleBackground } from '@/shared/ui';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="relative flex-1 overflow-y-auto bg-[#0d1b26] p-6">
          <ParticleBackground />
          <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />

          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
