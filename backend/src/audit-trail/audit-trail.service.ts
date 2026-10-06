import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { SecurityAlert } from './entities/security-alert.entity';
import {
  computeAuditLogHash,
  serializeAuditValue,
} from './audit-log-integrity.util';

export interface LogActionParams {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SIGN';
  resource: string;
  resourceId?: string | number;
  userId?: number;
  username?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

/** Người thực hiện thao tác thanh lọc (lấy từ JWT ở tầng controller). */
export interface AuditActor {
  userId?: number;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IntegrityResult {
  valid: boolean;
  reason?: string;
}

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
    @InjectRepository(SecurityAlert)
    private readonly alertRepo: Repository<SecurityAlert>,
  ) {}

  async logSecurityAlert(data: {
    type: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low';
    userId?: number;
    username?: string;
    resource?: string;
    action?: string;
    ipAddress?: string;
  }) {
    const alert = this.alertRepo.create(data);
    return this.alertRepo.save(alert);
  }

  async findAllAlerts() {
    return this.alertRepo.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Ghi một bản ghi nhật ký kiểm toán kèm mã băm SHA-256 (UAT TC-SYS-05).
   *
   * `oldValue`/`newValue` được tuần tự hoá theo `serializeAuditValue` (xem util):
   * chuỗi giữ nguyên (không double-encode), `0`/`''`/`false` được giữ, `null`/`undefined`
   * coi như không có.
   *
   * Mã băm chỉ phủ các trường do phía gọi cung cấp — `id`/`createdAt` do DB sinh nên
   * không thể băm trước khi INSERT (xem ghi chú phạm vi trong `audit-log-integrity.util.ts`).
   */
  async log(params: LogActionParams): Promise<void> {
    const data: Partial<AuditLog> = {
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId?.toString(),
      userId: params.userId,
      username: params.username,
      oldValue: serializeAuditValue(params.oldValue),
      newValue: serializeAuditValue(params.newValue),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };
    // Băm trên ĐÚNG dữ liệu sắp ghi xuống DB ⇒ có thể băm lại từ bản ghi để kiểm tra.
    data.hash = computeAuditLogHash(data);

    const entry = this.repo.create(data);
    await this.repo.save(entry);
  }

  /**
   * Kiểm tra toàn vẹn một bản ghi: đọc lại từ DB, băm lại các trường bất biến và so với
   * `hash` đã lưu.
   *
   * Trả về `{ valid: false, reason }` khi: không tìm thấy bản ghi, bản ghi không có mã băm
   * (ghi trước migration), hoặc mã băm không khớp (nội dung đã bị sửa trong DB).
   *
   * LƯU Ý: hàm này KHÔNG phát hiện được việc xoá bản ghi/đổi thứ tự (băm theo từng dòng).
   */
  async verifyIntegrity(id: number): Promise<IntegrityResult> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) {
      return {
        valid: false,
        reason: `Không tìm thấy bản ghi nhật ký kiểm toán id=${id}`,
      };
    }
    if (!entry.hash) {
      return {
        valid: false,
        reason:
          'Bản ghi không có mã băm (được ghi trước khi bật kiểm tra toàn vẹn) — không thể xác minh',
      };
    }
    const expected = computeAuditLogHash(entry);
    if (expected !== entry.hash) {
      return {
        valid: false,
        reason:
          'Mã băm không khớp: nội dung bản ghi đã bị sửa đổi sau khi ghi (nghi vấn can thiệp trái phép)',
      };
    }
    return { valid: true };
  }

  findAll(resource?: string, limit = 100) {
    const query = this.repo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .take(limit);
    if (resource) {
      query.where('log.resource = :resource', { resource });
    }
    return query.getMany();
  }

  findByUser(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  /**
   * Thanh lọc nhật ký cũ hơn `months` tháng.
   *
   * Tính bất biến: trước khi xoá, ghi MỘT bản ghi nhật ký cho chính hành vi thanh lọc
   * (action 'DELETE', resource 'audit-trail', kèm mốc thời gian cắt và số dòng khớp) để
   * việc xoá dữ liệu kiểm toán cũng để lại dấu vết. Bản ghi này có `createdAt = now` nên
   * không bị chính lệnh xoá nuốt mất.
   *
   * RỦI RO CÒN LẠI (đã chấp nhận, xem báo cáo): mã băm theo từng dòng KHÔNG ngăn được một
   * lệnh DELETE có chủ đích; bất biến đầy đủ cần WORM/archival.
   */
  async cleanupLogs(months: number, actor?: AuditActor) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    // Đếm trước khi xoá để bản ghi kiểm toán của hành vi thanh lọc nêu đúng số dòng bị xoá.
    const purgedCount = await this.repo.count({
      where: { createdAt: LessThan(cutoffDate) },
    });

    try {
      // Ghi dấu vết thanh lọc TRƯỚC khi xoá (nếu xoá xong mới ghi mà tiến trình chết thì
      // mất dấu vết). Nếu ghi log thất bại, vẫn tiếp tục thanh lọc để không phá tính năng.
      await this.log({
        action: 'DELETE',
        resource: 'audit-trail',
        resourceId: cutoffDate.toISOString(),
        userId: actor?.userId,
        username: actor?.username,
        oldValue: {
          months,
          cutoffDate: cutoffDate.toISOString(),
          purgedRows: purgedCount,
        },
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
      });
    } catch (err) {
      this.logger.error('Không ghi được nhật ký cho hành vi thanh lọc:', err);
    }

    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .from(AuditLog)
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return { deleted: result.affected || 0, cutoffDate };
  }
}
