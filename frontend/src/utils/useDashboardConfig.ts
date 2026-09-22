const t = (k: string, f?: string) => f || k;
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  getDefaultWidgetConfig,
  mergeConfigWithRegistry,
} from './dashboardWidgetRegistry';
import type { WidgetConfig } from './dashboardWidgetRegistry';

export interface UseDashboardConfigResult {
  /** Current widget configuration (ordered) */
  config: WidgetConfig[];
  /** Whether config is still loading */
  loading: boolean;
  /** Whether user has permission to customize */
  canCustomize: boolean;
  /** Whether customizer panel is open */
  editMode: boolean;
  /** Toggle edit mode */
  setEditMode: (open: boolean) => void;
  /** Toggle visibility of a widget */
  toggleWidget: (widgetId: string) => void;
  /** Change size of a widget */
  resizeWidget: (widgetId: string, size: 'full' | 'half' | 'quarter') => void;
  /** Reorder widgets (move from oldIndex to newIndex) */
  reorderWidgets: (oldIndex: number, newIndex: number) => void;
  /** Update dynamic settings of a widget */
  updateWidgetSettings: (widgetId: string, settings: Record<string, any>) => void;
  /** Save current config to server */
  saveConfig: () => Promise<void>;
  /** Reset to default config */
  resetConfig: () => Promise<void>;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Whether a save is in progress */
  saving: boolean;
}

/**
 * Custom hook for managing dashboard widget configuration.
 *
 * @param dashboardKey - Dashboard identifier (e.g. 'home', 'execution')
 * @param tabKey - Tab identifier within dashboard (e.g. 'all', 'ChiNhanh'). Default: 'default'
 */
export function useDashboardConfig(
  dashboardKey: string,
  tabKey: string = 'default',
): UseDashboardConfigResult {
  const [config, setConfig] = useState<WidgetConfig[]>([]);
  const [savedConfig, setSavedConfig] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCustomize, setCanCustomize] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load config from server
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/config/${dashboardKey}`, {
        params: { tabKey },
      });
      const serverWidgets: WidgetConfig[] = res.data?.widgets || [];
      setCanCustomize(res.data?.canCustomize || false);

      // Merge with registry to handle new/removed widgets
      const merged = mergeConfigWithRegistry(dashboardKey, serverWidgets);
      setConfig(merged);
      setSavedConfig(merged);
    } catch {
      // Fallback to defaults
      const defaults = getDefaultWidgetConfig(dashboardKey);
      setConfig(defaults);
      setSavedConfig(defaults);
    } finally {
      setLoading(false);
    }
  }, [dashboardKey, tabKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConfig();
  }, [loadConfig]);

  // Toggle widget visibility
  const toggleWidget = useCallback((widgetId: string) => {
    setConfig((prev) =>
      prev.map((w) =>
        w.widgetId === widgetId ? { ...w, visible: !w.visible } : w,
      ),
    );
  }, []);

  // Resize widget
  const resizeWidget = useCallback(
    (widgetId: string, size: 'full' | 'half' | 'quarter') => {
      setConfig((prev) =>
        prev.map((w) => (w.widgetId === widgetId ? { ...w, size } : w)),
      );
    },
    [],
  );

  // Reorder widgets
  const reorderWidgets = useCallback((oldIndex: number, newIndex: number) => {
    setConfig((prev) => {
      const items = [...prev];
      const [moved] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, moved);
      // Re-number order
      return items.map((w, idx) => ({ ...w, order: idx + 1 }));
    });
  }, []);

  // Update settings of a widget
  const updateWidgetSettings = useCallback(
    (widgetId: string, settings: Record<string, any>) => {
      setConfig((prev) =>
        prev.map((w) => (w.widgetId === widgetId ? { ...w, settings } : w)),
      );
    },
    [],
  );

  // Save config to server
  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      await api.put(`/dashboard/config/${dashboardKey}`, {
        tabKey,
        widgets: config,
      });
      setSavedConfig([...config]);
    } catch (err) {
      console.error('Failed to save dashboard config:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [dashboardKey, tabKey, config]);

  // Reset to defaults
  const resetConfig = useCallback(async () => {
    setSaving(true);
    try {
      const res = await api.post(`/dashboard/config/${dashboardKey}/reset`, {
        tabKey,
      });
      const defaults: WidgetConfig[] =
        res.data?.widgets || getDefaultWidgetConfig(dashboardKey);
      const merged = mergeConfigWithRegistry(dashboardKey, defaults);
      setConfig(merged);
      setSavedConfig(merged);
    } catch {
      const defaults = getDefaultWidgetConfig(dashboardKey);
      setConfig(defaults);
      setSavedConfig(defaults);
    } finally {
      setSaving(false);
    }
  }, [dashboardKey, tabKey]);

  // Check if there are unsaved changes
  const hasChanges =
    JSON.stringify(config) !== JSON.stringify(savedConfig);

  return {
    config,
    loading,
    canCustomize,
    editMode,
    setEditMode,
    toggleWidget,
    resizeWidget,
    reorderWidgets,
    updateWidgetSettings,
    saveConfig,
    resetConfig,
    hasChanges,
    saving,
  };
}
