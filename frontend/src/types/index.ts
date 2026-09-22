// Global Types for the Project
export * from './user-profile';

export interface BaseEntity {
  id?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface AuditUniverse extends BaseEntity {
  id: number;
  name: string;
  department?: string;
  departmentCode?: string;
  auditCategory?: string;
  dynamicRiskRating?: string;
  riskLevel?: string;
  planningPriority?: string;
  priorityReason?: string;
  estDays?: number;
  ktvCount?: number;
  universeId?: number;
  justification?: string;
  status?: string;
  [key: string]: any;
}

export interface AuditPlan extends BaseEntity {
  id?: number;
  name: string;
  year: number;
  status?: string;
  auditUniverseId?: number;
  auditUniverse?: AuditUniverse;
  selectedUnits?: any[];
  revisions?: any[];
  revisionCount?: number;
  [key: string]: any;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  [key: string]: any;
}

export interface KriData {
  kriCode: string;
  kriName: string;
  category?: string;
  metrics?: string;
  dataSource?: string;
  thresholdValue?: string | number;
  currentValue?: string | number;
  currentRating?: string;
  expectedRating?: string;
  commentary?: string;
  mitigation?: string;
  departmentName?: string;
  departmentCode?: string;
  unit?: string;
  note?: string;
  severity?: string;
  status?: string;
  reportMonth?: number;
  reportYear?: number;
  auditUniverseId?: number;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
