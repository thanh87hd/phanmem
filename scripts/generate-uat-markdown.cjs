const fs = require('fs');
const path = require('path');

// Extract uatPersonnel and rawTestCases from generate-uat-excel.cjs
const excelScriptContent = fs.readFileSync(path.resolve(__dirname, 'generate-uat-excel.cjs'), 'utf8');

// We can extract rawTestCases and uatPersonnel by evaluating the arrays
const uatPersonnelMatch = excelScriptContent.match(/const uatPersonnel = (\[[\s\S]*?\]);/);
const rawTestCasesMatch = excelScriptContent.match(/const rawTestCases = (\[[\s\S]*?\]);/);

if (!uatPersonnelMatch || !rawTestCasesMatch) {
  console.error('Could not parse uatPersonnel or rawTestCases from generate-uat-excel.cjs');
  process.exit(1);
}

const uatPersonnel = eval(uatPersonnelMatch[1]);
const rawTestCases = eval(rawTestCasesMatch[1]);

let md = `# KỊCH BẢN KIỂM THỬ CHẤP NHẬN NGƯỜI DÙNG (UAT TEST PLAN & SCENARIOS)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ 4.0 - LPBANK

- **Cơ quan ban hành:** Ban Quản lý Dự án & Khối Kiểm toán Nội bộ - Ngân hàng TMCP Lộc Phát Việt Nam (LPBank)
- **File Excel kiểm thử đi kèm:** [\`docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.xlsx\`](file:///f:/Phan%20mem%20KTNB%204.0/docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.xlsx)
- **Môi trường Local:** \`http://localhost:5173\` (Backend API: \`http://localhost:3001/api\`)
- **Môi trường Cloud VPS:** \`https://chinhta.io.vn\` (Backend API: \`https://chinhta.io.vn/api\`)
- **Mật khẩu mặc định toàn bộ tài khoản:** \`@Lpbank2026!\`

---

## PHẦN I. 02 TESTER CHÍNH ĐIỀU PHỐI & PHÂN BỔ TÀI KHOẢN THEO VAI TRÒ TEST

Toàn bộ quá trình kiểm thử UAT hệ thống Phần mềm KTNB 4.0 do **02 Tester chính** chịu trách nhiệm thực hiện, kiểm tra chéo và đối chiếu kết quả:
- **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (\`datnc3\`) - KTV chính, Phòng Kiểm toán Đơn vị kinh doanh.
- **Tester 2 (Đối chiếu & Kiểm tra chéo):** **Ninh Xuân Điệp** (\`diepnx\`) - KTV cao cấp, Phòng Kiểm toán Đơn vị kinh doanh.

> **Quy tắc thực hiện:** Tại mỗi ca kiểm thử (Test Case), hai Tester sẽ sử dụng tài khoản được quy định tương ứng với vai trò đó (theo bảng dưới đây) để đăng nhập và thao tác nhằm kiểm thử chính xác ma trận phân quyền CASL RBAC và quy trình phê duyệt đa cấp.

| STT | Nhóm Vai Trò Cần Test | Mã Quyền CASL | Tester 1 (Đạt) Đăng Nhập | Mật Khẩu (U1) | Tester 2 (Điệp) Đăng Nhập | Mật Khẩu (U2) | Trọng Tâm & Phạm Vi Kiểm Thử UAT |
| :---: | :--- | :---: | :--- | :---: | :--- | :---: | :--- |
`;

uatPersonnel.forEach(p => {
  md += `| **${p.stt}** | **${p.roleGroup}** | \`${p.roleCode}\` | **${p.tester1User}** | \`${p.tester1Pass}\` | **${p.tester2User}** | \`${p.tester2Pass}\` | ${p.scope} |\n`;
});

md += `
---

## PHẦN II. MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC ACCESS MATRIX)

| STT | Phân Hệ / Màn Hình Chức Năng | URL | Admin | Lãnh Đạo Khối (CAE) | Lãnh Đạo Phòng (TP/PP) | Trưởng Đoàn (Lead) | KTV Thành Viên | Chuyên Gia CAATs | Auditee (ĐV được KT) | Ban Kiểm Soát (BKS) |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | Bàn Làm Việc & Điều Hành | \`/\` | **Full** | **Full** | **Full** | **Full** | View/Task | View/Task | Hạn chế | View |
| 2 | Cổng Ban Kiểm Soát (IIA 1000) | \`/audit-committee-portal\` | **Full** | View | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | **Full** |
| 3 | Giám Sát Đoàn Thanh Tra NHNN | \`/regulatory-exams\` | **Full** | **Full** | View | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | **Full** |
| 4 | Cổng Đơn Vị Được Kiểm Toán | \`/auditee-portal\` | **Full** | View | View | View | View | ❌ Chặn | **Full (ĐV mình)** | View |
| 5 | Phạm Vi & Thư Viện RCM | \`/risk-and-planning?step=scope\` | **Full** | View | **Full** | View/Edit | View | View/Edit | ❌ Chặn | View |
| 6 | Đánh Giá Rủi Ro & Kế Hoạch Năm | \`/risk-and-planning?step=plan\` | **Full** | **Approve** | Create/Submit | View | ❌ Chặn | View | ❌ Chặn | View/Monitor |
| 7 | Quản Lý Cuộc Kiểm Toán | \`/audit-engagements\` | **Full** | **Approve** | **Full** | Manage Đoàn | Thực hiện | Thực hiện | ❌ Chặn | View |
| 8 | Giấy Tờ Làm Việc (Working Papers) | \`/working-papers\` | **Full** | View | Review L2 | Review L1 | Create/Edit | Create/Edit | ❌ Chặn | ❌ Chặn |
| 9 | Phát Hiện 5C & Báo Cáo KT | \`/findings-hub\` | **Full** | **Publish** | Review/Submit | Finalize | Create/Draft | Create/Draft | Giải trình | View |
| 10 | Khắc Phục Kiến Nghị & SLA | \`/findings-hub?tab=recommendations\`| **Full** | Monitor | Monitor | Verify/Close | Verify/Close | ❌ Chặn | Update/Proof | Monitor |
| 11 | Giám Sát Liên Tục & CAATs | \`/continuous-monitoring\` | **Full** | View | View | View | View | **Full/Script** | ❌ Chặn | View |
| 12 | Việc Ngoài Đoàn & Kanban | \`/general-tasks\` | **Full** | Monitor | Manage/Assign | Thực hiện | Thực hiện | Thực hiện | ❌ Chặn | ❌ Chặn |
| 13 | Đánh Giá BSC-KPI Nhân Sự | \`/bsc-kpi\` | **Full** | Evaluate | Evaluate | Evaluate | Self/View | Self/View | ❌ Chặn | View |
| 14 | Quản Lý Hồ Sơ & Mẫu Biểu | \`/document-manager\` | **Full** | Manage | Manage | View/Use | View/Use | View/Use | ❌ Chặn | View |
| 15 | Cơ Sở Pháp Quy & Tri Thức AI | \`/regulatory-kb\` | **Full** | **Full** | **Full** | **Full** | **Full** | **Full** | View | **Full** |
| 16 | Quản Trị Hệ Thống & KTV | \`/system-admin\` | **Full** | View/Monitor | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## PHẦN III. HƯỚNG DẪN DÀNH CHO DATNC3 & DIEPNX

1. **Cơ chế phân công:**
   - **Tester 1 - Nguyễn Cảnh Đạt (\`datnc3\`):** Thực hiện luồng khởi tạo, nhập liệu chính, gửi duyệt (Tester 1).
   - **Tester 2 - Ninh Xuân Điệp (\`diepnx\`):** Thực hiện kiểm tra phê duyệt, kiểm tra chéo, thử nghiệm các trường hợp ngoại lệ / sai sót (Negative cases, validation).
2. **Quy tắc phối hợp đồng thời (Realtime Collaboration):**
   - Đối với tính năng soạn thảo Giấy tờ làm việc (Working Paper Tiptap) và Review Note, hai bạn mở đồng thời trên 2 tab hoặc 2 trình duyệt riêng biệt để kiểm tra tính năng khóa dòng / đồng bộ thời gian thực qua WebSocket.
3. **Quy ước đánh giá:**
   - **PASS (Đạt):** Tính năng chạy trơn tru, đúng logic nghiệp vụ ngân hàng, dữ liệu lưu CSDL chuẩn xác.
   - **FAIL (Lỗi):** Xuất hiện lỗi thông báo 400/403/500, nút bấm không phản hồi, lưu sai dữ liệu.
   - **BLOCKED (Bị chặn):** Bị chặn do tính năng phụ thuộc phía trước chưa hoạt động.

---

## PHẦN IV. KỊCH BẢN KIỂM THỬ CHI TIẾT TỪNG PHÂN HỆ & NÚT BẤM (50 TEST CASES)
`;

let currentModule = '';

rawTestCases.forEach((tc, idx) => {
  if (tc.module !== currentModule) {
    currentModule = tc.module;
    md += `\n### Phân Hệ: ${currentModule}\n\n`;
  }

  const stepsFormatted = tc.steps
    .split('\n')
    .map(s => `  ${s}`)
    .join('\n');

  const inputDataFormatted = tc.inputData.replace(/\n/g, ' | ');

  md += `#### \`${tc.tcId}\`: ${tc.businessName}
- **Màn hình / URL:** ${tc.screen}
- **Nút bấm / Thành phần tương tác:** \`${tc.component}\`
- **Điều kiện tiên quyết:** ${tc.precondition}
- **Các bước thao tác chi tiết (Action Steps):**
${stepsFormatted}
- **Dữ liệu đầu vào mẫu (Test Input):** ${inputDataFormatted}
- **Kết quả mong đợi (Expected Result):** ${tc.expectedResult}
- **Vai trò nghiệp vụ:** \`${tc.role}\`
- **Tài khoản đăng nhập test:** \`${tc.accountToUse}\` (Mật khẩu: \`@Lpbank2026!\`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (\`datnc3\`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (\`diepnx\`)

---
`;
});

const outPath = path.resolve('f:/Phan mem KTNB 4.0/docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md');
fs.writeFileSync(outPath, md, 'utf8');
console.log(`Successfully generated updated UAT Markdown document at: ${outPath}`);
