import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DynamicWorkflow } from './entities/dynamic-workflow.entity';

@Injectable()
export class DynamicWorkflowsService {
  private readonly logger = new Logger(DynamicWorkflowsService.name);

  constructor(
    @InjectRepository(DynamicWorkflow)
    private readonly workflowRepo: Repository<DynamicWorkflow>,
  ) {}

  async findAll(): Promise<DynamicWorkflow[]> {
    return this.workflowRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<DynamicWorkflow> {
    const workflow = await this.workflowRepo.findOne({ where: { id } });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID "${id}" not found`);
    }
    return workflow;
  }

  async create(createData: Partial<DynamicWorkflow>): Promise<DynamicWorkflow> {
    const workflow = this.workflowRepo.create(createData);
    return this.workflowRepo.save(workflow);
  }

  async update(
    id: string,
    updateData: Partial<DynamicWorkflow>,
  ): Promise<DynamicWorkflow> {
    const workflow = await this.findOne(id);
    Object.assign(workflow, updateData);
    return this.workflowRepo.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowRepo.remove(workflow);
  }

  async executeWorkflows(
    triggerEvent: string,
    triggerResource: string,
    dataRecord: any,
  ): Promise<any> {
    const workflows = await this.workflowRepo.find({
      where: {
        triggerEvent,
        triggerResource,
        isActive: true,
      },
    });

    const updates: Record<string, any> = {};

    for (const wf of workflows) {
      if (!wf.nodes || !Array.isArray(wf.nodes)) continue;

      for (const node of wf.nodes) {
        if (node.type !== 'input') {
          const actionType = node.data?.actionType;
          if (actionType === 'UPDATE_FIELD') {
            const targetField = node.data?.targetField;
            const targetValue = node.data?.targetValue;
            if (targetField) {
              updates[targetField] = targetValue;
            }
          } else if (actionType === 'SEND_EMAIL') {
            this.logger.log(
              `[WORKFLOW] Gửi Email với mẫu: ${node.data?.emailTemplate}`,
            );
          }
        }
      }
    }

    return updates;
  }
}
