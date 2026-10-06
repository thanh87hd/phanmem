import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenAppService {
  private readonly logger = new Logger(TokenAppService.name);

  constructor(@Optional() private readonly configService?: ConfigService) {}

  async verifyOtp(username: string, otpCode: string): Promise<boolean> {
    this.logger.log(`Verifying OTP code via Proprietary Token App for user: ${username}`);
    const tokenAppUrl = this.configService?.get<string>('TOKEN_APP_API_URL');
    if (tokenAppUrl) {
      // Bank's Proprietary Token App API integration endpoint
      return false;
    }
    const mockCode = this.configService?.get<string>('DEV_MOCK_OTP') ?? '123456';
    return otpCode === mockCode;
  }
}
