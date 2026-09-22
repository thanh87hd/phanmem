import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserCompetency } from './entities/user-competency.entity';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCompetency]), AuditTrailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
