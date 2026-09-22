import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, Tag, Select, message, Descriptions, Divider, Steps, Tooltip, Badge, Row, Col, Tabs, Statistic, Alert, DatePicker } from 'antd';
import { 
  FilePdfOutlined, FileWordOutlined, FileExcelOutlined, PrinterOutlined, CheckCircleOutlined, SendOutlined, 
  EditOutlined, EyeOutlined, ThunderboltOutlined, PlusOutlined,
  AuditOutlined, FileTextOutlined, DownloadOutlined, CloseOutlined, SafetyCertificateOutlined,
  WarningOutlined, ExclamationCircleOutlined, CheckCircleFilled, SyncOutlined, DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import TipTapEditor from '../components/TipTapEditor';
import ReportExportButton from '../components/ReportExportButton';
import api from '../services/api';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import DynamicFormRenderer, { extractCustomFields } from '../components/DynamicFormRenderer';
import { AuditReportFormView } from './audit-reports/AuditReportFormView';
import { AuditReportDetailModal } from './audit-reports/AuditReportDetailModal';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const statusFlow = ['Draft', 'PendingReview', 'Reviewed', 'Issued'];
const statusColors: Record<string, string> = {
  Draft: 'default',
  PendingReview: 'orange',
  Reviewed: 'blue',
  Issued: 'green',
  Archived: 'purple',
};

const AuditReports: React.FC = () => {
  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    Draft: t('auditTemplates.draft', 'Bản nháp'),
    PendingReview: t('auditReports.waitingForReview', 'Chờ soát xét'),
    Reviewed: t('auditReports.reviewed', 'Đã soát xét'),
    Issued: t('auditReports.released', 'Đã phát hành'),
    Archived: t('auditTemplates.archived', 'Lưu trữ'),
  };

  const ratingLabels: Record<string, { text: string; color: string }> = {
    Satisfactory: { text: t('evidenceManager.labels.passed', '🟢 Đạt yêu cầu'), color: 'green' },
    NeedsImprovement: { text: t('auditReports.needsImprovement', '🟡 Cần cải thiện'), color: 'orange' },
    Unsatisfactory: { text: t('workingPapers.failed', '🔴 Không đạt'), color: 'red' },
  };

  const [data, setData] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [detailReport, setDetailReport] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [linkedFindings, setLinkedFindings] = useState<any[]>([]);
  const [syncingWp, setSyncingWp] = useState(false);
  const [recommendationsList, setRecommendationsList] = useState<any[]>([]);
  const [exportingMap, setExportingMap] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit-reports');
      setData(response.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditReports.errorLoadingReportList', 'Lỗi tải danh sách báo cáo'));
    } finally {
      setLoading(false);
    }
  };

  const fetchEngagements = async () => {
    try {
      const response = await api.get('/audit-engagements');
      setEngagements(response.data || []);
    } catch (error: any) {
      console.error(t('auditReports.errorLoadingAudit', 'Lỗi tải cuộc kiểm toán:'), error);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchEngagements();
  }, []);

  const handleTransition = async (id: number, newStatus: string) => {
    try {
      await api.post(`/audit-reports/${id}/transition`, { newStatus });
      message.success(`Đã chuyển trạng thái sang "${statusLabels[newStatus]}"`);
      fetchReports();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auditReports.errorWhenSwitchingState', 'Lỗi khi chuyển trạng thái'));
    }
  };

  const handleExport = async (id: number, format: 'word' | 'excel' | 'pdf' | 'summary', engagementId?: number) => {
    const exportKey = `${id}-${format}`;
    try {
      setExportingMap(prev => ({ ...prev, [exportKey]: true }));
      message.loading({ content: `Đang xuất báo cáo dạng ${format.toUpperCase()}...`, key: 'exporting' });
      let urlEndpoint = `/audit-reports/${id}/export/${format}`;
      if (format === 'summary' && engagementId) {
        urlEndpoint = `/audit-reports/${engagementId}/export/summary`;
      }
      
      const response = await api.get(urlEndpoint, {
        responseType: 'blob'
      });
      
      const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'docx';
      const mime = format === 'pdf' 
        ? 'application/pdf' 
        : format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'summary' 
        ? `Tom_tat_BCKT_${engagementId || id}.${ext}` 
        : `Bao_cao_kiem_toan_${id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      message.success({ content: `Đã tải file ${format.toUpperCase()}`, key: 'exporting' });
    } catch (e) {
      console.error(e);
      message.error({ content: t('auditReports.errorWhenExportingFile', 'Lỗi khi xuất file'), key: 'exporting' });
    } finally {
      setExportingMap(prev => ({ ...prev, [exportKey]: false }));
    }
  };

  const handleExportGlossary = async () => {
    try {
      message.loading({ content: 'Đang xuất Bảng thuyết minh...', key: 'exportGlossary' });
      const response = await api.get('/audit-reports/glossary', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BA01_Thuyet_minh.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success({ content: 'Đã tải Bảng thuyết minh', key: 'exportGlossary' });
    } catch (e) {
      console.error(e);
      message.error({ content: 'Lỗi khi xuất file', key: 'exportGlossary' });
    }
  };

  const handleAutoGenerate = async () => {
    const eng = engagements[0]; // Simple: use first engagement for demo
    if (!eng) { message.warning(t('auditReports.thereHasBeenNoAudit', 'Chưa có cuộc kiểm toán nào')); return; }
    
    setIsGenerating(true);
    // Giả lập thời gian AI xử lý ngôn ngữ
    setTimeout(async () => {
      try {
        await api.post('/audit-reports/auto-generate', {
          engagementId: eng.id,
          title: `Báo cáo KT - ${eng.name}`,
          plan: eng.planName || '',
        });
        message.success(t('auditReports.aiAutomaticallyCompiledReportsFromFindings', 'AI đã tự động tổng hợp báo cáo từ phát hiện'));
        fetchReports();
      } catch (error: any) {
        message.error(error.response?.data?.message || t('auditReports.errorWhenCreatingAutomatically', 'Lỗi khi tạo tự động'));
      } finally {
        setIsGenerating(false);
      }
    }, 1500);
  };

  const handleViewDetail = async (record: any) => {
    try {
      const res = await api.get(`/audit-reports/${record.id}`);
      setDetailReport(res.data);
      setIsDetailVisible(true);
    } catch {
      setDetailReport(record);
      setIsDetailVisible(true);
    }
  };

  const columns = [
    { 
      title: t('auditReports.cols.title', 'Tên Báo cáo'), 
      dataIndex: 'title', 
      key: 'title', 
      width: 300,
      ellipsis: true,
      render: (text: string, record: any) => (
        <a onClick={() => handleViewDetail(record)} className="font-semibold text-slate-800 hover:text-amber-600">{text}</a>
      ),
    },
    { 
      title: t('workingPapers.cols.planName', 'Cuộc kiểm toán'), 
      dataIndex: 'plan', 
      key: 'plan', 
      width: 240,
      ellipsis: true,
    },
    { 
      title: t('auditReports.cols.date', 'Ngày'), 
      dataIndex: 'date', 
      key: 'date', 
      width: 120 
    },
    {
      title: t('auditReports.cols.auditRating', 'Đánh giá'), 
      dataIndex: 'auditRating', 
      key: 'auditRating', 
      width: 140,
      render: (rating: string) => {
        if (!rating) return <Text type="secondary">-</Text>;
        const cfg = ratingLabels[rating] || { text: rating, color: 'default' };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: 'Soát xét Lãnh đạo Phòng',
      dataIndex: 'managerReviewCount',
      key: 'managerReviewCount',
      width: 170,
      render: (count: number) => (
        <Space>
          <Tag color={count > 2 ? 'red' : count > 0 ? 'orange' : 'green'} className="font-semibold">
            {count || 0} lần soát xét
          </Tag>
        </Space>
      ),
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'), 
      key: 'action', 
      width: 250,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title={t('auditCommitteePortal.table.btnView', 'Xem chi tiết')}>
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          <ReportExportButton
            recordId={record.id}
            entityType="report"
            showExcelOption={true}
            engagementId={record.engagementId}
            label="Xuất BC"
          />
          <Tooltip title={t('auditReports.exportPdf', 'Xuất PDF')}>
            <Button 
              type="text" 
              icon={<FilePdfOutlined />} 
              loading={!!exportingMap[`${record.id}-pdf`]} 
              className="text-red-500" 
              onClick={() => handleExport(record.id, 'pdf')} 
            />
          </Tooltip>
          <Tooltip title="Xuất Tóm tắt (MB06A/06B)">
            <Button 
              type="text" 
              icon={<FileTextOutlined />} 
              loading={!!exportingMap[`${record.id}-summary`]} 
              className="text-purple-500" 
              onClick={() => handleExport(record.id, 'summary', record.engagementId)} 
            />
          </Tooltip>
          {record.status === 'Draft' && (
            <>
              <Tooltip title={t('personnel.edit', 'Chỉnh sửa')}>
                <Button type="text" icon={<EditOutlined />} className="text-blue-500" onClick={() => handleEdit(record)} />
              </Tooltip>
              <Tooltip title={t('auditReports.reviewer', 'Trình soát xét')}>
                <Button type="text" icon={<SendOutlined />} className="text-orange-500" onClick={() => handleTransition(record.id, 'PendingReview')} />
              </Tooltip>
            </>
          )}
          {record.status === 'PendingReview' && (
            <Tooltip title={t('auditReports.reviewConfirmation', 'Xác nhận soát xét')}>
              <Button type="text" icon={<CheckCircleOutlined />} className="text-blue-500" onClick={() => handleTransition(record.id, 'Reviewed')} />
            </Tooltip>
          )}
          {record.status === 'Reviewed' && (
            <Tooltip title={t('auditFindings.officialRelease', 'Phát hành chính thức')}>
              <Button type="text" icon={<AuditOutlined />} className="text-green-600" onClick={() => handleTransition(record.id, 'Issued')} />
            </Tooltip>
          )}
          {(record.status === 'Reviewed' || record.status === 'Issued') && (
            <Tooltip title={t('auditReports.exportToKb', 'Xuất dữ liệu finding vào cơ sở tri thức (AI)')}>
              <Button type="text" icon={<ThunderboltOutlined />} className="text-amber-500" onClick={() => handleExportToKb(record.id)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingReport(null);
    setLinkedFindings([]);
    setRecommendationsList([]);
    form.resetFields();
    form.setFieldsValue({
      reportTemplateType: 'MB01B_DVKD',
      auditRating: 'NeedsImprovement',
      issueLocation: 'Hà Nội',
      date: dayjs().format('YYYY-MM-DD'),
      auditDate: dayjs().format('YYYY-MM-DD'),
      decisionDate: dayjs().format('YYYY-MM-DD'),
      planningPeriod: 'Từ ngày 15/04/2026 đến ngày 07/05/2026',
      fieldworkPeriod: 'Từ ngày 11/05/2026 đến ngày 22/05/2026',
      reportingPeriod: 'Từ ngày 25/05/2026 đến ngày 09/07/2026',
      leadAuditorName: 'Huỳnh Công Minh - Phó phòng',
      teamMembers: 'Vũ Hải Ninh - KTV cao cấp; Trần Thị Thúy Hằng - KTV cao cấp; Bùi Trung Hiếu - KTV chính',
    });
    setIsModalVisible(true);
  };

  const handleEdit = async (record: any) => {
    setEditingReport(record);
    try {
      const res = await api.get(`/audit-reports/${record.id}`);
      const fullData = res.data;
      setEditingReport(fullData);
      setLinkedFindings(fullData.findings || []);
      setRecommendationsList(fullData.recommendationsList || fullData.recommendations || []);
      form.setFieldsValue({
        ...fullData,
        engagementId: fullData.engagementId || fullData.engagement?.id,
        plan: fullData.plan || fullData.engagement?.name,
        auditeeUnit: fullData.auditeeUnit || fullData.branchName || fullData.engagement?.branchName,
        auditDate: fullData.auditDate || fullData.date || dayjs().format('YYYY-MM-DD'),
        date: fullData.date || dayjs().format('YYYY-MM-DD'),
        decisionNo: fullData.decisionNo || fullData.engagement?.decisionNo,
        decisionDate: fullData.decisionDate || fullData.engagement?.decisionDate,
        planningPeriod: fullData.planningPeriod || (fullData.engagement?.planningStartDate ? `Từ ngày ${fullData.engagement.planningStartDate} đến ngày ${fullData.engagement.planningEndDate}` : undefined),
        fieldworkPeriod: fullData.fieldworkPeriod || (fullData.engagement?.fieldworkStartDate ? `Từ ngày ${fullData.engagement.fieldworkStartDate} đến ngày ${fullData.engagement.fieldworkEndDate}` : undefined),
        reportingPeriod: fullData.reportingPeriod || (fullData.engagement?.reportingStartDate ? `Từ ngày ${fullData.engagement.reportingStartDate} đến ngày ${fullData.engagement.reportingEndDate}` : undefined),
        leadAuditorName: fullData.leadAuditorName || fullData.engagement?.leadAuditorUser?.fullName || fullData.engagement?.leadAuditor?.fullName || fullData.issuedBy,
        teamMembers: fullData.teamMembers || fullData.engagement?.teamMembers,
      });
    } catch {
      form.setFieldsValue(record);
    }
    setIsModalVisible(true);
  };

  const handleEngagementChange = (engagementId: number) => {
    const eng = engagements.find((e: any) => e.id === engagementId);
    if (!eng) return;

    const isHsc =
      eng.ownerTeam === 'KTNB_HSC' ||
      eng.reportTemplateType === 'MB03B_HSC' ||
      eng.auditCategory === 'HEAD_OFFICE' ||
      eng.auditCategory === 'THEMATIC';
    const isPostal =
      eng.auditCategory === 'PGDBD_TKBD' ||
      eng.reportTemplateType === 'MB02B_BDT';
    const autoAuditeeUnit = eng.branchName || eng.targetAuditProcess || eng.auditedDepartment?.name || eng.name;
    const autoBranchName = eng.branchName || (isHsc ? 'Hội sở chính' : isPostal ? 'Bưu điện tỉnh' : 'Đắk Lắk');
    const autoBranchCode = eng.branchCode || (isHsc ? 'HO001' : isPostal ? 'VN0019999' : 'VN0013200');
    const autoTargetProcess = eng.targetAuditProcess || (isHsc ? 'Thẻ tín dụng & Vận hành' : isPostal ? 'Dịch vụ Ngân hàng tại PGDBĐ' : 'Tín dụng & Phi tín dụng');
    const autoTemplateType = isHsc ? 'MB03B_HSC' : isPostal ? 'MB02B_BDT' : 'MB01B_DVKD';
    const autoDecisionNo = eng.decisionNo || '87/2026/QĐ-IA';
    const autoDecisionDate = eng.decisionDate || dayjs().format('YYYY-MM-DD');
    const autoPlanningPeriod = eng.planningStartDate ? `Từ ngày ${eng.planningStartDate} đến ngày ${eng.planningEndDate}` : 'Từ ngày 15/04/2026 đến ngày 07/05/2026';
    const autoFieldworkPeriod = eng.fieldworkStartDate ? `Từ ngày ${eng.fieldworkStartDate} đến ngày ${eng.fieldworkEndDate}` : 'Từ ngày 11/05/2026 đến ngày 22/05/2026';
    const autoReportingPeriod = eng.reportingStartDate ? `Từ ngày ${eng.reportingStartDate} đến ngày ${eng.reportingEndDate}` : 'Từ ngày 25/05/2026 đến ngày 09/07/2026';
    const autoLeadAuditor = eng.leadAuditorUser?.fullName || eng.leadAuditor?.fullName || eng.legacyLeadAuditor || 'Huỳnh Công Minh - Phó phòng';
    const autoTeamMembers = eng.teamMembers || 'Vũ Hải Ninh - KTV cao cấp; Trần Thị Thúy Hằng - KTV cao cấp; Bùi Trung Hiếu - KTV chính';
    const autoIssueLocation = isHsc ? 'Hà Nội' : (eng.branchName || 'Đắk Lắk');

    form.setFieldsValue({
      engagementId: eng.id,
      plan: eng.name,
      title: form.getFieldValue('title') || `Báo cáo kiểm toán - ${eng.name}`,
      reportTemplateType: autoTemplateType,
      auditeeUnit: autoAuditeeUnit,
      branchName: autoBranchName,
      branchCode: autoBranchCode,
      targetAuditProcess: autoTargetProcess,
      decisionNo: autoDecisionNo,
      decisionDate: autoDecisionDate,
      planningPeriod: autoPlanningPeriod,
      fieldworkPeriod: autoFieldworkPeriod,
      reportingPeriod: autoReportingPeriod,
      leadAuditorName: autoLeadAuditor,
      teamMembers: autoTeamMembers,
      issueLocation: autoIssueLocation,
      date: form.getFieldValue('date') || dayjs().format('YYYY-MM-DD'),
      auditDate: form.getFieldValue('auditDate') || dayjs().format('YYYY-MM-DD'),
      reportNo: form.getFieldValue('reportNo') || `${eng.id || 151}/2026/BCKT-IA`,
      auditRating: form.getFieldValue('auditRating') || 'NeedsImprovement',
    });

    api.get(`/audit-findings?engagementId=${eng.id}`)
      .then(res => setLinkedFindings(res.data || []))
      .catch(() => {});
  };

  const handleSyncFindings = async () => {
    const reportId = editingReport?.id;
    if (!reportId) {
      const engId = form.getFieldValue('engagementId');
      if (!engId) {
        message.warning('Vui lòng chọn Cuộc kiểm toán trước khi đồng bộ phát hiện.');
        return;
      }
      try {
        setSyncingWp(true);
        const res = await api.get(`/audit-findings?engagementId=${engId}`);
        const findingsList = res.data || [];
        setLinkedFindings(findingsList);
        message.success(`Đã đồng bộ ${findingsList.length} phát hiện từ Giấy tờ làm việc!`);
      } catch (err: any) {
        message.error('Lỗi khi lấy phát hiện từ Working Papers');
      } finally {
        setSyncingWp(false);
      }
      return;
    }

    try {
      setSyncingWp(true);
      const res = await api.post(`/audit-reports/${reportId}/sync-findings`);
      message.success(res.data.message || 'Đã đồng bộ phát hiện từ Giấy tờ làm việc thành công');
      setLinkedFindings(res.data.findings || []);
      const updated = await api.get(`/audit-reports/${reportId}`);
      setEditingReport(updated.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi đồng bộ phát hiện');
    } finally {
      setSyncingWp(false);
    }
  };

  const handleAddRecommendation = () => {
    const newRec = {
      id: Date.now(),
      target: 'Chi nhánh / ĐVKD',
      content: '',
      responsibleParty: 'Ban Giám đốc ĐVKD',
      deadline: '30 ngày kể từ ngày ban hành',
      status: 'Open',
    };
    setRecommendationsList([...recommendationsList, newRec]);
  };

  const handleRemoveRecommendation = (recId: number) => {
    setRecommendationsList(recommendationsList.filter(r => r.id !== recId));
  };

  const handleUpdateRecommendation = (recId: number, field: string, value: any) => {
    setRecommendationsList(
      recommendationsList.map(r => (r.id === recId ? { ...r, [field]: value } : r))
    );
  };

  const handleModalOk = () => {
    form.validateFields().then(async values => {
      try {
        const payload = {
          ...values,
          status: editingReport ? editingReport.status : 'Draft',
          recommendationsList,
          customFields: extractCustomFields(values),
        };

        if (editingReport) {
          await api.patch(`/audit-reports/${editingReport.id}`, payload);
          message.success(t('auditReports.updatedReport', 'Đã cập nhật báo cáo'));
        } else {
          await api.post('/audit-reports', payload);
          message.success(t('auditReports.createdDraftReport', 'Đã tạo dự thảo báo cáo'));
        }
        setIsModalVisible(false);
        fetchReports();
      } catch (error: any) {
        message.error(error.response?.data?.message || t('auditReports.errorSavingReport', 'Lỗi khi lưu báo cáo'));
      }
    });
  };

  const handleExportToKb = async (id: number) => {
    try {
      message.loading({ content: t('auditReports.exportingToKb', 'Đang phân tích và xuất vào CSDL Tri thức bằng AI (có thể mất vài phút)...'), key: 'export_kb' });
      const response = await api.post(`/audit-reports/${id}/export-to-kb`, {}, { timeout: 300000 });
      const { added, skipped } = response.data;
      message.success({ 
        content: t('auditReports.exportKbSuccess', `AI đã phân tích xong! Thêm mới ${added} mẫu sai sót, bỏ qua ${skipped} mẫu bị trùng lặp.`), 
        key: 'export_kb', 
        duration: 5 
      });
    } catch (error: any) {
      message.error({ content: t('auditReports.errorExportingKb', 'Lỗi khi xuất vào CSDL Tri thức'), key: 'export_kb' });
    }
  };

  const filteredData = data.filter((item: any) => filterRecursive(item, searchText));

  const handleExportList = () => {
    exportToExcel(filteredData, columns, 'Bao_cao_kiem_toan');
  };

  if (isModalVisible) {
    return (
      <AuditReportFormView
        isModalVisible={isModalVisible}
        editingReport={editingReport}
        engagements={engagements}
        form={form}
        linkedFindings={linkedFindings}
        recommendationsList={recommendationsList}
        syncingWp={syncingWp}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleModalOk}
        onEngagementChange={handleEngagementChange}
        onSyncFindings={handleSyncFindings}
        onAddRecommendation={handleAddRecommendation}
        onUpdateRecommendation={handleUpdateRecommendation}
        onRemoveRecommendation={handleRemoveRecommendation}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1">{t('auditReports.title', 'Báo cáo Kiểm toán')}</Title>
          <Text className="text-gray-500">{t('auditReports.subtitle', 'Quản lý và phát hành báo cáo kiểm toán nội bộ')}</Text>
        </div>
        <Space>
          <Input.Search
            placeholder={t('auditReports.searchReports', 'Tìm kiếm báo cáo...')}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 230 }}
            className="rounded-lg shadow-xs"
          />
          <Button icon={<DownloadOutlined />} onClick={handleExportList} disabled={filteredData.length === 0} className="rounded-xl h-10">
            {t('auditReports.export', 'Tải danh sách Excel')}
          </Button>
          <Button icon={<FileTextOutlined />} onClick={handleExportGlossary} className="rounded-xl h-10">
            Tải Bảng thuyết minh (BA01)
          </Button>
          <Button 
            icon={<ThunderboltOutlined />} 
            onClick={handleAutoGenerate} 
            loading={isGenerating}
            className={isGenerating ? 'rounded-xl h-10' : 'text-purple-600 border-purple-600 rounded-xl h-10'}
          >
            {isGenerating ? [t('auditReports.aiGenerating', 'AI đang tổng hợp...')] : t('auditReports.aiGenerate', 'Tự động tạo từ Phát hiện (AI)')}
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 flex items-center gap-1.5 text-white"
          >
            {t('auditReports.btnNew', 'Dự thảo mới')}
          </Button>
        </Space>
      </div>

      {/* Workflow Steps Legend */}
      <Card variant="borderless" className="shadow-sm mb-4">
        <Steps
          size="small"
          current={-1}
          items={statusFlow.map(s => ({
            title: statusLabels[s],
            icon: s === 'Issued' ? <CheckCircleOutlined /> : undefined,
          }))}
        />
      </Card>

      <Card variant="borderless" className="shadow-sm rounded-xl overflow-hidden border border-slate-200">
        <Table
          columns={columns as any}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          loading={loading}
          scroll={{ x: 1220 }}
        />
      </Card>

      {/* Comprehensive Detail Modal */}
      <AuditReportDetailModal
        open={isDetailVisible}
        detailReport={detailReport}
        onCancel={() => setIsDetailVisible(false)}
        onExport={handleExport}
        statusColors={statusColors}
        statusLabels={statusLabels}
        ratingLabels={ratingLabels}
      />
    </div>
  );
};

export default AuditReports;
