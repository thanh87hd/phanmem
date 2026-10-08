import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LpbankPackageService } from './lpbank-package.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Day la tien ich nap du lieu goc (master data) tu tep Excel: ghi hang loat vao
// nhieu bang nghiep vu. Truoc day chi co JwtAuthGuard nen MOI nguoi dung da dang
// nhap deu kich hoat duoc viec ghi du lieu. Gioi han cho quan tri.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
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
