import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditPlanDto } from './create-audit-plan.dto';

export class UpdateAuditPlanDto extends PartialType(CreateAuditPlanDto) {}
