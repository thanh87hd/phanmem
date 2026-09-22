import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  notes: string;
}
