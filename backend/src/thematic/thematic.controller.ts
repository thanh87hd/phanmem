import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ThematicService } from './thematic.service';
import { CreateThematicThemeDto } from './dto/create-thematic-theme.dto';
import { UpdateThematicThemeDto } from './dto/update-thematic-theme.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('thematic-themes')
@UseGuards(JwtAuthGuard)
export class ThematicController {
  constructor(private readonly thematicService: ThematicService) {}

  @Get('dashboard')
  getDashboard() {
    return this.thematicService.getDashboard();
  }

  @Get('auto-detect')
  autoDetectThemes() {
    return this.thematicService.autoDetectThemes();
  }

  @Get()
  findAll(
    @Query('domain') domain?: string,
    @Query('priority') priority?: string,
    @Query('trajectory') trajectory?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.thematicService.findAll({
      domain,
      priority,
      trajectory,
      status,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.thematicService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateThematicThemeDto) {
    return this.thematicService.create(createDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateThematicThemeDto,
  ) {
    return this.thematicService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.thematicService.remove(id);
  }
}
