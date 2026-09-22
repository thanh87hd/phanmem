import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TestOfControlService } from './test-of-control.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('test-of-control')
export class TestOfControlController {
  constructor(private readonly tocService: TestOfControlService) {}

  @Get()
  async findAll(
    @Query('engagementId') engagementId?: string,
    @Query('result') result?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tocService.findAll({
      engagementId,
      result,
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('stats')
  async getStats() {
    return this.tocService.getSummaryStats();
  }

  @Get(':testId')
  async findOne(@Param('testId') testId: string) {
    return this.tocService.findOne(testId);
  }

  @Post()
  async create(@Body() body: any) {
    return this.tocService.create(body);
  }

  @Put(':testId')
  async update(@Param('testId') testId: string, @Body() body: any) {
    return this.tocService.update(testId, body);
  }

  @Post(':testId/exceptions')
  async addException(@Param('testId') testId: string, @Body() body: any) {
    return this.tocService.addException(testId, body);
  }

  @Post('exceptions/:exceptionId/generate-finding')
  async generateFinding(@Param('exceptionId') exceptionId: string) {
    return this.tocService.generateFindingFromException(exceptionId);
  }
}
