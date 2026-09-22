import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Tabs, Table, Tag, Typography, Progress, Button, Space, Row, Col, Checkbox, Alert, Descriptions, Statistic, message, Divider } from 'antd';
import { CheckCircleOutlined, SafetyOutlined, LockOutlined, SendOutlined, FileDoneOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { hasPermission } from '../../utils/permission';
import StageGateFooter from './StageGateFooter';

const { Title, Text, Paragraph } = Typography;

interface Phase4ClosureTabProps {
  selectedEngagement: any;
  setSelectedEngagement: React.Dispatch<React.SetStateAction<any>>;
  currentUser: any;
  workstreams: any[];
  fetchEngagements: () => Promise<void>;
  onOpenStageGateModal?: (targetPhase: 'phase2' | 'phase3' | 'phase4' | 'closed') => void;
}

export const Phase4ClosureTab: React.FC<Phase4ClosureTabProps> = ({
  selectedEngagement,
  setSelectedEngagement,
  currentUser,
  workstreams,
  fetchEngagements,
  onOpenStageGateModal,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [workingPapers, setWorkingPapers] = useState<any[]>([]);
  const [closing, setClosing] = useState(false);

  // QA Checklist items state
  const [qaChecks, setQaChecks] = useState<Record<string, boolean>>({
    qa1: true,
    qa2: true,
    qa3: true,
    qa4: true,
    qa5: true,
    qa6: true,
  });

  const fetchRecommendations = async () => {
    if (!selectedEngagement?.id) return;
    setLoadingRecs(true);
    try {
      const [recRes, wpRes] = await Promise.all([
        api.get(`/recommendations?engagementId=${selectedEngagement.id}`).catch(() => ({ data: [] })),
        api.get(`/working-papers?engagementId=${selectedEngagement.id}`).catch(() => ({ data: [] }))
      ]);
      setRecommendations(recRes.data || []);
      setWorkingPapers(wpRes.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách kiến nghị:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [selectedEngagement?.id]);

  const handleCloseWorkspace = async () => {
    setClosing(true);
    try {
      await api.post(`/audit-engagements/${selectedEngagement.id}/close`, {
        notes: 'Đóng cuộc kiểm toán và niêm phong hồ sơ lưu trữ điện tử theo chuẩn IIA.',
      });
      message.success('🌟 Đã hoàn thành và đóng hồ sơ cuộc kiểm toán thành công!');
      fetchEngagements();
      const res = await api.get(`/audit-engagements/${selectedEngagement.id}`);
      setSelectedEngagement(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể đóng workspace');
    } finally {
      setClosing(false);
    }
  };

  // Pre-close validation checks
  const allWorkstreamsReviewed = workstreams.length > 0 && workstreams.every(w => w.status === 'Reviewed');
  const allWpApproved = workingPapers.length > 0 && workingPapers.every(w => w.status === 'Approved');
  const isReadyToClose = allWorkstreamsReviewed || selectedEngagement.workspaceStatus === 'ReadyToClose';

  const recColumns = [
    { title: 'Mã kiến nghị', dataIndex: 'id', key: 'id', width: 120, render: (val: number) => <Tag color="blue">KN-{val}</Tag> },
    { title: 'Nội dung Kiến nghị', dataIndex: 'title', key: 'title', width: 320, ellipsis: true, render: (val: string) => <span className="font-semibold text-slate-800">{val}</span> },
    { 
      title: 'Trạng thái khắc phục', 
      dataIndex: 'status', 
      key: 'status',
      width: 160,
      render: (st: string) => {
        const color = st === 'Completed' ? 'green' : st === 'InProgress' ? 'blue' : st === 'Overdue' ? 'red' : 'default';
        const label = st === 'Completed' ? 'Đã hoàn thành' : st === 'InProgress' ? 'Đang thực hiện' : st === 'Overdue' ? 'Quá hạn' : 'Chưa bắt đầu';
        return <Tag color={color} className="font-semibold">{label}</Tag>;
      }
    },
    { 
      title: 'Tiến độ', 
      dataIndex: 'progress', 
      key: 'progress',
      width: 160,
      render: (val: number) => <Progress percent={val || 0} size="small" style={{ width: 120 }} />
    },
    { title: 'Hạn xử lý (SLA)', dataIndex: 'dueDate', key: 'dueDate', width: 130, render: (val: string) => val ? <span className="text-xs">{val}</span> : '-' },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      fixed: 'right' as const,
      render: () => (
        <Button type="link" onClick={() => navigate('/recommendations')}>
          Theo dõi chi tiết
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Tabs
        type="card"
        className="mt-2"
      items={[
        {
          key: 'remediation',
          label: <span className="font-medium">4.1. Theo dõi thực hiện Kiến nghị (IIA 2500)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <Title level={5} className="!mb-1">Giám sát Khắc phục Kiến nghị & Theo dõi SLA (IIA Standard 2500)</Title>
                  <Text type="secondary">Theo dõi tiến độ khắc phục từ Đơn vị được kiểm toán, xác nhận bằng chứng và đánh giá việc hoàn thành.</Text>
                </div>
                <Button type="primary" icon={<SendOutlined />} onClick={() => navigate('/recommendations')}>
                  Mở Phân hệ Kiến nghị
                </Button>
              </div>
              <Table 
                columns={recColumns} 
                dataSource={recommendations} 
                rowKey="id" 
                loading={loadingRecs} 
                pagination={{ pageSize: 5 }} 
                scroll={{ x: 1020 }}
              />
            </Card>
          )
        },
        {
          key: 'qaip',
          label: <span className="font-medium">4.2. Đánh giá Chất lượng Cuộc KT - QAIP (IIA 1300)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="mb-4">
                <Title level={5} className="!mb-1">Kiểm soát Chất lượng Cuộc kiểm toán (Engagement Quality Checklist)</Title>
                <Text type="secondary">Đánh giá mức độ tuân thủ Chuẩn mực Kiểm toán Nội bộ Quốc tế (IIA Standard 1300 & Global Standard 15.4).</Text>
              </div>
              <Divider />
              <div className="space-y-4 max-w-3xl">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Checkbox 
                    checked={qaChecks.qa1} 
                    onChange={e => setQaChecks(prev => ({ ...prev, qa1: e.target.checked }))}
                    className="font-medium text-slate-700"
                  >
                    1. Mục tiêu và phạm vi kiểm toán được xác định rõ ràng, có căn cứ rủi ro và được phê duyệt hợp lệ (IIA Standard 2210/2220).
                  </Checkbox>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Checkbox 
                    checked={qaChecks.qa2} 
                    onChange={e => setQaChecks(prev => ({ ...prev, qa2: e.target.checked }))}
                    className="font-medium text-slate-700"
                  >
                    2. Kiểm toán viên cam kết tính độc lập khách quan và không có xung đột lợi ích phát sinh (IIA Standard 1130).
                  </Checkbox>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Checkbox 
                    checked={qaChecks.qa3} 
                    onChange={e => setQaChecks(prev => ({ ...prev, qa3: e.target.checked }))}
                    className="font-medium text-slate-700"
                  >
                    3. 100% Giấy tờ làm việc (Working Papers) có bằng chứng đầy đủ, đáng tin cậy và được Trưởng đoàn soát xét kỹ lưỡng (IIA Standard 2330/2340).
                  </Checkbox>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Checkbox 
                    checked={qaChecks.qa4} 
                    onChange={e => setQaChecks(prev => ({ ...prev, qa4: e.target.checked }))}
                    className="font-medium text-slate-700"
                  >
                    4. Phát hiện kiểm toán được xây dựng chuẩn mực theo cấu trúc 5C (Hiện trạng, Tiêu chuẩn, Nguyên nhân, Hậu quả, Khuyến nghị) (IIA Standard 2320).
                  </Checkbox>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Checkbox 
                    checked={qaChecks.qa5} 
                    onChange={e => setQaChecks(prev => ({ ...prev, qa5: e.target.checked }))}
                    className="font-medium text-slate-700"
                  >
                    5. Các phát hiện và khuyến nghị đã được trao đổi, thống nhất và có cam kết thời hạn khắc phục từ Ban Lãnh đạo ĐVĐKT (IIA Standard 2410.A1).
                  </Checkbox>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Checkbox 
                    checked={qaChecks.qa6} 
                    onChange={e => setQaChecks(prev => ({ ...prev, qa6: e.target.checked }))}
                    className="font-medium text-slate-700"
                  >
                    6. Báo cáo kiểm toán chính thức được phát hành đúng hạn cam kết và gửi đến đúng đối tượng theo thẩm quyền (IIA Standard 2440).
                  </Checkbox>
                </div>
              </div>
            </Card>
          )
        },
        {
          key: 'archive',
          label: <span className="font-medium">4.3. Tổng kết & Đóng hồ sơ cuộc KT (Wrap-up)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="mb-4">
                <Title level={5} className="!mb-1">Tổng kết & Đóng Hồ sơ Cuộc kiểm toán</Title>
                <Text type="secondary">Xác nhận các điều kiện tiên quyết trước khi niêm phong lưu trữ điện tử và kết thúc cuộc kiểm toán.</Text>
              </div>
              <Divider />

              <Row gutter={24} className="mb-6">
                <Col span={12}>
                  <Card size="small" className="bg-slate-50 border-slate-200">
                    <Title level={5} className="!mb-3 text-slate-700">📋 Bảng kiểm tra điều kiện đóng cuộc KT</Title>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span>1. Tất cả Phần hành (Workstreams) đã Reviewed:</span>
                        <Tag color={allWorkstreamsReviewed ? 'success' : 'warning'} className="font-bold">
                          {workstreams.filter(w => w.status === 'Reviewed').length}/{workstreams.length} Reviewed
                        </Tag>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span>2. Giấy tờ làm việc (W/P) đã Approved:</span>
                        <Tag color={allWpApproved ? 'success' : 'warning'} className="font-bold">
                          {workingPapers.filter(w => w.status === 'Approved').length}/{workingPapers.length} Approved
                        </Tag>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span>3. Biên bản kiểm toán thực địa (MB04):</span>
                        <Tag color="success" className="font-bold">Đã hoàn thành</Tag>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span>4. Trạng thái Workspace hiện tại:</span>
                        <Tag color={selectedEngagement.workspaceStatus === 'Closed' ? 'purple' : 'orange'} className="font-bold">
                          {selectedEngagement.workspaceStatus || 'Open'}
                        </Tag>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 h-full flex flex-col justify-between">
                    <div>
                      <Title level={5} className="!text-indigo-900 !mb-2">🔒 Niêm phong & Lưu trữ Hồ sơ Điện tử</Title>
                      <Paragraph className="text-slate-600 text-xs">
                        Khi đóng cuộc kiểm toán, toàn bộ hồ sơ điện tử (Quyết định, Đề cương, Giấy tờ làm việc, Bằng chứng, Phát hiện, Báo cáo và Biên bản) sẽ được khóa quyền chỉnh sửa (Read-only) và lưu vết toàn vẹn (Audit Trail) phục vụ công tác thanh tra, giám sát của Ban Kiểm soát và NHNN.
                      </Paragraph>
                    </div>
                    <div>
                      {selectedEngagement.workspaceStatus === 'Closed' || selectedEngagement.status === 'Completed' ? (
                        <Alert message="✅ Cuộc kiểm toán đã được đóng và niêm phong lưu trữ chính thức." type="success" showIcon />
                      ) : (
                        <Button 
                          type="primary" 
                          danger 
                          icon={<LockOutlined />} 
                          size="large"
                          loading={closing}
                          onClick={handleCloseWorkspace}
                          className="w-full font-bold h-12 rounded-xl"
                        >
                          Khóa hồ sơ & Đóng cuộc kiểm toán
                        </Button>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          )
        }
      ]}
    />
    <StageGateFooter
      currentPhaseKey="phase4"
      engagementStatus={selectedEngagement?.status || 'Planning'}
      responsibleRole="KTV theo dõi kiến nghị & Cán bộ Đảm bảo chất lượng (QAIP Lead)"
      assignedPersonnel="KTV Giám sát & Tổ kiểm soát chất lượng QAIP"
      nextPhaseTitle="Đóng & Lưu trữ Số hóa Hồ sơ kiểm toán"
      onTriggerNextGate={handleCloseWorkspace}
      canProceed={selectedEngagement?.workspaceStatus !== 'Closed'}
    />
  </div>
  );
};
export default Phase4ClosureTab;
