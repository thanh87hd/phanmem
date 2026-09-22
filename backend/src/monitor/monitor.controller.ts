import { Controller, Get, UseGuards } from '@nestjs/common';
import { MonitorService } from './monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('monitor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('server')
  @Roles('Admin')
  async getServerStats() {
    return this.monitorService.getServerStats();
  }

  @Get('server-test')
  async getServerStatsTest() {
    return this.monitorService.getServerStats();
  }

  @Get('database')
  @Roles('Admin')
  async getDatabaseStats() {
    return this.monitorService.getDatabaseStats();
  }

  @Get('queues')
  @Roles('Admin')
  async getQueueStats() {
    return this.monitorService.getQueueStats();
  }
}
