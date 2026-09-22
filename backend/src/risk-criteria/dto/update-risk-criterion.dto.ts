import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskCriterionDto } from './create-risk-criterion.dto';

export class UpdateRiskCriterionDto extends PartialType(
  CreateRiskCriterionDto,
) {}
