import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  Query,
  UploadedFile,
  Body,
  Request,
  Res,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { documentUploadOptions } from '../common/security/upload-options';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('documents')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  @CheckPolicies((ability) => ability.can(Action.Create, 'Document'))
  async upload(
    @UploadedFile() file: any,
    @Body('documentType') documentType: string,
    @Body('category') category: string,
    @Body('linkedResource') linkedResource?: string,
    @Body('linkedResourceId') linkedResourceId?: string,
    @Request() req?: any,
  ) {
    const parsedLinkedResourceId =
      linkedResourceId && !isNaN(+linkedResourceId)
        ? +linkedResourceId
        : undefined;

    return this.documentsService.uploadFile(
      file,
      documentType,
      category,
      linkedResource,
      parsedLinkedResourceId,
      req?.user?.userId,
      req?.user?.username,
    );
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'Document'))
  findAll(
    @Query('linkedResource') linkedResource?: string,
    @Query('linkedResourceId') linkedResourceId?: string,
  ) {
    const filters: { linkedResource?: string; linkedResourceId?: number } = {};
    if (linkedResource) filters.linkedResource = linkedResource;
    if (linkedResourceId && !isNaN(+linkedResourceId)) {
      filters.linkedResourceId = +linkedResourceId;
    }
    return this.documentsService.findAll(filters);
  }

  @Get(':id/download')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Document'))
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: FastifyReply,
  ) {
    const { stream, doc } = await this.documentsService.getFileStream(id);
    return res
      .type(doc.mimeType || 'application/octet-stream')
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
      )
      .send(stream);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'Document'))
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.remove(id);
  }
}
