import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Divider,
  Table,
  Spin,
  Timeline,
  Typography,
} from 'antd';
import { EyeOutlined, HistoryOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface RiskScoringDetailDrawerProps {
  open: boolean;
  selectedRecord: any;
  historyData: any[];
  historyLoading: boolean;
  onClose: () => void;
  getStatusTag: (status: string) => React.ReactNode;
  getLevelColor: (level: string) => string;
}

export const RiskScoringDetailDrawer: React.FC<RiskScoringDetailDrawerProps> = ({
  open,
  selectedRecord,
  historyData,
  historyLoading,
  onClose,
  getStatusTag,
  getLevelColor,
}) => {
  const { t } = useTranslation();

  return (
    <Drawer
      title={
        <div>
          <EyeOutlined style={{ color: '#ea9105', marginRight: 8 }} />
          Chi tiết Đánh giá Rủi ro
        </div>
      }
      open={open}
      onClose={onClose}
      width={640}
    >
      {selectedRecord && (
        <div>
          <Descriptions
            bordered
            column={2}
            size="small"
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label="Quy trình" span={2}>
              <strong>{selectedRecord.universeName}</strong>
            </Descriptions.Item>
            <Descriptions.Item
              label={t('riskAssessment.excel.department', 'Bộ phận')}
            >
              {selectedRecord.department || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('auditPlan.cols.year', 'Năm')}>
              {selectedRecord.assessmentYear}
            </Descriptions.Item>
            <Descriptions.Item
              label={t('riskAssessment.excel.totalScore', 'Tổng điểm')}
            >
              <strong style={{ fontSize: 16, color: '#ea9105' }}>
                {selectedRecord.totalScore}
              </strong>
            </Descriptions.Item>
            <Descriptions.Item label="Mức rủi ro">
              <Tag
                color={getLevelColor(selectedRecord.riskLevel)}
                style={{ fontWeight: 600 }}
              >
                {selectedRecord.riskLevel}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item
              label={t('riskAssessment.excel.impact', 'Ảnh hưởng')}
            >
              {selectedRecord.impact}/5
            </Descriptions.Item>
            <Descriptions.Item
              label={t('riskAssessment.excel.likelihood', 'Khả năng')}
            >
              {selectedRecord.likelihood}/5
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái" span={2}>
              {getStatusTag(selectedRecord.status || 'Draft')}
            </Descriptions.Item>
            <Descriptions.Item label="Người đánh giá">
              {selectedRecord.assessedByName || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Người duyệt">
              {selectedRecord.reviewedByName || '—'}
            </Descriptions.Item>
            {selectedRecord.reviewNotes && (
              <Descriptions.Item label="Ghi chú phê duyệt" span={2}>
                {selectedRecord.reviewNotes}
              </Descriptions.Item>
            )}
            {selectedRecord.notes && (
              <Descriptions.Item label="Ghi chú đánh giá" span={2}>
                {selectedRecord.notes}
              </Descriptions.Item>
            )}
            {selectedRecord.mitigationPlan && (
              <Descriptions.Item label="Kế hoạch giảm thiểu" span={2}>
                {selectedRecord.mitigationPlan}
              </Descriptions.Item>
            )}
            {selectedRecord.riskDescription && (
              <Descriptions.Item label="Mô tả rủi ro" span={2}>
                {selectedRecord.riskDescription}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Chi tiết chấm điểm */}
          {selectedRecord.criteriaScores &&
            Array.isArray(selectedRecord.criteriaScores) &&
            selectedRecord.criteriaScores.length > 0 && (
              <>
                <Divider
                  orientation={'left' as any}
                  style={{ fontSize: 14, fontWeight: 600 }}
                >
                  Chi tiết chấm điểm theo tiêu chí
                </Divider>
                <Table
                  dataSource={selectedRecord.criteriaScores}
                  rowKey="criteriaId"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Tiêu chí',
                      dataIndex: 'criteriaName',
                      key: 'criteriaName',
                    },
                    {
                      title: 'Trọng số',
                      dataIndex: 'weight',
                      key: 'weight',
                      width: 80,
                      render: (w: number) => `${w}%`,
                    },
                    {
                      title: 'Điểm',
                      dataIndex: 'score',
                      key: 'score',
                      width: 70,
                      render: (s: number) => <strong>{s}</strong>,
                    },
                    {
                      title: 'Điểm quy đổi',
                      dataIndex: 'weightedScore',
                      key: 'weightedScore',
                      width: 100,
                      render: (s: number) => (
                        <strong style={{ color: '#ea9105' }}>{s}</strong>
                      ),
                    },
                  ]}
                />
              </>
            )}

          {/* Lịch sử đánh giá */}
          {selectedRecord.auditUniverseId && (
            <>
              <Divider
                orientation={'left' as any}
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                <HistoryOutlined style={{ marginRight: 6 }} />
                Lịch sử đánh giá
              </Divider>
              {historyLoading ? (
                <Spin />
              ) : historyData.length > 0 ? (
                <Timeline
                  items={historyData.map((h) => ({
                    color:
                      h.id === selectedRecord.id
                        ? '#ea9105'
                        : h.status === 'Approved'
                        ? 'green'
                        : h.status === 'Rejected'
                        ? 'red'
                        : 'gray',
                    children: (
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          Năm {h.assessmentYear} — {h.totalScore} điểm
                        </div>
                        <div style={{ fontSize: 12 }}>
                          <Tag
                            color={getLevelColor(h.riskLevel)}
                            style={{ fontSize: 10 }}
                          >
                            {h.riskLevel}
                          </Tag>
                          {getStatusTag(h.status || 'Draft')}
                        </div>
                        {h.assessedByName && (
                          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                            Người đánh giá: {h.assessedByName}
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Chưa có lịch sử đánh giá khác.
                </Text>
              )}
            </>
          )}
        </div>
      )}
    </Drawer>
  );
};
