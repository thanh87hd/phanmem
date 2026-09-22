import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { RiskProfile } from './entities/risk-profile.entity';
import {
  RiskProfileChangeRequest,
  ChangeRequestStatus,
} from './entities/risk-profile-change-request.entity';
import { RiskProfileHistory } from './entities/risk-profile-history.entity';
import * as ExcelJS from 'exceljs';
import type { AuthUserContext } from './dto/risk-types';

@Injectable()
export class RiskProfileService {
  private readonly logger = new Logger(RiskProfileService.name);

  constructor(
    @InjectRepository(RiskProfile)
    private readonly riskProfileRepo: Repository<RiskProfile>,
    @InjectRepository(RiskProfileChangeRequest)
    private readonly changeRequestRepo: Repository<RiskProfileChangeRequest>,
    @InjectRepository(RiskProfileHistory)
    private readonly profileHistoryRepo: Repository<RiskProfileHistory>,
  ) {}

  // ==================== HỒ SƠ RỦI RO (HSRR KTNB) ====================
  async findAllRiskProfiles(filters?: {
    profileCode?: string;
    targetEntity?: string;
  }) {
    const query = this.riskProfileRepo.createQueryBuilder('rp');
    if (filters?.profileCode) {
      query.andWhere('rp.profileCode = :code', { code: filters.profileCode });
    }
    if (filters?.targetEntity) {
      query.andWhere('rp.targetEntity LIKE :target', {
        target: `%${filters.targetEntity}%`,
      });
    }
    return query.orderBy('rp.id', 'ASC').getMany();
  }

  async getRiskProfilesSummary() {
    const profiles = await this.riskProfileRepo.find();
    const domainCounts: Record<
      string,
      { name: string; count: number; highRiskCount: number }
    > = {};

    profiles.forEach((p) => {
      if (!domainCounts[p.profileCode]) {
        domainCounts[p.profileCode] = {
          name: p.domainName,
          count: 0,
          highRiskCount: 0,
        };
      }
      domainCounts[p.profileCode].count++;
      if (p.inherentRiskLevel === 'Cao') {
        domainCounts[p.profileCode].highRiskCount++;
      }
    });

    return {
      totalProfiles: profiles.length,
      domains: domainCounts,
      highInherentRisks: profiles.filter((p) => p.inherentRiskLevel === 'Cao')
        .length,
      highResidualRisks: profiles.filter((p) => p.residualRiskLevel === 'Cao')
        .length,
    };
  }

  // 1. Export Excel
  async exportRiskProfilesToExcel(profileCode?: string): Promise<Buffer> {
    const profiles = await this.findAllRiskProfiles({
      profileCode: profileCode === 'ALL' ? undefined : profileCode,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ Thống Kiểm Toán Nội Bộ (KTNB)';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Bo_Ho_So_Rui_Ro_KTNB', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });

    // Title banner
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BỘ HỒ SƠ RỦI RO CHUẨN MỰC KIỂM TOÁN NỘI BỘ (HSRR KTNB)';
    titleCell.font = {
      name: 'Arial',
      size: 16,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 36;

    // Subtitle
    worksheet.mergeCells('A2:L2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Áp dụng chuẩn mực IIA Global & TT 66/NHNN | Xuất ngày: ${new Date().toLocaleDateString('vi-VN')} | Tổng số rủi ro: ${profiles.length}`;
    subCell.font = {
      name: 'Arial',
      size: 10,
      italic: true,
      color: { argb: 'FF475569' },
    };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    worksheet.getRow(3).height = 10;

    // Headers
    const headers = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã Mảng (Code)', key: 'profileCode', width: 22 },
      { header: 'Tên Mảng Nghiệp Vụ', key: 'domainName', width: 28 },
      { header: 'Nhóm Rủi Ro (Category)', key: 'riskCategory', width: 22 },
      { header: 'Rủi Ro Cấp 1 (L1)', key: 'riskL1', width: 35 },
      { header: 'Rủi Ro Cấp 2 / Nguy Cơ (L2)', key: 'riskL2', width: 45 },
      {
        header: 'Biện Pháp Kiểm Soát Cần Có',
        key: 'controlMeasures',
        width: 45,
      },
      { header: 'Rủi Ro Cố Hữu', key: 'inherentRiskLevel', width: 18 },
      {
        header: 'Chất Lượng KS',
        key: 'controlOperatingEffectiveness',
        width: 18,
      },
      { header: 'Rủi Ro Còn Lại', key: 'residualRiskLevel', width: 18 },
      { header: 'Đơn Vị Mục Tiêu', key: 'targetEntity', width: 18 },
      { header: 'Mã Lỗi Liên Kết', key: 'mappedDefectCodes', width: 25 },
    ];

    const headerRow = worksheet.getRow(4);
    headerRow.height = 28;
    headers.forEach((h, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = h.header;
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
      worksheet.getColumn(index + 1).width = h.width;
    });

    // Data rows
    profiles.forEach((p, idx) => {
      const row = worksheet.addRow([
        idx + 1,
        p.profileCode,
        p.domainName,
        p.riskCategory || '',
        p.riskL1,
        p.riskL2,
        p.controlMeasures || '',
        p.inherentRiskLevel || 'Trung bình',
        p.controlOperatingEffectiveness || 'Trung bình',
        p.residualRiskLevel || 'Trung bình',
        p.targetEntity || 'ĐVKD',
        Array.isArray(p.mappedDefectCodes)
          ? p.mappedDefectCodes.join(', ')
          : '',
      ]);

      row.height = 32;
      row.alignment = { vertical: 'middle', wrapText: true };

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if ([1, 2, 8, 9, 10, 11].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        if (colNumber === 8 || colNumber === 10) {
          if (cell.value === 'Cao') {
            cell.font = {
              name: 'Arial',
              size: 10,
              bold: true,
              color: { argb: 'FF991B1B' },
            };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' },
            };
          }
        }
      });
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  // 2. Generate Import Template Excel
  async generateRiskProfilesTemplateExcel(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template_Nhap_HSRR');

    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'MẪU NHẬP LIỆU BỘ HỒ SƠ RỦI RO KTNB (IMPORT TEMPLATE)';
    titleCell.font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 32;

    const headers = [
      'Mã Mảng (Bắt buộc, VD: HS01_HSRR_CNTT)',
      'Tên Mảng Nghiệp Vụ (Bắt buộc)',
      'Nhóm Rủi Ro (Category)',
      'Rủi Ro Cấp 1 (L1 - Bắt buộc)',
      'Rủi Ro Cấp 2 / Nguy Cơ (L2 - Bắt buộc)',
      'Biện Pháp Kiểm Soát Cần Có',
      'Rủi Ro Cố Hữu (Cao / Trung bình / Thấp)',
      'Hiệu Quả Kiểm Soát (Cao / Trung bình / Thấp)',
      'Rủi Ro Còn Lại (Cao / Trung bình / Thấp)',
      'Đơn Vị Mục Tiêu (ĐVKD / ChiNhanh / PGD / HoiSo)',
      'Mã Lỗi Liên Kết (Cách nhau dấu phẩy, VD: PTD_001, TD_002)',
    ];

    const widths = [35, 30, 25, 35, 45, 45, 25, 25, 25, 25, 35];

    const headerRow = worksheet.getRow(2);
    headerRow.height = 30;
    headers.forEach((h, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = h;
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      worksheet.getColumn(index + 1).width = widths[index];
    });

    const sampleRow = worksheet.addRow([
      'HS01_HSRR_CNTT',
      'CNTT & An ninh mạng',
      'HẠ TẦNG & AN NINH',
      'Trung tâm dữ liệu (Data Center)',
      'Trung tâm dữ liệu gặp sự cố môi trường nghiêm trọng dẫn đến gián đoạn core',
      'Xây dựng DR site, trang bị UPS, PCCC tự động',
      'Cao',
      'Trung bình',
      'Trung bình',
      'HoiSo',
      'PTD_006, PTD_007',
    ]);
    sampleRow.font = { name: 'Arial', size: 10, italic: true };

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  // 3. Import Excel to Create Change Request (Pending Approval)
  async importRiskProfilesFromExcel(
    fileBuffer: Buffer,
    user: AuthUserContext,
    reason?: string,
  ): Promise<RiskProfileChangeRequest> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException('File Excel không có dữ liệu trang tính.');
    }

    let headerRowIdx = 2;
    let colOffset = 0;

    for (let r = 1; r <= 6; r++) {
      const row = worksheet.getRow(r);
      const cell1Text = (row.getCell(1).text || '').trim().toLowerCase();
      const cell2Text = (row.getCell(2).text || '').trim().toLowerCase();
      if (cell1Text.includes('mã mảng') || cell1Text.includes('profilecode')) {
        headerRowIdx = r;
        colOffset = 0;
        break;
      } else if (
        cell2Text.includes('mã mảng') ||
        cell2Text.includes('profilecode') ||
        cell1Text === 'stt'
      ) {
        headerRowIdx = r;
        colOffset = 1;
        break;
      }
    }

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;

      const cell1Val = (row.getCell(1).text || '').trim();
      const cell2Val = (row.getCell(2).text || '').trim();

      let currentOffset = colOffset;
      if (
        !currentOffset &&
        /^\d+$/.test(cell1Val) &&
        cell2Val &&
        cell2Val.length > 2
      ) {
        currentOffset = 1;
      }

      const profileCode = (row.getCell(1 + currentOffset).text || '').trim();
      const domainName = (row.getCell(2 + currentOffset).text || '').trim();
      const riskCategory = (row.getCell(3 + currentOffset).text || '').trim();
      const riskL1 = (row.getCell(4 + currentOffset).text || '').trim();
      const riskL2 = (row.getCell(5 + currentOffset).text || '').trim();
      const controlMeasures = (
        row.getCell(6 + currentOffset).text || ''
      ).trim();
      const inherentRiskLevel =
        (row.getCell(7 + currentOffset).text || '').trim() || 'Trung bình';
      const controlOperatingEffectiveness =
        (row.getCell(8 + currentOffset).text || '').trim() || 'Trung bình';
      const residualRiskLevel =
        (row.getCell(9 + currentOffset).text || '').trim() || 'Trung bình';
      const targetEntity =
        (row.getCell(10 + currentOffset).text || '').trim() || 'ĐVKD';
      const defectCodesRaw = (
        row.getCell(11 + currentOffset).text || ''
      ).trim();

      if (
        profileCode &&
        riskL1 &&
        riskL2 &&
        !profileCode.toLowerCase().includes('mã mảng')
      ) {
        const mappedDefectCodes = defectCodesRaw
          ? defectCodesRaw
              .split(/[,;\n]/)
              .map((c: string) => c.trim())
              .filter(Boolean)
          : [];

        rows.push({
          profileCode,
          domainName: domainName || profileCode,
          riskCategory,
          riskL1,
          riskL2,
          controlMeasures,
          inherentRiskLevel,
          controlOperatingEffectiveness,
          residualRiskLevel,
          targetEntity,
          mappedDefectCodes,
        });
      }
    });

    if (rows.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy dòng dữ liệu hợp lệ trong file Excel.',
      );
    }

    const changeRequest = this.changeRequestRepo.create({
      title: `Nhập file Excel cập nhật Bộ Hồ Sơ Rủi Ro (${rows.length} rủi ro)`,
      requestType: 'ImportExcel',
      status: ChangeRequestStatus.PENDING_L1,
      reason:
        reason ||
        `Tải lên file Excel ngày ${new Date().toLocaleDateString('vi-VN')}`,
      changes: rows.map((r) => ({
        type: 'IMPORT',
        newData: r,
      })),
      createdByUserId: user?.id,
      createdByName: user?.fullName || user?.username || 'Cán bộ KTV',
    });

    return this.changeRequestRepo.save(changeRequest);
  }

  // 4. Create Manual Edit Change Request
  async createRiskProfileChangeRequest(
    dto: {
      title: string;
      domainCode?: string;
      reason: string;
      changes: Array<{
        type: 'CREATE' | 'UPDATE' | 'DELETE';
        profileId?: number;
        oldData?: any;
        newData: any;
      }>;
    },
    user?: AuthUserContext,
  ) {
    const cr = this.changeRequestRepo.create({
      title: dto.title,
      domainCode: dto.domainCode || 'ALL',
      requestType: 'ManualEdit',
      status: ChangeRequestStatus.PENDING_L1,
      reason: dto.reason,
      changes: dto.changes,
      createdByUserId: user?.id,
      createdByName: user?.fullName || user?.username || 'Cán bộ KTV',
    });

    return this.changeRequestRepo.save(cr);
  }

  // 5. Get List of Change Requests
  async findAllChangeRequests(status?: string) {
    const qb = this.changeRequestRepo.createQueryBuilder('cr');
    if (status && status !== 'ALL') {
      qb.andWhere('cr.status = :status', { status });
    }
    return qb.orderBy('cr.createdAt', 'DESC').getMany();
  }

  // 6. Review L1 (Cấp Phòng)
  async reviewChangeRequestL1(
    id: number,
    action: 'APPROVE' | 'REJECT',
    notes: string,
    user: AuthUserContext,
  ) {
    const cr = await this.changeRequestRepo.findOne({ where: { id } });
    if (!cr) throw new NotFoundException('Không tìm thấy đề xuất thay đổi');

    if (cr.status !== ChangeRequestStatus.PENDING_L1) {
      throw new BadRequestException(
        `Đề xuất đang ở trạng thái "${cr.status}", không thể duyệt cấp Phòng.`,
      );
    }

    cr.reviewerL1Id = user?.id || user?.userId || 0;
    cr.reviewerL1Name = user?.fullName || user?.username || 'Trưởng phòng KT';
    cr.reviewedL1At = new Date();
    cr.reviewerL1Notes = notes;

    if (action === 'APPROVE') {
      cr.status = ChangeRequestStatus.PENDING_L2;
    } else {
      cr.status = ChangeRequestStatus.REJECTED;
    }

    return this.changeRequestRepo.save(cr);
  }

  // 7. Approve L2 (Cấp Khối / CAE) -> Apply to risk_profiles and write history
  async approveChangeRequestL2(
    id: number,
    action: 'APPROVE' | 'REJECT',
    notes: string,
    user: AuthUserContext,
  ) {
    const cr = await this.changeRequestRepo.findOne({ where: { id } });
    if (!cr) throw new NotFoundException('Không tìm thấy đề xuất thay đổi');

    if (cr.status !== ChangeRequestStatus.PENDING_L2) {
      throw new BadRequestException(
        `Đề xuất đang ở trạng thái "${cr.status}", chỉ có thể duyệt khi đã qua cấp Phòng (PendingL2).`,
      );
    }

    cr.approverL2Id = user?.id || user?.userId || 0;
    cr.approverL2Name =
      user?.fullName || user?.username || 'Lãnh đạo Khối KTNB';
    cr.approvedL2At = new Date();
    cr.approverL2Notes = notes;

    if (action === 'REJECT') {
      cr.status = ChangeRequestStatus.REJECTED;
      return this.changeRequestRepo.save(cr);
    }

    // Process APPROVED -> Apply changes to risk_profiles
    cr.status = ChangeRequestStatus.APPROVED;
    const savedCr = await this.changeRequestRepo.save(cr);

    for (const change of cr.changes) {
      if (change.type === 'UPDATE' && change.profileId) {
        const existing = await this.riskProfileRepo.findOne({
          where: { id: change.profileId },
        });
        if (existing) {
          const hist = this.profileHistoryRepo.create({
            riskProfileId: existing.id,
            changeRequestId: cr.id,
            action: 'UPDATE',
            oldData: existing,
            newData: { ...existing, ...change.newData },
            reason: cr.reason,
            changedByUserId: cr.createdByUserId,
            changedByName: cr.createdByName,
            approvedByL1Name: cr.reviewerL1Name,
            approvedByL2Name: cr.approverL2Name,
          });
          await this.profileHistoryRepo.save(hist);
          Object.assign(existing, change.newData);
          await this.riskProfileRepo.save(existing);
        }
      } else if (change.type === 'CREATE' || change.type === 'IMPORT') {
        const newProfile = this.riskProfileRepo.create(
          change.newData as Partial<RiskProfile>,
        );
        const savedProfile = (await this.riskProfileRepo.save(
          newProfile as any,
        )) as RiskProfile;
        const hist = this.profileHistoryRepo.create({
          riskProfileId: savedProfile.id,
          changeRequestId: cr.id,
          action: change.type,
          oldData: null,
          newData: savedProfile,
          reason: cr.reason,
          changedByUserId: cr.createdByUserId,
          changedByName: cr.createdByName,
          approvedByL1Name: cr.reviewerL1Name,
          approvedByL2Name: cr.approverL2Name,
        });
        await this.profileHistoryRepo.save(hist);
      } else if (change.type === 'DELETE' && change.profileId) {
        const existing = await this.riskProfileRepo.findOne({
          where: { id: change.profileId },
        });
        if (existing) {
          const hist = this.profileHistoryRepo.create({
            riskProfileId: existing.id,
            changeRequestId: cr.id,
            action: 'DELETE',
            oldData: existing,
            newData: null,
            reason: cr.reason,
            changedByUserId: cr.createdByUserId,
            changedByName: cr.createdByName,
            approvedByL1Name: cr.reviewerL1Name,
            approvedByL2Name: cr.approverL2Name,
          });
          await this.profileHistoryRepo.save(hist);
          await this.riskProfileRepo.remove(existing);
        }
      }
    }

    return savedCr;
  }

  // 8. Get History of a Risk Profile
  async getRiskProfileHistories(profileId: number) {
    return this.profileHistoryRepo.find({
      where: { riskProfileId: profileId },
      order: { createdAt: 'DESC' },
    });
  }
}
