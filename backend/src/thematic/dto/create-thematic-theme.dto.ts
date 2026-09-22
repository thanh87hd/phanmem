import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateThematicThemeDto {
  @IsString()
  @IsNotEmpty()
  themeId: string;

  @IsString()
  @IsNotEmpty()
  themeTitle: string;

  @IsString()
  @IsNotEmpty()
  riskDomainCode: string;

  @IsString()
  @IsOptional()
  analysisPeriod?: string;

  @IsString()
  @IsOptional()
  affectedPopulation?: string;

  @IsArray()
  @IsOptional()
  issueIds?: string[];

  @IsArray()
  @IsOptional()
  riskIds?: string[];

  @IsString()
  @IsOptional()
  riskTrajectory?: string;

  @IsString()
  @IsOptional()
  systemicRootCause?: string;

  @IsString()
  @IsOptional()
  assuranceGap?: string;

  @IsString()
  @IsOptional()
  recommendedResponse?: string;

  @IsString()
  @IsOptional()
  themePriority?: string;

  @IsString()
  @IsOptional()
  approvalRef?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
