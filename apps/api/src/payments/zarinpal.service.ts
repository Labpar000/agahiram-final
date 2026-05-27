import { Injectable, Logger } from '@nestjs/common';
import { ZARINPAL_PRODUCTION, ZARINPAL_SANDBOX } from '@agahiram/shared';

interface RequestResponse {
  data: { code: number; message: string; authority: string; fee?: number; fee_type?: string };
  errors: unknown;
}

interface VerifyResponse {
  data: {
    code: number;
    message: string;
    ref_id?: number;
    card_pan?: string;
    card_hash?: string;
    fee?: number;
  };
  errors: unknown;
}

@Injectable()
export class ZarinpalService {
  private readonly logger = new Logger(ZarinpalService.name);
  private readonly baseUrl =
    process.env.ZARINPAL_SANDBOX === 'true' ? ZARINPAL_SANDBOX : ZARINPAL_PRODUCTION;
  private readonly merchantId =
    process.env.ZARINPAL_MERCHANT_ID ?? '00000000-0000-0000-0000-000000000000';
  private readonly callbackUrl =
    process.env.ZARINPAL_CALLBACK_URL ?? 'http://localhost:3000/payment/callback';
  private readonly devMode = !process.env.ZARINPAL_MERCHANT_ID;

  async request(amountToman: number, description: string, mobile?: string, email?: string) {
    if (this.devMode) {
      const authority = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.logger.warn(`[DEV MODE] ZarinPal request: ${authority} for ${amountToman} Toman`);
      return {
        authority,
        paymentUrl: `${this.callbackUrl}?Authority=${authority}&Status=OK`,
      };
    }

    const res = await fetch(`${this.baseUrl}/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: amountToman * 10,
        currency: 'IRR',
        description,
        callback_url: this.callbackUrl,
        metadata: { mobile, email },
      }),
    });

    const json = (await res.json()) as RequestResponse;
    if (json.data?.code !== 100) {
      this.logger.error(`ZarinPal request failed: ${JSON.stringify(json)}`);
      throw new Error(json.data?.message ?? 'خطا در ایجاد پرداخت');
    }

    const baseRedirect = this.baseUrl.replace('/v4/payment', '');
    return {
      authority: json.data.authority,
      paymentUrl: `${baseRedirect.replace('/pg', '')}/pg/StartPay/${json.data.authority}`,
    };
  }

  async verify(authority: string, amountToman: number) {
    if (this.devMode) {
      this.logger.warn(`[DEV MODE] ZarinPal verify: ${authority}`);
      return {
        success: true,
        refId: Math.floor(Math.random() * 1_000_000_000),
        cardPan: '****-****-****-1234',
      };
    }

    const res = await fetch(`${this.baseUrl}/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: amountToman * 10,
        authority,
      }),
    });
    const json = (await res.json()) as VerifyResponse;

    if (json.data?.code === 100 || json.data?.code === 101) {
      return {
        success: true,
        refId: json.data.ref_id,
        cardPan: json.data.card_pan,
      };
    }
    return { success: false, error: json.data?.message };
  }
}
