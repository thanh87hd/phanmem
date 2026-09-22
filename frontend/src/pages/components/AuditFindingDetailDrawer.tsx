import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  Button, 
  Space, 
  Typography, 
  Card, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  Tag, 
  Row, 
  Col, 
  Table, 
  message 
} from 'antd';
import { 
  PlusOutlined, 
  DownloadOutlined,
  LeftOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  SaveOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { analyzeBankingFindingHeuristics } from './findingAiHeuristics';
import { FindingAppendicesManager } from './FindingAppendicesManager';
import { FindingAiCopilotPanel } from './FindingAiCopilotPanel';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export interface AuditFindingDetailDrawerProps {
  visible: boolean;
  onClose: () => void;
  editingRecord: any | null;
  engagements: any[];
  users: any[];
  units: any[];
  defectCodes: any[];
  internalDefectCodes: any[];
  nd340DefectCodes: any[];
  nhanSuDefectCodes: any[];
  currentUser: any;
  onSuccess: () => void;
  initialValues?: any;
  autoAI?: boolean;
}

export const AuditFindingDetailDrawer: React.FC<AuditFindingDetailDrawerProps> = ({
  visible,
  onClose,
  editingRecord,
  engagements,
  users,
  units,
  defectCodes,
  internalDefectCodes,
  nd340DefectCodes,
  nhanSuDefectCodes,
  currentUser,
  onSuccess,
  initialValues,
  autoAI,
}) => {
  const [form] = Form.useForm();
  const [workstreams, setWorkstreams] = useState<any[]>([]);
  const [appendices, setAppendices] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [autoSuggestData, setAutoSuggestData] = useState<any>(null);
  const [crossCheckAlert, setCrossCheckAlert] = useState<any>(null);

  const conditionValue = Form.useWatch('condition', form);
  const consequenceValue = Form.useWatch('consequence', form);

  // Fetch workstreams for selected engagement
  const fetchWorkstreams = async (engagementId: number) => {
    try {
      const response = await api.get(`/audit-engagements/${engagementId}/workstreams`);
      setWorkstreams(response.data || []);
    } catch (err) {
      console.error('Failed to load workstreams', err);
    }
  };

  // Sync initial / editing record on drawer open
  useEffect(() => {
    if (!visible) {
      setAiSuggestions(null);
      setAutoSuggestData(null);
      setCrossCheckAlert(null);
      return;
    }

    form.resetFields();

    if (editingRecord) {
      setAppendices(editingRecord.appendices || []);
      form.setFieldsValue({
        ...editingRecord,
        title: editingRecord.findingTitle,
        internalDefectCode: editingRecord.internalDefectCode || editingRecord.legacyInternalDefectCode || editingRecord.internalDefectCodeEntity?.code,
        internalDefectCodeId: editingRecord.internalDefectCodeId || editingRecord.internalDefectCodeEntity?.id,
        nd340DefectCode: editingRecord.nd340DefectCode || editingRecord.legacyNd340DefectCode || editingRecord.nd340DefectCodeEntity?.code,
        nd340DefectCodeId: editingRecord.nd340DefectCodeId || editingRecord.nd340DefectCodeEntity?.id,
        nhanSuDefectCode: editingRecord.nhanSuDefectCode || editingRecord.legacyNhanSuDefectCode || editingRecord.nhanSuDefectCodeEntity?.code,
        nhanSuDefectCodeId: editingRecord.nhanSuDefectCodeId || editingRecord.nhanSuDefectCodeEntity?.id,
        businessProcessId: editingRecord.businessProcessId || editingRecord.businessProcessEntity?.id,
        businessProcess: editingRecord.businessProcess || editingRecord.legacyBusinessProcess,
        proposerUserId: editingRecord.proposerUserId || editingRecord.proposerUser?.id,
        proposerOfficer: editingRecord.proposerOfficer || editingRecord.legacyProposerOfficer || editingRecord.proposerUser?.fullName,
        appraiserUserId: editingRecord.appraiserUserId || editingRecord.appraiserUser?.id,
        appraiserOfficer: editingRecord.appraiserOfficer || editingRecord.legacyAppraiserOfficer || editingRecord.appraiserUser?.fullName,
        businessLeaderUserId: editingRecord.businessLeaderUserId || editingRecord.businessLeaderUser?.id,
        businessLeader: editingRecord.businessLeader || editingRecord.legacyBusinessLeader || editingRecord.businessLeaderUser?.fullName,
        branchCode: editingRecord.branchCode || editingRecord.engagement?.branchCode,
        managingBranchName: editingRecord.managingBranchName || editingRecord.legacyManagingBranchName || editingRecord.managingBranch?.name || editingRecord.engagement?.branchName,
        managingBranchCode: editingRecord.managingBranchCode || editingRecord.legacyManagingBranchCode || editingRecord.managingBranch?.code || editingRecord.engagement?.branchCode,
        managingBranchId: editingRecord.managingBranchId || editingRecord.managingBranch?.id || editingRecord.engagement?.auditedDepartmentId,
        actualFineAmount: editingRecord.actualFineAmount,
      });
      if (editingRecord.engagementId) {
        fetchWorkstreams(editingRecord.engagementId);
      }
    } else if (initialValues) {
      setAppendices([]);
      form.setFieldsValue(initialValues);
      if (initialValues.engagementId) {
        fetchWorkstreams(initialValues.engagementId);
      }
      if (autoAI && initialValues.condition) {
        runAICopilot(initialValues.condition);
      }
    } else {
      setAppendices([]);
      let engagementIdToSet: number | undefined = undefined;
      if (engagements.length === 1) {
        engagementIdToSet = engagements[0].id;
      } else {
        const lastPlanId = localStorage.getItem('lastSelectedEngagementId');
        if (lastPlanId) engagementIdToSet = parseInt(lastPlanId);
      }
      
      const lastWorkstreamId = localStorage.getItem('lastSelectedWorkstreamId');
      const selectedEng = engagements.find(e => e.id === engagementIdToSet);

      form.setFieldsValue({
        engagementId: engagementIdToSet,
        workstreamId: lastWorkstreamId ? parseInt(lastWorkstreamId) : undefined,
        reportedByAuditorId: currentUser?.id,
        branchCode: selectedEng?.branchCode || 'CN001',
        managingBranchName: selectedEng?.branchName || selectedEng?.legacyAuditedDepartment || 'Hội Sở Chính',
        managingBranchCode: selectedEng?.branchCode || 'HO',
        managingBranchId: selectedEng?.auditedDepartmentId,
      });

      if (engagementIdToSet) {
        fetchWorkstreams(engagementIdToSet);
      }
    }
  }, [visible, editingRecord, initialValues]);

  // AI Auto-Categorization (Auto-suggest background timer)
  useEffect(() => {
    if (!visible || !conditionValue || conditionValue.length < 20) {
      setAutoSuggestData(null);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const textToAnalyze = `${conditionValue} ${consequenceValue || ''}`;
        const res = await api.post('/ai/suggest-finding', { description: textToAnalyze }, { timeout: 15000 });
        
        let extraRca = 'Lỗi hệ thống hoặc lỗi thao tác của người dùng';
        let extraRecommendation = 'Yêu cầu rà soát lại quy trình và khắc phục triệt để';
        if (textToAnalyze.toLowerCase().includes('tín dụng')) {
          extraRca = 'Sự thiếu chú ý của cán bộ tín dụng hoặc rủi ro đạo đức';
          extraRecommendation = 'Thu hồi vốn vay hoặc bổ sung tài sản đảm bảo';
        }

        setAutoSuggestData({
          ...res.data,
          rca: extraRca,
          recommendation: extraRecommendation
        });
      } catch (err) {
        // ignore background errors
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [conditionValue, consequenceValue, visible]);

  // AI Copilot explicit execution
  const runAICopilot = async (eOrStr?: any) => {
    const overrideCondition = typeof eOrStr === 'string' ? eOrStr : undefined;
    const condition = overrideCondition || form.getFieldValue('condition');
    if (!condition || condition.trim().length < 10) {
      message.warning('Vui lòng nhập nội dung Hiện trạng (Condition) dài hơn 10 ký tự để AI có đủ thông tin phân tích.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await api.post('/ai/suggest-finding', { description: condition }, { timeout: 15000 });
      const data = res.data;
      
      const {
        extraConsequence,
        extraCause,
        extraRca,
        extraRecommendation,
        crossCheckAlert: alertObj,
      } = analyzeBankingFindingHeuristics(condition, data.suggestedRecommendation);
      setCrossCheckAlert(alertObj);

      setAiSuggestions({
        suggestedTitle: data.suggestedTitle || 'Phát hiện sai phạm về nghiệp vụ',
        suggestedRiskLevel: data.suggestedRiskLevel || 'Medium',
        suggestedCategory: data.suggestedCategory || 'Process',
        suggestedCriteria: data.suggestedCriteria || 'Quy trình nội bộ tiêu chuẩn',
        suggestedRecommendation: extraRecommendation,
        suggestedConsequence: extraConsequence,
        suggestedCause: extraCause,
        suggestedRca: extraRca,
        confidence: data.confidence || 0.75,
        matchSource: data.matchSource || 'AI Engine'
      });

      form.setFieldsValue({
        consequence: extraConsequence,
        cause: extraCause,
        recommendation: extraRecommendation,
        riskLevel: data.suggestedRiskLevel || 'Medium'
      });

      message.success('Đã hoàn thành phân tích. AI Copilot đã tự động điền Hậu quả, Nguyên nhân và Khuyến nghị!');
    } catch (err) {
      message.error('Lỗi khi phân tích gợi ý AI');
    } finally {
      setAiLoading(false);
    }
  };

  // Save Form
  const handleSave = () => {
    form.validateFields().then(async values => {
      setSaving(true);
      const engagement = engagements.find(e => e.id === values.engagementId);
      const workstream = workstreams.find(w => w.id === values.workstreamId);
      
      if (values.engagementId) localStorage.setItem('lastSelectedEngagementId', values.engagementId.toString());
      if (values.workstreamId) localStorage.setItem('lastSelectedWorkstreamId', values.workstreamId.toString());

      try {
        const matchedInternalDefect = internalDefectCodes.find(d => d.code === values.internalDefectCode || d.id === values.internalDefectCodeId);
        const matchedNd340Defect = nd340DefectCodes.find(d => d.code === values.nd340DefectCode || d.id === values.nd340DefectCodeId);
        const matchedNhanSuDefect = nhanSuDefectCodes.find(d => d.code === values.nhanSuDefectCode || d.id === values.nhanSuDefectCodeId);
        const matchedProcess = units.find(u => u.id === values.businessProcessId || u.name === values.businessProcess);
        const matchedProposer = users.find(u => u.id === values.proposerUserId || u.fullName === values.proposerOfficer);
        const matchedAppraiser = users.find(u => u.id === values.appraiserUserId || u.fullName === values.appraiserOfficer);
        const matchedLeader = users.find(u => u.id === values.businessLeaderUserId || u.fullName === values.businessLeader);

        const payload = {
          wpTitle: workstream?.title || engagement?.name || 'Unknown',
          workingPaperId: null,
          engagementId: values.engagementId,
          workstreamId: values.workstreamId,
          findingTitle: values.title,
          riskLevel: values.riskLevel,
          status: editingRecord ? editingRecord.status : 'Open',
          condition: values.condition,
          consequence: values.consequence,
          cause: values.cause,
          rootCauseCategory: values.rootCauseCategory,
          rootCauseDetails: values.rootCauseDetails,
          recommendation: values.recommendation,
          
          branchCode: values.branchCode || engagement?.branchCode,
          managingBranchCode: values.managingBranchCode || engagement?.branchCode,
          managingBranchName: values.managingBranchName || engagement?.branchName || engagement?.legacyAuditedDepartment,
          managingBranchId: values.managingBranchId || engagement?.auditedDepartmentId || null,
          operationType: values.operationType,
          businessProcess: matchedProcess?.name || values.businessProcess,
          businessProcessId: matchedProcess?.id || values.businessProcessId || null,
          cifOrAccount: values.cifOrAccount,
          customerName: values.customerName,
          productName: values.productName,
          customerType: values.customerType,
          riskGroupGeneral: values.riskGroupGeneral,
          riskGroupDetail: values.riskGroupDetail,
          proposerOfficer: matchedProposer?.fullName || values.proposerOfficer,
          proposerUserId: matchedProposer?.id || values.proposerUserId || null,
          appraiserOfficer: matchedAppraiser?.fullName || values.appraiserOfficer,
          appraiserUserId: matchedAppraiser?.id || values.appraiserUserId || null,
          businessLeader: matchedLeader?.fullName || values.businessLeader,
          businessLeaderUserId: matchedLeader?.id || values.businessLeaderUserId || null,
          recommendationTarget: values.recommendationTarget,
          recommendationType: values.recommendationType,
          criteria: values.criteria,

          internalDefectCode: values.internalDefectCode || matchedInternalDefect?.code,
          internalDefectCodeId: matchedInternalDefect?.id || values.internalDefectCodeId || null,
          nd340DefectCode: values.nd340DefectCode || matchedNd340Defect?.code,
          nd340DefectCodeId: matchedNd340Defect?.id || values.nd340DefectCodeId || null,
          nhanSuDefectCode: values.nhanSuDefectCode || matchedNhanSuDefect?.code,
          nhanSuDefectCodeId: matchedNhanSuDefect?.id || values.nhanSuDefectCodeId || null,
          actualFineAmount: values.actualFineAmount || null,

          findingCategory: values.findingCategory,
          findingNature: values.findingNature,
          reportedByAuditorId: values.reportedByAuditorId,
          responsibleUnitId: values.responsibleUnitId,
          appendices: appendices,
        };

        if (editingRecord) {
          await api.patch(`/audit-findings/${editingRecord.id}`, payload);
          message.success('Đã cập nhật phát hiện thành công');
        } else {
          await api.post('/audit-findings', payload);
          message.success('Đã ghi nhận phát hiện mới thành công');
        }
        onSuccess();
        onClose();
      } catch (error: any) {
        message.error(error.response?.data?.message || 'Lỗi khi lưu dữ liệu');
      } finally {
        setSaving(false);
      }
    }).catch(errorInfo => {
      console.log('Validation Failed:', errorInfo);
    });
  };

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      width="92%"
      title={null}
      closable={false}
      destroyOnClose
      styles={{ body: { padding: '16px', background: '#f8fafc' } }}
    >
      <div style={{ minHeight: '100%' }}>
        {/* Sticky Action Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-xs border border-gray-100 sticky top-0 z-10">
          <Button 
            onClick={onClose}
            icon={<LeftOutlined />}
            style={{ borderColor: '#ea9105', color: '#ea9105', fontWeight: 600, borderRadius: 8 }}
          >
            ← Quay lại danh sách
          </Button>
          <Title level={4} className="!mb-0" style={{ color: '#0f172a', fontWeight: 800 }}>
            {editingRecord ? 'CẬP NHẬT PHÁT HIỆN KIỂM TOÁN (5C & RỦI RO)' : 'GHI NHẬN PHÁT HIỆN KIỂM TOÁN MỚI (5C)'}
          </Title>
          <Space>
            <Button onClick={onClose} style={{ borderRadius: 8 }}>
              Hủy bỏ
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8 }}
            >
              Lưu ghi nhận
            </Button>
          </Space>
        </div>

        {/* 2-Column Grid Workspace */}
        <Row gutter={[24, 24]}>
          {/* Left Column: 5C Form Editor */}
          <Col xs={24} lg={15}>
            <Card 
              variant="borderless" 
              className="shadow-xs rounded-xl border border-gray-100" 
              title={<span style={{ color: '#ea9105', fontWeight: 700 }}>Thông tin phát hiện chi tiết (Chuẩn 5C)</span>}
            >
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="engagementId" label="Đoàn kiểm toán (Engagement)" rules={[{ required: true, message: 'Vui lòng chọn Đoàn kiểm toán' }]} hidden={engagements.length === 1}>
                      <Select 
                        placeholder="Chọn Đoàn kiểm toán..." 
                        style={{ borderRadius: 8 }}
                        showSearch
                        optionFilterProp="children"
                        disabled={engagements.length === 1}
                        onChange={async (engagementId) => {
                          form.setFieldsValue({ workstreamId: undefined });
                          try {
                            const response = await api.get(`/audit-engagements/${engagementId}/workstreams`);
                            setWorkstreams(response.data || []);
                            const selectedEngagement = engagements.find(e => e.id === engagementId);
                            if (selectedEngagement) {
                              form.setFieldsValue({ 
                                branchCode: selectedEngagement.branchCode || 'CN001',
                                managingBranchName: selectedEngagement.branchName || selectedEngagement.legacyAuditedDepartment || 'Hội Sở Chính',
                                managingBranchCode: selectedEngagement.branchCode || 'HO',
                                managingBranchId: selectedEngagement.auditedDepartmentId
                              });
                            }
                          } catch(err) { 
                            console.error('Failed to load workstreams', err); 
                          }
                        }}
                      >
                        {engagements.map((e: any) => (
                          <Option key={e.id} value={e.id}>{e.name || `Đoàn KT #${e.id}`}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="workstreamId" label="Công việc / Phần hành được giao">
                      <Select 
                        placeholder="Chọn phần hành..." 
                        allowClear 
                        style={{ borderRadius: 8 }}
                        onChange={(wsId) => {
                          const ws = workstreams.find((w: any) => w.id === wsId);
                          if (ws && ws.assignedAuditorId) {
                            form.setFieldsValue({ reportedByAuditorId: ws.assignedAuditorId });
                          }
                        }}
                      >
                        {workstreams.map((ws: any) => (
                          <Option key={ws.id} value={ws.id}>{ws.title}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <div className="bg-orange-50/20 p-4 rounded-xl border border-orange-100 mb-5 mt-2">
                  <span className="font-bold text-gray-700 block mb-3 text-xs">📝 MÔ TẢ PHÁT HIỆN & KHUNG 5C</span>
                  <Form.Item name="title" label="Tiêu đề (Tóm tắt Phát hiện)" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề tóm tắt' }]}>
                    <Input placeholder="Nhập tiêu đề ngắn gọn..." style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <Form.Item 
                    name="condition" 
                    label={
                      <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-gray-700">1. Hiện trạng (Condition) <span className="text-red-500">*</span></span>
                        <Button 
                          size="small" 
                          type="primary" 
                          icon={<ThunderboltOutlined />} 
                          onClick={runAICopilot}
                          loading={aiLoading}
                          style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', borderRadius: 6, fontSize: '11px', height: '24px' }}
                        >
                          Chạy AI Copilot gợi ý
                        </Button>
                      </div>
                    } 
                    rules={[{ required: true, message: 'Vui lòng mô tả hiện trạng thực tế' }]} 
                    className="mb-0"
                  >
                    <TextArea rows={4} placeholder="Mô tả thực tế đang diễn ra..." style={{ borderRadius: 8 }} />
                  </Form.Item>

                  {autoSuggestData && (
                    <div className="mb-4 mt-2 bg-orange-50 border border-orange-200 rounded-lg p-3 animate-fadeIn">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-orange-600 font-bold text-xs flex items-center gap-1">
                          <RobotOutlined /> AI tự động phân loại:
                        </span>
                        <Button 
                          type="primary" 
                          size="small" 
                          onClick={() => {
                            form.setFieldsValue({
                              riskLevel: autoSuggestData.suggestedRiskLevel,
                              defectCode: autoSuggestData.suggestedDefectCode,
                              violationLaws: autoSuggestData.suggestedViolationLaws,
                              rca: autoSuggestData.rca,
                              recommendation: autoSuggestData.recommendation
                            });
                            message.success('Đã áp dụng các gợi ý phân loại từ AI!');
                            setAutoSuggestData(null);
                          }}
                          className="bg-orange-500 hover:bg-orange-600 border-none text-[10px] h-6"
                        >
                          Áp dụng tất cả
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Tag color={autoSuggestData.suggestedRiskLevel === 'High' ? 'red' : autoSuggestData.suggestedRiskLevel === 'Medium' ? 'orange' : 'green'}>
                          Mức rủi ro: {autoSuggestData.suggestedRiskLevel}
                        </Tag>
                        {autoSuggestData.suggestedDefectCode && <Tag color="blue">Mã lỗi: {autoSuggestData.suggestedDefectCode}</Tag>}
                      </div>
                      {autoSuggestData.rca && (
                        <div className="mt-2 text-xs text-gray-600">
                          <strong>Nguyên nhân gốc rễ (Gợi ý):</strong> {autoSuggestData.rca}
                        </div>
                      )}
                      {autoSuggestData.recommendation && (
                        <div className="mt-1 text-xs text-gray-600">
                          <strong>Kiến nghị (Gợi ý):</strong> {autoSuggestData.recommendation}
                        </div>
                      )}
                    </div>
                  )}

                  {crossCheckAlert && (
                    <div className="mb-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                      <div className="text-red-600 font-bold text-xs flex items-center gap-1 mb-1">
                        <ExclamationCircleOutlined /> {crossCheckAlert.title}
                      </div>
                      <div className="text-xs text-gray-700 mb-2">
                        {crossCheckAlert.message}
                      </div>
                      <Button 
                        size="small" 
                        type="primary" 
                        danger
                        onClick={() => {
                          if (aiSuggestions?.suggestedRecommendation) {
                            form.setFieldsValue({ 
                              recommendation: aiSuggestions.suggestedRecommendation,
                              cause: aiSuggestions.suggestedCause,
                              consequence: aiSuggestions.suggestedConsequence
                            });
                            message.success('Đã áp dụng Khuyến nghị chuẩn!');
                          }
                        }}
                      >
                        Áp dụng Khuyến nghị chuẩn
                      </Button>
                    </div>
                  )}

                  <div className="mb-4"></div>

                  <Form.Item 
                    name="consequence" 
                    label={
                      <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-gray-700">2. Hậu quả (Consequence/Effect) <span className="text-red-500">*</span></span>
                        {aiSuggestions?.suggestedConsequence && (
                          <Button 
                            size="small" 
                            type="link" 
                            icon={<BulbOutlined />} 
                            onClick={() => {
                              form.setFieldsValue({ consequence: aiSuggestions.suggestedConsequence });
                              message.success('Đã áp dụng Hậu quả từ AI');
                            }}
                            className="text-amber-600 p-0 font-semibold flex items-center gap-1"
                          >
                            Áp dụng gợi ý AI
                          </Button>
                        )}
                      </div>
                    } 
                    rules={[{ required: true, message: 'Vui lòng mô tả hậu quả có thể xảy ra' }]} 
                    className="mb-0"
                  >
                    <TextArea rows={3} placeholder="Hậu quả có thể xảy ra..." style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <div className="mb-4"></div>

                  <Form.Item 
                    name="cause" 
                    label={
                      <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-gray-700">3. Nguyên nhân (Cause) <span className="text-red-500">*</span></span>
                        {aiSuggestions?.suggestedCause && (
                          <Button 
                            size="small" 
                            type="link" 
                            icon={<BulbOutlined />} 
                            onClick={() => {
                              form.setFieldsValue({ cause: aiSuggestions.suggestedCause });
                              message.success('Đã áp dụng Nguyên nhân từ AI');
                            }}
                            className="text-amber-600 p-0 font-semibold flex items-center gap-1"
                          >
                            Áp dụng gợi ý AI
                          </Button>
                        )}
                      </div>
                    } 
                    rules={[{ required: true, message: 'Vui lòng mô tả nguyên nhân' }]} 
                    className="mb-0"
                  >
                    <TextArea rows={3} placeholder="Nguyên nhân gốc rễ..." style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <div className="mb-4"></div>

                  <Form.Item 
                    name="recommendation" 
                    label={
                      <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-gray-700">4. Khuyến nghị (Recommendation) <span className="text-red-500">*</span></span>
                        {aiSuggestions?.suggestedRecommendation && (
                          <Button 
                            size="small" 
                            type="link" 
                            icon={<BulbOutlined />} 
                            onClick={() => {
                              form.setFieldsValue({ recommendation: aiSuggestions.suggestedRecommendation });
                              message.success('Đã áp dụng Khuyến nghị từ AI');
                            }}
                            className="text-amber-600 p-0 font-semibold flex items-center gap-1"
                          >
                            Áp dụng gợi ý AI
                          </Button>
                        )}
                      </div>
                    } 
                    rules={[{ required: true, message: 'Vui lòng đề xuất hành động khắc phục' }]} 
                    className="mb-0"
                  >
                    <TextArea rows={4} placeholder="Đề xuất hành động khắc phục..." style={{ borderRadius: 8 }} />
                  </Form.Item>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="riskLevel" label="Mức độ rủi ro" rules={[{ required: true, message: 'Vui lòng chọn mức độ rủi ro' }]}>
                      <Select placeholder="Chọn mức rủi ro" style={{ borderRadius: 8 }}>
                        <Option value="Critical">Nghiêm trọng (Critical)</Option>
                        <Option value="High">Cao (High)</Option>
                        <Option value="Medium">Trung bình (Medium)</Option>
                        <Option value="Low">Thấp (Low)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="findingCategory" label="Phân loại nhóm (Category)" rules={[{ required: true, message: 'Vui lòng chọn nhóm phân loại' }]}>
                      <Select placeholder="Chọn phân loại nhóm..." style={{ borderRadius: 8 }}>
                        <Option value="QuanTri">Quản trị (Governance)</Option>
                        <Option value="HoatDong">Hoạt động (Operational)</Option>
                        <Option value="KiemSoatVanHanh">Kiểm soát vận hành (Internal Control)</Option>
                        <Option value="CNTT">Công nghệ thông tin (IT/Security)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="findingNature" label="Tính chất Phát hiện (Nature)" rules={[{ required: true, message: 'Vui lòng chọn tính chất' }]}>
                      <Select placeholder="Chọn tính chất phát hiện..." style={{ borderRadius: 8 }}>
                        <Option value="HeThong">Hệ thống (Systemic)</Option>
                        <Option value="TuanThu">Tuân thủ (Compliance)</Option>
                        <Option value="CaNhan">Cá nhân (Individual)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="reportedByAuditorId" label="Kiểm toán viên phát hiện" rules={[{ required: true, message: 'Vui lòng chọn KTV' }]}>
                      <Select placeholder="Chọn KTV phát hiện..." showSearch optionFilterProp="children" style={{ borderRadius: 8 }}>
                        {users.map(u => (
                          <Option key={u.id} value={u.id}>{u.fullName} ({u.jobTitle || u.username})</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="responsibleUnitId" label="Đơn vị đầu mối phụ trách khắc phục (KPCS)" rules={[{ required: true, message: 'Vui lòng chọn đơn vị đầu mối' }]}>
                      <Select placeholder="Chọn đơn vị đầu mối..." showSearch optionFilterProp="children" style={{ borderRadius: 8 }}>
                        {units.map(u => (
                          <Option key={u.id} value={u.id}>{u.name}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* 🗺️ ĐỊA BÀN VÀ NGHIỆP VỤ */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-5">
                  <span className="font-bold text-gray-700 block mb-3 text-xs">🗺️ CHI TIẾT MẢNG NGHIỆP VỤ, VÙNG & ĐỊA BÀN CN</span>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item name="operationType" label="Mảng nghiệp vụ">
                        <Select placeholder="Mảng..." style={{ borderRadius: 8 }}>
                          <Option value="TD">Tín dụng (TD)</Option>
                          <Option value="PTD">Phi tín dụng (PTD)</Option>
                          <Option value="TKBĐ">Tiết kiệm Bưu điện (TKBĐ)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name="region" label="Vùng quản lý">
                        <Select placeholder="Chọn Vùng..." style={{ borderRadius: 8 }}>
                          <Option value="Vùng 1 (Miền Bắc)">Vùng 1 (Miền Bắc)</Option>
                          <Option value="Vùng 2 (Miền Trung)">Vùng 2 (Miền Trung)</Option>
                          <Option value="Vùng 3 (Miền Nam)">Vùng 3 (Miền Nam)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name="branchCode" label="Mã Chi nhánh vi phạm" tooltip="Tự động kế thừa từ Cuộc kiểm toán">
                        <Input placeholder="Mã CN..." style={{ borderRadius: 8, backgroundColor: '#f5f5f5', fontWeight: 600 }} readOnly />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name="managingBranchName" label="Tên Chi nhánh quản lý" tooltip="Tự động kế thừa từ Cuộc kiểm toán">
                        <Input placeholder="CN quản lý..." style={{ borderRadius: 8, backgroundColor: '#f5f5f5', fontWeight: 600 }} readOnly />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16} className="hidden" style={{ display: 'none' }}>
                    <Col span={12}>
                      <Form.Item name="managingBranchCode" label="Mã Chi nhánh quản lý" className="mb-0">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="managingBranchId" label="ID Chi nhánh quản lý" className="mb-0">
                        <InputNumber />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item name="businessProcessId" label="Quy trình nghiệp vụ vi phạm (Audit Universe)">
                        <Select 
                          placeholder="Chọn quy trình nghiệp vụ vi phạm..." 
                          showSearch
                          allowClear
                          optionFilterProp="children"
                          style={{ borderRadius: 8 }}
                          onChange={(procId) => {
                            const p = units.find(u => u.id === procId);
                            if (p) {
                              form.setFieldsValue({ businessProcess: p.name });
                            }
                          }}
                        >
                          {units.map((u: any) => (
                            <Option key={u.id} value={u.id}>
                              {u.name} {u.department ? `(${u.department})` : ''}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item name="businessProcess" className="hidden" style={{ display: 'none' }}>
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                {/* 👤 CÁN BỘ LIÊN QUAN TRỰC TIẾP */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-5">
                  <span className="font-bold text-gray-700 block mb-3 text-xs">👤 CÁN BỘ LIÊN QUAN TRỰC TIẾP GIAO DỊCH LỖI</span>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="proposerUserId" label="Cán bộ đề xuất">
                        <Select
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          placeholder="Chọn CB đề xuất..."
                          style={{ borderRadius: 8 }}
                          options={users.map(u => ({
                            label: `${u.fullName} (${u.jobTitle || u.username})`,
                            value: u.id
                          }))}
                          onChange={(uid) => {
                            const u = users.find(x => x.id === uid);
                            if (u) form.setFieldsValue({ proposerOfficer: u.fullName });
                          }}
                        />
                      </Form.Item>
                      <Form.Item name="proposerOfficer" className="hidden" style={{ display: 'none' }}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="appraiserUserId" label="Cán bộ thẩm định">
                        <Select
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          placeholder="Chọn CB thẩm định..."
                          style={{ borderRadius: 8 }}
                          options={users.map(u => ({
                            label: `${u.fullName} (${u.jobTitle || u.username})`,
                            value: u.id
                          }))}
                          onChange={(uid) => {
                            const u = users.find(x => x.id === uid);
                            if (u) form.setFieldsValue({ appraiserOfficer: u.fullName });
                          }}
                        />
                      </Form.Item>
                      <Form.Item name="appraiserOfficer" className="hidden" style={{ display: 'none' }}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="businessLeaderUserId" label="Lãnh đạo DVKD duyệt">
                        <Select
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          placeholder="Chọn Lãnh đạo duyệt..."
                          style={{ borderRadius: 8 }}
                          options={users.map(u => ({
                            label: `${u.fullName} (${u.jobTitle || u.username})`,
                            value: u.id
                          }))}
                          onChange={(uid) => {
                            const u = users.find(x => x.id === uid);
                            if (u) form.setFieldsValue({ businessLeader: u.fullName });
                          }}
                        />
                      </Form.Item>
                      <Form.Item name="businessLeader" className="hidden" style={{ display: 'none' }}>
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                {/* 🛡️ PHÂN NHÓM RỦI RO & ĐỊNH HƯỚNG */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-5">
                  <span className="font-bold text-gray-700 block mb-3 text-xs">🛡️ PHÂN NHÓM RỦI RO & ĐỊNH HƯỚNG KIẾN NGHỊ</span>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="riskGroupGeneral" label="Nhóm rủi ro tổng hợp (Chuẩn Basel/TT83)">
                        <Select placeholder="Chọn nhóm rủi ro..." allowClear style={{ borderRadius: 8 }}>
                          <Option value="Rủi ro Tín dụng">Rủi ro Tín dụng (Credit Risk)</Option>
                          <Option value="Rủi ro Hoạt động">Rủi ro Hoạt động & Vận hành (Operational Risk)</Option>
                          <Option value="Rủi ro CNTT & An ninh mạng">Rủi ro CNTT & An ninh mạng (IT & Cyber Risk)</Option>
                          <Option value="Rủi ro Kế toán & Tài chính">Rủi ro Kế toán & Tài chính (Financial Risk)</Option>
                          <Option value="Rủi ro Tuân thủ & Pháp lý">Rủi ro Tuân thủ & Pháp lý (Compliance Risk)</Option>
                          <Option value="Rủi ro Thị trường & Thanh khoản">Rủi ro Thị trường & Thanh khoản (Market/Liquidity Risk)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="riskGroupDetail" label="Nhóm rủi ro chi tiết">
                        <Input placeholder="Ví dụ: Thiếu hồ sơ pháp lý, định giá sai..." style={{ borderRadius: 8 }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="recommendationTarget" label="Đối tượng được kiến nghị">
                        <Select placeholder="Chọn đối tượng..." style={{ borderRadius: 8 }}>
                          <Option value="HĐQT">HĐQT</Option>
                          <Option value="TGĐ">TGĐ</Option>
                          <Option value="ĐVKD">ĐVKD</Option>
                          <Option value="HO">Trụ sở chính (HO)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="recommendationType" label="Loại kiến nghị">
                        <Select placeholder="Chọn loại..." style={{ borderRadius: 8 }}>
                          <Option value="Publish">Phát hành chính thức</Option>
                          <Option value="Note">Lưu ý chấn chỉnh chéo</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16} className="mt-3">
                    <Col span={24}>
                      <Form.Item name="criteria" label="Cơ sở pháp lý / Quy định vi phạm (Criteria)">
                        <TextArea rows={2} placeholder="Nêu rõ điều, khoản, văn bản quy định pháp luật vi phạm..." style={{ borderRadius: 8 }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                {/* ⚖️ MÃ LỖI & CHẾ TÀI ÁP DỤNG (3 CHIỀU) */}
                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 mb-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-blue-800 block text-xs">⚖️ MÃ LỖI & CHẾ TÀI ÁP DỤNG (DANH MỤC 3 CHIỀU)</span>
                    <span className="text-[11px] text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full font-medium">
                      Tổng {defectCodes.length} mã lỗi khả dụng từ Danh mục
                    </span>
                  </div>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="internalDefectCode" label="1. Mã lỗi nội bộ (LPBank)">
                        <Select 
                          placeholder="Chọn mã lỗi nội bộ LPBank..." 
                          showSearch 
                          allowClear
                          optionFilterProp="label"
                          style={{ borderRadius: 8 }}
                          options={internalDefectCodes.map((d: any) => ({
                            label: `${d.code} - ${d.description || d.l3Desc || d.l2Desc || d.name || ''}`,
                            value: d.code
                          }))}
                          onChange={(code) => {
                            const d = internalDefectCodes.find((x: any) => x.code === code);
                            if (d) form.setFieldsValue({ internalDefectCodeId: d.id });
                          }}
                        />
                      </Form.Item>
                      <Form.Item name="internalDefectCodeId" className="hidden" style={{ display: 'none' }}>
                        <InputNumber />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="nd340DefectCode" label="2. Mã lỗi theo NĐ 340 (Xử phạt NHNN)">
                        <Select 
                          placeholder="Chọn mã lỗi NĐ 340..." 
                          showSearch 
                          allowClear
                          optionFilterProp="label"
                          style={{ borderRadius: 8 }}
                          options={nd340DefectCodes.map((d: any) => ({
                            label: `${d.code} - ${d.description || d.l1Desc || ''} ${d.maxFine ? `[Phạt max ${Number(d.maxFine).toLocaleString()}đ]` : ''}`,
                            value: d.code
                          }))}
                          onChange={(code) => {
                            const d = nd340DefectCodes.find((x: any) => x.code === code);
                            if (d) form.setFieldsValue({ nd340DefectCodeId: d.id, actualFineAmount: d.maxFine || d.minFine });
                          }}
                        />
                      </Form.Item>
                      <Form.Item name="nd340DefectCodeId" className="hidden" style={{ display: 'none' }}>
                        <InputNumber />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="nhanSuDefectCode" label="3. Mã chế tài kỷ luật Nhân sự (LPBank HR)">
                        <Select 
                          placeholder="Chọn mức kỷ luật nhân sự..." 
                          showSearch 
                          allowClear
                          optionFilterProp="label"
                          style={{ borderRadius: 8 }}
                          options={nhanSuDefectCodes.map((d: any) => ({
                            label: `${d.code} - ${d.description || d.l1Desc || d.name || ''}`,
                            value: d.code
                          }))}
                          onChange={(code) => {
                            const d = nhanSuDefectCodes.find((x: any) => x.code === code);
                            if (d) form.setFieldsValue({ nhanSuDefectCodeId: d.id });
                          }}
                        />
                      </Form.Item>
                      <Form.Item name="nhanSuDefectCodeId" className="hidden" style={{ display: 'none' }}>
                        <InputNumber />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="actualFineAmount" label="Khung tiền phạt ước tính (VNĐ)">
                        <InputNumber 
                          style={{ width: '100%', borderRadius: 8 }} 
                          formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                          placeholder="Số tiền phạt dự kiến theo NĐ 340..."
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                {/* 📄 PHỤ LỤC ĐÍNH KÈM */}
                <FindingAppendicesManager
                  appendices={appendices}
                  setAppendices={setAppendices}
                  editingRecordId={editingRecord?.id}
                />
              </Form>
            </Card>
          </Col>

          {/* Right Column: RCA and AI Copilot */}
          <Col xs={24} lg={9}>
            <FindingAiCopilotPanel
              form={form}
              aiSuggestions={aiSuggestions}
              aiLoading={aiLoading}
              runAICopilot={runAICopilot}
            />
          </Col>
        </Row>
      </div>
    </Drawer>
  );
};
