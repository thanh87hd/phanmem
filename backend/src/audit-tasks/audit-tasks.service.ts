import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditTask } from './entities/audit-task.entity';
import { TasksService } from '../tasks/tasks.service';

/**
 * AuditTasksService (Compatibility Facade)
 * Ủy quyền toàn bộ xử lý nghiệp vụ sang TasksService tập trung (ADR-0010 & IIA GIAS 2024)
 * với sourceType = 'Audit', bảo đảm single source of truth trong bảng tasks.
 */
@Injectable()
export class AuditTasksService {
  constructor(
    @InjectRepository(AuditTask)
    private repo: Repository<AuditTask>,
    private readonly tasksService: TasksService,
  ) {}

  async create(createDto: any): Promise<any> {
    const payload = {
      ...createDto,
      sourceType: 'Audit',
      assignedToName: createDto.assignedTo || createDto.assignedToName,
    };
    return this.tasksService.create(payload as any);
  }

  async findAll(
    user?: any,
    engagementId?: number,
    departmentId?: string,
    year?: string,
  ) {
    return this.tasksService.findAll(
      {
        sourceType: 'Audit',
        engagementId,
        departmentId,
        year,
      },
      user,
    );
  }

  async findOne(id: number) {
    return this.tasksService.findOne(id);
  }

  async update(id: number, updateDto: any) {
    const payload = {
      ...updateDto,
      assignedToName: updateDto.assignedTo || updateDto.assignedToName,
    };
    return this.tasksService.update(id, payload);
  }

  async remove(id: number) {
    await this.tasksService.remove(id);
    return { affected: 1 };
  }
}
