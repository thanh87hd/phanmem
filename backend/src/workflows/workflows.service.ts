import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowStep } from './entities/workflow-step.entity';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private readonly defRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowStep)
    private readonly stepRepo: Repository<WorkflowStep>,
  ) {}

  async findAll() {
    return this.defRepo.find({
      relations: ['steps'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByEntity(entityType: string) {
    return this.defRepo.findOne({
      where: { entityType, isActive: true },
      relations: ['steps'],
      order: { steps: { order: 'ASC' } },
    });
  }

  async createDefinition(data: any) {
    const def = this.defRepo.create({
      entityType: data.entityType,
      name: data.name,
      isActive: data.isActive,
    });
    const savedDef = await this.defRepo.save(def);

    if (data.steps && data.steps.length > 0) {
      const steps = data.steps.map((s: any, index: number) =>
        this.stepRepo.create({
          ...s,
          workflowId: savedDef.id,
          order: index + 1,
        }),
      );
      await this.stepRepo.save(steps);
    }

    return this.defRepo.findOne({
      where: { id: savedDef.id },
      relations: ['steps'],
    });
  }

  async updateDefinition(id: number, data: any) {
    const def = await this.defRepo.findOne({ where: { id } });
    if (!def) throw new NotFoundException('Workflow not found');

    def.name = data.name;
    def.isActive = data.isActive;
    await this.defRepo.save(def);

    if (data.steps) {
      await this.stepRepo.delete({ workflowId: id });
      const steps = data.steps.map((s: any, index: number) =>
        this.stepRepo.create({
          ...s,
          workflowId: id,
          order: index + 1,
        }),
      );
      await this.stepRepo.save(steps);
    }

    return this.defRepo.findOne({ where: { id }, relations: ['steps'] });
  }

  async getNextStep(entityType: string, currentStatus: string) {
    const def = await this.findByEntity(entityType);
    if (!def || !def.steps || def.steps.length === 0) return null;

    const sortedSteps = def.steps.sort((a, b) => a.order - b.order);

    // Nếu chưa có status, trả về bước đầu tiên
    if (!currentStatus) return sortedSteps[0];

    const currentIndex = sortedSteps.findIndex(
      (s) => s.statusValue === currentStatus,
    );
    if (currentIndex === -1 || currentIndex === sortedSteps.length - 1)
      return null; // Không tìm thấy hoặc đã là bước cuối

    return sortedSteps[currentIndex + 1];
  }

  async validatePermission(step: WorkflowStep, userRoles: string[]) {
    if (!step.requiredRole || step.requiredRole === 'Any') return true;
    return userRoles.includes(step.requiredRole) || userRoles.includes('Admin');
  }
}
