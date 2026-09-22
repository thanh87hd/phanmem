import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { AuditReportsService } from './audit-reports.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
@Processor('reports', { autorun: process.env.ENABLE_BULL_WORKERS !== 'false' })
export class AuditReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditReportsProcessor.name);

  constructor(private readonly auditReportsService: AuditReportsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { action, reportId, username } = job.data;
    this.logger.debug(
      `Bắt đầu xử lý job ${job.id} - Action: ${action} cho Report ID: ${reportId}`,
    );

    try {
      if (action === 'exportWord' || action === 'exportPdf') {
        await this.auditReportsService.updateExportStatus(
          reportId,
          'Processing',
          job.id as string,
        );
        let buffer: Buffer;
        let ext = '';
        if (action === 'exportWord') {
          buffer = await this.auditReportsService.generateWord(reportId);
          ext = 'docx';
        } else {
          buffer = await this.auditReportsService.generatePdf(reportId);
          ext = 'pdf';
        }

        // Ensure uploads/reports folder exists
        const uploadDir = path.join(process.cwd(), 'uploads', 'reports');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `Bao_cao_kiem_toan_${reportId}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        const fileUrl = `/uploads/reports/${fileName}`;
        await this.auditReportsService.updateExportStatus(
          reportId,
          'Completed',
          job.id as string,
          fileUrl,
        );
      } else if (action === 'signReport') {
        await this.auditReportsService.updateSignStatus(
          reportId,
          'Processing',
          job.id as string,
        );
        await this.auditReportsService.processDigitalSignature(
          reportId,
          username,
        );
        await this.auditReportsService.updateSignStatus(
          reportId,
          'Completed',
          job.id as string,
        );
      }
      return { success: true };
    } catch (error) {
      this.logger.error(`Lỗi xử lý job ${job.id}`, error);
      if (action === 'exportWord' || action === 'exportPdf') {
        await this.auditReportsService.updateExportStatus(
          reportId,
          'Failed',
          job.id as string,
        );
      } else if (action === 'signReport') {
        await this.auditReportsService.updateSignStatus(
          reportId,
          'Failed',
          job.id as string,
        );
      }
      throw error;
    }
  }
}
