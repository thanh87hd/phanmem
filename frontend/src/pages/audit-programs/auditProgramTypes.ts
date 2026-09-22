export interface AuditProgramAttachment {
  name: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ControlAssessmentItem {
  controlId: string;
  controlDescription: string;
  designEffectiveness: string;
  operatingEffectiveness: string;
  testConclusion: string;
}

export interface QaChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

export interface WorkingPaperRecord {
  id: number;
  referenceCode: string;
  title: string;
  planName?: string;
  engagementId?: number;
  workstreamId?: number;
  creator?: string;
  creatorId?: number;
  status: string;
  objectives?: string;
  riskDescription?: string;
  methodology?: string;
  sampleSelection?: string;
  procedures?: string;
  conclusion?: string;
  templateId?: number;
  templateData?: Record<string, any>;
  attachments?: AuditProgramAttachment[];
  controlAssessments?: ControlAssessmentItem[];
  engagement?: {
    ownerTeam?: string;
    branchCode?: string;
  };
}

export const getStatusColor = (status: string): string => {
  if (status === 'Approved') return 'green';
  if (status === 'PendingReview') return 'orange';
  if (status === 'Rejected') return 'red';
  return 'default';
};
