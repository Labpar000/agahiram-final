import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AuditService } from './audit.service';
import { BillingService } from './billing.service';
import { BudgetCheckCron } from './cron/budget-check.cron';
import { MediaModule } from '../media/media.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [MediaModule, RedisModule],
  controllers: [AdsController],
  providers: [AdsService, AuditService, BillingService, BudgetCheckCron],
  exports: [AdsService],
})
export class AdsModule {}
