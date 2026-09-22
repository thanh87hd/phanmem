import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Input, Table, Tag, Space, Button,
  Collapse, Divider, Alert, Tooltip, message, Steps
} from 'antd';
import {
  BookOutlined, DownloadOutlined, CopyOutlined, SearchOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ArrowRightOutlined,
  CompassOutlined, SafetyCertificateOutlined, WarningOutlined,
  AuditOutlined, SwapOutlined, FileTextOutlined, InfoCircleOutlined,
  ApartmentOutlined, TeamOutlined, UserSwitchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { auditGlossaryData, type GlossaryItem } from '../data/auditGlossaryData';
import { GiasStandardsView } from './GiasStandardsView';

const { Title, Text, Paragraph } = Typography;

export interface ComprehensiveHandbookTabProps {
  activeSubTab?: string;
  onSubTabChange?: (key: string) => void;
}

export const ComprehensiveHandbookTab: React.FC<ComprehensiveHandbookTabProps> = ({
  activeSubTab: controlledSubTab,
  onSubTabChange
}) => {
  const navigate = useNavigate();
  const [internalSubTab, setInternalSubTab] = useState<string>('c1');
  const activeSubTab = controlledSubTab ?? internalSubTab;

  const handleSubTabSelect = (key: string) => {
    setInternalSubTab(key);
    onSubTabChange?.(key);
  };

  const [glossarySearch, setGlossarySearch] = useState<string>('');
  const [glossaryFilter, setGlossaryFilter] = useState<string>('ALL');

  const filteredGlossary = auditGlossaryData.filter(item => {
    const matchesCategory = glossaryFilter === 'ALL' || item.category === glossaryFilter;
    const matchesSearch = !glossarySearch ||
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.englishName.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.definition.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      (item.smartAuditMapping && item.smartAuditMapping.toLowerCase().includes(glossarySearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCopyHandbook = () => {
    const url = `${window.location.origin}/docs/HUONG_DAN_SU_DUNG_VA_CAM_NANG_KTNB_TOAN_DIEN.md`;
    fetch(url)
      .then(res => res.text())
      .then(text => {
        navigator.clipboard.writeText(text);
        message.success('Đã sao chép toàn bộ nội dung Cẩm nang vào Clipboard!');
      })
      .catch(() => message.error('Không thể tải nội dung để sao chép.'));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Download & Meta */}
      <div className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 rounded-2xl p-6 border border-amber-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none text-amber-900">
          <BookOutlined style={{ fontSize: 200 }} />
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold bg-[#ea9105] text-white shadow-2xs">
              IIA GIAS 2024 & NHNN COMPLIANT
            </span>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-white shadow-2xs">
              Phiên Bản 4.0 (2026)
            </span>
          </div>
          <Title level={3} style={{ color: '#0f172a', marginBottom: 6, fontWeight: 800 }}>
            Cẩm Nang Nghiệp Vụ & Hướng Dẫn Sử Dụng Hệ Thống Toàn Diện
          </Title>
          <Paragraph style={{ color: '#475569', fontSize: 14, marginBottom: 16 }} className="max-w-3xl leading-relaxed">
            Tài liệu quy chuẩn thống nhất toàn diện về kiến thức kiểm toán nội bộ ngân hàng thương mại, mô hình 3 tuyến phòng thủ, bộ quy tắc phòng tránh 6 sai lầm kinh điển, ma trận RACI và quy trình vận hành 4 giai đoạn chuẩn IIA trên phần mềm Smart Audit.
          </Paragraph>
          <Space wrap size="middle">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              href="/docs/HUONG_DAN_SU_DUNG_VA_CAM_NANG_KTNB_TOAN_DIEN.docx"
              download="HUONG_DAN_SU_DUNG_VA_CAM_NANG_KTNB_TOAN_DIEN.docx"
              className="!bg-[#ea9105] hover:!bg-[#d97706] !text-white font-bold border-none shadow-sm rounded-xl"
            >
              Tải Cẩm Nang Word (.docx)
            </Button>
            <Button
              icon={<DownloadOutlined />}
              href="/docs/HUONG_DAN_SU_DUNG_VA_CAM_NANG_KTNB_TOAN_DIEN.md"
              download="HUONG_DAN_SU_DUNG_VA_CAM_NANG_KTNB_TOAN_DIEN.md"
              className="border-slate-300 text-slate-700 hover:text-amber-700 hover:border-amber-300 rounded-xl font-medium"
            >
              Tải Tài Liệu Markdown (.md)
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyHandbook}
              className="border-slate-300 text-slate-700 hover:text-amber-700 hover:border-amber-300 rounded-xl font-medium"
            >
              Sao Chép Toàn Văn
            </Button>
          </Space>
        </div>
      </div>

      {/* Chapters Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'c1', label: '1. Thuật Ngữ & Viết Tắt (45+)', icon: <FileTextOutlined /> },
          { key: 'c6', label: '2. Chuẩn Mực GIAS 2024 (5 Miền & 15 Nguyên Tắc)', icon: <SafetyCertificateOutlined /> },
          { key: 'c2', label: '3. Kiến Thức Cốt Lõi', icon: <ApartmentOutlined /> },
          { key: 'c3', label: '4. 6 Nhận Định Sai Lầm', icon: <WarningOutlined /> },
          { key: 'c4', label: '5. Workflow & Ma Trận RACI', icon: <SwapOutlined /> },
          { key: 'c5', label: '6. Hướng Dẫn Thao Tác 4 Giai Đoạn', icon: <CompassOutlined /> },
        ].map(item => (
          <Button
            key={item.key}
            type={activeSubTab === item.key ? 'primary' : 'default'}
            icon={item.icon}
            onClick={() => handleSubTabSelect(item.key)}
            className={`rounded-xl font-medium transition-all ${
              activeSubTab === item.key 
                ? '!bg-[#ea9105] !border-[#ea9105] !text-white shadow-sm' 
                : 'border-slate-200 text-slate-700 hover:text-amber-700 hover:border-amber-300'
            }`}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* CHAPTER 1: GLOSSARY */}
      {activeSubTab === 'c1' && (
        <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <Title level={4} className="!mb-0 text-slate-800">
                1. Bảng Thuyết Minh Thuật Ngữ Kiểm Toán & Viết Tắt Chuyên Ngành (Glossary)
              </Title>
              <Text type="secondary" className="text-xs">
                Toàn bộ hơn 45+ thuật ngữ chuẩn quốc tế IIA GIAS 2024, COSO, Basel, TT13/NHNN và Nghị định 340 được giải nghĩa tường tận.
              </Text>
            </div>
            <Space wrap>
              <Input
                placeholder="Tìm kiếm thuật ngữ hoặc ý nghĩa..."
                prefix={<SearchOutlined />}
                value={glossarySearch}
                onChange={e => setGlossarySearch(e.target.value)}
                style={{ width: 240 }}
                className="rounded-lg"
                allowClear
              />
              <Space wrap>
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'IIA_GIAS', label: 'IIA & GIAS' },
                  { key: 'BANKING_LEGAL', label: 'Pháp lý & NHNN' },
                  { key: 'PROCESS_FIELDWORK', label: 'Quy trình & W/P' },
                  { key: 'RISK_INTERNAL_CONTROL', label: 'Rủi ro & KSNB' },
                  { key: 'REPORT_REMEDIATION', label: 'Báo cáo & Khắc phục' },
                  { key: 'SYSTEM_CAAT', label: 'Hệ thống & CAATs' },
                ].map(cat => (
                  <Button
                    key={cat.key}
                    size="small"
                    type={glossaryFilter === cat.key ? 'primary' : 'text'}
                    className={`rounded-md text-xs font-semibold ${glossaryFilter === cat.key ? '!bg-[#ea9105] !text-white' : 'text-slate-600'}`}
                    onClick={() => setGlossaryFilter(cat.key)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </Space>
            </Space>
          </div>

          <Table
            dataSource={filteredGlossary}
            rowKey="key"
            pagination={{ pageSize: 8 }}
            size="middle"
            scroll={{ x: 1000 }}
            columns={[
              {
                title: 'Thuật ngữ / Viết tắt',
                dataIndex: 'term',
                key: 'term',
                width: 200,
                render: (val, r) => {
                  const tagColors: Record<string, string> = {
                    IIA_GIAS: 'gold',
                    BANKING_LEGAL: 'volcano',
                    PROCESS_FIELDWORK: 'blue',
                    RISK_INTERNAL_CONTROL: 'purple',
                    REPORT_REMEDIATION: 'green',
                    SYSTEM_CAAT: 'cyan'
                  };
                  return (
                    <Space orientation="vertical" size={2}>
                      <span className="font-bold text-slate-800 text-sm">{val}</span>
                      <Tag color={tagColors[r.category] || 'default'} className="text-[10px] m-0 font-semibold">
                        {r.categoryLabel}
                      </Tag>
                    </Space>
                  );
                }
              },
              {
                title: 'Tên tiếng Anh (English Name)',
                dataIndex: 'englishName',
                key: 'englishName',
                width: 220,
                render: val => <span className="text-slate-600 italic font-medium">{val}</span>
              },
              {
                title: 'Định nghĩa & Ý nghĩa nghiệp vụ ngân hàng',
                dataIndex: 'definition',
                key: 'definition',
                width: 380,
                render: val => <span className="text-slate-700 leading-relaxed text-sm">{val}</span>
              },
              {
                title: 'Ánh xạ trên LPBank Smart Audit',
                key: 'smartAuditMapping',
                width: 260,
                render: (_, r) => (
                  <div className="text-xs space-y-1">
                    <span className="text-slate-600 block">{r.smartAuditMapping}</span>
                    {r.relatedRoute && (
                      <Button
                        type="link"
                        size="small"
                        className="!p-0 text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                        onClick={() => navigate(r.relatedRoute!)}
                      >
                        <span>Mở màn hình</span>
                        <ArrowRightOutlined className="text-[10px]" />
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
          />
        </Card>
      )}

      {/* CHAPTER 2: CORE KNOWLEDGE */}
      {activeSubTab === 'c2' && (
        <div className="space-y-6">
          <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-200">
            <Title level={4} className="!mb-1 text-slate-800">
              2.1. Mô Hình 3 Tuyến Phòng Thủ (Three Lines Model - IIA 2020 & Thông Tư 13/TT-NHNN)
            </Title>
            <Paragraph type="secondary" className="text-sm mb-4">
              Kiểm toán nội bộ không thay thế chức năng quản lý rủi ro của vận hành, mà đóng vai trò là tuyến phòng thủ độc lập cao nhất, báo cáo trực tiếp Ban Kiểm soát & HĐQT.
            </Paragraph>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/50 h-full flex flex-col justify-between">
                  <div>
                    <Tag color="blue" className="font-bold mb-2">TUYẾN 1: KHỞI TẠO & QUẢN LÝ TRỰC TIẾP</Tag>
                    <Title level={5} className="!text-blue-900 !mb-2">Chi nhánh & Khối Kinh doanh</Title>
                    <Paragraph className="text-xs text-slate-600 mb-3">
                      Bao gồm: Chi nhánh, Phòng giao dịch, Khối vận hành, Khối CNTT, Khối nguồn vốn.
                    </Paragraph>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc mb-4">
                      <li>Thiết lập và vận hành các chốt kiểm soát tác nghiệp tại chỗ.</li>
                      <li>Thực hiện tự đánh giá rủi ro và kiểm soát (RCSA).</li>
                      <li>Kịp thời phát hiện và khắc phục sai sót hàng ngày.</li>
                    </ul>
                  </div>
                  <Button size="small" type="link" className="p-0 text-blue-700 font-semibold" onClick={() => navigate('/auditee-portal')}>
                    Mở Auditee Portal ➔
                  </Button>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="p-5 rounded-xl border border-purple-200 bg-purple-50/50 h-full flex flex-col justify-between">
                  <div>
                    <Tag color="purple" className="font-bold mb-2">TUYẾN 2: GIÁM SÁT & QUẢN TRỊ ĐỘC LẬP</Tag>
                    <Title level={5} className="!text-purple-900 !mb-2">Khối QLRR & Khối Tuân thủ</Title>
                    <Paragraph className="text-xs text-slate-600 mb-3">
                      Bao gồm: Khối Quản lý Rủi ro, Khối Pháp chế & Tuân thủ, Phòng An ninh Thông tin.
                    </Paragraph>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc mb-4">
                      <li>Thiết lập khung chính sách rủi ro và hạn mức tín dụng.</li>
                      <li>Theo dõi các chỉ số cảnh báo rủi ro sớm (KRI).</li>
                      <li>Giám sát việc tuân thủ pháp luật và thông tư NHNN.</li>
                    </ul>
                  </div>
                  <Button size="small" type="link" className="p-0 text-purple-700 font-semibold" onClick={() => navigate('/continuous-monitoring')}>
                    Mở Giám Sát KRI ➔
                  </Button>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/60 h-full flex flex-col justify-between">
                  <div>
                    <Tag color="gold" className="font-bold mb-2">TUYẾN 3: ĐẢM BẢO ĐỘC LẬP & KHÁCH QUAN</Tag>
                    <Title level={5} className="!text-amber-950 !mb-2">Ban Kiểm Toán Nội Bộ (KTNB)</Title>
                    <Paragraph className="text-xs text-slate-600 mb-3">
                      Trực thuộc trực tiếp Ban Kiểm soát, độc lập hoàn toàn với Ban Tổng Giám đốc.
                    </Paragraph>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc mb-4">
                      <li>Đánh giá độc lập tính đầy đủ và hiệu lực của Tuyến 1 và 2.</li>
                      <li>Thực hiện kiểm toán theo định hướng rủi ro (RBIA).</li>
                      <li>Báo cáo trực tiếp BKS và Hội đồng Quản trị.</li>
                    </ul>
                  </div>
                  <Button size="small" type="link" className="p-0 text-amber-800 font-semibold" onClick={() => navigate('/audit-engagements')}>
                    Mở Cuộc Kiểm Toán ➔
                  </Button>
                </div>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-200 h-full">
                <Title level={5} className="!mb-2 text-slate-800">
                  2.2. Tính Độc Lập & Khách Quan (Independence & Objectivity)
                </Title>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">🏢 Độc lập về cơ cấu (Organizational Independence):</span>
                    KTNB trực thuộc Ban Kiểm soát, không chịu sự điều hành của Ban Điều hành / Tổng Giám đốc; không trực tiếp viết quy chế tác nghiệp hoặc phê duyệt hạn mức cho Tuyến 1.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">🛡️ Khách quan cá nhân & Cơ chế phòng chống COI:</span>
                    KTV không được kiểm toán các hoạt động mình đã từng phụ trách trong vòng tối thiểu <b>12 tháng</b> gần nhất. Hệ thống <code>IndependenceTracker</code> tự động quét lịch sử và đưa cảnh báo khi gán nhân sự vào đoàn KT.
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-200 h-full">
                <Title level={5} className="!mb-2 text-slate-800">
                  2.3. Phương Pháp Kiểm Toán Định Hướng Rủi Ro (RBIA)
                </Title>
                <div className="space-y-3 text-sm text-slate-700">
                  <Paragraph className="mb-2">
                    Thay vì kiểm toán dàn trải, RBIA phân bổ nguồn lực vào các khu vực có <b>Rủi ro còn lại (Residual Risk)</b> vượt khẩu vị rủi ro thông qua cơ chế tích hợp 3 luồng dữ liệu (Data Triangulation):
                  </Paragraph>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><b>Dữ liệu định tính:</b> Kết quả khảo sát, phỏng vấn, quy mô tổ chức.</li>
                    <li><b>Dữ liệu định lượng (Continuous Monitoring):</b> Biến động nợ xấu, chỉ số vi phạm CoreBanking, giao dịch ngoài giờ.</li>
                    <li><b>Dữ liệu lịch sử:</b> Tỷ lệ kiến nghị quá hạn chưa khắc phục từ các kỳ trước.</li>
                  </ul>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* CHAPTER 3: MISCONCEPTIONS & PITFALLS */}
      {activeSubTab === 'c3' && (
        <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-200">
          <div className="mb-4">
            <Title level={4} className="!mb-1 text-slate-800">
              3. Các Nhận Định Sai Lầm Thường Gặp (Misconceptions & Pitfalls)
            </Title>
            <Text type="secondary" className="text-xs">
              Bộ 6 sai lầm kinh điển cần phân biệt rõ ràng khi thực thi kiểm toán tại Ngân hàng.
            </Text>
          </div>

          <Collapse
            defaultActiveKey={['p1', 'p2']}
            className="bg-transparent border-none space-y-3"
            items={[
              {
                key: 'p1',
                label: <span className="font-bold text-slate-800">❌ Sai Lầm 1: Đồng Nhất "Rủi Ro" (Risk) Với "Sai Sót / Phát Hiện" (Finding)</span>,
                children: (
                  <div className="space-y-3 text-sm">
                    <Alert
                      type="error"
                      showIcon
                      message="Nhận định sai:"
                      description='"Chi nhánh này có 10 lỗi vi phạm hồ sơ tín dụng, vậy rủi ro ở đây chính là 10 lỗi đó."'
                      className="rounded-xl"
                    />
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-800">
                      <span className="font-bold text-emerald-900 block mb-1">✅ Bản chất chuẩn mực:</span>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li><b>Rủi ro (Risk):</b> Là một <i>sự kiện tiềm ẩn trong tương lai</i> có thể làm ngân hàng không đạt được mục tiêu (ví dụ: Rủi ro mất vốn do tài sản bảo đảm bị định giá cao).</li>
                        <li><b>Sai sót / Vi phạm (Finding):</b> Là một <i>sự kiện đã xảy ra</i> vi phạm quy định cụ thể (ví dụ: Hồ sơ thiếu biên bản kiểm tra thực địa TSBĐ).</li>
                        <li><b>Mối quan hệ:</b> Sai sót là <u>bằng chứng thực tế</u> chứng minh rằng chốt kiểm soát đang bị suy yếu, làm tăng xác suất xảy ra rủi ro.</li>
                      </ul>
                    </div>
                  </div>
                )
              },
              {
                key: 'p2',
                label: <span className="font-bold text-slate-800">❌ Sai Lầm 2: Nghĩ Rằng "Rủi Ro Tiềm Tàng" Sẽ Giảm Đi Khi Có Kiểm Soát Tốt</span>,
                children: (
                  <div className="space-y-3 text-sm">
                    <Alert
                      type="error"
                      showIcon
                      message="Nhận định sai:"
                      description='"Hệ thống phê duyệt tự động của chúng tôi rất chặt chẽ, nên rủi ro tiềm tàng của mảng Cho vay tiêu dùng chỉ ở mức Thấp."'
                      className="rounded-xl"
                    />
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-800">
                      <span className="font-bold text-emerald-900 block mb-1">✅ Bản chất chuẩn mực:</span>
                      <Paragraph className="text-xs mb-2">
                        Rủi ro tiềm tàng (Inherent Risk) phản ánh bản chất khách quan của nghiệp vụ khi <b>hoàn toàn không có kiểm soát</b>. Nghiệp vụ cho vay tín chấp hoặc chuyển tiền quốc tế luôn có rủi ro tiềm tàng ở mức <b>RẤT CAO</b>.
                      </Paragraph>
                      <div className="p-2 bg-white rounded border border-emerald-300 font-mono text-xs text-center font-bold text-emerald-900 mb-2">
                        Rủi ro còn lại (Residual) = Rủi ro tiềm tàng (Inherent) x (1 - Hiệu lực kiểm soát (Control Effectiveness))
                      </div>
                      <span className="text-xs block text-slate-600">
                        Kiểm soát tốt chỉ làm giảm Rủi ro còn lại, chứ không bao giờ làm giảm Rủi ro tiềm tàng. Nếu kiểm soát hỏng, rủi ro lập tức bật ngược về mức rủi ro tiềm tàng cao nhất!
                      </span>
                    </div>
                  </div>
                )
              },
              {
                key: 'p3',
                label: <span className="font-bold text-slate-800">❌ Sai Lầm 3: Coi "Hồ Sơ Rủi Ro" (Risk Profile) Là Bảng Thống Kê Vi Phạm Cũ</span>,
                children: (
                  <div className="space-y-3 text-sm">
                    <Alert
                      type="error"
                      showIcon
                      message="Nhận định sai:"
                      description='"Hồ sơ rủi ro của Chi nhánh X chỉ là danh sách các lỗi biên bản kiểm toán năm ngoái chưa sửa."'
                      className="rounded-xl"
                    />
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-800">
                      <span className="font-bold text-emerald-900 block mb-1">✅ Bản chất chuẩn mực:</span>
                      <Paragraph className="text-xs mb-0">
                        Hồ sơ rủi ro là một <b>bản đồ cấu trúc động</b> phản ánh bức tranh phơi nhiễm rủi ro toàn diện: Tín dụng, Vận hành, Thị trường, Gian lận, CNTT, Pháp chế. Trên Smart Audit, Hồ sơ rủi ro chia làm 12 domain nghiệp vụ chuẩn hóa (<code>HS01</code> đến <code>HS12</code>), hỗ trợ cập nhật và điều chỉnh qua cơ chế phê duyệt 2 cấp.
                      </Paragraph>
                    </div>
                  </div>
                )
              },
              {
                key: 'p4',
                label: <span className="font-bold text-slate-800">❌ Sai Lầm 4: Phân Loại Mức Độ Rủi Ro Chỉ Dựa Vào "Số Tiền Tổn Thất"</span>,
                children: (
                  <div className="space-y-3 text-sm">
                    <Alert
                      type="error"
                      showIcon
                      message="Nhận định sai:"
                      description='"Sai phạm này không làm mất tiền của ngân hàng (tổn thất = 0 VNĐ), nên chỉ xếp rủi ro Thấp (Low)."'
                      className="rounded-xl"
                    />
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-800">
                      <span className="font-bold text-emerald-900 block mb-1">✅ Bản chất chuẩn mực:</span>
                      <Paragraph className="text-xs mb-2">
                        Mức độ nghiêm trọng của rủi ro/phát hiện trong ngân hàng được xác định bằng <b>Ma trận 3 Chiều</b>:
                      </Paragraph>
                      <ol className="list-decimal pl-5 text-xs space-y-1 mb-2">
                        <li><b>Tổn thất tài chính trực tiếp</b>: Nguy cơ mất tiền.</li>
                        <li><b>Chế tài xử phạt của NHNN theo Nghị định 340</b>: Đình chỉ nghiệp vụ, phạt hàng trăm triệu đồng, hạ xếp hạng CAMELS.</li>
                        <li><b>Rủi ro danh tiếng & An toàn hệ thống</b>: Vi phạm an ninh mạng, rò rỉ dữ liệu khách hàng, phòng chống rửa tiền (AML).</li>
                      </ol>
                      <span className="text-xs block text-slate-700 font-semibold">
                        Do đó, một vi phạm dù tổn thất 0 VNĐ nhưng vi phạm quy định cấm của NHNN bắt buộc phải phân loại là Cao (High) hoặc Nghiêm trọng (Critical).
                      </span>
                    </div>
                  </div>
                )
              },
              {
                key: 'p5',
                label: <span className="font-bold text-slate-800">❌ Sai Lầm 5: Đánh Giá Rủi Ro Một Lần Vào Đầu Năm Là Đủ</span>,
                children: (
                  <div className="space-y-3 text-sm">
                    <Alert
                      type="error"
                      showIcon
                      message="Nhận định sai:"
                      description='"Tháng 12 đã duyệt Kế hoạch kiểm toán năm rồi, cứ thế mà đi làm theo đúng lịch cho đến hết năm."'
                      className="rounded-xl"
                    />
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-800">
                      <span className="font-bold text-emerald-900 block mb-1">✅ Bản chất chuẩn mực:</span>
                      <Paragraph className="text-xs mb-0">
                        Môi trường ngân hàng biến động liên tục. Phần mềm cài đặt tính năng <b>Giám sát liên tục (Continuous Monitoring & Dynamic Rerating)</b>. Khi chi nhánh phát sinh nợ xấu tăng đột biến hoặc giao dịch ngoài giờ bất thường, hệ thống tự động đổi màu cảnh báo và đề xuất bổ sung cuộc kiểm toán đột xuất.
                      </Paragraph>
                    </div>
                  </div>
                )
              },
              {
                key: 'p6',
                label: <span className="font-bold text-slate-800">❌ Sai Lầm 6: Nhầm Lẫn Giữa "Thực Trạng" (Condition) Và "Nguyên Nhân Gốc Rễ" (Cause) Trong Mô Hình 5C</span>,
                children: (
                  <div className="space-y-3 text-sm">
                    <Alert
                      type="error"
                      showIcon
                      message="Nhận định sai:"
                      description='Ghi nhận: "Thực trạng: Hồ sơ thiếu xác minh nguồn thu. Nguyên nhân: Do KTV tín dụng không thu thập xác minh nguồn thu."'
                      className="rounded-xl"
                    />
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-800">
                      <span className="font-bold text-emerald-900 block mb-1">✅ Bản chất chuẩn mực:</span>
                      <Paragraph className="text-xs mb-2">
                        Cách ghi trên là lặp lại thực trạng (Tautology), không phải nguyên nhân. Nguyên nhân gốc rễ (Root Cause) phải trả lời câu hỏi <i>Tại sao kẽ hở đó xảy ra?</i>:
                      </Paragraph>
                      <ul className="list-disc pl-5 text-xs space-y-1 mb-2">
                        <li>Do quy trình chưa quy định rõ mẫu xác minh? (Lỗ hổng chính sách)</li>
                        <li>Do áp lực chạy chỉ tiêu KPI giải ngân gấp? (Văn hóa rủi ro)</li>
                        <li>Do Core Banking không chặn nút giải ngân khi thiếu upload chứng từ? (Lỗ hổng kiểm soát tự động)</li>
                      </ul>
                      <span className="text-xs block text-slate-700 font-semibold">
                        Không tìm ra nguyên nhân gốc rễ thì kiến nghị chỉ dừng ở mức: "Lần sau nhớ thu thập đủ" ➔ Chắc chắn lỗi sẽ tái diễn!
                      </span>
                    </div>
                  </div>
                )
              }
            ]}
          />
        </Card>
      )}

      {/* CHAPTER 4: WORKFLOW & RACI MATRIX */}
      {activeSubTab === 'c4' && (
        <div className="space-y-6">
          <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-200">
            <Title level={4} className="!mb-1 text-slate-800">
              4.1. Quy Trình 4 Giai Đoạn Chuẩn IIA & 3 Cổng Kiểm Soát Stage-Gate
            </Title>
            <Paragraph type="secondary" className="text-sm mb-4">
              Cơ chế kiểm soát khóa chặt ngăn ngừa làm tắt giai đoạn, đảm bảo hồ sơ kiểm toán tuân thủ chuẩn mực quốc tế IIA.
            </Paragraph>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <Tag color="blue" className="font-bold mb-2">GIAI ĐOẠN 1 (IIA 2200)</Tag>
                <div className="font-bold text-sm text-slate-800 mb-1">Kế hoạch & Chuẩn bị</div>
                <div className="text-xs text-slate-600 mb-2">Quyết định, nhân sự, khảo sát, ma trận RCM và mẫu thử nghiệm.</div>
                <div className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 p-2 rounded">
                  🔒 Cổng 1: Đủ QĐ, kiểm tra COI, đồng bộ RCM mới mở Giai đoạn 2.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <Tag color="green" className="font-bold mb-2">GIAI ĐOẠN 2 (IIA 2300)</Tag>
                <div className="font-bold text-sm text-slate-800 mb-1">Thực địa & Thử nghiệm</div>
                <div className="text-xs text-slate-600 mb-2">Kanban nhiệm vụ, Giấy tờ W/P, kiểm soát 4 mắt, phát hiện 5C và biên bản MB04.</div>
                <div className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 p-2 rounded">
                  🔒 Cổng 2: 100% W/P đã duyệt (Approved), MB04 đã ký mới mở GĐ 3.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                <Tag color="purple" className="font-bold mb-2">GIAI ĐOẠN 3 (IIA 2400)</Tag>
                <div className="font-bold text-sm text-slate-800 mb-1">Báo cáo & Kết quả</div>
                <div className="text-xs text-slate-600 mb-2">Dự thảo Báo cáo KT, xếp hạng rủi ro ĐVKD, phê duyệt CAE và xuất Word/PDF.</div>
                <div className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 p-2 rounded">
                  🔒 Cổng 3: Báo cáo chính thức phê duyệt & gửi nơi nhận mới mở GĐ 4.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
                <Tag color="red" className="font-bold mb-2">GIAI ĐOẠN 4 (IIA 2500 & 1300)</Tag>
                <div className="font-bold text-sm text-slate-800 mb-1">Theo dõi & Đóng cuộc KT</div>
                <div className="text-xs text-slate-600 mb-2">Đẩy kiến nghị sang Auditee Portal, theo dõi SLA, checklist QAIP và niêm phong hồ sơ.</div>
                <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 p-2 rounded">
                  ✅ Đóng hồ sơ: Lưu trữ điện tử vĩnh viễn, AuditTrail bất biến.
                </div>
              </div>
            </div>
          </Card>

          <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-200">
            <Title level={4} className="!mb-1 text-slate-800">
              4.2. Ma Trận Phân Quyền Trách Nhiệm RACI (11 Nghiệp Vụ x 5 Vai Trò)
            </Title>
            <Paragraph type="secondary" className="text-sm mb-4">
              R (Responsible: Người làm) | A (Accountable: Người phê duyệt cuối) | C (Consulted: Người tham vấn) | I (Informed: Người nhận thông báo).
            </Paragraph>

            <Table
              size="small"
              pagination={false}
              bordered
              scroll={{ x: 800 }}
              dataSource={[
                { key: '1', task: '1. Lập Kế hoạch kiểm toán năm (Audit Plan)', ktv: 'C', lead: 'C', cae: 'R', bks: 'A', auditee: 'I' },
                { key: '2', task: '2. Cập nhật Hồ sơ rủi ro (Risk Profile)', ktv: 'R', lead: 'C', cae: 'A', bks: 'I', auditee: 'C' },
                { key: '3', task: '3. Ban hành Quyết định & Đội ngũ đoàn KT', ktv: 'I', lead: 'R', cae: 'A', bks: 'I', auditee: 'I' },
                { key: '4', task: '4. Thiết lập Ma trận RCM & Chọn mẫu', ktv: 'R', lead: 'A', cae: 'I', bks: 'I', auditee: 'I' },
                { key: '5', task: '5. Lập W/P & Đánh giá mẫu kiểm tra', ktv: 'R', lead: 'C', cae: 'I', bks: 'I', auditee: 'C' },
                { key: '6', task: '6. Soát xét 4 mắt W/P (Review / Rework)', ktv: 'C', lead: 'R / A', cae: 'I', bks: 'I', auditee: 'I' },
                { key: '7', task: '7. Ghi nhận Phát hiện 5C & Mã lỗi 3 chiều', ktv: 'R', lead: 'A', cae: 'I', bks: 'I', auditee: 'C' },
                { key: '8', task: '8. Tổng hợp & Ký Biên bản thực địa MB04', ktv: 'C', lead: 'R', cae: 'I', bks: 'I', auditee: 'A (Ký nhận)' },
                { key: '9', task: '9. Phê duyệt & Phát hành Báo cáo kiểm toán', ktv: 'C', lead: 'R', cae: 'A', bks: 'I (Báo cáo)', auditee: 'A (Tiếp nhận)' },
                { key: '10', task: '10. Cập nhật giải trình & Khắc phục Kiến nghị', ktv: 'I', lead: 'C', cae: 'I', bks: 'I', auditee: 'R' },
                { key: '11', task: '11. Đánh giá chất lượng QAIP & Đóng cuộc KT', ktv: 'I', lead: 'R', cae: 'A', bks: 'I', auditee: 'I' },
              ]}
              columns={[
                { title: 'Phân hệ / Nghiệp vụ kiểm toán', dataIndex: 'task', key: 'task', width: 260, render: t => <span className="font-semibold text-slate-800">{t}</span> },
                { title: 'Kiểm toán viên (KTV)', dataIndex: 'ktv', key: 'ktv', align: 'center', width: 120, render: val => <Tag color={val === 'R' ? 'blue' : 'default'} className="font-bold">{val}</Tag> },
                { title: 'Trưởng đoàn (Lead)', dataIndex: 'lead', key: 'lead', align: 'center', width: 120, render: val => <Tag color={val.includes('A') ? 'volcano' : 'blue'} className="font-bold">{val}</Tag> },
                { title: 'Trưởng Ban KTNB (CAE)', dataIndex: 'cae', key: 'cae', align: 'center', width: 130, render: val => <Tag color={val === 'A' ? 'gold' : val === 'R' ? 'blue' : 'default'} className="font-bold">{val}</Tag> },
                { title: 'Ban Kiểm soát / HĐQT', dataIndex: 'bks', key: 'bks', align: 'center', width: 130, render: val => <Tag color={val.includes('A') ? 'purple' : 'default'} className="font-bold">{val}</Tag> },
                { title: 'Đơn vị ĐKT (Auditee)', dataIndex: 'auditee', key: 'auditee', align: 'center', width: 130, render: val => <Tag color={val.includes('A') ? 'volcano' : val === 'R' ? 'blue' : 'default'} className="font-bold">{val}</Tag> },
              ]}
            />
          </Card>
        </div>
      )}

      {/* CHAPTER 5: STEP-BY-STEP MANUAL */}
      {activeSubTab === 'c5' && (
        <Card variant="borderless" className="shadow-sm rounded-2xl border border-slate-200">
          <div className="mb-6">
            <Title level={4} className="!mb-1 text-slate-800">
              5. Hướng Dẫn Sử Dụng Phần Mềm Theo Từng Bước (Step-by-Step Manual)
            </Title>
            <Text type="secondary" className="text-xs">
              Thực hành thao tác chuẩn hóa theo từng phân hệ trên phần mềm Smart Audit 4.0.
            </Text>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                <Space>
                  <Tag color="blue" className="font-bold text-sm px-3 py-1">GIAI ĐOẠN 1</Tag>
                  <Title level={5} className="!mb-0 text-blue-900">Lập Kế Hoạch & Chuẩn Bị (IIA Standard 2200)</Title>
                </Space>
                <Button type="primary" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate('/audit-engagements')}>
                  Đi đến Cuộc kiểm toán
                </Button>
              </div>
              <div className="space-y-2 text-sm text-slate-700 pl-2">
                <p><b>1.1. Quyết định đoàn & Nhân sự:</b> Nhập Số quyết định, ngày ban hành. Hệ thống tự động quét xung đột lợi ích (COI scan 12 tháng). Phân công các KTV mảng Tín dụng, Vận hành, CNTT.</p>
                <p><b>1.2. Ma trận RCM:</b> Bấm <code>📥 Nhập từ Thư viện RCM</code> để đồng bộ rủi ro và chốt kiểm soát vào cuộc KT. Tự động sinh các Phân hệ kiểm toán (Workstream).</p>
                <p><b>1.3. Lấy mẫu kiểm toán:</b> Thiết lập tiêu chí chọn mẫu dữ liệu Core Banking theo giá trị lớn (MUS) hoặc ngẫu nhiên.</p>
                <p><b>1.4. Chuyển giai đoạn:</b> Bấm <i>Nghiệm thu GĐ 1</i> để mở khóa chuyển sang Thực địa.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                <Space>
                  <Tag color="green" className="font-bold text-sm px-3 py-1">GIAI ĐOẠN 2</Tag>
                  <Title level={5} className="!mb-0 text-emerald-950">Thực Địa & Thử Nghiệm (IIA Standard 2300)</Title>
                </Space>
                <Space>
                  <Button size="small" onClick={() => navigate('/working-papers')}>Mở Giấy tờ W/P</Button>
                  <Button size="small" type="primary" className="bg-emerald-600 border-none" onClick={() => navigate('/audit-findings')}>Mở Phát hiện 5C</Button>
                </Space>
              </div>
              <div className="space-y-2 text-sm text-slate-700 pl-2">
                <p><b>2.1. Phân phối việc trên Kanban:</b> Xem 4 cột <i>Cần làm ➔ Đang làm ➔ Chờ duyệt ➔ Xong</i>, kéo thả và đặt deadline cho KTV.</p>
                <p><b>2.2. Lập Giấy tờ W/P:</b> KTV mở Drawer W/P, kiểm tra 100% mẫu trong Sampling Grid (đánh giá Pass/Fail), đính kèm bằng chứng kiểm toán.</p>
                <p><b>2.3. Soát xét 4 mắt:</b> KTV bấm <i>Gửi Trưởng đoàn duyệt (Submit)</i>. Trưởng đoàn chọn <b>Approve</b> (khóa vĩnh viễn) hoặc <b>Rework</b> (yêu cầu sửa có ghi chú).</p>
                <p><b>2.4. Ghi nhận Phát hiện 5C:</b> Từ dòng mẫu Fail trong W/P, bấm <i>+ Tạo Phát hiện</i>. Chọn mã lỗi LPBank, điều khoản Nghị định 340, chế tài nhân sự và cán bộ vi phạm.</p>
                <p><b>2.5. Tự động tổng hợp MB04:</b> Bấm <code>⚡ Tổng hợp tự động từ WP (Auto-Collate)</code> để tự động tập hợp tất cả phát hiện vào Biên bản kiểm toán thực địa MB04.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                <Space>
                  <Tag color="purple" className="font-bold text-sm px-3 py-1">GIAI ĐOẠN 3</Tag>
                  <Title level={5} className="!mb-0 text-purple-950">Báo Cáo & Kết Quả (IIA Standard 2400)</Title>
                </Space>
                <Button size="small" type="primary" className="bg-purple-700 border-none" onClick={() => navigate('/audit-reports')}>
                  Mở Phân hệ Báo cáo
                </Button>
              </div>
              <div className="space-y-2 text-sm text-slate-700 pl-2">
                <p><b>3.1. Dự thảo Báo cáo & Xếp hạng KSNB:</b> Hệ thống tổng hợp ma trận phát hiện, cho phép xếp hạng Đạt yêu cầu / Cần cải thiện / Không đạt cho từng mảng nghiệp vụ và toàn bộ chi nhánh.</p>
                <p><b>3.2. Xuất báo cáo đa định dạng:</b> Bấm xuất file Word (.docx) chuẩn mẫu ngân hàng kèm phụ lục, file PDF trình ký số, hoặc file Excel số liệu.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                <Space>
                  <Tag color="red" className="font-bold text-sm px-3 py-1">GIAI ĐOẠN 4</Tag>
                  <Title level={5} className="!mb-0 text-rose-950">Theo Dõi & Đóng Cuộc KT (IIA Standard 2500 & 1300)</Title>
                </Space>
                <Button size="small" type="primary" danger onClick={() => navigate('/recommendations')}>
                  Mở Theo dõi Kiến nghị
                </Button>
              </div>
              <div className="space-y-2 text-sm text-slate-700 pl-2">
                <p><b>4.1. Giám sát kiến nghị & SLA:</b> Kiến nghị tự động gửi sang Auditee Portal. Theo dõi SLA hạn chót; tự động kích hoạt cảnh báo leo thang khi quá hạn.</p>
                <p><b>4.2. Đánh giá chất lượng QAIP:</b> Xác nhận 5 tiêu chí chuẩn mực IIA 1300 & Global Standard 15.4 (Độc lập, đủ W/P duyệt, chuẩn 5C, thống nhất ĐVKD).</p>
                <p><b>4.3. Đóng workspace:</b> Niêm phong hồ sơ lưu trữ điện tử bất biến.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* CHAPTER 6: GIAS 2024 STANDARDS */}
      {activeSubTab === 'c6' && (
        <GiasStandardsView />
      )}
    </div>
  );
};
