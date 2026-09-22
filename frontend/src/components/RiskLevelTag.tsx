import React from 'react';
import { Tag } from 'antd';

/**
 * Shared RiskLevelTag — Single source of truth for risk level display.
 * Replaces inline logic in Dashboard, RiskScoringTab, AuditPlan, RiskRegister, etc.
 */

interface RiskLevelTagProps {
  riskLevel?: string;
  totalScore?: number;
  showScore?: boolean;
  style?: React.CSSProperties;
}

type RiskBand = 'Đỏ' | 'Cam' | 'Vàng' | 'Xanh';

interface ParsedRisk {
  rank: number;
  label: string;
  labelVi: string;
  band: RiskBand;
  color: string;
  tagColor: string;
  isHighRisk: boolean;
}

export function parseRiskLevel(riskLevel: string): ParsedRisk {
  const level = (riskLevel || '').toLowerCase();

  if (level.includes('hạng 5') || level.includes('hang 5') || level === 'critical') {
    return { rank: 5, label: 'Critical', labelVi: 'Hạng 5 (Kém)', band: 'Đỏ', color: '#cf1322', tagColor: 'error', isHighRisk: true };
  }
  if (level.includes('hạng 4') || level.includes('hang 4') || level === 'high') {
    return { rank: 4, label: 'High', labelVi: 'Hạng 4 (Yếu)', band: 'Cam', color: '#d46b08', tagColor: 'warning', isHighRisk: true };
  }
  if (level.includes('hạng 3') || level.includes('hang 3') || level === 'medium') {
    return { rank: 3, label: 'Medium', labelVi: 'Hạng 3 (TB)', band: 'Vàng', color: '#faad14', tagColor: 'processing', isHighRisk: false };
  }
  if (level.includes('hạng 2') || level.includes('hang 2')) {
    return { rank: 2, label: 'Low', labelVi: 'Hạng 2 (Khá)', band: 'Xanh', color: '#389e0d', tagColor: 'success', isHighRisk: false };
  }
  if (level.includes('hạng 1') || level.includes('hang 1') || level === 'low') {
    return { rank: 1, label: 'Low', labelVi: 'Hạng 1 (Tốt)', band: 'Xanh', color: '#52c41a', tagColor: 'success', isHighRisk: false };
  }

  // Fallback: try to detect English keywords
  if (level.includes('high')) return { rank: 4, label: 'High', labelVi: 'Cao', band: 'Cam', color: '#d46b08', tagColor: 'warning', isHighRisk: true };
  if (level.includes('low')) return { rank: 1, label: 'Low', labelVi: 'Thấp', band: 'Xanh', color: '#52c41a', tagColor: 'success', isHighRisk: false };

  return { rank: 0, label: 'Unassessed', labelVi: 'Chưa đánh giá', band: 'Vàng', color: '#999', tagColor: 'default', isHighRisk: false };
}

export function getRiskColor(riskLevel: string): string {
  return parseRiskLevel(riskLevel).color;
}

const RiskLevelTag: React.FC<RiskLevelTagProps> = ({
  riskLevel,
  totalScore,
  showScore = false,
  style,
}) => {
  if (!riskLevel && !totalScore) return <Tag color="default">N/A</Tag>;

  const parsed = parseRiskLevel(riskLevel || '');
  const label = riskLevel
    ? parsed.labelVi
    : totalScore && totalScore >= 80
      ? 'Rất cao'
      : totalScore && totalScore >= 60
        ? 'Cao'
        : totalScore && totalScore >= 40
          ? 'Trung bình'
          : 'Thấp';

  const tagColor = riskLevel
    ? parsed.tagColor
    : totalScore && totalScore >= 80
      ? 'error'
      : totalScore && totalScore >= 60
        ? 'warning'
        : totalScore && totalScore >= 40
          ? 'processing'
          : 'success';

  return (
    <Tag color={tagColor} style={{ fontWeight: 600, ...style }}>
      {label}
      {showScore && totalScore != null && ` (${totalScore})`}
    </Tag>
  );
};

export default RiskLevelTag;
