import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class CreateTestOfControlDto {
  @IsNotEmpty({ message: 'Mã kiểm thử testId không được để trống' })
  @IsString()
  testId: string;

  @IsOptional()
  @IsString()
  engagementId?: string;

  @IsOptional()
  @IsString()
  auditObjectId?: string;

  @IsOptional()
  @IsString()
  riskId?: string;

  @IsOptional()
  @IsString()
  rcmId?: string;

  @IsOptional()
  @IsString()
  controlId?: string;

  @IsOptional()
  @IsString()
  controlDescription?: string;

  @IsOptional()
  @IsString()
  keyControl?: string;

  @IsOptional()
  @IsString()
  controlOwner?: string;

  @IsOptional()
  @IsString()
  controlFrequency?: string;

  @IsOptional()
  @IsString()
  testPhase?: string;

  @IsOptional()
  @IsString()
  testObjective?: string;

  @IsOptional()
  @IsString()
  assertion?: string;

  @IsOptional()
  @IsString()
  criteria?: string;

  @IsOptional()
  @IsString()
  testMethod?: string;

  @IsOptional()
  @IsString()
  dataSource?: string;

  @IsOptional()
  @IsString()
  populationDefinition?: string;

  @IsOptional()
  @IsString()
  populationPeriodFrom?: string;

  @IsOptional()
  @IsString()
  populationPeriodTo?: string;

  @IsOptional()
  @IsNumber()
  populationSize?: number;

  @IsOptional()
  @IsString()
  completenessChecked?: string;

  @IsOptional()
  @IsString()
  accuracyChecked?: string;

  @IsOptional()
  @IsString()
  samplingMethod?: string;

  @IsOptional()
  @IsNumber()
  sampleSize?: number;

  @IsOptional()
  @IsString()
  sampleSelectionLogic?: string;

  @IsOptional()
  @IsNumber()
  itemsTested?: number;

  @IsOptional()
  @IsNumber()
  validExceptions?: number;

  @IsOptional()
  @IsNumber()
  tolerableRate?: number;

  @IsOptional()
  @IsString()
  materialException?: string;

  @IsOptional()
  @IsString()
  finalResult?: string;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  compensatingControls?: string;

  @IsOptional()
  @IsString()
  compensatingEffective?: string;

  @IsOptional()
  @IsString()
  testStatus?: string;

  @IsOptional()
  @IsString()
  testedBy?: string;

  @IsOptional()
  @IsString()
  testedDate?: string;

  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @IsOptional()
  @IsString()
  reviewedDate?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsString()
  issueRequired?: string;

  @IsOptional()
  @IsString()
  issueId?: string;
}
