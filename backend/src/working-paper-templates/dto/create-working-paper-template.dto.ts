import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateWorkingPaperTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên biểu mẫu không được để trống' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Phân loại không được để trống' })
  category: string;

  @IsOptional()
  templateContent?: any;

  @IsArray()
  @IsOptional()
  fields?: any[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
