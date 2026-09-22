import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TokenAppService {
  private readonly logger = new Logger(TokenAppService.name);

  async verifyOtp(username: string, otpCode: string): Promise<boolean> {
    this.logger.log('Verifying OTP code via Proprietary Token App for ');
    // TODO: Connect to the Bank's proprietary Token App API
    // return await axios.post('http://internal.bank.otp/api/verify', { user: username, token: otpCode });
    return otpCode === '123456'; // Mock
  }
}
