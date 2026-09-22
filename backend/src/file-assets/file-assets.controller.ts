import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  Request,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { documentUploadOptions } from '../common/security/upload-options';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileAssetsService } from './file-assets.service';
import { CreateFileLinkDto } from './dto/create-file-link.dto';
import { QueryFileLinkDto } from './dto/query-file-link.dto';
import { VerifyEvidenceDto } from './dto/verify-evidence.dto';

@Controller('file-assets')
@UseGuards(JwtAuthGuard)
export class FileAssetsController {
  constructor(private readonly fileAssetsService: FileAssetsService) {}

  /**
   * POST /file-assets/upload
   * Multipart/form-data: file, ownerType, ownerId, relationType?, caption?, metadata?
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  async upload(
    @UploadedFile() file: any,
    @Body('ownerType') ownerType: string,
    @Body('ownerId') ownerId: string,
    @Body('relationType') relationType?: string,
    @Body('caption') caption?: string,
    @Body('metadata') metadataStr?: string,
    @Request() req?: any,
  ) {
    if (!ownerType || !ownerId) {
      throw new BadRequestException('Bắt buộc phải có ownerType và ownerId');
    }

    let parsedMetadata = {};
    if (metadataStr) {
      try {
        parsedMetadata =
          typeof metadataStr === 'string'
            ? JSON.parse(metadataStr)
            : metadataStr;
      } catch {
        parsedMetadata = {};
      }
    }

    return this.fileAssetsService.uploadAndLinkFile(
      file,
      ownerType,
      +ownerId,
      relationType,
      caption,
      parsedMetadata,
      req?.user?.userId,
    );
  }

  /**
   * POST /file-assets/links
   * Gắn file asset đã tồn tại vào một owner mới (Deduplication)
   */
  @Post('links')
  async createLink(@Body() dto: CreateFileLinkDto, @Request() req: any) {
    return this.fileAssetsService.createLink(dto, req?.user?.userId);
  }

  /**
   * GET /file-assets/links
   * Lọc links theo ownerType, ownerId, relationType
   */
  @Get('links')
  async findLinks(@Query() query: QueryFileLinkDto) {
    if (!query.ownerType || !query.ownerId) {
      throw new BadRequestException('Vui lòng truyền ownerType và ownerId');
    }
    return this.fileAssetsService.findLinksByOwner(
      query.ownerType,
      +query.ownerId,
      query.relationType,
    );
  }

  /**
   * GET /file-assets/links/:linkId
   */
  @Get('links/:linkId')
  async getLink(@Param('linkId', ParseIntPipe) linkId: number) {
    return this.fileAssetsService.findLinkById(linkId);
  }

  /**
   * GET /file-assets/links/:linkId/download
   * Tải tệp thông qua linkId
   */
  @Get('links/:linkId/download')
  async downloadByLink(
    @Param('linkId', ParseIntPipe) linkId: number,
    @Res() res: FastifyReply,
  ) {
    const { stream, asset } =
      await this.fileAssetsService.getFileStreamByLinkId(linkId);

    return res
      .type(asset.mimeType || 'application/octet-stream')
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(asset.originalName)}"`,
      )
      .send(stream);
  }

  /**
   * GET /file-assets/:id/download
   * Tải tệp thông qua assetId
   */
  @Get(':id/download')
  async downloadByAsset(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: FastifyReply,
  ) {
    const { stream, asset } =
      await this.fileAssetsService.getFileStreamByAssetId(id);

    return res
      .type(asset.mimeType || 'application/octet-stream')
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(asset.originalName)}"`,
      )
      .send(stream);
  }

  /**
   * DELETE /file-assets/links/:linkId
   * Gỡ liên kết file (Unlink)
   */
  @Delete('links/:linkId')
  async removeLink(@Param('linkId', ParseIntPipe) linkId: number) {
    return this.fileAssetsService.removeLink(linkId);
  }

  /**
   * POST /file-assets/links/:linkId/verify
   * Thẩm định bằng chứng kiểm toán
   */
  @Post('links/:linkId/verify')
  async verifyEvidence(
    @Param('linkId', ParseIntPipe) linkId: number,
    @Body() dto: VerifyEvidenceDto,
    @Request() req: any,
  ) {
    return this.fileAssetsService.verifyEvidence(
      linkId,
      dto,
      req?.user?.userId,
    );
  }
}
