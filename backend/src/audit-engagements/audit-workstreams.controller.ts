import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditWorkstreamsService } from './audit-workstreams.service';

@Controller('audit-workstreams')
@UseGuards(JwtAuthGuard)
export class AuditWorkstreamsController {
  constructor(private readonly service: AuditWorkstreamsService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateWorkstream(+id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteWorkstream(+id, req.user);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Request() req: any) {
    return this.service.completeWorkstream(+id, req.user);
  }

  @Post(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: { status: string; reviewNotes?: string },
    @Request() req: any,
  ) {
    return this.service.reviewWorkstream(+id, dto, req.user);
  }
}
