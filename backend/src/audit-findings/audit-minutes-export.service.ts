import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditMinute } from './entities/audit-minute.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditSample } from './entities/audit-sample.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { MinutesExportContext } from './builders/minutes-export.types';
import { MinutesWordDocumentBuilder } from './builders/minutes-word-document.builder';
import { MinutesExcelWorkbookBuilder } from './builders/minutes-excel-workbook.builder';

@Injectable()
export class AuditMinutesExportService {
  private readonly logger = new Logger(AuditMinutesExportService.name);

  constructor(
    @InjectRepository(AuditMinute)
    private readonly auditMinuteRepository: Repository<AuditMinute>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(AuditSample)
    private readonly sampleRepo: Repository<AuditSample>,
    @InjectRepository(AuditEngagement)
    private readonly engagementRepo: Repository<AuditEngagement>,
  ) {}

  async findOne(id: number): Promise<AuditMinute> {
    const minute = await this.auditMinuteRepository.findOne({
      where: { id },
      relations: ['findings', 'findings.personnel', 'engagement'],
    });
    if (!minute) {
      throw new NotFoundException('AuditMinute #' + id + ' not found');
    }
    return minute;
  }

  private async prepareExportContext(
    id: number,
    exportType?: string,
  ): Promise<MinutesExportContext> {
    const minute = await this.findOne(id);
    const mode = exportType || minute.minuteType || 'MB04_MERGED';

    const engagement = minute.engagementId
      ? await this.engagementRepo.findOne({
          where: { id: minute.engagementId },
          relations: ['leadAuditorUser', 'auditedDepartment', 'plan'],
        })
      : null;

    let findings = await this.findingRepo.find({
      where: [{ minuteId: id }, { engagementId: minute.engagementId }],
      relations: [
        'personnel',
        'internalDefectCodeEntity',
        'nd340DefectCodeEntity',
        'nhanSuDefectCodeEntity',
        'proposerUser',
        'appraiserUser',
        'businessLeaderUser',
      ],
      order: { id: 'ASC' },
    });

    if (mode === 'MB04_TD') {
      findings = findings.filter(
        (f) => f.operationType === 'TD' || f.findingCategory === 'TD',
      );
    } else if (mode === 'MB04_PTD') {
      findings = findings.filter(
        (f) =>
          f.operationType === 'PTD' ||
          f.findingCategory === 'PTD' ||
          f.findingCategory === 'KeToan',
      );
    } else if (mode === 'MB04_PGDBD') {
      findings = findings.filter(
        (f) =>
          f.operationType === 'TKBĐ' ||
          f.findingCategory === 'PGDBD' ||
          f.channel === 'PGDBD',
      );
    }

    const samples = minute.engagementId
      ? await this.sampleRepo
          .createQueryBuilder('sample')
          .innerJoin('sample.batch', 'batch')
          .where('batch.engagementId = :engId', { engId: minute.engagementId })
          .orderBy('sample.sequenceNo', 'ASC')
          .getMany()
      : [];

    return { minute, engagement, findings, samples, mode };
  }

  /**
   * Sinh Biên bản kiểm toán MB04 thực tế đầy đủ theo từng phân hệ (Word)
   */
  async generateWord(id: number, exportType?: string): Promise<Buffer> {
    const ctx = await this.prepareExportContext(id, exportType);
    return MinutesWordDocumentBuilder.build(ctx);
  }

  /**
   * Sinh file Excel phục vụ Đối soát quy mô lớn (> 1.000 dòng) và kiểm tra chi tiết các bảng kê PTD & Tín dụng
   */
  async generateExcel(id: number, exportType?: string): Promise<Buffer> {
    const ctx = await this.prepareExportContext(id, exportType);
    return MinutesExcelWorkbookBuilder.build(ctx);
  }
}
