import { IsNotEmpty, IsString } from 'class-validator';

export class RespondReviewNoteDto {
  @IsString()
  @IsNotEmpty()
  response: string;
}
