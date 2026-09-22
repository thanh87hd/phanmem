import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { ScopeFilterService } from './scope-filter.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [ScopeFilterService],
  exports: [ScopeFilterService],
})
export class ScopeFilterModule {}
