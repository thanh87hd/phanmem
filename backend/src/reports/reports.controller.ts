import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAll() {
    return this.reportsService.findAll();
  }

  @Get('allowed')
  findAllowedForRole(@Request() req: any) {
    const role = req.user?.role || 'Khách';
    const permissions = req.user?.permissions || '';
    return this.reportsService.findAllowedForUser(role, permissions);
  }

  @Get(':id/execute')
  executeReport(@Param('id') id: string) {
    return this.reportsService.executeReport(+id);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.reportsService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.reportsService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportsService.remove(+id);
  }
}
