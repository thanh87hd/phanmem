/**
 * Seed Script: Cơ cấu Tổ chức LPBank đầy đủ
 *
 * Chạy bằng cách thêm vào SeederService hoặc gọi trực tiếp qua HTTP:
 * POST /departments với từng bản ghi bên dưới.
 *
 * 4 nhóm ngành dọc:
 * - KHCN (Ngân hàng Bán lẻ)
 * - HUB_DN_VanHanh (HUB Doanh nghiệp & Vận hành)
 * - TrungTamKinhDoanh (Trung tâm Kinh doanh)
 * - TrungTamKHDNLon (Trung tâm KHDN Lớn)
 */

export const LPBANK_ORG_SEED = [
  // ============================================================
  // CẤP 1: Hội đồng & Ủy ban (Governance)
  // ============================================================
  {
    code: 'HDQT',
    name: 'Hội đồng Quản trị',
    unitType: 'HoiDong',
    parent: null,

    status: 'Active',
  },
  {
    code: 'BKS',
    name: 'Ban Kiểm soát',
    unitType: 'UyBan',
    parent: 'HDQT',

    status: 'Active',
  },
  {
    code: 'UBKT',
    name: 'Ủy ban Kiểm toán (Audit Committee)',
    unitType: 'UyBan',
    parent: 'HDQT',

    status: 'Active',
  },
  {
    code: 'UBQLRR',
    name: 'Ủy ban Quản lý Rủi ro',
    unitType: 'UyBan',
    parent: 'HDQT',

    status: 'Active',
  },
  {
    code: 'UBNS',
    name: 'Ủy ban Nhân sự & Lương thưởng',
    unitType: 'UyBan',
    parent: 'HDQT',

    status: 'Active',
  },
  {
    code: 'HDTD',
    name: 'Hội đồng Tín dụng',
    unitType: 'HoiDong',
    parent: null,

    status: 'Active',
  },
  {
    code: 'HDALCO',
    name: 'Hội đồng ALCO',
    unitType: 'HoiDong',
    parent: null,

    status: 'Active',
  },

  // ============================================================
  // CẤP 1: Ban Điều hành (Ban TGĐ)
  // ============================================================
  {
    code: 'BDH',
    name: 'Ban Điều hành',
    unitType: 'UyBan',
    parent: null,

    status: 'Active',
  },

  // ============================================================
  // KHỐI KIỂM TOÁN NỘI BỘ (KTNB)
  // ============================================================
  {
    code: 'KTNB',
    name: 'Khối Kiểm toán Nội bộ',
    unitType: 'Khoi',
    parent: 'UBKT',

    status: 'Active',
  },
  {
    code: 'PKT_HO',
    name: 'Phòng KT Hội sở & Hệ thống',
    unitType: 'Phong',
    parent: 'KTNB',

    status: 'Active',
  },
  {
    code: 'PKT_DVKD',
    name: 'Phòng KT Đơn vị Kinh doanh',
    unitType: 'Phong',
    parent: 'KTNB',

    status: 'Active',
  },
  {
    code: 'TONGHOP',
    name: 'Bộ phận Tổng hợp KTNB',
    unitType: 'Phong',
    parent: 'KTNB',

    status: 'Active',
  },

  // ============================================================
  // KHỐI NGÂN HÀNG BÁN LẺ — Ngành dọc KHCN
  // ============================================================
  {
    code: 'KHCN',
    name: 'Khối Ngân hàng Bán lẻ (KHCN)',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_TDCN',
    name: 'Phòng Tín dụng Cá nhân',
    unitType: 'Phong',
    parent: 'KHCN',

    status: 'Active',
  },
  {
    code: 'P_SPBL',
    name: 'Phòng Sản phẩm Bán lẻ',
    unitType: 'Phong',
    parent: 'KHCN',

    status: 'Active',
  },
  {
    code: 'P_KHBL',
    name: 'Phòng Khách hàng Bán lẻ',
    unitType: 'Phong',
    parent: 'KHCN',

    status: 'Active',
  },

  // Chi nhánh thuộc KHCN
  {
    code: 'CN_HN',
    name: 'Chi nhánh Hà Nội',
    unitType: 'ChiNhanh',
    parent: 'KHCN',

    status: 'Active',
  },
  {
    code: 'CN_HCM',
    name: 'Chi nhánh TP. Hồ Chí Minh',
    unitType: 'ChiNhanh',
    parent: 'KHCN',

    status: 'Active',
  },
  {
    code: 'CN_DN',
    name: 'Chi nhánh Đà Nẵng',
    unitType: 'ChiNhanh',
    parent: 'KHCN',

    status: 'Active',
  },
  {
    code: 'PGD_HN1',
    name: 'PGD Hoàn Kiếm',
    unitType: 'PGD',
    parent: 'CN_HN',

    status: 'Active',
  },
  {
    code: 'PGD_HN2',
    name: 'PGD Đống Đa',
    unitType: 'PGD',
    parent: 'CN_HN',

    status: 'Active',
  },
  {
    code: 'PGD_HCM1',
    name: 'PGD Quận 1',
    unitType: 'PGD',
    parent: 'CN_HCM',

    status: 'Active',
  },

  // ============================================================
  // HUB DOANH NGHIỆP — Ngành dọc HubDoanhNghiep (thuộc KHDN)
  // ============================================================
  {
    code: 'HUB_DN',
    name: 'HUB Doanh nghiệp',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_TDDN',
    name: 'Phòng Tín dụng Doanh nghiệp',
    unitType: 'Phong',
    parent: 'HUB_DN',

    status: 'Active',
  },
  {
    code: 'P_SPDN',
    name: 'Phòng Sản phẩm Doanh nghiệp',
    unitType: 'Phong',
    parent: 'HUB_DN',

    status: 'Active',
  },

  // ============================================================
  // KHỐI VẬN HÀNH — Ngành dọc VanHanh
  // ============================================================
  {
    code: 'K_VANHANH',
    name: 'Khối Vận hành',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_THANHTOAN',
    name: 'Phòng Thanh toán & Ngân quỹ',
    unitType: 'Phong',
    parent: 'K_VANHANH',

    status: 'Active',
  },
  {
    code: 'P_VANHANHCN',
    name: 'Phòng Vận hành Chi nhánh',
    unitType: 'Phong',
    parent: 'K_VANHANH',

    status: 'Active',
  },

  // ============================================================
  // TRUNG TÂM KINH DOANH — Ngành dọc TrungTamKinhDoanh
  // ============================================================
  {
    code: 'TTKD',
    name: 'Trung tâm Kinh doanh',
    unitType: 'TrungTam',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'TTKD_HN',
    name: 'Trung tâm KD Hà Nội',
    unitType: 'TrungTam',
    parent: 'TTKD',

    status: 'Active',
  },
  {
    code: 'TTKD_HCM',
    name: 'Trung tâm KD TP. HCM',
    unitType: 'TrungTam',
    parent: 'TTKD',

    status: 'Active',
  },

  // ============================================================
  // TRUNG TÂM KHDN LỚN — Ngành dọc TrungTamKHDNLon
  // ============================================================
  {
    code: 'TTKHDNL',
    name: 'Trung tâm KHDN Lớn',
    unitType: 'TrungTam',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_KHDNL',
    name: 'Phòng Quản lý Khách hàng DN Lớn',
    unitType: 'Phong',
    parent: 'TTKHDNL',

    status: 'Active',
  },
  {
    code: 'P_STRUCTFIN',
    name: 'Phòng Tài trợ cấu trúc',
    unitType: 'Phong',
    parent: 'TTKHDNL',

    status: 'Active',
  },

  // ============================================================
  // KHỐI HỘI SỞ (Chức năng nội bộ)
  // ============================================================
  {
    code: 'CNTT',
    name: 'Khối Công nghệ Thông tin',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_PTUD',
    name: 'Phòng Phát triển Ứng dụng',
    unitType: 'Phong',
    parent: 'CNTT',

    status: 'Active',
  },
  {
    code: 'P_ANNINH',
    name: 'Phòng An ninh Thông tin',
    unitType: 'Phong',
    parent: 'CNTT',

    status: 'Active',
  },
  {
    code: 'P_VANHANH',
    name: 'Phòng Vận hành Hệ thống',
    unitType: 'Phong',
    parent: 'CNTT',

    status: 'Active',
  },

  {
    code: 'QTRR',
    name: 'Khối Quản trị Rủi ro',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_QLRRTD',
    name: 'Phòng QL Rủi ro Tín dụng',
    unitType: 'Phong',
    parent: 'QTRR',

    status: 'Active',
  },
  {
    code: 'P_QLRRVH',
    name: 'Phòng QL Rủi ro Vận hành',
    unitType: 'Phong',
    parent: 'QTRR',

    status: 'Active',
  },
  {
    code: 'P_QLRRTHI',
    name: 'Phòng QL Rủi ro Thị trường',
    unitType: 'Phong',
    parent: 'QTRR',

    status: 'Active',
  },

  {
    code: 'TCKT',
    name: 'Khối Tài chính Kế toán',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_KTOANT',
    name: 'Phòng Kế toán Tổng hợp',
    unitType: 'Phong',
    parent: 'TCKT',

    status: 'Active',
  },
  {
    code: 'P_QTTC',
    name: 'Phòng Quản trị Tài chính',
    unitType: 'Phong',
    parent: 'TCKT',

    status: 'Active',
  },

  {
    code: 'PC',
    name: 'Khối Pháp chế & Tuân thủ',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_PHAPCHE',
    name: 'Phòng Pháp chế',
    unitType: 'Phong',
    parent: 'PC',

    status: 'Active',
  },
  {
    code: 'P_TUANTHU',
    name: 'Phòng Tuân thủ',
    unitType: 'Phong',
    parent: 'PC',

    status: 'Active',
  },

  {
    code: 'NSNS',
    name: 'Khối Nhân sự & Nội vụ',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_QLNS',
    name: 'Phòng Quản lý Nhân sự',
    unitType: 'Phong',
    parent: 'NSNS',

    status: 'Active',
  },

  {
    code: 'TTTC',
    name: 'Khối Thị trường & Tài chính',
    unitType: 'Khoi',
    parent: 'BDH',

    status: 'Active',
  },
  {
    code: 'P_ALM',
    name: 'Phòng ALM',
    unitType: 'Phong',
    parent: 'TTTC',

    status: 'Active',
  },
  {
    code: 'P_TTVM',
    name: 'Phòng Kinh doanh Thị trường vốn',
    unitType: 'Phong',
    parent: 'TTTC',

    status: 'Active',
  },
];
