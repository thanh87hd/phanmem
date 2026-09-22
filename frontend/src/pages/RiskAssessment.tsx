import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography, Button, Space, Modal, Tag, Tabs, message } from 'antd';
import {
  DashboardOutlined, SafetyCertificateOutlined, SyncOutlined,
  BuildOutlined, AlertOutlined, BarChartOutlined, RocketOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import RiskScoringTab from '../components/RiskScoringTab';
import RiskComparisonTab from '../components/RiskComparisonTab';
import RiskDefectHeatmapTab from '../components/RiskDefectHeatmapTab';
import UnitRestructuringComparisonTab from '../components/UnitRestructuringComparisonTab';
import RiskProfilesTab from '../components/RiskProfilesTab';
import RiskTransferModal from '../components/RiskTransferModal';
import RiskHeatMap from '../components/RiskHeatMap';
import RiskRegister from './RiskRegister';
import { SwapOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const RiskAssessment: React.FC = () => {
  const { t } = useTranslation();

  const [auditUniverses, setAuditUniverses] = useState<any[]>([]);
  const [riskCriteria, setRiskCriteria] = useState<any[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('audit-scoring');
  const [departments, setDepartments] = useState<any[]>([]);
  const [isHeatMapVisible, setIsHeatMapVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [riskAssessments, setRiskAssessments] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAuditUniverses = async () => {
    try {
      const response = await api.get('/audit-universe');
      setAuditUniverses(response.data);
    } catch (error) {
      console.error('Failed to load audit universes');
    }
  };

  const fetchRiskCriteria = async () => {
    setCriteriaLoading(true);
    try {
      const response = await api.get('/risk-criteria');
      setRiskCriteria(response.data);
    } catch (error) {
      console.error('Failed to load risk criteria');
      setRiskCriteria([
        { id: 1, name: t('riskAssessment.creditRisk', 'Rủi ro Tín dụng'), weight: 40 },
        { id: 2, name: t('riskAssessment.operationalRisk', 'Rủi ro Hoạt động'), weight: 30 },
        { id: 3, name: t('riskAssessment.complianceRisk', 'Rủi ro Tuân thủ'), weight: 30 },
      ]);
    } finally {
      setCriteriaLoading(false);
    }
  };

  const fetchRiskAssessments = async () => {
    try {
      const response = await api.get('/risk-assessments');
      setRiskAssessments(response.data);
    } catch (error) {
      console.error('Failed to load risk assessments');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAuditUniverses();
    fetchRiskCriteria();
    fetchRiskAssessments();
    api.get('/departments').then(res => setDepartments(res.data || [])).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1">
            <DashboardOutlined style={{ color: '#ea9105', marginRight: 8 }} />
            Hệ thống Quản lý & Đánh giá Rủi ro (3-Lines Risk Engine)
          </Title>
          <Text type="secondary">Đánh giá rủi ro theo nhóm Audit Universe (IIA 2024 Hybrid Approach) · Basel/BCBS Inherent→Residual Risk · Cảnh báo sớm KRI (Tuyến 2) · TT13/2018 & TT83/2025/TT-NHNN</Text>
        </div>
        <Space>
          <Button
            icon={<SwapOutlined />}
            onClick={() => setIsTransferModalVisible(true)}
            style={{ backgroundColor: '#fa8c16', color: '#fff', borderColor: '#fa8c16' }}
          >
            Chuyển giao Rủi ro ĐVKD
          </Button>
          <Button icon={<SyncOutlined />} onClick={() => { setRefreshKey(prev => prev + 1); fetchRiskAssessments(); fetchAuditUniverses(); }}>{t('common.btnSyncData', 'Đồng bộ dữ liệu')}</Button>
          <Button icon={<BuildOutlined style={{ color: '#ea9105' }} />} onClick={() => setIsHeatMapVisible(true)}>{t('common.btnHeatMap', 'Bản đồ Rủi ro (Heat Map)')}</Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        type="card"
        items={[
          {
            key: 'audit-scoring',
            label: (
              <span>
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                Đánh giá Rủi ro Kiểm toán (Tuyến 3)
              </span>
            ),
            children: (
              <RiskScoringTab
                key={refreshKey}
                auditUniverses={auditUniverses}
                riskCriteria={riskCriteria}
                criteriaLoading={criteriaLoading}
              />
            ),
          },
          {
            key: 'risk-comparison',
            label: (
              <span>
                <BarChartOutlined style={{ marginRight: 6, color: '#ff4d4f' }} />
                So sánh & Xu hướng Rủi ro
              </span>
            ),
            children: (
              <RiskComparisonTab />
            ),
          },
          {
            key: 'unit-restructuring',
            label: (
              <span>
                <BuildOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
                Biến động ĐVKD & PGDBĐ
              </span>
            ),
            children: <UnitRestructuringComparisonTab />,
          },
          {
            key: 'risk-profiles',
            label: (
              <span>
                <DatabaseOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                Bộ Hồ Sơ Rủi Ro KTNB (HSRR - 819 Rủi Ro)
              </span>
            ),
            children: <RiskProfilesTab />,
          },
          {
            key: 'risk-register',
            label: (
              <span>
                <SafetyCertificateOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                Sổ Đăng Ký Rủi Ro (Risk Register)
              </span>
            ),
            children: <RiskRegister embedded={true} />,
          },
          {
            key: 'risk-defect',
            label: (
              <span>
                <RocketOutlined style={{ marginRight: 6, color: '#ea9105' }} />
                Risk vs Defect Heatmap
              </span>
            ),
            children: (
              <RiskDefectHeatmapTab />
            ),
          },
        ]}
      />

      {/* HEAT MAP MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BuildOutlined style={{ color: '#ea9105', fontSize: 20 }} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Bản đồ Nhiệt Rủi ro Hợp nhất 3 Tuyến (3-Lines assurance map)</span>
          </div>
        }
        open={isHeatMapVisible}
        onCancel={() => setIsHeatMapVisible(false)}
        footer={null}
        width={850}
      >
        <div className="p-4">
          <RiskHeatMap
            points={riskAssessments}
            title="Bản đồ phân bổ các quy trình/hoạt động theo Mức độ Ảnh hưởng (Impact) và Khả năng Xảy ra (Likelihood) tổng hợp từ Tuyến 1, 2 & 3."
          />
        </div>
      </Modal>

      {/* RISK TRANSFER MODAL */}
      <RiskTransferModal
        visible={isTransferModalVisible}
        onCancel={() => setIsTransferModalVisible(false)}
        onSuccess={() => {
          setIsTransferModalVisible(false);
          fetchAuditUniverses();
          fetchRiskAssessments();
        }}
        auditUniverses={auditUniverses}
      />
    </div>
  );
};

export default RiskAssessment;
