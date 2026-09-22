import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ProcessLoophole } from '../entities/process-loophole.entity';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { ScopeFilterService } from '../../utils/scope-filter.service';

@Injectable()
export class LoopholeDetectionService {
  private readonly logger = new Logger(LoopholeDetectionService.name);

  constructor(
    @InjectRepository(ProcessLoophole)
    private readonly loopholeRepo: Repository<ProcessLoophole>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Trả về danh sách các lỗ hổng đã lưu trong DB
   */
  async analyzeProcessLoopholes() {
    return this.loopholeRepo.find({ order: { count: 'DESC' } });
  }

  /**
   * Kích hoạt quét và phát hiện các lỗ hổng quy trình lặp lại (Pending)
   */
  async runAiLoopholeDetection() {
    const findings = await this.findingRepo.find({ relations: ['engagement'] });
    const clusters: Record<string, any> = {};

    findings.forEach((f) => {
      const key = f.findingTitle;
      if (!clusters[key]) {
        clusters[key] = {
          title: f.findingTitle,
          count: 0,
          category: f.rootCauseCategory || 'Chưa phân loại',
          riskLevel: f.riskLevel,
          occurrences: [],
          criteria: f.criteria,
        };
      }
      clusters[key].count++;
      clusters[key].occurrences.push({
        engagement: f.engagement?.name,
        date: f.createdAt,
      });
    });

    const newLoopholes: any[] = [];
    for (const key of Object.keys(clusters)) {
      const c = clusters[key];
      if (c.count >= 2) {
        const existing = await this.loopholeRepo.findOne({
          where: { title: c.title },
        });

        let loopholeType = 'Điểm yếu Kiểm soát';
        let recommendation = 'Cần bổ sung chốt kiểm soát.';
        if (c.count >= 5) {
          loopholeType = 'Lỗ hổng Thiết kế Quy trình';
          recommendation = `Quy trình [${c.criteria || 'Nội bộ'}] không còn phù hợp. Cần rà soát và đơn giản hóa.`;
        }

        const data = {
          title: c.title,
          category: c.category,
          count: c.count,
          riskLevel: c.riskLevel,
          loopholeType,
          aiRecommendation: recommendation,
          severity:
            c.count >= 5 ? 'Critical' : c.count >= 3 ? 'High' : 'Medium',
          metadata: c.occurrences,
        };

        if (existing) {
          await this.loopholeRepo.update(existing.id, data);
        } else {
          const created = this.loopholeRepo.create({
            ...data,
            status: 'Pending',
          });
          await this.loopholeRepo.save(created);
          newLoopholes.push(created);
        }
      }
    }
    return { success: true, detected: newLoopholes.length };
  }

  async approveLoophole(id: number, approver: string) {
    const loophole = await this.loopholeRepo.findOne({ where: { id } });
    if (!loophole) return { success: false };

    await this.loopholeRepo.update(id, {
      status: 'Approved',
      approvedBy: approver,
      approvedAt: new Date(),
    });

    // Tìm tất cả các users có quyền nhận cảnh báo giám sát liên tục (CAE / Trưởng ban / Admin / Trưởng phòng)
    const users = await this.userRepo.find({
      relations: ['role'],
    });
    const recipientIds = users
      .filter((u) => {
        return (
          ScopeFilterService.isAdminRole(u.role?.name, u.jobTitle) ||
          ScopeFilterService.isDeptLeadRole(u.role?.name, u.jobTitle)
        );
      })
      .map((u) => u.id);

    if (recipientIds.length > 0) {
      await this.notificationsService.broadcast(recipientIds, {
        title: '🚨 CẢNH BÁO LỖ HỔNG QUY TRÌNH (AI)',
        message: `AI phát hiện lỗ hổng "${loophole.title}" với mức độ ${loophole.severity}. Đã được phê duyệt bởi ${approver}.`,
        type: 'Alert',
        link: '/process-analysis',
      });
    }

    return { success: true };
  }

  async rejectLoophole(id: number) {
    await this.loopholeRepo.update(id, { status: 'Rejected' });
    return { success: true };
  }

  async getMonthlyLoopholeReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const approvedLoopholes = await this.loopholeRepo.find({
      where: {
        status: 'Approved',
        approvedAt: Between(startDate, endDate),
      },
      order: { severity: 'DESC' },
    });

    const stats = {
      totalApproved: approvedLoopholes.length,
      criticalCount: approvedLoopholes.filter((l) => l.severity === 'Critical')
        .length,
      highCount: approvedLoopholes.filter((l) => l.severity === 'High').length,
      byCategory: {} as Record<string, number>,
    };

    approvedLoopholes.forEach((l) => {
      stats.byCategory[l.category] = (stats.byCategory[l.category] || 0) + 1;
    });

    return {
      period: `${month}/${year}`,
      stats,
      loopholes: approvedLoopholes,
    };
  }
}
