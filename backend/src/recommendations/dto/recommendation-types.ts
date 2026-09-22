export interface RecommendationFilters {
  slaStatus?: string;
  closureStatus?: string;
  department?: string;
  selfMonitored?: boolean;
  engagementId?: number;
  findingId?: number;
}

export interface AuthenticatedUserContext {
  userId: number;
  username?: string;
  role?: string;
  legacyDepartment?: string;
  department?: string;
  teamCode?: string;
}

export interface SubmitPlanDto {
  plan: string;
  targetDate?: string;
  remediationFeasibility?: boolean;
  remediationUnfeasibleReason?: string;
  auditeeProposal?: string;
  monitoringCycle?: string;
  auditeeUnitHead?: string;
  auditeePoc?: string;
}

export interface ProgressUpdateDto {
  progressPercent: number;
  response?: string;
  notes?: string;
  remediationFeasibility?: boolean;
  remediationUnfeasibleReason?: string;
  auditeeProposal?: string;
  monitoringCycle?: string;
  auditeeUnitHead?: string;
  auditeePoc?: string;
  evidenceLink?: string;
}
