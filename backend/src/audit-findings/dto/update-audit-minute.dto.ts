import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditMinuteDto } from './create-audit-minute.dto';

export class UpdateAuditMinuteDto extends PartialType(CreateAuditMinuteDto) {}
