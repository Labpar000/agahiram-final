'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentPurpose, type CreatePayoutInput } from '@agahiram/shared';
import { apiClient } from '@/lib/api';

export interface WalletInfo {
  balance: string;
  currency: string;
}

export interface PaymentHistoryItem {
  id: string;
  amount: string;
  purpose: string;
  status: string;
  createdAt: string;
  post?: { id: string; title: string } | null;
}

export interface PayoutItem {
  id: string;
  amount: string;
  iban: string;
  status: string;
  createdAt: string;
}

const WALLET_KEY = ['wallet'] as const;
const HISTORY_KEY = ['payment-history'] as const;
const PAYOUTS_KEY = ['payouts'] as const;

export function useWallet() {
  const qc = useQueryClient();

  const walletQuery = useQuery({
    queryKey: WALLET_KEY,
    queryFn: async () => {
      const res = await apiClient.get<WalletInfo>('/payments/wallet');
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا در دریافت موجودی');
      return res.data;
    },
  });

  const historyQuery = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<PaymentHistoryItem[]>('/payments/history');
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا');
      return res.data;
    },
  });

  const payoutsQuery = useQuery({
    queryKey: PAYOUTS_KEY,
    queryFn: async () => {
      const res = await apiClient.get<PayoutItem[]>('/payments/payouts');
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا');
      return res.data;
    },
  });

  const topUp = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiClient.post<{ paymentUrl: string }>('/payments/initiate', {
        purpose: PaymentPurpose.WALLET_TOPUP,
        amount,
      });
      if (!res.success || !res.data?.paymentUrl) throw new Error(res.error ?? 'خطا در شروع پرداخت');
      return res.data;
    },
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
  });

  const createPayout = useMutation({
    mutationFn: async (input: CreatePayoutInput) => {
      const res = await apiClient.post('/payments/payouts', input);
      if (!res.success) throw new Error(res.error ?? 'خطا در ثبت درخواست برداشت');
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WALLET_KEY });
      void qc.invalidateQueries({ queryKey: PAYOUTS_KEY });
    },
  });

  return { walletQuery, historyQuery, payoutsQuery, topUp, createPayout };
}
