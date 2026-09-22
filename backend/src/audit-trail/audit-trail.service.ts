import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { SecurityAlert } from './entities/security-alert.entity';

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

@Injectable()
export class AuditTrailService {
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

  async log(params: LogActionParams): Promise<void> {
    const data: Partial<AuditLog> = {
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId?.toString(),
      userId: params.userId,
      username: params.username,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : undefined,
      newValue: params.newValue ? JSON.stringify(params.newValue) : undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };
    const entry = this.repo.create(data);
    await this.repo.save(entry);
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

  async cleanupLogs(months: number) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .from(AuditLog)
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return { deleted: result.affected || 0, cutoffDate };
  }
}
