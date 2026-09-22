export interface AuthUserContext {
  id?: number;
  userId?: number;
  username?: string;
  fullName?: string;
  email?: string;
  role?: string;
  roleName?: string;
}

export interface RiskProfileChangeRequestDto {
  title?: string;
  domainCode?: string;
  reason?: string;
  changes?: Array<{
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    profileId?: number;
    oldData?: Record<string, any>;
    newData: Record<string, any>;
  }>;
  universeId?: number;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  changeType?: string;
}

export interface KriAlertDto {
  kriCode?: string;
  kriName?: string;
  branchCode?: string;
  branchName?: string;
  period?: string;
  value?: number;
  threshold?: number;
  status?: string;
  riskLevel?: string;
  alertType?: string;
  description?: string;
  indicators?: Record<string, unknown>;
}

export interface KriPeriodFilterDto {
  year?: number;
  fromMonth?: number;
  toMonth?: number;
  month?: number;
  auditUniverseId?: number;
  departmentCode?: string;
  period?: string;
  branchCode?: string;
  kriCode?: string;
  riskLevel?: string;
  startDate?: string;
  endDate?: string;
}

export interface RcsaDto {
  departmentName?: string;
  unitId?: number;
  auditUniverseId?: number;
  processName?: string;
  riskDescription?: string;
  controlName?: string;
  controlEffectiveness?: string;
  inherentRisk?: number;
  residualRisk?: number;
  actionPlan?: string;
  assessedByUsername?: string;
  assessorNotes?: string;
}

export interface UploadedFileContext {
  originalname: string;
  buffer: Buffer;
  mimetype?: string;
  size?: number;
}
