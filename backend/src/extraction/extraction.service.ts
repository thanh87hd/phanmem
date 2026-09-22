import { Injectable, Logger } from '@nestjs/common';
import { processPdf, classifyPdf } from '@firecrawl/pdf-inspector';
import axios from 'axios';
import FormData from 'form-data';

export interface ExtractionResult {
  markdown: string;
  pageCount?: number;
  confidence?: number;
  extractionMethod?: string;
  extractionTime?: number;
  category?: string;
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private readonly markerServiceUrl =
    process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8000/extract';

  /**
   * Trích xuất nội dung từ file → Markdown.
   * Trả về string (backward compatible) hoặc ExtractionResult đầy đủ.
   */
  async extractText(file: any): Promise<string> {
    const result = await this.extractFull(file);
    return result.markdown;
  }

  /**
   * Trích xuất nội dung từ file → ExtractionResult đầy đủ (kèm metadata).
   */
  async extractFull(file: any): Promise<ExtractionResult> {
    if (!file) {
      throw new Error('Tệp tải lên không hợp lệ');
    }

    // Normalize input: file có thể là string (đường dẫn), hoặc object { buffer, originalname, path }
    const filename =
      typeof file === 'string'
        ? file.split(/[\\/]/).pop() || 'unknown'
        : file.originalname || file.filename || 'unknown';
    const ext = filename.split('.').pop()?.toLowerCase();

    // Plain text → passthrough
    if (ext === 'md' || ext === 'txt') {
      const text =
        typeof file === 'string'
          ? require('fs').readFileSync(file, 'utf-8')
          : file.buffer
            ? file.buffer.toString('utf8')
            : require('fs').readFileSync(file.path, 'utf-8');
      return {
        markdown: text,
        pageCount: 1,
        confidence: 1.0,
        extractionMethod: 'passthrough',
        extractionTime: 0,
      };
    }

    const supportedExts = [
      'pdf',
      'docx',
      'doc',
      'pptx',
      'xlsx',
      'epub',
      'html',
      'htm',
      'jpg',
      'jpeg',
      'png',
      'tiff',
      'bmp',
      'webp',
    ];
    if (!supportedExts.includes(ext || '')) {
      throw new Error(
        `Định dạng file không hỗ trợ. Chỉ chấp nhận: ${supportedExts.map((e) => '.' + e).join(', ')}`,
      );
    }

    // PDF: try fast path via pdf-inspector first (Rust native, ~10-50ms for text-based)
    if (ext === 'pdf') {
      const buffer =
        typeof file === 'string'
          ? require('fs').readFileSync(file)
          : file.buffer
            ? file.buffer
            : require('fs').readFileSync(file.path);
      return this.extractPdfText(buffer, filename);
    }

    // All other formats: route to Marker-Surya OCR Service
    return this.extractViaMarkerService(file);
  }

  /**
   * PDF extraction via @firecrawl/pdf-inspector.
   * Text-based/Mixed PDFs: extract native markdown (fast path).
   * Scanned/Image PDFs: fallback to Marker-Surya service.
   */
  private async extractPdfText(
    buffer: Buffer,
    filename: string,
  ): Promise<ExtractionResult> {
    const classification = classifyPdf(buffer);
    this.logger.log(
      `[pdf-inspector] ${filename}: type=${classification.pdfType}, pages=${classification.pageCount}, ` +
        `pagesNeedingOcr=${(classification as any).pagesNeedingOcr?.length ?? 0}`,
    );

    if (
      classification.pdfType === 'Scanned' ||
      classification.pdfType === 'ImageBased'
    ) {
      this.logger.warn(
        `[pdf-inspector] ${filename} là PDF dạng scan/ảnh, chuyển sang Marker-Surya OCR`,
      );
      return this.extractViaMarkerService({
        buffer,
        originalname: filename,
      });
    }

    const result = processPdf(buffer);

    if (!result.markdown || !result.markdown.trim()) {
      this.logger.warn(
        `[pdf-inspector] ${filename} extract trả về rỗng, thử Marker-Surya fallback`,
      );
      return this.extractViaMarkerService({
        buffer,
        originalname: filename,
      });
    }

    this.logger.log(
      `[pdf-inspector] ${filename}: extract thành công (${result.markdown.length} chars)`,
    );
    return {
      markdown: result.markdown,
      pageCount: classification.pageCount,
      confidence: 1.0,
      extractionMethod: 'pdf-inspector',
      extractionTime: 0,
    };
  }

  /**
   * Route file qua Marker-Surya OCR Service (FastAPI Python).
   * Trả về ExtractionResult đầy đủ.
   */
  private async extractViaMarkerService(file: any): Promise<ExtractionResult> {
    try {
      const buffer =
        typeof file === 'string'
          ? require('fs').readFileSync(file)
          : file.buffer
            ? file.buffer
            : require('fs').readFileSync(file.path);
      const filename =
        typeof file === 'string'
          ? file.split(/[\\/]/).pop() || 'unknown'
          : file.originalname || file.filename || 'unknown';

      this.logger.log(
        `Đang gửi file ${filename} tới Marker-Surya OCR Service...`,
      );

      const formData = new FormData();
      formData.append('file', buffer, { filename });

      const response = await axios.post(this.markerServiceUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000, // 2 phút cho file lớn / nhiều trang
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      if (response.data && response.data.markdown) {
        this.logger.log(
          `Marker-Surya OCR thành công: ${filename} (${response.data.markdown.length} chars, ` +
            `${response.data.pageCount || '?'} pages, ${response.data.extractionTime || '?'}s)`,
        );
        return {
          markdown: response.data.markdown,
          pageCount: response.data.pageCount,
          confidence: response.data.confidence,
          extractionMethod: response.data.extractionMethod || 'marker-surya',
          extractionTime: response.data.extractionTime,
          category: response.data.category,
        };
      }

      throw new Error('Marker-Surya Service không trả về kết quả markdown');
    } catch (error: any) {
      this.logger.error(
        `Lỗi khi gọi Marker-Surya OCR Service: ${error.message}`,
      );
      throw new Error(
        `OCR Service Error: ${error.message}. Vui lòng đảm bảo Marker-Surya OCR Service đang chạy (python ocr-service/main.py).`,
      );
    }
  }
}
