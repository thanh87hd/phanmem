import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@Processor('mail', { autorun: process.env.ENABLE_BULL_WORKERS !== 'false' })
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Đang xử lý job gửi email: ${job.id}`);
    const { type, payload } = job.data;

    try {
      if (type === 'OVERDUE_WARNING') {
        const { to, recTitle, dueDate, department } = payload;
        await this.mailService.sendOverdueWarning(
          to,
          recTitle,
          dueDate,
          department,
        );
      } else if (type === 'REPORT_ISSUED') {
        const { to, reportTitle, issuedBy } = payload;
        await this.mailService.sendReportIssued(to, reportTitle, issuedBy);
      }
      this.logger.debug(`Hoàn thành gửi email job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Lỗi gửi email cho job ${job.id}`, error);
      throw error;
    }
  }
}
