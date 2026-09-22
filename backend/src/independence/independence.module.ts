import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndependenceController } from './independence.controller';
import { IndependenceService } from './independence.service';
import { ConflictDeclaration } from './entities/conflict-declaration.entity';
import { AuditorRotation } from './entities/auditor-rotation.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConflictDeclaration, AuditorRotation, User]),
  ],
  controllers: [IndependenceController],
  providers: [IndependenceService],
  exports: [IndependenceService],
})
export class IndependenceModule {}
