import { Module } from '@nestjs/common';
import { LpbankPackageService } from './lpbank-package.service';
import { LpbankPackageController } from './lpbank-package.controller';

@Module({
  controllers: [LpbankPackageController],
  providers: [LpbankPackageService],
  exports: [LpbankPackageService],
})
export class LpbankPackageModule {}
