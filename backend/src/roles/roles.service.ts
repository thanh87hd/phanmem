import { Injectable, BadRequestException } from '@nestjs/common';
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
    // Kiểm tra xem có nhân sự nào đang được gán Role này không (FEAT-3)
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new BadRequestException(`Không tìm thấy nhóm quyền với ID ${id}`);
    }

    if (role.users && role.users.length > 0) {
      throw new BadRequestException(
        `Không thể xóa nhóm quyền "${role.name}" vì hiện đang có ${role.users.length} nhân sự được gán vào nhóm quyền này. Vui lòng gán lại nhóm quyền cho các nhân sự trước khi xóa.`,
      );
    }

    await this.roleRepository.delete(id);
    return { success: true, message: `Đã xóa nhóm quyền "${role.name}" thành công.` };
  }
}
