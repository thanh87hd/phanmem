import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Upload,
  message,
  Card,
  Input,
  Typography,
  Badge,
  Segmented,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  TableOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import {
  CreditCustomerDetailModal,
  type CreditSampleItem,
} from './CreditCustomerDetailModal';
import { calculateResidualRisk } from '../../constants/auditConstants';
import { getCreditCompactColumns, getCreditFullColumns } from './creditGridColumns';

const { Text } = Typography;

export const CreditWorkingPaperGrid: React.FC<{
  workingPaperId: number;
  readOnly?: boolean;
}> = ({ workingPaperId, readOnly = false }) => {
  const [samples, setSamples] = useState<CreditSampleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [workingPaper, setWorkingPaper] = useState<any>(null);
  const [auditorOptions, setAuditorOptions] = useState<{ label: string; value: string }[]>([]);
  const [universeOptions, setUniverseOptions] = useState<{ label: string; value: string }[]>([]);
  const [defectCodeOptions, setDefectCodeOptions] = useState<{ label: string; value: string }[]>([]);

  // Chế độ hiển thị: 'compact' (Tóm tắt fit màn hình) hoặc 'full' (Ma trận 40 cột)
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('compact');
  // Modal nhập liệu Toàn màn hình
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentDetailIndex, setCurrentDetailIndex] = useState(0);

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit-samples/by-working-paper/${workingPaperId}`);
      setSamples(res.data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi tải danh sách mẫu Tín dụng');
    } finally {
      setLoading(false);
    }
  };

  const fetchContextData = async () => {
    try {
      const wpRes = await api.get(`/working-papers/${workingPaperId}`);
      const wpData = wpRes.data;
      setWorkingPaper(wpData);

      // Kế thừa danh sách KTV trong Đoàn kiểm toán
      const members: { label: string; value: string }[] = [];
      if (wpData?.creatorUser?.fullName) {
        members.push({
          label: `${wpData.creatorUser.fullName} (KTV Lập WP)`,
          value: wpData.creatorUser.fullName,
        });
      }
      if (wpData?.engagement?.leadAuditorUser?.fullName) {
        members.push({
          label: `${wpData.engagement.leadAuditorUser.fullName} (Trưởng đoàn)`,
          value: wpData.engagement.leadAuditorUser.fullName,
        });
      }
      if (Array.isArray(wpData?.engagement?.teamMembers)) {
        wpData.engagement.teamMembers.forEach((m: any) => {
          if (m?.fullName && !members.some((x) => x.value === m.fullName)) {
            members.push({
              label: `${m.fullName} (${m.role || 'Thành viên đoàn'})`,
              value: m.fullName,
            });
          }
        });
      }
      setAuditorOptions(members);
    } catch (e) {
      console.warn('Could not fetch working paper details', e);
    }

    try {
      const uRes = await api.get('/audit-universe');
      if (Array.isArray(uRes.data)) {
        setUniverseOptions(
          uRes.data.map((u: any) => ({ label: u.name, value: u.name })),
        );
      }
    } catch {
      // ignore
    }

    try {
      const dcRes = await api.get('/ai/defect-codes');
      if (Array.isArray(dcRes.data)) {
        setDefectCodeOptions(
          dcRes.data.map((d: any) => ({
            label: `[${d.code}] ${d.description}`,
            value: d.description,
          })),
        );
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (workingPaperId) {
      fetchSamples();
      fetchContextData();
    }
  }, [workingPaperId]);

  const handleCellChange = (id: number, field: keyof CreditSampleItem, value: any) => {
    setSamples((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'inherentRisk' || field === 'controlQuality') {
            updated.residualRisk = calculateResidualRisk(
              field === 'inherentRisk' ? value : updated.inherentRisk,
              field === 'controlQuality' ? value : updated.controlQuality,
            );
          }
          return updated;
        }
        return item;
      }),
    );
  };

  const handleOpenDetailModal = (index: number) => {
    setCurrentDetailIndex(index);
    setDetailModalVisible(true);
  };

  const handleSaveRow = async (record: CreditSampleItem): Promise<boolean> => {
    try {
      const { batch, finding, createdAt, updatedAt, ...cleanRecord } = record as any;
      const res = await api.patch(`/audit-samples/${record.id}`, cleanRecord);
      if (res.data?.findingId && res.data.findingId !== record.findingId) {
        setSamples((prev) =>
          prev.map((s) => (s.id === record.id ? { ...s, ...cleanRecord, findingId: res.data.findingId } : s)),
        );
        message.success(
          `Đã lưu khách hàng #${record.sequenceNo} (${record.customerName || record.cifOrAccount}) và đồng bộ Phát hiện #FD-${res.data.findingId}`,
        );
      } else {
        setSamples((prev) =>
          prev.map((s) => (s.id === record.id ? { ...s, ...cleanRecord } : s)),
        );
        message.success(`Đã lưu khách hàng #${record.sequenceNo} (${record.customerName || record.cifOrAccount})`);
      }
      return true;
    } catch (err: any) {
      console.error('Lỗi khi lưu dòng mẫu:', err);
      const errMsg = err?.response?.data?.message;
      const displayMsg = Array.isArray(errMsg) ? errMsg.join(', ') : (errMsg || 'Lỗi khi lưu dữ liệu dòng');
      message.error(displayMsg);
      return false;
    }
  };

  const handleExportExcel = async () => {
    message.loading({ content: 'Đang kết xuất Excel 40 cột...', key: 'export' });
    try {
      const res = await api.get(`/working-papers/${workingPaperId}/export-credit-excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `WP_TD_40Cot_WP${workingPaperId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Tải file Excel thành công!', key: 'export' });
    } catch (err: any) {
      message.error({ content: 'Lỗi xuất file Excel', key: 'export' });
    }
  };

  const handleDownloadTemplate = async () => {
    message.loading({ content: 'Đang tải file template mẫu 40 cột thực tế...', key: 'tpl' });
    try {
      const res = await api.get('/working-papers/template/credit-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_WP_TinDung_40Cot_ThucTe.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Tải template mẫu 40 cột thành công!', key: 'tpl' });
    } catch (err: any) {
      message.error({ content: 'Lỗi tải template mẫu', key: 'tpl' });
    }
  };

  const handleAddSample = async () => {
    try {
      const newSeq = samples.length + 1;
      const inheritedBranch =
        workingPaper?.engagement?.branchName ||
        workingPaper?.engagement?.branchCode ||
        'Chi nhánh Tây Nghệ An';
      const defaultAuditor =
        auditorOptions[0]?.value || workingPaper?.creatorUser?.fullName || 'KTV';

      await api.post(`/audit-samples/by-working-paper/${workingPaperId}`, {
        sequenceNo: newSeq,
        branchCode: inheritedBranch,
        cifOrAccount: `0${Date.now().toString().slice(-8)}`,
        customerName: `Khách hàng mẫu ${newSeq}`,
        loanAmount: 2.5,
        debtGroup: '1',
        customerType: 'Cá nhân',
        testedBy: defaultAuditor,
        loanPurpose: 'Vay vốn SXKD / Tiêu dùng',
        inherentRisk: 'Trung bình',
        controlQuality: 'Tốt',
        residualRisk: 'Thấp',
        auditeeOpinion: 'Đồng ý',
        includeInReport: false,
      });
      message.success('Đã thêm dòng mẫu mới (kế thừa chi nhánh & đoàn KT)');
      fetchSamples();
    } catch (err: any) {
      message.error('Lỗi khi thêm dòng mẫu');
    }
  };

  const handleImportExcel = async (options: any) => {
    const { file } = options;
    const formData = new FormData();
    formData.append('file', file);

    message.loading({ content: 'Đang nạp file Excel 40 cột thực tế...', key: 'import' });
    try {
      const res = await api.post(`/working-papers/${workingPaperId}/import-credit-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success({
        content: `Đã nạp thành công ${res.data?.totalSamples || 0} mẫu và tạo ${res.data?.findingsCreated || 0} phát hiện!`,
        key: 'import',
      });
      fetchSamples();
    } catch (err: any) {
      message.error({
        content: err?.response?.data?.message || 'Lỗi nạp file Excel Tín dụng',
        key: 'import',
      });
    }
  };

  const filteredSamples = samples.filter(
    (s) =>
      !searchText ||
      s.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.cifOrAccount?.includes(searchText) ||
      s.detailedRisk?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const columnParams = {
    filteredSamples,
    workingPaper,
    readOnly,
    auditorOptions,
    universeOptions,
    defectCodeOptions,
    handleOpenDetailModal,
    handleCellChange,
    handleSaveRow,
  };

  const compactColumns = useMemo(() => getCreditCompactColumns(columnParams), [
    filteredSamples,
    workingPaper,
    readOnly,
  ]);

  const columns = useMemo(() => getCreditFullColumns(columnParams), [
    filteredSamples,
    workingPaper,
    readOnly,
    auditorOptions,
    universeOptions,
    defectCodeOptions,
  ]);

  return (
    <>
      <Card
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <Space>
              <Text strong className="text-base text-slate-800">
                Ma trận Dữ liệu Giấy tờ làm việc Tín dụng
              </Text>
              <Badge count={samples.length} overflowCount={999} style={{ backgroundColor: '#1890ff' }} />
            </Space>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as any)}
              options={[
                {
                  label: '📋 Danh sách tóm tắt (Fit màn hình)',
                  value: 'compact',
                  icon: <AppstoreOutlined />,
                },
                {
                  label: '📊 Ma trận 40 cột (Trải rộng)',
                  value: 'full',
                  icon: <TableOutlined />,
                },
              ]}
              className="bg-slate-100 p-0.5 rounded-lg border border-slate-200"
            />
          </div>
        }
        extra={
          <Space wrap>
            <Input.Search
              placeholder="Tìm theo CIF, Tên KH, Lỗi..."
              style={{ width: 180 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button
              type="primary"
              icon={<FullscreenOutlined />}
              onClick={() => {
                if (filteredSamples.length > 0) {
                  handleOpenDetailModal(0);
                } else {
                  message.info('Chưa có mẫu nào để mở');
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none font-semibold shadow-sm rounded-lg"
            >
              Nhập Full-Screen
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} className="border-blue-500 text-blue-600">
              Tải Template (40 Cột)
            </Button>
            <Upload customRequest={handleImportExcel} showUploadList={false} accept=".xlsx,.xls">
              <Button icon={<UploadOutlined />} type="primary" className="bg-emerald-600 hover:bg-emerald-700">
                Nhập Excel (40 cột)
              </Button>
            </Upload>
            <Button icon={<PlusOutlined />} onClick={handleAddSample} disabled={readOnly}>
              Thêm dòng
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>
              Xuất Excel
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchSamples}>
              Làm mới
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={viewMode === 'compact' ? compactColumns : columns}
          dataSource={filteredSamples}
          loading={loading}
          scroll={viewMode === 'compact' ? { x: 1360, y: 560 } : { x: 7600, y: 560 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="small"
          bordered
          onRow={(record) => {
            const idx = filteredSamples.findIndex((s) => s.id === record.id);
            return {
              onDoubleClick: () => handleOpenDetailModal(idx >= 0 ? idx : 0),
            };
          }}
          rowClassName="hover:bg-blue-50/40 cursor-pointer transition-colors"
        />
      </Card>

      {/* Workspace Nhập liệu Toàn Màn Hình cho từng Khách hàng */}
      <CreditCustomerDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        samples={filteredSamples}
        currentIndex={currentDetailIndex}
        onIndexChange={(newIdx) => setCurrentDetailIndex(newIdx)}
        onSaveSample={handleSaveRow}
        readOnly={readOnly}
        auditorOptions={auditorOptions}
        universeOptions={universeOptions}
        defectCodeOptions={defectCodeOptions}
        defaultBranch={workingPaper?.engagement?.branchName || 'Chi nhánh'}
      />
    </>
  );
};
