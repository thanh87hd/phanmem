import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Tabs, Table, Tag, Typography, Row, Col, Statistic, Space, Button, Alert, Divider, Descriptions, message } from 'antd';
import { FilePdfOutlined, FileWordOutlined, FileExcelOutlined, AuditOutlined, CheckCircleOutlined, SafetyCertificateOutlined, SendOutlined } from '@ant-design/icons';
import api from '../../services/api';
import StageGateFooter from './StageGateFooter';

const { Title, Text, Paragraph } = Typography;

interface Phase3ReportingTabProps {
  selectedEngagement: any;
  currentUser: any;
  onOpenStageGateModal?: (targetPhase: 'phase2' | 'phase3' | 'phase4' | 'closed') => void;
}

export const Phase3ReportingTab: React.FC<Phase3ReportingTabProps> = ({
  selectedEngagement,
  currentUser,
  onOpenStageGateModal,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [reports, setReports] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchData = async () => {
    if (!selectedEngagement?.id) return;
    setLoading(true);
    try {
      const [repRes, findRes] = await Promise.all([
        api.get('/audit-reports').catch(() => ({ data: [] })),
        api.get(`/audit-findings?engagementId=${selectedEngagement.id}`).catch(() => ({ data: [] }))
      ]);
      const matchedReports = (repRes.data || []).filter((r: any) => r.engagementId === selectedEngagement.id);
      setReports(matchedReports);
      setFindings(findRes.data || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu báo cáo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEngagement?.id]);

  const activeReport = reports[0] || null;

  const handleExport = async (format: 'word' | 'excel' | 'pdf' | 'summary') => {
    if (!activeReport?.id) {
      message.warning('Chưa có bản ghi Báo cáo kiểm toán cho cuộc KT này');
      return;
    }
    setExporting(format);
    try {
      message.loading({ content: `Đang xuất báo cáo dạng ${format.toUpperCase()}...`, key: 'exporting' });
      let urlEndpoint = `/audit-reports/${activeReport.id}/export/${format}`;
      if (format === 'summary') {
        urlEndpoint = `/audit-reports/${selectedEngagement.id}/export/summary`;
      }
      const response = await api.get(urlEndpoint, { responseType: 'blob' });
      const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'docx';
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_kiem_toan_${selectedEngagement.name || selectedEngagement.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success({ content: 'Đã xuất file thành công', key: 'exporting' });
    } catch (err) {
      message.error({ content: 'Lỗi khi xuất file báo cáo', key: 'exporting' });
    } finally {
      setExporting(null);
    }
  };

  const handleTransition = async (newStatus: string) => {
    if (!activeReport?.id) return;
    try {
      await api.post(`/audit-reports/${activeReport.id}/transition`, { newStatus });
      message.success(`Đã chuyển trạng thái báo cáo sang "${newStatus}"`);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi chuyển trạng thái');
    }
  };

  // Stats calculation
  const criticalCount = findings.filter(f => f.riskLevel === 'Critical').length;
  const highCount = findings.filter(f => f.riskLevel === 'High').length;
  const mediumCount = findings.filter(f => f.riskLevel === 'Medium').length;
  const lowCount = findings.filter(f => f.riskLevel === 'Low').length;

  const overallRating = criticalCount > 0 || highCount >= 3 
    ? { text: '🔴 Không đạt (Unsatisfactory)', color: 'red' }
    : highCount > 0 || mediumCount >= 5 
    ? { text: '🟡 Cần cải thiện (Needs Improvement)', color: 'orange' }
    : { text: '🟢 Đạt yêu cầu (Satisfactory)', color: 'green' };

  const actionColumns = [
    { title: 'Mã phát hiện', dataIndex: 'findingCode', key: 'findingCode', width: 120, render: (val: string) => <Tag color="blue">{val || '-'}</Tag> },
    { title: 'Tiêu đề phát hiện', dataIndex: 'findingTitle', key: 'findingTitle', width: 220, ellipsis: true, render: (val: string) => <span className="font-semibold text-slate-800">{val}</span> },
    { title: 'Mức rủi ro', dataIndex: 'riskLevel', key: 'riskLevel', width: 120, render: (l: string) => <Tag color={l === 'Critical' ? 'magenta' : l === 'High' ? 'red' : 'orange'}>{l || 'Low'}</Tag> },
    { title: 'Khuyến nghị KTNB', dataIndex: 'recommendation', key: 'recommendation', width: 240, ellipsis: true },
    { title: 'Ý kiến giải trình của ĐVĐKT', dataIndex: 'managementResponse', key: 'managementResponse', width: 240, ellipsis: true, render: (val: string) => val || <Text type="secondary" className="italic">Chưa có phản hồi</Text> },
    { title: 'Kế hoạch hành động cam kết', dataIndex: 'actionPlan', key: 'actionPlan', width: 240, ellipsis: true, render: (val: string) => val || <Text type="secondary" className="italic">Chưa có kế hoạch</Text> },
  ];

  return (
    <div className="space-y-4">
      <Tabs
        type="card"
        className="mt-2"
      items={[
        {
          key: 'draft-report',
          label: <span className="font-medium">3.1. Dự thảo Báo cáo KT & Xếp hạng (IIA 2410/2420)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <Title level={5} className="!mb-1">Báo cáo Kiểm toán Nội bộ Chính thức</Title>
                  <Text type="secondary">Tổng hợp kết quả kiểm toán, xếp hạng rủi ro tổng thể và ý kiến kết luận của KTNB (IIA Standard 2410).</Text>
                </div>
                <Space>
                  <Button icon={<FileWordOutlined />} loading={exporting === 'word'} onClick={() => handleExport('word')} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                    Xuất Word
                  </Button>
                  <Button icon={<FilePdfOutlined />} loading={exporting === 'pdf'} onClick={() => handleExport('pdf')} className="text-red-600 border-red-200 hover:bg-red-50">
                    Xuất PDF
                  </Button>
                  <Button icon={<FileExcelOutlined />} loading={exporting === 'excel'} onClick={() => handleExport('excel')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    Xuất Excel
                  </Button>
                  <Button type="primary" icon={<AuditOutlined />} onClick={() => navigate('/audit-reports', { state: { engagementId: selectedEngagement.id } })}>
                    Mở Phân hệ Báo cáo
                  </Button>
                </Space>
              </div>

              <Row gutter={16} className="mb-6">
                <Col span={6}>
                  <Card size="small" className="bg-slate-50 border-slate-200 text-center">
                    <Statistic title="Xếp hạng Cuộc KT" value={overallRating.text} valueStyle={{ fontSize: 16, fontWeight: 700 }} />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small" className="bg-red-50 border-red-200 text-center">
                    <Statistic title="Critical" value={criticalCount} valueStyle={{ color: '#cf1322', fontWeight: 700 }} />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small" className="bg-orange-50 border-orange-200 text-center">
                    <Statistic title="High" value={highCount} valueStyle={{ color: '#d46b08', fontWeight: 700 }} />
                  </Card>
                </Col>
                <Col span={5}>
                  <Card size="small" className="bg-amber-50 border-amber-200 text-center">
                    <Statistic title="Medium" value={mediumCount} valueStyle={{ color: '#d48806', fontWeight: 700 }} />
                  </Card>
                </Col>
                <Col span={5}>
                  <Card size="small" className="bg-green-50 border-green-200 text-center">
                    <Statistic title="Low" value={lowCount} valueStyle={{ color: '#389e0d', fontWeight: 700 }} />
                  </Card>
                </Col>
              </Row>

              <Descriptions bordered column={2} size="small" className="mb-4">
                <Descriptions.Item label="Cuộc kiểm toán">{selectedEngagement.name}</Descriptions.Item>
                <Descriptions.Item label="Đơn vị được kiểm toán">{selectedEngagement.auditedDepartment || selectedEngagement.branchName || 'ĐVĐKT'}</Descriptions.Item>
                <Descriptions.Item label="Trưởng đoàn kiểm toán">{selectedEngagement.leadAuditor || 'Chưa phân công'}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái Báo cáo">
                  <Tag color={activeReport?.status === 'Issued' ? 'success' : activeReport?.status === 'Reviewed' ? 'processing' : 'default'} className="font-bold">
                    {activeReport?.status || 'Draft'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tóm tắt dành cho Lãnh đạo (Executive Summary)" span={2}>
                  {activeReport?.executiveSummary || `Cuộc kiểm toán đã hoàn tất công tác thực địa tại ${selectedEngagement.auditedDepartment || 'Đơn vị'}. Đã ghi nhận tổng cộng ${findings.length} phát hiện kiểm toán (${criticalCount} Critical, ${highCount} High, ${mediumCount} Medium, ${lowCount} Low). Đoàn kiểm toán đề nghị Ban Lãnh đạo chỉ đạo các phòng ban liên quan khẩn trương khắc phục theo đúng hạn cam kết.`}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )
        },
        {
          key: 'management-response',
          label: <span className="font-medium">3.2. Ý kiến giải trình & Kế hoạch hành động Ban QL (IIA 2410.A1)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="mb-4">
                <Title level={5} className="!mb-1">Phản hồi của Ban Quản lý & Kế hoạch hành động (Management Response & Action Plans)</Title>
                <Text type="secondary">Thu thập ý kiến đồng thuận hoặc giải trình, cam kết người chịu trách nhiệm và hạn chót hoàn thành từ ĐVĐKT.</Text>
              </div>
              <Table 
                columns={actionColumns} 
                dataSource={findings} 
                rowKey="id" 
                loading={loading} 
                pagination={{ pageSize: 5 }} 
                scroll={{ x: 1180 }}
              />
            </Card>
          )
        },
        {
          key: 'approval-release',
          label: <span className="font-medium">3.3. Soát xét, Phê duyệt CAE & Phát hành (IIA 2440)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="mb-4">
                <Title level={5} className="!mb-1">Quy trình Soát xét, Phê duyệt & Phân phối Báo cáo</Title>
                <Text type="secondary">Trưởng đoàn soát xét $\rightarrow$ Trưởng Ban KTNB phê duyệt và ký số phát hành chính thức (IIA Standard 2440).</Text>
              </div>
              <Divider />

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
                <Row gutter={24} align="middle">
                  <Col span={16}>
                    <Title level={5} className="!mb-1">Trạng thái Báo cáo hiện tại: <Tag color="blue" className="text-sm px-3 py-1 font-bold">{activeReport?.status || 'Draft'}</Tag></Title>
                    <Paragraph type="secondary" className="!mb-0">
                      Nơi nhận báo cáo chính thức theo quy định: Hội đồng Quản trị, Ban Kiểm soát, Tổng Giám đốc, Ban Lãnh đạo Đơn vị được kiểm toán.
                    </Paragraph>
                  </Col>
                  <Col span={8} className="text-right">
                    <Space wrap>
                      {(!activeReport || activeReport.status === 'Draft') && (
                        <Button type="primary" icon={<SendOutlined />} onClick={() => handleTransition('PendingReview')} className="bg-amber-600 hover:bg-amber-700">
                          Trình Trưởng đoàn Soát xét
                        </Button>
                      )}
                      {activeReport?.status === 'PendingReview' && (
                        <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleTransition('Reviewed')} className="bg-blue-600 hover:bg-blue-700">
                          Xác nhận Soát xét OK
                        </Button>
                      )}
                      {activeReport?.status === 'Reviewed' && (
                        <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={() => handleTransition('Issued')} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                          Phê duyệt & Phát hành Báo cáo
                        </Button>
                      )}
                    </Space>
                  </Col>
                </Row>
              </div>

              <div className="text-center py-6">
                <Button 
                  size="large" 
                  icon={<AuditOutlined />} 
                  onClick={() => navigate('/audit-reports', { state: { engagementId: selectedEngagement.id } })}
                  className="rounded-xl shadow-sm font-semibold"
                >
                  Mở màn hình Báo cáo kiểm toán chuyên sâu & Ký số điện tử
                </Button>
              </div>
            </Card>
          )
        }
      ]}
    />
    <StageGateFooter
      currentPhaseKey="phase3"
      engagementStatus={selectedEngagement?.status || 'Planning'}
      responsibleRole="Trưởng đoàn kiểm toán & Lãnh đạo KTNB (CAE)"
      assignedPersonnel={`${selectedEngagement?.leadAuditorUser?.fullName || selectedEngagement?.legacyLeadAuditor || 'Trưởng đoàn'} & Ban Lãnh đạo KTNB`}
      nextPhaseTitle="Giai đoạn 4: Theo dõi & Đóng cuộc KT (IIA 2500 & 1300)"
      onTriggerNextGate={() => onOpenStageGateModal?.('phase4')}
      canProceed={true}
    />
  </div>
  );
};
export default Phase3ReportingTab;
