import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-chrome">
      <Sidebar />
      <div className="lg:pe-64">
        <Topbar />
        <main id="main" className="mx-auto max-w-7xl p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
