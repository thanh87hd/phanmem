import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomFieldDefinition } from './entities/custom-field.entity';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomFieldDefinition)
    private readonly repo: Repository<CustomFieldDefinition>,
  ) {}

  findAll() {
    return this.repo.find({ order: { entityType: 'ASC', order: 'ASC' } });
  }

  findByEntity(entityType: string) {
    return this.repo.find({
      where: { entityType },
      order: { order: 'ASC' },
    });
  }

  create(data: Partial<CustomFieldDefinition>) {
    const field = this.repo.create(data);
    return this.repo.save(field);
  }

  async update(id: number, data: Partial<CustomFieldDefinition>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: number) {
    await this.repo.delete(id);
    return { success: true };
  }
}
