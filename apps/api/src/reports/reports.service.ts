import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateReportInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGateway } from '../admin/admin.gateway';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminGateway: AdminGateway,
  ) {}

  async create(reporterId: string, input: CreateReportInput) {
    await this.assertTargetExists(input.targetType, input.targetId);

    const postId = input.targetType === 'post' ? input.targetId : null;

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        postId,
        reason: input.reason,
        details: input.details,
      },
    });

    this.adminGateway.emitReportCreated({
      reportId: report.id,
      postId,
      reason: input.reason,
    });

    return { id: report.id, success: true };
  }

  private async assertTargetExists(targetType: CreateReportInput['targetType'], targetId: string) {
    switch (targetType) {
      case 'post': {
        const p = await this.prisma.post.findUnique({ where: { id: targetId } });
        if (!p) throw new NotFoundException('هدف گزارش یافت نشد');
        break;
      }
      case 'story': {
        const s = await this.prisma.story.findUnique({ where: { id: targetId } });
        if (!s) throw new NotFoundException('هدف گزارش یافت نشد');
        break;
      }
      case 'user': {
        const u = await this.prisma.user.findUnique({ where: { id: targetId } });
        if (!u) throw new NotFoundException('هدف گزارش یافت نشد');
        break;
      }
      case 'comment': {
        const c = await this.prisma.comment.findUnique({ where: { id: targetId } });
        if (!c) throw new NotFoundException('هدف گزارش یافت نشد');
        break;
      }
    }
  }
}
