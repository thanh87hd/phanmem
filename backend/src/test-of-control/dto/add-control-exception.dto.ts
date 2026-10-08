import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class AddControlExceptionDto {
  @IsOptional()
  @IsString()
  exceptionId?: string;

  @IsOptional()
  @IsString()
  sampleItemId?: string;

  @IsOptional()
  @IsString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  unitBranch?: string;

  @IsNotEmpty({ message: 'Mô tả ngoại lệ không được để trống' })
  @IsString()
  exceptionDescription: string;

  @IsOptional()
  @IsString()
  criteriaBreached?: string;

  @IsOptional()
  @IsString()
  exceptionType?: string;

  @IsOptional()
  @IsString()
  validException?: string;

  @IsOptional()
  @IsString()
  rootCauseCategory?: string;

  @IsOptional()
  @IsString()
  auditeeExplanation?: string;

  @IsOptional()
  @IsString()
  auditorConclusion?: string;

  @IsOptional()
  @IsString()
  compensatingControlId?: string;

  @IsOptional()
  @IsString()
  actionOwner?: string;

  @IsOptional()
  @IsString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  issueId?: string;
}
