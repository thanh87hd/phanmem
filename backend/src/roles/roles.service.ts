import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(dto: {
    name: string;
    description?: string;
    permissions?: string;
  }) {
    const role = this.roleRepository.create(dto);
    return this.roleRepository.save(role);
  }

  findAll() {
    return this.roleRepository.find();
  }

  findOne(id: number) {
    return this.roleRepository.findOneBy({ id });
  }

  findByName(name: string) {
    return this.roleRepository.findOneBy({ name });
  }

  async update(id: number, dto: any) {
    await this.roleRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.roleRepository.delete(id);
    return { success: true };
  }
}
