/**
 * AUDIT CONSTANTS & DOMAIN RULES (Single Source of Truth)
 * Tiêu chuẩn VSA 230 / IIA GIAS 2024
 */

// ─────────────────────────────────────────────────────────────
// 1. TÍN DỤNG (40 CỘT) CONSTANTS
// ─────────────────────────────────────────────────────────────

export const RISK_GROUPS = [
  '01. Công tác thu thập hồ sơ KH',
  '02. Công tác đề xuất, thẩm định cấp tín dụng',
  '03. Công tác phê duyệt cấp tín dụng',
  '04. Công tác nhận và quản lý TSBĐ',
  '05. Công tác soạn thảo văn kiện tín dụng, bảo đảm tín dụng',
  '06. Công tác giải ngân, phát hành bảo lãnh, thu nợ',
  '07. Công tác quản lý sau cấp tín dụng',
  '08. Công tác xử lý nợ',
  '09. Phân loại nợ, trích lập và sử dụng dự phòng rủi ro',
] as const;

export const CAUSE_TYPES = [
  '1. Cá nhân - Chủ quan',
  '2. Cá nhân - Khách quan',
  '3. Quy trình - Không phù hợp Pháp luật/NHNN',
  '4. Quy trình - Mâu thuẫn nội bộ',
  '5. Quy trình - Không phù hợp thực tế',
  '6. Quy trình - Chưa có quy định cụ thể',
  '7. Khác',
] as const;

export const CONTROL_QUALITIES = ['Rất tốt', 'Tốt', 'Trung bình', 'Yếu', 'Rất yếu'] as const;
export const INHERENT_RISKS = ['Cao', 'Trung bình', 'Thấp'] as const;
export const RISK_CATEGORIES = [
  'Rủi ro liên quan đến tín dụng',
  'Rủi ro hoạt động',
  'Rủi ro tập trung',
] as const;
export const CUSTOMER_TYPES = ['Cá nhân', 'Doanh nghiệp'] as const;
export const AUDITEE_OPINIONS = ['Đồng ý', 'Không đồng ý'] as const;
export const VIOLATION_HISTORIES = ['Lần đầu', 'Lặp lại', 'Hệ thống'] as const;

/**
 * Ma trận tính toán Rủi ro còn lại (Residual Risk) từ Rủi ro Cố hữu (Inherent) và Chất lượng Kiểm soát (Control Quality)
 * Tuân thủ phương pháp luận Kiểm toán Nội bộ Ngân hàng:
 * - Cố hữu Cao + Kiểm soát Tốt => Rủi ro còn lại Trung bình
 * - Cố hữu Cao + Kiểm soát Yếu/TB => Rủi ro còn lại Cao
 * - Cố hữu TB + Kiểm soát Tốt => Rủi ro còn lại Thấp
 * - Cố hữu TB + Kiểm soát Yếu => Rủi ro còn lại Cao
 * - Cố hữu Thấp + Kiểm soát Yếu => Rủi ro còn lại Trung bình
 * - Cố hữu Thấp + Kiểm soát Tốt/TB => Rủi ro còn lại Thấp
 */
export const calculateResidualRisk = (inh: string, qual: string): string => {
  const i = (inh || '').toLowerCase();
  const q = (qual || '').toLowerCase();

  if (i.includes('cao') || i.includes('critical') || i.includes('high')) {
    return q.includes('tốt') ? 'Trung bình' : 'Cao';
  }
  if (i.includes('trung bình') || i.includes('medium')) {
    if (q.includes('tốt')) return 'Thấp';
    if (q.includes('yếu') || q.includes('kém')) return 'Cao';
    return 'Trung bình';
  }
  if (i.includes('thấp') || i.includes('low')) {
    return q.includes('yếu') ? 'Trung bình' : 'Thấp';
  }
  return 'Trung bình';
};

// ─────────────────────────────────────────────────────────────
// 2. PHI TÍN DỤNG (20 CỘT) CONSTANTS
// ─────────────────────────────────────────────────────────────

export const DEFAULT_PTD_PROCESSES = [
  'Công tác quản lý tồn quỹ tiền mặt cuối ngày',
  'Công tác kiểm quỹ cuối ngày',
  'Công tác bàn giao bảo quản tiền mặt của GDV khi hết giờ làm việc buổi sáng',
  'Công tác thu gom cuối ngày dòng tiền Tiết kiệm bưu điện',
  'Công tác cung cấp dịch vụ ngân hàng',
  'Công tác quản lý dòng tiền Bưu điện',
  'Công tác quản lý ấn chỉ quan trọng (ACQT)',
  'Công tác thẩm định và phê duyệt hạn mức thẻ',
  'Kiểm soát hạn mức giao dịch quầy',
  'Công tác quản lý tài khoản thanh toán và eBanking',
  'An toàn kho quỹ và hệ thống camera giám sát',
] as const;

export const RISK_LEVEL_OPTIONS = [
  { label: '1 - Rủi ro thấp', value: 'Thấp' },
  { label: '2 - Rủi ro trung bình', value: 'Trung bình' },
  { label: '3 - Rủi ro cao', value: 'Cao' },
  { label: '4 - Cảnh báo rủi ro', value: 'Cảnh báo' },
] as const;

export const REMEDIATION_STATUS_OPTIONS = [
  { label: 'Chưa thực hiện', value: 'FAIL' },
  { label: 'Đang thực hiện', value: 'EXCEPTION' },
  { label: 'Đã hoàn thành', value: 'PASS' },
] as const;
