import React from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Space, Typography, Card, Tag, Steps, Checkbox, Divider, Row, Col, Alert } from 'antd';
import type { FormInstance } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { hasPermission } from '../../utils/permission';
import type { WorkingPaperRecord } from './auditProgramTypes';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AuditProgramQaModalProps {
  open: boolean;
  onClose: () => void;
  selectedWp: WorkingPaperRecord | null;
  qaReview: any;
  qaForm: FormInstance;
  currentUser: any;
  handleQaSubmit: (level: 'self' | 'supervisor' | 'independent', action: string) => Promise<void>;
}

export const AuditProgramQaModal: React.FC<AuditProgramQaModalProps> = ({
  open,
  onClose,
  selectedWp,
  qaReview,
  qaForm,
  currentUser,
  handleQaSubmit,
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  const getQaStep = () => {
    if (!qaReview) return 0;
    if (qaReview.independentReviewStatus === 'Approved') return 3;
    if (qaReview.supervisorReviewStatus === 'Approved') return 2;
    if (qaReview.selfReviewStatus === 'Completed') return 1;
    return 0;
  };

  const previewStep = getQaStep();

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
                Đánh giá Chất lượng (QA Review): {selectedWp?.title}
              </Title>
              <Tag color="green" className="rounded-md font-semibold px-2 py-0.5 border-none shadow-3xs">
                {t('AuditPrograms.iiaQaipStandards', 'Chuẩn mực IIA QAIP')}
              </Tag>
            </div>
            <Text type="secondary" className="text-xs sm:text-sm text-slate-500 mt-1 block">
              {t('AuditPrograms.3levelReviewPreparerTeamLeaderIndependent', 'Soát xét 3 cấp (Người lập → Trưởng nhóm → QA Độc lập) đảm bảo tính khách quan và chất lượng của Giấy tờ làm việc.')}
            </Text>
          </div>
        </div>
        <Space size="middle">
          <Button onClick={onClose} className="rounded-xl shadow-sm h-11 px-5 font-medium hover:bg-slate-50">
            {t('AuditPrograms.comeBack', 'Quay lại')}
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          {/* Steps Progress */}
          <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100 mb-6">
            <Steps 
              current={previewStep} 
              items={[
                { title: 'Self-Review', description: t('AuditPrograms.cols.creator', 'Người lập') },
                { title: 'Supervisor Review', description: t('AuditPrograms.groupLeader', 'Trưởng nhóm') },
                { title: 'Independent Review', description: t('AuditPrograms.independentQa', 'QA Độc lập') }
              ]} 
            />
          </Card>

          {/* QA Review Form */}
          <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
            <Form form={qaForm} layout="vertical">
              {previewStep === 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag color="orange" className="text-sm font-semibold rounded-md px-2 py-0.5 border-none">{t('AuditPrograms.level1', 'Cấp 1')}</Tag>
                    <Title level={4} style={{ margin: 0 }} className="text-slate-800">{t('AuditPrograms.selfreviewAuditorSelfreview', 'Self-Review (Kiểm toán viên tự soát xét)')}</Title>
                  </div>
                  {!hasPermission(currentUser, 'wp:edit', selectedWp?.engagement?.ownerTeam || selectedWp?.engagement?.branchCode, selectedWp?.creatorId) ? (
                    <Alert message={t('AuditPrograms.youDoNotHaveTheRight', 'Bạn không có quyền thực hiện Self-Review cho Giấy tờ làm việc này (Chỉ KTV lập hoặc Admin mới có quyền).')} type="warning" showIcon className="mb-4" />
                  ) : (
                    <>
                      <Form.Item 
                        name="selfReviewNotes" 
                        label={<span className="font-semibold text-slate-700 text-sm">{t('AuditPrograms.notesSelfassessmentOfKtvCreatingWp', 'Ghi chú & Tự đánh giá của KTV lập WP')}</span>}
                        rules={[{ required: true, message: t('AuditPrograms.pleaseEnterSelfreviewNotes', 'Vui lòng nhập ghi chú tự soát xét') }]}
                      >
                        <TextArea rows={6} placeholder={t('AuditPrograms.enterNotesToSelfassessControlCapacity', 'Nhập ghi chú tự đánh giá năng lực kiểm soát, sự đầy đủ của bằng chứng...')} className="rounded-xl border-slate-200 text-sm" />
                      </Form.Item>
                      <Divider className="my-6" />
                      <div className="flex justify-end">
                        <Button 
                          type="primary" 
                          onClick={() => handleQaSubmit('self', 'Completed')}
                          className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-11 px-7 text-white"
                        >
                          {t('AuditPrograms.completeSelfreviewSubmitForApproval', 'Hoàn thành Self-Review & Gửi duyệt')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {previewStep === 1 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag color="blue" className="text-sm font-semibold rounded-md px-2 py-0.5 border-none">{t('AuditPrograms.level2', 'Cấp 2')}</Tag>
                    <Title level={4} style={{ margin: 0 }} className="text-slate-800">{t('AuditPrograms.supervisorReviewHeadOfAuditReview', 'Supervisor Review (Trưởng nhóm kiểm toán soát xét)')}</Title>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold uppercase block mb-1">{t('AuditPrograms.selfassessmentOpinionOfTheAuditor', 'Ý kiến tự đánh giá của KTV lập')}</span>
                    <p className="text-xs text-slate-700 italic mb-0">"{qaReview?.selfReviewNotes || t('AuditPrograms.noNotes', 'Không có ghi chú')}"</p>
                  </div>
                  {!hasPermission(currentUser, 'wp:review') ? (
                    <Alert message={t('AuditPrograms.youDoNotHavePermissionTo', 'Bạn không có quyền thực hiện soát xét của Trưởng nhóm (Cần vai trò Trưởng đoàn / Trưởng nhóm / Admin).')} type="warning" showIcon className="mb-4" />
                  ) : (
                    <>
                      <Form.Item 
                        name="supervisorReviewNotes" 
                        label={<span className="font-semibold text-slate-700 text-sm">{t('AuditPrograms.feedbackEvaluationFromTeamLeader', 'Ý kiến phản hồi & Đánh giá của Trưởng nhóm')}</span>}
                        rules={[{ required: true, message: t('AuditPrograms.pleaseEnterCommentsFromTheGroup', 'Vui lòng nhập ý kiến trưởng nhóm') }]}
                      >
                        <TextArea rows={6} placeholder={t('AuditPrograms.enterCommentsAboutTheTestingProgram', 'Nhập nhận xét về chương trình kiểm tra, phương pháp chọn mẫu...')} className="rounded-xl border-slate-200 text-sm" />
                      </Form.Item>
                      <Divider className="my-6" />
                      <div className="flex justify-end gap-3">
                        <Button 
                          danger 
                          onClick={() => handleQaSubmit('supervisor', 'Rejected')}
                          className="rounded-xl h-11 px-6 font-semibold"
                        >
                          {t('AuditPrograms.refuseReturnKtv', 'Từ chối & Trả lại KTV')}
                        </Button>
                        <Button 
                          type="primary" 
                          onClick={() => handleQaSubmit('supervisor', 'Approved')}
                          className="shadow-md rounded-xl bg-emerald-600 hover:bg-emerald-700 border-none font-semibold h-11 px-7 text-white"
                        >
                          {t('AuditPrograms.independentQaApprovalTransfer', 'Phê duyệt & Chuyển QA Độc lập')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {previewStep === 2 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag color="purple" className="text-sm font-semibold rounded-md px-2 py-0.5 border-none">{t('AuditPrograms.level3', 'Cấp 3')}</Tag>
                    <Title level={4} style={{ margin: 0 }} className="text-slate-800">{t('AuditPrograms.independentReviewIndependentQualityControl', 'Independent Review (Kiểm soát Chất lượng Độc lập)')}</Title>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Self-Review (KTV)</span>
                      <p className="text-xs text-slate-700 italic mb-0">"{qaReview?.selfReviewNotes || t('AuditPrograms.noNotes', 'Không có ghi chú')}"</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-400 font-bold uppercase block mb-1">{t('AuditPrograms.supervisorTeamLeader', 'Supervisor (Trưởng nhóm)')}</span>
                      <p className="text-xs text-slate-700 italic mb-0">"{qaReview?.supervisorReviewNotes || t('AuditPrograms.noNotes', 'Không có ghi chú')}"</p>
                    </div>
                  </div>
                  {!hasPermission(currentUser, 'wp:approve') ? (
                    <Alert message={t('AuditPrograms.youDoNotHaveTheAuthority', 'Bạn không có quyền thực hiện phê duyệt độc lập (Cần vai trò QA độc lập / Lãnh đạo KTNB / Admin).')} type="warning" showIcon className="mb-4" />
                  ) : (
                    <>
                      <Form.Item 
                        name="independentReviewNotes" 
                        label={<span className="font-semibold text-slate-700 text-sm">{t('AuditPrograms.independentQualityControlOpinionQaDepartment', 'Ý kiến kiểm soát chất lượng độc lập (QA Department)')}</span>}
                        rules={[{ required: true, message: t('AuditPrograms.pleaseEnterAnIndependentReviewOpinion', 'Vui lòng nhập ý kiến kiểm soát độc lập') }]}
                      >
                        <TextArea rows={6} placeholder={t('AuditPrograms.enterTheFinalQualityAssessmentConclusion', 'Nhập kết luận đánh giá chất lượng cuối cùng...')} className="rounded-xl border-slate-200 text-sm" />
                      </Form.Item>
                      <Divider className="my-6" />
                      <div className="flex justify-end gap-3">
                        <Button 
                          danger 
                          onClick={() => handleQaSubmit('independent', 'Rejected')}
                          className="rounded-xl h-11 px-6 font-semibold"
                        >
                          {t('AuditPrograms.rejectReturnAuditTeam', 'Từ chối & Trả lại Đội kiểm toán')}
                        </Button>
                        <Button 
                          type="primary" 
                          onClick={() => handleQaSubmit('independent', 'Approved')}
                          className="shadow-md rounded-xl bg-emerald-600 hover:bg-emerald-700 border-none font-semibold h-11 px-7 text-white"
                        >
                          {t('AuditPrograms.finalQaApproval', 'Phê duyệt QA Cuối cùng')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {previewStep === 3 && (
                <div className="text-center py-10 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center">
                  <CheckOutlined className="text-5xl text-emerald-500 mb-4 bg-white p-3 rounded-full shadow-sm border border-emerald-100" />
                  <Title level={3} className="text-emerald-800 !mb-2">{t('AuditPrograms.qaApprovedAuditPrograms', 'Giấy tờ làm việc đã được phê duyệt QA!')}</Title>
                  <Text className="text-slate-500 max-w-md block mb-6 text-sm">
                    {t('AuditPrograms.the3levelQualityControlQaReview', 'Quy trình kiểm soát chất lượng (QA Review) 3 cấp độ đã hoàn tất xuất sắc và được lưu trữ trên hệ thống làm hồ sơ chuẩn mực chất lượng kiểm toán.')}
                  </Text>
                  <Button onClick={onClose} className="rounded-xl h-11 px-6 font-semibold border-emerald-200 hover:text-emerald-600 hover:border-emerald-600">
                    {t('auditPlan.actions.back', 'Quay lại danh sách')}
                  </Button>
                </div>
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Checklist chất lượng */}
          <Card 
            title={<span className="font-semibold text-slate-800 text-sm">{t('AuditPrograms.wpQualityChecklist', '📋 Checklist Chất lượng WP')}</span>}
            variant="borderless" 
            className="shadow-md rounded-2xl border border-slate-100"
          >
            <Form form={qaForm} layout="vertical">
              <Form.List name="checklist">
                {(fields) => (
                  <div className="flex flex-col gap-3">
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} className="flex items-start gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                        <Form.Item {...restField} name={[name, 'checked']} valuePropName="checked" className="mb-0 pt-0.5">
                          <Checkbox disabled={previewStep === 3} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'label']} className="mb-0 w-full">
                          <Input readOnly variant="borderless" className="font-semibold text-slate-700 text-xs p-0 m-0 cursor-default bg-transparent" />
                        </Form.Item>
                      </div>
                    ))}
                  </div>
                )}
              </Form.List>
            </Form>
          </Card>

          {/* QAIP Standards Guide */}
          <Card 
            title={<span className="font-semibold text-slate-800 text-sm">{t('AuditPrograms.iiaQaipQualityManual', '💡 Cẩm nang Chất lượng IIA QAIP')}</span>}
            variant="borderless" 
            className="shadow-md rounded-2xl border border-slate-100 mt-6"
          >
            <div className="text-xs text-slate-600 flex flex-col gap-3.5">
              <div className="flex gap-2 items-start">
                <span className="text-emerald-500 font-bold">▪</span>
                <span><strong>Self-Review (KTV):</strong> {t('AuditPrograms.makeSureAllSampleChecksAnd', 'Đảm bảo toàn bộ vết kiểm tra mẫu, chương trình chi tiết đã được điền đủ, đính kèm chứng từ VAT hoặc log hệ thống chính xác.')}</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-emerald-500 font-bold">▪</span>
                <span><strong>Supervisor Review:</strong> {t('AuditPrograms.theAuditTeamLeaderIsResponsible', 'Trưởng nhóm kiểm toán chịu trách nhiệm rà soát tính logic giữa rủi ro - chốt kiểm soát - thủ tục chọn mẫu và kết quả kiểm thử.')}</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-emerald-500 font-bold">▪</span>
                <span><strong>Independent Review:</strong> {t('AuditPrograms.theIndependentQaDepartmentWillRandomly', 'Bộ phận QA độc lập sẽ hậu kiểm ngẫu nhiên hoặc kiểm soát chất lượng 100% đối với các nghiệp vụ kiểm toán trọng điểm của Khối.')}</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
