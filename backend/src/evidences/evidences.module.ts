import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FastifyMulterModule as MulterModule } from '../common/interceptors/fastify-file-interceptor';
import { Evidence } from './entities/evidence.entity';
import { EvidencesService } from './evidences.service';
import { EvidencesController } from './evidences.controller';
import { evidenceUploadOptions } from '../common/security/upload-options';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../common/storage/storage.module';
import { FileAssetsModule } from '../file-assets/file-assets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evidence]),
    MulterModule.register(evidenceUploadOptions),
    AiModule,
    StorageModule,
    FileAssetsModule,
  ],
  controllers: [EvidencesController],
  providers: [EvidencesService],
  exports: [EvidencesService],
})
export class EvidencesModule {}
