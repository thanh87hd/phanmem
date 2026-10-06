/**
 * TC-RP-02 — "Import Danh Sách Đối Tượng Từ Excel"
 *
 * Bộ test này khoá hành vi THẬT của ImportService:
 *  - Đầu vào là workbook Excel dựng trong bộ nhớ (ExcelJS) → KHÔNG ghi file .xlsx ra đĩa.
 *  - Assert đúng payload cuối cùng đi xuống tầng service/repository (tên trường + kiểu dữ liệu),
 *    đúng số liệu tổng hợp (total/success/errors/planCount) và đúng câu lỗi tiếng Việt.
 *
 * Chạy: npx jest --runInBand --ci src/import/import.service.spec.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';

import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { getNormalizedKey } from './import-key-map';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { AuditUniverseService } from '../audit-universe/audit-universe.service';
import { RiskCriteriaService } from '../risk-criteria/risk-criteria.service';
import { RiskAssessmentsService } from '../risk-assessments/risk-assessments.service';
import { RiskControlMatrixService } from '../risk-control-matrix/risk-control-matrix.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditPlanUnit } from '../audit-plans/entities/audit-plan-unit.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { User } from '../users/entities/user.entity';
import { ContinuousAuditRule } from '../continuous-monitoring/entities/continuous-audit-rule.entity';
import { Role } from '../roles/entities/role.entity';

// ═══════════════════════════════════════════════════════════════════
// Helpers — dựng workbook trong bộ nhớ (không chạm đĩa)
// ═══════════════════════════════════════════════════════════════════

async function workbookBuffer(rows: any[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  rows.forEach((row) => sheet.addRow(row));
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

/** Header thật của file UAT 03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx */
const UNIVERSE_HEADERS = [
  'Tên quy trình / hoạt động',
  'Đơn vị phụ trách',
  'Mã đơn vị phụ trách',
  'Phân loại',
  'Quy mô tài sản/GD (1–10)',
  'Rủi ro vận hành T2 (1–10)',
  'Sai phạm lịch sử (1–10)',
  'Ngày kiểm toán gần nhất',
  'Năm KT tiếp theo',
  'Phòng KTNB phụ trách',
  'Tuyến phòng thủ',
];

/** Header thật của template kế hoạch kiểm toán (generate_sample_audit_plan_excel.js / AuditPlan.tsx) */
const AUDIT_PLAN_HEADERS = [
  'Năm kế hoạch',
  'Tên kế hoạch',
  'Phòng KTNB phụ trách',
  'Mã đối tượng KT',
  'Tên đối tượng / Quy trình kiểm toán',
  'Phân loại',
  'Mức độ rủi ro',
  'Quý dự kiến',
  'Tháng dự kiến',
  'Ngày công dự kiến',
  'Số lượng KTV',
  'Trưởng đoàn dự kiến',
  'Căn cứ / Giải trình lựa chọn',
  'Trạng thái kế hoạch',
  'Ý kiến phê duyệt',
];

const UNIVERSE_ROW_1 = [
  'Kiểm toán toàn diện Chi nhánh Thái Bình',
  'Chi nhánh Thái Bình',
  'CN_THAIBINH',
  'ChiNhanh',
  8,
  7,
  6,
  '2025-06-15',
  2026,
  'PKT_DVKD',
  'Tuyen1',
];

const UNIVERSE_ROW_2 = [
  'Kiểm toán Chuyên đề Cấp Tín dụng KHDN Hội sở',
  'Khối Khách hàng Doanh nghiệp',
  'KHOI_KHDN',
  'HoiSo',
  10,
  8,
  5,
  '2025-04-10',
  2026,
  'PKT_HoiSo',
  'Tuyen2',
];

// ═══════════════════════════════════════════════════════════════════
// Mock factory — bám đúng style TestingModule + useMocker của repo
// ═══════════════════════════════════════════════════════════════════

function createRepoMock() {
  const repo: any = {
    create: jest.fn((entity: any) => entity),
    save: jest.fn(async (entity: any) =>
      entity && entity.id ? entity : { ...entity, id: 999 },
    ),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    manager: { getRepository: jest.fn() },
  };
  return repo;
}

function buildMocks() {
  const unitRepo = createRepoMock();
  const auditPlanRepo = createRepoMock();
  auditPlanRepo.manager.getRepository = jest.fn((entity: any) =>
    entity === AuditPlanUnit ? unitRepo : auditPlanRepo,
  );

  const echo = (prefix: string) =>
    jest.fn(async (dto: any) => ({ id: 1, ...dto, __created: prefix }));

  return {
    unitRepo,
    auditPlanRepo,
    auditUniverseRepo: createRepoMock(),
    userRepo: createRepoMock(),
    continuousAuditRuleRepo: createRepoMock(),
    roleRepo: createRepoMock(),
    usersService: {
      create: jest.fn(async (dto: any) => ({ id: 1, ...dto })),
      findOneSafe: jest.fn(async (id: number) => ({ id })),
    },
    departmentsService: { create: echo('department') },
    auditUniverseService: { create: echo('audit-universe') },
    riskCriteriaService: { create: echo('risk-criteria') },
    riskAssessmentsService: { create: echo('risk-assessments') },
    riskControlMatrixService: { create: echo('risk-control-matrix') },
    transactionsService: { create: echo('transactions') },
  };
}

type ImportMocks = ReturnType<typeof buildMocks>;

// ═══════════════════════════════════════════════════════════════════
// Suite
// ═══════════════════════════════════════════════════════════════════

describe('ImportService', () => {
  let service: ImportService;
  let mocks: ImportMocks;

  beforeEach(async () => {
    mocks = buildMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: UsersService, useValue: mocks.usersService },
        { provide: DepartmentsService, useValue: mocks.departmentsService },
        { provide: AuditUniverseService, useValue: mocks.auditUniverseService },
        { provide: RiskCriteriaService, useValue: mocks.riskCriteriaService },
        {
          provide: RiskAssessmentsService,
          useValue: mocks.riskAssessmentsService,
        },
        {
          provide: RiskControlMatrixService,
          useValue: mocks.riskControlMatrixService,
        },
        { provide: TransactionsService, useValue: mocks.transactionsService },
        {
          provide: getRepositoryToken(AuditPlan),
          useValue: mocks.auditPlanRepo,
        },
        {
          provide: getRepositoryToken(AuditUniverse),
          useValue: mocks.auditUniverseRepo,
        },
        { provide: getRepositoryToken(User), useValue: mocks.userRepo },
        {
          provide: getRepositoryToken(ContinuousAuditRule),
          useValue: mocks.continuousAuditRuleRepo,
        },
        { provide: getRepositoryToken(Role), useValue: mocks.roleRepo },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<ImportService>(ImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ───────────────────────────────────────────────────────────────
  // 0. Bảng ánh xạ header tiếng Việt → khoá hệ thống
  // ──────────────────────────────────────────────────────────────

  describe('import-key-map: các alias header dùng trong file UAT', () => {
    it('ánh xạ đúng từng header của module audit-universe', () => {
      const expected: Record<string, string> = {
        'Tên quy trình / hoạt động': 'name',
        'Đơn vị phụ trách': 'department',
        'Mã đơn vị phụ trách': 'departmentCode',
        'Phân loại': 'auditCategory',
        'Quy mô tài sản/GD (1–10)': 'financialSize',
        'Rủi ro vận hành T2 (1–10)': 'operationalRiskScore',
        'Sai phạm lịch sử (1–10)': 'pastFindingsScore',
        'Ngày kiểm toán gần nhất': 'lastAuditDate',
        'Năm KT tiếp theo': 'nextAuditYear',
        'Phòng KTNB phụ trách': 'ownerTeam',
        'Tuyến phòng thủ': 'lineOfDefense',
      };
      for (const [header, key] of Object.entries(expected)) {
        expect(getNormalizedKey('audit-universe', header)).toBe(key);
      }
    });

    it('ánh xạ đúng từng header của module audit-plans (15 cột template)', () => {
      const expected: Record<string, string> = {
        'Năm kế hoạch': 'year',
        'Tên kế hoạch': 'name',
        'Phòng KTNB phụ trách': 'ownerTeam',
        'Mã đối tượng KT': 'universeCode',
        'Tên đối tượng / Quy trình kiểm toán': 'unitName',
        'Phân loại': 'auditCategory',
        'Mức độ rủi ro': 'riskLevel',
        'Quý dự kiến': 'targetQuarter',
        'Tháng dự kiến': 'scheduledMonth',
        'Ngày công dự kiến': 'estDays',
        'Số lượng KTV': 'ktvCount',
        'Trưởng đoàn dự kiến': 'leadAuditorName',
        'Căn cứ / Giải trình lựa chọn': 'justification',
        'Trạng thái kế hoạch': 'status',
        'Ý kiến phê duyệt': 'approvalNotes',
      };
      for (const [header, key] of Object.entries(expected)) {
        expect(getNormalizedKey('audit-plans', header)).toBe(key);
      }
    });

    it('ánh xạ đúng header users / risk-criteria / risk-control-matrix / audit-rules', () => {
      expect(getNormalizedKey('users', 'Mã nhân viên')).toBe('employeeId');
      expect(getNormalizedKey('users', 'Tên đăng nhập')).toBe('username');
      expect(getNormalizedKey('users', 'Họ và tên')).toBe('fullName');
      expect(getNormalizedKey('users', 'Vai trò')).toBe('role');
      expect(getNormalizedKey('users', 'Trạng thái')).toBe('status');

      expect(getNormalizedKey('risk-criteria', 'Trọng số')).toBe('weight');
      expect(getNormalizedKey('risk-criteria', 'Phân loại rủi ro')).toBe(
        'category',
      );

      expect(getNormalizedKey('risk-control-matrix', 'Loại chốt')).toBe(
        'controlType',
      );
      expect(
        getNormalizedKey('risk-control-matrix', 'Mức độ tự động hóa'),
      ).toBe('controlAutomation');

      expect(getNormalizedKey('audit-rules', 'Rule ID')).toBe('ruleId');
      expect(getNormalizedKey('audit-rules', 'Mức độ cảnh báo')).toBe(
        'alertLevel',
      );
    });

    it("regression: header 'legacyDepartment' (users) phải trỏ về department — getNormalizedKey lowercases khoá tra cứu", () => {
      expect(getNormalizedKey('users', 'legacyDepartment')).toBe('department');
      expect(getNormalizedKey('users', 'legacydepartment')).toBe('department');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 1. TC-RP-02 happy path — audit-universe
  // ──────────────────────────────────────────────────────────────

  describe('TC-RP-02: import audit-universe từ Excel', () => {
    it('báo "import thành công 2 dòng", không lỗi, và ghi đúng payload đã ánh xạ vào audit_universe', async () => {
      const buffer = await workbookBuffer([
        UNIVERSE_HEADERS,
        UNIVERSE_ROW_1,
        UNIVERSE_ROW_2,
      ]);

      const result = await service.importData('audit-universe', buffer);

      // Bảng tổng hợp trả về cho UI (DataImportModal hiển thị "Tải lên thành công X dòng")
      expect(result).toEqual({ total: 2, success: 2, errors: [] });

      // Đúng 2 dòng được ghi, đúng thứ tự
      expect(mocks.auditUniverseService.create).toHaveBeenCalledTimes(2);

      // Payload dòng 1: tên trường là khoá hệ thống, KHÔNG còn header tiếng Việt
      expect(mocks.auditUniverseService.create).toHaveBeenNthCalledWith(1, {
        name: 'Kiểm toán toàn diện Chi nhánh Thái Bình',
        department: 'Chi nhánh Thái Bình',
        departmentCode: 'CN_THAIBINH',
        auditCategory: 'ChiNhanh',
        financialSize: '8',
        operationalRiskScore: '7',
        pastFindingsScore: '6',
        lastAuditDate: '2025-06-15',
        nextAuditYear: '2026',
        ownerTeam: 'PKT_DVKD',
        lineOfDefense: 'Tuyen1',
      });

      expect(mocks.auditUniverseService.create).toHaveBeenNthCalledWith(2, {
        name: 'Kiểm toán Chuyên đề Cấp Tín dụng KHDN Hội sở',
        department: 'Khối Khách hàng Doanh nghiệp',
        departmentCode: 'KHOI_KHDN',
        auditCategory: 'HoiSo',
        financialSize: '10',
        operationalRiskScore: '8',
        pastFindingsScore: '5',
        lastAuditDate: '2025-04-10',
        nextAuditYear: '2026',
        ownerTeam: 'PKT_HoiSo',
        lineOfDefense: 'Tuyen2',
      });

      // Kiểu dữ liệu: mọi giá trị đã ánh xạ đều được stringify + trim bởi normalizeItemKeys
      const row1 = (mocks.auditUniverseService.create as jest.Mock).mock
        .calls[0][0];
      expect(Object.keys(row1).sort()).toEqual(
        [
          'auditCategory',
          'department',
          'departmentCode',
          'financialSize',
          'lastAuditDate',
          'lineOfDefense',
          'name',
          'nextAuditYear',
          'operationalRiskScore',
          'ownerTeam',
          'pastFindingsScore',
        ].sort(),
      );
      expect(typeof row1.financialSize).toBe('string');
      expect(typeof row1.nextAuditYear).toBe('string');
      expect(typeof row1.name).toBe('string');
      expect(row1).not.toHaveProperty('Tên quy trình / hoạt động');
    });

    it('nhảy qua dòng banner/tiêu đề phía trên bảng (smart header detection)', async () => {
      const buffer = await workbookBuffer([
        ['BÁO CÁO ĐỐI TƯỢNG KIỂM TOÁN TOÀN HÀNG'],
        [],
        UNIVERSE_HEADERS,
        UNIVERSE_ROW_1,
      ]);

      const result = await service.importData('audit-universe', buffer);

      expect(result).toEqual({ total: 1, success: 1, errors: [] });
      expect(mocks.auditUniverseService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Kiểm toán toàn diện Chi nhánh Thái Bình',
          departmentCode: 'CN_THAIBINH',
        }),
      );
    });

    it('KHÔNG khử trùng lặp: cùng một đối tượng trong file được tạo 2 lần (blind insert vào audit_universe)', async () => {
      const buffer = await workbookBuffer([
        UNIVERSE_HEADERS,
        UNIVERSE_ROW_1,
        UNIVERSE_ROW_1,
      ]);

      const result = await service.importData('audit-universe', buffer);

      // Nguồn không hề tra cứu tồn tại cho audit-universe → không skip, không update
      expect(result).toEqual({ total: 2, success: 2, errors: [] });
      expect(mocks.auditUniverseService.create).toHaveBeenCalledTimes(2);
      expect(
        (mocks.auditUniverseService.create as jest.Mock).mock.calls[0][0],
      ).toEqual(
        (mocks.auditUniverseService.create as jest.Mock).mock.calls[1][0],
      );
      expect(mocks.auditUniverseRepo.findOne).not.toHaveBeenCalled();
    });

    it('(khoảng trống kiểm tra) dòng thiếu "Tên quy trình / hoạt động" vẫn được ghi với name rỗng và KHÔNG bị báo lỗi', async () => {
      const buffer = await workbookBuffer([
        UNIVERSE_HEADERS,
        ['', 'Chi nhánh Không Tên', 'CN_KHONGTEN', ...UNIVERSE_ROW_1.slice(3)],
      ]);

      const result = await service.importData('audit-universe', buffer);

      // ImportService không validate trường bắt buộc của audit-universe → name: '' đi thẳng xuống DB
      expect(result).toEqual({ total: 1, success: 1, errors: [] });
      const payload = (mocks.auditUniverseService.create as jest.Mock).mock
        .calls[0][0];
      expect(payload.name).toBe('');
      expect(payload.departmentCode).toBe('CN_KHONGTEN');
    });

    it('dòng lỗi không chặn cả lô: 1 dòng bị tầng dưới từ chối vẫn được báo cáo và các dòng khác vẫn được ghi', async () => {
      const buffer = await workbookBuffer([
        UNIVERSE_HEADERS,
        UNIVERSE_ROW_1,
        UNIVERSE_ROW_2,
      ]);

      // Mô phỏng DB từ chối đúng dòng thứ 2 (ví dụ vi phạm ràng buộc NOT NULL / CHECK)
      (mocks.auditUniverseService.create as jest.Mock).mockImplementation(
        async (dto: any) => {
          if (dto.departmentCode === 'KHOI_KHDN') {
            throw new Error(
              'null value in column "departmentCode" violates not-null constraint',
            );
          }
          return { id: 1, ...dto };
        },
      );

      const result = await service.importData('audit-universe', buffer);

      expect(result.total).toBe(2);
      expect(result.success).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].status).toBe('error');
      expect(result.errors[0].message).toBe(
        'null value in column "departmentCode" violates not-null constraint',
      );
      // Dòng lỗi được báo cáo bằng object gốc theo header tiếng Việt (chưa chuẩn hoá)
      expect(Object.keys(result.errors[0].item)).toEqual(
        expect.arrayContaining(UNIVERSE_HEADERS),
      );
      expect(result.errors[0].item['Mã đơn vị phụ trách']).toBe('KHOI_KHDN');

      // Dòng lỗi KHÔNG được persist lần hai: chỉ dòng hợp lệ gọi create
      expect(mocks.auditUniverseService.create).toHaveBeenCalledTimes(2);
      expect(
        (mocks.auditUniverseService.create as jest.Mock).mock.calls[0][0]
          .departmentCode,
      ).toBe('CN_THAIBINH');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 2. Dòng sai định dạng / thiếu trường bắt buộc (lỗi thật của service)
  // ──────────────────────────────────────────────────────────────

  describe('TC-RP-02: dòng lỗi được báo cáo nhưng không abort cả lô', () => {
    it('users: dòng thiếu cả Tên đăng nhập và Mã nhân viên bị báo lỗi, 2 dòng hợp lệ vẫn được import', async () => {
      const buffer = await workbookBuffer([
        ['Tên đăng nhập', 'Mã nhân viên', 'Họ và tên', 'Email', 'Phòng ban'],
        ['user1', 'NV001', 'Người Một', 'a@x.vn', 'Phòng A'],
        ['', '', 'Người Hai', 'b@x.vn', 'Phòng B'],
        ['user3', 'NV003', 'Người Ba', 'c@x.vn', 'Phòng C'],
      ]);

      const result = await service.importData('users', buffer);

      expect(result.total).toBe(3);
      expect(result.success).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].status).toBe('error');
      expect(result.errors[0].message).toBe(
        'Dòng dữ liệu thiếu Tên đăng nhập và Mã nhân viên',
      );
      expect(result.errors[0].item).toEqual(
        expect.objectContaining({
          'Họ và tên': 'Người Hai',
          Email: 'b@x.vn',
          'Phòng ban': 'Phòng B',
        }),
      );

      // Dòng lỗi không được persist
      expect(mocks.usersService.create).toHaveBeenCalledTimes(2);
      expect(
        (mocks.usersService.create as jest.Mock).mock.calls.map(
          (c) => c[0].fullName,
        ),
      ).toEqual(['Người Một', 'Người Ba']);
      expect(mocks.userRepo.update).not.toHaveBeenCalled();
    });

    it('roles: dòng thiếu Tên nhóm quyền bị báo lỗi đúng câu của service, dòng hợp lệ vẫn được tạo', async () => {
      const buffer = await workbookBuffer([
        ['Tên nhóm quyền', 'Mô tả', 'Quyền hạn'],
        ['Kiểm toán viên', 'Nhóm KTV', 'read:audit'],
        ['', 'Nhóm rỗng', 'read:none'],
      ]);

      const result = await service.importData('roles', buffer);

      expect(result.total).toBe(2);
      expect(result.success).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe(
        'Tên nhóm quyền không được để trống',
      );

      // Payload tạo role đúng 3 trường hệ thống
      expect(mocks.roleRepo.create).toHaveBeenCalledTimes(1);
      expect(mocks.roleRepo.create).toHaveBeenCalledWith({
        name: 'Kiểm toán viên',
        description: 'Nhóm KTV',
        permissions: 'read:audit',
      });
      expect(mocks.roleRepo.save).toHaveBeenCalledTimes(1);
      expect(mocks.roleRepo.save).toHaveBeenCalledWith({
        name: 'Kiểm toán viên',
        description: 'Nhóm KTV',
        permissions: 'read:audit',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 3. Module không hỗ trợ
  // ──────────────────────────────────────────────────────────────

  describe('TC-RP-02: module không được hỗ trợ', () => {
    it('importData trả về lỗi đúng câu "Module <x> not supported for import" cho từng dòng và không ném exception', async () => {
      const buffer = await workbookBuffer([UNIVERSE_HEADERS, UNIVERSE_ROW_1]);

      const result = await service.importData('khong-ton-tai', buffer);

      expect(result).toEqual({
        total: 1,
        success: 0,
        errors: [
          {
            status: 'error',
            item: expect.objectContaining({
              'Mã đơn vị phụ trách': 'CN_THAIBINH',
            }),
            message: 'Module khong-ton-tai not supported for import',
          },
        ],
      });
      expect(mocks.auditUniverseService.create).not.toHaveBeenCalled();
      expect(mocks.usersService.create).not.toHaveBeenCalled();
    });

    it('saveItem ném đúng Error "Module <x> not supported for import"', async () => {
      await expect(
        (service as any).saveItem('khong-ton-tai', {}),
      ).rejects.toThrow('Module khong-ton-tai not supported for import');
    });

    it('(khoảng trống) file chỉ có header của module không hỗ trợ bị coi là thành công 0 dòng', async () => {
      const buffer = await workbookBuffer([UNIVERSE_HEADERS]);

      const result = await service.importData('khong-ton-tai', buffer);

      expect(result).toEqual({ total: 0, success: 0, errors: [] });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 4. Xử lý trùng lặp theo từng module
  // ──────────────────────────────────────────────────────────────

  describe('TC-RP-02: xử lý trùng lặp (skip vs update)', () => {
    it('users UPSERT theo username: dòng trùng cập nhật bản ghi cũ, KHÔNG tạo mới', async () => {
      mocks.userRepo.findOne.mockResolvedValue({
        id: 42,
        username: 'nguyenvana',
        status: 'Active',
      });
      mocks.usersService.findOneSafe.mockResolvedValue({
        id: 42,
        fullName: 'Nguyễn Văn A',
      });

      const buffer = await workbookBuffer([
        ['Mã nhân viên', 'Tên đăng nhập', 'Họ và tên', 'Email', 'Phòng ban'],
        [
          'KTV001',
          'nguyenvana',
          'Nguyễn Văn A',
          'nguyenvana@bank.vn',
          'Phòng Kiểm toán Dịch vụ khách hàng',
        ],
      ]);

      const result = await service.importData('users', buffer);

      expect(result).toEqual({ total: 1, success: 1, errors: [] });
      expect(mocks.userRepo.findOne).toHaveBeenCalledWith({
        where: { username: 'nguyenvana' },
      });
      expect(mocks.userRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mocks.usersService.create).not.toHaveBeenCalled();
      expect(mocks.userRepo.update).toHaveBeenCalledWith(42, {
        fullName: 'Nguyễn Văn A',
        email: 'nguyenvana@bank.vn',
        employeeId: 'KTV001',
        department: 'Phòng Kiểm toán Dịch vụ khách hàng',
        status: 'Active',
        isActive: true,
      });
      expect(mocks.usersService.findOneSafe).toHaveBeenCalledWith(42);
    });

    it('audit-rules UPSERT theo ruleId: dòng trùng ghi đè bản ghi cũ thay vì tạo mới', async () => {
      mocks.continuousAuditRuleRepo.findOne.mockResolvedValue({
        id: 5,
        ruleId: 'RULE-TD-001',
        status: 'Active',
        ruleName: 'Luật cũ',
      });

      const buffer = await workbookBuffer([
        [
          'Rule ID',
          'Tên luật giám sát',
          'Mảng nghiệp vụ',
          'Mức độ cảnh báo',
          'SLA Xử lý (giờ)',
        ],
        [
          'RULE-TD-001',
          'Cảnh báo giải ngân sát hạn mức phê duyệt',
          'Tín dụng',
          'High',
          '48',
        ],
      ]);

      const result = await service.importData('audit-rules', buffer);

      expect(result).toEqual({ total: 1, success: 1, errors: [] });
      expect(mocks.continuousAuditRuleRepo.findOne).toHaveBeenCalledWith({
        where: { ruleId: 'RULE-TD-001' },
      });
      expect(mocks.continuousAuditRuleRepo.save).toHaveBeenCalledWith({
        id: 5,
        ruleId: 'RULE-TD-001',
        status: 'Active',
        ruleName: 'Cảnh báo giải ngân sát hạn mức phê duyệt',
        domain: 'Tín dụng',
        auditObjective: '',
        risk: '',
        expectedControl: '',
        logic: '',
        sourceSystem: 'T24 CoreBanking',
        frequency: 'Daily',
        alertLevel: 'Đỏ',
        slaHours: 48,
        isActive: true,
      });
      const saved = (mocks.continuousAuditRuleRepo.save as jest.Mock).mock
        .calls[0][0];
      expect(typeof saved.slaHours).toBe('number');
      expect(mocks.continuousAuditRuleRepo.create).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 5. Điều phối nhánh saveItem theo module (>= 2 module)
  // ──────────────────────────────────────────────────────────────

  describe('TC-RP-02: saveItem điều phối đúng nhánh theo module', () => {
    it('users: ánh xạ header → payload tạo mới với mật khẩu mặc định và cờ đổi mật khẩu', async () => {
      const buffer = await workbookBuffer([
        [
          'Mã nhân viên',
          'Tên đăng nhập',
          'Họ và tên',
          'Email',
          'Số điện thoại',
          'Phòng ban',
          'Chức danh',
          'Trạng thái',
        ],
        [
          'KTV001',
          'nguyenvana',
          'Nguyễn Văn A',
          'nguyenvana@bank.vn',
          '0912345678',
          'Phòng Kiểm toán Dịch vụ khách hàng',
          'KTV',
          'Active',
        ],
      ]);

      const result = await service.importData('users', buffer);

      expect(result).toEqual({ total: 1, success: 1, errors: [] });
      expect(mocks.usersService.create).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn A',
        email: 'nguyenvana@bank.vn',
        phone: '0912345678',
        employeeId: 'KTV001',
        department: 'Phòng Kiểm toán Dịch vụ khách hàng',
        jobTitle: 'KTV',
        status: 'Active',
        username: 'nguyenvana',
        password: '@Lpbank2026!',
        roleId: undefined,
        isActive: true,
        mustChangePassword: true,
      });
    });

    it('users: tra roleId theo tên nhóm quyền trong file', async () => {
      mocks.roleRepo.findOne.mockResolvedValue({
        id: 9,
        name: 'Kiểm toán viên',
      });

      const buffer = await workbookBuffer([
        ['Tên đăng nhập', 'Họ và tên', 'Vai trò'],
        ['user9', 'Người Chín', 'Kiểm toán viên'],
      ]);

      await service.importData('users', buffer);

      expect(mocks.roleRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Kiểm toán viên' },
      });
      expect(mocks.usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 9, username: 'user9' }),
      );
      expect(mocks.roleRepo.save).not.toHaveBeenCalled();
    });

    it("regression: header 'legacyDepartment' của users được ánh xạ về department (không bị rơi mất)", async () => {
      const buffer = await workbookBuffer([
        ['Tên đăng nhập', 'Họ và tên', 'legacyDepartment'],
        ['user-legacy', 'Người Legacy', 'Phòng Kiểm toán Nội bộ'],
      ]);

      const result = await service.importData('users', buffer);

      expect(result).toEqual({ total: 1, success: 1, errors: [] });
      expect(mocks.usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'user-legacy',
          department: 'Phòng Kiểm toán Nội bộ',
        }),
      );
      const payload = (mocks.usersService.create as jest.Mock).mock.calls[0][0];
      expect(payload).not.toHaveProperty('legacyDepartment');
    });

    it('risk-criteria: ép kiểu Trọng số sang number, thiếu trọng số → 0', async () => {
      const buffer = await workbookBuffer([
        [
          'Tên tiêu chí',
          'Trọng số',
          'Phân loại rủi ro',
          'Phân loại đối tượng',
          'Mô tả chi tiết',
        ],
        ['Quy mô Dư nợ Tín dụng', 25, 'Định lượng', 'ChiNhanh', 'Mô tả A'],
        ['Số lượng sai phạm', '', 'Định tính', 'ALL', 'Mô tả B'],
      ]);

      const result = await service.importData('risk-criteria', buffer);

      expect(result).toEqual({ total: 2, success: 2, errors: [] });
      expect(mocks.riskCriteriaService.create).toHaveBeenNthCalledWith(1, {
        name: 'Quy mô Dư nợ Tín dụng',
        weight: 25,
        category: 'Định lượng',
        auditCategory: 'ChiNhanh',
        description: 'Mô tả A',
      });
      expect(mocks.riskCriteriaService.create).toHaveBeenNthCalledWith(2, {
        name: 'Số lượng sai phạm',
        weight: 0,
        category: 'Định tính',
        auditCategory: 'ALL',
        description: 'Mô tả B',
      });
      expect(
        typeof (mocks.riskCriteriaService.create as jest.Mock).mock.calls[0][0]
          .weight,
      ).toBe('number');
    });

    it('risk-control-matrix: chuẩn hoá enum + giá trị mặc định "Chưa xác định"', async () => {
      const buffer = await workbookBuffer([
        [
          'Tên quy trình',
          'Mức độ rủi ro',
          'Tên rủi ro',
          'Tên chốt kiểm soát',
          'Loại chốt',
          'Mức độ tự động hóa',
        ],
        [
          'Quy trình Cấp tín dụng KHDN',
          'Cao',
          'Rủi ro A',
          'Chốt 1',
          'Phát hiện',
          'Bán tự động',
        ],
        ['Quy trình B', 'Thấp', 'Rủi ro B', 'Chốt 2', 'Ngăn ngừa', 'Tự động'],
        ['Quy trình C', 'Nghiêm trọng', 'Rủi ro C', 'Chốt 3', 'Ngăn ngừa', ''],
      ]);

      const result = await service.importData('risk-control-matrix', buffer);

      expect(result).toEqual({ total: 3, success: 3, errors: [] });
      expect(mocks.riskControlMatrixService.create).toHaveBeenNthCalledWith(1, {
        legacyProcessName: 'Quy trình Cấp tín dụng KHDN',
        subProcess: '',
        businessObjective: '',
        riskName: 'Rủi ro A',
        riskDescription: '',
        inherentRiskScore: 'High',
        controlName: 'Chốt 1',
        controlDescription: '',
        controlType: 'Detective',
        controlFrequency: '',
        controlAutomation: 'IT-Dependent Manual',
        testProcedure: '',
        expectedEvidence: '',
      });
      expect(mocks.riskControlMatrixService.create).toHaveBeenNthCalledWith(2, {
        legacyProcessName: 'Quy trình B',
        subProcess: '',
        businessObjective: '',
        riskName: 'Rủi ro B',
        riskDescription: '',
        inherentRiskScore: 'Low',
        controlName: 'Chốt 2',
        controlDescription: '',
        controlType: 'Preventive',
        controlFrequency: '',
        controlAutomation: 'Automated',
        testProcedure: '',
        expectedEvidence: '',
      });
      // Không nhận diện được → mức rủi ro mặc định Medium, tự động hoá mặc định Manual
      expect(
        (mocks.riskControlMatrixService.create as jest.Mock).mock.calls[2][0],
      ).toEqual(
        expect.objectContaining({
          legacyProcessName: 'Quy trình C',
          inherentRiskScore: 'Critical',
          controlAutomation: 'Manual',
        }),
      );
    });

    it('continuous-monitoring: tạo mới luật khi ruleId chưa tồn tại, mặc định domain/frequency/SLA', async () => {
      mocks.continuousAuditRuleRepo.findOne.mockResolvedValue(null);

      const buffer = await workbookBuffer([
        ['Rule ID', 'Tên luật giám sát', 'Mức độ cảnh báo', 'SLA Xử lý (giờ)'],
        ['RULE-NEW-01', 'Luật mới', 'Xanh', ''],
      ]);

      const result = await service.importData('continuous-monitoring', buffer);

      expect(result).toEqual({ total: 1, success: 1, errors: [] });
      expect(mocks.continuousAuditRuleRepo.create).toHaveBeenCalledWith({
        ruleId: 'RULE-NEW-01',
        domain: 'Tín dụng',
        ruleName: 'Luật mới',
        auditObjective: '',
        risk: '',
        expectedControl: '',
        logic: '',
        sourceSystem: 'T24 CoreBanking',
        frequency: 'Daily',
        alertLevel: 'Xanh',
        slaHours: 24,
        status: 'Active',
        isActive: true,
      });
      expect(mocks.continuousAuditRuleRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 6. audit-plans: importData uỷ quyền sang importAuditPlans
  // ──────────────────────────────────────────────────────────────

  describe('TC-RP-02: audit-plans (importData uỷ quyền cho importAuditPlans)', () => {
    const HEADER_BANNER_ROWS = [
      ['KẾ HOẠCH KIỂM TOÁN NỘI BỘ NĂM 2026'],
      [],
      [
        'Căn cứ Quy chế KTNB 3001 & Quy trình KTNB 3002 | Ban hành kèm theo Quyết định của Ban Kiểm soát LPBank',
      ],
      [],
    ];

    const PLAN_ROW_1 = [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'CN-TB',
      'Chi nhánh Thái Bình - Toàn diện hoạt động kinh doanh',
      'ChiNhanh',
      'Hạng 4 (Cao)',
      'Q1',
      'Tháng 03',
      15,
      4,
      'Nguyễn Văn Kiểm',
      'Dư nợ tín dụng tăng trưởng nóng > 35%',
      'Bản nháp',
      '',
    ];

    const PLAN_ROW_2 = [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'IT-SEC',
      'Khối CNTT - Quản lý An toàn thông tin',
      'HeThong',
      'Cao',
      'Q2',
      'Tháng 05',
      20,
      3,
      'Trần Công Nghệ',
      'Hệ thống trọng yếu ngân hàng số',
      'Bản nháp',
      '',
    ];

    beforeEach(() => {
      mocks.auditUniverseRepo.find.mockResolvedValue([
        {
          id: 12,
          departmentCode: 'CN-TB',
          name: 'Chi nhánh Thái Bình',
          department: 'Chi nhánh Thái Bình',
          auditCategory: 'ChiNhanh',
        },
        {
          id: 13,
          departmentCode: 'IT-SEC',
          name: 'Khối CNTT',
          department: 'Khối Công nghệ Thông tin',
          auditCategory: 'HeThong',
        },
      ]);
      mocks.userRepo.find.mockResolvedValue([
        { id: 3, fullName: 'Nguyễn Văn Kiểm', username: 'nvk' },
        { id: 4, fullName: 'Trần Công Nghệ', username: 'tcn' },
      ]);
    });

    it('gom 2 dòng cùng kế hoạch thành 1 plan + 2 đơn vị, ghi đúng payload plan/unit', async () => {
      const buffer = await workbookBuffer([
        ...HEADER_BANNER_ROWS,
        AUDIT_PLAN_HEADERS,
        PLAN_ROW_1,
        PLAN_ROW_2,
      ]);

      const result = await service.importData('audit-plans', buffer);

      expect(result).toEqual({
        total: 2,
        success: 2,
        planCount: 1,
        errors: [],
      });

      expect(mocks.auditPlanRepo.create).toHaveBeenCalledWith({
        year: 2026,
        name: 'Kế hoạch Kiểm toán nội bộ năm 2026',
        ownerTeam: 'ToanKhoi',
        status: 'Draft',
        approvalNotes: '',
      });
      expect(mocks.auditPlanRepo.save).toHaveBeenCalledTimes(1);

      expect(mocks.unitRepo.save).toHaveBeenCalledTimes(1);
      const units = (mocks.unitRepo.save as jest.Mock).mock.calls[0][0];
      // FIXED (BUG 2): 4 cột justification / leadAuditorId / leadAuditorName / auditCategory
      // được TÍNH ở selectedUnits và nay được GHI xuống audit_plan_units (nhánh tạo mới).
      expect(units).toEqual([
        {
          planId: 999,
          universeId: 12,
          universeName: 'Chi nhánh Thái Bình - Toàn diện hoạt động kinh doanh',
          riskLevel: 'Hạng 4 (Cao)',
          justification: 'Dư nợ tín dụng tăng trưởng nóng > 35%',
          estDays: 15,
          ktvCount: 4,
          scheduledMonth: 3,
          targetQuarter: 'Q1',
          leadAuditorId: 3,
          leadAuditorName: 'Nguyễn Văn Kiểm',
          auditCategory: 'ChiNhanh',
        },
        {
          planId: 999,
          universeId: 13,
          universeName: 'Khối CNTT - Quản lý An toàn thông tin',
          riskLevel: 'Hạng 4 (Cao)',
          justification: 'Hệ thống trọng yếu ngân hàng số',
          estDays: 20,
          ktvCount: 3,
          scheduledMonth: 5,
          targetQuarter: 'Q2',
          leadAuditorId: 4,
          leadAuditorName: 'Trần Công Nghệ',
          auditCategory: 'HeThong',
        },
      ]);
      // Regression chi tiết (BUG 2): đủ 4 cột, đúng giá trị đã chuẩn hoá — UI PlanDetailDrawer
      // hiển thị "Trưởng đoàn dự kiến" và "Căn cứ / Giải trình lựa chọn" từ chính các cột này.
      expect(Object.keys(units[0])).toContain('justification');
      expect(Object.keys(units[0])).toContain('leadAuditorId');
      expect(Object.keys(units[0])).toContain('leadAuditorName');
      expect(Object.keys(units[0])).toContain('auditCategory');
      expect(units[0].justification).toBe('Dư nợ tín dụng tăng trưởng nóng > 35%');
      expect(units[0].leadAuditorId).toBe(3);
      expect(units[0].leadAuditorName).toBe('Nguyễn Văn Kiểm');
      expect(units[0].auditCategory).toBe('ChiNhanh');
    });

    it('kế hoạch đã tồn tại → merge đơn vị theo universeId, xoá và ghi lại unit, không tạo plan mới', async () => {
      mocks.auditPlanRepo.findOne.mockResolvedValue({
        id: 7,
        year: 2026,
        name: 'Kế hoạch Kiểm toán nội bộ năm 2026',
        status: 'Draft',
        planUnits: [
          {
            universeId: 12,
            universeName: 'Chi nhánh Thái Bình',
            riskLevel: 'Hạng 3 (Trung bình)',
            estDays: 10,
            ktvCount: 3,
            scheduledMonth: 1,
            targetQuarter: 'Q1',
          },
        ],
      });

      // Trạng thái/kế hoạch chỉ lấy từ DÒNG ĐẦU của nhóm → dòng đầu mang "Đã phê duyệt",
      // dòng sau (trùng đối tượng) giữ "Bản nháp" và bị bỏ qua ở cấp kế hoạch.
      const approvedRow = PLAN_ROW_1.map((v, i) =>
        i === 13 ? 'Đã phê duyệt' : v,
      );
      const buffer = await workbookBuffer([
        AUDIT_PLAN_HEADERS,
        approvedRow,
        PLAN_ROW_1,
      ]);

      const result = await service.importData('audit-plans', buffer);

      expect(result).toEqual({
        total: 2,
        success: 2,
        planCount: 1,
        errors: [],
      });
      expect(mocks.auditPlanRepo.findOne).toHaveBeenCalledWith({
        where: { year: 2026, name: 'Kế hoạch Kiểm toán nội bộ năm 2026' },
      });
      expect(mocks.auditPlanRepo.create).not.toHaveBeenCalled();
      expect(mocks.unitRepo.delete).toHaveBeenCalledWith({ planId: 7 });
      // 2 dòng cùng universeId 12 → merge thành 1 unit, không nhân đôi
      const units = (mocks.unitRepo.save as jest.Mock).mock.calls[0][0];
      expect(units).toHaveLength(1);
      // FIXED (BUG 2): nhánh UPDATE/MERGE cũng ghi đủ justification / leadAuditorId /
      // leadAuditorName / auditCategory (trước đây cả 4 cột bị rơi mất ở cả hai call site).
      expect(units[0]).toEqual({
        planId: 7,
        universeId: 12,
        universeName: 'Chi nhánh Thái Bình - Toàn diện hoạt động kinh doanh',
        riskLevel: 'Hạng 4 (Cao)',
        justification: 'Dư nợ tín dụng tăng trưởng nóng > 35%',
        estDays: 15,
        ktvCount: 4,
        scheduledMonth: 3,
        targetQuarter: 'Q1',
        leadAuditorId: 3,
        leadAuditorName: 'Nguyễn Văn Kiểm',
        auditCategory: 'ChiNhanh',
      });
      expect(mocks.auditPlanRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 7, status: 'Approved' }),
      );
    });

    it('regression (BUG 2 – nhánh MERGE): giữ nguyên đơn vị cũ nhưng ghi đè đủ 4 cột nguồn lực khi trùng universeId', async () => {
      // Bản ghi cũ trong DB thiếu cả 4 cột (dữ liệu import bằng bản lỗi trước đây)
      mocks.auditPlanRepo.findOne.mockResolvedValue({
        id: 7,
        year: 2026,
        name: 'Kế hoạch Kiểm toán nội bộ năm 2026',
        status: 'Draft',
        selectedUnits: [
          {
            universeId: 12,
            name: 'Chi nhánh Thái Bình - Toàn diện hoạt động kinh doanh',
            riskLevel: 'Hạng 3 (Trung bình)',
            estDays: 10,
            ktvCount: 3,
            scheduledMonth: 1,
            targetQuarter: 'Q1',
          },
        ],
      });

      const buffer = await workbookBuffer([
        AUDIT_PLAN_HEADERS,
        PLAN_ROW_1,
        PLAN_ROW_2,
      ]);

      const result = await service.importData('audit-plans', buffer);

      expect(result).toEqual({
        total: 2,
        success: 2,
        planCount: 1,
        errors: [],
      });
      expect(mocks.unitRepo.delete).toHaveBeenCalledWith({ planId: 7 });
      const units = (mocks.unitRepo.save as jest.Mock).mock.calls[0][0];
      expect(units).toEqual([
        expect.objectContaining({
          planId: 7,
          universeId: 12,
          leadAuditorId: 3,
          leadAuditorName: 'Nguyễn Văn Kiểm',
          auditCategory: 'ChiNhanh',
          justification: 'Dư nợ tín dụng tăng trưởng nóng > 35%',
        }),
        expect.objectContaining({
          planId: 7,
          universeId: 13,
          leadAuditorId: 4,
          leadAuditorName: 'Trần Công Nghệ',
          auditCategory: 'HeThong',
          justification: 'Hệ thống trọng yếu ngân hàng số',
        }),
      ]);
    });

    it("regression (BUG 3): 'Chờ phê duyệt' → PendingApproval, 'Đã phê duyệt'/'Phê duyệt' → Approved, các giá trị thật của template giữ nguyên", async () => {
      // Đây là đúng bộ giá trị đi vòng qua UI AuditPlan/PlanDetailDrawer (getStatusText)
      const statuses = [
        'Bản nháp',
        'Chờ phê duyệt',
        'Đã phê duyệt',
        'Phê duyệt',
        'Từ chối',
        'approved',
        'pending',
      ];
      const expected = [
        'Draft',
        'PendingApproval',
        'Approved',
        'Approved',
        'Rejected',
        'Approved',
        'PendingApproval',
      ];

      // Mỗi dòng là một kế hoạch riêng để trạng thái được lấy độc lập từ dòng đầu của nhóm
      const rows = statuses.map((status, i) => ({
        'Năm kế hoạch': 2026,
        'Tên kế hoạch': `Kế hoạch trạng thái ${i}`,
        'Tên đối tượng / Quy trình kiểm toán': 'Chi nhánh Thái Bình',
        'Mã đối tượng KT': 'CN-TB',
        'Trạng thái kế hoạch': status,
      }));

      const result = await service.importAuditPlans(rows);

      expect(result.planCount).toBe(statuses.length);
      expect(result.errors).toEqual([]);
      // Trước khi sửa: 'Chờ phê duyệt' khớp nhánh 'phê duyệt' trước → Approved (nhánh
      // PendingApproval chết). Sau khi sửa: xét 'chờ' trước → PendingApproval.
      expect(
        (mocks.auditPlanRepo.create as jest.Mock).mock.calls.map(
          (c) => c[0].status,
        ),
      ).toEqual(expected);
    });

    it('lỗi 1 nhóm kế hoạch không chặn nhóm khác; success = tổng dòng - số dòng lỗi', async () => {
      mocks.auditPlanRepo.save
        .mockRejectedValueOnce(new Error('DB down'))
        .mockImplementation(async (entity: any) =>
          entity && entity.id ? entity : { ...entity, id: 999 },
        );

      const result = await service.importAuditPlans([
        {
          'Năm kế hoạch': 2026,
          'Tên kế hoạch': 'Kế hoạch A',
          'Tên đối tượng / Quy trình kiểm toán': 'Chi nhánh Thái Bình',
          'Mã đối tượng KT': 'CN-TB',
        },
        {
          'Năm kế hoạch': 2026,
          'Tên kế hoạch': 'Kế hoạch A',
          'Tên đối tượng / Quy trình kiểm toán': 'Khối CNTT',
          'Mã đối tượng KT': 'IT-SEC',
        },
        {
          'Năm kế hoạch': 2027,
          'Tên kế hoạch': 'Kế hoạch B',
          'Tên đối tượng / Quy trình kiểm toán': 'Chi nhánh Thái Bình',
          'Mã đối tượng KT': 'CN-TB',
        },
      ]);

      expect(result.total).toBe(3);
      expect(result.success).toBe(1); // 3 dòng - 2 dòng của nhóm lỗi
      expect(result.planCount).toBe(1); // chỉ Kế hoạch B được ghi
      expect(result.errors).toEqual([
        {
          item: { year: 2026, name: 'Kế hoạch A', rowCount: 2 },
          message: 'DB down',
        },
      ]);
      expect(mocks.unitRepo.save).toHaveBeenCalledTimes(1);
    });

    it('importAuditPlans với mảng rỗng trả về 0 dòng, không truy vấn DB', async () => {
      const result = await service.importAuditPlans([]);

      expect(result).toEqual({ total: 0, success: 0, errors: [] });
      expect(mocks.auditUniverseRepo.find).not.toHaveBeenCalled();
      expect(mocks.userRepo.find).not.toHaveBeenCalled();
      expect(mocks.auditPlanRepo.save).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 7. createTemplateExcel — vòng lặp mẫu → file (trong bộ nhớ)
  // ──────────────────────────────────────────────────────────────

  describe('TC-RP-02: template Excel xuất ra đọc lại được', () => {
    it('createTemplateExcel ghi header = khoá đối tượng và giữ nguyên dữ liệu dòng', async () => {
      const templateData = [
        {
          'Tên quy trình / hoạt động':
            'Kiểm toán toàn diện Chi nhánh Thái Bình',
          'Đơn vị phụ trách': 'Chi nhánh Thái Bình',
        },
      ];

      const buffer = await service.createTemplateExcel(templateData);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.worksheets[0];
      expect(sheet.name).toBe('Template');
      expect(sheet.getRow(1).values).toEqual([
        undefined,
        'Tên quy trình / hoạt động',
        'Đơn vị phụ trách',
      ]);
      expect(sheet.getRow(2).values).toEqual([
        undefined,
        'Kiểm toán toàn diện Chi nhánh Thái Bình',
        'Chi nhánh Thái Bình',
      ]);

      // Vòng tròn khép kín: template xuất ra phải import lại được
      const reimport = await service.importData('audit-universe', buffer);
      expect(reimport.total).toBe(1);
      expect(mocks.auditUniverseService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Kiểm toán toàn diện Chi nhánh Thái Bình',
          department: 'Chi nhánh Thái Bình',
        }),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Audit trail của luồng bulk-import (ImportController, TC-RP-02)
// ═══════════════════════════════════════════════════════════════════

describe('ImportController — audit trail bulk-import (TC-RP-02)', () => {
  let controller: ImportController;
  let importService: { importData: jest.Mock };
  let auditTrailService: { log: jest.Mock };

  const user = { userId: 7, username: 'ktnb01' } as any;
  const req = { ip: '127.0.0.1', headers: { 'user-agent': 'jest-agent' } };
  const file = {
    buffer: Buffer.from('xlsx'),
    filename: 'danh-sach-doi-tuong.xlsx',
    originalname: 'danh-sach-doi-tuong.xlsx',
  };

  beforeEach(async () => {
    importService = {
      importData: jest.fn().mockResolvedValue({
        total: 3,
        success: 2,
        errors: [{ status: 'error', item: { a: 1 }, message: 'boom' }],
      }),
    };
    auditTrailService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        { provide: ImportService, useValue: importService },
        { provide: AuditTrailService, useValue: auditTrailService },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<ImportController>(ImportController);
  });

  it('ghi audit trail action CREATE / resource bulk-import:audit-universe kèm số liệu import', async () => {
    const result = await controller.uploadFile(
      'audit-universe',
      file,
      user,
      req,
    );

    expect(result).toEqual({
      total: 3,
      success: 2,
      errors: [{ status: 'error', item: { a: 1 }, message: 'boom' }],
    });
    expect(importService.importData).toHaveBeenCalledWith(
      'audit-universe',
      file.buffer,
    );
    expect(auditTrailService.log).toHaveBeenCalledWith({
      action: 'CREATE',
      resource: 'bulk-import:audit-universe',
      resourceId: 'audit-universe',
      userId: 7,
      username: 'ktnb01',
      newValue: {
        module: 'audit-universe',
        fileName: 'danh-sach-doi-tuong.xlsx',
        successCount: 2,
        errorCount: 1,
        errorsSummary: [{ status: 'error', item: { a: 1 }, message: 'boom' }],
        timestamp: expect.any(String),
      },
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });
  });

  it('lỗi ghi audit trail không làm hỏng kết quả import', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    auditTrailService.log.mockRejectedValue(new Error('audit trail offline'));

    const result = await controller.uploadFile('users', file, user, req);

    expect(result.success).toBe(2);
    expect(auditTrailService.log).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
