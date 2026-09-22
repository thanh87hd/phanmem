import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFileLinkDto {
  @IsInt()
  @IsNotEmpty()
  fileAssetId: number;

  @IsString()
  @IsNotEmpty()
  ownerType: string;

  @IsInt()
  @IsNotEmpty()
  ownerId: number;

  @IsOptional()
  @IsString()
  relationType?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
