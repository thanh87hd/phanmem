import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AlertService implements OnModuleInit {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @InjectRepository(Recommendation)
    private readonly recRepo: Repository<Recommendation>,
    @InjectRepository(AuditReport)
    private readonly reportRepo: Repository<AuditReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  // Run at 8:00 AM every day
  @Cron('0 8 * * *')
  async handleOverdueRecommendations() {
    this.logger.log('Running Cron Job: Check Overdue Recommendations');

    const today = new Date().toISOString().split('T')[0];
    const overdueRecs = await this.recRepo
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.assignedToUser', 'user')
      .where('rec.status IN (:...statuses)', {
        statuses: ['NotStarted', 'InProgress'],
      })
      .andWhere('rec.dueDate < :today', { today })
      .getMany();

    if (overdueRecs.length > 0) {
      this.logger.warn(`Found ${overdueRecs.length} overdue recommendations.`);
      for (const rec of overdueRecs) {
        rec.status = 'Overdue';
        await this.recRepo.save(rec);

        if (rec.assignedToId) {
          await this.notificationsService.create({
            type: 'warning',
            title: 'Kiến nghị quá hạn',
            message: `Kiến nghị "${rec.recommendation.substring(0, 50)}..." đã quá hạn xử lý.`,
            recipientId: rec.assignedToId,
            relatedEntity: 'Recommendation',
            relatedEntityId: rec.id,
            link: '/recommendations',
          });

          if (rec.assignedToUser?.email) {
            await this.mailService
              .sendOverdueWarning(
                rec.assignedToUser.email,
                rec.recommendation,
                rec.dueDate,
                rec.legacyDepartment,
              )
              .catch((e) =>
                this.logger.error(
                  `Failed to send email to ${rec.assignedToUser.email}`,
                  e,
                ),
              );
          }
        }
      }
    }
  }

  // Run at 8:15 AM every day
  @Cron('15 8 * * *')
  async handlePendingReports() {
    this.logger.log('Running Cron Job: Check Pending Reports');

    const pendingReports = await this.reportRepo.find({
      where: { status: 'PendingReview' },
    });

    if (pendingReports.length > 0) {
      this.logger.warn(
        `Found ${pendingReports.length} reports pending review.`,
      );

      const approvers = await this.userRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('role.name IN (:...roles)', {
          roles: ['Admin', 'Trưởng Ban KTNB'],
        })
        .getMany();

      const approverIds = approvers.map((u) => u.id);

      if (approverIds.length > 0) {
        for (const report of pendingReports) {
          await this.notificationsService.broadcast(approverIds, {
            type: 'info',
            title: 'Báo cáo chờ duyệt',
            message: `Báo cáo "${report.title}" đang chờ được phê duyệt.`,
            relatedEntity: 'AuditReport',
            relatedEntityId: report.id,
            link: '/audit-reports',
          });
        }
      }
    }
  }

  async onModuleInit() {
    this.logger.log(
      'AlertService: checking birthday notifications on startup...',
    );
    await this.handleBirthdayNotifications();
  }

  // Run at 8:30 AM every day
  @Cron('30 8 * * *')
  async handleBirthdayNotifications() {
    this.logger.log('Running Cron Job: Check Birthday Notifications');

    // Get current local time parts
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth() + 1; // 1-based

    // Get tomorrow's day & month
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowDay = tomorrow.getDate();
    const tomorrowMonth = tomorrow.getMonth() + 1; // 1-based

    const currentYear = now.getFullYear();

    // Fetch all active users
    const users = await this.userRepo.find({ where: { isActive: true } });

    for (const user of users) {
      if (!user.birthDate) continue;

      // Parse birthDate "dd/mm/yyyy" or similar
      const parts = user.birthDate.split('/');
      if (parts.length < 2) continue;

      const birthDay = parseInt(parts[0], 10);
      const birthMonth = parseInt(parts[1], 10);

      if (isNaN(birthDay) || isNaN(birthMonth)) continue;

      // Check if tomorrow is user's birthday (1 day before) -> Send BIRTHDAY_ALERT
      if (birthDay === tomorrowDay && birthMonth === tomorrowMonth) {
        await this.sendBirthdayNotification(
          user.id,
          'BIRTHDAY_ALERT',
          currentYear,
          user.fullName,
        );
      }

      // Check if today is user's birthday -> Send BIRTHDAY_CARD
      if (birthDay === todayDay && birthMonth === todayMonth) {
        await this.sendBirthdayNotification(
          user.id,
          'BIRTHDAY_CARD',
          currentYear,
          user.fullName,
        );
      }
    }
  }

  private async sendBirthdayNotification(
    userId: number,
    type: 'BIRTHDAY_ALERT' | 'BIRTHDAY_CARD',
    year: number,
    fullName: string,
  ) {
    try {
      // Deduplicate: check if already sent this calendar year
      const existing = await this.notificationsService.findByUser(userId, 50);
      const alreadySent = existing.some(
        (n) => n.type === type && new Date(n.createdAt).getFullYear() === year,
      );

      if (alreadySent) {
        this.logger.log(
          `Birthday notification of type ${type} already sent to user ${userId} for year ${year}. Skipping.`,
        );
        return;
      }

      if (type === 'BIRTHDAY_ALERT') {
        await this.notificationsService.create({
          type: 'BIRTHDAY_ALERT',
          title: 'Sắp đến sinh nhật của bạn! 🎉',
          message: `Ngày mai là sinh nhật của bạn (${fullName})! Ban Kiểm soát và Khối KTNB chúc bạn có một ngày sinh nhật thật ấm áp và ý nghĩa sắp tới!`,
          recipientId: userId,
          link: '/dashboard',
        });
        this.logger.log(`Sent BIRTHDAY_ALERT notification to user ${userId}`);
      } else if (type === 'BIRTHDAY_CARD') {
        await this.notificationsService.create({
          type: 'BIRTHDAY_CARD',
          title: 'Chúc mừng sinh nhật! 🎂🎈',
          message: `Chúc mừng sinh nhật ${fullName}! Nhấp vào đây để mở thiệp chúc mừng sinh nhật từ Ban Kiểm soát và Khối KTNB nhé!`,
          recipientId: userId,
          link: '/dashboard',
        });
        this.logger.log(`Sent BIRTHDAY_CARD notification to user ${userId}`);
      }
    } catch (err) {
      this.logger.error(
        `Error sending birthday notification of type ${type} to user ${userId}:`,
        err,
      );
    }
  }

  // Run at 8:45 AM every day to check for late remediation plans (7 days after report issuance)
  @Cron('45 8 * * *')
  async handleLateRemediationPlans() {
    this.logger.log(
      'Running Cron Job: Check Late Remediation Plans (7 days after issuance)',
    );

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // 1. Fetch all issued reports
    const issuedReports = await this.reportRepo.find({
      where: { status: 'Issued' },
    });

    for (const report of issuedReports) {
      if (!report.date) continue;

      const reportDate = new Date(report.date);

      // Check if it's more than 7 days since report was issued
      if (reportDate < sevenDaysAgo) {
        if (!report.engagementId) continue;

        // Fetch all findings for this engagement
        const findings = await this.recRepo.manager
          .getRepository('AuditFinding')
          .find({
            where: { engagementId: report.engagementId },
          });

        if (findings.length === 0) continue;
        const findingIds = findings.map((f) => f.id);

        // Find recommendations that are still 'NotStarted' (no plan submitted)
        const pendingRecs = await this.recRepo
          .createQueryBuilder('rec')
          .leftJoinAndSelect('rec.assignedToUser', 'user')
          .where('rec.findingId IN (:...findingIds)', { findingIds })
          .andWhere('rec.status = :status', { status: 'NotStarted' })
          .getMany();

        if (pendingRecs.length > 0) {
          this.logger.warn(
            `Found ${pendingRecs.length} recommendations late in plan formulation for report: ${report.title}`,
          );

          for (const rec of pendingRecs) {
            // Update escalation level to 1 (Cảnh báo chậm lập kế hoạch)
            rec.escalationLevel = 1;
            rec.escalatedAt = new Date();
            await this.recRepo.save(rec);

            // Send in-app notification
            if (rec.assignedToId) {
              await this.notificationsService.create({
                type: 'warning',
                title: 'Trễ hạn lập kế hoạch khắc phục (7 ngày)',
                message: `Kiến nghị "${rec.recommendation.substring(0, 50)}..." thuộc báo cáo "${report.title}" chậm lập kế hoạch khắc phục quá 7 ngày.`,
                recipientId: rec.assignedToId,
                relatedEntity: 'Recommendation',
                relatedEntityId: rec.id,
                link: '/auditee-portal',
              });

              // Send email alert with Escalation Level
              if (rec.assignedToUser?.email) {
                const frontendUrl = this.configService.get(
                  'FRONTEND_URL',
                  'http://localhost:5173',
                );
                await this.mailService
                  .sendMail({
                    to: rec.assignedToUser.email,
                    subject: `[KTNB] [CẢNH BÁO NÂNG BẬC CẤP 1] Chậm lập kế hoạch khắc phục - ${rec.legacyDepartment}`,
                    html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #cf1322; border-radius: 8px;">
                      <h2 style="color: #cf1322; text-align: center;">🚨 CẢNH BÁO NÂNG BẬC CẢNH CÁO (CẤP ĐỘ 1)</h2>
                      <p style="font-weight: bold; color: #555;">Kính gửi Đơn vị phụ trách và Ban Lãnh đạo Đơn vị,</p>
                      <p>Hệ thống ghi nhận đơn vị <strong>${rec.legacyDepartment}</strong> đã chậm lập kế hoạch khắc phục quá <strong>7 ngày</strong> kể từ ngày phát hành báo cáo kiểm toán chính thức.</p>
                      
                      <div style="background-color: #fff1f0; border-left: 4px solid #cf1322; padding: 12px; margin: 16px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr><td style="padding: 4px 0; font-weight: bold; width: 150px;">Báo cáo kiểm toán:</td><td>${report.title}</td></tr>
                          <tr><td style="padding: 4px 0; font-weight: bold;">Ngày phát hành:</td><td>${report.date}</td></tr>
                          <tr><td style="padding: 4px 0; font-weight: bold;">Nội dung kiến nghị:</td><td>${rec.recommendation}</td></tr>
                          <tr><td style="padding: 4px 0; font-weight: bold;">Người chịu trách nhiệm:</td><td>${rec.assignedTo || 'Chưa phân công'}</td></tr>
                        </table>
                      </div>
                      
                      <p style="font-weight: bold; color: #cf1322;">⚠️ Hậu quả nâng bậc:</p>
                      <ul style="color: #555;">
                        <li><strong>Cấp độ 1 (Hiện tại):</strong> Cảnh báo trực tiếp tới Lãnh đạo Chi nhánh / Trưởng Đơn vị.</li>
                        <li><strong>Cấp độ 2 (Nếu chậm trễ tiếp tục):</strong> Báo cáo trực tiếp lên Giám đốc Vùng / Phó Tổng Giám đốc phụ trách ngành dọc.</li>
                      </ul>
                      
                      <p>Yêu cầu Lãnh đạo đơn vị khẩn trương đăng nhập vào <strong>Portal ĐVĐKT</strong> để cập nhật kế hoạch khắc phục và cam kết ngày hoàn thiện khắc phục cụ thể.</p>
                      
                      <div style="text-align: center; margin: 24px 0;">
                        <a href="${frontendUrl}/auditee-portal" style="background-color: #cf1322; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">TRUY CẬP PORTAL KHẮC PHỤC NGAY</a>
                      </div>
                      
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                      <p style="color: #999; font-size: 11px; text-align: center;">Email cảnh báo tự động từ Hệ thống Smart Audit LPBank</p>
                    </div>
                  `,
                  })
                  .catch((e) =>
                    this.logger.error(
                      `Failed to send escalation email to ${rec.assignedToUser.email}`,
                      e,
                    ),
                  );
              }
            }
          }
        }
      }
    }
  }
}
