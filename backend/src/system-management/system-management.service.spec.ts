import { Test, TestingModule } from '@nestjs/testing';
import { SystemManagementService } from './system-management.service';
import { ConfigService } from '@nestjs/config';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { BadRequestException } from '@nestjs/common';
import * as child_process from 'child_process';
import * as fs from 'fs';

jest.mock('child_process');
jest.mock('fs');

describe('SystemManagementService', () => {
  let service: SystemManagementService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key, defaultVal) => defaultVal),
  };

  const mockAuditTrailService = {
    findAllAlerts: jest.fn().mockResolvedValue([{ id: 1 }]),
    log: jest.fn().mockResolvedValue(undefined),
    logSecurityAlert: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemManagementService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditTrailService, useValue: mockAuditTrailService },
      ],
    }).compile();

    service = module.get<SystemManagementService>(SystemManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLogStats', () => {
    it('should return log alert stats', async () => {
      const stats = await service.getLogStats();
      expect(stats.totalAlerts).toBe(1);
      expect(stats.lastCleanup).toBeInstanceOf(Date);
    });
  });

  describe('createBackup', () => {
    it('should create backup and log audit on success', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 } as any);

      (child_process.execFile as unknown as jest.Mock).mockImplementation(
        (file, args, opts, cb) => {
          const callback = typeof opts === 'function' ? opts : cb;
          callback(null, 'OK', '');
        },
      );

      const result = await service.createBackup(1, 'admin');
      expect(result.size).toBe(1024);
      expect(mockAuditTrailService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if backup process fails', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      (child_process.execFile as unknown as jest.Mock).mockImplementation(
        (file, args, opts, cb) => {
          const callback = typeof opts === 'function' ? opts : cb;
          callback(new Error('pg_dump error'), '', 'Dump failed');
        },
      );

      await expect(service.createBackup(1, 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('restoreBackup', () => {
    it('should reject invalid file paths (path traversal)', async () => {
      await expect(
        service.restoreBackup('../malicious.sql', 'pass', 1, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-existent file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        service.restoreBackup('backup.sql', 'pass', 1, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non .sql file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await expect(
        service.restoreBackup('backup.txt', 'pass', 1, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should restore database successfully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      (child_process.execFile as unknown as jest.Mock).mockImplementation(
        (file, args, opts, cb) => {
          const callback = typeof opts === 'function' ? opts : cb;
          callback(null, 'RESTORE OK', '');
        },
      );

      const result = await service.restoreBackup(
        'backup.sql',
        'pass',
        1,
        'admin',
      );
      expect(result.message).toContain('Đã khôi phục database thành công');
      expect(mockAuditTrailService.logSecurityAlert).toHaveBeenCalled();
      expect(mockAuditTrailService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: { status: 'SUCCESS', fileName: 'backup.sql' },
        }),
      );
    });

    it('should handle restore error and log failure', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      (child_process.execFile as unknown as jest.Mock).mockImplementation(
        (file, args, opts, cb) => {
          const callback = typeof opts === 'function' ? opts : cb;
          callback(new Error('psql syntax error'), '', 'Restore failed');
        },
      );

      await expect(
        service.restoreBackup('backup.sql', 'pass', 1, 'admin'),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuditTrailService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: { status: 'FAILED', error: 'psql syntax error' },
        }),
      );
    });
  });

  describe('getBackupFilePath', () => {
    it('should throw on path traversal', () => {
      expect(() => service.getBackupFilePath('..\\test.sql')).toThrow(
        BadRequestException,
      );
    });

    it('should throw on non-existent file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(() => service.getBackupFilePath('not_found.sql')).toThrow(
        BadRequestException,
      );
    });

    it('should return path when file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const filePath = service.getBackupFilePath('valid.sql');
      expect(filePath).toContain('valid.sql');
    });
  });

  describe('uploadBackup', () => {
    it('should throw if no file provided', async () => {
      await expect(service.uploadBackup(null)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if not .sql file', async () => {
      await expect(
        service.uploadBackup({
          originalname: 'data.csv',
          size: 100,
          buffer: Buffer.from(''),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if file size exceeds limit', async () => {
      await expect(
        service.uploadBackup({
          originalname: 'data.sql',
          size: 600 * 1024 * 1024,
          buffer: Buffer.from(''),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload valid backup file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.uploadBackup(
        {
          originalname: 'import.sql',
          size: 1024,
          buffer: Buffer.from('SELECT 1;'),
        },
        1,
        'admin',
      );

      expect(result.size).toBe(1024);
      expect(result.fileName).toContain('uploaded_');
      expect(mockAuditTrailService.log).toHaveBeenCalled();
    });
  });

  describe('deleteBackup', () => {
    it('should throw on path traversal', async () => {
      await expect(service.deleteBackup('..//hack.sql')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(service.deleteBackup('nonexistent.sql')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete file and log audit', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 2048 } as any);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.deleteBackup('test.sql', 1, 'admin');
      expect(result.message).toContain('Đã xóa file backup');
      expect(mockAuditTrailService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' }),
      );
    });
  });

  describe('getBackupList & getBackupStats', () => {
    it('should return backup list sorted by date', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'b1.sql',
        'b2.sql',
      ] as any);
      (fs.statSync as jest.Mock).mockImplementation(
        (p: any) =>
          ({
            size: 1024,
            birthtime: p.includes('b1')
              ? new Date('2026-01-01')
              : new Date('2026-01-02'),
          }) as any,
      );

      const list = await service.getBackupList();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('b2.sql');
    });

    it('should calculate backup stats', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['b1.sql'] as any);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1048576 } as any); // 1MB

      const stats = await service.getBackupStats();
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalSize).toBe(1048576);
      expect(stats.totalSizeMB).toBe('1.00');
    });
  });
});
