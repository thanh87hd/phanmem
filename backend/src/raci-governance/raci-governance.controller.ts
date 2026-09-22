import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RaciGovernanceService } from './raci-governance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('raci-governance')
export class RaciGovernanceController {
  constructor(private readonly raciService: RaciGovernanceService) {}

  @Get('processes')
  async getProcesses() {
    return this.raciService.getProcesses();
  }

  @Get('processes/:processId/activities')
  async getActivities(@Param('processId') processId: string) {
    return this.raciService.getActivities(processId);
  }

  @Get('processes/:processId/matrix')
  async getMatrix(@Param('processId') processId: string) {
    return this.raciService.getRaciMatrix(processId);
  }

  @Get('processes/:processId/qa-checks')
  async runQaChecks(@Param('processId') processId: string) {
    return this.raciService.runQaRaciChecks(processId);
  }
}
