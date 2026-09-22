import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditTrailService } from './audit-trail.service';
import { AuditLog } from './entities/audit-log.entity';
import { SecurityAlert } from './entities/security-alert.entity';

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
  });

  describe('cleanupLogs', () => {
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
  });
});
