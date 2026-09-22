import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditRatingService } from './audit-rating.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-ratings')
export class AuditRatingController {
  constructor(private readonly ratingService: AuditRatingService) {}

  @Get()
  async findAll(
    @Query('engagementId') engagementId?: string,
    @Query('rating') rating?: string,
    @Query('status') status?: string,
  ) {
    return this.ratingService.findAll({ engagementId, rating, status });
  }

  @Get('stats')
  async getStats() {
    return this.ratingService.getSummaryStats();
  }

  @Post('preview-calculate')
  async previewCalculate(@Body() body: any) {
    return this.ratingService.computeRating(body);
  }

  @Get('engagement/:engagementId')
  async findByEngagement(@Param('engagementId') engagementId: string) {
    return this.ratingService.findByEngagement(engagementId);
  }

  @Get(':ratingCode')
  async findOne(@Param('ratingCode') ratingCode: string) {
    return this.ratingService.findOne(ratingCode);
  }

  @Post()
  async saveRating(@Body() body: any) {
    return this.ratingService.calculateAndSave(body);
  }
}
