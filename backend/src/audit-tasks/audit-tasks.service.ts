import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditTask } from './entities/audit-task.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';

@Injectable()
export class AuditTasksService {
  constructor(
    @InjectRepository(AuditTask)
    private repo: Repository<AuditTask>,
  ) {}

  create(createDto: any): Promise<AuditTask> {
    const entity = this.repo.create(createDto as Record<string, any>);
    return this.repo.save(entity);
  }

  findAll(
    user?: any,
    engagementId?: number,
    departmentId?: string,
    year?: string,
  ) {
    const qb = this.repo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.engagement', 'eng')
      .leftJoinAndSelect('eng.plan', 'plan')
      .orderBy('task.dueDate', 'ASC');

    if (engagementId) {
      qb.andWhere('task.engagementId = :engagementId', { engagementId });
    }
    if (departmentId) {
      qb.andWhere('eng.legacyAuditedDepartment = :departmentId', {
        departmentId,
      });
    }
    if (year) {
      qb.andWhere('plan.year = :year', { year: parseInt(year) });
    }

    const isAdmin = ScopeFilterService.isAdminRole(user?.role);
    const roleLower = (user?.role || '').toString().toLowerCase();
    const isAuditee =
      roleLower.includes('đơn vị') || roleLower.includes('auditee');

    if (user && !isAdmin) {
      if (isAuditee) {
        qb.andWhere('eng.legacyAuditedDepartment = :dept', {
          dept: user.legacyDepartment,
        });
      } else {
        qb.andWhere(
          '(eng.leadAuditorId = :userId OR eng.teamMembers LIKE :likeUserId OR eng.ownerTeam = :team)',
          {
            userId: user.userId,
            likeUserId: `%"userId":${user.userId}%`,
            team: user.teamCode,
          },
        );
      }
    }

    return qb.getMany();
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  update(id: number, updateDto: any) {
    return this.repo.update(id, updateDto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
