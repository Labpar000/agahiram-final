'use client';

import Link from 'next/link';
import { Button, Spinner } from '@agahiram/ui';
import { RequireAuth } from '@/features/advertising/components/require-auth';
import { PromoteHeader } from '@/features/advertising/components/promote-header';
import { CampaignCard } from '@/features/advertising/components/campaign-card';
import { useMyCampaigns } from '@/features/advertising/hooks/useMyCampaigns';

export default function CampaignsListPage() {
  const { data, isLoading, isError, refetch } = useMyCampaigns();

  return (
    <RequireAuth>
      <div className="bg-background min-h-svh pb-8">
        <PromoteHeader title="کمپین‌های من" />
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
          <Button variant="brand" fullWidth asChild>
            <Link href="/promote/campaigns/new">کمپین جدید</Link>
          </Button>

          {isLoading ? (
            <div className="py-12 grid place-items-center">
              <Spinner className="size-8" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">خطا در بارگذاری</p>
              <Button variant="outline" onClick={() => void refetch()}>
                تلاش مجدد
              </Button>
            </div>
          ) : !data?.data.length ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              هنوز کمپینی نساخته‌اید.
            </p>
          ) : (
            <div className="space-y-2">
              {data.data.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
