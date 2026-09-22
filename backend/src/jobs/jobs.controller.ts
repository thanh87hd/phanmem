import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cae', 'audit_manager', 'team_lead')
  async getQueuesSummary() {
    return this.jobsService.getQueuesSummary();
  }

  @Get(':queueName/:id')
  async getJobStatus(
    @Param('queueName') queueName: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.getJobStatus(queueName, id);
  }

  @Post(':queueName/retry-failed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cae', 'audit_manager')
  async retryFailedJobs(@Param('queueName') queueName: string) {
    return this.jobsService.retryFailedJobs(queueName);
  }

  @Post(':queueName/clean')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async cleanQueue(@Param('queueName') queueName: string) {
    return this.jobsService.cleanQueue(queueName);
  }
}
