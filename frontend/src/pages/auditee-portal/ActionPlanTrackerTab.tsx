import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Progress,
  Descriptions,
  Tabs,
  Row,
  Col,
  Input,
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  SendOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  PaperClipOutlined,
  FileTextOutlined,
  SolutionOutlined,
  HistoryOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import EvidenceManager from '../../components/EvidenceManager';
import { RecommendationTimeline } from '../recommendations/RecommendationTimeline';
import { exportToExcel, filterRecursive } from '../../utils/excelExport';
import {
  getColumnSearchProps,
  getColumnSelectFilterProps,
  getColumnSorter,
} from '../../utils/tableFilterHelper';

const { Text, Paragraph } = Typography;

interface ActionPlanTrackerTabProps {
  data: any[];
  loading: boolean;
  onOpenPlan: (record: any) => void;
  onOpenProgress: (record: any) => void;
  onOpenExtension: (record: any) => void;
  statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }>;
}

const StatisticCard = ({ title, value, prefix }: any) => (
  <div>
    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</div>
    <div className="flex items-center gap-2">
      <span className="text-xl">{prefix}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  </div>
);

export const ActionPlanTrackerTab: React.FC<ActionPlanTrackerTabProps> = ({
  data,
  loading,
  onOpenPlan,
  onOpenProgress,
  onOpenExtension,
  statusConfig,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('active');
  const [searchRec, setSearchRec] = useState('');

  const getDaysRemaining = (dueDate: string) => {
    if (!dueDate) return null;
    const today = dayjs();
    const due = dayjs(dueDate);
    return due.diff(today, 'day');
  };

  const filteredData = data.filter((item) => {
    const tabOk =
      activeTab === 'active'
        ? ['NotStarted', 'InProgress', 'Overdue'].includes(item.status)
        : activeTab === 'completed'
        ? ['Completed', 'Verified'].includes(item.status)
        : true;
    return tabOk && filterRecursive(item, searchRec);
  });

  const columns = [
    {
      title: 'Kiến nghị',
      dataIndex: 'recommendation',
      key: 'recommendation',
      width: 340,
      ellipsis: true,
      ...getColumnSearchProps<any>('recommendation', 'Kiến nghị'),
      sorter: getColumnSorter<any>('recommendation', 'string'),
      render: (text: string, record: any) => (
        <div>
          <div className="font-medium text-sm mb-1">{text}</div>
          <div className="text-xs text-gray-400">
            ID: REC-{record.id} | Phát hiện: {typeof record.finding === 'object' ? (record.finding?.findingTitle || record.finding?.title || record.finding?.id || '—') : (record.finding || '—')}
          </div>
          {record.evidenceLink && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500 font-semibold">🔗 Link scan bằng chứng:</span>
              <a
                href={record.evidenceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline truncate max-w-[220px] font-medium"
              >
                {record.evidenceLink}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Hạn hoàn thành',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      ...getColumnSearchProps<any>('dueDate', 'Hạn hoàn thành'),
      sorter: getColumnSorter<any>('dueDate', 'date'),
      render: (date: string, record: any) => {
        const days = getDaysRemaining(date);
        return (
          <div>
            <div className="text-sm">{date || '-'}</div>
            {date && !['Completed', 'Verified'].includes(record.status) && (
              <Tag color={days! < 0 ? 'red' : days! < 7 ? 'orange' : 'default'} className="mt-1 text-[10px]">
                {days! < 0 ? `Trễ ${Math.abs(days!)} ngày` : `Còn ${days} ngày`}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tiến độ',
      key: 'progress',
      width: 160,
      sorter: (a: any, b: any) => (a.progressPercent || 0) - (b.progressPercent || 0),
      render: (_: any, record: any) => (
        <div className="w-full">
          <div className="flex justify-between text-[11px] mb-1">
            <Text type="secondary">{statusConfig[record.status]?.label}</Text>
            <Text strong>{record.progressPercent || 0}%</Text>
          </div>
          <Progress
            percent={record.progressPercent || 0}
            size="small"
            status={record.status === 'Overdue' ? 'exception' : record.status === 'Verified' ? 'success' : 'active'}
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      ...getColumnSelectFilterProps<any>(
        'status',
        Object.entries(statusConfig).map(([k, v]) => ({ text: v.label, value: k }))
      ),
      sorter: getColumnSorter<any>('status', 'string'),
      render: (status: string) => {
        const cfg = statusConfig[status] || statusConfig.NotStarted;
        return (
          <Tag color={cfg.color} icon={cfg.icon} className="px-2 py-0.5">
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      align: 'right' as const,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space wrap>
          {record.status === 'NotStarted' && (
            <Button
              type="primary"
              size="small"
              ghost
              icon={<SolutionOutlined />}
              onClick={() => onOpenPlan(record)}
            >
              Lập kế hoạch
            </Button>
          )}
          {['InProgress', 'Overdue'].includes(record.status) && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => onOpenProgress(record)}
              >
                Cập nhật
              </Button>
              <Button
                size="small"
                style={{ borderColor: '#d46b08', color: '#d46b08' }}
                onClick={() => onOpenExtension(record)}
              >
                {record.extensionStatus === 'Pending' ? 'Đang xin gia hạn' : 'Xin gia hạn'}
              </Button>
            </>
          )}
          {['Completed', 'Verified'].includes(record.status) && (
            <Button size="small" icon={<HistoryOutlined />} onClick={() => {}}>
              {t('common.btnDetail', 'Chi tiết')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card variant="borderless" className="shadow-sm border-b-2 border-blue-500">
            <StatisticCard
              title="Đang xử lý"
              value={data.filter((r) => ['NotStarted', 'InProgress', 'Overdue'].includes(r.status)).length}
              prefix={<InfoCircleOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-sm border-b-2 border-red-500">
            <StatisticCard
              title="Quá hạn (SLA)"
              value={data.filter((r) => r.status === 'Overdue').length}
              prefix={<WarningOutlined className="text-red-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-sm border-b-2 border-orange-500">
            <StatisticCard
              title="Chờ xác nhận"
              value={data.filter((r) => r.status === 'Completed').length}
              prefix={<SendOutlined className="text-orange-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-sm border-b-2 border-green-500">
            <StatisticCard
              title="Đã Verified"
              value={data.filter((r) => r.status === 'Verified').length}
              prefix={<CheckCircleOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="bg-white p-4 rounded-lg shadow-sm"
        tabBarExtraContent={
          <Space>
            <Input.Search
              placeholder="Tìm kiến nghị..."
              allowClear
              size="small"
              onChange={(e) => setSearchRec(e.target.value)}
              style={{ width: 200 }}
            />
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => exportToExcel(filteredData, columns, 'Kien_nghi_kiem_toan')}
              disabled={filteredData.length === 0}
            >
              Tải Excel
            </Button>
          </Space>
        }
        items={[
          {
            key: 'active',
            label: `Kiến nghị đang xử lý (${data.filter((r) => ['NotStarted', 'InProgress', 'Overdue'].includes(r.status)).length})`,
          },
          {
            key: 'completed',
            label: `Kiến nghị đã xong (${data.filter((r) => ['Completed', 'Verified'].includes(r.status)).length})`,
          },
          { key: 'all', label: 'Tất cả' },
        ]}
      />

      <Card variant="borderless" className="shadow-sm mt-4">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1020 }}
          expandable={{
            expandedRowRender: (record: any) => {
              const finding = record.auditFinding || {};

              const getRiskTag = (level: string) => {
                const colors: Record<string, string> = {
                  Critical: 'red',
                  High: 'volcano',
                  Medium: 'warning',
                  Low: 'green',
                };
                return <Tag color={colors[level] || 'blue'}>{level || 'Chưa phân loại'}</Tag>;
              };

              const getFeasibilityTag = (feas: any) => {
                if (feas === undefined || feas === null) return <Tag color="warning">Chưa đánh giá</Tag>;
                return feas ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Có thể khắc phục
                  </Tag>
                ) : (
                  <Tag color="red" icon={<ExclamationCircleOutlined />}>
                    Không thể khắc phục
                  </Tag>
                );
              };

              const getEscalationAlert = () => {
                if (!record.escalationLevel || record.escalationLevel === 0) return null;
                return (
                  <div className="mb-4 p-3 rounded border" style={{ background: '#fff2e8', borderColor: '#ffbb96' }}>
                    <Text strong style={{ color: '#d4380d' }}>
                      <WarningOutlined style={{ marginRight: 6 }} />
                      Hồ sơ Cảnh báo Leo thang (Escalation Profile):
                    </Text>
                    <Text type="danger" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                      {record.escalationLevel === 3
                        ? `🔴 Cảnh báo Cấp 3 (Hạn chót trễ > 60 ngày): Sự việc đã được tự động leo thang báo cáo khẩn cấp lên Ban Kiểm Soát & Giám đốc Khối KTNB.`
                        : record.escalationLevel === 2
                        ? `🟠 Cảnh báo Cấp 2 (Hạn chót trễ > 30 ngày): Đã gửi cảnh báo leo thang nhắc nhở và giải trình tới Giám đốc Vùng và Ban Điều Hành phụ trách.`
                        : `🟡 Cảnh báo Cấp 1 (Hạn chót trễ > 15 ngày): Đã gửi cảnh báo trực tiếp Giám đốc Chi nhánh quản lý.`}
                    </Text>
                    {record.escalatedAt && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        Thời điểm leo thang gần nhất: {dayjs(record.escalatedAt).format('DD/MM/YYYY HH:mm:ss')}
                      </Text>
                    )}
                  </div>
                );
              };

              return (
                <div className="p-5 bg-[#fafafa] rounded-xl border border-gray-200 shadow-inner">
                  {getEscalationAlert()}
                  <RecommendationTimeline 
                    recommendation={record} 
                    onOpenAuditeePlan={onOpenPlan}
                    onOpenAuditeeProgress={onOpenProgress}
                  />

                  <Tabs
                    type="card"
                    size="small"
                    items={[
                      {
                        key: 'finding_details',
                        label: (
                          <span className="font-semibold text-gray-700">
                            <FileTextOutlined style={{ marginRight: 4, color: '#ea9105' }} />
                            1. Thông tin Phát hiện & Sai phạm (BCKT)
                          </span>
                        ),
                        children: (
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <div className="border-b border-gray-100 pb-3 mb-4 flex justify-between items-start">
                              <div>
                                <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
                                  {finding.findingTitle || record.finding || 'Chi tiết sai sót phát hiện'}
                                </Text>
                                <div className="text-xs text-gray-400 mt-1">
                                  Mã phát hiện:{' '}
                                  <Tag color="blue" className="text-[10px] py-0 px-1 m-0">
                                    {finding.findingCode || `FD-${finding.id || record.id || 'N/A'}`}
                                  </Tag>{' '}
                                  | Số BCKT:{' '}
                                  <span className="font-semibold text-gray-600">
                                    {finding.engagement?.reportNumber || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div>{getRiskTag(finding.riskLevel || record.riskLevel)}</div>
                            </div>

                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={12}>
                                <Card
                                  size="small"
                                  title={
                                    <span className="text-xs font-bold text-gray-600">
                                      📂 ĐỐI TƯỢNG & SẢN PHẨM SAI PHẠM (A-AA)
                                    </span>
                                  }
                                  variant="borderless"
                                  className="bg-gray-50/50"
                                >
                                  <Descriptions
                                    column={1}
                                    size="small"
                                    layout="horizontal"
                                    contentStyle={{ fontSize: 13 }}
                                    labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}
                                  >
                                    <Descriptions.Item label="Số TK / CIF">
                                      {finding.cifOrAccount || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Tên khách hàng">
                                      {finding.customerName || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Loại khách hàng">
                                      {finding.customerType || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Sản phẩm lỗi">
                                      {finding.productName || '-'}
                                    </Descriptions.Item>
                                  </Descriptions>
                                </Card>
                              </Col>

                              <Col xs={24} md={12}>
                                <Card
                                  size="small"
                                  title={
                                    <span className="text-xs font-bold text-gray-600">
                                      ⚡ CHI TIẾT NGHIỆP VỤ & PHÂN LOẠI RR (A-AA)
                                    </span>
                                  }
                                  variant="borderless"
                                  className="bg-gray-50/50"
                                >
                                  <Descriptions
                                    column={1}
                                    size="small"
                                    layout="horizontal"
                                    contentStyle={{ fontSize: 13 }}
                                    labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}
                                  >
                                    <Descriptions.Item label="Mảng nghiệp vụ">
                                      <Tag color="cyan">
                                        {finding.operationType === 'TD'
                                          ? 'Tín dụng'
                                          : finding.operationType === 'PTD'
                                          ? 'Phi tín dụng'
                                          : finding.operationType === 'TKBĐ'
                                          ? 'Tiết kiệm Bưu điện'
                                          : finding.operationType || '-'}
                                      </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Quy trình">
                                      {finding.businessProcess || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Nhóm rủi ro tổng hợp">
                                      {finding.riskGroupGeneral || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Nhóm rủi ro chi tiết">
                                      {finding.riskGroupDetail || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Đối tượng kiến nghị">
                                      {finding.recommendationTarget || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Loại kiến nghị">
                                      {finding.recommendationType === 'Publish'
                                        ? 'Phát hành chính thức'
                                        : finding.recommendationType || '-'}
                                    </Descriptions.Item>
                                  </Descriptions>
                                </Card>
                              </Col>

                              <Col xs={24}>
                                <Card
                                  size="small"
                                  title={
                                    <span className="text-xs font-bold text-gray-600">
                                      👤 NHÂN SỰ CHỊU TRÁCH NHIỆM TRỰC TIẾP (BCKT)
                                    </span>
                                  }
                                  variant="borderless"
                                  className="bg-gray-50/50"
                                >
                                  <Row gutter={16}>
                                    <Col span={8}>
                                      <Text type="secondary" className="text-xs">
                                        Cán bộ đề xuất:
                                      </Text>
                                      <div className="font-semibold text-sm mt-1 text-gray-800">
                                        {finding.proposerOfficer || (
                                          <Text type="secondary" italic className="text-xs">
                                            Chưa xác định
                                          </Text>
                                        )}
                                      </div>
                                    </Col>
                                    <Col span={8}>
                                      <Text type="secondary" className="text-xs">
                                        Cán bộ thẩm định:
                                      </Text>
                                      <div className="font-semibold text-sm mt-1 text-gray-800">
                                        {finding.appraiserOfficer || (
                                          <Text type="secondary" italic className="text-xs">
                                            Chưa xác định
                                          </Text>
                                        )}
                                      </div>
                                    </Col>
                                    <Col span={8}>
                                      <Text type="secondary" className="text-xs">
                                        Lãnh đạo phê duyệt lỗi:
                                      </Text>
                                      <div className="font-semibold text-sm mt-1 text-gray-800">
                                        {finding.businessLeader || (
                                          <Text type="secondary" italic className="text-xs">
                                            Chưa xác định
                                          </Text>
                                        )}
                                      </div>
                                    </Col>
                                  </Row>
                                </Card>
                              </Col>

                              <Col xs={24}>
                                <Card
                                  size="small"
                                  title={
                                    <span className="text-xs font-bold text-gray-600">
                                      📝 NỘI DUNG PHÁT HIỆN & PHÁP LÝ (BCKT)
                                    </span>
                                  }
                                  variant="borderless"
                                  className="bg-gray-50/50"
                                >
                                  <Descriptions
                                    column={1}
                                    size="small"
                                    layout="vertical"
                                    labelStyle={{ fontWeight: 600, color: '#595959', marginTop: 8 }}
                                  >
                                    <Descriptions.Item label="Hiện trạng sai phạm (Condition)">
                                      <div className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap">
                                        {finding.condition || '-'}
                                      </div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Hậu quả rủi ro (Consequence)">
                                      <div className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap">
                                        {finding.consequence || '-'}
                                      </div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Nguyên nhân sai phạm (Cause)">
                                      <div className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap">
                                        {finding.cause || '-'}
                                      </div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Cơ sở pháp lý / Quy định vi phạm (Criteria)">
                                      <div className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-500 whitespace-pre-wrap">
                                        {finding.criteria || '-'}
                                      </div>
                                    </Descriptions.Item>
                                  </Descriptions>
                                </Card>
                              </Col>
                            </Row>
                          </div>
                        ),
                      },
                      {
                        key: 'remediation_details',
                        label: (
                          <span className="font-semibold text-gray-700">
                            <SolutionOutlined style={{ marginRight: 4, color: '#ea9105' }} />
                            2. Kế hoạch & Tiến độ Khắc phục (ĐVKD)
                          </span>
                        ),
                        children: (
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={16}>
                                <Descriptions
                                  title={
                                    <span className="text-sm font-semibold text-gray-800">
                                      📋 Nội dung cập nhật thực tế (AB-AJ)
                                    </span>
                                  }
                                  column={1}
                                  size="small"
                                  labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}
                                >
                                  <Descriptions.Item label="Kiến nghị cần khắc phục">
                                    <div className="bg-amber-50/20 p-3 rounded border border-amber-100 text-sm text-gray-800 font-medium">
                                      {record.recommendation}
                                    </div>
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Kế hoạch khắc phục">
                                    <div
                                      className="bg-gray-50 p-3 rounded border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap"
                                      style={{ minHeight: 60 }}
                                    >
                                      {record.remediationPlan || (
                                        <Text type="secondary" italic>
                                          Chưa thiết lập kế hoạch khắc phục
                                        </Text>
                                      )}
                                    </div>
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Giải trình kết quả thực tế">
                                    <div
                                      className="bg-gray-50 p-3 rounded border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap"
                                      style={{ minHeight: 60 }}
                                    >
                                      {record.response || (
                                        <Text type="secondary" italic>
                                          Chưa cập nhật nội dung giải trình kết quả thực tế
                                        </Text>
                                      )}
                                    </div>
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Ghi chú nội bộ Đơn vị">
                                    <div className="bg-gray-50 p-3 rounded border border-gray-100 text-xs text-gray-600">
                                      {record.auditeeNotes || '-'}
                                    </div>
                                  </Descriptions.Item>
                                </Descriptions>
                              </Col>

                              <Col xs={24} md={8}>
                                <Card
                                  size="small"
                                  title={
                                    <span className="text-xs font-bold text-gray-600">
                                      ⚙️ THÔNG TIN PHÂN CÔNG & CAM KẾT
                                    </span>
                                  }
                                  variant="borderless"
                                  className="bg-gray-50/50"
                                >
                                  <Descriptions
                                    column={1}
                                    size="small"
                                    layout="horizontal"
                                    contentStyle={{ fontSize: 13 }}
                                    labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}
                                  >
                                    <Descriptions.Item label="Khả năng khắc phục">
                                      {getFeasibilityTag(record.remediationFeasibility)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Kỳ theo dõi (Tháng)">
                                      <Tag color="purple">{record.monitoringCycle || '-'}</Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Hạn cam kết">
                                      {record.auditeeTargetDate || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Trưởng đơn vị">
                                      {record.auditeeUnitHead || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Đầu mối phụ trách">
                                      {record.auditeePoc || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Báo cáo lúc">
                                      {record.completedAt
                                        ? dayjs(record.completedAt).format('DD/MM/YYYY HH:mm')
                                        : '-'}
                                    </Descriptions.Item>
                                  </Descriptions>
                                </Card>

                                {record.remediationFeasibility === false && (
                                  <div className="mt-4 p-3 bg-red-50/50 rounded-lg border border-red-100">
                                    <div className="text-xs font-bold text-red-600 mb-1">
                                      Lý do không thể khắc phục:
                                    </div>
                                    <Paragraph className="text-xs text-gray-700 mb-3">
                                      {record.remediationUnfeasibleReason || '-'}
                                    </Paragraph>

                                    <div className="text-xs font-bold text-orange-600 mb-1">
                                      Đề xuất giải pháp của Đơn vị:
                                    </div>
                                    <Paragraph className="text-xs text-gray-700">
                                      {record.auditeeProposal || '-'}
                                    </Paragraph>
                                  </div>
                                )}
                              </Col>
                            </Row>
                          </div>
                        ),
                      },
                      {
                        key: 'ktnb_assessment',
                        label: (
                          <span className="font-semibold text-gray-700">
                            <HistoryOutlined style={{ marginRight: 4, color: '#ea9105' }} />
                            3. Thẩm định & Đóng hồ sơ (KTNB)
                          </span>
                        ),
                        children: (
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={16}>
                                <Descriptions
                                  title={
                                    <span className="text-sm font-semibold text-gray-800">
                                      ⚖️ Kết quả đánh giá độc lập (AK-AM)
                                    </span>
                                  }
                                  column={1}
                                  size="small"
                                  labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}
                                >
                                  <Descriptions.Item label="Ý kiến thẩm định KTV">
                                    <div
                                      className="bg-green-50/20 p-3 rounded border border-green-100 text-sm text-gray-800 whitespace-pre-wrap"
                                      style={{ minHeight: 60 }}
                                    >
                                      {record.verificationNotes ? (
                                        <span className="text-green-700 font-semibold">
                                          <CheckCircleOutlined className="mr-1 text-green-600" />
                                          {record.verificationNotes}
                                        </span>
                                      ) : (
                                        <Text type="secondary" italic>
                                          Đoàn kiểm toán chưa đưa ra ý kiến thẩm định chốt cuối cùng
                                        </Text>
                                      )}
                                    </div>
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Ý kiến của Trưởng đoàn">
                                    <div
                                      className="bg-amber-50/20 p-3 rounded border border-amber-100 text-sm text-gray-800 whitespace-pre-wrap"
                                      style={{ minHeight: 60 }}
                                    >
                                      {record.teamLeadClosureOpinion ? (
                                        <span className="text-amber-700 font-semibold">
                                          {record.teamLeadClosureOpinion}
                                        </span>
                                      ) : (
                                        <Text type="secondary" italic>
                                          Chưa có ý kiến chỉ đạo đóng hồ sơ từ Trưởng đoàn kiểm toán
                                        </Text>
                                      )}
                                    </div>
                                  </Descriptions.Item>
                                </Descriptions>
                              </Col>

                              <Col xs={24} md={8}>
                                <Card
                                  size="small"
                                  title={
                                    <span className="text-xs font-bold text-gray-600">
                                      🔒 PHÁN QUYẾT CHỐT SỐ LIỆU
                                    </span>
                                  }
                                  variant="borderless"
                                  className="bg-gray-50/50"
                                >
                                  <Descriptions
                                    column={1}
                                    size="small"
                                    layout="horizontal"
                                    contentStyle={{ fontSize: 13 }}
                                    labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}
                                  >
                                    <Descriptions.Item label="Trạng thái đóng">
                                      <Tag
                                        color={
                                          record.closureStatus === 'Closed'
                                            ? 'green'
                                            : record.closureStatus === 'PendingTeamLeadOpinion'
                                            ? 'orange'
                                            : 'red'
                                        }
                                      >
                                        {record.closureStatus === 'Closed'
                                          ? 'Đã đóng (Closed)'
                                          : record.closureStatus === 'PendingTeamLeadOpinion'
                                          ? 'Chờ duyệt đóng'
                                          : record.closureStatus || 'Mở (Open)'}
                                      </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="KTV rà soát">
                                      {record.ktnbReviewerName || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Trưởng đoàn duyệt">
                                      {record.teamLeadClosureOpinionByName || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Thời điểm đóng">
                                      {record.closedAt
                                        ? dayjs(record.closedAt).format('DD/MM/YYYY HH:mm')
                                        : '-'}
                                    </Descriptions.Item>
                                  </Descriptions>
                                </Card>
                              </Col>
                            </Row>
                          </div>
                        ),
                      },
                      {
                        key: 'evidence_docs',
                        label: (
                          <span className="font-semibold text-gray-700">
                            <PaperClipOutlined style={{ marginRight: 4, color: '#ea9105' }} />
                            4. Bằng chứng đính kèm ({record.evidenceCount || 0})
                          </span>
                        ),
                        children: (
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <EvidenceManager
                              linkedResource="recommendations"
                              linkedResourceId={record.id}
                              readOnly={record.status === 'Verified' || record.closureStatus === 'Closed'}
                            />
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              );
            },
          }}
        />
      </Card>
    </div>
  );
};
