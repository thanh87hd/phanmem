import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, Card, Tag, Button, Space, Typography, 
  Row, Col, Statistic, Modal, Form, Input, Select, message, Tooltip, Badge, Tabs, InputNumber, Segmented
} from 'antd';
import { 
  RadarChartOutlined, 
  ThunderboltOutlined, 
  CheckCircleOutlined, 
  WarningOutlined,
  SearchOutlined,
  EyeOutlined,
  SecurityScanOutlined,
  DownloadOutlined,
  SettingOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  SwapOutlined,
  PlayCircleOutlined,
  FilterOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { CreditAuditRulesTab } from './components/CreditAuditRulesTab';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import BulkImport from '../components/BulkImport';
import CmcaExecutiveDashboard from './components/CmcaExecutiveDashboard';
import CmcaAuditCaseDrawer from './components/CmcaAuditCaseDrawer';
import CamelsMetricDrilldownModal from './components/CamelsMetricDrilldownModal';
import EarningsAnalysisTab from './components/EarningsAnalysisTab';
import DebtMigrationTab from './components/DebtMigrationTab';
import KriDashboard from '../components/KriDashboard';
import KriBacktestingTab from './components/KriBacktestingTab';
import { ExperimentOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Legal reference tooltips for CAMELS headers
const LEGAL_REFS: Record<string, string> = {
  'C': 'TT 14/2025/TT-NHNN: CET1 ≥ 4.5%, Tier 1 ≥ 6.0%, CAR ≥ 8.0%. TT 41/2016: Phương pháp tính RWA.',
  'A': 'TT 11/2021/TT-NHNN: Phân loại nợ, trích lập DPRR. Luật TCTD 2024: Giới hạn cấp tín dụng.',
  'M': 'TT 52/2018/TT-NHNN: Đánh giá, xếp loại TCTD theo CAMELS.',
  'E': 'Kiểm toán Lãi dự thu: NIM tăng + Lãi dự thu/Thu nhập lãi > 20% + Nợ nhóm 2 tăng → Rủi ro Lãi ảo.',
  'L': 'TT 22/2019 & TT 26/2022: LDR ≤ 85%, Dự trữ thanh khoản ≥ 2.0%, Vốn ngắn hạn cho vay TDH ≤ 30%.',
  'S': 'Luật TCTD 2024: Giới hạn cấp TD 1 KH ≤ 15%, Nhóm KHLQ ≤ 25% Vốn tự có.',
};

const ContinuousMonitoring: React.FC = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, open: 0, high: 0, red: 0, yellow: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  
  const [kriRules, setKriRules] = useState<any[]>([]);
  const [auditRules, setAuditRules] = useState<any[]>([]);
  const [camelsMetrics, setCamelsMetrics] = useState<any[]>([]);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [ruleForm] = Form.useForm();
  
  // Data for KRI Dashboard
  const [auditUniverses, setAuditUniverses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Audit Cases
  const [auditCases, setAuditCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseDrawerOpen, setCaseDrawerOpen] = useState(false);

  // CAMELS Metric Drilldown State
  const [drilldownVisible, setDrilldownVisible] = useState(false);
  const [drilldownBranch, setDrilldownBranch] = useState('');
  const [drilldownMetric, setDrilldownMetric] = useState('');

  const handleOpenDrilldown = (branchCode: string, metricKey: string) => {
    setDrilldownBranch(branchCode);
    setDrilldownMetric(metricKey);
    setDrilldownVisible(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, statsRes, rulesRes, metricsRes, auditRulesRes, casesRes, auditUniversesRes, departmentsRes] = await Promise.allSettled([
        api.get('/continuous-monitoring/alerts'),
        api.get('/continuous-monitoring/stats'),
        api.get('/continuous-monitoring/kri-rules'),
        api.get('/continuous-monitoring/camels-metrics'),
        api.get('/continuous-monitoring/audit-rules'),
        api.get('/continuous-monitoring/audit-cases'),
        api.get('/audit-universe'),
        api.get('/departments'),
      ]);
      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value.data)) setAlerts(alertsRes.value.data);
      if (statsRes.status === 'fulfilled' && typeof statsRes.value.data === 'object' && !Array.isArray(statsRes.value.data)) setStats(statsRes.value.data);
      if (rulesRes.status === 'fulfilled' && Array.isArray(rulesRes.value.data)) setKriRules(rulesRes.value.data);
      if (metricsRes.status === 'fulfilled' && Array.isArray(metricsRes.value.data)) setCamelsMetrics(metricsRes.value.data);
      if (auditRulesRes.status === 'fulfilled' && Array.isArray(auditRulesRes.value.data)) setAuditRules(auditRulesRes.value.data);
      if (casesRes.status === 'fulfilled' && Array.isArray(casesRes.value.data)) setAuditCases(casesRes.value.data);
      if (auditUniversesRes.status === 'fulfilled' && Array.isArray(auditUniversesRes.value.data)) setAuditUniverses(auditUniversesRes.value.data);
      if (departmentsRes.status === 'fulfilled' && Array.isArray(departmentsRes.value.data)) setDepartments(departmentsRes.value.data);
    } catch (err) {
      message.error(t('continuousMonitoring.messages.loadError', 'Lỗi khi tải dữ liệu giám sát'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunScan = async () => {
    setLoading(true);
    try {
      await api.post('/continuous-monitoring/run-scan');
      message.success(t('continuousMonitoring.messages.scanSuccess', 'Đã hoàn tất quét dữ liệu. Đã phát hiện các cảnh báo mới.'));
      fetchData();
    } catch (err) {
      message.error(t('continuousMonitoring.messages.scanError', 'Lỗi khi thực hiện quét dữ liệu'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewAlert = (alert: any) => {
    setSelectedAlert(alert);
    form.setFieldsValue({
      status: alert.status,
      notes: alert.resolutionNotes
    });
    setIsModalVisible(true);
  };

  const handleUpdateStatus = async () => {
    const values = await form.validateFields();
    try {
      await api.patch(`/continuous-monitoring/alerts/${selectedAlert.id}/status`, values);
      message.success(t('continuousMonitoring.messages.updateSuccess', 'Đã cập nhật trạng thái cảnh báo'));
      setIsModalVisible(false);
      fetchData();
    } catch (err) {
      message.error(t('auditeePortal.messages.progressError', 'Lỗi khi cập nhật'));
    }
  };

  const handleEditRule = (rule: any) => {
    setSelectedRule(rule);
    ruleForm.setFieldsValue({
      redThreshold: rule.redThreshold,
      yellowThreshold: rule.yellowThreshold
    });
    setRuleModalVisible(true);
  };

  const handleUpdateRule = async () => {
    try {
      const values = await ruleForm.validateFields();
      await api.patch(`/continuous-monitoring/kri-rules/${selectedRule.id}`, values);
      message.success(t('continuousMonitoring.messages.updateRuleSuccess', 'Đã cập nhật cấu hình tham số thành công'));
      setRuleModalVisible(false);
      fetchData();
    } catch (err) {
      message.error(t('continuousMonitoring.messages.updateRuleError', 'Lỗi khi cập nhật cấu hình'));
    }
  };

  // Alert columns with severity
  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      key: 'severity',
      width: 90,
      render: (sev: string) => {
        const colors: Record<string, string> = { RED: 'red', YELLOW: 'warning', GREEN: 'success' };
        const labels: Record<string, string> = { RED: '🔴 Đỏ', YELLOW: '🟡 Vàng', GREEN: '🟢 Xanh' };
        return <Tag color={colors[sev] || 'default'}>{labels[sev] || sev}</Tag>;
      }
    },
    {
      title: 'Cảnh báo',
      key: 'title',
      render: (_: any, record: any) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.title}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.category}</Text>
        </Space>
      ),
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unitName',
      key: 'unitName',
      width: 160,
    },
    {
      title: 'SLA',
      dataIndex: 'slaDeadline',
      key: 'slaDeadline',
      width: 120,
      render: (v: string) => {
        if (!v) return '-';
        const deadline = dayjs(v);
        const hoursLeft = deadline.diff(dayjs(), 'hour');
        if (hoursLeft < 0) return <Tag color="red" icon={<ExclamationCircleOutlined />}>Quá hạn</Tag>;
        if (hoursLeft < 8) return <Tag color="warning" icon={<ClockCircleOutlined />}>{hoursLeft}h</Tag>;
        return <Tag color="green" icon={<ClockCircleOutlined />}>{hoursLeft}h</Tag>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        let color = 'default';
        if (status === 'Open') color = 'processing';
        if (status === 'UnderInvestigation') color = 'warning';
        if (status === 'Resolved') color = 'success';
        if (status === 'FalsePositive') color = 'default';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewAlert(record)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  // Filter alerts
  const filteredAlerts = alerts
    .filter((item: any) => filterRecursive(item, searchText))
    .filter((a: any) => severityFilter === 'ALL' || a.severity === severityFilter);

  const handleExportExcel = () => {
    exportToExcel(filteredAlerts, columns, 'Canh_bao_CMCA');
  };

  const evaluateCell = (value: number, ruleCode: string) => {
    const rule = kriRules.find(r => r.ruleCode === ruleCode);
    if (!rule) return { color: 'default', text: value };
    
    const evaluate = (val: number, op: string, thres: number) => {
      switch(op) {
        case '<': return val < thres;
        case '<=': return val <= thres;
        case '>': return val > thres;
        case '>=': return val >= thres;
        case '==': return val === thres;
        default: return false;
      }
    };

    if (evaluate(value, rule.operator, rule.redThreshold)) {
      return { color: '#cf1322', bgColor: '#fff1f0', text: value, status: 'red' };
    }
    if (evaluate(value, rule.operator, rule.yellowThreshold)) {
      return { color: '#d46b08', bgColor: '#fff7e6', text: value, status: 'yellow' };
    }
    return { color: '#389e0d', bgColor: '#f6ffed', text: value, status: 'green' };
  };

  const renderMetricCell = (val: number, ruleCode: string, metricKey: string, record: any) => {
    const ev = evaluateCell(val, ruleCode);
    return (
      <Tooltip title={`Click để xem báo cáo giải trình biến động (Rule: ${ruleCode})`}>
        <div 
          onClick={() => handleOpenDrilldown(record?.branchCode || 'Chi nhánh Hà Nội', metricKey)}
          style={{ 
            backgroundColor: ev.bgColor, 
            color: ev.color, 
            padding: '4px 8px', 
            borderRadius: '4px', 
            textAlign: 'center', 
            fontWeight: 'bold',
            cursor: 'pointer',
            border: '1px solid transparent',
            transition: 'all 0.2s',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = ev.color;
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {val}%
        </div>
      </Tooltip>
    );
  };

  // CAMELS columns with legal reference tooltips
  const makePillarTitle = (label: string, pillarKey: string) => (
    <Tooltip title={LEGAL_REFS[pillarKey]} placement="bottom">
      <span style={{ cursor: 'help' }}>{label} <span style={{ fontSize: 10, color: '#8c8c8c' }}>ⓘ</span></span>
    </Tooltip>
  );

  const camelsCols = [
    { 
      title: 'Chi nhánh / Đơn vị', 
      dataIndex: 'branchCode', 
      key: 'branchCode', 
      fixed: 'left' as const, 
      width: 160,
      ...getColumnSearchProps<any>('branchCode', 'Chi nhánh / Đơn vị'),
      sorter: getColumnSorter<any>('branchCode', 'string'),
    },
    {
      title: makePillarTitle('C - Vốn (Capital)', 'C'),
      children: [
        { title: 'CAR (%)', dataIndex: 'carRatio', key: 'carRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_CAP_01', 'carRatio', r) },
        { title: 'CET1 (%)', dataIndex: 'cet1Ratio', key: 'cet1Ratio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_CAP_02', 'cet1Ratio', r) },
        { title: 'Tier1 (%)', dataIndex: 'tier1Ratio', key: 'tier1Ratio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_CAP_03', 'tier1Ratio', r) },
        { title: 'Vốn/TTS (%)', dataIndex: 'equityToAssetsRatio', key: 'equityToAssetsRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_CAP_04', 'equityToAssetsRatio', r) },
        { title: 'Leverage (%)', dataIndex: 'leverageRatio', key: 'leverageRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_CAP_05', 'leverageRatio', r) },
        { title: 'RWA vs Vốn (%)', dataIndex: 'rwaGrowthRatio', key: 'rwaGrowthRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_CAP_06', 'rwaGrowthRatio', r) },
      ]
    },
    {
      title: makePillarTitle('A - Chất lượng TS (Asset Quality)', 'A'),
      children: [
        { title: 'NPL (%)', dataIndex: 'nplRatio', key: 'nplRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_AQ_01', 'nplRatio', r) },
        { title: 'Nợ G2 (%)', dataIndex: 'group2Ratio', key: 'group2Ratio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_AQ_02', 'group2Ratio', r) },
        { title: 'LLR (%)', dataIndex: 'llrRatio', key: 'llrRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_AQ_03', 'llrRatio', r) },
        { title: 'CoC (%)', dataIndex: 'costOfCreditRatio', key: 'costOfCreditRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_AQ_04', 'costOfCreditRatio', r) },
        { title: 'CV/TS (%)', dataIndex: 'loanToAssetsRatio', key: 'loanToAssetsRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_AQ_05', 'loanToAssetsRatio', r) },
        { title: 'TD Growth (%)', dataIndex: 'creditGrowthRatio', key: 'creditGrowthRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_AQ_06', 'creditGrowthRatio', r) },
      ]
    },
    {
      title: makePillarTitle('M - Quản trị (Management)', 'M'),
      children: [
        { title: 'CAMELS', dataIndex: 'camelsRating', key: 'camelsRating', render: (v: string) => <Tag color={v === 'A' ? 'green' : v === 'B' ? 'blue' : v === 'C' ? 'warning' : 'error'}>{v || 'N/A'}</Tag> },
        { title: 'Quá hạn KN', dataIndex: 'remediationOverdueDays', key: 'remediationOverdueDays', render: (v: number) => <Tag color={v > 0 ? 'red' : 'green'}>{v || 0} ngày</Tag> },
        { title: 'AML (%)', dataIndex: 'amlFraudAlertGrowth', key: 'amlFraudAlertGrowth', render: (v: number, r: any) => renderMetricCell(v, 'RULE_MGT_03', 'amlFraudAlertGrowth', r) },
      ]
    },
    {
      title: makePillarTitle('E - Kết quả KD (Earnings)', 'E'),
      children: [
        { title: 'ROA (%)', dataIndex: 'roaRatio', key: 'roaRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_EARN_01', 'roaRatio', r) },
        { title: 'ROE (%)', dataIndex: 'roeRatio', key: 'roeRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_EARN_02', 'roeRatio', r) },
        { title: 'NIM (%)', dataIndex: 'nimRatio', key: 'nimRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_EARN_03', 'nimRatio', r) },
        { title: 'CIR (%)', dataIndex: 'cirRatio', key: 'cirRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_EARN_04', 'cirRatio', r) },
        { title: 'Lãi dự thu (%)', dataIndex: 'accruedInterestRatio', key: 'accruedInterestRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_EARN_05', 'accruedInterestRatio', r) },
      ]
    },
    {
      title: makePillarTitle('L - Thanh khoản (Liquidity)', 'L'),
      children: [
        { title: 'LDR (%)', dataIndex: 'ldrRatio', key: 'ldrRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_LIQ_01', 'ldrRatio', r) },
        { title: 'TK 30d (%)', dataIndex: 'liquidity30DaysRatio', key: 'liquidity30DaysRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_LIQ_02', 'liquidity30DaysRatio', r) },
        { title: 'Dự trữ TK (%)', dataIndex: 'liquidityReserveRatio', key: 'liquidityReserveRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_LIQ_03', 'liquidityReserveRatio', r) },
        { title: 'NH vay TDH (%)', dataIndex: 'shortTermToMidLongTermRatio', key: 'shortTermToMidLongTermRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_LIQ_04', 'shortTermToMidLongTermRatio', r) },
        { title: 'CASA (%)', dataIndex: 'casaRatio', key: 'casaRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_LIQ_05', 'casaRatio', r) },
        { title: 'Gap TG-TD (%)', dataIndex: 'creditDepositGap', key: 'creditDepositGap', render: (v: number, r: any) => renderMetricCell(v, 'RULE_LIQ_06', 'creditDepositGap', r) },
      ]
    },
    {
      title: makePillarTitle('S - Độ nhạy (Sensitivity)', 'S'),
      children: [
        { title: 'BĐS (%)', dataIndex: 'bdsExposureRatio', key: 'bdsExposureRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_SENS_01', 'bdsExposureRatio', r) },
        { title: 'TPDN (%)', dataIndex: 'tpdnBdsRatio', key: 'tpdnBdsRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_SENS_02', 'tpdnBdsRatio', r) },
        { title: '1KH/Vốn (%)', dataIndex: 'singleBorrowerCapitalRatio', key: 'singleBorrowerCapitalRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_SENS_03', 'singleBorrowerCapitalRatio', r) },
        { title: 'NOP (%)', dataIndex: 'nopRatio', key: 'nopRatio', render: (v: number, r: any) => renderMetricCell(v, 'RULE_SENS_04', 'nopRatio', r) },
      ]
    }
  ];

  const ruleColumns = [
    { 
      title: 'Mã luật', 
      dataIndex: 'ruleCode', 
      key: 'ruleCode',
      ...getColumnSearchProps<any>('ruleCode', 'Mã luật'),
      sorter: getColumnSorter<any>('ruleCode', 'string'),
    },
    { 
      title: 'Nhóm KRI', 
      dataIndex: 'category', 
      key: 'category',
      ...getColumnSearchProps<any>('category', 'Nhóm KRI'),
      sorter: getColumnSorter<any>('category', 'string'),
    },
    { 
      title: 'Tên chỉ số', 
      dataIndex: 'metricName', 
      key: 'metricName',
      ...getColumnSearchProps<any>('metricName', 'Tên chỉ số'),
      sorter: getColumnSorter<any>('metricName', 'string'),
    },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    { title: 'Toán tử', dataIndex: 'operator', key: 'operator', render: (val: string) => <Tag color="blue">{val}</Tag> },
    { 
      title: 'Ngưỡng Vàng', 
      dataIndex: 'yellowThreshold', 
      key: 'yellowThreshold', 
      render: (val: number, record: any) => <Tag color="warning">{record.yellowThresholdDisplay || val}</Tag> 
    },
    { 
      title: 'Ngưỡng Đỏ', 
      dataIndex: 'redThreshold', 
      key: 'redThreshold', 
      render: (val: number, record: any) => <Tag color="red">{record.redThresholdDisplay || val}</Tag> 
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" onClick={() => handleEditRule(record)}>{t('common.btnEditThreshold', 'Sửa ngưỡng')}</Button>
      )
    }
  ];

  // Audit Cases columns
  const auditCaseCols = [
    { 
      title: 'Mã Case', 
      dataIndex: 'caseId', 
      key: 'caseId', 
      width: 180,
      ...getColumnSearchProps<any>('caseId', 'Mã Case'),
      sorter: getColumnSorter<any>('caseId', 'string'),
    },
    { 
      title: 'Chi nhánh', 
      dataIndex: 'branchCode', 
      key: 'branchCode', 
      width: 150,
      ...getColumnSearchProps<any>('branchCode', 'Chi nhánh'),
      sorter: getColumnSorter<any>('branchCode', 'string'),
    },
    { title: 'Cảnh báo gốc', key: 'alertTitle', render: (_: any, r: any) => <Text ellipsis style={{ maxWidth: 300 }}>{r.alert?.title || '-'}</Text> },
    { 
      title: 'Trạng thái', 
      dataIndex: 'explanationStatus', 
      key: 'explanationStatus', 
      width: 130, 
      ...getColumnSelectFilterProps<any>('explanationStatus', [
        { text: 'Chờ giải trình', value: 'PENDING_EXPLANATION' },
        { text: 'Đã giải trình', value: 'EXPLAINED' },
        { text: 'Chấp nhận', value: 'APPROVED' },
        { text: 'Từ chối', value: 'REJECTED' },
      ]),
      render: (v: string) => {
        const colors: Record<string, string> = { PENDING_EXPLANATION: 'warning', EXPLAINED: 'processing', APPROVED: 'success', REJECTED: 'error' };
        const labels: Record<string, string> = { PENDING_EXPLANATION: 'Chờ giải trình', EXPLAINED: 'Đã giải trình', APPROVED: 'Chấp nhận', REJECTED: 'Từ chối' };
        return <Tag color={colors[v] || 'default'}>{labels[v] || v}</Tag>;
      }
    },
    { title: 'SLA', dataIndex: 'slaDeadline', key: 'slaDeadline', width: 110, render: (v: string) => {
      if (!v) return '-';
      const hoursLeft = dayjs(v).diff(dayjs(), 'hour');
      if (hoursLeft < 0) return <Tag color="red">Quá hạn</Tag>;
      if (hoursLeft < 8) return <Tag color="warning">{hoursLeft}h</Tag>;
      return <Tag color="green">{hoursLeft}h</Tag>;
    }},
    { title: 'Thao tác', key: 'action', width: 100, render: (_: any, r: any) => (
      <Button type="link" icon={<EyeOutlined />} onClick={() => { setSelectedCase(r); setCaseDrawerOpen(true); }}>Xem</Button>
    )},
  ];

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1">
            <RadarChartOutlined /> {t('continuousMonitoring.title', 'Giám sát & Kiểm toán Liên tục (CMCA)')}
          </Title>
          <Text type="secondary">{t('continuousMonitoring.subtitle', 'Hệ thống cảnh báo sớm rủi ro theo mô hình CAMELS — Basel II/III')}</Text>
        </div>
        <Space>
          <Input.Search
            placeholder={t('continuousMonitoring.searchPlaceholder', 'Tìm cảnh báo...')}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel} disabled={filteredAlerts.length === 0}>
            {t('personnel.export', 'Tải Excel')}
          </Button>
          <BulkImport 
            module="transactions" 
            fileName="GiaoDich" 
            onSuccess={fetchData} 
            templateData={[{ 'Mã giao dịch': 'TXN001', 'Mã tài khoản': 'ACC123', 'Tên khách hàng': 'Nguyen Van A', 'Tên nhà cung cấp': 'Công ty XYZ', 'Số tiền': '1500000', 'Ngày': '2026-07-29', 'IP': '192.168.1.1', 'Mô tả': 'Thanh toán' }]} 
          />
          <Button 
            type="primary" 
            icon={<SecurityScanOutlined />} 
            onClick={handleRunScan}
            loading={loading}
            className="bg-blue-600"
          >
            {t('continuousMonitoring.btnRunScan', 'Quét dữ liệu ngay')}
          </Button>
        </Space>
      </div>

      <Tabs 
        defaultActiveKey="executive_dashboard" 
        items={[
          {
            key: 'executive_dashboard',
            label: <span><DashboardOutlined /> Tổng quan Lãnh đạo</span>,
            children: <CmcaExecutiveDashboard onOpenMetricDrilldown={handleOpenDrilldown} />
          },
          {
            key: 'camels_metrics',
            label: <span><RadarChartOutlined /> Ma trận CAMELS KRI</span>,
            children: (
              <Card variant="borderless" className="shadow-sm" title="Ma trận Chỉ số Sức khỏe Tài chính (CAMELS) theo Đơn vị — Click vào từng chỉ số để xem báo cáo giải trình chi tiết">
                <Table 
                  columns={camelsCols} 
                  dataSource={camelsMetrics} 
                  rowKey="id" 
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                  scroll={{ x: 'max-content' }}
                />
              </Card>
            )
          },
          {
            key: 'earnings_analysis',
            label: <span><DollarOutlined /> Đánh giá Lợi nhuận</span>,
            children: <EarningsAnalysisTab onOpenMetricDrilldown={handleOpenDrilldown} />
          },
          {
            key: 'debt_migration',
            label: <span><SwapOutlined /> Dịch chuyển Nhóm Nợ</span>,
            children: <DebtMigrationTab onOpenMetricDrilldown={handleOpenDrilldown} />
          },
          {
            key: 'alerts_cases',
            label: (
              <span>
                <ThunderboltOutlined /> Cảnh báo & Hồ sơ KT
                {stats.red > 0 && <Badge count={stats.red} style={{ marginLeft: 6, backgroundColor: '#ff4d4f' }} />}
              </span>
            ),
            children: (
              <>
                <Row gutter={16} className="mb-4">
                  <Col span={6}>
                    <Card variant="borderless" className="shadow-sm" size="small">
                      <Statistic title="Tổng cảnh báo" value={stats.total} prefix={<ThunderboltOutlined className="text-blue-500" />} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card variant="borderless" className="shadow-sm" size="small">
                      <Statistic title="Mức Đỏ (Vi phạm)" value={stats.red} valueStyle={{ color: '#cf1322' }} prefix={<ExclamationCircleOutlined />} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card variant="borderless" className="shadow-sm" size="small">
                      <Statistic title="Mức Vàng (Cảnh báo)" value={stats.yellow} valueStyle={{ color: '#d46b08' }} prefix={<WarningOutlined />} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card variant="borderless" className="shadow-sm" size="small">
                      <Statistic title="Hồ sơ KT đang mở" value={auditCases.filter(c => c.explanationStatus === 'PENDING_EXPLANATION').length} valueStyle={{ color: '#722ed1' }} prefix={<SafetyCertificateOutlined />} />
                    </Card>
                  </Col>
                </Row>

                <Card 
                  variant="borderless" 
                  className="shadow-sm mb-4" 
                  title={
                    <div className="flex items-center justify-between">
                      <span><SearchOutlined /> Danh sách Cảnh báo</span>
                      <Segmented
                        options={[
                          { label: 'Tất cả', value: 'ALL' },
                          { label: '🔴 Đỏ', value: 'RED' },
                          { label: '🟡 Vàng', value: 'YELLOW' },
                        ]}
                        value={severityFilter}
                        onChange={(v) => setSeverityFilter(v as string)}
                        size="small"
                      />
                    </div>
                  }
                >
                  <Table 
                    columns={columns} 
                    dataSource={filteredAlerts} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>

                <Card variant="borderless" className="shadow-sm" title={<><SafetyCertificateOutlined /> Hồ sơ Kiểm toán (Audit Cases) — Tự động tạo từ cảnh báo Đỏ</>}>
                  <Table
                    columns={auditCaseCols}
                    dataSource={auditCases}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              </>
            )
          },
          {
            key: 'audit_rules_library',
            label: <span><DatabaseOutlined /> Thư viện Rule Kiểm toán Liên tục</span>,
            children: (
              <CreditAuditRulesTab 
                rules={auditRules} 
                loading={loading} 
                onRefresh={fetchData} 
              />
            )
          },
          {
            key: 'settings',
            label: <span><SettingOutlined /> Cấu hình Tham số (CAMELS)</span>,
            children: (
              <Card variant="borderless" className="shadow-sm" title="Quản lý Ngưỡng cảnh báo KRI">
                <Table 
                  columns={ruleColumns} 
                  dataSource={kriRules} 
                  rowKey="id" 
                  loading={loading}
                  pagination={{ pageSize: 30 }}
                />
              </Card>
            )
          },
          {
            key: 'kri-dashboard',
            label: <span><BarChartOutlined /> Quản lý Dữ liệu KRI (Upload & Báo cáo)</span>,
            children: (
              <KriDashboard 
                auditUniverses={auditUniverses} 
                departments={departments} 
              />
            )
          },
          {
            key: 'kri-backtesting',
            label: <span><ExperimentOutlined /> Kiểm thử ngược (Backtesting & ROC)</span>,
            children: (
              <KriBacktestingTab kriRules={kriRules} />
            )
          }
        ]}
      />

      {/* Alert Detail Modal */}
      <Modal
        title={t('continuousMonitoring.modalTitle', 'Chi tiết Cảnh báo Giám sát')}
        open={isModalVisible}
        onOk={handleUpdateStatus}
        onCancel={() => setIsModalVisible(false)}
        width={700}
        okText={t('continuousMonitoring.modalUpdateBtn', 'Cập nhật trạng thái')}
      >
        {selectedAlert && (
          <div className="mt-4">
            <div className="bg-gray-50 p-4 rounded mb-6">
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Tiêu đề:</Text>
                  <Paragraph strong>{selectedAlert.title}</Paragraph>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Phân loại:</Text>
                  <div><Tag color="blue">{selectedAlert.category}</Tag></div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Mức độ:</Text>
                  <div>
                    <Tag color={selectedAlert.severity === 'RED' ? 'red' : selectedAlert.severity === 'YELLOW' ? 'warning' : 'success'}>
                      {selectedAlert.severity}
                    </Tag>
                  </div>
                </Col>
              </Row>
              <Text type="secondary">Mô tả chi tiết:</Text>
              <Paragraph>{selectedAlert.description}</Paragraph>
              
              <Text type="secondary">Dữ liệu liên quan:</Text>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                {JSON.stringify(selectedAlert.relatedData, null, 2)}
              </pre>
            </div>

            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="status" label="Trạng thái xử lý">
                    <Select>
                      <Option value="Open">Chưa xử lý (Open)</Option>
                      <Option value="UnderInvestigation">Đang điều tra</Option>
                      <Option value="Resolved">Đã giải quyết</Option>
                      <Option value="FalsePositive">Cảnh báo giả (False Positive)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="notes" label="Ghi chú điều tra / Kết quả xử lý">
                <TextArea rows={4} placeholder="Nhập kết quả rà soát, nguyên nhân và biện pháp xử lý..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* KRI Rule Edit Modal */}
      <Modal
        title="Cấu hình tham số cảnh báo"
        open={ruleModalVisible}
        onOk={handleUpdateRule}
        onCancel={() => setRuleModalVisible(false)}
        okText={t('common.btnSaveChanges', 'Lưu thay đổi')}
      >
        {selectedRule && (
          <Form form={ruleForm} layout="vertical" className="mt-4">
            <div className="mb-4">
              <Text strong>{selectedRule.metricName}</Text>: <Text type="secondary">{selectedRule.description}</Text>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="yellowThreshold" label="Ngưỡng Vàng (Cảnh báo)" rules={[{ required: true, message: 'Vui lòng nhập ngưỡng vàng' }]}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="redThreshold" label="Ngưỡng Đỏ (Vi phạm)" rules={[{ required: true, message: 'Vui lòng nhập ngưỡng đỏ' }]}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>

      {/* Audit Case Drawer */}
      <CmcaAuditCaseDrawer
        auditCase={selectedCase}
        open={caseDrawerOpen}
        onClose={() => setCaseDrawerOpen(false)}
        onUpdated={fetchData}
      />

      {/* CAMELS Metric Drilldown & Mini-Report Modal */}
      <CamelsMetricDrilldownModal
        visible={drilldownVisible}
        onClose={() => setDrilldownVisible(false)}
        branchCode={drilldownBranch}
        metricKey={drilldownMetric}
      />
    </div>
  );
};

export default ContinuousMonitoring;
