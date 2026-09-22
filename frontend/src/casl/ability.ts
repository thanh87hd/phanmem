const t = (k: string, f?: string) => f || k;
import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { UserProfile } from '../types/user-profile';
import {
  isAdminRole,
  isLanhDaoRole,
  isBKSRole,
  isAuditeeRole,
  isTeamLeadRole,
} from '../utils/role-checker.util';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subjects = 'AuditFinding' | 'AuditEngagement' | 'WorkingPaper' | 'User' | 'Analytics' | 'Report' | 'Recommendation' | 'SystemManagement' | 'AuditTrail' | 'ExternalDatabase' | 'AuditTemplate' | 'RegulatoryExam' | 'CustomField' | 'AuditCommittee' | 'Workflow' | 'Seeder' | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function buildAbilityForUser(user: UserProfile | null | undefined): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (!user) {
    return build();
  }

  const roleStr = (typeof user.role === 'string' ? user.role : user.role?.name || '');

  const isAdmin = isAdminRole(roleStr);
  const isLanhDaoKTNB = isLanhDaoRole(roleStr);
  const isBKS = isBKSRole(roleStr);
  const isAuditee = isAuditeeRole(roleStr);

  if (isAdmin || isLanhDaoKTNB) {
    can('manage', 'all');
  } else if (isBKS) {
    can('read', 'all');
    can('update', 'AuditCommittee');
    cannot('create', 'AuditCommittee');
    can('update', 'RegulatoryExam');
    cannot('create', 'RegulatoryExam');
    cannot('manage', 'SystemManagement');
    cannot('manage', 'AuditTrail');
    cannot('manage', 'Seeder');
    cannot('manage', 'User');
  } else if (isAuditee) {
    can('read', 'AuditFinding');
    cannot('create', 'AuditFinding');
    cannot('update', 'AuditFinding');
    cannot('delete', 'AuditFinding');
    cannot('manage', 'WorkingPaper');
  } else {
    // Regular Auditors & Leads
    can('read', 'AuditFinding');
    can('read', 'WorkingPaper');
    can('read', 'AuditEngagement');
    can('read', 'User');
    
    can('create', 'WorkingPaper');
    can('create', 'AuditFinding');

    can('update', 'AuditFinding');
    can('update', 'WorkingPaper');
    can('update', 'Recommendation');
    
    can('manage', 'Analytics');
    can('manage', 'Report');

    cannot('delete', 'AuditFinding');
    cannot('delete', 'WorkingPaper');

    if (isTeamLeadRole(roleStr)) {
      can('manage', 'AuditTemplate');
    } else {
      can('read', 'AuditTemplate');
    }
  }

  return build();
}
