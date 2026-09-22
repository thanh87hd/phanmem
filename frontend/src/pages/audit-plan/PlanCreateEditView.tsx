import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Form,
  Input,
  InputNumber,
  Tag,
  Row,
  Col,
  Select,
  Spin,
  Tabs,
  Badge,
  Tooltip,
  Empty,
  Divider,
  message,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  CloseOutlined,
  PlusOutlined,
  AlertOutlined,
  BulbOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import DynamicFormRenderer from '../../components/DynamicFormRenderer';

const { Title, Text } = Typography;
const { Option } = Select;

export interface PlanCreateEditViewProps {
  editingRecord: any | null;
  onClose: () => void;
  onSave: () => void;
  form: FormInstance;
  totalUnits: number;
  totalEstDays: number;
  totalKtvCount: number;
  uncoveredHighRiskUnits: any[];
  setUncoveredHighRiskUnits: React.Dispatch<React.SetStateAction<any[]>>;
  planYear: number;
  setSelectedUnits: React.Dispatch<React.SetStateAction<any[]>>;
  prioritizedSuggestions: any[];
  activeUniverseTab: string;
  setActiveUniverseTab: (tab: string) => void;
  getMetricsByCategory: (key: string) => { count: number; days: number; ktvs: number };
  cmLoading: boolean;
  fetchCmRecommendations: () => void;
  filterRiskRating: string | undefined;
  setFilterRiskRating: (val?: string) => void;
  universeSearch: string;
  setUniverseSearch: (val: string) => void;
  universeLoading: boolean;
  universeRowSelection: any;
  filteredUniverse: any[];
  renderRiskTag: (rating: string) => React.ReactNode;
  selectedUnits: any[];
  updateUnitField: (universeId: number, field: string, val: any) => void;
  usersList: any[];
  isLowRisk: (level: string) => boolean;
}

export const PlanCreateEditView: React.FC<PlanCreateEditViewProps> = ({
  editingRecord,
  onClose,
  onSave,
  form,
  totalUnits,
  totalEstDays,
  totalKtvCount,
  uncoveredHighRiskUnits,
  setUncoveredHighRiskUnits,
  planYear,
  setSelectedUnits,
  prioritizedSuggestions,
  activeUniverseTab,
  setActiveUniverseTab,
  getMetricsByCategory,
  cmLoading,
  fetchCmRecommendations,
  filterRiskRating,
  setFilterRiskRating,
  universeSearch,
  setUniverseSearch,
  universeLoading,
  universeRowSelection,
  filteredUniverse,
  renderRiskTag,
  selectedUnits,
  updateUnitField,
  usersList,
  isLowRisk,
}) => {
  const { t } = useTranslation();

  return (
    <div className="animate-fadeIn p-1">
      {/* Premium Header with Back/Home button */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 bg-transparent">
        <div className="flex items-center gap-4">
          <Button 
            onClick={onClose} 
            className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-10"
            icon={<CloseOutlined />}
          >
            ← Quay lại danh sách
          </Button>
          <div>
            <Title level={3} className="!mb-1 text-slate-800">
              {editingRecord ? [t('auditPlan.titles.edit', 'Cập nhật Kế hoạch Kiểm toán Năm')] : t('auditPlan.titles.add', 'Tạo Kế hoạch Kiểm toán Năm mới')}
            </Title>
            <Text type="secondary" className="text-sm">
              {t('auditPlan.subtitles.setup', 'Thiết lập thông tin chung, chọn đối tượng từ Universe và phân bổ nguồn lực ban đầu.')}
            </Text>
          </div>
        </div>
        <Space>
          <Button onClick={onClose} className="rounded-xl shadow-sm h-10 px-5">
            {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
          </Button>
          <Button 
            type="primary" 
            onClick={onSave} 
            className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 px-6"
          >
            {t('auditPlan.actions.saveDraft', 'Lưu bản nháp')}
          </Button>
        </Space>
      </div>

      <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
        <Form form={form} layout="vertical">
          <Tabs defaultActiveKey="1" className="premium-tabs">
            {/* Tab 1: General Info & Resource Summary */}
            <Tabs.TabPane tab="1. Thông tin chung & Nguồn lực" key="1">
              <Row gutter={24} className="mt-2">
                <Col span={8}>
                  <Form.Item name="year" label={<span className="font-semibold text-slate-700">Năm kế hoạch</span>} rules={[{ required: true, message: 'Nhập năm kế hoạch' }]}>
                    <InputNumber min={2020} max={2099} className="w-full rounded-lg" style={{ height: 40, paddingTop: 4 }} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="name" label={<span className="font-semibold text-slate-700">Tên Kế hoạch kiểm toán</span>} rules={[{ required: true, message: 'Nhập tên kế hoạch' }]}>
                    <Input className="rounded-lg" style={{ height: 40 }} placeholder="Ví dụ: Kế hoạch Kiểm toán nội bộ năm 2027" />
                  </Form.Item>
                </Col>
              </Row>

              {/* Resource Dashboard Cards */}
              <div className="mt-6 mb-2">
                <Text className="font-semibold text-slate-700 block mb-3 text-sm">Tóm tắt Nguồn lực Kế hoạch Dự kiến</Text>
                <Row gutter={16}>
                  <Col span={8}>
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                      <div className="absolute right-[-10px] top-[-10px] text-blue-200 opacity-20 text-6xl font-bold font-serif">N</div>
                      <Text type="secondary" className="text-xs uppercase font-bold tracking-wider block text-blue-700 mb-1">Số đơn vị kiểm toán</Text>
                      <Title level={2} className="!mb-0 text-blue-900 font-bold">{totalUnits} <span className="text-sm font-medium text-blue-600">quy trình</span></Title>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                      <div className="absolute right-[-10px] top-[-10px] text-amber-200 opacity-20 text-6xl font-bold font-serif">D</div>
                      <Text type="secondary" className="text-xs uppercase font-bold tracking-wider block text-amber-700 mb-1">Tổng ngày công thực địa</Text>
                      <Title level={2} className="!mb-0 text-amber-900 font-bold">{totalEstDays} <span className="text-sm font-medium text-amber-600">ngày công</span></Title>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                      <div className="absolute right-[-10px] top-[-10px] text-emerald-200 opacity-20 text-6xl font-bold font-serif">K</div>
                      <Text type="secondary" className="text-xs uppercase font-bold tracking-wider block text-emerald-700 mb-1">Kiểm toán viên điều động</Text>
                      <Title level={2} className="!mb-0 text-emerald-900 font-bold">{totalKtvCount} <span className="text-sm font-medium text-emerald-600">lượt KTV</span></Title>
                    </div>
                  </Col>
                </Row>
              </div>
              
              <DynamicFormRenderer entityType="AuditPlan" form={form} initialValues={editingRecord} />
            </Tabs.TabPane>

            {/* Tab 2: Selection from Audit Universe */}
            <Tabs.TabPane tab="2. Lựa chọn Đối tượng (Universe)" key="2">
              {/* Smart Suggestion Panel for Uncovered High Risk Units */}
              {uncoveredHighRiskUnits.length > 0 && (
                <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-xs flex flex-col gap-2 transition-all duration-300">
                  <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                    <AlertOutlined className="text-rose-500 text-base" />
                    <span>CẢNH BÁO RỦI RO CAO CHƯA COVER: Phát hiện {uncoveredHighRiskUnits.length} đối tượng có mức rủi ro CAO/RẤT CAO trong năm {planYear} chưa được đưa vào kế hoạch:</span>
                  </div>
                  <div className="space-y-2 mt-1">
                    {uncoveredHighRiskUnits.map((s: any) => (
                      <div key={s.universeId} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-2xs hover:border-rose-200 transition-all duration-200">
                        <div>
                          <Badge status="error" text={<span className="font-bold text-slate-800 text-sm">{s.universeName}</span>} />
                          <Text type="secondary" className="text-xs block ml-4">
                            Mức RR: <Tag color="red" className="scale-90 font-bold m-0">{s.riskLevel}</Tag> | Điểm RR còn lại: <strong className="text-rose-600">{typeof s.residualRiskScore === 'number' ? Number(s.residualRiskScore.toFixed(1)) : (s.residualRiskScore || '—')}</strong> | Tần suất đề xuất: <strong>{s.auditFrequency === 'Annual' ? [t('auditPlan.tabs2.annual', 'Hàng năm')] : s.auditFrequency}</strong>
                          </Text>
                        </div>
                        <Button 
                          type="primary" 
                          danger
                          size="small" 
                          icon={<PlusOutlined />}
                          className="bg-rose-600 hover:bg-rose-700 border-none rounded-md px-3 font-semibold text-xs text-white"
                          onClick={() => {
                            setSelectedUnits((prev: any[]) => {
                              const exists = prev.some((item: any) => item.universeId === s.universeId);
                              if (exists) return prev;
                              return [
                                ...prev,
                                {
                                  universeId: s.universeId,
                                  name: s.universeName || s.name || '',
                                  riskLevel: s.riskLevel,
                                  justification: 'Ưu tiên đưa vào kế hoạch do đối tượng có mức rủi ro cao chưa được bao phủ.',
                                  estDays: 12,
                                  ktvCount: 4,
                                }
                              ];
                            });
                            setUncoveredHighRiskUnits((prev: any[]) => prev.filter((item: any) => item.universeId !== s.universeId));
                            message.success(`Đã thêm đối tượng rủi ro cao "${s.universeName}" vào kế hoạch`);
                          }}
                        >
                          Đưa vào KH
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Smart Suggestion Panel */}
              {prioritizedSuggestions.length > 0 && (
                <div className="mb-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200 shadow-xs flex flex-col gap-2 transition-all duration-300">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                    <BulbOutlined className="text-amber-500 text-base" />
                    <span>Gợi ý lập kế hoạch: Phát hiện {prioritizedSuggestions.length} đối tượng được hoãn/ưu tiên từ đợt trước:</span>
                  </div>
                  <div className="space-y-2 mt-1">
                    {prioritizedSuggestions.map((s: any) => (
                      <div key={s.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-2xs hover:border-amber-200 transition-all duration-200">
                        <div>
                          <Badge status="processing" color="gold" text={<span className="font-bold text-slate-800 text-sm">{s.name}</span>} />
                          <Text type="secondary" className="text-xs block ml-4 italic">"Quy trình bị hoãn: {s.priorityReason}"</Text>
                        </div>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<PlusOutlined />}
                          className="bg-amber-600 hover:bg-amber-700 border-none rounded-md px-3 font-semibold text-xs"
                          onClick={() => {
                            setSelectedUnits(prev => [
                              ...prev,
                              {
                                universeId: s.id,
                                name: s.name,
                                riskLevel: s.dynamicRiskRating || 'Low',
                                justification: s.priorityReason || '',
                                estDays: 10,
                                ktvCount: 3,
                              }
                            ]);
                            message.success(`Đã thêm nhanh quy trình "${s.name}" vào danh sách`);
                          }}
                        >
                          Bổ sung ngay
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs for choosing category */}
              <div className="mt-2 mb-3">
                <Tabs 
                  activeKey={activeUniverseTab} 
                  onChange={setActiveUniverseTab}
                  size="small"
                  type="card"
                  className="universe-subtabs"
                  items={[
                    { key: 'All', label: '🌐 Tất cả đối tượng' },
                    { key: 'HoiSo', label: '🏢 Hội sở' },
                    { key: 'ChiNhanh', label: '🏦 Chi nhánh' },
                    { key: 'PGD', label: '📍 Phòng giao dịch lớn' },
                    { key: 'PGDBD', label: '📮 PGD Bưu điện (PGDBD)' },
                    { key: 'CongTyCon', label: '🏭 Công ty trực thuộc' },
                    { key: 'HeThong', label: '💻 Hệ thống CNTT & Mô hình' },
                    { key: 'ChuyenDe', label: '📋 Nghiệp vụ' },
                  ]}
                />
              </div>

              {/* Resource balancing summary strip */}
              <div className="bg-[#f8fafc] p-3.5 rounded-xl border border-slate-200 mb-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ color: '#475569', fontSize: 12, letterSpacing: '0.05em' }}>
                    ⚖️ CÂN ĐỐI NGUỒN LỰC VÀ PHÂN BỔ THEO NHÓM KIỂM TOÁN
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }} className="italic font-medium text-slate-500">
                    (Nhấp chọn các nhóm để lọc nhanh danh sách hoặc xem nguồn lực đã phân bổ)
                  </Text>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { key: 'HoiSo', label: t('auditPlan.tabs2.filter.hoiso', 'Hội sở'), color: 'blue', icon: '🏢' },
                    { key: 'ChiNhanh', label: t('auditPlan.tabs2.filter.chinhanh', 'Chi nhánh'), color: 'orange', icon: '🏦' },
                    { key: 'PGD', label: 'PGD', color: 'green', icon: '📍' },
                    { key: 'HeThong', label: 'CNTT', color: 'pink', icon: '💻' },
                    { key: 'ChuyenDe', label: t('auditPlan.tabs2.filter.chuyende', 'Nghiệp vụ'), color: 'purple', icon: '📋' },
                  ].map(group => {
                    const m = getMetricsByCategory(group.key);
                    const isSelected = activeUniverseTab === group.key;
                    return (
                      <div 
                        key={group.key}
                        onClick={() => setActiveUniverseTab(group.key)}
                        style={{
                          flex: '1',
                          minWidth: '120px',
                          padding: '8px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #ea9105' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#fffdfa' : '#f8fafc',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 1px 3px rgba(234,145,5,0.1)' : 'none',
                        }}
                        className="hover:shadow-sm"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12 }}>{group.icon}</span>
                          <Text strong style={{ fontSize: 11, color: '#334155' }}>{group.label}</Text>
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Badge 
                            count={m.count} 
                            showZero 
                            style={{ backgroundColor: m.count > 0 ? '#ea9105' : '#94a3b8', scale: 0.8 }} 
                          />
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>{m.days} ngày công</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4 flex justify-between items-center gap-4 mt-2">
                <Text type="secondary" className="text-sm">Lựa chọn các đơn vị hoặc quy trình từ **Audit Universe** để đưa vào kế hoạch kiểm toán năm.</Text>
                <Space>
                  <Button
                    icon={<RadarChartOutlined style={{ color: '#ea9105' }} />}
                    loading={cmLoading}
                    onClick={fetchCmRecommendations}
                    className="font-semibold text-amber-700 border-amber-300 hover:border-amber-500 rounded-lg shadow-sm"
                  >
                    ⚡ Gợi ý từ Giám sát liên tục
                  </Button>
                  <Select
                    allowClear
                    placeholder="Lọc mức rủi ro"
                    style={{ width: 150 }}
                    value={filterRiskRating}
                    onChange={setFilterRiskRating}
                    className="rounded-lg"
                  >
                    <Option value="High">Cao / Rất cao</Option>
                    <Option value="Medium">{t('auditPlan.tabs2.filterRisk.medium', 'Trung bình')}</Option>
                    <Option value="Low">{t('auditPlan.tabs2.filterRisk.low', 'Thấp')}</Option>
                  </Select>
                  <Input
                    placeholder="Lọc quy trình trong Universe..."
                    value={universeSearch}
                    onChange={(e) => setUniverseSearch(e.target.value)}
                    style={{ width: 220 }}
                    className="rounded-lg shadow-sm"
                    allowClear
                  />
                </Space>
              </div>

              {universeLoading ? (
                <div className="text-center py-12"><Spin tip="Đang tải danh sách Universe..." /></div>
              ) : (
                <Table
                  rowSelection={universeRowSelection}
                  dataSource={filteredUniverse}
                  rowKey="id"
                  columns={[
                    {
                      title: 'Mã đơn vị',
                      dataIndex: 'departmentCode',
                      key: 'departmentCode',
                      width: 120,
                    },
                    {
                      title: 'Quy trình / Đơn vị kiểm toán',
                      dataIndex: 'name',
                      key: 'name',
                      className: 'font-semibold text-slate-800',
                      width: 250,
                      ellipsis: true,
                      render: (name: string, record: any) => (
                        <Space>
                          <span>{name}</span>
                          {record.planningPriority === 'Prioritized' && (
                            <Tag color="gold" className="m-0 font-bold text-[10px] scale-90">ƯU TIÊN CARRYOVER</Tag>
                          )}
                        </Space>
                      )
                    },
                    {
                      title: t('auditEngagements.classify', 'Phân loại'),
                      dataIndex: 'auditCategory',
                      key: 'auditCategory',
                      width: 130,
                      render: (cat: string) => <Tag color="geekblue">{cat}</Tag>
                    },
                    {
                      title: 'Đơn vị phụ trách',
                      dataIndex: 'department',
                      key: 'department',
                      width: 180,
                      ellipsis: true,
                    },
                    {
                      title: 'Mức rủi ro',
                      dataIndex: 'dynamicRiskRating',
                      key: 'dynamicRiskRating',
                      width: 130,
                      render: (rating: string) => renderRiskTag(rating)
                    }
                  ]}
                  pagination={{ pageSize: 5 }}
                  size="small"
                  scroll={{ x: 810 }}
                  className="border border-slate-100 rounded-lg shadow-inner overflow-hidden"
                />
              )}
            </Tabs.TabPane>

            {/* Tab 3: Detailed estimates & justifications */}
            <Tabs.TabPane tab={`3. Chi tiết Nguồn lực & Giải trình (${selectedUnits.length})`} key="3">
              <div className="mb-4 mt-2">
                <Text type="secondary" className="text-sm">Ước tính số ngày kiểm toán, số lượng KTV và **bắt buộc nhập lý do giải trình** đối với các đối tượng có mức rủi ro **Thấp**.</Text>
              </div>

              {selectedUnits.length === 0 ? (
                <Empty description="Chưa có đối tượng kiểm toán nào được chọn. Vui lòng chọn ở Tab 2." className="my-10" />
              ) : (
                <Table
                  dataSource={selectedUnits}
                  rowKey="universeId"
                  pagination={false}
                  size="small"
                  scroll={{ x: 1100 }}
                  className="border border-slate-100 rounded-lg shadow-sm"
                  columns={[
                    {
                      title: t('auditPlan.tabs3.cols.process', 'Quy trình / Đơn vị'),
                      dataIndex: 'name',
                      key: 'name',
                      width: 220,
                      ellipsis: true,
                      render: (name: string, record: any) => (
                        <Space orientation="vertical" size={2}>
                          <Text className="font-semibold text-slate-800 text-sm">{name}</Text>
                          {renderRiskTag(record.riskLevel)}
                        </Space>
                      )
                    },
                    {
                      title: 'Ngày công dự kiến',
                      dataIndex: 'estDays',
                      key: 'estDays',
                      width: 140,
                      render: (val: number, record: any) => (
                        <InputNumber
                          min={1}
                          max={999}
                          value={val}
                          className="w-full rounded-md"
                          onChange={(v) => updateUnitField(record.universeId, 'estDays', v)}
                        />
                      )
                    },
                    {
                      title: 'Số KTV tham gia',
                      dataIndex: 'ktvCount',
                      key: 'ktvCount',
                      width: 130,
                      render: (val: number, record: any) => (
                        <InputNumber
                          min={1}
                          max={99}
                          value={val}
                          className="w-full rounded-md"
                          onChange={(v) => updateUnitField(record.universeId, 'ktvCount', v)}
                        />
                      )
                    },
                    {
                      title: 'Tháng dự kiến',
                      dataIndex: 'scheduledMonth',
                      key: 'scheduledMonth',
                      width: 130,
                      render: (val: number, record: any) => (
                        <Select
                          placeholder="Chọn tháng"
                          value={val || undefined}
                          className="w-full rounded-md"
                          onChange={(m) => updateUnitField(record.universeId, 'scheduledMonth', m)}
                          allowClear
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <Option key={m} value={m}>Tháng {m < 10 ? `0${m}` : m}</Option>
                          ))}
                        </Select>
                      )
                    },
                    {
                      title: 'Trưởng đoàn dự kiến',
                      dataIndex: 'leadAuditorId',
                      key: 'leadAuditorId',
                      width: 180,
                      render: (val: number, record: any) => (
                        <Select
                          placeholder="Chọn Trưởng đoàn"
                          showSearch
                          optionFilterProp="children"
                          value={val || undefined}
                          className="w-full rounded-md"
                          onChange={(uId, option: any) => {
                            updateUnitField(record.universeId, 'leadAuditorId', uId);
                            updateUnitField(record.universeId, 'leadAuditorName', option?.children);
                          }}
                          allowClear
                        >
                          {usersList.map((u: any) => (
                            <Option key={u.id} value={u.id}>{u.fullName}</Option>
                          ))}
                        </Select>
                      )
                    },
                    {
                      title: 'Giải trình lý do chọn (Bắt buộc cho rủi ro Thấp)',
                      dataIndex: 'justification',
                      key: 'justification',
                      width: 300,
                      render: (val: string, record: any) => {
                        const isLow = isLowRisk(record.riskLevel);
                        if (isLow) {
                          const hasValue = val && val.trim() !== '';
                          return (
                            <div className="relative">
                              <Input.TextArea
                                rows={2}
                                value={val}
                                placeholder="⚠️ Điền chi tiết lý do lựa chọn quy trình rủi ro thấp này..."
                                className={`rounded-lg pr-8 text-sm ${!hasValue ? 'border-amber-400 bg-amber-50/20 hover:border-amber-500 focus:border-amber-500' : 'border-slate-200'}`}
                                onChange={(e) => updateUnitField(record.universeId, 'justification', e.target.value)}
                              />
                              {!hasValue && (
                                <Tooltip title="Bắt buộc phải giải trình đối tượng rủi ro thấp">
                                  <AlertOutlined className="absolute right-2 top-2 text-amber-500" />
                                </Tooltip>
                              )}
                            </div>
                          );
                        }
                        return <Text type="secondary" className="italic text-gray-400">{t('auditPlan.tabs3.noJustification', 'Không yêu cầu (Rủi ro cao/trung bình)')}</Text>;
                      }
                    }
                  ]}
                />
              )}
            </Tabs.TabPane>
          </Tabs>
        </Form>

        <Divider className="my-6" />

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} className="rounded-xl px-6 h-10">
            {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
          </Button>
          <Button 
            type="primary" 
            onClick={onSave} 
            className="rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none px-6 font-semibold h-10"
          >
            {t('auditPlan.actions.saveDraft', 'Lưu bản nháp')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
