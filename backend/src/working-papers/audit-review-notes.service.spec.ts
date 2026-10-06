import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AuditReviewNotesService } from './audit-review-notes.service';
import { AuditReviewNote, ReviewNoteStatus } from './entities/audit-review-note.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('AuditReviewNotesService', () => {
  let service: AuditReviewNotesService;
  let repo: any;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditReviewNotesService,
        {
          provide: getRepositoryToken(AuditReviewNote),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<AuditReviewNotesService>(AuditReviewNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should generate sequence number and save review note with OPEN status', async () => {
      repo.count.mockResolvedValue(2);
      const dto = {
        engagementId: 10,
        workingPaperId: 5,
        note: 'Cần bổ sung chứng từ giải ngân khoản vay',
      };
      const user = { userId: 99, fullName: 'Trưởng đoàn Nguyễn Văn A' };

      const res = await service.create(dto, user);
      expect(res.reviewSeq).toBe('RN-03');
      expect(res.status).toBe(ReviewNoteStatus.OPEN);
      expect(res.reviewerId).toBe(99);
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('respond', () => {
    it('should update auditor response and set status to RESOLVED', async () => {
      const note = {
        id: 1,
        status: ReviewNoteStatus.OPEN,
        note: 'Yêu cầu làm rõ',
      };
      repo.findOne.mockResolvedValue(note);

      const user = { userId: 5, fullName: 'KTV Trần B' };
      const res = await service.respond(1, { response: 'Đã đính kèm phụ lục' }, user);

      expect(res.status).toBe(ReviewNoteStatus.RESOLVED);
      expect(res.auditorResponse).toBe('Đã đính kèm phụ lục');
      expect(res.auditorId).toBe(5);
    });

    it('should throw BadRequestException if note is already CLOSED', async () => {
      repo.findOne.mockResolvedValue({ id: 1, status: ReviewNoteStatus.CLOSED });
      await expect(
        service.respond(1, { response: 'Cố giải trình tiếp' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('close', () => {
    it('should set status to CLOSED and record closedBy', async () => {
      const note = {
        id: 1,
        status: ReviewNoteStatus.RESOLVED,
      };
      repo.findOne.mockResolvedValue(note);

      const user = { userId: 99 };
      const res = await service.close(1, user);

      expect(res.status).toBe(ReviewNoteStatus.CLOSED);
      expect(res.closedById).toBe(99);
      expect(res.closedAt).toBeDefined();
    });
  });

  describe('assertCanSignOff (IIA 1311 Quality Gate)', () => {
    it('should pass silently if no open notes exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await expect(service.assertCanSignOff(10, undefined)).resolves.not.toThrow();
    });

    it('should throw BadRequestException if open review notes exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { id: 1, reviewSeq: 'RN-01', status: ReviewNoteStatus.OPEN },
      ]);

      await expect(service.assertCanSignOff(10, undefined)).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // TC-WP-06 "Trưởng Đoàn Soát Xét Cấp 1 & Tạo Review Note" — additive tests.
  // The tests above are untouched; everything below pins behaviour that the
  // original spec did not cover (exact payload, notification, queries, edges).
  // ===========================================================================

  const freshQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  });

  const PERSISTED_CREATE_KEYS = [
    'engagementId',
    'note',
    'reviewSeq',
    'reviewerId',
    'reviewerName',
    'status',
    'workingPaperId',
    'workstreamId',
  ];

  describe('create() — exact persisted payload (TC-WP-06)', () => {
    const fullDto = {
      engagementId: 10,
      workingPaperId: 5,
      workstreamId: 7,
      note: 'Cần bổ sung chứng từ giải ngân khoản vay',
    };
    const reviewer = { userId: 99, fullName: 'Trưởng đoàn Nguyễn Văn A' };

    it('persists the exact entity payload (ids, content, seq, reviewer, OPEN status) without extra keys', async () => {
      repo.count.mockResolvedValue(4);

      const res = await service.create(fullDto, reviewer);

      const expectedPayload = {
        engagementId: 10,
        workingPaperId: 5,
        workstreamId: 7,
        reviewSeq: 'RN-05',
        note: 'Cần bổ sung chứng từ giải ngân khoản vay',
        reviewerId: 99,
        reviewerName: 'Trưởng đoàn Nguyễn Văn A',
        status: ReviewNoteStatus.OPEN,
      };

      expect(repo.create).toHaveBeenCalledTimes(1);
      // toHaveBeenCalledWith is strict: any extra persisted key would fail here.
      expect(repo.create).toHaveBeenCalledWith(expectedPayload);
      expect(repo.count).toHaveBeenCalledWith({ where: { engagementId: 10 } });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledWith(expectedPayload);
      expect(res).toEqual({ id: 1, ...expectedPayload });
      expect(res.status).toBe(ReviewNoteStatus.OPEN);
    });

    it('persists EXACTLY this key set — there is NO positional/anchor data at all (GAP: "ghim vào đúng vị trí văn bản")', async () => {
      repo.count.mockResolvedValue(2);

      await service.create(fullDto, reviewer);

      const payload = repo.create.mock.calls[0][0];
      expect(Object.keys(payload).sort()).toEqual(PERSISTED_CREATE_KEYS);

      for (const key of [
        'page',
        'pageNumber',
        'pageIndex',
        'blockId',
        'blockIndex',
        'quote',
        'anchor',
        'position',
        'coordinates',
        'x',
        'y',
        'selectionStart',
        'selectionEnd',
        'lineNumber',
      ]) {
        expect(payload).not.toHaveProperty(key);
      }
    });

    it('silently DROPS positional/anchor fields sent by the caller (entity has no such column)', async () => {
      const dtoWithAnchor = {
        engagementId: 11,
        workingPaperId: 3,
        note: 'Ghim vào đoạn 4, trang 12',
        pageNumber: 12,
        blockId: 'blk-9',
        quote: 'trích đoạn bị soát xét',
        anchor: '{"x":1,"y":2}',
      } as any;

      await service.create(dtoWithAnchor, reviewer);

      const payload = repo.create.mock.calls[0][0];
      expect(Object.keys(payload).sort()).toEqual(PERSISTED_CREATE_KEYS);
      expect(payload).not.toHaveProperty('pageNumber');
      expect(payload).not.toHaveProperty('blockId');
      expect(payload).not.toHaveProperty('quote');
      expect(payload).not.toHaveProperty('anchor');
    });

    it('does not set any Date/timestamp field in create() (createdAt/updatedAt are TypeORM columns)', async () => {
      repo.count.mockResolvedValue(0);

      await service.create(fullDto, reviewer);

      const payload = repo.create.mock.calls[0][0];
      expect(payload).not.toHaveProperty('createdAt');
      expect(payload).not.toHaveProperty('updatedAt');
      expect(payload).not.toHaveProperty('responseAt');
      expect(payload).not.toHaveProperty('closedAt');
      expect(Object.values(payload).some((v) => v instanceof Date)).toBe(false);
    });

    it('keeps a caller-supplied reviewSeq and does NOT hit the counter', async () => {
      const res = await service.create(
        { engagementId: 10, workingPaperId: 5, note: 'Ghi chú', reviewSeq: 'RN-42' },
        reviewer,
      );

      expect(repo.count).not.toHaveBeenCalled();
      expect(res.reviewSeq).toBe('RN-42');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reviewSeq: 'RN-42', status: ReviewNoteStatus.OPEN }),
      );
    });

    it('derives the counter scope from engagementId and zero-pads to 2 digits', async () => {
      repo.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(9)
        .mockResolvedValueOnce(99);

      const first = await service.create({ engagementId: 1, note: 'a' }, reviewer);
      const tenth = await service.create({ engagementId: 1, note: 'b' }, reviewer);
      const hundredth = await service.create({ engagementId: 1, note: 'c' }, reviewer);

      expect([first.reviewSeq, tenth.reviewSeq, hundredth.reviewSeq]).toEqual([
        'RN-01',
        'RN-10',
        'RN-100',
      ]);
      expect(repo.count).toHaveBeenNthCalledWith(1, { where: { engagementId: 1 } });
      expect(repo.count).toHaveBeenNthCalledWith(3, { where: { engagementId: 1 } });
    });

    it('prefers user.id over user.userId for reviewerId', async () => {
      await service.create({ engagementId: 10, note: 'n' }, {
        id: 7,
        userId: 99,
        fullName: 'Trưởng đoàn A',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reviewerId: 7, reviewerName: 'Trưởng đoàn A' }),
      );
    });

    it('falls back to userId and username, and to "Người soát xét" when no user is supplied', async () => {
      await service.create({ engagementId: 10, note: 'n' }, {
        userId: 5,
        username: 'ktv01',
      });
      expect(repo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ reviewerId: 5, reviewerName: 'ktv01' }),
      );

      await service.create({ engagementId: 10, note: 'n' });
      expect(repo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ reviewerId: undefined, reviewerName: 'Người soát xét' }),
      );
    });
  });

  describe('create() — auditor notification (TC-WP-06 expectation: KTV được thông báo)', () => {
    it('GAP: sends NO notification on create — NotificationsService.create is never called', async () => {
      const notifications = { create: jest.fn().mockResolvedValue({ id: 1 }) };
      const localRepo = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 1, ...e })),
        count: jest.fn().mockResolvedValue(0),
        findOne: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          AuditReviewNotesService,
          { provide: getRepositoryToken(AuditReviewNote), useValue: localRepo },
          { provide: NotificationsService, useValue: notifications },
        ],
      }).compile();

      const localService = moduleRef.get<AuditReviewNotesService>(AuditReviewNotesService);
      await localService.create(
        { engagementId: 10, workingPaperId: 5, note: 'Cần bổ sung chứng từ' },
        { userId: 99, fullName: 'Trưởng đoàn Nguyễn Văn A' },
      );

      expect(localRepo.save).toHaveBeenCalledTimes(1);
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('GAP: AuditReviewNotesService has exactly ONE constructor dependency (the repository) — there is no notification wiring to call', () => {
      // If a NotificationsService were injected, this count would become 2 and
      // this test (and the absence test above) would flip.
      expect(AuditReviewNotesService.length).toBe(1);
    });
  });

  describe('findOne()', () => {
    it('loads the note with reviewer/auditor/closedBy relations', async () => {
      const note = { id: 3, reviewSeq: 'RN-01' };
      repo.findOne.mockResolvedValue(note);

      const res = await service.findOne(3);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: ['reviewer', 'auditor', 'closedBy'],
      });
      expect(res).toBe(note);
    });

    it('throws NotFoundException with the exact Vietnamese message for a missing id', async () => {
      repo.findOne.mockResolvedValue(null);

      const err = await service.findOne(12).catch((e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.message).toBe('Không tìm thấy điểm soát xét #12');
    });
  });

  describe('findAll() — query contract', () => {
    it('joins reviewer/auditor/closedBy, orders by createdAt ASC and applies all four filters', async () => {
      const qb = freshQueryBuilder();
      qb.getMany.mockResolvedValue([{ id: 1 }]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findAll({
        engagementId: 10,
        workingPaperId: 5,
        workstreamId: 3,
        status: 'OPEN',
      });

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('rn');
      expect(qb.leftJoinAndSelect.mock.calls).toEqual([
        ['rn.reviewer', 'reviewer'],
        ['rn.auditor', 'auditor'],
        ['rn.closedBy', 'closedBy'],
      ]);
      expect(qb.orderBy).toHaveBeenCalledWith('rn.createdAt', 'ASC');
      expect(qb.andWhere.mock.calls).toEqual([
        ['rn.engagementId = :engagementId', { engagementId: 10 }],
        ['rn.workingPaperId = :workingPaperId', { workingPaperId: 5 }],
        ['rn.workstreamId = :workstreamId', { workstreamId: 3 }],
        ['rn.status = :status', { status: 'OPEN' }],
      ]);
      expect(qb.where).not.toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalledTimes(1);
      expect(res).toEqual([{ id: 1 }]);
    });

    it('treats status=ALL as "no status filter"', async () => {
      const qb = freshQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: 'ALL' });

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });

    it('applies no filter at all for an empty query (filters by workingPaperId alone when asked)', async () => {
      const qb = freshQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});
      expect(qb.andWhere).not.toHaveBeenCalled();

      await service.findAll({ workingPaperId: 5 });
      expect(qb.andWhere.mock.calls).toEqual([
        ['rn.workingPaperId = :workingPaperId', { workingPaperId: 5 }],
      ]);
    });
  });

  describe('respond() — edge cases', () => {
    it('throws NotFoundException and never saves when the note does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const err = await service.respond(999, { response: 'x' }, { userId: 5 }).catch((e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.message).toBe('Không tìm thấy điểm soát xét #999');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws the exact BadRequestException message on a CLOSED note and does not save', async () => {
      repo.findOne.mockResolvedValue({ id: 1, status: ReviewNoteStatus.CLOSED });

      const err = await service
        .respond(1, { response: 'Cố giải trình tiếp' }, { userId: 5 })
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe('Điểm soát xét đã được đóng, không thể giải trình thêm.');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('persists the exact response payload (response, auditorId, auditorName, fresh responseAt, RESOLVED)', async () => {
      const note = { id: 1, status: ReviewNoteStatus.OPEN, reviewSeq: 'RN-01' };
      repo.findOne.mockResolvedValue(note);
      const before = Date.now();

      const res = await service.respond(
        1,
        { response: 'Đã đính kèm phụ lục' },
        { userId: 5, fullName: 'KTV Trần B' },
      );

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['reviewer', 'auditor', 'closedBy'],
      });
      expect(note.auditorResponse).toBe('Đã đính kèm phụ lục');
      expect(note.auditorId).toBe(5);
      expect(note.auditorName).toBe('KTV Trần B');
      expect(note.responseAt).toBeInstanceOf(Date);
      expect(note.responseAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(note.status).toBe(ReviewNoteStatus.RESOLVED);
      expect(note).not.toHaveProperty('closedAt');
      expect(repo.save).toHaveBeenCalledWith(note);
      expect(res.status).toBe(ReviewNoteStatus.RESOLVED);
      expect(res.responseAt).toBeInstanceOf(Date);
    });

    it('allows responding TWICE (only CLOSED blocks) and the second response overwrites the first', async () => {
      const note = { id: 1, status: ReviewNoteStatus.OPEN, reviewSeq: 'RN-01' };
      repo.findOne.mockResolvedValue(note);

      const first = await service.respond(1, { response: 'Lần 1' }, { userId: 5, fullName: 'KTV A' });
      const second = await service.respond(1, { response: 'Lần 2' }, { userId: 6, fullName: 'KTV B' });

      expect(first.auditorResponse).toBe('Lần 1');
      expect(first.auditorId).toBe(5);
      expect(second.auditorResponse).toBe('Lần 2');
      expect(second.auditorId).toBe(6);
      expect(second.auditorName).toBe('KTV B');
      expect(second.status).toBe(ReviewNoteStatus.RESOLVED);
      expect(repo.save).toHaveBeenCalledTimes(2);
    });

    it('falls back to auditorName "Kiểm toán viên" and null auditorId when no user is supplied', async () => {
      const note = { id: 2, status: ReviewNoteStatus.OPEN };
      repo.findOne.mockResolvedValue(note);

      const res = await service.respond(2, { response: 'Đã giải trình' });

      expect(res.auditorId).toBeNull();
      expect(res.auditorName).toBe('Kiểm toán viên');
      expect(res.status).toBe(ReviewNoteStatus.RESOLVED);
    });
  });

  describe('close() — edge cases', () => {
    it('REFUSES to close an OPEN note that has no auditor response (IIA 1311 gate kept meaningful)', async () => {
      // BUG 3 (đã sửa): trước đây close() đóng thẳng một note OPEN → xoá cổng
      // assertCanSignOff trước khi KTV kịp giải trình.
      const note = { id: 1, status: ReviewNoteStatus.OPEN };
      repo.findOne.mockResolvedValue(note);

      const err = await service.close(1, { userId: 99 }).catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Không thể đóng điểm soát xét đang ở trạng thái MỞ (OPEN) khi KTV chưa ghi nhận giải trình. Vui lòng yêu cầu KTV trả lời/giải trình (respond) điểm soát xét trước khi Người soát xét xác nhận ĐÓNG theo Chuẩn mực IIA 1311.',
      );
      expect(note.status).toBe(ReviewNoteStatus.OPEN);
      expect(note).not.toHaveProperty('closedAt');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('REFUSES to close an OPEN note whose auditor response is blank/whitespace', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        status: ReviewNoteStatus.OPEN,
        auditorResponse: '   ',
      });

      const err = await service.close(1, { userId: 99 }).catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('chưa ghi nhận giải trình');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('allows closing after the auditor has responded (OPEN note carrying an auditorResponse closes as before)', async () => {
      const note = {
        id: 1,
        status: ReviewNoteStatus.OPEN,
        auditorResponse: 'Đã bổ sung chứng từ giải ngân',
      };
      repo.findOne.mockResolvedValue(note);

      const res = await service.close(1, { userId: 99 });

      expect(res.status).toBe(ReviewNoteStatus.CLOSED);
      expect(res.closedById).toBe(99);
      expect(res.closedAt).toBeDefined();
      expect(note.auditorResponse).toBe('Đã bổ sung chứng từ giải ngân');
    });

    it('closes a RESOLVED note as before (respond-then-close flow)', async () => {
      const note = {
        id: 1,
        status: ReviewNoteStatus.RESOLVED,
        auditorResponse: 'Đã bổ sung phụ lục',
      };
      repo.findOne.mockResolvedValue(note);

      const res = await service.close(1, { userId: 99 });

      expect(res.status).toBe(ReviewNoteStatus.CLOSED);
      expect(res.closedById).toBe(99);
      expect(res.closedAt).toBeDefined();
      expect(repo.save).toHaveBeenCalledWith(note);
    });

    it('sets a fresh closedAt and leaves the auditor response untouched', async () => {
      const note = {
        id: 1,
        status: ReviewNoteStatus.RESOLVED,
        auditorResponse: 'Đã đính kèm phụ lục',
        auditorId: 5,
      };
      repo.findOne.mockResolvedValue(note);
      const before = Date.now();

      await service.close(1, { userId: 99 });

      expect(note.closedAt).toBeInstanceOf(Date);
      expect(note.closedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(note.auditorResponse).toBe('Đã đính kèm phụ lục');
      expect(note.auditorId).toBe(5);
    });

    it('throws NotFoundException and never saves when the note does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const err = await service.close(77, { userId: 99 }).catch((e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.message).toBe('Không tìm thấy điểm soát xét #77');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('stores null closedById when no user is supplied', async () => {
      const note = { id: 1, status: ReviewNoteStatus.RESOLVED };
      repo.findOne.mockResolvedValue(note);

      const res = await service.close(1);

      expect(res.closedById).toBeNull();
      expect(res.status).toBe(ReviewNoteStatus.CLOSED);
    });
  });

  describe('assertCanSignOff (IIA 1311 Quality Gate) — message and query contract', () => {
    it('throws with the exact full message, listing reviewSeq and falling back to #id', async () => {
      const qb = freshQueryBuilder();
      qb.getMany.mockResolvedValue([
        { id: 1, reviewSeq: 'RN-01' },
        { id: 7, reviewSeq: null },
        { id: 8 },
      ]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const err = await service.assertCanSignOff(10, undefined).catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Không thể phê duyệt (Sign-off) vì còn 3 điểm soát xét chưa được đóng: [RN-01, #7, #8]. Theo Chuẩn mực IIA 1311 (MB-10), toàn bộ điểm soát xét phải được Người soát xét xác nhận ĐÓNG (CLOSED) trước khi hoàn tất hồ sơ.',
      );
    });

    it('blocks sign-off on RESOLVED notes too (the query excludes only CLOSED)', async () => {
      const qb = freshQueryBuilder();
      qb.getMany.mockResolvedValue([
        { id: 2, reviewSeq: 'RN-02', status: ReviewNoteStatus.RESOLVED },
      ]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const err = await service.assertCanSignOff(10, undefined).catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(
        'Không thể phê duyệt (Sign-off) vì còn 1 điểm soát xét chưa được đóng: [RN-02]. Theo Chuẩn mực IIA 1311 (MB-10), toàn bộ điểm soát xét phải được Người soát xét xác nhận ĐÓNG (CLOSED) trước khi hoàn tất hồ sơ.',
      );
      expect(qb.where).toHaveBeenCalledWith('rn.status != :closedStatus', {
        closedStatus: ReviewNoteStatus.CLOSED,
      });
    });

    it('passes the exact where/andWhere contract for working paper + workstream scopes', async () => {
      const qb = freshQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.assertCanSignOff(10, 4);

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('rn');
      expect(qb.where).toHaveBeenCalledWith('rn.status != :closedStatus', {
        closedStatus: ReviewNoteStatus.CLOSED,
      });
      expect(qb.andWhere.mock.calls).toEqual([
        ['rn.workingPaperId = :wpId', { wpId: 10 }],
        ['rn.workstreamId = :workstreamId', { workstreamId: 4 }],
      ]);
      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });

    it('scopes by workstreamId alone when no working paper is given', async () => {
      const qb = freshQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.assertCanSignOff(undefined, 4);

      expect(qb.andWhere.mock.calls).toEqual([
        ['rn.workstreamId = :workstreamId', { workstreamId: 4 }],
      ]);
    });

    it('returns immediately without querying when neither wpId nor workstreamId is given', async () => {
      await expect(service.assertCanSignOff(undefined, undefined)).resolves.toBeUndefined();
      await expect(service.assertCanSignOff()).resolves.toBeUndefined();

      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
