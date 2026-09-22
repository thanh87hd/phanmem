import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceMetadata } from './entities/resource-metadata.entity';
import { ResourceData } from './entities/resource-data.entity';
import { DynamicWorkflowsService } from '../dynamic-workflows/dynamic-workflows.service';

@Injectable()
export class FrameworkService {
  constructor(
    @InjectRepository(ResourceMetadata)
    private readonly metadataRepo: Repository<ResourceMetadata>,
    @InjectRepository(ResourceData)
    private readonly dataRepo: Repository<ResourceData>,
    private readonly workflowsService: DynamicWorkflowsService,
  ) {}

  async createMetadata(dto: Partial<ResourceMetadata>) {
    const exists = await this.metadataRepo.findOne({
      where: { resourceName: dto.resourceName },
    });
    if (exists)
      throw new BadRequestException(
        `Resource ${dto.resourceName} already exists`,
      );

    const meta = this.metadataRepo.create(dto);
    return this.metadataRepo.save(meta);
  }

  async updateMetadata(resourceName: string, dto: Partial<ResourceMetadata>) {
    const meta = await this.metadataRepo.findOne({ where: { resourceName } });
    if (!meta)
      throw new NotFoundException(`Resource ${resourceName} not found`);

    // Do not allow changing the resourceName identifier
    delete dto.resourceName;
    delete dto.id;

    Object.assign(meta, dto);
    return this.metadataRepo.save(meta);
  }

  async getAllMetadata() {
    return this.metadataRepo.find({ where: { isActive: true } });
  }

  async getMetadataByName(resourceName: string) {
    const meta = await this.metadataRepo.findOne({
      where: { resourceName, isActive: true },
    });
    if (!meta)
      throw new NotFoundException(`Resource ${resourceName} not found`);
    return meta;
  }

  private checkPermission(
    meta: ResourceMetadata,
    action: 'view' | 'create' | 'update' | 'delete',
    userRole: string,
  ) {
    if (!userRole) throw new ForbiddenException('User role is required');
    if (
      userRole.toLowerCase().includes('admin') ||
      userRole.toLowerCase() === 'quản trị hệ thống'
    )
      return;

    const perms = meta.permissions;
    if (!perms || !perms[action] || perms[action].length === 0) {
      throw new ForbiddenException(
        `You do not have permission to ${action} ${meta.resourceName}`,
      );
    }

    if (!perms[action].includes(userRole)) {
      throw new ForbiddenException(
        `You do not have permission to ${action} ${meta.resourceName}`,
      );
    }
  }

  async createData(
    resourceName: string,
    data: any,
    userRole: string,
    userId?: number,
  ) {
    const meta = await this.getMetadataByName(resourceName);
    this.checkPermission(meta, 'create', userRole);

    // Workflow Engine: Kích hoạt event ON_CREATE
    const workflowUpdates = await this.workflowsService.executeWorkflows(
      'ON_CREATE',
      resourceName,
      data,
    );
    const finalData = { ...data, ...workflowUpdates };

    const record = this.dataRepo.create({
      metadata: meta,
      data: finalData,
      createdBy: userId,
    });
    return this.dataRepo.save(record);
  }

  async getAllData(resourceName: string, userRole: string) {
    const meta = await this.getMetadataByName(resourceName);
    this.checkPermission(meta, 'view', userRole);

    return this.dataRepo.find({
      where: { metadataId: meta.id },
      order: { createdAt: 'DESC' },
    });
  }

  async getDataById(resourceName: string, id: string, userRole: string) {
    const meta = await this.getMetadataByName(resourceName);
    this.checkPermission(meta, 'view', userRole);

    const record = await this.dataRepo.findOne({
      where: { id, metadataId: meta.id },
    });
    if (!record) throw new NotFoundException('Data not found');
    return record;
  }

  async updateData(
    resourceName: string,
    id: string,
    data: any,
    userRole: string,
  ) {
    const record = await this.getDataById(resourceName, id, userRole);
    const meta = await this.getMetadataByName(resourceName);
    this.checkPermission(meta, 'update', userRole);

    // Workflow Engine: Kích hoạt event ON_UPDATE
    const workflowUpdates = await this.workflowsService.executeWorkflows(
      'ON_UPDATE',
      resourceName,
      { ...record.data, ...data },
    );
    const finalData = { ...data, ...workflowUpdates };

    record.data = { ...record.data, ...finalData };
    return this.dataRepo.save(record);
  }

  async deleteData(resourceName: string, id: string, userRole: string) {
    const record = await this.getDataById(resourceName, id, userRole);
    const meta = await this.getMetadataByName(resourceName);
    this.checkPermission(meta, 'delete', userRole);

    await this.dataRepo.remove(record);
    return { success: true };
  }
}
