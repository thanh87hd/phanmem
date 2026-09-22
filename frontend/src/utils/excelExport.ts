import { isValidElement, ReactNode } from 'react';
import { message } from 'antd';
import api from '../services/api';
import { matchRecordSearch } from './tableFilterHelper';

export interface ExcelColumn<T = any> {
  title?: ReactNode | ((...args: any[]) => ReactNode);
  dataIndex?: keyof T | string;
  key?: string;
  render?: (...args: any[]) => any;
  [key: string]: any;
}

/**
 * Trích xuất chuỗi văn bản từ title của cột (hỗ trợ string, number, hoặc React element)
 */
function getColumnTitleString(title: any, fallbackKey: string): string {
  if (typeof title === 'string') return title.trim();
  if (typeof title === 'number') return String(title);
  if (isValidElement(title)) {
    const props = title.props as any;
    if (typeof props?.children === 'string') return props.children.trim();
    if (Array.isArray(props?.children)) {
      const textParts = props.children.filter((c: any) => typeof c === 'string');
      if (textParts.length > 0) return textParts.join(' ').trim();
    }
  }
  return fallbackKey;
}

/**
 * Xuất dữ liệu bảng Antd thành file Excel chuyên nghiệp với tiêu đề tiếng Việt chuẩn chỉnh.
 */
export const exportToExcel = async <T extends Record<string, any>>(
  data: T[],
  columns: ExcelColumn<T>[],
  fileName: string,
  sheetName: string = 'Sheet1',
): Promise<void> => {
  if (!data || data.length === 0) {
    message.warning('Không có dữ liệu để xuất Excel');
    return;
  }

  const rows = data.map((item: T) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      const key = (col.dataIndex || col.key) as string | undefined;
      if (!key) return;

      // Bỏ qua cột thao tác
      if (key === 'action' || key === 'actions' || key === 'operation') return;

      const titleKey = getColumnTitleString(col.title, key);
      if (titleKey === 'Thao tác' || titleKey === 'Hành động' || !titleKey) return;

      let val = (item as any)[key];

      // Xử lý các trường lồng nhau dạng 'role.name' hoặc 'department.name'
      if (typeof key === 'string' && key.includes('.')) {
        val = key.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), item);
      }

      // Xử lý object đơn giản (VD: { name: 'Admin' })
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if ('name' in val) val = val.name;
        else if ('title' in val) val = val.title;
      }

      row[titleKey] = (val === null || val === undefined) ? '' : val;
    });
    return row;
  });

  try {
    const response = await api.post(
      '/import/export-template',
      { templateData: rows, sheetName, fileName },
      { responseType: 'blob' },
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}.xlsx`);
    document.body.appendChild(link);
    if (process.env.NODE_ENV !== 'test') {
      link.click();
    }
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Lỗi khi xuất file Excel:', error);
    message.error('Không thể xuất file Excel. Vui lòng thử lại sau.');
  }
};

/**
 * Tiện ích tìm kiếm đệ quy toàn cục (chuẩn hóa tiếng Việt, tìm sâu đa cấp)
 */
export const filterRecursive = (item: any, searchVal: string): boolean => {
  return matchRecordSearch(item, searchVal);
};

export default exportToExcel;
