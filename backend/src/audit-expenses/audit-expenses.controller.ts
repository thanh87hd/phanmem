import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditExpensesService } from './audit-expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-expenses')
export class AuditExpensesController {
  constructor(private readonly service: AuditExpensesService) {}

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('engagementId') engagementId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      engagementId: engagementId ? +engagementId : undefined,
      status,
    });
  }

  @Get('summary/:engagementId')
  getSummary(@Param('engagementId') engagementId: string) {
    return this.service.getSummaryByEngagement(+engagementId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
