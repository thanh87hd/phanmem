import React from 'react';
import { Card, Typography, Space, Tag, Button } from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface EngagementHeaderBannerProps {
  selectedEngagement: any;
  onBack: () => void;
}

export const EngagementHeaderBanner: React.FC<EngagementHeaderBannerProps> = ({
  selectedEngagement,
  onBack,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card
      variant="borderless"
      className="shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50"
    >
      <div className="flex justify-between items-start">
        <div>
          <Title level={4}>{selectedEngagement.name}</Title>
          <Space
            split={<Text type="secondary">|</Text>}
            wrap
            style={{ marginBottom: 12 }}
          >
            <Text>
              <UserOutlined />{' '}
              {t('auditEngagements.teamLeader', 'Trưởng đoàn:')}{' '}
              <b>
                {selectedEngagement.leadAuditor ||
                  t('auditEngagements.notAssignedYet', 'Chưa phân công')}
              </b>
            </Text>
            <Text>
              <ClockCircleOutlined /> Thời gian: {selectedEngagement.startDate}{' '}
              đến {selectedEngagement.endDate}
            </Text>
            <Tag color="blue">{selectedEngagement.status}</Tag>
          </Space>
          <div style={{ marginTop: 4, marginBottom: 12 }}>
            <Space wrap size={16}>
              {selectedEngagement.programValidity && (
                <Tag color="orange" style={{ fontWeight: 600 }}>
                  ⏱️ Thời hiệu CTKT: {selectedEngagement.programValidity}
                </Tag>
              )}
              {selectedEngagement.proposalDocUrl && (
                <a
                  href={selectedEngagement.proposalDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                  style={{ fontSize: 13 }}
                >
                  {t('auditEngagements.presentation', '📄 Tờ trình')}
                </a>
              )}
              {selectedEngagement.outlineDocUrl && (
                <a
                  href={selectedEngagement.outlineDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                  style={{ fontSize: 13 }}
                >
                  {t('auditEngagements.outline', '📄 Đề cương')}
                </a>
              )}
              {selectedEngagement.decisionDocUrl && (
                <a
                  href={selectedEngagement.decisionDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                  style={{ fontSize: 13 }}
                >
                  {t('auditEngagements.decisionToEstablish', '📄 Quyết định thành lập')}
                </a>
              )}
            </Space>
          </div>
          {selectedEngagement.teamMembers &&
            selectedEngagement.teamMembers.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  {t('auditEngagements.auditTeam', 'Đoàn kiểm toán:')}{' '}
                </Text>
                {selectedEngagement.teamMembers.map((tm: any, idx: number) => (
                  <Tag color="cyan" key={idx} style={{ marginRight: 6 }}>
                    {tm.fullName} ({tm.role})
                  </Tag>
                ))}
              </div>
            )}
        </div>
        <Space>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm font-semibold h-10 px-4"
            onClick={() =>
              navigate('/working-papers', {
                state: {
                  engagementId: selectedEngagement.id,
                  engagementName: selectedEngagement.name,
                },
              })
            }
          >
            Giấy tờ làm việc W/P
          </Button>
          <Button
            icon={<AuditOutlined />}
            className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 rounded-xl shadow-sm font-semibold h-10 px-4"
            onClick={() =>
              navigate('/audit-reports', {
                state: {
                  engagementId: selectedEngagement.id,
                  engagementName: selectedEngagement.name,
                },
              })
            }
          >
            Báo cáo KT
          </Button>
          <Button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-10"
          >
            {t('auditExpenses.form.btnBack', '← Quay lại danh sách')}
          </Button>
        </Space>
      </div>
    </Card>
  );
};
