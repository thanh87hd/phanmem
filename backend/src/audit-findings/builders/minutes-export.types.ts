import { AuditMinute } from '../entities/audit-minute.entity';
import { AuditFinding } from '../entities/audit-finding.entity';
import { AuditSample } from '../entities/audit-sample.entity';
import { AuditEngagement } from '../../audit-engagements/entities/audit-engagement.entity';

export interface MinutesExportContext {
  minute: AuditMinute;
  engagement: AuditEngagement | null;
  findings: AuditFinding[];
  samples: AuditSample[];
  mode: string;
}
