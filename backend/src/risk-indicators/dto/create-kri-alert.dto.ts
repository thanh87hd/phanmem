import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateKriAlertDto {
  @IsString()
  kriCode: string;

  @IsString()
  kriName: string;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsString()
  departmentName: string;

  @IsOptional()
  @IsString()
  departmentCode?: string;

  @IsOptional()
  @IsString()
  observedValue?: string;

  @IsOptional()
  @IsString()
  currentValue?: string;

  @IsOptional()
  @IsString()
  figure?: string;

  @IsOptional()
  @IsString()
  thresholdValue?: string;

  @IsOptional()
  @IsString()
  threshold?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  metrics?: string;

  @IsOptional()
  @IsString()
  dataSource?: string;

  @IsOptional()
  @IsString()
  currentRating?: string;

  @IsOptional()
  @IsString()
  expectedRating?: string;

  @IsOptional()
  @IsString()
  commentary?: string;

  @IsOptional()
  @IsString()
  mitigation?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  severity: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  reportMonth?: number;

  @IsOptional()
  @IsNumber()
  reportYear?: number;

  @IsOptional()
  @IsNumber()
  auditUniverseId?: number;

  @IsOptional()
  @IsString()
  sourceFileName?: string;

  @IsOptional()
  @IsString()
  uploadBatchId?: string;
}
