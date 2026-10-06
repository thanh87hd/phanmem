import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import {
  WorkingPaperAttachmentItem,
  WorkingPaperControlAssessmentItem,
  WorkingPaperReviewHistoryItem,
} from '../entities/working-paper.entity';

export class CreateWorkingPaperDto {
  @IsNumber()
  @IsOptional()
  engagementId?: number;

  @IsNumber()
  @IsOptional()
  workstreamId?: number;

  @IsString()
  @IsOptional()
  planName?: string;

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsOptional()
  reviewHistory?: WorkingPaperReviewHistoryItem[];

  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề WP không được để trống' })
  title: string;

  @IsString()
  @IsOptional()
  creator?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsOptional()
  reviewedAt?: Date | string;

  @IsString()
  @IsOptional()
  referenceCode?: string;

  @IsString()
  @IsOptional()
  objectives?: string;

  @IsString()
  @IsOptional()
  methodology?: string;

  @IsString()
  @IsOptional()
  conclusion?: string;

  @IsString()
  @IsOptional()
  riskDescription?: string;

  @IsString()
  @IsOptional()
  procedures?: string;

  @IsString()
  @IsOptional()
  sampleSelection?: string;

  @IsNumber()
  @IsOptional()
  templateId?: number;

  @IsOptional()
  attachments?: WorkingPaperAttachmentItem[];

  @IsOptional()
  controlAssessments?: WorkingPaperControlAssessmentItem[];

  @IsOptional()
  templateData?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  creatorUserId?: number;

  @IsOptional()
  @IsNumber()
  reviewedByUserId?: number;

  @IsOptional()
  @IsNumber()
  creatorId?: number;

  @IsOptional()
  @IsNumber()
  reviewerId?: number;
}
