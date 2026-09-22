import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { RiskAssessmentsService } from './risk-assessments.service';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { UpdateRiskAssessmentDto } from './dto/update-risk-assessment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { excelUploadOptions } from '../common/security/upload-options';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';
import {
  UnifiedRiskEngineService,
  UnifiedRiskCalculationInput,
} from './unified-risk-engine.service';
import { RiskProfileService } from './risk-profile.service';
import { KriService } from './kri.service';
import { RcsaService } from './rcsa.service';

@UseGuards(JwtAuthGuard)
@Controller('risk-assessments')
export class RiskAssessmentsController {
  constructor(
    private readonly riskAssessmentsService: RiskAssessmentsService,
    private readonly unifiedRiskEngineService: UnifiedRiskEngineService,
    private readonly riskProfileService: RiskProfileService,
    private readonly kriService: KriService,
    private readonly rcsaService: RcsaService,
  ) {}

  @Post('calculate-unified-score')
  calculateUnifiedScore(@Body() body: UnifiedRiskCalculationInput) {
    return this.unifiedRiskEngineService.calculate(body);
  }

  @Get('profiles/summary')
  getProfilesSummary() {
    return this.riskProfileService.getRiskProfilesSummary();
  }

  @Get('profiles/export-excel')
  async exportRiskProfilesExcel(@Query('profileCode') profileCode?: string) {
    const buffer =
      await this.riskProfileService.exportRiskProfilesToExcel(profileCode);
    return {
      filename: `Bo_Ho_So_Rui_Ro_KTNB_${profileCode || 'ALL'}_${Date.now()}.xlsx`,
      base64: buffer.toString('base64'),
    };
  }

  @Get('profiles/template-excel')
  async downloadRiskProfilesTemplate() {
    const buffer =
      await this.riskProfileService.generateRiskProfilesTemplateExcel();
    return {
      filename: `Mau_Nhap_HSRR_KTNB_Template.xlsx`,
      base64: buffer.toString('base64'),
    };
  }

  @Post('profiles/import-excel')
  @UseInterceptors(FilesInterceptor('file', 1))
  async importRiskProfilesExcel(
    @UploadedFiles() files: any[],
    @Body('reason') reason: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn file Excel để tải lên');
    }
    const file = files[0];
    const buffer = file._buf || file.buffer;
    return this.riskProfileService.importRiskProfilesFromExcel(
      buffer,
      user,
      reason,
    );
  }

  @Post('profiles/change-request')
  createChangeRequest(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.riskProfileService.createRiskProfileChangeRequest(dto, user);
  }

  @Get('profiles/change-requests')
  findAllChangeRequests(@Query('status') status?: string) {
    return this.riskProfileService.findAllChangeRequests(status);
  }

  @Patch('profiles/change-requests/:id/review-l1')
  reviewChangeRequestL1(
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; notes: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.riskProfileService.reviewChangeRequestL1(
      +id,
      body.action,
      body.notes,
      user,
    );
  }

  @Patch('profiles/change-requests/:id/approve-l2')
  approveChangeRequestL2(
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; notes: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.riskProfileService.approveChangeRequestL2(
      +id,
      body.action,
      body.notes,
      user,
    );
  }

  @Get('profiles/:id/histories')
  getRiskProfileHistories(@Param('id') id: string) {
    return this.riskProfileService.getRiskProfileHistories(+id);
  }

  @Get('profiles')
  findAllProfiles(
    @Query('profileCode') profileCode?: string,
    @Query('targetEntity') targetEntity?: string,
  ) {
    return this.riskProfileService.findAllRiskProfiles({
      profileCode,
      targetEntity,
    });
  }

  @Post()
  create(
    @Body() createRiskAssessmentDto: CreateRiskAssessmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.riskAssessmentsService.create(createRiskAssessmentDto, user);
  }

  @Get()
  findAll(
    @Query('year') year?: string,
    @Query('assessmentYear') assessmentYear?: string,
    @Query('status') status?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('department') department?: string,
    @Query('auditUniverseId') auditUniverseId?: string,
    @Query('search') search?: string,
  ) {
    const selectedYear = assessmentYear || year;
    return this.riskAssessmentsService.findAll({
      year: selectedYear ? parseInt(selectedYear, 10) : undefined,
      status: status || undefined,
      riskLevel: riskLevel || undefined,
      department: department || undefined,
      auditUniverseId: auditUniverseId
        ? parseInt(auditUniverseId, 10)
        : undefined,
      search: search || undefined,
    });
  }

  // ==================== THỐNG KÊ & SO SÁNH ====================

  @Get('risk-defect-heatmap')
  getRiskDefectHeatmap() {
    return this.riskAssessmentsService.getRiskDefectHeatmap();
  }

  @Get('summary')
  getSummaryStats(@Query('year') year?: string) {
    return this.riskAssessmentsService.getSummaryStats(
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('compare')
  getComparison(@Query('year1') year1: string, @Query('year2') year2: string) {
    return this.riskAssessmentsService.getAssessmentComparison(
      parseInt(year1, 10),
      parseInt(year2, 10),
    );
  }

  @Get('history/:auditUniverseId')
  getHistory(@Param('auditUniverseId') auditUniverseId: string) {
    return this.riskAssessmentsService.getAssessmentHistory(
      parseInt(auditUniverseId, 10),
    );
  }

  // ==================== GROUPED ASSESSMENTS (IIA 2024) ====================

  @Get('grouped')
  getGroupedAssessments(@Query('year') year?: string) {
    return this.riskAssessmentsService.getGroupedAssessments(
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('group-summary/:category')
  getGroupSummary(
    @Param('category') category: string,
    @Query('year') year?: string,
  ) {
    return this.riskAssessmentsService.getGroupSummary(
      category,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('audit-frequency-recommendation')
  getAuditFrequencyRecommendation(@Query('year') year?: string) {
    return this.riskAssessmentsService.getAuditFrequencyRecommendation(
      year ? parseInt(year, 10) : undefined,
    );
  }

  // ==================== RCSA ====================

  @Get('rcsa')
  findAllRcsa() {
    return this.rcsaService.findAllRcsa();
  }

  @Get('rcsa/dept/:deptName')
  findRcsaByDept(@Param('deptName') deptName: string) {
    return this.rcsaService.findRcsaByDepartment(deptName);
  }

  @Post('rcsa')
  createRcsa(@Body() rcsaDto: any) {
    return this.rcsaService.createRcsa(rcsaDto);
  }

  // ==================== KRI ====================

  @Get('kri/options')
  async getKriOptions() {
    return this.kriService.getKriOptions();
  }

  @Get('kri')
  findAllKri() {
    return this.kriService.findAllKriAlerts();
  }

  @Post('kri/webhook')
  kriWebhook(@Body() kriDto: any) {
    return this.kriService.createKriAlert(kriDto);
  }

  @Post('kri/bulk')
  kriBulk(@Body() alertsDto: any[]) {
    return this.kriService.createKriBulk(alertsDto);
  }

  // ==================== KRI BULK UPLOAD (shared metadata) ====================

  @Post('kri/parse')
  @UseInterceptors(FilesInterceptor('file', 1, excelUploadOptions))
  async kriParse(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      throw new Error('No file uploaded');
    }
    return this.kriService.parseKriFile(files[0]);
  }

  @Post('kri/upload-bulk')
  @UseInterceptors(FilesInterceptor('files', 20, excelUploadOptions))
  async kriUploadBulk(
    @UploadedFiles() files: any[],
    @Body()
    body: {
      reportMonth?: string;
      reportYear?: string;
      auditUniverseId?: string;
      departmentCode?: string;
    },
  ) {
    const metadata = {
      reportMonth: body.reportMonth
        ? parseInt(body.reportMonth, 10)
        : undefined,
      reportYear: body.reportYear ? parseInt(body.reportYear, 10) : undefined,
      auditUniverseId: body.auditUniverseId
        ? parseInt(body.auditUniverseId, 10)
        : undefined,
      departmentCode: body.departmentCode || undefined,
    };
    return this.kriService.uploadKriBulkFiles(files || [], metadata);
  }

  // ==================== KRI PER-FILE UPLOAD (mỗi file có metadata riêng) ====================

  @Post('kri/upload-per-file')
  @UseInterceptors(FilesInterceptor('files', 30, excelUploadOptions))
  async kriUploadPerFile(
    @UploadedFiles() files: any[],
    @Body() body: { filesMetadata?: string },
  ) {
    return this.kriService.uploadKriPerFile(
      files || [],
      body.filesMetadata || '[]',
    );
  }

  // ==================== KRI PERIOD REPORT ====================

  @Get('kri/report')
  async kriReport(
    @Query('year') year?: string,
    @Query('fromMonth') fromMonth?: string,
    @Query('toMonth') toMonth?: string,
    @Query('auditUniverseId') auditUniverseId?: string,
    @Query('departmentCode') departmentCode?: string,
  ) {
    return this.kriService.getKriPeriodReport({
      year: year ? parseInt(year, 10) : undefined,
      fromMonth: fromMonth ? parseInt(fromMonth, 10) : undefined,
      toMonth: toMonth ? parseInt(toMonth, 10) : undefined,
      auditUniverseId: auditUniverseId
        ? parseInt(auditUniverseId, 10)
        : undefined,
      departmentCode: departmentCode || undefined,
    });
  }

  // ==================== KRI PERIOD COMPARISON ====================

  @Get('kri/compare')
  async kriCompare(
    @Query('p1Year') p1Year: string,
    @Query('p1Month') p1Month: string,
    @Query('p2Year') p2Year: string,
    @Query('p2Month') p2Month: string,
    @Query('auditUniverseId') auditUniverseId?: string,
    @Query('departmentCode') departmentCode?: string,
  ) {
    return this.kriService.compareKriPeriods(
      { year: parseInt(p1Year, 10), month: parseInt(p1Month, 10) },
      { year: parseInt(p2Year, 10), month: parseInt(p2Month, 10) },
      {
        auditUniverseId: auditUniverseId
          ? parseInt(auditUniverseId, 10)
          : undefined,
        departmentCode: departmentCode || undefined,
      },
    );
  }

  // ==================== KRI BATCHES ====================

  @Get('kri/batches')
  async kriBatches() {
    return this.kriService.getKriBatches();
  }

  @Get('dynamic-rerating')
  getDynamicRerating() {
    return this.rcsaService.calculateDynamicRerating();
  }

  // ==================== WORKFLOW PHÊ DUYỆT ====================

  @Patch(':id/submit')
  submitForReview(@Param('id') id: string) {
    return this.riskAssessmentsService.submitForReview(+id);
  }

  @Post(':id/approve-l1')
  approveL1(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const approverId = user.userId;
    const approverName =
      user.fullName || user.username || 'Trưởng đoàn/Trưởng nhóm';
    return this.riskAssessmentsService.approveL1(
      +id,
      approverId,
      approverName,
      notes,
    );
  }

  @Post(':id/approve-l2')
  approveL2(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const approverId = user.userId;
    const approverName = user.fullName || user.username || 'Lãnh đạo Khối';
    return this.riskAssessmentsService.approveL2(
      +id,
      approverId,
      approverName,
      notes,
    );
  }

  @Patch(':id/approve')
  approveAssessment(
    @Param('id') id: string,
    @Body()
    body: {
      legacyReviewedBy?: number;
      legacyReviewedByName?: string;
      reviewNotes?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    const approverId = body.legacyReviewedBy || user.userId;
    const approverName =
      body.legacyReviewedByName ||
      user.fullName ||
      user.username ||
      'Người phê duyệt';
    return this.riskAssessmentsService.approveAssessment(
      +id,
      approverId,
      approverName,
      body.reviewNotes,
    );
  }

  @Patch(':id/reject')
  rejectAssessment(
    @Param('id') id: string,
    @Body()
    body: {
      legacyReviewedBy?: number;
      legacyReviewedByName?: string;
      reviewNotes: string;
      level?: number;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    const approverId = body.legacyReviewedBy || user.userId;
    const approverName =
      body.legacyReviewedByName ||
      user.fullName ||
      user.username ||
      'Người từ chối';
    return this.riskAssessmentsService.rejectAssessment(
      +id,
      approverId,
      approverName,
      body.reviewNotes,
      body.level || 1,
    );
  }

  // ==================== CRUD (phải đặt sau các route cụ thể) ====================

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.riskAssessmentsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRiskAssessmentDto: UpdateRiskAssessmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.riskAssessmentsService.update(
      +id,
      updateRiskAssessmentDto,
      user,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.riskAssessmentsService.remove(+id);
  }
}
