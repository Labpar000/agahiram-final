import { Body, Controller, Get, Post, Req, Res, UseGuards, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  completeProfileSchema,
  sendOtpSchema,
  verifyOtpSchema,
  type CompleteProfileInput,
  type SendOtpInput,
  type VerifyOtpInput,
} from '@agahiram/shared';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @Post('otp/send')
  @UsePipes(new ZodValidationPipe(sendOtpSchema))
  async sendOtp(@Body() body: SendOtpInput) {
    return this.authService.sendOtp(body.phone);
  }

  @Public()
  @Post('otp/verify')
  @UsePipes(new ZodValidationPipe(verifyOtpSchema))
  async verifyOtp(@Body() body: VerifyOtpInput, @Res({ passthrough: true }) res: FastifyReply) {
    const result = await this.authService.verifyOtp(body.phone, body.code);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const refreshToken = (req.cookies as Record<string, string>)?.refreshToken;
    const result = await this.authService.refreshTokens(refreshToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  // Logout is intentionally Public: an expired or invalid token must still be able to clear
  // its cookies on the server so the user can recover from a broken session.
  @Public()
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return { message: 'با موفقیت خارج شدید' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @UsePipes(new ZodValidationPipe(completeProfileSchema))
  async completeProfile(@CurrentUser('sub') userId: string, @Body() body: CompleteProfileInput) {
    return this.authService.completeProfile(userId, body);
  }

  private setAuthCookies(res: FastifyReply, accessToken: string, refreshToken: string) {
    /* `lax` works for same-site / sub-domain flows; in true cross-origin admin
     * deployments (admin.example.com → api.example.com), set
     * COOKIE_SAMESITE=none + COOKIE_SECURE=true. Secure is required when
     * SameSite=None per RFC 6265bis. */
    const sameSite =
      (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict' | undefined) ?? 'lax';
    const secure = process.env.COOKIE_SECURE === 'true' || sameSite === 'none';

    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: 60 * 15,
    });
    res.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}
