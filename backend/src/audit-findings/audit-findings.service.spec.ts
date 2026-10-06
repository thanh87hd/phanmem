import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditFindingsService } from './audit-findings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { WorkflowsService } from '../workflows/workflows.service';
import { AuditFindingsStatisticsService } from './audit-findings-statistics.service';

describe('AuditFindingsService', () => {
  let service: AuditFindingsService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  };

  const mockAuditFindingRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    manager: {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      }),
      query: jest.fn().mockResolvedValue([]),
      // The service persists new findings inside `manager.transaction(...)`
      // (pg advisory lock + max findingCode lookup). Run the callback against
      // transactional manager methods that delegate to the repository-level
      // create/save mocks, so persistence stays observable via
      // mockAuditFindingRepo.save exactly as the assertions expect.
      // EntityManager.create takes (entityClass, plainObject), so the plain
      // object is forwarded to the repository-level create mock.
      transaction: jest.fn().mockImplementation((cb) =>
        cb({
          create: (_entity: any, dto: any) => mockAuditFindingRepo.create(dto),
          save: (...args: any[]) => mockAuditFindingRepo.save(...args),
          query: jest.fn().mockResolvedValue([]),
        }),
      ),
    },
  };

  const mockWorkstreamRepo = {
    findOne: jest.fn(),
  };

  const mockRecommendationRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 10, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockWorkflowsService = {
    triggerEvent: jest.fn().mockResolvedValue(true),
    // update() luôn đọc định nghĩa workflow động trước khi lưu. Trả về null để
    // các test guard trạng thái (TC-FIND-03 / TC-AUD-02) chạy độc lập với
    // cấu hình workflow, không cần dựng steps/permission.
    findByEntity: jest.fn().mockResolvedValue(null),
  };

  const mockStatsService = {
    getMultiDimensionalStats: jest.fn().mockResolvedValue({
      byUnit: [],
      byProcess: [],
      byCorrectiveUnit: [],
      historyByUnit: [],
      byOperationType: [],
      byRegion: [],
      byOfficer: { proposers: [], appraisers: [], leaders: [] },
      byNd340: [],
      byNhanSu: [],
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditFindingsService,
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockAuditFindingRepo,
        },
        {
          provide: getRepositoryToken(AuditWorkstream),
          useValue: mockWorkstreamRepo,
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecommendationRepo,
        },
        {
          provide: WorkflowsService,
          useValue: mockWorkflowsService,
        },
        {
          provide: AuditFindingsStatisticsService,
          useValue: mockStatsService,
        },
      ],
    }).compile();

    service = module.get<AuditFindingsService>(AuditFindingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateFindingCode', () => {
    it('should generate default finding code when no engagement or workstream provided', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      const currentYear = new Date().getFullYear();

      const code = await service.generateFindingCode();

      expect(code).toBe(`FD-${currentYear}-GEN-GEN-001`);
    });

    it('should generate specific finding code based on engagement branch and credit workstream', async () => {
      mockAuditFindingRepo.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id: 101,
          branchCode: 'HCM',
          plan: { year: 2026 },
        }),
      });

      mockWorkstreamRepo.findOne.mockResolvedValue({
        id: 202,
        title: 'Quy trình Cho vay Khách hàng Cá nhân (Tín dụng)',
      });

      mockQueryBuilder.getCount.mockResolvedValue(2);

      const code = await service.generateFindingCode(101, 202);

      expect(code).toBe('FD-2026-HCM-TD-003');
    });

    it('should generate code for IT workstream', async () => {
      mockAuditFindingRepo.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id: 102,
          branchCode: 'DANANG',
          plan: { year: 2026 },
        }),
      });

      mockWorkstreamRepo.findOne.mockResolvedValue({
        id: 203,
        title: 'Hệ thống Công nghệ Thông tin và Bảo mật',
      });

      mockQueryBuilder.getCount.mockResolvedValue(0);

      const code = await service.generateFindingCode(102, 203);

      expect(code).toBe('FD-2026-DANANG-IT-001');
    });
  });

  describe('create', () => {
    it('should auto-generate findingCode and set reportedByAuditorId from user context', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const createDto: any = {
        title: 'Hồ sơ tín dụng thiếu chứng từ chứng minh thu nhập',
        riskLevel: 'High',
        engagementId: 1,
      };

      const user = { userId: 5, fullName: 'Auditor Nguyen' };

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(result.findingCode).toContain('FD-');
      expect(result.reportedByAuditorId).toBe(5);
      expect(mockAuditFindingRepo.save).toHaveBeenCalled();
    });

    it('should preserve provided findingCode if already supplied', async () => {
      const createDto: any = {
        findingCode: 'FD-CUSTOM-001',
        title: 'Sai lệch tiền mặt kiểm kê quỹ',
        riskLevel: 'Medium',
      };

      const result = await service.create(createDto);

      expect(result.findingCode).toBe('FD-CUSTOM-001');
    });
  });

  describe('findAll', () => {
    it('should return findings with relations for admin user', async () => {
      const mockFindings = [
        { id: 1, findingCode: 'FD-2026-GEN-GEN-001', title: 'Finding 1' },
        { id: 2, findingCode: 'FD-2026-GEN-GEN-002', title: 'Finding 2' },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockFindings);

      const user = { userId: 1, role: 'Admin' };
      const results = await service.findAll(user);

      expect(results).toEqual(mockFindings);
      expect(mockAuditFindingRepo.createQueryBuilder).toHaveBeenCalledWith(
        'finding',
      );
    });

    it('should filter by engagementId when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll({ userId: 1, role: 'Admin' }, 42);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'finding.engagementId = :engagementId',
        { engagementId: 42 },
      );
    });

    // ================= TC-AUD-01: Cổng Auditee – cô lập dữ liệu =================
    // Kỳ vọng UAT: auditee CHỈ thấy phát hiện thuộc đúng chi nhánh/đơn vị của
    // mình; phát hiện của chi nhánh khác không bao giờ được trả về.

    it('TC-AUD-01: auditee có legacyDepartment chỉ nhận phát hiện của đúng đơn vị mình (Chi nhánh Hà Nội)', async () => {
      const auditeeFindings = [
        {
          id: 501,
          findingCode: 'FD-2026-CNHN-TD-001',
          engagement: { legacyAuditedDepartment: 'Chi nhánh Hà Nội' },
        },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(auditeeFindings);
      const userEntityFindOne = jest
        .fn()
        .mockResolvedValue({ id: 10, legacyDepartment: 'Chi nhánh Hà Nội' });
      mockAuditFindingRepo.manager.getRepository.mockReturnValue({
        findOne: userEntityFindOne,
      });

      const result = await service.findAll({
        userId: 10,
        role: 'Đơn vị được kiểm toán',
        fullName: 'Giám đốc CN Hà Nội',
      });

      // 1) Nhận diện đúng vai trò auditee và tra user entity để lấy đơn vị
      expect(mockAuditFindingRepo.manager.getRepository).toHaveBeenCalledWith(
        'User',
      );
      expect(userEntityFindOne).toHaveBeenCalledWith({ where: { id: 10 } });

      // 2) Truy vấn bị giới hạn ĐÚNG theo đơn vị của chính auditee
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'engagement.legacyAuditedDepartment = :dept',
        { dept: 'Chi nhánh Hà Nội' },
      );

      // 3) KHÔNG áp mệnh đề phạm vi của KTV (đoàn kiểm toán / giấy tờ làm việc)
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('engagement.leadAuditorId'),
        expect.anything(),
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('"teamMembers"::jsonb @>'),
        expect.anything(),
      );

      // 4) Chỉ trả về đúng các bản ghi do query trả về (không nới rộng phạm vi)
      expect(result).toEqual(auditeeFindings);
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(500);
    });

    it('TC-AUD-01: auditee KHÔNG có legacyDepartment nhận mảng rỗng và không hề truy vấn dữ liệu', async () => {
      mockAuditFindingRepo.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 11, legacyDepartment: null }),
      });

      const result = await service.findAll({
        userId: 11,
        role: 'Đơn vị được kiểm toán',
      });

      expect(result).toEqual([]);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(mockQueryBuilder.take).not.toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).not.toHaveBeenCalled();
    });

    it('TC-AUD-01: auditee không tìm thấy user entity cũng nhận mảng rỗng (fail-closed)', async () => {
      mockAuditFindingRepo.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findAll({ userId: 99, role: 'Auditee' });

      expect(result).toEqual([]);
      expect(mockQueryBuilder.getMany).not.toHaveBeenCalled();
    });

    it('TC-AUD-01: KTV không phải admin bị giới hạn theo đoàn kiểm toán / giấy tờ làm việc', async () => {
      const user = { userId: 7, role: 'Kiểm toán viên' };

      await service.findAll(user);

      const scopeCall = mockQueryBuilder.andWhere.mock.calls.find(
        (call) => call[1] && (call[1] as any).jsonUser !== undefined,
      );
      expect(scopeCall).toBeDefined();
      const [clause, params] = scopeCall as [string, any];

      expect(clause).toContain('engagement.leadAuditorId = :userId');
      expect(clause).toContain('engagement."teamMembers"::jsonb @> :jsonUser::jsonb');
      expect(clause).toContain('wp.creatorId = :userId');
      expect(clause).toContain('workstream.assignedAuditorId = :userId');
      expect(params).toEqual({ userId: 7, jsonUser: '[{"userId":7}]' });

      // Không đi nhánh auditee → không tra User/legacyDepartment
      expect(
        mockAuditFindingRepo.manager.getRepository,
      ).not.toHaveBeenCalledWith('User');
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
    });

    it('TC-AUD-01: tham số jsonUser dùng containment chính xác (userId=2 không khớp userId=24)', async () => {
      await service.findAll({ userId: 2, role: 'Kiểm toán viên' });

      const scopeCall = mockQueryBuilder.andWhere.mock.calls.find(
        (call) => call[1] && (call[1] as any).jsonUser !== undefined,
      );
      expect(scopeCall).toBeDefined();
      expect((scopeCall as any[])[0]).toContain(':jsonUser::jsonb');
      // Nếu lọc bằng chuỗi con ILIKE '%"userId":%2%' thì KTV id=2 sẽ nhìn thấy
      // dữ liệu của đoàn chứa userId=24 → rò rỉ phân quyền.
      expect((scopeCall as any[])[1]).toEqual({
        userId: 2,
        jsonUser: '[{"userId":2}]',
      });
    });

    it('TC-AUD-01: admin KHÔNG bị thêm bất kỳ mệnh đề giới hạn phạm vi nào', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll({ userId: 1, role: 'Admin' });

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(
        mockAuditFindingRepo.manager.getRepository,
      ).not.toHaveBeenCalledWith('User');
    });
  });

  // ====== TC-FIND-03 (gửi phát hiện) & TC-AUD-02 (phản hồi giải trình) ======
  // Kỳ vọng UAT: các bước chuyển trạng thái phát hiện đều được bảo vệ —
  // Withdrawn phải kèm lý do rút, chuyển ngược phải kèm lý do trả lại,
  // Confirmed phải đóng dấu người/thời điểm xác nhận, và mọi thay đổi đều persist.
  describe('update – guard chuyển trạng thái phát hiện', () => {
    const currentUser = {
      userId: 9,
      role: 'Trưởng đoàn kiểm toán',
      fullName: 'Ninh Xuân Điệp',
    };

    it('TC-FIND-03: Withdrawn thiếu withdrawalReason → BadRequestException và không lưu', async () => {
      mockAuditFindingRepo.findOne.mockResolvedValue({
        id: 77,
        findingCode: 'FD-2026-CNHN-TD-001',
        status: 'UnderReview',
      });

      const err1 = await service
        .update(77, { status: 'Withdrawn' } as any, currentUser)
        .catch((e) => e);
      expect(err1).toBeInstanceOf(BadRequestException);
      expect(err1.message).toBe(
        'Cần cung cấp lý do rút phát hiện (withdrawalReason) khi chuyển trạng thái Withdrawn.',
      );

      // Lý do chỉ gồm khoảng trắng cũng bị coi là thiếu (có trim)
      const err2 = await service
        .update(
          77,
          { status: 'Withdrawn', withdrawalReason: '   ' } as any,
          currentUser,
        )
        .catch((e) => e);
      expect(err2).toBeInstanceOf(BadRequestException);

      expect(mockAuditFindingRepo.save).not.toHaveBeenCalled();
    });

    it('TC-FIND-03: Withdrawn kèm withdrawalReason → ghi lý do, người rút, thời điểm rút và persist qua save', async () => {
      const finding: any = {
        id: 77,
        findingCode: 'FD-2026-CNHN-TD-001',
        status: 'UnderReview',
      };
      mockAuditFindingRepo.findOne.mockResolvedValue(finding);

      const result = await service.update(
        77,
        {
          status: 'Withdrawn',
          withdrawalReason: 'Đơn vị đã khắc phục xong trước hạn',
        } as any,
        currentUser,
      );

      expect(mockAuditFindingRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockAuditFindingRepo.save.mock.calls[0][0] as any;
      expect(saved.status).toBe('Withdrawn');
      expect(saved.withdrawalReason).toBe('Đơn vị đã khắc phục xong trước hạn');
      expect(saved.withdrawnById).toBe(9);
      expect(saved.withdrawnAt).toBeInstanceOf(Date);
      expect((result as any).status).toBe('Withdrawn');
    });

    it('TC-AUD-02: chuyển ngược Confirmed → Returned thiếu returnReason → BadRequestException và không lưu', async () => {
      mockAuditFindingRepo.findOne.mockResolvedValue({
        id: 88,
        findingCode: 'FD-2026-CNHN-TD-002',
        status: 'Confirmed',
      });

      const err1 = await service
        .update(88, { status: 'Returned' } as any, currentUser)
        .catch((e) => e);
      expect(err1).toBeInstanceOf(BadRequestException);
      expect(err1.message).toBe(
        'Cần cung cấp lý do trả lại/điều chỉnh (returnReason) khi chuyển ngược phát hiện từ Confirmed về Returned.',
      );

      // Lý do rỗng bằng khoảng trắng cũng bị chặn
      const err2 = await service
        .update(
          88,
          { status: 'Returned', returnReason: '  ' } as any,
          currentUser,
        )
        .catch((e) => e);
      expect(err2).toBeInstanceOf(BadRequestException);

      expect(mockAuditFindingRepo.save).not.toHaveBeenCalled();
    });

    it('TC-AUD-02: chuyển ngược kèm returnReason → ghi lý do trả lại, người trả, thời điểm trả và persist', async () => {
      const finding: any = {
        id: 88,
        findingCode: 'FD-2026-CNHN-TD-002',
        status: 'Confirmed',
      };
      mockAuditFindingRepo.findOne.mockResolvedValue(finding);

      await service.update(
        88,
        {
          status: 'Returned',
          returnReason: 'Số liệu chưa khớp sổ phụ, đề nghị giải trình bổ sung',
        } as any,
        currentUser,
      );

      const saved = mockAuditFindingRepo.save.mock.calls[0][0] as any;
      expect(saved.status).toBe('Returned');
      expect(saved.returnReason).toBe(
        'Số liệu chưa khớp sổ phụ, đề nghị giải trình bổ sung',
      );
      expect(saved.returnedById).toBe(9);
      expect(saved.returnedAt).toBeInstanceOf(Date);
    });

    it('TC-AUD-02: Confirmed → đóng dấu confirmedById/confirmedAt đúng người xác nhận và persist', async () => {
      const finding: any = {
        id: 99,
        findingCode: 'FD-2026-CNHN-TD-003',
        status: 'UnderReview',
      };
      mockAuditFindingRepo.findOne.mockResolvedValue(finding);

      await service.update(99, { status: 'Confirmed' } as any, currentUser);

      expect(mockAuditFindingRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockAuditFindingRepo.save.mock.calls[0][0] as any;
      expect(saved.status).toBe('Confirmed');
      expect(saved.confirmedById).toBe(9);
      expect(saved.confirmedAt).toBeInstanceOf(Date);
    });

    it('TC-FIND-03: cập nhật KHÔNG đổi trạng thái → không đòi lý do, vẫn lưu nội dung sửa', async () => {
      const finding: any = {
        id: 100,
        findingCode: 'FD-2026-CNHN-TD-004',
        status: 'UnderReview',
        findingTitle: 'Tiêu đề cũ',
      };
      mockAuditFindingRepo.findOne.mockResolvedValue(finding);

      await service.update(
        100,
        { status: 'UnderReview', findingTitle: 'Tiêu đề đã hiệu chỉnh' } as any,
        currentUser,
      );

      const saved = mockAuditFindingRepo.save.mock.calls[0][0] as any;
      expect(saved.findingTitle).toBe('Tiêu đề đã hiệu chỉnh');
      expect(saved.withdrawalReason).toBeUndefined();
      expect(saved.withdrawnAt).toBeUndefined();
      expect(saved.returnedAt).toBeUndefined();
      expect(saved.confirmedAt).toBeUndefined();
    });
  });
});
