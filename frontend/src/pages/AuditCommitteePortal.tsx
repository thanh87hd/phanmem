import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Typography, Statistic, Table, Tabs, Button, Modal, Form, Input, message, Tag, Space, Progress } from 'antd';
import { SafetyCertificateOutlined, WarningOutlined, FileTextOutlined, PlusOutlined, SafetyOutlined, AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useDashboardConfig } from '../utils/useDashboardConfig';
import DashboardCustomizer from '../components/DashboardCustomizer';
import { SmartWidgetRenderer } from '../components/dashboard-widgets/WidgetRenderer';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const LoDCard = ({ title, data, icon, color }: any) => {
  const { t } = useTranslation();
  return (
    <Card className="shadow-sm h-full" styles={{ body: {} }}>
      <div className="flex items-center mb-4">
        <div className={`p-3 rounded-full mr-4 bg-${color}-50`}>
          {icon}
        </div>
        <div>
          <Title level={5} className="!mb-0">{title}</Title>
          <Text className="text-gray-500 text-xs">{data?.name}</Text>
        </div>
      </div>
      <Paragraph className="text-sm text-gray-500 min-h-[40px]">{data?.description}</Paragraph>
      <div className="mt-4">
        <div className="flex justify-between mb-1 text-sm">
          <Text>{t('auditCommitteePortal.coverage', 'Mức độ phủ (Coverage)')}</Text>
          <Text strong>{data?.coverage || 0}%</Text>
        </div>
        <Progress percent={data?.coverage || 0} showInfo={false} strokeColor={color === 'blue' ? '#ea9105' : color === 'green' ? '#52c41a' : '#faad14'} />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
        <Text className="text-gray-500">{t('auditCommitteePortal.issues', 'Vấn đề phát hiện')}</Text>
        <Text strong className="text-lg">{data?.issues || 0}</Text>
      </div>
    </Card>
  );
};

const AuditCommitteePortal: React.FC = () => {
  const { t } = useTranslation();

  const [highlights, setHighlights] = useState<any>({});
  const [lodStats, setLodStats] = useState<any>({});
  const [charters, setCharters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // === Dashboard Customization ===
  const dashboardConfig = useDashboardConfig('committee');

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardConfig.config]);

  async function fetchData() {
    setLoading(true);
    try {
      const getQuery = (widgetId: string) => {
        const cfg = dashboardConfig.config.find(w => w.widgetId === widgetId);
        const dept = cfg?.settings?.department;
        const yr = cfg?.settings?.year;
        const uni = cfg?.settings?.auditUniverse;
        const params = new URLSearchParams();
        if (dept) params.append('departmentId', dept);
        if (yr) params.append('year', yr);
        if (uni) params.append('auditUniverse', uni);
        const qs = params.toString();
        return qs ? `?${qs}` : '';
      };

      const [hlRes, lodRes, charterRes] = await Promise.all([
        api.get(`/audit-committee/highlights${getQuery('comm-kpi-cards') || getQuery('committee-kpi-cards')}`).catch(() => ({ data: {} })),
        api.get(`/audit-committee/3lod${getQuery('comm-3lod') || getQuery('committee-tabs')}`).catch(() => ({ data: {} })),
        api.get('/audit-committee/charters').catch(() => ({ data: [] }))
      ]);
      setHighlights(hlRes.data || {});
      setLodStats(lodRes.data || {});
      setCharters(charterRes.data || []);
    } catch (error) {
      message.error(t('auditCommitteePortal.messages.loadError', 'Lỗi khi tải dữ liệu Ban Kiểm Soát'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharter = async (values: any) => {
    try {
      await api.post('/audit-committee/charters', values);
      message.success(t('auditCommitteePortal.messages.createSuccess', 'Đã tạo mới phiên bản Điều lệ KTNB'));
      setIsModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(t('auditCommitteePortal.messages.createError', 'Lỗi khi tạo Điều lệ'));
    }
  };

  const handleApproveCharter = async (id: number) => {
    try {
      await api.patch(`/audit-committee/charters/${id}/approve`);
      message.success(t('auditCommitteePortal.messages.approveSuccess', 'Đã phê duyệt Điều lệ'));
      fetchData();
    } catch (error) {
      message.error(t('auditCommitteePortal.messages.approveError', 'Lỗi khi phê duyệt'));
    }
  };

  const charterColumns = [
    { title: t('auditCommitteePortal.table.version', 'Phiên bản'), dataIndex: 'version', key: 'version', render: (t: string) => <Text strong>{t}</Text> },
    { title: t('auditCommitteePortal.table.title', 'Tiêu đề'), dataIndex: 'title', key: 'title' },
    { 
      title: 'Năm áp dụng', dataIndex: 'effectiveYear', key: 'effectiveYear',
      render: (yr: number) => yr ? <Tag color="blue">{yr}</Tag> : <Tag color="default">Toàn kỳ</Tag>
    },
    {
      title: 'Quyền hạn IIA', key: 'iia',
      render: (_: any, r: any) => (
        <Space orientation="vertical" size={2}>
          <Tag color="cyan">Quyền tiếp cận toàn diện (IIA 6.1)</Tag>
          <Tag color="geekblue">Báo cáo trực tiếp BKS (IIA 7.1)</Tag>
        </Space>
      )
    },
    { 
      title: t('auditTemplates.cols.status', 'Trạng thái'), dataIndex: 'status', key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Approved' ? 'green' : 'orange'}>
          {status === 'Approved' ? [t('auditCommitteePortal.table.approved', 'Đã phê duyệt')] : t('auditCommitteePortal.table.draft', 'Dự thảo')}
        </Tag>
      )
    },
    { title: t('auditCommitteePortal.table.approvedBy', 'Người duyệt'), dataIndex: 'approvedBy', key: 'approvedBy' },
    { title: t('auditCommitteePortal.table.updatedAt', 'Ngày cập nhật'), dataIndex: 'updatedAt', key: 'updatedAt', render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: t('regulatoryExams.examTable.action', 'Hành động'), key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.status !== 'Approved' && (
            <Button type="primary" size="small" onClick={() => handleApproveCharter(record.id)}>{t('auditCommitteePortal.table.btnApprove', 'Phê duyệt')}</Button>
          )}
          <Button type="link" size="small">{t('auditCommitteePortal.table.btnView', 'Xem chi tiết')}</Button>
        </Space>
      )
    }
  ];

  const kpiCardsElement = (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} md={8}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic title={t('auditCommitteePortal.kpis.critical', 'Rủi ro Nghiêm trọng (Critical)')} value={highlights?.criticalFindings ?? 0} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic title={t('auditCommitteePortal.kpis.high', 'Rủi ro Cao (High)')} value={highlights?.highFindings ?? 0} valueStyle={{ color: '#d48806' }} prefix={<WarningOutlined />} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic title={t('auditCommitteePortal.kpis.totalIssues', 'Tổng Vấn đề Tồn đọng')} value={highlights?.totalIssues ?? 0} prefix={<AppstoreOutlined />} />
        </Card>
      </Col>
    </Row>
  );

  const lodDashboardElement = (
    <Card 
      title={<span><SafetyOutlined className="mr-2 text-blue-500" />3 Lines of Defense Dashboard</span>} 
      className="shadow-sm mb-6" 
      variant="borderless"
    >
      <div className="py-2">
        <Paragraph className="mb-6 text-gray-600">
          {t('auditCommitteePortal.lodDesc', 'Mô hình 3 Tuyến Phòng Vệ giúp đảm bảo sự phân định rõ ràng giữa các chức năng sở hữu rủi ro (Tuyến 1), giám sát rủi ro (Tuyến 2) và đánh giá độc lập (Tuyến 3).')}
        </Paragraph>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <LoDCard 
              title={t('auditCommitteePortal.line1FirstLine', 'Tuyến 1 (First Line)')} 
              data={lodStats?.line1 || { name: 'Kinh doanh & Vận hành', description: 'Các chi nhánh, phòng ban kinh doanh trực tiếp quản lý và kiểm soát rủi ro phát sinh.', coverage: 85, issues: 12 }} 
              color="blue"
              icon={<AppstoreOutlined className="text-2xl text-blue-500" />} 
            />
          </Col>
          <Col xs={24} md={8}>
            <LoDCard 
              title={t('auditCommitteePortal.line2SecondLine', 'Tuyến 2 (Second Line)')} 
              data={lodStats?.line2 || { name: 'QLRR & Tuân thủ', description: 'Khối Quản trị Rủi ro và Phòng Tuân thủ thiết lập chính sách, giám sát việc thực thi rủi ro.', coverage: 90, issues: 5 }} 
              color="orange"
              icon={<WarningOutlined className="text-2xl text-orange-500" />} 
            />
          </Col>
          <Col xs={24} md={8}>
            <LoDCard 
              title={t('auditCommitteePortal.line3ThirdLine', 'Tuyến 3 (Third Line)')} 
              data={lodStats?.line3 || { name: 'Kiểm toán Nội bộ', description: 'Khối KTNB cung cấp sự đảm bảo độc lập, khách quan trực tiếp lên Ban Kiểm Soát & HĐQT.', coverage: 95, issues: 2 }} 
              color="green"
              icon={<SafetyCertificateOutlined className="text-2xl text-green-500" />} 
            />
          </Col>
        </Row>
      </div>
    </Card>
  );

  const charterElement = (
    <Card 
      title={<span><FileTextOutlined className="mr-2 text-green-500" />{t('auditCommitteePortal.tabs.charter', 'Quản lý Điều lệ KTNB (Audit Charter)')}</span>} 
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>{t('auditCommitteePortal.btnCreateCharter', 'Tạo phiên bản mới')}</Button>}
      className="shadow-sm mb-6" 
      variant="borderless"
    >
      <div className="py-2">
        <Paragraph className="mb-4 text-gray-600">
          {t('auditCommitteePortal.charterDesc', 'Quản lý các phiên bản Điều lệ Kiểm toán Nội bộ theo tiêu chuẩn IIA 1000.')}
        </Paragraph>
        <Table 
          columns={charterColumns} 
          dataSource={charters} 
          rowKey="id" 
          loading={loading}
          pagination={false}
        />
      </div>
    </Card>
  );

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title level={3} className="!mb-1"><SafetyCertificateOutlined className="mr-2" />Audit Committee Portal</Title>
          <Text className="text-gray-500">{t('auditCommitteePortal.subtitle', 'Cổng thông tin dành cho Ban Kiểm Soát & Quản trị cấp cao')}</Text>
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
          'comm-kpi-cards': kpiCardsElement,
          'committee-kpi-cards': kpiCardsElement,
          'comm-3lod': lodDashboardElement,
          'comm-charter': charterElement,
          'committee-tabs': (
            <Tabs defaultActiveKey="1" className="bg-white p-4 rounded-lg shadow-sm">
              <Tabs.TabPane tab={<span><SafetyOutlined />3 Lines of Defense Dashboard</span>} key="1">
                {lodDashboardElement}
              </Tabs.TabPane>
              <Tabs.TabPane tab={<span><FileTextOutlined />{t('auditCommitteePortal.tabs.charter', 'Quản lý Điều lệ KTNB (Audit Charter)')}</span>} key="2">
                {charterElement}
              </Tabs.TabPane>
            </Tabs>
          )
        }}
      />

      <Modal
        title={t('auditCommitteePortal.modal.title', 'Tạo phiên bản Điều lệ KTNB mới')}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCharter}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="version" label={t('auditCommitteePortal.modal.version', 'Phiên bản (VD: v1.2.0)')} rules={[{ required: true }]}>
                <Input placeholder={t('auditCommitteePortal.modal.versionPlaceholder', 'Nhập version')} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="title" label={t('auditCommitteePortal.table.title', 'Tiêu đề')} rules={[{ required: true }]}>
                <Input placeholder={t('auditCommitteePortal.modal.titlePlaceholder', 'Nhập tiêu đề Điều lệ')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="content" label={t('auditCommitteePortal.modal.content', 'Nội dung Điều lệ (Markdown/Text)')} rules={[{ required: true }]}>
            <TextArea rows={12} placeholder={t('auditCommitteePortal.modal.contentPlaceholder', 'Nhập nội dung quy định mục đích, quyền hạn và trách nhiệm...')} />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setIsModalVisible(false)}>{t('findingKB.modal.cancelText', 'Hủy')}</Button>
            <Button type="primary" htmlType="submit">{t('auditCommitteePortal.modal.btnSave', 'Lưu Nháp')}</Button>
          </div>
        </Form>
      </Modal>

      <DashboardCustomizer
        open={dashboardConfig.editMode}
        onClose={() => dashboardConfig.setEditMode(false)}
        dashboardKey="committee"
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

export default AuditCommitteePortal;
