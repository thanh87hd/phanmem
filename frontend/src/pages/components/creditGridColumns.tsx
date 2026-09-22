import React from 'react';
import {
  Space,
  Tag,
  Input,
  Select,
  AutoComplete,
  InputNumber,
  Checkbox,
  Tooltip,
  Typography,
  Button,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FullscreenOutlined } from '@ant-design/icons';
import type { CreditSampleItem } from './CreditCustomerDetailModal';
import {
  RISK_GROUPS,
  CAUSE_TYPES,
  CONTROL_QUALITIES,
  INHERENT_RISKS,
  RISK_CATEGORIES,
  CUSTOMER_TYPES,
  AUDITEE_OPINIONS,
  VIOLATION_HISTORIES,
} from '../../constants/auditConstants';

const { Text } = Typography;

export interface CreditGridColumnParams {
  filteredSamples: CreditSampleItem[];
  workingPaper: any;
  readOnly: boolean;
  auditorOptions: { label: string; value: string }[];
  universeOptions: { label: string; value: string }[];
  defectCodeOptions: { label: string; value: string }[];
  handleOpenDetailModal: (index: number) => void;
  handleCellChange: (id: number, field: keyof CreditSampleItem, value: any) => void;
  handleSaveRow: (record: CreditSampleItem) => Promise<boolean>;
}

export function getCreditCompactColumns({
  filteredSamples,
  workingPaper,
  readOnly,
  handleOpenDetailModal,
  handleCellChange,
  handleSaveRow,
}: CreditGridColumnParams): ColumnsType<CreditSampleItem> {
  return [
    {
      title: 'STT',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 75,
      align: 'center',
      fixed: 'left',
      render: (val: number, record: CreditSampleItem) => (
        <Space orientation="vertical" size={1} align="center">
          <Text strong>{val}</Text>
          {record.findingId ? (
            <Tooltip title={`Liên kết Phát hiện #FD-${record.findingId}`}>
              <Tag color="purple" style={{ fontSize: 9, padding: '0 3px', margin: 0, cursor: 'pointer' }}>
                FD-{record.findingId}
              </Tag>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Mã CIF',
      dataIndex: 'cifOrAccount',
      key: 'cifOrAccount',
      width: 120,
      fixed: 'left',
      render: (text: string, record: CreditSampleItem) => {
        const idx = filteredSamples.findIndex((s) => s.id === record.id);
        return (
          <Button
            type="link"
            onClick={() => handleOpenDetailModal(idx >= 0 ? idx : 0)}
            className="font-mono p-0 font-semibold text-blue-600 hover:underline text-xs"
          >
            {text || '---'}
          </Button>
        );
      },
    },
    {
      title: 'Tên Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 200,
      fixed: 'left',
      render: (text: string, record: CreditSampleItem) => {
        const idx = filteredSamples.findIndex((s) => s.id === record.id);
        return (
          <div>
            <Button
              type="link"
              onClick={() => handleOpenDetailModal(idx >= 0 ? idx : 0)}
              className="p-0 font-bold text-slate-800 text-left hover:text-blue-600 block truncate max-w-[190px]"
              title={text}
            >
              {text || '---'}
            </Button>
            <Text type="secondary" className="text-[11px]">
              {record.customerType || 'Cá nhân'}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchCode',
      key: 'branchCode',
      width: 140,
      render: (text: string) => (
        <span className="text-xs text-slate-700">
          {text || workingPaper?.engagement?.branchName || 'Chi nhánh'}
        </span>
      ),
    },
    {
      title: 'Dư nợ',
      dataIndex: 'loanAmount',
      key: 'loanAmount',
      width: 110,
      align: 'right',
      render: (val: number) => (
        <Tag color="blue" className="font-semibold text-xs">
          {val ? Number(val).toLocaleString('vi-VN') : 0} tỷ
        </Tag>
      ),
    },
    {
      title: 'Nhóm nợ',
      dataIndex: 'debtGroup',
      key: 'debtGroup',
      width: 95,
      align: 'center',
      render: (val: string) => (
        <Tag color={val === '1' ? 'green' : val === '2' ? 'orange' : 'red'} className="text-xs">
          Nhóm {val || 1}
        </Tag>
      ),
    },
    {
      title: 'KTV Phụ trách',
      dataIndex: 'testedBy',
      key: 'testedBy',
      width: 130,
      render: (text: string) => <span className="text-xs text-slate-700">{text || '---'}</span>,
    },
    {
      title: 'Rủi ro còn lại',
      dataIndex: 'residualRisk',
      key: 'residualRisk',
      width: 120,
      align: 'center',
      render: (val: string) => (
        <Tag
          color={
            val === 'Cao'
              ? 'error'
              : val === 'Thấp' || val === 'Thấp (đã khắc phục)'
              ? 'success'
              : 'warning'
          }
          className="font-semibold text-xs"
        >
          {val || 'Trung bình'}
        </Tag>
      ),
    },
    {
      title: 'Tồn tại / Rủi ro chính',
      dataIndex: 'detailedRisk',
      key: 'detailedRisk',
      width: 250,
      ellipsis: true,
      render: (text: string, record: CreditSampleItem) => {
        const display = text || record.postExplanationNote || record.preExplanationNote || 'Chưa ghi nhận tồn tại';
        return (
          <Tooltip title={display}>
            <span className="text-xs text-slate-600 truncate block">{display}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Lên BCKT',
      dataIndex: 'includeInReport',
      key: 'includeInReport',
      width: 85,
      align: 'center',
      render: (checked: boolean, record: CreditSampleItem) => (
        <Checkbox
          checked={checked}
          disabled={readOnly}
          onChange={(e) => {
            handleCellChange(record.id, 'includeInReport', e.target.checked);
            handleSaveRow({ ...record, includeInReport: e.target.checked });
          }}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 130,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: CreditSampleItem) => {
        const idx = filteredSamples.findIndex((s) => s.id === record.id);
        return (
          <Button
            type="primary"
            size="small"
            icon={<FullscreenOutlined />}
            onClick={() => handleOpenDetailModal(idx >= 0 ? idx : 0)}
            className="bg-blue-600 hover:bg-blue-700 shadow-xs rounded-lg text-xs font-medium"
          >
            Nhập chi tiết
          </Button>
        );
      },
    },
  ];
}

export function getCreditFullColumns({
  filteredSamples,
  workingPaper,
  readOnly,
  auditorOptions,
  universeOptions,
  defectCodeOptions,
  handleOpenDetailModal,
  handleCellChange,
  handleSaveRow,
}: CreditGridColumnParams): any[] {
  return [
    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 1: THÔNG TIN CHUNG (Cột 1 - 9)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-sky-800">🟦 1. THÔNG TIN CHUNG (CỘT 1 - 9)</span>,
      children: [
        {
          title: 'TT (1)',
          dataIndex: 'sequenceNo',
          key: 'sequenceNo',
          width: 95,
          fixed: 'left',
          render: (val: number, record: CreditSampleItem) => {
            const idx = filteredSamples.findIndex((s) => s.id === record.id);
            return (
              <Space orientation="vertical" size={2} align="center">
                <Text strong>{val}</Text>
                <Button
                  size="small"
                  type="text"
                  icon={<FullscreenOutlined />}
                  onClick={() => handleOpenDetailModal(idx >= 0 ? idx : 0)}
                  className="text-blue-600 hover:bg-blue-50 p-0 text-xs h-5 font-semibold"
                  title="Mở màn hình nhập liệu toàn màn hình"
                >
                  Mở
                </Button>
                {record.findingId ? (
                  <Tooltip title={`Đã đồng bộ tự động sang Phát hiện kiểm toán #FD-${record.findingId}`}>
                    <Tag color="purple" style={{ fontSize: 10, padding: '0 4px', margin: 0, cursor: 'pointer' }}>
                      🔗 FD-{record.findingId}
                    </Tag>
                  </Tooltip>
                ) : null}
              </Space>
            );
          },
        },
        {
          title: 'Tên CN (2)',
          dataIndex: 'branchCode',
          key: 'branchCode',
          width: 150,
          render: (text: string, record: CreditSampleItem) => {
            const displayBranch =
              text || workingPaper?.engagement?.branchName || 'Chi nhánh';
            return readOnly ? (
              displayBranch
            ) : (
              <Input
                size="small"
                value={text || workingPaper?.engagement?.branchName}
                placeholder={workingPaper?.engagement?.branchName || 'Tên chi nhánh...'}
                onChange={(e) => handleCellChange(record.id, 'branchCode', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            );
          },
        },
        {
          title: 'Mã KH (3)',
          dataIndex: 'cifOrAccount',
          key: 'cifOrAccount',
          width: 120,
          fixed: 'left',
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                onChange={(e) => handleCellChange(record.id, 'cifOrAccount', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Tên KH (4)',
          dataIndex: 'customerName',
          key: 'customerName',
          width: 180,
          fixed: 'left',
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? <Text strong>{text}</Text> : (
              <Input
                size="small"
                value={text}
                onChange={(e) => handleCellChange(record.id, 'customerName', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Dư nợ (tỷ) (5)',
          dataIndex: 'loanAmount',
          key: 'loanAmount',
          width: 130,
          render: (val: number, record: CreditSampleItem) =>
            readOnly ? (
              <Tag color="blue">{val ? val.toLocaleString('vi-VN') : 0} tỷ</Tag>
            ) : (
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                value={val}
                onChange={(v) => handleCellChange(record.id, 'loanAmount', v)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Nhóm nợ (6)',
          dataIndex: 'debtGroup',
          key: 'debtGroup',
          width: 100,
          render: (val: string, record: CreditSampleItem) =>
            readOnly ? (
              <Tag color={val === '1' ? 'green' : val === '2' ? 'orange' : 'red'}>Nhóm {val || 1}</Tag>
            ) : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val || '1'}
                options={[1, 2, 3, 4, 5].map((g) => ({ label: `Nhóm ${g}`, value: g.toString() }))}
                onChange={(v) => {
                  handleCellChange(record.id, 'debtGroup', v);
                  handleSaveRow({ ...record, debtGroup: v });
                }}
              />
            ),
        },
        {
          title: 'KTV (7)',
          dataIndex: 'testedBy',
          key: 'testedBy',
          width: 150,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? (
              text
            ) : auditorOptions.length > 0 ? (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={text}
                placeholder="Chọn KTV đoàn"
                options={auditorOptions}
                onChange={(v) => {
                  handleCellChange(record.id, 'testedBy', v);
                  handleSaveRow({ ...record, testedBy: v });
                }}
              />
            ) : (
              <Input
                size="small"
                value={text}
                placeholder="KTV phụ trách"
                onChange={(e) => handleCellChange(record.id, 'testedBy', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Mục đích vay vốn (8)',
          dataIndex: 'loanPurpose',
          key: 'loanPurpose',
          width: 220,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                onChange={(e) => handleCellChange(record.id, 'loanPurpose', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Phân loại KH (9)',
          dataIndex: 'customerType',
          key: 'customerType',
          width: 130,
          render: (val: string, record: CreditSampleItem) =>
            readOnly ? <Tag>{val || 'Cá nhân'}</Tag> : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val || 'Cá nhân'}
                options={CUSTOMER_TYPES.map((ct) => ({ label: ct, value: ct }))}
                onChange={(v) => {
                  handleCellChange(record.id, 'customerType', v);
                  handleSaveRow({ ...record, customerType: v });
                }}
              />
            ),
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 2: GHI NHẬN TRƯỚC GIẢI TRÌNH & THỰC ĐỊA (Cột 10 - 15)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-amber-800">🟨 2. GHI NHẬN TRƯỚC GIẢI TRÌNH & THỰC ĐỊA (CỘT 10 - 15)</span>,
      children: [
        {
          title: 'Nội dung ghi nhận trước giải trình (10)',
          dataIndex: 'preExplanationNote',
          key: 'preExplanationNote',
          width: 260,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Nội dung ghi nhận sơ bộ..."
                onChange={(e) => handleCellChange(record.id, 'preExplanationNote', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Thông tin đi thực địa KH (11)',
          dataIndex: 'fieldInspectionInfo',
          key: 'fieldInspectionInfo',
          width: 220,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Thông tin cần làm rõ..."
                onChange={(e) => handleCellChange(record.id, 'fieldInspectionInfo', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'CVKH quản lý (12)',
          dataIndex: 'auditeeOfficer',
          key: 'auditeeOfficer',
          width: 150,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Tên CVKH"
                onChange={(e) => handleCellChange(record.id, 'auditeeOfficer', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Phỏng vấn CB QLKH (13)',
          dataIndex: 'interviewAuditeeOfficer',
          key: 'interviewAuditeeOfficer',
          width: 200,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Kết quả phỏng vấn..."
                onChange={(e) => handleCellChange(record.id, 'interviewAuditeeOfficer', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Kiểm tra thực tế (14)',
          dataIndex: 'fieldInspection',
          key: 'fieldInspection',
          width: 100,
          align: 'center',
          render: (checked: boolean, record: CreditSampleItem) => (
            <Checkbox
              checked={checked}
              disabled={readOnly}
              onChange={(e) => {
                handleCellChange(record.id, 'fieldInspection', e.target.checked);
                handleSaveRow({ ...record, fieldInspection: e.target.checked });
              }}
            />
          ),
        },
        {
          title: 'Kết quả kiểm tra thực tế KH (15)',
          dataIndex: 'fieldInspectionResult',
          key: 'fieldInspectionResult',
          width: 220,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Kết quả kiểm tra thực tế..."
                onChange={(e) => handleCellChange(record.id, 'fieldInspectionResult', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 3: ĐVKD GIẢI TRÌNH & PHẢN HỒI (Cột 16 - 18)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-sky-800">🟦 3. ĐVKD GIẢI TRÌNH & PHẢN HỒI (CỘT 16 - 18)</span>,
      children: [
        {
          title: 'ĐVKD giải trình (16)',
          dataIndex: 'auditeeExplanation',
          key: 'auditeeExplanation',
          width: 260,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Ý kiến giải trình của ĐVKD..."
                onChange={(e) => handleCellChange(record.id, 'auditeeExplanation', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Đoàn KT trả lời giải trình (17)',
          dataIndex: 'auditorResponse',
          key: 'auditorResponse',
          width: 260,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Phản hồi của Đoàn kiểm toán..."
                onChange={(e) => handleCellChange(record.id, 'auditorResponse', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Nội dung ghi nhận sau giải trình (18)',
          dataIndex: 'postExplanationNote',
          key: 'postExplanationNote',
          width: 260,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? (
              <Text type={text ? 'danger' : 'secondary'}>{text || 'Không có tồn tại'}</Text>
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Kết luận sau giải trình..."
                onChange={(e) => handleCellChange(record.id, 'postExplanationNote', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 4: ĐÁNH GIÁ RỦI RO & KIẾN NGHỊ (Cột 19 - 31)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-amber-800">🟨 4. ĐÁNH GIÁ RỦI RO & KIẾN NGHỊ (CỘT 19 - 31)</span>,
      children: [
        {
          title: 'Nhóm rủi ro (19)',
          dataIndex: 'riskGroup',
          key: 'riskGroup',
          width: 260,
          render: (val: string, record: CreditSampleItem) => {
            const combined = Array.from(
              new Set([...RISK_GROUPS, ...universeOptions.map((u) => u.value)]),
            ).map((g) => ({ label: g, value: g }));
            return readOnly ? (
              val
            ) : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val}
                placeholder="Chọn nhóm rủi ro quy trình"
                options={combined}
                onChange={(v) => {
                  handleCellChange(record.id, 'riskGroup', v);
                  handleSaveRow({ ...record, riskGroup: v });
                }}
              />
            );
          },
        },
        {
          title: 'Danh mục rủi ro (20)',
          dataIndex: 'riskCategory',
          key: 'riskCategory',
          width: 200,
          render: (val: string, record: CreditSampleItem) =>
            readOnly ? val : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val}
                placeholder="Chọn danh mục"
                options={RISK_CATEGORIES.map((c) => ({ label: c, value: c }))}
                onChange={(v) => {
                  handleCellChange(record.id, 'riskCategory', v);
                  handleSaveRow({ ...record, riskCategory: v });
                }}
              />
            ),
        },
        {
          title: 'Rủi ro chi tiết (21)',
          dataIndex: 'detailedRisk',
          key: 'detailedRisk',
          width: 280,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? (
              <Text strong>{text}</Text>
            ) : defectCodeOptions.length > 0 ? (
              <AutoComplete
                style={{ width: '100%' }}
                options={defectCodeOptions}
                value={text}
                placeholder="Gõ hoặc chọn mã lỗi L3/NĐ340..."
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                onChange={(v) => handleCellChange(record.id, 'detailedRisk', v)}
                onBlur={() => handleSaveRow(record)}
              >
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  placeholder="Mô tả sai phạm chi tiết..."
                />
              </AutoComplete>
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Mô tả sai phạm chi tiết..."
                onChange={(e) => handleCellChange(record.id, 'detailedRisk', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Nguyên nhân vi phạm (22)',
          dataIndex: 'violationCause',
          key: 'violationCause',
          width: 220,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Nguyên nhân gốc rễ..."
                onChange={(e) => handleCellChange(record.id, 'violationCause', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Phân loại nguyên nhân (23)',
          dataIndex: 'violationCauseType',
          key: 'violationCauseType',
          width: 240,
          render: (val: string, record: CreditSampleItem) =>
            readOnly ? val : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val}
                placeholder="Chọn phân loại nguyên nhân"
                options={CAUSE_TYPES.map((c) => ({ label: c, value: c }))}
                onChange={(v) => {
                  handleCellChange(record.id, 'violationCauseType', v);
                  handleSaveRow({ ...record, violationCauseType: v });
                }}
              />
            ),
        },
        {
          title: 'Mức độ rủi ro (24)',
          dataIndex: 'inherentRisk',
          key: 'inherentRisk',
          width: 120,
          render: (val: string, record: CreditSampleItem) =>
            readOnly ? val : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val || 'Trung bình'}
                options={INHERENT_RISKS.map((r) => ({ label: r, value: r }))}
                onChange={(v) => {
                  handleCellChange(record.id, 'inherentRisk', v);
                  handleSaveRow({ ...record, inherentRisk: v });
                }}
              />
            ),
        },
        {
          title: 'Chất lượng KS (25)',
          dataIndex: 'controlQuality',
          key: 'controlQuality',
          width: 130,
          render: (val: string, record: CreditSampleItem) =>
            readOnly ? val : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val || 'Trung bình'}
                options={CONTROL_QUALITIES.map((q) => ({ label: q, value: q }))}
                onChange={(v) => {
                  handleCellChange(record.id, 'controlQuality', v);
                  handleSaveRow({ ...record, controlQuality: v });
                }}
              />
            ),
        },
        {
          title: 'Rủi ro còn lại (26)',
          dataIndex: 'residualRisk',
          key: 'residualRisk',
          width: 130,
          align: 'center',
          render: (val: string) => (
            <Tag
              color={
                val === 'Cao'
                  ? 'error'
                  : val === 'Thấp' || val === 'Thấp (đã khắc phục)'
                    ? 'success'
                    : 'warning'
              }
            >
              {val || 'Trung bình'}
            </Tag>
          ),
        },
        {
          title: 'Kiến nghị (27)',
          dataIndex: 'recommendationText',
          key: 'recommendationText',
          width: 260,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Kiến nghị xử lý..."
                onChange={(e) => handleCellChange(record.id, 'recommendationText', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Nhân sự liên quan (28)',
          dataIndex: 'relatedPersonnelText',
          key: 'relatedPersonnelText',
          width: 220,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Nhân sự chịu trách nhiệm..."
                onChange={(e) => handleCellChange(record.id, 'relatedPersonnelText', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Lịch sử VP (29)',
          dataIndex: 'violationHistory',
          key: 'violationHistory',
          width: 130,
          render: (val: string, record: CreditSampleItem) =>
            readOnly ? <Tag>{val || 'Lần đầu'}</Tag> : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val || 'Lần đầu'}
                options={VIOLATION_HISTORIES.map((vh) => ({ label: vh, value: vh }))}
                onChange={(v) => {
                  handleCellChange(record.id, 'violationHistory', v);
                  handleSaveRow({ ...record, violationHistory: v });
                }}
              />
            ),
        },
        {
          title: 'Trách nhiệm thực hiện (30)',
          dataIndex: 'responsibleDepartment',
          key: 'responsibleDepartment',
          width: 180,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Phòng/Ban thực hiện"
                onChange={(e) => handleCellChange(record.id, 'responsibleDepartment', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Thời hạn (31)',
          dataIndex: 'deadline',
          key: 'deadline',
          width: 130,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Thời hạn hoàn thành"
                onChange={(e) => handleCellChange(record.id, 'deadline', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 5: TRÁCH NHIỆM NHÂN SỰ ĐVKD & HỘI SỞ (Cột 32 - 38)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-sky-800">🟦 5. TRÁCH NHIỆM NHÂN SỰ ĐVKD & HỘI SỞ (CỘT 32 - 38)</span>,
      children: [
        {
          title: 'Trách nhiệm chính (ĐVKD) (32)',
          dataIndex: 'primaryOfficerUnit',
          key: 'primaryOfficerUnit',
          width: 180,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Họ tên CB chính"
                onChange={(e) => handleCellChange(record.id, 'primaryOfficerUnit', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Người liên quan 1 (ĐVKD) (33)',
          dataIndex: 'relatedOfficer1Unit',
          key: 'relatedOfficer1Unit',
          width: 180,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Họ tên người LQ 1"
                onChange={(e) => handleCellChange(record.id, 'relatedOfficer1Unit', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Người liên quan 2 (ĐVKD) (34)',
          dataIndex: 'relatedOfficer2Unit',
          key: 'relatedOfficer2Unit',
          width: 180,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Họ tên người LQ 2"
                onChange={(e) => handleCellChange(record.id, 'relatedOfficer2Unit', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Người liên quan 3 (ĐVKD) (35)',
          dataIndex: 'relatedOfficer3Unit',
          key: 'relatedOfficer3Unit',
          width: 180,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Họ tên người LQ 3"
                onChange={(e) => handleCellChange(record.id, 'relatedOfficer3Unit', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Trách nhiệm chính (Hội sở) (36)',
          dataIndex: 'primaryOfficerHO',
          key: 'primaryOfficerHO',
          width: 180,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="CB Hội sở chính"
                onChange={(e) => handleCellChange(record.id, 'primaryOfficerHO', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Người liên quan 1 (Hội sở) (37)',
          dataIndex: 'relatedOfficer1HO',
          key: 'relatedOfficer1HO',
          width: 180,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Người LQ 1 Hội sở"
                onChange={(e) => handleCellChange(record.id, 'relatedOfficer1HO', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Người liên quan 2 (Hội sở) (38)',
          dataIndex: 'relatedOfficer2HO',
          key: 'relatedOfficer2HO',
          width: 180,
          render: (text: string, record: CreditSampleItem) =>
            readOnly ? text : (
              <Input
                size="small"
                value={text}
                placeholder="Người LQ 2 Hội sở"
                onChange={(e) => handleCellChange(record.id, 'relatedOfficer2HO', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 6: PHẢN HỒI ĐƠN VỊ & BÁO CÁO (Cột 39 - 40)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-amber-800">🟨 6. PHẢN HỒI ĐƠN VỊ & BÁO CÁO (CỘT 39 - 40)</span>,
      children: [
        {
          title: 'Ý kiến của Đơn vị (39)',
          dataIndex: 'auditeeOpinion',
          key: 'auditeeOpinion',
          width: 150,
          render: (val: string, record: CreditSampleItem) =>
            readOnly ? <Tag color={val === 'Đồng ý' ? 'blue' : 'volcano'}>{val || 'Đồng ý'}</Tag> : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val || 'Đồng ý'}
                options={AUDITEE_OPINIONS.map((o) => ({ label: o, value: o }))}
                onChange={(v) => {
                  handleCellChange(record.id, 'auditeeOpinion', v);
                  handleSaveRow({ ...record, auditeeOpinion: v });
                }}
              />
            ),
        },
        {
          title: 'Lên BCKT (40)',
          dataIndex: 'includeInReport',
          key: 'includeInReport',
          width: 90,
          align: 'center',
          render: (checked: boolean, record: CreditSampleItem) => (
            <Checkbox
              checked={checked}
              disabled={readOnly}
              onChange={(e) => {
                handleCellChange(record.id, 'includeInReport', e.target.checked);
                handleSaveRow({ ...record, includeInReport: e.target.checked });
              }}
            />
          ),
        },
      ],
    },
  ];
}
