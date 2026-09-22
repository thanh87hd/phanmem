import { IsOptional, IsString } from 'class-validator';

export class QueryFileLinkDto {
  @IsOptional()
  @IsString()
  ownerType?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  relationType?: string;
}
