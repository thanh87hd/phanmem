const fs = require('fs');
const path = require('path');
const xlsx = require('f:/Phan mem KTNB 4.0/backend/node_modules/xlsx');

function formatExcelDate(serial) {
  if (!serial) return '';
  if (typeof serial === 'string') return serial.trim();
  const d = xlsx.SSF.parse_date_code(serial);
  if (!d) return String(serial);
  const y = d.y;
  const m = String(d.m).padStart(2, '0');
  const day = String(d.d).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolveDepartment(dept) {
  if (!dept) return 'Khối KTNB';
  const d = dept.trim();
  if (d.includes('BGĐ')) return 'Ban Giám đốc Khối KTNB';
  if (d.includes('HS và HT') || d.includes('hội sở')) return 'Phòng kiểm toán hội sở và hệ thống';
  if (d.includes('ĐVKD') || d.includes('kinh doanh')) return 'Phòng kiểm toán đơn vị kinh doanh';
  return d;
}

function resolveRole(title, dept) {
  const t = (title || '').trim().toLowerCase();
  const d = (dept || '').trim().toLowerCase();

  if (t.includes('giám đốc') || t.includes('bgđ')) {
    return 'Phó Giám đốc Khối kiểm toán nội bộ';
  }
  if (t.includes('phó phòng') || t.includes('trưởng phòng')) {
    if (d.includes('đvkd') || d.includes('kinh doanh')) {
      return 'Phó phòng kiểm toán đơn vị kinh doanh';
    }
    return 'Phó phòng kiểm toán hội sở hệ thống';
  }
  if (t.includes('chuyên gia')) {
    return 'Chuyên gia';
  }
  if (t.includes('cao cấp')) {
    return 'Kiểm toán viên cao cấp';
  }
  if (t.includes('chính')) {
    return 'Kiểm toán viên chính';
  }
  return 'Kiểm toán viên';
}

function main() {
  const contactFilePath = path.resolve(__dirname, '../docs/Danh bạ Khoi KTNB-cap nhật đến 16.8.2026.xlsx');
  const destFilePath = path.resolve(__dirname, '../docs/02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx');

  console.log('Reading contact file:', contactFilePath);
  const wb = xlsx.readFile(contactFilePath);
  const ws = wb.Sheets['Sheet1'];
  const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1 });

  const personnelList = [];

  for (let i = 6; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;
    // Skip section headers like "BAN GIÁM ĐỐC KHỐI KTNB"
    if (row.length === 1 || (typeof row[0] === 'string' && isNaN(Number(row[0])))) {
      continue;
    }

    const stt = row[0];
    const employeeId = row[1] ? String(row[1]).trim() : '';
    const fullName = row[2] ? String(row[2]).trim() : '';
    const rawJobTitle = row[3] ? String(row[3]).trim() : 'Kiểm toán viên';
    const rawDept = row[4] ? String(row[4]).trim() : '';
    const workplace = row[5] ? String(row[5]).trim() : 'MB';
    const startDate = formatExcelDate(row[6]);
    const birthDate = formatExcelDate(row[7]);
    const landline = row[8] ? String(row[8]).trim() : '';
    const phone = row[9] ? String(row[9]).trim().replace(/\s+/g, '') : '';
    const email = row[10] ? String(row[10]).trim() : '';

    if (!employeeId && !email && !fullName) continue;

    const username = email ? email.split('@')[0].toLowerCase() : `user${employeeId}`;
    const department = resolveDepartment(rawDept);
    const role = resolveRole(rawJobTitle, rawDept);

    const record = {
      'Mã nhân viên': employeeId,
      'Tên đăng nhập': username,
      'Họ và tên': fullName,
      'Email': email,
      'Số điện thoại': phone,
      'Số máy lẻ': landline,
      'Phòng ban': department,
      'Chức danh chuyên môn': rawJobTitle,
      'Nhóm quyền': role,
      'Nơi làm việc': workplace,
      'Trạng thái': 'Active',
    };
    if (startDate) record['Ngày vào KTNB'] = startDate;
    if (birthDate) record['Ngày sinh'] = birthDate;

    personnelList.push(record);
  }

  console.log(`Successfully parsed ${personnelList.length} personnel records from contact file.`);
  console.log('Sample record 1:', personnelList[0]);
  console.log('Sample record 2:', personnelList[1]);

  // Create new workbook
  const newWb = xlsx.utils.book_new();
  const newWs = xlsx.utils.json_to_sheet(personnelList);

  // Set column widths
  newWs['!cols'] = [
    { wch: 14 }, // Mã nhân viên
    { wch: 16 }, // Tên đăng nhập
    { wch: 26 }, // Họ và tên
    { wch: 28 }, // Email
    { wch: 16 }, // Số điện thoại
    { wch: 12 }, // Số máy lẻ
    { wch: 38 }, // Phòng ban
    { wch: 30 }, // Chức danh chuyên môn
    { wch: 36 }, // Nhóm quyền
    { wch: 14 }, // Nơi làm việc
    { wch: 15 }, // Ngày vào KTNB
    { wch: 15 }, // Ngày sinh
    { wch: 12 }, // Trạng thái
    { wch: 26 }, // Đơn vị từng công tác
    { wch: 24 }, // Thời hạn cách ly độc lập
  ];

  xlsx.utils.book_append_sheet(newWb, newWs, 'Nhan_Su_KTV_Va_Auditee');

  xlsx.writeFile(newWb, destFilePath);
  console.log('✅ Successfully wrote to', destFilePath);
}

main();
