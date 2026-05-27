import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentPurpose, type InitiatePaymentInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ZarinpalService } from './zarinpal.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zarinpal: ZarinpalService,
  ) {}

  async getBoostPlans() {
    return this.prisma.boostPlan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  }

  async initiate(userId: string, input: InitiatePaymentInput) {
    let amount: bigint = BigInt(input.amount ?? 0);
    let description = '';

    if (input.purpose === PaymentPurpose.BOOST) {
      if (!input.planId || !input.postId) throw new BadRequestException('plan + post لازم است');
      const plan = await this.prisma.boostPlan.findUnique({ where: { id: input.planId } });
      if (!plan) throw new NotFoundException('پلن یافت نشد');
      const post = await this.prisma.post.findUnique({ where: { id: input.postId } });
      if (!post || post.userId !== userId) throw new NotFoundException('آگهی یافت نشد');
      amount = plan.price;
      description = `${plan.name} برای آگهی ${post.title.slice(0, 30)}`;
    } else if (input.purpose === PaymentPurpose.BUSINESS_ACCOUNT) {
      amount = 300_000n;
      description = 'اشتراک اکانت بیزنسی - ماهانه';
    } else if (input.purpose === PaymentPurpose.WALLET_TOPUP) {
      if (!amount || amount < 10_000n) throw new BadRequestException('حداقل مبلغ ۱۰ هزار تومان');
      description = 'شارژ کیف پول';
    } else {
      throw new BadRequestException('نوع پرداخت نامعتبر');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const { authority, paymentUrl } = await this.zarinpal.request(
      Number(amount),
      description,
      user?.phone,
    );

    await this.prisma.payment.create({
      data: {
        userId,
        postId: input.postId,
        planId: input.planId,
        amount,
        purpose: input.purpose,
        authority,
        status: 'pending',
      },
    });

    return { authority, paymentUrl, amount: amount.toString() };
  }

  async verify(authority: string, status: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { authority },
      include: { plan: true },
    });
    if (!payment) throw new NotFoundException('تراکنش یافت نشد');

    /* Idempotency guard. The verify endpoint is @Public and ZarinPal returns
     * code 101 ("already verified") for replays, which zarinpal.service treats
     * as success. Without this gate, hitting the callback URL twice — including
     * the trivial case of the user refreshing /payment/callback — would re-run
     * the side-effect branch below and, in the walletTopup case, credit the
     * user's balance again for every replay. */
    if (payment.status !== 'pending') {
      return {
        success: payment.status === 'success',
        refId: payment.refId ?? undefined,
        paymentId: payment.id,
        alreadyProcessed: true,
        message:
          payment.status === 'success'
            ? 'این پرداخت قبلاً تأیید شده است'
            : 'این پرداخت قابل تأیید نیست',
      };
    }

    if (status !== 'OK') {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { status: 'failed' },
      });
      return { success: false, message: 'پرداخت لغو شد' };
    }

    const verification = await this.zarinpal.verify(authority, Number(payment.amount));

    if (!verification.success) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { status: 'failed' },
      });
      return { success: false, message: verification.error ?? 'تأیید نشد' };
    }

    /* Atomic pending→success transition. Two concurrent verifies that both
     * passed the status check above will both call ZarinPal, but only the one
     * whose updateMany affects a row owns the side effects. */
    const claim = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: {
        status: 'success',
        refId: verification.refId != null ? String(verification.refId) : null,
      },
    });
    if (claim.count === 0) {
      const finalized = await this.prisma.payment.findUnique({ where: { id: payment.id } });
      return {
        success: finalized?.status === 'success',
        refId: finalized?.refId ?? undefined,
        paymentId: payment.id,
        alreadyProcessed: true,
      };
    }

    if (payment.purpose === 'boost' && payment.postId && payment.plan) {
      const boostExpires = new Date(Date.now() + payment.plan.durationHours * 3600000);
      await this.prisma.post.update({
        where: { id: payment.postId },
        data: { isPromoted: true, boostExpiresAt: boostExpires },
      });
    } else if (payment.purpose === 'businessAccount') {
      await this.prisma.user.update({
        where: { id: payment.userId },
        data: { isBusiness: true },
      });
    } else if (payment.purpose === 'walletTopup') {
      await this.prisma.user.update({
        where: { id: payment.userId },
        data: { walletBalance: { increment: payment.amount } },
      });
    }

    return { success: true, refId: verification.refId, paymentId: payment.id };
  }

  async getWallet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    return { balance: user?.walletBalance ?? 0, currency: 'IRT' };
  }

  async listMyPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: { plan: true, post: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
