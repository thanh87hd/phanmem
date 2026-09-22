import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditFindingDto } from './create-audit-finding.dto';

export class UpdateAuditFindingDto extends PartialType(CreateAuditFindingDto) {}
