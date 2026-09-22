import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RiskWeightService } from './risk-weight.service';
import { CreateRiskWeightDto } from './dto/create-risk-weight.dto';
import { UpdateRiskWeightDto } from './dto/update-risk-weight.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('risk-weights')
export class RiskWeightController {
  constructor(private readonly riskWeightService: RiskWeightService) {}

  /**
   * POST /risk-weights
   * Tạo mới trọng số cho một đánh giá rủi ro.
   * Tự động tính lại totalWeight của assessment sau khi tạo.
   */
  @Post()
  create(@Body() dto: CreateRiskWeightDto, @CurrentUser() user: JwtPayload) {
    return this.riskWeightService.create(dto, user.userId);
  }

  /**
   * GET /risk-weights/assessment/:assessmentId
   * Lấy danh sách trọng số theo assessmentId.
   */
  @Get('assessment/:assessmentId')
  findAllByAssessment(
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.riskWeightService.findAllByAssessment(assessmentId);
  }

  /**
   * GET /risk-weights/assessment/:assessmentId/summary
   * Lấy tổng trọng số và tổng điểm cho một assessment (không thay đổi dữ liệu).
   */
  @Get('assessment/:assessmentId/summary')
  async getSummary(@Param('assessmentId', ParseIntPipe) assessmentId: number) {
    return this.riskWeightService.recalculateTotalWeight(assessmentId);
  }

  /**
   * GET /risk-weights/:id
   * Lấy chi tiết một trọng số.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.riskWeightService.findOne(id);
  }

  /**
   * PATCH /risk-weights/:id
   * Cập nhật trọng số. Tự động tính lại totalWeight.
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRiskWeightDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.riskWeightService.update(id, dto, user.userId);
  }

  /**
   * DELETE /risk-weights/:id
   * Xóa trọng số. Tự động tính lại totalWeight.
   */
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.riskWeightService.remove(id, user.userId);
  }
}
