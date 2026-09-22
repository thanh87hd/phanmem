import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Space,
  Typography,
  Card,
  Form,
  Input,
  Tag,
  Select,
  Row,
  Col,
  Tabs,
  Divider,
  Table,
} from 'antd';
import {
  CloseOutlined,
  SyncOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import TipTapEditor from '../../components/TipTapEditor';
import DynamicFormRenderer from '../../components/DynamicFormRenderer';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface AuditReportFormViewProps {
  isModalVisible: boolean;
  editingReport: any;
  engagements: any[];
  form: any;
  linkedFindings: any[];
  recommendationsList: any[];
  syncingWp: boolean;
  onCancel: () => void;
  onOk: () => void;
  onEngagementChange: (id: any) => void;
  onSyncFindings: () => void;
  onAddRecommendation: () => void;
  onUpdateRecommendation: (id: any, field: string, value: any) => void;
  onRemoveRecommendation: (id: any) => void;
}

export const AuditReportFormView: React.FC<AuditReportFormViewProps> = ({
  isModalVisible,
  editingReport,
  engagements,
  form,
  linkedFindings,
  recommendationsList,
  syncingWp,
  onCancel,
  onOk,
  onEngagementChange,
  onSyncFindings,
  onAddRecommendation,
  onUpdateRecommendation,
  onRemoveRecommendation,
}) => {
  const { t } = useTranslation();

  if (!isModalVisible) return null;

  return (
    <div className="animate-fadeIn p-2" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Premium Header with Back/Home button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 bg-transparent">
        <div className="flex items-center gap-4">
          <Button
            onClick={onCancel}
            className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-11"
            icon={<CloseOutlined />}
          >
            {t('auditExpenses.form.btnBack', '← Quay lại danh sách')}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Title level={3} className="!mb-0 text-slate-800" style={{ margin: 0 }}>
                {editingReport
                  ? `Cập nhật Báo cáo: ${editingReport.title}`
                  : t('auditReports.draftNewAuditReport', 'Dự thảo Báo cáo Kiểm toán mới')}
              </Title>
              <Tag
                color={editingReport ? 'orange' : 'green'}
                className="rounded-md font-semibold px-2 py-0.5 border-none shadow-3xs"
              >
                {editingReport
                  ? [t('auditReports.editReport', 'Hiệu chỉnh Báo cáo')]
                  : t('auditReports.createDraft', 'Khởi tạo Dự thảo')}
              </Tag>
            </div>
            <Text type="secondary" className="text-xs sm:text-sm text-slate-500 mt-1 block">
              Soạn thảo toàn diện Báo cáo Kiểm toán: Thiết lập thông tin chung, thời gian thực địa, mục tiêu kiểm toán, đồng bộ phát hiện từ Working Papers và quản lý danh mục kiến nghị.
            </Text>
          </div>
        </div>
        <Space size="middle">
          <Button
            onClick={onCancel}
            className="rounded-xl shadow-sm h-11 px-5 font-medium hover:bg-slate-50"
          >
            {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
          </Button>
          <Button
            type="primary"
            onClick={onOk}
            className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-11 px-7 text-white transition-all duration-200"
          >
            {editingReport
              ? [t('auditReports.updateReport', 'Cập nhật Báo cáo')]
              : t('auditReports.saveDraft', 'Lưu dự thảo')}
          </Button>
        </Space>
      </div>

      <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
        <Form form={form} layout="vertical">
          <Tabs
            defaultActiveKey="1"
            className="premium-tabs"
            items={[
              {
                key: '1',
                label: '🏛️ 1. Thông tin chung & Pháp lý',
                children: (
                  <div>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="engagementId"
                          label={<span className="font-semibold text-slate-700 text-sm">Cuộc kiểm toán được liên kết</span>}
                          rules={[{ required: true, message: 'Vui lòng chọn cuộc kiểm toán' }]}
                        >
                          <Select
                            placeholder="Chọn cuộc kiểm toán..."
                            className="h-11 rounded-xl border-slate-200"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            onChange={onEngagementChange}
                          >
                            {engagements.map((e: any) => (
                              <Option key={e.id} value={e.id}>
                                {e.name} ({e.code || e.engagementCode || `#${e.id}`})
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          name="reportTemplateType"
                          label={<span className="font-semibold text-slate-700 text-sm">Loại mẫu biểu báo cáo</span>}
                          rules={[{ required: true }]}
                        >
                          <Select className="h-11 rounded-xl border-slate-200">
                            <Option value="MB01B_DVKD">🏢 Mẫu MB01B - Đơn vị kinh doanh (Chi nhánh / PGD)</Option>
                            <Option value="MB02B_BDT">📮 Mẫu MB02B - Bưu điện tỉnh (PGDBĐ / Tiết kiệm bưu điện)</Option>
                            <Option value="MB03B_HSC">🏛️ Mẫu MB03B - Khối Hội sở chính & Chuyên đề</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          name="title"
                          label={<span className="font-semibold text-slate-700 text-sm">Tên / Tiêu đề Báo cáo</span>}
                          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                        >
                          <Input placeholder="Báo cáo kết quả kiểm toán..." className="rounded-xl h-11 border-slate-200 focus:border-[#ea9105]" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item
                          name="auditeeUnit"
                          label={<span className="font-semibold text-slate-700 text-sm">Đối tượng / Đơn vị được kiểm toán</span>}
                          rules={[{ required: true, message: 'Vui lòng nhập đối tượng kiểm toán' }]}
                        >
                          <Input placeholder="Chi nhánh Đắk Lắk, Khối Vận hành..." className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="branchCode" label={<span className="font-semibold text-slate-700 text-sm">Mã đơn vị (Branch Code)</span>}>
                          <Input placeholder="VN0013200..." className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="reportNo" label={<span className="font-semibold text-slate-700 text-sm">Số hiệu BCKT</span>}>
                          <Input placeholder="174/2026/BCKT-IA" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="issueLocation" label={<span className="font-semibold text-slate-700 text-sm">Địa điểm ban hành</span>}>
                          <Input placeholder="Hà Nội, Đắk Lắk..." className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="auditDate" label={<span className="font-semibold text-slate-700 text-sm">Ngày thực hiện kiểm toán</span>}>
                          <Input placeholder="YYYY-MM-DD" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="date" label={<span className="font-semibold text-slate-700 text-sm">Ngày phát hành báo cáo</span>}>
                          <Input placeholder="YYYY-MM-DD" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="decisionNo" label={<span className="font-semibold text-slate-700 text-sm">Quyết định kiểm toán số</span>}>
                          <Input placeholder="87/2026/QĐ-IA" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="decisionDate" label={<span className="font-semibold text-slate-700 text-sm">Ngày ban hành quyết định</span>}>
                          <Input placeholder="YYYY-MM-DD" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Form.Item name="planningPeriod" label={<span className="font-semibold text-slate-700 text-sm">Thời gian xây dựng KHKT</span>}>
                          <Input placeholder="Từ ngày 15/04/2026 đến ngày 07/05/2026" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="fieldworkPeriod" label={<span className="font-semibold text-slate-700 text-sm">Thời gian kiểm toán thực địa</span>}>
                          <Input placeholder="Từ ngày 11/05/2026 đến ngày 22/05/2026" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="reportingPeriod" label={<span className="font-semibold text-slate-700 text-sm">Thời gian hoàn thiện báo cáo</span>}>
                          <Input placeholder="Từ ngày 25/05/2026 đến ngày 09/07/2026" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Form.Item name="leadAuditorName" label={<span className="font-semibold text-slate-700 text-sm">Trưởng đoàn kiểm toán</span>}>
                          <Input placeholder="Huỳnh Công Minh - Phó phòng..." className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={16}>
                        <Form.Item name="teamMembers" label={<span className="font-semibold text-slate-700 text-sm">Thành viên đoàn kiểm toán</span>}>
                          <Input placeholder="Vũ Hải Ninh - KTV cao cấp; Trần Thị Thúy Hằng - KTV cao cấp; Bùi Trung Hiếu - KTV chính" className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="auditRating" label={<span className="font-semibold text-slate-700 text-sm">Xếp loại / Đánh giá tổng thể</span>} rules={[{ required: true }]}>
                          <Select className="h-11 rounded-xl border-slate-200">
                            <Option value="Satisfactory">🟢 Đạt yêu cầu (Satisfactory)</Option>
                            <Option value="NeedsImprovement">🟡 Cần cải thiện (Needs Improvement)</Option>
                            <Option value="Unsatisfactory">🔴 Không đạt (Unsatisfactory)</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="targetAuditProcess" label={<span className="font-semibold text-slate-700 text-sm">Nghiệp vụ / Quy trình</span>}>
                          <Input placeholder="Thẻ tín dụng, Tín dụng & Phi tín dụng..." className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="distributionList" label={<span className="font-semibold text-slate-700 text-sm">Nơi nhận báo cáo</span>}>
                          <Input placeholder="HĐQT, BKS, TGĐ, Khối..." className="rounded-xl h-11 border-slate-200" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: '2',
                label: '🎯 2. Mục tiêu, Phạm vi & Đánh giá',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col xs={24}>
                      <Form.Item name="auditObjective" label={<span className="font-semibold text-slate-700 text-xs uppercase">1. MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES)</span>}>
                        <TipTapEditor placeholder="Nhập chi tiết mục tiêu kiểm toán..." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="scope" label={<span className="font-semibold text-slate-700 text-xs uppercase">2. PHẠM VI KIỂM TOÁN (AUDIT SCOPE)</span>}>
                        <TextArea rows={6} placeholder="Mô tả phạm vi kiểm toán, các đơn vị được chọn kiểm tra, thời kỳ giao dịch..." className="rounded-xl border-slate-200" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="methodology" label={<span className="font-semibold text-slate-700 text-xs uppercase">3. PHƯƠNG PHÁP KIỂM TOÁN & TÀI LIỆU THAM CHIẾU</span>}>
                        <TextArea rows={6} placeholder="Phương pháp chọn mẫu rủi ro, phỏng vấn, kiểm thử ngược, đối soát SQL..." className="rounded-xl border-slate-200" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="executiveSummary" label={<span className="font-semibold text-slate-700 text-xs uppercase">4. TÓM TẮT KẾT QUẢ VÀ CÁC PHÁT HIỆN CHÍNH (EXECUTIVE SUMMARY)</span>}>
                        <TipTapEditor placeholder="Nhập tóm tắt kết quả và các phát hiện kiểm toán chính..." />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="overallConclusion" label={<span className="font-semibold text-slate-700 text-xs uppercase">5. KẾT LUẬN VÀ Ý KIẾN CỦA KIỂM TOÁN VIÊN (OVERALL CONCLUSION)</span>}>
                        <TipTapEditor placeholder="Nhập kết luận và ý kiến của kiểm toán viên..." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="managementEvaluation" label={<span className="font-semibold text-slate-700 text-xs uppercase">6. ĐÁNH GIÁ CÔNG TÁC QUẢN TRỊ VÀ ĐIỀU HÀNH</span>}>
                        <TipTapEditor placeholder="Nhập đánh giá công tác quản trị..." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="internalControlEvaluation" label={<span className="font-semibold text-slate-700 text-xs uppercase">7. ĐÁNH GIÁ HIỆU QUẢ HỆ THỐNG KIỂM SOÁT NỘI BỘ</span>}>
                        <TipTapEditor placeholder="Nhập đánh giá KSNB..." />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: '3',
                label: '📊 3. Xếp hạng nghiệp vụ & Ma trận ĐVKD',
                children: (
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80">
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="branchRatingCreditPersonal" label={<span className="font-semibold text-slate-700 text-sm">Xếp hạng Tín dụng KHCN</span>}>
                          <Select placeholder="Chọn xếp hạng..." allowClear className="h-11">
                            <Select.Option value="Đạt yêu cầu">🟢 Đạt yêu cầu</Select.Option>
                            <Select.Option value="Đạt">🟢 Đạt</Select.Option>
                            <Select.Option value="Cần cải thiện">🟡 Cần cải thiện</Select.Option>
                            <Select.Option value="Không đạt">🔴 Không đạt</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="branchRatingCreditCorporate" label={<span className="font-semibold text-slate-700 text-sm">Xếp hạng Tín dụng KHDN</span>}>
                          <Select placeholder="Chọn xếp hạng..." allowClear className="h-11">
                            <Select.Option value="Đạt yêu cầu">🟢 Đạt yêu cầu</Select.Option>
                            <Select.Option value="Đạt">🟢 Đạt</Select.Option>
                            <Select.Option value="Cần cải thiện">🟡 Cần cải thiện</Select.Option>
                            <Select.Option value="Không đạt">🔴 Không đạt</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="branchRatingNonCredit" label={<span className="font-semibold text-slate-700 text-sm">Xếp hạng Phi tín dụng</span>}>
                          <Select placeholder="Chọn xếp hạng..." allowClear className="h-11">
                            <Select.Option value="Đạt yêu cầu">🟢 Đạt yêu cầu</Select.Option>
                            <Select.Option value="Đạt">🟢 Đạt</Select.Option>
                            <Select.Option value="Cần cải thiện">🟡 Cần cải thiện</Select.Option>
                            <Select.Option value="Không đạt">🔴 Không đạt</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="branchRatingPgdbd" label={<span className="font-semibold text-slate-700 text-sm">Xếp hạng Quản lý PGDBĐ</span>}>
                          <Select placeholder="Chọn xếp hạng..." allowClear className="h-11">
                            <Select.Option value="Đạt yêu cầu">🟢 Đạt yêu cầu</Select.Option>
                            <Select.Option value="Đạt">🟢 Đạt</Select.Option>
                            <Select.Option value="Cần cải thiện">🟡 Cần cải thiện</Select.Option>
                            <Select.Option value="Không đạt">🔴 Không đạt</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={12}>
                        <Form.Item name="branchOverallRating" label={<span className="font-semibold text-slate-700 text-sm">Xếp hạng Tổng thể Chi nhánh</span>}>
                          <Select placeholder="Chọn xếp hạng tổng thể..." allowClear className="h-11 font-bold text-[#ea9105]">
                            <Select.Option value="Đạt yêu cầu">🟢 Đạt yêu cầu (Satisfactory)</Select.Option>
                            <Select.Option value="Đạt">🟢 Đạt</Select.Option>
                            <Select.Option value="Cần cải thiện">🟡 Cần cải thiện (Needs Improvement)</Select.Option>
                            <Select.Option value="Không đạt">🔴 Không đạt (Unsatisfactory)</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: '4',
                label: `🔍 4. Phát hiện kiểm toán (${linkedFindings.length})`,
                children: (
                  <div>
                    <div className="flex justify-between items-center mb-4 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                      <div>
                        <span className="font-bold text-blue-900 text-sm">Danh sách Phát hiện liên kết từ Giấy tờ làm việc (Working Papers)</span>
                        <div className="text-xs text-blue-700 mt-0.5">Tự động đồng bộ số lượng, tỷ lệ mẫu và mức độ rủi ro vào các bảng ma trận báo cáo Word/PDF.</div>
                      </div>
                      <Button
                        type="primary"
                        icon={<SyncOutlined spin={syncingWp} />}
                        onClick={onSyncFindings}
                        loading={syncingWp}
                        className="bg-blue-600 hover:bg-blue-700 rounded-xl h-10 shadow-xs font-medium"
                      >
                        🔄 Cập nhật / Đồng bộ từ Working Papers
                      </Button>
                    </div>

                    <Table
                      dataSource={linkedFindings}
                      rowKey="id"
                      pagination={{ pageSize: 5 }}
                      size="small"
                      scroll={{ x: 1000 }}
                      columns={[
                        { title: 'STT', key: 'stt', width: 50, render: (_, __, i) => i + 1 },
                        {
                          title: 'Mã phát hiện',
                          dataIndex: 'findingCode',
                          key: 'findingCode',
                          width: 110,
                          render: (t) => <Tag color="blue">{t || 'FD-NEW'}</Tag>,
                        },
                        { title: 'Tiêu đề phát hiện', dataIndex: 'findingTitle', key: 'findingTitle', width: 220, ellipsis: true },
                        {
                          title: 'Mảng nghiệp vụ',
                          dataIndex: 'businessModule',
                          key: 'businessModule',
                          width: 140,
                          render: (m: string) =>
                            m === 'TinDung_KHCN'
                              ? 'Tín dụng KHCN'
                              : m === 'TinDung_KHDN'
                              ? 'Tín dụng KHDN'
                              : m === 'PhiTinDung'
                              ? 'Phi tín dụng'
                              : m === 'QuanLy_PGDBD'
                              ? 'Quản lý PGDBĐ'
                              : 'Chung',
                        },
                        {
                          title: 'Rủi ro',
                          dataIndex: 'riskLevel',
                          key: 'riskLevel',
                          width: 110,
                          render: (r: string) => (
                            <Tag color={r === 'Critical' || r === 'High' ? 'red' : r === 'Medium' ? 'orange' : 'green'}>
                              {r === 'Critical' ? 'Nghiêm trọng' : r === 'High' ? 'Cao' : r === 'Medium' ? 'Trung bình' : 'Thấp'}
                            </Tag>
                          ),
                        },
                        { title: 'Đơn vị / PGD', dataIndex: 'subUnitName', key: 'subUnitName', width: 130, render: (t) => t || 'Chi nhánh chính' },
                        { title: 'Tỷ lệ mẫu vi phạm', dataIndex: 'sampleRatio', key: 'sampleRatio', width: 140, render: (t) => t || 'Đang cập nhật' },
                        { title: 'SLA (Ngày)', dataIndex: 'slaDays', key: 'slaDays', width: 90, render: (t) => (t ? `${t} ngày` : '30 ngày') },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: '5',
                label: '💡 5. Kiến nghị kiểm toán (Recommendations)',
                children: (
                  <div>
                    <Row gutter={[16, 16]}>
                      <Col xs={24}>
                        <Form.Item
                          name="recommendationsForAuditee"
                          label={<span className="font-semibold text-slate-700 text-xs uppercase">1. KIẾN NGHỊ ĐỐI VỚI ĐƠN VỊ ĐƯỢC KIỂM TOÁN / BAN GIÁM ĐỐC CHI NHÁNH</span>}
                        >
                          <TipTapEditor placeholder="Nhập kiến nghị chi tiết đối với Chi nhánh..." />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item
                          name="recommendationsForCEO"
                          label={<span className="font-semibold text-slate-700 text-xs uppercase">2. KIẾN NGHỊ ĐỐI VỚI TỔNG GIÁM ĐỐC / HỘI ĐỒNG QUẢN TRỊ</span>}
                        >
                          <TipTapEditor placeholder="Nhập kiến nghị đối với Ban điều hành và Hội đồng quản trị..." />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider className="my-4" />
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="font-bold text-slate-800 text-sm">Danh mục Kiến nghị hành động cụ thể</span>
                        <div className="text-xs text-slate-500">Bảng chi tiết các kiến nghị gắn trách nhiệm và thời hạn khắc phục cho từng bộ phận.</div>
                      </div>
                      <Button icon={<PlusOutlined />} onClick={onAddRecommendation} className="rounded-xl font-medium">
                        Thêm kiến nghị
                      </Button>
                    </div>

                    <Table
                      dataSource={recommendationsList}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      scroll={{ x: 880 }}
                      columns={[
                        { title: 'STT', key: 'stt', width: 50, render: (_, __, i) => i + 1 },
                        {
                          title: 'Đối tượng kiến nghị',
                          dataIndex: 'target',
                          key: 'target',
                          width: 170,
                          render: (text, record) => (
                            <Input
                              value={text}
                              onChange={(e) => onUpdateRecommendation(record.id, 'target', e.target.value)}
                              placeholder="Chi nhánh / Khối HSC"
                              className="rounded-lg"
                            />
                          ),
                        },
                        {
                          title: 'Nội dung kiến nghị cụ thể',
                          dataIndex: 'content',
                          key: 'content',
                          width: 260,
                          render: (text, record) => (
                            <Input.TextArea
                              rows={2}
                              value={text}
                              onChange={(e) => onUpdateRecommendation(record.id, 'content', e.target.value)}
                              placeholder="Nhập nội dung yêu cầu khắc phục, rà soát..."
                              className="rounded-lg"
                            />
                          ),
                        },
                        {
                          title: 'Đơn vị chịu trách nhiệm',
                          dataIndex: 'responsibleParty',
                          key: 'responsibleParty',
                          width: 180,
                          render: (text, record) => (
                            <Input
                              value={text}
                              onChange={(e) => onUpdateRecommendation(record.id, 'responsibleParty', e.target.value)}
                              placeholder="Ban Giám đốc CN, PGD..."
                              className="rounded-lg"
                            />
                          ),
                        },
                        {
                          title: 'Thời hạn hoàn thành',
                          dataIndex: 'deadline',
                          key: 'deadline',
                          width: 140,
                          render: (text, record) => (
                            <Input
                              value={text}
                              onChange={(e) => onUpdateRecommendation(record.id, 'deadline', e.target.value)}
                              placeholder="30/08/2026..."
                              className="rounded-lg"
                            />
                          ),
                        },
                        {
                          title: '',
                          key: 'action',
                          width: 50,
                          render: (_, record) => (
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => onRemoveRecommendation(record.id)}
                            />
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />

          <DynamicFormRenderer entityType="AuditReport" form={form} initialValues={editingReport} />
        </Form>

        <Divider className="my-6" />

        <div className="flex justify-end gap-3">
          <Button onClick={onCancel} className="rounded-xl px-6 h-11 font-medium hover:bg-slate-50 shadow-xs">
            {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
          </Button>
          <Button
            type="primary"
            onClick={onOk}
            className="rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none px-7 font-semibold h-11 text-white shadow-md transition-all duration-200"
          >
            {editingReport ? [t('auditReports.updateReport', 'Cập nhật Báo cáo')] : t('auditReports.saveDraft', 'Lưu dự thảo')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AuditReportFormView;
