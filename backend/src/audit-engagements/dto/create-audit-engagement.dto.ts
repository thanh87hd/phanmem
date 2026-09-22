import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateAuditEngagementDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên cuộc kiểm toán không được để trống' })
  name: string;

  @IsNumber()
  @IsOptional()
  planId?: number;

  @IsString()
  @IsOptional()
  planName?: string;

  @IsString()
  @IsOptional()
  leadAuditor?: string;

  @IsNumber()
  @IsOptional()
  leadAuditorId?: number;

  @IsString()
  @IsOptional()
  auditedDepartment?: string;

  @IsDateString({}, { message: 'Ngày bắt đầu không đúng định dạng' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'Ngày kết thúc không đúng định dạng' })
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  teamMembers?: any;

  @IsOptional()
  isExpectedInfo?: boolean;

  @IsDateString({}, { message: 'Thời hiệu chương trình không đúng định dạng' })
  @IsOptional()
  programValidity?: string;

  @IsString()
  @IsOptional()
  proposalDocUrl?: string;

  @IsString()
  @IsOptional()
  outlineDocUrl?: string;

  @IsString()
  @IsOptional()
  decisionDocUrl?: string;

  @IsOptional()
  @IsNumber()
  auditedDepartmentId?: number;

  @IsOptional()
  @IsNumber()
  leadAuditorUserId?: number;

  @IsString()
  @IsOptional()
  auditCategory?: string; // HoiSo | ChiNhanh | PGDBD_TKBD | PGD | HeThong | ChuyenDe

  @IsString()
  @IsOptional()
  branchCode?: string;

  @IsString()
  @IsOptional()
  branchName?: string;

  @IsString()
  @IsOptional()
  postalDepartmentName?: string; // Tên Bưu điện tỉnh/huyện

  @IsString()
  @IsOptional()
  postalRepresentative?: string; // Đại diện Bưu điện

  @IsString()
  @IsOptional()
  recipientList?: string; // Nơi nhận báo cáo

  @IsString()
  @IsOptional()
  ownerTeam?: string; // PKT_HoiSo | PKT_DVKD | TongHop

  @IsString()
  @IsOptional()
  engagementType?: string; // Planned | Unplanned | FollowUp | Special

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsOptional()
  planningStartDate?: string;

  @IsOptional()
  planningEndDate?: string;

  @IsOptional()
  fieldworkStartDate?: string;

  @IsOptional()
  fieldworkEndDate?: string;

  @IsOptional()
  auditedEntityList?: any;

  @IsString()
  @IsOptional()
  decisionNo?: string;

  @IsOptional()
  decisionDate?: string;

  @IsOptional()
  surveySentDate?: string;

  @IsOptional()
  surveyReceivedDate?: string;

  @IsOptional()
  handoverMinutesDate?: string;

  @IsOptional()
  detailedMinutesDate?: string;

  @IsOptional()
  summaryMinutesDate?: string;

  @IsOptional()
  exitMeetingDate?: string;

  @IsOptional()
  reportIssuedDate?: string;

  @IsOptional()
  customFields?: Record<string, any>;

  @IsString()
  @IsOptional()
  unplannedReason?: string;

  @IsString()
  @IsOptional()
  requestedBy?: string;

  @IsString()
  @IsOptional()
  samplingPlanDocUrl?: string;

  @IsOptional()
  budgetDays?: number;

  @IsOptional()
  actualDays?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
