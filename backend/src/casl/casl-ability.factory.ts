import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  createMongoAbility,
} from '@casl/ability';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { User } from '../users/entities/user.entity';
import { AuditSample } from '../audit-findings/entities/audit-sample.entity';
import { AuditMinute } from '../audit-findings/entities/audit-minute.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import {
  isAdminRole,
  isLanhDaoRole,
  isBKSRole,
  isAuditeeRole,
  isTeamLeadRole,
} from '../utils/role-checker.util';

export enum Action {
  Manage = 'manage', // CRUD
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// Map entities to subjects
export type Subjects =
  | InferSubjects<
      | typeof AuditFinding
      | typeof AuditEngagement
      | typeof WorkingPaper
      | typeof User
      | typeof AuditSample
      | typeof AuditMinute
      | typeof Recommendation
    >
  | 'Analytics'
  | 'Report'
  | 'SystemManagement'
  | 'AuditTrail'
  | 'ExternalDatabase'
  | 'AuditTemplate'
  | 'RegulatoryExam'
  | 'CustomField'
  | 'AuditCommittee'
  | 'AuditCharter'
  | 'IaStrategicPlan'
  | 'QAIP'
  | 'Workflow'
  | 'Seeder'
  | 'User'
  | 'Recommendation'
  | 'Document'
  | 'all';
export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: any) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    if (!user) {
      // Unauthenticated users can't do anything
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const roleStr = (user.role || '').toString();
    const isAdmin = isAdminRole(roleStr);
    const isLanhDaoKTNB = isLanhDaoRole(roleStr);
    const isBKS = isBKSRole(roleStr);
    const isAuditee = isAuditeeRole(roleStr);

    if (isAdmin || isLanhDaoKTNB) {
      can(Action.Manage, 'all'); // Admin and Leaders can manage everything
    } else {
      const perms: string[] = user.permissions || [];

      // ==========================================
      // 1. Dynamic UI Permissions Mapping (ABAC)
      // ==========================================

      // Quản trị Hệ thống
      if (perms.includes('personnel')) can(Action.Manage, User);
      if (perms.includes('roles')) can(Action.Manage, 'SystemManagement');
      if (perms.includes('audit_trail')) can(Action.Manage, 'AuditTrail');
      if (perms.includes('departments')) can(Action.Manage, 'SystemManagement'); // or Department if entity exists

      // Thực hiện Kiểm toán (Manage = full CRUD)
      if (perms.includes('audit_engagements')) {
        can(Action.Manage, AuditEngagement);
      } else {
        can(Action.Read, AuditEngagement);
      }

      if (perms.includes('working_papers')) {
        can(Action.Manage, WorkingPaper);
      }

      if (perms.includes('audit_findings')) {
        can(Action.Manage, AuditFinding);
        can(Action.Manage, AuditSample);
        can(Action.Manage, AuditMinute);
      }

      if (perms.includes('data_analytics')) can(Action.Manage, 'Analytics');
      if (perms.includes('audit_templates'))
        can(Action.Manage, 'AuditTemplate');

      // Báo cáo
      if (
        perms.includes('audit_reports') ||
        perms.includes('sign_report') ||
        perms.includes('summary_reports')
      ) {
        can(Action.Manage, 'Report');
      }
      if (perms.includes('recommendations')) {
        can(Action.Manage, Recommendation);
        can(Action.Manage, 'Recommendation');
      }

      // Nâng cao
      if (perms.includes('continuous_monitoring'))
        can(Action.Manage, 'SystemManagement');
      if (perms.includes('audit_committee'))
        can(Action.Manage, 'AuditCommittee');
      if (perms.includes('audit_charter'))
        can(Action.Manage, 'AuditCharter');
      if (perms.includes('ia_strategic_plan'))
        can(Action.Manage, 'IaStrategicPlan');
      if (perms.includes('qaip'))
        can(Action.Manage, 'QAIP');
      if (perms.includes('regulatory_exams'))
        can(Action.Manage, 'RegulatoryExam');
      if (perms.includes('general_tasks')) can(Action.Manage, 'Workflow');

      // Documents
      can(Action.Read, 'Document');
      can(Action.Create, 'Document');
      if (
        perms.includes('working_papers') ||
        perms.includes('audit_engagements')
      ) {
        can(Action.Manage, 'Document');
      } else {
        can(Action.Delete, 'Document', { uploadedBy: user.userId } as any);
      }

      // ==========================================
      // 2. Granular ABAC Fallbacks & Restrictions
      // ==========================================

      if (isBKS) {
        can(Action.Read, 'all');
        can(Action.Manage, 'AuditCharter');
        can(Action.Manage, 'IaStrategicPlan');
        can(Action.Update, 'AuditCommittee');
        cannot(Action.Create, 'AuditCommittee');
        can(Action.Update, 'RegulatoryExam');
        cannot(Action.Create, 'RegulatoryExam');
      } else if (isAuditee || perms.includes('auditee_portal')) {
        can(Action.Read, 'AuditCharter');
        cannot(Action.Manage, 'IaStrategicPlan');
        cannot(Action.Manage, 'QAIP');
        cannot(Action.Manage, 'AuditCommittee');
        can(Action.Read, AuditFinding, {
          'engagement.legacyAuditedDepartment':
            user.legacyDepartment || user.department,
        } as any);
        can(Action.Read, AuditSample);
        can(Action.Read, AuditMinute);
        cannot(Action.Create, AuditFinding);
        cannot(Action.Update, AuditFinding);
        cannot(Action.Delete, AuditFinding);
        cannot(Action.Manage, WorkingPaper);
      } else {
        // Regular Auditors Granular Fallback (if they don't have full Manage perms)
        can(Action.Read, AuditFinding, {
          'engagement.teamMembers': { $regex: `"userId":${user.userId}` },
        } as any);
        can(Action.Read, AuditFinding, {
          'engagement.leadAuditorId': user.userId,
        } as any);
        can(Action.Read, AuditSample);
        can(Action.Read, AuditMinute);
        can(Action.Read, WorkingPaper);
        can(Action.Read, User);

        // Granular updates for their own records
        can(Action.Update, AuditFinding, {
          'engagement.leadAuditorId': user.userId,
        } as any);
        can(Action.Update, AuditFinding, { creatorId: user.userId } as any);
        can(Action.Update, WorkingPaper, { creatorId: user.userId } as any);
        can(Action.Update, WorkingPaper, {
          'engagement.leadAuditorId': user.userId,
        } as any);
        can(Action.Update, AuditSample);
        can(Action.Update, AuditMinute);

        // Granular creates
        can(Action.Create, AuditSample);
        can(Action.Create, AuditMinute);
        can(Action.Create, WorkingPaper);
        can(Action.Create, AuditFinding);

        // Cannot delete unless explicitly given Manage via UI
        if (!perms.includes('audit_findings'))
          cannot(Action.Delete, AuditFinding);
        if (!perms.includes('working_papers'))
          cannot(Action.Delete, WorkingPaper);
        if (!perms.includes('recommendations')) {
          cannot(Action.Delete, Recommendation);
          cannot(Action.Delete, 'Recommendation');
          can(Action.Read, Recommendation);
          can(Action.Read, 'Recommendation');
          can(Action.Create, Recommendation);
          can(Action.Create, 'Recommendation');
          can(Action.Update, Recommendation, {
            assignedToId: user.userId,
          } as any);
          can(Action.Update, 'Recommendation');
        }

        // Audit Standards: Charter, Strategic Plan, QAIP
        can(Action.Read, 'AuditCharter');
        can(Action.Read, 'IaStrategicPlan');
        can(Action.Read, 'QAIP');
        can(Action.Create, 'QAIP');
        can(Action.Update, 'QAIP');
      }

      can(Action.Read, 'ExternalDatabase');
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
