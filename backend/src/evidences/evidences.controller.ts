import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  Body,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';

import * as fs from 'fs';
import { evidenceUploadOptions } from '../common/security/upload-options';
import { EvidencesService } from './evidences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('evidences')
@UseGuards(JwtAuthGuard)
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  /**
   * POST /evidences/upload
   * multipart/form-data: file, linkedResource, linkedResourceId, description
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', evidenceUploadOptions))
  async upload(
    @UploadedFile() file: any,
    @Body('linkedResource') linkedResource: string,
    @Body('linkedResourceId') linkedResourceId: string,
    @Body('description') description: string,
    @Request() req: any,
  ) {
    return this.evidencesService.uploadFile(
      file,
      linkedResource,
      +linkedResourceId,
      description,
      req.user?.userId,
      req.user?.username,
    );
  }

  /** GET /evidences?resource=recommendations&resourceId=1 */
  @Get()
  findByResource(
    @Query('resource') resource?: string,
    @Query('resourceId') resourceId?: string,
  ) {
    if (resource && resourceId) {
      return this.evidencesService.findByResource(resource, +resourceId);
    }
    return this.evidencesService.findAll();
  }

  /** GET /evidences/:id/download — tải file về */
  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: any) {
    const evidence = await this.evidencesService.findOne(+id);
    if (!fs.existsSync(evidence.path)) {
      return res
        .status(404)
        .send({ message: 'File không tồn tại trên server' });
    }
    res.headers({
      'Content-Type': evidence.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(evidence.originalName)}"`,
    });
    fs.createReadStream(evidence.path).pipe(res);
  }

  /** DELETE /evidences/:id */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evidencesService.remove(+id);
  }

  /** POST /evidences/:id/ai-verify — thủ công chạy AI thẩm định */
  @Post(':id/ai-verify')
  aiVerify(@Param('id') id: string) {
    return this.evidencesService.verifyEvidenceWithAI(+id);
  }
}
