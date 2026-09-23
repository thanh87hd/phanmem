import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { OllamaService, OllamaChatMessage } from '../ollama.service';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../../recommendations/entities/recommendation.entity';
import { FindingKnowledge } from '../entities/finding-knowledge.entity';
import { RegulatoryKnowledge } from '../entities/regulatory-knowledge.entity';
import { WorkingPaper } from '../../working-papers/entities/working-paper.entity';
import { Evidence } from '../../evidences/entities/evidence.entity';
import { AuditReport } from '../../audit-reports/entities/audit-report.entity';
import { AuditPlan } from '../../audit-plans/entities/audit-plan.entity';
import { TrainingRecord } from '../../training/entities/training-record.entity';
import { RiskAssessment } from '../../risk-assessments/entities/risk-assessment.entity';
import { AuditTask } from '../../audit-tasks/entities/audit-task.entity';
import { KitaChatLog } from '../entities/kita-chat-log.entity';
import { AiResponseCache } from '../entities/ai-response-cache.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';
import { AuditSchedule } from '../../audit-schedules/entities/audit-schedule.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { CaslAbilityFactory, Action } from '../../casl/casl-ability.factory';
import {
  IntentClassifierService,
  KITA_INTENT_RULES,
} from './intent-classifier.service';
import {
  KITA_CHAT_SYSTEM_PROMPT,
  buildKitaContextMessage,
} from '../constants/prompts';
import type {
  ChatHistoryMessage,
  AssistantChatRequestDto,
} from '../interfaces/auditor-assistant.interface';

@Injectable()
export class KitaChatService {
  private readonly logger = new Logger(KitaChatService.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly intentClassifier: IntentClassifierService,
    private readonly notificationsService: NotificationsService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepo: Repository<Recommendation>,
    @InjectRepository(FindingKnowledge)
    private readonly kbRepo: Repository<FindingKnowledge>,
    @InjectRepository(RegulatoryKnowledge)
    private readonly regRepo: Repository<RegulatoryKnowledge>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(AuditSchedule)
    private readonly scheduleRepo: Repository<AuditSchedule>,
    @InjectRepository(AuditEngagement)
    private readonly engagementRepo: Repository<AuditEngagement>,
    @InjectRepository(WorkingPaper)
    private readonly wpRepo: Repository<WorkingPaper>,
    @InjectRepository(Evidence)
    private readonly evidenceRepo: Repository<Evidence>,
    @InjectRepository(AuditReport)
    private readonly reportRepo: Repository<AuditReport>,
    @InjectRepository(AuditPlan)
    private readonly planRepo: Repository<AuditPlan>,
    @InjectRepository(TrainingRecord)
    private readonly trainingRepo: Repository<TrainingRecord>,
    @InjectRepository(RiskAssessment)
    private readonly riskRepo: Repository<RiskAssessment>,
    @InjectRepository(AuditTask)
    private readonly taskRepo: Repository<AuditTask>,
    @InjectRepository(KitaChatLog)
    private readonly chatLogRepo: Repository<KitaChatLog>,
    @InjectRepository(AiResponseCache)
    private readonly cacheRepo: Repository<AiResponseCache>,
  ) {}

  // === Heuristic Intent Classification (< 1ms) ===
  private classifyIntentHeuristic(msg: string): {
    intent: string;
    score: number;
  } {
    let bestIntent = 'GENERAL';
    let bestScore = 0;

    for (const rule of KITA_INTENT_RULES) {
      let score = 0;
      for (const kw of rule.primaryKeywords) {
        if (msg.includes(kw)) score += 3;
      }
      for (const kw of rule.secondaryKeywords) {
        if (msg.includes(kw)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIntent = rule.intent;
      }
    }
    return { intent: bestIntent, score: bestScore };
  }

  // === Smart DB Query Router ===
  private async queryForIntent(
    intent: string,
    msg: string,
    user?: { userId?: number; username?: string },
  ): Promise<{ data: any; contextString: string; isEmpty: boolean }> {
    let fullUser: User | null = null;
    let ability: any = null;

    if (user?.userId) {
      fullUser = await this.userRepo.findOne({
        where: { id: user.userId },
        relations: ['role'],
      });
      if (fullUser) {
        ability = this.caslAbilityFactory.createForUser(fullUser);
      }
    }

    let data: any = {};
    const contextParts: string[] = [];
    let isEmpty = true;

    switch (intent) {
      case 'AUDIT_PLAN': {
        if (ability && ability.cannot(Action.Read, AuditEngagement)) {
          return {
            data: {},
            contextString:
              'Bạn không có quyền truy cập thông tin Cuộc kiểm toán/Kế hoạch theo chính sách phân quyền (ABAC).',
            isEmpty: true,
          };
        }

        const engagements = await this.engagementRepo.find({
          take: 10,
          order: { startDate: 'DESC' },
        });
        const plans = await this.planRepo.find({
          take: 5,
          order: { year: 'DESC' },
        });
        const schedules = await this.scheduleRepo.find({
          take: 10,
          order: { startDate: 'DESC' },
        });
        data = { engagements, plans, schedules };
        if (engagements.length) {
          contextParts.push('Danh sách cuộc kiểm toán trong CSDL:');
          engagements.forEach((e) =>
            contextParts.push(
              `- ${e.name}: đơn vị ${e.legacyAuditedDepartment || 'N/A'}, trạng thái ${e.status}, từ ${e.startDate} đến ${e.endDate}, trưởng đoàn ${e.legacyLeadAuditor || 'Chưa phân công'}, phòng phụ trách ${e.ownerTeam}`,
            ),
          );
          isEmpty = false;
        }
        if (plans.length) {
          contextParts.push('Kế hoạch kiểm toán năm:');
          plans.forEach((p) =>
            contextParts.push(
              `- ${p.name} (${p.year}): trạng thái ${p.status}, phòng ${p.ownerTeam}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'FINDING': {
        const rawFindings = await this.findingRepo.find({
          take: 50,
          order: { createdAt: 'DESC' },
          relations: ['engagement'],
        });

        const findings = ability
          ? rawFindings.filter((f) => ability.can(Action.Read, f)).slice(0, 10)
          : rawFindings.slice(0, 10);
        const knowledgeBase = await this.kbRepo.find();
        data = { findings, knowledgeBase };
        if (findings.length) {
          contextParts.push('Phát hiện kiểm toán gần đây trong CSDL:');
          findings.forEach((f) =>
            contextParts.push(
              `- [${f.riskLevel}] ${f.findingTitle}: ${f.condition?.substring(0, 100)}... (Cuộc KT: ${f.engagement?.name || 'N/A'}, trạng thái: ${f.status})`,
            ),
          );
          isEmpty = false;
        }
        if (knowledgeBase.length) {
          contextParts.push('Kho tri thức sai phạm mẫu:');
          knowledgeBase.forEach((k) =>
            contextParts.push(
              `- ${k.title} [${k.riskLevel}]: ${k.description?.substring(0, 80)}...`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'REGULATION_SPECIFIC_13': {
        const reg = await this.regRepo.findOne({
          where: { code: '13/2018/TT-NHNN' },
        });
        data = { regulation: reg };
        if (reg) {
          contextParts.push(`Thông tư 13/2018/TT-NHNN - ${reg.title}:`);
          contextParts.push(reg.fullContent || reg.summary);
          isEmpty = false;
        }
        break;
      }
      case 'REGULATION_SPECIFIC_83': {
        const reg = await this.regRepo.findOne({
          where: { code: '83/2025/TT-NHNN' },
        });
        data = { regulation: reg };
        if (reg) {
          contextParts.push(`Thông tư 83/2025/TT-NHNN - ${reg.title}:`);
          contextParts.push(reg.fullContent || reg.summary);
          isEmpty = false;
        }
        break;
      }
      case 'REGULATION': {
        const regulations = await this.regRepo.find({ order: { type: 'ASC' } });
        data = { regulations };
        if (regulations.length) {
          contextParts.push('Thư viện văn bản pháp quy trong CSDL:');
          regulations.forEach((r) =>
            contextParts.push(
              `- [${r.type}] ${r.code} - ${r.title}: ${r.summary}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'CREDIT': {
        const reg13 = await this.regRepo.findOne({
          where: { code: '13/2018/TT-NHNN' },
        });
        const reg83 = await this.regRepo.findOne({
          where: { code: '83/2025/TT-NHNN' },
        });
        const creditFindings = await this.findingRepo
          .createQueryBuilder('f')
          .where(
            "LOWER(f.findingTitle) LIKE '%tín dụng%' OR LOWER(f.findingTitle) LIKE '%thẩm định%' OR LOWER(f.findingTitle) LIKE '%giải ngân%'",
          )
          .take(5)
          .getMany();
        const creditKb = await this.kbRepo.find({
          where: { category: 'Tín dụng' },
        });
        data = { reg13, reg83, creditFindings, creditKb };
        if (reg13) {
          contextParts.push(
            `Thông tư 13/2018 (Điều 14): ${reg13.fullContent?.substring(0, 300) || reg13.summary}`,
          );
          isEmpty = false;
        }
        if (reg83) {
          contextParts.push(
            `Thông tư 83/2025 (Điều 8): ${reg83.fullContent?.substring(0, 300) || reg83.summary}`,
          );
          isEmpty = false;
        }
        if (creditKb.length) {
          creditKb.forEach((k) =>
            contextParts.push(
              `Sai phạm mẫu Tín dụng: ${k.title} - ${k.description}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'IT_SYSTEM': {
        const reg13 = await this.regRepo.findOne({
          where: { code: '13/2018/TT-NHNN' },
        });
        const itKb = await this.kbRepo.find({
          where: { category: 'Công nghệ' },
        });
        data = { reg13, itKb };
        if (reg13) {
          contextParts.push(
            `Thông tư 13/2018 (Điều 23): ${reg13.fullContent?.substring(0, 300) || reg13.summary}`,
          );
          isEmpty = false;
        }
        if (itKb.length) {
          itKb.forEach((k) =>
            contextParts.push(
              `Sai phạm mẫu CNTT: ${k.title} - ${k.description}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'RECOMMENDATION': {
        const recs = await this.recommendationRepo.find({
          take: 10,
          order: { createdAt: 'DESC' },
        });
        const overdueRecs = recs.filter(
          (r) =>
            r.status === 'Overdue' ||
            (r.dueDate &&
              new Date(r.dueDate) < new Date() &&
              r.status !== 'Verified' &&
              r.status !== 'Completed'),
        );
        data = { recommendations: recs, overdueRecs };
        if (recs.length) {
          contextParts.push(
            `Tổng số kiến nghị: ${recs.length}. Quá hạn: ${overdueRecs.length}.`,
          );
          const statusCounts: Record<string, number> = {};
          recs.forEach((r) => {
            statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
          });
          contextParts.push(
            `Phân bổ trạng thái: ${Object.entries(statusCounts)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')}`,
          );
          recs
            .slice(0, 8)
            .forEach((r) =>
              contextParts.push(
                `- KN: "${r.finding}" → ${r.recommendation?.substring(0, 80)}... | Đơn vị: ${r.legacyDepartment} | Trạng thái: ${r.status} | Hạn: ${r.dueDate || 'N/A'} | Tiến độ: ${r.progressPercent}%`,
              ),
            );
          isEmpty = false;
        }
        break;
      }
      case 'DEPARTMENT': {
        const depts = await this.deptRepo.find({
          order: { unitType: 'ASC', name: 'ASC' },
        });
        data = { departments: depts };
        if (depts.length) {
          const byType: Record<string, number> = {};
          depts.forEach((d) => {
            byType[d.unitType] = (byType[d.unitType] || 0) + 1;
          });
          contextParts.push(
            `Tổng số đơn vị: ${depts.length}. Phân loại: ${Object.entries(
              byType,
            )
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')}`,
          );
          depts.forEach((d) =>
            contextParts.push(
              `- ${d.name} (${d.code}): loại ${d.unitType}, trạng thái ${d.status}${d.parentId ? ', trực thuộc đơn vị #' + d.parentId : ''}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'PERSONNEL': {
        const users = await this.userRepo.find({
          where: { isActive: true },
          relations: ['role'],
        });
        // Lọc cán bộ được hỏi cụ thể
        const mentionedUsers = users.filter((u) => {
          const nameLower = u.fullName.toLowerCase();
          const usernameLower = u.username.toLowerCase();
          const lastName = nameLower.split(' ').pop() || '';
          return (
            msg.includes(usernameLower) ||
            msg.includes(nameLower) ||
            (lastName.length >= 2 && msg.includes(lastName))
          );
        });
        const relevantUsers =
          mentionedUsers.length > 0 ? mentionedUsers : users.slice(0, 10);
        data = { users: relevantUsers, totalUsers: users.length };
        if (relevantUsers.length) {
          contextParts.push(
            `Tổng số cán bộ đang hoạt động: ${users.length}. ${mentionedUsers.length > 0 ? 'Cán bộ được hỏi cụ thể:' : 'Một số cán bộ tiêu biểu:'}`,
          );
          relevantUsers.forEach((u) =>
            contextParts.push(
              `- ${u.fullName} (username: ${u.username}): chức danh ${u.jobTitle || 'KTV'}, email ${u.email || 'N/A'}, SĐT di động ${u.phone || 'N/A'}, SĐT cố định ${u.landlinePhone || 'N/A'}, nơi làm việc ${u.workplace || 'Hội sở'}, phòng ${u.teamCode || 'N/A'}, vai trò ${u.role?.name || 'N/A'}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'RISK': {
        const risks = await this.riskRepo.find({
          take: 10,
          order: { totalScore: 'DESC' },
        });
        data = { riskAssessments: risks };
        if (risks.length) {
          contextParts.push(
            'Đánh giá rủi ro trong CSDL (sắp xếp theo điểm giảm dần):',
          );
          risks.forEach((r) =>
            contextParts.push(
              `- ${r.legacyUniverseName}: điểm tổng ${r.totalScore}, mức ${r.riskLevel}, kiểm soát ${r.controlEffectiveness}, residual ${r.residualRiskScore}, xu hướng ${r.riskVelocity}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'REPORT': {
        const reports = await this.reportRepo.find({
          take: 10,
          order: { createdAt: 'DESC' },
        });
        const totalFindings = await this.findingRepo.count();
        const totalRecs = await this.recommendationRepo.count();
        data = { reports, totalFindings, totalRecs };
        if (reports.length) {
          contextParts.push(
            `Thống kê tổng quan: ${totalFindings} phát hiện, ${totalRecs} kiến nghị.`,
          );
          contextParts.push('Báo cáo kiểm toán gần đây:');
          reports.forEach((r) =>
            contextParts.push(
              `- ${r.title}: trạng thái ${r.status}, đánh giá ${r.auditRating || 'N/A'}, ngày ${r.date || 'N/A'}`,
            ),
          );
          isEmpty = false;
        } else {
          contextParts.push(
            `Thống kê tổng quan: ${totalFindings} phát hiện, ${totalRecs} kiến nghị. Chưa có báo cáo nào.`,
          );
          if (totalFindings > 0 || totalRecs > 0) isEmpty = false;
        }
        break;
      }
      case 'WORKING_PAPER': {
        const wps = await this.wpRepo.find({
          take: 10,
          order: { createdAt: 'DESC' },
        });
        data = { workingPapers: wps };
        if (wps.length) {
          contextParts.push('Giấy tờ làm việc gần đây trong CSDL:');
          wps.forEach((w) =>
            contextParts.push(
              `- ${w.title} (${w.referenceCode || 'N/A'}): trạng thái ${w.status}, KTV lập ${w.legacyCreator || 'N/A'}, cuộc KT #${w.engagementId || 'N/A'}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'EVIDENCE': {
        const evidences = await this.evidenceRepo.find({
          take: 10,
          order: { uploadedAt: 'DESC' },
        });
        data = { evidences };
        if (evidences.length) {
          contextParts.push('Tài liệu minh chứng gần đây:');
          evidences.forEach((ev) =>
            contextParts.push(
              `- ${ev.originalName}: AI verification ${ev.aiVerificationStatus}, upload bởi ${ev.uploadedByName || 'N/A'}, mô tả: ${ev.description || 'N/A'}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'SCHEDULE': {
        const schedules = await this.scheduleRepo.find({
          take: 10,
          order: { startDate: 'DESC' },
        });
        data = { schedules };
        if (schedules.length) {
          contextParts.push('Lịch trình phân bổ nguồn lực:');
          schedules.forEach((s) =>
            contextParts.push(
              `- ${s.userName}: ${s.role || 'Thành viên'} cho "${s.engagementName}" từ ${s.startDate} đến ${s.endDate}, trạng thái ${s.status}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      case 'TRAINING': {
        const trainings = await this.trainingRepo.find({
          take: 10,
          order: { startDate: 'DESC' },
        });
        data = { trainings };
        if (trainings.length) {
          contextParts.push('Hồ sơ đào tạo gần đây:');
          trainings.forEach((t) =>
            contextParts.push(
              `- ${t.userName}: khóa "${t.courseName}" (${t.category}), ${t.cpeHours} giờ CPE, trạng thái ${t.status}, từ ${t.startDate} đến ${t.endDate}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
      default: {
        // GENERAL: thu thập context tổng quan nhẹ
        const totalEngs = await this.engagementRepo.count();
        const totalFindings = await this.findingRepo.count();
        const totalRecs = await this.recommendationRepo.count();
        const totalUsers = await this.userRepo.count({
          where: { isActive: true },
        });
        data = { totalEngs, totalFindings, totalRecs, totalUsers };
        contextParts.push(
          `Tổng quan CSDL Smart Audit: ${totalEngs} cuộc kiểm toán, ${totalFindings} phát hiện, ${totalRecs} kiến nghị, ${totalUsers} cán bộ đang hoạt động.`,
        );
        // Check for potential user mentions
        const users = await this.userRepo.find({ where: { isActive: true } });
        const mentionedUsers2 = users.filter((u) => {
          const nameLower = u.fullName.toLowerCase();
          const lastName = nameLower.split(' ').pop() || '';
          return (
            msg.includes(u.username.toLowerCase()) ||
            msg.includes(nameLower) ||
            (lastName.length >= 2 && msg.includes(lastName))
          );
        });
        if (mentionedUsers2.length > 0) {
          contextParts.push('Cán bộ liên quan:');
          mentionedUsers2.forEach((u) =>
            contextParts.push(
              `- ${u.fullName} (${u.username}): ${u.jobTitle || 'KTV'}, email ${u.email || 'N/A'}, SĐT ${u.phone || 'N/A'}, SĐT CĐ ${u.landlinePhone || 'N/A'}, nơi làm việc ${u.workplace || 'Hội sở'}`,
            ),
          );
          isEmpty = false;
        }
        break;
      }
    }

    return { data, contextString: contextParts.join('\n'), isEmpty };
  }

  // === Heuristic Response Builder (khi Ollama không khả dụng) ===
  private buildHeuristicResponse(
    intent: string,
    data: any,
    msg: string,
  ): string {
    switch (intent) {
      case 'AUDIT_PLAN': {
        const engs = data.engagements || [];
        const plans = data.plans || [];
        let reply = `👋 Xin chào! Tôi là **Kita - Trợ lý ảo kiểm toán thông minh của LPBank**.\n\n`;
        if (plans.length) {
          reply += `📋 **Kế hoạch kiểm toán:**\n`;
          plans.forEach((p: any) => {
            reply += `- **${p.name}** (${p.year}): Trạng thái \`${p.status}\`, phòng phụ trách ${p.ownerTeam}\n`;
          });
          reply += '\n';
        }
        if (engs.length) {
          reply += `📅 **Danh sách cuộc kiểm toán (${engs.length} cuộc):**\n`;
          engs.forEach((e: any) => {
            reply += `- **${e.name}**: Đơn vị *${e.legacyAuditedDepartment || 'N/A'}*, trạng thái \`${e.status}\`, từ **${e.startDate}** đến **${e.endDate}**, Trưởng đoàn **${e.legacyLeadAuditor || 'Chưa phân công'}**\n`;
          });
        }
        reply += `\n💡 Bạn có thể hỏi thêm về một cuộc kiểm toán cụ thể hoặc yêu cầu tôi phân tích rủi ro chi tiết.`;
        return reply;
      }
      case 'FINDING': {
        const findings = data.findings || [];
        const kb = data.knowledgeBase || [];
        let reply = `👋 Tôi là **Kita**.\n\n`;
        if (findings.length) {
          reply += `🔍 **Phát hiện kiểm toán gần đây (${findings.length} bản ghi):**\n`;
          findings.slice(0, 5).forEach((f: any) => {
            reply += `- 🚨 **[${f.riskLevel}] ${f.findingTitle}**: ${f.condition?.substring(0, 100)}... | Trạng thái: \`${f.status}\`\n`;
          });
          reply += '\n';
        }
        if (kb.length) {
          reply += `📚 **Kho tri thức sai phạm mẫu:**\n`;
          kb.forEach((k: any) => {
            reply += `- **${k.title}** [${k.riskLevel}]: ${k.suggestedRecommendation}\n`;
          });
        }
        return reply;
      }
      case 'REGULATION_SPECIFIC_13': {
        const reg = data.regulation;
        let reply = `👋 Tôi là **Kita**.\n\nDựa trên Thư viện Pháp quy, thông tin về **Thông tư 13/2018/TT-NHNN**:\n\n`;
        if (reg) {
          reply += `📌 **${reg.title}** (${reg.code})\n\n📝 **Nội dung trọng yếu:**\n${reg.fullContent}\n\n`;
          reply += `💡 **Ứng dụng:** Đối chiếu khi phát hiện thiếu chốt kiểm soát chéo (Tín dụng - Điều 14) hoặc downtime Core Banking (IT - Điều 23).`;
        }
        return reply;
      }
      case 'REGULATION_SPECIFIC_83': {
        const reg = data.regulation;
        let reply = `👋 Tôi là **Kita**.\n\nThông tin về **Thông tư 83/2025/TT-NHNN**:\n\n`;
        if (reg) {
          reply += `📌 **${reg.title}** (${reg.code})\n\n📝 **Nội dung trọng yếu:**\n${reg.fullContent}\n\n`;
          reply += `💡 **Ứng dụng:** Cơ chế tự động ngăn chặn cấp tín dụng vượt hạn mức phê duyệt.`;
        }
        return reply;
      }
      case 'REGULATION': {
        const regs = data.regulations || [];
        let reply = `👋 Tôi là **Kita**.\n\n📚 **Thư viện Văn bản Pháp quy (${regs.length} văn bản):**\n\n`;
        regs.forEach((r: any) => {
          reply += `📌 **[${r.type}] ${r.code} - ${r.title}**\n- ${r.summary}\n- Quy trình: ${r.legacyBusinessProcess || 'Ngân hàng'}\n\n`;
        });
        reply += `💡 Hãy hỏi cụ thể số hiệu văn bản (VD: "Thông tư 13") để tôi cung cấp nội dung chi tiết.`;
        return reply;
      }
      case 'CREDIT': {
        let reply = `👋 Tôi là **Kita - Trợ lý thông minh LPBank**.\n\n**Phương pháp & Thủ tục kiểm toán Tín dụng:**\n\n`;
        reply += `📚 **1. Cơ sở pháp lý:**\n`;
        if (data.reg13)
          reply += `- Thông tư 13/2018 (Điều 14): Kiểm soát chéo thẩm định, phê duyệt tín dụng.\n`;
        if (data.reg83)
          reply += `- Thông tư 83/2025 (Điều 8): Cơ chế tự động chặn giải ngân vượt hạn mức.\n\n`;
        reply += `🧐 **2. Thủ tục kiểm toán:**\n`;
        reply += `- Vouching: Kiểm tra hồ sơ thẩm định tài sản thế chấp\n`;
        reply += `- Cross-check: Đối chiếu giải ngân Core vs phê duyệt\n`;
        reply += `- Exception Test: Khoản vay vượt hạn mức\n\n`;
        if (data.creditKb?.length) {
          reply += `💡 **3. Sai phạm thường gặp:**\n`;
          data.creditKb.forEach((k: any) => {
            reply += `- ${k.title}: ${k.suggestedRecommendation}\n`;
          });
        }
        return reply;
      }
      case 'IT_SYSTEM': {
        let reply = `👋 Tôi là **Kita**.\n\n**Kiểm toán Hệ thống CNTT & An toàn thông tin:**\n\n`;
        if (data.reg13)
          reply += `📚 **Căn cứ pháp lý:** Thông tư 13/2018 (Điều 23) - Duy trì tính liên tục Core Banking.\n\n`;
        reply += `🧐 **Thủ tục kiểm tra:**\n- Rà soát System Logs đo lường downtime\n- Kiểm tra cơ chế DR/DRS failover\n- Đánh giá RTO/RPO thực tế vs SLA\n\n`;
        if (data.itKb?.length) {
          reply += `💡 **Sai phạm mẫu:**\n`;
          data.itKb.forEach((k: any) => {
            reply += `- ${k.title}: ${k.suggestedRecommendation}\n`;
          });
        }
        return reply;
      }
      case 'RECOMMENDATION': {
        const recs = data.recommendations || [];
        const overdue = data.overdueRecs || [];
        let reply = `👋 Tôi là **Kita**.\n\n📊 **Tình hình theo dõi kiến nghị:**\n`;
        reply += `- Tổng kiến nghị: **${recs.length}**\n- Quá hạn: **${overdue.length}**\n\n`;
        if (recs.length) {
          const statusCounts: Record<string, number> = {};
          recs.forEach((r: any) => {
            statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
          });
          reply += `📈 **Phân bổ trạng thái:** ${Object.entries(statusCounts)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')}\n\n`;
          reply += `📋 **Chi tiết kiến nghị gần đây:**\n`;
          recs.slice(0, 5).forEach((r: any) => {
            reply += `- "${r.finding}" → Đơn vị: *${r.legacyDepartment}*, trạng thái: \`${r.status}\`, tiến độ: ${r.progressPercent}%, hạn: ${r.dueDate || 'N/A'}\n`;
          });
        }
        return reply;
      }
      case 'DEPARTMENT': {
        const depts = data.departments || [];
        let reply = `👋 Tôi là **Kita**.\n\n🏢 **Cơ cấu tổ chức (${depts.length} đơn vị):**\n\n`;
        const byType: Record<string, any[]> = {};
        depts.forEach((d: any) => {
          if (!byType[d.unitType]) byType[d.unitType] = [];
          byType[d.unitType].push(d);
        });
        Object.entries(byType).forEach(([type, units]) => {
          reply += `📂 **${type}** (${units.length} đơn vị): ${units.map((u) => u.name).join(', ')}\n`;
        });
        return reply;
      }
      case 'PERSONNEL': {
        const users = data.users || [];
        let reply = `👋 Tôi là **Kita**.\n\n👤 **Thông tin nhân sự** (Tổng: ${data.totalUsers} cán bộ đang hoạt động):\n\n`;
        users.forEach((u: any) => {
          reply += `- **${u.fullName}** (${u.username})\n  📧 Email: ${u.email || 'N/A'} | 📱 DĐ: ${u.phone || 'N/A'} | ☎️ CĐ: ${u.landlinePhone || 'N/A'}\n  💼 Chức danh: ${u.jobTitle || 'KTV'} | 🏢 Nơi làm việc: ${u.workplace || 'Hội sở'} | 👥 Phòng: ${u.teamCode || 'N/A'}\n\n`;
        });
        return reply;
      }
      case 'RISK': {
        const risks = data.riskAssessments || [];
        let reply = `👋 Tôi là **Kita**.\n\n🎯 **Đánh giá rủi ro (${risks.length} quy trình):**\n\n`;
        risks.forEach((r: any) => {
          reply += `- **${r.legacyUniverseName}**: Điểm ${r.totalScore} | Mức \`${r.riskLevel}\` | Kiểm soát: ${r.controlEffectiveness} | Xu hướng: ${r.riskVelocity}\n`;
        });
        return reply;
      }
      case 'REPORT': {
        const reports = data.reports || [];
        let reply = `👋 Tôi là **Kita**.\n\n📊 **Tổng quan hệ thống:** ${data.totalFindings || 0} phát hiện, ${data.totalRecs || 0} kiến nghị.\n\n`;
        if (reports.length) {
          reply += `📄 **Báo cáo kiểm toán gần đây:**\n`;
          reports.forEach((r: any) => {
            reply += `- **${r.title}**: Trạng thái \`${r.status}\`, đánh giá \`${r.auditRating || 'N/A'}\`\n`;
          });
        }
        return reply;
      }
      case 'WORKING_PAPER': {
        const wps = data.workingPapers || [];
        let reply = `👋 Tôi là **Kita**.\n\n📝 **Giấy tờ làm việc gần đây (${wps.length}):**\n\n`;
        wps.forEach((w: any) => {
          reply += `- **${w.title}** (${w.referenceCode || 'N/A'}): Trạng thái \`${w.status}\`, KTV: ${w.legacyCreator || 'N/A'}\n`;
        });
        reply += `\n💡 Bạn có thể dùng tính năng "Gợi ý AI" trong màn hình GTLV để tôi tự động xây dựng khung thủ tục chuẩn IIA.`;
        return reply;
      }
      case 'EVIDENCE': {
        const evs = data.evidences || [];
        let reply = `👋 Tôi là **Kita**.\n\n📎 **Tài liệu minh chứng gần đây (${evs.length}):**\n\n`;
        evs.forEach((ev: any) => {
          reply += `- **${ev.originalName}**: AI verification \`${ev.aiVerificationStatus}\`, upload bởi ${ev.uploadedByName || 'N/A'}\n`;
        });
        return reply;
      }
      case 'SCHEDULE': {
        const scheds = data.schedules || [];
        let reply = `👋 Tôi là **Kita**.\n\n📅 **Lịch trình phân bổ nguồn lực (${scheds.length}):**\n\n`;
        scheds.forEach((s: any) => {
          reply += `- **${s.userName}** → ${s.role || 'Thành viên'} tại "${s.engagementName}" (${s.startDate} → ${s.endDate}), trạng thái \`${s.status}\`\n`;
        });
        return reply;
      }
      case 'TRAINING': {
        const trainings = data.trainings || [];
        let reply = `👋 Tôi là **Kita**.\n\n🎓 **Hồ sơ đào tạo gần đây (${trainings.length}):**\n\n`;
        trainings.forEach((t: any) => {
          reply += `- **${t.userName}**: "${t.courseName}" (${t.category}), ${t.cpeHours} giờ CPE, \`${t.status}\`\n`;
        });
        return reply;
      }
      default:
        return '';
    }
  }

  // === Ollama LLM Chat with Context ===
  private async runLlmKitaChat(
    message: string,
    contextString: string,
    history: ChatHistoryMessage[],
  ): Promise<string> {
    const messages: OllamaChatMessage[] = [
      {
        role: 'system',
        content: KITA_CHAT_SYSTEM_PROMPT,
      },
    ];

    // Add conversation history (last 4 messages)
    const recentHistory = (history || []).slice(-4);
    for (const h of recentHistory) {
      const role: 'user' | 'assistant' =
        h.sender === 'user' || h.role === 'user' ? 'user' : 'assistant';
      const content = h.text || h.content || '';
      messages.push({
        role,
        content,
      });
    }

    messages.push({
      role: 'user',
      content: buildKitaContextMessage(contextString, message),
    });

    const response = await this.ollamaService.chat({
      messages,
      temperature: 0.5,
      timeoutMs: 180000,
    });

    return response || '';
  }

  // === Save Chat Log ===
  async saveChatLog(
    userQuestion: string,
    kitaReply: string,
    intent: string,
    source: string,
    category: string,
    isFallback: boolean,
    responseTimeMs: number,
    user?: { userId?: number; username?: string },
  ) {
    try {
      const log = new KitaChatLog();
      log.userQuestion = userQuestion;
      log.kitaReply = kitaReply;
      log.intent = intent;
      log.source = source;
      log.category = category;
      log.isFallback = isFallback;
      log.responseTimeMs = responseTimeMs;
      log.userId =
        user?.userId !== undefined && user?.userId !== null
          ? Number(user.userId)
          : null;
      log.username = user?.username || 'Ẩn danh';
      await this.chatLogRepo.save(log);
    } catch (err) {
      this.logger.error(`Error saving Kita chat log: ${err.message}`);
    }
  }

  async getChatLogs() {
    return this.chatLogRepo.find({
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async getChatAnalytics() {
    const totalQuestions = await this.chatLogRepo.count();

    const avgResponse = await this.chatLogRepo
      .createQueryBuilder('log')
      .select('AVG(log.responseTimeMs)', 'avgTime')
      .getRawOne();

    const intentDist = await this.chatLogRepo
      .createQueryBuilder('log')
      .select('log.intent', 'intent')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.intent')
      .orderBy('count', 'DESC')
      .getRawMany();

    const sourceDist = await this.chatLogRepo
      .createQueryBuilder('log')
      .select('log.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.source')
      .orderBy('count', 'DESC')
      .getRawMany();

    const fallbackCount = await this.chatLogRepo.count({
      where: { isFallback: true },
    });
    const fallbackRate =
      totalQuestions > 0
        ? Math.round((fallbackCount / totalQuestions) * 100)
        : 0;

    const dailyVolume = await this.chatLogRepo
      .createQueryBuilder('log')
      .select('DATE(log.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy('DATE(log.createdAt)')
      .orderBy('date', 'ASC')
      .limit(14)
      .getRawMany();

    const allLogs = await this.chatLogRepo.find({ select: ['userQuestion'] });
    const keywordMap: Record<string, number> = {};
    const commonWords = new Set([
      'có',
      'bao',
      'nhiêu',
      'của',
      'là',
      'gì',
      'cho',
      'tôi',
      'xem',
      'hỏi',
      'về',
      'trong',
      'những',
      'đang',
      'được',
      'ai',
      'làm',
      'an',
      'kiểm',
      'toán',
      'tìm',
      'trên',
      'và',
      'các',
      'này',
      'cho',
      'với',
    ]);

    allLogs.forEach((log) => {
      const clean = log.userQuestion
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
        .split(/\s+/);
      clean.forEach((word) => {
        if (word && word.length > 1 && !commonWords.has(word)) {
          keywordMap[word] = (keywordMap[word] || 0) + 1;
        }
      });
    });

    const popularKeywords = Object.entries(keywordMap)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalQuestions,
      avgResponseTimeMs: Math.round(Number(avgResponse?.avgTime || 0)),
      fallbackRate,
      intentDistribution: intentDist.map((i) => ({
        intent: i.intent || 'Không rõ',
        count: parseInt(i.count, 10),
      })),
      sourceDistribution: sourceDist.map((s) => ({
        source: s.source || 'Không rõ',
        count: parseInt(s.count, 10),
      })),
      dailyVolume: dailyVolume.map((d) => ({
        date: d.date,
        count: parseInt(d.count, 10),
      })),
      popularKeywords,
    };
  }

  // === Main Entry Point — kitaChat() ===
  async kitaChat(
    dto: AssistantChatRequestDto,
    user?: { userId?: number; username?: string },
  ) {
    const startTime = Date.now();
    const msg = dto.message.toLowerCase().trim();

    // ── Exact-Match Response Caching ──
    const msgNormalized = msg.replace(/\s+/g, ' ');
    const questionHash = crypto
      .createHash('md5')
      .update(msgNormalized)
      .digest('hex');

    try {
      const cached = await this.cacheManager.get<any>(
        `kita_chat_${questionHash}`,
      );
      if (cached) {
        this.logger.log(
          `[Kita AI] Cache Hit! Trả về câu trả lời từ Cache (Redis/In-Memory).`,
        );
        const responseTimeMs = Date.now() - startTime;
        this.saveChatLog(
          dto.message,
          cached.reply,
          'CACHED',
          cached.source || 'AI Cache Engine',
          cached.category || 'General',
          false,
          responseTimeMs,
          user,
        ).catch(() => {});

        return cached;
      }
    } catch (err) {
      this.logger.error(
        `Error querying AI Response Cache Manager: ${err.message}`,
      );
    }

    const history = dto.history || [];
    const INTENT_CONFIDENCE_THRESHOLD = 3;

    // ── Step 1: Heuristic Intent Classification (< 1ms) ──
    let { intent, score } = this.classifyIntentHeuristic(msg);
    this.logger.log(`[Kita] Heuristic intent: ${intent} (score: ${score})`);

    // ── Step 2: If score too low, try Ollama intent classification ──
    if (score < INTENT_CONFIDENCE_THRESHOLD) {
      const isOllamaAvailable = await this.ollamaService.isAvailable();
      if (isOllamaAvailable) {
        const allIntents = KITA_INTENT_RULES.map((r) => r.intent);
        const llmIntent = await this.ollamaService.classifyIntent(
          dto.message,
          allIntents,
        );
        if (llmIntent) {
          this.logger.log(`[Kita] LLM reclassified intent: ${llmIntent}`);
          intent = llmIntent;
          score = INTENT_CONFIDENCE_THRESHOLD;
        }
      }
    }

    // ── Step 3: Smart DB Query based on intent ──
    const { data, contextString, isEmpty } = await this.queryForIntent(
      intent,
      msg,
      user,
    );
    this.logger.log(
      `[Kita] DB query for ${intent}: isEmpty=${isEmpty}, contextLength=${contextString.length}`,
    );

    let result: { reply: string; category: string; source: string } =
      undefined as any;

    // ── Step 4: No data found → transparent "no info" response ──
    if (isEmpty && intent === 'GENERAL') {
      const isOllamaAvailable = await this.ollamaService.isAvailable();
      if (isOllamaAvailable) {
        const llmReply = await this.runLlmKitaChat(
          dto.message,
          contextString ||
            'Không tìm thấy dữ liệu cụ thể trong CSDL Smart Audit 4.0 cho câu hỏi này.',
          history,
        );
        if (llmReply) {
          result = {
            reply: llmReply,
            category: 'Kita AI Assistant',
            source: 'Ollama Local LLM (Qwen3-0.6B)',
          };
        }
      }

      if (!result) {
        result = {
          reply:
            `👋 Xin chào! Tôi là **Kita - Trợ lý ảo kiểm toán thông minh của LPBank**.\n\n⚠️ Tôi đã tìm kiếm trong CSDL Smart Audit 4.0 nhưng **không tìm thấy thông tin phù hợp** với câu hỏi của bạn.\n\nTôi có thể hỗ trợ bạn với các nghiệp vụ sau:\n` +
            `1. 📅 **Kế hoạch kiểm toán** — Tra cứu cuộc kiểm toán, đoàn, lịch trình\n` +
            `2. 📚 **Văn bản pháp quy** — Thông tư NHNN, COSO, COBIT, ISO, Basel\n` +
            `3. 🔍 **Phát hiện & Kiến nghị** — Sai phạm, theo dõi khắc phục\n` +
            `4. 👤 **Nhân sự** — Thông tin liên hệ cán bộ, điện thoại, email\n` +
            `5. 🎯 **Đánh giá rủi ro** — Heatmap, điểm rủi ro\n` +
            `6. 📝 **Giấy tờ làm việc** — GTLV, thủ tục kiểm toán\n` +
            `7. 📊 **Báo cáo & Thống kê** — Tổng hợp tình hình\n` +
            `8. 🎓 **Đào tạo** — Khóa học, giờ CPE\n` +
            `9. 🏢 **Cơ cấu tổ chức** — Chi nhánh, phòng ban\n\n` +
            `Hãy đặt câu hỏi cụ thể hơn, ví dụ: *"Có bao nhiêu kiến nghị quá hạn?"* hoặc *"Số điện thoại của Nguyễn Văn A?"*`,
          category: 'General',
          source: 'Kita AI Agent (No matching data)',
        };
      }
    } else {
      // ── Step 5: Generate response ──
      const isOllamaAvailable = await this.ollamaService.isAvailable();

      // 5a. Try Ollama LLM for natural language response
      if (isOllamaAvailable && contextString.length > 0) {
        const llmReply = await this.runLlmKitaChat(
          dto.message,
          contextString,
          history,
        );
        if (llmReply) {
          result = {
            reply: llmReply,
            category: intent,
            source: 'Ollama Local LLM (Qwen3-0.6B)',
          };
        }
      }

      // 5b. Fallback: Heuristic Response Builder
      if (!result) {
        const heuristicReply = this.buildHeuristicResponse(intent, data, msg);
        if (heuristicReply) {
          result = {
            reply: heuristicReply,
            category: intent,
            source: 'Kita AI Agent (Heuristic + CSDL)',
          };
        }
      }

      // 5c. Final fallback
      if (!result) {
        result = {
          reply: `👋 Tôi là **Kita**. Tôi đã tìm kiếm trong CSDL nhưng không thể xây dựng câu trả lời chi tiết cho câu hỏi này. Vui lòng thử diễn đạt lại hoặc hỏi cụ thể hơn.`,
          category: 'General',
          source: 'Kita AI Agent (Fallback)',
        };
      }
    }

    // Save chat log asynchronously
    const responseTimeMs = Date.now() - startTime;
    const isFallback =
      intent === 'GENERAL' ||
      result.source?.includes('No matching data') ||
      result.source?.includes('Fallback');

    this.saveChatLog(
      dto.message,
      result.reply,
      intent,
      result.source || 'Hệ thống',
      result.category || 'General',
      isFallback,
      responseTimeMs,
      user,
    ).catch(() => {});

    // Save to Cache Manager if successful response
    if (
      result &&
      !isFallback &&
      !result.source?.includes('Fallback') &&
      !result.source?.includes('No matching data')
    ) {
      try {
        await this.cacheManager.set(
          `kita_chat_${questionHash}`,
          result,
          86400000,
        );

        this.cacheRepo
          .save({
            questionHash,
            questionText: msgNormalized,
            responseText: result.reply,
            category: result.category,
            source: result.source,
          })
          .catch(() => {});
      } catch (err) {
        this.logger.error(`Error writing to AI Cache Manager: ${err.message}`);
      }
    }

    return result;
  }
}
