import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  UseGuards,
  Query,
  Param,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Res,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { RegulatoryKnowledgeService } from './services/regulatory-knowledge.service';
import { KnowledgeRagService } from './services/knowledge-rag.service';
import { LoopholeDetectionService } from './services/loophole-detection.service';
import { ResourceAllocationService } from './services/resource-allocation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  FilesInterceptor,
  FileInterceptor,
} from '../common/interceptors/fastify-file-interceptor';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly regKnowledgeService: RegulatoryKnowledgeService,
    private readonly ragService: KnowledgeRagService,
    private readonly loopholeService: LoopholeDetectionService,
    private readonly resourceAllocationService: ResourceAllocationService,
  ) {}

  @Get('risk-heatmap')
  getRiskHeatmap(@Query('unitType') unitType?: string) {
    return this.aiService.getRiskHeatmap(unitType);
  }

  @Get('defect-codes')
  getDefectCodes(@Query('dimension') dimension?: string) {
    return this.aiService.getDefectCodes(dimension);
  }

  @Post('defect-codes/import')
  @UseInterceptors(FileInterceptor('file'))
  importDefectCodes(@UploadedFile() file?: any) {
    return this.aiService.importDefectCodes(file);
  }

  @Post('defect-codes/import-actual-catalog')
  importActualDefectCatalog(@Body('filePath') filePath: string) {
    return this.aiService.importActualDefectCatalog(filePath);
  }

  @Get('defect-codes/export')
  async exportDefectCodes(@Res() res: any) {
    const buffer = await this.aiService.exportDefectCodes();
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      'attachment; filename="Defect_Codes_Export.xlsx"',
    );
    res.send(buffer);
  }

  @Post('defect-codes/issue')
  issueNewDefectCode(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.aiService.issueNewDefectCode(dto, user?.username || 'System');
  }

  @Post('suggest-finding')
  suggestFinding(@Body('description') description: string) {
    return this.aiService.suggestFindingMeta(description);
  }

  @Post('suggest-finding-meta')
  suggestFindingMeta(@Body('description') description: string) {
    return this.aiService.suggestFindingMeta(description);
  }

  @Post('suggest-working-paper')
  suggestWorkingPaper(@Body('title') title: string) {
    return this.aiService.suggestWorkingPaperMeta(title);
  }

  @Post('suggest-working-paper-meta')
  suggestWorkingPaperMeta(@Body('title') title: string) {
    return this.aiService.suggestWorkingPaperMeta(title);
  }

  @Post('suggest-rcm')
  suggestRcm(
    @Body('legacyProcessName') legacyProcessName?: string,
    @Body('processName') processName?: string,
  ) {
    return this.aiService.suggestRcm(processName || legacyProcessName || '');
  }

  // KB Management
  @Get('knowledge')
  getKnowledge() {
    return this.aiService.getAllKnowledge();
  }

  @Post('knowledge')
  createKnowledge(@Body() dto: any) {
    return this.aiService.createKnowledge(dto);
  }

  @Post('knowledge/:id')
  updateKnowledge(@Body() dto: any, @Param('id', ParseIntPipe) id: number) {
    return this.aiService.updateKnowledge(id, dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('knowledge/upload-bulk')
  @UseInterceptors(FilesInterceptor('files', 50))
  async uploadFindingKnowledgeBulk(@UploadedFiles() files: any[]) {
    return this.aiService.processFindingKnowledgeBulkUpload(files || []);
  }

  @Post('knowledge/import-excel')
  @UseInterceptors(FileInterceptor('file'))
  async importFindingKnowledgeExcel(@UploadedFile() file: any) {
    return this.aiService.importFindingKnowledgeExcel(file);
  }

  @Get('knowledge/export-excel')
  async exportFindingKnowledgeExcel(@Res() res: any) {
    const buffer = await this.aiService.exportFindingKnowledgeExcel();
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      'attachment; filename="Finding_Knowledge_Export.xlsx"',
    );
    res.send(buffer);
  }

  @Post('knowledge/sync-defects')
  syncKnowledgeFromDefects() {
    return this.aiService.syncKnowledgeFromDefectCodes();
  }

  // Regulatory Base Management
  @Get('regulatory')
  getRegulatory() {
    return this.regKnowledgeService.getAllRegulatory();
  }

  @Get('regulatory/search-chunks')
  searchRegulatoryChunks(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 5;
    return this.ragService.searchRegulatoryChunks(query, lim);
  }

  @Get('regulatory/:id')
  getRegulatoryById(@Param('id', ParseIntPipe) id: number) {
    return this.regKnowledgeService.getRegulatoryById(id);
  }

  @Get('regulatory/:id/chunks')
  getRegulatoryChunks(@Param('id', ParseIntPipe) id: number) {
    return this.regKnowledgeService.getDocumentChunks(id);
  }

  @Post('regulatory/:id/rechunk')
  async rechunkRegulatory(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.regKnowledgeService.getRegulatoryById(id);
    if (!doc || !doc.fullContent) {
      return {
        success: false,
        message: 'Văn bản không có nội dung để chia nhỏ',
      };
    }
    const chunkCount = await this.regKnowledgeService.rechunkDocument(
      id,
      doc.fullContent,
    );
    return { success: true, chunkCount };
  }

  @Patch('regulatory/:id')
  updateRegulatory(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.regKnowledgeService.updateRegulatory(id, dto);
  }

  @Post('regulatory/:id')
  updateRegulatoryPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.regKnowledgeService.updateRegulatory(id, dto);
  }

  @Put('regulatory/:id')
  updateRegulatoryPut(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.regKnowledgeService.updateRegulatory(id, dto);
  }

  @Delete('regulatory/:id')
  deleteRegulatory(@Param('id', ParseIntPipe) id: number) {
    return this.regKnowledgeService.deleteRegulatory(id);
  }

  @Post('regulatory')
  createRegulatory(@Body() dto: any) {
    return this.regKnowledgeService.createRegulatory(dto);
  }

  @Post('regulatory/scan-directory')
  scanDirectory(@Body('directoryPath') directoryPath?: string) {
    return this.regKnowledgeService.scanDirectoryForRegulations(
      directoryPath || './regulations',
    );
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('regulatory/upload-bulk')
  @UseInterceptors(FilesInterceptor('files', 50, { dest: './scratch' }))
  async uploadRegulatoryBulk(@UploadedFiles() files: any[], @Body() body: any) {
    this.logger.log(`Received bulk upload with ${files?.length || 0} files.`);
    if (!files || files.length === 0) {
      return { successCount: 0, failedCount: 0, details: [] };
    }

    const jobId = Math.random().toString(36).substring(2, 15);
    const mappedFiles = files.map((f) => ({
      buffer: f.buffer,
      path: f.path,
      originalname: f.originalname || f.filename,
      mimetype: f.mimetype,
    }));

    this.regKnowledgeService
      .processRegulatoryBulkUploadAsync(jobId, mappedFiles)
      .catch((err) =>
        this.logger.error('Error processing bulk upload async:', err),
      );

    return {
      success: true,
      jobId: jobId,
      message: 'Đã đưa vào hàng đợi xử lý',
    };
  }

  @Get('job-status/:id')
  async getJobStatus(@Param('id') id: string) {
    const job = this.regKnowledgeService.getJobStatus(id);
    if (!job || job.status === 'not_found') {
      return { status: 'not_found' };
    }

    return {
      id: id,
      status: job.status,
      total: (job as any).total,
      processed: (job as any).processed,
      success: (job as any).success,
      failed: (job as any).failed,
      errors: (job as any).errors,
    };
  }

  @Get('process-loopholes')
  getProcessLoopholes() {
    return this.loopholeService.analyzeProcessLoopholes();
  }

  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('process-loopholes/run')
  runDetection() {
    return this.loopholeService.runAiLoopholeDetection();
  }

  @Post('process-loopholes/:id/approve')
  approve(
    @Body('approver') approver: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.loopholeService.approveLoophole(id, approver);
  }

  @Post('process-loopholes/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.loopholeService.rejectLoophole(id);
  }

  @Get('monthly-report')
  getMonthlyReport(@Query('year') year: number, @Query('month') month: number) {
    return this.loopholeService.getMonthlyLoopholeReport(year, month);
  }

  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post('stress-test')
  async stressTest() {
    return this.resourceAllocationService.runStressTest(5000);
  }

  @Post('allocate-resources')
  async allocateResources(@Body('year') year?: number) {
    return this.resourceAllocationService.allocateResources(year);
  }

  @Post('approve-resources')
  async approveResources() {
    return this.resourceAllocationService.approveAnnualPlan();
  }

  @Get('chat-logs')
  async getChatLogs() {
    return this.aiService.getChatLogs();
  }

  @Get('chat-analytics')
  async getChatAnalytics() {
    return this.aiService.getChatAnalytics();
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('kita-chat')
  async kitaChat(
    @Body() dto: { message: string; history?: any[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.aiService.kitaChat(dto, user);
  }
}
