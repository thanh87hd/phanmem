import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export class SmtpConfigDto {
  @IsNotEmpty({ message: 'SMTP Host không được để trống' })
  @IsString()
  host: string;

  @IsNotEmpty({ message: 'SMTP Port không được để trống' })
  @IsNumber()
  port: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsIn(['basic', 'oauth2', 'anonymous', 'ntlm'])
  authType?: 'basic' | 'oauth2' | 'anonymous' | 'ntlm';

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsString()
  fromEmail?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class TestSmtpConfigDto extends SmtpConfigDto {
  @IsOptional()
  @IsString()
  testRecipient?: string;
}
