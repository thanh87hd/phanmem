import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditFindingsStatisticsService } from './audit-findings-statistics.service';
import { AuditFinding } from './entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';

/**
 * WS2 — `audit-findings-statistics.service.ts` trước đây KHÔNG có spec.
 *
 * Đây là service tổng hợp thống kê đa chiều. Ngoài phần "đếm cho đúng", nó còn là
 * nơi từng xảy ra 2 lỗi production đã được ghi chú trong
 * `common/utils/team-members-filter.util.ts`:
 *   1. Lọc thành viên đoàn bằng ILIKE chuỗi con → KTV id=2 nhìn thấy dữ liệu của
 *      đoàn chứa userId=24 (rò rỉ dữ liệu ngoài phạm vi).
 *   2. Mệnh đề `@>` thiếu ép kiểu `::jsonb` → PostgreSQL báo
 *      `operator does not exist: text @> jsonb` → HTTP 500 cho mọi KTV.
 * Spec này khoá lại mệnh đề SQL chính xác + tham số fail-closed, để hai lỗi trên
 * không tái phát.
 *
 * Ngoài ra spec còn khoá các quy tắc nghiệp vụ dễ bị phá khi refactor: thứ tự ưu
 * tiên tên đơn vị/quy trình, giá trị mặc định, và thứ tự fallback của tiền phạt.
 */

type AnyRec = Record<string, any>;

const makeQb = (rows: AnyRec[]) => {
  const qb: any = {
    andWhereCalls: [] as any[][],
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn(),
  };
  qb.leftJoinAndSelect.mockImplementation(() => qb);
  qb.orderBy.mockImplementation(() => qb);
  qb.andWhere.mockImplementation((...args: any[]) => {
    qb.andWhereCalls.push(args);
    return qb;
  });
  qb.getMany.mockResolvedValue(rows);
  return qb;
};

describe('AuditFindingsStatisticsService', () => {
  let service: AuditFindingsStatisticsService;

  let findingQb: ReturnType<typeof makeQb>;
  let recQb: ReturnType<typeof makeQb>;
  let repo: any;

  const setup = async (opts: {
    findings?: AnyRec[];
    recommendations?: AnyRec[];
    defectCodes?: AnyRec[];
    defectCodesThrow?: boolean;
  }) => {
    findingQb = makeQb(opts.findings ?? []);
    recQb = makeQb(opts.recommendations ?? []);

    const recommendationRepo = {
      createQueryBuilder: jest.fn(() => recQb),
    };

    repo = {
      createQueryBuilder: jest.fn(() => findingQb),
      manager: {
        query: opts.defectCodesThrow
          ? jest.fn().mockRejectedValue(new Error('relation does not exist'))
          : jest.fn().mockResolvedValue(opts.defectCodes ?? []),
        getRepository: jest.fn(() => recommendationRepo),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditFindingsStatisticsService,
        { provide: getRepositoryToken(AuditFinding), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditFindingsStatisticsService>(
      AuditFindingsStatisticsService,
    );
  };

  beforeEach(async () => {
    await setup({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('truy vấn Recommendation qua manager.getRepository (không inject repo thứ hai)', async () => {
    await service.getMultiDimensionalStats();

    expect(repo.manager.getRepository).toHaveBeenCalledWith(Recommendation);
    expect(recQb.getMany).toHaveBeenCalledTimes(1);
  });

  // ===========================================================================
  // BỘ LỌC ĐẦU VÀO
  // ===========================================================================
  describe('bộ lọc đầu vào', () => {
    it('không truyền bộ lọc nào → không thêm điều kiện nào', async () => {
      await service.getMultiDimensionalStats();

      expect(findingQb.andWhereCalls).toEqual([]);
      expect(recQb.andWhereCalls).toEqual([]);
    });

    it('lọc theo đơn vị, năm và vũ trụ kiểm toán', async () => {
      await service.getMultiDimensionalStats(undefined, 'P.KTNB', '2026', 'CORE');

      const sqls = findingQb.andWhereCalls.map((c) => c[0]);
      expect(sqls).toContain('engagement.legacyAuditedDepartment = :departmentId');
      expect(sqls).toContain('plan.year = :year');
      expect(sqls).toContain('engagement.auditUniverse = :auditUniverse');

      const yearCall = findingQb.andWhereCalls.find((c) =>
        String(c[0]).includes('plan.year'),
      );
      // Năm PHẢI được ép sang số, nếu không PostgreSQL so sánh int = text sẽ lỗi
      expect(yearCall![1]).toEqual({ year: 2026 });
    });

    it('áp dụng cùng bộ lọc cho cả truy vấn kiến nghị (khắc phục)', async () => {
      await service.getMultiDimensionalStats(undefined, 'P.KTNB', '2026', 'CORE');

      const sqls = recQb.andWhereCalls.map((c) => c[0]);
      expect(sqls).toContain('engagement.legacyAuditedDepartment = :departmentId');
      expect(sqls).toContain('plan.year = :year');
      expect(sqls).toContain('engagement.auditUniverse = :auditUniverse');
    });

    it('chuỗi rỗng không được coi là bộ lọc (tránh lọc rỗng làm mất dữ liệu)', async () => {
      await service.getMultiDimensionalStats(undefined, '', '', '');

      expect(findingQb.andWhereCalls).toEqual([]);
    });

    it('sắp xếp findings mới nhất trước', async () => {
      await service.getMultiDimensionalStats();

      expect(findingQb.orderBy).toHaveBeenCalledWith('finding.createdAt', 'DESC');
    });
  });

  // ===========================================================================
  // PHÂN QUYỀN THEO PHẠM VI (chống rò rỉ dữ liệu)
  // ===========================================================================
  describe('phân quyền theo phạm vi', () => {
    it('Admin/CAE KHÔNG bị giới hạn phạm vi', async () => {
      await service.getMultiDimensionalStats({ role: 'Admin', userId: 1 });

      expect(findingQb.andWhereCalls).toEqual([]);
      expect(recQb.andWhereCalls).toEqual([]);
    });

    it('Trưởng ban KTNB cũng thuộc nhóm xem toàn cục', async () => {
      await service.getMultiDimensionalStats({
        role: 'Trưởng ban KTNB',
        userId: 1,
      });

      expect(findingQb.andWhereCalls).toEqual([]);
    });

    it('Kiểm toán viên bị giới hạn theo đoàn / người phụ trách', async () => {
      await service.getMultiDimensionalStats({ role: 'Kiểm toán viên', userId: 7 });

      expect(findingQb.andWhereCalls).toHaveLength(1);
      const [sql, params] = findingQb.andWhereCalls[0];
      expect(sql).toContain('engagement.leadAuditorId = :userId');
      expect(sql).toContain('engagement."teamMembers"::jsonb @> :jsonUser::jsonb');
      expect(params).toEqual({ userId: 7, jsonUser: '[{"userId":7}]' });
    });

    it('KHÔNG dùng ILIKE/CAST chuỗi con để lọc đoàn (lỗi rò rỉ đã từng xảy ra)', async () => {
      await service.getMultiDimensionalStats({ role: 'Kiểm toán viên', userId: 2 });

      const sql = String(findingQb.andWhereCalls[0][0]);
      expect(sql).not.toMatch(/ILIKE/i);
      expect(sql).not.toMatch(/CAST\s*\(\s*.*teamMembers.*AS\s+text/i);
      expect(sql).toContain('::jsonb');
    });

    it('userId không hợp lệ → tham số fail-closed, KHÔNG mở toàn bộ dữ liệu', async () => {
      await service.getMultiDimensionalStats({
        role: 'Kiểm toán viên',
        userId: undefined,
      });

      const params = findingQb.andWhereCalls[0][1] as any;
      expect(params.jsonUser).toBe('[{"userId":-1}]');
      expect(params.jsonUser).not.toBe('{}');
    });

    it('truy vấn kiến nghị còn giới hạn thêm theo người được giao (assignedToId)', async () => {
      await service.getMultiDimensionalStats({ role: 'Kiểm toán viên', userId: 7 });

      expect(recQb.andWhereCalls).toHaveLength(1);
      const [sql, params] = recQb.andWhereCalls[0];
      expect(sql).toContain('rec.assignedToId = :userId');
      expect(params).toEqual({ userId: 7, jsonUser: '[{"userId":7}]' });
    });

    it('không có user → coi như xem toàn cục (đường dẫn nội bộ)', async () => {
      await service.getMultiDimensionalStats(undefined);

      expect(findingQb.andWhereCalls).toEqual([]);
    });
  });

  // ===========================================================================
  // TỔNG HỢP THEO ĐƠN VỊ / QUY TRÌNH
  // ===========================================================================
  describe('tổng hợp theo đơn vị và quy trình', () => {
    const finding = (over: AnyRec = {}): AnyRec => ({
      riskLevel: 'High',
      ...over,
    });

    it('ưu tiên tên chi nhánh quản lý, rồi tới đơn vị được kiểm toán', async () => {
      await setup({
        findings: [
          finding({
            managingBranch: { name: 'CN Hà Nội' },
            engagement: { auditedDepartment: { name: 'P.KTNB' } },
          }),
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byUnit).toEqual([
        {
          unit: 'CN Hà Nội',
          Critical: 0,
          High: 1,
          Medium: 0,
          Low: 0,
          total: 1,
        },
      ]);
    });

    it('rơi về "Đội ngũ khác" khi không xác định được đơn vị', async () => {
      await setup({ findings: [finding({ engagement: {} })] });

      const res = await service.getMultiDimensionalStats();

      expect(res.byUnit[0].unit).toBe('Đội ngũ khác');
    });

    it('đếm đủ 4 mức rủi ro và tổng', async () => {
      await setup({
        findings: [
          finding({ riskLevel: 'Critical', managingBranch: { name: 'A' } }),
          finding({ riskLevel: 'High', managingBranch: { name: 'A' } }),
          finding({ riskLevel: 'Medium', managingBranch: { name: 'A' } }),
          finding({ riskLevel: 'Low', managingBranch: { name: 'A' } }),
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byUnit[0]).toMatchObject({
        Critical: 1,
        High: 1,
        Medium: 1,
        Low: 1,
        total: 4,
      });
    });

    it('riskLevel lạ vẫn vào tổng nhưng KHÔNG vào ô mức rủi ro nào', async () => {
      await setup({
        findings: [
          finding({ riskLevel: 'Unknown', managingBranch: { name: 'A' } }),
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byUnit[0]).toMatchObject({
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        total: 1,
      });
    });

    it('thiếu riskLevel → mặc định Medium', async () => {
      await setup({
        findings: [finding({ riskLevel: undefined, managingBranch: { name: 'A' } })],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byUnit[0].Medium).toBe(1);
    });

    it('sắp xếp đơn vị theo tổng số phát hiện giảm dần', async () => {
      await setup({
        findings: [
          finding({ managingBranch: { name: 'Ít' } }),
          finding({ managingBranch: { name: 'Nhiều' } }),
          finding({ managingBranch: { name: 'Nhiều' } }),
          finding({ managingBranch: { name: 'Nhiều' } }),
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byUnit.map((u) => u.unit)).toEqual(['Nhiều', 'Ít']);
      expect(res.byUnit.map((u) => u.total)).toEqual([3, 1]);
    });

    it('ưu tiên tên quy trình nghiệp vụ, rồi tới workstream, rồi "Quy trình khác"', async () => {
      await setup({
        findings: [
          finding({ businessProcessEntity: { name: 'Cấp tín dụng' } }),
          finding({ workstream: { title: 'WS 1' } }),
          finding({}),
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byProcess.map((p) => p.process).sort()).toEqual(
        ['Cấp tín dụng', 'WS 1', 'Quy trình khác'].sort(),
      );
    });
  });

  // ===========================================================================
  // LOẠI NGHIỆP VỤ / VÙNG
  // ===========================================================================
  describe('loại nghiệp vụ và vùng', () => {
    it('luôn trả về đủ 3 loại nghiệp vụ chuẩn, kể cả khi không có dữ liệu', async () => {
      const res = await service.getMultiDimensionalStats();

      expect(res.byOperationType).toEqual([
        expect.objectContaining({ operationType: 'Tín dụng (TD)', total: 0 }),
        expect.objectContaining({ operationType: 'Phi tín dụng (PTD)', total: 0 }),
        expect.objectContaining({
          operationType: 'Tiết kiệm Bưu điện (TKBĐ)',
          total: 0,
        }),
      ]);
    });

    it('phân loại đúng TD / PTD / TKBĐ', async () => {
      await setup({
        findings: [
          { riskLevel: 'High', operationType: 'TD' },
          { riskLevel: 'Low', operationType: 'PTD' },
          { riskLevel: 'Medium', operationType: 'TKBĐ' },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      const byType = Object.fromEntries(
        res.byOperationType.map((o) => [o.operationType, o]),
      );
      expect(byType['Tín dụng (TD)'].High).toBe(1);
      expect(byType['Phi tín dụng (PTD)'].Low).toBe(1);
      expect(byType['Tiết kiệm Bưu điện (TKBĐ)'].Medium).toBe(1);
    });

    it('nghiệp vụ lạ được gom vào nhóm "Nghiệp vụ khác"', async () => {
      await setup({ findings: [{ riskLevel: 'High', operationType: 'XYZ' }] });

      const res = await service.getMultiDimensionalStats();

      const other = res.byOperationType.find(
        (o) => o.operationType === 'Nghiệp vụ khác',
      );
      expect(other).toBeDefined();
      expect(other!.total).toBe(1);
    });

    it('thiếu operationType → nhóm "Nghiệp vụ khác"', async () => {
      await setup({ findings: [{ riskLevel: 'High' }] });

      const res = await service.getMultiDimensionalStats();

      expect(
        res.byOperationType.find((o) => o.operationType === 'Nghiệp vụ khác')!
          .total,
      ).toBe(1);
    });

    it('vùng lấy từ phát hiện trước, rồi tới kỳ kiểm toán, cuối cùng là "Khác"', async () => {
      await setup({
        findings: [
          { riskLevel: 'High', region: 'Miền Bắc' },
          { riskLevel: 'High', engagement: { region: 'Miền Nam' } },
          { riskLevel: 'High' },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byRegion.map((r) => r.region).sort()).toEqual(
        ['Miền Bắc', 'Miền Nam', 'Khác'].sort(),
      );
    });
  });

  // ===========================================================================
  // CÁN BỘ PHỤ TRÁCH
  // ===========================================================================
  describe('thống kê theo cán bộ phụ trách', () => {
    it('ưu tiên người dùng liên kết, rồi tới tên legacy', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            proposerUser: { fullName: 'Nguyễn Văn A' },
            legacyProposerOfficer: 'Tên cũ',
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byOfficer.proposers).toEqual([
        { name: 'Nguyễn Văn A', Critical: 0, High: 1, Medium: 0, Low: 0, total: 1 },
      ]);
    });

    it('phát hiện không có người đề xuất → không tạo mục rỗng', async () => {
      await setup({ findings: [{ riskLevel: 'High' }] });

      const res = await service.getMultiDimensionalStats();

      expect(res.byOfficer.proposers).toEqual([]);
      expect(res.byOfficer.appraisers).toEqual([]);
      expect(res.byOfficer.leaders).toEqual([]);
    });

    it('tách riêng 3 vai trò: đề xuất / thẩm định / lãnh đạo nghiệp vụ', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            proposerUser: { fullName: 'A' },
            appraiserUser: { fullName: 'B' },
            businessLeaderUser: { fullName: 'C' },
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byOfficer.proposers[0].name).toBe('A');
      expect(res.byOfficer.appraisers[0].name).toBe('B');
      expect(res.byOfficer.leaders[0].name).toBe('C');
    });

    it('chỉ lấy top 10 cán bộ cho mỗi vai trò', async () => {
      const findings = Array.from({ length: 15 }, (_, i) => ({
        riskLevel: 'High',
        proposerUser: { fullName: `CB ${String(i).padStart(2, '0')}` },
      }));
      await setup({ findings });

      const res = await service.getMultiDimensionalStats();

      expect(res.byOfficer.proposers).toHaveLength(10);
    });

    it('top 10 được chọn theo số lượng giảm dần', async () => {
      const findings: AnyRec[] = [
        ...Array.from({ length: 5 }, () => ({
          riskLevel: 'High',
          proposerUser: { fullName: 'Nhiều nhất' },
        })),
        ...Array.from({ length: 3 }, () => ({
          riskLevel: 'High',
          proposerUser: { fullName: 'Nhì' },
        })),
        { riskLevel: 'High', proposerUser: { fullName: 'Ba' } },
      ];
      await setup({ findings });

      const res = await service.getMultiDimensionalStats();

      expect(res.byOfficer.proposers.map((p) => p.name)).toEqual([
        'Nhiều nhất',
        'Nhì',
        'Ba',
      ]);
    });
  });

  // ===========================================================================
  // MÃ LỖI ND340 / NHÂN SỰ
  // ===========================================================================
  describe('thống kê mã lỗi ND340 và Nhân sự', () => {
    it('cộng dồn tiền phạt thực tế khi có', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'ND340-01' },
            actualFineAmount: 5_000_000,
          },
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'ND340-01' },
            actualFineAmount: 2_000_000,
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340).toEqual([
        expect.objectContaining({
          code: 'ND340-01',
          count: 2,
          totalFine: 7_000_000,
        }),
      ]);
    });

    it('thiếu tiền phạt thực tế → rơi về maxFine của mã lỗi', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'ND340-02', maxFine: 3_000_000 },
            actualFineAmount: null,
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340[0].totalFine).toBe(3_000_000);
    });

    it('không có maxFine trên entity → tra bảng defect_codes', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'ND340-03' },
            actualFineAmount: undefined,
          },
        ],
        defectCodes: [
          { code: 'ND340-03', dimension: 'ND340', maxFine: 1_500_000 },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340[0].totalFine).toBe(1_500_000);
    });

    it('không tra được gì → tiền phạt 0 (không NaN)', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'ND340-99' },
            actualFineAmount: null,
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340[0].totalFine).toBe(0);
      expect(Number.isNaN(res.byNd340[0].totalFine)).toBe(false);
    });

    it('mã lỗi ND340 khác dimension (NHANSU) không bị dùng nhầm cho ND340', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'X-01' },
            actualFineAmount: null,
          },
        ],
        defectCodes: [
          { code: 'X-01', dimension: 'NHANSU', maxFine: 9_000_000 },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340[0].totalFine).toBe(0);
    });

    it('lỗi truy vấn defect_codes không làm sập thống kê (suy giảm mềm)', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'ND340-04' },
            actualFineAmount: 1_000,
          },
        ],
        defectCodesThrow: true,
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340[0].totalFine).toBe(1_000);
    });

    it('mô tả mã lỗi rơi về "Unknown" khi không tra được', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'ND340-05' },
            actualFineAmount: 0,
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340[0].description).toBe('Unknown');
    });

    it('mã nhân sự lấy riskLevel từ bảng defect_codes khi entity không có', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nhanSuDefectCodeEntity: { code: 'NS-01' },
          },
        ],
        defectCodes: [
          { code: 'NS-01', dimension: 'NHANSU', riskLevel: 4, description: 'Vi phạm' },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNhanSu[0]).toMatchObject({
        code: 'NS-01',
        riskLevel: 4,
        description: 'Vi phạm',
        count: 1,
      });
    });

    it('mã lỗi legacy vẫn được tính khi chưa có entity liên kết', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            legacyNd340DefectCode: 'ND340-LEGACY',
            actualFineAmount: 100,
            legacyNhanSuDefectCode: 'NS-LEGACY',
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340[0].code).toBe('ND340-LEGACY');
      expect(res.byNhanSu[0].code).toBe('NS-LEGACY');
    });

    it('sắp xếp mã lỗi theo số lần xuất hiện giảm dần', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'A' },
            actualFineAmount: 1,
          },
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'B' },
            actualFineAmount: 1,
          },
          {
            riskLevel: 'High',
            nd340DefectCodeEntity: { code: 'B' },
            actualFineAmount: 1,
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byNd340.map((n) => n.code)).toEqual(['B', 'A']);
    });
  });

  // ===========================================================================
  // LỊCH SỬ THEO ĐƠN VỊ
  // ===========================================================================
  describe('lịch sử phát hiện theo đơn vị', () => {
    it('gom theo đơn vị và năm, sắp xếp năm giảm dần', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            managingBranch: { name: 'CN A' },
            engagement: { name: 'KT 2024', plan: { year: 2024 } },
          },
          {
            riskLevel: 'High',
            managingBranch: { name: 'CN A' },
            engagement: { name: 'KT 2026', plan: { year: 2026 } },
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      const unitA = res.historyByUnit.find((u) => u.unit === 'CN A')!;
      expect(unitA.history.map((h) => h.year)).toEqual([2026, 2024]);
    });

    it('nhiều phát hiện trong cùng một kỳ được cộng dồn vào một dòng', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            managingBranch: { name: 'CN A' },
            engagement: { name: 'KT 2026', plan: { year: 2026 }, status: 'Completed' },
          },
          {
            riskLevel: 'Low',
            managingBranch: { name: 'CN A' },
            engagement: { name: 'KT 2026', plan: { year: 2026 }, status: 'Completed' },
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      const unitA = res.historyByUnit.find((u) => u.unit === 'CN A')!;
      expect(unitA.history).toHaveLength(1);
      expect(unitA.history[0].engagements).toEqual([
        {
          year: 2026,
          engagementName: 'KT 2026',
          findingsCount: 2,
          status: 'Completed',
        },
      ]);
    });

    it('không có plan.year → suy ra năm từ ngày bắt đầu kỳ kiểm toán', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            managingBranch: { name: 'CN A' },
            engagement: { name: 'KT', startDate: '2023-05-20' },
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      const unitA = res.historyByUnit.find((u) => u.unit === 'CN A')!;
      expect(unitA.history[0].year).toBe(2023);
    });

    it('thiếu tên kỳ kiểm toán → dùng nhãn mặc định "Kỳ kiểm toán"', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            managingBranch: { name: 'CN A' },
            engagement: { plan: { year: 2026 } },
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      const unitA = res.historyByUnit.find((u) => u.unit === 'CN A')!;
      expect(unitA.history[0].engagements[0].engagementName).toBe('Kỳ kiểm toán');
    });

    it('thiếu trạng thái kỳ kiểm toán → mặc định Completed', async () => {
      await setup({
        findings: [
          {
            riskLevel: 'High',
            managingBranch: { name: 'CN A' },
            engagement: { name: 'KT', plan: { year: 2026 } },
          },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      const unitA = res.historyByUnit.find((u) => u.unit === 'CN A')!;
      expect(unitA.history[0].engagements[0].status).toBe('Completed');
    });
  });

  // ===========================================================================
  // THỐNG KÊ KHẮC PHỤC KIẾN NGHỊ
  // ===========================================================================
  describe('thống kê khắc phục theo đơn vị', () => {
    it('đếm theo trạng thái và tổng, sắp xếp giảm dần', async () => {
      await setup({
        recommendations: [
          { departmentEntity: { name: 'P.A' }, status: 'Completed' },
          { departmentEntity: { name: 'P.A' }, status: 'InProgress' },
          { departmentEntity: { name: 'P.B' }, status: 'NotStarted' },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byCorrectiveUnit.map((c) => c.legacyDepartment)).toEqual([
        'P.A',
        'P.B',
      ]);
      expect(res.byCorrectiveUnit[0]).toMatchObject({
        Completed: 1,
        InProgress: 1,
        total: 2,
      });
    });

    it('trạng thái lạ vẫn vào tổng nhưng không vào ô trạng thái nào', async () => {
      await setup({
        recommendations: [{ departmentEntity: { name: 'P.A' }, status: 'Bogus' }],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byCorrectiveUnit[0]).toMatchObject({
        NotStarted: 0,
        InProgress: 0,
        Completed: 0,
        Overdue: 0,
        Verified: 0,
        total: 1,
      });
    });

    it('thiếu trạng thái → mặc định NotStarted', async () => {
      await setup({ recommendations: [{ departmentEntity: { name: 'P.A' } }] });

      const res = await service.getMultiDimensionalStats();

      expect(res.byCorrectiveUnit[0].NotStarted).toBe(1);
    });

    it('thiếu đơn vị → nhóm "Đơn vị khác"', async () => {
      await setup({ recommendations: [{ status: 'Overdue' }] });

      const res = await service.getMultiDimensionalStats();

      expect(res.byCorrectiveUnit[0].legacyDepartment).toBe('Đơn vị khác');
    });

    it('đếm đủ 5 trạng thái khắc phục', async () => {
      await setup({
        recommendations: [
          { departmentEntity: { name: 'P.A' }, status: 'NotStarted' },
          { departmentEntity: { name: 'P.A' }, status: 'InProgress' },
          { departmentEntity: { name: 'P.A' }, status: 'Completed' },
          { departmentEntity: { name: 'P.A' }, status: 'Overdue' },
          { departmentEntity: { name: 'P.A' }, status: 'Verified' },
        ],
      });

      const res = await service.getMultiDimensionalStats();

      expect(res.byCorrectiveUnit[0]).toMatchObject({
        NotStarted: 1,
        InProgress: 1,
        Completed: 1,
        Overdue: 1,
        Verified: 1,
        total: 5,
      });
    });
  });

  // ===========================================================================
  // HÌNH DẠNG KẾT QUẢ
  // ===========================================================================
  describe('hình dạng kết quả trả về', () => {
    it('luôn trả đủ 10 khoá, kể cả khi không có dữ liệu', async () => {
      const res = await service.getMultiDimensionalStats();

      expect(Object.keys(res).sort()).toEqual(
        [
          'byUnit',
          'byProcess',
          'byCorrectiveUnit',
          'historyByUnit',
          'byOperationType',
          'byRegion',
          'byOfficer',
          'byNd340',
          'byNhanSu',
        ].sort(),
      );
    });

    it('không có dữ liệu → các mảng thống kê rỗng (không undefined)', async () => {
      const res = await service.getMultiDimensionalStats();

      expect(res.byUnit).toEqual([]);
      expect(res.byProcess).toEqual([]);
      expect(res.byCorrectiveUnit).toEqual([]);
      expect(res.historyByUnit).toEqual([]);
      expect(res.byRegion).toEqual([]);
      expect(res.byNd340).toEqual([]);
      expect(res.byNhanSu).toEqual([]);
      expect(res.byOfficer).toEqual({
        proposers: [],
        appraisers: [],
        leaders: [],
      });
    });
  });
});
