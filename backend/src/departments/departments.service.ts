import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { DepartmentHistory } from './entities/department-history.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { User } from '../users/entities/user.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';

export function normalizeUnitType(name: string, currentType?: string): string {
  const normalized = name.toLowerCase().trim();

  if (normalized.includes('hội đồng')) {
    return 'HoiDong';
  }

  const hasBanWord =
    /\bban\b/i.test(normalized) || normalized.includes('ủy ban');
  const isExcluded =
    normalized.includes('phòng ban') || normalized.includes('vùng ban');

  if (hasBanWord && !isExcluded) {
    return 'UyBan';
  }

  if (normalized.includes('khối')) {
    return 'Khoi';
  }

  if (
    normalized.includes('chi nhánh') ||
    normalized.includes('cụm chi nhánh')
  ) {
    return 'ChiNhanh';
  }

  if (normalized.includes('phòng giao dịch') || normalized.includes('pgd')) {
    return 'PGD';
  }

  if (normalized.includes('trung tâm')) {
    return 'TrungTam';
  }

  if (normalized.includes('ban đại diện') || normalized.includes('bđt')) {
    return 'BDT';
  }

  if (
    normalized.includes('phòng') ||
    normalized.includes('bộ phận') ||
    normalized.includes('tổ ')
  ) {
    return 'Phong';
  }

  if (currentType === 'DonViKinhDoanh') {
    return 'BDT';
  }

  return currentType || 'Phong';
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentHistory)
    private readonly historyRepo: Repository<DepartmentHistory>,
    @InjectRepository(AuditUniverse)
    private readonly auditUniverseRepository: Repository<AuditUniverse>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const codeUpper = createDepartmentDto.code?.toUpperCase();
    const existing = await this.departmentRepository.findOne({
      where: { code: codeUpper },
    });

    const normalizedType = normalizeUnitType(
      createDepartmentDto.name,
      createDepartmentDto.unitType,
    );

    if (existing) {
      existing.name = createDepartmentDto.name || existing.name;
      existing.unitType = normalizedType || existing.unitType;
      existing.parent =
        createDepartmentDto.parent !== undefined
          ? createDepartmentDto.parent
          : existing.parent;
      existing.parentId =
        createDepartmentDto.parentId !== undefined
          ? createDepartmentDto.parentId
          : existing.parentId;
      existing.region =
        createDepartmentDto.region !== undefined
          ? createDepartmentDto.region
          : existing.region;
      existing.functions =
        createDepartmentDto.functions !== undefined
          ? createDepartmentDto.functions
          : existing.functions;
      existing.description =
        createDepartmentDto.description !== undefined
          ? createDepartmentDto.description
          : existing.description;
      existing.status = createDepartmentDto.status || existing.status;
      const updated = await this.departmentRepository.save(existing);
      await this.syncToAuditUniverse(updated);
      return updated;
    }

    const department = this.departmentRepository.create({
      ...createDepartmentDto,
      code: codeUpper,
      unitType: normalizedType,
    });
    const saved = await this.departmentRepository.save(department);
    await this.syncToAuditUniverse(saved);
    return saved;
  }

  async findAll(user?: any, all?: boolean) {
    const orderOptions = { unitType: 'ASC' as const, name: 'ASC' as const };

    if (all || !user) {
      return this.departmentRepository.find({ order: orderOptions });
    }

    const fullUser = await this.userRepo.findOne({
      where: { id: user.userId },
      relations: ['role'],
    });

    if (!fullUser) {
      return this.departmentRepository.find({ order: orderOptions });
    }

    const roleName = (fullUser.role?.name || '').toLowerCase();
    const isKtnbStaff =
      ScopeFilterService.isAdminRole(fullUser.role?.name, fullUser.jobTitle) ||
      roleName.includes('kiểm toán') ||
      roleName.includes('ktnb') ||
      roleName.includes('trưởng đoàn') ||
      roleName.includes('ktv') ||
      roleName.includes('thành viên') ||
      roleName.includes('chuyên gia');

    if (isKtnbStaff) {
      return this.departmentRepository.find({ order: orderOptions });
    }

    // Nhân sự / Đơn vị thông thường chỉ thấy đơn vị trực thuộc của mình nếu có
    if (fullUser.department) {
      const myDepts = await this.departmentRepository.find({
        where: { name: fullUser.department },
        order: orderOptions,
      });
      if (myDepts.length > 0) return myDepts;
    }

    return this.departmentRepository.find({ order: orderOptions });
  }

  findOne(id: number) {
    return this.departmentRepository.findOneBy({ id });
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    const payload = { ...updateDepartmentDto };

    if (payload.code) {
      payload.code = payload.code.toUpperCase();
      const existing = await this.departmentRepository.findOne({
        where: { code: payload.code },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          'Mã đơn vị đã tồn tại. Vui lòng chọn mã khác.',
        );
      }
    }

    if (payload.name || payload.unitType) {
      const current = await this.findOne(id);
      const name = payload.name || current?.name || '';
      const type = payload.unitType || current?.unitType || 'Phong';
      payload.unitType = normalizeUnitType(name, type);
    }
    await this.departmentRepository.update(id, payload);
    const updated = await this.findOne(id);
    if (updated) {
      await this.syncToAuditUniverse(updated);
    }
    return updated;
  }

  async remove(id: number) {
    const current = await this.findOne(id);
    if (current) {
      await this.auditUniverseRepository.delete({
        departmentCode: current.code,
      });
    }
    await this.departmentRepository.delete(id);
    return { success: true };
  }

  private async syncToAuditUniverse(dept: Department) {
    const normalizedType = dept.unitType;
    const category =
      normalizedType === 'ChiNhanh' ||
      normalizedType === 'BDT' ||
      normalizedType === 'TrungTam'
        ? 'ChiNhanh'
        : normalizedType === 'PGD'
          ? 'PGD'
          : 'HoiSo';
    const owner = ['ChiNhanh', 'PGD', 'TrungTam', 'BDT'].includes(
      normalizedType,
    )
      ? 'PKT_DVKD'
      : 'PKT_HoiSo';

    const universeExisting = await this.auditUniverseRepository.findOne({
      where: { departmentCode: dept.code },
    });

    const fin = 5.0; // Default base score for unrated departments
    const oper = 5.0;
    const past = 5.0;
    const score = Math.round((0.4 * past + 0.3 * fin + 0.3 * oper) * 10) / 10;
    const rating = score >= 7.5 ? 'High' : score >= 5.0 ? 'Medium' : 'Low';

    if (universeExisting) {
      await this.auditUniverseRepository.update(universeExisting.id, {
        name: dept.name,
        description: `Đơn vị thuộc Cơ cấu tổ chức: ${dept.name}`,
        department: dept.name,
        auditCategory: category,
        ownerTeam: owner,
      });
    } else {
      const u = this.auditUniverseRepository.create({
        name: dept.name,
        description: `Đơn vị thuộc Cơ cấu tổ chức: ${dept.name}`,
        department: dept.name,
        departmentCode: dept.code,
        auditCategory: category,
        ownerTeam: owner,
        financialSize: fin,
        operationalRiskScore: oper,
        pastFindingsScore: past,
        riskScore: score,
        dynamicRiskRating: rating,
        nextAuditYear: score >= 7.5 ? 2026 : score >= 5.0 ? 2027 : 2028,
        status: 'Active',
      });
      await this.auditUniverseRepository.save(u);
    }
  }

  // ═══════════════════════ SO SÁNH BIẾN ĐỘNG CƠ CẤU TỔ CHỨC THEO KỲ ═══════════════════════

  /**
   * Ghi nhận snapshot cơ cấu tổ chức theo từng năm/kỳ
   */
  async recordPeriodSnapshot(
    periodYear: number,
    departmentId: number,
    changeType: string = 'GiuNguyen',
    notes?: string,
    decisionNumber?: string,
  ): Promise<DepartmentHistory> {
    const dept = await this.findOne(departmentId);
    if (!dept) {
      throw new BadRequestException(`Không tìm thấy đơn vị #${departmentId}`);
    }
    const existing = await this.historyRepo.findOne({
      where: { departmentId, periodYear },
    });

    const prevHistory = await this.historyRepo.findOne({
      where: { departmentId, periodYear: periodYear - 1 },
    });

    const data: Partial<DepartmentHistory> = {
      departmentId,
      departmentCode: dept.code,
      departmentName: dept.name,
      periodYear,
      unitType: dept.unitType,
      previousUnitType: prevHistory?.unitType || dept.unitType,
      changeType:
        prevHistory && prevHistory.unitType !== dept.unitType
          ? 'NangCap'
          : changeType,
      notes: notes || `Ghi nhận cơ cấu kỳ ${periodYear}`,
      decisionNumber,
    };

    if (existing) {
      Object.assign(existing, data);
      return await this.historyRepo.save(existing);
    } else {
      const history = this.historyRepo.create(data);
      return await this.historyRepo.save(history);
    }
  }

  /**
   * So sánh biến động giữa 2 kỳ kiểm toán (vd: 2025 vs 2026)
   */
  async comparePeriods(
    year1: number,
    year2: number,
  ): Promise<{
    year1: number;
    year2: number;
    upgradedUnits: any[]; // Nâng cấp từ PGD lên Chi nhánh
    newUnits: any[]; // Thành lập mới
    closedUnits: any[]; // Đóng cửa / giải thể
    restructuredUnits: any[]; // Sáp nhập / đổi mô hình
    unchangedCount: number;
    allDifferences: any[];
  }> {
    const depts = await this.departmentRepository.find();
    const h1List = await this.historyRepo.find({
      where: { periodYear: year1 },
    });
    const h2List = await this.historyRepo.find({
      where: { periodYear: year2 },
    });

    const h1Map = new Map(
      h1List.map((h) => [h.departmentCode || h.departmentId, h]),
    );
    const h2Map = new Map(
      h2List.map((h) => [h.departmentCode || h.departmentId, h]),
    );

    const upgradedUnits: any[] = [];
    const newUnits: any[] = [];
    const closedUnits: any[] = [];
    const restructuredUnits: any[] = [];
    const allDifferences: any[] = [];
    let unchangedCount = 0;

    for (const dept of depts) {
      const h1 = h1Map.get(dept.code) || h1Map.get(dept.id);
      const h2 = h2Map.get(dept.code) || h2Map.get(dept.id);

      const type1 = h1 ? h1.unitType : 'ChuaTonTai';
      const type2 = h2 ? h2.unitType : dept.unitType;

      if (!h1 && h2) {
        newUnits.push({
          departmentId: dept.id,
          code: dept.code,
          name: dept.name,
          unitType: type2,
          change: 'Thành lập mới',
        });
        allDifferences.push({
          code: dept.code,
          name: dept.name,
          from: 'Chưa thành lập',
          to: type2,
          changeType: 'ThanhLapMoi',
        });
      } else if (h1 && !h2 && dept.status === 'Inactive') {
        closedUnits.push({
          departmentId: dept.id,
          code: dept.code,
          name: dept.name,
          unitType: type1,
          change: 'Đóng cửa / Giải thể',
        });
        allDifferences.push({
          code: dept.code,
          name: dept.name,
          from: type1,
          to: 'Đóng cửa',
          changeType: 'DongCua',
        });
      } else if (type1 !== type2) {
        const isUpgrade =
          (type1 === 'PGD' && type2 === 'ChiNhanh') ||
          (type1 === 'PGDBD_TKBD' && type2 === 'PGD');
        const changeObj = {
          departmentId: dept.id,
          code: dept.code,
          name: dept.name,
          fromType: type1,
          toType: type2,
          change: isUpgrade
            ? 'Nâng cấp mô hình (vd: PGD -> Chi nhánh)'
            : 'Chuyển đổi / Sáp nhập',
        };
        if (isUpgrade) {
          upgradedUnits.push(changeObj);
        } else {
          restructuredUnits.push(changeObj);
        }
        allDifferences.push({
          code: dept.code,
          name: dept.name,
          from: type1,
          to: type2,
          changeType: isUpgrade ? 'NangCap' : 'ChuyenDoi',
        });
      } else {
        unchangedCount++;
      }
    }

    return {
      year1,
      year2,
      upgradedUnits,
      newUnits,
      closedUnits,
      restructuredUnits,
      unchangedCount,
      allDifferences,
    };
  }

  /**
   * Lấy lịch sử biến động của 1 đơn vị qua các năm
   */
  async getUnitHistory(departmentId: number): Promise<DepartmentHistory[]> {
    return await this.historyRepo.find({
      where: { departmentId },
      order: { periodYear: 'ASC' },
    });
  }
}
