export interface GiasStandardItem {
  code: string;
  nameVi: string;
  nameEn: string;
  description: string;
  requirements: string[];
  smartAuditSupport: string;
  relatedRoute?: string;
}

export interface GiasPrinciple {
  number: number;
  titleVi: string;
  titleEn: string;
  domainId: 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
  summary: string;
  standards: GiasStandardItem[];
}

export interface GiasDomain {
  id: 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
  number: string;
  titleVi: string;
  titleEn: string;
  color: string;
  badge: string;
  description: string;
  principles: GiasPrinciple[];
}

export const giasStandardsData: GiasDomain[] = [
  // ───────────────────────────────────────────────────────────────────
  // MIỀN I: MỤC ĐÍCH CỦA KIỂM TOÁN NỘI BỘ
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'D1',
    number: 'Miền I',
    titleVi: 'Mục Đích của Kiểm Toán Nội Bộ',
    titleEn: 'Purpose of Internal Audit',
    color: '#ea9105',
    badge: 'Định vị cốt lõi',
    description: 'Định nghĩa bản chất, giá trị tạo lập và bảo vệ cho tổ chức thông qua các dịch vụ đảm bảo và tư vấn độc lập, khách quan, dựa trên rủi ro.',
    principles: [
      {
        number: 0, // Tuyên bố mục đích chung
        domainId: 'D1',
        titleVi: 'Tuyên bố Mục đích Kiểm toán Nội bộ Toàn cầu',
        titleEn: 'Statement of Purpose of Internal Audit',
        summary: 'Kiểm toán nội bộ củng cố khả năng của tổ chức trong việc tạo lập, bảo vệ và duy trì giá trị bằng cách cung cấp cho Hội đồng quản trị và Ban điều hành sự đảm bảo, tư vấn và hiểu biết sâu sắc khách quan, độc lập và theo định hướng rủi ro.',
        standards: [
          {
            code: 'Mục đích cốt lõi',
            nameVi: 'Tạo lập & Bảo vệ Giá trị Doanh nghiệp',
            nameEn: 'Creating and Protecting Value',
            description: 'KTNB giúp tổ chức đạt được các mục tiêu chiến lược thông qua việc đánh giá và nâng cao tính hữu hiệu của các quy trình quản trị, quản lý rủi ro và kiểm soát nội bộ.',
            requirements: [
              'Cung cấp dịch vụ đảm bảo (Assurance) về hệ thống KSNB và tuân thủ.',
              'Cung cấp dịch vụ tư vấn (Advisory) nhằm hoàn thiện quy trình mà không làm phương hại tính độc lập.',
              'Đóng vai trò là đối tác chiến lược tin cậy của BKS và HĐQT.'
            ],
            smartAuditSupport: 'Hệ thống Smart Audit cung cấp đầy đủ cả luồng Kiểm toán đảm bảo (Audit Engagements) và Giám sát KRI liên tục hỗ trợ ra quyết định.',
            relatedRoute: '/audit-engagements'
          }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────
  // MIỀN II: ĐẠO ĐỨC VÀ TÍNH CHUYÊN NGHIỆP
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'D2',
    number: 'Miền II',
    titleVi: 'Đạo Đức & Tính Chuyên Nghiệp',
    titleEn: 'Ethics and Professionalism',
    color: '#0284c7',
    badge: '5 Nguyên tắc đạo đức',
    description: 'Quy định các giá trị cốt lõi, chuẩn mực hành vi bắt buộc của từng kiểm toán viên và bộ phận KTNB.',
    principles: [
      {
        number: 1,
        domainId: 'D2',
        titleVi: 'Nguyên tắc 1: Thể hiện Tính Liêm chính',
        titleEn: 'Principle 1: Demonstrate Integrity',
        summary: 'Kiểm toán viên nội bộ thể hiện tính liêm chính trong công việc và hành vi, thiết lập lòng tin và làm nền tảng cho sự tin cậy trong các đánh giá của mình.',
        standards: [
          {
            code: 'Standard 1.1',
            nameVi: 'Tính trung thực và lòng dũng cảm chuyên môn',
            nameEn: 'Honesty and Professional Courage',
            description: 'KTV phải hành động trung thực, tôn trọng sự thật và sẵn sàng nêu lên các vấn đề sai phạm nghiêm trọng ngay cả khi gặp áp lực từ các cấp quản lý.',
            requirements: [
              'Báo cáo trung thực mọi phát hiện kiểm toán không bị bóp méo.',
              'Không che giấu hoặc giảm nhẹ mức độ sai phạm vì bất kỳ lý do nào.'
            ],
            smartAuditSupport: 'Mọi phát hiện 5C đều được lưu vết bất biến trong Audit Trail và kiểm soát qua luồng phê duyệt Four-Eyes.',
            relatedRoute: '/audit-findings'
          },
          {
            code: 'Standard 1.2',
            nameVi: 'Hành vi đạo đức theo chuẩn mực của tổ chức',
            nameEn: 'Organization’s Ethical Expectations',
            description: 'KTV hiểu rõ, tuân thủ và thúc đẩy các giá trị văn hóa đạo đức, quy tắc ứng xử của Ngân hàng.',
            requirements: [
              'Ký cam kết tuân thủ đạo đức nghề nghiệp hàng năm.',
              'Chủ động phát hiện các dấu hiệu vi phạm văn hóa tuân thủ tại đơn vị.'
            ],
            smartAuditSupport: 'Hồ sơ nhân sự kiểm toán (/personnel) theo dõi chứng chỉ chuyên môn và đánh giá đạo đức hàng năm.',
            relatedRoute: '/personnel'
          },
          {
            code: 'Standard 1.3',
            nameVi: 'Hành vi hợp pháp và vì lợi ích công chúng',
            nameEn: 'Legal and Behavior in Public Interest',
            description: 'Không tham gia vào bất kỳ hành vi bất hợp pháp hoặc các hoạt động làm mất uy tín nghề nghiệp KTNB hoặc ngân hàng.',
            requirements: [
              'Tuân thủ Luật các TCTD, Thông tư NHNN và quy chế nội bộ LPBank.',
              'Kịp thời báo cáo hành vi có dấu hiệu tội phạm tài chính.'
            ],
            smartAuditSupport: 'Tích hợp danh mục xử phạt Nghị định 340 để đối chiếu mức độ vi phạm pháp luật.',
            relatedRoute: '/regulatory-kb'
          }
        ]
      },
      {
        number: 2,
        domainId: 'D2',
        titleVi: 'Nguyên tắc 2: Duy trì Tính Khách quan',
        titleEn: 'Principle 2: Maintain Objectivity',
        summary: 'Kiểm toán viên nội bộ duy trì thái độ công tâm, không thiên vị khi thực hiện các dịch vụ kiểm toán và đưa ra các đánh giá.',
        standards: [
          {
            code: 'Standard 2.1',
            nameVi: 'Tính khách quan cá nhân',
            nameEn: 'Individual Objectivity',
            description: 'KTV duy trì sự tự chủ về đánh giá chuyên môn, không để các mối quan hệ cá nhân, lợi ích kinh tế hoặc sự chi phối của người khác làm sai lệch kết luận.',
            requirements: [
              'Đánh giá bằng chứng công bằng, trung thực không thiên vị.',
              'Không chấp nhận quà tặng hoặc ưu đãi có thể làm suy giảm tính khách quan.'
            ],
            smartAuditSupport: 'Mỗi W/P và Báo cáo đều có ít nhất 2 cấp phê duyệt độc lập (Four-Eyes Principle).',
            relatedRoute: '/working-papers'
          },
          {
            code: 'Standard 2.2',
            nameVi: 'Bảo vệ tính khách quan',
            nameEn: 'Safeguarding Objectivity',
            description: 'Nhận diện và phòng ngừa các nguy cơ làm suy giảm tính khách quan (tự kiểm toán, thiên vị, đe dọa hoặc thân quen).',
            requirements: [
              'Áp dụng biện pháp bảo vệ phù hợp khi phát hiện nguy cơ ảnh hưởng khách quan.',
              'Thay đổi phân công thành viên đoàn kiểm toán khi cần thiết.'
            ],
            smartAuditSupport: 'Tính năng phân tách quyền hạn (Role-based access control) ngăn chặn tự duyệt hồ sơ của chính mình.',
            relatedRoute: '/roles'
          },
          {
            code: 'Standard 2.3',
            nameVi: 'Khai báo và xử lý Xung đột Lợi ích (COI)',
            nameEn: 'Disclosing Impairments to Objectivity',
            description: 'KTV phải khai báo ngay lập tức mọi tình huống xung đột lợi ích thực tế hoặc tiềm ẩn (ví dụ: có người thân làm quản lý tại chi nhánh được kiểm toán).',
            requirements: [
              'KTV không được kiểm toán đơn vị/quy trình mình từng phụ trách trong vòng 12 tháng.',
              'Khai báo xung đột lợi ích trước mỗi cuộc kiểm toán.'
            ],
            smartAuditSupport: 'Phân hệ Theo dõi Tính độc lập (/independence-tracker) tự động quét và chặn gán KTV vi phạm thời gian cách ly 12 tháng.',
            relatedRoute: '/independence-tracker'
          }
        ]
      },
      {
        number: 3,
        domainId: 'D2',
        titleVi: 'Nguyên tắc 3: Thể hiện Năng lực Chuyên môn',
        titleEn: 'Principle 3: Demonstrate Competency',
        summary: 'Kiểm toán viên nội bộ áp dụng kiến thức, kỹ năng và các năng lực cần thiết khác để thực hiện công việc kiểm toán một cách thành công.',
        standards: [
          {
            code: 'Standard 3.1',
            nameVi: 'Năng lực chuyên môn cốt lõi',
            nameEn: 'Competency',
            description: 'KTV sở hữu hoặc phát triển kiến thức sâu rộng về nghiệp vụ ngân hàng, công nghệ thông tin, phân tích dữ liệu và các chuẩn mực kiểm toán.',
            requirements: [
              'Hiểu rõ các sản phẩm tài chính tín dụng, thanh toán quốc tế, kho quỹ.',
              'Thành thạo kỹ năng phỏng vấn, thu thập bằng chứng và phân tích dữ liệu.'
            ],
            smartAuditSupport: 'Kho cẩm nang nghiệp vụ và Quizlet kiểm tra kiến thức IIA tích hợp trực tiếp trên User Guide.',
            relatedRoute: '/user-guide'
          },
          {
            code: 'Standard 3.2',
            nameVi: 'Đào tạo và Phát triển Chuyên môn Liên tục (CPE)',
            nameEn: 'Continuing Professional Development (CPE)',
            description: 'KTV duy trì và nâng cao năng lực thông qua đào tạo liên tục tối thiểu 40 giờ CPE/năm theo quy định của IIA.',
            requirements: [
              'Hoàn thành các khóa đào tạo nội bộ và bên ngoài về nghiệp vụ mới.',
              'Cập nhật các văn bản pháp quy mới của NHNN và Bộ Tài chính.'
            ],
            smartAuditSupport: 'Phân hệ Đào tạo CPE (/training-cpe) theo dõi số giờ đào tạo và chứng chỉ của từng nhân sự.',
            relatedRoute: '/training-cpe'
          }
        ]
      },
      {
        number: 4,
        domainId: 'D2',
        titleVi: 'Nguyên tắc 4: Thực hiện Thận trọng Nghề nghiệp Thích đáng',
        titleEn: 'Principle 4: Exercise Due Professional Care',
        summary: 'Kiểm toán viên áp dụng sự thận trọng và kỹ năng nghề nghiệp phù hợp với mức độ phức tạp và rủi ro của từng công việc.',
        standards: [
          {
            code: 'Standard 4.1',
            nameVi: 'Tuân thủ mức độ thận trọng nghề nghiệp',
            nameEn: 'Exercising Due Professional Care',
            description: 'Cân nhắc mức độ phức tạp, rủi ro, chi phí so với lợi ích, và khả năng xảy ra các sai sót trọng yếu hoặc gian lận trong quá trình kiểm toán.',
            requirements: [
              'Xác định quy mô mẫu kiểm toán dựa trên cơ sở khoa học và mức rủi ro.',
              'Không kiểm tra qua loa hoặc bỏ qua các dấu hiệu bất thường.'
            ],
            smartAuditSupport: 'Công cụ tính cỡ mẫu khoa học DetailedSamplingGrid đảm bảo mẫu đại diện và tin cậy.',
            relatedRoute: '/working-papers'
          },
          {
            code: 'Standard 4.2',
            nameVi: 'Áp dụng Hoài nghi Nghề nghiệp',
            nameEn: 'Exercising Professional Skepticism',
            description: 'Duy trì tinh thần cảnh giác, đối chiếu chéo nhiều nguồn bằng chứng độc lập, không mặc định thừa nhận tính trung thực của tài liệu đơn vị cung cấp.',
            requirements: [
              'Đối chiếu chứng từ thực tế với dữ liệu hệ thống Core Banking.',
              'Xác minh nguồn gốc và tính hợp lệ của tài sản bảo đảm.'
            ],
            smartAuditSupport: 'Phân hệ Phân tích dữ liệu (/data-analytics) thực hiện đối soát tự động hàng triệu bản ghi giao dịch.',
            relatedRoute: '/data-analytics'
          }
        ]
      },
      {
        number: 5,
        domainId: 'D2',
        titleVi: 'Nguyên tắc 5: Duy trì Tính Bảo mật Thông tin',
        titleEn: 'Principle 5: Maintain Confidentiality',
        summary: 'Kiểm toán viên nội bộ tôn trọng giá trị và quyền sở hữu thông tin mà họ nhận được và không tiết lộ thông tin khi chưa có thẩm quyền thích hợp.',
        standards: [
          {
            code: 'Standard 5.1',
            nameVi: 'Sử dụng thông tin đúng mục đích',
            nameEn: 'Use of Information',
            description: 'Không sử dụng thông tin kiểm toán cho lợi ích cá nhân hoặc theo cách trái pháp luật hay xâm hại đến lợi ích của Ngân hàng.',
            requirements: [
              'Chỉ sử dụng dữ liệu khách hàng cho mục đích kiểm toán được phê duyệt.',
              'Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.'
            ],
            smartAuditSupport: 'Hệ thống áp dụng mã hóa AES-256 cho dữ liệu nhạy cảm và gán nhãn bảo mật.',
            relatedRoute: '/system-management'
          },
          {
            code: 'Standard 5.2',
            nameVi: 'Bảo vệ an toàn thông tin và hồ sơ kiểm toán',
            nameEn: 'Protection of Information',
            description: 'Áp dụng các biện pháp bảo vệ vật lý và kỹ thuật số để ngăn chặn việc truy cập trái phép vào hồ sơ kiểm toán.',
            requirements: [
              'Phân quyền truy cập hồ sơ kiểm toán theo nguyên tắc Need-to-know.',
              'Xác thực 2 lớp OTP (2FA) khi đăng nhập hệ thống.'
            ],
            smartAuditSupport: 'Hệ thống Smart Audit bắt buộc 2FA OTP Authenticator và phân quyền theo vai trò chặt chẽ.',
            relatedRoute: '/system-management'
          }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────
  // MIỀN III: QUẢN TRỊ CHỨC NĂNG KIỂM TOÁN NỘI BỘ
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'D3',
    number: 'Miền III',
    titleVi: 'Quản Trị Chức Năng Kiểm Toán Nội Bộ',
    titleEn: 'Governing the Internal Audit Function',
    color: '#7c3aed',
    badge: 'Quan hệ BKS & HĐQT',
    description: 'Quy định mối quan hệ làm việc và cơ chế quản trị giữa Hội đồng Quản trị / Ban Kiểm soát, Ban Điều hành và Trưởng Ban KTNB (CAE).',
    principles: [
      {
        number: 6,
        domainId: 'D3',
        titleVi: 'Nguyên tắc 6: Được Hội Đồng Quản Trị / BKS Ủy Quyền',
        titleEn: 'Principle 6: Authorized by the Board',
        summary: 'Hội đồng quản trị và Ban Kiểm soát thiết lập, phê duyệt và duy trì thẩm quyền, vai trò của bộ phận KTNB thông qua Quy chế KTNB.',
        standards: [
          {
            code: 'Standard 6.1',
            nameVi: 'Quy chế Kiểm toán Nội bộ (Audit Charter)',
            nameEn: 'Internal Audit Charter',
            description: 'Quy chế chính thức quy định mục đích, quyền hạn truy cập không giới hạn hồ sơ/nhân sự, và phạm vi dịch vụ của KTNB.',
            requirements: [
              'Quy chế được BKS rà soát và trình HĐQT phê duyệt định kỳ.',
              'Quy định quyền truy cập toàn bộ hệ thống dữ liệu phục vụ kiểm toán.'
            ],
            smartAuditSupport: 'Quản trị danh mục văn bản và quy định ủy quyền tại Thư viện Văn bản Pháp quy (/regulatory-kb).',
            relatedRoute: '/regulatory-kb'
          },
          {
            code: 'Standard 6.2',
            nameVi: 'Thẩm quyền tiếp cận thông tin, nhân sự và tài sản',
            nameEn: 'Authority to Access Information',
            description: 'KTNB được quyền tiếp cận đầy đủ, không hạn chế đối với mọi hồ sơ, tài sản và nhân sự liên quan đến cuộc kiểm toán.',
            requirements: [
              'Nghiêm cấm đơn vị từ chối cung cấp dữ liệu hoặc cản trở KTV.',
              'Quy trình leo thang báo cáo BKS khi bị hạn chế phạm vi kiểm toán.'
            ],
            smartAuditSupport: 'Cổng thông tin Auditee Portal cho phép đơn vị tải nạp và xác nhận cung cấp hồ sơ trực tuyến có ký nhận.',
            relatedRoute: '/auditee-portal'
          }
        ]
      },
      {
        number: 7,
        domainId: 'D3',
        titleVi: 'Nguyên tắc 7: Vị trí Độc lập của Chức năng KTNB',
        titleEn: 'Principle 7: Positioned Independently',
        summary: 'Hội đồng quản trị và BKS đảm bảo bộ phận KTNB được định vị độc lập trong cơ cấu tổ chức để thực hiện đầy đủ trách nhiệm.',
        standards: [
          {
            code: 'Standard 7.1',
            nameVi: 'Độc lập về cơ cấu tổ chức',
            nameEn: 'Organizational Independence of the Function',
            description: 'CAE báo cáo trực tiếp về mặt chức năng cho Ban Kiểm soát / Ủy ban Kiểm toán, và báo cáo hành chính cho Tổng Giám đốc.',
            requirements: [
              'BKS phê duyệt kế hoạch, ngân sách, nhân sự và thù lao của CAE.',
              'CAE tham gia các cuộc họp định kỳ với BKS mà không có Ban Điều hành.'
            ],
            smartAuditSupport: 'Cổng thông tin Ban Kiểm soát (/audit-committee-portal) cung cấp dashboard báo cáo độc lập thời gian thực.',
            relatedRoute: '/audit-committee-portal'
          },
          {
            code: 'Standard 7.2',
            nameVi: 'Trách nhiệm của CAE đối với tính độc lập',
            nameEn: 'Chief Audit Executive Roles and Independence',
            description: 'CAE không được đảm nhận các vai trò quản lý vận hành ngoài kiểm toán; nếu có phải báo cáo ngay cho BKS biện pháp phòng ngừa.',
            requirements: [
              'Khai báo định kỳ tình trạng độc lập của toàn bộ nhân sự KTNB.',
              'Không tham gia các ban điều hành phê duyệt nghiệp vụ kinh doanh.'
            ],
            smartAuditSupport: 'Màn hình Quản trị Vai trò (/roles) và Phân tách trách nhiệm đảm bảo CAE chỉ giữ quyền kiểm toán.',
            relatedRoute: '/roles'
          }
        ]
      },
      {
        number: 8,
        domainId: 'D3',
        titleVi: 'Nguyên tắc 8: Được BKS & Hội Đồng Quản Trị Giám Sát',
        titleEn: 'Principle 8: Overseen by the Board',
        summary: 'Hội đồng quản trị và Ban Kiểm soát giám sát hoạt động của KTNB để đảm bảo tính hữu hiệu và giá trị mang lại cho ngân hàng.',
        standards: [
          {
            code: 'Standard 8.1',
            nameVi: 'Tương tác định kỳ giữa BKS và CAE',
            nameEn: 'Board Interaction',
            description: 'CAE duy trì kênh trao đổi cởi mở, định kỳ với Chủ tịch BKS và Trưởng Ủy ban Kiểm toán về tiến độ và rủi ro trọng yếu.',
            requirements: [
              'Họp định kỳ tối thiểu hàng quý với Ban Kiểm soát.',
              'Báo cáo các trường hợp bất đồng ý kiến nghiêm trọng với Ban Điều hành.'
            ],
            smartAuditSupport: 'Tính năng gửi thông báo tự động và xuất báo cáo điều hành dành riêng cho BKS.',
            relatedRoute: '/audit-committee-portal'
          },
          {
            code: 'Standard 8.2',
            nameVi: 'BKS giám sát nguồn lực và kế hoạch kiểm toán',
            nameEn: 'Resources and Annual Plan Approval',
            description: 'BKS xem xét và phê duyệt Kế hoạch kiểm toán năm dựa trên đánh giá rủi ro và đảm bảo nguồn lực thực hiện đầy đủ.',
            requirements: [
              'Phê duyệt Kế hoạch kiểm toán năm trước ngày 31/12 hàng năm.',
              'Phê duyệt các điều chỉnh kế hoạch phát sinh trong năm.'
            ],
            smartAuditSupport: 'Luồng phê duyệt Kế hoạch kiểm toán năm 3 cấp trên Chu trình Lập kế hoạch RBIA (/risk-and-planning?step=plan).',
            relatedRoute: '/risk-and-planning?step=plan'
          },
          {
            code: 'Standard 8.3',
            nameVi: 'BKS giám sát chất lượng hoạt động KTNB',
            nameEn: 'Quality Assessment Review',
            description: 'BKS nhận và đánh giá kết quả chương trình QAIP nội bộ và báo cáo đánh giá độc lập bên ngoài.',
            requirements: [
              'Báo cáo kết quả QAIP hàng năm cho Ban Kiểm soát.',
              'Thực hiện đánh giá độc lập bên ngoài tối thiểu 5 năm/lần.'
            ],
            smartAuditSupport: 'Bảng điểm chất lượng QAIP Scorecard tại phân hệ Quản lý Chất lượng (/quality-control).',
            relatedRoute: '/quality-control'
          }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────
  // MIỀN IV: QUẢN LÝ HOẠT ĐỘNG KIỂM TOÁN NỘI BỘ (TRÁCH NHIỆM CAE)
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'D4',
    number: 'Miền IV',
    titleVi: 'Quản Lý Hoạt Động Kiểm Toán Nội Bộ',
    titleEn: 'Managing the Internal Audit Function',
    color: '#059669',
    badge: 'Năng lực vận hành của CAE',
    description: 'Quy định trách nhiệm của Trưởng Ban KTNB (CAE) trong việc quản lý chiến lược, nguồn lực, quan hệ đối tác và chất lượng hoạt động.',
    principles: [
      {
        number: 9,
        domainId: 'D4',
        titleVi: 'Nguyên tắc 9: Lập Kế Hoạch Chiến Lược & Định Hướng Rủi Ro',
        titleEn: 'Principle 9: Plan Strategically',
        summary: 'CAE lập kế hoạch chiến lược và kế hoạch hoạt động kiểm toán dựa trên đánh giá rủi ro định lượng, phù hợp với mục tiêu của ngân hàng.',
        standards: [
          {
            code: 'Standard 9.1',
            nameVi: 'Thấu hiểu bối cảnh và mục tiêu chiến lược của ngân hàng',
            nameEn: 'Understanding Governance, Risk and Control',
            description: 'CAE phải nắm vững mô hình kinh doanh, môi trường pháp lý, chiến lược phát triển và khẩu vị rủi ro của ngân hàng.',
            requirements: [
              'Khảo sát định kỳ môi trường kiểm soát và xu hướng rủi ro vĩ mô.',
              'Cập nhật danh mục đối tượng trong Vũ trụ Kiểm toán liên tục.'
            ],
            smartAuditSupport: 'Quản trị Vũ trụ Kiểm toán (/risk-and-planning?step=scope) lưu vết toàn bộ đơn vị và quy trình cốt lõi.',
            relatedRoute: '/risk-and-planning?step=scope'
          },
          {
            code: 'Standard 9.2',
            nameVi: 'Phương pháp luận Đánh giá Rủi ro (Risk Assessment)',
            nameEn: 'Internal Audit Strategy & Risk Assessment',
            description: 'Xây dựng phương pháp luận chấm điểm rủi ro tiềm tàng (Inherent) và rủi ro còn lại (Residual) kết hợp yếu tố định tính và định lượng.',
            requirements: [
              'Chấm điểm ma trận rủi ro 2 chiều (Xác suất x Mức độ ảnh hưởng).',
              'Tích hợp chỉ số giám sát liên tục KRI vào điểm số rủi ro.'
            ],
            smartAuditSupport: 'Phân hệ Đánh giá Rủi ro (/risk-and-planning?step=prioritization) tự động tính toán điểm rủi ro theo trọng số chuẩn hóa.',
            relatedRoute: '/risk-and-planning?step=prioritization'
          },
          {
            code: 'Standard 9.3',
            nameVi: 'Lập Kế hoạch Kiểm toán Năm (Annual Audit Plan)',
            nameEn: 'Methodology for Developing the Risk-based Plan',
            description: 'Lập danh mục các cuộc kiểm toán ưu tiên cao dựa trên kết quả đánh giá rủi ro, cân đối nguồn lực và thời gian thực hiện.',
            requirements: [
              'Ưu tiên 100% các đối tượng có Rủi ro Còn lại ở mức Cao (High Risk).',
              'Đảm bảo tần suất kiểm toán tuân thủ Thông tư 13/2018/TT-NHNN.'
            ],
            smartAuditSupport: 'Màn hình Lập Kế hoạch (/risk-and-planning?step=plan) cho phép gán nguồn lực và tính toán số giờ công (Mandays).',
            relatedRoute: '/risk-and-planning?step=plan'
          }
        ]
      },
      {
        number: 10,
        domainId: 'D4',
        titleVi: 'Nguyên tắc 10: Quản Lý Nguồn Lực Hiệu Quả',
        titleEn: 'Principle 10: Manage Resources',
        summary: 'CAE quản lý nguồn lực tài chính, nhân sự và công nghệ để đảm bảo hoàn thành kế hoạch kiểm toán với chất lượng cao nhất.',
        standards: [
          {
            code: 'Standard 10.1',
            nameVi: 'Quản lý Nguồn nhân lực và Kỹ năng',
            nameEn: 'Financial Resource Management',
            description: 'Tuyển dụng, bố trí và phát triển đội ngũ KTV có đủ chuyên môn về tài chính, rủi ro, công nghệ thông tin và an ninh mạng.',
            requirements: [
              'Phân bổ nhân sự phù hợp với độ phức tạp của từng cuộc kiểm toán.',
              'Theo dõi năng suất làm việc qua hệ thống chấm công Timesheet.'
            ],
            smartAuditSupport: 'Phân hệ Ghi nhận Giờ công (/timesheet) và Quản lý Nhân sự (/personnel) theo dõi chi tiết hiệu suất.',
            relatedRoute: '/timesheet'
          },
          {
            code: 'Standard 10.2',
            nameVi: 'Ứng dụng Công nghệ và Phân tích Dữ liệu (Audit Technology)',
            nameEn: 'Human Resources & Technology Management',
            description: 'Đầu tư và ứng dụng các công cụ phần mềm quản lý kiểm toán (AMS), trí tuệ nhân tạo (AI) và kỹ thuật phân tích dữ liệu lớn.',
            requirements: [
              'Số hóa 100% hồ sơ kiểm toán, không dùng giấy tờ thủ công.',
              'Ứng dụng AI hỗ trợ gợi ý ma trận rủi ro và phát hiện bất thường.'
            ],
            smartAuditSupport: 'Smart Audit 4.0 tích hợp sẵn Trợ lý AI Kita và Module Phân tích Dữ liệu nâng cao.',
            relatedRoute: '/data-analytics'
          }
        ]
      },
      {
        number: 11,
        domainId: 'D4',
        titleVi: 'Nguyên tắc 11: Giao Tiếp Hiệu Quả & Xây Dựng Quan Hệ',
        titleEn: 'Principle 11: Communicate Effectively',
        summary: 'CAE duy trì giao tiếp cởi mở, mang tính xây dựng với Ban Điều hành, kiểm toán độc lập và cơ quan thanh tra giám sát NHNN.',
        standards: [
          {
            code: 'Standard 11.1',
            nameVi: 'Xây dựng mối quan hệ tin cậy với các bên liên quan',
            nameEn: 'Building Relationships and Trust',
            description: 'Tương tác thường xuyên với các Khối nghiệp vụ để kịp thời nắm bắt các sáng kiến kinh doanh mới và thay đổi quy trình.',
            requirements: [
              'Tham vấn Ban Điều hành trong quá trình xây dựng Kế hoạch kiểm toán năm.',
              'Lắng nghe và tôn trọng ý kiến giải trình của đơn vị được kiểm toán.'
            ],
            smartAuditSupport: 'Cổng thông tin Auditee Portal tạo kênh giao tiếp 2 chiều minh bạch.',
            relatedRoute: '/auditee-portal'
          },
          {
            code: 'Standard 11.2',
            nameVi: 'Phối hợp với các đơn vị đảm bảo khác (Coordination & Reliance)',
            nameEn: 'Coordination with Other Assurance Providers',
            description: 'Phối hợp công việc với Tuyến 2 (Quản lý Rủi ro, Tuân thủ) và Kiểm toán độc lập để giảm thiểu trùng lặp và tối ưu hóa nguồn lực.',
            requirements: [
              'Chia sẻ thông tin đánh giá rủi ro và kế hoạch kiểm tra giữa các bên.',
              'Sử dụng kết quả kiểm tra của các đơn vị đảm bảo khác khi phù hợp.'
            ],
            smartAuditSupport: 'Tích hợp dữ liệu từ Khối QLRR tại tab Giám sát KRI liên tục (/continuous-monitoring).',
            relatedRoute: '/continuous-monitoring'
          }
        ]
      },
      {
        number: 12,
        domainId: 'D4',
        titleVi: 'Nguyên tắc 12: Nâng Cao Chất Lượng Hoạt Động (QAIP)',
        titleEn: 'Principle 12: Enhance Quality',
        summary: 'CAE phát triển, duy trì và thực hiện chương trình đảm bảo và nâng cao chất lượng bao trùm toàn bộ hoạt động kiểm toán nội bộ.',
        standards: [
          {
            code: 'Standard 12.1',
            nameVi: 'Đánh giá nội bộ định kỳ và liên tục (Internal Assessments)',
            nameEn: 'Internal Quality Assessments',
            description: 'Giám sát chất lượng liên tục trong từng cuộc kiểm toán và đánh giá định kỳ hàng năm sự tuân thủ chuẩn mực GIAS.',
            requirements: [
              'Trưởng đoàn soát xét 100% Giấy tờ làm việc W/P trước khi phát hành MB04.',
              'Đánh giá chất lượng sau mỗi cuộc kiểm toán theo bảng tiêu chí QAIP.'
            ],
            smartAuditSupport: 'Hệ thống chấm điểm kiểm soát chất lượng tự động tại phân hệ Quality Control (/quality-control).',
            relatedRoute: '/quality-control'
          },
          {
            code: 'Standard 12.2',
            nameVi: 'Đánh giá độc lập bên ngoài (External Assessments)',
            nameEn: 'External Quality Assessments',
            description: 'Thuê tổ chức kiểm định độc lập, có năng lực chuyên môn để đánh giá toàn diện hoạt động KTNB tối thiểu 5 năm/lần.',
            requirements: [
              'Báo cáo đầy đủ kết luận đánh giá bên ngoài cho BKS và HĐQT.',
              'Lập kế hoạch hành động khắc phục các khuyến nghị của đơn vị đánh giá.'
            ],
            smartAuditSupport: 'Hồ sơ bằng chứng lịch sử kiểm toán được lưu trữ bất biến phục vụ tra cứu kiểm định.',
            relatedRoute: '/audit-trail'
          }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────
  // MIỀN V: THỰC HIỆN CÁC DỊCH VỤ KIỂM TOÁN NỘI BỘ (QUY TRÌNH CUỘC KT)
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'D5',
    number: 'Miền V',
    titleVi: 'Thực Hiện Dịch Vụ Kiểm Toán',
    titleEn: 'Performing Internal Audit Services',
    color: '#ea580c',
    badge: '4 Giai đoạn thực địa',
    description: 'Quy chuẩn hướng dẫn chi tiết quy trình thực hiện một cuộc kiểm toán cụ thể từ Lập kế hoạch ➔ Thực địa ➔ Báo cáo ➔ Theo dõi khắc phục.',
    principles: [
      {
        number: 13,
        domainId: 'D5',
        titleVi: 'Nguyên tắc 13: Lập Kế Hoạch Cuộc Kiểm Toán Hiệu Quả (GĐ 1)',
        titleEn: 'Principle 13: Plan Engagements Effectively',
        summary: 'Kiểm toán viên lập kế hoạch cuộc kiểm toán dựa trên sự thấu hiểu sâu sắc đối tượng kiểm toán, phạm vi và ma trận rủi ro.',
        standards: [
          {
            code: 'Standard 13.1',
            nameVi: 'Giao tiếp ban đầu và Khảo sát tiền kiểm toán',
            nameEn: 'Engagement Communication & Preliminary Survey',
            description: 'Gửi Thông báo kiểm toán chính thức cho đơn vị, thực hiện khảo sát thu thập quy trình, sơ đồ tổ chức và dữ liệu trước thực địa.',
            requirements: [
              'Gửi Thông báo kiểm toán trước ngày bắt đầu thực địa tối thiểu 05 ngày làm việc.',
              'Tổ chức phiên họp mở đầu (Opening Meeting) thống nhất nội dung.'
            ],
            smartAuditSupport: 'Mẫu thông báo và biên bản họp mở đầu chuẩn hóa tại tab Giai đoạn 1 của Cuộc kiểm toán.',
            relatedRoute: '/audit-engagements'
          },
          {
            code: 'Standard 13.2',
            nameVi: 'Đánh giá Rủi ro cuộc kiểm toán và Ma trận RCM',
            nameEn: 'Engagement Risk Assessment and RCM',
            description: 'Xác định các rủi ro trọng yếu của đối tượng kiểm toán và xây dựng Ma trận Rủi ro - Kiểm soát (RCM) chi tiết.',
            requirements: [
              'Thiết lập mối liên kết giữa rủi ro nghiệp vụ và thủ tục kiểm tra của KTV.',
              'Trưởng đoàn kiểm toán phê duyệt RCM trước khi KTV tiến hành thử nghiệm.'
            ],
            smartAuditSupport: 'Chương trình kiểm toán mẫu và AI sinh tự động RCM tại phân hệ /audit-programs.',
            relatedRoute: '/audit-programs'
          },
          {
            code: 'Standard 13.3',
            nameVi: 'Xác định Phạm vi và Chương trình kiểm toán (Audit Program)',
            nameEn: 'Engagement Scope and Work Program',
            description: 'Xác định rõ ràng những nội dung thuộc phạm vi kiểm toán và các nội dung bị loại trừ, xây dựng từng bước thủ tục kiểm tra cụ thể.',
            requirements: [
              'Xác định rõ thời kỳ kiểm toán (ví dụ: từ 01/01/2025 đến 31/12/2025).',
              'Phân công KTV phụ trách từng phân hệ (Workstream) tương ứng.'
            ],
            smartAuditSupport: 'Thiết lập phạm vi và tạo Workstream ngay trên Kanban Đoàn kiểm toán (/audit-engagements).',
            relatedRoute: '/audit-engagements'
          }
        ]
      },
      {
        number: 14,
        domainId: 'D5',
        titleVi: 'Nguyên tắc 14: Thực Hiện Công Việc Kiểm Toán & Đánh Giá Bằng Chứng (GĐ 2)',
        titleEn: 'Principle 14: Conduct Engagement Work',
        summary: 'Kiểm toán viên thu thập, phân tích, đánh giá và lưu trữ bằng chứng kiểm toán đầy đủ, tin cậy để làm cơ sở cho các phát hiện và kết luận.',
        standards: [
          {
            code: 'Standard 14.1',
            nameVi: 'Thu thập bằng chứng kiểm toán đầy đủ và tin cậy',
            nameEn: 'Gathering Information for Analyses and Evaluation',
            description: 'Bằng chứng phải thỏa mãn 4 tiêu chí quốc tế: Đầy đủ (Sufficient), Đáng tin cậy (Reliable), Phù hợp (Relevant) và Hữu ích (Useful).',
            requirements: [
              'Đính kèm trực tiếp file chứng từ scan, ảnh chụp hoặc kết xuất hệ thống vào W/P.',
              'Ghi rõ nguồn gốc dữ liệu, người cung cấp và ngày trích xuất.'
            ],
            smartAuditSupport: 'Trình soạn thảo W/P cho phép đính kèm file bằng chứng số hóa và tạo bảng kiểm tra chi tiết.',
            relatedRoute: '/working-papers'
          },
          {
            code: 'Standard 14.2',
            nameVi: 'Đánh giá các phát hiện và cấu trúc 5C',
            nameEn: 'Evaluating Findings and 5C Elements',
            description: 'Mọi sai sót phát hiện phải được phân tích cấu trúc 5C: Condition - Criteria - Cause - Consequence - Corrective Action.',
            requirements: [
              'Bắt buộc xác định nguyên nhân gốc rễ (Root Cause), không chỉ mô tả bề nổi.',
              'Kiến nghị khắc phục phải cụ thể, khả thi và gắn liền với nguyên nhân.'
            ],
            smartAuditSupport: 'Form tạo phát hiện kiểm toán chuẩn hóa 5C và gợi ý mã lỗi 3 chiều trên màn hình /audit-findings.',
            relatedRoute: '/audit-findings'
          },
          {
            code: 'Standard 14.3',
            nameVi: 'Lập và Soát xét Giấy tờ làm việc (W/P Documentation & Supervision)',
            nameEn: 'Work Documentation and Engagement Supervision',
            description: 'Giấy tờ làm việc phải rõ ràng để một KTV khác có năng lực có thể đọc và tái tạo lại được kết quả thử nghiệm.',
            requirements: [
              'Trưởng đoàn soát xét và ký duyệt điện tử từng W/P.',
              'Không được đóng cuộc kiểm toán nếu còn W/P ở trạng thái bản nháp (Draft).'
            ],
            smartAuditSupport: 'Cơ chế Stage-Gate Control khóa cứng không cho chuyển sang GĐ 3 nếu còn W/P chưa duyệt.',
            relatedRoute: '/working-papers'
          }
        ]
      },
      {
        number: 15,
        domainId: 'D5',
        titleVi: 'Nguyên tắc 15: Báo Cáo Kết Quả & Giám Sát Khắc Phục (GĐ 3 & 4)',
        titleEn: 'Principle 15: Communicate Conclusions and Monitor Actions',
        summary: 'Kiểm toán viên phát hành báo cáo kiểm toán chính xác, khách quan, kịp thời và theo dõi tiến độ khắc phục kiến nghị của đơn vị.',
        standards: [
          {
            code: 'Standard 15.1',
            nameVi: 'Trao đổi kết quả thực địa và lập Biên bản MB04',
            nameEn: 'Final Engagement Communication & MB04 Minutes',
            description: 'Tổ chức cuộc họp bế mạc thực địa (Closing Meeting) và ký biên bản MB04 với lãnh đạo đơn vị trước khi rời cơ sở.',
            requirements: [
              'Ghi nhận đầy đủ ý kiến đồng thuận hoặc bảo lưu giải trình của đơn vị.',
              'Trưởng đoàn và Giám đốc chi nhánh cùng ký xác nhận MB04.'
            ],
            smartAuditSupport: 'Hệ thống tự động sinh Biên bản MB04 từ danh sách phát hiện đã thống nhất và hỗ trợ xuất bản Word/PDF.',
            relatedRoute: '/audit-reports'
          },
          {
            code: 'Standard 15.2',
            nameVi: 'Phát hành Báo cáo Kiểm toán chính thức (Audit Report)',
            nameEn: 'Engagement Conclusions and Overall Rating',
            description: 'Báo cáo kiểm toán hoàn chỉnh có xếp hạng tổng thể hệ thống KSNB, trình Trưởng Ban KTNB ký phát hành cho BKS và HĐQT.',
            requirements: [
              'Báo cáo phát hành trong vòng 15-30 ngày làm việc sau khi kết thúc thực địa.',
              'Ngôn ngữ ngắn gọn, khách quan, mang tính xây dựng cao.'
            ],
            smartAuditSupport: 'Phân hệ Soạn thảo và Phát hành Báo cáo kiểm toán (/audit-reports) với luồng phê duyệt 3 cấp.',
            relatedRoute: '/audit-reports'
          },
          {
            code: 'Standard 15.3',
            nameVi: 'Giám sát tiến độ Khắc phục Kiến nghị (Follow-up Process)',
            nameEn: 'Confirming the Implementation of Management Actions',
            description: 'KTNB theo dõi liên tục việc thực hiện các cam kết khắc phục của đơn vị cho đến khi các rủi ro được xử lý thỏa đáng.',
            requirements: [
              'Đơn vị cập nhật bằng chứng khắc phục qua Cổng Auditee Portal.',
              'KTV hậu kiểm độc lập lại bằng chứng trước khi chính thức chấp thuận đóng kiến nghị.'
            ],
            smartAuditSupport: 'Phân hệ Quản lý Kiến nghị (/recommendations) với bộ đếm SLA, cảnh báo trễ hạn và quy trình hậu kiểm 2 cấp.',
            relatedRoute: '/recommendations'
          }
        ]
      }
    ]
  }
];
