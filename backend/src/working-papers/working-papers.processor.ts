import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { WorkingPapersService } from './working-papers.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
@Processor('working-papers', {
  autorun: process.env.ENABLE_BULL_WORKERS !== 'false',
})
export class WorkingPapersProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkingPapersProcessor.name);

  constructor(private readonly workingPapersService: WorkingPapersService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { action, id, fileData, user } = job.data;
    this.logger.debug(
      `Bắt đầu xử lý job ${job.id} - Action: ${action} cho WP ID: ${id}`,
    );

    try {
      if (action === 'exportExcel' || action === 'exportWord') {
        let buffer: Buffer;
        let ext = '';
        if (action === 'exportExcel') {
          buffer = await this.workingPapersService.generateExcel(id);
          ext = 'xlsx';
        } else {
          buffer = await this.workingPapersService.generateWord(id);
          ext = 'docx';
        }

        // Ensure uploads/working-papers folder exists
        const uploadDir = path.join(process.cwd(), 'uploads', 'working-papers');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `WorkingPaper_${id}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        const fileUrl = `/uploads/working-papers/${fileName}`;
        // Usually we would update an entity to store the export file url, but working paper might not have it.
        // We can just return the fileUrl as the job result so the client can query job status to get it.
        return { success: true, fileUrl };
      } else if (action === 'importSyncOffline') {
        const result = await this.workingPapersService.importSyncOffline(
          id,
          fileData,
          user,
        );
        return { success: true, data: result };
      }
      return { success: true };
    } catch (error) {
      this.logger.error(`Lỗi xử lý job ${job.id}`, error);
      throw error;
    }
  }
}
