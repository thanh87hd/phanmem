export interface AuthUserContext {
  id?: number;
  userId?: number;
  username?: string;
  fullName?: string;
  email?: string;
  role?: string;
  roleName?: string;
}

export interface ReviewHistoryEntry {
  timestamp: string;
  action: 'SUBMIT' | 'APPROVE' | 'REWORK' | 'REJECT';
  userId?: number;
  userName?: string;
  notes?: string;
}

export interface WorkingPaperSample {
  sampleCode?: string;
  sampleName?: string;
  testedItem?: string;
  result?: 'Pass' | 'Fail' | 'N/A' | (string & {});
  note?: string;
  exceptionNotes?: string;
}

export interface WorkingPaperTemplateData {
  headers?: string[];
  rows?: Array<Record<string, unknown>>;
  customFields?: Record<string, unknown>;
  summary?: string;
}

export interface ControlAssessmentItem {
  controlCode?: string;
  controlTitle?: string;
  designEffectiveness?:
    | 'Effective'
    | 'Ineffective'
    | 'NeedsImprovement'
    | (string & {});
  operatingEffectiveness?:
    | 'Effective'
    | 'Ineffective'
    | 'NeedsImprovement'
    | (string & {});
  testingNotes?: string;
}
