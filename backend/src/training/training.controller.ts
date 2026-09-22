import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingController {
  constructor(private readonly service: TrainingService) {}

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('userId') userId?: string, @Query('year') year?: string) {
    return this.service.findAll({
      userId: userId ? +userId : undefined,
      year: year ? +year : undefined,
    });
  }

  @Get('cpe-summary')
  getCpeSummary(@Query('year') year?: string) {
    return this.service.getCpeSummary(year ? +year : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(+id, dto);
  }

  @Post(':id/verify')
  verify(@Param('id') id: string, @Req() req: any) {
    return this.service.verifyRecord(+id, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
