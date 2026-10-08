import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class CreateRiskControlMatrixDto {
  @IsOptional()
  @IsNumber()
  processId?: number;

  @IsOptional()
  @IsString()
  legacyProcessName?: string;

  @IsOptional()
  @IsNumber()
  riskProfileId?: number;

  @IsOptional()
  @IsString()
  subProcess?: string;

  @IsOptional()
  @IsString()
  businessObjective?: string;

  @IsOptional()
  @IsString()
  riskName?: string;

  @IsOptional()
  @IsString()
  riskDescription?: string;

  @IsOptional()
  @IsString()
  inherentRiskScore?: string;

  @IsNotEmpty({ message: 'Tên chốt kiểm soát không được để trống' })
  @IsString()
  controlName: string;

  @IsOptional()
  @IsString()
  controlDescription?: string;

  @IsOptional()
  @IsString()
  controlType?: string;

  @IsOptional()
  @IsString()
  controlFrequency?: string;

  @IsOptional()
  @IsString()
  controlAutomation?: string;

  @IsOptional()
  @IsString()
  testProcedure?: string;

  @IsOptional()
  @IsString()
  expectedEvidence?: string;

  @IsOptional()
  @IsNumber()
  ownerDepartmentId?: number;

  @IsOptional()
  @IsString()
  legacyOwnerTeam?: string;
}
