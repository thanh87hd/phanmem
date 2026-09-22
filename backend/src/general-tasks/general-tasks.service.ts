import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralTask } from './entities/general-task.entity';
import { User } from '../users/entities/user.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';

@Injectable()
export class GeneralTasksService {
  constructor(
    @InjectRepository(GeneralTask)
    private readonly repo: Repository<GeneralTask>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  create(dto: Partial<GeneralTask>) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(
    user?: any,
    query?: { teamCode?: string; status?: string; assignedToId?: number },
  ) {
    const where: any = {};
    if (query?.teamCode) where.teamCode = query.teamCode;
    if (query?.status) where.status = query.status;
    if (query?.assignedToId) where.assignedToId = query.assignedToId;

    if (user) {
      const fullUser = await this.userRepo.findOne({
        where: { id: user.userId },
        relations: ['role'],
      });

      if (fullUser) {
        const isAdmin = ScopeFilterService.isAdminRole(
          fullUser.role?.name,
          fullUser.jobTitle,
        );
        const roleLower = (fullUser.role?.name || '').toString().toLowerCase();

        if (!isAdmin) {
          const isKtv =
            roleLower.includes('kiểm toán viên') ||
            roleLower.includes('ktv') ||
            roleLower === 'thành viên';

          if (isKtv) {
            // KTV chỉ thấy task được giao trực tiếp cho mình
            where.assignedToId = fullUser.id;
          } else {
            // Trưởng đoàn / Trưởng phòng thấy task của cả team mình
            where.teamCode = fullUser.teamCode;
          }
        }
      }
    }

    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  update(id: number, dto: Partial<GeneralTask>) {
    return this.repo.update(id, dto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
