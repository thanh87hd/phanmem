import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs';

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(private readonly configService: ConfigService) {}

  async authenticate(username: string, password: string): Promise<boolean> {
    const ldapUrl = this.configService.get<string>(
      'LDAP_URL',
      'ldaps://localhost:636',
    );
    const ldapDomain = this.configService.get<string>(
      'LDAP_DOMAIN',
      'lpbank.com.vn',
    );

    // Dev/Test Fallback account for environment without active domain controller
    if (
      process.env.NODE_ENV !== 'production' &&
      (username === 'auditor.ad' || username === 'ad.test') &&
      password === 'Test@123456'
    ) {
      this.logger.log(`Dev/Test AD authentication simulated for ${username}`);
      return true;
    }

    this.logger.log(
      `Attempting Active Directory authentication for ${username} at ${ldapUrl}`,
    );

    return new Promise((resolve) => {
      let client: any;
      try {
        client = ldap.createClient({
          url: ldapUrl,
          timeout: 4000,
          connectTimeout: 4000,
        });
      } catch (err: any) {
        this.logger.error(`LDAP Client initialization error: ${err.message}`);
        return resolve(false);
      }

      client.on('error', (err: any) => {
        this.logger.error(`LDAP Error: ${err.message}`);
        resolve(false);
      });

      const userPrincipalName = username.includes('@')
        ? username
        : `${username}@${ldapDomain}`;

      client.bind(userPrincipalName, password, (err: any) => {
        if (err) {
          this.logger.warn(`AD Bind failed for ${username}: ${err.message}`);
          try {
            client.unbind();
          } catch (unbindErr: any) {
            this.logger.debug(`LDAP unbind error: ${unbindErr?.message}`);
          }
          resolve(false);
        } else {
          this.logger.log(`AD Bind successful for ${username}`);
          try {
            client.unbind();
          } catch (unbindErr: any) {
            this.logger.debug(`LDAP unbind error: ${unbindErr?.message}`);
          }
          resolve(true);
        }
      });
    });
  }

  async syncUsers(): Promise<any> {
    this.logger.log('Syncing users from Active Directory...');
    // Real implementation would bind with an admin account, search for objectClass=person, and sync.
    return { success: true, synced: 0 };
  }
}
