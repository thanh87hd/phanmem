import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '../common/interceptors/fastify-file-interceptor';
import { ExtractionService } from './extraction.service';
import { documentUploadOptions } from '../common/security/upload-options';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('extraction')
@UseGuards(JwtAuthGuard)
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  async uploadAndExtract(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên một tệp tin');
    }

    try {
      const result = await this.extractionService.extractFull(file);

      return {
        fileName: file.originalname,
        extractionTime: new Date(),
        content: result.markdown,
        length: result.markdown.length,
        pageCount: result.pageCount,
        extractionMethod: result.extractionMethod,
        confidence: result.confidence,
        category: result.category,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
