import React from 'react';
import { Card, Typography, Tag } from 'antd';

const { Title, Text } = Typography;

export interface HubHeaderBannerProps {
  title: string;
  tagText: string;
  tagColor?: string;
  description: string;
}

export const HubHeaderBanner: React.FC<HubHeaderBannerProps> = ({
  title,
  tagText,
  tagColor = '#d97706',
  description,
}) => {
  return (
    <Card
      bordered={false}
      style={{
        marginBottom: 16,
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Title level={4} style={{ color: '#f8fafc', margin: 0 }}>
              {title}
            </Title>
            <Tag color={tagColor} style={{ fontWeight: 600 }}>{tagText}</Tag>
          </div>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            {description}
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default HubHeaderBanner;
