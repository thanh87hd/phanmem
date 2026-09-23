import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateReviewNoteDto {
  @IsNumber()
  @IsNotEmpty()
  engagementId: number;

  @IsNumber()
  @IsOptional()
  workingPaperId?: number;

  @IsNumber()
  @IsOptional()
  workstreamId?: number;

  @IsString()
  @IsOptional()
  reviewSeq?: string;

  @IsString()
  @IsNotEmpty()
  note: string;
}
