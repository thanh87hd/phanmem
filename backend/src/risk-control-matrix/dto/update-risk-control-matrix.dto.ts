import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskControlMatrixDto } from './create-risk-control-matrix.dto';

export class UpdateRiskControlMatrixDto extends PartialType(
  CreateRiskControlMatrixDto,
) {}
