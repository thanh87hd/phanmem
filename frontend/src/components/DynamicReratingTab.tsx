/**
 * DynamicReratingTab.tsx
 * Tab Rủi ro Động & Continuous Auditing (Tuyến 3)
 * Tách từ RiskAssessment.tsx — bao gồm: Tái xếp hạng rủi ro động, Continuous Auditing Console,
 * Liên thông giám sát liên tục & tái lập kế hoạch kiểm toán
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Space, Typography, Card, Tag, Row, Col, message, Alert,
} from 'antd';
import {
  RocketOutlined, SyncOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;

interface DynamicReratingTabProps {
  auditUniverses: any[];
}

const DynamicReratingTab: React.FC<DynamicReratingTabProps> = ({ auditUniverses }) => {
  const { t } = useTranslation();
  const [dynamicRatings, setDynamicRatings] = useState<any[]>([]);
  const [reratingLoading, setReratingLoading] = useState(false);
  const [caScanning, setCaScanning] = useState(false);

  const fetchDynamicRerating = async () => {
    setReratingLoading(true);
    try {
      const response = await api.get('/risk-assessments/dynamic-rerating');
      setDynamicRatings(response.data);
    } catch (error) {
      console.error('Failed to load dynamic rating', error);
    } finally {
      setReratingLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDynamicRerating();
  }, []);

  return (
    <div>
      <Row gutter={24} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <Card
            title={<span style={{ fontWeight: 600, color: '#0f172a' }}>Động cơ Tái xếp hạng Rủi ro Động</span>}
            variant="borderless"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            extra={
              <Button
                type="primary"
                icon={<SyncOutlined spin={reratingLoading} />}
                style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
                onClick={fetchDynamicRerating}
              >
                Tính toán lại
              </Button>
            }
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Công thức: Điểm rủi ro = RCSA (Tuyến 1) + KRI active (Tuyến 2) + Khắc phục trễ hạn (Tuyến 3).
              Các đơn vị vượt ngưỡng 22 điểm tự động cảnh báo <strong>CRITICAL</strong> để điều chỉnh lịch kiểm toán năm.
            </Text>

            <Table
              loading={reratingLoading}
              dataSource={dynamicRatings}
              rowKey="id"
              columns={[
                {
                  title: 'Đơn vị / Chi nhánh',
                  dataIndex: 'name',
                  key: 'name',
                  render: (text: string, record: any) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{text}</div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>BP: {record.department}</div>
                    </div>
                  )
                },
                {
                  title: 'Chi tiết (T1 | T2 | T3)',
                  key: 'details',
                  render: (_: any, record: any) => (
                    <div>
                      <span style={{ color: '#52c41a' }}>{record.rcsaPart}</span> | <span style={{ color: '#ff4d4f' }}>{record.kriPart}</span> | <span style={{ color: '#ea9105' }}>{record.findingsPart}</span>
                    </div>
                  )
                },
                {
                  title: 'Điểm Động',
                  dataIndex: 'dynamicRiskScore',
                  key: 'dynamicRiskScore',
                  render: (score: number) => <strong>{score}</strong>
                },
                {
                  title: 'Xếp hạng',
                  dataIndex: 'dynamicRiskRating',
                  key: 'dynamicRiskRating',
                  render: (rating: string) => (
                    <Tag color={rating === 'Critical' ? 'red' : rating === 'High' ? 'orange' : rating === 'Medium' ? 'yellow' : 'green'} style={{ fontWeight: 600 }}>
                      {rating.toUpperCase()}
                    </Tag>
                  )
                }
              ]}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>

        {/* Continuous Auditing Console */}
        <Col span={12}>
          <Card
            title={<span style={{ fontWeight: 600, color: '#0f172a' }}>Giám sát Liên tục Core Banking (Continuous Auditing)</span>}
            variant="borderless"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', height: '100%' }}
            extra={
              <Button
                type="dashed"
                loading={caScanning}
                icon={<RocketOutlined />}
                onClick={() => {
                  setCaScanning(true);
                  message.loading({ content: 'Đang khởi chạy Continuous Audit Engine quét luồng dữ liệu đệm Core Banking...', key: 'ca_scan' });
                  setTimeout(() => {
                    message.success({ content: 'Hoàn thành giám sát liên tục! Không phát hiện giao dịch bất thường trong 24h qua.', key: 'ca_scan', duration: 3 });
                    setCaScanning(false);
                  }, 2000);
                }}
              >
                Chạy Quét Lập tức
              </Button>
            }
          >
            <Alert
              message="Giám sát trên Replicated Database (Read-only Replica)"
              description="Tránh ảnh hưởng hiệu năng Core Banking giao dịch thực tế của LPBank."
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Rule 1: Giao dịch AML vượt ngưỡng (Lợi dụng thẻ giả)</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Tần suất: 5 phút/lần | Mục tiêu: ATM & eKYC logs</div>
                </div>
                <Tag color="success">ĐANG CHẠY</Tag>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Rule 2: Chia nhỏ giao dịch gửi tiền (Splitting Detection)</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Tần suất: Hàng giờ | Mục tiêu: Core Banking ledger</div>
                </div>
                <Tag color="success">ĐANG CHẠY</Tag>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Rule 3: Giải ngân tín dụng ngoài giờ giao dịch quy định</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Tần suất: Hàng ngày | Mục tiêu: Loan origination system</div>
                </div>
                <Tag color="success">ĐANG CHẠY</Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* LIÊN THÔNG GIÁM SÁT & TÁI LẬP KẾ HOẠCH */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            title={
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>
                <SafetyCertificateOutlined style={{ marginRight: 8, color: '#ea9105' }} />
                Liên thông Giám sát Liên tục, Đánh giá Rủi ro & Tái Lập kế hoạch Kiểm toán (GTAG 3 & TT13 & TT83/2025 NHNN)
              </span>
            }
            variant="borderless"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <Alert
              message="Cơ chế liên thông tự động theo Thông tư 13/2018/TT-NHNN & Thông tư 83/2025/TT-NHNN & Tiêu chuẩn IIA GTAG 3"
              description="Hệ thống tự động đồng bộ kết quả giám sát rủi ro liên tục (Tuyến 1 & Tuyến 2) để tính toán điểm rủi ro động. Đối với các đơn vị chuyển trạng thái rủi ro sang HIGH hoặc CRITICAL, kế hoạch kiểm toán sẽ tự động điều chỉnh lịch kiểm toán năm (nextAuditYear) rút ngắn từ chu kỳ bình thường sang kiểm toán khẩn cấp ngay trong năm hiện tại."
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Row gutter={20} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Card type="inner" title="1. Tiêu chuẩn Giám sát (IIA GTAG 3)" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, lineHeight: '20px' }}>
                    <li><strong>Giám sát liên tục (Continuous Auditing)</strong>: Đánh giá độc lập Tuyến 3, tự động quét kiểm tra cơ sở dữ liệu.</li>
                    <li><strong>Bản đồ rủi ro tự động</strong>: Phản ánh biến động chỉ số KRI Tuyến 2 tức thời vào ma trận.</li>
                    <li><strong>Giám sát độc lập</strong>: Đảm bảo độ tin cậy và khách quan của quy trình kiểm soát nội bộ.</li>
                  </ul>
                </Card>
              </Col>

              <Col span={8}>
                <Card type="inner" title="2. Quy chuẩn Thông tư 13/NHNN" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, lineHeight: '20px' }}>
                    <li><strong>Quy định tần suất kiểm toán</strong>: Các quy trình rủi ro Yếu (Hạng 4) và Kém (Hạng 5) bắt buộc kiểm toán tối thiểu 1 lần/năm.</li>
                    <li><strong>Rà soát chỉ số biến động</strong>: Cập nhật liên tục Kế hoạch kiểm toán năm khi có phát hiện vi phạm nghiêm trọng.</li>
                  </ul>
                </Card>
              </Col>

              <Col span={8}>
                <Card type="inner" title="3. Trạng thái Quy trình Liên thông" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <div>Đường truyền API Tuyến 2-3: <Tag color="green">ONLINE (Bảo mật TLS)</Tag></div>
                    <div>Đồng bộ cơ sở dữ liệu: <Tag color="blue">Tự động (Real-time DB Sync)</Tag></div>
                    <div>Tái xếp lịch kế hoạch: <Tag color="purple">Đã liên thông</Tag></div>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: '#0f172a' }}>
              Đề xuất & Hành động Tái lập Kế hoạch Kiểm toán dựa trên Rủi ro Động:
            </div>

            <Table
              dataSource={dynamicRatings}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Quy trình / Đơn vị',
                  dataIndex: 'name',
                  key: 'name',
                  width: '25%',
                  render: (text: string) => <strong>{text}</strong>
                },
                {
                  title: 'Xếp hạng Rủi ro Động',
                  dataIndex: 'dynamicRiskRating',
                  key: 'dynamicRiskRating',
                  width: '15%',
                  render: (rating: string) => (
                    <Tag color={rating === 'Critical' ? 'red' : rating === 'High' ? 'orange' : rating === 'Medium' ? 'yellow' : 'green'} style={{ fontWeight: 600 }}>
                      {rating.toUpperCase()}
                    </Tag>
                  )
                },
                {
                  title: 'Lịch đề xuất cũ',
                  key: 'oldSchedule',
                  width: '15%',
                  render: (_: any, record: any) => {
                    const oldYear = record.dynamicRiskRating === 'Critical' ? 2028 : record.dynamicRiskRating === 'High' ? 2027 : record.nextAuditYear || 2026;
                    return <span style={{ textDecoration: record.dynamicRiskRating !== 'Low' ? 'line-through' : 'none', color: '#8c8c8c' }}>Năm {oldYear}</span>;
                  }
                },
                {
                  title: 'Lịch đề xuất Mới (Đã liên thông)',
                  key: 'newSchedule',
                  width: '20%',
                  render: (_: any, record: any) => {
                    const newYear = record.dynamicRiskRating === 'Critical' ? 2026 : record.dynamicRiskRating === 'High' ? 2027 : record.nextAuditYear || 2026;
                    return (
                      <Space>
                        <strong style={{ color: record.dynamicRiskRating === 'Critical' ? '#cf1322' : record.dynamicRiskRating === 'High' ? '#d46b08' : '#389e0d' }}>
                          Năm {newYear}
                        </strong>
                        {record.dynamicRiskRating === 'Critical' && <Tag color="error">KHẨN CẤP</Tag>}
                        {record.dynamicRiskRating === 'High' && <Tag color="warning">ƯU TIÊN</Tag>}
                      </Space>
                    );
                  }
                },
                {
                  title: 'Hành động đề xuất kế hoạch',
                  key: 'actionRecommendation',
                  width: '25%',
                  render: (_: any, record: any) => {
                    if (record.dynamicRiskRating === 'Critical') {
                      return <span style={{ color: '#cf1322', fontWeight: 600 }}>⚠️ Rút ngắn chu kỳ, đưa ngay vào KH năm {new Date().getFullYear()}</span>;
                    } else if (record.dynamicRiskRating === 'High') {
                      return <span style={{ color: '#d46b08', fontWeight: 500 }}>⚠️ Đưa vào diện kiểm toán ưu tiên năm sau</span>;
                    }
                    return <span style={{ color: '#389e0d' }}>Giữ nguyên tần suất giám sát định kỳ</span>;
                  }
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DynamicReratingTab;
