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

  /**
   * GET /evidences/:id/download — tải file về.
   *
   * UAT TC-WP-04: thêm tham số `?inline=true` để XEM TRƯỚC bằng chứng ngay
   * trong trình duyệt thay vì buộc phải tải xuống rồi mở bằng phần mềm ngoài.
   *
   * Trước đây endpoint này LUÔN trả `Content-Disposition: attachment` nên UI
   * Working Paper chỉ có nút "Tải"; trong khi endpoint tương ứng của
   * `file-assets` đã hỗ trợ `inline` từ trước — tức là backend đã có năng lực
   * nhưng thiếu ở đúng đường dẫn mà bằng chứng W/P sử dụng.
   */
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Res() res: any,
    @Query('inline') inline?: string,
  ) {
    const evidence = await this.evidencesService.findOne(+id);
    if (!fs.existsSync(evidence.path)) {
      return res
        .status(404)
        .send({ message: 'File không tồn tại trên server' });
    }
    const dispositionType =
      inline === 'true' || inline === '1' ? 'inline' : 'attachment';
    res.headers({
      'Content-Type': evidence.mimeType,
      'Content-Disposition': `${dispositionType}; filename="${encodeURIComponent(evidence.originalName)}"`,
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
