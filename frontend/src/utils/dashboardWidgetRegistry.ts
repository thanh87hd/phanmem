/**
 * Dashboard Widget Registry
 * Định nghĩa tất cả widget khả dụng cho mỗi dashboard.
 * Mỗi widget có id, name, category, default visibility/order/size.
 */

export interface WidgetSettingSchema {
  key: string;
  label: string;
  type: 'select' | 'multi-select' | 'input' | 'date-range';
  source?: 'departments' | 'audit-universe' | 'users' | 'static';
  options?: Array<{ label: string; value: unknown }>;
  defaultValue?: unknown;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  category: string;
  defaultVisible: boolean;
  defaultOrder: number;
  defaultSize: 'full' | 'half' | 'quarter';
  description?: string;
  settingsSchema?: WidgetSettingSchema[];
}

export interface WidgetConfig {
  widgetId: string;
  visible: boolean;
  order: number;
  size: 'full' | 'half' | 'quarter';
  settings?: Record<string, any>;
}

// ═══ DASHBOARD TRANG CHỦ (HOME) ═══
export const HOME_WIDGETS: WidgetDefinition[] = [
  { id: 'kpi-cards',           name: 'KPI Tổng quan',              category: 'KPI',        defaultVisible: true, defaultOrder: 1,  defaultSize: 'full',    description: '8 thẻ KPI: Kế hoạch, Cuộc KT, Phát hiện RR Cao, NĐ340, Mức phạt, Kiến nghị, Quá hạn, WP chờ duyệt',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'airisk-map',          name: 'Bản đồ Rủi ro AI',           category: 'AI',         defaultVisible: true, defaultOrder: 2,  defaultSize: 'full',    description: 'Bản đồ nhiệt AI Risk Map theo đơn vị',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'rec-completion',      name: 'Tỷ lệ hoàn thành Kiến nghị', category: 'Kiến nghị',  defaultVisible: true, defaultOrder: 3,  defaultSize: 'full',    description: 'Thanh tiến độ tổng thể kiến nghị khắc phục',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'audit-progress-pie',  name: 'Tiến độ Cuộc KT',            category: 'Biểu đồ',   defaultVisible: true, defaultOrder: 4,  defaultSize: 'half',    description: 'Biểu đồ tròn trạng thái các cuộc kiểm toán',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { 
    id: 'risk-bar-chart',      
    name: 'Phân bổ Phát hiện theo RR',  
    category: 'Biểu đồ',   
    defaultVisible: true, 
    defaultOrder: 5,  
    defaultSize: 'half',    
    description: 'Biểu đồ cột phát hiện theo mức rủi ro',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'risk-pending-review', name: 'Đánh giá RR Chờ duyệt',     category: 'Rủi ro',     defaultVisible: true, defaultOrder: 6,  defaultSize: 'half',    description: 'Bảng đánh giá rủi ro đang chờ phê duyệt',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { 
    id: 'top-high-risks',      
    name: 'Top 5 RR cao nhất',          
    category: 'Rủi ro',     
    defaultVisible: true, 
    defaultOrder: 7,  
    defaultSize: 'half',    
    description: 'Top 5 quy trình rủi ro cao nhất đã duyệt',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'risk-heatmap',        name: 'Risk Heat Map',              category: 'Rủi ro',     defaultVisible: true, defaultOrder: 8,  defaultSize: 'full',    description: 'Bảng Heat Map đánh giá rủi ro',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'ews-alerts',          name: 'Cảnh báo Sớm (EWS)',         category: 'Cảnh báo',   defaultVisible: true, defaultOrder: 9,  defaultSize: 'full',    description: 'Danh sách đơn vị rủi ro Hạng 4 & 5',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'rec-by-dept',         name: 'Khắc phục theo Đơn vị',      category: 'Kiến nghị',  defaultVisible: true, defaultOrder: 10, defaultSize: 'full',    description: 'Tiến độ khắc phục kiến nghị theo từng đơn vị',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
];

// ═══ DASHBOARD THỰC HIỆN (EXECUTION) ═══
export const EXECUTION_WIDGETS: WidgetDefinition[] = [
  { id: 'exec-my-team',      name: 'Đoàn KT & Soát xét Trưởng đoàn', category: 'Trưởng đoàn', defaultVisible: true, defaultOrder: 1, defaultSize: 'full', description: 'Theo dõi các đoàn kiểm toán phụ trách và hàng đợi duyệt WP 4 Mắt',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'exec-kpi-cards',    name: 'KPI Công việc',                category: 'KPI',      defaultVisible: true, defaultOrder: 2, defaultSize: 'full',  description: '6 thẻ KPI: Tổng, Cần làm, Đang làm, Chờ duyệt, Hoàn thành, Trễ hạn',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'exec-progress',     name: 'Tiến độ Thực hiện Chung',      category: 'KPI',      defaultVisible: true, defaultOrder: 2, defaultSize: 'full',  description: 'Thanh tiến độ hoàn thành công việc tổng',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'exec-status-pie',   name: 'Trạng thái Công việc',         category: 'Biểu đồ', defaultVisible: true, defaultOrder: 3, defaultSize: 'half',  description: 'Biểu đồ tròn trạng thái Todo/InProgress/Review/Done',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'exec-priority-bar', name: 'Mức ưu tiên Công việc',        category: 'Biểu đồ', defaultVisible: true, defaultOrder: 4, defaultSize: 'half',  description: 'Biểu đồ cột mức ưu tiên High/Medium/Low',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'exec-urgent-tasks', name: 'Nhiệm vụ Ưu tiên Cao',        category: 'Bảng',    defaultVisible: true, defaultOrder: 5, defaultSize: 'half',  description: 'Top 5 nhiệm vụ ưu tiên cao chưa hoàn thành',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'exec-workload',     name: 'Phân bổ theo KTV',             category: 'Bảng',    defaultVisible: true, defaultOrder: 6, defaultSize: 'half',  description: 'Bảng phân bổ công việc theo kiểm toán viên',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { 
    id: 'exec-engagement',      
    name: 'Tiến độ các Đoàn KT',        
    category: 'Bảng',   
    defaultVisible: true, 
    defaultOrder: 7,  
    defaultSize: 'full',    
    description: 'Bảng tiến độ chi tiết từng đoàn kiểm toán',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'exec-staff-perf',   name: 'Hiệu suất Nhân sự',            category: 'Bảng',    defaultVisible: true, defaultOrder: 8, defaultSize: 'full',  description: 'Bảng hiệu suất hoàn thành của nhân sự',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
];

// ═══ DASHBOARD BAN KIỂM SOÁT (COMMITTEE) ═══
export const COMMITTEE_WIDGETS: WidgetDefinition[] = [
  { id: 'comm-kpi-cards', name: 'KPI Rủi ro Nghiêm trọng',    category: 'KPI',       defaultVisible: true, defaultOrder: 1, defaultSize: 'full', description: '3 thẻ: Critical, High, Tổng vấn đề tồn đọng',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'comm-3lod',      name: '3 Lines of Defense Dashboard', category: 'Dashboard', defaultVisible: true, defaultOrder: 2, defaultSize: 'full', description: 'Mô hình 3 tuyến phòng vệ',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'comm-charter',   name: 'Quản lý Điều lệ KTNB',        category: 'Quản lý',   defaultVisible: true, defaultOrder: 3, defaultSize: 'full', description: 'Quản lý phiên bản Audit Charter',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
];

// ═══ DASHBOARD PHÂN TÍCH PHÁT HIỆN (FINDINGS ANALYTICS) ═══
export const FINDINGS_ANALYTICS_WIDGETS: WidgetDefinition[] = [
  { id: 'analytics-kpi-cards',      name: 'KPI Phát hiện & Kiến nghị',     category: 'KPI',           defaultVisible: true, defaultOrder: 1, defaultSize: 'full', description: 'Thẻ KPI tổng quan',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'analytics-tabs',        name: 'Bảng phân tích đa chiều',          category: 'Phân tích',     defaultVisible: true, defaultOrder: 2, defaultSize: 'full', description: 'Các tab phân tích thống kê (Đơn vị, Quy trình, Vùng, Nghiệp vụ...)',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'analytics-history',        name: 'Lịch sử Kỳ KT theo Đơn vị',     category: 'Lịch sử',       defaultVisible: true, defaultOrder: 3, defaultSize: 'full', description: 'Timeline lịch sử các kỳ kiểm toán',
    settingsSchema: [
      { key: 'department', label: 'dashboardCustomizer.filterByDepartment', type: 'select', source: 'departments' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
];

// ═══ KRI DASHBOARD ═══
export const KRI_WIDGETS: WidgetDefinition[] = [
  { id: 'kri-upload',   name: 'Upload Bulk KRI',         category: 'Upload',    defaultVisible: true, defaultOrder: 1, defaultSize: 'full', description: 'Upload nhiều file KRI gắn metadata',
    settingsSchema: [
      { key: 'auditUniverse', label: 'dashboardCustomizer.filterByUniverse', type: 'select', source: 'audit-universe' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'kri-analysis', name: 'Phân tích KRI thủ công',  category: 'Phân tích', defaultVisible: true, defaultOrder: 2, defaultSize: 'full', description: 'Phân tích KRI từ file theo đơn vị Audit Universe',
    settingsSchema: [
      { key: 'auditUniverse', label: 'dashboardCustomizer.filterByUniverse', type: 'select', source: 'audit-universe' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'kri-report',   name: 'Báo cáo KRI theo thời kỳ', category: 'Báo cáo',  defaultVisible: true, defaultOrder: 3, defaultSize: 'full', description: 'Báo cáo KRI theo tháng/năm với pivot table',
    settingsSchema: [
      { key: 'auditUniverse', label: 'dashboardCustomizer.filterByUniverse', type: 'select', source: 'audit-universe' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
  { id: 'kri-compare',  name: 'So sánh KRI giữa 2 kỳ',  category: 'So sánh',   defaultVisible: true, defaultOrder: 4, defaultSize: 'full', description: 'So sánh chỉ số KRI giữa 2 kỳ báo cáo',
    settingsSchema: [
      { key: 'auditUniverse', label: 'dashboardCustomizer.filterByUniverse', type: 'select', source: 'audit-universe' },
      { key: 'year', label: 'dashboardCustomizer.filterByYear', type: 'select', source: 'static', options: [
          { label: '2024', value: '2024' },
          { label: '2025', value: '2025' },
          { label: '2026', value: '2026' }
      ]}
    ]
  },
];

// ═══ REGISTRY MAP ═══
export const DASHBOARD_WIDGET_REGISTRY: Record<string, WidgetDefinition[]> = {
  home: HOME_WIDGETS,
  execution: EXECUTION_WIDGETS,
  committee: COMMITTEE_WIDGETS,
  'findings-analytics': FINDINGS_ANALYTICS_WIDGETS,
  kri: KRI_WIDGETS,
};

/**
 * Lấy danh sách widget definitions cho một dashboard.
 */
export function getWidgetDefinitions(dashboardKey: string): WidgetDefinition[] {
  return DASHBOARD_WIDGET_REGISTRY[dashboardKey] || [];
}

/**
 * Lấy cấu hình mặc định (WidgetConfig[]) cho một dashboard.
 */
export function getDefaultWidgetConfig(dashboardKey: string): WidgetConfig[] {
  const defs = getWidgetDefinitions(dashboardKey);
  return defs.map((d) => ({
    widgetId: d.id,
    visible: d.defaultVisible,
    order: d.defaultOrder,
    size: d.defaultSize,
    settings: {},
  }));
}

/**
 * Merge config đã lưu với registry (bổ sung widget mới, loại bỏ widget cũ).
 */
export function mergeConfigWithRegistry(
  dashboardKey: string,
  savedConfig: WidgetConfig[],
): WidgetConfig[] {
  const defs = getWidgetDefinitions(dashboardKey);
  const savedMap = new Map(savedConfig.map((w) => [w.widgetId, w]));

  // Start with saved config order for existing widgets
  const merged: WidgetConfig[] = [];
  const usedIds = new Set<string>();

  // Keep saved order for widgets that still exist in registry
  for (const saved of savedConfig) {
    const exists = defs.find((d) => d.id === saved.widgetId);
    if (exists) {
      merged.push(saved);
      usedIds.add(saved.widgetId);
    }
  }

  // Add new widgets from registry that weren't in saved config
  for (const def of defs) {
    if (!usedIds.has(def.id)) {
      merged.push({
        widgetId: def.id,
        visible: def.defaultVisible,
        order: merged.length + 1,
        size: def.defaultSize,
        settings: {},
      });
    }
  }

  // Re-number order
  return merged.map((w, idx) => ({ ...w, order: idx + 1 }));
}
