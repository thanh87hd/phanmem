import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditReportDto } from './create-audit-report.dto';

export class UpdateAuditReportDto extends PartialType(CreateAuditReportDto) {}
