import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class HrSyncService {
  private readonly logger = new Logger(HrSyncService.name);

  constructor(private readonly configService: ConfigService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyHrSync() {
    this.logger.log('Running nightly HR synchronization batch job...');

    const hrApiUrl = this.configService.get<string>('HR_API_URL');

    // MOCK IMPLEMENTATION
    // Since the exact HR system API specs are unknown, we mock the behavior.
    if (!hrApiUrl) {
      this.logger.warn('HR_API_URL not configured. Skipping HR sync.');
      return;
    }

    try {
      this.logger.log(`Fetching latest HR data from ${hrApiUrl}...`);
      // In production, execute the actual call
      // const response = await axios.get(`${hrApiUrl}/employees`);
      // await this.processHrData(response.data);

      this.logger.log('Mock HR synchronization completed successfully.');
    } catch (error) {
      this.logger.error(`HR synchronization failed: ${error}`);
    }
  }
}
