import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography, Button, Space, Modal, Tabs } from 'antd';
import {
  DashboardOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  BuildOutlined,
  BarChartOutlined,
  RocketOutlined,
  SwapOutlined,
  RadarChartOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import RiskScoringTab from '../components/RiskScoringTab';
import RiskComparisonTab from '../components/RiskComparisonTab';
import RiskDefectHeatmapTab from '../components/RiskDefectHeatmapTab';
import UnitRestructuringComparisonTab from '../components/UnitRestructuringComparisonTab';
import RiskTransferModal from '../components/RiskTransferModal';
import RiskHeatMap from '../components/RiskHeatMap';
import RiskSignalsDrawer from '../components/risk-scoring/RiskSignalsDrawer';
import ScenarioRiskMap from './ScenarioRiskMap';

const { Title, Text } = Typography;

export const RiskAssessment: React.FC = () => {
  const { t } = useTranslation();

  const [auditUniverses, setAuditUniverses] = useState<any[]>([]);
  const [riskCriteria, setRiskCriteria] = useState<any[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('audit-scoring');
  const [isHeatMapVisible, setIsHeatMapVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [isSignalsDrawerOpen, setIsSignalsDrawerOpen] = useState(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
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
    fetchAuditUniverses();
    fetchRiskCriteria();
    fetchRiskAssessments();
  }, []);

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1">
            <DashboardOutlined style={{ color: '#ea9105', marginRight: 8 }} />
            Đánh giá Rủi ro Phục vụ Kế hoạch KTNB (RBIA Line 3)
          </Title>
          <Text type="secondary">
            Đánh giá rủi ro theo Audit Universe (IIA GIAS 2024 & Thông tư 13/2018/TT-NHNN). Các tín hiệu Tuyến 1, 2, CAATs và phát hiện kỳ trước là dữ liệu đầu vào chỉ-đọc.
          </Text>
        </div>
        <Space wrap>
          <Button
            icon={<RadarChartOutlined style={{ color: '#722ed1' }} />}
            onClick={() => setIsSignalsDrawerOpen(true)}
            style={{ borderColor: '#722ed1', color: '#722ed1' }}
          >
            Tín hiệu Rủi ro (Line 1/2/CAATs)
          </Button>
          <Button
            icon={<AlertOutlined style={{ color: '#eb2f96' }} />}
            onClick={() => setIsScenarioModalOpen(true)}
            style={{ borderColor: '#eb2f96', color: '#eb2f96' }}
          >
            Kịch bản Stress Rủi ro
          </Button>
          <Button
            icon={<SwapOutlined />}
            onClick={() => setIsTransferModalVisible(true)}
            style={{ backgroundColor: '#fa8c16', color: '#fff', borderColor: '#fa8c16' }}
          >
            Chuyển giao Rủi ro ĐVKD
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={() => {
              setRefreshKey((prev) => prev + 1);
              fetchRiskAssessments();
              fetchAuditUniverses();
            }}
          >
            {t('common.btnSyncData', 'Đồng bộ dữ liệu')}
          </Button>
          <Button
            icon={<BuildOutlined style={{ color: '#ea9105' }} />}
            onClick={() => setIsHeatMapVisible(true)}
          >
            {t('common.btnHeatMap', 'Bản đồ Rủi ro (Heat Map)')}
          </Button>
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
                1. Chấm điểm Rủi ro KTNB (Tuyến 3)
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
                2. So sánh & Xu hướng Rủi ro
              </span>
            ),
            children: <RiskComparisonTab />,
          },
          {
            key: 'unit-restructuring',
            label: (
              <span>
                <BuildOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
                3. Biến động ĐVKD & PGDBĐ
              </span>
            ),
            children: <UnitRestructuringComparisonTab />,
          },
          {
            key: 'risk-defect',
            label: (
              <span>
                <RocketOutlined style={{ marginRight: 6, color: '#ea9105' }} />
                4. Risk vs Defect Heatmap
              </span>
            ),
            children: <RiskDefectHeatmapTab />,
          },
        ]}
      />

      {/* RISK SIGNALS READ-ONLY DRAWER */}
      <RiskSignalsDrawer
        open={isSignalsDrawerOpen}
        onClose={() => setIsSignalsDrawerOpen(false)}
      />

      {/* SCENARIO STRESS MAP MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOutlined style={{ color: '#eb2f96', fontSize: 20 }} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
              Kịch bản Rủi ro & Kiểm tra Sức chịu đựng (Scenario Stress Testing)
            </span>
          </div>
        }
        open={isScenarioModalOpen}
        onCancel={() => setIsScenarioModalOpen(false)}
        footer={null}
        width={1100}
        style={{ top: 20 }}
      >
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <ScenarioRiskMap />
        </div>
      </Modal>

      {/* HEAT MAP MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BuildOutlined style={{ color: '#ea9105', fontSize: 20 }} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
              Bản đồ Nhiệt Rủi ro Hợp nhất 3 Tuyến (3-Lines Assurance Heatmap)
            </span>
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
