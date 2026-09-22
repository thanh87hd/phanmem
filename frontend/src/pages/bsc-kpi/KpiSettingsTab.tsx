import React from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  Spin,
  Button,
  Space,
  Select,
  Divider,
  Switch,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  CopyOutlined,
  CheckOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import type { KpiTarget } from './bscKpiTypes';
import { BSC_PILLAR_COLOR } from './bscKpiTypes';

const { Text } = Typography;
const { Option } = Select;

interface KpiSettingsTabProps {
  targetsLoading: boolean;
  period: string;
  targetRoleType: 'All' | 'Manager';
  setTargetRoleType: (val: 'All' | 'Manager') => void;
  totalActiveWeight: number;
  standardTargets: KpiTarget[];
  editedTargets: Record<string, Partial<KpiTarget>>;
  setEditedTargets: React.Dispatch<React.SetStateAction<Record<string, Partial<KpiTarget>>>>;
  saveTargets: () => void;
  onOpenAddModal: () => void;
  onOpenCloneModal: () => void;
}

export const KpiSettingsTab: React.FC<KpiSettingsTabProps> = ({
  targetsLoading,
  period,
  targetRoleType,
  setTargetRoleType,
  totalActiveWeight,
  standardTargets,
  editedTargets,
  setEditedTargets,
  saveTargets,
  onOpenAddModal,
  onOpenCloneModal,
}) => {
  return (
    <Spin spinning={targetsLoading}>
      <Card style={{ marginBottom: 16 }} variant="borderless">
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Space size="middle" wrap>
              <div>
                <Text type="secondary">Kỳ đánh giá:</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ea9105' }}>
                  {period}
                </div>
              </div>
              <Divider type="vertical" style={{ height: 36 }} />
              <div>
                <Text type="secondary">Đối tượng áp dụng:</Text>
                <div>
                  <Select
                    value={targetRoleType}
                    onChange={setTargetRoleType}
                    style={{ width: 190 }}
                  >
                    <Option value="All">Kiểm Toán Viên (KTV)</Option>
                    <Option value="Manager">Lãnh Đạo Phòng (Trưởng/Phó)</Option>
                  </Select>
                </div>
              </div>
              <Divider type="vertical" style={{ height: 36 }} />
              <div>
                <Text type="secondary">Tổng trọng số:</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                  <Tag
                    color={
                      Math.abs(totalActiveWeight - 1.0) < 0.001 ? 'success' : 'error'
                    }
                    style={{ fontSize: 14, padding: '2px 8px' }}
                  >
                    {(totalActiveWeight * 100).toFixed(0)}% / 100%
                  </Tag>
                </div>
              </div>
            </Space>
          </Col>

          <Col xs={24} lg={10} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button icon={<PlusOutlined />} type="dashed" onClick={onOpenAddModal}>
                Thêm Chỉ Tiêu
              </Button>
              <Button icon={<CopyOutlined />} onClick={onOpenCloneModal}>
                Sao Chép
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={saveTargets}
                disabled={
                  Object.keys(editedTargets).length === 0 &&
                  Math.abs(totalActiveWeight - 1.0) >= 0.001
                }
              >
                Lưu Cấu Hình
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Bảng Danh mục lựa chọn chỉ tiêu */}
      <Card
        title={
          <Space>
            <AppstoreAddOutlined style={{ color: '#ea9105' }} />
            <span>
              Danh Mục Chỉ Tiêu Áp Dụng Cho [
              {targetRoleType === 'Manager' ? 'Lãnh Đạo Phòng' : 'Kiểm Toán Viên'}] —
              Kỳ {period}
            </span>
          </Space>
        }
        variant="borderless"
        style={{ marginBottom: 20 }}
      >
        <Table
          dataSource={standardTargets}
          rowKey="kpiCode"
          pagination={false}
          size="middle"
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: 'Lựa chọn',
              width: 90,
              render: (_: any, row: KpiTarget) => {
                const isActive =
                  (editedTargets[row.kpiCode]?.isActive ?? row.isActive) !== false;
                return (
                  <Switch
                    checked={isActive}
                    checkedChildren="Bật"
                    unCheckedChildren="Tắt"
                    onChange={(checked) => {
                      setEditedTargets((prev) => ({
                        ...prev,
                        [row.kpiCode]: {
                          ...prev[row.kpiCode],
                          isActive: checked,
                          weight: checked
                            ? (prev[row.kpiCode]?.weight ?? row.weight) || 0.05
                            : 0,
                        },
                      }));
                    }}
                  />
                );
              },
            },
            {
              title: 'Mã KPI',
              dataIndex: 'kpiCode',
              width: 110,
              render: (v: string, row: KpiTarget) => (
                <div>
                  <b>{v}</b>
                  {row.isCustom && (
                    <Tag
                      color="magenta"
                      style={{ fontSize: 9, display: 'block', marginTop: 2 }}
                    >
                      Phát sinh
                    </Tag>
                  )}
                </div>
              ),
            },
            {
              title: 'Tên chỉ tiêu & Phương pháp đo lường',
              render: (_: any, row: KpiTarget) => {
                const isActive =
                  (editedTargets[row.kpiCode]?.isActive ?? row.isActive) !== false;
                return (
                  <div style={{ opacity: isActive ? 1 : 0.5 }}>
                    <div style={{ fontWeight: isActive ? '600' : 'normal' }}>
                      {row.kpiName}
                    </div>
                    <Tag
                      color={BSC_PILLAR_COLOR[row.bscPillar] || 'default'}
                      style={{ fontSize: 10, marginTop: 2 }}
                    >
                      {row.bscPillar}
                    </Tag>
                    {row.description && (
                      <div
                        style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}
                      >
                        {row.description}
                      </div>
                    )}
                  </div>
                );
              },
            },
            {
              title: 'Trọng số (%)',
              width: 120,
              render: (_: any, row: KpiTarget) => {
                const isActive =
                  (editedTargets[row.kpiCode]?.isActive ?? row.isActive) !== false;
                return (
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.01}
                    disabled={!isActive}
                    value={editedTargets[row.kpiCode]?.weight ?? row.weight}
                    formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                    parser={(v) => (Number(v?.replace('%', '')) / 100) as any}
                    onChange={(val) => {
                      setEditedTargets((prev) => ({
                        ...prev,
                        [row.kpiCode]: {
                          ...prev[row.kpiCode],
                          weight: val ?? row.weight,
                        },
                      }));
                    }}
                    style={{ width: 90 }}
                  />
                );
              },
            },
            {
              title: 'Ngưỡng Min',
              width: 110,
              render: (_: any, row: KpiTarget) => {
                const isActive =
                  (editedTargets[row.kpiCode]?.isActive ?? row.isActive) !== false;
                return (
                  <InputNumber
                    min={0}
                    max={2}
                    step={0.05}
                    disabled={!isActive}
                    value={editedTargets[row.kpiCode]?.threshold ?? row.threshold}
                    formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                    parser={(v) => (Number(v?.replace('%', '')) / 100) as any}
                    onChange={(val) => {
                      setEditedTargets((prev) => ({
                        ...prev,
                        [row.kpiCode]: {
                          ...prev[row.kpiCode],
                          threshold: val ?? row.threshold,
                        },
                      }));
                    }}
                    style={{ width: 85 }}
                  />
                );
              },
            },
            {
              title: 'Mục tiêu',
              width: 110,
              render: (_: any, row: KpiTarget) => {
                const isActive =
                  (editedTargets[row.kpiCode]?.isActive ?? row.isActive) !== false;
                return (
                  <InputNumber
                    min={0}
                    max={2}
                    step={0.05}
                    disabled={!isActive}
                    value={editedTargets[row.kpiCode]?.target ?? row.target}
                    formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                    parser={(v) => (Number(v?.replace('%', '')) / 100) as any}
                    onChange={(val) => {
                      setEditedTargets((prev) => ({
                        ...prev,
                        [row.kpiCode]: {
                          ...prev[row.kpiCode],
                          target: val ?? row.target,
                        },
                      }));
                    }}
                    style={{ width: 85 }}
                  />
                );
              },
            },
          ]}
        />
      </Card>
    </Spin>
  );
};
