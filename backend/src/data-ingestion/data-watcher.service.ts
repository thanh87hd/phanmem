import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  DataIngestionBatch,
  IngestionSource,
  IngestionStatus,
} from './entities/data-ingestion-batch.entity';
import { DataPipelineService } from './data-pipeline.service';

@Injectable()
export class DataWatcherService implements OnModuleInit {
  private readonly logger = new Logger(DataWatcherService.name);

  private readonly inboxDir: string;
  private readonly archiveDir: string;

  constructor(
    @InjectRepository(DataIngestionBatch)
    private readonly batchRepo: Repository<DataIngestionBatch>,
    private readonly pipelineService: DataPipelineService,
  ) {
    // Prefer environment configuration (e.g. /data/inbox on Ubuntu) or fallback to local uploads/inbox
    this.inboxDir =
      process.env.RAW_DATA_INBOX_DIR ||
      path.resolve(process.cwd(), 'uploads', 'inbox');
    this.archiveDir =
      process.env.RAW_DATA_ARCHIVE_DIR ||
      path.resolve(process.cwd(), 'uploads', 'raw_archive');
  }

  onModuleInit() {
    this.ensureDirectories();
    this.logger.log(`Data Watcher initialized. Inbox: ${this.inboxDir}`);
  }

  private ensureDirectories() {
    try {
      if (!fs.existsSync(this.inboxDir)) {
        fs.mkdirSync(this.inboxDir, { recursive: true });
      }
      if (!fs.existsSync(this.archiveDir)) {
        fs.mkdirSync(this.archiveDir, { recursive: true });
      }
      const dupsDir = path.join(this.inboxDir, 'duplicates');
      if (!fs.existsSync(dupsDir)) {
        fs.mkdirSync(dupsDir, { recursive: true });
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not create inbox/archive directories: ${err.message}`,
      );
    }
  }

  /**
   * Cron job runs every 5 minutes to automatically scan the inbox folder
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCronScan() {
    this.logger.log('Executing automated raw data inbox scan...');
    await this.scanInbox('SYSTEM_WATCHER');
  }

  /**
   * Scan inbox directory for newly dropped files
   */
  async scanInbox(triggeredBy: string = 'SYSTEM'): Promise<{
    scannedFiles: number;
    processedBatches: DataIngestionBatch[];
    skippedDuplicates: string[];
  }> {
    this.ensureDirectories();
    const processedBatches: DataIngestionBatch[] = [];
    const skippedDuplicates: string[] = [];

    if (!fs.existsSync(this.inboxDir)) {
      return { scannedFiles: 0, processedBatches, skippedDuplicates };
    }

    const entries = fs.readdirSync(this.inboxDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const ext = path.extname(name).toLowerCase();
        return ['.xlsx', '.xls', '.csv', '.json'].includes(ext);
      });

    this.logger.log(`Found ${files.length} raw data file(s) in inbox.`);

    for (const fileName of files) {
      const sourceFilePath = path.join(this.inboxDir, fileName);

      try {
        // 1. Check if file is still being written
        const isStable = await this.checkFileStability(sourceFilePath);
        if (!isStable) {
          this.logger.warn(
            `File ${fileName} is still being written to. Skipping for next scan.`,
          );
          continue;
        }

        // 2. Compute SHA-256 Hash
        const fileHash = this.computeFileHash(sourceFilePath);

        // 3. Check for duplicates
        const existing = await this.batchRepo.findOne({
          where: { fileHash, status: IngestionStatus.COMPLETED },
        });

        if (existing) {
          this.logger.warn(
            `Duplicate file detected (Hash: ${fileHash}). Moving ${fileName} to duplicates folder.`,
          );
          const dupTarget = path.join(
            this.inboxDir,
            'duplicates',
            `${Date.now()}_${fileName}`,
          );
          fs.renameSync(sourceFilePath, dupTarget);
          skippedDuplicates.push(fileName);
          continue;
        }

        // 4. Create destination directory in archive: /data/raw_archive/YYYY/MM/DD/
        const now = new Date();
        const yyyy = now.getFullYear().toString();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const targetDir = path.join(this.archiveDir, yyyy, mm, dd);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const batchCode = `BATCH-${yyyy}${mm}${dd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const targetFileName = `${batchCode}_${fileName}`;
        const destFilePath = path.join(targetDir, targetFileName);

        // 5. Move file to Bronze Raw Archive
        fs.renameSync(sourceFilePath, destFilePath);

        // 6. Detect source type
        const ext = path.extname(fileName).toLowerCase();
        let dataSource = IngestionSource.FILE_DROP_EXCEL;
        if (ext === '.csv') dataSource = IngestionSource.FILE_DROP_CSV;
        else if (fileName.toUpperCase().includes('CORE'))
          dataSource = IngestionSource.CORE_BANKING;
        else if (fileName.toUpperCase().includes('HRM'))
          dataSource = IngestionSource.HRM;

        // 7. Create Batch record
        const batch = this.batchRepo.create({
          batchCode,
          dataSource,
          periodDate: `${yyyy}-${mm}-${dd}`,
          fileName,
          rawFilePath: destFilePath,
          fileHash,
          status: IngestionStatus.QUEUED,
          createdBy: triggeredBy,
          metadata: {
            originalName: fileName,
            fileSizeBytes: fs.statSync(destFilePath).size,
            archivedAt: new Date().toISOString(),
          },
        });

        const savedBatch = await this.batchRepo.save(batch);

        // 8. Trigger Pipeline processing
        this.pipelineService
          .processBatch(savedBatch.id)
          .catch((err) =>
            this.logger.error(
              `Async pipeline error on ${batchCode}: ${err.message}`,
            ),
          );

        processedBatches.push(savedBatch);
      } catch (fileErr: any) {
        this.logger.error(
          `Error processing inbox file ${fileName}: ${fileErr.message}`,
        );
      }
    }

    return {
      scannedFiles: files.length,
      processedBatches,
      skippedDuplicates,
    };
  }

  private computeFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  private async checkFileStability(
    filePath: string,
    checkDelayMs = 500,
  ): Promise<boolean> {
    try {
      const size1 = fs.statSync(filePath).size;
      await new Promise((r) => setTimeout(r, checkDelayMs));
      const size2 = fs.statSync(filePath).size;
      return size1 === size2 && size1 > 0;
    } catch {
      return false;
    }
  }
}
