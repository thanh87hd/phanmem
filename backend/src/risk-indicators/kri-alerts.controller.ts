import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { excelUploadOptions } from '../common/security/upload-options';
import { KriAlertsService } from './kri-alerts.service';
import { CreateKriAlertDto } from './dto/create-kri-alert.dto';
import { UpdateKriAlertDto } from './dto/update-kri-alert.dto';

@UseGuards(JwtAuthGuard)
@Controller('risk-indicators/kri-alerts')
export class KriAlertsController {
  constructor(private readonly kriAlertsService: KriAlertsService) {}

  @Get('options')
  getKriOptions() {
    return this.kriAlertsService.getKriOptions();
  }

  @Get('active')
  findActive() {
    return this.kriAlertsService.findActiveKriAlerts();
  }

  @Get('report')
  getReport(
    @Query('year') year?: string,
    @Query('fromMonth') fromMonth?: string,
    @Query('toMonth') toMonth?: string,
    @Query('auditUniverseId') auditUniverseId?: string,
    @Query('departmentCode') departmentCode?: string,
  ) {
    return this.kriAlertsService.getKriPeriodReport({
      year: year ? parseInt(year, 10) : undefined,
      fromMonth: fromMonth ? parseInt(fromMonth, 10) : undefined,
      toMonth: toMonth ? parseInt(toMonth, 10) : undefined,
      auditUniverseId: auditUniverseId ? parseInt(auditUniverseId, 10) : undefined,
      departmentCode,
    });
  }

  @Get('compare')
  comparePeriods(
    @Query('year1') year1: string,
    @Query('month1') month1: string,
    @Query('year2') year2: string,
    @Query('month2') month2: string,
    @Query('auditUniverseId') auditUniverseId?: string,
    @Query('departmentCode') departmentCode?: string,
  ) {
    return this.kriAlertsService.compareKriPeriods(
      { year: parseInt(year1, 10), month: parseInt(month1, 10) },
      { year: parseInt(year2, 10), month: parseInt(month2, 10) },
      {
        auditUniverseId: auditUniverseId ? parseInt(auditUniverseId, 10) : undefined,
        departmentCode,
      },
    );
  }

  @Get('batches')
  getBatches() {
    return this.kriAlertsService.getKriBatches();
  }

  @Get()
  findAll() {
    return this.kriAlertsService.findAllKriAlerts();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kriAlertsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateKriAlertDto) {
    return this.kriAlertsService.createKriAlert(dto);
  }

  @Post('bulk')
  createBulk(@Body() dtoList: CreateKriAlertDto[]) {
    return this.kriAlertsService.createKriBulk(dtoList);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKriAlertDto,
  ) {
    return this.kriAlertsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.kriAlertsService.remove(id);
  }

  @Post('parse')
  @UseInterceptors(FilesInterceptor('files', 1, excelUploadOptions))
  async parseFile(@UploadedFiles() files: any[]) {
    return this.kriAlertsService.parseKriFile(files[0]);
  }

  @Post('upload-bulk')
  @UseInterceptors(FilesInterceptor('files', 20, excelUploadOptions))
  async uploadBulk(
    @UploadedFiles() files: any[],
    @Body('reportMonth') reportMonth?: string,
    @Body('reportYear') reportYear?: string,
    @Body('auditUniverseId') auditUniverseId?: string,
    @Body('departmentCode') departmentCode?: string,
  ) {
    return this.kriAlertsService.uploadKriBulkFiles(files || [], {
      reportMonth: reportMonth ? parseInt(reportMonth, 10) : undefined,
      reportYear: reportYear ? parseInt(reportYear, 10) : undefined,
      auditUniverseId: auditUniverseId ? parseInt(auditUniverseId, 10) : undefined,
      departmentCode,
    });
  }

  @Post('upload-per-file')
  @UseInterceptors(FilesInterceptor('files', 20, excelUploadOptions))
  async uploadPerFile(
    @UploadedFiles() files: any[],
    @Body('filesMetadata') filesMetadataRaw: string,
  ) {
    return this.kriAlertsService.uploadKriPerFile(files || [], filesMetadataRaw);
  }
}
