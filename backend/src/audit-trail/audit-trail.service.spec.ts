import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { createHash } from 'crypto';
import { AuditTrailService } from './audit-trail.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLog } from './entities/audit-log.entity';
import { SecurityAlert } from './entities/security-alert.entity';
import { computeAuditLogHash } from './audit-log-integrity.util';

/**
 * Vector độc lập (không dùng lại util) cho dạng chuẩn tắc đã cam kết:
 * JSON.stringify theo ĐÚNG thứ tự khoá action, resource, resourceId, userId, username,
 * oldValue, newValue, ipAddress, userAgent; null cho trường thiếu; UTF-8; SHA-256 hex.
 */
const referenceSha256 = (canonicalObject: Record<string, unknown>): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalObject), 'utf8')
    .digest('hex');

describe('AuditTrailService', () => {
  let service: AuditTrailService;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 5 }),
  };

  const mockAuditLogRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockSecurityAlertRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditTrailService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepo,
        },
        {
          provide: getRepositoryToken(SecurityAlert),
          useValue: mockSecurityAlertRepo,
        },
      ],
    }).compile();

    service = module.get<AuditTrailService>(AuditTrailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save an audit log entry with serialized json values', async () => {
      await service.log({
        action: 'UPDATE',
        resource: 'AuditFinding',
        resourceId: 42,
        userId: 7,
        username: 'auditor1',
        oldValue: { status: 'Draft' },
        newValue: { status: 'UnderReview' },
        ipAddress: '127.0.0.1',
      });

      expect(mockAuditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resource: 'AuditFinding',
          resourceId: '42',
          userId: 7,
          username: 'auditor1',
          oldValue: JSON.stringify({ status: 'Draft' }),
          newValue: JSON.stringify({ status: 'UnderReview' }),
          ipAddress: '127.0.0.1',
        }),
      );
      expect(mockAuditLogRepo.save).toHaveBeenCalled();
    });

    it('pins the EXACT persisted payload for a semantic UPDATE, including the SHA-256 digest (TC-SYS-05: action, resource, resourceId, userId, username, ipAddress, old/new value, hash)', async () => {
      await service.log({
        action: 'UPDATE',
        resource: 'AuditFinding',
        resourceId: 42,
        userId: 7,
        username: 'auditor1',
        oldValue: { status: 'Draft', score: 10 },
        newValue: { status: 'UnderReview', score: 12 },
        ipAddress: '10.20.30.40',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      expect(mockAuditLogRepo.create).toHaveBeenCalledTimes(1);
      // toStrictEqual (not objectContaining/toEqual) so the key SET is pinned too:
      // 9 trường nghiệp vụ + `hash`; `createdAt`/`id` vẫn do TypeORM/DB sinh.
      expect(mockAuditLogRepo.create.mock.calls[0][0]).toStrictEqual({
        action: 'UPDATE',
        resource: 'AuditFinding',
        resourceId: '42',
        userId: 7,
        username: 'auditor1',
        oldValue: JSON.stringify({ status: 'Draft', score: 10 }),
        newValue: JSON.stringify({ status: 'UnderReview', score: 12 }),
        ipAddress: '10.20.30.40',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        hash: referenceSha256({
          action: 'UPDATE',
          resource: 'AuditFinding',
          resourceId: '42',
          userId: 7,
          username: 'auditor1',
          oldValue: JSON.stringify({ status: 'Draft', score: 10 }),
          newValue: JSON.stringify({ status: 'UnderReview', score: 12 }),
          ipAddress: '10.20.30.40',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        }),
      });

      // the created entity -- and only it -- is what gets persisted
      expect(mockAuditLogRepo.save).toHaveBeenCalledTimes(1);
      expect(mockAuditLogRepo.save).toHaveBeenCalledWith(
        mockAuditLogRepo.create.mock.results[0].value,
      );
    });

    it('REGRESSION (TC-SYS-05): ghi kèm mã băm SHA-256 hex 64 ký tự, tất định theo dữ liệu vào', async () => {
      const params = {
        action: 'CREATE' as const,
        resource: 'Recommendation',
        resourceId: 99,
        userId: 3,
        username: 'auditor2',
        newValue: { status: 'Open' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      };

      await service.log(params);
      await service.log(params);

      const [first, second] = mockAuditLogRepo.create.mock.calls.map(
        (call) => call[0],
      );
      expect(typeof first.hash).toBe('string');
      expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
      // cùng dữ liệu vào -> cùng mã băm (tất định, không phụ thuộc thời điểm ghi)
      expect(second.hash).toBe(first.hash);
      // và khớp với vector độc lập của dạng chuẩn tắc
      expect(first.hash).toBe(
        referenceSha256({
          action: 'CREATE',
          resource: 'Recommendation',
          resourceId: '99',
          userId: 3,
          username: 'auditor2',
          oldValue: null,
          newValue: JSON.stringify({ status: 'Open' }),
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }),
      );
    });

    it('REGRESSION: mã băm khác nhau khi nội dung khác nhau (đổi 1 trường ⇒ đổi hash)', async () => {
      await service.log({
        action: 'UPDATE',
        resource: 'AuditFinding',
        resourceId: 42,
        newValue: { status: 'Draft' },
      });
      await service.log({
        action: 'UPDATE',
        resource: 'AuditFinding',
        resourceId: 42,
        newValue: { status: 'Approved' },
      });

      const [first, second] = mockAuditLogRepo.create.mock.calls.map(
        (call) => call[0],
      );
      expect(first.hash).not.toBe(second.hash);
    });

    it('REGRESSION (double-encode): giữ NGUYÊN VĂN chuỗi JSON đã sẵn, không bọc nháy kép lần hai', async () => {
      await service.log({
        action: 'UPDATE',
        resource: 'Recommendation',
        oldValue: '{"status":"Open"}',
        newValue: '{"status":"Closed"}',
      });

      const payload = mockAuditLogRepo.create.mock.calls[0][0];
      expect(payload.oldValue).toBe('{"status":"Open"}');
      expect(payload.newValue).toBe('{"status":"Closed"}');
      expect(JSON.parse(payload.oldValue)).toEqual({ status: 'Open' });
    });

    it('REGRESSION (giá trị falsy): giữ 0 / "" / false thay vì âm thầm bỏ; null/undefined mới coi là không có', async () => {
      await service.log({
        action: 'UPDATE',
        resource: 'RiskRegister',
        oldValue: 0,
        newValue: '',
      });
      await service.log({
        action: 'UPDATE',
        resource: 'RiskRegister',
        oldValue: false,
        newValue: null,
      });
      await service.log({
        action: 'UPDATE',
        resource: 'RiskRegister',
        oldValue: undefined,
        newValue: null,
      });

      const [zeroAndEmpty, falseAndNull, absent] =
        mockAuditLogRepo.create.mock.calls.map((call) => call[0]);
      expect(zeroAndEmpty.oldValue).toBe('0');
      expect(zeroAndEmpty.newValue).toBe('');
      expect(falseAndNull.oldValue).toBe('false');
      expect(falseAndNull.newValue).toBeUndefined();
      expect(absent.oldValue).toBeUndefined();
      expect(absent.newValue).toBeUndefined();
      // key set vẫn đầy đủ (10 khoá), chỉ giá trị là undefined
      expect(Object.keys(absent).sort()).toEqual([
        'action',
        'hash',
        'ipAddress',
        'newValue',
        'oldValue',
        'resource',
        'resourceId',
        'userAgent',
        'userId',
        'username',
      ]);
    });

    it('stringifies a numeric resourceId and leaves an absent resourceId as undefined', async () => {
      await service.log({
        action: 'CREATE',
        resource: 'AuditFinding',
        resourceId: 1000001,
      });
      await service.log({ action: 'DELETE', resource: 'AuditFinding' });

      expect(mockAuditLogRepo.create.mock.calls[0][0].resourceId).toBe(
        '1000001',
      );
      expect(
        mockAuditLogRepo.create.mock.calls[1][0].resourceId,
      ).toBeUndefined();
    });

    it('does NOT persist the old document state that a DELETE carries in newValue-less callers (no oldValue is invented)', async () => {
      await service.log({
        action: 'DELETE',
        resource: 'WorkingPaper',
        resourceId: 9,
      });

      const payload = mockAuditLogRepo.create.mock.calls[0][0];
      expect(payload.oldValue).toBeUndefined();
      expect(payload.newValue).toBeUndefined();
      expect(mockAuditLogRepo.create.mock.calls[0][0]).toStrictEqual({
        action: 'DELETE',
        resource: 'WorkingPaper',
        resourceId: '9',
        userId: undefined,
        username: undefined,
        oldValue: undefined,
        newValue: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        hash: computeAuditLogHash({
          action: 'DELETE',
          resource: 'WorkingPaper',
          resourceId: '9',
        }),
      });
    });

    it('resolves to undefined (void) and never returns the saved entity to callers', async () => {
      await expect(
        service.log({ action: 'CREATE', resource: 'AuditFinding' }),
      ).resolves.toBeUndefined();
    });

    it('REGRESSION (TC-SYS-05): every entry now carries a hash column and verifyIntegrity() is part of the service surface', async () => {
      await service.log({
        action: 'UPDATE',
        resource: 'AuditFinding',
        resourceId: 42,
        oldValue: { status: 'Draft' },
        newValue: { status: 'Approved' },
      });

      const payload = mockAuditLogRepo.create.mock.calls[0][0];
      const keys = Object.keys(payload);
      expect(keys.sort()).toEqual([
        'action',
        'hash',
        'ipAddress',
        'newValue',
        'oldValue',
        'resource',
        'resourceId',
        'userAgent',
        'userId',
        'username',
      ]);
      // UAT TC-SYS-05 yêu cầu một digest SHA-256 trên mỗi bản ghi.
      expect(
        keys.filter((k) =>
          /hash|checksum|sha|digest|integrity|signature|prev/i.test(k),
        ),
      ).toEqual(['hash']);
      expect(payload.hash).toMatch(/^[0-9a-f]{64}$/);
      // helper xác minh toàn vẹn đã tồn tại trên service
      expect(typeof (service as any).verifyIntegrity).toBe('function');
    });
  });

  describe('verifyIntegrity (TC-SYS-05)', () => {
    const storedRow = (overrides: Partial<AuditLog> = {}): AuditLog => {
      const base: Partial<AuditLog> = {
        action: 'UPDATE',
        resource: 'AuditFinding',
        resourceId: '42',
        userId: 7,
        username: 'auditor1',
        oldValue: JSON.stringify({ status: 'Draft' }),
        newValue: JSON.stringify({ status: 'Approved' }),
        ipAddress: '10.20.30.40',
        userAgent: 'jest',
      };
      const row = { ...base } as AuditLog;
      // Băm nội dung GỐC trước, rồi mới áp các thay đổi "can thiệp" của test.
      row.hash = computeAuditLogHash(row);
      Object.assign(row, overrides);
      if (overrides.hash !== undefined) row.hash = overrides.hash;
      return row;
    };

    it('trả về { valid: true } cho bản ghi còn nguyên vẹn', async () => {
      mockAuditLogRepo.findOne.mockResolvedValueOnce(storedRow());

      await expect(service.verifyIntegrity(3)).resolves.toEqual({
        valid: true,
      });
      expect(mockAuditLogRepo.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
      });
    });

    it('REGRESSION: trả về { valid: false, reason } khi một trường đã bị sửa trong DB', async () => {
      const tampered = storedRow();
      tampered.newValue = JSON.stringify({ status: 'Rejected' }); // sửa nội dung, giữ nguyên hash
      mockAuditLogRepo.findOne.mockResolvedValueOnce(tampered);

      const result = await service.verifyIntegrity(3);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Mã băm không khớp');
    });

    it('REGRESSION: trả về { valid: false, reason } khi bản ghi bị sửa thầm ở trường resourceId/username/ipAddress', async () => {
      for (const overrides of [
        { resourceId: '43' },
        { username: 'ke_gian' },
        { ipAddress: '0.0.0.0' },
      ] as Array<Partial<AuditLog>>) {
        mockAuditLogRepo.findOne.mockResolvedValueOnce(storedRow(overrides));
        const result = await service.verifyIntegrity(3);
        expect(result.valid).toBe(false);
      }
    });

    it('báo không xác minh được (valid: false) với bản ghi cũ không có hash hoặc id không tồn tại', async () => {
      const legacy = storedRow();
      legacy.hash = null as unknown as string;
      mockAuditLogRepo.findOne.mockResolvedValueOnce(legacy);
      await expect(service.verifyIntegrity(1)).resolves.toEqual({
        valid: false,
        reason: expect.stringContaining('không có mã băm'),
      });

      mockAuditLogRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.verifyIntegrity(999)).resolves.toEqual({
        valid: false,
        reason: expect.stringContaining('Không tìm thấy'),
      });
    });
  });

  describe('logSecurityAlert', () => {
    it('should create and save a security alert for suspicious operations', async () => {
      const alertData = {
        type: 'BRUTE_FORCE_DETECTED',
        description: 'Multiple failed logins detected for admin',
        severity: 'High' as const,
        userId: 1,
        username: 'admin',
        ipAddress: '192.168.1.100',
      };

      const result = await service.logSecurityAlert(alertData);
      expect(mockSecurityAlertRepo.create).toHaveBeenCalledWith(alertData);
      expect(mockSecurityAlertRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 1);
    });

    it('passes the alert straight to repo.create() without adding isResolved/resolvedBy and saves that same entity', async () => {
      const alertData = {
        type: 'UNAUTHORIZED_ACCESS',
        description: 'Truy cập audit-trail ngoài phạm vi được phân quyền',
        severity: 'Medium' as const,
        userId: 9,
        username: 'auditor2',
        resource: '/api/audit-trail',
        action: 'GET',
        ipAddress: '172.16.5.9',
      };

      const result = await service.logSecurityAlert(alertData);

      expect(mockSecurityAlertRepo.create).toHaveBeenCalledTimes(1);
      // the caller's object is forwarded verbatim — no field is added or re-serialized
      expect(mockSecurityAlertRepo.create).toHaveBeenCalledWith(alertData);
      expect(mockSecurityAlertRepo.create.mock.calls[0][0]).toBe(alertData);
      expect(
        'isResolved' in
          (mockSecurityAlertRepo.create.mock.calls[0][0] as object),
      ).toBe(false);
      expect(
        'resolvedBy' in
          (mockSecurityAlertRepo.create.mock.calls[0][0] as object),
      ).toBe(false);
      expect(mockSecurityAlertRepo.save).toHaveBeenCalledTimes(1);
      expect(mockSecurityAlertRepo.save).toHaveBeenCalledWith(
        mockSecurityAlertRepo.create.mock.results[0].value,
      );
      // isResolved is left to the DB column default (false), not set in application code
      expect(result.isResolved).toBeUndefined();
      expect(result).toEqual({ id: 1, ...alertData });
    });

    it('accepts an alert with only the three required fields and forwards exactly those keys', async () => {
      await service.logSecurityAlert({
        type: 'SUSPICIOUS_ACTIVITY',
        description: 'Nhiều lần đăng nhập thất bại',
        severity: 'Low',
      });

      expect(mockSecurityAlertRepo.create.mock.calls[0][0]).toStrictEqual({
        type: 'SUSPICIOUS_ACTIVITY',
        description: 'Nhiều lần đăng nhập thất bại',
        severity: 'Low',
      });
    });
  });

  describe('findAllAlerts', () => {
    it('lists every alert newest-first and never filters or paginates', async () => {
      const alerts = [
        {
          id: 2,
          type: 'UNAUTHORIZED_ACCESS',
          description: 'x',
          severity: 'High',
          isResolved: false,
          createdAt: new Date('2024-04-02T01:00:00.000Z'),
        },
      ];
      mockSecurityAlertRepo.find.mockResolvedValueOnce(alerts);

      const result = await service.findAllAlerts();

      expect(mockSecurityAlertRepo.find).toHaveBeenCalledTimes(1);
      expect(mockSecurityAlertRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(alerts);
    });
  });

  describe('findAll', () => {
    it('should query logs using query builder with limit and optional resource filter', async () => {
      await service.findAll('AuditFinding', 50);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'log.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'log.resource = :resource',
        { resource: 'AuditFinding' },
      );
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('defaults to take(100) and applies NO resource filter when resource is omitted', async () => {
      await service.findAll();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'log.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
    });

    it('returns exactly what the query builder resolves, with no post-processing or shape change', async () => {
      const createdAt = new Date('2024-03-01T08:30:00.000Z');
      const rows = [
        {
          id: 3,
          action: 'UPDATE',
          resource: 'AuditFinding',
          resourceId: '42',
          userId: 7,
          username: 'auditor1',
          oldValue: '{"status":"Draft"}',
          newValue: '{"status":"Approved"}',
          ipAddress: '10.20.30.40',
          userAgent: 'jest',
          createdAt,
        },
      ];
      mockQueryBuilder.getMany.mockResolvedValueOnce(rows);

      const result = await service.findAll('AuditFinding', 1);

      expect(result).toBe(rows);
      expect(result[0]).toStrictEqual({
        id: 3,
        action: 'UPDATE',
        resource: 'AuditFinding',
        resourceId: '42',
        userId: 7,
        username: 'auditor1',
        oldValue: '{"status":"Draft"}',
        newValue: '{"status":"Approved"}',
        ipAddress: '10.20.30.40',
        userAgent: 'jest',
        createdAt,
      });
    });
  });

  describe('findByUser', () => {
    it('should query audit logs for a specific user id', async () => {
      await service.findByUser(5);

      expect(mockAuditLogRepo.find).toHaveBeenCalledWith({
        where: { userId: 5 },
        order: { createdAt: 'DESC' },
        take: 200,
      });
    });

    it('returns the repository page unchanged and issues no query builder call', async () => {
      const rows = [
        {
          id: 11,
          action: 'CREATE',
          resource: 'AuditFinding',
          resourceId: '5',
          userId: 5,
          username: 'auditor1',
          oldValue: null,
          newValue: '{"title":"x"}',
          ipAddress: '10.0.0.8',
          userAgent: null,
          createdAt: new Date('2024-05-06T07:08:09.000Z'),
        },
      ];
      mockAuditLogRepo.find.mockResolvedValueOnce(rows);

      const result = await service.findByUser(5);

      expect(result).toBe(rows);
      expect(mockAuditLogRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(result[0]).toStrictEqual({
        id: 11,
        action: 'CREATE',
        resource: 'AuditFinding',
        resourceId: '5',
        userId: 5,
        username: 'auditor1',
        oldValue: null,
        newValue: '{"title":"x"}',
        ipAddress: '10.0.0.8',
        userAgent: null,
        createdAt: new Date('2024-05-06T07:08:09.000Z'),
      });
    });

    it('caps the history page at 200 rows with no offset (no pagination support)', async () => {
      await service.findByUser(1);

      const args = mockAuditLogRepo.find.mock.calls[0][0];
      expect(Object.keys(args).sort()).toEqual(['order', 'take', 'where']);
      expect(args.take).toBe(200);
      expect(args.skip).toBeUndefined();
      expect(args.relations).toBeUndefined();
    });
  });

  describe('cleanupLogs', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute delete query builder for logs older than specified months', async () => {
      const result = await service.cleanupLogs(6);

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(AuditLog);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'createdAt < :cutoffDate',
        expect.objectContaining({ cutoffDate: expect.any(Date) }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          deleted: 5,
        }),
      );
    });

    it('computes the cutoff as an exact calendar-month offset and hard-DELETEs from AuditLog', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));

      const result = await service.cleanupLogs(6);

      expect(mockQueryBuilder.delete).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.from).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(AuditLog);
      expect(mockQueryBuilder.where).toHaveBeenCalledTimes(1);
      // exact parameter object: { cutoffDate } with calendar-month subtraction (not 180*24h)
      expect(mockQueryBuilder.where.mock.calls[0][0]).toBe(
        'createdAt < :cutoffDate',
      );
      expect(mockQueryBuilder.where.mock.calls[0][1]).toStrictEqual({
        cutoffDate: new Date('2023-12-15T10:00:00.000Z'),
      });
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual({
        deleted: 5,
        cutoffDate: new Date('2023-12-15T10:00:00.000Z'),
      });
    });

    it('reports deleted: 0 when the driver returns 0/undefined affected rows (|| fallback)', async () => {
      mockQueryBuilder.execute.mockResolvedValueOnce({ affected: 0 });
      await expect(service.cleanupLogs(3)).resolves.toEqual(
        expect.objectContaining({ deleted: 0 }),
      );

      mockQueryBuilder.execute.mockResolvedValueOnce({});
      await expect(service.cleanupLogs(3)).resolves.toEqual(
        expect.objectContaining({ deleted: 0 }),
      );

      mockQueryBuilder.execute.mockResolvedValueOnce({ affected: null });
      await expect(service.cleanupLogs(3)).resolves.toEqual(
        expect.objectContaining({ deleted: 0 }),
      );
    });

    it('REGRESSION (TC-SYS-05): thanh lọc ghi MỘT bản ghi kiểm toán cho chính hành vi xoá TRƯỚC khi xoá', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
      mockAuditLogRepo.count.mockResolvedValueOnce(37);

      const result = await service.cleanupLogs(6, {
        userId: 4,
        username: 'admin_ktnb',
        ipAddress: '10.1.2.3',
        userAgent: 'jest-agent',
      });

      // 1) đếm số dòng sẽ bị xoá
      expect(mockAuditLogRepo.count).toHaveBeenCalledWith({
        where: { createdAt: expect.any(Object) }, // LessThan(cutoffDate)
      });
      // 2) bản ghi kiểm toán của hành vi thanh lọc
      expect(mockAuditLogRepo.create).toHaveBeenCalledTimes(1);
      const entry = mockAuditLogRepo.create.mock.calls[0][0];
      expect(entry.action).toBe('DELETE');
      expect(entry.resource).toBe('audit-trail');
      expect(entry.userId).toBe(4);
      expect(entry.username).toBe('admin_ktnb');
      expect(entry.ipAddress).toBe('10.1.2.3');
      expect(entry.resourceId).toBe('2023-12-15T10:00:00.000Z');
      expect(JSON.parse(entry.oldValue)).toEqual({
        months: 6,
        cutoffDate: '2023-12-15T10:00:00.000Z',
        purgedRows: 37,
      });
      // bản ghi thanh lọc cũng có mã băm như mọi bản ghi khác
      expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(mockAuditLogRepo.save).toHaveBeenCalledTimes(1);

      // 3) và việc ghi dấu vết phải xảy ra TRƯỚC lệnh DELETE
      const logWriteOrder =
        mockAuditLogRepo.create.mock.invocationCallOrder[0];
      expect(logWriteOrder).toBeLessThan(
        mockQueryBuilder.execute.mock.invocationCallOrder[0],
      );
      expect(mockQueryBuilder.delete).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual({
        deleted: 5,
        cutoffDate: new Date('2023-12-15T10:00:00.000Z'),
      });
    });

    it('vẫn thanh lọc được kể cả khi ghi dấu vết thanh lọc thất bại (không phá tính năng retention)', async () => {
      // Dịch vụ ghi lỗi qua NestJS Logger (KHÔNG phải console.error) — spy đúng
      // kênh thật, nếu không test sẽ đỏ dù hành vi đúng.
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      mockAuditLogRepo.save.mockRejectedValueOnce(new Error('db down'));

      const result = await service.cleanupLogs(6);

      expect(result).toEqual(expect.objectContaining({ deleted: 5 }));
      expect(mockQueryBuilder.delete).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Không ghi được nhật ký cho hành vi thanh lọc:',
        expect.any(Error),
      );
      loggerErrorSpy.mockRestore();
    });

    it('RỦI RO CÒN LẠI (đã ghi nhận): thanh lọc vẫn là hard DELETE — mã băm theo dòng KHÔNG ngăn được xoá có chủ đích', async () => {
      await service.cleanupLogs(12);

      // destructive statement, no soft-delete / archive / supersede path anywhere
      expect(mockQueryBuilder.delete).toHaveBeenCalledTimes(1);
      expect((mockQueryBuilder as any).softDelete).toBeUndefined();
      expect((mockAuditLogRepo as any).softDelete).toBeUndefined();
      expect((mockAuditLogRepo as any).update).toBeUndefined();
      expect((service as any).archiveLogs).toBeUndefined();
      expect((service as any).redactLogs).toBeUndefined();

      // bề mặt service: có thể XÁC MINH (verifyIntegrity) nhưng không thể viết lại/niêm phong
      expect(
        Object.getOwnPropertyNames(AuditTrailService.prototype).sort(),
      ).toEqual(
        [
          'cleanupLogs',
          'constructor',
          'findAll',
          'findAllAlerts',
          'findByUser',
          'log',
          'logSecurityAlert',
          'verifyIntegrity',
        ].sort(),
      );
    });
  });

  describe('AuditLog entity — persisted column contract (TC-SYS-05)', () => {
    const auditLogColumns = () =>
      getMetadataArgsStorage()
        .columns.filter((c) => c.target === AuditLog)
        .map((c) => c.propertyName);

    const auditLogIndexes = () =>
      getMetadataArgsStorage()
        .indices.filter((i) => i.target === AuditLog)
        .map((i) =>
          Array.isArray(i.columns)
            ? i.columns
            : Array.isArray(i.fields)
              ? i.fields
              : [],
        );

    it('persists exactly these 12 columns (11 cũ + hash TC-SYS-05), each with the expected nullability/type', () => {
      const columns = getMetadataArgsStorage().columns.filter(
        (c) => c.target === AuditLog,
      );

      expect(auditLogColumns().sort()).toEqual(
        [
          'id',
          'action',
          'resource',
          'resourceId',
          'userId',
          'username',
          'oldValue',
          'newValue',
          'ipAddress',
          'userAgent',
          'hash',
          'createdAt',
        ].sort(),
      );

      const byName = Object.fromEntries(
        columns.map((c) => [c.propertyName, c.options]),
      );
      const optionsFor = (name: string) =>
        (byName[name] ?? {}) as Record<string, any>;

      expect(optionsFor('action').nullable).toBeUndefined(); // NOT NULL
      expect(optionsFor('resource').nullable).toBeUndefined(); // NOT NULL
      expect(optionsFor('action').default).toBeUndefined();
      expect(optionsFor('resource').default).toBeUndefined();
      expect(optionsFor('resourceId').nullable).toBe(true);
      expect(optionsFor('userId').nullable).toBe(true);
      expect(optionsFor('username').nullable).toBe(true);
      expect(optionsFor('oldValue')).toMatchObject({
        type: 'text',
        nullable: true,
      });
      expect(optionsFor('newValue')).toMatchObject({
        type: 'text',
        nullable: true,
      });
      expect(optionsFor('ipAddress').nullable).toBe(true);
      expect(optionsFor('userAgent').nullable).toBe(true);
      // TC-SYS-05: cột mã băm SHA-256 (hex 64 ký tự), nullable cho dữ liệu cũ
      expect(optionsFor('hash')).toMatchObject({
        type: 'varchar',
        length: 64,
        nullable: true,
      });
    });

    it('REGRESSION (TC-SYS-05): the audit_logs table carries the SHA-256 `hash` column and nothing chained-like', () => {
      const hashLike = auditLogColumns().filter((name) =>
        /hash|checksum|sha|digest|integrity|signature|prev|sealed/i.test(name),
      );

      // Cột hash tồn tại ⇒ nội dung mỗi dòng có thể bị phát hiện nếu bị sửa.
      expect(hashLike).toEqual(['hash']);
      expect(auditLogColumns()).toContain('hash');
      // Vẫn KHÔNG có chuỗi liên kết (prevHash) ⇒ xoá/đổi thứ tự dòng không bị phát hiện.
      expect(auditLogColumns()).not.toContain('prevHash');
      expect(auditLogColumns()).not.toContain('checksum');
    });

    it('keeps the lookup indexes the queries rely on: (resource, resourceId), (userId), (createdAt)', () => {
      const indexes = auditLogIndexes();

      expect(indexes).toEqual(
        expect.arrayContaining([
          ['resource', 'resourceId'],
          ['userId'],
          ['createdAt'],
        ]),
      );
      expect(indexes).toHaveLength(3);
    });

    it('maps the entity to the audit_logs table with no delete-date/version column that could support immutability', () => {
      const tableArgs = getMetadataArgsStorage().tables.filter(
        (t) => t.target === AuditLog,
      );
      expect(tableArgs).toHaveLength(1);
      expect(tableArgs[0].name).toBe('audit_logs');

      const columns = auditLogColumns();
      expect(columns).not.toContain('deletedAt');
      expect(columns).not.toContain('version');
      expect(columns).not.toContain('updatedAt');
      // columns writable by any UPDATE statement:
      expect(columns).toEqual(
        expect.arrayContaining(['oldValue', 'newValue', 'action', 'resource']),
      );
    });
  });
});

/**
 * AuditInterceptor (registered globally in app.module.ts via APP_INTERCEPTOR) is the
 * ONLY writer of `resource`/`resourceId` in the real request path. These tests pin its
 * real behaviour: bỏ tiền tố 'api', đọc cả ':id' lẫn ':reqId', và ghi nhật ký TRƯỚC khi
 * phát response (không còn fire-and-forget).
 */
describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditTrailService: { log: jest.Mock };
  let loggerErrorSpy: jest.SpyInstance;

  interface FakeRequest {
    method: string;
    url: string;
    body?: any;
    ip?: string;
    headers?: Record<string, string>;
    user?: any;
    params?: Record<string, string>;
  }

  const buildContext = (req: FakeRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          body: {},
          headers: {},
          params: {},
          ...req,
        }),
      }),
    }) as unknown as ExecutionContext;

  const nextReturning = (value: any): CallHandler => ({
    handle: () => of(value),
  });

  const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    auditTrailService = { log: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(auditTrailService as any);
    // Interceptor ghi lỗi qua NestJS Logger (this.logger.error), không phải
    // console.error — spy đúng kênh thật để test phản ánh hành vi production.
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('records action CREATE for POST with the exact payload the interceptor builds', async () => {
    const req: FakeRequest = {
      method: 'POST',
      url: '/api/audit-findings',
      body: { title: 'Phát hiện mới', severity: 'High' },
      ip: '10.20.30.40',
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0)' },
      user: { userId: 7, username: 'auditor1' },
      params: {},
    };

    await lastValueFrom(
      interceptor.intercept(buildContext(req), nextReturning({ id: 55 })),
    );

    expect(auditTrailService.log).toHaveBeenCalledTimes(1);
    // toStrictEqual pins the key set: `oldValue` is NEVER recorded by the interceptor.
    expect(auditTrailService.log.mock.calls[0][0]).toStrictEqual({
      action: 'CREATE',
      resource: 'audit-findings',
      resourceId: null,
      userId: 7,
      username: 'auditor1',
      newValue: { title: 'Phát hiện mới', severity: 'High' },
      ipAddress: '10.20.30.40',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
    });
    // the HTTP response body returned by the handler is NOT what is recorded
    expect(auditTrailService.log.mock.calls[0][0].newValue).not.toEqual({
      id: 55,
    });
  });

  it.each([
    ['PUT', 'UPDATE'],
    ['PATCH', 'UPDATE'],
    ['DELETE', 'DELETE'],
    ['POST', 'CREATE'],
  ])('maps HTTP %s to audit action %s', async (method, expectedAction) => {
    await lastValueFrom(
      interceptor.intercept(
        buildContext({ method, url: '/api/risks', body: {}, params: {} }),
        nextReturning({}),
      ),
    );

    expect(auditTrailService.log).toHaveBeenCalledTimes(1);
    expect(auditTrailService.log.mock.calls[0][0].action).toBe(expectedAction);
  });

  it('does not log read-only requests and returns the handler stream untouched', async () => {
    const stream = of({ ok: true });

    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const result = interceptor.intercept(
        buildContext({ method, url: '/api/audit-findings' }),
        { handle: () => stream },
      );

      expect(result).toBe(stream);
    }

    expect(auditTrailService.log).not.toHaveBeenCalled();
  });

  it('REGRESSION: derives resource AFTER stripping the global "api" prefix', async () => {
    await lastValueFrom(
      interceptor.intercept(
        buildContext({
          method: 'POST',
          url: '/api/audit-findings/123',
          body: {},
          params: { id: '123' },
        }),
        nextReturning({}),
      ),
    );

    const payload = auditTrailService.log.mock.calls[0][0];
    expect(payload.resource).toBe('audit-findings');
    expect(payload.resource).not.toBe('api');
  });

  it.each([
    ['/api/audit-engagements', 'audit-engagements'],
    ['/api/recommendations/', 'recommendations'],
    ['/api/tasks?status=Todo&page=2', 'tasks'],
    ['/api//users', 'users'],
    ['/audit-findings', 'audit-findings'],
    ['/api', 'Unknown'],
    ['/api/', 'Unknown'],
    ['', 'Unknown'],
  ])('REGRESSION: url %s ⇒ resource %s', async (url, expected) => {
    await lastValueFrom(
      interceptor.intercept(
        buildContext({ method: 'POST', url, body: {}, params: {} }),
        nextReturning({}),
      ),
    );

    expect(auditTrailService.log.mock.calls[0][0].resource).toBe(expected);
  });

  it('REGRESSION: reads resourceId from req.params.id AND falls back to :reqId', async () => {
    await lastValueFrom(
      interceptor.intercept(
        buildContext({
          method: 'PATCH',
          url: '/api/audit-engagements/change-requests/77/approve',
          body: { approved: true },
          params: { reqId: '77' },
        }),
        nextReturning({}),
      ),
    );
    await lastValueFrom(
      interceptor.intercept(
        buildContext({
          method: 'PATCH',
          url: '/api/audit-findings/88',
          body: { status: 'Closed' },
          params: { id: '88' },
        }),
        nextReturning({}),
      ),
    );
    await lastValueFrom(
      interceptor.intercept(
        buildContext({
          method: 'PATCH',
          url: '/api/audit-engagements/change-requests/77/approve',
          body: { approved: true },
          params: {},
        }),
        nextReturning({}),
      ),
    );

    expect(auditTrailService.log.mock.calls[0][0].resourceId).toBe('77');
    expect(auditTrailService.log.mock.calls[0][0].resource).toBe(
      'audit-engagements',
    );
    expect(auditTrailService.log.mock.calls[1][0].resourceId).toBe('88');
    // không có tham số đường dẫn nào -> null (không bịa id)
    expect(auditTrailService.log.mock.calls[2][0].resourceId).toBeNull();
  });

  it('falls back to resource "Unknown" when the URL has no first path segment', async () => {
    await lastValueFrom(
      interceptor.intercept(
        buildContext({ method: 'DELETE', url: '/', params: {} }),
        nextReturning({}),
      ),
    );

    const payload = auditTrailService.log.mock.calls[0][0];
    expect(payload.resource).toBe('Unknown');
    expect(payload.resourceId).toBeNull();
  });

  it('records userId from the JWT field userId and defaults the actor to Guest/null when unauthenticated', async () => {
    await lastValueFrom(
      interceptor.intercept(
        buildContext({
          method: 'POST',
          url: '/api/users',
          body: {},
          params: {},
          user: { userId: 12, username: 'lead_auditor' },
          headers: { 'user-agent': 'curl/8.0' },
        }),
        nextReturning({}),
      ),
    );
    await lastValueFrom(
      interceptor.intercept(
        buildContext({
          method: 'POST',
          url: '/api/auth/login',
          body: {},
          params: {},
          headers: {},
        }),
        nextReturning({}),
      ),
    );

    expect(auditTrailService.log.mock.calls[0][0]).toStrictEqual({
      action: 'CREATE',
      resource: 'users',
      resourceId: null,
      userId: 12,
      username: 'lead_auditor',
      newValue: {},
      ipAddress: undefined,
      userAgent: 'curl/8.0',
    });
    expect('oldValue' in auditTrailService.log.mock.calls[0][0]).toBe(false);
    const anonymous = auditTrailService.log.mock.calls[1][0];
    expect(anonymous.userId).toBeNull();
    expect(anonymous.username).toBe('Guest');
    expect(anonymous.resource).toBe('auth');
    expect(anonymous.userAgent).toBe('');
    expect(anonymous.ipAddress).toBeUndefined();
  });

  it('does not record anything when the handler errors (failed writes leave no audit trace)', async () => {
    const failing: CallHandler = {
      handle: () => throwError(() => new Error('validation failed')),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          buildContext({ method: 'POST', url: '/api/users', body: {} }),
          failing,
        ),
      ),
    ).rejects.toThrow('validation failed');

    expect(auditTrailService.log).not.toHaveBeenCalled();
  });

  it('swallows audit-logging failures so the HTTP response still reaches the client', async () => {
    const dbError = new Error('audit_logs table unavailable');
    auditTrailService.log.mockRejectedValueOnce(dbError);

    const result = await lastValueFrom(
      interceptor.intercept(
        buildContext({ method: 'POST', url: '/api/users', body: { a: 1 } }),
        nextReturning({ id: 1 }),
      ),
    );
    await flushAsync();

    expect(result).toEqual({ id: 1 });
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to log audit trail:',
      dbError,
    );
  });

  it('REGRESSION: awaits the audit write before emitting the response (không còn fire-and-forget)', async () => {
    let resolveLog: () => void = () => {};
    auditTrailService.log.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveLog = resolve;
      }),
    );

    let emitted = false;
    const pending = lastValueFrom(
      interceptor.intercept(
        buildContext({ method: 'POST', url: '/api/users', body: {} }),
        nextReturning({ id: 9 }),
      ),
    ).then((value) => {
      emitted = true;
      return value;
    });

    // Cho microtask chạy: bản ghi CHƯA lưu xong thì response CHƯA được phát.
    await flushAsync();
    expect(auditTrailService.log).toHaveBeenCalledTimes(1);
    expect(emitted).toBe(false);

    resolveLog();
    await expect(pending).resolves.toEqual({ id: 9 });
    expect(emitted).toBe(true);
  });
});
