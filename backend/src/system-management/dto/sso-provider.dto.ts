import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateSsoProviderDto {
  @IsNotEmpty({ message: 'Tên nhà cung cấp SSO không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsNumber()
  port?: number;

  @IsOptional()
  @IsString()
  baseDn?: string;

  @IsOptional()
  @IsString()
  bindDn?: string;

  @IsOptional()
  @IsString()
  bindPassword?: string;

  @IsOptional()
  @IsString()
  userSearchBase?: string;

  @IsOptional()
  @IsString()
  userSearchFilter?: string;

  @IsOptional()
  @IsString()
  groupSearchBase?: string;

  @IsOptional()
  @IsObject()
  groupRoleMapping?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  tlsEnabled?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateSsoProviderDto extends PartialType(CreateSsoProviderDto) {}
