import { Sidebar } from '@/components/sidebar';

import { Topbar } from '@/components/topbar';

import { AdminOnlyGate } from '@/components/admin-only';

export default function Shell({
  children,

  adminOnly,
}: {
  children: React.ReactNode;

  /** When true, moderators see an access-denied state instead of page content. */

  adminOnly?: boolean;
}) {
  return (
    <div className="min-h-svh bg-chrome">
      <Sidebar />

      <div className="lg:pe-64">
        <Topbar />

        <main id="main" className="mx-auto max-w-7xl p-4 md:p-6">
          {adminOnly ? <AdminOnlyGate>{children}</AdminOnlyGate> : children}
        </main>
      </div>
    </div>
  );
}
