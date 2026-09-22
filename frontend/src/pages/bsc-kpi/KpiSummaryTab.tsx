import React from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Spin,
  Button,
  Space,
  Badge,
  Select,
} from 'antd';
import { ReloadOutlined, TrophyOutlined } from '@ant-design/icons';
import type { PersonalKpiResult } from './bscKpiTypes';
import {
  XEPLOAI_COLOR,
  normalizeToPercent,
} from './bscKpiTypes';

const { Text } = Typography;
const { Option } = Select;

interface KpiSummaryTabProps {
  summaryLoading: boolean;
  period: string;
  isGlobalCaeOrAdmin: boolean;
  departmentFilter: string;
  setDepartmentFilter: (val: string) => void;
  currentUser: any;
  fetchSummary: () => void;
  filteredSummary: PersonalKpiResult[];
}

export const KpiSummaryTab: React.FC<KpiSummaryTabProps> = ({
  summaryLoading,
  period,
  isGlobalCaeOrAdmin,
  departmentFilter,
  setDepartmentFilter,
  currentUser,
  fetchSummary,
  filteredSummary,
}) => {
  return (
    <Spin spinning={summaryLoading}>
      <Card
        title={
          <Space>
            <TrophyOutlined style={{ color: '#faad14', fontSize: 18 }} />
            <span>Bảng Xếp Hạng KPI Khối KTNB — {period}</span>
          </Space>
        }
        extra={
          <Space>
            {isGlobalCaeOrAdmin ? (
              <Select
                value={departmentFilter}
                onChange={setDepartmentFilter}
                style={{ width: 250 }}
              >
                <Option value="ALL">🌐 Tất Cả Phòng Ban Trong Khối</Option>
                <Option value="Phòng KT ĐVKD">Phòng KT ĐVKD</Option>
                <Option value="Phòng KT Hội sở và Hệ thống">Phòng KT Hội sở và Hệ thống</Option>
                <Option value="Ban kiểm soát">Ban kiểm soát</Option>
              </Select>
            ) : (
              <Tag color="blue">Phòng ban: {currentUser.department}</Tag>
            )}
            <Button icon={<ReloadOutlined />} size="small" onClick={fetchSummary}>
              Tải lại
            </Button>
          </Space>
        }
        variant="borderless"
      >
        <Table
          dataSource={filteredSummary}
          columns={[
            {
              title: 'Top',
              width: 60,
              render: (_: any, __: any, index: number) => (
                <Badge
                  count={index + 1}
                  style={{
                    backgroundColor:
                      index === 0
                        ? '#faad14'
                        : index === 1
                          ? '#bfbfbf'
                          : index === 2
                            ? '#d48806'
                            : '#ea9105',
                  }}
                />
              ),
            },
            {
              title: 'Họ và Tên Nhân Sự',
              render: (_: any, row: PersonalKpiResult) => (
                <div>
                  <div>
                    <b>{row.fullName}</b> ({row.username})
                  </div>
                  <Tag
                    color={
                      row.roleType === 'Manager' || row.roleType === 'LeadAuditor'
                        ? 'blue'
                        : 'geekblue'
                    }
                    style={{ fontSize: 10 }}
                  >
                    {row.roleType === 'Manager'
                      ? 'Lãnh đạo Phòng'
                      : row.roleType === 'LeadAuditor'
                        ? 'Trưởng đoàn'
                        : 'Kiểm toán viên'}
                  </Tag>
                </div>
              ),
            },
            {
              title: 'Phòng Ban',
              dataIndex: 'department',
              render: (dep: string) => <Tag color="cyan">{dep || 'Khối KTNB'}</Tag>,
            },
            {
              title: 'Điểm KPI Tổng',
              dataIndex: 'totalScore',
              width: 120,
              render: (v: number) => (
                <Text strong style={{ fontSize: 15 }}>
                  {normalizeToPercent(v).toFixed(1)}%
                </Text>
              ),
            },
            {
              title: 'Điểm Cộng Thưởng',
              dataIndex: 'bonusPoints',
              width: 130,
              render: (v: number) => (
                <Tag color="volcano">
                  <b>+{v}đ</b> (Rủi ro & Lead)
                </Tag>
              ),
            },
            {
              title: 'Điểm Cuối Cùng',
              dataIndex: 'finalScore',
              width: 120,
              render: (v: number) => (
                <Text strong style={{ fontSize: 16, color: '#ea9105' }}>
                  {normalizeToPercent(v).toFixed(1)}%
                </Text>
              ),
            },
            {
              title: 'Xếp Loại Chuẩn',
              dataIndex: 'xepLoai',
              width: 130,
              render: (xepLoai: string) => (
                <Tag
                  color={XEPLOAI_COLOR[xepLoai] || 'default'}
                  style={{ fontSize: 12, padding: '2px 8px' }}
                >
                  <b>{xepLoai}</b>
                </Tag>
              ),
            },
          ]}
          rowKey="username"
          pagination={{ pageSize: 20 }}
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </Spin>
  );
};
