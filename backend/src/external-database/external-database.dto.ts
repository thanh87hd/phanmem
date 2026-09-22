import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export enum DatabaseType {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MARIADB = 'mariadb',
  MSSQL = 'mssql',
}

export class ConnectExternalDbDto {
  @IsEnum(DatabaseType, {
    message: 'Database type must be postgres, mysql, mariadb, or mssql',
  })
  @IsNotEmpty()
  type: DatabaseType;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsNumber()
  @IsNotEmpty()
  port: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsNotEmpty()
  database: string;

  @IsString()
  @IsNotEmpty()
  query: string;
}

export class CreateExternalDbDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DatabaseType, {
    message: 'Database type must be postgres, mysql, mariadb, or mssql',
  })
  @IsNotEmpty()
  type: DatabaseType;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsNumber()
  @IsNotEmpty()
  port: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsNotEmpty()
  database: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateExternalDbDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DatabaseType)
  @IsOptional()
  type?: DatabaseType;

  @IsString()
  @IsOptional()
  host?: string;

  @IsNumber()
  @IsOptional()
  port?: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  database?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TestConnectionDto {
  @IsEnum(DatabaseType)
  @IsNotEmpty()
  type: DatabaseType;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsNumber()
  @IsNotEmpty()
  port: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsNotEmpty()
  database: string;
}
