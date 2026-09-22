import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import { StorageModule } from '../common/storage/storage.module';
import { FileAssetsModule } from '../file-assets/file-assets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    StorageModule,
    FileAssetsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
