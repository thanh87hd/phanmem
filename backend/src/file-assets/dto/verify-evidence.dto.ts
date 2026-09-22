import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyEvidenceDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Pending', 'Verified', 'Rejected', 'Unverified'])
  status: string;

  @IsOptional()
  @IsString()
  result?: string;
}
