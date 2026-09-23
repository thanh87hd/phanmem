export interface GlossaryItem {
  key: string;
  term: string;
  englishName: string;
  category: 'IIA_GIAS' | 'BANKING_LEGAL' | 'PROCESS_FIELDWORK' | 'RISK_INTERNAL_CONTROL' | 'REPORT_REMEDIATION' | 'SYSTEM_CAAT';
  categoryLabel: string;
  definition: string;
  smartAuditMapping?: string;
  relatedRoute?: string;
}

export const auditGlossaryData: GlossaryItem[] = [
  // ── I. IIA & GIAS 2024 ─────────────────────────────────────────────
  {
    key: 'iia-1',
    term: 'IIA',
    englishName: 'The Institute of Internal Auditors',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Hiệp hội Kiểm toán Nội bộ Quốc tế (thành lập 1941 tại Hoa Kỳ) - tổ chức chuyên môn uy tín nhất thế giới, thiết lập các chuẩn mực nghề nghiệp, chứng chỉ quốc tế (CIA, CRMA) và khung thực hành chuyên nghiệp.',
    smartAuditMapping: 'Nền tảng nghiệp vụ gốc cho toàn bộ quy trình và báo cáo của phần mềm.',
    relatedRoute: '/user-guide'
  },
  {
    key: 'iia-2',
    term: 'GIAS 2024',
    englishName: 'Global Internal Audit Standards (2024 Edition)',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Bộ Chuẩn mực Kiểm toán Nội bộ Toàn cầu mới nhất do IIA ban hành (có hiệu lực từ 09/01/2025 thay thế IPPF 2017), gồm 5 Miền (Domains), 15 Nguyên tắc (Principles) và 52 Tiêu chuẩn (Standards).',
    smartAuditMapping: 'Cấu trúc quy trình 4 giai đoạn, ma trận RACI và chuẩn đầu ra W/P, Finding trên Smart Audit.',
    relatedRoute: '/user-guide'
  },
  {
    key: 'iia-3',
    term: 'CAE',
    englishName: 'Chief Audit Executive',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Trưởng Ban Kiểm toán Nội bộ (hoặc Giám đốc KTNB). Cá nhân giữ vai trò lãnh đạo cao nhất về hoạt động KTNB, chịu trách nhiệm quản trị trước Ban Kiểm soát (BKS) và HĐQT.',
    smartAuditMapping: 'Vai trò Admin / Trưởng Ban KTNB trong phân quyền RolesPage và phê duyệt kế hoạch.',
    relatedRoute: '/roles'
  },
  {
    key: 'iia-4',
    term: 'QAIP',
    englishName: 'Quality Assurance and Improvement Program',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Chương trình Đảm bảo và Nâng cao Chất lượng KTNB (GIAS Domain IV, Principle 12), bao gồm cả đánh giá định kỳ nội bộ liên tục và đánh giá độc lập bên ngoài tối thiểu 5 năm/lần.',
    smartAuditMapping: 'Phân hệ Đảm bảo Chất lượng (/quality-control) đánh giá scorecard từng cuộc kiểm toán.',
    relatedRoute: '/quality-control'
  },
  {
    key: 'iia-5',
    term: 'Independence',
    englishName: 'Organizational Independence (Tính độc lập)',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Sự tự do khỏi các điều kiện đe dọa khả năng thực hiện trách nhiệm kiểm toán nội bộ một cách không thiên vị. KTNB trực thuộc BKS và độc lập với Tổng Giám đốc.',
    smartAuditMapping: 'Cơ chế IndependenceTracker và phân quyền báo cáo trực tiếp BKS.',
    relatedRoute: '/independence-tracker'
  },
  {
    key: 'iia-6',
    term: 'Objectivity',
    englishName: 'Individual Objectivity (Tính khách quan)',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Thái độ tinh thần vô tư, không thỏa hiệp về chất lượng kiểm toán và không để các lợi ích cá nhân, mâu thuẫn lợi ích ảnh hưởng đến đánh giá của KTV.',
    smartAuditMapping: 'Bảng theo dõi xung đột lợi ích (COI) tự động cảnh báo khi phân công đoàn kiểm toán.',
    relatedRoute: '/independence-tracker'
  },
  {
    key: 'iia-7',
    term: 'Due Professional Care',
    englishName: 'Due Professional Care (Thận trọng nghề nghiệp)',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Mức độ thận trọng, kỹ năng và sự siêng năng mà một kiểm toán viên nội bộ có năng lực hợp lý dự kiến sẽ áp dụng trong cùng hoàn cảnh (GIAS Standard 4.1).',
    smartAuditMapping: 'Quy chuẩn lấy mẫu kiểm toán, bằng chứng đầy đủ (Sufficient) và tin cậy (Reliable).',
    relatedRoute: '/working-papers'
  },
  {
    key: 'iia-8',
    term: 'Professional Skepticism',
    englishName: 'Professional Skepticism (Hoài nghi nghề nghiệp)',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Thái độ luôn có tinh thần chất vấn, cảnh giác trước các điều kiện có thể chỉ ra sai sót hoặc gian lận, và đánh giá phản biện đối với bằng chứng kiểm toán.',
    smartAuditMapping: 'Các thuật toán AI phát hiện dị biệt và gợi ý phát hiện kiểm toán (NLP Suggestion).',
    relatedRoute: '/data-analytics'
  },
  {
    key: 'iia-9',
    term: 'Audit Charter',
    englishName: 'Internal Audit Charter (Quy chế KTNB)',
    category: 'IIA_GIAS',
    categoryLabel: 'IIA & GIAS 2024',
    definition: 'Văn bản chính thức do BKS/HĐQT ban hành, xác định rõ mục đích, thẩm quyền, trách nhiệm, phạm vi hoạt động và vị trí của bộ phận KTNB trong ngân hàng.',
    smartAuditMapping: 'Thư viện quy chế, văn bản chính thức của LPBank tích hợp trong Regulatory KB.',
    relatedRoute: '/regulatory-kb'
  },

  // ── II. PHÁP LÝ & NGÂN HÀNG THƯƠNG MẠI ────────────────────────────
  {
    key: 'leg-1',
    term: 'Thông tư 13/2018/TT-NHNN',
    englishName: 'Circular 13/2018/TT-NHNN',
    category: 'BANKING_LEGAL',
    categoryLabel: 'Pháp lý & Ngân hàng',
    definition: 'Thông tư quy định về hệ thống kiểm soát nội bộ của ngân hàng thương mại, chi nhánh ngân hàng nước ngoài; bắt buộc thiết lập mô hình 3 tuyến phòng thủ và bộ phận KTNB.',
    smartAuditMapping: 'Là khung pháp lý gốc của hệ thống, định nghĩa quyền hạn và trách nhiệm Tuyến 3.',
    relatedRoute: '/regulatory-kb'
  },
  {
    key: 'leg-2',
    term: 'Nghị định 340/2025/NĐ-CP',
    englishName: 'Decree 340 (Sanction Framework)',
    category: 'BANKING_LEGAL',
    categoryLabel: 'Pháp lý & Ngân hàng',
    definition: 'Nghị định của Chính phủ quy định xử phạt vi phạm hành chính trong lĩnh vực tiền tệ và ngân hàng, áp dụng các khung phạt tài chính và biện pháp khắc phục hậu quả.',
    smartAuditMapping: 'Hệ quy chiếu ND340 trong danh mục lỗi 3 chiều (Defect Taxonomy) để tính toán rủi ro tài chính phạt.',
    relatedRoute: '/regulatory-kb'
  },
  {
    key: 'leg-3',
    term: 'CAMELS',
    englishName: 'CAMELS Rating System',
    category: 'BANKING_LEGAL',
    categoryLabel: 'Pháp lý & Ngân hàng',
    definition: 'Hệ thống xếp hạng an toàn vi mô của ngân hàng theo 6 yếu tố: Capital (Vốn), Assets (Tài sản), Management (Quản trị), Earnings (Lợi nhuận), Liquidity (Thanh khoản), Sensitivity (Độ nhạy thị trường).',
    smartAuditMapping: 'Mô hình chấm điểm rủi ro CAMELS tại tab Risk Scoring và bảng điều khiển tổng hợp.',
    relatedRoute: '/risk-assessment'
  },
  {
    key: 'leg-4',
    term: 'Basel II / Basel III',
    englishName: 'Basel Accord Framework',
    category: 'BANKING_LEGAL',
    categoryLabel: 'Pháp lý & Ngân hàng',
    definition: 'Khung chuẩn mực an toàn vốn và quản trị rủi ro quốc tế cho các ngân hàng với 3 trụ cột (Trụ cột 1: Tỷ lệ an toàn vốn CAR tối thiểu 8%; Trụ cột 2: Quy trình ICAAP; Trụ cột 3: Minh bạch thông tin).',
    smartAuditMapping: 'Tích hợp tính toán chỉ số an toàn vốn CAR và hồ sơ rủi ro đối tượng kiểm toán.',
    relatedRoute: '/risk-criteria'
  },
  {
    key: 'leg-5',
    term: 'AML / CFT',
    englishName: 'Anti-Money Laundering & Countering the Financing of Terrorism',
    category: 'BANKING_LEGAL',
    categoryLabel: 'Pháp lý & Ngân hàng',
    definition: 'Phòng, chống rửa tiền và tài trợ khủng bố theo Luật PCRT 2022 và Thông tư 09/2023/TT-NHNN, bao gồm nhận biết khách hàng (KYC), báo cáo giao dịch đáng ngờ (STR) và giao dịch giá trị lớn (CTR).',
    smartAuditMapping: 'Domain rủi ro HS09 (Phòng chống rửa tiền) và bộ rule rà soát dữ liệu giao dịch.',
    relatedRoute: '/continuous-monitoring'
  },
  {
    key: 'leg-6',
    term: 'KYC / CDD',
    englishName: 'Know Your Customer / Customer Due Diligence',
    category: 'BANKING_LEGAL',
    categoryLabel: 'Pháp lý & Ngân hàng',
    definition: 'Quy trình thu thập, đối chiếu và thẩm minh danh tính khách hàng, người thụ hưởng cuối cùng (UBO) trước và trong quá trình thiết lập quan hệ dịch vụ ngân hàng.',
    smartAuditMapping: 'Chốt kiểm soát bắt buộc trong các chương trình kiểm toán mở tài khoản và tín dụng.',
    relatedRoute: '/audit-programs'
  },
  {
    key: 'leg-7',
    term: 'Sanctions Screening',
    englishName: 'Sanctions & Blacklist Screening',
    category: 'BANKING_LEGAL',
    categoryLabel: 'Pháp lý & Ngân hàng',
    definition: 'Rà soát khách hàng và đối tác giao dịch đối chiếu với danh sách cấm vận quốc tế (OFAC, UN, EU) và danh sách cảnh báo đen của cơ quan nhà nước có thẩm quyền.',
    smartAuditMapping: 'Tính năng quét dữ liệu tự động trong Module Giám sát liên tục và AI Scanner.',
    relatedRoute: '/continuous-monitoring'
  },

  // ── III. QUY TRÌNH THỰC ĐỊA & BẰNG CHỨNG ──────────────────────────
  {
    key: 'proc-1',
    term: 'Audit Universe',
    englishName: 'Audit Universe (Vũ trụ Kiểm toán)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Toàn bộ tập hợp các đối tượng, thực thể có thể được kiểm toán trong ngân hàng (Chi nhánh, Phòng giao dịch, Khối nghiệp vụ, Công ty con, Hệ thống CNTT, Sản phẩm tài chính).',
    smartAuditMapping: 'Màn hình Quản trị Vũ trụ Kiểm toán (/risk-and-planning?step=scope) lưu trữ mã định danh và phân loại.',
    relatedRoute: '/risk-and-planning?step=scope'
  },
  {
    key: 'proc-2',
    term: 'Audit Engagement',
    englishName: 'Audit Engagement (Cuộc kiểm toán)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Một nhiệm vụ kiểm toán cụ thể có mục tiêu, phạm vi, thời gian, nguồn lực phân công và quyết định thành lập đoàn kiểm toán rõ ràng.',
    smartAuditMapping: 'Màn hình Đoàn KT & Kanban (/audit-engagements) quản lý vòng đời từ GĐ 1 đến GĐ 4.',
    relatedRoute: '/audit-engagements'
  },
  {
    key: 'proc-3',
    term: 'Working Paper (W/P)',
    englishName: 'Audit Working Paper (Giấy tờ làm việc)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Tài liệu ghi nhận mục tiêu, nguồn dữ liệu, thủ tục kiểm tra, kết quả lấy mẫu, bằng chứng đính kèm và kết luận sơ bộ của kiểm toán viên cho từng bước công việc.',
    smartAuditMapping: 'Phân hệ Soạn thảo Giấy tờ làm việc (/working-papers) với trình soạn thảo TipTap chuyên nghiệp.',
    relatedRoute: '/working-papers'
  },
  {
    key: 'proc-4',
    term: 'RCM',
    englishName: 'Risk and Control Matrix (Ma trận Rủi ro & Kiểm soát)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Công cụ liên kết giữa: Mục tiêu kinh doanh ➔ Rủi ro tiềm ẩn ➔ Chốt kiểm soát của đơn vị ➔ Phương pháp kiểm tra của KTV và kết quả thử nghiệm hiệu lực.',
    smartAuditMapping: 'Tính năng sinh tự động RCM bằng AI trong Chương trình kiểm toán (/audit-programs).',
    relatedRoute: '/audit-programs'
  },
  {
    key: 'proc-5',
    term: 'Mô hình 5C',
    englishName: '5C Audit Finding Structure',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Cấu trúc chuẩn quốc tế cho một Phát hiện kiểm toán gồm: Condition (Thực trạng) - Criteria (Tiêu chí quy định) - Cause (Nguyên nhân gốc) - Consequence (Hậu quả/Tác động) - Corrective Action (Kiến nghị khắc phục).',
    smartAuditMapping: 'Form nhập liệu chuẩn hóa 5 trường bắt buộc tại Quản lý Phát hiện (/audit-findings).',
    relatedRoute: '/audit-findings'
  },
  {
    key: 'proc-6',
    term: 'MB04',
    englishName: 'Fieldwork Audit Minutes (Biên bản kiểm toán thực địa)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Văn bản được ký giữa Trưởng đoàn kiểm toán và Người đại diện đơn vị được kiểm toán tại ngày kết thúc kiểm toán thực địa, ghi nhận toàn bộ các vấn đề phát hiện và ý kiến giải trình.',
    smartAuditMapping: 'Chức năng tự động tổng hợp và xuất bản Biên bản MB04 dạng Word/PDF chuẩn mẫu LPBank.',
    relatedRoute: '/audit-reports'
  },
  {
    key: 'proc-7',
    term: 'Substantive Testing',
    englishName: 'Substantive Testing (Thử nghiệm cơ bản)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Các thủ tục kiểm toán được thiết kế để phát hiện các sai sót trọng yếu ở cấp độ cơ sở dẫn liệu (ví dụ: kiểm tra số dư tiền mặt thực tế, kiểm tra tính hợp pháp của tài sản bảo đảm).',
    smartAuditMapping: 'Loại thủ tục W/P được gắn nhãn SUBSTANTIVE trong phân hệ Giấy tờ làm việc.',
    relatedRoute: '/working-papers'
  },
  {
    key: 'proc-8',
    term: 'Test of Controls (ToC)',
    englishName: 'Test of Controls (Thử nghiệm kiểm soát)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Các thủ tục kiểm toán nhằm đánh giá tính hữu hiệu và hiệu lực vận hành của các chốt kiểm soát trong việc ngăn chặn hoặc phát hiện sai phạm.',
    smartAuditMapping: 'Loại thủ tục W/P được gắn nhãn CONTROL_TEST trong phân hệ Giấy tờ làm việc.',
    relatedRoute: '/working-papers'
  },
  {
    key: 'proc-9',
    term: 'Walkthrough Test',
    englishName: 'Walkthrough Test (Kiểm tra quy trình xuyên suốt)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Thủ tục đi theo dấu vết một giao dịch từ khi khởi tạo, phê duyệt, hạch toán đến khi lưu trữ hồ sơ để xác nhận sự tồn tại và tính hợp lý của quy trình kiểm soát.',
    smartAuditMapping: 'Giai đoạn khảo sát lập kế hoạch cuộc kiểm toán (Giai đoạn 1).',
    relatedRoute: '/audit-engagements'
  },
  {
    key: 'proc-10',
    term: 'Sampling Risk',
    englishName: 'Sampling Risk (Rủi ro chọn mẫu)',
    category: 'PROCESS_FIELDWORK',
    categoryLabel: 'Quy trình & Bằng chứng',
    definition: 'Rủi ro khi kết luận của kiểm toán viên dựa trên một mẫu có thể khác với kết luận nếu toàn bộ tổng thể chịu sự thử nghiệm cùng một thủ tục kiểm toán.',
    smartAuditMapping: 'Công cụ tính cỡ mẫu ngẫu nhiên và mẫu trọng yếu tại DetailedSamplingGrid.',
    relatedRoute: '/working-papers'
  },

  // ── IV. RỦI RO & KIỂM SOÁT NỘI BỘ ──────────────────────────────────
  {
    key: 'risk-1',
    term: 'COSO Framework',
    englishName: 'COSO Internal Control - Integrated Framework (2013)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Khung kiểm soát nội bộ tích hợp hàng đầu thế giới gồm 5 thành phần (Control Environment, Risk Assessment, Control Activities, Information & Communication, Monitoring Activities) và 17 nguyên tắc.',
    smartAuditMapping: 'Nền tảng lý thuyết đánh giá hệ thống KSNB của đối tượng kiểm toán.',
    relatedRoute: '/risk-criteria'
  },
  {
    key: 'risk-2',
    term: 'Inherent Risk',
    englishName: 'Inherent Risk (Rủi ro tiềm tàng)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Mức độ rủi ro vốn có của một hoạt động, quy trình khi CHƯA tính đến bất kỳ hành động kiểm soát nào của ban điều hành để giảm thiểu.',
    smartAuditMapping: 'Cột điểm rủi ro Inherent (1 đến 5) trong bảng chấm điểm Risk Assessment.',
    relatedRoute: '/risk-assessment'
  },
  {
    key: 'risk-3',
    term: 'Control Risk',
    englishName: 'Control Risk (Rủi ro kiểm soát)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Khả năng hệ thống KSNB hiện hữu của đơn vị không ngăn chặn hoặc không phát hiện kịp thời các sai sót trọng yếu.',
    smartAuditMapping: 'Điểm đánh giá hiệu lực kiểm soát trong ma trận RCM.',
    relatedRoute: '/audit-programs'
  },
  {
    key: 'risk-4',
    term: 'Residual Risk',
    englishName: 'Residual Risk (Rủi ro còn lại)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Phần rủi ro còn tồn đọng sau khi đã tính đến các biện pháp và chốt kiểm soát của nhà quản lý (Residual Risk = Inherent Risk x (1 - Control Effectiveness)).',
    smartAuditMapping: 'Chỉ số cốt lõi xác định thứ tự ưu tiên đưa đơn vị vào Kế hoạch kiểm toán năm.',
    relatedRoute: '/risk-assessment'
  },
  {
    key: 'risk-5',
    term: 'Risk Appetite',
    englishName: 'Risk Appetite (Khẩu vị rủi ro)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Mức độ và loại rủi ro mà Ngân hàng sẵn sàng chấp nhận trong quá trình theo đuổi các mục tiêu chiến lược do HĐQT phê duyệt hàng năm.',
    smartAuditMapping: 'Ngưỡng ranh giới (Threshold) trong Bản đồ nhiệt rủi ro (Risk Heatmap).',
    relatedRoute: '/risk-criteria'
  },
  {
    key: 'risk-6',
    term: 'KRI',
    englishName: 'Key Risk Indicator (Chỉ số Rủi ro Trọng yếu)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Chỉ số đo lường định lượng được sử dụng để theo dõi mức độ phơi nhiễm rủi ro và cung cấp tín hiệu cảnh báo sớm khi rủi ro vượt ngưỡng cho phép.',
    smartAuditMapping: 'Màn hình Giám sát liên tục KRI (/continuous-monitoring) cập nhật tự động định kỳ.',
    relatedRoute: '/continuous-monitoring'
  },
  {
    key: 'risk-7',
    term: 'Fraud Triangle',
    englishName: 'Fraud Triangle (Tam giác Gian lận)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Mô hình giải thích 3 yếu tố hội tụ thúc đẩy hành vi gian lận của nhân viên: Pressure (Áp lực tài chính/chỉ tiêu) - Opportunity (Cơ hội do hổng kiểm soát) - Rationalization (Sự hợp lý hóa hành vi).',
    smartAuditMapping: 'Phân tích nguyên nhân gốc (Cause) trong cấu trúc phát hiện 5C.',
    relatedRoute: '/audit-findings'
  },
  {
    key: 'risk-8',
    term: 'Segregation of Duties (SoD)',
    englishName: 'Segregation of Duties (Phân tách trách nhiệm)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Nguyên tắc kiểm soát nội bộ đòi hỏi không phân công một cá nhân duy nhất thực hiện toàn bộ các khâu: Khởi tạo - Phê duyệt - Hạch toán - Quản lý tài sản nhằm ngăn ngừa gian lận.',
    smartAuditMapping: 'Bộ ma trận SoD kiểm tra xung đột phân quyền trên hệ thống ngân hàng lõi.',
    relatedRoute: '/roles'
  },
  {
    key: 'risk-9',
    term: 'Compensating Control',
    englishName: 'Compensating Control (Kiểm soát bù trừ)',
    category: 'RISK_INTERNAL_CONTROL',
    categoryLabel: 'Rủi ro & Kiểm soát',
    definition: 'Một biện pháp kiểm soát thay thế được áp dụng khi chốt kiểm soát chính không thể thực hiện được (ví dụ: Chi nhánh nhỏ không đủ nhân sự phân tách SoD thì tăng cường hậu kiểm độc lập).',
    smartAuditMapping: 'Được đánh giá và ghi nhận trong cột Biện pháp kiểm soát của ma trận RCM.',
    relatedRoute: '/audit-programs'
  },

  // ── V. BÁO CÁO & THEO DÕI KHẮC PHỤC ────────────────────────────────
  {
    key: 'rep-1',
    term: 'Audit Report',
    englishName: 'Internal Audit Report (Báo cáo kiểm toán)',
    category: 'REPORT_REMEDIATION',
    categoryLabel: 'Báo cáo & Khắc phục',
    definition: 'Văn bản báo cáo chính thức kết quả cuộc kiểm toán gửi BKS, Tổng Giám đốc và đơn vị, trình bày ý kiến đánh giá tổng thể, các phát hiện trọng yếu và kiến nghị khắc phục.',
    smartAuditMapping: 'Phân hệ Lập Báo cáo kiểm toán (/audit-reports) với luồng ký duyệt điện tử.',
    relatedRoute: '/audit-reports'
  },
  {
    key: 'rep-2',
    term: 'Audit Opinion / Rating',
    englishName: 'Overall Engagement Opinion / Rating',
    category: 'REPORT_REMEDIATION',
    categoryLabel: 'Báo cáo & Khắc phục',
    definition: 'Đánh giá xếp hạng tổng thể của đoàn kiểm toán về hệ thống KSNB của đơn vị (Xuất sắc / Tốt / Trung bình / Kém / Rất rủi ro) dựa trên thang điểm chuẩn mực.',
    smartAuditMapping: 'Công thức tự động tính xếp hạng tổng thể trên Báo cáo kiểm toán hoàn thiện.',
    relatedRoute: '/audit-reports'
  },
  {
    key: 'rep-3',
    term: 'Management Action Plan (MAP)',
    englishName: 'Management Action Plan (Kế hoạch hành động)',
    category: 'REPORT_REMEDIATION',
    categoryLabel: 'Báo cáo & Khắc phục',
    definition: 'Cam kết bằng văn bản của lãnh đạo đơn vị được kiểm toán về các biện pháp khắc phục cụ thể, thời hạn hoàn thành (Deadline) và cá nhân đầu mối chịu trách nhiệm.',
    smartAuditMapping: 'Khai báo trực tiếp qua Cổng thông tin đơn vị được kiểm toán (/auditee-portal).',
    relatedRoute: '/auditee-portal'
  },
  {
    key: 'rep-4',
    term: 'Repeat Finding',
    englishName: 'Repeat Finding (Lỗi tái diễn)',
    category: 'REPORT_REMEDIATION',
    categoryLabel: 'Báo cáo & Khắc phục',
    definition: 'Sai phạm hoặc lỗ hổng kiểm soát đã được KTNB chỉ ra trong kỳ kiểm toán trước nhưng đơn vị không khắc phục hoặc tiếp tục lặp lại ở kỳ kiểm toán hiện tại.',
    smartAuditMapping: 'Hệ thống tự động gắn cờ REPEAT và tăng mức độ nghiêm trọng (Severity Level).',
    relatedRoute: '/audit-findings'
  },
  {
    key: 'rep-5',
    term: 'Remediation SLA',
    englishName: 'Service Level Agreement for Remediation',
    category: 'REPORT_REMEDIATION',
    categoryLabel: 'Báo cáo & Khắc phục',
    definition: 'Quy định thời hạn tối đa bắt buộc đơn vị phải hoàn thành khắc phục theo mức độ nghiêm trọng (High: 30 ngày; Medium: 60 ngày; Low: 90 ngày).',
    smartAuditMapping: 'Bộ đếm ngược thời hạn và hệ thống thông báo đẩy tự động cảnh báo sắp quá hạn.',
    relatedRoute: '/recommendations'
  },
  {
    key: 'rep-6',
    term: 'Remediation Validation',
    englishName: 'Remediation Validation (Hậu kiểm khắc phục)',
    category: 'REPORT_REMEDIATION',
    categoryLabel: 'Báo cáo & Khắc phục',
    definition: 'Thủ tục kiểm tra độc lập lại của KTV đối với bằng chứng do đơn vị cung cấp trước khi chính thức chấp thuận đóng (Close) kiến nghị kiểm toán.',
    smartAuditMapping: 'Quy trình Duyệt bằng chứng 2 bước tại phân hệ Quản lý Kiến nghị (/recommendations).',
    relatedRoute: '/recommendations'
  },

  // ── VI. CÔNG NGHỆ KIỂM TOÁN (CAATs) & HỆ THỐNG ─────────────────────
  {
    key: 'sys-1',
    term: 'CAATs',
    englishName: 'Computer-Assisted Audit Techniques',
    category: 'SYSTEM_CAAT',
    categoryLabel: 'Công nghệ & Hệ thống',
    definition: 'Các kỹ thuật và công cụ kiểm toán có sự trợ giúp của máy tính, phần mềm phân tích dữ liệu nhằm kiểm tra 100% dữ liệu thay vì lấy mẫu thủ công.',
    smartAuditMapping: 'Module Phân tích dữ liệu (/data-analytics) thực hiện chạy truy vấn tự động.',
    relatedRoute: '/data-analytics'
  },
  {
    key: 'sys-2',
    term: 'Continuous Auditing',
    englishName: 'Continuous Auditing (Kiểm toán liên tục)',
    category: 'SYSTEM_CAAT',
    categoryLabel: 'Công nghệ & Hệ thống',
    definition: 'Phương pháp kiểm toán tự động thu thập bằng chứng và đánh giá rủi ro theo thời gian thực hoặc gần thực, thay vì chỉ kiểm toán định kỳ hàng năm.',
    smartAuditMapping: 'Tính năng Giám sát liên tục KRI và quét tự động thư mục dữ liệu nguồn.',
    relatedRoute: '/continuous-monitoring'
  },
  {
    key: 'sys-3',
    term: 'Four-Eyes Principle',
    englishName: 'Four-Eyes Principle (Nguyên tắc 4 mắt)',
    category: 'SYSTEM_CAAT',
    categoryLabel: 'Công nghệ & Hệ thống',
    definition: 'Nguyên tắc kiểm soát kép bắt buộc: Mọi hồ sơ, W/P hay đề xuất của KTV phải có người soát xét độc lập (Trưởng đoàn/Trưởng ban) phê duyệt trước khi có hiệu lực.',
    smartAuditMapping: 'Cơ chế phê duyệt bắt buộc 2 bước được lập trình cứng trong mã nguồn backend.',
    relatedRoute: '/working-papers'
  },
  {
    key: 'sys-4',
    term: 'Stage-Gate Control',
    englishName: 'Stage-Gate Control (Cổng kiểm soát giai đoạn)',
    category: 'SYSTEM_CAAT',
    categoryLabel: 'Công nghệ & Hệ thống',
    definition: 'Cơ chế chặn kỹ thuật của hệ thống không cho phép chuyển tắt giai đoạn kiểm toán khi các điều kiện tiên quyết của giai đoạn trước chưa hoàn thành.',
    smartAuditMapping: 'Luồng 4 giai đoạn trên Kanban: Chặn sang GĐ 2 nếu thiếu Quyết định; chặn sang GĐ 3 nếu còn W/P mở.',
    relatedRoute: '/audit-engagements'
  },
  {
    key: 'sys-5',
    term: 'Defect Taxonomy',
    englishName: 'Defect Taxonomy (Danh mục Lỗi 3 chiều)',
    category: 'SYSTEM_CAAT',
    categoryLabel: 'Công nghệ & Hệ thống',
    definition: 'Hệ thống chuẩn hóa mã hóa sai sót của LPBank liên kết đồng thời 3 hệ quy chiếu: Mã nội bộ LPBank, Mã xử phạt NHNN theo Nghị định 340 và Khung kỷ luật nhân sự.',
    smartAuditMapping: 'Dropdown chọn mã lỗi chuẩn hóa khi tạo mới Phát hiện kiểm toán.',
    relatedRoute: '/audit-findings'
  },
  {
    key: 'sys-6',
    term: 'Audit Trail',
    englishName: 'Audit Trail (Nhật ký vết kiểm toán)',
    category: 'SYSTEM_CAAT',
    categoryLabel: 'Công nghệ & Hệ thống',
    definition: 'Bản ghi lịch sử bất biến ghi nhận chi tiết thời gian, địa chỉ IP, người dùng thực hiện mọi thao tác tạo mới, sửa đổi hoặc phê duyệt trên hệ thống phần mềm.',
    smartAuditMapping: 'Màn hình Nhật ký Vết kiểm toán (/audit-trail) phục vụ truy vết và an toàn dữ liệu.',
    relatedRoute: '/audit-trail'
  }
];
