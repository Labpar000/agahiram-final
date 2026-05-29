import { Module } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
