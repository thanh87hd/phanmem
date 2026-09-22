import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalDatabaseService } from './external-database.service';
import { ExternalDatabaseController } from './external-database.controller';
import { ExternalDatabaseConnection } from './external-database.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalDatabaseConnection])],
  controllers: [ExternalDatabaseController],
  providers: [ExternalDatabaseService],
  exports: [ExternalDatabaseService],
})
export class ExternalDatabaseModule {}
