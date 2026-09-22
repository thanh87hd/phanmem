import React from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col, Card, Statistic, Table, Typography, Progress, Button } from 'antd';
import { ReloadOutlined, DatabaseOutlined, HddOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const { Title } = Typography;

const InfrastructureMonitor: React.FC = () => {
  const { t } = useTranslation();
  // Polling every 5 seconds
  const { data: server, refetch: refetchServer } = useQuery({
    queryKey: ['monitor', 'server'],
    queryFn: () => api.get('/monitor/server').then((res) => res.data),
    refetchInterval: 5000,
  });
  const { data: db, refetch: refetchDb } = useQuery({
    queryKey: ['monitor', 'database'],
    queryFn: () => api.get('/monitor/database').then((res) => res.data),
    refetchInterval: 5000,
  });
  const { data: queues, refetch: refetchQueues } = useQuery({
    queryKey: ['monitor', 'queues'],
    queryFn: () => api.get('/monitor/queues').then((res) => res.data),
    refetchInterval: 5000,
  });

  const handleRefresh = () => {
    refetchServer();
    refetchDb();
    refetchQueues();
  };

  const slowQueriesColumns = [
    { title: 'Query', dataIndex: 'query', key: 'query', ellipsis: true },
    { title: 'Calls', dataIndex: 'calls', key: 'calls', width: 100 },
    { title: 'Mean Time (ms)', dataIndex: 'mean_exec_time', key: 'mean_exec_time', width: 150 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Infrastructure Monitor</Title>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>Refresh Data</Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic title="CPU Load (%)" value={server?.cpuLoad || 0} precision={2} />
            <Progress percent={server?.cpuLoad || 0} showInfo={false} status={(server?.cpuLoad || 0) > 80 ? 'exception' : 'active'} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="RAM Usage (GB)" value={server?.ramUsed || 0} suffix={`/ ${server?.ramTotal || 0}`} precision={2} />
            <Progress percent={server?.ramPercent || 0} showInfo={false} status={(server?.ramPercent || 0) > 85 ? 'exception' : 'active'} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Disk Usage (GB)" value={server?.diskUsed || 0} suffix={`/ ${server?.diskTotal || 0}`} precision={2} />
            <Progress percent={server?.diskPercent || 0} showInfo={false} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title={<><DatabaseOutlined /> Database (PostgreSQL)</>} style={{ height: '100%' }}>
            <Statistic title="Active Connections" value={db?.activeConnections || 0} />
            <div style={{ marginTop: 24 }}>
              <Typography.Text strong>Slow Queries (Top 5)</Typography.Text>
              <Table 
                dataSource={db?.slowQueries || []} 
                columns={slowQueriesColumns} 
                rowKey="query" 
                pagination={false} 
                size="small" 
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<><HddOutlined /> Background Queues (BullMQ)</>} style={{ height: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card type="inner" title="Reports Queue">
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Statistic title="Waiting" value={queues?.reportsQueue?.waiting ?? 0} valueStyle={{ color: (queues?.reportsQueue?.waiting || 0) > 0 ? '#cf1322' : '#8c8c8c' }} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Active" value={queues?.reportsQueue?.active ?? 0} valueStyle={{ color: '#3f8600' }} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Completed" value={queues?.reportsQueue?.completed ?? 0} valueStyle={{ color: '#1890ff', fontSize: 18 }} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Failed" value={queues?.reportsQueue?.failed ?? 0} valueStyle={{ color: (queues?.reportsQueue?.failed || 0) > 0 ? '#f5222d' : '#8c8c8c', fontSize: 18 }} />
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={12}>
                <Card type="inner" title="Working Papers Queue (AI OCR)">
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Statistic title="Waiting" value={queues?.workingPapersQueue?.waiting ?? 0} valueStyle={{ color: (queues?.workingPapersQueue?.waiting || 0) > 0 ? '#cf1322' : '#8c8c8c' }} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Active" value={queues?.workingPapersQueue?.active ?? 0} valueStyle={{ color: '#3f8600' }} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Completed" value={queues?.workingPapersQueue?.completed ?? 0} valueStyle={{ color: '#1890ff', fontSize: 18 }} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Failed" value={queues?.workingPapersQueue?.failed ?? 0} valueStyle={{ color: (queues?.workingPapersQueue?.failed || 0) > 0 ? '#f5222d' : '#8c8c8c', fontSize: 18 }} />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InfrastructureMonitor;
