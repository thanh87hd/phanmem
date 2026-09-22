import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Statistic, Typography, Tag, Progress, 
  Select, DatePicker, Button, Space, Divider, Alert, Spin, Tooltip, Badge, Dropdown, message 
} from 'antd';
import {
  ProjectOutlined, WarningOutlined, DollarOutlined, 
  SafetyCertificateOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, RightOutlined, SyncOutlined,
  FileSearchOutlined, TeamOutlined, BankOutlined, AuditOutlined,
  CalendarOutlined, SearchOutlined, DownloadOutlined, FileExcelOutlined,
  PrinterOutlined, DownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import DashboardDrilldownModal, { type DrilldownType } from './DashboardDrilldownModal';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export const ExecutiveGroupedDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q3');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs('2026-07-01'),
    dayjs('2026-09-30')
  ]);

  // Modal drilldown state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<DrilldownType>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any>(null);
  const [modalExtra, setModalExtra] = useState<any>(null);

  // Hàm tính toán khung ngày chuẩn theo Năm và Quý
  const calculateDateRange = (yearStr: string, quarterStr: string): [dayjs.Dayjs, dayjs.Dayjs] => {
    const y = parseInt(yearStr, 10) || new Date().getFullYear();
    if (quarterStr === 'Q1') return [dayjs(`${y}-01-01`), dayjs(`${y}-03-31`)];
    if (quarterStr === 'Q2') return [dayjs(`${y}-04-01`), dayjs(`${y}-06-30`)];
    if (quarterStr === 'Q3') return [dayjs(`${y}-07-01`), dayjs(`${y}-09-30`)];
    if (quarterStr === 'Q4') return [dayjs(`${y}-10-01`), dayjs(`${y}-12-31`)];
    // 'ALL' -> Cả năm
    return [dayjs(`${y}-01-01`), dayjs(`${y}-12-31`)];
  };

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    const newDates = calculateDateRange(newYear, selectedQuarter);
    setDateRange(newDates);
  };

  const handleQuarterChange = (newQuarter: string) => {
    setSelectedQuarter(newQuarter);
    const newDates = calculateDateRange(selectedYear, newQuarter);
    setDateRange(newDates);
  };

  const handleCustomDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
      // Cập nhật lại năm hiển thị theo mốc ngày bắt đầu
      const startYear = dates[0].year().toString();
      setSelectedYear(startYear);
    }
  };

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedQuarter) params.append('quarter', selectedQuarter);
      if (dateRange[0]) params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange[1]) params.append('endDate', dateRange[1].format('YYYY-MM-DD'));

      const res = await api.get(`/dashboard/executive-grouped-overview?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Executive Grouped Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tự động tải lại dữ liệu khi bất kỳ bộ lọc nào thay đổi (Năm, Quý hoặc Khung ngày)
  useEffect(() => {
    fetchOverviewData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedQuarter, dateRange]);

  const handleOpenDrilldown = (type: DrilldownType, title: string, drillData: any, extraMeta?: any) => {
    setModalType(type);
    setModalTitle(title);
    setModalData(drillData);
    setModalExtra(extraMeta);
    setModalVisible(true);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    if (!data) {
      message.warning(t('executiveDashboard.noDataToExport', 'Chưa có dữ liệu báo cáo để xuất!'));
      return;
    }
    message.loading({ content: t('executiveDashboard.exporting', 'Đang kết xuất Báo cáo Điều hành Excel...'), key: 'exporting' });

    // Tổng hợp dữ liệu các chủ đề thành bảng Excel báo cáo
    const summaryRows: any[] = [
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme1_title', '1. Kế hoạch & Tiến độ Jobs'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: t('executiveDashboard.totalPlans', 'Tổng số Kế hoạch Năm'), [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme1_jobs?.totalPlans || 0} ` + t('executiveDashboard.engagements', 'Cuộc'), [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.totalPlansDesc', 'Kế hoạch kiểm toán năm được duyệt') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme1_title', '1. Kế hoạch & Tiến độ Jobs'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: t('executiveDashboard.stage1', 'GĐ 1: Chuẩn bị & Đánh giá RR'), [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme1_jobs?.stages?.planning?.count || 0} ` + t('executiveDashboard.teams', 'Đoàn'), [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.stage1Desc', 'Đang thu thập hồ sơ và khảo sát') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme1_title', '1. Kế hoạch & Tiến độ Jobs'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: t('executiveDashboard.stage2', 'GĐ 2: Đang kiểm toán thực địa'), [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme1_jobs?.stages?.fieldwork?.count || 0} ` + t('executiveDashboard.teams', 'Đoàn'), [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.stage2Desc', 'Đang kiểm toán tại hiện trường') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme1_title', '1. Kế hoạch & Tiến độ Jobs'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: t('executiveDashboard.stage3', 'GĐ 3: Chốt văn bản / Dự thảo'), [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme1_jobs?.stages?.reporting?.count || 0} ` + t('executiveDashboard.teams', 'Đoàn'), [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.stage3Desc', 'Dự thảo và bảo vệ báo cáo') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme2_title', '2. Phát hiện Kiểm toán'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: '🔴 Rủi ro Cao (RRC)', [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme2_findings?.rrc?.count || 0} (${data.theme2_findings?.rrc?.percentage || 0}%)`, [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.highRiskDesc', 'Phát hiện nghiêm trọng cần xử lý ngay') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme2_title', '2. Phát hiện Kiểm toán'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: '🟡 Rủi ro Trung bình (RRTB)', [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme2_findings?.rrtb?.count || 0} (${data.theme2_findings?.rrtb?.percentage || 0}%)`, [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.mediumRiskDesc', 'Sai sót quy trình kiểm soát') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme2_title', '2. Phát hiện Kiểm toán'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: '🟢 Rủi ro Thấp (RRT)', [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme2_findings?.rrt?.count || 0} (${data.theme2_findings?.rrt?.percentage || 0}%)`, [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.lowRiskDesc', 'Lỗi tác nghiệp nhỏ') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: '3. Vi phạm Hành chính (NĐ 340)', [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: t('executiveDashboard.totalCases', 'Tổng số vụ việc vi phạm'), [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme3_legalCompliance?.totalCases || 0} ` + t('executiveDashboard.cases', 'Vụ'), [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.totalCasesDesc', 'Vi phạm quy định hành chính') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: '3. Vi phạm Hành chính (NĐ 340)', [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: t('executiveDashboard.estimatedFine', 'Khung tiền phạt ước tính'), [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${(data.theme3_legalCompliance?.estimatedFineAmount || 0).toLocaleString()} ` + t('executiveDashboard.vnd', 'VNĐ'), [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.estimatedFineDesc', 'Ước tính mức phạt tiềm ẩn') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme4_title', '4. Theo dõi Khắc phục'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: t('executiveDashboard.totalRecs', 'Tổng số kiến nghị'), [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme4_remediation?.total?.count || 0}`, [t('executiveDashboard.note', 'Ghi chú')]: `RRC: ${data.theme4_remediation?.total?.breakdown?.rrc || 0}, RRTB: ${data.theme4_remediation?.total?.breakdown?.rrtb || 0}, RRT: ${data.theme4_remediation?.total?.breakdown?.rrt || 0}` },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme4_title', '4. Theo dõi Khắc phục'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: '✅ Đã hoàn thành (Đã đóng)', [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme4_remediation?.closed?.count || 0} (${data.theme4_remediation?.closed?.rate || 0}%)`, [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.closedRecsDesc', 'Đã hoàn tất chỉnh sửa') },
      { [t('executiveDashboard.themeBlock', 'Khối Chủ đề')]: t('executiveDashboard.theme4_title', '4. Theo dõi Khắc phục'), [t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục')]: t('executiveDashboard.overdueRecs', '⏰ Quá hạn khắc phục'), [t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ')]: `${data.theme4_remediation?.overdue?.count || 0} (${data.theme4_remediation?.overdue?.rate || 0}%)`, [t('executiveDashboard.note', 'Ghi chú')]: t('executiveDashboard.overdueRecsDesc', 'Cần đôn đốc xử lý gấp') },
    ];

    const columns = [
      { title: t('executiveDashboard.themeBlock', 'Khối Chủ đề'), dataIndex: t('executiveDashboard.themeBlock', 'Khối Chủ đề') },
      { title: t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục'), dataIndex: t('executiveDashboard.indicator', 'Chỉ tiêu / Hạng mục') },
      { title: t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ'), dataIndex: t('executiveDashboard.quantityRate', 'Số lượng / Tỷ lệ') },
      { title: t('executiveDashboard.note', 'Ghi chú'), dataIndex: t('executiveDashboard.note', 'Ghi chú') },
    ];

    try {
      await exportToExcel(summaryRows, columns, `Bao_Cao_Dieu_Hanh_KTNB_${selectedYear}_${dayjs().format('YYYYMMDD')}`);
      message.success({ content: t('executiveDashboard.exportSuccess', 'Xuất file Báo cáo Excel thành công!'), key: 'exporting' });
    } catch {
      message.error({ content: t('executiveDashboard.exportError', 'Lỗi khi xuất file Excel'), key: 'exporting' });
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#8c8c8c' }}>{t('executiveDashboard.loading', t('executiveDashboard.loading', 'Đang tổng hợp số liệu điều hành lãnh đạo...'))}</div>
      </div>
    );
  }

  const { theme1_jobs, theme2_findings, theme3_legalCompliance, theme4_remediation, theme5_smartRisk } = data || {};

  return (
    <div className="executive-grouped-dashboard" style={{ paddingBottom: 24 }}>
      {/* ========================================================================= */}
      {/* 📅 TOP BAR: BỘ LỌC ĐIỀU HÀNH & NGÀY CHỐT SỐ LIỆU */}
      {/* ========================================================================= */}
      <Card 
        size="small" 
        style={{ 
          marginBottom: 16, 
          borderRadius: 8, 
          background: 'linear-gradient(135deg, #fcfaf7 0%, #ffffff 100%)',
          border: '1px solid #f1e5d8'
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space wrap size="middle">
              <Space>
                <CalendarOutlined style={{ color: '#ea9105', fontSize: 16 }} />
                <Text strong>{t('executiveDashboard.filterTitle', 'Bộ lọc điều hành:')}</Text>
              </Space>

              <Select 
                value={selectedYear} 
                onChange={handleYearChange} 
                style={{ width: 120 }}
              >
                <Option value="2026">{t('executiveDashboard.year', 'Năm {{year}}', { year: '2026' })}</Option>
                <Option value="2025">{t('executiveDashboard.year', 'Năm {{year}}', { year: '2025' })}</Option>
                <Option value="2024">{t('executiveDashboard.year', 'Năm {{year}}', { year: '2024' })}</Option>
              </Select>

              <Select 
                value={selectedQuarter} 
                onChange={handleQuarterChange} 
                style={{ width: 110 }}
              >
                <Option value="ALL">{t('executiveDashboard.allYear', 'Cả năm')}</Option>
                <Option value="Q1">{t('executiveDashboard.quarter1', 'Quý 1')}</Option>
                <Option value="Q2">{t('executiveDashboard.quarter2', 'Quý 2')}</Option>
                <Option value="Q3">{t('executiveDashboard.quarter3', 'Quý 3')}</Option>
                <Option value="Q4">{t('executiveDashboard.quarter4', 'Quý 4')}</Option>
              </Select>

              <RangePicker 
                value={dateRange}
                onChange={handleCustomDateRangeChange}
                format="DD/MM/YYYY"
                style={{ width: 240 }}
              />

              <Button icon={<SyncOutlined />} onClick={fetchOverviewData} loading={loading}>
                {t('executiveDashboard.refresh', 'Làm mới')}
              </Button>

              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'excel',
                      icon: <FileExcelOutlined style={{ color: '#52c41a' }} />,
                      label: t('executiveDashboard.exportExcel', 'Xuất Báo cáo Tổng hợp (Excel)'),
                      onClick: handleExportExcel,
                    },
                    {
                      key: 'pdf',
                      icon: <PrinterOutlined style={{ color: '#ea9105' }} />,
                      label: t('executiveDashboard.exportPdf', 'In / Xuất Báo cáo Điều hành (PDF)'),
                      onClick: handlePrintPdf,
                    },
                  ],
                }}
              >
                <Button type="primary" icon={<DownloadOutlined />} style={{ background: '#389e0d', borderColor: '#389e0d' }}>
                  {t('executiveDashboard.exportDropdown', 'Xuất Báo cáo Điều hành (PDF/Excel)')} <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </Col>

          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <Tag color="geekblue" style={{ fontSize: 12, padding: '4px 10px' }}>
              🕒 <strong>{t('executiveDashboard.reportDate', 'Ngày chốt số liệu báo cáo:')}</strong> {dayjs().format('DD/MM/YYYY')}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* ========================================================================= */}
      {/* 1️⃣ CHỦ ĐỀ 1: KẾ HOẠCH & TIẾN ĐỘ CÁC CUỘC KIỂM TOÁN (JOBS) */}
      {/* ========================================================================= */}
      <Card 
        title={
          <Space>
            <ProjectOutlined style={{ color: '#ea9105' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t('executiveDashboard.theme1Title', '1. Kế hoạch Kiểm toán & Tiến độ các Cuộc Kiểm toán (Jobs)')}</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
      >
        <Row gutter={[16, 16]}>
          {/* Cột 1: Thống kê Kế hoạch tổng quát */}
          <Col xs={24} md={6}>
            <Card 
              size="small" 
              hoverable
              style={{ background: '#f6ffed', border: '1px solid #b7eb8f', height: '100%' }}
              onClick={() => handleOpenDrilldown(
                'JOBS_LIST', 
                `${t('executiveDashboard.planYearTitle', 'Kế hoạch KT Năm: {{year}}', { year: selectedYear })} (${theme1_jobs?.totalPlans ?? 0})`,
                theme1_jobs?.allEngagements || [
                  ...(theme1_jobs?.stages?.planning?.list || theme1_jobs?.stages?.planning?.jobs || []),
                  ...(theme1_jobs?.stages?.fieldwork?.list || theme1_jobs?.stages?.fieldwork?.jobs || []),
                  ...(theme1_jobs?.stages?.reporting?.list || theme1_jobs?.stages?.reporting?.jobs || []),
                ],
                { desc: 'Toàn bộ danh sách các đoàn/cuộc kiểm toán đã và đang triển khai trong kế hoạch.' }
              )}
            >
              <Statistic 
                title={<span style={{ color: '#389e0d', fontWeight: 600 }}>{t('executiveDashboard.planYearTitle', 'Kế hoạch KT Năm: {{year}}', { year: selectedYear })}</span>}
                value={theme1_jobs?.totalPlans ?? 0}
                suffix="Cuộc"
                valueStyle={{ color: '#389e0d', fontWeight: 700, fontSize: 28 }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#595959' }}>
                • {t('executiveDashboard.completedEngagements', 'Đã hoàn thành:')} <strong>{theme1_jobs?.stages?.completed?.count || 0}</strong> cuộc<br />
                • {t('executiveDashboard.runningEngagements', 'Đang triển khai:')} <strong>{(theme1_jobs?.stages?.planning?.count || 0) + (theme1_jobs?.stages?.fieldwork?.count || 0) + (theme1_jobs?.stages?.reporting?.count || 0)}</strong> cuộc
              </div>
              <div style={{ marginTop: 8, color: '#ea9105', fontSize: 12, fontWeight: 600 }}>
                {t('executiveDashboard.clickToViewAllEngagements', '🔍 Click xem chi tiết tất cả đoàn')}
              </div>
            </Card>
          </Col>

          {/* Cột 2: Tiến độ chi tiết theo 3 Giai đoạn thực thi */}
          <Col xs={24} md={18}>
            <Row gutter={[12, 12]}>
              {/* Giai đoạn 1 */}
              <Col xs={24} sm={8}>
                <Card 
                  size="small" 
                  hoverable
                  style={{ borderLeft: '4px solid #fa8c16', height: '100%' }}
                  onClick={() => handleOpenDrilldown(
                    'JOBS_LIST',
                    'Đoàn đang ở GĐ 1: Thu thập hồ sơ & Đánh giá rủi ro',
                    theme1_jobs?.stages?.planning?.list || theme1_jobs?.stages?.planning?.jobs || [],
                    { desc: 'Danh sách các đoàn kiểm toán đang chuẩn bị hồ sơ và xây dựng chương trình kiểm toán chi tiết.' }
                  )}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ color: '#fa8c16' }}>{t('executiveDashboard.stage1Title', 'GĐ 1: Thu thập hồ sơ / Đánh giá RR')}</Text>
                    <Badge count={theme1_jobs?.stages?.planning?.count || 0} style={{ backgroundColor: '#fa8c16' }} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Statistic 
                      value={theme1_jobs?.stages?.planning?.count || 0} 
                      suffix="Đoàn" 
                      valueStyle={{ fontSize: 22, fontWeight: 700 }}
                    />
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{t('executiveDashboard.stage1Desc', 'Click xem danh sách đoàn GĐ 1')}</Text>
                </Card>
              </Col>

              {/* Giai đoạn 2 */}
              <Col xs={24} sm={8}>
                <Card 
                  size="small" 
                  hoverable
                  style={{ borderLeft: '4px solid #ea9105', height: '100%' }}
                  onClick={() => handleOpenDrilldown(
                    'JOBS_LIST',
                    'Đoàn đang ở GĐ 2: Đang kiểm toán thực địa',
                    theme1_jobs?.stages?.fieldwork?.list || theme1_jobs?.stages?.fieldwork?.jobs || [],
                    { desc: 'Danh sách các đoàn kiểm toán đang trực tiếp làm việc tại đơn vị cơ sở.' }
                  )}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ color: '#ea9105' }}>{t('executiveDashboard.stage2Title', 'GĐ 2: Đang thực địa')}</Text>
                    <Badge count={theme1_jobs?.stages?.fieldwork?.count || 0} style={{ backgroundColor: '#ea9105' }} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Statistic 
                      value={theme1_jobs?.stages?.fieldwork?.count || 0} 
                      suffix="Đoàn" 
                      valueStyle={{ fontSize: 22, fontWeight: 700, color: '#ea9105' }}
                    />
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{t('executiveDashboard.stage2Desc', 'Click xem danh sách đoàn thực địa')}</Text>
                </Card>
              </Col>

              {/* Giai đoạn 3 */}
              <Col xs={24} sm={8}>
                <Card 
                  size="small" 
                  hoverable
                  style={{ borderLeft: '4px solid #722ed1', height: '100%' }}
                  onClick={() => handleOpenDrilldown(
                    'JOBS_LIST',
                    'Đoàn đang ở GĐ 3: Kết thúc thực địa & Chốt văn bản/Dự thảo',
                    theme1_jobs?.stages?.reporting?.list || theme1_jobs?.stages?.reporting?.jobs || [],
                    { desc: 'Danh sách các đoàn đã hoàn thành thực địa, đang dự thảo và bảo vệ báo cáo kiểm toán.' }
                  )}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ color: '#722ed1' }}>{t('executiveDashboard.stage3Title', t('executiveDashboard.stage3', 'GĐ 3: Chốt văn bản / Dự thảo'))}</Text>
                    <Badge count={theme1_jobs?.stages?.reporting?.count || 0} style={{ backgroundColor: '#722ed1' }} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Statistic 
                      value={theme1_jobs?.stages?.reporting?.count || 0} 
                      suffix="Đoàn" 
                      valueStyle={{ fontSize: 22, fontWeight: 700, color: '#722ed1' }}
                    />
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{t('executiveDashboard.stage3Desc', 'Click xem chi tiết đoàn GĐ 3')}</Text>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* ========================================================================= */}
      {/* 2️⃣ CHỦ ĐỀ 2: TỔNG HỢP PHÁT HIỆN KIỂM TOÁN (FINDINGS) */}
      {/* ========================================================================= */}
      <Card 
        title={
          <Space>
            <WarningOutlined style={{ color: '#fa8c16' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t('executiveDashboard.theme2Title', '2. Tổng hợp Phát hiện Kiểm toán (Findings)')}</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
      >
        <Row gutter={[16, 16]} align="middle">
          {/* Card RRC */}
          <Col xs={24} md={8}>
            <Card 
              size="small" 
              hoverable
              style={{ background: '#fff1f0', border: '1px solid #ffccc7' }}
              onClick={() => handleOpenDrilldown(
                'FINDINGS_LIST',
                `${t('executiveDashboard.highRiskTitle', '🔴 Rủi ro Cao (RRC)')} — ${theme2_findings?.rrc?.count || 0}`,
                theme2_findings?.rrc?.list || [],
                { desc: 'Các phát hiện kiểm toán có mức độ rủi ro nghiêm trọng và cao cần xử lý khẩn cấp.' }
              )}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ color: '#cf1322', fontSize: 14 }}>{t('executiveDashboard.highRiskTitle', '🔴 Rủi ro Cao (RRC)')}</Text>
                <Tag color="red">{theme2_findings?.rrc?.percentage || 0}%</Tag>
              </div>
              <Statistic 
                value={theme2_findings?.rrc?.count || 0}
                suffix={t('executiveDashboard.findingsCount', 'Phát hiện')}
                valueStyle={{ color: '#cf1322', fontWeight: 700, fontSize: 26, margin: '6px 0' }}
              />
              <div style={{ fontSize: 12, color: '#8c8c8c', borderTop: '1px dashed #ffccc7', paddingTop: 6 }}>
                <strong>{t('executiveDashboard.includedJobs', 'Gồm RRC của các Jobs:')}</strong>
                <div style={{ marginTop: 2, color: '#595959' }}>
                  {(theme2_findings?.rrc?.byJobs || []).slice(0, 2).map((jb: any) => (
                    <div key={jb.jobName} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      • {jb.jobName}: <strong style={{ color: '#cf1322' }}>{jb.count}</strong>
                    </div>
                  ))}
                  {(!theme2_findings?.rrc?.byJobs || theme2_findings?.rrc?.byJobs.length === 0) && (
                    <span>• Không có phát hiện RRC trong kỳ</span>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 6, color: '#cf1322', fontSize: 11, fontWeight: 600 }}>
                {t('executiveDashboard.clickToViewHighRisk', '🔍 Click xem chi tiết từng phát hiện RRC')}
              </div>
            </Card>
          </Col>

          {/* Card RRTB */}
          <Col xs={24} md={8}>
            <Card 
              size="small" 
              hoverable
              style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}
              onClick={() => handleOpenDrilldown(
                'FINDINGS_LIST',
                `${t('executiveDashboard.medRiskTitle', '🟡 Rủi ro Trung bình (RRTB)')} — ${theme2_findings?.rrtb?.count || 0}`,
                theme2_findings?.rrtb?.list || [],
                { desc: 'Các phát hiện rủi ro mức độ trung bình trong quy trình vận hành và tuân thủ.' }
              )}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ color: '#d48806', fontSize: 14 }}>{t('executiveDashboard.medRiskTitle', '🟡 Rủi ro Trung bình (RRTB)')}</Text>
                <Tag color="warning">{theme2_findings?.rrtb?.percentage || 0}%</Tag>
              </div>
              <Statistic 
                value={theme2_findings?.rrtb?.count || 0}
                suffix={t('executiveDashboard.findingsCount', 'Phát hiện')}
                valueStyle={{ color: '#d48806', fontWeight: 700, fontSize: 26, margin: '6px 0' }}
              />
              <div style={{ fontSize: 12, color: '#8c8c8c', borderTop: '1px dashed #ffe58f', paddingTop: 6 }}>
                Phát hiện sai sót quy trình, chậm trễ hồ sơ, cảnh báo tuân thủ kiểm soát nội bộ.
              </div>
              <div style={{ marginTop: 6, color: '#d48806', fontSize: 11, fontWeight: 600 }}>
                {t('executiveDashboard.clickToViewMedRisk', '🔍 Click xem chi tiết phát hiện RRTB')}
              </div>
            </Card>
          </Col>

          {/* Card RRT */}
          <Col xs={24} md={8}>
            <Card 
              size="small" 
              hoverable
              style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}
              onClick={() => handleOpenDrilldown(
                'FINDINGS_LIST',
                `${t('executiveDashboard.lowRiskTitle', '🟢 Rủi ro Thấp (RRT)')} — ${theme2_findings?.rrt?.count || 0}`,
                theme2_findings?.rrt?.list || [],
                { desc: 'Các lỗi tác nghiệp nhỏ không gây tổn thất tài chính trực tiếp.' }
              )}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ color: '#389e0d', fontSize: 14 }}>{t('executiveDashboard.lowRiskTitle', '🟢 Rủi ro Thấp (RRT)')}</Text>
                <Tag color="success">{theme2_findings?.rrt?.percentage || 0}%</Tag>
              </div>
              <Statistic 
                value={theme2_findings?.rrt?.count || 0}
                suffix={t('executiveDashboard.findingsCount', 'Phát hiện')}
                valueStyle={{ color: '#389e0d', fontWeight: 700, fontSize: 26, margin: '6px 0' }}
              />
              <div style={{ fontSize: 12, color: '#8c8c8c', borderTop: '1px dashed #b7eb8f', paddingTop: 6 }}>
                Các vi phạm định dạng văn bản, lưu trữ chứng từ, cần chấn chỉnh rút kinh nghiệm.
              </div>
              <div style={{ marginTop: 6, color: '#389e0d', fontSize: 11, fontWeight: 600 }}>
                {t('executiveDashboard.clickToViewLowRisk', '🔍 Click xem chi tiết phát hiện RRT')}
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ========================================================================= */}
      {/* 3️⃣ & 4️⃣ CHỦ ĐỀ 3: VI PHẠM HÀNH CHÍNH & CHỦ ĐỀ 4: THEO DÕI KHẮC PHỤC */}
      {/* ========================================================================= */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Chủ đề 3: Vi phạm hành chính & NĐ 340 */}
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <DollarOutlined style={{ color: '#cf1322' }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>{t('executiveDashboard.theme3Title', '3. Vi phạm Hành chính (NĐ 340 / NĐ 88)')}</span>
              </Space>
            }
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
            extra={
              <Button 
                type="link" 
                size="small"
                onClick={() => handleOpenDrilldown(
                  'LEGAL_VIOLATIONS',
                  'Chi tiết Vi phạm Quy định Hành chính & Khung Tiền phạt (Nghị định 340 / NĐ 88)',
                  theme3_legalCompliance?.mainViolations || []
                )}
              >
                {t('executiveDashboard.viewViolations', 'Xem chi tiết vi phạm')}
              </Button>
            }
          >
            <div style={{ padding: '8px 12px', background: '#fff1f0', borderRadius: 6, marginBottom: 12, border: '1px solid #ffa39e' }}>
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic 
                    title={t('executiveDashboard.totalCases', 'Số vụ việc vi phạm')} 
                    value={theme3_legalCompliance?.totalCases || 0} 
                    suffix="vụ" 
                    valueStyle={{ color: '#cf1322', fontWeight: 700, fontSize: 20 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title={t('executiveDashboard.fineAmount', t('executiveDashboard.estimatedFine', 'Khung tiền phạt ước tính'))} 
                    value={(theme3_legalCompliance?.estimatedFineAmount || 0).toLocaleString()} 
                    suffix="VNĐ" 
                    valueStyle={{ color: '#cf1322', fontWeight: 700, fontSize: 20 }}
                  />
                </Col>
              </Row>
            </div>

            <div style={{ fontSize: 13 }}>
              {(theme3_legalCompliance?.mainViolations || []).map((v: any) => (
                <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                  <div>
                    <Tag color="magenta">{v.law}</Tag>
                    <Text>{v.name}</Text>
                  </div>
                  <Text strong style={{ color: '#cf1322' }}>{v.cases} vụ</Text>
                </div>
              ))}
              {(!theme3_legalCompliance?.mainViolations || theme3_legalCompliance?.mainViolations.length === 0) && (
                <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '12px 0' }}>
                  Không ghi nhận vụ vi phạm xử phạt hành chính trong kỳ
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Chủ đề 4: Theo dõi Khắc phục kiến nghị */}
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>{t('executiveDashboard.theme4Title', '4. Theo dõi Khắc phục Kiến nghị')}</span>
              </Space>
            }
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
          >
            <Row gutter={[12, 12]}>
              {/* Thẻ 1: Tổng số */}
              <Col span={8}>
                <Card 
                  size="small" 
                  style={{ textAlign: 'center', background: '#fafafa', borderColor: '#d9d9d9' }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('executiveDashboard.totalRecs', 'Tổng kiến nghị')}</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ea9105', margin: '4px 0' }}>
                    {theme4_remediation?.total?.count || 0}
                  </div>
                  <Tag color="gold" style={{ fontSize: 10 }}>
                    {theme4_remediation?.total?.breakdown?.rrc || 0} RRC / {theme4_remediation?.total?.breakdown?.rrtb || 0} TB / {theme4_remediation?.total?.breakdown?.rrt || 0} T
                  </Tag>
                </Card>
              </Col>

              {/* Thẻ 2: Đã đóng */}
              <Col span={8}>
                <Card 
                  size="small" 
                  style={{ textAlign: 'center', background: '#f6ffed', borderColor: '#b7eb8f' }}
                >
                  <Text type="secondary" style={{ fontSize: 12, color: '#389e0d' }}>{t('executiveDashboard.closedRecs', '✅ Đã đóng ({{rate}}%)', { rate: theme4_remediation?.closed?.rate || 0 })}</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a', margin: '4px 0' }}>
                    {theme4_remediation?.closed?.count || 0}
                  </div>
                  <Tag color="green" style={{ fontSize: 10 }}>
                    {theme4_remediation?.closed?.breakdown?.rrc || 0} RRC / {theme4_remediation?.closed?.breakdown?.rrtb || 0} TB / {theme4_remediation?.closed?.breakdown?.rrt || 0} T
                  </Tag>
                </Card>
              </Col>

              {/* Thẻ 3: Quá hạn */}
              <Col span={8}>
                <Card 
                  size="small" 
                  style={{ textAlign: 'center', background: '#fff1f0', borderColor: '#ffa39e', cursor: 'pointer' }}
                  onClick={() => handleOpenDrilldown(
                    'REMEDIATION_LIST',
                    `Danh sách Kiến nghị Quá hạn Khắc phục — ${theme4_remediation?.overdue?.count || 0}`,
                    theme4_remediation?.overdue?.list || [],
                    { desc: 'Danh sách các đơn vị và kiến nghị đang bị chậm trễ thực hiện theo cam kết.' }
                  )}
                >
                  <Text type="secondary" style={{ fontSize: 12, color: '#cf1322' }}>{t('executiveDashboard.overdueRecs', '⏰ Quá hạn ({{rate}}%)', { rate: theme4_remediation?.overdue?.rate || 0 })}</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#cf1322', margin: '4px 0' }}>
                    {theme4_remediation?.overdue?.count || 0}
                  </div>
                  <Tag color="red" style={{ fontSize: 10 }}>
                    {theme4_remediation?.overdue?.breakdown?.rrc || 0} RRC / {theme4_remediation?.overdue?.breakdown?.rrtb || 0} TB / {theme4_remediation?.overdue?.breakdown?.rrt || 0} T
                  </Tag>
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>{t('executiveDashboard.overallProgress', 'Tiến độ khắc phục tổng thể')}</span>
                <strong>{theme4_remediation?.closed?.rate || 0}%</strong>
              </div>
              <Progress percent={theme4_remediation?.closed?.rate || 0} strokeColor="#52c41a" />
            </div>
          </Card>
        </Col>
      </Row>

      {/* ========================================================================= */}
      {/* 5️⃣ CHỦ ĐỀ 5: GIÁM SÁT RỦI RO THÔNG MINH & CẢNH BÁO SỚM (CMCA / CAMELS) */}
      {/* ========================================================================= */}
      <Card 
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#722ed1' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t('executiveDashboard.theme5Title', '5. Giám sát Rủi ro Thông minh & Cảnh báo Sớm (CMCA / CAMELS)')}</span>
          </Space>
        }
        size="small"
        style={{ borderRadius: 8 }}
      >
        <Row gutter={[16, 16]}>
          {(theme5_smartRisk?.camelsPillars || []).map((cp: any) => (
            <Col xs={12} sm={6} key={cp.pillar}>
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center', 
                  borderTop: `3px solid ${cp.status === 'Warning' ? '#faad14' : '#52c41a'}`,
                  background: cp.status === 'Warning' ? '#fffbe6' : '#fafafa'
                }}
              >
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  <strong>{cp.pillar}</strong> — {cp.name}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: cp.status === 'Warning' ? '#d48806' : '#389e0d', margin: '4px 0' }}>
                  {cp.value}
                </div>
                <Tag color={cp.status === 'Warning' ? 'warning' : 'success'}>
                  {cp.note}
                </Tag>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Modal xem chi tiết Drilldown */}
      <DashboardDrilldownModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        type={modalType}
        title={modalTitle}
        data={modalData}
        extraMeta={modalExtra}
      />
    </div>
  );
};

export default ExecutiveGroupedDashboard;
