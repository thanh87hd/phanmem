import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, Tag, message, Upload } from 'antd';
import {
  PlusOutlined, EditOutlined, CheckOutlined, SafetyOutlined, DeleteOutlined,
  DownloadOutlined, CloudUploadOutlined, FileExcelOutlined, BulbOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { filterRecursive } from '../utils/excelExport';
import { hasPermission } from '../utils/permission';
import { useCurrentUser } from '../utils/useCurrentUser';
import { AuditProgramEditor } from './audit-programs/AuditProgramEditor';
import { AuditProgramQaModal } from './audit-programs/AuditProgramQaModal';
import { getStatusColor } from './audit-programs/auditProgramTypes';
import type {
  AuditProgramAttachment,
  ControlAssessmentItem,
  WorkingPaperRecord,
} from './audit-programs/auditProgramTypes';

const { Title, Text } = Typography;
const AuditPrograms: React.FC = () => {
  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return 'green';
    if (status === 'PendingReview') return 'orange';
    if (status === 'Rejected') return 'red';
    return 'default';
  };

  const getStatusText = (status: string) => {
    if (status === 'Approved') return t('AuditPrograms.status.Approved', 'Đã duyệt');
    if (status === 'PendingReview') return t('auditEngagements.statusLabels.Review', 'Chờ duyệt');
    if (status === 'Rejected') return t('AuditPrograms.status.Rejected', 'Từ chối');
    return t('auditTemplates.draft', 'Bản nháp');
  };

  const DEFAULT_CHECKLIST = [
    { key: 'c1', label: t('AuditPrograms.clearAuditObjectives', 'Mục tiêu kiểm toán rõ ràng'), checked: false },
    { key: 'c2', label: t('AuditPrograms.appropriateSamplingMethod', 'Phương pháp chọn mẫu phù hợp'), checked: false },
    { key: 'c3', label: t('AuditPrograms.fullAuditEvidence', 'Bằng chứng kiểm toán đầy đủ'), checked: false },
    { key: 'c4', label: t('AuditPrograms.logicalConclusionWithFindings', 'Kết luận logic với phát hiện'), checked: false }
  ];
  const currentUser = useCurrentUser();
  const [data, setData] = useState<any[]>([]);
  const [auditPlans, setAuditPlans] = useState<any[]>([]);
  const [workstreams, setWorkstreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isQaModalVisible, setIsQaModalVisible] = useState(false);
  const [selectedWp, setSelectedWp] = useState<any>(null);
  const [editingWp, setEditingWp] = useState<any>(null);
  const [qaReview, setQaReview] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [qaForm] = Form.useForm();

  // AI & Input Mode states
  const [wpInputMode, setWpInputMode] = useState<'template' | 'custom'>('custom');
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [controlAssessments, setControlAssessments] = useState<any[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state && location.state.applyTemplate) {
      const tpl = location.state.applyTemplate;
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditingWp(null);
      form.resetFields();
      
      const formattedObjectives = `Mục tiêu kiểm toán nghiệp vụ: ${tpl.title}\n\n${tpl.description}\n\n- Đảm bảo tính tuân thủ tuyệt đối quy định pháp luật & chốt kiểm soát nội bộ.\n- Nhận diện các điểm yếu kiểm soát để cải tiến vận hành.`;
      
      const formattedProcedures = tpl.checklist && tpl.checklist.length > 0 
        ? tpl.checklist.map((item: any, idx: number) => `Bước ${idx + 1}: ${item.task}\n- Thủ tục thực tế: [Đối chiếu chứng từ / Phỏng vấn / Chạy vết SQL Corebanking]\n- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]\n- Minh chứng (Evidence Reference): \n`).join('\n')
        : t('AuditPrograms.1CollectRelevantInformationAndDocumentsn2', '1. Thực hiện thu thập thông tin và tài liệu liên quan.\n2. Thực hiện đối chiếu kiểm tra thực tế mẫu chọn.');
        
      const formattedMethodology = t('AuditPrograms.testingMethodsVouchingReconciliationInquiryAnd', '- Phương pháp kiểm thử: Kiểm tra chứng từ (Vouching), Đối chiếu chéo (Reconciliation), Phỏng vấn (Inquiry) và Quan sát thực tế (Observation).\n- Nguồn thông tin (Population): Trích xuất dữ liệu từ Core Banking và chứng từ gốc lưu trữ tại đơn vị.');
      
      const formattedSampling = t('AuditPrograms.auditSampleSizeRandomlySelectThe', '- Quy mô mẫu kiểm toán: Chọn ngẫu nhiên hệ thống (Systematic Sampling) dựa trên tần suất chốt kiểm soát:\n  + Kiểm soát hàng ngày: chọn 25 mẫu.\n  + Kiểm soát hàng tuần: chọn 5 mẫu.\n  + Kiểm soát hàng tháng: chọn 2 mẫu.\n  + Kiểm soát hàng năm/đột xuất: kiểm tra toàn bộ (100%).\n- Phù hợp tuyệt đối với hướng dẫn chọn mẫu kiểm toán của chuẩn mực IIA & Auditboy.');

      const domainPrefix = tpl.domain ? tpl.domain.toUpperCase() : 'GEN';
      
      form.setFieldsValue({
        title: `Nghiệp vụ: ${tpl.title}`,
        objectives: formattedObjectives,
        procedures: formattedProcedures,
        methodology: formattedMethodology,
        sampleSelection: formattedSampling,
        riskDescription: `Rủi ro liên quan đến nghiệp vụ: ${tpl.title}.\nCác chốt kiểm soát vận hành không hiệu quả dẫn đến sai lệch số liệu, tổn thất tài chính hoặc vi phạm quy chế của NHNN.`,
        referenceCode: `WP-${domainPrefix}-${Date.now().toString().slice(-6)}`,
        conclusion: t('AuditPrograms.1InternalControlEffectivenessEffectivePartly', '1. Hiệu quả kiểm soát nội bộ: [Hiệu quả / Hiệu quả một phần / Không hiệu quả]\n2. Liệt kê các lỗi phát hiện (nếu có):\n   + Lỗi 1: ...\n   + Lỗi 2: ...\n3. Tham chiếu sang bảng Phát hiện kiểm toán (Audit Findings): [Liên kết số hiệu...]')
      });
      
      setIsModalVisible(true);
      
      // Clear location state so it doesn't trigger again on reload/refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, auditPlans]);

  // Offline Sync State
  const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
  const [syncWp, setSyncWp] = useState<any>(null);

  const handleExportExcel = async (record: any) => {
    try {
      message.loading({ content: t('AuditPrograms.initializingAnOfflineExcelFile', 'Đang khởi tạo tệp Excel ngoại tuyến...'), key: 'exporting' });
      const response = await api.get(`/working-papers/${record.id}/export-excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `WP_${record.referenceCode || record.id}_Offline.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: t('AuditPrograms.downloadOfflineExcelFileSuccessfully', 'Tải file Excel ngoại tuyến thành công!'), key: 'exporting' });
    } catch (error) {
      message.error({ content: t('AuditPrograms.errorWhenDownloadingExcelFile', 'Lỗi khi tải file Excel'), key: 'exporting' });
    }
  };

  const handleOpenSync = (record: any) => {
    setSyncWp(record);
    setIsSyncModalVisible(true);
  };

  const handleImportExcel = async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      message.loading({ content: t('AuditPrograms.syncingOfflineDataToTheServer', 'Đang đồng bộ dữ liệu ngoại tuyến lên máy chủ...'), key: 'syncing' });
      const res = await api.post(`/working-papers/${id}/import-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success({ content: res.data.message || t('AuditPrograms.successfulOfflineExcelSync', 'Đồng bộ Excel ngoại tuyến thành công!'), key: 'syncing' });
      setIsSyncModalVisible(false);
      fetchAuditPrograms();
    } catch (error: any) {
      message.error({ content: error.response?.data?.message || t('AuditPrograms.excelDataSyncError', 'Lỗi đồng bộ dữ liệu Excel'), key: 'syncing' });
    }
  };

  const fetchAuditPrograms = async () => {
    setLoading(true);
    try {
      const response = await api.get('/working-papers?type=Program');
      setData(response.data);
    } catch (error) {
      message.error(t('AuditPrograms.errorWhenDownloadingWorkDocuments', 'Lỗi khi tải giấy tờ làm việc'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditPlans = async () => {
    try {
      const response = await api.get('/audit-engagements');
      // Only display approved or active engagements from Kanban (not Draft or Rejected)
      const activeEngagements = (response.data || []).filter((e: any) => e.status !== 'Draft' && e.status !== 'Rejected');
      setAuditPlans(activeEngagements);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWorkstreams = async (engagementId: number) => {
    if (!engagementId) {
      setWorkstreams([]);
      return;
    }
    try {
      const response = await api.get(`/audit-engagements/${engagementId}/workstreams`);
      setWorkstreams(response.data || []);
    } catch {
      setWorkstreams([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/working-paper-templates');
      setTemplates(response.data || []);
    } catch (error) {
      console.error(t('AuditPrograms.errorLoadingFormCategory', 'Lỗi tải danh mục biểu mẫu:'), error);
    }
  };

  useEffect(() => {
    fetchAuditPrograms();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAuditPlans();
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/working-papers/${id}`);
      message.success(t('AuditPrograms.deletedWpSuccessfully', 'Đã xóa WP thành công'));
      fetchAuditPrograms();
    } catch (error) {
      message.error(t('AuditPrograms.errorDeletingWp', 'Lỗi khi xóa WP'));
    }
  };

  const handleCreateFindingFromWp = (record: any) => {
    navigate('/audit-findings', {
      state: {
        autoCreate: true,
        autoAI: true,
        engagementId: record.engagementId,
        workstreamId: record.workstreamId,
        condition: record.conclusion || record.riskDescription || '',
        title: `Phát hiện từ: ${record.title}`
      }
    });
  };

  const handleAdd = () => {
    setEditingWp(null);
    setSelectedTemplate(null);
    setAttachments([]);
    setControlAssessments([]);
    form.resetFields();
    
    let planIdToSet: number | undefined = undefined;
    if (auditPlans.length === 1) {
      planIdToSet = auditPlans[0].id;
    } else {
      const lastPlanId = localStorage.getItem('lastSelectedEngagementId');
      if (lastPlanId) planIdToSet = parseInt(lastPlanId);
    }
    
    const lastWorkstreamId = localStorage.getItem('lastSelectedWorkstreamId');
    
    form.setFieldsValue({
      referenceCode: `WP-GEN-${Date.now().toString().slice(-6)}`,
      status: 'Draft',
      planId: planIdToSet,
      workstreamId: lastWorkstreamId ? parseInt(lastWorkstreamId) : undefined,
    });
    
    if (planIdToSet) fetchWorkstreams(planIdToSet);
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingWp(record);
    const plan = auditPlans.find(p => p.name === record.planName);
    
    // Load template-related fields
    if (record.templateId) {
      const tpl = templates.find(t => t.id === record.templateId);
      setSelectedTemplate(tpl || null);
    } else {
      setSelectedTemplate(null);
    }
    setAttachments(record.attachments || []);
    setControlAssessments(record.controlAssessments || []);
    
    form.resetFields();
    form.setFieldsValue({
      ...record,
      planId: plan?.id
    });

    if (record.templateId && record.templateData) {
      const tplValues: Record<string, any> = {};
      Object.entries(record.templateData).forEach(([k, v]) => {
        tplValues[`tpl_field_${k}`] = v;
      });
      form.setFieldsValue(tplValues);
    }

    if (plan?.id) fetchWorkstreams(plan.id);
    setIsModalVisible(true);
  };

  const handleWpAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('linkedResource', 'working_paper');
    formData.append('linkedResourceId', editingWp?.id ? String(editingWp.id) : '0');
    formData.append('description', t('AuditPrograms.attachmentsAuditPrograms', 'Tài liệu đính kèm Giấy tờ làm việc'));

    try {
      message.loading({ content: t('AuditPrograms.uploading', 'Đang tải lên...'), key: 'wp_upload' });
      const response = await api.post('/evidences/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const downloadUrl = `/api/evidences/${response.data.id}/download`;
      const newAttachment = {
        name: file.name,
        fileUrl: downloadUrl,
        uploadedBy: currentUser?.fullName || currentUser?.username || 'KTV',
        uploadedAt: new Date().toISOString()
      };
      setAttachments(prev => [...prev, newAttachment]);
      message.success({ content: t('AuditPrograms.downloadedAttachedDocumentsSuccessfully', 'Tải tài liệu đính kèm thành công!'), key: 'wp_upload' });
    } catch (err) {
      console.error(err);
      message.error({ content: t('auditEngagements.errorUploadingDocument', 'Lỗi khi tải tài liệu lên'), key: 'wp_upload' });
    }
  };

  const handleAddControl = () => {
    const newCtrl = {
      controlId: `CTRL-NEW-${Date.now().toString().slice(-6)}`,
      controlDescription: '',
      designEffectiveness: t('AuditPrograms.obtain', 'Đạt'),
      operatingEffectiveness: t('AuditPrograms.obtain', 'Đạt'),
      testConclusion: ''
    };
    setControlAssessments(prev => [...prev, newCtrl]);
  };

  const handleUpdateControl = (index: number, field: string, value: string) => {
    setControlAssessments(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const handleRemoveControl = (index: number) => {
    setControlAssessments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleModalOk = () => {
    form.validateFields().then(async values => {
      const plan = auditPlans.find(p => p.id === values.planId);
      
      if (values.planId) localStorage.setItem('lastSelectedEngagementId', values.planId.toString());
      if (values.workstreamId) localStorage.setItem('lastSelectedWorkstreamId', values.workstreamId.toString());
      
      const templateData: Record<string, any> = {};
      if (selectedTemplate && selectedTemplate.fields) {
        selectedTemplate.fields.forEach((f: any) => {
          templateData[f.name] = values[`tpl_field_${f.name}`];
        });
      }

      try {
        const payload = {
          planName: plan?.name || 'Unknown Plan',
          engagementId: values.planId,
          workstreamId: values.workstreamId,
          title: values.title,
          referenceCode: values.referenceCode,
          objectives: values.objectives,
          riskDescription: values.riskDescription,
          methodology: values.methodology,
          sampleSelection: values.sampleSelection,
          procedures: values.procedures,
          conclusion: values.conclusion,
          creator: editingWp ? editingWp.creator : t('AuditPrograms.auditor', 'Kiểm toán viên'),
          status: editingWp ? editingWp.status : 'Draft',
          
          templateId: selectedTemplate?.id || null,
          attachments: attachments,
          controlAssessments: controlAssessments,
          templateData: templateData,
          type: 'Program'
        };

        if (editingWp) {
          await api.patch(`/working-papers/${editingWp.id}`, payload);
          message.success(t('AuditPrograms.workDocumentsUpdatedSuccessfully', 'Đã cập nhật Giấy tờ làm việc thành công!'));
        } else {
          await api.post('/working-papers', payload);
          message.success(t('AuditPrograms.newAuditProgramsCreatedSuccessfully', 'Đã tạo Giấy tờ làm việc mới thành công!'));
        }
        setIsModalVisible(false);
        fetchAuditPrograms();
      } catch (error: any) {
        message.error(error.response?.data?.message || t('AuditPrograms.errorWhenSavingWorkDocuments', 'Lỗi khi lưu giấy tờ làm việc'));
      }
    });
  };

  const handleRealTemplateSelect = (templateId: number) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    
    setSelectedTemplate(tpl);
    
    const domainPrefix = tpl.category ? tpl.category.toUpperCase() : 'GEN';
    const initData: Record<string, any> = {};
    if (tpl.fields) {
      tpl.fields.forEach((f: any) => {
        initData[`tpl_field_${f.name}`] = '';
      });
    }

    form.setFieldsValue({
      templateId: tpl.id,
      title: tpl.name,
      referenceCode: `WP-${domainPrefix}-${Date.now().toString().slice(-6)}`,
      objectives: tpl.templateContent?.description || `Mục tiêu kiểm toán nghiệp vụ: ${tpl.name}`,
      riskDescription: `Rủi ro liên quan đến nghiệp vụ: ${tpl.name}.\nCác chốt kiểm soát vận hành không hiệu quả dẫn đến sai lệch số liệu, tổn thất tài chính hoặc vi phạm quy chế của NHNN.`,
      methodology: t('AuditPrograms.inspectionMethodsReconciliationInterviewAndObservation', 'Phương pháp kiểm tra: Đối chiếu chéo (Reconciliation), Phỏng vấn (Inquiry) và Quan sát thực tế (Observation).'),
      sampleSelection: t('AuditPrograms.samplingMethodRandomlySelectTheSystem', 'Phương pháp chọn mẫu: Chọn ngẫu nhiên hệ thống (Systematic Sampling) dựa trên tần suất chốt kiểm soát.'),
      procedures: tpl.fields ? tpl.fields.map((f: any, idx: number) => `Bước ${idx + 1}: Kiểm tra ${f.label}\n- Trạng thái kiểm tra: \n- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]\n- Minh chứng: \n`).join('\n') : t('AuditPrograms.carryOutDetailedInspectionStepsAccording', 'Thực hiện các bước kiểm tra chi tiết theo quy trình.'),
      conclusion: t('AuditPrograms.1InternalControlEffectivenessEffectivePartly', '1. Hiệu quả kiểm soát nội bộ: [Hiệu quả / Hiệu quả một phần / Không hiệu quả]\n2. Liệt kê các lỗi phát hiện (nếu có):\n   + Lỗi 1: ...\n3. Tham chiếu sang bảng Phát hiện kiểm toán (Audit Findings): [Liên kết số hiệu...]'),
      ...initData
    });
    
    // eslint-disable-next-line no-useless-assignment
    let defaultControls: any[] = [];
    if (tpl.category === 'KHCN' || tpl.category === 'KHDN') {
      defaultControls = [
        { controlId: 'CTRL-CRED-01', controlDescription: t('AuditPrograms.checkLegalDocumentsAndCreditConditions', 'Kiểm tra hồ sơ pháp lý và điều kiện cấp tín dụng của khách hàng'), designEffectiveness: t('AuditPrograms.obtain', 'Đạt'), operatingEffectiveness: t('AuditPrograms.obtain', 'Đạt'), testConclusion: t('AuditPrograms.operatesWell', 'Vận hành tốt') },
        { controlId: 'CTRL-CRED-02', controlDescription: t('AuditPrograms.checkCreditApprovalAccordingToPrescribed', 'Kiểm tra phê duyệt tín dụng đúng thẩm quyền quy định'), designEffectiveness: t('AuditPrograms.obtain', 'Đạt'), operatingEffectiveness: t('AuditPrograms.obtain', 'Đạt'), testConclusion: t('AuditPrograms.operatesWell', 'Vận hành tốt') },
        { controlId: 'CTRL-CRED-03', controlDescription: t('AuditPrograms.checkRegistrationOfSecuredTransactionsFor', 'Kiểm tra đăng ký giao dịch bảo đảm đối với tài sản thế chấp'), designEffectiveness: t('AuditPrograms.obtain', 'Đạt'), operatingEffectiveness: t('AuditPrograms.obtain', 'Đạt'), testConclusion: t('AuditPrograms.operatesWell', 'Vận hành tốt') }
      ];
    } else if (tpl.category === t('AuditPrograms.floortreasury', 'Sàn/Kho quỹ')) {
      defaultControls = [
        { controlId: 'CTRL-CASH-01', controlDescription: t('AuditPrograms.proceduresForCrosscountingCashBalancesAt', 'Thủ tục kiểm kê tồn quỹ tiền mặt cuối ngày chéo giữa thủ quỹ và kiểm soát viên'), designEffectiveness: t('AuditPrograms.obtain', 'Đạt'), operatingEffectiveness: t('AuditPrograms.obtain', 'Đạt'), testConclusion: t('AuditPrograms.operatesWell', 'Vận hành tốt') },
        { controlId: 'CTRL-CASH-02', controlDescription: t('AuditPrograms.controlTheMaximumCashBalanceLimit', 'Chốt kiểm soát hạn mức tồn quỹ tiền mặt tối đa tại chi nhánh'), designEffectiveness: t('AuditPrograms.obtain', 'Đạt'), operatingEffectiveness: t('AuditPrograms.obtain', 'Đạt'), testConclusion: t('AuditPrograms.operatesWell', 'Vận hành tốt') }
      ];
    } else {
      defaultControls = [
        { controlId: 'CTRL-GEN-01', controlDescription: t('AuditPrograms.controlAndApproveDocumentsrecordsAccordingTo', 'Kiểm soát phê duyệt chứng từ/hồ sơ đúng thẩm quyền'), designEffectiveness: t('AuditPrograms.obtain', 'Đạt'), operatingEffectiveness: t('AuditPrograms.obtain', 'Đạt'), testConclusion: t('AuditPrograms.operatesWell', 'Vận hành tốt') }
      ];
    }
    setControlAssessments(defaultControls);

    message.success(`Đã nạp biểu mẫu ${tpl.name}!`);
  };

  const handleTemplateSelect = (value: string) => {
    const sug = {
      title: '',
      objectives: '',
      riskDescription: '',
      methodology: '',
      sampleSelection: '',
      procedures: '',
      conclusion: '',
      referenceCode: ''
    };

    const domainPrefix = value === 'credit' ? 'CREDIT' : 
                         value === 'it' ? 'IT' : 
                         value === 'op' ? 'OP' : 'GEN';

    sug.referenceCode = `WP-${domainPrefix}-${Date.now().toString().slice(-6)}`;

    if (value === 'credit') {
      sug.title=t('AuditPrograms.auditOfCreditGrantingProcessSecurity', 'Kiểm toán Quy trình Cấp tín dụng & Thẩm định tài sản bảo đảm');
      sug.objectives = `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính đầy đủ, hợp pháp và hợp lệ của hồ sơ thẩm định tín dụng, đảm bảo việc phê duyệt tuân thủ đúng thẩm quyền quy định.
- Đánh giá tính hiện hữu, tính thanh khoản và giá trị định giá của tài sản thế chấp bảo đảm cho khoản vay.
- Đánh giá việc kiểm tra sau cho vay và giám sát dòng tiền giải ngân của khách hàng.
- Phù hợp với Tiêu chuẩn IIA 1200 (Tính chuyên nghiệp) và Tiêu chuẩn IIA 2100 (Quản trị rủi ro).`;

      sug.riskDescription = `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro cán bộ tín dụng thông đồng, định giá quá cao giá trị tài sản bảo đảm hoặc bỏ qua bước thẩm định thực tế.
- Rủi ro khách hàng sử dụng vốn sai mục đích, phát sinh nợ xấu, tổn thất vốn của LPBank.
- Rủi ro hồ sơ pháp lý tài sản bị tranh chấp, không thể phát mãi thu hồi nợ khi xảy ra biến cố.`;

      sug.methodology = `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Kiểm tra tài liệu (Vouching): Rà soát tờ trình thẩm định, biên bản định giá, hồ sơ công chứng thế chấp.
- Phỏng vấn (Inquiry): Phỏng vấn cán bộ tín dụng và cán bộ kiểm soát rủi ro về quy trình chốt chặn phê duyệt.
- Đối chiếu chéo (Reconciliation): Đối chiếu hạn mức tín dụng được duyệt trên Core với tờ trình phê duyệt bản cứng.`;

      sug.sampleSelection = `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp chọn mẫu: Chọn mẫu ngẫu nhiên hệ thống (Systematic Sampling) kết hợp chọn mẫu theo phán đoán rủi ro (Judgmental Sampling) đối với các khoản vay phát sinh mới trong kỳ.
- Kích thước mẫu: Chọn 25 hồ sơ giải ngân lớn nhất và 5 hồ sơ giải ngân sát hạn mức phê duyệt.
- Tổng thể mẫu (Population): Toàn bộ danh sách giải ngân của Chi nhánh/Phân khúc trong kỳ đánh giá rủi ro.`;

      sug.procedures = `Bước 1: Thu thập danh sách giải ngân và hồ sơ pháp lý khách hàng.
- Thủ tục thực tế: Trích xuất lịch sử giải ngân trên Core Banking và đối chiếu với hồ sơ lưu trữ bản cứng.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng (Evidence Reference): Hồ sơ số 01 - 25.

Bước 2: Kiểm tra chốt kiểm soát phê duyệt tín dụng.
- Thủ tục thực tế: Đối chiếu chữ ký của cấp phê duyệt với bảng phân quyền phê duyệt tín dụng của LPBank.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Biên bản phê duyệt Hội đồng Tín dụng.

Bước 3: Kiểm tra định giá và thẩm định thực tế tài sản bảo đảm.
- Thủ tục thực tế: Rà soát biên bản định giá tài sản bảo đảm, kiểm tra sự tồn tại của ảnh chụp thực địa và tọa độ định vị GPS.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Chứng thư định giá & ảnh chụp thực địa TSĐB.`;

      sug.conclusion = `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Kiểm soát nội bộ đối với quy trình cấp tín dụng vận hành [Hiệu quả / Hiệu quả một phần / Không hiệu quả].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: Thiếu ảnh chụp thực địa có gắn tọa độ GPS đối với 3 tài sản thế chấp là bất động sản ngoại tỉnh.
   - Phát hiện 2: Biên bản họp phê duyệt hạn mức tín dụng thiếu chữ ký chốt của thành viên độc lập kiểm soát rủi ro.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-CREDIT-01, F-CREDIT-02] để gửi Trưởng đoàn xem xét.`;

    } else if (value === 'it') {
      sug.title=t('AuditPrograms.coreBankingIncidentAuditOperationalContinuity', 'Kiểm toán Sự cố Core Banking & Quản trị tính liên tục hoạt động');
      sug.objectives = `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính hiệu quả của các biện pháp bảo vệ thông tin, kiểm soát truy cập và quản lý tài khoản người dùng trên hệ thống core.
- Đánh giá quy trình quản lý sự cố, quy trình khôi phục sau thảm họa và tính liên tục vận hành.
- Phù hợp với Tiêu chuẩn IIA 2110.A2 (Đánh giá quản trị CNTT) và tiêu chuẩn bảo mật ISO 27001 / COBIT 2019.`;

      sug.riskDescription = `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro truy cập trái phép vào cơ sở dữ liệu core banking gây rò rỉ dữ liệu nhạy cảm của khách hàng.
- Rủi ro sự cố hệ thống kéo dài (downtime) mà không có failover tự động dẫn đến gián đoạn thanh toán toàn diện.
- Rủi ro tài khoản đặc quyền (Superuser) không được giám sát nhật ký (Audit logs) phát sinh gian lận nội bộ.`;

      sug.methodology = `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Phân tích Nhật ký (Log Analysis): Rà soát nhật ký truy cập hệ thống của các tài khoản Admin.
- Quan sát thực tế (Observation): Kiểm tra chốt an ninh phòng máy chủ và vị trí đặt máy chủ DR backup.
- Chạy vết cấu hình (Vulnerability/Config Check): Kiểm tra cấu hình mật mã và chính sách mật khẩu.`;

      sug.sampleSelection = `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp chọn mẫu: Chọn mẫu theo chủ đích (Judgmental Sampling) nhắm vào các tài khoản có quyền truy cập cao nhất và các sự kiện lỗi hệ thống mức độ nghiêm trọng trong năm.
- Kích thước mẫu: Kiểm tra 100% tài khoản Admin đang hoạt động và rà soát chi tiết 3 sự cố downtime nghiêm trọng nhất.`;

      sug.procedures = `Bước 1: Kiểm tra phân quyền và quản lý tài khoản đặc quyền.
- Thủ tục thực tế: Trích xuất danh sách tài khoản có quyền Admin từ Database và đối chiếu với danh sách phê duyệt của Khối Công nghệ.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: System User Directory logs.

Bước 2: Rà soát nhật ký Audit Logs của tài khoản đặc quyền.
- Thủ tục thực tế: Chạy query kiểm tra tính liên tục của Audit Logs, đảm bảo không có khoảng trống thời gian log bị tắt hoặc bị xóa.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Splunk log query screenshots.

Bước 3: Rà soát quy trình diễn tập DR và khôi phục sự cố.
- Thủ tục thực tế: Kiểm tra biên bản diễn tập khôi phục thảm họa gần nhất và đo lường chỉ số RTO/RPO thực tế.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: DR Drill Report 2026.`;

      sug.conclusion = `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Kiểm soát an toàn thông tin vận hành [Hiệu quả / Hiệu quả một phần / Không hiệu quả].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: 02 tài khoản cựu nhân sự đã nghỉ việc từ tháng 03/2026 vẫn chưa bị de-active quyền truy cập hệ thống Core.
   - Phát hiện 2: Nhật ký hoạt động của tài khoản quản trị CSDL chưa được lưu trữ độc lập tại phân vùng bảo mật riêng.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-IT-01, F-IT-02] để gửi Trưởng đoàn xem xét.`;

    } else if (value === 'op') {
      sug.title=t('AuditPrograms.auditOfFundOperationsAndCash', 'Kiểm toán Vận hành Quỹ và Giao dịch Tiền mặt tại Chi nhánh');
      sug.objectives = `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính tuân thủ quy trình kiểm kê quỹ, đối chiếu chứng từ kế toán cuối ngày và hạch toán chi phí.
- Đánh giá tính hiệu lực của kiểm soát phân tách trách nhiệm giữa kế toán viên và thủ quỹ.
- Đánh giá quy trình phê duyệt và thanh toán chi phí hoạt động nội bộ.`;

      sug.riskDescription = `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro thất thoát tiền mặt tại quỹ do không thực hiện đúng quy định kiểm kê chéo cuối ngày.
- Rủi ro gian lận hạch toán khống chi phí mua sắm để trục lợi cá nhân.
- Rủi ro cán bộ kiêm nhiệm nhiều vai trò xung đột (lập phiếu và phê duyệt thanh toán).`;

      sug.methodology = `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Kiểm tra thực tế (Physical Inspection): Tham gia chứng kiến kiểm kê quỹ tiền mặt đột xuất tại chi nhánh.
- Vouching: Kiểm tra tính hợp pháp của các hóa đơn VAT và chứng từ thanh toán đính kèm phiếu chi.
- Đối chiếu chéo: So sánh số dư sổ quỹ tiền mặt với số dư trên tài khoản GL Core Banking.`;

      sug.sampleSelection = `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp chọn mẫu: Chọn mẫu ngẫu nhiên (Random Sampling) kết hợp chọn mẫu theo ngưỡng giá trị lớn (Monetary Unit Sampling).
- Kích thước mẫu: Chọn 30 chứng từ chi tiêu mua sắm nội bộ có giá trị lớn nhất và 10 chứng từ chọn ngẫu nhiên trong năm.`;

      sug.procedures = `Bước 1: Chứng kiến kiểm kê quỹ tiền mặt đột xuất.
- Thủ tục thực tế: Thực hiện đếm tiền mặt thực tế tại két và đối chiếu với biên bản khóa sổ quỹ thời gian thực.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Biên bản kiểm quỹ ngày dd/mm/yyyy.

Bước 2: Kiểm tra chốt kiểm soát phê duyệt và phân tách trách nhiệm.
- Thủ tục thực tế: Rà soát danh sách user hạch toán và phê duyệt trên Core, đảm bảo không có tình trạng 1 user thực hiện cả 2 bước.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: GL Accounting transaction logs.

Bước 3: Rà soát tính hợp lệ của hóa đơn, chứng từ chi tiêu.
- Thủ tục thực tế: Tra cứu mã hóa đơn trên cổng thông tin của Tổng cục Thuế để xác thực hóa đơn đang hoạt động, không phải hóa đơn khống.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Hóa đơn điện tử VAT references.`;

      sug.conclusion = `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Kiểm soát vận hành và kế toán hạch toán [Hiệu quả / Hiệu quả một phần / Không hiệu quả].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: Có 03 khoản chi mua sắm tài sản cố định trên 50 triệu đồng không thực hiện chào giá cạnh tranh 3 bên theo quy chế.
   - Phát hiện 2: Biên bản kiểm kê quỹ tiền mặt cuối ngày thiếu chữ ký xác nhận độc lập của Kiểm soát viên/Giám đốc Chi nhánh.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-OP-01] để gửi Trưởng đoàn xem xét.`;
    }

    form.setFieldsValue({
      title: sug.title,
      referenceCode: sug.referenceCode,
      objectives: sug.objectives,
      riskDescription: sug.riskDescription,
      methodology: sug.methodology,
      sampleSelection: sug.sampleSelection,
      procedures: sug.procedures,
      conclusion: sug.conclusion
    });

    message.success(t('AuditPrograms.thematicFormHasBeenLoadedSuccessfully', 'Đã nạp Mẫu nghiệp vụ thành công!'));
  };

  const runAIIACopilot = async () => {
    const title = form.getFieldValue('title');
    if (!title || title.trim().length < 5) {
      message.warning(t('AuditPrograms.pleaseEnterWorkPaperNameSubject', 'Vui lòng nhập Tên / Chủ đề Giấy tờ làm việc dài hơn 5 ký tự để AI nhận diện nghiệp vụ.'));
      return;
    }

    setAiLoading(true);
    try {
      const response = await api.post('/ai/suggest-working-paper', { title }, { timeout: 15000 });
      setAiSuggestions(response.data);
      message.success(t('AuditPrograms.iiaStandardSuggestionAnalysisFromLocal', 'Đã hoàn thành phân tích gợi ý chuẩn IIA từ AI cục bộ!'));
    } catch (error: any) {
      message.error(error.response?.data?.message || t('AuditPrograms.errorConnectingToAiAssistantIia', 'Lỗi khi kết nối với Trợ lý AI IIA Copilot'));
    } finally {
      setAiLoading(false);
    }
  };

  const openQaModal = async (record: any) => {
    setSelectedWp(record);
    try {
      // Find existing QA Review
      const res = await api.get(`/quality-reviews?workingPaperId=${record.id}`);
      if (res.data) {
        setQaReview(res.data);
        qaForm.setFieldsValue({
          checklist: res.data.checklist || DEFAULT_CHECKLIST,
          selfReviewNotes: res.data.selfReviewNotes,
          supervisorReviewNotes: res.data.supervisorReviewNotes,
          independentReviewNotes: res.data.independentReviewNotes,
        });
      } else {
        setQaReview(null);
        qaForm.setFieldsValue({ checklist: DEFAULT_CHECKLIST });
      }
      setIsQaModalVisible(true);
    } catch (error) {
      message.error(t('AuditPrograms.errorLoadingQaData', 'Lỗi tải dữ liệu QA'));
    }
  };

  const handleQaSubmit = async (level: string, action: string) => {
    try {
      const values = await qaForm.validateFields();
      const payload = { ...qaReview, workingPaperId: selectedWp.id, workingPaperTitle: selectedWp.title, checklist: values.checklist };

      if (level === 'self') {
        payload.selfReviewStatus = 'Completed';
        payload.selfReviewNotes = values.selfReviewNotes;
      } else if (level === 'supervisor') {
        payload.supervisorReviewStatus = action;
        payload.supervisorReviewNotes = values.supervisorReviewNotes;
      } else if (level === 'independent') {
        payload.independentReviewStatus = action;
        payload.independentReviewNotes = values.independentReviewNotes;
        payload.overallStatus = action === 'Approved' ? 'Approved' : 'Draft';
      }

      if (qaReview?.id) {
        await api.patch(`/quality-reviews/${qaReview.id}`, payload);
      } else {
        await api.post('/quality-reviews', payload);
      }

      // Update WP status if needed
      if (level === 'self') await api.patch(`/working-papers/${selectedWp.id}`, { status: 'PendingReview' });
      if (level === 'independent' && action === 'Approved') await api.patch(`/working-papers/${selectedWp.id}`, { status: 'Approved' });
      if (action === 'Rejected') await api.patch(`/working-papers/${selectedWp.id}`, { status: 'Rejected' });

      message.success(t('AuditPrograms.updatedQualityReview', 'Đã cập nhật Quality Review'));
      setIsQaModalVisible(false);
      fetchAuditPrograms();
    } catch (error) {
      message.error(t('AuditPrograms.qaUpdateError', 'Lỗi cập nhật QA'));
    }
  };

  const columns = [
    { 
      title: t('AuditPrograms.cols.code', 'Mã WP'), 
      dataIndex: 'referenceCode', 
      key: 'referenceCode',
      width: '12%',
      render: (code: string) => <Tag color="geekblue" className="font-mono font-semibold">{code || 'WP-GEN-101'}</Tag>
    },
    { title: t('AuditPrograms.cols.planName', 'Cuộc kiểm toán'), dataIndex: 'planName', key: 'planName', width: '22%' },
    { title: t('AuditPrograms.cols.title', 'Tên / Chủ đề WP'), dataIndex: 'title', key: 'title', width: '28%' },
    { title: t('AuditPrograms.cols.creator', 'Người lập'), dataIndex: 'creator', key: 'creator', width: '12%' },
    { 
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status',
      width: '10%',
      render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          {record.status === 'Draft' && (
             <>
               {hasPermission(currentUser, 'wp:edit', record.engagement?.ownerTeam || record.engagement?.branchCode, record.creatorId) && (
                 <>
                   <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} title="Sửa trực tuyến" />
                   <Button type="text" icon={<BulbOutlined />} className="text-purple-600 font-semibold" onClick={() => handleCreateFindingFromWp(record)} title="Tạo Phát hiện">{t('common.btnCreateFinding', 'Tạo Phát hiện')}</Button>
                   <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleExportExcel(record)}>{t('common.btnDownloadOffline', 'Tải ngoại tuyến')}</Button>
                   <Button type="link" size="small" icon={<CloudUploadOutlined />} onClick={() => handleOpenSync(record)} className="!text-amber-600">{t('common.btnSyncExcel', 'Đồng bộ Excel')}</Button>
                 </>
               )}
               {hasPermission(currentUser, 'wp:delete') && (
                 <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
               )}
               {hasPermission(currentUser, 'wp:edit', record.engagement?.ownerTeam || record.engagement?.branchCode, record.creatorId) && (
                 <Button 
                   type="primary" 
                   size="small" 
                   icon={<SafetyOutlined />} 
                   onClick={() => openQaModal(record)}
                   className="bg-[#ea9105] hover:bg-[#d07e00] border-none rounded-md font-semibold text-xs px-3 h-7 text-white"
                 >
                   Nộp QA Review
                 </Button>
               )}
             </>
          )}
          {(record.status === 'PendingReview' || record.status === 'Rejected') && (
            <Button 
              type="primary" 
              size="small" 
              icon={<SafetyOutlined />} 
              onClick={() => openQaModal(record)}
              className="bg-[#ea9105] hover:bg-[#d07e00] border-none rounded-md font-semibold text-xs px-3 h-7 text-white"
            >
              {hasPermission(currentUser, 'wp:review') || hasPermission(currentUser, 'wp:approve') ? 'Quality Review' : 'Xem QA Review'}
            </Button>
          )}
          {record.status === 'Approved' && (
            <Button type="text" icon={<CheckOutlined />} className="text-green-500 font-semibold text-xs">{t('common.completed', 'Đã hoàn thành')}</Button>
          )}
        </Space>
      ),
    },
  ];

  const filteredData = data.filter((item: any) => filterRecursive(item, searchText));

  if (isQaModalVisible) {
    return (
      <AuditProgramQaModal
        open={isQaModalVisible}
        onClose={() => setIsQaModalVisible(false)}
        selectedWp={selectedWp}
        qaReview={qaReview}
        qaForm={qaForm}
        currentUser={currentUser}
        handleQaSubmit={handleQaSubmit}
      />
    );
  }

  if (isModalVisible) {
    return (
      <AuditProgramEditor
        open={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setAiSuggestions(null);
        }}
        editingWp={editingWp}
        form={form}
        auditPlans={auditPlans}
        workstreams={workstreams}
        fetchWorkstreams={fetchWorkstreams}
        templates={templates}
        selectedTemplate={selectedTemplate}
        attachments={attachments}
        setAttachments={setAttachments}
        controlAssessments={controlAssessments}
        wpInputMode={wpInputMode}
        setWpInputMode={setWpInputMode}
        aiSuggestions={aiSuggestions}
        setAiSuggestions={setAiSuggestions}
        aiLoading={aiLoading}
        runAIIACopilot={runAIIACopilot}
        handleModalOk={handleModalOk}
        handleRealTemplateSelect={handleRealTemplateSelect}
        handleWpAttachmentUpload={handleWpAttachmentUpload}
        handleAddControl={handleAddControl}
        handleUpdateControl={handleUpdateControl}
        handleRemoveControl={handleRemoveControl}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Giấy tờ làm việc & Quality Control</Title>
        <Space>
          <Input.Search
            placeholder={t('AuditPrograms.searchWp', 'Tìm kiếm WP...')}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
            className="rounded-lg shadow-sm"
          />
          {hasPermission(currentUser, 'wp:create') && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAdd}
              className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] text-white border-none font-semibold h-10 flex items-center gap-1.5"
            >
              Tạo WP
            </Button>
          )}
        </Space>
      </div>

      <Card variant="borderless" className="shadow-sm rounded-2xl overflow-hidden border border-slate-100">
        <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} />
      </Card>

      {/* Excel Offline Sync Modal */}
      <Modal
        title={<><CloudUploadOutlined className="text-amber-500 mr-2"/> {t('AuditPrograms.syncWorkPapersOffline', 'Đồng bộ Giấy tờ làm việc Ngoại tuyến')}</>}
        open={isSyncModalVisible}
        onCancel={() => setIsSyncModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="py-4 text-center">
          <FileExcelOutlined className="text-5xl text-green-600 mb-4" />
          <Title level={4}>{t('AuditPrograms.syncExcelV30', 'Đồng bộ Excel v3.0')}</Title>
          <Text className="block mb-4 text-gray-500 text-sm">
            {t('AuditPrograms.selectYourEditedOfflineAuditPrograms', 'Chọn tệp Excel giấy tờ làm việc ngoại tuyến đã chỉnh sửa của')} <strong>{syncWp?.title}</strong> {t('AuditPrograms.toSyncDirectlyToTheServer', 'để đồng bộ trực tiếp lên máy chủ.')}
          </Text>

          <Upload
            beforeUpload={(file) => {
              handleImportExcel(syncWp?.id, file);
              return false; // Prevent automatic upload
            }}
            showUploadList={false}
            accept=".xlsx"
          >
            <Button type="primary" size="large" icon={<CloudUploadOutlined />}>
              {t('AuditPrograms.selectAndSyncNow', 'Chọn và Đồng bộ Ngay')}
            </Button>
          </Upload>

          <Text className="block mt-4 text-xs text-red-500 font-semibold">
            {t('AuditPrograms.noteKeepTheTitleLineAnd', '⚠️ Lưu ý: Giữ nguyên dòng tiêu đề và mã ID của tệp Excel để tránh sai lệch dữ liệu.')}
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default AuditPrograms;
