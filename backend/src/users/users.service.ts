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
  ) {
    let comp = await this.competencyRepository.findOne({
      where: { userId, skillName },
    });
    if (comp) {
      comp.rating = rating;
      if (notes !== undefined) comp.notes = notes;
      return this.competencyRepository.save(comp);
    } else {
      comp = this.competencyRepository.create({
        userId,
        skillName,
        rating,
        notes,
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

  async findAll(user?: any) {
    if (!user) {
      const users = await this.userRepository.find({ relations: ['role'] });
      return this.sanitizeUser(users);
    }

    const fullUser = await this.userRepository.findOne({
      where: { id: user.userId },
      relations: ['role'],
    });

    if (!fullUser) {
      const users = await this.userRepository.find({ relations: ['role'] });
      return this.sanitizeUser(users);
    }

    if (
      ScopeFilterService.isAdminRole(fullUser.role?.name, fullUser.jobTitle)
    ) {
      const users = await this.userRepository.find({ relations: ['role'] });
      return this.sanitizeUser(users);
    }

    // Trưởng đoàn / Trưởng phòng chỉ được xem danh sách nhân sự cùng phòng
    const users = await this.userRepository.find({
      where: { department: fullUser.department },
      relations: ['role'],
    });
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

  async remove(id: number) {
    await this.userRepository.delete(id);
    return { success: true };
  }
}
