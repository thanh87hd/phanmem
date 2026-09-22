import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralTask } from './entities/general-task.entity';
import { TasksService } from '../tasks/tasks.service';

/**
 * GeneralTasksService (Compatibility Facade)
 * Ủy quyền toàn bộ xử lý nghiệp vụ sang TasksService tập trung (ADR-0010 & IIA GIAS 2024)
 * với sourceType = 'General', bảo đảm single source of truth trong bảng tasks.
 */
@Injectable()
export class GeneralTasksService {
  constructor(
    @InjectRepository(GeneralTask)
    private readonly repo: Repository<GeneralTask>,
    private readonly tasksService: TasksService,
  ) {}

  async create(dto: Partial<GeneralTask>): Promise<any> {
    const payload = {
      ...dto,
      sourceType: 'General',
    };
    return this.tasksService.create(payload as any);
  }

  async findAll(
    user?: any,
    query?: { teamCode?: string; status?: string; assignedToId?: number },
  ) {
    return this.tasksService.findAll(
      {
        ...query,
        sourceType: 'General',
      },
      user,
    );
  }

  async findOne(id: number) {
    return this.tasksService.findOne(id);
  }

  async update(id: number, dto: Partial<GeneralTask>) {
    return this.tasksService.update(id, dto as any);
  }

  async remove(id: number) {
    await this.tasksService.remove(id);
    return { affected: 1 };
  }
}
