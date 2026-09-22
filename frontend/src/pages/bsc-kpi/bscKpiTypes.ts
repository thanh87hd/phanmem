// ---- Kiểu dữ liệu BSC-KPI ----
export interface KpiDetail {
  kpiCode: string;
  kpiName: string;
  bscPillar: string;
  weight: number;
  threshold: number;
  target: number;
  actualValue: number | null;
  completionRate: number | null;
  weightedScore: number | null;
  status: 'Passed' | 'Warning' | 'Failed' | 'NA';
  notes?: string;
}

export interface PersonalKpiResult {
  userId: number;
  username: string;
  fullName: string;
  roleType: string;
  department: string;
  period: string;
  periodType: string;
  totalScore: number;
  xepLoai: string;
  bonusPoints: number;
  finalScore: number;
  pillarScores: Record<string, number>;
  details: KpiDetail[];
}

export interface KpiTarget {
  id?: number;
  kpiCode: string;
  kpiName: string;
  bscPillar: string;
  weight: number;
  threshold: number;
  target: number;
  maxCap: number;
  unit: string;
  description?: string;
  isActive?: boolean;
  isCustom?: boolean;
  department?: string;
}

// Kiểu dữ liệu Mẫu Chấm Điểm MB02.HRM.2026
export interface Mb02Item {
  id: string;
  tyTrongPillar: string;
  nhomTieuChi: string;
  mucTieuChienLuoc: string;
  tieuChi: string;
  moTa: string;
  tyTrong: number;
  nguong: number;
  chiTieuGiao: number;
  mucTran: number;
  batDau: string;
  ketThuc: string;
  phuongPhapDo: string;
  donViLuongHoa: string;
  ketQuaThucHien: number;
  ghiChu?: string;
}

// Mẫu 7 tiêu chí chuẩn hoá MB02.HRM.2026 từ ảnh biểu mẫu của LPBank
export const DEFAULT_MB02_ITEMS: Mb02Item[] = [
  {
    id: 'MB02_FIN_01',
    tyTrongPillar: '10%',
    nhomTieuChi: 'TÀI CHÍNH',
    mucTieuChienLuoc: 'Đảm bảo CIR, OPEX và Chi phí phân bổ (100%)',
    tieuChi: '% OPEX (100%)',
    moTa: 'Kiểm soát chi phí tại các đoàn kiểm toán không bị vượt hạn mức theo kế hoạch được phân bổ',
    tyTrong: 0.10,
    nguong: 0.95,
    chiTieuGiao: 0.98,
    mucTran: 1.00,
    batDau: '01/01/2026',
    ketThuc: '30/06/2026',
    phuongPhapDo: 'Theo phân bổ chi phí được phê duyệt tại mỗi đoàn kiểm toán/chi phí của Khối trong 6 tháng đầu năm 2026',
    donViLuongHoa: 'Khối KTNB / Khối TC&QTTC',
    ketQuaThucHien: 1.00,
  },
  {
    id: 'MB02_CUS_01',
    tyTrongPillar: '10%',
    nhomTieuChi: 'KHÁCH HÀNG',
    mucTieuChienLuoc: 'Đánh giá mức độ hài lòng đối với kết quả khi CBNV tham gia các đoàn kiểm toán',
    tieuChi: '% Đo lường mức độ hài lòng đối với đơn vị được kiểm toán; trưởng đoàn; lãnh đạo khối (100%)',
    moTa: 'Mức độ hài lòng đối với đơn vị được kiểm toán; trưởng đoàn; lãnh đạo khối; BKS',
    tyTrong: 0.10,
    nguong: 0.90,
    chiTieuGiao: 0.95,
    mucTran: 1.00,
    batDau: '01/01/2026',
    ketThuc: '30/06/2026',
    phuongPhapDo: 'Kết quả đánh giá của Trưởng đoàn, LĐK',
    donViLuongHoa: 'Trưởng đoàn kiểm toán, LĐK',
    ketQuaThucHien: 1.00,
  },
  {
    id: 'MB02_PRO_01',
    tyTrongPillar: '60%',
    nhomTieuChi: 'QUY TRÌNH',
    mucTieuChienLuoc: 'Tham gia đầy đủ các đoàn kiểm toán theo kế hoạch được phân công',
    tieuChi: '% các cuộc kiểm toán theo đúng kế hoạch phân công (40%)',
    moTa: 'Đảm bảo số lượng các cuộc kiểm toán hoàn thành theo kế hoạch được phân công',
    tyTrong: 0.24,
    nguong: 0.90,
    chiTieuGiao: 1.00,
    mucTran: 1.00,
    batDau: '01/01/2026',
    ketThuc: '30/06/2026',
    phuongPhapDo: 'Kết quả đánh giá của Trưởng đoàn, LĐK',
    donViLuongHoa: 'Trưởng đoàn kiểm toán, LĐK',
    ketQuaThucHien: 0.95,
  },
  {
    id: 'MB02_PRO_02',
    tyTrongPillar: '60%',
    nhomTieuChi: 'QUY TRÌNH',
    mucTieuChienLuoc: 'Điểm đánh giá chất lượng đoàn kiểm toán',
    tieuChi: '% các cuộc kiểm toán đạt chất lượng',
    moTa: 'Là kết quả đánh giá của Trưởng đoàn tại mỗi cuộc kiểm toán',
    tyTrong: 0.24,
    nguong: 0.90,
    chiTieuGiao: 1.00,
    mucTran: 1.00,
    batDau: '01/01/2026',
    ketThuc: '30/06/2026',
    phuongPhapDo: 'Kết quả đánh giá của Trưởng đoàn, LĐK',
    donViLuongHoa: 'Trưởng đoàn kiểm toán, LĐK',
    ketQuaThucHien: 0.90,
  },
  {
    id: 'MB02_PRO_03',
    tyTrongPillar: '60%',
    nhomTieuChi: 'QUY TRÌNH',
    mucTieuChienLuoc: 'Đánh giá kiến nghị được chấp thuận và phù hợp',
    tieuChi: '% tỷ lệ kiến nghị được chấp thuận, tuân thủ quy trình kiểm toán (20%)',
    moTa: 'Là các kiến nghị được các đơn vị được kiểm toán, liên quan chấp thuận và tổ chức thực hiện khắc phục',
    tyTrong: 0.12,
    nguong: 0.70,
    chiTieuGiao: 1.00,
    mucTran: 1.00,
    batDau: '01/01/2026',
    ketThuc: '30/06/2026',
    phuongPhapDo: 'Kết quả phản hồi các đơn vị được kiểm toán, đơn vị liên quan về việc khắc phục các kiến nghị',
    donViLuongHoa: 'Trưởng đoàn kiểm toán, LĐK',
    ketQuaThucHien: 1.00,
  },
  {
    id: 'MB02_LRN_01',
    tyTrongPillar: '10%',
    nhomTieuChi: 'HỌC HỎI & PHÁT TRIỂN',
    mucTieuChienLuoc: '% Hoàn thiện các khóa đào tạo theo yêu cầu của NH (100%)',
    tieuChi: '% tham gia các khóa đào tạo; % Hoàn thành các bài test theo quy định',
    moTa: '% tham gia các khóa đào tạo; % Hoàn thành các bài test theo quy định',
    tyTrong: 0.10,
    nguong: 0.95,
    chiTieuGiao: 1.00,
    mucTran: 1.00,
    batDau: '01/01/2026',
    ketThuc: '30/06/2026',
    phuongPhapDo: 'Thông qua hệ thống dữ liệu do Khối NS&DVNB cung cấp',
    donViLuongHoa: 'Khối NS&DVNB',
    ketQuaThucHien: 1.00,
  },
  {
    id: 'MB02_LRN_02',
    tyTrongPillar: '10%',
    nhomTieuChi: 'HỌC HỎI & PHÁT TRIỂN',
    mucTieuChienLuoc: 'Tuân thủ văn hóa doanh nghiệp và đạo đức nghề nghiệp (100%)',
    tieuChi: 'Không vi phạm Bộ quy tắc đạo đức nghề nghiệp và Văn hóa LPBank',
    moTa: 'Là mức độ chấp hành của kiểm toán viên đối với các chuẩn mực về văn hóa LPBank, Bộ quy tắc đạo đức nghề nghiệp kiểm toán nội bộ và các quy định về ứng xử, tác phong, tính độc lập, khách quan, liêm chính',
    tyTrong: 0.10,
    nguong: 1.00,
    chiTieuGiao: 1.00,
    mucTran: 1.00,
    batDau: '01/01/2026',
    ketThuc: '30/06/2026',
    phuongPhapDo: 'Kết quả đánh giá của Trưởng đoàn, cấp quản lý phòng, Ban Lãnh đạo',
    donViLuongHoa: 'Khối KTNB',
    ketQuaThucHien: 1.00,
  },
];

// ---- Helpers ----
export const XEPLOAI_COLOR: Record<string, string> = {
  'Vượt trội': '#ea9105',
  'Vượt yêu cầu': '#52c41a',
  'Đạt yêu cầu': '#fa8c16',
  'Không đạt': '#ff4d4f',
  'Cần cố gắng': '#ff4d4f',
};

export const BSC_PILLAR_COLOR: Record<string, string> = {
  'TÀI CHÍNH': 'blue',
  'KHÁCH HÀNG': 'cyan',
  'QUY TRÌNH': 'green',
  'HỌC HỎI & PHÁT TRIỂN': 'purple',
  'CẤU HÌNH HỆ THỐNG': 'orange',
};

export function buildPeriodOptions() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear + 1, currentYear, currentYear - 1];
  const opts: { label: string; value: string }[] = [];

  for (const yr of years) {
    opts.push({ label: `Năm ${yr}`, value: `${yr}` });
    opts.push({ label: `6 tháng đầu ${yr} (H1)`, value: `${yr}-H1` });
    opts.push({ label: `6 tháng cuối ${yr} (H2)`, value: `${yr}-H2` });
    opts.push({ label: `Quý 1/${yr}`, value: `${yr}-Q1` });
    opts.push({ label: `Quý 2/${yr}`, value: `${yr}-Q2` });
    opts.push({ label: `Quý 3/${yr}`, value: `${yr}-Q3` });
    opts.push({ label: `Quý 4/${yr}`, value: `${yr}-Q4` });
  }
  return opts;
}

export function normalizeToPercent(score: number): number {
  if (score <= 1.5 && score > 0) return score * 100;
  return score;
}
