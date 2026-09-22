/**
 * Quy chuẩn ngân hàng và heuristics phân tích rủi ro / 5-Whys cho Phát hiện kiểm toán (Finding)
 */

export interface FindingHeuristicsResult {
  extraConsequence: string;
  extraCause: string;
  extraRca: string;
  extraRecommendation: string;
  crossCheckAlert: { title: string; message: string } | null;
}

export function analyzeBankingFindingHeuristics(
  condition: string,
  suggestedRecommendationFallback?: string,
): FindingHeuristicsResult {
  const desc = condition.toLowerCase();

  if (
    desc.includes('thẩm định') ||
    desc.includes('tín dụng') ||
    desc.includes('phê duyệt') ||
    desc.includes('giải ngân') ||
    desc.includes('tài sản') ||
    desc.includes('thế chấp')
  ) {
    return {
      extraConsequence:
        'Có nguy cơ thất thoát tài sản, phát sinh nợ xấu, tổn thất tài chính cho ngân hàng do tài sản bảo đảm bị định giá sai lệch hoặc không có thực; đồng thời vi phạm nghiêm trọng Quy chế cấp tín dụng của LPBank và Khoản 2 Điều 14 Thông tư 13/2018/TT-NHNN, có thể bị cơ quan thanh tra giám sát NHNN xử lý vi phạm hành chính.',
      extraCause:
        'Cán bộ tín dụng chạy theo chỉ tiêu kinh doanh, chủ quan bỏ qua các quy trình kiểm tra thực tế tài sản. Ban lãnh đạo đơn vị chưa giám sát chặt chẽ hoạt động thẩm định, thiếu chốt kiểm soát chéo tự động trên hệ thống khởi tạo khoản vay.',
      extraRca:
        '1. Tại sao xảy ra lỗi? Cán bộ tín dụng không đi thẩm định thực tế tài sản bảo đảm.\n' +
        '2. Tại sao cán bộ không đi thẩm định? Do áp lực hoàn thành chỉ tiêu tăng trưởng dư nợ cuối quý rất lớn.\n' +
        '3. Tại sao áp lực chỉ tiêu lại dẫn đến bỏ qua quy trình? Do quy trình hiện tại cho phép cán bộ tự chịu trách nhiệm mà không bắt buộc tải lên hình ảnh định vị GPS thực tế.\n' +
        '4. Tại sao không có GPS? Hệ thống khởi tạo khoản vay chưa tích hợp định vị thực địa tự động.\n' +
        '5. Tại sao chưa tích hợp? Chưa có yêu cầu nghiệp vụ kiểm soát chéo tự động từ phía Khối Quản trị Rủi ro.',
      extraRecommendation:
        '1. Yêu cầu chi nhánh chấn chỉnh ngay lập tức công tác thẩm định thực tế, tiến hành tái thẩm định toàn bộ tài sản bảo đảm của khoản vay.\n' +
        '2. Ban hành văn bản kiểm điểm trách nhiệm cá nhân cán bộ tín dụng và cấp phê duyệt liên quan.\n' +
        '3. Đề xuất Khối Công nghệ tích hợp tính năng check-in GPS thực địa bắt buộc trên ứng dụng khởi tạo khoản vay để ngăn ngừa việc lập hồ sơ khống.',
      crossCheckAlert: {
        title: 'Cảnh báo đối chiếu (Cross-check)',
        message:
          'Sai phạm này rất giống với lỗi thường gặp: "Bỏ qua thẩm định thực tế tài sản bảo đảm". Bạn có muốn áp dụng Khuyến nghị chuẩn cho lỗi này không?',
      },
    };
  }

  if (
    desc.includes('downtime') ||
    desc.includes('sự cố') ||
    desc.includes('hệ thống') ||
    desc.includes('core') ||
    desc.includes('banking') ||
    desc.includes('chuyển tiền') ||
    desc.includes('lỗi')
  ) {
    return {
      extraConsequence:
        'Gián đoạn dịch vụ thanh toán trực tuyến, gây bức xúc cho khách hàng, suy giảm uy tín thương hiệu của LPBank; tiềm ẩn nguy cơ đền bù thiệt hại tài chính cho đối tác và vi phạm quy định về bảo đảm tính liên tục trong hoạt động tại Khoản 1 Điều 23 Thông tư 13/2018/TT-NHNN.',
      extraCause:
        'Thiết bị phần cứng Core Banking bị quá tải đột biến do lượng giao dịch tăng cao vào giờ cao điểm, trong khi hệ thống sao lưu dự phòng (DRS) chưa tự động kích hoạt failover kịp thời. Quy trình diễn tập khôi phục thảm họa chưa được thực hiện định kỳ để phát hiện nghẽn mạng.',
      extraRca:
        '1. Tại sao hệ thống gián đoạn? Do cơ sở dữ liệu Core Banking bị treo.\n' +
        '2. Tại sao CSDL bị treo? Do số lượng truy vấn đồng thời vượt ngưỡng chịu tải của máy chủ chính.\n' +
        '3. Tại sao máy chủ phụ không tự động gánh tải? Do cấu hình failover tự động bị lỗi đồng bộ dữ liệu thời gian thực.\n' +
        '4. Tại sao cấu hình failover bị lỗi đồng bộ? Do băng thông đường truyền backup giữa 2 trung tâm dữ liệu bị bóp nghẹt.\n' +
        '5. Tại sao băng thông bị nghẽn mà không phát hiện trước? Thiếu hệ thống giám sát và cảnh báo sớm dung lượng băng thông kết nối WAN.',
      extraRecommendation:
        '1. Nâng cấp dung lượng máy chủ Core Banking và mở rộng băng thông kết nối giữa Trung tâm dữ liệu chính và dự phòng.\n' +
        '2. Cấu hình và kiểm thử lại cơ chế failover tự động giữa DC và DR định kỳ hàng tháng.\n' +
        '3. Ban hành quy trình kiểm soát tải hệ thống (Load Testing) trước khi triển khai các phiên bản nâng cấp hoặc chiến dịch khuyến mãi lớn.',
      crossCheckAlert: {
        title: 'Cảnh báo đối chiếu (Cross-check)',
        message:
          'Sự cố này tương đồng với sự cố quá tải Core Banking tháng trước. Áp dụng Khuyến nghị và RCA tương ứng?',
      },
    };
  }

  return {
    extraConsequence:
      'Tiềm ẩn nguy cơ thất thoát tài sản, phát sinh các sai phạm lũy kế qua nhiều thời kỳ nếu không có hành động chấn chỉnh kịp thời; không tuân thủ nghiêm ngặt quy chế kiểm soát nội bộ và quy trình nghiệp vụ tiêu chuẩn của LPBank.',
    extraCause:
      'Tính tuân thủ quy trình của cán bộ vận hành chưa cao; thiếu cơ chế kiểm tra chéo và đối chiếu thường xuyên giữa các bộ phận; công tác tự kiểm tra (Line 1) tại đơn vị còn mang tính hình thức, chưa đi sâu vào bản chất rủi ro.',
    extraRca:
      '1. Tại sao phát sinh lỗi? Cán bộ thực hiện sai hướng dẫn nghiệp vụ.\n' +
      '2. Tại sao cán bộ thực hiện sai? Do hướng dẫn nghiệp vụ quá phức tạp và chưa được cập nhật theo quy định mới.\n' +
      '3. Tại sao chưa cập nhật? Thiếu nhân sự đầu mối chuyên trách rà soát hệ thống văn bản nội bộ.\n' +
      '4. Tại sao thiếu đầu mối chuyên trách? Do cơ cấu tổ chức phòng ban chưa phân định rõ chức năng này.\n' +
      '5. Tại sao chưa phân định rõ? Do khẩu vị rủi ro và khung quản trị quy trình chưa được chuẩn hóa ở cấp Khối.',
    extraRecommendation:
      suggestedRecommendationFallback ||
      '1. Khẩn trương rà soát, đơn giản hóa và cập nhật lại Hướng dẫn nghiệp vụ chi tiết cho cán bộ thực hiện.\n' +
      '2. Tổ chức đào tạo lại quy trình chuẩn cho toàn bộ nhân sự liên quan.\n' +
      '3. Thiết lập cơ chế kiểm tra, đối chiếu định kỳ hàng tuần giữa bộ phận Nghiệp vụ và bộ phận Kiểm soát để phát hiện sớm các sai lệch.',
    crossCheckAlert: null,
  };
}
