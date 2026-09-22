import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LpbankPackageService } from './lpbank-package.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('lpbank-package')
export class LpbankPackageController {
  constructor(private readonly packageService: LpbankPackageService) {}

  @Get('files')
  getFiles() {
    return this.packageService.getPackageFiles();
  }

  @Post('seed-all')
  async seedAll() {
    return this.packageService.seedAllLpBankData();
  }
}
