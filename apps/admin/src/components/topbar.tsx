'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronLeft, LogOut, Menu, Search, Settings, UserRound } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Drawer,
  DrawerContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  ThemeToggle,
} from '@agahiram/ui';
import { useAuth } from './auth-provider';
import { NAV_ITEMS, SidebarContent } from './sidebar';

function buildBreadcrumb(pathname: string): Array<{ label: string; href?: string }> {
  if (pathname === '/' || pathname === '') return [{ label: 'داشبورد' }];
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Array<{ label: string; href?: string }> = [{ label: 'داشبورد', href: '/' }];
  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    const match = NAV_ITEMS.find((n) => n.href === acc);
    crumbs.push({ label: match?.label ?? decodeURIComponent(seg), href: acc });
  }
  const last = crumbs[crumbs.length - 1];
  if (last) last.href = undefined;
  return crumbs;
}

export function Topbar() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const crumbs = buildBreadcrumb(pathname);
  const { me, logout } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    /* Heuristic global search: looks like a phone → users; uuid → post/user;
     * otherwise default to posts (most common admin task). */
    if (/^09\d{9}$/.test(q)) {
      router.push(`/users?q=${encodeURIComponent(q)}`);
    } else if (/^[0-9a-f-]{36}$/i.test(q)) {
      router.push(`/posts/${q}`);
    } else {
      router.push(`/posts?q=${encodeURIComponent(q)}`);
    }
  };

  const initials = (me?.name ?? me?.username ?? 'ادم').slice(0, 2);

  return (
    <header className="sticky top-0 z-30 glass border-b">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <div className="lg:hidden">
          <IconButton
            aria-label="منو"
            icon={<Menu className="size-5" aria-hidden />}
            size="md"
            onClick={() => setOpen(true)}
          />
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent className="h-[88svh]">
              <div className="h-full overflow-y-auto">
                <SidebarContent onNavigate={() => setOpen(false)} />
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <nav aria-label="مسیر" className="flex min-w-0 items-center gap-1.5 text-sm">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
              {i > 0 ? (
                <ChevronLeft
                  className="size-3.5 text-muted-foreground rtl:rotate-180"
                  aria-hidden
                />
              ) : null}
              {c.href ? (
                <Link
                  href={c.href}
                  className="truncate text-muted-foreground hover:text-foreground"
                >
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className={cn('truncate font-medium text-foreground')}>
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        <div className="me-0 ms-auto flex items-center gap-2">
          <form onSubmit={handleSearch} className="hidden md:block w-64">
            <Input
              size="sm"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو (شماره، عنوان، شناسه)…"
              leadingIcon={<Search className="size-4" aria-hidden />}
              aria-label="جستجو"
            />
          </form>
          <Link href="/audit" aria-label="گزارش عملیات" className="md:hidden">
            <IconButton
              aria-label="اعلان‌ها"
              icon={<Bell className="size-5" aria-hidden />}
              size="md"
            />
          </Link>
          <Link href="/audit" aria-label="گزارش عملیات" className="hidden md:inline-flex">
            <IconButton
              aria-label="اعلان‌ها"
              icon={<Bell className="size-5" aria-hidden />}
              size="md"
            />
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="منوی حساب کاربری"
                className="grid size-9 place-items-center rounded-full ring-1 ring-border transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring tap-none"
              >
                <Avatar size="sm">
                  {me?.avatar ? <AvatarImage src={me.avatar} alt="" /> : null}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[14rem]">
              <DropdownMenuLabel>
                <div className="text-sm">{me?.name ?? me?.username ?? 'ادمین'}</div>
                <div className="text-[11px] font-normal text-muted-foreground">
                  {me?.role === 'admin' ? 'ادمین کل' : me?.role === 'moderator' ? 'ناظر' : 'کاربر'}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/users/${me?.id ?? ''}`} className="flex items-center gap-2">
                  <UserRound className="size-4" aria-hidden /> پروفایل
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="size-4" aria-hidden /> تنظیمات
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onSelect={(e) => {
                  e.preventDefault();
                  void logout();
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="size-4" aria-hidden /> خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
