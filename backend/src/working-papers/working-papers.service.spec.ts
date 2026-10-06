import { Test, TestingModule } from '@nestjs/testing';
import { WorkingPapersService } from './working-papers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkingPaper } from './entities/working-paper.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { DataSource } from 'typeorm';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QualityReviewsService } from '../quality-reviews/quality-reviews.service';
import { AuditMinutesService } from '../audit-findings/audit-minutes.service';
import { AuditReviewNotesService } from './audit-review-notes.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateWorkingPaperDto } from './dto/create-working-paper.dto';

describe('WorkingPapersService', () => {
  let service: WorkingPapersService;

  const mockWorkingPaperRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockWorkstreamRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockAuditTrailService = {
    log: jest.fn().mockResolvedValue(true),
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue(true),
  };

  const mockQualityReviewsService = {
    findByWorkingPaper: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockAuditMinutesService = {
    collateFromWorkingPapers: jest.fn().mockResolvedValue([]),
  };

  // IIA 1311 Quality Gate: service chỉ gọi assertCanSignOff (pass = không còn review note mở)
  const mockAuditReviewNotesService = {
    assertCanSignOff: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingPapersService,
        {
          provide: getRepositoryToken(WorkingPaper),
          useValue: mockWorkingPaperRepo,
        },
        {
          provide: getRepositoryToken(AuditWorkstream),
          useValue: mockWorkstreamRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AuditTrailService,
          useValue: mockAuditTrailService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: QualityReviewsService,
          useValue: mockQualityReviewsService,
        },
        {
          provide: AuditMinutesService,
          useValue: mockAuditMinutesService,
        },
        {
          provide: AuditReviewNotesService,
          useValue: mockAuditReviewNotesService,
        },
      ],
    }).compile();

    service = module.get<WorkingPapersService>(WorkingPapersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a working paper and auto-assign creator information', async () => {
      const dto: any = {
        title: 'Kiểm toán quy trình cấp tín dụng thế chấp BĐS',
        type: 'Standard',
        domain: 'credit',
      };
      const user = {
        userId: 5,
        fullName: 'Auditor Le',
        username: 'le.auditor',
      };

      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: dto.title,
        status: 'Draft',
        creatorId: 5,
      });

      const result = await service.create(dto, user);

      expect(result).toBeDefined();
      expect(mockWorkingPaperRepo.create).toHaveBeenCalled();
      expect(mockWorkingPaperRepo.save).toHaveBeenCalled();
    });

    it('should inherit planName and reviewerId from engagement when provided', async () => {
      mockDataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id: 10,
          name: 'Cuộc kiểm toán Chi nhánh HCM 2026',
          leadAuditorId: 99,
        }),
      });

      const dto: any = {
        title: 'Kiểm toán mẫu tín dụng',
        engagementId: 10,
      };

      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        planName: 'Cuộc kiểm toán Chi nhánh HCM 2026',
        reviewerId: 99,
      });

      const result = await service.create(dto);
      expect(mockWorkingPaperRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          planName: 'Cuộc kiểm toán Chi nhánh HCM 2026',
          reviewerId: 99,
        }),
      );
    });

    it('should pass DTO validation when type, reviewedBy and reviewedAt are provided with whitelist/forbidNonWhitelisted', async () => {
      const payload = {
        title:
          'Giấy tờ làm việc Kiểm toán Quy trình Cấp tín dụng & TSBĐ (40 Cột Thực tế)',
        referenceCode: 'WP-CREDIT-1234',
        domain: 'credit',
        planName: 'Kế hoạch kiểm toán tín dụng',
        engagementId: 1,
        creator: 'KTV Kiểm toán',
        objectives: 'Kiểm toán toàn diện',
        procedures: 'Kiểm tra hồ sơ',
        methodology: 'Vouching',
        sampleSelection: 'Phán đoán',
        riskDescription: 'Rủi ro thẩm định',
        conclusion: 'Đã kiểm tra',
        status: 'Draft',
        type: 'WP',
        reviewedBy: 'Trưởng đoàn',
        reviewedAt: new Date().toISOString(),
      };

      const dto = plainToInstance(CreateWorkingPaperDto, payload);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errors).toHaveLength(0);
      expect(dto.type).toBe('WP');
      expect(dto.reviewedBy).toBe('Trưởng đoàn');
    });
  });

  describe('submitForReview', () => {
    it('should throw NotFoundException if working paper does not exist', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue(null);

      await expect(service.submitForReview(999, { userId: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not Draft or Rework', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Approved',
      });

      await expect(service.submitForReview(1, { userId: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block submission if sample completion gate fails (untested samples > 0)', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { wpId: 1, total: '10', tested: '8', passed: '8', failed: '0' },
      ]);
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Draft',
        creatorId: 5,
      });

      await expect(
        service.submitForReview(1, { userId: 5, role: 'Auditor' }),
      ).rejects.toThrow(/Còn 2\/10 mẫu chưa được kiểm tra/i);
    });

    it('should submit successfully, notify reviewer and initiate QAIP review', async () => {
      const mockWp: any = {
        id: 1,
        title: 'WP Kiểm toán Tín dụng',
        status: 'Draft',
        creatorId: 5,
        reviewerId: 10,
        sampleStats: { total: 10, untested: 0, tested: 10 },
        reviewHistory: [],
      };
      mockWorkingPaperRepo.findOne.mockResolvedValue(mockWp);

      const user = { userId: 5, fullName: 'Auditor Le', role: 'Auditor' };
      await service.submitForReview(1, user);

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Submitted',
        }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REVIEW_REQUEST',
          recipientId: 10,
        }),
      );
      expect(mockQualityReviewsService.create).toHaveBeenCalled();
    });
  });

  describe('requestRework', () => {
    it('should throw BadRequestException if rework reason notes are empty', async () => {
      await expect(
        service.requestRework(1, '   ', { userId: 10, role: 'LeadAuditor' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if WP status is not Submitted', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Draft',
      });

      await expect(
        service.requestRework(1, 'Bổ sung mẫu', {
          userId: 10,
          role: 'LeadAuditor',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status to Rework, record history, and notify creator', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'WP Test',
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        reviewHistory: [],
      });

      const user = {
        userId: 10,
        fullName: 'Lead Auditor',
        role: 'LeadAuditor',
      };
      await service.requestRework(1, 'Cần kiểm tra thêm 5 hợp đồng lớn', user);

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Rework',
          reviewNotes: 'Cần kiểm tra thêm 5 hợp đồng lớn',
        }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REWORK',
          recipientId: 5,
        }),
      );
    });
  });

  describe('approve (Four-Eyes Principle)', () => {
    it('should enforce Four-Eyes principle: creator cannot self-approve working paper', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 5, // Same user
      });

      const user = { userId: 5, fullName: 'Auditor Le', role: 'Auditor' };

      await expect(service.approve(1, 'Approved', user)).rejects.toThrow(
        /nguyên tắc 4 mắt/i,
      );
    });

    it('should approve successfully when reviewer is independent and samples are 100% complete', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'WP Phê duyệt',
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        sampleStats: { total: 5, untested: 0, tested: 5 },
        engagementId: 100,
        reviewHistory: [],
      });

      const approver = {
        userId: 10,
        fullName: 'Trưởng đoàn',
        role: 'LeadAuditor',
      };
      const result = await service.approve(1, 'Hồ sơ đạt yêu cầu', approver);

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Approved',
          reviewerId: 10,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-WP-02: "Biên Soạn Nội Dung Với Trình Soạn Thảo Tiptap"
  // Expected (UAT): nội dung được lưu (auto-save 30s / bấm "Lưu") → update()
  // ═══════════════════════════════════════════════════════════════════════════
  describe('update (TC-WP-02 — Biên soạn nội dung với trình soạn thảo Tiptap)', () => {
    const editorPayload: any = {
      title: 'WP-TD-01 Kiểm tra hồ sơ tín dụng KHDN lớn',
      type: 'WP',
      status: 'Draft',
      referenceCode: 'WP-TD-01',
      objectives: '<p>Mục đích kiểm toán: tuân thủ điều kiện giải ngân</p>',
      procedures: '<p>Chọn 10 hồ sơ giải ngân &gt; 5 tỷ</p>',
      conclusion: '<ul><li>Checklist tuân thủ: 8/10 hồ sơ đạt</li></ul>',
      sampleSelection: '<p>Phán đoán (Judgmental)</p>',
      attachments: [
        {
          name: 'BB_Kiem_Ke_TSBD.pdf',
          fileUrl: '/uploads/BB_Kiem_Ke_TSBD.pdf',
          uploadedBy: 'datnc3',
          uploadedAt: '2026-01-05T02:00:00.000Z',
        },
      ],
      templateData: { headers: ['CIF'], rows: [{ CIF: '001' }] },
    };

    it('should persist the editor payload verbatim (same object reference) and return the reloaded entity', async () => {
      const draftWp: any = { id: 1, status: 'Draft', title: editorPayload.title };
      const reloaded: any = { id: 1, ...editorPayload };
      mockWorkingPaperRepo.findOne
        .mockResolvedValueOnce(draftWp)
        .mockResolvedValueOnce(reloaded);

      const user = { userId: 5, fullName: 'Nguyễn Cảnh Đạt', role: 'Auditor' };
      const result = await service.update(1, editorPayload, user);

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledTimes(1);
      // update() performs NO whitelisting / renaming: the exact DTO object reaches the repository.
      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(1, editorPayload);
      expect(mockWorkingPaperRepo.update.mock.calls[0][1]).toBe(editorPayload);
      // Returned value = the WP reloaded via findOne() (line 349 + 364).
      expect(result).toBe(reloaded);
      // Plain Draft content save must NOT trigger MB04 collation (only status 'Approved' does).
      expect(
        mockAuditMinutesService.collateFromWorkingPapers,
      ).not.toHaveBeenCalled();
    });

    it("should not strip unknown payload keys such as 'content' (WorkingPaper has no 'content' column)", async () => {
      // Rich text is stored in the text columns objectives / procedures / conclusion /
      // sampleSelection (+ templateData jsonb) — the entity has no `content`/`tiptapContent`
      // column, and update() does not map or validate keys.
      const payload: any = {
        content: '<p>Nội dung Tiptap</p>',
        objectives: '<p>Mục đích</p>',
      };
      mockWorkingPaperRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: 'Draft' })
        .mockResolvedValueOnce({ id: 1 });

      await service.update(1, payload, { userId: 5, role: 'Auditor' });

      const persisted = mockWorkingPaperRepo.update.mock.calls[0][1];
      expect(Object.keys(persisted).sort()).toEqual(['content', 'objectives']);
      expect(persisted.content).toBe('<p>Nội dung Tiptap</p>');
    });

    it('should throw NotFoundException("Không tìm thấy Giấy tờ làm việc") and persist nothing when the WP does not exist', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue(null);

      const err = await service
        .update(999, { conclusion: '<p>abc</p>' } as any, { userId: 5 })
        .catch((e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.message).toBe('Không tìm thấy Giấy tờ làm việc');
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
    });

    it('should reject edits to a Locked WP with the exact message — the ONLY status-based edit lock in update()', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Locked',
      });

      const err = await service
        .update(1, { conclusion: '<p>sửa khi đã khóa</p>' } as any, {
          userId: 5,
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Giấy tờ làm việc đã bị Khóa (Locked), không thể chỉnh sửa.',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
    });

    it('should block the save when the payload flips status to Submitted while samples are untested (completion gate)', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { wpId: 1, total: '10', tested: '8', passed: '8', failed: '0' },
      ]);
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Draft',
        creatorId: 5,
      });

      const err = await service
        .update(1, { status: 'Submitted', conclusion: '<p>Đã xong</p>' } as any, {
          userId: 5,
          role: 'Auditor',
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Không thể nộp hoặc phê duyệt Giấy tờ làm việc: Ma trận mẫu kiểm tra được phân giao còn 2/10 mẫu chưa được kiểm tra đánh giá kết quả. Vui lòng hoàn thành toàn bộ các mẫu trước khi nộp!',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
    });

    it('should allow the status flip to Submitted when 100% of the assigned samples are tested', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { wpId: 1, total: '10', tested: '10', passed: '9', failed: '1' },
      ]);
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Draft',
        creatorId: 5,
      });

      await service.update(1, { status: 'Submitted' } as any, {
        userId: 5,
        role: 'Auditor',
      });

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(1, {
        status: 'Submitted',
      });
    });

    it('should BLOCK a self-approval through the generic PATCH (Four-Eyes) and persist nothing', async () => {
      // BUG 1 (đã sửa): trước đây PATCH { status: 'Approved' } do chính KTV lập thực hiện
      // vẫn ghi thẳng status Approved + tự gán reviewerId/reviewedAt (bỏ qua approve()).
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 5, // chính người lập là người soát xét
        engagementId: 100,
      });
      const user = { userId: 5, fullName: 'Nguyễn Cảnh Đạt', role: 'Auditor' };
      const dto: any = { status: 'Approved' };

      const err = await service.update(1, dto, user).catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Theo nguyên tắc 4 mắt (Four-Eyes), kiểm toán viên lập hồ sơ không được tự phê duyệt Working Paper của chính mình',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
      expect(dto.reviewerId).toBeUndefined();
      expect(dto.reviewedAt).toBeUndefined();
      expect(
        mockAuditMinutesService.collateFromWorkingPapers,
      ).not.toHaveBeenCalled();
    });

    it('should still ALLOW an authorised reviewer to approve through PATCH and trigger the MB04 collation', async () => {
      const approvedWp: any = { id: 1, status: 'Approved', engagementId: 100 };
      mockWorkingPaperRepo.findOne
        .mockResolvedValueOnce({
          id: 1,
          status: 'Submitted',
          creatorId: 5,
          reviewerId: 10,
          workstreamId: 3,
        })
        .mockResolvedValueOnce(approvedWp);
      const user = { userId: 10, fullName: 'Ninh Xuân Điệp', role: 'LeadAuditor' };
      const dto: any = { status: 'Approved' };

      await service.update(1, dto, user);

      // Cổng chất lượng IIA 1311 vẫn được chạy trên đường PATCH.
      expect(
        mockAuditReviewNotesService.assertCanSignOff,
      ).toHaveBeenCalledWith(1, 3);
      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'Approved',
          reviewerId: 10,
          reviewedAt: expect.any(Date),
        }),
      );
      expect(dto.reviewerId).toBe(10);
      expect(dto.reviewedAt).toBeInstanceOf(Date);
      expect(
        mockAuditMinutesService.collateFromWorkingPapers,
      ).toHaveBeenCalledWith(100, user);
    });

    it('should BLOCK a PATCH approval by a user who is neither reviewer, lead, workstream reviewer nor admin', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
      });

      const err = await service
        .update(1, { status: 'Approved' } as any, {
          userId: 99,
          fullName: 'Người khác',
          role: 'Auditor',
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Chỉ Trưởng đoàn hoặc Người soát xét mới có quyền phê duyệt Giấy tờ làm việc',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
      expect(
        mockAuditMinutesService.collateFromWorkingPapers,
      ).not.toHaveBeenCalled();
    });

    it('should BLOCK a PATCH approval when the IIA 1311 review-note gate rejects sign-off', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        workstreamId: 3,
      });
      mockAuditReviewNotesService.assertCanSignOff.mockRejectedValueOnce(
        new BadRequestException('Còn 1 Review Note chưa đóng (Open)'),
      );

      const err = await service
        .update(1, { status: 'Approved' } as any, {
          userId: 10,
          role: 'LeadAuditor',
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe('Còn 1 Review Note chưa đóng (Open)');
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
    });

    it('should keep an explicitly provided reviewerId/reviewedAt on an Approved save (no overwrite)', async () => {
      const reviewedAt = new Date('2026-01-06T03:00:00.000Z');
      mockWorkingPaperRepo.findOne
        .mockResolvedValueOnce({
          id: 1,
          status: 'Submitted',
          creatorId: 5,
          reviewerId: 10,
        })
        .mockResolvedValueOnce({ id: 1, status: 'Approved' }); // no engagementId → no MB04 collation

      const dto: any = { status: 'Approved', reviewerId: 77, reviewedAt };
      await service.update(1, dto, { userId: 10, role: 'LeadAuditor' });

      const persisted = mockWorkingPaperRepo.update.mock.calls[0][1];
      expect(persisted.reviewerId).toBe(77);
      expect(persisted.reviewedAt).toBe(reviewedAt);
      expect(
        mockAuditMinutesService.collateFromWorkingPapers,
      ).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIXED — "Khóa chỉnh sửa" (TC-WP-05) & "Đóng băng" (TC-WP-08)
  // ---------------------------------------------------------------------------
  // UAT TC-WP-05 expects: "Trạng thái chuyển sang Chờ soát xét (Submitted).
  //                       Khóa chỉnh sửa đối với KTV lập."
  // UAT TC-WP-08 expects: "Trạng thái chuyển thành Đã hoàn thành & Đóng băng (Approved).
  //                       Không ai có thể chỉnh sửa nội dung nữa."
  //
  // Trước đây update() chỉ chặn `status === 'Locked'` — trạng thái không bao giờ được ghi,
  // nên WP Submitted/Approved vẫn sửa được nội dung. Nay update() chặn mọi trường NỘI DUNG
  // khi WP đang Submitted/Approved, nhưng vẫn cho phép các trường nghiệp vụ soát xét
  // (status/reviewerId/reviewedAt/reviewNotes/reviewHistory/...) để luồng duyệt – trả lại
  // hồ sơ hoạt động bình thường.
  // ═══════════════════════════════════════════════════════════════════════════
  describe('update — edit lock after submit/approve (TC-WP-05 & TC-WP-08)', () => {
    it('TC-WP-05: a Submitted WP REJECTS content edits from its own author (edit lock enforced)', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
        title: 'WP-TD-01',
      });

      // Chính KTV lập (creatorId 5) sửa nội dung khi WP đang ở trạng thái Submitted.
      const err = await service
        .update(1, { conclusion: '<p>Sửa sau khi đã nộp</p>' } as any, {
          userId: 5,
          fullName: 'Nguyễn Cảnh Đạt',
          role: 'Auditor',
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Giấy tờ làm việc đang ở trạng thái Submitted nên không thể chỉnh sửa nội dung (conclusion). Vui lòng yêu cầu Trưởng đoàn trả lại hồ sơ (Rework) nếu cần thay đổi.',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
    });

    it('TC-WP-08: an Approved WP ("đóng băng") REJECTS content edits from any actor', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Approved',
        creatorId: 5,
        reviewerId: 10,
      });

      // Trưởng đoàn đã duyệt (reviewerId 10) cũng không thể sửa nội dung sau khi đóng băng.
      const err = await service
        .update(
          1,
          { conclusion: '<p>Nội dung bị sửa sau khi đóng băng</p>' } as any,
          { userId: 10, fullName: 'Ninh Xuân Điệp', role: 'LeadAuditor' },
        )
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Giấy tờ làm việc đang ở trạng thái Approved nên không thể chỉnh sửa nội dung (conclusion). Vui lòng yêu cầu Trưởng đoàn trả lại hồ sơ (Rework) nếu cần thay đổi.',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
    });

    it('TC-WP-05: on a Submitted WP only the review-metadata fields pass the lock (e.g. PendingReview), content is still refused', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
      });

      // QAIP cấp 1 gửi PATCH chỉ có trường nghiệp vụ soát xét → KHÔNG bị khóa nội dung chặn.
      await service.update(1, { status: 'PendingReview' } as any, {
        userId: 5,
        role: 'Auditor',
      });
      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(1, {
        status: 'PendingReview',
      });

      // Nhưng nếu payload lẫn bất kỳ trường nội dung nào thì vẫn bị chặn.
      const err = await service
        .update(
          1,
          { status: 'PendingReview', conclusion: '<p>lén sửa</p>' } as any,
          { userId: 5, role: 'Auditor' },
        )
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('Submitted');
      expect(mockWorkingPaperRepo.update).toHaveBeenCalledTimes(1); // chỉ lần gọi hợp lệ ở trên
    });

    it('keeps the offline Excel sync working on a locked WP through the explicit internal option only', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Approved',
        creatorId: 5,
        reviewerId: 10,
      });

      // Cùng payload nội dung: PATCH thường → chặn...
      const blocked = await service
        .update(1, { conclusion: '<p>đồng bộ ngoại tuyến</p>' } as any, {
          userId: 10,
          role: 'LeadAuditor',
        })
        .catch((e) => e);
      expect(blocked).toBeInstanceOf(BadRequestException);
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();

      // ...còn luồng đồng bộ nội bộ (importSyncOffline) → cho phép tường minh.
      await service.update(
        1,
        { conclusion: '<p>đồng bộ ngoại tuyến</p>', status: 'Draft' } as any,
        { userId: 10, role: 'LeadAuditor' },
        { allowContentEditWhileLocked: true },
      );
      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          conclusion: '<p>đồng bộ ngoại tuyến</p>',
          status: 'Draft',
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-WP-08: "Lãnh Đạo Phòng Soát Xét Cấp 2" → approve() freeze payload + gates
  // (mở rộng quanh 2 test Four-Eyes đã có, không lặp lại)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('approve — freeze payload, history & gate order (TC-WP-08)', () => {
    it('should write the full freeze payload, append the APPROVE iteration, notify the author and log the audit trail', async () => {
      const priorEntry = {
        iteration: 1,
        action: 'SUBMIT',
        actorId: 5,
        actorName: 'Nguyễn Cảnh Đạt',
        role: 'Auditor',
        timestamp: '2026-01-05T02:00:00.000Z',
        notes: 'Nộp soát xét',
      };
      const wp: any = {
        id: 7,
        title: 'WP-TD-01',
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        workstreamId: 3,
        engagementId: 100,
        reviewHistory: [priorEntry],
      };
      mockWorkingPaperRepo.findOne.mockResolvedValue(wp);

      const approver = {
        userId: 10,
        fullName: 'Ninh Xuân Điệp',
        username: 'diepnx',
        role: 'LeadAuditor',
      };
      await service.approve(
        7,
        '  Thống nhất chất lượng giấy tờ làm việc.  ',
        approver,
      );

      // IIA 1311 quality gate is evaluated with (id, workstreamId).
      expect(
        mockAuditReviewNotesService.assertCanSignOff,
      ).toHaveBeenCalledWith(7, 3);

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          status: 'Approved',
          signoffStatus: 'APPROVED',
          reviewerId: 10,
          reviewedAt: expect.any(Date),
          reviewNotes: 'Thống nhất chất lượng giấy tờ làm việc.',
        }),
      );

      const payload = mockWorkingPaperRepo.update.mock.calls[0][1];
      expect(payload.reviewHistory).toHaveLength(2);
      expect(payload.reviewHistory[0]).toBe(priorEntry); // history preserved
      expect(payload.reviewHistory[1]).toEqual(
        expect.objectContaining({
          iteration: 2,
          action: 'APPROVE',
          actorId: 10,
          actorName: 'Ninh Xuân Điệp',
          role: 'LeadAuditor',
          notes: 'Thống nhất chất lượng giấy tờ làm việc.',
        }),
      );
      expect(new Date(payload.reviewHistory[1].timestamp).toString()).not.toBe(
        'Invalid Date',
      );

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'APPROVED',
          recipientId: 5,
          relatedEntity: 'WorkingPaper',
          relatedEntityId: 7,
        }),
      );
      expect(mockAuditTrailService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resource: 'working-papers',
          resourceId: 7,
          userId: 10,
          newValue: { status: 'Approved' },
          oldValue: { status: 'Submitted' },
        }),
      );
      expect(
        mockAuditMinutesService.collateFromWorkingPapers,
      ).toHaveBeenCalledWith(100, approver);
    });

    it('should stamp leadAuditorId/leadApprovedAt when the approver IS the engagement lead', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'WP Phê duyệt',
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        engagementId: 100,
        engagement: { id: 100, leadAuditorId: 10 },
        reviewHistory: [],
      });

      await service.approve(1, 'Duyệt', {
        userId: 10,
        fullName: 'Ninh Xuân Điệp',
        role: 'LeadAuditor',
      });

      const payload = mockWorkingPaperRepo.update.mock.calls[0][1];
      expect(payload.leadAuditorId).toBe(10);
      expect(payload.leadApprovedAt).toBeInstanceOf(Date);
    });

    it('should keep the previous leadAuditorId/leadApprovedAt when the approver is only the assigned reviewer', async () => {
      const oldLeadApprovedAt = new Date('2026-01-04T00:00:00.000Z');
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'WP Phê duyệt',
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        leadAuditorId: 42,
        leadApprovedAt: oldLeadApprovedAt,
        engagementId: 100,
        engagement: { id: 100, leadAuditorId: 77 }, // lead là người khác
        reviewHistory: [],
      });

      await service.approve(1, 'Duyệt cấp 2', {
        userId: 10,
        fullName: 'Ninh Xuân Điệp',
        role: 'Supervisor',
      });

      const payload = mockWorkingPaperRepo.update.mock.calls[0][1];
      expect(payload.reviewerId).toBe(10);
      expect(payload.leadAuditorId).toBe(42);
      expect(payload.leadApprovedAt).toBe(oldLeadApprovedAt);
    });

    it('should reject approval by a user who is neither reviewer, lead, workstream reviewer nor admin', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        title: 'WP Phê duyệt',
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        reviewHistory: [],
      });

      const err = await service
        .approve(1, 'Duyệt', {
          userId: 99,
          fullName: 'Người khác',
          role: 'Auditor',
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Chỉ Trưởng đoàn hoặc Người soát xét mới có quyền phê duyệt Giấy tờ làm việc',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
    });

    it('should block approval and persist nothing when the IIA 1311 review-note gate rejects sign-off', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
        workstreamId: 3,
        reviewHistory: [],
      });
      mockAuditReviewNotesService.assertCanSignOff.mockRejectedValueOnce(
        new BadRequestException('Còn 1 Review Note chưa đóng (Open)'),
      );

      const err = await service
        .approve(1, 'Duyệt', { userId: 10, role: 'LeadAuditor' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe('Còn 1 Review Note chưa đóng (Open)');
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should block approval while the sample matrix is incomplete, with the exact message', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { wpId: 1, total: '4', tested: '3', passed: '3', failed: '0' },
      ]);
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 1,
        status: 'Submitted',
        creatorId: 5,
        reviewerId: 10,
      });

      const err = await service
        .approve(1, 'Duyệt', { userId: 10, role: 'LeadAuditor' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Không thể phê duyệt: Ma trận mẫu còn 1/4 mẫu chưa được đánh giá.',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
      // Gate short-circuits BEFORE the IIA 1311 sign-off check.
      expect(
        mockAuditReviewNotesService.assertCanSignOff,
      ).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-WP-05: submitForReview() — bổ sung quanh test submit success đã có
  // ═══════════════════════════════════════════════════════════════════════════
  describe('submitForReview — history, permissions & QAIP branches (TC-WP-05)', () => {
    it('should append the SUBMIT iteration to the existing review history, stamp submittedAt and log the audit trail', async () => {
      const priorEntry = {
        iteration: 1,
        action: 'REWORK',
        actorId: 10,
        actorName: 'Trưởng đoàn',
        role: 'LeadAuditor',
        timestamp: '2026-01-04T00:00:00.000Z',
        notes: 'Bổ sung chứng thư thẩm định giá',
      };
      const wp: any = {
        id: 4,
        title: 'WP-TD-01',
        status: 'Rework',
        creatorId: 5,
        reviewerId: 10,
        reviewHistory: [priorEntry],
      };
      mockWorkingPaperRepo.findOne.mockResolvedValue(wp);

      await service.submitForReview(4, {
        userId: 5,
        fullName: 'Nguyễn Cảnh Đạt',
        username: 'datnc3',
        role: 'Auditor',
      });

      const payload = mockWorkingPaperRepo.update.mock.calls[0][1];
      expect(payload.status).toBe('Submitted');
      expect(payload.submittedAt).toBeInstanceOf(Date);
      expect(payload.reviewHistory).toHaveLength(2);
      expect(payload.reviewHistory[0]).toBe(priorEntry); // prior iteration preserved
      expect(payload.reviewHistory[1]).toEqual(
        expect.objectContaining({
          iteration: 2,
          action: 'SUBMIT',
          actorId: 5,
          actorName: 'Nguyễn Cảnh Đạt',
          role: 'Auditor',
          notes:
            'KTV đã hoàn thành kiểm thử và nộp hồ sơ cho Trưởng đoàn soát xét',
        }),
      );
      expect(new Date(payload.reviewHistory[1].timestamp).toString()).not.toBe(
        'Invalid Date',
      );

      expect(mockAuditTrailService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'working-papers',
          resourceId: 4,
          userId: 5,
          username: 'datnc3',
          newValue: { status: 'Submitted' },
          oldValue: { status: 'Rework' },
        }),
      );
    });

    it('should reject submission by a user who is neither creator, assigned auditor, engagement lead nor admin', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 2,
        title: 'WP-TD-01',
        status: 'Draft',
        creatorId: 5,
        reviewerId: 10,
        reviewHistory: [],
      });

      const err = await service
        .submitForReview(2, {
          userId: 99,
          fullName: 'Người khác',
          role: 'Auditor',
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Bạn không có quyền nộp duyệt Giấy tờ làm việc này',
      );
      expect(mockWorkingPaperRepo.update).not.toHaveBeenCalled();
    });

    it('should not send a REVIEW_REQUEST notification when no reviewer is assigned, but still open the QAIP review', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 3,
        title: 'WP-TD-01',
        status: 'Draft',
        creatorId: 5,
        reviewHistory: [],
      });

      await service.submitForReview(3, {
        userId: 5,
        fullName: 'Nguyễn Cảnh Đạt',
        role: 'Auditor',
      });

      expect(mockWorkingPaperRepo.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ status: 'Submitted' }),
      );
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
      expect(
        mockQualityReviewsService.findByWorkingPaper,
      ).toHaveBeenCalledWith(3);
      expect(mockQualityReviewsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workingPaperId: 3,
          workingPaperTitle: 'WP-TD-01',
          selfReviewStatus: 'Pending',
          supervisorReviewStatus: 'Pending',
          independentReviewStatus: 'Pending',
          overallStatus: 'InReview',
        }),
      );
    });

    it('should flip an existing QAIP file back to InReview instead of creating a duplicate', async () => {
      mockWorkingPaperRepo.findOne.mockResolvedValue({
        id: 5,
        title: 'WP-TD-01',
        status: 'Rework',
        creatorId: 5,
        reviewerId: 10,
        reviewHistory: [],
      });
      mockQualityReviewsService.findByWorkingPaper.mockResolvedValueOnce({
        id: 9,
      });

      await service.submitForReview(5, {
        userId: 5,
        fullName: 'Nguyễn Cảnh Đạt',
        role: 'Auditor',
      });

      expect(mockQualityReviewsService.update).toHaveBeenCalledWith(9, {
        overallStatus: 'InReview',
      });
      expect(mockQualityReviewsService.create).not.toHaveBeenCalled();
    });
  });
});
