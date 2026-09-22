import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Radio, message, Alert, Space, Typography, Row, Col, Divider, Tag, Card } from 'antd';
import { FormOutlined, AlertOutlined, SwapOutlined, HistoryOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ProposeChangeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  defaultCategory?: 'ORGANIZATION' | 'RISK' | 'DEFECT';
  targetItem?: any;
}

const UNIT_TYPE_OPTIONS = [
  { value: 'ChiNhanh', label: 'Chi nhánh Loại 1 / Loại 2', color: '#c41d7f' },
  { value: 'PGD', label: 'Phòng Giao dịch Lớn / Tiêu chuẩn', color: '#d4380d' },
  { value: 'PGDBD_TKBD', label: 'PGD Bưu điện (TKBĐ)', color: '#13c2c2' },
  { value: 'Khoi', label: 'Khối Hội sở chính', color: '#d97706' },
  { value: 'Phong', label: 'Phòng ban nghiệp vụ', color: '#389e0d' },
  { value: 'TrungTam', label: 'Trung tâm trực thuộc', color: '#531dab' },
];

const ProposeChangeModal: React.FC<ProposeChangeModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  defaultCategory = 'ORGANIZATION',
  targetItem,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [departmentList, setDepartmentList] = useState<any[]>([]);

  // Watch form fields for dynamic UI
  const category = Form.useWatch('category', form) || defaultCategory;
  const changeType = Form.useWatch('changeType', form);
  const selectedTargetId = Form.useWatch('targetId', form);

  useEffect(() => {
    if (visible && category === 'ORGANIZATION') {
      api.get('/departments').then((res) => setDepartmentList(res.data)).catch(() => {});
    }
  }, [visible, category]);

  // Selected item object (either passed via prop or picked in dropdown)
  const currentDept =
    targetItem ||
    departmentList.find((d) => d.id === selectedTargetId) ||
    null;

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const proposedData: Record<string, any> = {
        name: values.newDeptName || values.title,
        code: values.newDeptCode || currentDept?.code,
        unitType: values.newUnitType || currentDept?.unitType,
        parent: values.newParentCode || currentDept?.parent,
        functions: values.newFunctions || currentDept?.functions,
        decisionNumber: values.decisionNumber,
      };

      const currentData = currentDept
        ? {
            id: currentDept.id,
            code: currentDept.code,
            name: currentDept.name,
            unitType: currentDept.unitType,
            parent: currentDept.parent,
            functions: currentDept.functions,
            status: currentDept.status || 'Active',
          }
        : undefined;

      const payload = {
        category: values.category || defaultCategory,
        changeType: values.changeType,
        targetId: currentDept?.id,
        targetCode: currentDept?.code,
        title: values.title || (currentDept ? `Biến động: ${currentDept.name} -> ${values.newDeptName || ''}` : values.newDeptName),
        reason: values.reason,
        proposedData,
        currentData,
        isMidYearAddition: values.isMidYearAddition ?? true,
        riskImpactLevel: values.riskImpactLevel || 2,
      };

      await api.post('/master-data-changes', payload);
      message.success(
        'Đã gửi đề xuất thay đổi danh mục! Hệ thống sẽ tự động lưu Snapshot đơn vị cũ, chuyển giao điểm rủi ro và các phát hiện kiểm toán sau khi Lãnh đạo Khối duyệt.',
      );
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi gửi đề xuất thay đổi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FormOutlined className="text-amber-500" />
          <span>Đề Xuất Biến Động Tổ Chức & Thay Đổi Danh Mục (Change Governance)</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Gửi trình Lãnh đạo Phòng Soát Xét"
      cancelText="Hủy"
      width={780}
    >
      <Alert
        message="Kiểm Soát Biến Động ĐVKD, Snapshot Lịch Sử & Kế Thừa Rủi Ro"
        description="Khi phê duyệt nâng cấp/sáp nhập/chuyển đổi mô hình: Hệ thống tự động tạo Snapshot lưu trữ đơn vị cũ trong DepartmentHistory, cập nhật Universe Đánh giá rủi ro và chuyển giao toàn bộ các Finding/Kiến nghị chưa đóng sang đơn vị mới."
        type="info"
        showIcon
        className="mb-4"
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          category: defaultCategory,
          changeType: targetItem ? 'RESTRUCTURE' : 'ADD',
          targetId: targetItem?.id,
          isMidYearAddition: true,
          riskImpactLevel: 2,
          newUnitType: targetItem?.unitType || 'ChiNhanh',
          newDeptName: targetItem?.name || '',
          newDeptCode: targetItem?.code || '',
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="category" label="Phân loại Danh mục" rules={[{ required: true }]}>
              <Select disabled={!!defaultCategory}>
                <Option value="ORGANIZATION">🏢 Cơ cấu tổ chức (Chi nhánh / PGDBĐ / Khối)</Option>
                <Option value="RISK">⚠️ Danh mục Rủi ro (Audit Universe / Risk Criteria)</Option>
                <Option value="DEFECT">📋 Danh mục Lỗi (924 Lỗi THUCTE / Quy chuẩn)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="changeType" label="Hình thức biến động" rules={[{ required: true }]}>
              <Select>
                <Option value="ADD">Thêm mới hoàn toàn</Option>
                <Option value="RESTRUCTURE">Nâng cấp mô hình (PGD $\rightarrow$ Chi nhánh)</Option>
                <Option value="UPDATE">Sáp nhập / Điều chỉnh thông tin</Option>
                <Option value="DEACTIVATE">Vô hiệu hóa / Đóng cửa đơn vị</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* CHỌN ĐƠN VỊ CẦN THAY ĐỔI (NẾU CHƯA CÓ TRUYỀN VÀO SẴN) */}
        {category === 'ORGANIZATION' && changeType !== 'ADD' && !targetItem && (
          <Form.Item
            name="targetId"
            label="Chọn Đơn vị gốc hiện tại (Đơn vị cũ trước biến động)"
            rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}
          >
            <Select
              showSearch
              placeholder="Tìm kiếm mã hoặc tên đơn vị cũ..."
              optionFilterProp="children"
            >
              {departmentList.map((d) => (
                <Option key={d.id} value={d.id}>
                  [{d.code}] {d.name} — <Tag color="blue">{d.unitType}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* BẢNG SO SÁNH TRƯỚC VÀ SAU THAY ĐỔI */}
        {category === 'ORGANIZATION' && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
            <div className="flex items-center justify-between mb-2">
              <Text strong className="text-slate-800 flex items-center gap-1.5">
                <SwapOutlined className="text-amber-500" />
                So Sánh Số Liệu Trước & Sau Thay Đổi:
              </Text>
              <Tag color="cyan">Snapshot tự động</Tag>
            </div>

            <Row gutter={16}>
              {/* CỘT TRƯỚC THAY ĐỔI (CURRENT / SNAPSHOT) */}
              <Col span={12}>
                <Card size="small" className="bg-rose-50/50 border-rose-200" title={<span className="text-xs text-rose-800 font-bold">1. Số Liệu Đơn Vị Cũ (Trước Thay Đổi)</span>}>
                  {currentDept ? (
                    <div className="text-xs space-y-1 text-slate-700">
                      <div>• <b>Mã ĐVKD:</b> <Text code>{currentDept.code}</Text></div>
                      <div>• <b>Tên ĐVKD:</b> {currentDept.name}</div>
                      <div>• <b>Loại hình:</b> <Tag color="orange">{currentDept.unitType}</Tag></div>
                      <div>• <b>Đơn vị cha:</b> {currentDept.parent || 'Hội sở chính'}</div>
                      <div className="text-rose-600 font-semibold pt-1 border-t border-rose-200">
                        $\rightarrow$ Sẽ lưu Snapshot đóng băng kỳ lịch sử vào bảng <code>department_histories</code>.
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">Thành lập mới hoàn toàn (Chưa có dữ liệu cũ)</div>
                  )}
                </Card>
              </Col>

              {/* CỘT SAU THAY ĐỔI (PROPOSED / TARGET) */}
              <Col span={12}>
                <Card size="small" className="bg-emerald-50/50 border-emerald-200" title={<span className="text-xs text-emerald-800 font-bold">2. Số Liệu Mới Đề Xuất (Sau Thay Đổi)</span>}>
                  <div className="space-y-2">
                    <Form.Item name="newDeptCode" label="Mã ĐVKD Mới" className="!mb-1" rules={[{ required: true }]}>
                      <Input placeholder="VD: CN_TAYNGHEAN..." size="small" />
                    </Form.Item>
                    <Form.Item name="newDeptName" label="Tên ĐVKD Mới" className="!mb-1" rules={[{ required: true }]}>
                      <Input placeholder="VD: Chi nhánh Tây Nghệ An..." size="small" />
                    </Form.Item>
                    <Form.Item name="newUnitType" label="Loại hình ĐVKD Mới" className="!mb-1" rules={[{ required: true }]}>
                      <Select size="small">
                        {UNIT_TYPE_OPTIONS.map((u) => (
                          <Option key={u.value} value={u.value}>
                            {u.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <div className="text-emerald-700 text-[11px] font-semibold pt-1 border-t border-emerald-200">
                      $\rightarrow$ Tự động kế thừa điểm rủi ro Universe & chuyển toàn bộ Finding sang đơn vị mới.
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="decisionNumber"
              label="Số Quyết định phê duyệt / Tờ trình biến động"
              rules={[{ required: true, message: 'Vui lòng nhập số QĐ' }]}
            >
              <Input placeholder="VD: QĐ số 789/2026/QĐ-TGĐ ngày 15/06/2026..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="reason"
              label="Lý do / Căn cứ nâng cấp & chuyển đổi"
              rules={[{ required: true, message: 'Vui lòng nêu rõ lý do' }]}
            >
              <Input placeholder="VD: Nâng cấp PGD đủ điều kiện lên Chi nhánh..." />
            </Form.Item>
          </Col>
        </Row>

        {/* BSC-KPI EMERGING RISK INTEGRATION */}
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-2 space-y-2">
          <Text strong className="text-amber-800">
            ⭐ Tích hợp Đánh giá Rủi ro Mới & Điểm Thưởng BSC-KPI (MB02.HRM.2026):
          </Text>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isMidYearAddition" label="Phát sinh mới ngoài Baseline đầu năm?" className="!mb-0">
                <Radio.Group>
                  <Radio value={true}>Có (Được tính Rủi ro Mới)</Radio>
                  <Radio value={false}>Không</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="riskImpactLevel" label="Mức độ tác động rủi ro" className="!mb-0">
                <Select>
                  <Option value={1}>Mức 1 - Thấp (+1.0 điểm BSC)</Option>
                  <Option value={2}>Mức 2 - Trung bình (+3.0 điểm BSC)</Option>
                  <Option value={3}>Mức 3 - Trọng yếu (+5.0 điểm BSC)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>
    </Modal>
  );
};

export default ProposeChangeModal;
