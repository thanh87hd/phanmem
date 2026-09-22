import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Modal, 
  Steps, 
  Card, 
  Form, 
  Input, 
  Button, 
  Tag, 
  Typography, 
  Alert, 
  Divider, 
  Row, 
  Col, 
  Checkbox, 
  message 
} from 'antd';
import { 
  CheckOutlined, 
  CloseOutlined 
} from '@ant-design/icons';
import api from '../../services/api';
import { hasPermission } from '../../utils/permission';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface WorkingPaperQaReviewModalProps {
  visible: boolean;
  onClose: () => void;
  workingPaper: any;
  currentUser: any;
  onSuccess: () => void;
}

export const WorkingPaperQaReviewModal: React.FC<WorkingPaperQaReviewModalProps> = ({
  visible,
  onClose,
  workingPaper,
  currentUser,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [qaForm] = Form.useForm();
  const [qaReview, setQaReview] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const DEFAULT_CHECKLIST = [
    { key: 'c1', label: t('workingPapers.clearAuditObjectives', 'Mục tiêu kiểm toán rõ ràng'), checked: false },
    { key: 'c2', label: t('workingPapers.appropriateSamplingMethod', 'Phương pháp chọn mẫu phù hợp'), checked: false },
    { key: 'c3', label: t('workingPapers.fullAuditEvidence', 'Bằng chứng kiểm toán đầy đủ'), checked: false },
    { key: 'c4', label: t('workingPapers.logicalConclusionWithFindings', 'Kết luận logic với phát hiện'), checked: false },
  ];

  const fetchQaReview = async () => {
    if (!workingPaper?.id) return;
    try {
      const res = await api.get(`/quality-reviews/by-working-paper/${workingPaper.id}`);
      setQaReview(res.data);
      if (res.data) {
        qaForm.setFieldsValue({
          selfReviewNotes: res.data.selfReviewNotes,
          supervisorReviewNotes: res.data.supervisorReviewNotes,
          independentReviewNotes: res.data.independentReviewNotes,
          checklist: res.data.checklist || DEFAULT_CHECKLIST,
        });
      } else {
        qaForm.setFieldsValue({ checklist: DEFAULT_CHECKLIST });
      }
    } catch {
      message.error(t('workingPapers.errorLoadingQaData', 'Lỗi tải dữ liệu QA'));
    }
  };

  useEffect(() => {
    if (visible && workingPaper) {
      fetchQaReview();
    } else {
      setQaReview(null);
      qaForm.resetFields();
    }
  }, [visible, workingPaper]);

  const getQaStep = () => {
    if (!qaReview) return 0;
    if (qaReview.independentReviewStatus === 'Approved') return 3;
    if (qaReview.supervisorReviewStatus === 'Approved') return 2;
    if (qaReview.selfReviewStatus === 'Completed') return 1;
    return 0;
  };

  const handleQaSubmit = async (level: string, action: string) => {
    try {
      setSubmitting(true);
      const values = await qaForm.validateFields();
      const payload = {
        ...qaReview,
        workingPaperId: workingPaper.id,
        workingPaperTitle: workingPaper.title,
        checklist: values.checklist,
      };

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
      if (level === 'self') await api.patch(`/working-papers/${workingPaper.id}`, { status: 'PendingReview' });
      if (level === 'independent' && action === 'Approved') await api.patch(`/working-papers/${workingPaper.id}`, { status: 'Approved' });
      if (action === 'Rejected') await api.patch(`/working-papers/${workingPaper.id}`, { status: 'Rejected' });

      message.success(t('workingPapers.updateQaReviewsSuccessfully', 'Cập nhật QA Review thành công'));
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || t('workingPapers.errorUpdatingQa', 'Lỗi cập nhật QA'));
    } finally {
      setSubmitting(false);
    }
  };

  const previewStep = getQaStep();

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1100}
      style={{ top: 20 }}
      title={
        <div className="flex items-center gap-2">
          <Title level={4} className="!mb-0 text-slate-800">
            Đánh giá Chất lượng (QA Review): {workingPaper?.title}
          </Title>
          <Tag color="green" className="rounded-md font-semibold px-2 py-0.5 border-none shadow-3xs">
            {t('workingPapers.iiaQaipStandards', 'Chuẩn mực IIA QAIP')}
          </Tag>
        </div>
      }
    >
      <Text type="secondary" className="text-xs text-slate-500 mb-4 block">
        {t(
          'workingPapers.3levelReviewPreparerTeamLeaderIndependent',
          'Soát xét 3 cấp (Người lập → Trưởng nhóm → QA Độc lập) đảm bảo tính khách quan và chất lượng của Giấy tờ làm việc.',
        )}
      </Text>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          {/* Steps Progress */}
          <Card variant="borderless" className="shadow-sm rounded-xl p-4 bg-slate-50 border border-slate-200 mb-4">
            <Steps
              current={previewStep}
              items={[
                { title: 'Self-Review', description: t('workingPapers.cols.creator', 'Người lập') },
                { title: 'Supervisor Review', description: t('workingPapers.groupLeader', 'Trưởng nhóm') },
                { title: 'Independent Review', description: t('workingPapers.independentQa', 'QA Độc lập') },
              ]}
            />
          </Card>

          {/* QA Review Form */}
          <Card variant="borderless" className="shadow-sm rounded-xl p-4 bg-white border border-slate-200">
            <Form form={qaForm} layout="vertical">
              {previewStep === 0 && (
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag color="orange" className="text-sm font-semibold rounded-md px-2 py-0.5 border-none">
                      {t('workingPapers.level1', 'Cấp 1')}
                    </Tag>
                    <Title level={5} style={{ margin: 0 }} className="text-slate-800">
                      {t('workingPapers.selfreviewAuditorSelfreview', 'Self-Review (Kiểm toán viên tự soát xét)')}
                    </Title>
                  </div>
                  {!hasPermission(
                    currentUser,
                    'wp:edit',
                    workingPaper?.engagement?.ownerTeam || workingPaper?.engagement?.branchCode,
                    workingPaper?.creatorId,
                  ) ? (
                    <Alert
                      message={t(
                        'workingPapers.youDoNotHaveTheRight',
                        'Bạn không có quyền thực hiện Self-Review cho Giấy tờ làm việc này (Chỉ KTV lập hoặc Admin mới có quyền).',
                      )}
                      type="warning"
                      showIcon
                      className="mb-4"
                    />
                  ) : (
                    <>
                      <Form.Item
                        name="selfReviewNotes"
                        label={
                          <span className="font-semibold text-slate-700 text-sm">
                            {t('workingPapers.notesSelfassessmentOfKtvCreatingWp', 'Ghi chú & Tự đánh giá của KTV lập WP')}
                          </span>
                        }
                        rules={[
                          { required: true, message: t('workingPapers.pleaseEnterSelfreviewNotes', 'Vui lòng nhập ghi chú tự soát xét') },
                        ]}
                      >
                        <TextArea
                          rows={5}
                          placeholder={t(
                            'workingPapers.enterNotesToSelfassessControlCapacity',
                            'Nhập ghi chú tự đánh giá năng lực kiểm soát, sự đầy đủ của bằng chứng...',
                          )}
                          className="rounded-xl border-slate-200 text-sm"
                        />
                      </Form.Item>
                      <Divider className="my-4" />
                      <div className="flex justify-end">
                        <Button
                          type="primary"
                          loading={submitting}
                          onClick={() => handleQaSubmit('self', 'Completed')}
                          className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 px-6 text-white"
                        >
                          {t('workingPapers.completeSelfreviewSubmitForApproval', 'Hoàn thành Self-Review & Gửi duyệt')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {previewStep === 1 && (
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag color="blue" className="text-sm font-semibold rounded-md px-2 py-0.5 border-none">
                      {t('workingPapers.level2', 'Cấp 2')}
                    </Tag>
                    <Title level={5} style={{ margin: 0 }} className="text-slate-800">
                      {t('workingPapers.supervisorReviewHeadOfAuditReview', 'Supervisor Review (Trưởng nhóm kiểm toán soát xét)')}
                    </Title>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-200">
                    <span className="text-xs text-slate-400 font-bold uppercase block mb-1">
                      {t('workingPapers.selfassessmentOpinionOfTheAuditor', 'Ý kiến tự đánh giá của KTV lập')}
                    </span>
                    <p className="text-xs text-slate-700 italic mb-0">
                      "{qaReview?.selfReviewNotes || t('workingPapers.noNotes', 'Không có ghi chú')}"
                    </p>
                  </div>
                  {!hasPermission(currentUser, 'wp:review') ? (
                    <Alert
                      message={t(
                        'workingPapers.youDoNotHavePermissionTo',
                        'Bạn không có quyền thực hiện soát xét của Trưởng nhóm (Cần vai trò Trưởng đoàn / Trưởng nhóm / Admin).',
                      )}
                      type="warning"
                      showIcon
                      className="mb-4"
                    />
                  ) : (
                    <>
                      <Form.Item
                        name="supervisorReviewNotes"
                        label={
                          <span className="font-semibold text-slate-700 text-sm">
                            {t('workingPapers.feedbackEvaluationFromTeamLeader', 'Ý kiến phản hồi & Đánh giá của Trưởng nhóm')}
                          </span>
                        }
                        rules={[
                          { required: true, message: t('workingPapers.pleaseEnterCommentsFromTheGroup', 'Vui lòng nhập ý kiến trưởng nhóm') },
                        ]}
                      >
                        <TextArea
                          rows={5}
                          placeholder={t(
                            'workingPapers.enterCommentsAboutTheTestingProgram',
                            'Nhập nhận xét về chương trình kiểm tra, phương pháp chọn mẫu...',
                          )}
                          className="rounded-xl border-slate-200 text-sm"
                        />
                      </Form.Item>
                      <Divider className="my-4" />
                      <div className="flex justify-end gap-3">
                        <Button
                          danger
                          loading={submitting}
                          onClick={() => handleQaSubmit('supervisor', 'Rejected')}
                          className="rounded-xl h-10 px-5 font-semibold"
                        >
                          {t('workingPapers.refuseReturnKtv', 'Từ chối & Trả lại KTV')}
                        </Button>
                        <Button
                          type="primary"
                          loading={submitting}
                          onClick={() => handleQaSubmit('supervisor', 'Approved')}
                          className="shadow-md rounded-xl bg-emerald-600 hover:bg-emerald-700 border-none font-semibold h-10 px-6 text-white"
                        >
                          {t('workingPapers.independentQaApprovalTransfer', 'Phê duyệt & Chuyển QA Độc lập')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {previewStep === 2 && (
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag color="purple" className="text-sm font-semibold rounded-md px-2 py-0.5 border-none">
                      {t('workingPapers.level3', 'Cấp 3')}
                    </Tag>
                    <Title level={5} style={{ margin: 0 }} className="text-slate-800">
                      {t('workingPapers.independentReviewIndependentQualityControl', 'Independent Review (Kiểm soát Chất lượng Độc lập)')}
                    </Title>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Self-Review (KTV)</span>
                      <p className="text-xs text-slate-700 italic mb-0">
                        "{qaReview?.selfReviewNotes || t('workingPapers.noNotes', 'Không có ghi chú')}"
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-400 font-bold uppercase block mb-1">
                        {t('workingPapers.supervisorTeamLeader', 'Supervisor (Trưởng nhóm)')}
                      </span>
                      <p className="text-xs text-slate-700 italic mb-0">
                        "{qaReview?.supervisorReviewNotes || t('workingPapers.noNotes', 'Không có ghi chú')}"
                      </p>
                    </div>
                  </div>
                  {!hasPermission(currentUser, 'wp:approve') ? (
                    <Alert
                      message={t(
                        'workingPapers.youDoNotHaveTheAuthority',
                        'Bạn không có quyền thực hiện phê duyệt độc lập (Cần vai trò QA độc lập / Lãnh đạo KTNB / Admin).',
                      )}
                      type="warning"
                      showIcon
                      className="mb-4"
                    />
                  ) : (
                    <>
                      <Form.Item
                        name="independentReviewNotes"
                        label={
                          <span className="font-semibold text-slate-700 text-sm">
                            {t('workingPapers.independentQualityControlOpinionQaDepartment', 'Ý kiến kiểm soát chất lượng độc lập (QA Department)')}
                          </span>
                        }
                        rules={[
                          { required: true, message: t('workingPapers.pleaseEnterAnIndependentReviewOpinion', 'Vui lòng nhập ý kiến kiểm soát độc lập') },
                        ]}
                      >
                        <TextArea
                          rows={5}
                          placeholder={t(
                            'workingPapers.enterTheFinalQualityAssessmentConclusion',
                            'Nhập kết luận đánh giá chất lượng cuối cùng...',
                          )}
                          className="rounded-xl border-slate-200 text-sm"
                        />
                      </Form.Item>
                      <Divider className="my-4" />
                      <div className="flex justify-end gap-3">
                        <Button
                          danger
                          loading={submitting}
                          onClick={() => handleQaSubmit('independent', 'Rejected')}
                          className="rounded-xl h-10 px-5 font-semibold"
                        >
                          {t('workingPapers.rejectReturnAuditTeam', 'Từ chối & Trả lại Đội kiểm toán')}
                        </Button>
                        <Button
                          type="primary"
                          loading={submitting}
                          onClick={() => handleQaSubmit('independent', 'Approved')}
                          className="shadow-md rounded-xl bg-emerald-600 hover:bg-emerald-700 border-none font-semibold h-10 px-6 text-white"
                        >
                          {t('workingPapers.finalQaApproval', 'Phê duyệt QA Cuối cùng')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {previewStep === 3 && (
                <div className="text-center py-8 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center">
                  <CheckOutlined className="text-4xl text-emerald-500 mb-3 bg-white p-3 rounded-full shadow-sm border border-emerald-100" />
                  <Title level={4} className="text-emerald-800 !mb-1">
                    {t('workingPapers.qaApprovedWorkingPapers', 'Giấy tờ làm việc đã được phê duyệt QA!')}
                  </Title>
                  <Text className="text-slate-500 max-w-md block mb-4 text-xs">
                    {t(
                      'workingPapers.the3levelQualityControlQaReview',
                      'Quy trình kiểm soát chất lượng (QA Review) 3 cấp độ đã hoàn tất xuất sắc và được lưu trữ trên hệ thống làm hồ sơ chuẩn mực chất lượng kiểm toán.',
                    )}
                  </Text>
                  <Button
                    onClick={onClose}
                    className="rounded-xl h-10 px-5 font-semibold border-emerald-200 hover:text-emerald-600 hover:border-emerald-600"
                  >
                    {t('auditPlan.actions.back', 'Đóng')}
                  </Button>
                </div>
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Checklist chất lượng */}
          <Card
            title={<span className="font-semibold text-slate-800 text-sm">{t('workingPapers.wpQualityChecklist', '📋 Checklist Chất lượng WP')}</span>}
            variant="borderless"
            className="shadow-sm rounded-xl border border-slate-200"
          >
            <Form form={qaForm} layout="vertical">
              <Form.List name="checklist">
                {(fields) => (
                  <div className="flex flex-col gap-2.5">
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
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

          {/* Cẩm nang Chất lượng IIA QAIP */}
          <Card
            title={<span className="font-semibold text-slate-800 text-sm">{t('workingPapers.iiaQaipQualityManual', '💡 Cẩm nang Chất lượng IIA QAIP')}</span>}
            variant="borderless"
            className="shadow-sm rounded-xl border border-slate-200 mt-4"
          >
            <div className="text-xs text-slate-600 flex flex-col gap-3">
              <div className="flex gap-2 items-start">
                <span className="text-emerald-500 font-bold">▪</span>
                <span>
                  <strong>Self-Review (KTV):</strong>{' '}
                  {t(
                    'workingPapers.makeSureAllSampleChecksAnd',
                    'Đảm bảo toàn bộ vết kiểm tra mẫu, chương trình chi tiết đã được điền đủ, đính kèm chứng từ VAT hoặc log hệ thống chính xác.',
                  )}
                </span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-emerald-500 font-bold">▪</span>
                <span>
                  <strong>Supervisor Review:</strong>{' '}
                  {t(
                    'workingPapers.theAuditTeamLeaderIsResponsible',
                    'Trưởng nhóm kiểm toán chịu trách nhiệm rà soát tính logic giữa rủi ro - chốt kiểm soát - thủ tục chọn mẫu và kết quả kiểm thử.',
                  )}
                </span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-emerald-500 font-bold">▪</span>
                <span>
                  <strong>Independent Review:</strong>{' '}
                  {t(
                    'workingPapers.theIndependentQaDepartmentWillRandomly',
                    'Bộ phận QA độc lập sẽ hậu kiểm ngẫu nhiên hoặc kiểm soát chất lượng 100% đối với các nghiệp vụ kiểm toán trọng điểm của Khối.',
                  )}
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};
