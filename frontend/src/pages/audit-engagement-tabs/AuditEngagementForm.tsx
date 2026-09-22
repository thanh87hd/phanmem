import React from 'react';
import { Form, Input, Select, Button, Space, Row, Col, Card, Typography, Divider, DatePicker } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import DynamicFormRenderer from '../../components/DynamicFormRenderer';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export interface AuditEngagementFormProps {
  editingEngagement: any;
  users: any[];
  departments: any[];
  auditUniverseList: any[];
  safetyWarnings: Record<string, string>;
  engagementForm: any;
  saveEngagement: (isDraft?: boolean) => void;
  onCancel: () => void;
  checkAuditorSafety: (userId: string, targetKey: string, fullName: string, department: string) => void;
  renderDepartmentSelectOptions: () => React.ReactNode;
}

export const AuditEngagementForm: React.FC<AuditEngagementFormProps> = ({
  editingEngagement,
  users,
  departments,
  auditUniverseList,
  safetyWarnings,
  engagementForm,
  saveEngagement,
  onCancel,
  checkAuditorSafety,
  renderDepartmentSelectOptions,
}) => {
  const { t } = useTranslation();

  return (
    <div className="animate-fadeIn p-1">
      {/* Premium Header with Back/Home button */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 bg-transparent">
        <div className="flex items-center gap-4">
          <Button 
            onClick={onCancel} 
            className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-10"
            icon={<CloseOutlined />}
          >
            {t('auditExpenses.form.btnBack', '← Quay lại danh sách')}
          </Button>
          <div>
            <Title level={3} className="!mb-1 text-slate-800">
              {editingEngagement ? [t('auditEngagements.auditUpdate', 'Cập nhật Cuộc Kiểm toán')] : t('auditEngagements.createANewAudit', 'Tạo Cuộc Kiểm toán mới')}
            </Title>
            <Text type="secondary" className="text-sm">
              {t('auditEngagements.setUpGeneralInformationSelectTeam', 'Thiết lập thông tin chung, chọn trưởng đoàn, đơn vị và phân bổ thành viên đoàn kiểm toán.')}
            </Text>
          </div>
        </div>
        <Space>
          <Button onClick={onCancel} className="rounded-xl shadow-sm h-10 px-5">
            {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
          </Button>
          <Button 
            onClick={() => saveEngagement(true)} 
            className="shadow-md rounded-xl h-10 px-6 font-semibold"
          >
            Lưu dự kiến
          </Button>
          <Button 
            type="primary" 
            onClick={() => saveEngagement(false)} 
            className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 px-6 text-white"
          >
            {editingEngagement ? [t('auditEngagements.update', 'Cập nhật')] : t('auditEngagements.createACall', 'Tạo cuộc KT')}
          </Button>
        </Space>
      </div>

      <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
        <Form 
          form={engagementForm} 
          layout="vertical"
          onValuesChange={(changedValues, allValues) => {
            if ('leadAuditorId' in changedValues || 'auditedDepartment' in changedValues) {
              const userId = allValues.leadAuditorId;
              const dept = allValues.auditedDepartment;
              if (userId && dept) {
                const matchedUser = users.find((u: any) => u.id === userId);
                if (matchedUser) {
                  checkAuditorSafety(userId, 'leadAuditor', matchedUser.fullName, dept);
                }
              }
            }
            if ('teamMembers' in changedValues || 'auditedDepartment' in changedValues) {
              const team = allValues.teamMembers || [];
              const dept = allValues.auditedDepartment;
              team.forEach((tm: any, index: number) => {
                if (tm && tm.userId && dept) {
                  const matchedUser = users.find((u: any) => u.id === tm.userId);
                  if (matchedUser) {
                    checkAuditorSafety(tm.userId, `teamMember_${index}`, matchedUser.fullName, dept);
                  }
                }
              });
            }
          }}
        >
          <Form.Item name="name" label={<span className="font-semibold text-slate-700">{t('auditEngagements.nameOfTheAudit', 'Tên cuộc kiểm toán')}</span>} rules={[{ required: true, message: t('auditEngagements.enterTheNameOfTheAudit', 'Nhập tên cuộc kiểm toán') }]}>
            <Input placeholder={t('auditEngagements.forExampleCreditProcessAccounting', 'Ví dụ: KT Quy trình Tín dụng...')} className="rounded-lg h-10" />
          </Form.Item>
          <Form.Item name="planName" label={<span className="font-semibold text-slate-700">{t('auditEngagements.belongsToThePlan', 'Thuộc kế hoạch')}</span>}>
            <Input placeholder={t('auditEngagements.forExamplePlan2026', 'Ví dụ: Kế hoạch 2026')} className="rounded-lg h-10" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="leadAuditorId" label={<span className="font-semibold text-slate-700">{t('auditEngagements.headOfAuditTeam', 'Trưởng đoàn kiểm toán')}</span>} rules={[{ required: true, message: t('auditEngagements.pleaseSelectGroupLeader', 'Vui lòng chọn Trưởng đoàn') }]}>
                <Select placeholder={t('auditEngagements.selectTeamLeader', 'Chọn Trưởng đoàn')} showSearch optionFilterProp="children" className="h-10">
                  {users.map(u => (
                    <Option key={u.id} value={u.id}>
                      {u.fullName} ({u.jobTitle || u.username})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              {safetyWarnings['leadAuditor'] && (
                <div style={{ marginTop: -12, marginBottom: 12 }}>
                  <Text type="warning" style={{ fontSize: 12, display: 'block', background: '#fffbe6', padding: '4px 8px', borderRadius: 4, border: '1px solid #ffe58f' }}>
                    ⚠️ {safetyWarnings['leadAuditor']}
                  </Text>
                </div>
              )}
            </Col>
            <Col span={12}>
              <Form.Item name="auditedDepartmentId" label={<span className="font-semibold text-slate-700">{t('auditEngagements.auditedUnit', 'Đơn vị được kiểm toán')}</span>} rules={[{ required: true, message: t('auditEngagements.pleaseSelectAUnit', 'Vui lòng chọn đơn vị') }]}>
                <Select
                  placeholder={t('auditEngagements.chooseAnAuditingUnit', 'Chọn đơn vị kiểm toán...')}
                  showSearch
                  optionFilterProp="label"
                  className="h-10"
                  filterOption={(input, option: any) => {
                    const label = String(option?.label || '');
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {renderDepartmentSelectOptions()}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: '#475569' }}>{t('auditEngagements.auditTeamMembersRoles', 'Đoàn kiểm toán (Thành viên & Vai trò)')}</span>
            <Form.List name="teamMembers">
              {(fields, { add, remove }) => (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'userId']}
                        rules={[{ required: true, message: t('auditEngagements.selectMember', 'Chọn thành viên') }]}
                        style={{ margin: 0, width: 220 }}
                      >
                        <Select placeholder={t('auditEngagements.selectMember', 'Chọn thành viên')} showSearch optionFilterProp="children" className="h-10">
                          {users.map(u => (
                            <Option key={u.id} value={u.id}>
                              {u.fullName}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'role']}
                        rules={[{ required: true, message: t('auditEngagements.selectRole', 'Chọn vai trò') }]}
                        style={{ margin: 0, width: 200 }}
                      >
                        <Select placeholder={t('auditEngagements.selectDelegationRole', 'Chọn vai trò đoàn')} className="h-10">
                          <Option value={t('auditEngagements.headOfAuditTeam', 'Trưởng đoàn kiểm toán')}>{t('auditEngagements.headOfAuditTeam', 'Trưởng đoàn kiểm toán')}</Option>
                          <Option value={t('auditEngagements.deputyHeadOfTheAuditTeam', 'Phó Trưởng đoàn kiểm toán')}>{t('auditEngagements.deputyHeadOfTheAuditTeam', 'Phó Trưởng đoàn kiểm toán')}</Option>
                          <Option value={t('auditEngagements.auditTeamLeader', 'Trưởng nhóm kiểm toán')}>{t('auditEngagements.auditTeamLeader', 'Trưởng nhóm kiểm toán')}</Option>
                          <Option value={t('auditEngagements.member', 'Thành viên')}>{t('auditEngagements.member', 'Thành viên')}</Option>
                        </Select>
                      </Form.Item>
                      <Button type="text" danger onClick={() => remove(name)} className="h-10 font-semibold">{t('auditTemplates.btnDelete', 'Xóa')}</Button>
                      {safetyWarnings[`teamMember_${name}`] && (
                        <div style={{ width: '100%', marginTop: 4, marginBottom: 4 }}>
                          <Text type="warning" style={{ fontSize: 12, display: 'block', background: '#fffbe6', padding: '4px 8px', borderRadius: 4, border: '1px solid #ffe58f' }}>
                            ⚠️ {safetyWarnings[`teamMember_${name}`]}
                          </Text>
                        </div>
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block style={{ marginTop: fields.length > 0 ? 8 : 0 }} className="h-10 rounded-lg">
                    {t('auditEngagements.addGroupMembers', '+ Thêm thành viên đoàn')}
                  </Button>
                </div>
              )}
            </Form.List>
          </div>
          
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="dates" label={<span className="font-semibold text-slate-700">{t('auditEngagements.implementationTime', 'Thời gian thực hiện (dự kiến)')}</span>}>
                <RangePicker className="w-full h-10 rounded-lg" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="auditedEntityList" label={<span className="font-semibold text-slate-700">Đối tượng kiểm toán (Khối Hội sở & ĐVKD Chi nhánh/PGD)</span>}>
                <Select mode="multiple" placeholder="Chọn các đối tượng kiểm toán..." className="min-h-[40px] rounded-lg">
                  {auditUniverseList.map((u: any) => (
                    <Option key={u.id} value={u.name}>
                      {u.name} ({u.auditCategory || u.category || t('auditEngagements.universe', 'Vũ trụ')})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="engagementType" label={<span className="font-semibold text-slate-700">{t('auditEngagements.typeOfInterview', 'Loại cuộc KT')}</span>} initialValue="Planned">
                <Select className="h-10">
                  <Option value="Planned">{t('auditEngagements.yearPlan', 'Kế hoạch năm')}</Option>
                  <Option value="Unplanned">{t('auditEngagements.types.Unplanned', 'Đột xuất')}</Option>
                  <Option value="FollowUp">{t('auditEngagements.followUpAfterKt', 'Theo dõi sau KT')}</Option>
                  <Option value="Special">{t('auditEngagements.specialTopic', 'Nghiệp vụ đặc biệt')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ownerTeam" label={<span className="font-semibold text-slate-700">{t('auditEngagements.departmentInCharge', 'Phòng phụ trách')}</span>} initialValue="PKT_DVKD">
                <Select className="h-10" showSearch optionFilterProp="children" allowClear>
                  {departments.filter((d: any) => !d.unitType || d.unitType === 'Phong' || d.unitType === 'Ban' || d.name?.toLowerCase().includes('kiểm toán') || d.name?.toLowerCase().includes('kt') || d.name?.toLowerCase().includes('tổng hợp')).map((d: any) => (
                    <Option key={d.id} value={d.code || d.name}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </Option>
                  ))}
                  {departments.length === 0 && (
                    <>
                      <Option value="PKT_HoiSo">{t('auditEngagements.headOfficeAccountingDepartment', 'Phòng KT Hội sở')}</Option>
                      <Option value="PKT_DVKD">{t('auditEngagements.departmentOfBusinessUnitAccounting', 'Phòng KT ĐVKD')}</Option>
                      <Option value="TongHop">{t('auditEngagements.generalDepartment', 'Bộ phận Tổng hợp')}</Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <DynamicFormRenderer entityType="AuditEngagement" form={engagementForm} initialValues={editingEngagement} />

          {editingEngagement && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="reason" label={<span className="font-semibold text-slate-700">Lý do thay đổi (bắt buộc)</span>} rules={[{ required: true, message: 'Vui lòng nhập lý do thay đổi đoàn kiểm toán' }]}>
                  <Input.TextArea placeholder="Nhập lý do thay đổi nhân sự, thời gian hoặc phạm vi..." className="rounded-lg" rows={3} />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.engagementType !== curr.engagementType}>
            {({ getFieldValue }) => getFieldValue('engagementType') === 'Unplanned' ? (
              <Form.Item name="unplannedReason" label={<span className="font-semibold text-slate-700">{t('auditEngagements.unexpectedReason', 'Lý do đột xuất')}</span>} rules={[{ required: true }]}>
                <Input.TextArea placeholder={t('auditEngagements.enterTheReasonForPerformingThe', 'Nhập lý do thực hiện cuộc KT đột xuất...')} className="rounded-lg" rows={3} />
              </Form.Item>
            ) : null}
          </Form.Item>

        </Form>

        <Divider className="my-6" />

        <div className="flex justify-end gap-3">
          <Button onClick={onCancel} className="rounded-xl px-6 h-10">
            {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
          </Button>
          <Button 
            type="primary" 
            onClick={() => saveEngagement(false)} 
            className="rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none px-6 font-semibold h-10 text-white"
          >
            {editingEngagement ? [t('auditEngagements.update', 'Cập nhật')] : t('auditEngagements.createACall', 'Tạo cuộc KT')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
