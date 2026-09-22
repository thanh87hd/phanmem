import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Space, Typography, Card, Tag, 
  message, Row, Col, Progress, List, Alert, Divider, Badge, Popconfirm, Tooltip,
  Modal, DatePicker, Statistic, Empty
} from 'antd';
import {
  SearchOutlined, WarningOutlined, ExperimentOutlined,
  SafetyCertificateOutlined, ReloadOutlined, 
  ArrowRightOutlined, ToolOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useCurrentUser } from '../utils/useCurrentUser';

const { Title, Text, Paragraph } = Typography;

interface Loophole {
  id: number;
  title: string;
  count: number;
  category: string;
  riskLevel: string;
  loopholeType: string;
  aiRecommendation: string;
  severity: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  metadata?: { engagement: string; date: string }[];
}

const ProcessAnalysis: React.FC = () => {
  const { t } = useTranslation();

  const [data, setData] = useState<Loophole[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const user = useCurrentUser();
  const isPrivileged = user.role?.includes(t('auditEngagements.cols.leadAuditor', 'Trưởng đoàn')) || user.role?.includes(t('processAnalysis.headOfDepartment', 'Trưởng phòng')) || user.role?.includes(t('processAnalysis.prefect', 'Trưởng Ban')) || user.role?.includes('Admin');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/process-loopholes');
      setData(res.data);
    } catch {
      message.error(t('processAnalysis.messages.loadError', 'Không thể thực hiện phân tích lỗ hổng'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (date: any) => {
    if (!date) return;
    setReportLoading(true);
    try {
      const res = await api.get('/ai/monthly-report', {
        params: { year: date.year(), month: date.month() + 1 }
      });
      setReportData(res.data);
    } catch {
      message.error(t('processAnalysis.messages.reportError', 'Lỗi khi tạo báo cáo'));
    } finally {
      setReportLoading(false);
    }
  };

  const runDetection = async () => {
    setLoading(true);
    try {
      await api.post('/ai/process-loopholes/run');
      message.success(t('processAnalysis.messages.scanSuccess', 'AI đã hoàn tất quét dữ liệu mới'));
      fetchData();
    } catch {
      message.error(t('processAnalysis.messages.scanError', 'Lỗi khi quét dữ liệu'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/ai/process-loopholes/${id}/approve`, { approver: user.fullName || user.username });
      message.success(t('processAnalysis.messages.approveSuccess', 'Đã phê duyệt cảnh báo và gửi tới Trưởng Ban'));
      fetchData();
    } catch {
      message.error(t('auditCommitteePortal.messages.approveError', 'Lỗi khi phê duyệt'));
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post(`/ai/process-loopholes/${id}/reject`);
      message.success(t('processAnalysis.messages.rejectSuccess', 'Đã từ chối cảnh báo'));
      fetchData();
    } catch {
      message.error(t('processAnalysis.messages.rejectError', 'Lỗi khi từ chối'));
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return '#f5222d';
      case 'High': return '#fa8c16';
      case 'Medium': return '#ea9105';
      default: return '#52c41a';
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Approved': return <Tag color="success" icon={<CheckCircleOutlined />}>{t('auditCommitteePortal.table.approved', 'Đã phê duyệt')}</Tag>;
      case 'Rejected': return <Tag color="error" icon={<CloseCircleOutlined />}>{t('workingPapers.status.Rejected', 'Từ chối')}</Tag>;
      default: return <Tag color="processing" icon={<SyncOutlined spin />}>{t('riskAssessment.auditPlan.status.pending', 'Chờ phê duyệt')}</Tag>;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ExperimentOutlined style={{ marginRight: 8, color: '#eb2f96' }} />
            {t('processAnalysis.title', 'AI Gap Analysis — Phân tích Lỗ hổng Quy trình')}
          </Title>
          <Text type="secondary">{t('processAnalysis.subtitle', 'AI tự động quét các sai phạm lặp lại để phát hiện điểm yếu trong hệ thống kiểm soát')}</Text>
        </div>
        <Space>
          <Button icon={<FilePdfOutlined />} onClick={() => setIsReportModalOpen(true)}>
            {t('processAnalysis.btnMonthlyReport', 'Báo cáo tháng')}
          </Button>
          <Button icon={<SearchOutlined />} type="primary" onClick={runDetection} loading={loading}>
            {t('processAnalysis.btnAiScan', 'AI Scan & Phát hiện')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>{t('auditTrail.btnRefresh', 'Làm mới')}</Button>
        </Space>
      </div>

      {isPrivileged && (
        <Alert
          message={t('processAnalysis.privilegedAlertTitle', 'Chế độ Lãnh đạo/Quản lý')}
          description={t('processAnalysis.privilegedAlertDesc', 'Bạn có quyền phê duyệt các cảnh báo từ AI trước khi gửi tới cấp cao nhất.')}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[24, 24]}>
        {data.map((item, index) => (
          <Col span={24} key={index}>
            <Card 
              hoverable 
              style={{ borderLeft: `6px solid ${getSeverityColor(item.severity)}`, opacity: item.status === 'Rejected' ? 0.6 : 1 }}
              extra={getStatusTag(item.status)}
            >
              <Row gutter={16}>
                <Col span={16}>
                  <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                    <Space>
                      <Badge status={item.severity === 'Critical' ? 'error' : 'warning'} />
                      <Text strong style={{ fontSize: 16 }}>{item.title}</Text>
                      <Tag color={getSeverityColor(item.severity)}>{item.severity}</Tag>
                    </Space>
                    <Text type="secondary">{item.loopholeType}</Text>
                    
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary">{t('processAnalysis.loopholeFrequency', 'Tần suất xuất hiện:')}</Text>
                      <Progress 
                        percent={item.count * 20} 
                        size="small" 
                        status={item.count >= 5 ? 'exception' : 'active'}
                        format={() => `${item.count} lần`}
                        style={{ width: 200, marginLeft: 8 }}
                      />
                    </div>

                    <div style={{ marginTop: 16, padding: '12px', background: '#f6ffed', borderRadius: '4px', border: '1px solid #b7eb8f' }}>
                      <Space align="start">
                        <ToolOutlined style={{ color: '#52c41a', marginTop: 4 }} />
                        <div>
                          <Text strong>{t('processAnalysis.aiRecLabel', 'Đề xuất điều chỉnh quy trình từ AI:')}</Text>
                          <Paragraph style={{ margin: 0 }}>{item.aiRecommendation}</Paragraph>
                        </div>
                      </Space>
                    </div>

                    {item.status === 'Approved' && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" italic style={{ fontSize: 12 }}>
                          ✅ Đã duyệt bởi {item.approvedBy} lúc {new Date(item.approvedAt!).toLocaleString()}
                        </Text>
                      </div>
                    )}

                    {item.status === 'Pending' && isPrivileged && (
                      <div style={{ marginTop: 16 }}>
                        <Space>
                          <Popconfirm title={t('processAnalysis.confirmApprove', 'Phê duyệt cảnh báo này?')} onConfirm={() => handleApprove(item.id)}>
                            <Button type="primary" size="small" icon={<CheckCircleOutlined />}>{t('processAnalysis.btnApprove', 'Phê duyệt & Gửi Trưởng Ban')}</Button>
                          </Popconfirm>
                          <Popconfirm title={t('processAnalysis.confirmReject', 'Từ chối cảnh báo này?')} onConfirm={() => handleReject(item.id)} okButtonProps={{ danger: true }}>
                            <Button danger size="small" icon={<CloseCircleOutlined />}>{t('workingPapers.status.Rejected', 'Từ chối')}</Button>
                          </Popconfirm>
                        </Space>
                      </div>
                    )}
                  </Space>
                </Col>
                
                <Col span={8} style={{ borderLeft: '1px solid #f0f0f0' }}>
                  <Text strong>{t('processAnalysis.affectedAudits', 'Các cuộc kiểm toán bị ảnh hưởng:')}</Text>
                  <List
                    size="small"
                    dataSource={item.metadata}
                    renderItem={(occ: any) => (
                      <List.Item>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 500 }}>{occ.engagement}</div>
                          <Text type="secondary">{new Date(occ.date).toLocaleDateString()}</Text>
                        </div>
                      </List.Item>
                    )}
                    style={{ marginTop: 8 }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
        {data.length === 0 && !loading && (
          <Col span={24}>
            <Card><Empty description="Chưa có lỗ hổng quy trình nào được AI phát hiện. Nhấn 'AI Scan' để bắt đầu." /></Card>
          </Col>
        )}
      </Row>

      <Modal
        title={<span><FilePdfOutlined /> {t('processAnalysis.reportModalTitle', 'Báo cáo Tổng hợp Lỗ hổng Quy trình Hàng tháng')}</span>}
        open={isReportModalOpen}
        onCancel={() => setIsReportModalOpen(false)}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 24 }}>
          <Text>{t('processAnalysis.selectMonthLabel', 'Chọn tháng báo cáo:')} </Text>
          <DatePicker 
            picker="month" 
            onChange={handleGenerateReport} 
            placeholder={t('processAnalysis.selectMonthPlaceholder', 'Chọn tháng/năm')}
            style={{ marginLeft: 8 }}
          />
        </div>

        {reportLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}><SyncOutlined spin style={{ fontSize: 24 }} /></div>
        ) : reportData ? (
          <div>
            <Divider />
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={4}>{t('processAnalysis.reportMainTitle', 'BÁO CÁO PHÂN TÍCH LỖ HỔNG QUY TRÌNH HỆ THỐNG')}</Title>
              <Text>Tháng báo cáo: {reportData.period || reportData.reportMonth}</Text>
            </div>

            <Row gutter={16} style={{ marginBottom: 32 }}>
              <Col span={6}>
                <Card>
                  <Statistic title={t('processAnalysis.statsTotal', 'Tổng số lỗ hổng')} value={reportData.stats?.totalApproved ?? 0} prefix={<WarningOutlined />} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title={t('processAnalysis.statsCritical', 'Mức Critical')} value={reportData.stats?.criticalCount ?? 0} valueStyle={{ color: '#cf1322' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title={t('processAnalysis.statsHigh', 'Mức High')} value={reportData.stats?.highCount ?? 0} valueStyle={{ color: '#d46b08' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title={t('auditCommitteePortal.table.approved', 'Đã phê duyệt')} 
                    value={(reportData.stats?.totalApproved || 0) > 0 ? '100%' : '0%'} 
                    suffix={<CheckCircleOutlined />} 
                    valueStyle={{ color: (reportData.stats?.totalApproved || 0) > 0 ? '#3f8600' : '#8c8c8c' }} 
                  />
                </Card>
              </Col>
            </Row>

            <Title level={5}>{t('processAnalysis.reportTableTitle', 'Chi tiết các lỗ hổng đã được xác nhận:')}</Title>
            <Table 
              dataSource={reportData.loopholes || reportData.data || []} 
              rowKey="id"
              pagination={false}
              columns={[
                { title: t('processAnalysis.cols.title', 'Tên sai phạm lặp lại'), dataIndex: 'title', key: 'title' },
                { title: t('processAnalysis.cols.type', 'Phân loại AI'), dataIndex: 'loopholeType', key: 'loopholeType' },
                { title: t('riskAssessment.kriDashboard.compare.severity', 'Mức độ'), dataIndex: 'severity', render: (s) => <Tag color={getSeverityColor(s)}>{s}</Tag> },
                { title: t('processAnalysis.cols.count', 'Số lần'), dataIndex: 'count', key: 'count' },
                { title: t('processAnalysis.cols.date', 'Ngày duyệt'), dataIndex: 'approvedAt', render: (d) => d ? new Date(d).toLocaleDateString() : 'N/A' }
              ]}
            />

            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center', width: 200 }}>
                <Text strong>{t('processAnalysis.reportUserSign', 'Người lập báo cáo')}</Text><br /><br /><br />
                <Text italic>{t('processAnalysis.reportUserSignSub', 'Hệ thống AI Assistant')}</Text>
              </div>
              <div style={{ textAlign: 'center', width: 200 }}>
                <Text strong>{t('processAnalysis.reportLeaderSign', 'Trưởng Ban KTNB')}</Text><br /><br /><br />
                <Text>{t('processAnalysis.reportLeaderSignSub', '(Ký tên)')}</Text>
              </div>
            </div>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
               <Button type="primary" icon={<FilePdfOutlined />} onClick={() => window.print()}>{t('processAnalysis.btnDownloadPdf', 'Tải xuống PDF')}</Button>
            </div>
          </div>
        ) : (
          <Empty description={t('processAnalysis.selectMonthPrompt', 'Vui lòng chọn tháng để xem báo cáo tổng hợp.')} />
        )}
      </Modal>
    </div>
  );
};

export default ProcessAnalysis;
