/**
 * KriDashboard.tsx
 * Toàn bộ giao diện module KRI (Key Risk Indicators):
 *  - Tab 1: Upload Bulk nhiều file — mỗi file có metadata riêng (tháng/năm/đơn vị)
 *  - Tab 2: Phân tích KRI từ file theo đối tượng Audit Universe
 *  - Tab 3: Báo cáo KRI theo thời kỳ (động từ DB, nhóm theo kriCode)
 *  - Tab 4: So sánh KRI giữa 2 kỳ (phát hiện thay đổi tiêu chí)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tabs, Table, Button, Space, Typography, Card, Tag, Select, InputNumber,
  Alert, Upload, Row, Col, message, Spin, Tooltip, Badge, Divider, Modal,
  DatePicker, Progress, Empty
} from 'antd';
import {
  CloudUploadOutlined, InboxOutlined, FileExcelOutlined, CalendarOutlined,
  FolderOpenOutlined, SwapOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, BarChartOutlined,
  SyncOutlined, DeleteOutlined, InfoCircleOutlined, SettingOutlined
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../services/api';
import { useDashboardConfig } from '../utils/useDashboardConfig';
import DashboardCustomizer from '../components/DashboardCustomizer';
import { SmartWidgetRenderer } from '../components/dashboard-widgets/WidgetRenderer';
import type { AuditUniverse, Department } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const SEV_COLOR: Record<string, string> = {
  Critical: 'red', High: 'orange', Medium: 'gold', Low: 'green',
};

const getSevLabel = (t: unknown): Record<string, string> => ({
  Critical: t('riskAssessment.kriDashboard.stats.critical', 'Nguy hiểm'), High: 'Cao', Medium: t('auditPlan.tabs2.filterRisk.medium', 'Trung bình'), Low: t('auditPlan.tabs2.filterRisk.low', 'Thấp'),
});





const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));
const DEFAULT_YEARS = [2024, 2025, 2026, 2027].map(y => ({ value: y, label: String(y) }));

// ──────────────────────────────────────────────────────────────────────
// Sub-component: Upload mỗi file gắn metadata riêng
// ──────────────────────────────────────────────────────────────────────
export function MultiMetadataUpload({ auditUniverses, departments, onUploaded }: { auditUniverses: any[], departments: any[], onUploaded?: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [fileRows, setFileRows] = useState<any[]>([]);

  const { t } = useTranslation();

  const handleFilesAdded = (newFiles: File[]) => {
    const added = newFiles.map(f => ({
      uid: `${f.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file: f,
      reportMonth: new Date().getMonth() + 1,
      reportYear: new Date().getFullYear(),
      auditUniverseId: undefined,
      departmentCode: '',
      status: 'pending',
    }));
    setFileRows(prev => [...prev, ...added]);
  };

  const updateRow = (uid: string, field: string, value: unknown) => {
    setFileRows(prev => prev.map(r => {
      if (r.uid !== uid) return r;
      const updated = { ...r, [field]: value };
      // Auto-fill segment when universe selected
      if (field === 'auditUniverseId') {
        const au = auditUniverses.find((u: unknown) => u.id === value);
        if (au?.departmentCode) updated.departmentCode = au.departmentCode;
      }

      return updated;
    }));
  };

  const removeRow = (uid: string) => setFileRows(prev => prev.filter(r => r.uid !== uid));

  const handleUpload = async () => {
    if (fileRows.length === 0) { message.warning('Chưa có file nào được chọn'); return; }
    const missing = fileRows.filter(r => !r.reportMonth || !r.reportYear);
    if (missing.length > 0) { message.warning('Vui lòng chọn Tháng/Năm cho tất cả các file'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      const metadataArray: unknown[] = [];
      fileRows.forEach(r => {
        formData.append('files', r.file, r.file.name);
        metadataArray.push({
          fileName: r.file.name,
          reportMonth: r.reportMonth,
          reportYear: r.reportYear,
          auditUniverseId: r.auditUniverseId || undefined,
          departmentCode: r.departmentCode || undefined,
        });
      });
      formData.append('filesMetadata', JSON.stringify(metadataArray));

      const resp = await api.post('/continuous-monitoring/kri/upload-per-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = resp.data;
      // Mark each row with result
      setFileRows(prev => prev.map(r => {
        const found = result.files?.find((f: unknown) => f.fileName === r.file.name);
        return { ...r, status: found?.status || 'success', alertsCreated: found?.alertsCreated, errorMessage: found?.errorMessage };
      }));
      message.success(`Tải lên thành công ${result.totalFiles} file — tổng ${result.totalAlertsCreated} chỉ số KRI`);
      onUploaded();
    } catch (err: unknown) {
      message.error(err.response?.data?.message || 'Lỗi khi tải lên');
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      title: 'File',
      key: 'file',
      width: 200,
      render: (_: unknown, r: unknown) => (
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{r.file.name}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{(r.file.size / 1024).toFixed(1)} KB</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Tháng báo cáo',
      key: 'month',
      width: 130,
      render: (_: unknown, r: unknown) => (
        <Select size="small" value={r.reportMonth} onChange={v => updateRow(r.uid, 'reportMonth', v)} style={{ width: '100%' }}>
          {MONTHS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
        </Select>
      ),
    },
    {
      title: 'Năm',
      key: 'year',
      width: 90,
      render: (_: unknown, r: unknown) => (
        <InputNumber size="small" min={2020} max={2030} value={r.reportYear}
          onChange={v => updateRow(r.uid, 'reportYear', v)} style={{ width: '100%' }} />
      ),
    },
    {
      title: 'Đơn vị Audit Universe',
      key: 'universe',
      width: 220,
      render: (_: unknown, r: unknown) => (
        <Select size="small" showSearch optionFilterProp="label" optionLabelProp="label" allowClear
          value={r.auditUniverseId} onChange={v => updateRow(r.uid, 'auditUniverseId', v)}
          style={{ width: '100%' }} placeholder="Chọn đơn vị...">
          {auditUniverses.map((u: unknown) => (
            <Option key={u.id} value={u.id} label={u.name}>
              <div style={{ fontSize: 11 }}>{u.name}</div>
            </Option>
          ))}
        </Select>
      ),
    },

    {
      title: 'Kết quả',
      key: 'result',
      width: 110,
      render: (_: unknown, r: unknown) => {
        if (r.status === 'pending') return <Tag color="default">Chờ upload</Tag>;
        if (r.status === 'success') return <Tag color="green" icon={<CheckCircleOutlined />}>{r.alertsCreated} chỉ số</Tag>;
        if (r.status === 'error') return <Tooltip title={r.errorMessage}><Tag color="red" icon={<CloseCircleOutlined />}>Lỗi</Tag></Tooltip>;
      },
    },
    {
      title: '',
      key: 'del',
      width: 40,
      render: (_: unknown, r: unknown) => (
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeRow(r.uid)} />
      ),
    },
  ];

  return (
    <div>
      <Alert
        message="Upload nhiều file KRI — mỗi file gắn tháng/năm/đơn vị riêng"
        description="Kéo thả hoặc chọn nhiều file Excel/CSV KRI. Sau khi thêm, chỉnh Tháng, Năm, Đơn vị cho từng file trước khi tải lên. Hệ thống đọc toàn bộ cột từ file thực tế, không dùng tiêu chí cố định."
        type="info" showIcon style={{ marginBottom: 16 }}
      />

      <Upload.Dragger
        multiple accept=".xlsx,.xls,.csv"
        showUploadList={false}
        beforeUpload={(file) => { handleFilesAdded([file as any as File]); return false; }}
        style={{ marginBottom: 16 }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#ea9105', fontSize: 40 }} /></p>
        <p style={{ fontWeight: 600 }}>Kéo thả nhiều file KRI vào đây hoặc bấm để chọn</p>
        <p style={{ color: '#888', fontSize: 12 }}>Hỗ trợ .xlsx, .xls, .csv — Tối đa 30 file một lượt</p>
      </Upload.Dragger>

      {fileRows.length > 0 && (
        <>
          <Table
            dataSource={fileRows}
            columns={columns}
            rowKey="uid"
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">{fileRows.length} file — {fileRows.filter(r => r.status === 'success').length} thành công</Text>
            <Space>
              <Button onClick={() => setFileRows([])}>{t('common.btnDeleteAll', 'Xóa tất cả')}</Button>
              <Button type="primary" loading={uploading} icon={<CloudUploadOutlined />}
                style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
                onClick={handleUpload}>
                Tải lên & Lưu tất cả ({fileRows.filter(r => r.status === 'pending').length} file)
              </Button>
            </Space>
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-component: Báo cáo KRI theo thời kỳ
// ──────────────────────────────────────────────────────────────────────
export function KriReportPeriod({
  auditUniverses,
  years,
}: {
  auditUniverses: AuditUniverse[];
  years: unknown[];
}) {
  const { t } = useTranslation();
  const SEV_LABEL = getSevLabel(t);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [fromMonth, setFromMonth] = useState<number>(1);
  const [toMonth, setToMonth] = useState<number>(12);
  const [universeId, setUniverseId] = useState<number | undefined>();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { year, fromMonth, toMonth };
      if (universeId) params.auditUniverseId = universeId;

      const resp = await api.get('/continuous-monitoring/kri/report', { params });
      setReport(resp.data);
    } catch {
      message.error('Không thể tải báo cáo KRI');
    } finally {
      setLoading(false);
    }
  }, [year, fromMonth, toMonth, universeId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchReport(); }, [fetchReport]);

  const months: string[] = report?.months || [];

  // Build table columns dynamically from months
  const dynamicCols: unknown[] = [
    {
      title: t('riskAssessment.kriDashboard.manual.cols.kriCode', 'Mã KRI'),
      dataIndex: 'kriCode',
      key: 'kriCode',
      width: 120,
      fixed: 'left',
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      fixed: 'left',
      ellipsis: true,
    },
    {
      title: t('kriDashboard.indexName', 'Tên chỉ số'),
      dataIndex: 'kriName',
      key: 'kriName',
      width: 220,
      fixed: 'left',
      ellipsis: true,
    },
    {
      title: 'Nguồn dữ liệu',
      dataIndex: 'dataSource',
      key: 'dataSource',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'departmentName',
      key: 'dept',
      width: 140,
      ellipsis: true,
    },
    ...months.map((m: string) => ({
      title: m,
      key: m,
      width: 120,
      render: (_: unknown, row: unknown) => {
        const cell = row.months?.[m];
        if (!cell) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
        return (
          <div style={{ textAlign: 'center' }}>
            <Tag color={SEV_COLOR[cell.severity] || 'default'} style={{ fontSize: 10, marginBottom: 2 }}>
              {SEV_LABEL[cell.severity] || cell.severity}
            </Tag>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{cell.currentValue}</div>
            <div style={{ fontSize: 10, color: '#888' }}>Mức: {cell.thresholdValue}</div>
          </div>
        );
      },
    })),
    {
      title: 'Tổng vi phạm',
      key: 'total',
      width: 90,
      fixed: 'right',
      render: (_: unknown, row: unknown) => {
        const bad = (row.criticalCount || 0) + (row.highCount || 0);
        return <Badge count={bad} showZero color={bad > 0 ? '#ff4d4f' : '#52c41a'} />;
      },
    },
  ];

  return (
    <div>
      {/* Bộ lọc */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={12} align="middle">
          <Col>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>Năm:</Text>
            <Select value={year} onChange={setYear} style={{ width: 80, marginLeft: 6 }}>
              {years.map((y: unknown) => <Option key={y.value} value={y.value}>{y.label}</Option>)}
            </Select>
          </Col>
          <Col>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>Từ T:</Text>
            <Select value={fromMonth} onChange={setFromMonth} style={{ width: 90, marginLeft: 6 }}>
              {MONTHS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
            </Select>
          </Col>
          <Col>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>Đến T:</Text>
            <Select value={toMonth} onChange={setToMonth} style={{ width: 90, marginLeft: 6 }}>
              {MONTHS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
            </Select>
          </Col>
          <Col>
            <Select allowClear showSearch optionFilterProp="label" value={universeId}
              onChange={setUniverseId} style={{ width: 220 }} placeholder="Lọc đơn vị AU...">
              {auditUniverses.map((u: unknown) => (
                <Option key={u.id} value={u.id} label={u.name}>{u.name}</Option>
              ))}
            </Select>
          </Col>

          <Col>
            <Button type="primary" icon={<SyncOutlined />} loading={loading} onClick={fetchReport}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}>
              Tải báo cáo
            </Button>
          </Col>
        </Row>
      </Card>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}

      {!loading && report && (
        <>
          {/* Thống kê tổng */}
          {report.totalAlerts === 0 ? (
            <Empty description={
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Chưa có dữ liệu KRI cho kỳ này</div>
                <div style={{ fontSize: 12, color: '#888' }}>Hãy upload file KRI ở tab "Upload Bulk" hoặc "Phân tích thủ công"</div>
              </div>
            } style={{ margin: '40px 0' }} />
          ) : (
            <>
              <Row gutter={12} style={{ marginBottom: 16 }}>
                {[
                  { label: 'Tổng KRI', val: report.totalAlerts, color: '#d97706' },
                  { label: t('riskAssessment.kriDashboard.stats.critical', 'Nguy hiểm'), val: report.criticalCount, color: '#ff4d4f' },
                  { label: 'Cao', val: report.highCount, color: '#fa8c16' },
                  { label: t('auditPlan.tabs2.filterRisk.medium', 'Trung bình'), val: report.mediumCount, color: '#fadb14' },
                  { label: t('auditPlan.tabs2.filterRisk.low', 'Thấp'), val: report.lowCount, color: '#52c41a' },
                ].map(s => (
                  <Col key={s.label} span={4}>
                    <Card size="small" variant="borderless" style={{ borderTop: `3px solid ${s.color}`, borderRadius: 8 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
                      <Text style={{ fontSize: 11 }}>{s.label}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Biểu đồ xu hướng theo tháng */}
              {report.byMonth?.length > 0 && (
                <Card size="small" title="📈 Xu hướng KRI theo tháng" style={{ marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={report.byMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RTooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="criticalCount" name={t('riskAssessment.kriDashboard.stats.critical', 'Nguy hiểm')} fill="#ff4d4f" stackId="a" />
                      <Bar dataKey="highCount" name="Cao" fill="#fa8c16" stackId="a" />
                      <Bar dataKey="mediumCount" name={t('auditPlan.tabs2.filterRisk.medium', 'Trung bình')} fill="#fadb14" stackId="a" />
                      <Bar dataKey="lowCount" name={t('auditPlan.tabs2.filterRisk.low', 'Thấp')} fill="#52c41a" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Bảng chỉ số KRI theo tháng (pivot table) */}
              <Card size="small" title={`📋 Chi tiết chỉ số KRI — ${months.length} kỳ báo cáo`}>
                <Table
                  dataSource={report.byKriCode || []}
                  columns={dynamicCols}
                  rowKey="kriCode"
                  size="small"
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 20, showTotal: t => `${t} chỉ số KRI` }}
                  rowClassName={(row: unknown) =>
                    (row.criticalCount > 0 || row.highCount > 0) ? 'ant-table-row-error' : ''
                  }
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-component: So sánh KRI giữa 2 kỳ
// ──────────────────────────────────────────────────────────────────────
function CompareTab({ auditUniverses, years }: { auditUniverses: AuditUniverse[]; years: unknown[] }) {
  const { t } = useTranslation();
  const SEV_LABEL = getSevLabel(t);
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;
  const [p1Year, setP1Year] = useState(curYear);
  const [p1Month, setP1Month] = useState(curMonth === 1 ? 12 : curMonth - 1);
  const [p2Year, setP2Year] = useState(curYear);
  const [p2Month, setP2Month] = useState(curMonth);
  const [universeId, setUniverseId] = useState<number | undefined>();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'changed' | 'added' | 'removed' | 'unchanged'>('changed');

  const doCompare = async () => {
    setLoading(true);
    try {
      const params: unknown = { p1Year, p1Month, p2Year, p2Month };
      if (universeId) params.auditUniverseId = universeId;
      const resp = await api.get('/continuous-monitoring/kri/compare', { params });
      setResult(resp.data);
    } catch {
      message.error('Không thể so sánh dữ liệu KRI');
    } finally {
      setLoading(false);
    }
  };

  const trendIcon = (trend: string) => {
    if (trend === 'worse') return <ArrowUpOutlined style={{ color: '#ff4d4f' }} />;
    if (trend === 'better') return <ArrowDownOutlined style={{ color: '#52c41a' }} />;
    return <MinusOutlined style={{ color: '#8c8c8c' }} />;
  };

  const changedCols = [
    { title: t('riskAssessment.kriDashboard.manual.cols.kriCode', 'Mã KRI'), dataIndex: 'kriCode', width: 140, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: t('kriDashboard.indexName', 'Tên chỉ số'), dataIndex: 'kriName', width: 200, ellipsis: true },
    { title: 'Đơn vị', dataIndex: 'departmentName', width: 140, ellipsis: true },
    {
      title: `Kỳ 1 (T${p1Month}/${p1Year})`,
      key: 'p1',
      width: 150,
      render: (_: unknown, r: unknown) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.period1Value}</div>
          <Tag color={SEV_COLOR[r.period1Severity] || 'default'} style={{ fontSize: 10 }}>{SEV_LABEL[r.period1Severity] || r.period1Severity}</Tag>
        </div>
      ),
    },
    {
      title: 'Xu hướng',
      key: 'trend',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, r: unknown) => trendIcon(r.trend),
    },
    {
      title: `Kỳ 2 (T${p2Month}/${p2Year})`,
      key: 'p2',
      width: 150,
      render: (_: unknown, r: unknown) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.period2Value}</div>
          <Tag color={SEV_COLOR[r.period2Severity] || 'default'} style={{ fontSize: 10 }}>{SEV_LABEL[r.period2Severity] || r.period2Severity}</Tag>
        </div>
      ),
    },
    {
      title: 'Thay đổi',
      key: 'changes',
      width: 120,
      render: (_: unknown, r: unknown) => (
        <Space orientation="vertical" size={2}>
          {r.valueChanged && <Tag color="orange" style={{ fontSize: 10 }}>Giá trị thay đổi</Tag>}
          {r.severityChanged && <Tag color="red" style={{ fontSize: 10 }}>Mức độ thay đổi</Tag>}
          {r.thresholdChanged && <Tag color="purple" style={{ fontSize: 10 }}>Ngưỡng thay đổi</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={12} align="middle" wrap>
          <Col>
            <Text style={{ fontWeight: 600, fontSize: 12 }}>Kỳ 1:</Text>
            <Select value={p1Month} onChange={setP1Month} style={{ width: 100, marginLeft: 6 }}>
              {MONTHS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
            </Select>
            <Select value={p1Year} onChange={setP1Year} style={{ width: 75, marginLeft: 4 }}>
              {years.map((y: unknown) => <Option key={y.value} value={y.value}>{y.label}</Option>)}
            </Select>
          </Col>
          <Col><SwapOutlined style={{ fontSize: 18, color: '#8c8c8c' }} /></Col>
          <Col>
            <Text style={{ fontWeight: 600, fontSize: 12 }}>Kỳ 2:</Text>
            <Select value={p2Month} onChange={setP2Month} style={{ width: 100, marginLeft: 6 }}>
              {MONTHS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
            </Select>
            <Select value={p2Year} onChange={setP2Year} style={{ width: 75, marginLeft: 4 }}>
              {years.map((y: unknown) => <Option key={y.value} value={y.value}>{y.label}</Option>)}
            </Select>
          </Col>
          <Col>
            <Select allowClear showSearch optionFilterProp="label" value={universeId}
              onChange={setUniverseId} style={{ width: 200 }} placeholder="Lọc đơn vị...">
              {auditUniverses.map((u: unknown) => (
                <Option key={u.id} value={u.id} label={u.name}>{u.name}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button type="primary" icon={<SwapOutlined />} loading={loading} onClick={doCompare}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
              So sánh 2 kỳ
            </Button>
          </Col>
        </Row>
      </Card>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}

      {!loading && result && (
        <>
          {/* Summary badges */}
          <Row gutter={10} style={{ marginBottom: 12 }}>
            {[
              { key: 'changed', label: `🔄 Thay đổi`, val: result.summary.changed, color: '#fa8c16' },
              { key: 'added', label: `✅ Mới xuất hiện`, val: result.summary.added, color: '#52c41a' },
              { key: 'removed', label: `❌ Không còn`, val: result.summary.removed, color: '#ff4d4f' },
              { key: 'unchanged', label: `✔️ Ổn định`, val: result.summary.unchanged, color: '#8c8c8c' },
            ].map(s => (
              <Col key={s.key} span={6}>
                <Card size="small" hoverable
                  style={{
                    borderTop: `3px solid ${s.color}`, cursor: 'pointer',
                    boxShadow: activeView === s.key ? `0 0 0 2px ${s.color}` : undefined,
                  }}
                  onClick={() => setActiveView(s.key as any)}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
                  <Text style={{ fontSize: 12 }}>{s.label}</Text>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Detail table based on view */}
          {activeView === 'changed' && (
            <Card size="small" title={`🔄 ${result.summary.changed} chỉ số KRI có thay đổi giữa 2 kỳ`}>
              <Table dataSource={result.changed} columns={changedCols} rowKey="kriCode" size="small" pagination={{ pageSize: 15 }} />
            </Card>
          )}
          {activeView === 'added' && (
            <Card size="small" title={`✅ ${result.summary.added} chỉ số KRI mới xuất hiện trong Kỳ 2`}>
              <Table dataSource={result.added} size="small" pagination={{ pageSize: 15 }}
                columns={[
                  { title: t('riskAssessment.kriDashboard.manual.cols.kriCode', 'Mã KRI'), dataIndex: 'kriCode', width: 150, render: (v: string) => <Text code>{v}</Text> },
                  { title: t('kriDashboard.indexName', 'Tên chỉ số'), dataIndex: 'kriName', width: 220 },
                  { title: 'Đơn vị', dataIndex: 'departmentName', width: 150 },
                  { title: t('kriDashboard.value', 'Giá trị'), dataIndex: 'period2Value', width: 100 },
                  {
                    title: t('riskAssessment.kriDashboard.compare.severity', 'Mức độ'), dataIndex: 'period2Severity', width: 100,
                    render: (s: string) => <Tag color={SEV_COLOR[s]}>{SEV_LABEL[s] || s}</Tag>
                  },
                ]}
                rowKey="kriCode"
              />
            </Card>
          )}
          {activeView === 'removed' && (
            <Card size="small" title={`❌ ${result.summary.removed} chỉ số KRI không còn trong Kỳ 2`}>
              <Table dataSource={result.removed} size="small" pagination={{ pageSize: 15 }}
                columns={[
                  { title: t('riskAssessment.kriDashboard.manual.cols.kriCode', 'Mã KRI'), dataIndex: 'kriCode', width: 150, render: (v: string) => <Text code>{v}</Text> },
                  { title: t('kriDashboard.indexName', 'Tên chỉ số'), dataIndex: 'kriName', width: 220 },
                  { title: 'Đơn vị', dataIndex: 'departmentName', width: 150 },
                  { title: 'Giá trị (kỳ 1)', dataIndex: 'period1Value', width: 100 },
                  {
                    title: t('riskAssessment.kriDashboard.compare.severity', 'Mức độ'), dataIndex: 'period1Severity', width: 100,
                    render: (s: string) => <Tag color={SEV_COLOR[s]}>{SEV_LABEL[s] || s}</Tag>
                  },
                ]}
                rowKey="kriCode"
              />
            </Card>
          )}
          {activeView === 'unchanged' && (
            <Card size="small" title={`✔️ ${result.summary.unchanged} chỉ số KRI ổn định`}>
              <Table dataSource={result.unchanged} size="small" pagination={{ pageSize: 15 }}
                columns={[
                  { title: t('riskAssessment.kriDashboard.manual.cols.kriCode', 'Mã KRI'), dataIndex: 'kriCode', width: 150, render: (v: string) => <Text code>{v}</Text> },
                  { title: t('kriDashboard.indexName', 'Tên chỉ số'), dataIndex: 'kriName', width: 220 },
                  { title: 'Đơn vị', dataIndex: 'departmentName', width: 150 },
                  { title: t('kriDashboard.value', 'Giá trị'), dataIndex: 'value', width: 100 },
                  {
                    title: t('riskAssessment.kriDashboard.compare.severity', 'Mức độ'), dataIndex: 'severity', width: 100,
                    render: (s: string) => <Tag color={SEV_COLOR[s]}>{SEV_LABEL[s] || s}</Tag>
                  },
                ]}
                rowKey="kriCode"
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-component: Phân tích KRI thủ công từ file (đọc động từ file)
// ──────────────────────────────────────────────────────────────────────
function ManualAnalysisTab({ auditUniverses, onSaved }: { auditUniverses: AuditUniverse[]; onSaved: () => void }) {
  const { t } = useTranslation();
  const SEV_LABEL = getSevLabel(t);
  const [selectedUniverseId, setSelectedUniverseId] = useState<number | undefined>();
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [fileRows, setFileRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [fileInfo, setFileInfo] = useState<string>('');

  const selectedUniverse = auditUniverses.find(u => u.id === selectedUniverseId);

  const parseFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      message.loading({ content: 'Đang đọc file...', key: 'kri-parse' });
      const resp = await api.post('/continuous-monitoring/kri/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // The backend returns an array of parsed objects. Let's make sure they have a `key` property
      const dataWithKeys = resp.data.map((item: unknown, index: number) => ({
        ...item,
        key: index,
        // Map backend extracted fields to frontend expected fields if necessary
        thresholdValue: item.threshold || item.thresholdValue,
        currentValue: item.figure || item.currentValue,
      }));
      setFileRows(dataWithKeys);
      setFileInfo(`${file.name} — ${dataWithKeys.length} chỉ số`);
      message.success({ content: 'Đọc file thành công!', key: 'kri-parse' });
    } catch (err) {
      console.error(err);
      message.error({ content: 'Không thể đọc file. Vui lòng kiểm tra định dạng.', key: 'kri-parse' });
    }
    return false;
  };

  const handleSave = async () => {
    if (fileRows.length === 0) { message.warning('Chưa có dữ liệu để lưu'); return; }
    setSaving(true);
    try {
      const payload = fileRows.map(r => ({
        kriCode: r.kriCode,
        kriName: r.kriName,
        category: r.category,
        metrics: r.metrics,
        dataSource: r.dataSource,
        threshold: r.thresholdValue,
        figure: r.currentValue,
        currentRating: r.currentRating,
        expectedRating: r.expectedRating,
        commentary: r.commentary,
        mitigation: r.mitigation,
        departmentName: selectedUniverse?.name || selectedUniverse?.department || t('kriDashboard.notDetermined', 'Không xác định'),
        departmentCode: selectedUniverse?.departmentCode || undefined,
        currentValue: r.currentValue,
        thresholdValue: r.thresholdValue,
        unit: r.unit || undefined,
        note: r.note || undefined,
        severity: r.severity,
        status: 'Active',
        reportMonth,
        reportYear,
        auditUniverseId: selectedUniverseId || undefined,
      }));
      await api.post('/continuous-monitoring/kri/bulk', payload);
      message.success(`Đã lưu ${payload.length} chỉ số KRI vào hệ thống`);
      onSaved();
    } catch {
      message.error('Lỗi khi lưu KRI');
    } finally {
      setSaving(false);
    }
  };

  const analyzeCols = [
    { title: 'Danh mục', dataIndex: 'category', width: 140, ellipsis: true },
    { title: t('riskAssessment.kriDashboard.manual.cols.kriCode', 'Mã KRI'), dataIndex: 'kriCode', width: 110, render: (v: string) => <Text code style={{ fontSize: 10 }}>{v}</Text> },
    { title: 'Chỉ số', dataIndex: 'kriName', ellipsis: true, width: 220 },
    { title: 'Nguồn dữ liệu', dataIndex: 'dataSource', width: 120, ellipsis: true },
    { title: 'Ngưỡng / Hạn mức', dataIndex: 'thresholdValue', width: 140, ellipsis: true },
    { title: 'Số liệu', dataIndex: 'currentValue', width: 90 },
    {
      title: 'Xếp hạng hiện tại',
      dataIndex: 'currentRating',
      width: 120,
      render: (r: string, row: unknown) => {
        const sev = row.severity || 'Medium';
        return <Tag color={SEV_COLOR[sev] || 'default'}>{r || SEV_LABEL[sev] || 'Chưa xếp hạng'}</Tag>;
      }
    },
    { title: 'Xếp hạng dự kiến', dataIndex: 'expectedRating', width: 120 },
    { title: 'Nhận xét', dataIndex: 'commentary', ellipsis: true, width: 150 },
    { title: 'Giảm thiểu', dataIndex: 'mitigation', ellipsis: true, width: 150 },
    { title: 'Ghi chú', dataIndex: 'note', ellipsis: true, width: 120 },
  ];

  return (
    <div>
      <Alert
        message="Phân tích KRI từ file — đọc toàn bộ chỉ số từ file thực tế"
        description="Tải lên file Excel KRI của 1 đơn vị và 1 tháng cụ thể. Hệ thống đọc toàn bộ cột từ file (không dùng mẫu cứng), tự động tính mức độ rủi ro, sau đó lưu vào DB khi bạn xác nhận."
        type="warning" showIcon style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Đối tượng Audit Universe:</div>
          <Select showSearch optionFilterProp="label" optionLabelProp="label" value={selectedUniverseId}
            onChange={setSelectedUniverseId} style={{ width: '100%' }} placeholder="Chọn đơn vị cần phân tích KRI...">
            {auditUniverses.map((u: unknown) => (
              <Option key={u.id} value={u.id} label={u.name}>
                <div>{u.name}</div>
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={6}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Kỳ báo cáo:</div>
          <Space>
            <Select value={reportMonth} onChange={setReportMonth} style={{ width: 110 }}>
              {MONTHS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
            </Select>
            <InputNumber min={2020} max={2030} value={reportYear} onChange={v => setReportYear(v || reportYear)} style={{ width: 80 }} />
          </Space>
        </Col>
        <Col span={8}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>File KRI:</div>
          <Upload accept=".xlsx,.xls,.csv" showUploadList={false} beforeUpload={parseFile}>
            <Button icon={<FileExcelOutlined />}>{t('common.btnChooseExcelCsv', 'Chọn file Excel/CSV')}</Button>
          </Upload>
          {fileInfo && <div style={{ fontSize: 11, color: '#52c41a', marginTop: 4 }}><CheckCircleOutlined /> {fileInfo}</div>}
        </Col>
      </Row>

      {fileRows.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Space>
              <Badge count={fileRows.filter(r => r.severity === 'Critical').length} color="red" />
              <Text style={{ fontSize: 12 }}>Critical</Text>
              <Badge count={fileRows.filter(r => r.severity === 'High').length} color="orange" />
              <Text style={{ fontSize: 12 }}>High</Text>
            </Space>
            <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={handleSave}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}>
              Xác nhận & Lưu {fileRows.length} chỉ số vào Hệ thống
            </Button>
          </div>
          <Table
            dataSource={fileRows}
            columns={analyzeCols}
            rowKey="key"
            size="small"
            pagination={{ pageSize: 20 }}
            rowClassName={(r) => r.severity === 'Critical' ? 'ant-table-row-error' : r.severity === 'High' ? '' : ''}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main KriDashboard Component
// ──────────────────────────────────────────────────────────────────────
interface KriDashboardProps {
  auditUniverses?: AuditUniverse[];
  departments?: Department[];
}

const KriDashboard: React.FC<KriDashboardProps> = ({
  auditUniverses: propAuditUniverses,
  departments: propDepartments,
}) => {
  const { t } = useTranslation();
  const [auditUniverses, setAuditUniverses] = useState<AuditUniverse[]>(propAuditUniverses || []);
  const [departments, setDepartments] = useState<Department[]>(propDepartments || []);

  const [years, setYears] = useState<any[]>(DEFAULT_YEARS);

  useEffect(() => {
    api.get('/continuous-monitoring/kri/options')
      .then(r => {
        if (r.data) {

          if (r.data.years) {
            setYears(r.data.years.map((y: number) => ({ value: y, label: String(y) })));
          }
        }
      })
      .catch((err) => console.error('Error fetching KRI options in KriDashboard:', err));
  }, []);
  const [activeTab, setActiveTab] = useState('upload-per-file');
  const [periodReportKey, setPeriodReportKey] = useState(0); // Force re-render of PeriodReportTab

  // === Dashboard Customization ===
  const dashboardConfig = useDashboardConfig('kri');

  useEffect(() => {
    if (propAuditUniverses && propAuditUniverses.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuditUniverses(propAuditUniverses);
    } else {
      api.get('/audit-universe')
        .then(r => setAuditUniverses(r.data || []))
        .catch((err) => console.error('Error fetching audit-universe in KriDashboard:', err));
    }
  }, [propAuditUniverses]);

  useEffect(() => {
    if (propDepartments && propDepartments.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDepartments(propDepartments);
    } else {
      api.get('/departments')
        .then(r => setDepartments(r.data || []))
        .catch((err) => console.error('Error fetching departments in KriDashboard:', err));
    }
  }, [propDepartments]);

  const handleUploaded = () => {
    // Switch to period report tab and force reload
    setActiveTab('period-report');
    setPeriodReportKey(k => k + 1);
  };

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            📊 Quản lý Chỉ số Rủi ro KRI (Key Risk Indicators)
          </Title>
          <Text type="secondary">
            Tải lên dữ liệu KRI từ file — đọc động từng tháng theo từng đơn vị — so sánh thay đổi theo thời kỳ
          </Text>
        </div>
        {dashboardConfig.canCustomize && (
          <Button
            icon={<SettingOutlined />}
            onClick={() => dashboardConfig.setEditMode(true)}
            style={{ borderColor: '#ea9105', color: '#ea9105' }}
          >
            Tùy chỉnh Dashboard
          </Button>
        )}
      </div>

      <SmartWidgetRenderer
        config={dashboardConfig.config}
        widgetMap={{
          'kri-tabs': (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              items={[
                {
                  key: 'upload-per-file',
                  label: (
                    <span>
                      <CloudUploadOutlined style={{ marginRight: 6, color: '#ea9105' }} />
                      Upload Bulk KRI (Per-file)
                    </span>
                  ),
                  children: (
                    <MultiMetadataUpload
                      auditUniverses={auditUniverses}
                      departments={departments}
                      onUploaded={handleUploaded}
                    />
                  ),
                },
                {
                  key: 'manual-analysis',
                  label: (
                    <span>
                      <BarChartOutlined style={{ marginRight: 6, color: '#ea9105' }} />
                      Phân tích KRI thủ công
                    </span>
                  ),
                  children: (
                    <ManualAnalysisTab
                      auditUniverses={auditUniverses}
                      onSaved={handleUploaded}
                    />
                  ),
                },
                {
                  key: 'period-report',
                  label: (
                    <span>
                      <CalendarOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                      Báo cáo theo thời kỳ
                    </span>
                  ),
                  children: <KriReportPeriod auditUniverses={auditUniverses} years={years} />,
                },
                {
                  key: 'compare',
                  label: (
                    <span>
                      <SwapOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                      So sánh 2 kỳ
                    </span>
                  ),
                  children: <CompareTab auditUniverses={auditUniverses} years={years} />,
                },
              ]}
            />
          )
        }}
      />

      <DashboardCustomizer
        open={dashboardConfig.editMode}
        onClose={() => dashboardConfig.setEditMode(false)}
        dashboardKey="kri"
        config={dashboardConfig.config}
        onToggle={dashboardConfig.toggleWidget}
        onResize={dashboardConfig.resizeWidget}
        onReorder={dashboardConfig.reorderWidgets}
        onUpdateSettings={dashboardConfig.updateWidgetSettings}
        onSave={dashboardConfig.saveConfig}
        onReset={dashboardConfig.resetConfig}
        hasChanges={dashboardConfig.hasChanges}
        saving={dashboardConfig.saving}
      />
    </div>
  );
};

export default KriDashboard;
