import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEngagementsService } from './audit-engagements.service';
import { AuditEngagement } from './entities/audit-engagement.entity';
import { AuditWorkstream } from './entities/audit-workstream.entity';
import { AuditSchedule } from '../audit-schedules/entities/audit-schedule.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { EngagementChangeRequest } from './entities/engagement-change-request.entity';
import { IndependenceService } from '../independence/independence.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('AuditEngagementsService', () => {
  let service: AuditEngagementsService;
  // Tham chiếu tới mock IndependenceService để điều khiển/kiểm chứng các lệnh gọi
  let independenceMock: any;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest
      .fn()
      .mockResolvedValue([
        { id: 1, name: 'Cuộc kiểm toán Tín dụng 2026', status: 'InExecution' },
      ]),
  };

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockWorkstreamRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 10, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockScheduleRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 20, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    // update() xoá lịch công tác cũ trước khi tạo lịch mới
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockWorkingPaperRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockChangeRequestRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 30, ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditEngagementsService,
        { provide: getRepositoryToken(AuditEngagement), useValue: mockRepo },
        {
          provide: getRepositoryToken(AuditWorkstream),
          useValue: mockWorkstreamRepo,
        },
        {
          provide: getRepositoryToken(AuditSchedule),
          useValue: mockScheduleRepo,
        },
        {
          provide: getRepositoryToken(WorkingPaper),
          useValue: mockWorkingPaperRepo,
        },
        {
          provide: getRepositoryToken(EngagementChangeRequest),
          useValue: mockChangeRequestRepo,
        },
        {
          provide: IndependenceService,
          useValue: {
            checkAuditorIndependence: jest.fn().mockResolvedValue({ isIndependent: true }),
            assessTeamIndependence: jest.fn().mockResolvedValue({ isCompliant: true }),
            // update() gọi checkAssignmentSafety cho từng thành viên được phân công
            checkAssignmentSafety: jest.fn().mockResolvedValue({ safe: true }),
          },
        },
      ],
    }).compile();

    service = module.get<AuditEngagementsService>(AuditEngagementsService);
    independenceMock = module.get<IndependenceService>(IndependenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new engagement', async () => {
      const dto = { name: 'Kiểm toán Huy động vốn', status: 'Planning' };
      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        ...dto,
        isExpectedInfo: false,
        legacyAuditedDepartment: undefined,
        legacyLeadAuditor: undefined,
        legacyPlanName: undefined,
      });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 1);
      expect(result.name).toBe('Kiểm toán Huy động vốn');
    });
  });

  describe('findAll', () => {
    it('should query engagements with admin role without restricting by department', async () => {
      const user = { userId: 1, role: 'Admin' };
      const results = await service.findAll(user);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('eng');
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(results).toHaveLength(1);
    });

    it('should apply department filter for auditee user', async () => {
      const user = {
        userId: 5,
        role: 'Auditee',
        legacyDepartment: 'Chi nhánh Hà Nội',
      };
      await service.findAll(user);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'eng.legacyAuditedDepartment = :dept',
        { dept: 'Chi nhánh Hà Nội' },
      );
    });

    /**
     * Hồi quy lỗi rò rỉ dữ liệu theo Đoàn kiểm toán (TC-WP-03):
     * mệnh đề lọc PHẢI dùng jsonb containment `@>` với tham số mảng số,
     * TUYỆT ĐỐI không dùng mẫu chuỗi con ILIKE '%"userId":%<id>%' vì nó khớp
     * nhầm id=2 với `"userId":24`.
     */
    it('should scope a non-admin KTV by exact jsonb containment on teamMembers (TC-WP-03)', async () => {
      const user = { userId: 2, role: 'Auditor', teamCode: 'P.KTDN' };
      await service.findAll(user);

      const ktvScopeCall = mockQueryBuilder.andWhere.mock.calls.find(
        (call: any[]) =>
          typeof call[0] === 'string' && call[0].includes('eng.leadAuditorId'),
      );
      expect(ktvScopeCall).toBeDefined();
      const [sql, params] = ktvScopeCall as [string, Record<string, any>];

      expect(sql).toContain('eng."teamMembers"::jsonb @> :jsonUser::jsonb');
      expect(sql).not.toContain('ILIKE');
      expect(params.jsonUser).toBe('[{"userId":2}]');
      expect(params).not.toHaveProperty('likeUserId');
    });
  });

  describe('findOne', () => {
    it('should return engagement with workstreams', async () => {
      const mockEngagement = { id: 1, name: 'CTKT 1', workstreams: [] };
      mockRepo.findOne.mockResolvedValue(mockEngagement);

      const result = await service.findOne(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'workstreams',
          'leadAuditorUser',
          'plan',
          'auditedDepartment',
        ],
      });
      expect(result).toEqual({
        ...mockEngagement,
        auditedDepartment: '',
        leadAuditor: '',
        planName: '',
      });
    });
  });

  describe('createFromRiskAssessment', () => {
    it('should return null for Low or Medium risk assessment', async () => {
      const lowRiskAssessment = { id: 99, riskLevel: 'Low' };
      const result = await service.createFromRiskAssessment(lowRiskAssessment);
      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should create engagement for High risk assessment', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const highRiskAssessment = {
        id: 101,
        riskLevel: 'High',
        legacyDepartment: 'Khối CNTT',
        residualRiskScore: 16,
        auditCategory: 'Công nghệ thông tin',
      };

      const result = await service.createFromRiskAssessment(highRiskAssessment);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('reviewWorkstream (Four-Eyes Gate)', () => {
    it('should throw NotFoundException if workstream not found', async () => {
      mockWorkstreamRepo.findOne.mockResolvedValue(null);
      await expect(
        service.reviewWorkstream(999, { status: 'Reviewed' }, { role: 'admin' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not lead auditor and not privileged', async () => {
      const mockWs = { id: 10, engagementId: 1 };
      mockWorkstreamRepo.findOne.mockResolvedValue(mockWs);
      mockRepo.findOne.mockResolvedValue({ id: 1, leadAuditorId: 5 });

      await expect(
        service.reviewWorkstream(10, { status: 'Reviewed' }, { userId: 99, role: 'KTV' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update status to Rework with reviewNotes', async () => {
      const mockWs = { id: 10, engagementId: 1, status: 'Completed' };
      mockWorkstreamRepo.findOne.mockResolvedValue(mockWs);
      mockRepo.findOne.mockResolvedValue({ id: 1, leadAuditorId: 5 });

      await service.reviewWorkstream(
        10,
        { status: 'Rework', reviewNotes: 'Thiếu bằng chứng kiểm tra mẫu' },
        { userId: 5, role: 'lead_auditor' }
      );

      expect(mockWorkstreamRepo.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          status: 'Rework',
          reviewNotes: 'Thiếu bằng chứng kiểm tra mẫu',
        })
      );
    });

    it('should update status to Reviewed with reviewedAt and reviewNotes', async () => {
      const mockWs = { id: 10, engagementId: 1, status: 'Completed' };
      mockWorkstreamRepo.findOne.mockResolvedValue(mockWs);
      mockRepo.findOne.mockResolvedValue({ id: 1, leadAuditorId: 5 });

      await service.reviewWorkstream(
        10,
        { status: 'Reviewed', reviewNotes: 'Đã soát xét đạt' },
        { userId: 5, role: 'lead_auditor' }
      );

      expect(mockWorkstreamRepo.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          status: 'Reviewed',
          reviewNotes: 'Đã soát xét đạt',
          reviewedAt: expect.any(Date),
        })
      );
    });
  });

  /**
   * TC-ENG-01: Cuộc kiểm toán tạo mới phải ở trạng thái "Khởi tạo (Planning)".
   * `create()` chỉ gán Draft khi dữ liệu là dự kiến (isExpectedInfo).
   */
  describe('create - trạng thái mặc định (TC-ENG-01)', () => {
    it('should default status to Planning when status is omitted', async () => {
      const result = await service.create({
        name: 'Kiểm toán hoạt động tín dụng CN Hà Nội',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Kiểm toán hoạt động tín dụng CN Hà Nội',
          status: 'Planning',
          isExpectedInfo: false,
        }),
      );
      expect(result.status).toBe('Planning');
    });

    it('should default status to Draft when isExpectedInfo is true', async () => {
      const result = await service.create({
        name: '[Dự kiến] Kiểm toán CN Hà Nội',
        isExpectedInfo: true,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Draft', isExpectedInfo: true }),
      );
      expect(result.status).toBe('Draft');
    });

    it('should keep an explicitly provided status', async () => {
      const result = await service.create({
        name: 'CTKT đột xuất',
        status: 'Fieldwork',
      });

      expect(result.status).toBe('Fieldwork');
    });
  });

  /**
   * TC-ENG-03: Khảo sát sơ bộ & Đề cương kiểm toán.
   * Trưởng đoàn trình duyệt đề cương (submit), Trưởng ban KTNB duyệt (approve)
   * hoặc yêu cầu chỉnh sửa (reject) - có lưu vết revision history.
   */
  describe('Đề cương & Khảo sát sơ bộ (TC-ENG-03)', () => {
    describe('submitProposal', () => {
      it('should set Submitted, stamp the submission time and append a revision-history entry', async () => {
        mockRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'CTKT Tín dụng CN Hà Nội',
          status: 'Planning',
          leadAuditorId: 5,
          proposalReviewHistory: [],
        });

        const result = await service.submitProposal(
          1,
          { userId: 5, fullName: 'Ninh Xuân Điệp' },
          'Trình duyệt đề cương & danh mục mẫu chọn Tín dụng',
        );

        expect(mockRepo.save).toHaveBeenCalledTimes(1);
        expect(mockRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ proposalStatus: 'Submitted' }),
        );
        expect(result.proposalStatus).toBe('Submitted');
        expect(result.proposalSubmittedAt).toBeInstanceOf(Date);
        expect(result.proposalNotes).toBe(
          'Trình duyệt đề cương & danh mục mẫu chọn Tín dụng',
        );
        // Trình duyệt đề cương KHÔNG được đổi trạng thái cuộc KT
        expect(result.status).toBe('Planning');
        expect(result.proposalReviewHistory).toHaveLength(1);
        expect(result.proposalReviewHistory[0]).toEqual(
          expect.objectContaining({
            iteration: 1,
            action: 'SUBMIT',
            actorId: 5,
            actorName: 'Ninh Xuân Điệp',
            role: 'Trưởng đoàn kiểm toán',
            notes: 'Trình duyệt đề cương & danh mục mẫu chọn Tín dụng',
            timestamp: expect.any(String),
          }),
        );
      });

      it('should append the next iteration when resubmitting after a rework', async () => {
        mockRepo.findOne.mockResolvedValue({
          id: 2,
          status: 'Planning',
          proposalReviewHistory: [{ iteration: 1, action: 'REWORK' }],
          proposalRevisionCount: 1,
        });

        const result = await service.submitProposal(2, {
          userId: 5,
          username: 'diepnx',
        });

        expect(result.proposalReviewHistory).toHaveLength(2);
        expect(result.proposalReviewHistory[1]).toEqual(
          expect.objectContaining({
            iteration: 2,
            action: 'SUBMIT',
            actorId: 5,
            actorName: 'diepnx',
          }),
        );
      });

      it('should throw NotFoundException when the engagement does not exist', async () => {
        mockRepo.findOne.mockResolvedValue(null);

        await expect(
          service.submitProposal(999, { userId: 5 }),
        ).rejects.toThrow(NotFoundException);
        expect(mockRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('approveProposal', () => {
      it('should set Approved, move the engagement to Fieldwork and officialize the team', async () => {
        mockRepo.findOne.mockResolvedValue({
          id: 3,
          name: 'CTKT Tín dụng CN Hà Nội',
          status: 'Planning',
          isOfficialized: false,
          proposalReviewHistory: [],
        });

        const result = await service.approveProposal(
          3,
          { userId: 2, fullName: 'Lương Ngọc Thắng' },
          'Đồng ý đề cương & chương trình kiểm toán',
        );

        expect(result.proposalStatus).toBe('Approved');
        expect(result.proposalApprovedAt).toBeInstanceOf(Date);
        expect(result.proposalApprovedBy).toBe('Lương Ngọc Thắng');
        expect(result.status).toBe('Fieldwork');
        expect(result.isOfficialized).toBe(true);
        expect(result.officializedAt).toBeInstanceOf(Date);
        expect(result.officializedBy).toBe('Lương Ngọc Thắng');
        expect(result.proposalNotes).toBe(
          'Đồng ý đề cương & chương trình kiểm toán',
        );
        expect(result.proposalReviewHistory).toEqual([
          expect.objectContaining({
            iteration: 1,
            action: 'APPROVE',
            actorId: 2,
            actorName: 'Lương Ngọc Thắng',
            role: 'Trưởng Ban KTNB',
            notes: 'Đồng ý đề cương & chương trình kiểm toán',
          }),
        ]);
      });

      it('should throw NotFoundException when the engagement does not exist', async () => {
        mockRepo.findOne.mockResolvedValue(null);

        await expect(
          service.approveProposal(999, { userId: 2 }),
        ).rejects.toThrow(NotFoundException);
        expect(mockRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('rejectProposal', () => {
      it('should reject an empty reason before loading the engagement', async () => {
        await expect(service.rejectProposal(4, '')).rejects.toThrow(
          'Vui lòng nhập lý do yêu cầu chỉnh sửa đề cương',
        );
        expect(mockRepo.findOne).not.toHaveBeenCalled();
        expect(mockRepo.save).not.toHaveBeenCalled();
      });

      it('should set Rework, bump the revision counter and keep the engagement status unchanged', async () => {
        mockRepo.findOne.mockResolvedValue({
          id: 4,
          status: 'Planning',
          proposalRevisionCount: 1,
          proposalReviewHistory: [{ iteration: 1, action: 'SUBMIT' }],
        });

        const result = await service.rejectProposal(
          4,
          'Bổ sung phạm vi kiểm toán kho quỹ',
          { userId: 2, fullName: 'Lương Ngọc Thắng' },
        );

        expect(result.proposalStatus).toBe('Rework');
        expect(result.proposalRevisionCount).toBe(2);
        expect(result.proposalNotes).toBe('Bổ sung phạm vi kiểm toán kho quỹ');
        // Yêu cầu chỉnh sửa KHÔNG được đổi trạng thái cuộc KT
        expect(result.status).toBe('Planning');
        expect(result.proposalReviewHistory).toHaveLength(2);
        expect(result.proposalReviewHistory[1]).toEqual(
          expect.objectContaining({
            iteration: 2,
            action: 'REWORK',
            actorId: 2,
            actorName: 'Lương Ngọc Thắng',
            notes: 'Bổ sung phạm vi kiểm toán kho quỹ',
          }),
        );
      });

      it('should start the revision counter at 1 when none exists yet', async () => {
        mockRepo.findOne.mockResolvedValue({ id: 5, status: 'Planning' });

        const result = await service.rejectProposal(5, 'Thiếu danh mục mẫu chọn', {
          userId: 2,
        });

        expect(result.proposalRevisionCount).toBe(1);
        expect(result.proposalReviewHistory).toHaveLength(1);
      });

      it('should throw NotFoundException when the engagement does not exist', async () => {
        mockRepo.findOne.mockResolvedValue(null);

        await expect(
          service.rejectProposal(999, 'Thiếu căn cứ'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  /**
   * TC-ENG-04: Tạo & Duyệt Yêu cầu thay đổi cuộc KT (Change Request).
   * Duyệt yêu cầu -> áp requestedChanges lên cuộc KT (gia hạn ngày kết thúc),
   * chặn tự duyệt theo nguyên tắc 4 mắt, từ chối thì không chạm vào cuộc KT.
   */
  describe('Yêu cầu thay đổi cuộc KT (TC-ENG-04)', () => {
    const pendingRequest = () => ({
      id: 30,
      engagementId: 1,
      requesterId: 7,
      requesterName: 'diepnx',
      requestedChanges: { endDate: '2026-04-28', leadAuditor: 'Ninh Xuân Điệp' },
      reason: 'Phát sinh mẫu kiểm toán lớn tại PGD trực thuộc',
      status: 'Pending',
    });

    describe('createChangeRequest', () => {
      it('should persist a Pending request with the requested changes separated from the reason', async () => {
        mockRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'CTKT Tín dụng CN Hà Nội',
        });

        const result = await service.createChangeRequest(1, 7, 'diepnx', {
          reason: 'Gia hạn thêm 3 ngày do dữ liệu phức tạp',
          endDate: '2026-04-28',
        });

        expect(mockChangeRequestRepo.create).toHaveBeenCalledWith({
          engagementId: 1,
          requesterId: 7,
          requesterName: 'diepnx',
          requestedChanges: { endDate: '2026-04-28' },
          reason: 'Gia hạn thêm 3 ngày do dữ liệu phức tạp',
          status: 'Pending',
        });
        expect(mockChangeRequestRepo.save).toHaveBeenCalled();
        expect(result.status).toBe('Pending');
      });

      it('should require a reason', async () => {
        mockRepo.findOne.mockResolvedValue({ id: 1, name: 'CTKT' });

        const error = await service
          .createChangeRequest(1, 7, 'diepnx', { endDate: '2026-04-28' })
          .catch((e) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Bắt buộc phải có lý do thay đổi');
        expect(mockChangeRequestRepo.save).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when the engagement does not exist', async () => {
        mockRepo.findOne.mockResolvedValue(null);

        await expect(
          service.createChangeRequest(999, 7, 'diepnx', { reason: 'Gia hạn' }),
        ).rejects.toThrow(NotFoundException);
        expect(mockChangeRequestRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('approveChangeRequest', () => {
      it('should apply the requested changes to the engagement and mark the request Approved with reviewer fields', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(pendingRequest());
        mockRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'CTKT Tín dụng CN Hà Nội',
          status: 'Fieldwork',
        });

        const result = await service.approveChangeRequest(30, 2, 'luongnt2');

        // Ngày kết thúc cuộc KT được cập nhật tự động qua update(engagementId, requestedChanges)
        expect(mockRepo.update).toHaveBeenCalledWith(1, {
          endDate: '2026-04-28',
          legacyLeadAuditor: 'Ninh Xuân Điệp',
        });
        expect(mockChangeRequestRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 30,
            status: 'Approved',
            reviewerId: 2,
            reviewerName: 'luongnt2',
          }),
        );
        expect(result.status).toBe('Approved');
      });

      it('should run the approval inside the repository transaction when one is available', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(pendingRequest());
        mockRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'CTKT Tín dụng CN Hà Nội',
        });

        const transactionalRepo = {
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 1, name: 'CTKT Tín dụng CN Hà Nội' }),
          save: jest
            .fn()
            .mockImplementation((entity) => Promise.resolve({ id: 30, ...entity })),
        };
        const manager = {
          getRepository: jest.fn().mockReturnValue(transactionalRepo),
        };
        const transaction = jest.fn(async (cb: any) => cb(manager));
        (mockChangeRequestRepo as any).manager = { transaction };

        try {
          const result = await service.approveChangeRequest(30, 2, 'luongnt2');

          expect(transaction).toHaveBeenCalledTimes(1);
          expect(manager.getRepository).toHaveBeenCalledWith(
            EngagementChangeRequest,
          );
          expect(transactionalRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
              id: 30,
              status: 'Approved',
              reviewerId: 2,
              reviewerName: 'luongnt2',
            }),
          );
          // Việc ghi trạng thái yêu cầu đi qua transaction...
          expect(mockChangeRequestRepo.save).not.toHaveBeenCalled();
          // ...và từ FIX BUG-2 phần cập nhật cuộc KT cũng dùng CÙNG manager.
          expect(manager.getRepository).toHaveBeenCalledWith(AuditEngagement);
          expect(transactionalRepo.update).toHaveBeenCalledWith(1, {
            endDate: '2026-04-28',
            legacyLeadAuditor: 'Ninh Xuân Điệp',
          });
          expect(mockRepo.update).not.toHaveBeenCalled();
          expect(result.status).toBe('Approved');
        } finally {
          delete (mockChangeRequestRepo as any).manager;
        }
      });

      /**
       * Hồi quy BUG-2 (MEDIUM — giao dịch nửa vời):
       * trước đây `update(engagementId, requestedChanges)` ghi qua repo GỐC
       * (`this.repo`) trong khi trạng thái yêu cầu ghi qua manager của transaction.
       * Nếu lệnh ghi trạng thái thất bại và rollback thì cuộc KT vẫn đã bị sửa
       * ("yêu cầu chưa duyệt nhưng cuộc KT đã đổi ngày kết thúc").
       */
      it('regression BUG-2: cập nhật cuộc KT dùng ĐÚNG repository của transaction (không dùng repo gốc)', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(pendingRequest());
        mockRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'CTKT Tín dụng CN Hà Nội',
        });

        const transactionalEngagementRepo = {
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 1, name: 'CTKT Tín dụng CN Hà Nội' }),
        };
        const transactionalChangeRepo = {
          save: jest
            .fn()
            .mockImplementation((entity) => Promise.resolve({ id: 30, ...entity })),
        };
        const manager = {
          getRepository: jest.fn((entity: any) =>
            entity === AuditEngagement
              ? transactionalEngagementRepo
              : transactionalChangeRepo,
          ),
        };
        const transaction = jest.fn(async (cb: any) => cb(manager));
        (mockChangeRequestRepo as any).manager = { transaction };

        try {
          const result = await service.approveChangeRequest(30, 2, 'luongnt2');

          // Cùng một manager được dùng cho cả hai lệnh ghi
          expect(manager.getRepository).toHaveBeenCalledWith(AuditEngagement);
          expect(manager.getRepository).toHaveBeenCalledWith(
            EngagementChangeRequest,
          );
          expect(transactionalEngagementRepo.update).toHaveBeenCalledWith(1, {
            endDate: '2026-04-28',
            legacyLeadAuditor: 'Ninh Xuân Điệp',
          });
          // Đọc lại cuộc KT (để dựng lịch) cũng nằm trong transaction, không đọc
          // bản ghi CŨ từ repo gốc.
          expect(transactionalEngagementRepo.findOne).toHaveBeenCalledWith({
            where: { id: 1 },
            relations: [
              'workstreams',
              'leadAuditorUser',
              'plan',
              'auditedDepartment',
            ],
          });
          expect(mockRepo.findOne).toHaveBeenCalledTimes(1); // chỉ cho fallback đơn vị KT
          expect(transactionalChangeRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
              id: 30,
              status: 'Approved',
              reviewerId: 2,
              reviewerName: 'luongnt2',
            }),
          );
          // Repo gốc KHÔNG được dùng cho bất kỳ lệnh ghi nào trong transaction
          expect(mockRepo.update).not.toHaveBeenCalled();
          expect(mockChangeRequestRepo.save).not.toHaveBeenCalled();
          // Kết quả happy path không đổi
          expect(result.status).toBe('Approved');
          expect(result.id).toBe(30);
        } finally {
          delete (mockChangeRequestRepo as any).manager;
        }
      });

      it('regression BUG-2: ghi cuộc KT thất bại thì ném lỗi và trạng thái yêu cầu KHÔNG được lưu (cùng đơn vị công việc)', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(pendingRequest());
        mockRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'CTKT Tín dụng CN Hà Nội',
        });

        const transactionalEngagementRepo = {
          update: jest.fn().mockRejectedValue(new Error('DB write failed')),
        };
        const transactionalChangeRepo = { save: jest.fn() };
        const manager = {
          getRepository: jest.fn((entity: any) =>
            entity === AuditEngagement
              ? transactionalEngagementRepo
              : transactionalChangeRepo,
          ),
        };
        const transaction = jest.fn(async (cb: any) => cb(manager));
        (mockChangeRequestRepo as any).manager = { transaction };

        try {
          await expect(
            service.approveChangeRequest(30, 2, 'luongnt2'),
          ).rejects.toThrow('DB write failed');

          expect(transactionalChangeRepo.save).not.toHaveBeenCalled();
          expect(mockChangeRequestRepo.save).not.toHaveBeenCalled();
          expect(mockRepo.update).not.toHaveBeenCalled();
        } finally {
          delete (mockChangeRequestRepo as any).manager;
        }
      });

      it('regression BUG-2: lịch công tác được dựng từ dữ liệu TRONG transaction (ngày kết thúc MỚI), không phải bản ghi cũ ở repo gốc', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(pendingRequest());
        // Repo gốc vẫn trả bản ghi CŨ (endDate 2026-04-20) — nếu update() đọc lại
        // bằng repo gốc thì lịch công tác sẽ bị dựng sai ngày.
        mockRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'CTKT Tín dụng CN Hà Nội',
          startDate: '2026-04-01',
          endDate: '2026-04-20',
          leadAuditorId: 5,
          legacyLeadAuditor: 'Ninh Xuân Điệp',
        });

        const transactionalEngagementRepo = {
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          // Trong transaction đã thấy ngày kết thúc MỚI do lệnh update vừa ghi
          findOne: jest.fn().mockResolvedValue({
            id: 1,
            name: 'CTKT Tín dụng CN Hà Nội',
            startDate: '2026-04-01',
            endDate: '2026-04-28',
            leadAuditorId: 5,
            legacyLeadAuditor: 'Ninh Xuân Điệp',
            ownerTeam: 'P.KTDN',
            branchName: 'Chi nhánh Hà Nội',
          }),
        };
        const transactionalChangeRepo = {
          save: jest
            .fn()
            .mockImplementation((entity) => Promise.resolve({ id: 30, ...entity })),
        };
        const manager = {
          getRepository: jest.fn((entity: any) =>
            entity === AuditEngagement
              ? transactionalEngagementRepo
              : transactionalChangeRepo,
          ),
        };
        const transaction = jest.fn(async (cb: any) => cb(manager));
        (mockChangeRequestRepo as any).manager = { transaction };

        try {
          await service.approveChangeRequest(30, 2, 'luongnt2');

          expect(transactionalEngagementRepo.findOne).toHaveBeenCalledTimes(1);
          expect(mockScheduleRepo.delete).toHaveBeenCalledWith({
            engagementId: 1,
          });
          expect(mockScheduleRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: 5,
              startDate: '2026-04-01',
              endDate: '2026-04-28',
            }),
          );
          expect(mockScheduleRepo.create).not.toHaveBeenCalledWith(
            expect.objectContaining({ endDate: '2026-04-20' }),
          );
          expect(mockScheduleRepo.save).toHaveBeenCalledTimes(1);
        } finally {
          delete (mockChangeRequestRepo as any).manager;
        }
      });

      it('should refuse to approve a request that is not Pending', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue({
          ...pendingRequest(),
          status: 'Approved',
        });

        const error = await service
          .approveChangeRequest(30, 2, 'luongnt2')
          .catch((e) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Change Request is already Approved');
        expect(mockRepo.update).not.toHaveBeenCalled();
        expect(mockChangeRequestRepo.save).not.toHaveBeenCalled();
      });

      it('should block self-approval under the Four-Eyes principle', async () => {
        // requesterId = 7 trùng reviewerId = 7
        mockChangeRequestRepo.findOne.mockResolvedValue(pendingRequest());

        const error = await service
          .approveChangeRequest(30, 7, 'diepnx')
          .catch((e) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('4 mắt');
        expect(mockRepo.update).not.toHaveBeenCalled();
        expect(mockChangeRequestRepo.save).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when the request does not exist', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(null);

        await expect(
          service.approveChangeRequest(999, 2, 'luongnt2'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('rejectChangeRequest', () => {
      it('should mark the request Rejected with reviewer fields and leave the engagement untouched', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(pendingRequest());

        const result = await service.rejectChangeRequest(
          30,
          2,
          'luongnt2',
          'Chưa đủ căn cứ gia hạn',
        );

        expect(mockChangeRequestRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 30,
            status: 'Rejected',
            reviewerId: 2,
            reviewerName: 'luongnt2',
            reviewNotes: 'Chưa đủ căn cứ gia hạn',
          }),
        );
        expect(result.status).toBe('Rejected');
        // Từ chối KHÔNG được cập nhật cuộc kiểm toán
        expect(mockRepo.update).not.toHaveBeenCalled();
        expect(mockRepo.save).not.toHaveBeenCalled();
        expect(mockRepo.findOne).not.toHaveBeenCalled();
      });

      it('should fall back to a default review note', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(pendingRequest());

        const result = await service.rejectChangeRequest(30, 2, 'luongnt2', '');

        expect(result.reviewNotes).toBe('Không có ghi chú');
      });

      it('should refuse to reject a request that is not Pending', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue({
          ...pendingRequest(),
          status: 'Rejected',
        });

        const error = await service
          .rejectChangeRequest(30, 2, 'luongnt2', 'Trùng yêu cầu')
          .catch((e) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Change Request is already Rejected');
        expect(mockChangeRequestRepo.save).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when the request does not exist', async () => {
        mockChangeRequestRepo.findOne.mockResolvedValue(null);

        await expect(
          service.rejectChangeRequest(999, 2, 'luongnt2', 'Không tồn tại'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  /**
   * TC-ENG-02: Thành lập Đoàn KT & Phân công công việc.
   * Khi phân công đoàn, update() PHẢI gọi IndependenceService.checkAssignmentSafety
   * cho Trưởng đoàn và từng thành viên; nếu không an toàn thì chặn (BadRequestException)
   * và KHÔNG ghi gì xuống DB, trừ khi có cờ bỏ qua (allowWarning / bypassIndependenceCheck /
   * isExpectedInfo) - khi đó lưu kèm cảnh báo independenceWarning.
   * Động cơ kiểm tra độc lập đã được test riêng; ở đây kiểm chứng phần "dây nối" trong update().
   */
  describe('Independence Auto-Block khi phân công đoàn (TC-ENG-02)', () => {
    const HANOI = 'Chi nhánh Hà Nội';
    const LEAD_ID = 5;
    const LEAD_NAME = 'Ninh Xuân Điệp';
    const BLOCK_PREFIX = '[Chặn phân công - Xung đột độc lập]';
    const COOLING_OFF_REASON =
      'Bắt buộc cách ly đơn vị cũ (Cooling-off 12 tháng) theo IIA Standard 2.2: KTV từng công tác tại Chi nhánh Hà Nội. Ngày được phép kiểm toán lại: 2027-05-31';
    const MEMBER_REASON =
      'Phát hiện xung đột lợi ích đã khai báo trong năm: Có người thân tại Chi nhánh Hà Nội.';

    const leadAssignmentDto = (extra: Record<string, any> = {}) => ({
      leadAuditorId: LEAD_ID,
      leadAuditor: LEAD_NAME,
      auditedDepartment: HANOI,
      status: 'Fieldwork',
      ...extra,
    });

    const twoMembers = () => [
      { userId: 7, fullName: 'Nguyễn Văn A', role: 'Thành viên' },
      { userId: 8, fullName: 'Trần Thị B', role: 'Thành viên' },
    ];

    const mockPersistedEngagement = (extra: Record<string, any> = {}) =>
      mockRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'CTKT Tín dụng CN Hà Nội',
        ...extra,
      });

    it('should throw BadRequestException with the [Chặn phân công] prefix and persist NOTHING when the lead auditor is unsafe', async () => {
      independenceMock.checkAssignmentSafety.mockResolvedValue({
        safe: false,
        reason: COOLING_OFF_REASON,
      });

      const error = await service
        .update(1, leadAssignmentDto())
        .catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(
        `${BLOCK_PREFIX} Trưởng đoàn: ${COOLING_OFF_REASON}`,
      );
      expect(error.message).toContain(BLOCK_PREFIX);
      expect(error.message).toContain(COOLING_OFF_REASON);
      // Đúng một lệnh gọi: Trưởng đoàn, với userId + họ tên + tên đơn vị được kiểm toán
      expect(independenceMock.checkAssignmentSafety).toHaveBeenCalledTimes(1);
      expect(independenceMock.checkAssignmentSafety).toHaveBeenCalledWith(
        LEAD_ID,
        LEAD_NAME,
        HANOI,
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(mockScheduleRepo.delete).not.toHaveBeenCalled();
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });

    it('should persist the assignment with independenceWarning when allowWarning is true', async () => {
      independenceMock.checkAssignmentSafety.mockResolvedValue({
        safe: false,
        reason: COOLING_OFF_REASON,
      });
      mockPersistedEngagement();

      const result = await service.update(
        1,
        leadAssignmentDto({ allowWarning: true }),
      );

      expect(mockRepo.update).toHaveBeenCalledTimes(1);
      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        leadAuditorId: LEAD_ID,
        status: 'Fieldwork',
        legacyAuditedDepartment: HANOI,
        legacyLeadAuditor: LEAD_NAME,
        independenceWarning: COOLING_OFF_REASON,
      });
      // Cờ điều khiển không được lưu xuống DB
      const payload = mockRepo.update.mock.calls[0][1];
      expect(payload).not.toHaveProperty('allowWarning');
      expect(payload).not.toHaveProperty('bypassIndependenceCheck');
      expect(result).toEqual(
        expect.objectContaining({ id: 1, name: 'CTKT Tín dụng CN Hà Nội' }),
      );
    });

    it('should persist with independenceWarning when bypassIndependenceCheck is true and strip the flag', async () => {
      independenceMock.checkAssignmentSafety.mockResolvedValue({
        safe: false,
        reason: COOLING_OFF_REASON,
      });
      mockPersistedEngagement();

      await service.update(
        1,
        leadAssignmentDto({ bypassIndependenceCheck: true }),
      );

      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        leadAuditorId: LEAD_ID,
        status: 'Fieldwork',
        legacyAuditedDepartment: HANOI,
        legacyLeadAuditor: LEAD_NAME,
        independenceWarning: COOLING_OFF_REASON,
      });
    });

    it('should attach independenceWarning and keep isExpectedInfo in the payload', async () => {
      independenceMock.checkAssignmentSafety.mockResolvedValue({
        safe: false,
        reason: COOLING_OFF_REASON,
      });
      mockPersistedEngagement();

      await service.update(1, leadAssignmentDto({ isExpectedInfo: true }));

      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        leadAuditorId: LEAD_ID,
        status: 'Fieldwork',
        legacyAuditedDepartment: HANOI,
        legacyLeadAuditor: LEAD_NAME,
        isExpectedInfo: true,
        independenceWarning: COOLING_OFF_REASON,
      });
    });

    it('should name the SECOND (unsafe) team member in the block message and persist nothing', async () => {
      independenceMock.checkAssignmentSafety.mockImplementation(
        async (userId: number) =>
          userId === 8 ? { safe: false, reason: MEMBER_REASON } : { safe: true },
      );

      const error = await service
        .update(1, leadAssignmentDto({ teamMembers: twoMembers() }))
        .catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(`${BLOCK_PREFIX} Trần Thị B: ${MEMBER_REASON}`);
      expect(independenceMock.checkAssignmentSafety).toHaveBeenCalledTimes(3);
      expect(independenceMock.checkAssignmentSafety).toHaveBeenNthCalledWith(
        1,
        LEAD_ID,
        LEAD_NAME,
        HANOI,
      );
      expect(independenceMock.checkAssignmentSafety).toHaveBeenNthCalledWith(
        2,
        7,
        'Nguyễn Văn A',
        HANOI,
      );
      expect(independenceMock.checkAssignmentSafety).toHaveBeenNthCalledWith(
        3,
        8,
        'Trần Thị B',
        HANOI,
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should attach independenceWarning ONLY to the unsafe team member when warnings are allowed', async () => {
      independenceMock.checkAssignmentSafety.mockImplementation(
        async (userId: number) =>
          userId === 8 ? { safe: false, reason: MEMBER_REASON } : { safe: true },
      );
      mockPersistedEngagement();

      await service.update(
        1,
        leadAssignmentDto({ allowWarning: true, teamMembers: twoMembers() }),
      );

      expect(mockRepo.update).toHaveBeenCalledTimes(1);
      const payload = mockRepo.update.mock.calls[0][1];
      expect(payload.teamMembers).toEqual([
        { userId: 7, fullName: 'Nguyễn Văn A', role: 'Thành viên' },
        {
          userId: 8,
          fullName: 'Trần Thị B',
          role: 'Thành viên',
          independenceWarning: MEMBER_REASON,
        },
      ]);
      // Trưởng đoàn an toàn nên KHÔNG có cảnh báo cấp cuộc kiểm toán
      expect(payload).not.toHaveProperty('independenceWarning');
      expect(payload).not.toHaveProperty('allowWarning');
    });

    it('should persist the DTO untouched when every independence check is safe', async () => {
      mockPersistedEngagement();

      await service.update(1, leadAssignmentDto({ teamMembers: twoMembers() }));

      expect(independenceMock.checkAssignmentSafety).toHaveBeenCalledTimes(3);
      expect(independenceMock.checkAssignmentSafety).toHaveBeenCalledWith(
        LEAD_ID,
        LEAD_NAME,
        HANOI,
      );
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        leadAuditorId: LEAD_ID,
        status: 'Fieldwork',
        legacyAuditedDepartment: HANOI,
        legacyLeadAuditor: LEAD_NAME,
        teamMembers: twoMembers(),
      });
      const payload = mockRepo.update.mock.calls[0][1];
      expect(payload).not.toHaveProperty('independenceWarning');
      expect(payload.teamMembers[0]).not.toHaveProperty('independenceWarning');
      expect(payload.teamMembers[1]).not.toHaveProperty('independenceWarning');
    });

    it('should strip allowWarning and bypassIndependenceCheck from the persisted payload even when all checks are safe', async () => {
      mockPersistedEngagement();

      await service.update(
        1,
        leadAssignmentDto({
          allowWarning: true,
          bypassIndependenceCheck: true,
        }),
      );

      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        leadAuditorId: LEAD_ID,
        status: 'Fieldwork',
        legacyAuditedDepartment: HANOI,
        legacyLeadAuditor: LEAD_NAME,
      });
      const payload = mockRepo.update.mock.calls[0][1];
      expect(Object.keys(payload).sort()).toEqual([
        'leadAuditorId',
        'legacyAuditedDepartment',
        'legacyLeadAuditor',
        'status',
      ]);
    });

    it('should resolve the audited department from the stored engagement when the DTO omits it', async () => {
      mockPersistedEngagement({ legacyAuditedDepartment: HANOI });

      await service.update(1, {
        leadAuditorId: LEAD_ID,
        leadAuditor: LEAD_NAME,
        status: 'Fieldwork',
      });

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(independenceMock.checkAssignmentSafety).toHaveBeenCalledWith(
        LEAD_ID,
        LEAD_NAME,
        HANOI,
      );
      // Không ghi đè legacyAuditedDepartment khi DTO không truyền đơn vị
      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        leadAuditorId: LEAD_ID,
        status: 'Fieldwork',
        legacyLeadAuditor: LEAD_NAME,
      });
    });

    it('should skip the independence engine entirely when no audited department is known', async () => {
      mockPersistedEngagement();

      await service.update(1, {
        leadAuditorId: LEAD_ID,
        status: 'Fieldwork',
      });

      expect(independenceMock.checkAssignmentSafety).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        leadAuditorId: LEAD_ID,
        status: 'Fieldwork',
      });
    });

    it('should delete old schedules and create lead + member schedules after a successful update', async () => {
      mockPersistedEngagement({
        startDate: '2026-04-01',
        endDate: '2026-04-28',
        leadAuditorId: LEAD_ID,
        legacyLeadAuditor: LEAD_NAME,
        ownerTeam: 'P.KTDN',
        branchName: HANOI,
        teamMembers: [
          { userId: 7, fullName: 'Nguyễn Văn A', role: 'Thành viên' },
          { userId: 8, fullName: 'Trần Thị B', role: 'Dự phòng' },
        ],
      });

      await service.update(1, leadAssignmentDto());

      expect(mockScheduleRepo.delete).toHaveBeenCalledWith({ engagementId: 1 });
      expect(mockScheduleRepo.create).toHaveBeenCalledTimes(3);
      expect(mockScheduleRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          userId: LEAD_ID,
          userName: LEAD_NAME,
          engagementId: 1,
          engagementName: 'CTKT Tín dụng CN Hà Nội',
          startDate: '2026-04-01',
          endDate: '2026-04-28',
          status: 'Confirmed',
          teamCode: 'P.KTDN',
          role: 'Trưởng đoàn kiểm toán',
          isBackup: false,
          location: HANOI,
          travelRequired: true,
          notes:
            '[Đã chốt] Trưởng đoàn kiểm toán cho cuộc KT: CTKT Tín dụng CN Hà Nội',
        }),
      );
      expect(mockScheduleRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          userId: 7,
          userName: 'Nguyễn Văn A',
          role: 'Thành viên',
          isBackup: false,
          travelRequired: true,
        }),
      );
      // 'Dự phòng' (đúng chuỗi do resource-allocation.service.ts sinh ra) => isBackup,
      // và thành viên dự phòng không tính là phải đi công tác
      expect(mockScheduleRepo.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          userId: 8,
          userName: 'Trần Thị B',
          role: 'Dự phòng',
          isBackup: true,
          travelRequired: false,
          notes: '[Đã chốt] Dự phòng cho cuộc KT: CTKT Tín dụng CN Hà Nội',
        }),
      );
      expect(mockScheduleRepo.save).toHaveBeenCalledTimes(1);
      const savedSchedules = mockScheduleRepo.save.mock.calls[0][0];
      expect(savedSchedules).toHaveLength(3);
    });

    it('should not touch schedules when the engagement has no start/end dates', async () => {
      mockPersistedEngagement({
        leadAuditorId: LEAD_ID,
        teamMembers: twoMembers(),
      });

      await service.update(1, leadAssignmentDto({ teamMembers: twoMembers() }));

      expect(mockRepo.update).toHaveBeenCalledTimes(1);
      expect(mockScheduleRepo.delete).not.toHaveBeenCalled();
      expect(mockScheduleRepo.create).not.toHaveBeenCalled();
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });
  });
});
