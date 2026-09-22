import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditUniverseDto } from './create-audit-universe.dto';

export class UpdateAuditUniverseDto extends PartialType(
  CreateAuditUniverseDto,
) {}
