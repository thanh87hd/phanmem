import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Card,
  Tabs,
  Tooltip,
  AutoComplete,
  message,
} from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  CloseOutlined,
  BankOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  LinkOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface PTDSampleItem {
  id: number;
  sequenceNo: number;
  managingBranchName: string;
  branchCode: string;
  businessProcess: string;
  condition: string;
  errorCountText: string;
  recommendationText: string;
  relatedPersonnelText: string;
  branchDirectorAtViolation: string;
  residualRisk: string;
  deadline: string;
  testResult: string;
  remediationFeasibility: boolean;
  remediationUnfeasibleReason: string;
  auditeeProposal: string;
  remediationApprover: string;
  remediationApprovedDate: string;
  monitoringCycle: string;
  remediationEvidenceLink: string;
  testNotes: string;
  findingId?: number;
}

import {
  DEFAULT_PTD_PROCESSES,
  RISK_LEVEL_OPTIONS,
  REMEDIATION_STATUS_OPTIONS,
} from '../../constants/auditConstants';
import { useCustomerModalPager } from '../../hooks/useCustomerModalPager';

// Tái xuất các hằng số để duy trì tương thích ngược 100%
export { DEFAULT_PTD_PROCESSES, RISK_LEVEL_OPTIONS, REMEDIATION_STATUS_OPTIONS };

interface PTDCustomerDetailModalProps {
  open?: boolean;
  visible?: boolean;
  onClose: () => void;
  samples: PTDSampleItem[];
  currentIndex: number;
  onIndexChange: (newIndex: number) => void;
  onSaveSample: (updated: PTDSampleItem) => Promise<boolean>;
  readOnly?: boolean;
  unitOptions?: { label: string; value: string }[];
  universeOptions?: { label: string; value: string }[];
  defaultBranch?: string;
}

export const PTDCustomerDetailModal: React.FC<PTDCustomerDetailModalProps> = ({
  open,
  visible,
  onClose,
  samples,
  currentIndex,
  onIndexChange,
  onSaveSample,
  readOnly = false,
  unitOptions = [],
  universeOptions = [],
  defaultBranch = 'Chi nhánh',
}) => {
  const isOpen = open ?? visible ?? false;
  const [form] = Form.useForm();
  const [activeTabKey, setActiveTabKey] = useState('block1');
  const [saving, setSaving] = useState(false);

  const currentSample = samples[currentIndex] || null;
  const totalCount = samples.length;

  useEffect(() => {
    if (visible && currentSample) {
      form.setFieldsValue({
        sequenceNo: currentSample.sequenceNo,
        managingBranchName: currentSample.managingBranchName || defaultBranch,
        branchCode: currentSample.branchCode || 'Trụ sở CN',
        businessProcess: currentSample.businessProcess || DEFAULT_PTD_PROCESSES[0],
        condition: currentSample.condition,
        errorCountText: currentSample.errorCountText || '1 vụ việc',
        recommendationText: currentSample.recommendationText,
        relatedPersonnelText: currentSample.relatedPersonnelText,
        branchDirectorAtViolation: currentSample.branchDirectorAtViolation,
        residualRisk: currentSample.residualRisk || 'Trung bình',
        deadline: currentSample.deadline,
        testResult: currentSample.testResult || 'FAIL',
        remediationFeasibility: currentSample.remediationFeasibility ?? true,
        remediationUnfeasibleReason: currentSample.remediationUnfeasibleReason,
        auditeeProposal: currentSample.auditeeProposal,
        remediationApprover: currentSample.remediationApprover,
        remediationApprovedDate: currentSample.remediationApprovedDate,
        monitoringCycle: currentSample.monitoringCycle,
        remediationEvidenceLink: currentSample.remediationEvidenceLink,
        testNotes: currentSample.testNotes,
      });
    }
  }, [visible, currentSample, defaultBranch, form]);

  const handleSaveCurrent = useCallback(
    async (advanceToNext: boolean = false) => {
      if (!currentSample) return;
      try {
        const values = await form.validateFields();
        setSaving(true);
        const updatedRecord: PTDSampleItem = {
          ...currentSample,
          ...values,
        };
        const ok = await onSaveSample(updatedRecord);
        if (ok && advanceToNext) {
          if (currentIndex < totalCount - 1) {
            onIndexChange(currentIndex + 1);
            message.info(`Đã chuyển sang Hồ sơ PTD #${currentIndex + 2}`);
          } else {
            message.success('Đã lưu và duyệt hết toàn bộ danh sách mẫu Phi tín dụng!');
          }
        }
      } catch (err: any) {
        console.error('Validation error:', err);
      } finally {
        setSaving(false);
      }
    },
    [currentSample, form, onSaveSample, currentIndex, totalCount, onIndexChange],
  );

  // Áp dụng Custom Hook điều hướng phân trang và phím tắt (Ctrl+S, Alt+Left/Right)
  const pager = useCustomerModalPager({
    isOpen,
    currentIndex,
    totalCount,
    onIndexChange,
    onSave: handleSaveCurrent,
  });

  const currentRiskWatch = Form.useWatch('residualRisk', form);
  const currentResultWatch = Form.useWatch('testResult', form);
  const currentEvidenceLinkWatch = Form.useWatch('remediationEvidenceLink', form);

  if (!currentSample) return null;

  const currentRisk = currentRiskWatch || currentSample.residualRisk || 'Trung bình';
  const currentResult = currentResultWatch || currentSample.testResult || 'FAIL';
  const currentEvidenceLink = currentEvidenceLinkWatch || currentSample.remediationEvidenceLink;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      zIndex={1100}
      width={pager.isFullscreen ? '100vw' : '92vw'}
      style={
        pager.isFullscreen
          ? { top: 0, padding: 0, maxWidth: '100vw', margin: 0 }
          : { top: 20, paddingBottom: 20 }
      }
      styles={{
        content: {
          height: pager.isFullscreen ? '100vh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: pager.isFullscreen ? 0 : 16,
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
        },
        body: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        },
      }}
      closeIcon={null}
      destroyOnClose
    >
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STICKY HEADER: ĐƠN VỊ, NGHIỆP VỤ & PAGER                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-100 shadow-xs">
            #{currentSample.sequenceNo}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Title level={4} className="!mb-0 text-slate-800 font-bold">
                {currentSample.businessProcess || 'Nghiệp vụ Phi Tín Dụng'}
              </Title>
              <Tag color="purple" className="font-semibold text-xs px-2 py-0.5 rounded-md">
                Đơn vị: {currentSample.branchCode || 'Trụ sở CN'}
              </Tag>
              <Tag
                color={
                  currentRisk === 'Cao' || currentRisk === '3'
                    ? 'error'
                    : currentRisk === 'Thấp' || currentRisk === '1'
                    ? 'success'
                    : 'warning'
                }
                className="rounded-md font-bold"
              >
                Rủi ro: {currentRisk}
              </Tag>
              <Tag
                color={
                  currentResult === 'PASS'
                    ? 'success'
                    : currentResult === 'EXCEPTION'
                    ? 'warning'
                    : 'error'
                }
                className="rounded-md font-bold"
              >
                {currentResult === 'PASS'
                  ? 'Đã hoàn thành'
                  : currentResult === 'EXCEPTION'
                  ? 'Đang thực hiện'
                  : 'Chưa thực hiện'}
              </Tag>
              {currentSample.findingId ? (
                <Tooltip title="Đã đồng bộ sang Phát hiện kiểm toán #FD">
                  <Tag color="purple" className="cursor-pointer rounded-md font-semibold">
                    🔗 FD-{currentSample.findingId}
                  </Tag>
                </Tooltip>
              ) : null}
            </div>
            <Text type="secondary" className="text-xs">
              Chi nhánh quản lý: <span className="text-slate-700 font-medium">{currentSample.managingBranchName || defaultBranch}</span> • Số lượng sai sót: <span className="text-slate-700 font-medium">{currentSample.errorCountText || '1 vụ việc'}</span>
            </Text>
          </div>
        </div>

        {/* Action Controls & Navigation Pager */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* Pager Box */}
          <Space.Compact className="shadow-xs rounded-xl bg-slate-50 p-1 border border-slate-200">
            <Button
              size="small"
              icon={<LeftOutlined />}
              disabled={!pager.canGoPrev}
              onClick={pager.goPrev}
              title="Mục trước (Alt + ←)"
              className="rounded-lg"
            >
              Trước
            </Button>
            <Select
              size="small"
              value={currentIndex}
              onChange={(val) => pager.goToIndex(val)}
              style={{ width: 140 }}
              popupMatchSelectWidth={false}
              className="text-xs"
            >
              {samples.map((s, idx) => (
                <Option key={s.id} value={idx}>
                  #{s.sequenceNo} - {s.businessProcess || s.branchCode || `Mẫu PTD ${idx + 1}`}
                </Option>
              ))}
            </Select>
            <Button
              size="small"
              icon={<RightOutlined />}
              disabled={!pager.canGoNext}
              onClick={pager.goNext}
              title="Mục tiếp theo (Alt + →)"
              className="rounded-lg"
            >
              Sau
            </Button>
          </Space.Compact>

          {/* Action Buttons */}
          <Space wrap>
            <Button
              icon={pager.isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={pager.toggleFullscreen}
              title={pager.isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
              className="rounded-xl border-slate-300"
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => handleSaveCurrent(false)}
              disabled={readOnly}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-sm border-none"
              title="Phím tắt: Ctrl + S"
            >
              Lưu (Ctrl+S)
            </Button>
            {currentIndex < totalCount - 1 && (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                loading={saving}
                onClick={() => handleSaveCurrent(true)}
                disabled={readOnly}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold border-none shadow-sm"
              >
                Lưu & Sang Mục Tiếp
              </Button>
            )}
            <Button
              icon={<CloseOutlined />}
              onClick={onClose}
              className="rounded-xl border-slate-300 text-slate-600 hover:text-slate-800"
            >
              Đóng (Esc)
            </Button>
          </Space>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* BODY FORM TABS: 4 KHỐI NGHIỆP VỤ 20 CỘT PHI TÍN DỤNG                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-6">
        <Form
          form={form}
          layout="vertical"
          disabled={readOnly}
          className="max-w-7xl mx-auto"
        >
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            type="card"
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"
            items={[
              // ─────────────────────────────────────────────────────────────
              // TAB 1: KHỐI 1 - ĐƠN VỊ & NGHIỆP VỤ (Cột 1 - 4)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block1',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-sky-800">
                    <BankOutlined /> 1. Đơn vị & Nghiệp vụ (C1-4)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 text-xs text-sky-800">
                      <strong>Khối 1:</strong> Xác định Đơn vị được kiểm toán, Chi nhánh quản lý, Điểm giao dịch (PGD/BPGDBĐ) và Nghiệp vụ kiểm toán phi tín dụng trọng tâm.
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="sequenceNo" label={<span className="font-semibold text-slate-700 text-xs">STT (Cột 1)</span>}>
                          <Input disabled className="rounded-lg font-bold" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="managingBranchName" label={<span className="font-semibold text-slate-700 text-xs">Chi nhánh Quản lý (Cột 2)</span>}>
                          <Input placeholder="Chi nhánh..." className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="branchCode" label={<span className="font-semibold text-slate-700 text-xs">Đơn vị / PGD / BPGDBĐ (Cột 3)</span>}>
                          <AutoComplete
                            options={unitOptions}
                            placeholder="Trụ sở CN, PGD Quỳ Hợp..."
                            className="w-full h-9"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="errorCountText" label={<span className="font-semibold text-slate-700 text-xs">Số lượng sai sót (Cột 6)</span>}>
                          <Input placeholder="vd: 5/17 tháng, 12 vụ..." className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="businessProcess" label={<span className="font-semibold text-slate-700 text-xs">Nghiệp vụ Kiểm toán (Cột 4)</span>} rules={[{ required: true, message: 'Chọn hoặc nhập nghiệp vụ' }]}>
                          <AutoComplete
                            options={Array.from(new Set([...DEFAULT_PTD_PROCESSES, ...universeOptions.map((u) => u.value)])).map((p) => ({ label: p, value: p }))}
                            filterOption={(input, option) =>
                              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                            placeholder="Chọn hoặc nhập nghiệp vụ quản lý quỹ, ấn chỉ, camera..."
                          >
                            <Input className="rounded-lg h-10 font-medium" />
                          </AutoComplete>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },

              // ─────────────────────────────────────────────────────────────
              // TAB 2: KHỐI 2 - SAI SÓT, KIẾN NGHỊ & TRÁCH NHIỆM (Cột 5 - 10)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block2',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <ExclamationCircleOutlined /> 2. Sai sót & Trách nhiệm (C5-10)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-800">
                      <strong>Khối 2:</strong> Mô tả chi tiết sai sót phát hiện, đánh giá mức độ rủi ro, phân định trách nhiệm lãnh đạo và đề xuất kiến nghị chấn chỉnh.
                    </div>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          name="condition"
                          label={<span className="font-semibold text-slate-700 text-xs">Nội dung sai sót chi tiết phát hiện (Cột 5)</span>}
                          rules={[{ required: true, message: 'Nhập nội dung sai sót chi tiết' }]}
                        >
                          <TextArea
                            rows={6}
                            placeholder="Mô tả cụ thể diễn biến vi phạm: Tồn quỹ vượt hạn mức, chưa ký sổ quỹ, thiếu chữ ký ACQT, phân quyền chéo user..."
                            className="rounded-xl text-sm"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="residualRisk" label={<span className="font-semibold text-slate-700 text-xs">Mức độ rủi ro (Cột 10)</span>}>
                          <Select className="w-full h-9" options={RISK_LEVEL_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="branchDirectorAtViolation" label={<span className="font-semibold text-slate-700 text-xs">Họ tên Giám đốc tại thời điểm vi phạm (Cột 9)</span>}>
                          <Input placeholder="Họ tên Giám đốc đơn vị..." className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="recommendationText" label={<span className="font-semibold text-slate-700 text-xs">Kiến nghị / Khuyến nghị của KTV dành cho ĐVKD (Cột 7)</span>}>
                          <TextArea rows={4} placeholder="Kiến nghị cụ thể đối với ĐVKD: Nộp tiền mặt tồn quỹ về trụ sở, thu hồi ấn chỉ, rà soát lại camera..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="relatedPersonnelText" label={<span className="font-semibold text-slate-700 text-xs">Trách nhiệm cá nhân / Tập thể vi phạm (Cột 8)</span>}>
                          <TextArea rows={3} placeholder="vd: Kiểm soát viên Nguyễn Thị A, Giao dịch viên Trần Văn B..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },

              // ─────────────────────────────────────────────────────────────
              // TAB 3: KHỐI 3 - KẾ HOẠCH & TIẾN ĐỘ KHẮC PHỤC (Cột 11 - 15)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block3',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircleOutlined /> 3. Kế hoạch & Khắc phục (C11-15)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                      <strong>Khối 3:</strong> Giám sát tiến độ khắc phục kiến nghị, thời hạn cam kết, đánh giá tính khả thi và nguyên nhân nếu chưa hoàn thành.
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item name="deadline" label={<span className="font-semibold text-slate-700 text-xs">Thời hạn hoàn thành khắc phục (Cột 11)</span>}>
                          <Input placeholder="YYYY-MM-DD" className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="testResult" label={<span className="font-semibold text-slate-700 text-xs">Tình trạng khắc phục (Cột 12)</span>}>
                          <Select className="w-full h-9" options={REMEDIATION_STATUS_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="remediationFeasibility" label={<span className="font-semibold text-slate-700 text-xs">Khả năng tiếp tục khắc phục (Cột 13)</span>}>
                          <Select
                            className="w-full h-9"
                            options={[
                              { label: 'Có (Khả thi khắc phục)', value: true },
                              { label: 'Không (Không thể khắc phục)', value: false },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} lg={12}>
                        <Form.Item name="remediationUnfeasibleReason" label={<span className="font-semibold text-slate-700 text-xs">Nguyên nhân (Nếu không thể khắc phục) (Cột 14)</span>}>
                          <TextArea rows={5} placeholder="Lý do khách quan/chủ quan khiến đơn vị chưa hoặc không thể khắc phục..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Form.Item name="auditeeProposal" label={<span className="font-semibold text-slate-700 text-xs">Đề xuất của Đơn vị được kiểm toán (Cột 15)</span>}>
                          <TextArea rows={5} placeholder="Đề xuất của ĐVKD: Xin gia hạn đến ngày..., đề xuất Hội sở sửa đổi quy chế..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },

              // ─────────────────────────────────────────────────────────────
              // TAB 4: KHỐI 4 - PHÊ DUYỆT & THEO DÕI KHẮC PHỤC (Cột 16 - 20)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block4',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-purple-800">
                    <FileDoneOutlined /> 4. Phê duyệt & Bằng chứng (C16-20)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs text-purple-800">
                      <strong>Khối 4:</strong> Thông tin phê duyệt kết quả khắc phục của Lãnh đạo, kỳ theo dõi và đường dẫn file scan chứng từ bằng chứng.
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item name="remediationApprover" label={<span className="font-semibold text-slate-700 text-xs">Cán bộ phê duyệt khắc phục (Cột 16)</span>}>
                          <Input placeholder="Họ tên Lãnh đạo phê duyệt..." className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="remediationApprovedDate" label={<span className="font-semibold text-slate-700 text-xs">Ngày phê duyệt (Cột 17)</span>}>
                          <Input placeholder="YYYY-MM-DD" className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="monitoringCycle" label={<span className="font-semibold text-slate-700 text-xs">Kỳ theo dõi hàng tháng (Cột 18)</span>}>
                          <Input placeholder="Tháng 05/2026" className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          name="remediationEvidenceLink"
                          label={
                            <div className="flex justify-between w-full items-center">
                              <span className="font-semibold text-slate-700 text-xs">Đường link scan chứng từ khắc phục (Cột 19)</span>
                              {currentEvidenceLink && (
                                <a
                                  href={currentEvidenceLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 text-xs flex items-center gap-1 hover:underline"
                                >
                                  <LinkOutlined /> Mở liên kết chứng từ
                                </a>
                              )}
                            </div>
                          }
                        >
                          <Input placeholder="https://drive.google.com/... hoặc link scan nội bộ..." className="rounded-lg h-9 font-mono" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="testNotes" label={<span className="font-semibold text-slate-700 text-xs">Ghi chú kiểm toán thêm (Cột 20)</span>}>
                          <TextArea rows={4} placeholder="Ghi chú thêm về bối cảnh kiểm tra thực tế, lưu ý cho đợt kiểm toán sau..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {currentSample.findingId && (
                      <Card className="rounded-2xl border-purple-200 bg-purple-50/30 p-4 mt-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-purple-900 text-sm block">
                              🔗 Đã liên kết Phát hiện kiểm toán #FD-{currentSample.findingId}
                            </span>
                            <Text type="secondary" className="text-xs">
                              Mục phi tín dụng này đã được tự động kết nối sang Sổ theo dõi khắc phục kiến nghị kiểm toán.
                            </Text>
                          </div>
                          <Tag color="purple" className="px-3 py-1 text-xs font-semibold rounded-lg">
                            Đã kích hoạt tự động
                          </Tag>
                        </div>
                      </Card>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Form>
      </div>
    </Modal>
  );
};
