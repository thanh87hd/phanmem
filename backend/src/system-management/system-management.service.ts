import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemManagementService {
  private readonly logger = new Logger(SystemManagementService.name);

  constructor(
    private configService: ConfigService,
    private auditTrailService: AuditTrailService,
  ) {}

  /**
   * Detect pg_dump/psql path based on OS
   */
  private getPgBinPath(tool: 'pg_dump' | 'psql'): string {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      // 1. Try standard PostgreSQL installations dynamically scanning for version subdirectories
      const pgRootDir = 'C:\\Program Files\\PostgreSQL';
      if (fs.existsSync(pgRootDir)) {
        try {
          const versions = fs.readdirSync(pgRootDir);
          // Sort descending so we prefer the highest version if multiple exist
          const sortedVersions = versions
            .filter((v) => fs.statSync(path.join(pgRootDir, v)).isDirectory())
            .sort((a, b) => Number(b) - Number(a));

          for (const ver of sortedVersions) {
            const exePath = path.join(pgRootDir, ver, 'bin', `${tool}.exe`);
            if (fs.existsSync(exePath)) return exePath;
          }
        } catch (e) {
          this.logger.error(`Error scanning PG root dir: ${e.message}`);
        }
      }

      // 2. Fallbacks
      const windowsPaths = [
        `C:\\Program Files\\PostgreSQL\\18\\bin\\${tool}.exe`,
        `C:\\Program Files\\PostgreSQL\\17\\bin\\${tool}.exe`,
        `C:\\Program Files\\PostgreSQL\\16\\bin\\${tool}.exe`,
        `C:\\Program Files\\PostgreSQL\\15\\bin\\${tool}.exe`,
        `C:\\Program Files\\Odoo 19.0.20260302\\PostgreSQL\\bin\\${tool}.exe`,
      ];
      for (const p of windowsPaths) {
        const cleanPath = p.replace(/"/g, '');
        if (fs.existsSync(cleanPath)) return cleanPath;
      }
      return tool; // fallback: hope it's in PATH
    }
    // Linux/Mac: pg_dump and psql are typically in PATH
    return tool;
  }

  private getBackupDir(): string {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  private getDbConfig() {
    return {
      dbName: this.configService.get('DB_NAME', 'ktnb_db'),
      dbUser: this.configService.get('DB_USERNAME', 'ktnb_user'),
      dbPass: this.configService.get('DB_PASSWORD', 'ktnb_password'),
      dbHost: this.configService.get('DB_HOST', 'localhost'),
      dbPort: this.configService.get('DB_PORT', 5432),
    };
  }

  async getLogStats() {
    const alerts = await this.auditTrailService.findAllAlerts();
    return {
      totalAlerts: alerts.length,
      lastCleanup: new Date(),
    };
  }

  // ==================== BACKUP ====================

  async createBackup(
    userId?: number,
    username?: string,
  ): Promise<{ fileName: string; filePath: string; size: number }> {
    const { dbName, dbUser, dbPass, dbHost, dbPort } = this.getDbConfig();
    const backupDir = this.getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${dbName}_${timestamp}.sql`;
    const filePath = path.join(backupDir, fileName);

    const pgDump = this.getPgBinPath('pg_dump');
    const env = { ...process.env, PGPASSWORD: dbPass };
    const args = [
      '-U',
      dbUser,
      '-h',
      dbHost,
      '-p',
      String(dbPort),
      '-f',
      filePath,
      dbName,
    ];

    return new Promise((resolve, reject) => {
      execFile(pgDump, args, { env }, async (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Backup failed: ${error.message}`);
          this.logger.error(`Stderr: ${stderr}`);
          return reject(
            new BadRequestException(
              'Lỗi khi tạo bản sao lưu cơ sở dữ liệu. Chi tiết: ' +
                (stderr || error.message),
            ),
          );
        }

        const stats = fs.statSync(filePath);

        // Log to audit trail
        await this.auditTrailService.log({
          action: 'CREATE',
          resource: 'database_backup',
          resourceId: fileName,
          userId,
          username,
          newValue: { fileName, size: stats.size },
        });

        resolve({ fileName, filePath, size: stats.size });
      });
    });
  }

  // ==================== RESTORE ====================

  async restoreBackup(
    fileName: string,
    adminPassword: string,
    adminUserId: number,
    adminUsername: string,
  ): Promise<{ message: string }> {
    const backupDir = this.getBackupDir();
    const filePath = path.join(backupDir, fileName);

    // Security: Validate file name to prevent path traversal & command injection
    if (
      !/^[a-zA-Z0-9_\-.]+\.sql$/.test(fileName) ||
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      throw new BadRequestException('Tên file không hợp lệ');
    }

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File backup không tồn tại');
    }

    const { dbName, dbUser, dbPass, dbHost, dbPort } = this.getDbConfig();
    const psql = this.getPgBinPath('psql');
    const env = { ...process.env, PGPASSWORD: dbPass };
    const args = [
      '-U',
      dbUser,
      '-h',
      dbHost,
      '-p',
      String(dbPort),
      '-d',
      dbName,
      '-f',
      filePath,
    ];

    // Log security alert before restore
    await this.auditTrailService.logSecurityAlert({
      type: 'DATABASE_RESTORE',
      description: `Admin "${adminUsername}" đang thực hiện khôi phục database từ file: ${fileName}`,
      severity: 'High',
      userId: adminUserId,
      username: adminUsername,
      resource: 'database',
      action: 'RESTORE',
    });

    return new Promise((resolve, reject) => {
      execFile(psql, args, { env }, async (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Restore failed: ${error.message}`);

          await this.auditTrailService.log({
            action: 'UPDATE',
            resource: 'database_restore',
            resourceId: fileName,
            userId: adminUserId,
            username: adminUsername,
            newValue: { status: 'FAILED', error: error.message },
          });

          return reject(
            new BadRequestException(
              'Khôi phục database thất bại. Chi tiết: ' +
                (stderr || error.message),
            ),
          );
        }

        await this.auditTrailService.log({
          action: 'UPDATE',
          resource: 'database_restore',
          resourceId: fileName,
          userId: adminUserId,
          username: adminUsername,
          newValue: { status: 'SUCCESS', fileName },
        });

        resolve({
          message: `Đã khôi phục database thành công từ file: ${fileName}`,
        });
      });
    });
  }

  // ==================== DOWNLOAD ====================

  getBackupFilePath(fileName: string): string {
    // Security: Prevent path traversal & command injection
    if (
      !/^[a-zA-Z0-9_\-.]+\.sql$/.test(fileName) ||
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      throw new BadRequestException('Tên file không hợp lệ');
    }

    const backupDir = this.getBackupDir();
    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File backup không tồn tại');
    }

    return filePath;
  }

  // ==================== UPLOAD ====================

  async uploadBackup(
    file: any,
    userId?: number,
    username?: string,
  ): Promise<{ fileName: string; size: number }> {
    if (!file) {
      throw new BadRequestException('Không có file được gửi lên');
    }

    if (!file.originalname.endsWith('.sql')) {
      throw new BadRequestException('Chỉ hỗ trợ upload file .sql');
    }

    // Limit file size to 500MB
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File quá lớn. Giới hạn tối đa 500MB.');
    }

    const backupDir = this.getBackupDir();
    const safeFileName = `uploaded_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const filePath = path.join(backupDir, safeFileName);

    fs.writeFileSync(filePath, file.buffer);

    await this.auditTrailService.log({
      action: 'CREATE',
      resource: 'database_backup_upload',
      resourceId: safeFileName,
      userId,
      username,
      newValue: {
        fileName: safeFileName,
        originalName: file.originalname,
        size: file.size,
      },
    });

    return { fileName: safeFileName, size: file.size };
  }

  // ==================== DELETE ====================

  async deleteBackup(
    fileName: string,
    userId?: number,
    username?: string,
  ): Promise<{ message: string }> {
    // Security: Prevent path traversal
    if (
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      throw new BadRequestException('Tên file không hợp lệ');
    }

    const backupDir = this.getBackupDir();
    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File backup không tồn tại');
    }

    const stats = fs.statSync(filePath);
    fs.unlinkSync(filePath);

    await this.auditTrailService.log({
      action: 'DELETE',
      resource: 'database_backup',
      resourceId: fileName,
      userId,
      username,
      oldValue: { fileName, size: stats.size },
    });

    return { message: `Đã xóa file backup: ${fileName}` };
  }

  // ==================== LIST & STATS ====================

  async getBackupList() {
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) return [];

    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.sql'));
    return files
      .map((file) => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          name: file,
          size: stats.size,
          createdAt: stats.birthtime,
          isUploaded: file.startsWith('uploaded_'),
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBackupStats() {
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) {
      return { totalFiles: 0, totalSize: 0, totalSizeMB: '0.00' };
    }

    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.sql'));
    let totalSize = 0;
    for (const file of files) {
      totalSize += fs.statSync(path.join(backupDir, file)).size;
    }

    return {
      totalFiles: files.length,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    };
  }
}
