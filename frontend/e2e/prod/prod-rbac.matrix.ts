/**
 * MA TRAN PHAN QUYEN RBAC - SINH TU DONG tu docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md
 * (PHAN II, bang 16 man hinh x 8 vai tro). KHONG sua tay.
 *
 * Thu tu cot trong tai lieu: Admin | Lanh Dao Khoi (CAE) | Lanh Dao Phong (TP/PP)
 *   | Truong Doan (Lead) | KTV Thanh Vien | Chuyen Gia CAATs | Auditee | Ban Kiem Soat
 */

export type RoleGroup = 'admin' | 'cae' | 'tppp' | 'lead' | 'ktv' | 'caats' | 'auditee' | 'bks';

export interface MatrixCell { allowed: boolean; label: string }
export interface MatrixRow { stt: number; name: string; url: string; exp: Record<RoleGroup, MatrixCell> }

export const ROLE_GROUP_LABEL: Record<RoleGroup, string> = {
  admin: 'Admin',
  cae: 'Lanh Dao Khoi (CAE)',
  tppp: 'Lanh Dao Phong (TP/PP)',
  lead: 'Truong Doan (Lead)',
  ktv: 'KTV Thanh Vien',
  caats: 'Chuyen Gia CAATs',
  auditee: 'Auditee (DV duoc KT)',
  bks: 'Ban Kiem Soat (BKS)',
};

/**
 * Tai khoan production dai dien tung nhom vai tro (lay tu /auth/login that tren ktnb.io.vn).
 * LUU Y: khong co tai khoan nao mang vai tro Truong Doan tren production
 * => nhom 'lead' khong kiem thu duoc (khoang trong bao phu).
 */
export const ROLE_ACCOUNTS: Record<RoleGroup, string[]> = {
  admin: ['admin', 'auditor.ad'],
  cae: ['hiepnt'],
  tppp: ['thanhpd', 'luongnt2', 'anhpv7'],
  lead: [],
  ktv: ['danhpc', 'diepnx', 'datnc3', 'dungna'],
  caats: ['hoangnk1'],
  auditee: ['hanoibm', 'saigonbm'],
  bks: ['bks.chair', 'bks.member'],
};

export const RBAC_MATRIX: MatrixRow[] = [
  {
    "stt": 1,
    "name": "Bàn Làm Việc & Điều Hành",
    "url": "/",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Full"
      },
      "tppp": {
        "allowed": true,
        "label": "Full"
      },
      "lead": {
        "allowed": true,
        "label": "Full"
      },
      "ktv": {
        "allowed": true,
        "label": "View/Task"
      },
      "caats": {
        "allowed": true,
        "label": "View/Task"
      },
      "auditee": {
        "allowed": true,
        "label": "Hạn chế"
      },
      "bks": {
        "allowed": true,
        "label": "View"
      }
    }
  },
  {
    "stt": 2,
    "name": "Cổng Ban Kiểm Soát (IIA 1000)",
    "url": "/audit-committee-portal",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "View"
      },
      "tppp": {
        "allowed": false,
        "label": "Chặn"
      },
      "lead": {
        "allowed": false,
        "label": "Chặn"
      },
      "ktv": {
        "allowed": false,
        "label": "Chặn"
      },
      "caats": {
        "allowed": false,
        "label": "Chặn"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": true,
        "label": "Full"
      }
    }
  },
  {
    "stt": 3,
    "name": "Giám Sát Đoàn Thanh Tra NHNN",
    "url": "/regulatory-exams",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Full"
      },
      "tppp": {
        "allowed": true,
        "label": "View"
      },
      "lead": {
        "allowed": false,
        "label": "Chặn"
      },
      "ktv": {
        "allowed": false,
        "label": "Chặn"
      },
      "caats": {
        "allowed": false,
        "label": "Chặn"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": true,
        "label": "Full"
      }
    }
  },
  {
    "stt": 4,
    "name": "Cổng Đơn Vị Được Kiểm Toán",
    "url": "/auditee-portal",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "View"
      },
      "tppp": {
        "allowed": true,
        "label": "View"
      },
      "lead": {
        "allowed": true,
        "label": "View"
      },
      "ktv": {
        "allowed": true,
        "label": "View"
      },
      "caats": {
        "allowed": false,
        "label": "Chặn"
      },
      "auditee": {
        "allowed": true,
        "label": "Full (ĐV mình)"
      },
      "bks": {
        "allowed": true,
        "label": "View"
      }
    }
  },
  {
    "stt": 5,
    "name": "Phạm Vi & Thư Viện RCM",
    "url": "/risk-and-planning?step=scope",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "View"
      },
      "tppp": {
        "allowed": true,
        "label": "Full"
      },
      "lead": {
        "allowed": true,
        "label": "View/Edit"
      },
      "ktv": {
        "allowed": true,
        "label": "View"
      },
      "caats": {
        "allowed": true,
        "label": "View/Edit"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": true,
        "label": "View"
      }
    }
  },
  {
    "stt": 6,
    "name": "Đánh Giá Rủi Ro & Kế Hoạch Năm",
    "url": "/risk-and-planning?step=plan",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Approve"
      },
      "tppp": {
        "allowed": true,
        "label": "Create/Submit"
      },
      "lead": {
        "allowed": true,
        "label": "View"
      },
      "ktv": {
        "allowed": false,
        "label": "Chặn"
      },
      "caats": {
        "allowed": true,
        "label": "View"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": true,
        "label": "View/Monitor"
      }
    }
  },
  {
    "stt": 7,
    "name": "Quản Lý Cuộc Kiểm Toán",
    "url": "/audit-engagements",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Approve"
      },
      "tppp": {
        "allowed": true,
        "label": "Full"
      },
      "lead": {
        "allowed": true,
        "label": "Manage Đoàn"
      },
      "ktv": {
        "allowed": true,
        "label": "Thực hiện"
      },
      "caats": {
        "allowed": true,
        "label": "Thực hiện"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": true,
        "label": "View"
      }
    }
  },
  {
    "stt": 8,
    "name": "Giấy Tờ Làm Việc (Working Papers)",
    "url": "/working-papers",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "View"
      },
      "tppp": {
        "allowed": true,
        "label": "Review L2"
      },
      "lead": {
        "allowed": true,
        "label": "Review L1"
      },
      "ktv": {
        "allowed": true,
        "label": "Create/Edit"
      },
      "caats": {
        "allowed": true,
        "label": "Create/Edit"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": false,
        "label": "Chặn"
      }
    }
  },
  {
    "stt": 9,
    "name": "Phát Hiện 5C & Báo Cáo KT",
    "url": "/findings-hub",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Publish"
      },
      "tppp": {
        "allowed": true,
        "label": "Review/Submit"
      },
      "lead": {
        "allowed": true,
        "label": "Finalize"
      },
      "ktv": {
        "allowed": true,
        "label": "Create/Draft"
      },
      "caats": {
        "allowed": true,
        "label": "Create/Draft"
      },
      "auditee": {
        "allowed": true,
        "label": "Giải trình"
      },
      "bks": {
        "allowed": true,
        "label": "View"
      }
    }
  },
  {
    "stt": 10,
    "name": "Khắc Phục Kiến Nghị & SLA",
    "url": "/findings-hub?tab=recommendations",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Monitor"
      },
      "tppp": {
        "allowed": true,
        "label": "Monitor"
      },
      "lead": {
        "allowed": true,
        "label": "Verify/Close"
      },
      "ktv": {
        "allowed": true,
        "label": "Verify/Close"
      },
      "caats": {
        "allowed": false,
        "label": "Chặn"
      },
      "auditee": {
        "allowed": true,
        "label": "Update/Proof"
      },
      "bks": {
        "allowed": true,
        "label": "Monitor"
      }
    }
  },
  {
    "stt": 11,
    "name": "Giám Sát Liên Tục & CAATs",
    "url": "/continuous-monitoring",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "View"
      },
      "tppp": {
        "allowed": true,
        "label": "View"
      },
      "lead": {
        "allowed": true,
        "label": "View"
      },
      "ktv": {
        "allowed": true,
        "label": "View"
      },
      "caats": {
        "allowed": true,
        "label": "Full/Script"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": true,
        "label": "View"
      }
    }
  },
  {
    "stt": 12,
    "name": "Việc Ngoài Đoàn & Kanban",
    "url": "/general-tasks",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Monitor"
      },
      "tppp": {
        "allowed": true,
        "label": "Manage/Assign"
      },
      "lead": {
        "allowed": true,
        "label": "Thực hiện"
      },
      "ktv": {
        "allowed": true,
        "label": "Thực hiện"
      },
      "caats": {
        "allowed": true,
        "label": "Thực hiện"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": false,
        "label": "Chặn"
      }
    }
  },
  {
    "stt": 13,
    "name": "Đánh Giá BSC-KPI Nhân Sự",
    "url": "/bsc-kpi",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Evaluate"
      },
      "tppp": {
        "allowed": true,
        "label": "Evaluate"
      },
      "lead": {
        "allowed": true,
        "label": "Evaluate"
      },
      "ktv": {
        "allowed": true,
        "label": "Self/View"
      },
      "caats": {
        "allowed": true,
        "label": "Self/View"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": true,
        "label": "View"
      }
    }
  },
  {
    "stt": 14,
    "name": "Quản Lý Hồ Sơ & Mẫu Biểu",
    "url": "/document-manager",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Manage"
      },
      "tppp": {
        "allowed": true,
        "label": "Manage"
      },
      "lead": {
        "allowed": true,
        "label": "View/Use"
      },
      "ktv": {
        "allowed": true,
        "label": "View/Use"
      },
      "caats": {
        "allowed": true,
        "label": "View/Use"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": true,
        "label": "View"
      }
    }
  },
  {
    "stt": 15,
    "name": "Cơ Sở Pháp Quy & Tri Thức AI",
    "url": "/regulatory-kb",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "Full"
      },
      "tppp": {
        "allowed": true,
        "label": "Full"
      },
      "lead": {
        "allowed": true,
        "label": "Full"
      },
      "ktv": {
        "allowed": true,
        "label": "Full"
      },
      "caats": {
        "allowed": true,
        "label": "Full"
      },
      "auditee": {
        "allowed": true,
        "label": "View"
      },
      "bks": {
        "allowed": true,
        "label": "Full"
      }
    }
  },
  {
    "stt": 16,
    "name": "Quản Trị Hệ Thống & KTV",
    "url": "/system-admin",
    "exp": {
      "admin": {
        "allowed": true,
        "label": "Full"
      },
      "cae": {
        "allowed": true,
        "label": "View/Monitor"
      },
      "tppp": {
        "allowed": false,
        "label": "Chặn"
      },
      "lead": {
        "allowed": false,
        "label": "Chặn"
      },
      "ktv": {
        "allowed": false,
        "label": "Chặn"
      },
      "caats": {
        "allowed": false,
        "label": "Chặn"
      },
      "auditee": {
        "allowed": false,
        "label": "Chặn"
      },
      "bks": {
        "allowed": false,
        "label": "Chặn"
      }
    }
  }
];
