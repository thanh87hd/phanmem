import React from 'react';
import {
  Modal,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Tabs,
  Card,
  Table,
} from 'antd';
import {
  FileTextOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import sanitizeHtml from '../../utils/sanitizeHtml';

const { Text } = Typography;

interface AuditReportDetailModalProps {
  open: boolean;
  detailReport: any;
  onCancel: () => void;
  onExport: (id: number, format: 'word' | 'excel' | 'pdf' | 'summary') => void;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  ratingLabels: Record<string, { text: string; color: string }>;
}

export const AuditReportDetailModal: React.FC<AuditReportDetailModalProps> = ({
  open,
  detailReport,
  onCancel,
  onExport,
  statusColors,
  statusLabels,
  ratingLabels,
}) => {
  if (!detailReport) return null;

  return (
    <Modal
      title={
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pr-8 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[#ea9105] shrink-0">
              <FileTextOutlined className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-base md:text-lg">
                  {detailReport?.title || 'Báo cáo Kiểm toán'}
                </span>
                {detailReport?.status && (
                  <Tag color={statusColors[detailReport.status]} className="rounded-md font-semibold">
                    {statusLabels[detailReport.status] || detailReport.status}
                  </Tag>
                )}
                {detailReport?.auditRating && (
                  <Tag color={ratingLabels[detailReport.auditRating]?.color} className="rounded-md font-semibold">
                    {ratingLabels[detailReport.auditRating]?.text || detailReport.auditRating}
                  </Tag>
                )}
              </div>
              <Text type="secondary" className="text-xs">
                Mã báo cáo: #{detailReport?.id} | Cuộc KT: {detailReport?.plan || detailReport?.engagement?.name || '—'}
              </Text>
            </div>
          </div>
          {detailReport && (
            <Space size="small" wrap className="mt-2 md:mt-0">
              <Button
                size="middle"
                icon={<FileWordOutlined />}
                className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 font-semibold rounded-lg shadow-xs"
                onClick={() => onExport(detailReport.id, 'word')}
              >
                Xuất Word (.docx)
              </Button>
              <Button
                size="middle"
                icon={<FileExcelOutlined />}
                className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 font-semibold rounded-lg shadow-xs"
                onClick={() => onExport(detailReport.id, 'excel')}
              >
                Xuất Excel (.xlsx)
              </Button>
              <Button
                size="middle"
                icon={<FilePdfOutlined />}
                className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 font-semibold rounded-lg shadow-xs"
                onClick={() => onExport(detailReport.id, 'pdf')}
              >
                Xuất PDF
              </Button>
              <Button
                size="middle"
                icon={<PrinterOutlined />}
                className="hover:bg-slate-100 rounded-lg shadow-xs"
                onClick={() => window.print()}
              >
                In
              </Button>
            </Space>
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <div className="flex justify-between items-center px-2 py-1">
          <div className="text-xs text-slate-400">
            {detailReport?.isSigned ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <SafetyCertificateOutlined /> Báo cáo đã được ký số điện tử
              </span>
            ) : (
              <span>Trạng thái ký số: Chưa ký số</span>
            )}
          </div>
          <Button onClick={onCancel} className="rounded-xl px-6 h-9 font-medium">
            Đóng
          </Button>
        </div>
      }
      width={1150}
      style={{ top: 15 }}
    >
      <div className="py-2">
        {/* Overview Metadata Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4">
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <div className="text-xs text-slate-500 font-medium">Số hiệu BCKT:</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {detailReport.reportNo || `${detailReport.id}/2026/BCKT-IA`}
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="text-xs text-slate-500 font-medium">Nghiệp vụ / Quy trình:</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                {detailReport.targetAuditProcess || detailReport.plan || '—'}
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="text-xs text-slate-500 font-medium">Quyết định kiểm toán:</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                {detailReport.engagement?.decisionNo || '53/2026/QĐ-IA'}{' '}
                {detailReport.engagement?.decisionDate ? `(${detailReport.engagement.decisionDate})` : ''}
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="text-xs text-slate-500 font-medium">Trưởng đoàn kiểm toán:</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                {detailReport.engagement?.leadAuditorUser?.fullName ||
                  detailReport.engagement?.legacyLeadAuditor ||
                  detailReport.issuedBy ||
                  '—'}
              </div>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <div className="text-xs text-slate-500 font-medium">Đối tượng kiểm toán (Khối HO & ĐVKD):</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                {detailReport.engagement?.auditedEntityList ||
                  detailReport.engagement?.auditedDepartment?.name ||
                  'NHBL, Khối Vận hành, CNTT; CN Tiền Giang, Đồng Tháp, PGD Thanh Nhàn'}
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="text-xs text-slate-500 font-medium">Thời gian thực địa:</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                {detailReport.engagement?.fieldworkStartDate
                  ? `${detailReport.engagement.fieldworkStartDate} đến ${detailReport.engagement.fieldworkEndDate}`
                  : '10/03/2026 - 30/03/2026'}
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="text-xs text-slate-500 font-medium">Ngày phát hành / Xếp loại:</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                {detailReport.date || 'Dự thảo'} —{' '}
                <Tag
                  color={
                    detailReport.auditRating === 'Satisfactory'
                      ? 'green'
                      : detailReport.auditRating === 'NeedsImprovement'
                      ? 'orange'
                      : 'red'
                  }
                >
                  {detailReport.auditRating || 'Cần cải thiện'}
                </Tag>
              </div>
            </Col>
          </Row>
        </div>

        <Tabs
          defaultActiveKey="summary"
          type="card"
          items={[
            {
              key: 'summary',
              label: <span className="font-semibold px-2">📝 1. Tóm tắt & Kết luận</span>,
              children: (
                <div className="space-y-4 py-2">
                  <Card
                    size="small"
                    title={<span className="font-bold text-slate-900">1. Tóm tắt kết quả kiểm toán chính (Executive Summary)</span>}
                    className="shadow-2xs rounded-xl"
                  >
                    {detailReport.executiveSummary ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailReport.executiveSummary) }}
                        className="prose max-w-none text-sm text-slate-700 leading-relaxed"
                      />
                    ) : (
                      <Text type="secondary" italic>
                        Chưa có nội dung tóm tắt kết quả.
                      </Text>
                    )}
                  </Card>

                  <Card
                    size="small"
                    title={<span className="font-bold text-slate-900">2. Kết luận và ý kiến của KTV (Overall Audit Conclusion)</span>}
                    className="shadow-2xs rounded-xl"
                  >
                    {detailReport.overallConclusion ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailReport.overallConclusion) }}
                        className="prose max-w-none text-sm text-slate-700 leading-relaxed"
                      />
                    ) : (
                      <Text type="secondary" italic>
                        Chưa có kết luận tổng thể.
                      </Text>
                    )}
                  </Card>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card
                        size="small"
                        title={<span className="font-semibold text-slate-800">3. Đánh giá công tác quản trị & điều hành</span>}
                        className="shadow-2xs rounded-xl h-full"
                      >
                        {detailReport.managementEvaluation ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailReport.managementEvaluation) }}
                            className="prose max-w-none text-sm text-slate-700"
                          />
                        ) : (
                          <Text type="secondary" italic>
                            Hệ thống quản trị điều hành tuân thủ quy định hiện hành.
                          </Text>
                        )}
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card
                        size="small"
                        title={<span className="font-semibold text-slate-800">4. Đánh giá hiệu quả hệ thống KSNB</span>}
                        className="shadow-2xs rounded-xl h-full"
                      >
                        {detailReport.internalControlEvaluation ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailReport.internalControlEvaluation) }}
                            className="prose max-w-none text-sm text-slate-700"
                          />
                        ) : (
                          <Text type="secondary" italic>
                            Hệ thống KSNB vận hành tương đối hiệu lực.
                          </Text>
                        )}
                      </Card>
                    </Col>
                  </Row>

                  {(detailReport.recommendationsForAuditee || detailReport.recommendationsForCEO) && (
                    <Row gutter={[16, 16]}>
                      {detailReport.recommendationsForAuditee && (
                        <Col xs={24} md={12}>
                          <Card
                            size="small"
                            title={<span className="font-semibold text-slate-800">Khuyến nghị Khối Hội sở</span>}
                            className="shadow-2xs rounded-xl"
                          >
                            <div
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailReport.recommendationsForAuditee) }}
                              className="prose max-w-none text-sm text-slate-700"
                            />
                          </Card>
                        </Col>
                      )}
                      {detailReport.recommendationsForCEO && (
                        <Col xs={24} md={12}>
                          <Card
                            size="small"
                            title={<span className="font-semibold text-slate-800">Kiến nghị Tổng Giám đốc / HĐQT</span>}
                            className="shadow-2xs rounded-xl"
                          >
                            <div
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailReport.recommendationsForCEO) }}
                              className="prose max-w-none text-sm text-slate-700"
                            />
                          </Card>
                        </Col>
                      )}
                    </Row>
                  )}
                </div>
              ),
            },
            {
              key: 'scope',
              label: <span className="font-semibold px-2">📋 2. Mục tiêu, Phạm vi & Phương pháp</span>,
              children: (
                <div className="space-y-4 py-2">
                  <Card size="small" title={<span className="font-bold text-slate-900">1. Mục tiêu kiểm toán</span>} className="shadow-2xs rounded-xl">
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
                      <li>Đánh giá công tác xây dựng, ban hành các quy trình, quy định hiện hành liên quan đến sản phẩm, công tác thẩm định, phê duyệt và quản lý sau cấp tín dụng.</li>
                      <li>Rà soát, đánh giá các rủi ro tiềm ẩn liên quan công tác phát hành và quản lý sau phát hành.</li>
                      <li>Đánh giá độc lập khách quan về hệ thống kiểm soát nội bộ liên quan đến nghiệp vụ.</li>
                      <li>Đánh giá việc tuân thủ các quy định của Pháp luật và Ngân hàng, đưa ra các khuyến nghị chấn chỉnh, khắc phục kịp thời.</li>
                    </ul>
                  </Card>

                  <Card size="small" title={<span className="font-bold text-slate-900">2. Phạm vi kiểm toán (Audit Scope)</span>} className="shadow-2xs rounded-xl">
                    {detailReport.scope ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailReport.scope) }}
                        className="prose max-w-none text-sm text-slate-700 leading-relaxed"
                      />
                    ) : (
                      <Text type="secondary" italic>
                        Từ ngày 01/01/2024 đến ngày 28/02/2026, trước và sau thời hiệu trên nếu xét thấy cần thiết.
                      </Text>
                    )}
                  </Card>

                  <Card size="small" title={<span className="font-bold text-slate-900">3. Phương pháp kiểm toán áp dụng (Methodology)</span>} className="shadow-2xs rounded-xl">
                    {detailReport.methodology ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailReport.methodology) }}
                        className="prose max-w-none text-sm text-slate-700 leading-relaxed"
                      />
                    ) : (
                      <Text type="secondary" italic>
                        Phương pháp kiểm toán dựa trên đánh giá rủi ro (Risk-based Audit), chọn mẫu thống kê, phỏng vấn, kiểm thử ngược và đối soát dữ liệu hệ thống Core Banking.
                      </Text>
                    )}
                  </Card>
                </div>
              ),
            },
            {
              key: 'findings',
              label: (
                <span className="font-semibold px-2">
                  🔍 3. Phát hiện Kiểm toán ({detailReport.findings?.length || 0})
                </span>
              ),
              children: (
                <div className="space-y-4 py-2">
                  {/* Risk stats summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-xs text-slate-500 font-medium">Tổng phát hiện</div>
                      <div className="text-xl font-bold text-slate-800">{detailReport.findings?.length || 0}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-center">
                      <div className="text-xs text-red-600 font-medium">Nghiêm trọng (Critical)</div>
                      <div className="text-xl font-bold text-red-700">
                        {detailReport.findings?.filter((f: any) => f.riskLevel === 'Critical').length || 0}
                      </div>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                      <div className="text-xs text-amber-600 font-medium">Cao (High)</div>
                      <div className="text-xl font-bold text-amber-700">
                        {detailReport.findings?.filter((f: any) => f.riskLevel === 'High').length || 0}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                      <div className="text-xs text-blue-600 font-medium">Trung bình (Medium)</div>
                      <div className="text-xl font-bold text-blue-700">
                        {detailReport.findings?.filter((f: any) => f.riskLevel === 'Medium').length || 0}
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                      <div className="text-xs text-emerald-600 font-medium">Thấp (Low)</div>
                      <div className="text-xl font-bold text-emerald-700">
                        {detailReport.findings?.filter((f: any) => f.riskLevel === 'Low').length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Findings Tier 1: Hội sở chính */}
                  <div className="bg-slate-100/80 px-4 py-2 rounded-xl font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>
                      🏢 I. CÁC ĐƠN VỊ / NGHIỆP VỤ TẠI HỘI SỞ CHÍNH (
                      {detailReport.findings?.filter((f: any) => f.findingCategoryGroup !== 'DVKD').length || 0})
                    </span>
                  </div>

                  <div className="space-y-3">
                    {detailReport.findings
                      ?.filter((f: any) => f.findingCategoryGroup !== 'DVKD')
                      .map((finding: any, idx: number) => {
                        const riskColor =
                          finding.riskLevel === 'High' ? 'red' : finding.riskLevel === 'Medium' ? 'orange' : 'green';
                        const riskText =
                          finding.riskLevel === 'High' ? 'Cao' : finding.riskLevel === 'Medium' ? 'Trung bình' : 'Thấp';
                        return (
                          <Card key={finding.id || idx} size="small" className="rounded-xl border border-slate-200 shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                              <span className="font-bold text-slate-800 text-sm">
                                1.{idx + 1}. {finding.findingTitle}
                              </span>
                              <Tag color={riskColor} className="font-semibold">
                                {riskText}
                              </Tag>
                            </div>
                            <div className="text-xs space-y-1 text-slate-600">
                              {finding.affectedScope && (
                                <div>
                                  <span className="font-semibold text-slate-700">Mảng nghiệp vụ & Phạm vi:</span>{' '}
                                  {finding.affectedScope}
                                </div>
                              )}
                              {finding.primaryResponsibleUnit && (
                                <div>
                                  <span className="font-semibold text-slate-700">Đơn vị chủ trì:</span>{' '}
                                  {finding.primaryResponsibleUnit}{' '}
                                  {finding.cooperatingUnits ? `(Phối hợp: ${finding.cooperatingUnits})` : ''}
                                </div>
                              )}
                              {finding.condition && (
                                <div>
                                  <span className="font-semibold text-slate-700">Nội dung chi tiết:</span>{' '}
                                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(finding.condition) }} className="inline" />
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                  </div>

                  {/* Findings Tier 2: ĐVKD */}
                  <div className="bg-slate-100/80 px-4 py-2 rounded-xl font-bold text-slate-900 text-sm flex items-center gap-2 mt-4">
                    <span>
                      🏦 II. TẠI CÁC ĐƠN VỊ KINH DOANH (ĐVKD) (
                      {detailReport.findings?.filter((f: any) => f.findingCategoryGroup === 'DVKD').length || 0})
                    </span>
                  </div>

                  <div className="space-y-3">
                    {detailReport.findings
                      ?.filter((f: any) => f.findingCategoryGroup === 'DVKD')
                      .map((finding: any, idx: number) => {
                        const riskColor =
                          finding.riskLevel === 'High' ? 'red' : finding.riskLevel === 'Medium' ? 'orange' : 'green';
                        const riskText =
                          finding.riskLevel === 'High' ? 'Cao' : finding.riskLevel === 'Medium' ? 'Trung bình' : 'Thấp';
                        return (
                          <Card key={finding.id || idx} size="small" className="rounded-xl border border-slate-200 shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                              <span className="font-bold text-slate-800 text-sm">
                                2.{idx + 1}. {finding.findingTitle}
                              </span>
                              <Tag color={riskColor} className="font-semibold">
                                {riskText}
                              </Tag>
                            </div>
                            <div className="text-xs space-y-1 text-slate-600">
                              {finding.affectedScope && (
                                <div>
                                  <span className="font-semibold text-slate-700">Mảng nghiệp vụ & Phạm vi:</span>{' '}
                                  {finding.affectedScope}
                                </div>
                              )}
                              {finding.primaryResponsibleUnit && (
                                <div>
                                  <span className="font-semibold text-slate-700">Đơn vị chủ trì:</span>{' '}
                                  {finding.primaryResponsibleUnit}
                                </div>
                              )}
                              {finding.condition && (
                                <div className="mt-1.5">
                                  <span className="font-semibold text-slate-700">Nội dung chi tiết:</span>{' '}
                                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(finding.condition) }} className="inline" />
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              ),
            },
            {
              key: 'recommendations',
              label: (
                <span className="font-semibold px-2">
                  💡 4. Bảng Kiến nghị & SLA ({detailReport.recommendations?.length || 0})
                </span>
              ),
              children: (
                <div className="py-2">
                  {detailReport.recommendations && detailReport.recommendations.length > 0 ? (
                    <Table
                      size="small"
                      pagination={false}
                      rowKey="id"
                      scroll={{ x: 850 }}
                      dataSource={detailReport.recommendations}
                      columns={[
                        {
                          title: 'STT',
                          key: 'index',
                          width: 60,
                          align: 'center',
                          render: (_: any, __: any, index: number) => index + 1,
                        },
                        {
                          title: 'Nội dung Kiến nghị',
                          dataIndex: 'recommendation',
                          key: 'recommendation',
                          render: (text: string) => (
                            <div
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
                              className="text-xs sm:text-sm font-medium text-slate-800"
                            />
                          ),
                        },
                        {
                          title: 'Đơn vị Đầu mối',
                          dataIndex: 'legacyDepartment',
                          key: 'legacyDepartment',
                          width: 180,
                          render: (text: string, record: any) => text || record.department?.name || '—',
                        },
                        {
                          title: 'Hạn xử lý',
                          dataIndex: 'dueDate',
                          key: 'dueDate',
                          width: 120,
                          align: 'center',
                          render: (text: string) => text || '—',
                        },
                        {
                          title: 'Trạng thái SLA',
                          dataIndex: 'slaStatus',
                          key: 'slaStatus',
                          width: 130,
                          align: 'center',
                          render: (status: string) => (
                            <Tag color={status === 'QuaHan' ? 'red' : status === 'GiaHan' ? 'orange' : 'green'}>
                              {status === 'QuaHan' ? 'Quá hạn' : status === 'GiaHan' ? 'Gia hạn' : 'Đúng hạn'}
                            </Tag>
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Text type="secondary">Chưa có kiến nghị kiểm toán chi tiết.</Text>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'appendix01b',
              label: <span className="font-semibold px-2">📊 5. Phụ lục 01B - Trách nhiệm ĐV</span>,
              children: (
                <div className="py-2">
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 850 }}
                    dataSource={detailReport.findings || []}
                    columns={[
                      {
                        title: 'STT',
                        key: 'index',
                        width: 60,
                        align: 'center',
                        render: (_: any, __: any, index: number) => index + 1,
                      },
                      {
                        title: 'Đơn vị / Cá nhân chịu trách nhiệm chính & phối hợp',
                        key: 'responsibleUnit',
                        width: 250,
                        render: (_: any, record: any) => (
                          <div>
                            <div className="font-bold text-slate-800">
                              Chủ trì: {record.primaryResponsibleUnit || record.managingBranchName || 'Khối Hội sở / ĐVKD'}
                            </div>
                            {record.cooperatingUnits && (
                              <div className="text-xs text-slate-500">Phối hợp: {record.cooperatingUnits}</div>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: 'Nhóm vấn đề & Nội dung tồn tại',
                        key: 'issue',
                        render: (_: any, record: any) => (
                          <div>
                            <div className="font-bold text-slate-800">{record.findingTitle}</div>
                            {record.condition && (
                              <div
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(record.condition) }}
                                className="text-xs text-slate-600 mt-1 line-clamp-2"
                              />
                            )}
                          </div>
                        ),
                      },
                      {
                        title: 'Mức độ rủi ro',
                        dataIndex: 'riskLevel',
                        key: 'riskLevel',
                        width: 120,
                        align: 'center',
                        render: (level: string) => (
                          <Tag color={level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'green'}>
                            {level === 'High' ? 'Cao' : level === 'Medium' ? 'Trung bình' : 'Thấp'}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Xác nhận của ĐV',
                        key: 'confirmation',
                        width: 180,
                        align: 'center',
                        render: () => <span className="text-xs text-slate-500 italic">Căn cứ Biên bản kiểm toán.</span>,
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};

export default AuditReportDetailModal;
