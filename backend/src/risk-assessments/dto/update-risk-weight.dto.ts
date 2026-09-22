import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskWeightDto } from './create-risk-weight.dto';

export class UpdateRiskWeightDto extends PartialType(CreateRiskWeightDto) {}
