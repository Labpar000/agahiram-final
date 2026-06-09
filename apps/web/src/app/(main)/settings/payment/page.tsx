'use client';

import { useState } from 'react';
import { formatPersianNumber } from '@agahiram/shared';
import {
  Button,
  Input,
  Label,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@agahiram/ui';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { SettingsSection } from '@/features/settings/components/settings-section';
import { useWallet } from '@/features/settings/hooks/useWallet';

const WALLET_ENABLED = process.env.NEXT_PUBLIC_WALLET_ENABLED === 'true';

function formatAmount(value: string): string {
  return formatPersianNumber(Number(value));
}

export default function PaymentSettingsPage() {
  const { walletQuery, historyQuery, payoutsQuery, topUp, createPayout } = useWallet();
  const [topUpAmount, setTopUpAmount] = useState('50000');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [iban, setIban] = useState('');

  if (!WALLET_ENABLED) {
    return (
      <div className="bg-background min-h-svh pb-8">
        <SettingsHeader title="کیف پول و پرداخت" />
        <div className="mx-auto max-w-2xl p-4">
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
            کیف پول در حال حاضر غیرفعال است.
          </p>
        </div>
      </div>
    );
  }

  const balance = walletQuery.data?.balance ?? '0';

  const handleTopUp = () => {
    const amount = Number(topUpAmount);
    if (!amount || amount < 10000) {
      toast.error('حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است');
      return;
    }
    topUp.mutate(amount, { onError: (e) => toast.error((e as Error).message) });
  };

  const handlePayout = () => {
    const amount = Number(payoutAmount);
    if (!amount || amount < 50000) {
      toast.error('حداقل مبلغ برداشت ۵۰٬۰۰۰ تومان است');
      return;
    }
    if (!/^IR\d{24}$/i.test(iban.trim())) {
      toast.error('شماره شبا نامعتبر است');
      return;
    }
    createPayout.mutate(
      { amount, iban: iban.trim().toUpperCase() },
      {
        onSuccess: () => {
          toast.success('درخواست برداشت ثبت شد');
          setPayoutAmount('');
          setIban('');
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="کیف پول و پرداخت" />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <SettingsSection label="موجودی">
          <div className="space-y-4 px-4 py-4">
            {walletQuery.isLoading ? (
              <Spinner className="size-6" />
            ) : (
              <p className="text-2xl font-bold">
                {formatAmount(balance)}{' '}
                <span className="text-sm font-normal text-muted-foreground">تومان</span>
              </p>
            )}
            <div className="flex gap-2">
              <Input
                dir="ltr"
                type="number"
                min={10000}
                step={10000}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="مبلغ (تومان)"
              />
              <Button
                type="button"
                variant="brand"
                isLoading={topUp.isPending}
                onClick={handleTopUp}
              >
                شارژ
              </Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection label="درخواست برداشت">
          <div className="space-y-3 px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payout-amount">مبلغ (تومان)</Label>
              <Input
                id="payout-amount"
                dir="ltr"
                type="number"
                min={50000}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">شماره شبا</Label>
              <Input
                id="iban"
                dir="ltr"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="IR..."
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              isLoading={createPayout.isPending}
              onClick={handlePayout}
            >
              ثبت درخواست برداشت
            </Button>
          </div>
        </SettingsSection>

        <Tabs defaultValue="history">
          <TabsList className="w-full">
            <TabsTrigger value="history" className="flex-1">
              تراکنش‌ها
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex-1">
              برداشت‌ها
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <SettingsSection>
              {historyQuery.isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner className="size-6" />
                </div>
              ) : historyQuery.data && historyQuery.data.length > 0 ? (
                historyQuery.data.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.post?.title ?? item.purpose}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('fa-IR')} — {item.status}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      {formatAmount(item.amount)} ت
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  تراکنشی ثبت نشده
                </p>
              )}
            </SettingsSection>
          </TabsContent>

          <TabsContent value="payouts" className="mt-4">
            <SettingsSection>
              {payoutsQuery.isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner className="size-6" />
                </div>
              ) : payoutsQuery.data && payoutsQuery.data.length > 0 ? (
                payoutsQuery.data.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" dir="ltr">
                        {item.iban}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('fa-IR')} — {item.status}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      {formatAmount(item.amount)} ت
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  درخواست برداشتی ثبت نشده
                </p>
              )}
            </SettingsSection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
