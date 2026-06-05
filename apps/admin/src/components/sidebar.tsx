'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Bell,
  Coins,
  FileCheck,
  FileText,
  Flag,
  Folder,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessageSquareWarning,
  Megaphone,
  Radio,
  Search,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import { cn } from '@agahiram/shared';
import { Badge } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuth } from './auth-provider';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** When set, only `admin` role sees the link (moderators are hidden). */
  adminOnly?: boolean;
  /** Optional async pill (e.g. pending count). */
  badgeKey?: 'pending' | 'reports';
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', icon: LayoutDashboard, label: 'داشبورد' },
  { href: '/analytics', icon: BarChart3, label: 'آمار و تحلیل', adminOnly: true },
  { href: '/pending', icon: FileCheck, label: 'صف تأیید آگهی', badgeKey: 'pending' },
  { href: '/posts', icon: FileText, label: 'آگهی‌ها' },
  { href: '/stories', icon: Sparkles, label: 'استوری‌ها' },
  { href: '/story-comments', icon: MessageSquareWarning, label: 'کامنت استوری' },
  { href: '/highlights', icon: Star, label: 'هایلایت‌ها', adminOnly: true },
  { href: '/users', icon: Users, label: 'کاربران' },
  { href: '/reports', icon: Flag, label: 'گزارش‌ها', badgeKey: 'reports' },
  { href: '/comments', icon: MessageCircle, label: 'کامنت آگهی' },
  { href: '/messages', icon: MessageSquare, label: 'پیام‌ها' },
  { href: '/notifications', icon: Bell, label: 'اعلان‌ها', adminOnly: true },
  { href: '/payments', icon: Coins, label: 'پرداخت‌ها' },
  { href: '/payouts', icon: Wallet, label: 'تسویه‌ها', adminOnly: true },
  { href: '/categories', icon: Folder, label: 'دسته‌بندی‌ها', adminOnly: true },
  { href: '/locations', icon: MapPin, label: 'مناطق', adminOnly: true },
  { href: '/boost-plans', icon: TrendingUp, label: 'پلن‌های نردبان', adminOnly: true },
  { href: '/search-alerts', icon: Search, label: 'هشدار جستجو', adminOnly: true },
  { href: '/broadcast', icon: Megaphone, label: 'اعلان همگانی', adminOnly: true },
  { href: '/live', icon: Radio, label: 'لایو', adminOnly: true },
  { href: '/push', icon: Bell, label: 'اعلان مرورگر', adminOnly: true },
  { href: '/media', icon: Video, label: 'مدیا', adminOnly: true },
  { href: '/audit', icon: ListChecks, label: 'گزارش عملیات' },
  { href: '/system', icon: Activity, label: 'وضعیت سیستم', adminOnly: true },
  { href: '/settings', icon: Settings, label: 'تنظیمات', adminOnly: true },
];

function useBadgeCounts() {
  return useQuery({
    queryKey: ['admin', 'sidebar-badges'],
    queryFn: async () => {
      const r = await apiClient.get<{ pendingPosts?: number; totalReports?: number }>(
        '/admin/stats',
      );
      return {
        pending: r.data?.pendingPosts ?? 0,
        reports: r.data?.totalReports ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? '/';
  const { me, logout } = useAuth();
  const role = me?.role as string | undefined;
  const badges = useBadgeCounts();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3 tap-none">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl gradient-brand text-white shadow-sm"
          >
            <span className="text-base font-extrabold leading-none">آ</span>
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight">آگهی‌گرام</div>
            <div className="text-[11px] text-muted-foreground">پنل ادمین</div>
          </div>
        </Link>
      </div>

      <nav aria-label="منوی اصلی" className="flex-1 space-y-0.5 px-3 pb-3 overflow-y-auto">
        {NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin').map(
          ({ href, icon: Icon, label, badgeKey }) => {
            const active =
              href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(`${href}/`);
            const count = badgeKey ? (badges.data?.[badgeKey] ?? 0) : 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium tap-none',
                  'transition-colors duration-[var(--duration-fast)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4.5 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{label}</span>
                {count > 0 ? (
                  <Badge tone="warning" size="sm" className="tabular-nums">
                    {count}
                  </Badge>
                ) : null}
              </Link>
            );
          },
        )}
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => void logout()}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring tap-none"
        >
          <LogOut className="size-4.5" aria-hidden />
          خروج
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 end-0 hidden w-64 border-s border-border bg-surface lg:block">
      <SidebarContent />
    </aside>
  );
}

export { Loader2 };
