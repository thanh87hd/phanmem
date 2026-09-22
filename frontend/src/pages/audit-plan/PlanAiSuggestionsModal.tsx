import React from 'react';
import {
  Modal,
  Table,
  Button,
  Tag,
  Space,
  Typography,
} from 'antd';
import {
  RadarChartOutlined,
  PlusOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface PlanAiSuggestionsModalProps {
  open: boolean;
  onClose: () => void;
  cmRecommendations: any[];
  selectedUnits: any[];
  applyCmRecommendationToPlan: (record: any) => void;
}

export const PlanAiSuggestionsModal: React.FC<PlanAiSuggestionsModalProps> = ({
  open,
  onClose,
  cmRecommendations,
  selectedUnits,
  applyCmRecommendationToPlan,
}) => {
  return (
    <Modal
      title={
        <Space>
          <RadarChartOutlined style={{ color: '#ea9105', fontSize: 20 }} />
          <span className="font-bold text-slate-800 text-base">
            Gợi ý Đưa vào Kế hoạch Kiểm toán Năm từ Giám Sát Liên Tục (Continuous Monitoring)
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
      width={920}
    >
      <div className="mb-4">
        <Text type="secondary">
          Danh sách các đơn vị/chi nhánh có cảnh báo vi phạm nghiêm trọng (Đỏ), nợ xấu tăng cao,
          hoặc xếp hạng CAMELS yếu kém phát hiện bởi hệ thống Giám sát liên tục. Nhấn{' '}
          <strong>"Thêm vào kế hoạch"</strong> để tự động bổ sung vào Kế hoạch kiểm toán năm hiện tại.
        </Text>
      </div>

      <Table
        dataSource={cmRecommendations}
        rowKey="name"
        pagination={{ pageSize: 6 }}
        scroll={{ x: 910 }}
        columns={[
          {
            title: 'Đơn vị / Chi nhánh',
            dataIndex: 'name',
            key: 'name',
            width: 180,
            ellipsis: true,
            render: (text: string) => <strong>{text}</strong>,
          },
          {
            title: 'Mức độ Ưu tiên',
            dataIndex: 'recommendedPriority',
            key: 'recommendedPriority',
            width: 150,
            render: (p: string) => (
              <Tag
                color={p === 'Critical' ? 'red' : p === 'High' ? 'orange' : 'blue'}
                className="font-bold"
              >
                {p === 'Critical'
                  ? 'KHẨN CẤP (Critical)'
                  : p === 'High'
                    ? 'CAO (High)'
                    : 'BÌNH THƯỜNG'}
              </Tag>
            ),
          },
          {
            title: 'Cảnh báo & Vi phạm',
            key: 'alerts',
            width: 160,
            render: (_: any, r: any) => (
              <Space orientation="vertical" size={2}>
                <Space>
                  {r.redAlerts > 0 && (
                    <Tag color="red" className="m-0 text-xs">
                      🔴 {r.redAlerts} Đỏ
                    </Tag>
                  )}
                  {r.yellowAlerts > 0 && (
                    <Tag color="warning" className="m-0 text-xs">
                      🟡 {r.yellowAlerts} Vàng
                    </Tag>
                  )}
                </Space>
                {r.openCases > 0 && (
                  <Tag color="purple" className="m-0 text-xs">
                    📁 {r.openCases} Hồ sơ đang mở
                  </Tag>
                )}
              </Space>
            ),
          },
          {
            title: 'Lý do & Dấu hiệu Rủi ro (KRI/Rule)',
            dataIndex: 'reasons',
            key: 'reasons',
            width: 280,
            ellipsis: true,
            render: (reasons: string[]) => (
              <ul className="list-disc pl-4 m-0 text-xs text-red-700 font-medium">
                {(reasons || []).map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            ),
          },
          {
            title: 'Thao tác',
            key: 'action',
            width: 140,
            fixed: 'right' as const,
            render: (_: any, record: any) => {
              const isAdded = selectedUnits.some((u) => u.name === record.name);
              return (
                <Button
                  type={isAdded ? 'dashed' : 'primary'}
                  size="small"
                  disabled={isAdded}
                  icon={isAdded ? <CheckCircleOutlined /> : <PlusOutlined />}
                  className={
                    isAdded
                      ? 'text-green-600 border-green-400'
                      : 'bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold'
                  }
                  onClick={() => applyCmRecommendationToPlan(record)}
                >
                  {isAdded ? 'Đã thêm' : 'Thêm vào KH'}
                </Button>
              );
            },
          },
        ]}
      />
    </Modal>
  );
};
