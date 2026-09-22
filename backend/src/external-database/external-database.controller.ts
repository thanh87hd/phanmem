import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ExternalDatabaseService } from './external-database.service';
import {
  ConnectExternalDbDto,
  CreateExternalDbDto,
  UpdateExternalDbDto,
  TestConnectionDto,
} from './external-database.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('external-database')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ExternalDatabaseController {
  constructor(private readonly externalDbService: ExternalDatabaseService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'ExternalDatabase'))
  async findAll() {
    return await this.externalDbService.findAll();
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'ExternalDatabase'))
  async findOne(@Param('id') id: string) {
    return await this.externalDbService.findOne(id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'ExternalDatabase'))
  async create(@Body() dto: CreateExternalDbDto) {
    return await this.externalDbService.create(dto);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'ExternalDatabase'))
  async update(@Param('id') id: string, @Body() dto: UpdateExternalDbDto) {
    return await this.externalDbService.update(id, dto);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'ExternalDatabase'))
  async remove(@Param('id') id: string) {
    await this.externalDbService.remove(id);
    return { success: true };
  }

  @Post('test-connection')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'ExternalDatabase'))
  async testConnection(@Body() dto: TestConnectionDto) {
    return await this.externalDbService.testConnection(dto);
  }

  @Post('query')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'ExternalDatabase'))
  async query(@Body() dto: ConnectExternalDbDto) {
    const data = await this.externalDbService.queryExternalDb(dto);
    return {
      success: true,
      data,
    };
  }

  @Post('query-saved/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'ExternalDatabase'))
  async querySaved(@Param('id') id: string, @Body() body: { query: string }) {
    const data = await this.externalDbService.querySavedDb(id, body.query);
    return {
      success: true,
      data,
    };
  }
}
