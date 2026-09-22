import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffRoster } from './entities/staff-roster.entity';
import { ResourceDemand } from './entities/resource-demand.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceCapacityService } from './resource-capacity.service';
import { ResourceCapacityController } from './resource-capacity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffRoster, ResourceDemand, ResourceAllocation]),
  ],
  controllers: [ResourceCapacityController],
  providers: [ResourceCapacityService],
  exports: [ResourceCapacityService],
})
export class ResourceCapacityModule {}
