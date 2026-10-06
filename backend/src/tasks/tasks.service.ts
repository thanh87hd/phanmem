import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { ScopeFilterService } from '../utils/scope-filter.service';
import {
  teamMembersContainsClause,
  teamMembersJsonParam,
} from '../common/utils/team-members-filter.util';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async create(createDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create(createDto);
    return this.taskRepository.save(task);
  }

  async findAll(query?: any, user?: any): Promise<Task[]> {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.subTasks', 'subTasks')
      .leftJoinAndSelect('task.engagement', 'eng')
      .leftJoinAndSelect('eng.plan', 'plan');

    if (query?.assignedToId) {
      qb.andWhere('task.assignedToId = :assignedToId', {
        assignedToId: query.assignedToId,
      });
    }
    if (query?.assignedById) {
      qb.andWhere('task.assignedById = :assignedById', {
        assignedById: query.assignedById,
      });
    }
    if (query?.assignedDepartmentId) {
      qb.andWhere('task.assignedDepartmentId = :assignedDepartmentId', {
        assignedDepartmentId: query.assignedDepartmentId,
      });
    }
    if (query?.teamCode) {
      qb.andWhere('task.teamCode = :teamCode', { teamCode: query.teamCode });
    }
    if (query?.sourceType) {
      qb.andWhere('task.sourceType = :sourceType', {
        sourceType: query.sourceType,
      });
    }
    if (query?.engagementId) {
      qb.andWhere('task.engagementId = :engagementId', {
        engagementId: query.engagementId,
      });
    }
    if (query?.departmentId) {
      qb.andWhere('eng.legacyAuditedDepartment = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query?.year) {
      qb.andWhere('plan.year = :year', { year: parseInt(query.year) });
    }
    if (query?.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }
    if (query?.parentId === null || query?.parentId === 'null') {
      qb.andWhere('task.parentId IS NULL');
    }

    // Role-based scope filtering for non-admin users
    if (user) {
      const isAdmin = ScopeFilterService.isAdminRole(user?.role);
      const roleLower = (user?.role || '').toString().toLowerCase();
      const isAuditee =
        roleLower.includes('đơn vị') || roleLower.includes('auditee');
      const isKtv =
        roleLower.includes('kiểm toán viên') ||
        roleLower.includes('ktv') ||
        roleLower === 'thành viên';

      if (!isAdmin) {
        if (query?.sourceType === 'Audit') {
          if (isAuditee) {
            qb.andWhere('eng.legacyAuditedDepartment = :dept', {
              dept: user.legacyDepartment,
            });
          } else {
            qb.andWhere(
              `(eng.leadAuditorId = :userId OR ${teamMembersContainsClause('eng')} OR eng.ownerTeam = :team)`,
              {
                userId: user.userId,
                jsonUser: teamMembersJsonParam(user.userId),
                team: user.teamCode,
              },
            );
          }
        } else if (query?.sourceType === 'General') {
          if (isKtv) {
            qb.andWhere('task.assignedToId = :userId', { userId: user.userId });
          } else {
            qb.andWhere('task.teamCode = :teamCode', { teamCode: user.teamCode });
          }
        } else {
          // FIX (data segregation): sourceType VẮNG MẶT (hoặc mang giá trị lạ)
          // KHÔNG được miễn trừ phân tách dữ liệu. Trước đây nhánh scope chỉ chạy
          // khi client gửi đúng 'Audit'/'General', nên `GET /tasks` không kèm
          // sourceType khiến người dùng không phải admin đọc được TOÀN BỘ công
          // việc của mọi đoàn/đơn vị.
          //
          // Quy tắc an toàn: áp ĐỒNG THỜI cả hai bộ quy tắc và OR chúng với nhau
          // (không AND, nếu không sẽ luôn rỗng) để người dùng vẫn thấy việc của
          // mình ở cả hai loại 'Audit' và 'General', nhưng không bao giờ thấy
          // việc ngoài phạm vi của mình.
          const auditScope = isAuditee
            ? 'eng.legacyAuditedDepartment = :dept'
            : `(eng.leadAuditorId = :userId OR ${teamMembersContainsClause('eng')} OR eng.ownerTeam = :team)`;
          const generalScope = isKtv
            ? 'task.assignedToId = :userId'
            : 'task.teamCode = :teamCode';

          const scopeParams: Record<string, any> = {};
          if (isAuditee) {
            // Đơn vị được kiểm toán: chỉ thấy cuộc KT của phòng ban mình (Audit)
            // hoặc việc ngoài đoàn của chính đơn vị mình (General).
            scopeParams.dept = user.legacyDepartment;
          } else {
            scopeParams.userId = user.userId;
            scopeParams.jsonUser = teamMembersJsonParam(user.userId);
            scopeParams.team = user.teamCode;
          }
          if (isKtv) {
            scopeParams.userId = user.userId;
          } else {
            scopeParams.teamCode = user.teamCode;
          }

          qb.andWhere(`(${auditScope} OR ${generalScope})`, scopeParams);
        }
      }
    }

    qb.orderBy('task.dueDate', 'ASC');

    return qb.getMany();
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['subTasks', 'parent'],
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async update(id: number, updateDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    this.taskRepository.merge(task, updateDto);
    const updated = await this.taskRepository.save(task);

    // If progress is updated and it has a parent, trigger parent progress calculation
    if (updateDto.progress !== undefined && task.parentId) {
      await this.recalculateParentProgress(task.parentId);
    }

    return updated;
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    await this.taskRepository.remove(task);
  }

  /**
   * Recalculates the progress of a parent task based on its sub-tasks.
   */
  async recalculateParentProgress(parentId: number): Promise<void> {
    const parent = await this.taskRepository.findOne({
      where: { id: parentId },
      relations: ['subTasks'],
    });
    if (!parent) return;

    if (!parent.subTasks || parent.subTasks.length === 0) {
      return;
    }

    let totalProgress = 0;
    parent.subTasks.forEach((sub) => {
      totalProgress += sub.progress || 0;
    });

    const averageProgress = totalProgress / parent.subTasks.length;
    parent.progress = Math.round(averageProgress);

    // Auto complete if progress is 100
    if (parent.progress === 100) {
      parent.status = 'Done';
      if (!parent.completedDate) {
        parent.completedDate = new Date().toISOString().split('T')[0];
      }
    } else if (parent.progress > 0 && parent.status === 'Open') {
      parent.status = 'InProgress';
    }

    await this.taskRepository.save(parent);

    // If this parent is also a sub-task, go up the chain
    if (parent.parentId) {
      await this.recalculateParentProgress(parent.parentId);
    }
  }
}
