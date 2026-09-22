import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã đơn vị không được để trống' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên đơn vị không được để trống' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  parent?: string; // Mã đơn vị cha

  @IsNumber()
  @IsOptional()
  parentId?: number; // ID đơn vị cha

  @IsString()
  @IsOptional()
  functions?: string; // Chức năng/nhiệm vụ của đơn vị

  @IsString()
  @IsOptional()
  unitType?: string; // Khoi | UyBan | HoiDong | Phong | ChiNhanh | PGD | TrungTam | BDT | Khac

  @IsString()
  @IsOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  region?: string;
}
