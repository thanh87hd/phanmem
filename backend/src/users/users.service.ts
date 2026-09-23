import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserCompetency } from './entities/user-competency.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCompetency)
    private readonly competencyRepository: Repository<UserCompetency>,
  ) {}

  async getCompetencies(userId: number) {
    return this.competencyRepository.find({ where: { userId } });
  }

  async updateCompetency(
    userId: number,
    skillName: string,
    rating: number,
    notes?: string,
    skillCategory?: string,
  ) {
    let comp = await this.competencyRepository.findOne({
      where: { userId, skillName },
    });
    if (comp) {
      comp.rating = rating;
      if (notes !== undefined) comp.notes = notes;
      if (skillCategory) comp.skillCategory = skillCategory;
      return this.competencyRepository.save(comp);
    } else {
      comp = this.competencyRepository.create({
        userId,
        skillName,
        rating,
        notes,
        skillCategory: skillCategory || 'Core',
      });
      return this.competencyRepository.save(comp);
    }
  }

  sanitizeUser(user: any): any {
    if (!user) return user;
    if (Array.isArray(user)) {
      return user.map((u) => this.sanitizeUser(u));
    }
    const {
      passwordHash,
      passwordHistory,
      twoFactorSecret,
      twoFactorTempSecret,
      passwordResetToken,
      ...safeUser
    } = user;
    return safeUser;
  }

  async create(createUserDto: any) {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(createUserDto.password, salt);

    const newUser = this.userRepository.create({
      ...createUserDto,
      passwordHash: hash,
    });
    const saved = await this.userRepository.save(newUser);
    return this.sanitizeUser(saved);
  }

  async findAll(user?: any, query?: { status?: string; includeInactive?: string | boolean }) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role');

    if (user && user.userId) {
      const fullUser = await this.userRepository.findOne({
        where: { id: user.userId },
        relations: ['role'],
      });

      if (
        fullUser &&
        !ScopeFilterService.isAdminRole(fullUser.role?.name, fullUser.jobTitle)
      ) {
        if (fullUser.department) {
          qb.andWhere('user.department = :dept', { dept: fullUser.department });
        }
      }
    }

    const statusParam = query?.status;
    if (statusParam && statusParam !== 'ALL') {
      if (statusParam === 'Active') {
        qb.andWhere("(user.status = 'Active' OR (user.status IS NULL AND user.isActive = true))");
      } else {
        qb.andWhere('user.status = :st', { st: statusParam });
      }
    } else if (
      query?.includeInactive !== 'true' &&
      query?.includeInactive !== true &&
      statusParam !== 'ALL'
    ) {
      qb.andWhere("(user.status = 'Active' OR (user.status IS NULL AND user.isActive = true))");
    }

    qb.orderBy('user.id', 'ASC');
    const users = await qb.getMany();
    return this.sanitizeUser(users);
  }

  findOne(id: number) {
    return this.userRepository.findOne({ where: { id }, relations: ['role'] });
  }

  async findOneSafe(id: number) {
    const user = await this.findOne(id);
    return this.sanitizeUser(user);
  }

  findOneByUsername(username: string) {
    return this.userRepository.findOne({
      where: [{ username }, { email: username }],
      relations: ['role'],
    });
  }

  async update(id: number, dto: any) {
    const { password, ...rest } = dto;
    if (password) {
      const salt = await bcrypt.genSalt(12);
      rest.passwordHash = await bcrypt.hash(password, salt);
    }
    await this.userRepository.update(id, rest);
    const updated = await this.findOne(id);
    return this.sanitizeUser(updated);
  }

  async updateStatus(id: number, dto: any) {
    const user = await this.findOne(id);
    if (!user) {
      throw new Error(`Không tìm thấy nhân sự với ID ${id}`);
    }

    const newStatus = dto.status || 'Active';
    const isActive = newStatus === 'Active';

    await this.userRepository.update(id, {
      status: newStatus,
      isActive,
      resignationDate: dto.resignationDate || null,
      transferDate: dto.transferDate || null,
      transferDestination: dto.transferDestination || null,
      statusReason: dto.statusReason || null,
      statusUpdatedAt: new Date(),
    });

    const updated = await this.findOne(id);
    return this.sanitizeUser(updated);
  }

  async restore(id: number) {
    const user = await this.findOne(id);
    if (!user) {
      throw new Error(`Không tìm thấy nhân sự với ID ${id}`);
    }

    await this.userRepository.update(id, {
      status: 'Active',
      isActive: true,
      statusReason: 'Khôi phục hoạt động tài khoản',
      statusUpdatedAt: new Date(),
    });

    const updated = await this.findOne(id);
    return this.sanitizeUser(updated);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (!user) {
      throw new Error(`Không tìm thấy nhân sự với ID ${id}`);
    }

    // Soft-delete: Không xóa cứng để bảo toàn dữ liệu kiểm toán lịch sử
    // (Working Papers, Findings, BSC-KPI, Time Tracking đều FK vào users.id)
    // Thay vào đó: chuyển status = Resigned + vô hiệu hóa tài khoản
    await this.userRepository.update(id, {
      isActive: false,
      status: 'Resigned',
      statusReason: 'Tài khoản bị xóa bởi quản trị viên hệ thống',
      statusUpdatedAt: new Date(),
    });

    return {
      success: true,
      message: `Tài khoản nhân sự "${user.fullName}" (${user.username}) đã được vô hiệu hóa thay vì xóa vật lý, nhằm bảo toàn dữ liệu kiểm toán lịch sử.`,
    };
  }
}
