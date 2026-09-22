import { IsNotEmpty, IsString } from 'class-validator';

export class TeamLeadOpinionDto {
  @IsString()
  @IsNotEmpty({ message: 'Ý kiến Trưởng đoàn không được để trống' })
  opinion: string;
}
