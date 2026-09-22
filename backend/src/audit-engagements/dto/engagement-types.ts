export interface AuditEngagementFilters {
  planId?: number;
  status?: string;
  engagementType?: string;
  ownerTeam?: string;
  departmentId?: string;
}

export interface RiskAssessmentSource {
  id: number;
  riskLevel?: string;
  residualRiskScore?: number;
  legacyUniverseName?: string;
  legacyDepartment?: string;
  auditUniverseId?: number;
  auditCategory?: string;
  riskDescription?: string;
  notes?: string;
  assessmentYear?: number | string;
  mitigationPlan?: string;
}

export interface AuthenticatedUserContext {
  userId: number;
  username?: string;
  role?: string;
  legacyDepartment?: string;
  teamCode?: string;
  departmentId?: number;
}
