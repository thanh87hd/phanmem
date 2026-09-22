import React from 'react';
import {
  Drawer,
  Tabs,
  Typography,
  Tag,
  Card,
  Row,
  Col,
  Table,
  Space,
  Timeline,
  Empty,
  Button,
  message,
} from 'antd';
import { InfoCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const { Title, Text } = Typography;

interface PlanDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedPlanDetails: any;
  getStatusTagColor: (status: string) => string;
  getStatusText: (status: string) => string;
  renderRiskTag: (riskLevel: string) => React.ReactNode;
  isLowRisk: (riskLevel: string) => boolean;
}

export const PlanDetailDrawer: React.FC<PlanDetailDrawerProps> = ({
  open,
  onClose,
  selectedPlanDetails,
  getStatusTagColor,
  getStatusText,
  renderRiskTag,
  isLowRisk,
}) => {
  const { t } = useTranslation();

  if (!selectedPlanDetails) return null;

  const handleExportThisPlan = async () => {
    if (!selectedPlanDetails) return;
    const units = selectedPlanDetails.selectedUnits || [];
    const exportRows =
      units.length > 0
        ? units.map((unit: any, idx: number) => {
            const monthStr = unit.scheduledMonth
              ? `Tháng ${unit.scheduledMonth < 10 ? '0' : ''}${unit.scheduledMonth}`
              : '';
            const quarterStr =
              unit.targetQuarter ||
              (unit.scheduledMonth
                ? `Q${Math.ceil(unit.scheduledMonth / 3)}`
                : 'Q1');
            return {
              'Năm kế hoạch': selectedPlanDetails.year,
              'Tên kế hoạch': selectedPlanDetails.name,
              'Phòng KTNB phụ trách':
                selectedPlanDetails.ownerTeam || 'Toàn khối',
              'Mã đối tượng KT': unit.universeId || idx + 1,
              'Tên đối tượng / Quy trình kiểm toán': unit.name || '',
              'Phân loại': unit.auditCategory || '',
              'Mức độ rủi ro': unit.riskLevel || 'Chưa đánh giá',
              'Quý dự kiến': quarterStr,
              'Tháng dự kiến': monthStr,
              'Ngày công dự kiến': Number(unit.estDays) || 0,
              'Số lượng KTV': Number(unit.ktvCount) || 0,
              'Trưởng đoàn dự kiến': unit.leadAuditorName || '',
              'Căn cứ / Giải trình lựa chọn': unit.justification || '',
              'Trạng thái kế hoạch': getStatusText(selectedPlanDetails.status),
              'Ý kiến phê duyệt': selectedPlanDetails.approvalNotes || '',
            };
          })
        : [
            {
              'Năm kế hoạch': selectedPlanDetails.year,
              'Tên kế hoạch': selectedPlanDetails.name,
              'Phòng KTNB phụ trách':
                selectedPlanDetails.ownerTeam || 'Toàn khối',
              'Mã đối tượng KT': '',
              'Tên đối tượng / Quy trình kiểm toán': 'Chưa chọn đối tượng',
              'Phân loại': '',
              'Mức độ rủi ro': '',
              'Quý dự kiến': '',
              'Tháng dự kiến': '',
              'Ngày công dự kiến': 0,
              'Số lượng KTV': 0,
              'Trưởng đoàn dự kiến': '',
              'Căn cứ / Giải trình lựa chọn': '',
              'Trạng thái kế hoạch': getStatusText(selectedPlanDetails.status),
              'Ý kiến phê duyệt': selectedPlanDetails.approvalNotes || '',
            },
          ];

    try {
      const response = await api.post(
        '/import/export-template',
        { templateData: exportRows },
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `KHKT_${selectedPlanDetails.year}_${selectedPlanDetails.name.replace(/\s+/g, '_')}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      message.success(
        `Đã xuất ${exportRows.length} dòng chi tiết kế hoạch ra Excel!`,
      );
    } catch {
      message.error('Lỗi khi xuất file Excel');
    }
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <InfoCircleOutlined />
          </span>
          <div>
            <Title level={4} className="!mb-0 text-slate-800">
              Chi tiết Kế hoạch Kiểm toán Năm
            </Title>
            <Text type="secondary" className="text-xs">
              Xem chi tiết các đối tượng đã chọn, nguồn lực phân bổ và lịch trình phê duyệt.
            </Text>
          </div>
        </div>
      }
      placement="right"
      width={750}
      onClose={onClose}
      open={open}
      className="premium-drawer"
    >
      <Tabs defaultActiveKey="d1" className="premium-tabs">
        {/* Drawer Tab 1: General Info */}
        <Tabs.TabPane tab="Tổng quan kế hoạch" key="d1" className="space-y-6">
          {/* Header info */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center">
            <div>
              <Text
                type="secondary"
                className="text-xs font-bold uppercase tracking-wider block mb-1"
              >
                {t('auditPlan.cols.name', 'Tên Kế hoạch')}
              </Text>
              <Title level={4} className="!mb-0 text-blue-900">
                {selectedPlanDetails.name}
              </Title>
              <Text type="secondary" className="text-sm">
                Năm thực hiện:{' '}
                <span className="font-bold text-gray-800">
                  {selectedPlanDetails.year}
                </span>
              </Text>
            </div>
            <Tag
              color={getStatusTagColor(selectedPlanDetails.status)}
              className="px-4 py-1.5 font-bold uppercase text-xs rounded-lg tracking-wider border-0 shadow-sm"
            >
              {getStatusText(selectedPlanDetails.status)}
            </Tag>
          </div>

          {/* Approval Tracking Card */}
          {selectedPlanDetails.status !== 'Draft' && (
            <Card
              size="small"
              title={
                <span className="font-bold text-sm text-slate-700">
                  Thông tin Phê duyệt
                </span>
              }
              className="rounded-xl border-slate-200/80 shadow-xs"
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary" className="text-xs">
                    Trạng thái hiện tại:{' '}
                  </Text>
                  <div className="font-semibold text-slate-800 text-sm mt-1">
                    {getStatusText(selectedPlanDetails.status)}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" className="text-xs">
                    Ngày cập nhật:{' '}
                  </Text>
                  <div className="font-semibold text-slate-800 text-sm mt-1">
                    {selectedPlanDetails.approvedAt
                      ? new Date(selectedPlanDetails.approvedAt).toLocaleDateString(
                          'vi-VN',
                          { hour: '2-digit', minute: '2-digit' },
                        )
                      : 'Chưa có'}
                  </div>
                </Col>
                {selectedPlanDetails.approvalNotes && (
                  <Col span={24}>
                    <Text type="secondary" className="text-xs">
                      Ý kiến phản hồi / Chỉ đạo phê duyệt:{' '}
                    </Text>
                    <div className="p-3 bg-blue-50/50 rounded-lg text-blue-900 font-medium text-sm mt-1 border border-blue-100/50 italic">
                      "{selectedPlanDetails.approvalNotes}"
                    </div>
                  </Col>
                )}
              </Row>
            </Card>
          )}

          {/* Resource aggregates */}
          <div>
            <Text className="font-bold text-slate-700 block mb-3 text-sm">
              Tổng hợp Nguồn lực Toàn bộ Kế hoạch
            </Text>
            <Row gutter={16}>
              <Col span={8}>
                <div className="p-4 rounded-xl border border-slate-200/60 bg-white text-center">
                  <Text type="secondary" className="text-xs block mb-1">
                    Số đối tượng chọn
                  </Text>
                  <span className="text-xl font-bold text-blue-900">
                    {selectedPlanDetails.selectedUnits?.length || 0} đơn vị
                  </span>
                </div>
              </Col>
              <Col span={8}>
                <div className="p-4 rounded-xl border border-slate-200/60 bg-white text-center">
                  <Text type="secondary" className="text-xs block mb-1">
                    Tổng ngày công dự kiến
                  </Text>
                  <span className="text-xl font-bold text-orange-950">
                    {selectedPlanDetails.selectedUnits?.reduce(
                      (sum: number, u: any) => sum + (u.estDays || 0),
                      0,
                    ) || 0}{' '}
                    ngày
                  </span>
                </div>
              </Col>
              <Col span={8}>
                <div className="p-4 rounded-xl border border-slate-200/60 bg-white text-center">
                  <Text type="secondary" className="text-xs block mb-1">
                    Tổng KTV điều động
                  </Text>
                  <span className="text-xl font-bold text-emerald-950">
                    {selectedPlanDetails.selectedUnits?.reduce(
                      (sum: number, u: any) => sum + (u.ktvCount || 0),
                      0,
                    ) || 0}{' '}
                    lượt KTV
                  </span>
                </div>
              </Col>
            </Row>
          </div>
        </Tabs.TabPane>

        {/* Drawer Tab 2: Selected units details */}
        <Tabs.TabPane
          tab={`Quy trình kiểm toán (${selectedPlanDetails.selectedUnits?.length || 0})`}
          key="d2"
        >
          <div className="flex justify-between items-center mb-3">
            <Text type="secondary" className="text-xs">
              Danh sách chi tiết các đối tượng kiểm toán, nguồn lực, trưởng đoàn và tiến độ dự kiến.
            </Text>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExportThisPlan}
              className="text-xs font-semibold rounded-lg text-slate-700 hover:text-[#ea9105]"
            >
              Tải Excel Kế hoạch này
            </Button>
          </div>
          <Table
            dataSource={selectedPlanDetails.selectedUnits || []}
            rowKey={(r, idx) => r.universeId || idx}
            pagination={false}
            size="small"
            scroll={{ x: 860 }}
            className="border border-slate-100 rounded-lg shadow-xs"
            columns={[
              {
                title: 'Đơn vị / Quy trình',
                dataIndex: 'name',
                key: 'name',
                width: 220,
                ellipsis: true,
                render: (name: string, record: any) => (
                  <Space orientation="vertical" size={1}>
                    <span className="font-bold text-slate-800 text-sm">{name}</span>
                    <Space size={4}>
                      {renderRiskTag(record.riskLevel)}
                      {record.auditCategory && (
                        <Tag color="geekblue" className="text-[10px] m-0">
                          {record.auditCategory}
                        </Tag>
                      )}
                    </Space>
                  </Space>
                ),
              },
              {
                title: 'Thời gian dự kiến',
                key: 'schedule',
                width: 130,
                align: 'center',
                render: (_: any, record: any) => {
                  const q =
                    record.targetQuarter ||
                    (record.scheduledMonth
                      ? `Q${Math.ceil(record.scheduledMonth / 3)}`
                      : null);
                  const m = record.scheduledMonth
                    ? `Tháng ${record.scheduledMonth < 10 ? '0' : ''}${record.scheduledMonth}`
                    : null;
                  return (
                    <Space orientation="vertical" size={1} align="center">
                      {q && (
                        <Tag color="blue" className="font-bold text-xs m-0">
                          {q}
                        </Tag>
                      )}
                      {m && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {m}
                        </span>
                      )}
                      {!q && !m && (
                        <span className="text-slate-400 text-xs italic">—</span>
                      )}
                    </Space>
                  );
                },
              },
              {
                title: 'Trưởng đoàn',
                dataIndex: 'leadAuditorName',
                key: 'leadAuditorName',
                width: 140,
                render: (val: string) =>
                  val ? (
                    <Tag color="cyan" className="font-semibold">
                      {val}
                    </Tag>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Chưa gán</span>
                  ),
              },
              {
                title: 'Ngày công',
                dataIndex: 'estDays',
                key: 'estDays',
                align: 'center',
                width: 100,
                render: (val: number) => (
                  <span className="font-semibold text-slate-700">
                    {val || 0} ngày
                  </span>
                ),
              },
              {
                title: 'Số KTV',
                dataIndex: 'ktvCount',
                key: 'ktvCount',
                align: 'center',
                width: 90,
                render: (val: number) => (
                  <span className="font-semibold text-slate-700">
                    {val || 0} người
                  </span>
                ),
              },
              {
                title: 'Căn cứ / Giải trình lý do chọn',
                dataIndex: 'justification',
                key: 'justification',
                width: 250,
                render: (val: string, record: any) => {
                  const isLow = isLowRisk(record.riskLevel);
                  if (val && val.trim() !== '') {
                    return (
                      <div className="p-2 rounded bg-amber-50/50 border border-amber-100 text-amber-950 text-xs leading-relaxed">
                        {val}
                      </div>
                    );
                  }
                  if (isLow) {
                    return (
                      <Text type="danger" className="font-bold text-xs">
                        ⚠️ Chưa có nội dung giải trình bắt buộc!
                      </Text>
                    );
                  }
                  return (
                    <Text
                      type="secondary"
                      className="italic text-xs text-gray-400"
                    >
                      Không yêu cầu giải trình
                    </Text>
                  );
                },
              },
            ]}
          />
        </Tabs.TabPane>

        {/* Drawer Tab 3: Timeline history reviews adjustments */}
        <Tabs.TabPane
          tab={`Lịch sử Review (${selectedPlanDetails.revisions?.length || 0})`}
          key="d3"
        >
          {selectedPlanDetails.revisions && selectedPlanDetails.revisions.length > 0 ? (
            <Timeline mode="left" className="mt-4">
              {selectedPlanDetails.revisions.map((rev: any) => (
                <Timeline.Item
                  key={rev.revisionIndex}
                  color="blue"
                  label={
                    <span className="text-[10px] text-gray-400 font-bold block">
                      {new Date(rev.reviewedAt).toLocaleDateString('vi-VN')}
                    </span>
                  }
                >
                  <Card
                    size="small"
                    className="shadow-2xs rounded-xl border-slate-100 bg-slate-50/40 hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <Text className="font-bold text-indigo-900 text-sm">
                        {rev.reviewPeriod}
                      </Text>
                      <Tag
                        color="indigo"
                        className="rounded-md m-0 text-[10px] uppercase font-bold"
                      >
                        Đợt #{rev.revisionIndex}
                      </Tag>
                    </div>
                    <Text type="secondary" className="text-[11px] block mb-2">
                      Được rà soát bởi:{' '}
                      <span className="font-bold text-gray-700">
                        {rev.reviewerName}
                      </span>
                    </Text>
                    {rev.notes && (
                      <Text className="italic block mb-3 text-xs bg-white p-2 border border-slate-100 rounded text-gray-600">
                        "{rev.notes}"
                      </Text>
                    )}

                    <div className="space-y-1.5 mt-2">
                      {rev.changedUnits?.map((change: any, cIdx: number) => (
                        <div
                          key={cIdx}
                          className="text-xs flex items-start gap-1 bg-white p-2 rounded-lg border border-slate-100"
                        >
                          {change.action === 'ADD' && (
                            <Tag color="green" className="m-0 font-bold scale-90 text-[9px]">
                              BỔ SUNG
                            </Tag>
                          )}
                          {change.action === 'REMOVE' && (
                            <Tag color="red" className="m-0 font-bold scale-90 text-[9px]">
                              LOẠI BỎ
                            </Tag>
                          )}
                          {change.action === 'UPDATE' && (
                            <Tag color="blue" className="m-0 font-bold scale-90 text-[9px]">
                              CẬP NHẬT
                            </Tag>
                          )}

                          <div className="flex-1 ml-1 text-[11px]">
                            <span className="font-bold text-gray-800">
                              {change.name}
                            </span>
                            {change.action === 'ADD' && (
                              <span className="text-gray-500 block text-[10px]">
                                Ngày công dự kiến: {change.newValues?.estDays} | KTV:{' '}
                                {change.newValues?.ktvCount}
                              </span>
                            )}
                            {change.action === 'UPDATE' && (
                              <span className="text-gray-500 block text-[10px]">
                                Biến động định biên: Ngày công ({change.oldValues?.estDays}{' '}
                                → {change.newValues?.estDays}) | KTV (
                                {change.oldValues?.ktvCount} →{' '}
                                {change.newValues?.ktvCount})
                              </span>
                            )}
                            {change.reason && (
                              <span className="text-slate-600 block text-[10px] mt-0.5">
                                Lý do thay đổi:{' '}
                                <span className="italic">"{change.reason}"</span>
                              </span>
                            )}
                            {change.nextPeriodPriority && (
                              <span className="text-amber-600 font-bold block text-[10px] mt-0.5">
                                🌟 Chuyển tiếp & Ưu tiên kiểm toán kỳ sau
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Empty
              description="Chưa có đợt rà soát và điều chỉnh kế hoạch năm nào được thực hiện."
              className="my-10"
            />
          )}
        </Tabs.TabPane>
      </Tabs>
    </Drawer>
  );
};
