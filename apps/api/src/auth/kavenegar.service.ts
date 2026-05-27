import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KavenegarService {
  private readonly logger = new Logger(KavenegarService.name);
  private readonly apiKey = process.env.KAVENEGAR_API_KEY ?? '';
  private readonly template = process.env.KAVENEGAR_OTP_TEMPLATE ?? 'verify';
  private readonly devMode = process.env.KAVENEGAR_DEV_MODE === 'true' || !this.apiKey;

  async sendOtp(phone: string, code: string): Promise<void> {
    if (this.devMode) {
      this.logger.warn(`[DEV MODE] OTP for ${phone}: ${code}`);
      return;
    }

    const url = new URL(`https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json`);
    url.searchParams.set('receptor', phone);
    url.searchParams.set('token', code);
    url.searchParams.set('template', this.template);

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const json = (await response.json()) as { return?: { status: number; message: string } };
      if (json.return?.status !== 200) {
        this.logger.error(`Kavenegar error: ${JSON.stringify(json)}`);
        throw new Error(json.return?.message ?? 'خطا در ارسال پیامک');
      }
      this.logger.log(`OTP sent to ${phone}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phone}`, error);
      throw new Error('خطا در ارسال پیامک');
    }
  }
}
