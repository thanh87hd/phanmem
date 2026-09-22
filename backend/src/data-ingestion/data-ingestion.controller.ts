import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataIngestionService } from './data-ingestion.service';
import {
  IngestionSource,
  IngestionStatus,
} from './entities/data-ingestion-batch.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('data-ingestion')
export class DataIngestionController {
  constructor(private readonly ingestionService: DataIngestionService) {}

  @Get('batches')
  async getAllBatches(
    @Query('dataSource') dataSource?: IngestionSource,
    @Query('status') status?: IngestionStatus,
    @Query('periodDate') periodDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ingestionService.getAllBatches({
      dataSource,
      status,
      periodDate,
      page,
      limit,
    });
  }

  @Get('batches/:id')
  async getBatchById(@Param('id') id: string) {
    return this.ingestionService.getBatchById(id);
  }

  @Post('push')
  @UseInterceptors(FileInterceptor('file'))
  async pushData(
    @UploadedFile() file: any,
    @Body('dataSource') dataSource?: IngestionSource,
    @Body('periodDate') periodDate?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    if (!file) {
      throw new HttpException(
        'File is required for ingestion',
        HttpStatus.BAD_REQUEST,
      );
    }

    const username = user?.username || 'USER';
    return this.ingestionService.handleFileUpload(
      file,
      dataSource || IngestionSource.API_PUSH,
      periodDate,
      username,
    );
  }

  @Post('trigger-scan')
  async triggerScan(@CurrentUser() user: JwtPayload) {
    const username = user?.username || 'ADMIN';
    return this.ingestionService.triggerManualScan(username);
  }

  @Post('batches/:id/reprocess')
  async reprocessBatch(@Param('id') id: string) {
    return this.ingestionService.reprocessBatch(id);
  }

  @Get('templates/:type')
  async downloadTemplate(
    @Param('type') type: 'transactions' | 'metrics',
    @Res() res: any,
  ) {
    const buffer = await this.ingestionService.generateTemplate(type);
    const filename =
      type === 'transactions'
        ? 'sample_transactions_template.xlsx'
        : 'sample_kri_metrics_template.xlsx';

    res.headers({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return res.send(buffer);
  }
}
