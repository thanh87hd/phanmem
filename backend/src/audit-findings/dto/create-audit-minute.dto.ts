import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAuditMinuteDto {
  @IsOptional()
  @IsNumber()
  engagementId?: number;

  @IsString()
  @IsNotEmpty({ message: 'Số biên bản không được để trống' })
  minuteNo: string;

  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsOptional()
  @IsString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  summaryContent?: string;

  @IsOptional()
  @IsString()
  auditedUnitName?: string;

  @IsOptional()
  @IsString()
  leadAuditorName?: string;

  @IsOptional()
  @IsString()
  minuteType?: string;
}
