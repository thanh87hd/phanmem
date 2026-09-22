import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditSchedule } from './entities/audit-schedule.entity';
import { User } from '../users/entities/user.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';

@Injectable()
export class AuditSchedulesService {
  constructor(
    @InjectRepository(AuditSchedule)
    private readonly repo: Repository<AuditSchedule>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  create(dto: Partial<AuditSchedule>) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(
    user?: any,
    query?: { teamCode?: string; userId?: number; month?: string },
  ): Promise<AuditSchedule[]> {
    const qb = this.repo.createQueryBuilder('s');

    let isAdmin = false;
    let isLead = false;
    let currentUserEntity: User | null = null;

    if (user && user.userId) {
      currentUserEntity = await this.userRepo.findOne({
        where: { id: user.userId },
        relations: ['role'],
      });
      if (currentUserEntity) {
        isAdmin = ScopeFilterService.isAdminRole(
          currentUserEntity.role?.name,
          currentUserEntity.jobTitle,
        );
        isLead = ScopeFilterService.isDeptLeadRole(
          currentUserEntity.role?.name,
          currentUserEntity.jobTitle,
        );
      }
    }

    // 1. Data Segregation / Filtering based on role
    if (user && !isAdmin) {
      if (isLead && currentUserEntity) {
        // Trưởng phòng / Trưởng nhóm / Trưởng đoàn: được xem lịch của nhóm mình phụ trách
        const userTeam = currentUserEntity.teamCode || '';
        qb.andWhere('s.teamCode = :userTeam', { userTeam });
      } else {
        // Kiểm toán viên thông thường (như thiendh): chỉ được xem lịch của CHÍNH MÌNH
        qb.andWhere('s.userId = :currentUserId', {
          currentUserId: user.userId,
        });
      }
    }

    // 2. Query overrides (for Admin/Leads to search inside their allowed scope)
    if (
      query?.teamCode &&
      (isAdmin || (isLead && query.teamCode === currentUserEntity?.teamCode))
    ) {
      qb.andWhere('s.teamCode = :teamCode', { teamCode: query.teamCode });
    }
    if (
      query?.userId &&
      (isAdmin || (isLead && query.userId === user?.userId) || !user)
    ) {
      qb.andWhere('s.userId = :userId', { userId: query.userId });
    }

    if (query?.month) {
      // month format: 2026-05
      const start = `${query.month}-01`;
      const [y, m] = query.month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${query.month}-${lastDay}`;
      qb.andWhere('s.startDate <= :end AND s.endDate >= :start', {
        start,
        end,
      });
    }
    qb.orderBy('s.startDate', 'ASC');
    return qb.getMany();
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  update(id: number, dto: Partial<AuditSchedule>) {
    return this.repo.update(id, dto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
