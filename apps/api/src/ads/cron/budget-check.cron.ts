import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BudgetCheckCron {
  private readonly logger = new Logger(BudgetCheckCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 * * * *')
  async pauseExhaustedCampaigns() {
    const now = new Date();

    const exhausted = await this.prisma.adCampaign.findMany({
      where: {
        status: 'ACTIVE',
        dailyBudget: { not: null },
      },
      include: {
        ads: {
          where: { status: 'APPROVED', startsAt: { lte: now } },
          select: { spent: true },
        },
      },
    });

    for (const c of exhausted) {
      const todaySpent = c.ads.reduce((sum, a) => sum + Number(a.spent), 0);
      if (c.dailyBudget && todaySpent >= Number(c.dailyBudget)) {
        await this.prisma.adCampaign.update({
          where: { id: c.id },
          data: { status: 'PAUSED' },
        });
        this.logger.log(`Campaign ${c.id} auto-paused: daily budget exhausted`);
      }
    }
  }

  @Cron('0 0 * * *')
  async resumeMidnight() {
    await this.prisma.adCampaign.updateMany({
      where: { status: 'PAUSED' },
      data: { status: 'ACTIVE' },
    });
    this.logger.log('Midnight: resumed paused campaigns for new daily budget cycle');
  }
}
