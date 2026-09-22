import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Card,
  Tabs,
  Tooltip,
  Divider,
  AutoComplete,
  message,
  Badge,
} from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  CloseOutlined,
  TeamOutlined,
  BankOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface CreditSampleItem {
  id: number;
  sequenceNo: number;
  branchCode: string;
  cifOrAccount: string;
  customerName: string;
  loanAmount: number;
  debtGroup: string;
  testedBy: string;
  loanPurpose: string;
  customerType: string;
  preExplanationNote: string;
  fieldInspectionInfo: string;
  auditeeOfficer: string;
  interviewAuditeeOfficer: string;
  fieldInspection: boolean;
  fieldInspectionResult: string;
  auditeeExplanation: string;
  auditorResponse: string;
  postExplanationNote: string;
  riskGroup: string;
  riskCategory: string;
  detailedRisk: string;
  violationCause: string;
  violationCauseType: string;
  inherentRisk: string;
  controlQuality: string;
  residualRisk: string;
  recommendationText: string;
  relatedPersonnelText: string;
  violationHistory: string;
  responsibleDepartment: string;
  deadline: string;
  primaryOfficerUnit: string;
  relatedOfficer1Unit: string;
  relatedOfficer2Unit: string;
  relatedOfficer3Unit: string;
  primaryOfficerHO: string;
  relatedOfficer1HO: string;
  relatedOfficer2HO: string;
  auditeeOpinion: string;
  includeInReport: boolean;
  findingId?: number;
}

import {
  RISK_GROUPS,
  CAUSE_TYPES,
  CONTROL_QUALITIES,
  INHERENT_RISKS,
  RISK_CATEGORIES,
  CUSTOMER_TYPES,
  AUDITEE_OPINIONS,
  VIOLATION_HISTORIES,
  calculateResidualRisk,
} from '../../constants/auditConstants';
import { useCustomerModalPager } from '../../hooks/useCustomerModalPager';

// Tái xuất các hằng số để duy trì tương thích ngược 100%
export {
  RISK_GROUPS,
  CAUSE_TYPES,
  CONTROL_QUALITIES,
  INHERENT_RISKS,
  RISK_CATEGORIES,
  CUSTOMER_TYPES,
  AUDITEE_OPINIONS,
  VIOLATION_HISTORIES,
  calculateResidualRisk,
};

interface CreditCustomerDetailModalProps {
  open?: boolean;
  visible?: boolean;
  onClose: () => void;
  samples: CreditSampleItem[];
  currentIndex: number;
  onIndexChange: (newIndex: number) => void;
  onSaveSample: (updated: CreditSampleItem) => Promise<boolean>;
  readOnly?: boolean;
  auditorOptions?: { label: string; value: string }[];
  universeOptions?: { label: string; value: string }[];
  defectCodeOptions?: { label: string; value: string }[];
  defaultBranch?: string;
}

export const CreditCustomerDetailModal: React.FC<CreditCustomerDetailModalProps> = ({
  open,
  visible,
  onClose,
  samples,
  currentIndex,
  onIndexChange,
  onSaveSample,
  readOnly = false,
  auditorOptions = [],
  universeOptions = [],
  defectCodeOptions = [],
  defaultBranch = 'Chi nhánh',
}) => {
  const isOpen = open ?? visible ?? false;
  const [form] = Form.useForm();
  const [activeTabKey, setActiveTabKey] = useState('block1');
  const [saving, setSaving] = useState(false);

  const currentSample = samples[currentIndex] || null;
  const totalCount = samples.length;

  // Nạp dữ liệu khi sample thay đổi
  useEffect(() => {
    if (visible && currentSample) {
      form.setFieldsValue({
        sequenceNo: currentSample.sequenceNo,
        branchCode: currentSample.branchCode || defaultBranch,
        cifOrAccount: currentSample.cifOrAccount,
        customerName: currentSample.customerName,
        loanAmount: currentSample.loanAmount,
        debtGroup: currentSample.debtGroup || '1',
        testedBy: currentSample.testedBy,
        loanPurpose: currentSample.loanPurpose,
        customerType: currentSample.customerType || 'Cá nhân',
        preExplanationNote: currentSample.preExplanationNote,
        fieldInspectionInfo: currentSample.fieldInspectionInfo,
        auditeeOfficer: currentSample.auditeeOfficer,
        interviewAuditeeOfficer: currentSample.interviewAuditeeOfficer,
        fieldInspection: currentSample.fieldInspection ?? false,
        fieldInspectionResult: currentSample.fieldInspectionResult,
        auditeeExplanation: currentSample.auditeeExplanation,
        auditorResponse: currentSample.auditorResponse,
        postExplanationNote: currentSample.postExplanationNote,
        riskGroup: currentSample.riskGroup,
        riskCategory: currentSample.riskCategory,
        detailedRisk: currentSample.detailedRisk,
        violationCause: currentSample.violationCause,
        violationCauseType: currentSample.violationCauseType,
        inherentRisk: currentSample.inherentRisk || 'Trung bình',
        controlQuality: currentSample.controlQuality || 'Tốt',
        residualRisk: currentSample.residualRisk || 'Thấp',
        recommendationText: currentSample.recommendationText,
        relatedPersonnelText: currentSample.relatedPersonnelText,
        violationHistory: currentSample.violationHistory || 'Lần đầu',
        responsibleDepartment: currentSample.responsibleDepartment,
        deadline: currentSample.deadline,
        primaryOfficerUnit: currentSample.primaryOfficerUnit,
        relatedOfficer1Unit: currentSample.relatedOfficer1Unit,
        relatedOfficer2Unit: currentSample.relatedOfficer2Unit,
        relatedOfficer3Unit: currentSample.relatedOfficer3Unit,
        primaryOfficerHO: currentSample.primaryOfficerHO,
        relatedOfficer1HO: currentSample.relatedOfficer1HO,
        relatedOfficer2HO: currentSample.relatedOfficer2HO,
        auditeeOpinion: currentSample.auditeeOpinion || 'Đồng ý',
        includeInReport: currentSample.includeInReport ?? false,
      });
    }
  }, [visible, currentSample, defaultBranch, form]);

  // Cập nhật tự động khi thay đổi rủi ro cố hữu hoặc chất lượng kiểm soát
  const handleValuesChange = (changedValues: any, allValues: any) => {
    if ('inherentRisk' in changedValues || 'controlQuality' in changedValues) {
      const inh = allValues.inherentRisk;
      const qual = allValues.controlQuality;
      const newResidual = calculateResidualRisk(inh, qual);
      form.setFieldsValue({ residualRisk: newResidual });
    }
  };

  const handleSaveCurrent = useCallback(
    async (advanceToNext: boolean = false) => {
      if (!currentSample) return;
      try {
        const values = await form.validateFields();
        setSaving(true);
        const updatedRecord: CreditSampleItem = {
          ...currentSample,
          ...values,
        };
        const ok = await onSaveSample(updatedRecord);
        if (ok && advanceToNext) {
          if (currentIndex < totalCount - 1) {
            onIndexChange(currentIndex + 1);
            message.info(`Đã chuyển sang Khách hàng #${currentIndex + 2}`);
          } else {
            message.success('Đã lưu và duyệt hết toàn bộ danh sách mẫu khách hàng!');
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

  const currentResidualWatch = Form.useWatch('residualRisk', form);
  const currentLoanAmountWatch = Form.useWatch('loanAmount', form);
  const currentDebtGroupWatch = Form.useWatch('debtGroup', form);

  if (!currentSample) return null;

  const currentResidual = currentResidualWatch || currentSample.residualRisk || 'Trung bình';
  const currentLoanAmount = currentLoanAmountWatch ?? currentSample.loanAmount ?? 0;
  const currentDebtGroup = currentDebtGroupWatch || currentSample.debtGroup || '1';

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
      {/* STICKY HEADER: THÔNG TIN KHÁCH HÀNG & THANH ĐIỀU HƯỚNG PAGER         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 shadow-xs">
            #{currentSample.sequenceNo}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Title level={4} className="!mb-0 text-slate-800 font-bold">
                {currentSample.customerName || 'Chưa có tên khách hàng'}
              </Title>
              <Tag color="blue" className="font-mono text-xs px-2 py-0.5 rounded-md">
                CIF: {currentSample.cifOrAccount || '---'}
              </Tag>
              <Tag color={currentDebtGroup === '1' ? 'green' : currentDebtGroup === '2' ? 'orange' : 'red'} className="rounded-md">
                Nhóm {currentDebtGroup}
              </Tag>
              <Tag color="cyan" className="rounded-md font-semibold">
                Dư nợ: {Number(currentLoanAmount).toLocaleString('vi-VN')} tỷ
              </Tag>
              <Tag
                color={
                  currentResidual === 'Cao'
                    ? 'error'
                    : currentResidual === 'Thấp' || currentResidual.includes('khắc phục')
                    ? 'success'
                    : 'warning'
                }
                className="rounded-md font-bold"
              >
                Rủi ro: {currentResidual}
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
              Mã chi nhánh: <span className="text-slate-700 font-medium">{currentSample.branchCode || defaultBranch}</span> • KTV phụ trách: <span className="text-slate-700 font-medium">{currentSample.testedBy || 'Chưa chỉ định'}</span>
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
              title="Khách hàng trước (Alt + ←)"
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
                  #{s.sequenceNo} - {s.customerName || s.cifOrAccount || `Mẫu ${idx + 1}`}
                </Option>
              ))}
            </Select>
            <Button
              size="small"
              icon={<RightOutlined />}
              disabled={!pager.canGoNext}
              onClick={pager.goNext}
              title="Khách hàng tiếp theo (Alt + →)"
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
              className="bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-sm"
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
                Lưu & Sang KH Tiếp
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
      {/* BODY FORM TABS: 6 KHỐI NGHIỆP VỤ 40 CỘT TÍN DỤNG                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-6">
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
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
              // TAB 1: KHỐI 1 - THÔNG TIN CHUNG & HỒ SƠ VAY (Cột 1 - 9)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block1',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-sky-800">
                    <BankOutlined /> 1. Thông tin Chung & Hồ sơ (C1-9)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 text-xs text-sky-800">
                      <strong>Khối 1:</strong> Xác định thông tin pháp lý, chi nhánh cấp tín dụng, phân loại khách hàng, dư nợ và mục đích vay vốn.
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="sequenceNo" label={<span className="font-semibold text-slate-700 text-xs">STT Mẫu (Cột 1)</span>}>
                          <InputNumber disabled className="w-full rounded-lg" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="branchCode" label={<span className="font-semibold text-slate-700 text-xs">Tên Đơn vị / Chi nhánh (Cột 2)</span>}>
                          <Input placeholder="Tên chi nhánh..." className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="cifOrAccount" label={<span className="font-semibold text-slate-700 text-xs">Mã Khách hàng / CIF (Cột 3)</span>} rules={[{ required: true, message: 'Nhập mã CIF' }]}>
                          <Input placeholder="Nhập mã CIF..." className="rounded-lg h-9 font-mono" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="customerName" label={<span className="font-semibold text-slate-700 text-xs">Tên Khách hàng (Cột 4)</span>} rules={[{ required: true, message: 'Nhập tên khách hàng' }]}>
                          <Input placeholder="Họ tên KH / Tên DN..." className="rounded-lg h-9 font-semibold" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="loanAmount" label={<span className="font-semibold text-slate-700 text-xs">Dư nợ (tỷ đồng) (Cột 5)</span>}>
                          <InputNumber
                            className="w-full rounded-lg h-9"
                            step={0.1}
                            min={0}
                            placeholder="0.00"
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="debtGroup" label={<span className="font-semibold text-slate-700 text-xs">Nhóm nợ (Cột 6)</span>}>
                          <Select className="w-full h-9" options={[1, 2, 3, 4, 5].map((g) => ({ label: `Nhóm ${g} (${g === 1 ? 'Đủ tiêu chuẩn' : g === 2 ? 'Cần chú ý' : 'Nợ xấu'})`, value: g.toString() }))} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="testedBy" label={<span className="font-semibold text-slate-700 text-xs">KTV Kiểm tra (Cột 7)</span>}>
                          {auditorOptions.length > 0 ? (
                            <Select className="w-full h-9" options={auditorOptions} placeholder="Chọn KTV đoàn" />
                          ) : (
                            <Input placeholder="Tên KTV phụ trách..." className="rounded-lg h-9" />
                          )}
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="customerType" label={<span className="font-semibold text-slate-700 text-xs">Phân loại Khách hàng (Cột 9)</span>}>
                          <Select className="w-full h-9" options={CUSTOMER_TYPES.map((t) => ({ label: t, value: t }))} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="loanPurpose" label={<span className="font-semibold text-slate-700 text-xs">Mục đích vay vốn / Phương án kinh doanh (Cột 8)</span>}>
                          <TextArea rows={3} placeholder="Mô tả cụ thể mục đích vay vốn theo phương án/hợp đồng tín dụng..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },

              // ─────────────────────────────────────────────────────────────
              // TAB 2: KHỐI 2 - THỰC ĐỊA & PHỎNG VẤN SƠ BỘ (Cột 10 - 15)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block2',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <SafetyCertificateOutlined /> 2. Thực địa & Phỏng vấn (C10-15)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-800">
                      <strong>Khối 2:</strong> Ghi nhận nhận xét ban đầu của KTV, thông tin phỏng vấn Cán bộ quản lý khách hàng (CVKH) và kết quả kiểm tra thực địa tài sản bảo đảm / địa điểm kinh doanh.
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} lg={12}>
                        <Form.Item
                          name="preExplanationNote"
                          label={<span className="font-semibold text-slate-700 text-xs">Nội dung ghi nhận trước giải trình (Cột 10)</span>}
                        >
                          <TextArea
                            rows={5}
                            placeholder="Ghi nhận các dấu hiệu bất thường, thiếu sót hồ sơ thẩm định, điều kiện giải ngân trước khi ĐVKD giải trình..."
                            className="rounded-xl text-sm"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Form.Item
                          name="fieldInspectionInfo"
                          label={<span className="font-semibold text-slate-700 text-xs">Thông tin đi thực địa KH cần làm rõ (Cột 11)</span>}
                        >
                          <TextArea
                            rows={5}
                            placeholder="Nội dung cần xác minh thực tế: Tình trạng hoạt động sản xuất kinh doanh, hiện trạng tài sản thế chấp, kho bãi..."
                            className="rounded-xl text-sm"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item name="auditeeOfficer" label={<span className="font-semibold text-slate-700 text-xs">CVKH Quản lý khoản vay (Cột 12)</span>}>
                          <Input placeholder="Họ tên Cán bộ QLKH..." className="rounded-lg h-9" />
                        </Form.Item>
                        <Card className="rounded-xl bg-slate-50 border-slate-200 mt-3 p-2">
                          <Form.Item name="fieldInspection" valuePropName="checked" className="!mb-0">
                            <Checkbox className="font-semibold text-slate-700">
                              Đã đi kiểm tra thực tế KH / TSBĐ (Cột 14)
                            </Checkbox>
                          </Form.Item>
                          <Text type="secondary" className="text-xs block mt-1">
                            Tích chọn nếu KTV đã trực tiếp đến địa bàn kiểm tra.
                          </Text>
                        </Card>
                      </Col>
                      <Col xs={24} md={16}>
                        <Form.Item
                          name="interviewAuditeeOfficer"
                          label={<span className="font-semibold text-slate-700 text-xs">Phỏng vấn Cán bộ QLKH (Cột 13)</span>}
                        >
                          <TextArea rows={2} placeholder="Nội dung và kết quả trao đổi, phỏng vấn CVKH về phương án vay và dòng tiền..." className="rounded-xl text-sm" />
                        </Form.Item>
                        <Form.Item
                          name="fieldInspectionResult"
                          label={<span className="font-semibold text-slate-700 text-xs">Kết quả kiểm tra thực tế KH (Cột 15)</span>}
                        >
                          <TextArea rows={2} placeholder="Biên bản hoặc ghi nhận thực tế tại địa chỉ tài sản / trụ sở khách hàng..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },

              // ─────────────────────────────────────────────────────────────
              // TAB 3: KHỐI 3 - ĐVKD GIẢI TRÌNH & ĐOÀN KT PHẢN HỒI (Cột 16 - 18)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block3',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-indigo-800">
                    <AuditOutlined /> 3. Đối chất & Giải trình (C16-18)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-800">
                      <strong>Khối 3:</strong> Vòng đối thoại kiểm toán theo chuẩn VSA 230 / VSA 260. Ghi nhận văn bản giải trình từ chi nhánh, phản hồi bảo lưu ý kiến của Đoàn và kết luận cuối cùng.
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} lg={12}>
                        <Form.Item
                          name="auditeeExplanation"
                          label={<span className="font-semibold text-slate-700 text-xs">ĐVKD Giải trình và Hồ sơ bổ sung (Cột 16)</span>}
                        >
                          <TextArea
                            rows={6}
                            placeholder="Ý kiến giải trình của Chi nhánh/ĐVKD, số công văn giải trình, các chứng từ bổ sung..."
                            className="rounded-xl text-sm"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Form.Item
                          name="auditorResponse"
                          label={<span className="font-semibold text-slate-700 text-xs">Đoàn KT Trả lời Giải trình (Cột 17)</span>}
                        >
                          <TextArea
                            rows={6}
                            placeholder="Đoàn kiểm toán đánh giá tính hợp lý của tài liệu bổ sung, chấp nhận hoặc bác bỏ giải trình..."
                            className="rounded-xl text-sm"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          name="postExplanationNote"
                          label={<span className="font-semibold text-slate-700 text-xs">Nội dung ghi nhận sau giải trình / Kết luận tồn tại (Cột 18)</span>}
                        >
                          <TextArea
                            rows={4}
                            placeholder="Nếu không còn tồn tại: Ghi 'Không có tồn tại'. Nếu còn vi phạm: Ghi rõ nội dung sai phạm chốt cuối cùng để đưa vào báo cáo..."
                            className="rounded-xl font-medium text-sm border-rose-200"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },

              // ─────────────────────────────────────────────────────────────
              // TAB 4: KHỐI 4 - ĐÁNH GIÁ RỦI RO & KIẾN NGHỊ (Cột 19 - 31)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block4',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-rose-800">
                    <ThunderboltOutlined /> 4. Đánh giá Rủi ro & Kiến nghị (C19-31)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-xs text-rose-800">
                      <strong>Khối 4:</strong> Phân loại nhóm rủi ro, nguyên nhân gốc rễ, tính toán Rủi ro còn lại (Residual Risk) và đề xuất kiến nghị khắc phục có thời hạn.
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item name="riskGroup" label={<span className="font-semibold text-slate-700 text-xs">Nhóm Rủi ro Quy trình (Cột 19)</span>}>
                          <Select
                            className="w-full"
                            placeholder="Chọn nhóm rủi ro"
                            options={Array.from(new Set([...RISK_GROUPS, ...universeOptions.map((u) => u.value)])).map((g) => ({ label: g, value: g }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="riskCategory" label={<span className="font-semibold text-slate-700 text-xs">Danh mục Rủi ro (Cột 20)</span>}>
                          <Select className="w-full" options={RISK_CATEGORIES.map((c) => ({ label: c, value: c }))} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="violationHistory" label={<span className="font-semibold text-slate-700 text-xs">Tính chất vi phạm (Cột 29)</span>}>
                          <Select className="w-full" options={VIOLATION_HISTORIES.map((h) => ({ label: h, value: h }))} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="detailedRisk" label={<span className="font-semibold text-slate-700 text-xs">Rủi ro chi tiết / Mô tả sai phạm (Cột 21)</span>}>
                          {defectCodeOptions.length > 0 ? (
                            <AutoComplete
                              options={defectCodeOptions}
                              filterOption={(input, option) =>
                                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                              }
                            >
                              <TextArea rows={3} placeholder="Gõ tìm kiếm mã lỗi L3 / Nghị định 340 hoặc nhập mô tả chi tiết..." className="rounded-xl text-sm" />
                            </AutoComplete>
                          ) : (
                            <TextArea rows={3} placeholder="Mô tả sai phạm chi tiết..." className="rounded-xl text-sm" />
                          )}
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="violationCause" label={<span className="font-semibold text-slate-700 text-xs">Nguyên nhân vi phạm (Cột 22)</span>}>
                          <TextArea rows={2} placeholder="Nguyên nhân trực tiếp và gốc rễ..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="violationCauseType" label={<span className="font-semibold text-slate-700 text-xs">Phân loại nguyên nhân (Cột 23)</span>}>
                          <Select className="w-full h-9" options={CAUSE_TYPES.map((ct) => ({ label: ct, value: ct }))} placeholder="Chọn phân loại nguyên nhân..." />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Ma trận đánh giá Rủi ro (Rủi ro cố hữu x Chất lượng kiểm soát = Rủi ro còn lại) */}
                    <Card className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2">
                      <Row gutter={16} align="middle">
                        <Col xs={24} sm={8}>
                          <Form.Item name="inherentRisk" label={<span className="font-semibold text-slate-700 text-xs">Rủi ro Cố hữu (Cột 24)</span>} className="!mb-0">
                            <Select options={INHERENT_RISKS.map((r) => ({ label: r, value: r }))} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Form.Item name="controlQuality" label={<span className="font-semibold text-slate-700 text-xs">Chất lượng Kiểm soát (Cột 25)</span>} className="!mb-0">
                            <Select options={CONTROL_QUALITIES.map((q) => ({ label: q, value: q }))} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
                            <Text type="secondary" className="text-xs uppercase font-medium block">
                              Rủi ro Còn lại (Cột 26)
                            </Text>
                            <Tag
                              color={
                                currentResidual === 'Cao'
                                  ? 'error'
                                  : currentResidual === 'Thấp' || currentResidual.includes('khắc phục')
                                  ? 'success'
                                  : 'warning'
                              }
                              className="text-sm px-3 py-1 font-bold rounded-lg mt-1"
                            >
                              {currentResidual}
                            </Tag>
                          </div>
                          {/* Ẩn Form.Item nhưng lưu giá trị vào Form */}
                          <Form.Item name="residualRisk" hidden>
                            <Input />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="recommendationText" label={<span className="font-semibold text-slate-700 text-xs">Kiến nghị xử lý của KTV (Cột 27)</span>}>
                          <TextArea rows={3} placeholder="Kiến nghị khắc phục hồ sơ, thu hồi nợ trước hạn, bổ sung TSBĐ, kiểm điểm trách nhiệm..." className="rounded-xl text-sm" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="responsibleDepartment" label={<span className="font-semibold text-slate-700 text-xs">Đơn vị / Phòng ban thực hiện (Cột 30)</span>}>
                          <Input placeholder="vd: Phòng Khách hàng Doanh nghiệp, PGD Quỳ Hợp..." className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="deadline" label={<span className="font-semibold text-slate-700 text-xs">Thời hạn hoàn thành (Cột 31)</span>}>
                          <Input placeholder="YYYY-MM-DD hoặc 30 ngày kể từ ngày phát hành KLKT..." className="rounded-lg h-9" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },

              // ─────────────────────────────────────────────────────────────
              // TAB 5: KHỐI 5 - TRÁCH NHIỆM NHÂN SỰ ĐVKD & HỘI SỞ (Cột 32 - 38)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block5',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-blue-800">
                    <TeamOutlined /> 5. Phân định Trách nhiệm (C32-38)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-800">
                      <strong>Khối 5:</strong> Phân định rõ trách nhiệm cá nhân tại Đơn vị kinh doanh (Chi nhánh) và các Khối nghiệp vụ tại Hội sở chính liên quan đến khoản cấp tín dụng.
                    </div>
                    <Row gutter={24}>
                      {/* Cột Trái: Trách nhiệm ĐVKD */}
                      <Col xs={24} lg={12}>
                        <Card title={<span className="font-bold text-sky-800 text-sm">🏛️ Trách nhiệm tại Đơn vị kinh doanh (Chi nhánh)</span>} className="rounded-2xl border-sky-200 bg-sky-50/20">
                          <Form.Item name="primaryOfficerUnit" label={<span className="font-semibold text-slate-700 text-xs">Cán bộ Trách nhiệm Chính (ĐVKD) (Cột 32)</span>}>
                            <Input placeholder="Họ tên Cán bộ chịu trách nhiệm chính..." className="rounded-lg h-9" />
                          </Form.Item>
                          <Form.Item name="relatedOfficer1Unit" label={<span className="font-semibold text-slate-700 text-xs">Cán bộ Liên quan 1 (ĐVKD) (Cột 33)</span>}>
                            <Input placeholder="Họ tên người liên quan 1..." className="rounded-lg h-9" />
                          </Form.Item>
                          <Form.Item name="relatedOfficer2Unit" label={<span className="font-semibold text-slate-700 text-xs">Cán bộ Liên quan 2 (ĐVKD) (Cột 34)</span>}>
                            <Input placeholder="Họ tên người liên quan 2..." className="rounded-lg h-9" />
                          </Form.Item>
                          <Form.Item name="relatedOfficer3Unit" label={<span className="font-semibold text-slate-700 text-xs">Cán bộ Liên quan 3 (ĐVKD) (Cột 35)</span>}>
                            <Input placeholder="Họ tên người liên quan 3..." className="rounded-lg h-9" />
                          </Form.Item>
                        </Card>
                      </Col>

                      {/* Cột Phải: Trách nhiệm Hội sở chính */}
                      <Col xs={24} lg={12}>
                        <Card title={<span className="font-bold text-indigo-800 text-sm">🏢 Trách nhiệm tại Hội sở chính</span>} className="rounded-2xl border-indigo-200 bg-indigo-50/20">
                          <Form.Item name="primaryOfficerHO" label={<span className="font-semibold text-slate-700 text-xs">Cán bộ Trách nhiệm Chính (Hội sở) (Cột 36)</span>}>
                            <Input placeholder="Họ tên Cán bộ Hội sở chính..." className="rounded-lg h-9" />
                          </Form.Item>
                          <Form.Item name="relatedOfficer1HO" label={<span className="font-semibold text-slate-700 text-xs">Cán bộ Liên quan 1 (Hội sở) (Cột 37)</span>}>
                            <Input placeholder="Họ tên người liên quan 1 tại Hội sở..." className="rounded-lg h-9" />
                          </Form.Item>
                          <Form.Item name="relatedOfficer2HO" label={<span className="font-semibold text-slate-700 text-xs">Cán bộ Liên quan 2 (Hội sở) (Cột 38)</span>}>
                            <Input placeholder="Họ tên người liên quan 2 tại Hội sở..." className="rounded-lg h-9" />
                          </Form.Item>
                          <Form.Item name="relatedPersonnelText" label={<span className="font-semibold text-slate-700 text-xs">Ghi chú nhân sự tổng hợp (Cột 28)</span>}>
                            <TextArea rows={2} placeholder="Tóm tắt chức danh, vai trò vi phạm của các cán bộ liên quan..." className="rounded-xl text-sm" />
                          </Form.Item>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                ),
              },

              // ─────────────────────────────────────────────────────────────
              // TAB 6: KHỐI 6 - PHẢN HỒI ĐƠN VỊ & BÁO CÁO PHÁT HÀNH (Cột 39 - 40)
              // ─────────────────────────────────────────────────────────────
              {
                key: 'block6',
                label: (
                  <span className="font-semibold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircleOutlined /> 6. Ý kiến Đơn vị & Báo cáo (C39-40)
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                      <strong>Khối 6:</strong> Ý kiến thống nhất cuối cùng của đơn vị và chỉ định đưa vào Báo cáo kiểm toán chính thức.
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="auditeeOpinion" label={<span className="font-semibold text-slate-700 text-xs">Ý kiến phản hồi của Đơn vị (Cột 39)</span>}>
                          <Select className="w-full h-9" options={AUDITEE_OPINIONS.map((o) => ({ label: o, value: o }))} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card className="rounded-xl bg-emerald-50/40 border-emerald-200 mt-6 p-2">
                          <Form.Item name="includeInReport" valuePropName="checked" className="!mb-0">
                            <Checkbox className="font-bold text-emerald-800 text-sm">
                              Đưa vào Báo cáo Kiểm toán chính thức (Cột 40)
                            </Checkbox>
                          </Form.Item>
                          <Text type="secondary" className="text-xs block mt-1">
                            Khi tích chọn, mẫu này sẽ được tính vào tỷ lệ lỗi và tự động kích hoạt tạo Phát hiện kiểm toán (#FD).
                          </Text>
                        </Card>
                      </Col>
                    </Row>

                    {currentSample.findingId && (
                      <Card className="rounded-2xl border-purple-200 bg-purple-50/30 p-4 mt-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-purple-900 text-sm block">
                              🔗 Đã liên kết Phát hiện kiểm toán #FD-{currentSample.findingId}
                            </span>
                            <Text type="secondary" className="text-xs">
                              Mẫu kiểm toán này đã được đồng bộ tự động vào sổ theo dõi phát hiện và kiến nghị kiểm toán.
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
