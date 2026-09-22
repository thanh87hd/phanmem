import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FrameworkService } from './framework.service';
import { FrameworkController } from './framework.controller';
import { ResourceMetadata } from './entities/resource-metadata.entity';
import { ResourceData } from './entities/resource-data.entity';
import { DynamicWorkflowsModule } from '../dynamic-workflows/dynamic-workflows.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResourceMetadata, ResourceData]),
    DynamicWorkflowsModule,
  ],
  providers: [FrameworkService],
  controllers: [FrameworkController],
  exports: [FrameworkService],
})
export class FrameworkModule {}
