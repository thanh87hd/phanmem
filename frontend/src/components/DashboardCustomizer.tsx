import React, { useState, useEffect } from 'react';
import { Drawer, Switch, Button, Space, Typography, Tag, Tooltip, Select, message, Modal, Form, Input, Spin } from 'antd';
import {
  SettingOutlined,
  HolderOutlined,
  UndoOutlined,
  SaveOutlined,
  ColumnWidthOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next';
import { getWidgetDefinitions } from '../utils/dashboardWidgetRegistry';
import type { WidgetConfig, WidgetDefinition, WidgetSettingSchema } from '../utils/dashboardWidgetRegistry';
import api from '../services/api';

// ─── Widget Settings Modal ───
interface WidgetSettingsModalProps {
  open: boolean;
  widget?: WidgetConfig;
  definition?: WidgetDefinition;
  onCancel: () => void;
  onSave: (widgetId: string, settings: Record<string, any>) => void;
}

const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({ open, widget, definition, onCancel, onSave }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [optionsMap, setOptionsMap] = useState<Record<string, Array<{label: string, value: any}>>>({});

  React.useEffect(() => {
    if (open && definition?.settingsSchema) {
      form.setFieldsValue(widget?.settings || {});
      
      // Fetch dynamic options
      const fetchOptions = async () => {
        setLoading(true);
        const newOptionsMap: Record<string, any> = {};
        for (const schema of definition.settingsSchema!) {
          if (schema.source === 'departments') {
            try {
              const res = await api.get('/departments');
              newOptionsMap[schema.key] = res.data.map((d: any) => ({ label: d.name, value: d.name }));
            } catch {
              newOptionsMap[schema.key] = [];
            }
          } else if (schema.source === 'audit-universe') {
            try {
              const res = await api.get('/audit-universe');
              newOptionsMap[schema.key] = res.data.map((d: any) => ({ label: d.name, value: d.name }));
            } catch {
              newOptionsMap[schema.key] = [];
            }
          } else if (schema.options) {
            newOptionsMap[schema.key] = schema.options;
          }
        }
        setOptionsMap(newOptionsMap);
        setLoading(false);
      };
      
      fetchOptions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, definition, widget]);

  const handleFinish = (values: any) => {
    if (widget) {
      onSave(widget.widgetId, values);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SettingOutlined style={{ color: '#ea9105' }} />
          <span>{t('dashboardCustomizer.settings', 'Cấu hình')}: {t(definition?.name || '')}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnClose
      okText={t('dashboardCustomizer.saveSettings', 'Lưu thiết lập')}
      cancelText={t('dashboardCustomizer.cancel', 'Hủy')}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          {definition?.settingsSchema?.map(schema => (
            <Form.Item key={schema.key} name={schema.key} label={t(schema.label, schema.label)}>
              {schema.type === 'select' ? (
                <Select
                  options={optionsMap[schema.key] || []}
                  placeholder={`${t('dashboardCustomizer.select', 'Chọn')} ${t(schema.label, schema.label).toLowerCase()}`}
                  allowClear
                />
              ) : schema.type === 'multi-select' ? (
                <Select
                  mode="multiple"
                  options={optionsMap[schema.key] || []}
                  placeholder={`${t('dashboardCustomizer.select', 'Chọn')} ${t(schema.label, schema.label).toLowerCase()}`}
                  allowClear
                />
              ) : (
                <Input placeholder={`Nhập ${t(schema.label, schema.label).toLowerCase()}`} />
              )}
            </Form.Item>
          ))}
          {(!definition?.settingsSchema || definition.settingsSchema.length === 0) && (
            <Typography.Text type="secondary">{t('dashboardCustomizer.noDynamicSettings', 'Widget này không có tùy chọn cấu hình động.')}</Typography.Text>
          )}
        </Form>
      </Spin>
    </Modal>
  );
};

const { Text, Title } = Typography;

// ─── Draggable widget item ───
function DraggableWidgetItem({
  widget,
  definition,
  index,
  onToggle,
  onResize,
  onOpenSettings,
}: {
  widget: WidgetConfig;
  definition: WidgetDefinition | undefined;
  index: number;
  onToggle: (id: string) => void;
  onResize: (id: string, size: 'full' | 'half' | 'quarter') => void;
  onOpenSettings: (widgetId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Draggable draggableId={widget.widgetId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all mb-2 ${
            widget.visible
              ? 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-sm'
              : 'bg-gray-50 border-gray-100 opacity-60'
          }`}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.75 : widget.visible ? 1 : 0.6,
          }}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <HolderOutlined style={{ fontSize: 16 }} />
          </div>

          {/* Toggle */}
          <Switch
            size="small"
            checked={widget.visible}
            onChange={() => onToggle(widget.widgetId)}
            style={{ flexShrink: 0 }}
          />

          {/* Settings Button (if applicable) */}
          {definition?.settingsSchema && definition.settingsSchema.length > 0 && (
            <Tooltip title="Cấu hình động">
              <Button
                type="text"
                size="small"
                icon={
                  <SettingOutlined
                    className={
                      widget.settings && Object.keys(widget.settings).length > 0
                        ? 'text-amber-500'
                        : 'text-gray-400'
                    }
                  />
                }
                onClick={() => onOpenSettings(widget.widgetId)}
                disabled={!widget.visible}
              />
            </Tooltip>
          )}

          {/* Widget info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Text
                strong={widget.visible}
                className={`text-sm truncate ${widget.visible ? 'text-gray-800' : 'text-gray-400 line-through'}`}
              >
                {t(definition?.name || '') || widget.widgetId}
              </Text>
              {definition?.category && (
                <Tag
                  color={widget.visible ? 'blue' : 'default'}
                  className="text-[10px] m-0"
                >
                  {definition.category}
                </Tag>
              )}
            </div>
            {definition?.description && (
              <Text className="text-[11px] text-gray-400 block truncate">
                {t(definition.description)}
              </Text>
            )}
          </div>

          {/* Size selector */}
          <Tooltip title="Kích thước widget">
            <Select
              size="small"
              value={widget.size}
              onChange={(val) => onResize(widget.widgetId, val)}
              style={{ width: 75 }}
              disabled={!widget.visible}
              options={[
                { value: 'full', label: '100%' },
                { value: 'half', label: '50%' },
                { value: 'quarter', label: '25%' },
              ]}
            />
          </Tooltip>
        </div>
      )}
    </Draggable>
  );
}

// ─── Main Customizer Component ───
interface DashboardCustomizerProps {
  open: boolean;
  onClose: () => void;
  dashboardKey: string;
  config: WidgetConfig[];
  onToggle: (widgetId: string) => void;
  onResize: (widgetId: string, size: 'full' | 'half' | 'quarter') => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onUpdateSettings: (widgetId: string, settings: Record<string, any>) => void;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
  hasChanges: boolean;
  saving: boolean;
}

const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  open,
  onClose,
  dashboardKey,
  config,
  onToggle,
  onResize,
  onReorder,
  onUpdateSettings,
  onSave,
  onReset,
  hasChanges,
  saving,
}) => {
  const { t } = useTranslation();
  const definitions = getWidgetDefinitions(dashboardKey);
  const defMap = new Map(definitions.map((d) => [d.id, d]));

  const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
  const [activeWidgetId, setActiveWidgetId] = React.useState<string | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const oldIndex = result.source.index;
    const newIndex = result.destination.index;
    if (oldIndex !== newIndex) {
      onReorder(oldIndex, newIndex);
    }
  };

  const handleSave = async () => {
    try {
      await onSave();
      message.success('Đã lưu cấu hình Dashboard!');
    } catch {
      message.error('Lỗi khi lưu cấu hình.');
    }
  };

  const handleReset = async () => {
    try {
      await onReset();
      message.success('Đã khôi phục cấu hình mặc định!');
    } catch {
      message.error('Lỗi khi reset cấu hình.');
    }
  };

  const visibleCount = config.filter((w) => w.visible).length;
  const totalCount = config.length;

  // Group by category
  const categories = Array.from(new Set(definitions.map((d) => d.category)));

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <SettingOutlined style={{ color: '#ea9105', fontSize: 18 }} />
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            Tùy chỉnh Dashboard
          </span>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={420}
      extra={
        <Space>
          <Tag color="blue">
            {visibleCount}/{totalCount} widget
          </Tag>
        </Space>
      }
      footer={
        <div className="flex justify-between items-center">
          <Button
            icon={<UndoOutlined />}
            onClick={handleReset}
            loading={saving}
            danger
          >
            Reset mặc định
          </Button>
          <Space>
            <Button onClick={onClose}>{t('common.btnClose', 'Đóng')}</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
              style={{
                backgroundColor: hasChanges ? '#ea9105' : undefined,
                borderColor: hasChanges ? '#ea9105' : undefined,
              }}
            >
              Lưu thay đổi
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text className="text-gray-500 text-xs">
          Bật/tắt, kéo thả sắp xếp và thay đổi kích thước các widget trên
          Dashboard. Thay đổi sẽ được lưu riêng cho tài khoản của bạn.
        </Text>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4">
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            config.forEach((w) => {
              if (!w.visible) onToggle(w.widgetId);
            });
          }}
        >
          Hiện tất cả
        </Button>
        <Button
          size="small"
          icon={<EyeInvisibleOutlined />}
          onClick={() => {
            config.forEach((w) => {
              if (w.visible) onToggle(w.widgetId);
            });
          }}
        >
          Ẩn tất cả
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-customizer-widgets">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {config.map((widget, index) => (
                <DraggableWidgetItem
                  key={widget.widgetId}
                  widget={widget}
                  definition={defMap.get(widget.widgetId)}
                  index={index}
                  onToggle={onToggle}
                  onResize={onResize}
                  onOpenSettings={(id) => {
                    setActiveWidgetId(id);
                    setSettingsModalOpen(true);
                  }}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {hasChanges && (
        <div
          className="mt-4 p-3 rounded-lg text-center"
          style={{
            background: 'linear-gradient(135deg, #fff7e6, #fff1db)',
            border: '1px solid #ffd591',
          }}
        >
          <Text className="text-amber-700 text-xs font-semibold">
            ⚡ Bạn có thay đổi chưa lưu. Nhấn "Lưu thay đổi" để áp dụng.
          </Text>
        </div>
      )}

      {/* Settings Modal */}
      <WidgetSettingsModal
        open={settingsModalOpen}
        widget={activeWidgetId ? config.find(w => w.widgetId === activeWidgetId) : undefined}
        definition={activeWidgetId ? defMap.get(activeWidgetId) : undefined}
        onCancel={() => {
          setSettingsModalOpen(false);
          setActiveWidgetId(null);
        }}
        onSave={(widgetId, settings) => {
          onUpdateSettings(widgetId, settings);
          setSettingsModalOpen(false);
          setActiveWidgetId(null);
        }}
      />
    </Drawer>
  );
};

export default DashboardCustomizer;
