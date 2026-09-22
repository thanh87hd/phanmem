import * as fs from 'fs';
import * as path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
} from 'docx';

async function createTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'BÁO CÁO KIỂM TOÁN NỘI BỘ',
            heading: HeadingLevel.TITLE,
            alignment: 'center',
          }),
          new Paragraph({
            text: '{title}',
            heading: HeadingLevel.HEADING_1,
            alignment: 'center',
          }),
          new Paragraph({
            text: 'Cuộc kiểm toán: {planName}',
            alignment: 'center',
          }),
          new Paragraph({
            text: 'Xếp loại: {auditRating}',
            alignment: 'center',
          }),
          new Paragraph(' '),
          new Paragraph({
            text: '1. PHẠM VI KIỂM TOÁN',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph('{scope}'),
          new Paragraph(' '),
          new Paragraph({
            text: '2. PHƯƠNG PHÁP KIỂM TOÁN',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph('{methodology}'),
          new Paragraph(' '),
          new Paragraph({
            text: '3. TÓM TẮT KẾT QUẢ KIỂM TOÁN',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph('{executiveSummary}'),
          new Paragraph(' '),
          new Paragraph({
            text: '4. CHI TIẾT CÁC PHÁT HIỆN',
            heading: HeadingLevel.HEADING_2,
          }),
          // This is where docxtemplater loop {#findings} starts, but standard docx lib doesn't generate raw tags easily without them being escaped if we do complex loops.
          // Actually docxtemplater just needs standard text '{#findings}'
          new Paragraph('{#findings}'),
          new Paragraph({
            text: 'Mã lỗi: {code} - Mức độ: {riskLevel}',
            bullet: { level: 0 },
          }),
          new Paragraph({
            text: 'Mô tả: {title}',
            bullet: { level: 1 },
          }),
          new Paragraph({
            text: 'Nguyên nhân: {cause}',
            bullet: { level: 1 },
          }),
          new Paragraph('{/findings}'),
          new Paragraph(' '),
          new Paragraph({
            text: '5. KẾT LUẬN',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph('{overallConclusion}'),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const dir = path.join(__dirname, '..', 'templates');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'AuditReportTemplate.docx'), buffer);
  console.log('Template created at templates/AuditReportTemplate.docx');
}

void createTemplate();
