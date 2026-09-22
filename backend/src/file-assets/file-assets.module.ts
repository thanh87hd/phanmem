import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../common/storage/storage.module';
import { FileAsset } from './entities/file-asset.entity';
import { FileLink } from './entities/file-link.entity';
import { EvidenceVerification } from './entities/evidence-verification.entity';
import { FileAssetsService } from './file-assets.service';
import { FileAssetsController } from './file-assets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileAsset, FileLink, EvidenceVerification]),
    StorageModule,
  ],
  controllers: [FileAssetsController],
  providers: [FileAssetsService],
  exports: [FileAssetsService, TypeOrmModule],
})
export class FileAssetsModule {}
