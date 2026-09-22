const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const XLSX = require('xlsx');

const standardRcmData = [
  // 1. Cho vay Khách hàng Cá nhân (Bán lẻ)
  {
    processName: 'Cho vay Khách hàng Cá nhân',
    subProcess: 'Thẩm định hồ sơ & Nguồn thu',
    businessObjective: 'Đảm bảo thẩm định chính xác khả năng trả nợ của khách hàng cá nhân',
    riskName: 'Hồ sơ pháp lý, thu nhập hoặc giấy tờ tài sản bảo đảm bị làm giả',
    riskDescription: 'Khách hàng sử dụng giấy tờ giả (sao kê ngân hàng giả, xác nhận lương khống, sổ đỏ giả) để vay vốn vượt quá khả năng trả nợ, dẫn đến nợ xấu.',
    inherentRiskScore: 'High',
    controlName: 'Đối chiếu nguồn thu độc lập & Xác thực CCCD gắn chip',
    controlDescription: 'Yêu cầu sao kê tài khoản ngân hàng chính chủ qua mã QR/App ngân hàng, kiểm tra dữ liệu định danh VNeID, tra cứu CIC toàn diện trước khi trình phê duyệt.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'IT-Dependent Manual',
    testProcedure: 'Chọn mẫu 25 hồ sơ giải ngân trong kỳ; đối chiếu hồ sơ thu nhập với sao kê ngân hàng thực tế và báo cáo tra cứu CIC; kiểm tra tính hợp lệ của xác thực CCCD gắn chip.',
    expectedEvidence: 'Hồ sơ vay vốn, báo cáo tra cứu CIC thời điểm phê duyệt, sao kê tài khoản có xác thực điện tử, biên bản thẩm định thực tế.',
  },
  {
    processName: 'Cho vay Khách hàng Cá nhân',
    subProcess: 'Định giá Tài sản bảo đảm',
    businessObjective: 'Bảo toàn vốn vay thông qua giá trị thanh lý thực tế của TSBĐ',
    riskName: 'Định giá tài sản bảo đảm cao hơn giá trị thị trường thực tế',
    riskDescription: 'Cán bộ định giá thông đồng hoặc thiếu khảo sát thị trường dẫn đến nâng khống giá trị BĐS/phương tiện vận tải, tỷ lệ LTV thực tế vượt trần quy định.',
    inherentRiskScore: 'High',
    controlName: 'Thẩm định giá độc lập & Kiểm soát trần giá theo dữ liệu thị trường',
    controlDescription: 'Áp dụng công ty định giá độc lập hoặc hội đồng định giá độc lập tuyến 2 đối với tài sản từ 3 tỷ đồng trở lên; đối chiếu cơ sở dữ liệu giá giao dịch thực tế của LPBank.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'Manual',
    testProcedure: 'Kiểm tra chứng thư thẩm định giá, đối chiếu đơn giá định giá với bảng giá đất địa phương và giá thị trường lân cận; khảo sát hiện trạng ngẫu nhiên 5 tài sản lớn.',
    expectedEvidence: 'Chứng thư thẩm định giá, biên bản khảo sát hiện trạng có ảnh chụp và tọa độ GPS, tờ trình phê duyệt giá.',
  },
  {
    processName: 'Cho vay Khách hàng Cá nhân',
    subProcess: 'Kiểm tra sau cho vay & Quản lý nợ',
    businessObjective: 'Phát hiện sớm dấu hiệu suy giảm khả năng trả nợ và sử dụng vốn sai mục đích',
    riskName: 'Không thực hiện hoặc kiểm tra sau vay hình thức, khách hàng dùng vốn sai mục đích',
    riskDescription: 'Khách hàng vay tiêu dùng/kinh doanh nhưng chuyển tiền sang đầu cơ bất động sản, chứng khoán hoặc trả nợ ngân hàng khác mà không bị phát hiện.',
    inherentRiskScore: 'High',
    controlName: 'Hệ thống tự động cảnh báo hạn kiểm tra sau vay và đối chiếu chứng từ mục đích',
    controlDescription: 'Hệ thống Core/BPM tự động nhắc hạn kiểm tra sau vay định kỳ (30/60/90 ngày); yêu cầu tải lên hóa đơn GTGT, biên bản giao nhận và ảnh chụp phương án kinh doanh.',
    controlType: 'Detective',
    controlFrequency: 'Hàng tháng',
    controlAutomation: 'IT-Dependent Manual',
    testProcedure: 'Trích xuất danh sách các khoản vay giải ngân quá 30 ngày chưa có biên bản kiểm tra sau vay; kiểm tra tính hợp pháp, hợp lệ của hóa đơn trên trang tra cứu Tổng cục Thuế.',
    expectedEvidence: 'Biên bản kiểm tra sau vay, kết quả tra cứu hóa đơn điện tử cơ quan Thuế, ảnh chụp cơ sở kinh doanh/tài sản mua sắm.',
  },

  // 2. Cấp Tín dụng Khách hàng Doanh nghiệp
  {
    processName: 'Cấp Tín dụng Khách hàng Doanh nghiệp',
    subProcess: 'Phân tích BCTC & Dòng tiền',
    businessObjective: 'Đánh giá năng lực tài chính và phương án kinh doanh khả thi của doanh nghiệp',
    riskName: 'Báo cáo tài chính bị chỉnh sửa số liệu, doanh thu ảo, che giấu công nợ',
    riskDescription: 'Doanh nghiệp nộp BCTC nội bộ có số liệu lợi nhuận khống, che giấu các khoản nợ vay tại các TCTD khác hoặc giao dịch vòng vo với các bên liên quan.',
    inherentRiskScore: 'Critical',
    controlName: 'Đối chiếu BCTC nộp Thuế điện tử và tra cứu CIC nhóm khách hàng liên quan',
    controlDescription: 'Bắt buộc đối chiếu BCTC với tờ khai quyết toán thuế TNDN nộp qua eTax; tra cứu CIC toàn diện nhóm khách hàng liên quan và người đại diện theo pháp luật.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'Manual',
    testProcedure: 'Yêu cầu trích xuất BCTC trực tiếp từ trang eTax của doanh nghiệp; đối chiếu chỉ tiêu doanh thu, chi phí, nợ phải trả trên BCTC với hồ sơ vay và báo cáo CIC.',
    expectedEvidence: 'Báo cáo tài chính có chữ ký số/mã vạch thuế, báo cáo kiểm toán độc lập, bảng tra cứu CIC tập đoàn/nhóm liên quan.',
  },
  {
    processName: 'Cấp Tín dụng Khách hàng Doanh nghiệp',
    subProcess: 'Giải ngân & Quản lý giải ngân',
    businessObjective: 'Đảm bảo tiền vay được giải ngân đúng mục đích và điều kiện tín dụng',
    riskName: 'Giải ngân khi chưa đáp ứng đủ điều kiện tiên quyết hoặc thanh toán bên thụ hưởng không hợp pháp',
    riskDescription: 'Cán bộ tín dụng cho giải ngân khi chưa hoàn tất công chứng thế chấp, chưa mua bảo hiểm công trình, hoặc tiền vay chuyển vào tài khoản bên thụ hưởng có dấu hiệu rửa tiền/công ty ma.',
    inherentRiskScore: 'Critical',
    controlName: 'Kiểm soát phê duyệt giải ngân 4 mắt (Maker - Checker) và phong tỏa vốn vay',
    controlDescription: 'Kiểm soát viên độc lập rà soát checklist điều kiện trước giải ngân; giải ngân chuyển khoản trực tiếp cho bên bán hàng hóa/dịch vụ theo hợp đồng kinh tế.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'Automated',
    testProcedure: 'Kiểm tra 100% hồ sơ giải ngân trên 10 tỷ đồng; đối chiếu chứng từ giải ngân với điều kiện phê duyệt trên thông báo tín dụng; xác minh tính pháp lý của bên thụ hưởng.',
    expectedEvidence: 'Phiếu giải ngân, ủy nhiệm chi, hợp đồng kinh tế, biên bản nghiệm thu/hóa đơn GTGT, biên lai đăng ký giao dịch bảo đảm.',
  },

  // 3. Nghiệp vụ Kho quỹ & Quản lý tiền mặt
  {
    processName: 'Nghiệp vụ Kho quỹ & Quản lý tiền mặt',
    subProcess: 'Tồn quỹ & Điều hòa tiền mặt',
    businessObjective: 'Đảm bảo an toàn tài sản tiền mặt và tuân thủ định mức tồn quỹ',
    riskName: 'Tồn quỹ tiền mặt vượt định mức bảo hiểm kho quỹ hoặc thất thoát tiền mặt',
    riskDescription: 'Chi nhánh giữ lượng tiền mặt vượt định mức được Tổng Giám đốc phê duyệt mà không điều chuyển về Hội sở, tăng rủi ro mất an toàn kho quỹ.',
    inherentRiskScore: 'Medium',
    controlName: 'Giám sát tự động hạn mức tồn quỹ cuối ngày và kiểm kê kép (Dual Control)',
    controlDescription: 'Hệ thống Core Banking tự động cảnh báo tồn quỹ vượt trần cuối ngày; thực hiện kiểm kê quỹ hàng ngày có sự tham gia của Giám đốc, Kế toán trưởng, Thủ quỹ.',
    controlType: 'Detective',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'Automated',
    testProcedure: 'So sánh số dư tiền mặt trên sổ cái GL cuối ngày với biên bản kiểm kê quỹ và hạn mức bảo hiểm kho quỹ trong 3 tháng gần nhất.',
    expectedEvidence: 'Báo cáo số dư tiền mặt cuối ngày, biên bản kiểm kê quỹ tiền mặt, quyết định phê duyệt hạn mức tồn quỹ của Hội đồng/TGĐ.',
  },
  {
    processName: 'Nghiệp vụ Kho quỹ & Quản lý tiền mặt',
    subProcess: 'Tiếp quỹ ATM/CDM & Thu giữ tiền giả',
    businessObjective: 'Phát hiện tiền giả và đảm bảo tính chính xác khi tiếp quỹ máy ATM/CDM',
    riskName: 'Tiền giả lọt vào lưu thông hoặc chênh lệch tiền mặt khi tiếp quỹ ATM/CDM',
    riskDescription: 'Tiền mặt nạp vào ATM hoặc nhập từ khách hàng không được kiểm định kỹ, dẫn đến tiền giả lọt vào máy hoặc mất cân đối sổ sách tiếp quỹ.',
    inherentRiskScore: 'High',
    controlName: 'Sử dụng máy đếm tiền kiểm định đạt chuẩn và quy trình kiểm đếm tiếp quỹ 2 người',
    controlDescription: '100% tiền mặt nạp ATM/CDM phải qua máy đếm có chức năng soi tiền giả đã cập nhật phần mềm mới nhất; niêm phong hộp tiền có chữ ký 2 cán bộ.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'IT-Dependent Manual',
    testProcedure: 'Kiểm tra nhật ký cập nhật phần mềm nhận diện tiền giả cho ATM/CDM; kiểm tra sổ theo dõi thu giữ tiền giả và báo cáo NHNN; đối chiếu nhật ký tiếp quỹ ATM với log máy.',
    expectedEvidence: 'Sổ theo dõi thu giữ tiền giả, biên bản tiếp quỹ ATM/CDM, báo cáo xử lý chênh lệch quỹ, biên bản bảo dưỡng thiết bị kho quỹ.',
  },

  // 4. Dịch vụ Tiền gửi & Giao dịch Khách hàng tại quầy
  {
    processName: 'Dịch vụ Tiền gửi & Giao dịch Khách hàng',
    subProcess: 'Tất toán sổ tiết kiệm & Rút tiền mặt',
    businessObjective: 'Bảo vệ quyền lợi tiền gửi khách hàng và ngăn ngừa rủi ro đạo đức của giao dịch viên',
    riskName: 'Rút tiền, chuyển nhượng hoặc tất toán sổ tiết kiệm không có sự đồng thuận của khách hàng',
    riskDescription: 'Giao dịch viên hoặc kiểm soát viên lợi dụng quyền hạn thực hiện lệnh giả, ký thay khách hàng để chiếm đoạt tiền gửi tiết kiệm.',
    inherentRiskScore: 'Critical',
    controlName: 'Kiểm soát kép phê duyệt hạn mức, đối chiếu chữ ký và giám sát Camera',
    controlDescription: 'Mọi giao dịch rút tiền từ 50 triệu đồng trở lên phải có chữ ký kiểm soát viên; hệ thống tự động gửi tin nhắn SMS/OTP biến động số dư tức thời cho khách hàng.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'Automated',
    testProcedure: 'Chọn mẫu 30 giao dịch rút tiền mặt/tất toán tiết kiệm trên 200 triệu đồng; kiểm tra mẫu chữ ký trên chứng từ so với chữ ký đăng ký mẫu; trích xuất video camera tại quầy tại thời điểm ký chứng từ.',
    expectedEvidence: 'Giấy lĩnh tiền, sổ tiết kiệm có dấu đã tất toán, video camera quầy giao dịch, log gửi tin nhắn SMS thông báo số dư.',
  },
  {
    processName: 'Dịch vụ Tiền gửi & Giao dịch Khách hàng',
    subProcess: 'Mở tài khoản thanh toán & Định danh khách hàng',
    businessObjective: 'Tuân thủ quy định KYC/eKYC và phòng ngừa tài khoản rác/tài khoản lừa đảo',
    riskName: 'Mở tài khoản thanh toán bằng giấy tờ tùy thân giả mạo hoặc không tuân thủ sinh trắc học',
    riskDescription: 'Kẻ gian sử dụng CMND/CCCD giả mạo để mở tài khoản phục vụ mục đích lừa đảo, chuyển tiền đánh bạc qua mạng mà không bị phát hiện.',
    inherentRiskScore: 'High',
    controlName: 'Xác thực sinh trắc học khuôn mặt và dữ liệu căn cước công dân gắn chip',
    controlDescription: 'Bắt buộc đối chiếu sinh trắc học (NFC chip CCCD và quét khuôn mặt FaceMatch) theo Quyết định 2345/QĐ-NHNN trước khi kích hoạt giao dịch trực tuyến.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'Automated',
    testProcedure: 'Trích xuất log các tài khoản mở mới có tỷ lệ khớp sinh trắc học dưới ngưỡng cảnh báo; rà soát hồ sơ mở tài khoản cho tổ chức/doanh nghiệp mới thành lập dưới 3 tháng.',
    expectedEvidence: 'Hồ sơ mở tài khoản, log dữ liệu sinh trắc học hệ thống Core/eKYC, kết quả tra cứu cơ sở dữ liệu quốc gia về dân cư.',
  },

  // 5. Công nghệ Thông tin & An ninh An toàn Thông tin
  {
    processName: 'Công nghệ Thông tin & An ninh Thông tin',
    subProcess: 'Quản lý Người dùng Đặc quyền (PAM)',
    businessObjective: 'Bảo vệ cơ sở dữ liệu Core Banking khỏi các hành vi can thiệp trái phép',
    riskName: 'Can thiệp trực tiếp vào Database sản xuất ngoài giờ làm việc không có phê duyệt',
    riskDescription: 'Quản trị viên hệ thống (DBA, DevOps) sử dụng quyền đặc quyền để sửa đổi số dư, tài khoản hoặc dữ liệu giao dịch trên database mà không qua ứng dụng.',
    inherentRiskScore: 'Critical',
    controlName: 'Quản lý phiên truy cập đặc quyền (PAM) và giám sát câu lệnh SQL (DAM)',
    controlDescription: '100% truy cập vào database sản xuất phải thông qua hệ thống PAM có ghi lại video phiên làm việc (Session Recording); cảnh báo tức thì các lệnh UPDATE/DELETE trực tiếp.',
    controlType: 'Preventive',
    controlFrequency: 'Liên tục',
    controlAutomation: 'Automated',
    testProcedure: 'Trích xuất log audit trail của cơ sở dữ liệu Core Banking; đối chiếu tất cả các câu lệnh DDL/DML can thiệp trực tiếp vào DB trong kỳ kiểm toán với danh sách phiếu Change Ticket được duyệt.',
    expectedEvidence: 'Log hệ thống PAM, phiếu yêu cầu thay đổi (CR) được Hội đồng CAB duyệt, báo cáo rà soát định kỳ của CISO.',
  },
  {
    processName: 'Công nghệ Thông tin & An ninh Thông tin',
    subProcess: 'Quản trị Vòng đời Tài khoản (IAM)',
    businessObjective: 'Đảm bảo chỉ người dùng đang công tác mới có quyền truy cập hệ thống ngân hàng',
    riskName: 'Không thu hồi tài khoản của nhân viên đã nghỉ việc hoặc chuyển đổi vị trí công tác',
    riskDescription: 'Nhân viên đã nghỉ việc vẫn còn tài khoản hoạt động trên Active Directory, Core Banking, VPN hoặc Email, tạo lỗ hổng cho rò rỉ dữ liệu khách hàng.',
    inherentRiskScore: 'High',
    controlName: 'Tự động đồng bộ trạng thái nhân sự từ phần mềm HRM sang IAM và Active Directory',
    controlDescription: 'Khi phòng Nhân sự cập nhật ngày thôi việc trên HRM, hệ thống IAM tự động khóa tài khoản AD và thu hồi toàn bộ quyền truy cập ứng dụng trong vòng 2 giờ.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'Automated',
    testProcedure: 'Lấy danh sách 100% nhân viên thôi việc trong 6 tháng qua từ Khối Nhân sự; đối chiếu thời điểm thôi việc với thời điểm disable tài khoản trên AD, Core Banking và VPN.',
    expectedEvidence: 'Danh sách nhân sự thôi việc, log thu hồi tài khoản trên Active Directory và hệ thống IAM, báo cáo rà soát tài khoản định kỳ.',
  },
  {
    processName: 'Công nghệ Thông tin & An ninh Thông tin',
    subProcess: 'Sao lưu Dữ liệu & Diễn tập Thảm họa (DRP)',
    businessObjective: 'Đảm bảo tính liên tục của hoạt động ngân hàng khi xảy ra sự cố thiên tai/hỏng hóc',
    riskName: 'Bản sao lưu dữ liệu bị lỗi, không thể phục hồi hoặc không đạt mục tiêu RTO/RPO',
    riskDescription: 'Hệ thống Core Banking gặp sự cố nhưng bản sao lưu dữ liệu bị hỏng, hoặc thời gian chuyển đổi sang trung tâm dữ liệu dự phòng vượt quá thời gian cam kết.',
    inherentRiskScore: 'High',
    controlName: 'Sao lưu tự động hàng ngày theo mô hình 3-2-1 và diễn tập khôi phục định kỳ',
    controlDescription: 'Thực hiện sao lưu Full hàng tuần và Incremental hàng ngày, lưu trữ bản sao ngoài trung tâm (Offsite); diễn tập chuyển đổi hoạt động sang DC dự phòng tối thiểu 1 lần/năm.',
    controlType: 'Detective',
    controlFrequency: 'Hàng năm',
    controlAutomation: 'IT-Dependent Manual',
    testProcedure: 'Kiểm tra nhật ký sao lưu tự động và biên bản thử nghiệm phục hồi bản backup gần nhất; đánh giá kết quả diễn tập chuyển đổi thảm họa (Disaster Recovery Drill) gần nhất.',
    expectedEvidence: 'Báo cáo kết quả diễn tập DRP, log sao lưu cơ sở dữ liệu hàng ngày, biên bản nghiệm thu chuyển đổi hệ thống trung tâm dữ liệu thứ 2.',
  },

  // 6. Phòng chống Rửa tiền & Tài trợ Khủng bố (AML/CFT)
  {
    processName: 'Phòng chống Rửa tiền & Tuân thủ (AML/CFT)',
    subProcess: 'Sàng lọc Danh sách Đen & Danh sách Trừng phạt',
    businessObjective: 'Ngăn chặn các giao dịch liên quan đến rửa tiền, tài trợ khủng bố và cấm vận',
    riskName: 'Bỏ sót khách hàng thuộc Danh sách Đen (Blacklist), Sanctions List hoặc PEP',
    riskDescription: 'Hệ thống không cập nhật danh sách cảnh báo hoặc cán bộ bỏ qua cảnh báo trùng khớp, dẫn đến thực hiện giao dịch cho đối tượng bị trừng phạt quốc tế.',
    inherentRiskScore: 'Critical',
    controlName: 'Sàng lọc tự động (Sanction Screening) thời gian thực và cập nhật dữ liệu hàng ngày',
    controlDescription: 'Tất cả khách hàng mở mới và các giao dịch chuyển tiền quốc tế/trong nước phải được lọc tự động qua cơ sở dữ liệu cảnh báo; tự động chặn giao dịch khi độ trùng khớp trên 85%.',
    controlType: 'Preventive',
    controlFrequency: 'Liên tục',
    controlAutomation: 'Automated',
    testProcedure: 'Kiểm tra phiên bản dữ liệu Sanctions/PEP đang vận hành trên hệ thống AML; thực hiện test case giả lập thông tin cá nhân trong Blacklist để kiểm tra phản ứng của hệ thống; rà soát hồ sơ giải trình False Positive.',
    expectedEvidence: 'Báo cáo cấu hình hệ thống AML, biên bản cập nhật dữ liệu Sanctions hàng ngày, hồ sơ thẩm tra các giao dịch bị chặn.',
  },
  {
    processName: 'Phòng chống Rửa tiền & Tuân thủ (AML/CFT)',
    subProcess: 'Báo cáo Giao dịch Giá trị lớn (CTR) & Giao dịch Đáng ngờ (STR)',
    businessObjective: 'Tuân thủ nghĩa vụ báo cáo phòng chống rửa tiền theo Luật PCRT và quy định của NHNN',
    riskName: 'Báo cáo chậm trễ hoặc bỏ sót giao dịch có giá trị lớn và giao dịch đáng ngờ',
    riskDescription: 'Các giao dịch tiền mặt từ 400 triệu đồng trở lên hoặc giao dịch có dấu hiệu bất thường không được báo cáo cho Cục Phòng chống Rửa tiền - NHNN theo luật định.',
    inherentRiskScore: 'High',
    controlName: 'Tự động trích xuất báo cáo CTR và kịch bản giám sát giao dịch bất thường',
    controlDescription: 'Hệ thống AML tự động tổng hợp dữ liệu giao dịch tiền mặt đủ ngưỡng để gửi báo cáo CTR; các kịch bản hành vi bất thường tự động phát sinh cảnh báo cho chuyên viên Compliance xử lý trong 48 giờ.',
    controlType: 'Detective',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'Automated',
    testProcedure: 'Trích xuất toàn bộ giao dịch tiền mặt từ 400 triệu đồng trong 3 tháng; đối chiếu với danh sách các giao dịch đã nộp cho NHNN; kiểm tra thời hạn gửi báo cáo STR của các case đã phân tích.',
    expectedEvidence: 'Báo cáo CTR/STR nộp NHNN, thông báo tiếp nhận điện tử của Cục PCRT, hồ sơ phân tích giao dịch đáng ngờ nội bộ.',
  },

  // 7. Quản trị Kế toán & Báo cáo Thống kê Tài chính
  {
    processName: 'Quản trị Kế toán & Báo cáo Tài chính',
    subProcess: 'Phân loại Nợ & Trích lập Dự phòng Rủi ro',
    businessObjective: 'Phản ánh trung thực chất lượng tín dụng và lợi nhuận của ngân hàng',
    riskName: 'Phân loại sai nhóm nợ hoặc trích lập thiếu dự phòng rủi ro tín dụng',
    riskDescription: 'Chi nhánh hoặc cán bộ điều chỉnh nhóm nợ thủ công để giảm chi phí trích lập dự phòng theo Thông tư 11/2021/TT-NHNN nhằm đạt chỉ tiêu KPI.',
    inherentRiskScore: 'Critical',
    controlName: 'Phân loại nợ tự động theo tiêu chí định lượng và kết quả tra cứu CIC định kỳ',
    controlDescription: 'Hệ thống tự động nhảy nhóm nợ theo số ngày quá hạn và đồng bộ nhóm nợ cao nhất trên toàn hệ thống TCTD theo dữ liệu CIC hàng tháng; Kế toán trưởng phê duyệt trích lập.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng tháng',
    controlAutomation: 'Automated',
    testProcedure: 'Chạy lại công thức trích lập dự phòng cụ thể và chung độc lập trên toàn bộ danh mục cho vay cuối quý; đối chiếu nhóm nợ ngân hàng với nhóm nợ trên CIC của 50 khách hàng có dư nợ lớn nhất.',
    expectedEvidence: 'Bảng tính trích lập dự phòng rủi ro tín dụng, báo cáo đối chiếu CIC định kỳ, chứng từ hạch toán chi phí dự phòng.',
  },
  {
    processName: 'Quản trị Kế toán & Báo cáo Tài chính',
    subProcess: 'Quản lý Chi phí Hoạt động & Mua sắm Tài sản',
    businessObjective: 'Đảm bảo chi phí được phê duyệt đúng thẩm quyền và hạch toán đúng kỳ kế toán',
    riskName: 'Hạch toán chi phí không có đầy đủ hóa đơn hợp lệ hoặc chi vượt hạn mức ngân sách',
    riskDescription: 'Thanh toán chi phí sửa chữa, tiếp khách, mua sắm không có hóa đơn điện tử hợp pháp hoặc vượt ngân sách phân bổ nhưng không qua phê duyệt bổ sung.',
    inherentRiskScore: 'Medium',
    controlName: 'Kiểm soát hạn mức ngân sách tự động trên ERP và kiểm tra hóa đơn điện tử',
    controlDescription: 'Hệ thống tự động chặn lệnh thanh toán khi chi phí vượt hạn mức ngân sách được duyệt; kế toán thanh toán kiểm tra mã tra cứu hóa đơn trên cổng cơ quan Thuế.',
    controlType: 'Preventive',
    controlFrequency: 'Hàng ngày',
    controlAutomation: 'IT-Dependent Manual',
    testProcedure: 'Chọn mẫu 20 món thanh toán chi phí lớn trong kỳ; kiểm tra tờ trình phê duyệt thẩm quyền, hợp đồng, biên bản nghiệm thu và tra cứu tính hợp lệ của hóa đơn VAT trên cổng Thuế.',
    expectedEvidence: 'Hóa đơn điện tử có mã cơ quan Thuế, tờ trình phê duyệt chi, hợp đồng kinh tế, phiếu chi/ủy nhiệm chi.',
  }
];

async function seedRcm(dbConfig) {
  console.log(`Connecting to database ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`);
  const client = new Client(dbConfig);
  await client.connect();

  try {
    // 1. Ensure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS risk_control_matrix (
        id SERIAL PRIMARY KEY,
        "processId" INT,
        "processName" VARCHAR(200),
        "subProcess" VARCHAR(200),
        "businessObjective" TEXT,
        "riskName" VARCHAR(255) NOT NULL,
        "riskDescription" TEXT,
        "inherentRiskScore" VARCHAR(50),
        "controlName" VARCHAR(255) NOT NULL,
        "controlDescription" TEXT,
        "controlType" VARCHAR(50),
        "controlFrequency" VARCHAR(50),
        "controlAutomation" VARCHAR(50),
        "testProcedure" TEXT,
        "expectedEvidence" TEXT,
        "ownerDepartmentId" INT,
        "ownerTeam" VARCHAR(100),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Clear old demo data or insert
    const countRes = await client.query('SELECT COUNT(*) FROM risk_control_matrix');
    console.log(`Current RCM records in DB: ${countRes.rows[0].count}`);

    let inserted = 0;
    for (const rcm of standardRcmData) {
      // Check if duplicate riskName already exists
      const exist = await client.query('SELECT id FROM risk_control_matrix WHERE "riskName" = $1', [rcm.riskName]);
      if (exist.rows.length === 0) {
        await client.query(`
          INSERT INTO risk_control_matrix (
            "processName", "subProcess", "businessObjective",
            "riskName", "riskDescription", "inherentRiskScore",
            "controlName", "controlDescription", "controlType",
            "controlFrequency", "controlAutomation", "testProcedure",
            "expectedEvidence", "ownerTeam", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'KTNB_HoiSo', NOW(), NOW()
          )
        `, [
          rcm.processName,
          rcm.subProcess,
          rcm.businessObjective,
          rcm.riskName,
          rcm.riskDescription,
          rcm.inherentRiskScore,
          rcm.controlName,
          rcm.controlDescription,
          rcm.controlType,
          rcm.controlFrequency,
          rcm.controlAutomation,
          rcm.testProcedure,
          rcm.expectedEvidence
        ]);
        inserted++;
      }
    }
    console.log(`✅ Successfully seeded ${inserted} new standard RCM entries!`);
  } catch (err) {
    console.error('Error seeding RCM:', err);
  } finally {
    await client.end();
  }
}

function generateExcelTemplate() {
  const excelRows = standardRcmData.map(item => ({
    'Tên quy trình': item.processName,
    'Quy trình con': item.subProcess,
    'Mục tiêu kinh doanh': item.businessObjective,
    'Tên rủi ro': item.riskName,
    'Mô tả rủi ro': item.riskDescription,
    'Mức độ rủi ro': item.inherentRiskScore === 'Critical' ? 'Nghiêm trọng' : (item.inherentRiskScore === 'High' ? 'Cao' : (item.inherentRiskScore === 'Medium' ? 'Trung bình' : 'Thấp')),
    'Tên chốt kiểm soát': item.controlName,
    'Mô tả chốt kiểm soát': item.controlDescription,
    'Loại kiểm soát': item.controlType === 'Preventive' ? 'Phòng ngừa' : 'Phát hiện',
    'Tần suất': item.controlFrequency,
    'Mức độ tự động': item.controlAutomation === 'Automated' ? 'Tự động' : (item.controlAutomation === 'Manual' ? 'Thủ công' : 'Bán tự động'),
    'Thủ tục kiểm toán': item.testProcedure,
    'Bằng chứng mong đợi': item.expectedEvidence,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  // Set column widths
  worksheet['!cols'] = [
    { wch: 28 }, // Tên quy trình
    { wch: 28 }, // Quy trình con
    { wch: 35 }, // Mục tiêu
    { wch: 35 }, // Tên rủi ro
    { wch: 45 }, // Mô tả rủi ro
    { wch: 18 }, // Mức độ rủi ro
    { wch: 35 }, // Tên chốt
    { wch: 45 }, // Mô tả chốt
    { wch: 18 }, // Loại kiểm soát
    { wch: 15 }, // Tần suất
    { wch: 18 }, // Mức độ tự động
    { wch: 45 }, // Thủ tục kiểm toán
    { wch: 40 }, // Bằng chứng
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Standard_RCM_LPBank');

  const publicDir = path.resolve(__dirname, '../../frontend/public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const filePath = path.join(publicDir, 'Bo_RCM_Chuan_LPBank.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log(`✅ Generated Excel file: ${filePath}`);
}

async function main() {
  generateExcelTemplate();

  // Local database config
  const localConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'ktnb_db',
  };

  await seedRcm(localConfig);
}

if (require.main === module) {
  main();
}

module.exports = { standardRcmData, seedRcm };
