import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Tabs, Form, Input, DatePicker, Select, Row, Col, Space, Button, Typography, Tag, Divider, Alert, Table, Modal, message } from 'antd';
import { PlusOutlined, DownloadOutlined, CheckCircleOutlined, EditOutlined, SafetyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { hasPermission } from '../../utils/permission';
import EngagementDossierManager from '../../components/EngagementDossierManager';
import MasterSamplingTab from '../MasterSamplingTab';
import StageGateFooter from './StageGateFooter';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Phase1PlanningTabProps {
  selectedEngagement: any;
  setSelectedEngagement: React.Dispatch<React.SetStateAction<any>>;
  users: any[];
  actualsForm: any;
  safetyWarnings: Record<string, string>;
  setEngagements: React.Dispatch<React.SetStateAction<any[]>>;
  fetchEngagements: () => Promise<void>;
  workstreams: any[];
  workstreamColumns: any[];
  handleCreateWorkstream: () => void;
  closeWorkspace: () => void;
  setIsRcmModalVisible: (visible: boolean) => void;
  currentUser: any;
  onOpenStageGateModal?: (targetPhase: 'phase2' | 'phase3' | 'phase4' | 'closed') => void;
}

export const Phase1PlanningTab: React.FC<Phase1PlanningTabProps> = ({
  selectedEngagement,
  setSelectedEngagement,
  users,
  actualsForm,
  safetyWarnings,
  setEngagements,
  fetchEngagements,
  workstreams,
  workstreamColumns,
  handleCreateWorkstream,
  closeWorkspace,
  setIsRcmModalVisible,
  currentUser,
  onOpenStageGateModal,
}) => {
  const { t } = useTranslation();
  const [scopeForm] = Form.useForm();
  const [savingScope, setSavingScope] = useState(false);

  const handleSaveScope = async (values: any) => {
    setSavingScope(true);
    try {
      await api.patch(`/audit-engagements/${selectedEngagement.id}`, {
        objective: values.objective,
        scope: values.scope,
        planningStartDate: values.planningDates?.[0] ? values.planningDates[0].format('YYYY-MM-DD') : null,
        planningEndDate: values.planningDates?.[1] ? values.planningDates[1].format('YYYY-MM-DD') : null,
      });
      message.success('Đã lưu Mục tiêu & Phạm vi kiểm toán thành công');
      fetchEngagements();
      const res = await api.get(`/audit-engagements/${selectedEngagement.id}`);
      setSelectedEngagement(res.data);
    } catch (err) {
      message.error('Lỗi khi lưu Mục tiêu & Phạm vi');
    } finally {
      setSavingScope(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs
        type="card"
        className="mt-2"
      items={[
        {
          key: 'decision',
          label: <span className="font-medium">1.1. Quyết định, Nhân sự & Độc lập</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <Title level={5} className="!mb-1">Cập nhật Quyết định, Hồ sơ pháp lý & Nhân sự thực tế</Title>
                  <Text type="secondary">Quản lý Số Quyết định, kiểm soát tính độc lập của đoàn (IIA Standard 1130) và quản lý Trọn bộ Hồ sơ pháp lý.</Text>
                </div>
              </div>
              <Divider />
              
              <Form 
                form={actualsForm} 
                layout="vertical"
                initialValues={{
                  decisionNo: selectedEngagement.decisionNo,
                  decisionDate: selectedEngagement.decisionDate ? dayjs(selectedEngagement.decisionDate) : null,
                  teamMembers: selectedEngagement.teamMembers || selectedEngagement.expectedTeamMembers || [],
                  leadAuditorId: selectedEngagement.leadAuditorId || selectedEngagement.expectedLeadAuditorId,
                }}
                onFinish={async (values) => {
                  try {
                    await fetch(`/api/audit-engagements/${selectedEngagement.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        decisionNo: values.decisionNo,
                        decisionDate: values.decisionDate ? values.decisionDate.format('YYYY-MM-DD') : null,
                        teamMembers: values.teamMembers,
                        leadAuditorId: values.leadAuditorId,
                      })
                    });
                    message.success('Đã cập nhật thông tin thực tế thành công');
                    const res = await fetch('/api/audit-engagements');
                    const data = await res.json();
                    setEngagements(data);
                    setSelectedEngagement(data.find((e: any) => e.id === selectedEngagement.id));
                  } catch (err) {
                    message.error('Lỗi cập nhật');
                  }
                }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="decisionNo" label={<span className="font-semibold">Số Quyết định kiểm toán</span>}>
                      <Input placeholder="Nhập số QĐ..." className="h-10 rounded-lg" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="decisionDate" label={<span className="font-semibold">Ngày ban hành QĐ</span>}>
                      <DatePicker className="w-full h-10 rounded-lg" format="YYYY-MM-DD" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full">
                      <Title level={5} className="!mb-4 !text-slate-600">👤 Nhân sự Dự kiến (Snapshot Kế hoạch)</Title>
                      <div className="mb-4">
                        <Text type="secondary">Trưởng đoàn:</Text><br />
                        <b>{users.find(u => u.id === selectedEngagement.expectedLeadAuditorId)?.fullName || 'Chưa có'}</b>
                      </div>
                      <div>
                        <Text type="secondary">Thành viên:</Text>
                        <ul className="mt-2 space-y-1">
                          {(selectedEngagement.expectedTeamMembers || []).map((tm: any, i: number) => (
                            <li key={i}>- {tm.fullName} ({tm.role})</li>
                          ))}
                          {(!selectedEngagement.expectedTeamMembers || selectedEngagement.expectedTeamMembers.length === 0) && (
                            <Text type="secondary" className="italic">Không có</Text>
                          )}
                        </ul>
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <Title level={5} className="!mb-4 !text-blue-800">👥 Nhân sự Thực tế (Theo Quyết định ban hành)</Title>
                      <Form.Item name="leadAuditorId" label={<span className="font-medium">Trưởng đoàn chính thức</span>}>
                        <Select placeholder="Chọn Trưởng đoàn" showSearch optionFilterProp="children" className="h-10">
                          {users.map(u => (
                            <Option key={u.id} value={u.id}>{u.fullName}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                      {safetyWarnings['leadAuditor'] && (
                        <Alert message={safetyWarnings['leadAuditor']} type="warning" showIcon className="mb-3" />
                      )}
                      
                      <span className="font-medium block mb-2">Thành viên đoàn chính thức</span>
                      <Form.List name="teamMembers">
                        {(fields, { add, remove }) => (
                          <div className="space-y-3">
                            {fields.map(({ key, name, ...restField }) => (
                              <Space key={key} style={{ display: 'flex' }} align="baseline">
                                <Form.Item {...restField} name={[name, 'userId']} style={{ margin: 0, width: 200 }}>
                                  <Select placeholder="Chọn thành viên" showSearch optionFilterProp="children" className="h-10">
                                    {users.map(u => (
                                      <Option key={u.id} value={u.id}>{u.fullName}</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                                <Form.Item {...restField} name={[name, 'role']} style={{ margin: 0, width: 160 }}>
                                  <Select placeholder="Vai trò" className="h-10">
                                    <Option value="Trưởng đoàn kiểm toán">Trưởng đoàn</Option>
                                    <Option value="Phó Trưởng đoàn kiểm toán">Phó Trưởng đoàn</Option>
                                    <Option value="Trưởng nhóm kiểm toán">Trưởng nhóm</Option>
                                    <Option value="Thành viên">Thành viên</Option>
                                  </Select>
                                </Form.Item>
                                <Button type="text" danger onClick={() => remove(name)} className="h-10">{t('common.btnDelete', 'Xóa')}</Button>
                              </Space>
                            ))}
                            <Button type="dashed" onClick={() => add()} block className="h-10 rounded-lg border-blue-300 text-blue-600 bg-white">
                              + Thêm nhân sự thực tế
                            </Button>
                          </div>
                        )}
                      </Form.List>
                    </div>
                  </Col>
                </Row>

                <Divider className="my-5" />

                {/* Bộ Hồ Sơ Pháp Lý & Kế Hoạch Đoàn Kiểm Toán (Audit Dossier) */}
                <div className="mb-6">
                  <EngagementDossierManager
                    engagementId={selectedEngagement.id}
                    onDossierChange={(_docs, urls) => {
                      setSelectedEngagement((prev: any) => (prev ? { ...prev, ...urls } : prev));
                    }}
                  />
                </div>

                <div className="mt-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Trạng thái Kế hoạch Đề cương & Mẫu:</span>
                      <Tag color={selectedEngagement.proposalStatus === 'Approved' ? 'success' : selectedEngagement.proposalStatus === 'Submitted' ? 'processing' : selectedEngagement.proposalStatus === 'Rework' ? 'error' : 'default'} className="font-bold">
                        {selectedEngagement.proposalStatus === 'Approved' ? '✅ Đã phê duyệt đề cương' : selectedEngagement.proposalStatus === 'Submitted' ? '⏳ Đang chờ Trưởng Ban KTNB duyệt' : selectedEngagement.proposalStatus === 'Rework' ? '⚠️ Yêu cầu rà soát chỉnh sửa lại' : 'Bản nháp đề cương'}
                      </Tag>
                      {selectedEngagement.proposalRevisionCount > 0 && (
                        <Tag color="volcano" className="font-semibold">
                          Đã qua {selectedEngagement.proposalRevisionCount} lần yêu cầu sửa đổi (KPI)
                        </Tag>
                      )}
                    </div>
                    {selectedEngagement.proposalNotes && (
                      <Text type="secondary" className="text-xs italic block text-amber-700">
                        Ghi chú / Ý kiến chỉ đạo: {selectedEngagement.proposalNotes}
                      </Text>
                    )}
                  </div>
                  <Space>
                    <Button type="primary" htmlType="submit" className="h-10 px-5 rounded-xl bg-blue-600 font-semibold">
                      Lưu thông tin nhân sự
                    </Button>
                    {(selectedEngagement.proposalStatus === 'Draft' || selectedEngagement.proposalStatus === 'Rework' || !selectedEngagement.proposalStatus) && (
                      <Button 
                        type="primary" 
                        className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 font-semibold"
                        onClick={async () => {
                          try {
                            await api.post(`/audit-engagements/${selectedEngagement.id}/submit-proposal`, {
                              notes: 'Trưởng đoàn trình duyệt Kế hoạch đề cương, nhân sự và bộ mẫu chọn kiểm toán'
                            });
                            message.success('Đã trình duyệt Kế hoạch đề cương & Mẫu chọn lên Trưởng Ban KTNB!');
                            fetchEngagements();
                            const res = await api.get(`/audit-engagements/${selectedEngagement.id}`);
                            setSelectedEngagement(res.data);
                          } catch (err: any) {
                            message.error(err.response?.data?.message || 'Lỗi khi trình duyệt đề cương');
                          }
                        }}
                      >
                        🚀 Trình duyệt KHĐC & Mẫu
                      </Button>
                    )}
                    {selectedEngagement.proposalStatus === 'Submitted' && hasPermission(currentUser, 'plan:approve') && (
                      <>
                        <Button 
                          type="primary" 
                          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
                          onClick={async () => {
                            try {
                              await api.post(`/audit-engagements/${selectedEngagement.id}/approve-proposal`, {
                                notes: 'Trưởng Ban KTNB phê duyệt Kế hoạch đề cương và ký ban hành Quyết định kiểm toán'
                              });
                              message.success('Đã phê duyệt đề cương! Đoàn kiểm toán chính thức bước vào giai đoạn Thực địa.');
                              fetchEngagements();
                              const res = await api.get(`/audit-engagements/${selectedEngagement.id}`);
                              setSelectedEngagement(res.data);
                            } catch (err: any) {
                              message.error(err.response?.data?.message || 'Lỗi khi phê duyệt đề cương');
                            }
                          }}
                        >
                          ✅ Phê duyệt & Chuyển Thực địa
                        </Button>
                        <Button 
                          danger 
                          className="h-10 px-5 rounded-xl font-semibold"
                          onClick={() => {
                            Modal.confirm({
                              title: 'Yêu cầu rà soát & chỉnh sửa lại Kế hoạch Đề cương',
                              content: (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 mb-2">Nhập ý kiến chỉ đạo chi tiết (Sẽ được lưu vào lịch sử review tính điểm KPI):</p>
                                  <Input.TextArea id="rework_notes_input" rows={3} placeholder="Ví dụ: Bổ sung thêm mẫu chọn tín dụng chi nhánh phụ, đổi vai trò KTV..." />
                                </div>
                              ),
                              okText: 'Yêu cầu sửa lại (Rework)',
                              okButtonProps: { danger: true },
                              onOk: async () => {
                                const inputElem = document.getElementById('rework_notes_input') as HTMLTextAreaElement;
                                const reworkNotes = inputElem?.value || 'Yêu cầu Trưởng đoàn rà soát và chỉnh sửa lại đề cương';
                                try {
                                  await api.post(`/audit-engagements/${selectedEngagement.id}/reject-proposal`, {
                                    notes: reworkNotes
                                  });
                                  message.warning('Đã trả lại yêu cầu chỉnh sửa đề cương cho Trưởng đoàn!');
                                  fetchEngagements();
                                  const res = await api.get(`/audit-engagements/${selectedEngagement.id}`);
                                  setSelectedEngagement(res.data);
                                } catch (err: any) {
                                  message.error(err.response?.data?.message || 'Lỗi khi gửi yêu cầu chỉnh sửa');
                                }
                              }
                            });
                          }}
                        >
                          ↩️ Yêu cầu Review lại
                        </Button>
                      </>
                    )}
                  </Space>
                </div>

                {selectedEngagement.proposalReviewHistory && selectedEngagement.proposalReviewHistory.length > 0 && (
                  <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <Title level={5} className="!mb-3 text-slate-700">📜 Lịch sử các lần Trình duyệt & Review Đề cương ({selectedEngagement.proposalReviewHistory.length} lần)</Title>
                    <div className="space-y-2">
                      {selectedEngagement.proposalReviewHistory.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start text-xs bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <Space orientation="vertical" size={1}>
                            <Space>
                              <Tag color={item.action === 'APPROVE' ? 'success' : item.action === 'REWORK' ? 'error' : 'processing'} className="font-bold">
                                #{item.iteration} {item.action === 'APPROVE' ? 'PHÊ DUYỆT' : item.action === 'REWORK' ? 'YÊU CẦU SỬA ĐỔI' : 'TRÌNH DUYỆT'}
                              </Tag>
                              <span className="font-semibold text-slate-800">{item.actorName} ({item.role})</span>
                            </Space>
                            <p className="text-slate-600 mt-1 mb-0">{item.notes}</p>
                          </Space>
                          <Text type="secondary">{dayjs(item.timestamp).format('HH:mm DD/MM/YYYY')}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Form>
            </Card>
          )
        },
        {
          key: 'objectives',
          label: <span className="font-medium">1.2. Khảo sát, Mục tiêu & Phạm vi (IIA 2210/2220)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="mb-4">
                <Title level={5} className="!mb-1">Xác định Mục tiêu & Phạm vi kiểm toán theo Chuẩn mực IIA</Title>
                <Text type="secondary">Thu thập tài liệu ban đầu, khảo sát sơ bộ hệ thống KSNB, xác định ranh giới (In-scope / Out-of-scope) và thời kỳ kiểm toán.</Text>
              </div>
              <Divider />
              <Form
                form={scopeForm}
                layout="vertical"
                initialValues={{
                  objective: selectedEngagement.objective,
                  scope: selectedEngagement.scope,
                  planningDates: [
                    selectedEngagement.planningStartDate ? dayjs(selectedEngagement.planningStartDate) : null,
                    selectedEngagement.planningEndDate ? dayjs(selectedEngagement.planningEndDate) : null,
                  ],
                }}
                onFinish={handleSaveScope}
              >
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="objective" label={<span className="font-semibold">Mục tiêu Cuộc kiểm toán (Engagement Objectives - IIA Standard 2210)</span>}>
                      <TextArea rows={4} placeholder="Ví dụ: Đánh giá tính đầy đủ, hiệu lực và hiệu quả của hệ thống kiểm soát nội bộ đối với quy trình vận hành phát hành và thanh toán thẻ..." />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="scope" label={<span className="font-semibold">Phạm vi & Giới hạn kiểm toán (Engagement Scope & Limitations - IIA Standard 2220)</span>}>
                      <TextArea rows={4} placeholder="Ví dụ: Kiểm tra toàn bộ hồ sơ nghiệp vụ phát sinh từ 01/01 đến 31/12 tại Hội sở và 05 Chi nhánh trọng điểm. Không bao gồm các nghiệp vụ thẻ quốc tế do bên thứ ba xử lý..." />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="planningDates" label={<span className="font-semibold">Thời gian Lập kế hoạch & Khảo sát</span>}>
                      <DatePicker.RangePicker className="w-full h-10 rounded-lg" />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" htmlType="submit" loading={savingScope} className="h-10 px-6 rounded-xl bg-blue-600 font-semibold">
                  Lưu Mục tiêu & Phạm vi
                </Button>
              </Form>
            </Card>
          )
        },
        {
          key: 'rcm',
          label: <span className="font-medium">1.3. Đánh giá Rủi ro & Ma trận RCM (IIA 2210.A1)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm min-h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <Title level={5} className="!mb-1">Đánh giá Rủi ro & Chốt kiểm soát</Title>
                  <Text type="secondary">Tìm hiểu hệ thống kiểm soát nội bộ và chọn lọc các rủi ro từ thư viện RCM để đưa vào Chương trình KT.</Text>
                </div>
                <Button icon={<DownloadOutlined />} onClick={() => setIsRcmModalVisible(true)} type="primary" className="bg-[#217346]">
                  Nhập từ Thư viện RCM
                </Button>
              </div>
              <Alert message="Chưa có Rủi ro nào được chọn từ thư viện. Hãy nhấn 'Nhập từ Thư viện RCM' để bắt đầu." type="info" showIcon className="mb-4" />
            </Card>
          )
        },
        {
          key: 'sampling',
          label: <span className="font-medium">1.4. Kế hoạch Chọn mẫu & Dữ liệu (IIA 2240)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <MasterSamplingTab engagementId={selectedEngagement.id} />
            </Card>
          ),
        },
        {
          key: 'workspace',
          label: <span className="font-medium">1.5. Xây dựng Chương trình KT & Trình duyệt (IIA 2240)</span>,
          children: (
            <Card variant="borderless" className="shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <Space wrap>
                  <Tag color="orange">Workspace: {selectedEngagement.workspaceStatus || 'Open'}</Tag>
                  <Tag color="red">RR: {selectedEngagement.riskLevel || '-'}</Tag>
                </Space>
                <Space>
                  <Button icon={<PlusOutlined />} type="primary" onClick={handleCreateWorkstream}>{t('auditEngagements.addOnions', 'Thêm phần hành')}</Button>
                  <Button danger icon={<CheckCircleOutlined />} onClick={closeWorkspace}>{t('auditEngagements.closeWorkspace', 'Đóng workspace')}</Button>
                </Space>
              </div>
              <Table 
                columns={workstreamColumns} 
                dataSource={workstreams} 
                rowKey="id" 
                pagination={{ pageSize: 6 }} 
                scroll={{ x: 1100 }}
              />
            </Card>
          ),
        }
      ]}
    />
    <StageGateFooter
      currentPhaseKey="phase1"
      engagementStatus={selectedEngagement?.status || 'Planning'}
      responsibleRole="Trưởng đoàn kiểm toán & Người lập kế hoạch"
      assignedPersonnel={selectedEngagement?.leadAuditorUser?.fullName || selectedEngagement?.legacyLeadAuditor || 'Chưa phân công'}
      nextPhaseTitle="Giai đoạn 2: Thực địa & Thử nghiệm (IIA 2300)"
      onTriggerNextGate={() => onOpenStageGateModal?.('phase2')}
      canProceed={true}
    />
  </div>
  );
};
export default Phase1PlanningTab;
