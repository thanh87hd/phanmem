const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const dir = path.join(__dirname, '../../docs/Mau bieu');
const files = [
  'MB01A-KHKT-DVKD..docx',
  'MB01B_BCKT_DVKD DAKLAK.docx',
  'MB02A__KHKT_BĐT.docx',
  'MB02B - BCKT - BĐT.docx',
  'MB03A - KHKT - HSC.docx',
  'MB03B - BCKT - HSC.docx',
  'MB03 - BCKT.docx',
  'MB04 - BBKT Chi tiet_.docx',
  'MB04 - BBKT.docx',
];

async function run() {
  const report = {};
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      report[file] = 'FILE_NOT_FOUND';
      continue;
    }
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Lấy 15 dòng đầu để thấy tiêu đề, cơ quan ban hành, số hiệu
      const headerLines = lines.slice(0, 15);
      
      // Tìm các mục La mã hoặc mục lớn
      const sections = lines.filter(l => 
        /^(Phần\s+[I|V|X]+|[I|V|X]+\.|\d+\.|\bPHỤ LỤC\b|\bMỤC TIÊU\b|\bPHẠM VI\b|\bKẾT LUẬN\b|\bKIẾN NGHỊ\b)/i.test(l)
      ).slice(0, 20);

      report[file] = {
        totalLines: lines.length,
        header: headerLines,
        majorSections: sections,
      };
    } catch (e) {
      report[file] = { error: e.message };
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

run();
