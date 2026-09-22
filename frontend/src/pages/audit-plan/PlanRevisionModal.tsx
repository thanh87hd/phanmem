import React from 'react';
import {
  Modal,
  Row,
  Col,
  Form,
  Select,
  Input,
  Tabs,
  Typography,
  Table,
  Space,
  Tag,
  InputNumber,
  Popover,
  Checkbox,
  Button,
  Tooltip,
  Card
} from 'antd';
import {
  HistoryOutlined,
  CloseCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { Option } = Select;

export interface PlanRevisionModalProps {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
  reviewPlan: any;
  reviewPeriod: string;
  setReviewPeriod: (val: string) => void;
  reviewNotes: string;
  setReviewNotes: (val: string) => void;
  reviewSelectedUnits: any[];
  handleUpdateReviewUnitField: (universeId: string, field: 'estDays' | 'ktvCount', val: number | null) => void;
  removedUnitsLog: Record<string, { reason: string; nextPeriodPriority: boolean }>;
  setRemovedUnitsLog: React.Dispatch<React.SetStateAction<Record<string, { reason: string; nextPeriodPriority: boolean }>>>;
  handleRemoveUnitFromRevision: (universeId: string, name: string) => void;
  updateReasons: Record<string, string>;
  setUpdateReasons: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  reviewTabSearch: string;
  setReviewTabSearch: (val: string) => void;
  filteredUniverseForReview: any[];
  addedReasons: Record<string, string>;
  setAddedReasons: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAddUnitToRevision: (record: any) => void;
  renderRiskTag: (risk: string) => React.ReactNode;
}

export const PlanRevisionModal: React.FC<PlanRevisionModalProps> = ({
  open,
  onOk,
  onCancel,
  reviewPlan,
  reviewPeriod,
  setReviewPeriod,
  reviewNotes,
  setReviewNotes,
  reviewSelectedUnits,
  handleUpdateReviewUnitField,
  removedUnitsLog,
  setRemovedUnitsLog,
  handleRemoveUnitFromRevision,
  updateReasons,
  setUpdateReasons,
  reviewTabSearch,
  setReviewTabSearch,
  filteredUniverseForReview,
  addedReasons,
  setAddedReasons,
  handleAddUnitToRevision,
  renderRiskTag
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><HistoryOutlined /></span>
          <div>
            <Title level={4} className="!mb-0 text-slate-800">Đánh giá & Điều chỉnh Kế hoạch Kiểm toán Năm</Title>
            <Text type="secondary" className="text-xs font-normal">Thiết lập kỳ review, bổ sung hoặc dời kiểm toán quy trình hiện tại, lưu chuyển carryover.</Text>
          </div>
        </div>
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={t('common.btnConfirmAdjust', 'Xác nhận Điều chỉnh')}
      cancelText={t('common.btnCancel', 'Hủy')}
      width={1050}
      style={{ top: 25 }}
      className="premium-modal"
    >
      {reviewPlan && (
        <div className="mt-4 space-y-4">
          {/* General parameters */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={<span className="font-semibold text-slate-700">Tên Đợt Review / Điều chỉnh</span>} required>
                <Select value={reviewPeriod} onChange={setReviewPeriod} className="rounded-lg w-full">
                  <Option value={t('auditPlan.reviewOptions.semiAnnual', 'Đánh giá Bán niên')}>{t('auditPlan.reviewOptions.semiAnnual', 'Đánh giá Bán niên')}</Option>
                  <Option value={t('auditPlan.reviewOptions.q3', 'Đánh giá Quý 3')}>{t('auditPlan.reviewOptions.q3', 'Đánh giá Quý 3')}</Option>
                  <Option value={t('auditPlan.reviewOptions.periodic', 'Điều chỉnh Lập kế hoạch Định kỳ')}>{t('auditPlan.reviewOptions.periodic', 'Điều chỉnh Lập kế hoạch Định kỳ')}</Option>
                  <Option value={t('auditPlan.reviewOptions.adHoc', 'Điều chỉnh Đột xuất phát sinh')}>{t('auditPlan.reviewOptions.adHoc', 'Điều chỉnh Đột xuất phát sinh')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label={<span className="font-semibold text-slate-700">Chỉ đạo phê duyệt đợt Review / Lý do điều chỉnh chung</span>}>
                <Input 
                  value={reviewNotes} 
                  onChange={(e) => setReviewNotes(e.target.value)} 
                  placeholder="Ví dụ: Thay đổi do biến động nhân lực phòng ban, bổ sung cuộc kiểm toán quan trọng theo yêu cầu Ban kiểm soát" 
                  className="rounded-lg" 
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Review Workspaces Tabs */}
          <Tabs type="card" className="review-tabs">
            {/* Tab Review A: Current Items in Plan */}
            <Tabs.TabPane tab={<span className="font-bold text-xs uppercase tracking-wide">1. Đơn vị trong kế hoạch hiện tại ({reviewSelectedUnits.length})</span>} key="ra">
              <Text type="secondary" className="text-xs block mb-3">Danh sách quy trình đang lên lịch năm. Bạn có thể thay đổi nhân sự, ngày công, hoặc **Loại bỏ** (Hoãn kiểm toán để chuyển tiếp sang năm sau).</Text>
              
              <Table
                dataSource={reviewSelectedUnits}
                rowKey="universeId"
                pagination={false}
                size="small"
                scroll={{ x: 870 }}
                className="border border-slate-100 rounded-lg shadow-2xs"
                columns={[
                  {
                    title: 'Tên Quy trình / Đơn vị',
                    dataIndex: 'name',
                    key: 'name',
                    width: 250,
                    ellipsis: true,
                    render: (name: string, record: any) => {
                      const original = reviewPlan.selectedUnits?.find((u: any) => u.universeId === record.universeId);
                      const isChanged = original && (original.estDays !== record.estDays || original.ktvCount !== record.ktvCount);
                      return (
                        <Space orientation="vertical" size={1}>
                          <span className="font-bold text-slate-800 text-sm">{name}</span>
                          <Space size="small">
                            {renderRiskTag(record.riskLevel)}
                            {isChanged && <Tag color="cyan" className="text-[10px] m-0 font-semibold uppercase">Thay đổi</Tag>}
                          </Space>
                        </Space>
                      );
                    }
                  },
                  {
                    title: 'Ước tính Ngày công',
                    dataIndex: 'estDays',
                    key: 'estDays',
                    width: 140,
                    render: (val: number, record: any) => (
                      <InputNumber
                        min={1}
                        value={val}
                        className="w-full rounded-md"
                        onChange={(v) => handleUpdateReviewUnitField(record.universeId, 'estDays', v)}
                      />
                    )
                  },
                  {
                    title: 'Số KTV thực địa',
                    dataIndex: 'ktvCount',
                    key: 'ktvCount',
                    width: '15%',
                    render: (val: number, record: any) => (
                      <InputNumber
                        min={1}
                        value={val}
                        className="w-full rounded-md"
                        onChange={(v) => handleUpdateReviewUnitField(record.universeId, 'ktvCount', v)}
                      />
                    )
                  },
                  {
                    title: 'Hành động rà soát',
                    key: 'reviewAction',
                    width: '40%',
                    render: (_: any, record: any) => (
                      <Space>
                        <Popover
                          trigger="click"
                          title={<span className="font-bold text-slate-800 text-sm">⚠️ Thiết lập Hoãn kiểm toán (Carryover)</span>}
                          content={
                            <div className="space-y-3 w-[320px] p-1">
                              <Text type="secondary" className="text-xs block">Quy trình này sẽ bị loại bỏ khỏi kế hoạch năm nay. Xác nhận lý do hoãn:</Text>
                              <Input.TextArea 
                                rows={2} 
                                placeholder="Nhập lý do chi tiết..." 
                                className="text-xs rounded-lg"
                                onChange={(e) => {
                                  setRemovedUnitsLog(prev => ({
                                    ...prev,
                                    [record.universeId]: {
                                      reason: e.target.value,
                                      nextPeriodPriority: prev[record.universeId]?.nextPeriodPriority ?? true
                                    }
                                  }));
                                }}
                              />
                              <Checkbox 
                                defaultChecked 
                                className="text-xs"
                                onChange={(e) => {
                                  setRemovedUnitsLog(prev => ({
                                    ...prev,
                                    [record.universeId]: {
                                      reason: prev[record.universeId]?.reason || t('auditPlan.review.defaultPostponeReason', 'Hoãn kiểm toán đơn vị'),
                                      nextPeriodPriority: e.target.checked
                                    }
                                  }));
                                }}
                              >
                                <strong>Ưu tiên kiểm toán trong kỳ tiếp theo</strong> (Carryover)
                              </Checkbox>
                              <Button 
                                type="primary" 
                                danger 
                                size="small" 
                                className="w-full rounded font-bold"
                                onClick={() => handleRemoveUnitFromRevision(record.universeId, record.name)}
                              >
                                Xác nhận Loại bỏ
                              </Button>
                            </div>
                          }
                        >
                          <Button type="primary" danger size="small" icon={<CloseCircleOutlined />} className="rounded">
                            Loại bỏ (Hoãn)
                          </Button>
                        </Popover>
                        
                        {updateReasons[record.universeId] && (
                          <Tooltip title="Lý do thay đổi chỉ biên nhân lực">
                            <Input 
                              size="small"
                              placeholder="Ghi chú lý do đổi định biên..." 
                              value={updateReasons[record.universeId]}
                              className="text-xs rounded w-48"
                              onChange={(e) => {
                                setUpdateReasons(prev => ({
                                  ...prev,
                                  [record.universeId]: e.target.value
                                }));
                              }}
                            />
                          </Tooltip>
                        )}
                      </Space>
                    )
                  }
                ]}
              />
            </Tabs.TabPane>

            {/* Tab Review B: Add from Audit Universe */}
            <Tabs.TabPane tab={<span className="font-bold text-xs uppercase tracking-wide">2. Bổ sung từ Audit Universe</span>} key="rb">
              <div className="flex justify-between items-center gap-4 mb-3">
                <Text type="secondary" className="text-xs">Tìm kiếm và bổ sung đột xuất các quy trình từ **Audit Universe** vào kế hoạch kiểm toán năm nay.</Text>
                <Input 
                  placeholder="Tìm quy trình..." 
                  size="small"
                  value={reviewTabSearch} 
                  onChange={(e) => setReviewTabSearch(e.target.value)} 
                  style={{ width: 220 }}
                  className="rounded"
                  allowClear
                />
              </div>

              <Table
                dataSource={filteredUniverseForReview}
                rowKey="id"
                pagination={{ pageSize: 4 }}
                size="small"
                scroll={{ x: 770 }}
                className="border border-slate-100 rounded-lg shadow-2xs"
                columns={[
                  {
                    title: t('auditPlan.tabs3.cols.process', 'Quy trình / Đơn vị'),
                    dataIndex: 'name',
                    key: 'name',
                    width: 240,
                    ellipsis: true,
                    render: (name: string, record: any) => (
                      <Space>
                        <span className="font-semibold text-slate-800">{name}</span>
                        {record.planningPriority === 'Prioritized' && (
                          <Tag color="gold" className="m-0 font-bold text-[9px] scale-90">ƯU TIÊN CARRYOVER 🌟</Tag>
                        )}
                      </Space>
                    )
                  },
                  {
                    title: 'Mức rủi ro',
                    dataIndex: 'dynamicRiskRating',
                    key: 'dynamicRiskRating',
                    width: 140,
                    render: (risk: string) => renderRiskTag(risk)
                  },
                  {
                    title: 'Lý do bổ sung đột xuất',
                    key: 'addReason',
                    width: '40%',
                    render: (_: any, record: any) => (
                      <Input 
                        placeholder="Lý do bổ sung..." 
                        size="small"
                        defaultValue={addedReasons[record.id] || ''}
                        className="rounded text-xs w-full"
                        onChange={(e) => {
                          setAddedReasons(prev => ({
                            ...prev,
                            [record.id]: e.target.value
                          }));
                        }}
                      />
                    )
                  },
                  {
                    title: t('auditTemplates.cols.action', 'Thao tác'),
                    key: 'addAction',
                    width: '12%',
                    align: 'center',
                    render: (_: any, record: any) => (
                      <Button 
                        type="primary" 
                        size="small" 
                        icon={<PlusOutlined />} 
                        className="bg-emerald-600 hover:bg-emerald-700 border-none rounded"
                        onClick={() => handleAddUnitToRevision(record)}
                      >
                        {t('auditFindings.additional', 'Bổ sung')}
                      </Button>
                    )
                  }
                ]}
              />
            </Tabs.TabPane>

            {/* Tab Review C: Revision Summary Changes (Diff) */}
            <Tabs.TabPane tab={<span className="font-bold text-xs uppercase tracking-wide">3. Bảng tổng hợp Thay đổi (Real-time Diff)</span>} key="rc">
              <Text type="secondary" className="text-xs block mb-4">Các thay đổi sẽ được ghi nhận và nộp dưới dạng **Kỳ review** của kế hoạch.</Text>
              
              <div className="space-y-4">
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title={<span className="text-xs font-bold text-emerald-800">✅ Đơn vị Bổ sung</span>} className="bg-emerald-50/20 border-emerald-100 rounded-xl">
                      {reviewSelectedUnits.filter(u => !reviewPlan.selectedUnits?.some((ou: any) => ou.universeId === u.universeId)).length === 0 ? (
                        <Text type="secondary" className="text-xs italic">Không có đơn vị bổ sung mới.</Text>
                      ) : (
                        reviewSelectedUnits
                          .filter(u => !reviewPlan.selectedUnits?.some((ou: any) => ou.universeId === u.universeId))
                          .map(u => (
                            <div key={u.universeId} className="border-b border-emerald-100/50 py-2 text-xs flex justify-between items-start">
                              <div>
                                <span className="font-bold block text-emerald-950">{u.name}</span>
                                <span className="text-gray-500 text-[10px]">Ngày công: {u.estDays} | KTV: {u.ktvCount}</span>
                              </div>
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.5 rounded text-[9px] uppercase">{t('auditFindings.additional', 'Bổ sung')}</span>
                            </div>
                          ))
                      )}
                    </Card>
                  </Col>

                  <Col span={12}>
                    <Card size="small" title={<span className="text-xs font-bold text-rose-800">❌ Đơn vị Loại bỏ / Hoãn</span>} className="bg-rose-50/20 border-rose-100 rounded-xl">
                      {Object.keys(removedUnitsLog).length === 0 ? (
                        <Text type="secondary" className="text-xs italic">Không có đơn vị bị loại bỏ.</Text>
                      ) : (
                        reviewPlan.selectedUnits
                          ?.filter((ou: any) => !reviewSelectedUnits.some(u => u.universeId === ou.universeId))
                          .map((ou: any) => {
                            const log = removedUnitsLog[ou.universeId] || { reason: 'Hoãn kiểm toán', nextPeriodPriority: true };
                            return (
                              <div key={ou.universeId} className="border-b border-rose-100/50 py-2 text-xs flex justify-between items-start">
                                <div>
                                  <span className="font-bold block text-rose-950">{ou.name}</span>
                                  <span className="text-rose-700 text-[10px] italic">Lý do: "{log.reason}"</span>
                                  {log.nextPeriodPriority && <span className="text-amber-600 block text-[9px] font-bold">🌟 Ưu tiên carryover kỳ sau</span>}
                                </div>
                                <span className="text-rose-700 font-semibold bg-rose-50 px-1 py-0.5 rounded text-[9px] uppercase">Loại bỏ</span>
                              </div>
                            );
                          })
                      )}
                    </Card>
                  </Col>
                </Row>
              </div>
            </Tabs.TabPane>
          </Tabs>
        </div>
      )}
    </Modal>
  );
};
