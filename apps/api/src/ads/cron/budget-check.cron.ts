import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AdCampaignPauseReason } from '@agahiram/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BudgetCheckCron {
  private readonly logger = new Logger(BudgetCheckCron.name);

  constructor(private readonly prisma: PrismaService) {}

  private startOfDay(d = new Date()): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  @Cron('0 * * * *')
  async pauseExhaustedCampaigns() {
    const day = this.startOfDay();

    const active = await this.prisma.adCampaign.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ dailyBudget: { not: null } }, { budget: { not: undefined } }],
      },
      include: {
        advertiser: { select: { walletBalance: true } },
        dailySpends: { where: { date: day }, take: 1 },
      },
    });

    for (const c of active) {
      if (c.totalSpent >= c.budget) {
        await this.prisma.adCampaign.update({
          where: { id: c.id },
          data: { status: 'PAUSED', pauseReason: AdCampaignPauseReason.BUDGET_EXHAUSTED },
        });
        this.logger.log(`Campaign ${c.id} paused: budget exhausted`);
        continue;
      }

      if (c.advertiser.walletBalance <= 0n) {
        await this.prisma.adCampaign.update({
          where: { id: c.id },
          data: { status: 'PAUSED', pauseReason: AdCampaignPauseReason.WALLET_EMPTY },
        });
        this.logger.log(`Campaign ${c.id} paused: wallet empty`);
        continue;
      }

      if (c.dailyBudget) {
        const todaySpent = c.dailySpends[0]?.amount ?? 0n;
        if (todaySpent >= c.dailyBudget) {
          await this.prisma.adCampaign.update({
            where: { id: c.id },
            data: { status: 'PAUSED', pauseReason: AdCampaignPauseReason.DAILY_BUDGET },
          });
          this.logger.log(`Campaign ${c.id} auto-paused: daily budget exhausted`);
        }
      }
    }
  }

  @Cron('0 0 * * *')
  async resumeMidnight() {
    const result = await this.prisma.adCampaign.updateMany({
      where: {
        status: 'PAUSED',
        pauseReason: AdCampaignPauseReason.DAILY_BUDGET,
      },
      data: { status: 'ACTIVE', pauseReason: null },
    });
    this.logger.log(`Midnight: resumed ${result.count} daily-budget-paused campaigns`);
  }
}
