export interface QuizQuestion {
  id: string;
  category: 'iia_standards' | 'methodology' | 'regulations' | 'smart_audit_app';
  categoryName: string;
  question: string;
  options: string[];
  correctAnswer: number;
  flashcardFront: string;
  flashcardBack: string;
  explanation: string;
  standardRef: string;
  appLink?: { title: string; route: string };
}

export const IIA_QUIZ_DATA: QuizQuestion[] = [
  {
    id: 'iia-1',
    category: 'iia_standards',
    categoryName: 'Chuẩn mực Quốc tế IIA (IPPF 2024)',
    question: 'Theo Mô hình 3 Tuyến (Three Lines Model) mới nhất của IIA, vai trò cốt lõi và vị thế của Kiểm toán Nội bộ (Tuyến 3) là gì?',
    options: [
      'A. Trực tiếp tham gia thiết kế và vận hành các chốt kiểm soát nội bộ hàng ngày',
      'B. Cung cấp sự đảm bảo độc lập, khách quan và tư vấn chuyên sâu cho Ban Quản trị (HĐQT/BKS) và Ban Điều hành',
      'C. Chịu trách nhiệm quản lý rủi ro và tuân thủ thay cho các Đơn vị kinh doanh',
      'D. Phê duyệt các hạn mức tín dụng và quyết định chiến lược kinh doanh của ngân hàng'
    ],
    correctAnswer: 1,
    flashcardFront: 'Mô hình 3 Tuyến (Three Lines Model) của IIA quy định vai trò của KTNB là gì?',
    flashcardBack: 'KTNB thuộc Tuyến 3: Cung cấp đảm bảo độc lập và khách quan (Independent Assurance) cho Cơ quan Quản trị (HĐQT/BKS) về tính hiệu quả của quản trị, quản lý rủi ro và kiểm soát nội bộ do Tuyến 1 và Tuyến 2 thiết lập.',
    explanation: 'Theo chuẩn mực IIA IPPF, Tuyến 1 (First Line) là các đơn vị vận hành/kinh doanh trực tiếp quản lý rủi ro; Tuyến 2 (Second Line) là Khối Quản lý rủi ro & Tuân thủ hỗ trợ chuyên môn và giám sát; Tuyến 3 (Third Line) là Kiểm toán Nội bộ với tính độc lập tuyệt đối, báo cáo chức năng lên Ban Kiểm soát/HĐQT để cung cấp sự đảm bảo khách quan.',
    standardRef: 'IIA Global Standards 2024 - Domain I & Principle 3 (Three Lines Model)',
    appLink: { title: 'Cổng thông tin Ban Kiểm soát', route: '/audit-committee' }
  },
  {
    id: 'iia-2',
    category: 'iia_standards',
    categoryName: 'Chuẩn mực Quốc tế IIA (IPPF 2024)',
    question: 'Khi phát hiện một thành viên đoàn kiểm toán từng làm Trưởng phòng Tín dụng tại Chi nhánh được kiểm toán cách đây 8 tháng, Trưởng đoàn cần xử lý như thế nào theo chuẩn mực IIA về Tính Khách quan (Objectivity)?',
    options: [
      'A. Giữ nguyên vì cán bộ này rất am hiểu quy trình tín dụng tại chi nhánh đó',
      'B. Không cho phép KTV này thực hiện kiểm toán mảng tín dụng tại chi nhánh đó trong thời gian cooling-off tối thiểu 1 năm',
      'C. Yêu cầu KTV ký cam kết không thiên vị và tiếp tục kiểm toán bình thường',
      'D. Chuyển KTV sang làm Trưởng đoàn để giám sát chung mà không trực tiếp lấy mẫu'
    ],
    correctAnswer: 1,
    flashcardFront: 'Quy tắc "Thời gian cách ly (Cooling-off Period)" về tính độc lập của KTV?',
    flashcardBack: 'KTV không được thực hiện kiểm toán hoặc cung cấp sự đảm bảo cho hoạt động/bộ phận mà mình từng phụ trách hoặc làm việc trong vòng tối thiểu 1 năm trước đó nhằm bảo toàn tính khách quan (Objectivity).',
    explanation: 'Chuẩn mực IIA 1130 (Suy giảm tính độc lập và khách quan) và Thông tư 13/2018/TT-NHNN quy định rõ: KTV không được kiểm toán các hoạt động, bộ phận mà KTV đã chịu trách nhiệm hoặc thực hiện công việc trong thời gian 01 năm trước đó. Trên phần mềm Smart Audit, hệ thống Independence Safety Check sẽ tự động quét và cảnh báo vi phạm này.',
    standardRef: 'IIA Standard 1130 / Thông tư 13/2018 Điều 16 (Độc lập & Khách quan)',
    appLink: { title: 'Theo dõi Tính Độc lập KTV', route: '/independence-tracker' }
  },
  {
    id: 'iia-3',
    category: 'methodology',
    categoryName: 'Phương pháp luận Kiểm toán & Lập Kế hoạch',
    question: 'Mô hình 5C kinh điển của IIA trong việc lập Báo cáo Phát hiện Kiểm toán (Audit Finding) bao gồm những yếu tố nào?',
    options: [
      'A. Cost, Customer, Credit, Cash, Capital',
      'B. Condition (Hiện trạng), Criteria (Tiêu chí/Chuẩn mực), Cause (Nguyên nhân), Consequence (Hậu quả/Rủi ro), Corrective Action (Kiến nghị khắc phục)',
      'C. Check, Control, Compliance, Conclusion, Closure',
      'D. Category, Code, Context, Complexity, Clarification'
    ],
    correctAnswer: 1,
    flashcardFront: 'Mô hình 5C trong soạn thảo Phát hiện Kiểm toán (Audit Finding) là gì?',
    flashcardBack: '1. Condition (Thực tế sai phạm đang diễn ra)\n2. Criteria (Quy định/Chuẩn mực bị vi phạm)\n3. Cause (Nguyên nhân cốt lõi sinh ra sai sót)\n4. Consequence (Hậu quả tổn thất hoặc rủi ro tiềm tàng)\n5. Corrective Action (Kiến nghị hành động khắc phục triệt để).',
    explanation: 'Mô hình 5C là tiêu chuẩn vàng của IIA giúp một phát hiện kiểm toán có tính thuyết phục cao, phân tích trúng nguyên nhân gốc rễ (Root Cause) và đưa ra hành động khắc phục khả thi thay vì chỉ mô tả hiện tượng bề mặt.',
    standardRef: 'IIA Practice Guide - Formulating and Expressing Audit Opinions',
    appLink: { title: 'Màn hình Phát hiện Kiểm toán', route: '/audit-findings' }
  },
  {
    id: 'iia-4',
    category: 'methodology',
    categoryName: 'Phương pháp luận Kiểm toán & Lập Kế hoạch',
    question: 'Vũ trụ Kiểm toán (Audit Universe) đóng vai trò gì trong phương pháp Kiểm toán Dựa trên Rủi ro (Risk-based Auditing)?',
    options: [
      'A. Là danh sách các phần mềm công nghệ thông tin mà ngân hàng đang sử dụng',
      'B. Là tập hợp toàn bộ các đơn vị kinh doanh, quy trình nghiệp vụ, hệ thống và đối tượng có thể được kiểm toán trong tổ chức',
      'C. Là danh sách tổng hợp tất cả các khách hàng vay vốn lớn của ngân hàng',
      'D. Là bộ câu hỏi trắc nghiệm kiến thức nội bộ cho nhân viên'
    ],
    correctAnswer: 1,
    flashcardFront: 'Khái niệm "Audit Universe (Vũ trụ Kiểm toán)" là gì?',
    flashcardBack: 'Là danh mục toàn diện (Inventory) gồm tất cả các thực thể có thể kiểm toán được (Auditable Entities) trong ngân hàng: Chi nhánh, Khối phòng ban Hội sở, Quy trình nghiệp vụ cấp 1/2/3 và Hệ thống CNTT, làm cơ sở để chấm điểm rủi ro và lập Kế hoạch KT năm.',
    explanation: 'Audit Universe phản ánh đầy đủ cơ cấu tổ chức và ma trận quy trình của ngân hàng. Hằng năm, KTNB tiến hành đánh giá rủi ro trên toàn bộ Audit Universe để chọn ra các đối tượng có mức độ rủi ro cao nhất đưa vào Kế hoạch kiểm toán năm.',
    standardRef: 'IIA Standard 2010 - Planning & Risk-based Assessment',
    appLink: { title: 'Danh mục Vũ trụ Kiểm toán', route: '/audit-universe' }
  },
  {
    id: 'iia-5',
    category: 'regulations',
    categoryName: 'Quy định Pháp lý & Thông tư NHNN',
    question: 'Theo Thông tư 13/2018/TT-NHNN và Thông tư 83/2025/TT-NHNN, cơ chế báo cáo trực tiếp của Khối Kiểm toán Nội bộ trong Ngân hàng thương mại được quy định như thế nào?',
    options: [
      'A. Báo cáo trực tiếp và chịu sự chỉ đạo của Tổng Giám đốc',
      'B. Báo cáo trực tiếp lên Ban Kiểm soát (Báo cáo chức năng) và Tổng Giám đốc (Báo cáo hành chính)',
      'C. Báo cáo lên Khối Quản lý Rủi ro Hội sở',
      'D. Báo cáo độc quyền cho Thanh tra Giám sát Ngân hàng Nhà nước mà không cần qua BKS'
    ],
    correctAnswer: 1,
    flashcardFront: 'Cơ chế báo cáo kép (Dual-reporting) của KTNB theo Thông tư 13/2018?',
    flashcardBack: 'KTNB báo cáo trực tiếp lên Ban Kiểm soát (Functional Reporting - về kế hoạch, kết quả kiểm toán, ngân sách và nhân sự) và báo cáo Tổng Giám đốc (Administrative Reporting - về vận hành hành chính thường nhật).',
    explanation: 'Cơ chế Dual-Reporting đảm bảo KTNB không bị chi phối bởi Ban Điều hành trong việc phát hiện và báo cáo các rủi ro trọng yếu, đồng thời vẫn phối hợp chặt chẽ trong quản trị ngân hàng.',
    standardRef: 'Thông tư 13/2018/TT-NHNN Điều 15, 17 / Luật Các TCTD',
    appLink: { title: 'Cổng Ủy ban Kiểm toán & BKS', route: '/audit-committee' }
  },
  {
    id: 'iia-6',
    category: 'regulations',
    categoryName: 'Quy định Pháp lý & Thông tư NHNN',
    question: 'Nghị định 340/NĐ-CP của Chính phủ quy định về nội dung gì liên quan trực tiếp đến các phát hiện kiểm toán nội bộ?',
    options: [
      'A. Quy chế khen thưởng nhân viên xuất sắc ngành ngân hàng',
      'B. Khung chế tài và xử phạt vi phạm hành chính trong lĩnh vực tiền tệ và hoạt động ngân hàng',
      'C. Hướng dẫn tính toán thuế thu nhập doanh nghiệp cho các TCTD',
      'D. Tiêu chuẩn thiết kế kiến trúc phòng giao dịch'
    ],
    correctAnswer: 1,
    flashcardFront: 'Vai trò của Nghị định 340 trong phân hệ Phát hiện Kiểm toán?',
    flashcardBack: 'Cung cấp cơ sở pháp lý và điều khoản chế tài xử phạt hành chính đối với các sai phạm trong hoạt động cấp tín dụng, an toàn vốn, tỷ lệ thanh khoản và vận hành CNTT.',
    explanation: 'Khi KTV lập phát hiện kiểm toán trên hệ thống Smart Audit, trường "Mã lỗi theo NĐ 340" sẽ đối chiếu trực tiếp hành vi sai phạm với các điều khoản xử phạt của cơ quan quản lý để đánh giá mức độ nghiêm trọng và rủi ro pháp lý.',
    standardRef: 'Nghị định 340/NĐ-CP & Thư viện Quy định Pháp lý',
    appLink: { title: 'Thư viện Quy định & NĐ 340', route: '/regulatory-kb' }
  },
  {
    id: 'iia-7',
    category: 'smart_audit_app',
    categoryName: 'Thực hành trên Smart Audit 4.0',
    question: 'Trên phần mềm Smart Audit 4.0, khi một Giấy tờ làm việc (Working Paper) phát hiện có sai sót, thao tác chuẩn để chuyển thông tin sang phân hệ Phát hiện (Finding) là gì?',
    options: [
      'A. Xóa Working Paper đó đi và tạo một cuộc kiểm toán mới',
      'B. Bấm nút "⚡ Tạo Phát hiện từ WP này" để hệ thống tự động trích xuất tiêu đề, mẫu kiểm tra, CIF và hiện trạng sai phạm sang form Finding',
      'C. Xuất file Excel thủ công ra desktop rồi gửi email cho Trưởng ban KTNB',
      'D. Sao chép bằng tay từng dòng vào mục Quản lý Chi phí kiểm toán'
    ],
    correctAnswer: 1,
    flashcardFront: 'Luồng liên kết dữ liệu từ Working Paper (WP) sang Finding trên Smart Audit?',
    flashcardBack: 'Mỗi Working Paper có nút "⚡ Tạo Phát hiện từ WP này". Khi bấm, hệ thống tự động chuyển tiếp tiêu đề, thông tin mẫu kiểm tra (CIF, khách hàng), điều kiện sai phạm và gắn liên kết 2 chiều giữa WP và Finding.',
    explanation: 'Tính năng này giúp KTV tiết kiệm 80% thời gian nhập liệu lặp lại, đảm bảo tính toàn vẹn dữ liệu (Audit Trail) và cho phép truy vết ngược từ Finding về bằng chứng gốc trong WP.',
    standardRef: 'Smart Audit 4.0 E2E Architecture - WP to Finding Pipeline',
    appLink: { title: 'Màn hình Giấy tờ làm việc', route: '/working-papers' }
  },
  {
    id: 'iia-8',
    category: 'smart_audit_app',
    categoryName: 'Thực hành trên Smart Audit 4.0',
    question: 'Khi theo dõi Kiến nghị Kiểm toán (Recommendations) trên hệ thống Smart Audit, trạng thái nào thể hiện KTV đã kiểm tra tài liệu minh chứng và xác nhận đơn vị đã khắc phục xong?',
    options: [
      'A. Draft (Bản nháp)',
      'B. Overdue (Quá hạn)',
      'C. Verified (Đã xác nhận khắc phục)',
      'D. Rejected (Từ chối)'
    ],
    correctAnswer: 2,
    flashcardFront: 'Vòng đời trạng thái của Kiến nghị Kiểm toán (Recommendation Lifecycle)?',
    flashcardBack: 'Open (Mở mới) ➔ InProgress (Đang xử lý theo SLA) ➔ Remediated (Đơn vị báo cáo xong & nộp minh chứng) ➔ Verified (KTV thẩm định xác nhận) ➔ Closed (Trưởng đoàn/Lãnh đạo duyệt đóng chính thức).',
    explanation: 'Quy trình kiểm soát đa tầng đảm bảo không có kiến nghị nào được đóng tùy tiện nếu chưa có sự thẩm định độc lập (Verify) của KTV và sự phê duyệt của Trưởng đoàn kiểm toán.',
    standardRef: 'Smart Audit 4.0 Recommendation SLA & Remediation Protocol',
    appLink: { title: 'Theo dõi Kiến nghị & SLA', route: '/recommendations' }
  }
];
