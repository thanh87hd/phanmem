import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, Form, Input, Select, Button, Space, Table, message, Tag, InputNumber, Radio, Divider } from 'antd';
import { SaveOutlined, FileDoneOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

interface SampleTestingDrawerProps {
  open: boolean;
  onClose: () => void;
  sample: any | null;
  templateId?: number;
  onSaved: () => void;
}

const SampleTestingDrawer: React.FC<SampleTestingDrawerProps> = ({ open, onClose, sample, templateId, onSaved }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [domainType, setDomainType] = useState<string>('CREDIT');
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data)).catch(console.error);
    api.get('/users').then(res => setUsers(res.data)).catch(console.error);
    api.get('/ai/knowledge').then(res => setKnowledgeList(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (open && templateId) {
      fetchTemplate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateId]);

  useEffect(() => {
    if (open && sample) {
      const sampleData = sample.sampleData || {};
      const detectedDomain = sample.batchDomain || sample.operationType === 'PTD' ? 'NON_CREDIT' : (sample.auditDomain || 'CREDIT');
      setDomainType(detectedDomain === 'NON_CREDIT' ? 'NON_CREDIT' : 'CREDIT');

      // Initialize form with sample data
      form.setFieldsValue({
        cifOrAccount: sample.cifOrAccount,
        customerName: sample.customerName || sampleData.customerName,
        // Credit fields
        outstandingBalance: sampleData.outstandingBalance || sampleData.amount || sample.amount,
        debtGroup: sampleData.debtGroup,
        referenceNo: sampleData.referenceNo || sample.referenceNo,
        collateralInfo: sampleData.collateralInfo || '',
        // Non-credit fields
        transactionType: sampleData.transactionType || sample.businessProcess || '',
        transactionAmount: sampleData.transactionAmount || sampleData.amount || sample.amount,
        channel: sampleData.channel || 'COUNTER',
        tellerOrOfficer: sampleData.tellerOrOfficer || sample.proposerOfficer || '',
        approverOfficer: sampleData.approverOfficer || sample.businessLeader || '',
        branchCode: sample.branchCode || sampleData.branchCode || '',
      });

      // Initialize assessments
      if (sample.sampleAssessments && sample.sampleAssessments.length > 0) {
        setAssessments(sample.sampleAssessments);
      } else if (template?.checklist) {
        const initialAssessments = template.checklist.map((item: any) => ({
          step: item.step,
          task: item.task,
          result: 'NOT_TESTED',
          notes: ''
        }));
        setAssessments(initialAssessments);
      } else {
        // Fallback default checklist based on domain if template checklist is absent
        const fallbackChecklist = detectedDomain === 'NON_CREDIT' ? [
          { step: 1, task: 'Kiểm tra tính đầy đủ, hợp lệ của hồ sơ/chứng từ giao dịch', result: 'NOT_TESTED', notes: '' },
          { step: 2, task: 'Kiểm tra tính tuân thủ quy định phân quyền hạn mức phê duyệt', result: 'NOT_TESTED', notes: '' },
          { step: 3, task: 'Kiểm tra xác thực khách hàng (eKYC / Chữ ký mẫu / CCCD)', result: 'NOT_TESTED', notes: '' },
          { step: 4, task: 'Kiểm tra khớp đúng số liệu hạch toán trên hệ thống Core', result: 'NOT_TESTED', notes: '' },
        ] : [
          { step: 1, task: 'Kiểm tra hồ sơ pháp lý và điều kiện cấp tín dụng của khách hàng', result: 'NOT_TESTED', notes: '' },
          { step: 2, task: 'Kiểm tra thẩm quyền phê duyệt tín dụng theo quy chế', result: 'NOT_TESTED', notes: '' },
          { step: 3, task: 'Kiểm tra định giá và quản lý tài sản bảo đảm', result: 'NOT_TESTED', notes: '' },
          { step: 4, task: 'Kiểm tra giải ngân, quản lý sau cho vay và giám sát dòng tiền', result: 'NOT_TESTED', notes: '' },
        ];
        setAssessments(fallbackChecklist);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sample, template]);

  async function fetchTemplate() {
    try {
      const res = await api.get(`/audit-templates/${templateId}`);
      setTemplate(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  const handleAssessmentChange = (idx: number, field: string, value: string) => {
    const newAssessments = [...assessments];
    newAssessments[idx][field] = value;
    setAssessments(newAssessments);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // Auto-fail logic & overall result assessment
      const hasFail = assessments.some(a => a.result === 'FAIL');
      const hasException = assessments.some(a => a.result === 'EXCEPTION');
      const allTested = assessments.length > 0 && assessments.every(a => a.result !== 'NOT_TESTED');
      
      let overallResult = sample.testResult;
      if (hasFail) {
        overallResult = 'FAIL';
      } else if (hasException) {
        overallResult = 'EXCEPTION';
      } else if (allTested) {
        overallResult = 'PASS';
      }

      const updateData = {
        cifOrAccount: values.cifOrAccount,
        customerName: values.customerName,
        operationType: domainType === 'NON_CREDIT' ? 'PTD' : 'TD',
        sampleData: {
          ...(sample.sampleData || {}),
          domainType,
          // Credit specifics
          outstandingBalance: values.outstandingBalance,
          debtGroup: values.debtGroup,
          referenceNo: values.referenceNo,
          collateralInfo: values.collateralInfo,
          // Non-credit specifics
          transactionType: values.transactionType,
          transactionAmount: values.transactionAmount,
          channel: values.channel,
          tellerOrOfficer: values.tellerOrOfficer,
          approverOfficer: values.approverOfficer,
          branchCode: values.branchCode,
        },
        sampleAssessments: assessments,
        testResult: overallResult
      };

      await api.patch(`/audit-samples/samples/${sample.id}`, updateData);
      
      message.success('Đã lưu Biên bản kiểm tra mẫu thành công');
      if (hasFail) {
        message.warning('Mẫu có tiêu chí KHÔNG ĐẠT (FAIL), kết quả tổng hợp tự động là FAIL.');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      message.error('Có lỗi xảy ra khi lưu biên bản');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tiêu chí kiểm tra',
      dataIndex: 'task',
      key: 'task',
      width: 320,
      render: (text: string) => <span className="font-medium text-slate-700">{text}</span>
    },
    {
      title: 'Đánh giá KSNB',
      dataIndex: 'result',
      key: 'result',
      width: 180,
      render: (val: string, record: any, idx: number) => (
        <Select 
          value={val} 
          onChange={(v) => handleAssessmentChange(idx, 'result', v)} 
          className="w-full"
        >
          <Option value="NOT_TESTED"><Tag color="default">Chưa đánh giá</Tag></Option>
          <Option value="PASS"><Tag color="success">ĐẠT (PASS)</Tag></Option>
          <Option value="FAIL"><Tag color="error">KHÔNG ĐẠT (FAIL)</Tag></Option>
          <Option value="EXCEPTION"><Tag color="warning">NGOẠI LỆ</Tag></Option>
          <Option value="N_A"><Tag color="default">N/A (K.áp dụng)</Tag></Option>
        </Select>
      )
    },
    {
      title: 'Ghi chú sai phạm / Nội dung phát hiện',
      dataIndex: 'notes',
      key: 'notes',
      width: 320,
      render: (val: string, record: any, idx: number) => (
        <div className="flex flex-col gap-2">
          <TextArea 
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Mô tả chi tiết vi phạm, tham chiếu số văn bản..." 
            value={val} 
            onChange={(e) => handleAssessmentChange(idx, 'notes', e.target.value)} 
            className="text-xs"
          />
          {record.result === 'FAIL' && (
            <Select 
              showSearch
              allowClear
              placeholder="Chọn từ Danh mục lỗi để điền tự động..."
              className="w-full text-xs"
              optionFilterProp="children"
              onChange={(kbId) => {
                const kb = knowledgeList.find(k => k.id === kbId);
                if (kb) {
                  const text = `${kb.title}\n- Mức độ rủi ro: ${kb.riskLevel}\n- Khuyến nghị: ${kb.suggestedRecommendation || 'N/A'}`;
                  handleAssessmentChange(idx, 'notes', text);
                }
              }}
            >
              {knowledgeList.map(kb => (
                <Option key={kb.id} value={kb.id}>[{kb.category || 'Lỗi'}] {kb.title}</Option>
              ))}
            </Select>
          )}
        </div>
      )
    }
  ];

  return (
    <Drawer
      title={
        <Space>
          <FileDoneOutlined className="text-[#ea9105]" />
          <span>Biên bản Kiểm tra Mẫu: {sample?.cifOrAccount || `Mẫu #${sample?.id}`}</span>
        </Space>
      }
      width={920}
      onClose={onClose}
      open={open}
      extra={
        <Space>
          <Button onClick={onClose}>{t('common.btnClose', 'Đóng')}</Button>
          <Button type="primary" onClick={handleSave} loading={loading} icon={<SaveOutlined />} className="bg-[#ea9105] hover:bg-[#d48203] border-none">
            Lưu Biên Bản
          </Button>
        </Space>
      }
    >
      {/* Domain Switcher */}
      <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg mb-4">
        <span className="text-xs font-semibold uppercase text-slate-600">Loại hồ sơ kiểm tra:</span>
        <Radio.Group 
          value={domainType} 
          onChange={(e) => setDomainType(e.target.value)}
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button value="CREDIT">🏦 Hồ sơ Tín dụng</Radio.Button>
          <Radio.Button value="NON_CREDIT">📋 Hồ sơ Phi tín dụng</Radio.Button>
        </Radio.Group>
      </div>

      {/* Profile Form */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
        <h3 className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wide">
          1. Thông tin Chi tiết Hồ sơ ({domainType === 'CREDIT' ? 'Tín dụng' : 'Phi tín dụng'})
        </h3>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="cifOrAccount" label="Mã CIF / Số Tài khoản / Mã GD" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
              <Input className="rounded-md" placeholder="VD: 10293848" />
            </Form.Item>
            <Form.Item name="customerName" label="Tên Khách hàng / Người thực hiện">
              <Select
                mode="tags"
                className="rounded-md"
                placeholder="VD: Nguyễn Văn A / Công ty ABC"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {users.map((u: any) => (
                  <Option key={u.id} value={u.fullName}>{u.fullName} ({u.username})</Option>
                ))}
              </Select>
            </Form.Item>

            {domainType === 'CREDIT' ? (
              <>
                <Form.Item name="outstandingBalance" label="Dư nợ (VND)">
                  <InputNumber 
                    className="w-full rounded-md" 
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value?.replace(/\$\s?|(,*)/g, '') as any}
                  />
                </Form.Item>
                <Form.Item name="debtGroup" label="Nhóm nợ">
                  <Select className="rounded-md">
                    <Option value={1}>Nhóm 1 - Nợ đủ tiêu chuẩn</Option>
                    <Option value={2}>Nhóm 2 - Nợ cần chú ý</Option>
                    <Option value={3}>Nhóm 3 - Nợ dưới tiêu chuẩn</Option>
                    <Option value={4}>Nhóm 4 - Nợ nghi ngờ</Option>
                    <Option value={5}>Nhóm 5 - Nợ có khả năng mất vốn</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="referenceNo" label="Số Hợp đồng / Khế ước nhận nợ">
                  <Input className="rounded-md" placeholder="VD: HDTD-2026/089" />
                </Form.Item>
                <Form.Item name="collateralInfo" label="Thông tin Tài sản bảo đảm">
                  <Input className="rounded-md" placeholder="VD: Bất động sản / Sổ tiết kiệm / Xe ô tô" />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item name="transactionType" label="Loại nghiệp vụ phi tín dụng">
                  <Select className="rounded-md" placeholder="Chọn loại nghiệp vụ">
                    <Option value="COUNTER_TRANS">Giao dịch tiền mặt / Quầy</Option>
                    <Option value="ACC_OPENING">Mở tài khoản / Đăng ký DV Ngân hàng số</Option>
                    <Option value="CARD_ISSUANCE">Phát hành & Quản lý thẻ</Option>
                    <Option value="INT_REMITTANCE">Chuyển tiền quốc tế / Kiều hối</Option>
                    <Option value="TRADE_FINANCE">Bảo lãnh ngân hàng / L/C</Option>
                    <Option value="EKYC_REG">Xác thực điện tử (eKYC / Thay đổi TT)</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="transactionAmount" label="Giá trị giao dịch (VND)">
                  <InputNumber 
                    className="w-full rounded-md" 
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value?.replace(/\$\s?|(,*)/g, '') as any}
                  />
                </Form.Item>
                <Form.Item name="channel" label="Kênh thực hiện">
                  <Select className="rounded-md">
                    <Option value="COUNTER">Tại quầy (Counter)</Option>
                    <Option value="DIGITAL_APP">Ứng dụng Mobile / E-Banking</Option>
                    <Option value="ATM_CDM">Kênh Tự động ATM/CDM</Option>
                    <Option value="THIRD_PARTY">Kênh đối tác thứ ba</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="branchCode" label="Mã Chi nhánh / Đơn vị thực hiện">
                  <Select
                    mode="tags"
                    className="rounded-md"
                    placeholder="VD: CN Hà Nội / PGD Ba Đình"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {departments.map((d: any) => (
                      <Option key={d.id} value={d.code}>{d.code} - {d.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            )}
          </div>
        </Form>
      </div>

      {/* Checklist Assessment Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 m-0 text-xs uppercase tracking-wide">
            2. Checklist Đánh giá Kiểm soát Nội bộ {template?.title ? `(${template.title})` : ''}
          </h3>
          <span className="text-xs text-slate-500">
            {assessments.filter(a => a.result === 'PASS').length} Đạt / {assessments.filter(a => a.result === 'FAIL').length} Lỗi
          </span>
        </div>
        <Table 
          dataSource={assessments} 
          columns={columns} 
          rowKey={(r, idx) => idx ?? r.step}
          pagination={false}
          scroll={{ x: 820 }}
          size="middle"
        />
      </div>
    </Drawer>
  );
};

export default SampleTestingDrawer;
