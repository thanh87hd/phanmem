import React from 'react';
import { Card, Typography, Collapse, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;

export const KpiGuideTab: React.FC = () => {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 20 }} variant="borderless">
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <RocketOutlined style={{ marginRight: 8, color: '#ea9105' }} />
            Cẩm Nang Hướng Dẫn Đánh Giá BSC-KPI Khối Kiểm Toán Nội Bộ
          </Title>
          <Paragraph type="secondary">
            Hệ thống đánh giá BSC-KPI được xây dựng dựa trên Bản giao KPIs{' '}
            <b>MB02.HRM.2026</b> kết hợp Chuẩn mực Kiểm toán Nội bộ Quốc tế (IIA
            Standards), Thông tư 83/2025/TT-NHNN và 11 nguyên tắc lượng hóa rủi ro.
          </Paragraph>
        </Space>
      </Card>

      <Collapse defaultActiveKey={['1', '2']} style={{ background: '#fff' }}>
        <Panel
          header={<b>🎯 I. 11 NGUYÊN TẮC LƯỢNG HÓA & ĐÁNH GIÁ BSC-KPI KHỐI KTNB</b>}
          key="1"
        >
          <div style={{ lineHeight: 1.8 }}>
            <p>
              <b>1. Nguyên tắc Giao chỉ tiêu rõ ràng (SMART):</b> Mọi chỉ tiêu KPI đều
              có định lượng cụ thể, ngưỡng tối thiểu, mục tiêu phân giao và phương
              pháp đo lường minh bạch từ hệ thống.
            </p>
            <p>
              <b>2. Nguyên tắc Trọng số theo 4 trụ cột BSC:</b> Tài chính (10%), Khách
              hàng (10%), Quy trình (60%), Học hỏi & Phát triển (20%) — Đảm bảo tính cân
              bằng giữa hiệu quả hoạt động, chất lượng kiểm toán và phát triển nhân lực.
            </p>
            <p>
              <b>3. Nguyên tắc Ngưỡng chấp nhận (Threshold) vs Chỉ tiêu giao (Target):</b>{' '}
              Ngưỡng chấp nhận (thường từ 70% – 95%) là mức tối thiểu để không bị xếp
              vào nhóm 'Không đạt'. Đạt 100% mục tiêu tương ứng mức hoàn thành tốt.
            </p>
            <p>
              <b>4. Nguyên tắc Mức trần (Max Cap):</b> Điểm từng tiêu chí được giới hạn
              tại mức trần (thường là 100% – 150%) để tránh dồn điểm lệch vào một tiêu
              chí đơn lẻ.
            </p>
            <p>
              <b>5. Nguyên tắc Quy đổi Đoàn Nghiệp vụ & ĐVKD:</b> 01 đoàn kiểm toán
              Nghiệp vụ Trụ sở chính có độ phức tạp cao được tính tương đương{' '}
              <b>1.3 đoàn Đơn vị kinh doanh (ĐVKD)</b>.
            </p>
            <p>
              <b>6. Nguyên tắc Điểm chuẩn hóa năng suất theo mức độ rủi ro phát hiện:</b>{' '}
              Phát hiện rủi ro Trung bình (+1.0đ), Rủi ro Cao (+2.0đ), Rủi ro Nghiêm trọng
              / Gian lận mới (+5.0đ).
            </p>
            <p>
              <b>7. Nguyên tắc Điểm cộng thành tích thi đua:</b> Đảm nhiệm vai trò
              Trưởng đoàn (+1.0đ/đoàn), có phát hiện gian lận hoặc rủi ro nghiêm trọng
              được Ban Kiểm soát khen thưởng.
            </p>
            <p>
              <b>8. Nguyên tắc Định mức phân giao theo đặc thù từng nhóm kiểm toán:</b>{' '}
              Nhóm ĐVKD (100%), Nhóm HO (70%), Nhóm CNTT / BCTC (60%), Nhóm Tổng hợp & Báo
              cáo (80%).
            </p>
            <p>
              <b>9. Nguyên tắc Tuân thủ pháp luật & Đạo đức nghề nghiệp (IIA Code of Ethics):</b>{' '}
              Đảm bảo tính độc lập, khách quan, liêm chính, bảo mật thông tin và không có
              sai phạm kỷ luật trong kỳ.
            </p>
            <p>
              <b>10. Nguyên tắc Phát triển năng lực liên tục (CPE Hours):</b> Mỗi kiểm
              toán viên hoàn thành tối thiểu <b>40 giờ CPE/năm</b> (20h/bán niên,
              10h/quý) và vượt qua 100% bài kiểm tra nghiệp vụ.
            </p>
            <p>
              <b>11. Nguyên tắc Ràng buộc Quota ma trận xếp hạng (A1 / A2 / A3):</b> Tỷ
              lệ xếp loại Vượt trội (A1 ≤ 15%), Hoàn thành tốt (A2 ≤ 35%), Đạt yêu cầu
              (A3 ~ 50%) nhằm đảm bảo phân loại công bằng, thực chất.
            </p>
          </div>
        </Panel>

        <Panel
          header={<b>📋 II. HƯỚNG DẪN QUY TRÌNH CHẤM ĐIỂM & DUYỆT 2 CẤP (MB02.HRM.2026)</b>}
          key="2"
        >
          <div style={{ lineHeight: 1.8 }}>
            <p>
              <b>Bước 1 — Điền điểm & Tự đánh giá (Draft):</b> KTV kiểm tra kết quả
              thực tế trên hệ thống (số đoàn, WP, CPE, kết quả QAIP) và tự điền kết
              quả vào biểu mẫu MB02. Nhấn <i>'Lưu Nháp'</i>.
            </p>
            <p>
              <b>Bước 2 — Gửi duyệt (Submitted):</b> Sau khi rà soát đầy đủ, KTV nhấn{' '}
              <i>'Gửi Duyệt'</i> để chuyển bản đánh giá lên Lãnh đạo Phòng trực tiếp
              quản lý.
            </p>
            <p>
              <b>Bước 3 — Họp 1-1 & Lãnh đạo Phòng duyệt (Approved L1):</b> Lãnh đạo
              Phòng tổ chức họp 1-1 với KTV, ghi nhận ý kiến phản hồi và nhận xét của
              CBQL cấp N+1. Lãnh đạo Phòng phê duyệt Cấp 1 hoặc <i>'Trả lại'</i> nếu cần
              điều chỉnh.
            </p>
            <p>
              <b>Bước 4 — Lãnh đạo Khối duyệt chốt (Approved L2):</b> Giám đốc Khối KTNB
              (CAE) rà soát tổng thể toàn Khối, áp dụng ma trận xếp hạng (Quota
              A1/A2/A3) và phê duyệt chốt kết quả cuối kỳ.
            </p>
          </div>
        </Panel>

        <Panel
          header={<b>📊 III. GIẢI THÍCH 7 TIÊU CHÍ CHUẨN TRONG BIỂU MẪU MB02.HRM.2026</b>}
          key="3"
        >
          <div style={{ lineHeight: 1.8 }}>
            <p>
              • <b>MB02_FIN_01 (10% - TÀI CHÍNH):</b> Kiểm soát chi phí công tác, di
              chuyển và chi phí hoạt động của đoàn kiểm toán trong định mức ngân sách
              được giao.
            </p>
            <p>
              • <b>MB02_CUS_01 (10% - KHÁCH HÀNG):</b> Đo lường mức độ hài lòng từ khảo
              sát QAIP sau kiểm toán đối với tính chuyên nghiệp, văn hóa ứng xử và giá
              trị khuyến nghị.
            </p>
            <p>
              • <b>MB02_PRO_01 (24% - QUY TRÌNH):</b> Đảm bảo số lượng các cuộc kiểm
              toán hoàn thành đúng tiến độ theo kế hoạch năm phân giao (quy đổi ĐVKD &
              Nghiệp vụ).
            </p>
            <p>
              • <b>MB02_PRO_02 (24% - QUY TRÌNH):</b> Tỷ lệ Giấy tờ làm việc (Working
              Paper) hoàn thành đúng phương pháp kiểm toán và được phê duyệt đúng hạn.
            </p>
            <p>
              • <b>MB02_PRO_03 (12% - QUY TRÌNH):</b> Tỷ lệ kiến nghị kiểm toán được
              đơn vị chấp thuận, tuân thủ đúng quy định Thông tư 83/2025/TT-NHNN.
            </p>
            <p>
              • <b>MB02_LRN_01 (10% - HỌC HỎI):</b> Tỷ lệ tham gia các khóa đào tạo nội
              bộ/bên ngoài và tỷ lệ đạt bài kiểm tra nghiệp vụ sau đào tạo.
            </p>
            <p>
              • <b>MB02_LRN_02 (10% - HỌC HỎI):</b> Mức độ chấp hành Bộ quy tắc đạo đức
              nghề nghiệp KTNB và văn hóa doanh nghiệp LPBank.
            </p>
          </div>
        </Panel>

        <Panel header={<b>❓ IV. CÂU HỎI THƯỜNG GẶP (FAQ)</b>} key="4">
          <div style={{ lineHeight: 1.8 }}>
            <p>
              <b>Q: Bản đánh giá đã gửi duyệt có sửa được không?</b>
              <br />
              A: Khi ở trạng thái <i>'Đã Gửi Duyệt'</i> hoặc <i>'Đã Duyệt Cấp 1/Cấp 2'</i>
              , bản đánh giá sẽ bị khóa chỉnh sửa đối với KTV. Nếu cần sửa, Lãnh đạo
              Phòng hoặc Khối có thể bấm <i>'Trả lại'</i> kèm lý do để KTV cập nhật
              lại.
            </p>

            <p>
              <b>Q: Nhân sự thường có xem được điểm của đồng nghiệp không?</b>
              <br />
              A: Không. KTV thông thường chỉ xem được bản KPI và biểu mẫu chấm điểm MB02
              của chính mình. Chỉ Lãnh đạo Phòng (xem phòng mình) và Lãnh đạo Khối /
              Admin (xem toàn khối) mới có quyền tổng hợp.
            </p>

            <p>
              <b>Q: Điểm thi đua cuối kỳ được tính như thế nào?</b>
              <br />
              A: Điểm cuối cùng = Tổng điểm hoàn thành BSC-KPI (tối đa 100%) + Điểm
              cộng thành tích (Trưởng đoàn + Rủi ro High/Critical). Căn cứ vào điểm này
              và Quota A1/A2/A3, Ban Giám đốc Khối sẽ quyết định xếp loại thi đua.
            </p>
          </div>
        </Panel>
      </Collapse>
    </div>
  );
};
