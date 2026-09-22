export interface GuideTopic {
  id: string;
  category: 'workflow' | 'module' | 'role' | 'faq' | 'regulation';
  title: string;
  summary: string;
  route?: string;
  steps?: string[];
  roles?: string[];
  tips?: string[];
  keywords: string[];
}

export const SYSTEM_WORKFLOW_STAGES = [
  {
    stage: 1,
    title: 'Giai đoạn 1: Đánh giá Rủi ro & Xác định Audit Universe',
    route: '/risk-assessment',
    description:
      'Xây dựng Vũ trụ kiểm toán (Audit Universe), tính toán điểm rủi ro kế thừa và rủi ro còn lại (Inherent & Residual Risk) theo thang đo COSO/NHNN.',
    subSteps: [
      '1. Khai báo đơn vị/quy trình trong danh mục Audit Universe (/audit-universe)',
      '2. Chấm điểm rủi ro định lượng & định tính tại Đánh giá Rủi ro (/risk-assessment)',
      '3. Phân loại mức độ rủi ro (Cao/TB/Thấp) để ưu tiên lập kế hoạch',
    ],
  },
  {
    stage: 2,
    title: 'Giai đoạn 2: Lập Kế hoạch Kiểm toán Năm',
    route: '/audit-plan',
    description:
      'Tự động tính toán nguồn lực, dự thảo danh sách các cuộc kiểm toán trong năm, trình phê duyệt HĐQT/BKS.',
    subSteps: [
      '1. Lựa chọn đối tượng từ Audit Universe theo mức độ rủi ro cao',
      '2. Phân bổ nguồn lực & thời gian thực hiện',
      '3. Trình phê duyệt kế hoạch và ban hành kế hoạch chính thức',
    ],
  },
  {
    stage: 3,
    title: 'Giai đoạn 3: Thành lập Đoàn KT & Thực hiện Thực địa',
    route: '/audit-engagements',
    description:
      'Ban hành Quyết định thành lập đoàn, phân công Trưởng đoàn, KTV, quản lý tiến độ thực hiện qua Kanban và Giấy tờ làm việc (WP).',
    subSteps: [
      '1. Tạo cuộc kiểm toán và chỉ định Trưởng đoàn, thành viên tại (/audit-engagements)',
      '2. Khảo sát sơ bộ, lập Đề cương & Chương trình kiểm toán (/audit-programs)',
      '3. Lấy mẫu dữ liệu & phân tích bằng công cụ Data Analytics (/data-analytics)',
      '4. Thực hiện kiểm tra và ghi chép Giấy tờ làm việc WP (/working-papers)',
    ],
  },
  {
    stage: 4,
    title: 'Giai đoạn 4: Ghi nhận Phát hiện & Dự thảo Báo cáo KT',
    route: '/audit-findings',
    description:
      'Tổng hợp các sai phạm từ Giấy tờ làm việc sang Phát hiện kiểm toán (Finding), đối chiếu NĐ 340/văn bản pháp luật và lập Dự thảo Báo cáo.',
    subSteps: [
      '1. Chuyển đổi từ WP sang Phát hiện kiểm toán (/audit-findings)',
      '2. Gắn mã lỗi chuẩn hóa, căn cứ pháp lý, đối tượng & số CIF vi phạm',
      '3. Trao đổi, thống nhất với Đơn vị được kiểm toán',
      '4. Soạn thảo và phát hành Báo cáo kiểm toán chính thức (/audit-reports)',
    ],
  },
  {
    stage: 5,
    title: 'Giai đoạn 5: Theo dõi Kiến nghị & Khắc phục Sai phạm',
    route: '/recommendations',
    description:
      'Giám sát tiến độ thực hiện kiến nghị của các Chi nhánh/Khối phòng ban theo SLA, kiểm tra xác nhận (Verify) và đóng kiến nghị.',
    subSteps: [
      '1. Phát hành kiến nghị kiểm toán cho đơn vị chịu trách nhiệm (/recommendations)',
      '2. Đơn vị được kiểm toán cập nhật tiến độ, kế hoạch khắc phục và tài liệu chứng minh',
      '3. KTV rà soát, đánh giá tính khả thi và xác nhận hoàn thành (Verified)',
      '4. Trưởng đoàn / Lãnh đạo duyệt đóng kiến nghị (Closed)',
    ],
  },
  {
    stage: 6,
    title: 'Giai đoạn 6: Giám sát Liên tục, Đảm bảo Chất lượng & BKS',
    route: '/continuous-monitoring',
    description:
      'Chạy các kịch bản kiểm toán liên tục (Continuous Auditing / KRI), tự đánh giá chất lượng (QAIP) và báo cáo Ban Kiểm soát.',
    subSteps: [
      '1. Thiết lập chỉ số cảnh báo rủi ro KRI & kịch bản giám sát tự động (/continuous-monitoring)',
      '2. Đánh giá chất lượng cuộc kiểm toán QAIP (/quality-control)',
      '3. Báo cáo định kỳ Ban Kiểm soát & Ủy ban Kiểm toán (/audit-committee)',
    ],
  },
];

export const SYSTEM_GUIDE_KNOWLEDGE: GuideTopic[] = [
  {
    id: 'intro-system',
    category: 'module',
    title: 'Tổng quan Hệ thống Smart Audit 4.0',
    summary:
      'Hệ thống Quản lý Kiểm toán Nội bộ toàn diện của Ngân hàng Thương mại Cổ phần Lộc Phát Việt Nam (LPBank), số hóa 100% quy trình từ đánh giá rủi ro đến báo cáo và giám sát kiến nghị.',
    route: '/',
    tips: [
      'Sử dụng thanh Menu bên trái để truy cập nhanh các phân hệ nghiệp vụ.',
      'Sử dụng Trợ lý AI Kita (nút tròn góc phải dưới) để hỏi đáp nghiệp vụ 24/7.',
    ],
    keywords: [
      'smart audit',
      'tổng quan',
      'hệ thống',
      'lpbank',
      'giới thiệu',
      'bắt đầu',
    ],
  },
  {
    id: 'wp-to-finding',
    category: 'workflow',
    title:
      'Cách tạo Giấy tờ làm việc (Working Paper) và chuyển thành Phát hiện (Finding)',
    summary: 'Quy trình thực hiện kiểm toán vi mô trên từng mẫu kiểm tra.',
    route: '/working-papers',
    steps: [
      '1. Truy cập mục "Giấy tờ làm việc" (/working-papers)',
      '2. Chọn cuộc kiểm toán đang tham gia và bấm "Tạo Giấy tờ làm việc mới"',
      '3. Điền mục tiêu kiểm toán, mẫu chọn kiểm tra, kết quả kiểm tra thực tế',
      '4. Nếu phát hiện có sai sót, bấm nút "⚡ Tạo Phát hiện từ WP này" để hệ thống tự động trích xuất thông tin sang phân hệ Phát hiện kiểm toán',
    ],
    keywords: [
      'working paper',
      'giấy tờ làm việc',
      'wp',
      'phát hiện',
      'finding',
      'sai sót',
      'tạo wp',
    ],
  },
  {
    id: 'finding-to-rec',
    category: 'workflow',
    title: 'Cách ghi nhận Phát hiện và chuyển thành Kiến nghị (Recommendation)',
    summary:
      'Chuẩn hóa sai phạm và giao trách nhiệm khắc phục cho đơn vị được kiểm toán.',
    route: '/audit-findings',
    steps: [
      '1. Truy cập mục "Phát hiện kiểm toán" (/audit-findings)',
      '2. Chọn hoặc tạo phát hiện, gắn Mã lỗi chuẩn hóa (ERR_TD, ERR_OP...) và Căn cứ pháp lý (NĐ 340)',
      '3. Điền thông tin khách hàng, số CIF, cán bộ chịu trách nhiệm',
      '4. Bấm nút "Chuyển thành Kiến nghị" để tự động tạo bản ghi kiến nghị gửi đơn vị khắc phục',
    ],
    keywords: [
      'phát hiện',
      'finding',
      'kiến nghị',
      'recommendation',
      'mã lỗi',
      'nđ 340',
      'chế tài',
    ],
  },
  {
    id: 'role-auditor',
    category: 'role',
    title: 'Hướng dẫn dành cho Kiểm toán viên (KTV)',
    summary:
      'Các chức năng chính KTV cần sử dụng hàng ngày: thực hiện nhiệm vụ trong đoàn, lập WP, ghi nhận finding và xác nhận khắc phục.',
    route: '/working-papers',
    steps: [
      '1. Xem các cuộc kiểm toán được phân công tại "Đoàn KT & Kanban" (/audit-engagements)',
      '2. Thực hiện lấy mẫu và phân tích dữ liệu tại "Phân tích & Lấy mẫu" (/data-analytics)',
      '3. Lập và nộp duyệt Giấy tờ làm việc tại (/working-papers)',
      '4. Xác nhận bằng chứng khắc phục của đơn vị tại "Kiến nghị & Khắc phục" (/recommendations)',
    ],
    keywords: [
      'ktv',
      'kiểm toán viên',
      'nhiệm vụ',
      'công việc',
      'hướng dẫn ktv',
    ],
  },
  {
    id: 'role-team-lead',
    category: 'role',
    title: 'Hướng dẫn dành cho Trưởng đoàn Kiểm toán',
    summary:
      'Quản lý toàn diện cuộc kiểm toán: phân công KTV, duyệt WP, tổng hợp dự thảo báo cáo và đóng kiến nghị.',
    route: '/audit-engagements',
    steps: [
      '1. Thiết lập phân công công việc, phần hành và phân rã WBS tại (/audit-engagements)',
      '2. Theo dõi tiến độ Kanban thực địa và duyệt Giấy tờ làm việc của các thành viên',
      '3. Tổng hợp Báo cáo kiểm toán chính thức tại (/audit-reports)',
      '4. Duyệt đóng các kiến nghị đã được khắc phục triệt để tại (/recommendations)',
    ],
    keywords: [
      'trưởng đoàn',
      'team lead',
      'quản lý đoàn',
      'phân công',
      'duyệt wp',
      'báo cáo',
    ],
  },
  {
    id: 'role-auditee',
    category: 'role',
    title: 'Hướng dẫn dành cho Đơn vị được kiểm toán (ĐVĐKT)',
    summary:
      'Cổng thông tin tiếp nhận kết quả kiểm toán, xây dựng kế hoạch khắc phục và báo cáo tiến độ.',
    route: '/recommendations',
    steps: [
      '1. Truy cập mục "Kiến nghị & Khắc phục" (/recommendations) để xem các kiến nghị gửi đến đơn vị',
      '2. Bấm "Cập nhật kế hoạch" để phân công đầu mối xử lý và ngày cam kết hoàn thành',
      '3. Tải lên tài liệu minh chứng sau khi đã khắc phục sai phạm',
      '4. Gửi yêu cầu xác nhận (Verify) cho KTV',
    ],
    keywords: [
      'đơn vị được kiểm toán',
      'chi nhánh',
      'đvdkt',
      'khắc phục',
      'giải trình',
      'báo cáo khắc phục',
    ],
  },
];
