import { Injectable, Logger } from '@nestjs/common';

type Provider = 'smsir' | 'kavenegar' | 'dev';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: Provider;

  private readonly smsIrKey = process.env.SMS_IR_API_KEY ?? '';
  private readonly smsIrTemplateId = Number(process.env.SMS_IR_TEMPLATE_ID ?? '0');
  private readonly smsIrParamName = process.env.SMS_IR_PARAM_NAME ?? 'Code';
  private readonly smsIrLine = process.env.SMS_IR_LINE_NUMBER ?? '';
  private readonly otpTextTemplate = process.env.SMS_IR_OTP_TEXT ?? 'کد آگهی‌گرام: {code}\nلغو۱۱';

  private readonly kavenegarKey = process.env.KAVENEGAR_API_KEY ?? '';
  private readonly kavenegarTemplate = process.env.KAVENEGAR_OTP_TEMPLATE ?? 'verify';

  constructor() {
    const explicit = (process.env.SMS_PROVIDER ?? '').toLowerCase() as Provider | '';
    if (explicit === 'smsir' || explicit === 'kavenegar' || explicit === 'dev') {
      this.provider = explicit;
    } else if (this.smsIrKey) {
      this.provider = 'smsir';
    } else if (this.kavenegarKey) {
      this.provider = 'kavenegar';
    } else {
      this.provider = 'dev';
    }
    this.logger.log(`SMS provider: ${this.provider}`);
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    if (this.provider === 'dev') {
      this.logger.warn(`[DEV MODE] OTP for ${phone}: ${code}`);
      return;
    }
    if (this.provider === 'smsir') {
      await this.sendViaSmsIr(phone, code);
      return;
    }
    await this.sendViaKavenegar(phone, code);
  }

  private async sendViaSmsIr(phone: string, code: string): Promise<void> {
    if (!this.smsIrKey) {
      this.logger.error('SMS_IR_API_KEY is not set');
      throw new Error('سرویس پیامک پیکربندی نشده است');
    }

    if (this.smsIrTemplateId) {
      try {
        await this.smsIrVerify(phone, code);
        return;
      } catch (err) {
        this.logger.warn(
          `sms.ir verify failed (${(err as Error).message}); trying bulk send fallback`,
        );
      }
    }

    if (!this.smsIrLine) {
      this.logger.error('SMS_IR_LINE_NUMBER is not set; cannot send via bulk');
      throw new Error('شماره خط پیامک تنظیم نشده است');
    }
    await this.smsIrBulk(phone, code);
  }

  private async smsIrVerify(phone: string, code: string): Promise<void> {
    const payload = {
      mobile: phone,
      templateId: this.smsIrTemplateId,
      parameters: [{ name: this.smsIrParamName, value: code }],
    };
    const response = await fetch('https://api.sms.ir/v1/send/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': this.smsIrKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let body: { status?: number; message?: string } = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
    if (!response.ok || body.status !== 1) {
      throw new Error(body.message ?? `sms.ir verify HTTP ${response.status}`);
    }
    this.logger.log(`OTP sent to ${phone} via sms.ir verify`);
  }

  private async smsIrBulk(phone: string, code: string): Promise<void> {
    const messageText = this.otpTextTemplate.replace('{code}', code);
    const payload = {
      lineNumber: Number(this.smsIrLine),
      messageText,
      mobiles: [phone],
      sendDateTime: null,
    };
    try {
      const response = await fetch('https://api.sms.ir/v1/send/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': this.smsIrKey,
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let body: { status?: number; message?: string } = {};
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: text };
      }
      if (!response.ok || body.status !== 1) {
        this.logger.error(
          `sms.ir bulk error (${response.status}): ${body.message ?? 'unknown'} | raw=${text.slice(0, 200)}`,
        );
        throw new Error(body.message ?? 'خطا در ارسال پیامک');
      }
      this.logger.log(`OTP sent to ${phone} via sms.ir bulk`);
    } catch (error) {
      this.logger.error(`Failed to send OTP via sms.ir bulk to ${phone}`, error as Error);
      throw new Error('خطا در ارسال پیامک');
    }
  }

  private async sendViaKavenegar(phone: string, code: string): Promise<void> {
    if (!this.kavenegarKey) {
      this.logger.error('KAVENEGAR_API_KEY is not set');
      throw new Error('سرویس پیامک پیکربندی نشده است');
    }

    const url = new URL(`https://api.kavenegar.com/v1/${this.kavenegarKey}/verify/lookup.json`);
    url.searchParams.set('receptor', phone);
    url.searchParams.set('token', code);
    url.searchParams.set('template', this.kavenegarTemplate);

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const json = (await response.json()) as { return?: { status: number; message: string } };
      if (json.return?.status !== 200) {
        this.logger.error(`Kavenegar error: ${JSON.stringify(json)}`);
        throw new Error(json.return?.message ?? 'خطا در ارسال پیامک');
      }
      this.logger.log(`OTP sent to ${phone} via kavenegar`);
    } catch (error) {
      this.logger.error(`Failed to send OTP via kavenegar to ${phone}`, error as Error);
      throw new Error('خطا در ارسال پیامک');
    }
  }
}
