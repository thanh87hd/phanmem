import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Typography, Card, Form, Switch, InputNumber, Row, Col, Tag, message, Steps, Checkbox, Collapse, Progress, Spin, Badge, Space, Tooltip, Tabs, Modal, Select, Rate, DatePicker, Input, Slider, Popconfirm } from 'antd';
import { MailOutlined, SafetyOutlined, BellOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, TrophyOutlined, PlusOutlined, StarOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const { Title, Text, Paragraph } = Typography;

const QualityControl: React.FC = () => {
  const { t } = useTranslation();

  const [form] = Form.useForm();
  const [qaReviews, setQaReviews] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('1');
  const [eqas, setEqas] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [surveyStats, setSurveyStats] = useState({ averageScore: 0, count: 0 });

  const [isEqaVisible, setIsEqaVisible] = useState(false);
  const [isSurveyVisible, setIsSurveyVisible] = useState(false);
  const [eqaForm] = Form.useForm();
  const [surveyForm] = Form.useForm();

  const [departments, setDepartments] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [auditUniverseList, setAuditUniverseList] = useState<any[]>([]);

  // F16 quality assessments state
  const [assessments, setAssessments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    averageScore: 0,
    totalAssessed: 0,
    ratingDistribution: { Excellent: 0, Good: 0, 'Needs Improvement': 0, Unsatisfactory: 0 },
    criteriaAverages: { planning: 0, execution: 0, reporting: 0, documentation: 0 }
  });
  const [isAssessmentVisible, setIsAssessmentVisible] = useState(false);
  const [assessmentForm] = Form.useForm();
  const [realtimeScore, setRealtimeScore] = useState<number>(80);
  const [realtimeRating, setRealtimeRating] = useState<string>(t('qualityControl.good', 'Tốt'));

  const handleCreateEqa = async () => {
    try {
      const values = await eqaForm.validateFields();
      await api.post('/qaip/eqa', {
        ...values,
        dateConducted: values.dateConducted?.format?.('YYYY-MM-DD') || values.dateConducted,
        nextDueDate: values.nextDueDate?.format?.('YYYY-MM-DD') || values.nextDueDate,
      });
      message.success(t('qualityControl.successfulResultsOfEqaQualityAssessment', 'Đã ghi nhận kết quả đánh giá chất lượng EQA thành công!'));
      setIsEqaVisible(false);
      eqaForm.resetFields();
       
      // eslint-disable-next-line react-hooks/immutability
      fetchAll();
    } catch {
      message.error(t('qualityControl.errorSavingEqaResults', 'Lỗi khi lưu kết quả EQA'));
    }
  };

  const handleCreateSurvey = async () => {
    try {
      const values = await surveyForm.validateFields();
      await api.post('/qaip/surveys', values);
      message.success(t('qualityControl.csatSurveyResponseSuccessfullySubmitted', 'Đã gửi phản hồi khảo sát CSAT thành công!'));
      setIsSurveyVisible(false);
      surveyForm.resetFields();
       
       
      fetchAll();
    } catch {
      message.error(t('qualityControl.errorSendingSurveyResponse', 'Lỗi khi gửi phản hồi khảo sát'));
    }
  };

  const handleCreateAssessment = async () => {
    try {
      const values = await assessmentForm.validateFields();
      const eng = engagements.find(e => e.id === values.engagementId);
      const payload = {
        engagementId: values.engagementId,
        engagementName: eng ? eng.name : t('qualityControl.auditTeam', 'Đoàn kiểm toán'),
        assessorName: values.assessorName,
        assessmentDate: values.assessmentDate?.format?.('YYYY-MM-DD') || values.assessmentDate,
        criteriaScores: {
          planning: values.planning,
          execution: values.execution,
          reporting: values.reporting,
          documentation: values.documentation,
        },
        criteriaComments: {
          planning: values.planningComment,
          execution: values.executionComment,
          reporting: values.reportingComment,
          documentation: values.documentationComment,
        },
        generalComment: values.generalComment,
      };

      await api.post('/quality-reviews/assessments', payload);
      message.success(t('qualityControl.successfullySavedTheResultsOfCtkt', 'Đã lưu kết quả đánh giá chất lượng CTKT thành công!'));
      setIsAssessmentVisible(false);
      assessmentForm.resetFields();
      setRealtimeScore(80);
      setRealtimeRating(t('qualityControl.good', 'Tốt'));
       
       
      fetchAll();
    } catch {
      message.error(t('scoringTab.messages.saveError', 'Lỗi khi lưu kết quả đánh giá'));
    }
  };

  const handleDeleteAssessment = async (id: number) => {
    try {
      await api.delete(`/quality-reviews/assessments/${id}`);
      message.success(t('qualityControl.qualityRatingSuccessfullyRemoved', 'Đã xóa đánh giá chất lượng thành công!'));
       
       
      fetchAll();
    } catch {
      message.error(t('scoringTab.messages.deleteError', 'Lỗi khi xóa đánh giá'));
    }
  };

  const handleExportMB05 = async (id: number) => {
    try {
      message.loading({ content: 'Đang xuất phiếu Đánh giá...', key: 'exportMB05' });
      const response = await api.get(`/quality-reviews/assessments/${id}/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Phieu_Danh_gia_MB05_${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success({ content: 'Đã tải phiếu Đánh giá MB05', key: 'exportMB05' });
    } catch (error) {
      message.error({ content: 'Lỗi khi xuất phiếu Đánh giá MB05', key: 'exportMB05' });
    }
  };

  useEffect(() => {
     
       
      fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setKpiLoading(true);
    try {
      const [qaRes, kpiRes, compRes, statusRes, eqaRes, surRes, surStats, deptRes, engRes, universeRes, assessmentsRes, statsRes] = await Promise.all([
        api.get('/quality-reviews').catch(() => ({ data: [] })),
        api.get('/kpi').catch(() => ({ data: [] })),
        api.get('/kpi/compliance-checklist').catch(() => ({ data: null })),
        api.get('/kpi/compliance-status').catch(() => ({ data: {} })),
        api.get('/qaip/eqa').catch(() => ({ data: [] })),
        api.get('/qaip/surveys').catch(() => ({ data: [] })),
        api.get('/qaip/surveys/stats').catch(() => ({ data: { averageScore: 0, count: 0 } })),
        api.get('/departments').catch(() => ({ data: [] })),
        api.get('/audit-engagements').catch(() => ({ data: [] })),
        api.get('/audit-universe').catch(() => ({ data: [] })),
        api.get('/quality-reviews/assessments').catch(() => ({ data: [] })),
        api.get('/quality-reviews/assessments/stats').catch(() => ({ data: {
          averageScore: 0,
          totalAssessed: 0,
          ratingDistribution: { Excellent: 0, Good: 0, 'Needs Improvement': 0, Unsatisfactory: 0 },
          criteriaAverages: { planning: 0, execution: 0, reporting: 0, documentation: 0 }
        }})),
      ]);
      setQaReviews(qaRes.data || []);
      setKpis(kpiRes.data || []);
      setCompliance(compRes.data);
      if (statusRes.data) setCheckedItems(statusRes.data);
      setEqas(eqaRes.data || []);
      setSurveys(surRes.data || []);
      setSurveyStats(surStats.data || { averageScore: 0, count: 0 });
      setDepartments(deptRes.data || []);
      setEngagements(engRes.data || []);
      setAuditUniverseList(universeRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setStats(statsRes.data || {
        averageScore: 0,
        totalAssessed: 0,
        ratingDistribution: { Excellent: 0, Good: 0, 'Needs Improvement': 0, Unsatisfactory: 0 },
        criteriaAverages: { planning: 0, execution: 0, reporting: 0, documentation: 0 }
      });
    } catch {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
      setKpiLoading(false);
    }
  };

  const handleCheckItem = async (id: string, checked: boolean) => {
    const updated = { ...checkedItems, [id]: checked };
    setCheckedItems(updated);
    try {
      await api.post('/kpi/compliance-status', { id, checked });
    } catch (e) {
      message.error(t('qualityControl.errorWhileSavingState', 'Lỗi khi lưu trạng thái'));
      setCheckedItems(checkedItems); // revert on fail
    }
  };

  const handleSaveSettings = () => {
    form.validateFields().then(values => {
      localStorage.setItem('alert_settings', JSON.stringify(values));
      message.success(t('qualityControl.automaticAlertConfigurationSavedSuccessfully', 'Đã lưu cấu hình Cảnh báo tự động thành công!'));
    });
  };

  const getStepStatus = (status: string) => {
    if (status === 'Approved' || status === 'Completed') return 'finish';
    if (status === 'Rejected') return 'error';
    return 'wait';
  };

  const kpiStatusIcon = (status: string) => {
    if (status === 'Passed') return <CheckCircleOutlined className="text-green-500" />;
    if (status === 'Warning') return <WarningOutlined className="text-orange-500" />;
    return <CloseCircleOutlined className="text-red-500" />;
  };

  // KPI summary
  const kpiPassed = kpis.filter(k => k.status === 'Passed').length;
  const kpiWarning = kpis.filter(k => k.status === 'Warning').length;
  const kpiFailed = kpis.filter(k => k.status === 'Failed').length;

  // Compliance summary
  const totalCheckItems = compliance?.sections?.reduce((sum: number, s: any) => sum + s.items.length, 0) || 0;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const complianceRate = totalCheckItems > 0 ? Math.round((checkedCount / totalCheckItems) * 100) : 0;

  const kpiColumns = [
    {
      title: t('qualityControl.measuringIndicatorsKpis', 'Chỉ số đo lường (KPIs)'), dataIndex: 'metric', key: 'metric', width: 260,
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text className="text-xs text-gray-400">{record.category}</Text>
        </div>
      ),
    },
    { title: t('trainingCPE.summaryTable.target', 'Mục tiêu'), dataIndex: 'target', key: 'target', width: 120, render: (t: string) => <Text strong>{t}</Text> },
    { title: t('qualityControl.reality', 'Thực tế'), dataIndex: 'current', key: 'current', width: 120 },
    {
      title: t('auditReports.cols.auditRating', 'Đánh giá'), dataIndex: 'status', key: 'status', width: 120,
      render: (status: string) => {
        const cfg: Record<string, { color: string; text: string }> = {
          Passed: { color: 'green', text: t('workingPapers.obtain', 'Đạt') },
          Warning: { color: 'orange', text: t('continuousMonitoring.cols.alert', 'Cảnh báo') },
          Failed: { color: 'red', text: t('workingPapers.failed', 'Không đạt') },
        };
        const c = cfg[status] || cfg.Failed;
        return <Tag color={c.color} icon={kpiStatusIcon(status)}>{c.text}</Tag>;
      },
    },
  ];

  const qaColumns = [
    { title: t('qualityControl.nameOfWorkingPaper', 'Tên Giấy tờ làm việc'), dataIndex: 'workingPaperTitle', key: 'workingPaperTitle' },
    {
      title: t('qualityControl.reviewStatus', 'Trạng thái Review'), key: 'reviewFlow', width: 340,
      render: (_: any, record: any) => (
        <Steps size="small" current={
          record.independentReviewStatus === 'Approved' ? 3 :
          record.supervisorReviewStatus === 'Approved' ? 2 :
          record.selfReviewStatus === 'Completed' ? 1 : 0
        } items={[
          { title: 'Self', status: getStepStatus(record.selfReviewStatus) as any },
          { title: 'Supervisor', status: getStepStatus(record.supervisorReviewStatus) as any },
          { title: 'Independent', status: getStepStatus(record.independentReviewStatus) as any },
        ]} />
      ),
    },
    {
      title: t('riskAssessment.kriDashboard.cols.result', 'Kết quả'), dataIndex: 'overallStatus', key: 'overallStatus',
      render: (status: string) => (
        <Tag color={status === 'Approved' ? 'green' : status === 'Draft' ? 'default' : 'orange'}>
          {status === 'Approved' ? [t('workingPapers.obtain', 'Đạt')] : status === 'Draft' ? [t('findingsAnalytics.historySection.statusInProgress', 'Đang xử lý')] : t('workingPapers.status.Rejected', 'Từ chối')}
        </Tag>
      ),
    },
  ];

  const eqaColumns = [
    { title: t('qualityAssurance.cols.date', 'Kỳ đánh giá'), dataIndex: 'title', key: 'title', render: (t: string) => <Text strong>{t}</Text> },
    { title: t('qualityControl.independentUnit', 'Đơn vị Độc lập'), dataIndex: 'evaluator', key: 'evaluator' },
    { title: t('qualityControl.implementationDate', 'Ngày thực hiện'), dataIndex: 'dateConducted', key: 'dateConducted' },
    { title: t('qualityControl.nextReviewDue', 'Hạn đánh giá tiếp theo'), dataIndex: 'nextDueDate', key: 'nextDueDate', render: (t: string) => <Text className="text-red-500">{t}</Text> },
    { title: t('qualityControl.complianceLevel', 'Mức độ Tuân thủ'), dataIndex: 'conformityLevel', key: 'conformityLevel', render: (l: string) => <Tag color={l === 'Generally Conforms' ? 'green' : 'orange'}>{l}</Tag> },
  ];

  const surveyColumns = [
    { title: t('documentManager.sources.engagement', 'Đoàn Kiểm toán'), dataIndex: 'engagementName', key: 'engagementName' },
    { title: t('auditEngagements.cols.department', 'Đơn vị'), dataIndex: 'departmentName', key: 'departmentName' },
    { title: t('qualityControl.professional', 'Chuyên nghiệp'), dataIndex: 'ratingProfessionalism', key: 'ratingProfessionalism', render: (r: number) => `${r}/5` },
    { title: t('qualityControl.communicate', 'Giao tiếp'), dataIndex: 'ratingCommunication', key: 'ratingCommunication', render: (r: number) => `${r}/5` },
    { title: t('qualityControl.addedValue', 'Giá trị tăng thêm'), dataIndex: 'ratingValueAdded', key: 'ratingValueAdded', render: (r: number) => `${r}/5` },
    { title: t('qualityControl.dtb', 'ĐTB'), dataIndex: 'averageScore', key: 'averageScore', render: (s: number) => <Tag color={s >= 4 ? 'green' : 'red'}>{s}</Tag> },
    { title: t('qualityControl.comments', 'Góp ý'), dataIndex: 'feedback', key: 'feedback' },
  ];

  const assessmentColumns = [
    { title: t('qualityControl.auditTeamCtkt', 'Đoàn kiểm toán (CTKT)'), dataIndex: 'engagementName', key: 'engagementName', render: (t: string) => <Text strong>{t}</Text> },
    { title: t('scoringTab.cols.assessor', 'Người đánh giá'), dataIndex: 'assessorName', key: 'assessorName' },
    { title: t('qualityControl.evaluationDate', 'Ngày đánh giá'), dataIndex: 'assessmentDate', key: 'assessmentDate' },
    { title: t('qualityControl.overallScore', 'Điểm tổng thể'), dataIndex: 'overallScore', key: 'overallScore', render: (s: number) => <Text strong>{s} / 100</Text> },
    {
      title: t('riskAssessment.dynamicRerating.cols.rating', 'Xếp hạng'),
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: string) => {
        let color = 'blue';
        let text = rating;
        if (rating === 'Excellent') { color = 'gold'; text=t('qualityControl.excellent', 'Xuất sắc'); }
        else if (rating === 'Good') { color = 'green'; text=t('qualityControl.good', 'Tốt'); }
        else if (rating === 'Needs Improvement') { color = 'orange'; text=t('auditReports.needsImprovement', 'Cần cải thiện'); }
        else if (rating === 'Unsatisfactory') { color = 'red'; text=t('workingPapers.failed', 'Không đạt'); }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            onClick={() => handleExportMB05(record.id)}
          >
            Xuất MB05
          </Button>
          <Popconfirm
            title={t('qualityControl.areYouSureYouWantTo', 'Bạn có chắc muốn xóa đánh giá này?')}
            onConfirm={() => handleDeleteAssessment(record.id)}
            okText={t('auditTemplates.btnDelete', 'Xóa')}
            cancelText={t('findingKB.modal.cancelText', 'Hủy')}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small">{t('auditTemplates.btnDelete', 'Xóa')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title level={3} className="!mb-1"><SafetyOutlined className="mr-2" />Quality Assurance & Improvement (QAIP)</Title>
          <Text className="text-gray-500">{t('qualityControl.auditQualityAssuranceAndImprovementProgram', 'Chương trình Đảm bảo và Nâng cao Chất lượng Kiểm toán')}</Text>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} className="bg-white p-4 rounded-lg shadow-sm">
        {/* Tab 1: Internal Quality (KPI & Compliance) */}
        <Tabs.TabPane tab={t('qualityControl.1ComplianceInternalMeasurementKpis', '1. Tuân thủ & Đo lường Nội bộ (KPIs)')} key="1">
          {/* KPI Summary Cards */}
          <Row gutter={[16, 16]} className="mb-6 mt-4">
            <Col xs={8} lg={6}>
              <Card variant="borderless" className="shadow-sm text-center bg-gray-50 border border-gray-100">
                <TrophyOutlined className="text-3xl text-green-500 mb-2" />
                <div className="text-2xl font-bold text-green-600">{kpiPassed}</div>
                <Text className="text-xs text-gray-500">{t('qualityControl.kpiAchieved', 'KPI Đạt')}</Text>
              </Card>
            </Col>
            <Col xs={8} lg={6}>
              <Card variant="borderless" className="shadow-sm text-center bg-gray-50 border border-gray-100">
                <WarningOutlined className="text-3xl text-orange-500 mb-2" />
                <div className="text-2xl font-bold text-orange-500">{kpiWarning}</div>
                <Text className="text-xs text-gray-500">{t('continuousMonitoring.cols.alert', 'Cảnh báo')}</Text>
              </Card>
            </Col>
            <Col xs={8} lg={6}>
              <Card variant="borderless" className="shadow-sm text-center bg-gray-50 border border-gray-100">
                <CloseCircleOutlined className="text-3xl text-red-500 mb-2" />
                <div className="text-2xl font-bold text-red-500">{kpiFailed}</div>
                <Text className="text-xs text-gray-500">{t('workingPapers.failed', 'Không đạt')}</Text>
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card variant="borderless" className="shadow-sm text-center bg-gray-50 border border-gray-100 flex flex-col justify-center">
                <div className="text-xs text-gray-500 mb-1">{t('qualityControl.complianceRateTt13iia', 'Tỷ lệ Tuân thủ (TT13/IIA)')}</div>
                <Progress type="circle" percent={complianceRate} size={60} strokeColor={complianceRate >= 80 ? '#52c41a' : complianceRate >= 50 ? '#faad14' : '#ff4d4f'} />
              </Card>
            </Col>
          </Row>

          {/* KPI Table */}
          <Row gutter={[24, 24]} className="mb-6">
            <Col xs={24} lg={16}>
              <Card title={t('qualityControl.internalAuditPerformanceIndicatorsKpis', '📊 Chỉ số Hiệu quả Hoạt động KTNB (KPIs)')} variant="borderless" className="shadow-sm h-full border border-gray-200">
                <Table
                  columns={kpiColumns}
                  dataSource={kpis}
                  rowKey="id"
                  pagination={false}
                  loading={kpiLoading}
                  size="small"
                  scroll={{ x: 620 }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<><BellOutlined className="mr-2" />{t('qualityControl.configureAlerts', 'Cấu hình Cảnh báo')}</>} variant="borderless" className="shadow-sm h-full border border-gray-200">
                <Form form={form} layout="vertical" initialValues={{ alert1: true, alert2: true, alert3: false, days: 5 }}>
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <Text strong>{t('qualityControl.proposalIsDueSoon', 'Kiến nghị sắp hạn')}</Text>
                      <Form.Item name="alert1" valuePropName="checked" className="mb-0"><Switch /></Form.Item>
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      {t('qualityControl.before', 'Trước')} <Form.Item name="days" className="mb-0 mx-2"><InputNumber min={1} max={30} size="small" /></Form.Item> {t('auditPlan.drawer.dayCount', 'ngày')}
                    </div>
                  </div>
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                      <Text strong>{t('qualityControl.financialReportReleased', 'Báo cáo KT phát hành')}</Text>
                      <Form.Item name="alert2" valuePropName="checked" className="mb-0"><Switch /></Form.Item>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="flex justify-between items-center">
                      <Text strong>{t('qualityControl.riskIncreasesDramatically', 'Rủi ro tăng đột biến')}</Text>
                      <Form.Item name="alert3" valuePropName="checked" className="mb-0"><Switch /></Form.Item>
                    </div>
                  </div>
                  <Button type="primary" block icon={<MailOutlined />} onClick={handleSaveSettings}>
                    {t('auditTemplates.form.btnSave', 'Lưu cấu hình')}
                  </Button>
                </Form>
              </Card>
            </Col>
          </Row>

          {/* Compliance Checklist */}
          {compliance && (
            <Card
              title={`📋 Checklist Tuân thủ — ${compliance.standard}`}
              variant="borderless"
              className="shadow-sm mb-6 border border-gray-200"
              extra={
                <Space>
                  <Badge status={complianceRate >= 80 ? 'success' : 'warning'} />
                  <Text>{checkedCount}/{totalCheckItems} mục ({complianceRate}%)</Text>
                </Space>
              }
            >
              <Collapse
                accordion
                items={compliance.sections.map((section: any) => ({
                  key: section.id,
                  label: (
                    <Space>
                      <Text strong>{section.title}</Text>
                      <Badge
                        count={section.items.filter((i: any) => checkedItems[i.id]).length}
                        style={{ backgroundColor: '#52c41a' }}
                        overflowCount={99}
                      />
                      <Text type="secondary">/ {section.items.length}</Text>
                    </Space>
                  ),
                  children: (
                    <>
                      {section.items.map((item: any) => (
                        <div key={item.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                          <Checkbox
                            checked={!!checkedItems[item.id]}
                            onChange={(e) => handleCheckItem(item.id, e.target.checked)}
                          />
                          <div>
                            <Text strong className={checkedItems[item.id] ? 'line-through text-gray-400' : ''}>
                              {item.label}
                            </Text>
                            <br />
                            <Text className="text-xs text-gray-500">{item.description}</Text>
                          </div>
                        </div>
                      ))}
                    </>
                  ),
                }))}
              />
            </Card>
          )}
        </Tabs.TabPane>

        {/* Tab 2: External Quality Assessment (EQA) */}
        <Tabs.TabPane tab={t('qualityControl.2ExternalIndependentAssessmentEqa', '2. Đánh giá Độc lập ngoài (EQA)')} key="2">
          <Card 
            variant="borderless" 
            className="shadow-sm mt-4 border border-gray-200" 
            title={t('qualityControl.independentQualityReviewHistoryEvery5', 'Lịch sử Đánh giá Chất lượng Độc lập (Định kỳ 5 năm)')}
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsEqaVisible(true)}>
                {t('qualityControl.noteTheNewEqa', 'Ghi nhận EQA mới')}
              </Button>
            }
          >
            <Table columns={eqaColumns} dataSource={eqas} rowKey="id" pagination={false} loading={loading} scroll={{ x: 800 }} />
          </Card>
        </Tabs.TabPane>

        {/* Tab 3: Post-Engagement Surveys */}
        <Tabs.TabPane tab={t('qualityControl.3SatisfactionSurveysSurveys', '3. Khảo sát Sự hài lòng (Surveys)')} key="3">
          <Row gutter={24} className="mt-4">
            <Col xs={24} md={6}>
              <Card variant="borderless" className="shadow-sm border border-gray-200 text-center h-full flex flex-col justify-center items-center" style={{ minHeight: 220 }}>
                <Text className="text-gray-500 block mb-2">{t('qualityControl.averageCsatScore', 'Điểm CSAT Trung bình')}</Text>
                <div className="text-5xl font-bold text-blue-600 mb-2">{surveyStats.averageScore} <span className="text-2xl text-gray-400">/ 5</span></div>
                <Text type="secondary">Dựa trên {surveyStats.count} phiếu khảo sát</Text>
                <Button type="primary" icon={<PlusOutlined />} className="mt-4" onClick={() => setIsSurveyVisible(true)}>
                  {t('qualityControl.addSurveyForm', 'Thêm Phiếu khảo sát')}
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={18}>
              <Card variant="borderless" className="shadow-sm border border-gray-200" title={t('qualityControl.detailsFeedbackFromDkt', 'Chi tiết Phản hồi từ ĐVĐKT')}>
                <Table columns={surveyColumns} dataSource={surveys} rowKey="id" pagination={{ pageSize: 5 }} loading={loading} scroll={{ x: 750 }} />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* Tab 4: Engagement Quality Assessments (F16) */}
        <Tabs.TabPane tab={t('qualityControl.4EvaluationOfTechnicalOverallQuality', '4. Đánh giá Chất lượng CTKT & Tổng thể')} key="4">
          <Row gutter={[16, 16]} className="mb-6 mt-4">
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" className="shadow-sm text-center bg-gray-50 border border-gray-100 flex flex-col justify-center items-center" style={{ height: 160 }}>
                <div className="text-xs text-gray-500 mb-2">{t('qualityControl.averageQualityScore', 'Điểm chất lượng trung bình')}</div>
                <Progress type="circle" percent={stats.averageScore} size={70} strokeColor={stats.averageScore >= 80 ? '#52c41a' : stats.averageScore >= 60 ? '#faad14' : '#ff4d4f'} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" className="shadow-sm text-center bg-gray-50 border border-gray-100 flex flex-col justify-center" style={{ height: 160 }}>
                <TrophyOutlined className="text-3xl text-yellow-500 mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{stats.totalAssessed}</div>
                <Text className="text-xs text-gray-500">{t('qualityControl.ctktEvaluated', 'CTKT Đã Đánh Giá')}</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" className="shadow-sm text-center bg-gray-50 border border-gray-100 flex flex-col justify-center" style={{ height: 160 }}>
                <CheckCircleOutlined className="text-3xl text-green-500 mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  {(stats.ratingDistribution?.Excellent || 0) + (stats.ratingDistribution?.Good || 0)}
                </div>
                <Text className="text-xs text-gray-500">{t('qualityControl.achievedExcellentGood', 'Đạt Xuất sắc / Tốt')}</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" className="shadow-sm text-center bg-gray-50 border border-gray-100 flex flex-col justify-center" style={{ height: 160 }}>
                <WarningOutlined className="text-3xl text-orange-500 mb-2" />
                <div className="text-2xl font-bold text-orange-500">
                  {(stats.ratingDistribution?.['Needs Improvement'] || 0) + (stats.ratingDistribution?.Unsatisfactory || 0)}
                </div>
                <Text className="text-xs text-gray-500">{t('qualityControl.needsImprovementWeak', 'Cần Cải Thiện / Yếu')}</Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} className="mb-6">
            <Col xs={24} lg={10}>
              <Card title={t('qualityControl.averageScoreAccordingToSetOf', '📊 Điểm Trung Bình Theo Bộ Tiêu Chí')} variant="borderless" className="shadow-sm border border-gray-200">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={[
                    { name: t('qualityControl.planning25', 'Kế hoạch (25%)'), score: stats.criteriaAverages?.planning || 0 },
                    { name: t('qualityControl.implementation35', 'Thực hiện (35%)'), score: stats.criteriaAverages?.execution || 0 },
                    { name: t('qualityControl.reporting25', 'Báo cáo (25%)'), score: stats.criteriaAverages?.reporting || 0 },
                    { name: t('qualityControl.profile15', 'Hồ sơ (15%)'), score: stats.criteriaAverages?.documentation || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip formatter={(value) => [`${value} điểm`, t('qualityControl.averageScore', 'Điểm trung bình')]} />
                    <Bar dataKey="score" fill="#ea9105" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#666', fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card 
                title={t('qualityControl.listOfTechnicalAnalysisQualityAssessment', '📋 Danh Sách Đánh Giá Chất Lượng CTKT')} 
                variant="borderless" 
                className="shadow-sm border border-gray-200"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                    assessmentForm.resetFields();
                    setRealtimeScore(80);
                    setRealtimeRating(t('qualityControl.good', 'Tốt'));
                    setIsAssessmentVisible(true);
                  }}>
                    {t('qualityControl.newQualityAssessment', 'Đánh giá chất lượng mới')}
                  </Button>
                }
              >
                <Table
                  columns={assessmentColumns}
                  dataSource={assessments}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 5 }}
                  size="small"
                  scroll={{ x: 850 }}
                  expandable={{
                    expandedRowRender: (record) => (
                      <div className="p-4 bg-gray-50 rounded border border-gray-100">
                        <Title level={5} className="!mb-3 text-blue-700">{t('qualityControl.componentPointDetails', 'Chi tiết điểm thành phần:')}</Title>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={12} md={6}>
                            <Card size="small" title={t('qualityControl.planning25', 'Lập kế hoạch (25%)')} variant="borderless" className="shadow-xs bg-white">
                              <Text strong className="text-lg text-blue-600">{record.criteriaScores?.planning} điểm</Text>
                              <div className="text-gray-500 text-xs mt-2" style={{ minHeight: 40 }}>
                                {record.criteriaComments?.planning || t('qualityControl.noComments', 'Không có nhận xét')}
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Card size="small" title={t('qualityControl.implementation35', 'Thực hiện (35%)')} variant="borderless" className="shadow-xs bg-white">
                              <Text strong className="text-lg text-blue-600">{record.criteriaScores?.execution} điểm</Text>
                              <div className="text-gray-500 text-xs mt-2" style={{ minHeight: 40 }}>
                                {record.criteriaComments?.execution || t('qualityControl.noComments', 'Không có nhận xét')}
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Card size="small" title={t('qualityControl.reportingExperience25', 'Báo cáo & KN (25%)')} variant="borderless" className="shadow-xs bg-white">
                              <Text strong className="text-lg text-blue-600">{record.criteriaScores?.reporting} điểm</Text>
                              <div className="text-gray-500 text-xs mt-2" style={{ minHeight: 40 }}>
                                {record.criteriaComments?.reporting || t('qualityControl.noComments', 'Không có nhận xét')}
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Card size="small" title={t('qualityControl.recordsArchives15', 'Hồ sơ & Lưu trữ (15%)')} variant="borderless" className="shadow-xs bg-white">
                              <Text strong className="text-lg text-blue-600">{record.criteriaScores?.documentation} điểm</Text>
                              <div className="text-gray-500 text-xs mt-2" style={{ minHeight: 40 }}>
                                {record.criteriaComments?.documentation || t('qualityControl.noComments', 'Không có nhận xét')}
                              </div>
                            </Card>
                          </Col>
                        </Row>
                        {record.generalComment && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <Text strong>{t('qualityControl.generalRating', 'Đánh giá chung:')}</Text>
                            <Paragraph className="text-gray-600 mt-1 italic">"{record.generalComment}"</Paragraph>
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>

      {/* EQA Modal */}
      <Modal
        forceRender
        title={<><SafetyOutlined className="mr-2 text-blue-500" />{t('qualityControl.recordingOfIndependentAssessmentEqaResults', 'Ghi nhận Kết quả Đánh giá Độc lập (EQA)')}</>}
        open={isEqaVisible}
        onOk={handleCreateEqa}
        onCancel={() => setIsEqaVisible(false)}
        okText={t('trainingCPE.btnRecords', 'Ghi nhận')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={600}
      >
        <Form form={eqaForm} layout="vertical" className="mt-4">
          <Form.Item name="title" label={t('qualityControl.eqaAssessmentPeriod', 'Kỳ đánh giá EQA')} rules={[{ required: true, message: t('qualityControl.pleaseEnterAReviewPeriodName', 'Vui lòng nhập tên kỳ đánh giá!') }]}>
            <Select placeholder={t('qualityControl.selectAssessmentPeriod', 'Chọn kỳ đánh giá...')} allowClear showSearch optionFilterProp="children">
              <Select.Option value={t('qualityControl.independentQualityAssessmentEqa2026', 'Đánh giá Chất lượng Độc lập (EQA) 2026')}>{t('qualityControl.independentQualityAssessmentEqa2026', 'Đánh giá Chất lượng Độc lập (EQA) 2026')}</Select.Option>
              <Select.Option value={t('qualityControl.independentQualityAssessmentEqa2027', 'Đánh giá Chất lượng Độc lập (EQA) 2027')}>{t('qualityControl.independentQualityAssessmentEqa2027', 'Đánh giá Chất lượng Độc lập (EQA) 2027')}</Select.Option>
              <Select.Option value={t('qualityControl.periodicallyCheckTheQualityOfIndependent', 'Kiểm tra chất lượng kiểm toán độc lập định kỳ')}>{t('qualityControl.periodicallyCheckTheQualityOfIndependent', 'Kiểm tra chất lượng kiểm toán độc lập định kỳ')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="evaluator" label={t('qualityControl.independentReviewUnit', 'Đơn vị Đánh giá Độc lập')} rules={[{ required: true, message: t('qualityControl.pleaseEnterTheNameOfThe', 'Vui lòng nhập tên tổ chức đánh giá!') }]}>
            <Select placeholder={t('qualityControl.chooseAnIndependentAuditingOrganization', 'Chọn tổ chức kiểm toán độc lập...')} allowClear showSearch optionFilterProp="children">
              <Select.Option value="PwC Vietnam">PwC Vietnam</Select.Option>
              <Select.Option value="Deloitte Vietnam">Deloitte Vietnam</Select.Option>
              <Select.Option value="EY Vietnam">EY Vietnam</Select.Option>
              <Select.Option value="KPMG Vietnam">KPMG Vietnam</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dateConducted" label={t('qualityControl.dateOfAssessment', 'Ngày thực hiện đánh giá')} rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nextDueDate" label={t('qualityControl.nextReviewDue', 'Hạn đánh giá tiếp theo')} rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="conformityLevel" label={t('qualityControl.complianceLevelIiatt13', 'Mức độ Tuân thủ IIA/TT13')} rules={[{ required: true }]}>
            <Select placeholder={t('qualityControl.selectComplianceRating', 'Chọn xếp hạng tuân thủ...')}>
              <Select.Option value="Generally Conforms">{t('qualityControl.generallyConforms', 'Generally Conforms (Tuân thủ đầy đủ)')}</Select.Option>
              <Select.Option value="Partially Conforms">{t('qualityControl.partiallyConforms', 'Partially Conforms (Tuân thủ một phần)')}</Select.Option>
              <Select.Option value="Does Not Conform">{t('qualityControl.doesNotConform', 'Does Not Conform (Không tuân thủ)')}</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Survey Modal */}
      <Modal
        forceRender
        title={<><StarOutlined className="mr-2 text-yellow-500" />{t('qualityControl.addASatisfactionSurveyCsatAuditee', 'Thêm Phiếu Khảo sát Sự hài lòng (CSAT Auditee)')}</>}
        open={isSurveyVisible}
        onOk={handleCreateSurvey}
        onCancel={() => setIsSurveyVisible(false)}
        okText={t('qualityControl.saveVote', 'Lưu phiếu')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={600}
      >
        <Form form={surveyForm} layout="vertical" className="mt-4">
          <Form.Item name="engagementName" label={t('qualityControl.nameOfTheAuditTeam', 'Tên Đoàn kiểm toán')} rules={[{ required: true }]}>
            <Select placeholder={t('qualityControl.choosingAnAuditTeam', 'Chọn đoàn kiểm toán...')} allowClear showSearch optionFilterProp="children">
              {engagements
                .filter((eng: any) => {
                  const currentVal = surveyForm.getFieldValue('engagementName');
                  return eng.name === currentVal || eng.status !== 'Completed';
                })
                .map((eng: any) => (
                  <Select.Option key={eng.id} value={eng.name}>{eng.name}</Select.Option>
                ))}
              {engagements.length === 0 && (
                <>
                  <Select.Option value={t('qualityControl.headOfficeCreditAudit', 'Kiểm toán Tín dụng Hội sở')}>{t('qualityControl.headOfficeCreditAudit', 'Kiểm toán Tín dụng Hội sở')}</Select.Option>
                  <Select.Option value={t('qualityControl.itAuditOnline', 'Kiểm toán CNTT - Trực tuyến')}>{t('qualityControl.itAuditOnline', 'Kiểm toán CNTT - Trực tuyến')}</Select.Option>
                  <Select.Option value={t('qualityControl.mobilizationAuditOfHanoiBranch', 'Kiểm toán Huy động Chi nhánh Hà Nội')}>{t('qualityControl.mobilizationAuditOfHanoiBranch', 'Kiểm toán Huy động Chi nhánh Hà Nội')}</Select.Option>
                  <Select.Option value={t('qualityControl.antimoneyLaunderingAndComplianceAudits', 'Kiểm toán Chống rửa tiền và Tuân thủ')}>{t('qualityControl.antimoneyLaunderingAndComplianceAudits', 'Kiểm toán Chống rửa tiền và Tuân thủ')}</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>
          <Form.Item name="departmentName" label={t('auditEngagements.auditedUnit', 'Đơn vị được kiểm toán')} rules={[{ required: true }]}>
            <Select placeholder={t('auditUniverse.modal.deptPlaceholder', 'Chọn đơn vị...')} allowClear showSearch optionFilterProp="children">
              {auditUniverseList.map((u: any) => (
                <Select.Option key={u.id} value={u.name}>{u.name} ({u.auditCategory || u.category || t('auditEngagements.universe', 'Vũ trụ')})</Select.Option>
              ))}
              {auditUniverseList.length === 0 && (
                <>
                  <Select.Option value={t('qualityControl.creditDivision', 'Khối Tín dụng')}>{t('qualityControl.creditDivision', 'Khối Tín dụng')}</Select.Option>
                  <Select.Option value={t('qualityControl.itCenter', 'Trung tâm CNTT')}>{t('qualityControl.itCenter', 'Trung tâm CNTT')}</Select.Option>
                  <Select.Option value={t('auditeePortal.hanoiBranch', 'Chi nhánh Hà Nội')}>{t('auditeePortal.hanoiBranch', 'Chi nhánh Hà Nội')}</Select.Option>
                  <Select.Option value={t('qualityControl.operationsDivision', 'Khối Vận hành')}>{t('qualityControl.operationsDivision', 'Khối Vận hành')}</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ratingProfessionalism" label={t('qualityControl.professionalism', 'Tính Chuyên nghiệp')} rules={[{ required: true }]}>
                <Rate style={{ fontSize: 18 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ratingCommunication" label={t('qualityControl.communicationDiscussion', 'Giao tiếp & Thảo luận')} rules={[{ required: true }]}>
                <Rate style={{ fontSize: 18 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ratingValueAdded" label={t('qualityControl.addedValue', 'Giá trị tăng thêm')} rules={[{ required: true }]}>
                <Rate style={{ fontSize: 18 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="feedback" label={t('qualityControl.additionalCommentsFeedback', 'Ý kiến đóng góp & Phản hồi bổ sung')} rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder={t('qualityControl.enterSpecificCommentsFromTheUnit', 'Nhập nhận xét cụ thể từ đơn vị đối với đoàn kiểm toán...')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Quality Assessment Modal */}
      <Modal
        forceRender
        title={<><SafetyOutlined className="mr-2 text-blue-600" />{t('qualityControl.auditProgramQualityAssessmentCtkt', 'Đánh Giá Chất Lượng Chương Trình Kiểm Toán (CTKT)')}</>}
        open={isAssessmentVisible}
        onOk={handleCreateAssessment}
        onCancel={() => setIsAssessmentVisible(false)}
        okText={t('qualityControl.saveReview', 'Lưu đánh giá')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        width={750}
      >
        <Form
          form={assessmentForm}
          layout="vertical"
          className="mt-4"
          initialValues={{
            planning: 80,
            execution: 80,
            reporting: 80,
            documentation: 80,
            assessmentDate: dayjs(),
          }}
          onValuesChange={(changedValues, allValues) => {
            const planning = allValues.planning || 0;
            const execution = allValues.execution || 0;
            const reporting = allValues.reporting || 0;
            const documentation = allValues.documentation || 0;
            const score = (planning * 0.25) + (execution * 0.35) + (reporting * 0.25) + (documentation * 0.15);
            const rounded = Math.round(score * 100) / 100;
            setRealtimeScore(rounded);
            
            let rating=t('workingPapers.failed', 'Không đạt');
            if (rounded >= 90) rating=t('qualityControl.excellent', 'Xuất sắc');
            else if (rounded >= 75) rating=t('qualityControl.good', 'Tốt');
            else if (rounded >= 60) rating=t('auditReports.needsImprovement', 'Cần cải thiện');
            setRealtimeRating(rating);
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="engagementId" label={t('qualityControl.auditTeamCtkt', 'Đoàn kiểm toán (CTKT)')} rules={[{ required: true, message: t('qualityControl.pleaseChooseTheAuditTeam', 'Vui lòng chọn đoàn kiểm toán!') }]}>
                <Select placeholder={t('qualityControl.choosingAnAuditTeam', 'Chọn đoàn kiểm toán...')} allowClear showSearch optionFilterProp="children">
                  {engagements
                    .filter((eng: any) => eng.status === 'Completed' || eng.status === 'Reporting')
                    .map((eng: any) => (
                      <Select.Option key={eng.id} value={eng.id}>{eng.name}</Select.Option>
                    ))}
                  {engagements.length === 0 && (
                    <>
                      <Select.Option value={1}>{t('qualityControl.creditAuditHanoiBranch', 'Kiểm toán Tín dụng Chi nhánh Hà Nội')}</Select.Option>
                      <Select.Option value={2}>{t('qualityControl.headOfficeOperationsAudit', 'Kiểm toán Vận hành Hội sở')}</Select.Option>
                      <Select.Option value={3}>{t('qualityControl.informationSecurityAudit', 'Kiểm toán An toàn thông tin')}</Select.Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="assessorName" label={t('scoringTab.cols.assessor', 'Người đánh giá')} rules={[{ required: true, message: t('qualityControl.pleaseEnterAName', 'Vui lòng nhập tên!') }]}>
                <Input placeholder={t('qualityControl.reviewerName', 'Tên người đánh giá...')} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="assessmentDate" label={t('qualityControl.evaluationDate', 'Ngày đánh giá')} rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Card size="small" className="bg-blue-50 border-blue-200 mb-6 text-center">
            <Text strong className="text-gray-700">{t('qualityControl.expectedOverallScore', 'Điểm tổng thể dự kiến:')} </Text>
            <Text strong className="text-2xl text-blue-600 mx-2">{realtimeScore}</Text>
            <Text strong className="text-gray-700">{t('qualityControl.100Points', '/ 100 điểm')}</Text>
            <span className="mx-4 text-gray-300">|</span>
            <Text strong className="text-gray-700">{t('qualityControl.rating', 'Xếp hạng:')} </Text>
            <Tag color={realtimeRating === t('qualityControl.excellent', 'Xuất sắc') ? 'gold' : realtimeRating === t('qualityControl.good', 'Tốt') ? 'green' : realtimeRating === t('auditReports.needsImprovement', 'Cần cải thiện') ? 'orange' : 'red'} className="text-sm font-semibold px-2 py-0.5">
              {realtimeRating}
            </Tag>
          </Card>

          <Collapse
            defaultActiveKey={['1']}
            items={[
              {
                key: '1',
                label: <Text strong>{t('qualityControl.1PlanningSurveyWeighting25', '1. Lập kế hoạch & Khảo sát (Trọng số 25%)')}</Text>,
                children: (
                  <>
                    <Row gutter={16} align="middle">
                      <Col span={18}>
                        <Form.Item name="planning" className="mb-0">
                          <Slider min={0} max={100} tooltip={{ formatter: (v) => `${v} điểm` }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="planning" className="mb-0">
                          <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="planningComment" label={t('qualityControl.detailedComments', 'Nhận xét chi tiết')} className="mt-3 mb-0" rules={[{ required: true, message: t('qualityControl.pleaseEnterAComment', 'Vui lòng nhập nhận xét!') }]}>
                      <Input.TextArea placeholder={t('qualityControl.enterCommentsToEvaluateThePlanning', 'Nhập ý kiến đánh giá khâu lập kế hoạch...')} rows={2} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: '2',
                label: <Text strong>{t('qualityControl.2PerformAuditWeight35', '2. Thực hiện kiểm toán (Trọng số 35%)')}</Text>,
                children: (
                  <>
                    <Row gutter={16} align="middle">
                      <Col span={18}>
                        <Form.Item name="execution" className="mb-0">
                          <Slider min={0} max={100} tooltip={{ formatter: (v) => `${v} điểm` }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="execution" className="mb-0">
                          <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="executionComment" label={t('qualityControl.detailedComments', 'Nhận xét chi tiết')} className="mt-3 mb-0" rules={[{ required: true, message: t('qualityControl.pleaseEnterAComment', 'Vui lòng nhập nhận xét!') }]}>
                      <Input.TextArea placeholder={t('qualityControl.enterCommentsToEvaluateTheAudit', 'Nhập ý kiến đánh giá khâu thực hiện kiểm toán...')} rows={2} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: '3',
                label: <Text strong>{t('qualityControl.3ReportRecommendationWeighting25', '3. Báo cáo & Khuyến nghị (Trọng số 25%)')}</Text>,
                children: (
                  <>
                    <Row gutter={16} align="middle">
                      <Col span={18}>
                        <Form.Item name="reporting" className="mb-0">
                          <Slider min={0} max={100} tooltip={{ formatter: (v) => `${v} điểm` }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="reporting" className="mb-0">
                          <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="reportingComment" label={t('qualityControl.detailedComments', 'Nhận xét chi tiết')} className="mt-3 mb-0" rules={[{ required: true, message: t('qualityControl.pleaseEnterAComment', 'Vui lòng nhập nhận xét!') }]}>
                      <Input.TextArea placeholder={t('qualityControl.enterCommentsToEvaluateTheReporting', 'Nhập ý kiến đánh giá khâu lập báo cáo...')} rows={2} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: '4',
                label: <Text strong>{t('qualityControl.4RecordsArchivesWeighted15', '4. Hồ sơ & Lưu trữ (Trọng số 15%)')}</Text>,
                children: (
                  <>
                    <Row gutter={16} align="middle">
                      <Col span={18}>
                        <Form.Item name="documentation" className="mb-0">
                          <Slider min={0} max={100} tooltip={{ formatter: (v) => `${v} điểm` }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="documentation" className="mb-0">
                          <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="documentationComment" label={t('qualityControl.detailedComments', 'Nhận xét chi tiết')} className="mt-3 mb-0" rules={[{ required: true, message: t('qualityControl.pleaseEnterAComment', 'Vui lòng nhập nhận xét!') }]}>
                      <Input.TextArea placeholder={t('qualityControl.enterCommentsToEvaluateRecordKeeping', 'Nhập ý kiến đánh giá khâu lưu trữ hồ sơ...')} rows={2} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />

          <Form.Item name="generalComment" label={t('qualityControl.overallAssessmentOpinionOfTheReviewerteam', 'Đánh giá tổng chung (Ý kiến của Soát xét viên/Trưởng đoàn)')} className="mt-4" rules={[{ required: true, message: t('qualityControl.pleaseEnterGeneralComments', 'Vui lòng nhập nhận xét chung!') }]}>
            <Input.TextArea placeholder={t('qualityControl.generalCommentsOnTheOverallQuality', 'Ý kiến nhận xét chung về chất lượng toàn diện của cuộc kiểm toán...')} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QualityControl;
