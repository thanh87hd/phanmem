import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

/**
 * Shared Risk HeatMap (5×5 Impact × Likelihood grid)
 * Replaces duplicate implementations in RiskAssessment.tsx modal and ScenarioRiskMap.tsx
 */

interface RiskPoint {
  id: number | string;
  impact?: number;
  likelihood?: number;
  totalScore?: number;
  universeName?: string;
  riskName?: string;
  label?: string;
  color?: string;
}

interface RiskHeatMapProps {
  points: RiskPoint[];
  width?: number;
  height?: number;
  title?: string;
  getPointLabel?: (point: RiskPoint) => string;
  getPointColor?: (point: RiskPoint) => string;
  onPointClick?: (point: RiskPoint) => void;
}

const defaultGetPointColor = (point: RiskPoint): string => {
  const score = point.totalScore ?? 0;
  if (point.color) return point.color;
  if (score >= 80) return '#cf1322';
  if (score >= 60) return '#d46b08';
  return '#389e0d';
};

const defaultGetPointLabel = (point: RiskPoint): string => {
  return point.universeName || point.riskName || point.label || String(point.id);
};

const RiskHeatMap: React.FC<RiskHeatMapProps> = ({
  points,
  width = 450,
  height = 450,
  title,
  getPointLabel = defaultGetPointLabel,
  getPointColor = defaultGetPointColor,
  onPointClick,
}) => {
  return (
    <div className="flex flex-col items-center">
      {title && (
        <Text className="mb-4 text-center">{title}</Text>
      )}

      <div
        className="relative"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)',
        }}
      >
        {Array.from({ length: 25 }).map((_, i) => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          const y = 5 - row; // Impact (5 to 1)
          const x = col + 1; // Likelihood (1 to 5)

          // Dynamic Color logic for LPBank Brand Heatmap
          let bgColor = '#fcfaf7';
          if (x + y >= 8) bgColor = '#fff1f0';
          else if (x + y >= 6) bgColor = '#fffbe6';
          else if (x + y >= 4) bgColor = '#f6ffed';

          let borderStyle = '1px solid #f0f0f0';
          if (x === 3 && y === 3) borderStyle = '2px dashed #ea9105';

          const cellPoints = points.filter(
            (d) => (d.impact || 3) === y && (d.likelihood || 3) === x,
          );

          return (
            <div
              key={i}
              className="relative group"
              style={{
                border: borderStyle,
                backgroundColor: bgColor,
                transition: 'all 0.3s',
              }}
            >
              {cellPoints.map((d, idx) => (
                <div
                  key={d.id}
                  className="absolute w-5 h-5 rounded-full cursor-pointer shadow border border-white flex items-center justify-center text-[10px] text-white font-bold"
                  style={{
                    top: `${15 + idx * 20}%`,
                    left: `${15 + idx * 20}%`,
                    backgroundColor: getPointColor(d),
                  }}
                  title={`${getPointLabel(d)} (Score: ${d.totalScore ?? 0})`}
                  onClick={() => onPointClick?.(d)}
                />
              ))}

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 text-white text-[10px] font-bold pointer-events-none">
                Ảnh hưởng: {y} | Xảy ra: {x}
              </div>
            </div>
          );
        })}

        {/* Axis Labels */}
        <div
          className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-gray-500 font-bold tracking-widest text-xs"
          style={{ fontFamily: 'Outfit' }}
        >
          ẢNH HƯỞNG (IMPACT)
        </div>
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-500 font-bold tracking-widest text-xs"
          style={{ fontFamily: 'Outfit' }}
        >
          KHẢ NĂNG (LIKELIHOOD)
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex gap-6 mt-12 text-xs"
        style={{ fontFamily: 'Outfit' }}
      >
        <span className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#cf1322' }} />
          Rủi ro Rất cao (Critical)
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#d46b08' }} />
          Rủi ro Trung bình (Medium)
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#389e0d' }} />
          Rủi ro Thấp (Low)
        </span>
      </div>
    </div>
  );
};

export default RiskHeatMap;
