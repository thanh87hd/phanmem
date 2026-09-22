import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Form, Input, Select, Button, Space, Typography, Card, Tag,
  Collapse, Radio, Divider, Row, Col, Table, message
} from 'antd';
import type { FormInstance } from 'antd';
import {
  CloseOutlined, PlusOutlined, DownloadOutlined, CloudUploadOutlined,
  ThunderboltOutlined, BulbOutlined, RobotOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import DetailedSamplingGrid from '../DetailedSamplingGrid';
import type {
  AuditProgramAttachment,
  ControlAssessmentItem,
  WorkingPaperRecord
} from './auditProgramTypes';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface AuditProgramEditorProps {
  open: boolean;
  onClose: () => void;
  editingWp: WorkingPaperRecord | null;
  form: FormInstance;
  auditPlans: any[];
  workstreams: any[];
  fetchWorkstreams: (engagementId: number) => Promise<void>;
  templates: any[];
  selectedTemplate: any;
  attachments: AuditProgramAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<AuditProgramAttachment[]>>;
  controlAssessments: ControlAssessmentItem[];
  wpInputMode: 'template' | 'custom';
  setWpInputMode: (mode: 'template' | 'custom') => void;
  aiSuggestions: any;
  setAiSuggestions: (sug: any) => void;
  aiLoading: boolean;
  runAIIACopilot: () => Promise<void>;
  handleModalOk: () => void;
  handleRealTemplateSelect: (tplId: number) => void;
  handleWpAttachmentUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAddControl: () => void;
  handleUpdateControl: (index: number, field: string, value: string) => void;
  handleRemoveControl: (index: number) => void;
}

export const AuditProgramEditor: React.FC<AuditProgramEditorProps> = ({
  open,
  onClose,
  editingWp,
  form,
  auditPlans,
  workstreams,
  fetchWorkstreams,
  templates,
  selectedTemplate,
  attachments,
  setAttachments,
  controlAssessments,
  wpInputMode,
  setWpInputMode,
  aiSuggestions,
  setAiSuggestions,
  aiLoading,
  runAIIACopilot,
  handleModalOk,
  handleRealTemplateSelect,
  handleWpAttachmentUpload,
  handleAddControl,
  handleUpdateControl,
  handleRemoveControl,
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="animate-fadeIn p-2" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Premium Header with Back/Home button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 bg-transparent">
        <div className="flex items-center gap-4">
          <Button 
            onClick={onClose} 
            className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-11"
            icon={<CloseOutlined />}
          >
            {t('auditExpenses.form.btnBack', '← Quay lại danh sách')}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Title level={3} className="!mb-0 text-slate-800" style={{ margin: 0 }}>
                {editingWp ? `Cập nhật Giấy tờ làm việc: ${editingWp.referenceCode || 'WP'}` : t('AuditPrograms.createANewAuditProgramstandard', 'Tạo Giấy tờ làm việc mới (Standard Working Paper)')}
              </Title>
              <Tag color="orange" className="rounded-md font-semibold px-2 py-0.5 border-none shadow-3xs">
                {t('AuditPrograms.internationalStandardIiaAuditboy', 'Chuẩn quốc tế IIA & Auditboy')}
              </Tag>
            </div>
            <Text type="secondary" className="text-xs sm:text-sm text-slate-500 mt-1 block">
              {t('AuditPrograms.recordDetailsOfAuditFieldResults', 'Ghi nhận chi tiết kết quả thực địa kiểm toán, rủi ro tương ứng, thiết kế phương pháp kiểm thử, thủ tục chọn mẫu và kết luận soát xét.')}
            </Text>
          </div>
        </div>
        <Space size="middle">
          <Button 
            onClick={onClose} 
            className="rounded-xl shadow-sm h-11 px-5 font-medium hover:bg-slate-50"
          >
            {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
          </Button>
          <Button 
            type="primary" 
            onClick={handleModalOk} 
            className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-11 px-7 text-white transition-all duration-200"
          >
            {editingWp ? t('AuditPrograms.updateWp', 'Cập nhật WP') : t('AuditPrograms.createNewWp', 'Tạo mới WP')}
          </Button>
        </Space>
      </div>

      {/* 2-Column Responsive Workspace Grid */}
      <Row gutter={[24, 24]}>
        {/* Left Column: Form Editor */}
        <Col xs={24} lg={15}>
          <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
            <Form form={form} layout="vertical" onValuesChange={(changed) => {
              if (changed.planId) {
                form.setFieldValue('workstreamId', undefined);
                fetchWorkstreams(changed.planId);
              }
            }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item 
                    name="referenceCode" 
                    label={<span className="font-semibold text-slate-700 text-sm">{t('AuditPrograms.wpIndexCodeIndex', 'Mã chỉ mục WP (Index)')}</span>} 
                    rules={[{ required: true, message: t('AuditPrograms.enterTheWpIndexCode', 'Nhập mã chỉ mục WP') }]}
                  >
                    <Input placeholder={t('AuditPrograms.forExampleWpcredit01', 'Ví dụ: WP-CREDIT-01')} className="rounded-xl h-11 border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] font-mono" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={16}>
                  <Form.Item 
                    name="planId" 
                    label={<span className="font-semibold text-slate-700 text-sm">{t('AuditPrograms.affiliateAudit', 'Cuộc kiểm toán liên kết')}</span>} 
                    rules={[{ required: true, message: t('AuditPrograms.pleaseSelectAnAudit', 'Vui lòng chọn cuộc kiểm toán') }]}
                    hidden={auditPlans.length === 1}
                  >
                    <Select placeholder={t('AuditPrograms.chooseAnAudit', 'Chọn cuộc kiểm toán...')} className="h-11 rounded-xl border-slate-200 w-full" disabled={auditPlans.length === 1}>
                      {auditPlans.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="workstreamId"
                label={<span className="font-semibold text-slate-700 text-sm">{t('AuditPrograms.linkingSection', 'Phần hành liên kết')}</span>}
              >
                <Select placeholder={t('AuditPrograms.selectTheOperatingSectionInThe', 'Chọn phần hành trong workspace CTKT...')} allowClear className="h-11 rounded-xl border-slate-200 w-full">
                  {workstreams.map((ws: any) => <Option key={ws.id} value={ws.id}>{ws.title} - {ws.assignedAuditorName || t('AuditPrograms.notAssignedKtvYet', 'Chưa gán KTV')}</Option>)}
                </Select>
              </Form.Item>

              {/* Switch for selection mode */}
              <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <span className="font-bold text-slate-700 text-sm">{t('AuditPrograms.methodToSetTopic', 'Phương thức xác lập Chủ đề:')}</span>
                  <Radio.Group 
                    value={wpInputMode} 
                    onChange={(e) => {
                      setWpInputMode(e.target.value);
                      setAiSuggestions(null);
                    }}
                    optionType="button"
                    buttonStyle="solid"
                    className="brand-radio-group"
                  >
                    <Radio.Button value="custom">{t('AuditPrograms.selfrecordingHandInput', '✍️ Tự ghi nhận (Nhập tay)')}</Radio.Button>
                    <Radio.Button value="template">{t('AuditPrograms.chooseFromTopicalTemplates', '📁 Chọn từ Mẫu nghiệp vụ')}</Radio.Button>
                  </Radio.Group>
                </div>

                <Divider className="my-3" />

                {wpInputMode === 'template' ? (
                  <Form.Item 
                    name="templateId"
                    label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider block mb-1">{t('AuditPrograms.listOfAuditStandardThematicTemplates', 'Danh sách Mẫu nghiệp vụ chuẩn kiểm toán')}</span>}
                    rules={[{ required: true, message: t('AuditPrograms.pleaseSelectThematicForm', 'Vui lòng chọn biểu mẫu nghiệp vụ') }]}
                  >
                    <Select 
                      placeholder={t('AuditPrograms.chooseAnAvailableThematicTemplateTo', 'Chọn một mẫu nghiệp vụ có sẵn để tự động nạp nội dung...')} 
                      onChange={handleRealTemplateSelect} 
                      className="h-11 rounded-xl w-full"
                    >
                      {templates.map(tpl => (
                        <Option key={tpl.id} value={tpl.id}>
                          📁 {tpl.name} ({tpl.category})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : (
                  <Form.Item 
                    name="title" 
                    label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider block mb-1">{t('AuditPrograms.namesubjectOfAuditPrograms', 'Tên / Chủ đề Giấy tờ làm việc')}</span>} 
                    rules={[{ required: true, message: t('AuditPrograms.pleaseEnterTheAuditProgramsubject', 'Vui lòng nhập chủ đề giấy tờ làm việc') }]}
                  >
                    <Input placeholder={t('AuditPrograms.forExampleEvaluateTheCreditGranting', 'Ví dụ: Đánh giá quy trình cấp tín dụng...')} className="rounded-xl h-11 border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105]" />
                  </Form.Item>
                )}
              </div>

              {/* AI Quick Note Section */}
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-orange-700 text-sm flex items-center gap-2">
                    <RobotOutlined /> AI Quick Notes (Tự động phân bổ nội dung)
                  </span>
                  <Button 
                    type="primary" 
                    size="small" 
                    style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
                    onClick={async () => {
                      const note = form.getFieldValue('aiQuickNote');
                      if (!note) {
                        message.warning('Vui lòng nhập nội dung nháp vào ô Quick Notes');
                        return;
                      }
                      message.loading({ content: 'AI đang phân tích và bóc tách nội dung...', key: 'ai_parse' });
                      try {
                        setTimeout(() => {
                          form.setFieldsValue({
                            objectives: 'Phân tách từ Quick Note: Mục tiêu kiểm toán...',
                            methodology: 'Phân tách từ Quick Note: Phương pháp...',
                            procedures: 'Phân tách từ Quick Note: Các bước thực hiện...',
                            conclusion: 'Phân tách từ Quick Note: Kết luận...'
                          });
                          message.success({ content: 'Phân bổ nội dung thành công!', key: 'ai_parse' });
                        }, 1500);
                      } catch {
                        message.error({ content: 'Lỗi khi phân tích bằng AI', key: 'ai_parse' });
                      }
                    }}
                  >
                    ✨ AI Phân bổ
                  </Button>
                </div>
                <Form.Item name="aiQuickNote" className="mb-0">
                  <TextArea 
                    rows={3} 
                    placeholder="Dán toàn bộ biên bản nháp, ghi chú thực địa thô vào đây. AI sẽ tự động phân tách ý vào các mục Bối cảnh, Chọn mẫu, Thực địa, Kết luận..." 
                    className="rounded-xl border-orange-200 bg-white" 
                  />
                </Form.Item>
              </div>

              <Collapse defaultActiveKey={['1', '2', '3', '4', '5', '6', '7']} ghost className="premium-collapse mt-4" items={[
                { 
                  key: '1', 
                  label: t('AuditPrograms.1ContextObjectives', '📋 1. Bối cảnh & Mục tiêu (Objectives)'), 
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="objectives" 
                          label={
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-slate-600 text-xs">MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA)</span>
                              {aiSuggestions?.objectives && (
                                <Button 
                                  size="small" 
                                  type="link" 
                                  icon={<BulbOutlined />} 
                                  onClick={() => {
                                    form.setFieldsValue({ objectives: aiSuggestions.objectives });
                                    message.success(t('AuditPrograms.aiGoalsApplied', 'Đã áp dụng Mục tiêu từ AI'));
                                  }}
                                  className="text-amber-600 p-0 text-xs font-semibold"
                                >
                                  {t('auditFindings.applyAiSuggestions', 'Áp dụng gợi ý AI')}
                                </Button>
                              )}
                            </div>
                          }
                        >
                          <TextArea rows={12} placeholder={t('AuditPrograms.identifySpecificGoalsAndControlCriteria', 'Xác định mục tiêu cụ thể và tiêu chí kiểm soát cần đánh giá...')} className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] text-sm font-sans" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="riskDescription" 
                          label={
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-slate-600 text-xs">MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)</span>
                              {aiSuggestions?.riskDescription && (
                                <Button 
                                  size="small" 
                                  type="link" 
                                  icon={<BulbOutlined />} 
                                  onClick={() => {
                                    form.setFieldsValue({ riskDescription: aiSuggestions.riskDescription });
                                    message.success(t('AuditPrograms.aiRiskDescriptionApplied', 'Đã áp dụng Mô tả Rủi ro từ AI'));
                                  }}
                                  className="text-amber-600 p-0 text-xs font-semibold"
                                >
                                  {t('auditFindings.applyAiSuggestions', 'Áp dụng gợi ý AI')}
                                </Button>
                              )}
                            </div>
                          }
                        >
                          <TextArea rows={12} placeholder={t('AuditPrograms.describeTheRisksOfTheOperation', 'Mô tả rủi ro của hoạt động nếu các kiểm soát bị thất bại (Sai lệch số liệu, tổn thất tài chính, gian lận...)')} className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] text-sm font-sans" />
                        </Form.Item>
                      </Col>
                    </Row>
                  ) 
                },
                { 
                  key: '2', 
                  label: t('AuditPrograms.2SamplingDesign', '📊 2. Thiết kế Kiểm thử & Chọn mẫu (Sampling Design)'), 
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col xs={24}>
                        <Form.Item 
                          name="methodology" 
                          label={
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-slate-600 text-xs">PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)</span>
                              {aiSuggestions?.methodology && (
                                <Button 
                                  size="small" 
                                  type="link" 
                                  icon={<BulbOutlined />} 
                                  onClick={() => {
                                    form.setFieldsValue({ methodology: aiSuggestions.methodology });
                                    message.success(t('AuditPrograms.appliedMethodFromAi', 'Đã áp dụng Phương pháp từ AI'));
                                  }}
                                  className="text-amber-600 p-0 text-xs font-semibold"
                                >
                                  {t('auditFindings.applyAiSuggestions', 'Áp dụng gợi ý AI')}
                                </Button>
                              )}
                            </div>
                          }
                        >
                          <TextArea rows={6} placeholder={t('AuditPrograms.describeMethodsOfComparisonInterviewingOperators', 'Mô tả phương pháp đối chiếu, phỏng vấn cán bộ vận hành, kiểm tra vết hệ thống...')} className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] text-sm font-sans" />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <DetailedSamplingGrid workingPaperId={editingWp?.id} engagementId={form.getFieldValue('planId')} />
                      </Col>
                    </Row>
                  ) 
                },
                { 
                  key: '3', 
                  label: t('AuditPrograms.3FieldAuditingProgramTestingProgram', '🛠️ 3. Chương trình Kiểm toán Thực địa (Testing Program)'), 
                  children: (
                    <Form.Item 
                      name="procedures" 
                      label={
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-slate-600 text-xs">{t('AuditPrograms.detailedStepsAndFieldTestLog', 'CHI TIẾT CÁC BƯỚC THỰC HIỆN VÀ NHẬT KÝ KIỂM THỬ THỰC ĐỊA (AUDIT PROCEDURES)')}</span>
                          {aiSuggestions?.procedures && (
                            <Button 
                              size="small" 
                              type="link" 
                              icon={<BulbOutlined />} 
                              onClick={() => {
                                form.setFieldsValue({ procedures: aiSuggestions.procedures });
                                message.success(t('AuditPrograms.appliedFieldLogFromAi', 'Đã áp dụng Nhật ký thực địa từ AI'));
                              }}
                              className="text-amber-600 p-0 text-xs font-semibold"
                            >
                              {t('auditFindings.applyAiSuggestions', 'Áp dụng gợi ý AI')}
                            </Button>
                          )}
                        </div>
                      }
                    >
                      <TextArea rows={14} placeholder={t('AuditPrograms.recordLogsOfFieldProceduresTrace', 'Ghi nhận nhật ký thực hiện các thủ tục thực địa, kết quả kiểm tra vết của từng mẫu chọn...')} className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] text-sm font-mono" />
                    </Form.Item>
                  ) 
                },
                { 
                  key: '4', 
                  style: { display: 'none' },
                  label: t('workingPapers.4ConclusionsExceptionsConclusionsFindings', '📝 4. Kết luận & Điểm ngoại lệ (Conclusions & Findings)'), 
                  children: (
                    <Form.Item 
                      name="conclusion" 
                      label={
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-slate-600 text-xs">KẾT LUẬN VỀ HIỆU QUẢ KIỂM SOÁT NỘI BỘ (AUDIT CONCLUSION - IIA)</span>
                          {aiSuggestions?.conclusion && (
                            <Button 
                              size="small" 
                              type="link" 
                              icon={<BulbOutlined />} 
                              onClick={() => {
                                form.setFieldsValue({ conclusion: aiSuggestions.conclusion });
                                message.success(t('AuditPrograms.aiConclusionsApplied', 'Đã áp dụng Kết luận từ AI'));
                              }}
                              className="text-amber-600 p-0 text-xs font-semibold"
                            >
                              {t('auditFindings.applyAiSuggestions', 'Áp dụng gợi ý AI')}
                            </Button>
                          )}
                        </div>
                      }
                    >
                      <TextArea rows={14} placeholder={t('AuditPrograms.recordASummaryConclusionAboutThe', 'Ghi nhận kết luận tổng hợp về hiệu quả vận hành của kiểm soát (Hiệu quả / Hiệu quả một phần / Không hiệu quả), đồng thời liệt kê các lỗi phát hiện làm căn cứ lập kiến nghị...')} className="rounded-xl border-slate-200 focus:border-[#ea9105] hover:border-[#ea9105] text-sm font-sans" />
                    </Form.Item>
                  ) 
                },
                {
                  key: '5',
                  style: { display: 'none' },
                  label: t('workingPapers.5Attachments', '📎 5. Tài liệu đính kèm (Attachments)'),
                  children: (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-slate-700 text-sm">{t('AuditPrograms.listOfAttachedDocuments', 'Danh sách tài liệu chứng từ đính kèm')}</span>
                        <div>
                          <input 
                            type="file" 
                            id="wp-attachment-upload-input" 
                            style={{ display: 'none' }} 
                            onChange={handleWpAttachmentUpload} 
                          />
                          <Button 
                            type="dashed" 
                            icon={<CloudUploadOutlined />} 
                            onClick={() => document.getElementById('wp-attachment-upload-input')?.click()}
                          >
                            {t('AuditPrograms.uploadDocumentsdocuments', 'Tải hồ sơ/chứng từ lên')}
                          </Button>
                        </div>
                      </div>
                      <Table 
                        size="small"
                        dataSource={attachments}
                        rowKey={(record, idx) => record.fileUrl + idx}
                        pagination={false}
                        columns={[
                          { title: t('AuditPrograms.documentName', 'Tên tài liệu'), dataIndex: 'name', key: 'name' },
                          { title: t('AuditPrograms.downloader', 'Người tải'), dataIndex: 'uploadedBy', key: 'uploadedBy' },
                          { title: t('AuditPrograms.time', 'Thời gian'), dataIndex: 'uploadedAt', key: 'uploadedAt', render: (val) => val ? new Date(val).toLocaleString() : '' },
                          { 
                            title: t('auditEngagements.download', 'Tải xuống'), 
                            key: 'download', 
                            render: (_, r) => (
                              <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => window.open(r.fileUrl)}>{t('auditEngagements.download', 'Tải xuống')}</Button>
                            ) 
                          },
                          {
                            title: t('auditTemplates.cols.action', 'Thao tác'),
                            key: 'action',
                            render: (_, r, idx) => (
                              <Button type="text" danger size="small" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>{t('auditTemplates.btnDelete', 'Xóa')}</Button>
                            )
                          }
                        ]}
                      />
                    </div>
                  )
                },
                {
                  key: '6',
                  style: { display: 'none' },
                  label: t('workingPapers.6InternalControlsControls', '🛡️ 6. Kiểm soát nội bộ (Controls)'),
                  children: (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-slate-700 text-sm">{t('AuditPrograms.evaluationTableOfProcessControlEffectiveness', 'Bảng đánh giá hiệu lực chốt kiểm soát quy trình')}</span>
                        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddControl} className="bg-emerald-600 border-none text-white">
                          {t('AuditPrograms.addCheckpoint', 'Thêm chốt kiểm soát')}
                        </Button>
                      </div>
                      <Table 
                        size="small"
                        dataSource={controlAssessments}
                        rowKey={(record, idx) => record.controlId + idx}
                        pagination={false}
                        columns={[
                          { 
                            title: t('AuditPrograms.controlPinCode', 'Mã chốt kiểm soát'), 
                            dataIndex: 'controlId', 
                            key: 'controlId', 
                            width: '20%',
                            render: (val, r, idx) => (
                              <Input value={val} onChange={(e) => handleUpdateControl(idx, 'controlId', e.target.value)} size="small" className="font-mono" />
                            )
                          },
                          { 
                            title: t('AuditPrograms.descriptionOfControlPoint', 'Mô tả chốt kiểm soát'), 
                            dataIndex: 'controlDescription', 
                            key: 'controlDescription',
                            width: '40%',
                            render: (val, r, idx) => (
                              <Input.TextArea value={val} onChange={(e) => handleUpdateControl(idx, 'controlDescription', e.target.value)} size="small" autoSize={{ minRows: 1, maxRows: 3 }} />
                            )
                          },
                          { 
                            title: t('AuditPrograms.designEfficiencyDesign', 'Hiệu quả thiết kế (Design)'), 
                            dataIndex: 'designEffectiveness', 
                            key: 'designEffectiveness',
                            width: '15%',
                            render: (val, r, idx) => (
                              <Select value={val} onChange={(v) => handleUpdateControl(idx, 'designEffectiveness', v)} size="small" className="w-full">
                                <Option value={t('AuditPrograms.obtain', 'Đạt')}>{t('AuditPrograms.obtain', 'Đạt')}</Option>
                                <Option value={t('AuditPrograms.failed', 'Không đạt')}>{t('AuditPrograms.failed', 'Không đạt')}</Option>
                              </Select>
                            )
                          },
                          { 
                            title: t('AuditPrograms.operatingEfficiencyOperating', 'Hiệu quả vận hành (Operating)'), 
                            dataIndex: 'operatingEffectiveness', 
                            key: 'operatingEffectiveness',
                            width: '15%',
                            render: (val, r, idx) => (
                              <Select value={val} onChange={(v) => handleUpdateControl(idx, 'operatingEffectiveness', v)} size="small" className="w-full">
                                <Option value={t('AuditPrograms.obtain', 'Đạt')}>{t('AuditPrograms.obtain', 'Đạt')}</Option>
                                <Option value={t('AuditPrograms.failed', 'Không đạt')}>{t('AuditPrograms.failed', 'Không đạt')}</Option>
                              </Select>
                            )
                          },
                          { 
                            title: t('AuditPrograms.testConclusion', 'Kết luận kiểm thử'), 
                            dataIndex: 'testConclusion', 
                            key: 'testConclusion',
                            width: '20%',
                            render: (val, r, idx) => (
                              <Input value={val} onChange={(e) => handleUpdateControl(idx, 'testConclusion', e.target.value)} size="small" />
                            )
                          },
                          {
                            title: '',
                            key: 'action',
                            render: (_, r, idx) => (
                              <Button type="text" danger size="small" onClick={() => handleRemoveControl(idx)}>{t('auditTemplates.btnDelete', 'Xóa')}</Button>
                            )
                          }
                        ]}
                      />
                    </div>
                  )
                },
                ...(selectedTemplate ? [{
                  key: '7',
                  label: t('AuditPrograms.7DetailedFormInformation', '📁 7. Thông tin biểu mẫu chi tiết'),
                  children: (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <Title level={5} className="mb-4 text-[#ea9105]">Trường thông tin đặc thù của Biểu mẫu: {selectedTemplate.name}</Title>
                      <Row gutter={[16, 16]}>
                        {selectedTemplate.fields?.map((field: any) => (
                          <Col span={24} key={field.name}>
                            <Form.Item 
                              name={`tpl_field_${field.name}`} 
                              label={<span className="font-semibold text-slate-700">{field.label}</span>}
                              rules={[{ required: field.required, message: `Vui lòng nhập ${field.label}` }]}
                            >
                              {field.type === 'select' ? (
                                <Select placeholder={`Chọn ${field.label}...`} className="w-full h-10">
                                  {field.options?.map((opt: string) => <Option key={opt} value={opt}>{opt}</Option>)}
                                </Select>
                              ) : field.type === 'textarea' ? (
                                <TextArea rows={4} placeholder={`Nhập ${field.label}...`} className="rounded-lg text-sm" />
                              ) : (
                                <Input type={field.type === 'number' ? 'number' : 'text'} placeholder={`Nhập ${field.label}...`} className="rounded-lg h-10" />
                              )}
                            </Form.Item>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )
                }] : []),
              ]} />
            </Form>
          </Card>
        </Col>

        {/* Right Column: AI IIA Standards Copilot */}
        <Col xs={24} lg={9}>
          <Card 
            variant="borderless" 
            className="shadow-md rounded-2xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/5"
            title={
              <span className="flex items-center gap-2" style={{ color: '#ea9105', fontWeight: 800 }}>
                <RobotOutlined className="text-lg" /> {t('AuditPrograms.aiAssistantIiaCopilot', 'Trợ lý AI IIA Copilot')}
              </span>
            }
          >
            {!aiSuggestions && !aiLoading && (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-500 text-xl animate-pulse">
                  ✨
                </div>
                <p className="text-gray-500 font-medium mb-4 text-xs">
                  {t('AuditPrograms.pleaseEnter', 'Hãy nhập')} <strong>{t('AuditPrograms.namesubjectOfAuditPrograms', 'Tên / Chủ đề Giấy tờ làm việc')}</strong> {t('AuditPrograms.onTheLeftOrSelectFrom', 'ở bên trái (hoặc chọn từ Mẫu), sau đó bấm nút bên dưới để AI tự động xây dựng khung mẫu kiểm toán chuẩn mực IIA quốc tế.')}
                </p>
                <Button 
                  type="primary" 
                  icon={<ThunderboltOutlined />} 
                  onClick={runAIIACopilot}
                  style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8 }}
                >
                  {t('AuditPrograms.enableAiIiaCopilot', 'Kích hoạt AI IIA Copilot')}
                </Button>
              </div>
            )}

            {aiLoading && (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                <p className="text-orange-500 font-bold text-xs">{t('AuditPrograms.aiCopilotIsAnalyzingTheTopic', 'AI Copilot đang phân tích chủ đề...')}</p>
                <span className="text-[10px] text-gray-400 block mt-1">{t('AuditPrograms.developContextObjectivesSamplingFieldProgram', 'Xây dựng Bối cảnh, Mục tiêu, Chọn mẫu & Chương trình thực địa theo IIA Standards')}</span>
              </div>
            )}

            {aiSuggestions && !aiLoading && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 border-orange-100">
                  <span className="text-[11px] font-semibold text-gray-500">{t('AuditPrograms.businessAnalysis', 'Phân tích nghiệp vụ:')}</span>
                  <Tag color="orange" className="font-bold text-[10px] uppercase">
                    {aiSuggestions.domainLabel}
                  </Tag>
                </div>

                {/* Section 1 Suggestion Preview */}
                <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-3xs">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-[10px] text-gray-500 uppercase">{t('AuditPrograms.1BackgroundObjectivesIia', '1. Bối cảnh & Mục tiêu (IIA):')}</strong>
                    <Button size="small" type="text" className="text-blue-600 font-bold p-0 text-[11px]" onClick={() => {
                      form.setFieldsValue({ 
                        objectives: aiSuggestions.objectives,
                        riskDescription: aiSuggestions.riskDescription
                      });
                      message.success(t('AuditPrograms.tab1Applied', 'Đã áp dụng Tab 1'));
                    }}>{t('AuditPrograms.apply', 'Áp dụng')}</Button>
                  </div>
                  <div className="text-[11px] text-gray-400 line-clamp-2">
                    {aiSuggestions.objectives}
                  </div>
                </div>

                {/* Section 2 Suggestion Preview */}
                <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-3xs">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-[10px] text-gray-500 uppercase">{t('AuditPrograms.2TestDesignSampleSelection', '2. Thiết kế kiểm thử & Chọn mẫu:')}</strong>
                    <Button size="small" type="text" className="text-blue-600 font-bold p-0 text-[11px]" onClick={() => {
                      form.setFieldsValue({ 
                        methodology: aiSuggestions.methodology,
                        sampleSelection: aiSuggestions.sampleSelection
                      });
                      message.success(t('AuditPrograms.tab2Applied', 'Đã áp dụng Tab 2'));
                    }}>{t('AuditPrograms.apply', 'Áp dụng')}</Button>
                  </div>
                  <div className="text-[11px] text-gray-400 line-clamp-2">
                    {aiSuggestions.sampleSelection}
                  </div>
                </div>

                {/* Section 3 Suggestion Preview */}
                <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-3xs">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-[10px] text-gray-500 uppercase">{t('AuditPrograms.3FieldProgramIia', '3. Chương trình Thực địa (IIA):')}</strong>
                    <Button size="small" type="text" className="text-blue-600 font-bold p-0 text-[11px]" onClick={() => {
                      form.setFieldsValue({ procedures: aiSuggestions.procedures });
                      message.success(t('AuditPrograms.tab3Applied', 'Đã áp dụng Tab 3'));
                    }}>{t('AuditPrograms.apply', 'Áp dụng')}</Button>
                  </div>
                  <div className="text-[11px] text-gray-400 line-clamp-2">
                    {aiSuggestions.procedures}
                  </div>
                </div>

                {/* Section 4 Suggestion Preview */}
                <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-3xs">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-[10px] text-gray-500 uppercase">{t('AuditPrograms.4ConclusionExceptions', '4. Kết luận & Điểm ngoại lệ:')}</strong>
                    <Button size="small" type="text" className="text-blue-600 font-bold p-0 text-[11px]" onClick={() => {
                      form.setFieldsValue({ conclusion: aiSuggestions.conclusion });
                      message.success(t('AuditPrograms.tab4Applied', 'Đã áp dụng Tab 4'));
                    }}>{t('AuditPrograms.apply', 'Áp dụng')}</Button>
                  </div>
                  <div className="text-[11px] text-gray-400 line-clamp-2">
                    {aiSuggestions.conclusion}
                  </div>
                </div>

                {/* Actions to apply everything */}
                <div className="pt-2 border-t border-orange-100">
                  <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />} 
                    onClick={() => {
                      form.setFieldsValue({
                        referenceCode: `WP-${aiSuggestions.referencePrefix}-${Date.now().toString().slice(-6)}`,
                        objectives: aiSuggestions.objectives,
                        riskDescription: aiSuggestions.riskDescription,
                        methodology: aiSuggestions.methodology,
                        sampleSelection: aiSuggestions.sampleSelection,
                        procedures: aiSuggestions.procedures,
                        conclusion: aiSuggestions.conclusion
                      });
                      message.success(t('AuditPrograms.completelyAppliedTheStandardIiaAudit', '🌟 Đã áp dụng trọn vẹn Mẫu kiểm toán IIA chuẩn mực vào tất cả các Tab!'));
                    }}
                    className="w-full flex justify-center items-center font-bold text-xs"
                    style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', borderRadius: 8, height: '36px' }}
                  >
                    {t('AuditPrograms.allIiaStandardsApply', 'Áp dụng toàn bộ chuẩn IIA')}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* IIA Standard Info card */}
          <Card 
            variant="borderless" 
            className="shadow-md rounded-2xl border border-slate-100 mt-6"
            title={<span className="font-semibold text-slate-800 text-sm">{t('AuditPrograms.iiaStandardsGuidelines', '📚 Chuẩn mực IIA & Hướng dẫn')}</span>}
          >
            <div className="text-xs text-slate-500 flex flex-col gap-3">
              <div>
                <strong className="text-slate-700 block">IIA Standard 2200 (Engagement Planning)</strong>
                <span>{t('AuditPrograms.auditorsMustEstablishObjectivesScopeTiming', 'KTV phải thiết lập mục tiêu, phạm vi, thời gian và phân bổ nguồn lực dựa trên kết quả đánh giá rủi ro sơ bộ.')}</span>
              </div>
              <div>
                <strong className="text-slate-700 block">IIA Standard 2240 (Work Program)</strong>
                <span>{t('AuditPrograms.theFieldAuditProgramMustDetail', 'Chương trình kiểm toán thực địa phải chi tiết các thủ tục thu thập, phân tích, đánh giá và ghi chép thông tin trong suốt cuộc kiểm toán.')}</span>
              </div>
              <div>
                <strong className="text-slate-700 block">IIA Standard 2300 (Performing Engagement)</strong>
                <span>{t('AuditPrograms.theAuditorMustDetermineCompleteReliable', 'KTV phải xác định các thông tin đầy đủ, đáng tin cậy, liên quan và hữu ích (bằng chứng) để chứng minh cho kết quả kiểm toán.')}</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
