import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAuditPlanDto {
  @IsNumber()
  year: number;

  @IsString()
  @IsNotEmpty({ message: 'Tên kế hoạch không được để trống' })
  name: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  selectedUnits?: any[];

  @IsString()
  @IsOptional()
  approvalNotes?: string;

  @IsString()
  @IsOptional()
  ownerTeam?: string;
}
