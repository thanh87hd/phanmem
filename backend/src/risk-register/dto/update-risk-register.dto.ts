import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskRegisterDto } from './create-risk-register.dto';

export class UpdateRiskRegisterDto extends PartialType(CreateRiskRegisterDto) {}
