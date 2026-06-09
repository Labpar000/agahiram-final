import type { AdSlot, BidType } from '@agahiram/shared';

export interface AdsOverview {
  walletBalance: string;
  activeCampaigns: number;
  pendingAds: number;
  totalSpent: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  budget: string;
  totalSpent: string;
  dailyBudget: string | null;
  bidType: BidType;
  bidAmount: string;
  startDate: string;
  endDate: string | null;
  pauseReason: string | null;
  createdAt: string;
  ads?: Array<{
    id: string;
    status: string;
    slot: AdSlot;
    impressions: number;
    clicks: number;
    spent: string;
  }>;
}

export interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  budget: string;
  totalSpent: string;
  dailyBudget: string | null;
  bidType: BidType;
  bidAmount: string;
  startDate: string;
  endDate: string | null;
  pauseReason: string | null;
  createdAt: string;
  targeting: Record<string, unknown> | null;
  advertiser: {
    id: string;
    username: string | null;
    name: string | null;
    walletBalance?: string;
  };
  ads: Array<{
    id: string;
    title: string | null;
    status: string;
    slot: string;
    mediaUrl: string;
    impressions: number;
    clicks: number;
    spent: string;
    adminNote?: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    status: string;
    note: string | null;
    createdAt: string;
  }>;
}

export interface AdDetail {
  id: string;
  title: string | null;
  description: string | null;
  mediaUrl: string;
  redirectUrl: string | null;
  slot: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spent: string;
  adminNote?: string | null;
  createdAt: string;
  campaign?: {
    id: string;
    name: string;
    bidType: string;
    bidAmount: string;
  };
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: string;
}

export interface AdAnalytics {
  ad: AdDetail;
  impressions: number;
  clicks: number;
  ctr: number;
}
