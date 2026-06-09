import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AuditService } from './audit.service';
import { BudgetCheckCron } from './cron/budget-check.cron';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [AdsController],
  providers: [AdsService, AuditService, BudgetCheckCron],
  exports: [AdsService],
})
export class AdsModule {}
