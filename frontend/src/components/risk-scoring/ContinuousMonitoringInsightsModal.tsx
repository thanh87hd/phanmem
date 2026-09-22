import React from 'react';
import { Modal, Space, Button, Typography, Table, Tag } from 'antd';
import { RadarChartOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ContinuousMonitoringInsightsModalProps {
  open: boolean;
  onClose: () => void;
  cmRecommendations: any[];
}

export const ContinuousMonitoringInsightsModal: React.FC<
  ContinuousMonitoringInsightsModalProps
> = ({ open, onClose, cmRecommendations }) => {
  return (
    <Modal
      title={
        <Space>
          <RadarChartOutlined style={{ color: '#ea9105', fontSize: 20 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            Insights Đề Xuất từ Động Cơ Giám Sát Liên Tục (Continuous Monitoring)
          </span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={900}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Dữ liệu tổng hợp thời gian thực từ 100+ Rule kiểm toán tín dụng/vận
          hành, chỉ số KRI vi phạm và cảnh báo Đỏ để hỗ trợ KTV nhận diện nhanh
          các điểm nóng rủi ro khi chấm điểm.
        </Text>
      </div>

      <Table
        dataSource={cmRecommendations}
        rowKey="name"
        pagination={{ pageSize: 8 }}
        columns={[
          {
            title: 'Đơn vị / Chi nhánh',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <strong>{text}</strong>,
          },
          {
            title: 'Mức độ Cảnh báo',
            dataIndex: 'recommendedPriority',
            key: 'recommendedPriority',
            render: (p: string) => (
              <Tag
                color={
                  p === 'Critical' ? 'red' : p === 'High' ? 'orange' : 'blue'
                }
                style={{ fontWeight: 600 }}
              >
                {p === 'Critical'
                  ? 'RẤT CAO (Critical)'
                  : p === 'High'
                  ? 'CAO (High)'
                  : 'TRUNG BÌNH (Medium)'}
              </Tag>
            ),
          },
          {
            title: 'Cảnh báo Đỏ / Vàng',
            key: 'alerts',
            render: (_: any, r: any) => (
              <Space>
                {r.redAlerts > 0 && <Tag color="red">🔴 {r.redAlerts} Đỏ</Tag>}
                {r.yellowAlerts > 0 && (
                  <Tag color="warning">🟡 {r.yellowAlerts} Vàng</Tag>
                )}
                {r.openCases > 0 && (
                  <Tag color="purple">📁 {r.openCases} Audit Cases</Tag>
                )}
              </Space>
            ),
          },
          {
            title: 'Lý do / Dấu hiệu Bất thường (KRI & CAMELS)',
            dataIndex: 'reasons',
            key: 'reasons',
            render: (reasons: string[]) => (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                {(reasons || []).map((reason, idx) => (
                  <li key={idx} className="text-red-700">
                    {reason}
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
    </Modal>
  );
};
