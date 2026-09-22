import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TemplateEngineService — Dịch vụ render file .docx từ template + data.
 * Sử dụng PizZip + Docxtemplater (đã có sẵn trong dependencies).
 * ponytail: Tái sử dụng pattern từ audit-minutes.service.ts, DRY hóa thành 1 service dùng chung.
 */
@Injectable()
export class TemplateEngineService {
  private readonly templatesDir = path.join(process.cwd(), 'templates');

  /**
   * Render một file .docx template với dữ liệu truyền vào.
   * @param templateFileName Tên file template (vd: 'MB01B.docx')
   * @param data Dữ liệu dạng key-value để fill vào template
   * @returns Buffer chứa file .docx đã render
   */
  async renderDocx(
    templateFileName: string,
    data: Record<string, any>,
  ): Promise<Buffer> {
    const PizZip = (await import('pizzip')).default;
    const Docxtemplater = (await import('docxtemplater')).default;

    const templatePath = path.join(this.templatesDir, templateFileName);
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException(
        `Không tìm thấy file mẫu ${templateFileName} trong thư mục templates.`,
      );
    }

    const fileContent = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(fileContent);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    return doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  /**
   * Trả về buffer nguyên bản của file template (dùng cho BA01 - văn bản tĩnh).
   */
  async getStaticTemplate(templateFileName: string): Promise<Buffer> {
    const templatePath = path.join(this.templatesDir, templateFileName);
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException(
        `Không tìm thấy file mẫu ${templateFileName}.`,
      );
    }
    return fs.readFileSync(templatePath);
  }

  /**
   * Lấy tên template KHKT phù hợp dựa trên loại cuộc kiểm toán.
   */
  getAuditPlanTemplate(auditCategory: string, engagementType: string): string {
    if (engagementType === 'Unplanned') return 'MB02A.docx';
    if (['HoiSo', 'ChuyenDe', 'HeThong'].includes(auditCategory))
      return 'MB03A.docx';
    return 'MB01A.docx'; // Default: ĐVKD
  }

  /**
   * Lấy tên template BCKT phù hợp dựa trên loại cuộc kiểm toán.
   */
  getAuditReportTemplate(
    auditCategory: string,
    engagementType: string,
  ): string {
    if (engagementType === 'Unplanned') return 'MB02B.docx';
    if (['HoiSo', 'ChuyenDe', 'HeThong'].includes(auditCategory))
      return 'MB03B.docx';
    return 'MB01B.docx'; // Default: ĐVKD
  }

  /**
   * Lấy tên template Tóm tắt BCKT phù hợp.
   */
  getSummaryReportTemplate(auditCategory: string): string {
    if (['HoiSo', 'ChuyenDe', 'HeThong'].includes(auditCategory))
      return 'MB06B.docx';
    return 'MB06A.docx';
  }
}
