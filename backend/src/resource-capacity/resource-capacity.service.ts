import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffRoster } from './entities/staff-roster.entity';
import { ResourceDemand } from './entities/resource-demand.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';

@Injectable()
export class ResourceCapacityService {
  constructor(
    @InjectRepository(StaffRoster)
    private readonly staffRepo: Repository<StaffRoster>,
    @InjectRepository(ResourceDemand)
    private readonly demandRepo: Repository<ResourceDemand>,
    @InjectRepository(ResourceAllocation)
    private readonly allocRepo: Repository<ResourceAllocation>,
  ) {}

  async getStaffRoster(query?: { skill?: string; department?: string }) {
    const qb = this.staffRepo.createQueryBuilder('s').orderBy('s.id', 'ASC');

    if (query?.skill) {
      qb.andWhere(
        '(s.primarySkill = :skill OR s.secondarySkills ILIKE :skillSearch)',
        {
          skill: query.skill,
          skillSearch: `%${query.skill}%`,
        },
      );
    }

    if (query?.department) {
      qb.andWhere('s.department = :dept', { dept: query.department });
    }

    return await qb.getMany();
  }

  async getDemands(quarter?: string) {
    if (quarter) {
      return await this.demandRepo.find({
        where: { quarter },
        order: { id: 'ASC' },
      });
    }
    return await this.demandRepo.find({ order: { quarter: 'ASC', id: 'ASC' } });
  }

  async getAllocations() {
    return await this.allocRepo.find({ order: { id: 'DESC' } });
  }

  async allocate(dto: {
    demandId: string;
    staffId: string;
    allocatedHours: number;
    quarter: string;
    role?: string;
  }) {
    const staff = await this.staffRepo.findOne({
      where: { staffId: dto.staffId },
    });
    if (!staff) throw new NotFoundException(`Staff ${dto.staffId} not found`);

    const demand = await this.demandRepo.findOne({
      where: { demandId: dto.demandId },
    });
    if (!demand)
      throw new NotFoundException(`Demand ${dto.demandId} not found`);

    // Check skill gap
    const overlapConflict = false;
    let skillGapWarning = '';
    if (demand.requiredSkill && staff.primarySkill !== demand.requiredSkill) {
      if (
        !staff.secondarySkills ||
        !staff.secondarySkills.includes(demand.requiredSkill)
      ) {
        skillGapWarning = `Cảnh báo: Nhân sự không có chuyên môn ${demand.requiredSkill}`;
      }
    }
    if (staff.skillLevel < demand.minimumSkillLevel) {
      skillGapWarning += ` Cấp độ kỹ năng (${staff.skillLevel}) thấp hơn yêu cầu tối thiểu (${demand.minimumSkillLevel})`;
    }

    const allocationId = `ALL-${Date.now().toString().slice(-6)}`;
    const alloc = this.allocRepo.create({
      allocationId,
      demandId: demand.demandId,
      planItemId: demand.planItemId,
      staffId: staff.staffId,
      staffName: staff.fullName,
      quarter: dto.quarter || demand.quarter,
      role: dto.role || 'KTV Thành viên',
      assignedSkill: demand.requiredSkill || staff.primarySkill,
      allocatedHours: Number(dto.allocatedHours) || 100,
      overlapConflict,
    });

    const savedAlloc = await this.allocRepo.save(alloc);

    // Update staff committed hours & utilization
    staff.committedHours =
      (staff.committedHours || 0) + Number(dto.allocatedHours);
    staff.remainingCapacity = Math.max(
      0,
      staff.netAvailableHours - staff.committedHours,
    );
    staff.utilizationPct =
      staff.netAvailableHours > 0
        ? Number(
            ((staff.committedHours / staff.netAvailableHours) * 100).toFixed(1),
          )
        : 0;

    if (skillGapWarning) {
      staff.skillGapFlag = skillGapWarning;
    }

    await this.staffRepo.save(staff);

    return {
      allocation: savedAlloc,
      warning: skillGapWarning || null,
    };
  }

  async getQuarterlyCapacitySummary() {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const staff = await this.staffRepo.find();
    const demands = await this.demandRepo.find();
    const allocations = await this.allocRepo.find();

    const totalStaffCapacityPerQuarter = staff.reduce(
      (acc, s) => acc + s.netAvailableHours / 4,
      0,
    );

    const summary = quarters.map((q) => {
      const qDemands = demands.filter((d) => d.quarter === q);
      const qAllocations = allocations.filter((a) => a.quarter === q);

      const demandedHours = qDemands.reduce(
        (acc, d) => acc + d.requiredHours,
        0,
      );
      const allocatedHours = qAllocations.reduce(
        (acc, a) => acc + a.allocatedHours,
        0,
      );
      const availableCapacity = Math.round(totalStaffCapacityPerQuarter);
      const remainingHours = Math.max(0, availableCapacity - allocatedHours);
      const utilization =
        availableCapacity > 0
          ? Math.round((allocatedHours / availableCapacity) * 100)
          : 0;

      return {
        quarter: q,
        demandedHours,
        allocatedHours,
        availableCapacity,
        remainingHours,
        utilization,
        demandCount: qDemands.length,
      };
    });

    return summary;
  }

  async getSkillGapMatrix() {
    const staff = await this.staffRepo.find();
    const demands = await this.demandRepo.find();

    const skills = [
      'Credit',
      'IT/Cyber',
      'Operations',
      'Treasury',
      'AML',
      'Compliance',
    ];

    return skills.map((sk) => {
      const staffWithSkill = staff.filter((s) => s.primarySkill === sk);
      const totalStaff = staffWithSkill.length;
      const totalCapacity = staffWithSkill.reduce(
        (acc, s) => acc + s.netAvailableHours,
        0,
      );
      const totalDemand = demands
        .filter((d) => d.requiredSkill === sk)
        .reduce((acc, d) => acc + d.requiredHours, 0);

      const netBalance = totalCapacity - totalDemand;

      return {
        skill: sk,
        staffCount: totalStaff,
        totalCapacityHours: totalCapacity,
        totalDemandHours: totalDemand,
        netBalanceHours: netBalance,
        status: netBalance < 0 ? 'Shortage (Thiếu hụt)' : 'Sufficient (Đủ)',
      };
    });
  }
}
