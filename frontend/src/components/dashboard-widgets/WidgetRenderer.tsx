import React from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col } from 'antd';
import type { WidgetConfig } from '../../utils/dashboardWidgetRegistry';

interface WidgetRendererProps {
  config: WidgetConfig[];
  widgetMap: Record<string, React.ReactNode>;
}

/**
 * Renders widgets according to their config (order, visibility, size).
 * Handles layout by grouping half/quarter widgets into rows.
 */
const WidgetRenderer: React.FC<WidgetRendererProps> = ({ config, widgetMap }) => {
  const visibleWidgets = config
    .filter((w) => w.visible && widgetMap[w.widgetId])
    .sort((a, b) => a.order - b.order);

  const sizeToSpan = (size: string): number => {
    switch (size) {
      case 'quarter':
        return 6;
      case 'half':
        return 12;
      case 'full':
      default:
        return 24;
    }
  };

  return (
    <>
      {visibleWidgets.map((w) => {
        const span = sizeToSpan(w.size);
        if (span === 24) {
          // Full-width widget gets its own row
          return (
            <Row key={w.widgetId} className="mb-6">
              <Col span={24}>{widgetMap[w.widgetId]}</Col>
            </Row>
          );
        }
        // For half/quarter widgets, just render inline — parent should use Row/gutter
        return (
          <Col key={w.widgetId} xs={24} lg={span} className="mb-6">
            {widgetMap[w.widgetId]}
          </Col>
        );
      })}
    </>
  );
};

/**
 * Smart renderer that groups non-full widgets into rows automatically.
 */
export const SmartWidgetRenderer: React.FC<WidgetRendererProps> = ({
  config,
  widgetMap,
}) => {
  const { t } = useTranslation();
  const visibleWidgets = config
    .filter((w) => w.visible && widgetMap[w.widgetId])
    .sort((a, b) => a.order - b.order);

  const sizeToSpan = (size: string): number => {
    switch (size) {
      case 'quarter':
        return 6;
      case 'half':
        return 12;
      case 'full':
      default:
        return 24;
    }
  };

  const elements: React.ReactNode[] = [];
  let rowBuffer: { widgetId: string; span: number; node: React.ReactNode }[] = [];
  let rowSpanSum = 0;

  const flushRow = () => {
    if (rowBuffer.length === 0) return;
    elements.push(
      <Row gutter={[16, 16]} key={`row-${rowBuffer.map((r) => r.widgetId).join('-')}`} className="mb-6">
        {rowBuffer.map((item) => (
          <Col key={item.widgetId} xs={24} lg={item.span}>
            {item.node}
          </Col>
        ))}
      </Row>,
    );
    rowBuffer = [];
    rowSpanSum = 0;
  };

  for (const w of visibleWidgets) {
    const span = sizeToSpan(w.size);
    const node = widgetMap[w.widgetId];

    if (span === 24) {
      // Full-width: flush any buffered items first, then render standalone
      flushRow();
      elements.push(
        <Row key={w.widgetId} className="mb-6">
          <Col span={24}>{node}</Col>
        </Row>,
      );
    } else {
      // Partial width: buffer into row
      if (rowSpanSum + span > 24) {
        flushRow();
      }
      rowBuffer.push({ widgetId: w.widgetId, span, node });
      rowSpanSum += span;
    }
  }

  // Flush remaining
  flushRow();

  return <>{elements}</>;
};

export default WidgetRenderer;
