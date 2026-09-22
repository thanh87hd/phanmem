import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditSchedule } from '../../audit-schedules/entities/audit-schedule.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { User } from '../../users/entities/user.entity';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';
import { LoopholeDetectionService } from './loophole-detection.service';

@Injectable()
export class ResourceAllocationService {
  private readonly logger = new Logger(ResourceAllocationService.name);

  constructor(
    @InjectRepository(AuditSchedule)
    private readonly scheduleRepo: Repository<AuditSchedule>,
    @InjectRepository(AuditEngagement)
    private readonly engagementRepo: Repository<AuditEngagement>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    private readonly loopholeDetectionService: LoopholeDetectionService,
  ) {}

  /**
   * Kiểm thử tải (Stress test)
   */
  async runStressTest(count: number) {
    this.logger.log(`Bắt đầu Stress Test với ${count} bản ghi...`);
    const findings: any[] = [];
    for (let i = 0; i < count; i++) {
      findings.push({
        findingTitle: `Sai phạm lặp lại mẫu #${i % 50}`,
        riskLevel: i % 10 === 0 ? 'High' : 'Medium',
        status: 'Open',
        condition: 'Mô tả hiện trạng stress test...',
        consequence: 'Hậu quả giả lập...',
        cause: 'Nguyên nhân giả lập...',
        recommendation: 'Kiến nghị giả lập...',
        criteria: 'Quy trình nội bộ v1.0',
        engagementId: 1,
      });

      if (findings.length >= 500) {
        await this.findingRepo.save(findings);
        findings.length = 0;
      }
    }

    const start = Date.now();
    const result = await this.loopholeDetectionService.runAiLoopholeDetection();
    const end = Date.now();
    const duration = (end - start) / 1000;

    return {
      totalProcessed: count,
      durationSeconds: duration,
      throughput: Math.round(count / duration),
      detectedLoopholes: result.detected,
      rating: duration < 2 ? 'Excellent' : 'Good',
    };
  }

  /**
   * Tự động phân bổ nguồn lực KTV bằng AI
   */
  async allocateResources(year: number = 2026) {
    this.logger.log(
      `[AI Planner] Bắt đầu tự động phân bổ nguồn lực KTV cho kế hoạch năm ${year}...`,
    );

    // 1. Xóa các lịch trình Proposed cũ
    await this.scheduleRepo.delete({ status: 'Proposed' });

    // 2. Lấy danh sách các cuộc kiểm toán đang lập kế hoạch (Planning)
    const engagements = await this.engagementRepo.find({
      where: { status: 'Planning' },
      order: { startDate: 'ASC' },
    });

    if (!engagements.length) {
      return {
        success: true,
        message:
          'Không có cuộc kiểm toán nào ở trạng thái Lập kế hoạch (Planning) cần phân bổ.',
        count: 0,
      };
    }

    // 3. Lấy tất cả nhân sự đang hoạt động
    const allUsers = await this.userRepo.find({ where: { isActive: true } });
    if (!allUsers.length) {
      return {
        success: false,
        message: 'Không có nhân sự nào hoạt động trong hệ thống.',
      };
    }

    const proposedSchedules: AuditSchedule[] = [];
    let scheduledEngagementsCount = 0;

    const checkOverlap = (s1: string, e1: string, s2: string, e2: string) => {
      return s1 <= e2 && s2 <= e1;
    };

    const getUserWorkload = async (userId: number, startDateStr: string) => {
      const yearStr = startDateStr.split('-')[0];
      const startOfYear = `${yearStr}-01-01`;
      const endOfYear = `${yearStr}-12-31`;

      const userSchedules = await this.scheduleRepo.find({
        where: {
          userId,
          startDate: Between(startOfYear, endOfYear),
        },
      });

      return userSchedules.reduce((sum, s) => {
        if (s.status === 'Cancelled' || s.status === 'Proposed') return sum;
        const days = Math.max(
          1,
          Math.round(
            (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        );
        return sum + days;
      }, 0);
    };

    for (const eng of engagements) {
      if (!eng.startDate || !eng.endDate) {
        this.logger.log(
          `[AI Planner] Bỏ qua cuộc kiểm toán "${eng.name}" vì thiếu ngày bắt đầu hoặc ngày kết thúc.`,
        );
        continue;
      }

      const teamUsers = allUsers.filter((u) => u.teamCode === eng.ownerTeam);
      const candidates = teamUsers.length > 0 ? teamUsers : allUsers;

      const availableCandidates: User[] = [];
      for (const candidate of candidates) {
        const overlappingSchedules = await this.scheduleRepo
          .createQueryBuilder('s')
          .where('s.userId = :userId', { userId: candidate.id })
          .andWhere('s.status IN (:...statuses)', {
            statuses: ['Planned', 'Confirmed', 'InProgress', 'Completed'],
          })
          .andWhere('s.startDate <= :endDate AND s.endDate >= :startDate', {
            startDate: eng.startDate,
            endDate: eng.endDate,
          })
          .getMany();

        const hasProposedOverlap = proposedSchedules.some(
          (ps) =>
            ps.userId === candidate.id &&
            checkOverlap(
              ps.startDate,
              ps.endDate,
              eng.startDate,
              eng.endDate,
            ) &&
            !ps.isBackup,
        );

        if (overlappingSchedules.length === 0 && !hasProposedOverlap) {
          availableCandidates.push(candidate);
        }
      }

      const activeCandidates =
        availableCandidates.length > 0 ? availableCandidates : candidates;

      let leadCandidate = activeCandidates.find((u) => {
        const title = (u.jobTitle || '').toLowerCase();
        return (
          title.includes('trưởng') ||
          title.includes('phó') ||
          title.includes('lead') ||
          title.includes('manager')
        );
      });

      if (!leadCandidate) {
        leadCandidate = activeCandidates[0];
      }

      if (!leadCandidate) continue;

      const leadSchedule = this.scheduleRepo.create({
        userId: leadCandidate.id,
        userName: leadCandidate.fullName,
        engagementId: eng.id,
        engagementName: eng.name,
        startDate: eng.startDate,
        endDate: eng.endDate,
        status: 'Proposed',
        teamCode: eng.ownerTeam,
        role: 'Trưởng đoàn kiểm toán',
        isBackup: false,
        location: eng.branchName || 'Tại chỗ',
        travelRequired: !!eng.branchName,
        notes: `[AI Đề xuất] Trưởng đoàn kiểm toán cho cuộc KT: ${eng.name}`,
      });
      proposedSchedules.push(leadSchedule);

      const memberCandidates = activeCandidates.filter(
        (u) => u.id !== leadCandidate.id,
      );

      const candidatesWithWorkload: any[] = [];
      for (const mc of memberCandidates) {
        const wl = await getUserWorkload(mc.id, eng.startDate);
        candidatesWithWorkload.push({ user: mc, workload: wl });
      }
      candidatesWithWorkload.sort((a, b) => a.workload - b.workload);

      const selectedMembers = candidatesWithWorkload
        .slice(0, 2)
        .map((cw) => cw.user);

      for (const member of selectedMembers) {
        const memberSchedule = this.scheduleRepo.create({
          userId: member.id,
          userName: member.fullName,
          engagementId: eng.id,
          engagementName: eng.name,
          startDate: eng.startDate,
          endDate: eng.endDate,
          status: 'Proposed',
          teamCode: eng.ownerTeam,
          role: 'Thành viên',
          isBackup: false,
          location: eng.branchName || 'Tại chỗ',
          travelRequired: !!eng.branchName,
          notes: `[AI Đề xuất] Thành viên đoàn kiểm toán: ${eng.name}`,
        });
        proposedSchedules.push(memberSchedule);
      }

      const remainingCandidates = memberCandidates.filter(
        (u) => !selectedMembers.some((sm) => sm.id === u.id),
      );

      let backupUser = remainingCandidates.find((u) => {
        const hasOverlap = proposedSchedules.some(
          (ps) =>
            ps.userId === u.id &&
            checkOverlap(ps.startDate, ps.endDate, eng.startDate, eng.endDate),
        );
        return !hasOverlap;
      });

      if (!backupUser && remainingCandidates.length > 0) {
        backupUser = remainingCandidates[0];
      }

      if (backupUser) {
        const backupSchedule = this.scheduleRepo.create({
          userId: backupUser.id,
          userName: backupUser.fullName,
          engagementId: eng.id,
          engagementName: eng.name,
          startDate: eng.startDate,
          endDate: eng.endDate,
          status: 'Proposed',
          teamCode: eng.ownerTeam,
          role: 'Dự phòng',
          isBackup: true,
          location: eng.branchName || 'Tại chỗ',
          travelRequired: false,
          notes: `[AI Đề xuất] Dự phòng hỗ trợ từ xa / thay thế nếu cần cho cuộc KT: ${eng.name}`,
        });
        proposedSchedules.push(backupSchedule);
      }

      scheduledEngagementsCount++;
    }

    if (proposedSchedules.length > 0) {
      await this.scheduleRepo.save(proposedSchedules);
    }

    return {
      success: true,
      message: `Đã đề xuất lập lịch tự động bằng AI thành công cho ${scheduledEngagementsCount} cuộc kiểm toán.`,
      engagementsAllocated: scheduledEngagementsCount,
      schedulesProposedCount: proposedSchedules.length,
    };
  }

  /**
   * Phê duyệt và chốt kế hoạch phân bổ nguồn lực năm
   */
  async approveAnnualPlan() {
    this.logger.log(
      '[AI Planner] Bắt đầu duyệt và chốt kế hoạch phân bổ nguồn lực năm...',
    );

    const proposedSchedules = await this.scheduleRepo.find({
      where: { status: 'Proposed' },
    });

    if (!proposedSchedules.length) {
      return {
        success: false,
        message: 'Không tìm thấy lịch trình đề xuất nào cần duyệt.',
      };
    }

    for (const schedule of proposedSchedules) {
      schedule.status = 'Planned';
    }
    await this.scheduleRepo.save(proposedSchedules);

    const engagementIds = [
      ...new Set(proposedSchedules.map((s) => s.engagementId)),
    ].filter(Boolean);

    let syncedCount = 0;
    for (const engagementId of engagementIds) {
      const engagement = await this.engagementRepo.findOne({
        where: { id: engagementId },
      });
      if (!engagement) continue;

      const engSchedules = proposedSchedules.filter(
        (s) => s.engagementId === engagementId,
      );

      const leadSchedule = engSchedules.find(
        (s) =>
          s.role === 'Trưởng đoàn kiểm toán' ||
          (!s.isBackup && s.role?.includes('Trưởng')),
      );
      if (leadSchedule) {
        engagement.leadAuditorId = leadSchedule.userId;
        engagement.legacyLeadAuditor = leadSchedule.userName;
      }

      const teamMembers = engSchedules
        .filter((s) => s.userId !== engagement.leadAuditorId)
        .map((s) => ({
          userId: s.userId,
          fullName: s.userName,
          role: s.role || 'Thành viên',
        }));

      engagement.teamMembers = teamMembers;

      if (engSchedules.length > 0) {
        engagement.startDate = engSchedules[0].startDate;
        engagement.endDate = engSchedules[0].endDate;
      }

      await this.engagementRepo.save(engagement);
      syncedCount++;
    }

    return {
      success: true,
      message: `Đã phê duyệt và chuyển đổi thành công ${proposedSchedules.length} lịch trình sang trạng thái Đã lên kế hoạch (Planned).`,
      engagementsSyncedCount: syncedCount,
    };
  }
}
