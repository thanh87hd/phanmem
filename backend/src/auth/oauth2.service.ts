import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OAuth2Service {
  private readonly logger = new Logger(OAuth2Service.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Redirect URL generator for the Bank's SSO Portal (OAuth2)
   */
  getLoginUrl(): string {
    const ssoUrl = this.configService.get<string>('SSO_OAUTH2_URL');
    const clientId = this.configService.get<string>('SSO_CLIENT_ID');
    const redirectUri = this.configService.get<string>('SSO_REDIRECT_URI');

    // Placeholder for standard OAuth2 authorization request
    return `${ssoUrl}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid profile email`;
  }

  /**
   * Exchange the authorization code for an Access Token and User Info
   */
  async handleCallback(code: string): Promise<any> {
    this.logger.log(
      `Received OAuth2 Authorization Code: ${code}. Exchanging for token...`,
    );

    const ssoUrl = this.configService.get<string>('SSO_OAUTH2_URL');
    const clientId = this.configService.get<string>('SSO_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SSO_CLIENT_SECRET');

    // MOCK IMPLEMENTATION
    // Since the exact OAuth2 structure for the bank is unknown, we mock the behavior.
    if (!ssoUrl) {
      this.logger.warn(
        'SSO_OAUTH2_URL not configured. Returning mock SSO user.',
      );
      return {
        success: true,
        email: 'sso_user@lpbank.com.vn',
        roles: ['SSO_Verified'],
      };
    }

    try {
      // In production, execute the actual call
      // const response = await axios.post(`${ssoUrl}/token`, {
      //   code,
      //   client_id: clientId,
      //   client_secret: clientSecret,
      //   grant_type: 'authorization_code'
      // });
      // return response.data;

      this.logger.log(`Mock SSO token exchange completed for code: ${code}`);
      return {
        success: true,
        email: 'sso_user@lpbank.com.vn',
        roles: ['SSO_Verified'],
      };
    } catch (error) {
      this.logger.error(`SSO Token exchange failed: ${error}`);
      throw new Error('SSO Authentication Failed');
    }
  }
}
