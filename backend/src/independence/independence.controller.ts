import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IndependenceService } from './independence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('independence')
@UseGuards(JwtAuthGuard)
export class IndependenceController {
  constructor(private readonly independenceService: IndependenceService) {}

  @Get('declarations')
  getDeclarations() {
    return this.independenceService.getDeclarations();
  }

  @Post('declarations')
  createDeclaration(@Request() req: any, @Body() data: any) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.independenceService.createDeclaration(userId, data);
  }

  @Post('declarations/:id/approve-exception')
  approveException(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.independenceService.approveConflictException(+id, req.user, notes);
  }

  @Post('declarations/:id/reject-exception')
  rejectException(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.independenceService.rejectConflictException(+id, req.user, notes);
  }

  @Get('rotations')
  getRotations() {
    return this.independenceService.getRotations();
  }

  @Post('rotations')
  createRotation(@Body() data: any) {
    return this.independenceService.createRotation(data);
  }

  @Delete('rotations/:id')
  deleteRotation(@Param('id') id: string) {
    return this.independenceService.deleteRotation(+id);
  }

  @Get('cooling-off')
  getCoolingOff() {
    return this.independenceService.getCoolingOff();
  }

  @Post('cooling-off')
  saveCoolingOff(@Body() data: any) {
    return this.independenceService.saveCoolingOff(data);
  }

  @Delete('cooling-off/:userId')
  removeCoolingOff(@Param('userId') userId: string) {
    return this.independenceService.removeCoolingOff(+userId);
  }

  @Post('check-safety')
  checkSafety(
    @Body()
    body: {
      userId: number;
      auditorName: string;
      departmentName: string;
    },
  ) {
    return this.independenceService.checkAssignmentSafety(
      body.userId,
      body.auditorName,
      body.departmentName,
    );
  }
}
