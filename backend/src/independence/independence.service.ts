import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictDeclaration } from './entities/conflict-declaration.entity';
import { AuditorRotation } from './entities/auditor-rotation.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class IndependenceService implements OnModuleInit {
  constructor(
    @InjectRepository(ConflictDeclaration)
    private conflictRepo: Repository<ConflictDeclaration>,
    @InjectRepository(AuditorRotation)
    private rotationRepo: Repository<AuditorRotation>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    const rotCount = await this.rotationRepo.count();
    if (rotCount === 0) {
      await this.rotationRepo.save([
        {
          auditorName: 'Phạm Đức Thành',
          departmentName: 'Chi nhánh Hà Nội',
          lastAuditDate: '2025-06-15',
          nextAllowedAuditDate: '2026-12-31', // Restricted until end of 2026 for testing
          isRestricted: true,
        },
        {
          auditorName: 'Nguyễn Thị Lương',
          departmentName:
            'Quản lý Vận hành hạ tầng phần cứng, mạng & Helpdesk IT',
          lastAuditDate: '2024-11-20',
          nextAllowedAuditDate: '2025-11-20',
          isRestricted: false,
        },
      ]);
    }

    // Seed sample cooling-off user if none exists
    const users = await this.userRepo.find();
    if (users.length > 0) {
      const hasCooling = users.some(
        (u) => u.priorDepartments || u.coolingOffEndDate,
      );
      if (!hasCooling) {
        const target = users.find((u) => u.username !== 'admin') || users[0];
        if (target) {
          target.priorDepartments =
            'Phòng Tín dụng & Tài trợ Thương mại - Hội sở';
          target.coolingOffEndDate = '2026-11-30';
          await this.userRepo.save(target);
        }
      }
    }
  }

  getDeclarations() {
    return this.conflictRepo.find({
      relations: ['auditor'],
      order: { declaredAt: 'DESC' },
    });
  }

  createDeclaration(userId: number, data: any) {
    const hasConflict = !!data.hasConflict;
    const dec = this.conflictRepo.create({
      auditorId: data.auditorId || userId,
      year: data.year || new Date().getFullYear(),
      hasConflict,
      details: data.details,
      caeApprovalStatus: hasConflict ? 'Pending' : 'None',
    });
    return this.conflictRepo.save(dec);
  }

  async approveConflictException(id: number, user: any, notes: string) {
    const dec = await this.conflictRepo.findOne({ where: { id } });
    if (!dec) throw new NotFoundException('Conflict declaration not found');
    dec.caeApprovalStatus = 'Approved';
    dec.caeApprovedById = user?.userId || user?.id;
    dec.caeApprovedByName = user?.fullName || user?.username;
    dec.caeApprovedAt = new Date();
    dec.caeNotes = notes || 'Phê duyệt ngoại lệ với biện pháp kiểm soát giảm thiểu';
    return this.conflictRepo.save(dec);
  }

  async rejectConflictException(id: number, user: any, notes: string) {
    const dec = await this.conflictRepo.findOne({ where: { id } });
    if (!dec) throw new NotFoundException('Conflict declaration not found');
    dec.caeApprovalStatus = 'Rejected';
    dec.caeApprovedById = user?.userId || user?.id;
    dec.caeApprovedByName = user?.fullName || user?.username;
    dec.caeApprovedAt = new Date();
    dec.caeNotes = notes || 'Từ chối ngoại lệ xung đột lợi ích';
    return this.conflictRepo.save(dec);
  }

  getRotations() {
    return this.rotationRepo.find({ order: { nextAllowedAuditDate: 'ASC' } });
  }

  createRotation(data: Partial<AuditorRotation>) {
    return this.rotationRepo.save(this.rotationRepo.create(data));
  }

  async deleteRotation(id: number) {
    await this.rotationRepo.delete(id);
    return { success: true };
  }

  async getCoolingOff() {
    const users = await this.userRepo.find({
      relations: ['role'],
      order: { fullName: 'ASC' },
    });
    return users.filter((u) => u.priorDepartments || u.coolingOffEndDate);
  }

  async saveCoolingOff(data: {
    userId: number;
    priorDepartments: string;
    transferDate?: string;
    coolingOffEndDate: string;
  }) {
    const user = await this.userRepo.findOne({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('User not found');
    user.priorDepartments = data.priorDepartments;
    user.coolingOffEndDate = data.coolingOffEndDate;
    if (data.transferDate) {
      user.startDate = data.transferDate;
    }
    return this.userRepo.save(user);
  }

  async removeCoolingOff(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.priorDepartments = null as any;
      user.coolingOffEndDate = null as any;
      await this.userRepo.save(user);
    }
    return { success: true };
  }

  async checkAssignmentSafety(
    userId: number,
    auditorName: string,
    departmentName: string,
  ): Promise<{ safe: boolean; reason?: string }> {
    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Kiểm tra khai báo xung đột lợi ích (Conflict Declaration)
    const conflict = await this.conflictRepo.findOne({
      where: {
        auditorId: userId,
        year: currentYear,
        hasConflict: true,
      },
    });

    if (conflict) {
      const isRelevant = !conflict.details || conflict.details.toLowerCase().includes(departmentName.toLowerCase());
      if (isRelevant) {
        if (conflict.caeApprovalStatus === 'Approved') {
          // Ngoại lệ đã được Trưởng Ban KTNB phê duyệt với biện pháp kiểm soát bổ sung
          // Cho phép phân công nhưng ghi nhận cảnh báo
        } else {
          return {
            safe: false,
            reason: `Phát hiện xung đột lợi ích đã khai báo trong năm ${currentYear}: ${conflict.details || 'Có mối quan hệ gia đình hoặc lợi ích liên quan đến đơn vị này.'} (Trạng thái phê duyệt ngoại lệ: ${conflict.caeApprovalStatus || 'Chưa duyệt'}).`,
          };
        }
      }
    }

    // 2. Kiểm tra bắt buộc quay vòng kiểm toán viên theo Thông tư 13/2018/TT-NHNN (không kiểm toán liên tiếp quá 3 năm)
    const rotation = await this.rotationRepo.findOne({
      where: {
        auditorName,
        departmentName,
        isRestricted: true,
      },
    });

    if (rotation && rotation.nextAllowedAuditDate > todayStr) {
      return {
        safe: false,
        reason: `Bắt buộc phải quay vòng kiểm toán viên theo Thông tư 13/2018/TT-NHNN (Kiểm toán viên đã tham gia kiểm toán đơn vị này liên tục 3 năm trước đó). Ngày được phép kiểm toán lại: ${rotation.nextAllowedAuditDate}`,
      };
    }

    // 3. Kiểm tra cách ly đơn vị cũ (Cooling-Off 12 tháng theo IIA Standard 2.2)
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user && user.priorDepartments && user.coolingOffEndDate) {
      const isPastCoolingOff = user.coolingOffEndDate < todayStr;
      if (
        !isPastCoolingOff &&
        user.priorDepartments
          .toLowerCase()
          .includes(departmentName.toLowerCase())
      ) {
        return {
          safe: false,
          reason: `Vi phạm thời hạn cách ly độc lập (Cooling-off) theo Chuẩn mực IIA 2.2. Kiểm toán viên từng công tác tại đơn vị "${user.priorDepartments}" và đang trong thời hạn cách ly 12 tháng đến ngày ${user.coolingOffEndDate}.`,
        };
      }
    }

    return { safe: true };
  }
}
