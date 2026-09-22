import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IaStrategicPlan } from './entities/ia-strategic-plan.entity';

@Injectable()
export class IaStrategicPlanService {
  constructor(
    @InjectRepository(IaStrategicPlan)
    private readonly repo: Repository<IaStrategicPlan>,
  ) {}

  findAll(): Promise<IaStrategicPlan[]> {
    return this.repo.find({ order: { startYear: 'DESC' } });
  }

  async findOne(id: number): Promise<IaStrategicPlan> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Strategic Plan #${id} not found`);
    return plan;
  }

  async findCurrentApproved(): Promise<IaStrategicPlan | null> {
    const currentYear = new Date().getFullYear();
    return this.repo
      .createQueryBuilder('sp')
      .where('sp.status = :status', { status: 'Approved' })
      .andWhere('sp.startYear <= :year AND sp.endYear >= :year', {
        year: currentYear,
      })
      .getOne();
  }

  async create(dto: Partial<IaStrategicPlan>, user: any): Promise<IaStrategicPlan> {
    const plan = this.repo.create({
      ...dto,
      status: 'Draft',
      preparedById: user?.userId,
      preparedByName: user?.fullName || user?.username,
      reviewHistory: [
        {
          action: 'DRAFT',
          actorId: user?.userId,
          actorName: user?.fullName || user?.username || '',
          role: user?.role || '',
          timestamp: new Date().toISOString(),
          notes: 'Khởi tạo Kế hoạch Chiến lược KTNB',
        },
      ],
    });
    return this.repo.save(plan);
  }

  async update(id: number, dto: Partial<IaStrategicPlan>): Promise<IaStrategicPlan> {
    const plan = await this.findOne(id);
    if (plan.status === 'Approved') {
      throw new BadRequestException('Cannot edit an approved strategic plan');
    }
    Object.assign(plan, dto);
    return this.repo.save(plan);
  }

  async submitForApproval(id: number, user: any): Promise<IaStrategicPlan> {
    const plan = await this.findOne(id);
    if (plan.status !== 'Draft') {
      throw new BadRequestException(`Plan must be Draft to submit. Current: ${plan.status}`);
    }
    plan.status = 'PendingApproval';
    plan.reviewHistory = [
      ...(plan.reviewHistory || []),
      {
        action: 'SUBMIT',
        actorId: user?.userId,
        actorName: user?.fullName || user?.username || '',
        role: user?.role || '',
        timestamp: new Date().toISOString(),
        notes: 'Trình phê duyệt KHCL KTNB',
      },
    ];
    return this.repo.save(plan);
  }

  async approve(id: number, user: any, notes?: string): Promise<IaStrategicPlan> {
    const plan = await this.findOne(id);
    if (plan.status !== 'PendingApproval') {
      throw new BadRequestException(`Plan must be PendingApproval. Current: ${plan.status}`);
    }
    plan.status = 'Approved';
    plan.approvedById = user?.userId;
    plan.approvedByName = user?.fullName || user?.username;
    plan.approvedAt = new Date();
    plan.approvalNotes = notes || '';
    plan.reviewHistory = [
      ...(plan.reviewHistory || []),
      {
        action: 'APPROVE',
        actorId: user?.userId,
        actorName: user?.fullName || user?.username || '',
        role: user?.role || '',
        timestamp: new Date().toISOString(),
        notes: notes || 'Phê duyệt KHCL KTNB',
      },
    ];
    return this.repo.save(plan);
  }

  async reject(id: number, user: any, notes: string): Promise<IaStrategicPlan> {
    const plan = await this.findOne(id);
    if (plan.status !== 'PendingApproval') {
      throw new BadRequestException(`Plan must be PendingApproval. Current: ${plan.status}`);
    }
    plan.status = 'Draft';
    plan.reviewHistory = [
      ...(plan.reviewHistory || []),
      {
        action: 'REJECT',
        actorId: user?.userId,
        actorName: user?.fullName || user?.username || '',
        role: user?.role || '',
        timestamp: new Date().toISOString(),
        notes,
      },
    ];
    return this.repo.save(plan);
  }

  async remove(id: number): Promise<void> {
    const plan = await this.findOne(id);
    if (plan.status === 'Approved') {
      throw new BadRequestException('Cannot delete an approved strategic plan');
    }
    await this.repo.remove(plan);
  }
}
