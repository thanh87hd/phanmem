import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { AuditUniverseService } from '../audit-universe/audit-universe.service';
import { RiskCriteriaService } from '../risk-criteria/risk-criteria.service';
import { RiskAssessmentsService } from '../risk-assessments/risk-assessments.service';
import { RiskControlMatrixService } from '../risk-control-matrix/risk-control-matrix.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditPlanUnit } from '../audit-plans/entities/audit-plan-unit.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { User } from '../users/entities/user.entity';
import { ContinuousAuditRule } from '../continuous-monitoring/entities/continuous-audit-rule.entity';
import { Role } from '../roles/entities/role.entity';
import { getNormalizedKey } from './import-key-map';

function safeCellString(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return `${v}`;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if ('text' in v && v.text !== undefined && v.text !== null) {
      return safeCellString(v.text);
    }
    if ('result' in v && v.result !== undefined && v.result !== null) {
      return safeCellString(v.result);
    }
    return '';
  }
  return '';
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private usersService: UsersService,
    private departmentsService: DepartmentsService,
    private auditUniverseService: AuditUniverseService,
    private riskCriteriaService: RiskCriteriaService,
    private riskAssessmentsService: RiskAssessmentsService,
    private riskControlMatrixService: RiskControlMatrixService,
    private transactionsService: TransactionsService,
    @InjectRepository(AuditPlan)
    private auditPlanRepo: Repository<AuditPlan>,
    @InjectRepository(AuditUniverse)
    private auditUniverseRepo: Repository<AuditUniverse>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(ContinuousAuditRule)
    private continuousAuditRuleRepo: Repository<ContinuousAuditRule>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  async createTemplateExcel(templateData: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    if (templateData && templateData.length > 0) {
      const headers = Object.keys(templateData[0]);
      worksheet.addRow(headers);

      templateData.forEach((row) => {
        const rowData = headers.map((header) =>
          row[header] !== undefined && row[header] !== null ? row[header] : '',
        );
        worksheet.addRow(rowData);
      });

      // format header
      worksheet.getRow(1).font = { bold: true };
      headers.forEach((h, index) => {
        worksheet.getColumn(index + 1).width = 20;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  private normalizeItemKeys(module: string, item: any): any {
    const normalized: any = {};

    for (const [key, value] of Object.entries(item)) {
      const mappedKey = getNormalizedKey(module, key);
      if (mappedKey) {
        normalized[mappedKey] =
          typeof value === 'string'
            ? value.trim()
            : typeof value === 'number' || typeof value === 'boolean'
              ? String(value).trim()
              : '';
      } else {
        const camelKey = key.replace(/\s+/g, '');
        normalized[camelKey] = value;
      }
    }

    return normalized;
  }

  async importData(module: string, fileBuffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const sheet = workbook.worksheets[0];
    const data: any[] = [];
    let headers: string[] = [];
    let headerRowIdx = 1;

    // Smart header row detection: scan first 10 rows for recognizable table headers
    for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
      const stringVals = vals.map((v) =>
        safeCellString(v).trim().toLowerCase(),
      );
      const populatedCells = stringVals.filter((v) => v.length > 0);
      const uniqueCells = new Set(populatedCells);

      // A genuine table header row contains multiple distinct column names (not a merged title banner)
      if (uniqueCells.size >= 3) {
        const matchingColumns = Array.from(uniqueCells).filter(
          (v) =>
            v.includes('năm') ||
            v.includes('year') ||
            v.includes('tên') ||
            v.includes('name') ||
            v.includes('mã') ||
            v.includes('code') ||
            v.includes('đối tượng') ||
            v.includes('đơn vị') ||
            v.includes('quy trình') ||
            v.includes('trạng thái') ||
            v.includes('status') ||
            v.includes('họ và tên') ||
            v.includes('phòng') ||
            v.includes('email') ||
            v.includes('tiêu chí') ||
            v.includes('rủi ro'),
        );
        if (matchingColumns.length >= 2) {
          headerRowIdx = r;
          break;
        }
      }
    }

    sheet.eachRow((row, rIdx) => {
      const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
      if (rIdx === headerRowIdx) {
        headers = vals.map((v) => safeCellString(v).trim());
      } else if (rIdx > headerRowIdx) {
        const hasContent = vals.some((v) => safeCellString(v).trim() !== '');
        if (hasContent) {
          const obj: any = {};
          headers.forEach((h, i) => {
            if (h) obj[h] = vals[i];
          });
          data.push(obj);
        }
      }
    });

    if (module === 'audit-plans') {
      return this.importAuditPlans(data);
    }

    const results: any[] = [];
    for (const item of data) {
      try {
        const normalizedItem = this.normalizeItemKeys(module, item);
        const saved = await this.saveItem(module, normalizedItem);
        results.push({ status: 'success', data: saved });
      } catch (error) {
        this.logger.error(`Error importing row: ${error.message}`, error.stack);
        results.push({ status: 'error', item, message: error.message });
      }
    }

    return {
      total: data.length,
      success: results.filter((r) => r.status === 'success').length,
      errors: results.filter((r) => r.status === 'error'),
    };
  }

  private async saveItem(module: string, item: any) {
    switch (module) {
      case 'users': {
        const username = item.username?.trim();
        const employeeId = item.employeeId?.trim();
        if (!username && !employeeId) {
          throw new Error('Dòng dữ liệu thiếu Tên đăng nhập và Mã nhân viên');
        }

        // Tìm roleId nếu có tên nhóm quyền trong file
        let roleId = item.roleId;
        if (!roleId && item.role) {
          const roleName = String(item.role).trim();
          const matchedRole = await this.roleRepo.findOne({
            where: { name: roleName },
          });
          if (matchedRole) {
            roleId = matchedRole.id;
          }
        }

        // Kiểm tra xem User đã tồn tại theo username hoặc employeeId chưa
        let existingUser: User | null = null;
        if (username) {
          existingUser = await this.userRepo.findOne({ where: { username } });
        }
        if (!existingUser && employeeId) {
          existingUser = await this.userRepo.findOne({ where: { employeeId } });
        }

        if (existingUser) {
          // Cập nhật thông tin nếu đã tồn tại (Upsert)
          const updateData: any = { ...item };
          delete updateData.password;
          delete updateData.passwordHash;
          if (roleId) updateData.roleId = roleId;
          updateData.status = item.status || existingUser.status || 'Active';
          updateData.isActive = updateData.status === 'Active';
          await this.userRepo.update(existingUser.id, updateData);
          return this.usersService.findOneSafe(existingUser.id);
        } else {
          // Thêm mới với mật khẩu mặc định an toàn và cờ đổi mật khẩu lần đầu
          return this.usersService.create({
            ...item,
            username: username || employeeId,
            fullName: item.fullName || username || employeeId,
            password: item.password || '@Lpbank2026!',
            roleId,
            status: item.status || 'Active',
            isActive: (item.status || 'Active') === 'Active',
            mustChangePassword: true,
          });
        }
      }
      case 'roles': {
        const roleName = item.name?.trim();
        if (!roleName) {
          throw new Error('Tên nhóm quyền không được để trống');
        }
        let existingRole = await this.roleRepo.findOne({
          where: { name: roleName },
        });
        if (existingRole) {
          if (item.description !== undefined) existingRole.description = item.description;
          if (item.permissions !== undefined) existingRole.permissions = item.permissions;
          return this.roleRepo.save(existingRole);
        } else {
          const newRole = this.roleRepo.create({
            name: roleName,
            description: item.description || '',
            permissions: item.permissions || '',
          });
          return this.roleRepo.save(newRole);
        }
      }
      case 'departments':
        return this.departmentsService.create(item);
      case 'audit-universe':
        return this.auditUniverseService.create(item);
      case 'risk-criteria':
        return this.riskCriteriaService.create({
          ...item,
          weight: item.weight ? Number(item.weight) : 0,
        });
      case 'risk-assessments': {
        // Parse numerical columns safely to prevent class-validator and database errors
        const totalScore =
          item.totalScore !== undefined && item.totalScore !== ''
            ? Number(item.totalScore)
            : 0;
        const assessmentYear =
          item.assessmentYear !== undefined && item.assessmentYear !== ''
            ? Number(item.assessmentYear)
            : new Date().getFullYear();
        const impact =
          item.impact !== undefined && item.impact !== ''
            ? Number(item.impact)
            : 3;
        const likelihood =
          item.likelihood !== undefined && item.likelihood !== ''
            ? Number(item.likelihood)
            : 3;
        const inherentRiskScore =
          item.inherentRiskScore !== undefined && item.inherentRiskScore !== ''
            ? Number(item.inherentRiskScore)
            : totalScore;
        const residualRiskScore =
          item.residualRiskScore !== undefined && item.residualRiskScore !== ''
            ? Number(item.residualRiskScore)
            : undefined;

        // Normalize controlEffectiveness value, matching standard DB options: Strong | Adequate | Weak | Ineffective
        let controlEffectiveness = 'Adequate';
        const cleanCE = String(item.controlEffectiveness || '')
          .toLowerCase()
          .trim();
        if (cleanCE.includes('strong') || cleanCE.includes('mạnh')) {
          controlEffectiveness = 'Strong';
        } else if (
          cleanCE.includes('adequate') ||
          cleanCE.includes('đầy đủ') ||
          cleanCE.includes('trung bình')
        ) {
          controlEffectiveness = 'Adequate';
        } else if (cleanCE.includes('weak') || cleanCE.includes('yếu')) {
          controlEffectiveness = 'Weak';
        } else if (
          cleanCE.includes('ineffective') ||
          cleanCE.includes('không hiệu quả')
        ) {
          controlEffectiveness = 'Ineffective';
        }

        // Normalize riskVelocity: Increasing | Stable | Decreasing
        let riskVelocity = 'Stable';
        const cleanRV = String(item.riskVelocity || '')
          .toLowerCase()
          .trim();
        if (cleanRV.includes('increasing') || cleanRV.includes('tăng')) {
          riskVelocity = 'Increasing';
        } else if (cleanRV.includes('stable') || cleanRV.includes('ổn định')) {
          riskVelocity = 'Stable';
        } else if (cleanRV.includes('decreasing') || cleanRV.includes('giảm')) {
          riskVelocity = 'Decreasing';
        }

        // Normalize riskAppetite: Accept | Mitigate | Avoid | Transfer
        let riskAppetite = undefined;
        const cleanRA = String(item.riskAppetite || '')
          .toLowerCase()
          .trim();
        if (cleanRA.includes('accept') || cleanRA.includes('chấp nhận')) {
          riskAppetite = 'Accept' as any;
        } else if (
          cleanRA.includes('mitigate') ||
          cleanRA.includes('giảm thiểu')
        ) {
          riskAppetite = 'Mitigate' as any;
        } else if (cleanRA.includes('avoid') || cleanRA.includes('tránh')) {
          riskAppetite = 'Avoid' as any;
        } else if (
          cleanRA.includes('transfer') ||
          cleanRA.includes('chuyển giao')
        ) {
          riskAppetite = 'Transfer' as any;
        }

        // Normalize auditFrequency: Annual | Biennial | Triennial | AdHoc
        let auditFrequency = 'Annual';
        const cleanAF = String(item.auditFrequency || '')
          .toLowerCase()
          .trim();
        if (cleanAF.includes('annual') || cleanAF.includes('hàng năm')) {
          auditFrequency = 'Annual';
        } else if (cleanAF.includes('biennial') || cleanAF.includes('2 năm')) {
          auditFrequency = 'Biennial';
        } else if (cleanAF.includes('triennial') || cleanAF.includes('3 năm')) {
          auditFrequency = 'Triennial';
        } else if (cleanAF.includes('adhoc') || cleanAF.includes('đột xuất')) {
          auditFrequency = 'AdHoc';
        }

        // Normalize auditCategory: HoiSo | ChiNhanh | PGD | HeThong | ChuyenDe
        let auditCategory = 'ChiNhanh';
        const cleanAC = String(item.auditCategory || '')
          .toLowerCase()
          .trim();
        if (cleanAC.includes('hoiso') || cleanAC.includes('hội sở')) {
          auditCategory = 'HoiSo';
        } else if (
          cleanAC.includes('chinhanh') ||
          cleanAC.includes('chi nhánh')
        ) {
          auditCategory = 'ChiNhanh';
        } else if (
          cleanAC.includes('pgd') ||
          cleanAC.includes('phòng giao dịch')
        ) {
          auditCategory = 'PGD';
        } else if (
          cleanAC.includes('hethong') ||
          cleanAC.includes('cntt') ||
          cleanAC.includes('hệ thống')
        ) {
          auditCategory = 'HeThong';
        } else if (
          cleanAC.includes('chuyende') ||
          cleanAC.includes('chuyên đề') ||
          cleanAC.includes('nghiepvu') ||
          cleanAC.includes('nghiệp vụ')
        ) {
          auditCategory = 'ChuyenDe';
        }

        return this.riskAssessmentsService.create({
          auditUniverseId: item.auditUniverseId
            ? Number(item.auditUniverseId)
            : undefined,
          universeName:
            item.legacyUniverseName || item.universeName || 'Chưa xác định',
          department: item.legacyDepartment || item.department || '',
          auditCategory,
          assessmentYear,
          totalScore,
          impact,
          likelihood,
          riskLevel: item.riskLevel || 'Hạng 3 (Trung bình)',
          inherentRiskScore,
          controlEffectiveness,
          residualRiskScore,
          riskVelocity,
          riskAppetite,
          auditFrequency,
          lastAuditDate: item.lastAuditDate || undefined,
          notes: item.notes || '',
          mitigationPlan: item.mitigationPlan || '',
          riskDescription: item.riskDescription || '',
        });
      }
      case 'risk-control-matrix': {
        let inherentRiskScore = 'Medium';
        const cleanRisk = String(item.inherentRiskScore || '')
          .toLowerCase()
          .trim();
        if (cleanRisk.includes('cao') || cleanRisk.includes('high')) {
          inherentRiskScore = 'High';
        } else if (cleanRisk.includes('thấp') || cleanRisk.includes('low')) {
          inherentRiskScore = 'Low';
        } else if (
          cleanRisk.includes('nghiêm trọng') ||
          cleanRisk.includes('critical')
        ) {
          inherentRiskScore = 'Critical';
        }

        let controlType = 'Preventive';
        const cleanType = String(item.controlType || '')
          .toLowerCase()
          .trim();
        if (
          cleanType.includes('phát hiện') ||
          cleanType.includes('detective')
        ) {
          controlType = 'Detective';
        }

        let controlAutomation = 'Manual';
        const cleanAuto = String(item.controlAutomation || '')
          .toLowerCase()
          .trim();
        if (cleanAuto.includes('tự động') || cleanAuto.includes('automated')) {
          controlAutomation = 'Automated';
        } else if (
          cleanAuto.includes('bán tự động') ||
          cleanAuto.includes('dependent')
        ) {
          controlAutomation = 'IT-Dependent Manual';
        }

        return this.riskControlMatrixService.create({
          legacyProcessName:
            item.processName || item.legacyProcessName || 'Chưa xác định',
          subProcess: item.subProcess || '',
          businessObjective: item.businessObjective || '',
          riskName: item.riskName || 'Chưa xác định',
          riskDescription: item.riskDescription || '',
          inherentRiskScore,
          controlName: item.controlName || 'Chưa xác định',
          controlDescription: item.controlDescription || '',
          controlType,
          controlFrequency: item.controlFrequency || '',
          controlAutomation,
          testProcedure: item.testProcedure || '',
          expectedEvidence: item.expectedEvidence || '',
        });
      }

      case 'transactions': {
        return this.transactionsService.create({
          transactionCode:
            item.transactionCode ||
            `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          accountId: item.accountId || 'UNKNOWN',
          customerName: item.customerName || '',
          vendorName: item.vendorName || '',
          amount: parseFloat(item.amount) || 0,
          transactionDate: item.transactionDate
            ? new Date(item.transactionDate)
            : new Date(),
          ipAddress: item.ipAddress || '',
          description: item.description || '',
        });
      }

      case 'audit-rules':
      case 'continuous-monitoring': {
        const ruleId = item.ruleId || `RULE-${Date.now()}`;
        const existing = await this.continuousAuditRuleRepo.findOne({
          where: { ruleId },
        });

        // Normalize alertLevel: Đỏ | Vàng | Xanh
        let alertLevel = item.alertLevel || 'Vàng';
        const cleanAlert = String(alertLevel).toLowerCase().trim();
        if (
          cleanAlert.includes('đỏ') ||
          cleanAlert.includes('red') ||
          cleanAlert.includes('high') ||
          cleanAlert.includes('cao')
        ) {
          alertLevel = 'Đỏ';
        } else if (
          cleanAlert.includes('vàng') ||
          cleanAlert.includes('yellow') ||
          cleanAlert.includes('medium') ||
          cleanAlert.includes('tb')
        ) {
          alertLevel = 'Vàng';
        } else if (
          cleanAlert.includes('xanh') ||
          cleanAlert.includes('green') ||
          cleanAlert.includes('low') ||
          cleanAlert.includes('thấp')
        ) {
          alertLevel = 'Xanh';
        }

        const ruleData: Partial<ContinuousAuditRule> = {
          ruleId,
          domain: item.domain || 'Tín dụng',
          ruleName: item.ruleName || item.name || 'Luật giám sát liên tục',
          auditObjective: item.auditObjective || '',
          risk: item.risk || '',
          expectedControl: item.expectedControl || '',
          logic: item.logic || '',
          sourceSystem: item.sourceSystem || 'T24 CoreBanking',
          frequency: item.frequency || 'Daily',
          alertLevel,
          slaHours: item.slaHours ? Number(item.slaHours) : 24,
          status: item.status || 'Active',
          isActive: true,
        };

        if (existing) {
          return this.continuousAuditRuleRepo.save({
            ...existing,
            ...ruleData,
          });
        }
        return this.continuousAuditRuleRepo.save(
          this.continuousAuditRuleRepo.create(ruleData),
        );
      }

      default:
        throw new Error(`Module ${module} not supported for import`);
    }
  }

  async importAuditPlans(data: any[]) {
    if (!data || data.length === 0) {
      return { total: 0, success: 0, errors: [] };
    }

    const universes = await this.auditUniverseRepo.find();
    const users = await this.userRepo.find();

    // 1. Chuẩn hóa các dòng
    const normalizedRows = data.map((row) =>
      this.normalizeItemKeys('audit-plans', row),
    );

    // 2. Nhóm các dòng theo Kế hoạch (Năm + Tên kế hoạch)
    const groups = new Map<
      string,
      { year: number; name: string; rows: any[] }
    >();

    normalizedRows.forEach((row, idx) => {
      const parsedYear = Number(row.year) || new Date().getFullYear();
      const rawName =
        (row.name && String(row.name).trim()) ||
        `Kế hoạch Kiểm toán nội bộ năm ${parsedYear}`;
      const groupKey = `${parsedYear}_${rawName.toLowerCase()}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          year: parsedYear,
          name: rawName,
          rows: [],
        });
      }
      groups.get(groupKey)!.rows.push({ ...row, originalIndex: idx + 2 });
    });

    const results: any[] = [];
    const errors: any[] = [];

    for (const [, group] of groups.entries()) {
      try {
        const firstRow = group.rows[0];

        // Chuẩn hóa phòng KTNB phụ trách
        let ownerTeam = 'ToanKhoi';
        const cleanTeam = String(firstRow.ownerTeam || '').toLowerCase();
        if (
          cleanTeam.includes('hội sở') ||
          cleanTeam.includes('hoiso') ||
          cleanTeam.includes('pkt_hoiso')
        ) {
          ownerTeam = 'PKT_HoiSo';
        } else if (
          cleanTeam.includes('dvkd') ||
          cleanTeam.includes('kinh doanh') ||
          cleanTeam.includes('chi nhánh') ||
          cleanTeam.includes('pkt_dvkd')
        ) {
          ownerTeam = 'PKT_DVKD';
        } else if (
          cleanTeam.includes('tổng hợp') ||
          cleanTeam.includes('tonghop')
        ) {
          ownerTeam = 'TongHop';
        }

        // Chuẩn hóa trạng thái
        let status = 'Draft';
        const cleanStatus = String(firstRow.status || '').toLowerCase();
        if (
          cleanStatus.includes('phê duyệt') ||
          cleanStatus.includes('approved')
        ) {
          status = 'Approved';
        } else if (
          cleanStatus.includes('chờ') ||
          cleanStatus.includes('pending')
        ) {
          status = 'PendingApproval';
        } else if (
          cleanStatus.includes('từ chối') ||
          cleanStatus.includes('reject')
        ) {
          status = 'Rejected';
        }

        const approvalNotes = firstRow.approvalNotes
          ? String(firstRow.approvalNotes).trim()
          : '';

        // Xây dựng danh sách selectedUnits từ các dòng của kế hoạch
        const selectedUnits: any[] = [];

        group.rows.forEach((row, rIdx) => {
          const unitName =
            (row.unitName && String(row.unitName).trim()) ||
            (row.name && String(row.name).trim()) ||
            `Đối tượng kiểm toán ${rIdx + 1}`;
          const rawCode = String(row.universeCode || '').trim();

          // Tìm universe tương ứng
          const matchedUniverse = universes.find((u) => {
            if (
              rawCode &&
              (String(u.id) === rawCode ||
                (u.departmentCode &&
                  u.departmentCode.toLowerCase() === rawCode.toLowerCase()))
            ) {
              return true;
            }
            if (u.name && u.name.toLowerCase() === unitName.toLowerCase()) {
              return true;
            }
            if (
              u.department &&
              unitName.toLowerCase().includes(u.department.toLowerCase())
            ) {
              return true;
            }
            return false;
          });

          // Tạo universeId số hợp lệ
          let universeId: number;
          if (matchedUniverse) {
            universeId = matchedUniverse.id;
          } else if (row.universeId && !isNaN(Number(row.universeId))) {
            universeId = Number(row.universeId);
          } else if (rawCode && !isNaN(Number(rawCode))) {
            universeId = Number(rawCode);
          } else {
            let hash = 0;
            for (let i = 0; i < unitName.length; i++) {
              hash = (hash << 5) - hash + unitName.charCodeAt(i);
              hash |= 0;
            }
            universeId = Math.abs(hash % 900000) + 100000 + rIdx;
          }

          // Chuẩn hóa ngày công và số lượng KTV
          const estDays = Math.max(1, Number(row.estDays) || 10);
          const ktvCount = Math.max(1, Number(row.ktvCount) || 3);

          // Chuẩn hóa tháng dự kiến (1 -> 12)
          let scheduledMonth: number | undefined = undefined;
          if (row.scheduledMonth !== undefined && row.scheduledMonth !== '') {
            const monthMatches = String(row.scheduledMonth).match(/\d+/);
            if (monthMatches) {
              const m = parseInt(monthMatches[0], 10);
              if (m >= 1 && m <= 12) {
                scheduledMonth = m;
              }
            }
          }

          // Chuẩn hóa quý dự kiến (Q1, Q2, Q3, Q4)
          let targetQuarter = 'Q1';
          if (row.targetQuarter) {
            const cleanQ = String(row.targetQuarter).toUpperCase();
            if (cleanQ.includes('Q1') || cleanQ.includes('1'))
              targetQuarter = 'Q1';
            else if (cleanQ.includes('Q2') || cleanQ.includes('2'))
              targetQuarter = 'Q2';
            else if (cleanQ.includes('Q3') || cleanQ.includes('3'))
              targetQuarter = 'Q3';
            else if (cleanQ.includes('Q4') || cleanQ.includes('4'))
              targetQuarter = 'Q4';
          } else if (scheduledMonth) {
            targetQuarter = `Q${Math.ceil(scheduledMonth / 3)}`;
          }

          // Chuẩn hóa Trưởng đoàn dự kiến
          let leadAuditorName = row.leadAuditorName
            ? String(row.leadAuditorName).trim()
            : '';
          let leadAuditorId: number | undefined = undefined;

          if (leadAuditorName) {
            const cleanLead = leadAuditorName.toLowerCase();
            const matchedUser = users.find(
              (u) =>
                (u.fullName && u.fullName.toLowerCase() === cleanLead) ||
                (u.username && u.username.toLowerCase() === cleanLead) ||
                (u.fullName && u.fullName.toLowerCase().includes(cleanLead)),
            );
            if (matchedUser) {
              leadAuditorId = matchedUser.id;
              leadAuditorName = matchedUser.fullName;
            }
          }

          // Chuẩn hóa mức độ rủi ro
          let riskLevel = String(row.riskLevel || 'Hạng 3 (Trung bình)').trim();
          if (
            riskLevel.toLowerCase() === 'cao' ||
            riskLevel.toLowerCase() === 'high'
          ) {
            riskLevel = 'Hạng 4 (Cao)';
          } else if (
            riskLevel.toLowerCase() === 'rất cao' ||
            riskLevel.toLowerCase() === 'critical'
          ) {
            riskLevel = 'Hạng 5 (Rất cao)';
          } else if (
            riskLevel.toLowerCase() === 'trung bình' ||
            riskLevel.toLowerCase() === 'medium'
          ) {
            riskLevel = 'Hạng 3 (Trung bình)';
          } else if (
            riskLevel.toLowerCase() === 'thấp' ||
            riskLevel.toLowerCase() === 'low'
          ) {
            riskLevel = 'Hạng 2 (Thấp)';
          }

          // Chuẩn hóa phân loại
          const auditCategory =
            row.auditCategory || matchedUniverse?.auditCategory || 'ChiNhanh';

          selectedUnits.push({
            universeId,
            name: unitName,
            riskLevel,
            justification: row.justification
              ? String(row.justification).trim()
              : '',
            estDays,
            ktvCount,
            scheduledMonth,
            targetQuarter,
            leadAuditorId,
            leadAuditorName,
            auditCategory,
          });
        });

        // Kiểm tra xem kế hoạch đã tồn tại trong DB chưa
        const existingPlan = await this.auditPlanRepo.findOne({
          where: { year: group.year, name: group.name },
        });

        if (existingPlan) {
          const existingUnits = existingPlan.selectedUnits || [];
          const mergedUnits = [...existingUnits];

          selectedUnits.forEach((newUnit) => {
            const foundIdx = mergedUnits.findIndex(
              (u) =>
                u.universeId === newUnit.universeId ||
                (u.name && u.name.toLowerCase() === newUnit.name.toLowerCase()),
            );
            if (foundIdx >= 0) {
              mergedUnits[foundIdx] = { ...mergedUnits[foundIdx], ...newUnit };
            } else {
              mergedUnits.push(newUnit);
            }
          });

          const unitRepo = this.auditPlanRepo.manager.getRepository(AuditPlanUnit);
          await unitRepo.delete({ planId: existingPlan.id });
          await unitRepo.save(
            mergedUnits.map((u) =>
              unitRepo.create({
                planId: existingPlan.id,
                universeId: u.universeId,
                universeName: u.name,
                riskLevel: u.riskLevel,
                estDays: u.estDays || 10,
                ktvCount: u.ktvCount || 3,
                scheduledMonth: u.scheduledMonth || 1,
                targetQuarter: u.targetQuarter || 'Q1',
              }),
            ),
          );

          if (ownerTeam && ownerTeam !== 'ToanKhoi')
            existingPlan.ownerTeam = ownerTeam;
          if (approvalNotes) existingPlan.approvalNotes = approvalNotes;
          if (status !== 'Draft') existingPlan.status = status;

          const savedPlan = await this.auditPlanRepo.save(existingPlan);
          results.push({
            status: 'success',
            data: savedPlan,
            action: 'updated',
          });
        } else {
          const newPlan = this.auditPlanRepo.create({
            year: group.year,
            name: group.name,
            ownerTeam,
            status,
            approvalNotes,
          });

          const savedPlan = await this.auditPlanRepo.save(newPlan);
          if (selectedUnits && selectedUnits.length > 0) {
            const unitRepo = this.auditPlanRepo.manager.getRepository(AuditPlanUnit);
            await unitRepo.save(
              selectedUnits.map((u) =>
                unitRepo.create({
                  planId: savedPlan.id,
                  universeId: u.universeId,
                  universeName: u.name,
                  riskLevel: u.riskLevel,
                  estDays: u.estDays || 10,
                  ktvCount: u.ktvCount || 3,
                  scheduledMonth: u.scheduledMonth || 1,
                  targetQuarter: u.targetQuarter || 'Q1',
                }),
              ),
            );
          }
          results.push({
            status: 'success',
            data: savedPlan,
            action: 'created',
          });
        }
      } catch (err: any) {
        this.logger.error(
          `Error importing plan ${group.name}: ${err.message}`,
          err.stack,
        );
        errors.push({
          item: {
            year: group.year,
            name: group.name,
            rowCount: group.rows.length,
          },
          message: err.message,
        });
      }
    }

    const failedRows = errors.reduce(
      (sum, e) => sum + (e.item?.rowCount || 1),
      0,
    );
    return {
      total: data.length,
      success: data.length - failedRows,
      planCount: results.length,
      errors,
    };
  }
}
