import React from 'react';
import { Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';

/**
 * Remove Vietnamese diacritics for flexible fuzzy searching
 */
export const removeVietnameseTones = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

/**
 * Safely get nested value by dot notation path (e.g. 'role.name' or 'department.title')
 */
export const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }
  return curr;
};

/**
 * Creates Ant Design Table column props for free-text search with dropdown input
 */
export function getColumnSearchProps<T>(
  dataIndex: string,
  title: string = '',
  customGetter?: (record: T) => string | undefined | null
): Partial<ColumnType<T>> {
  return {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={`Tìm ${title || dataIndex}...`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
          autoFocus
        />
        <Space size="small">
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 70 }}
          >
            Tìm
          </Button>
          <Button
            onClick={() => {
              if (clearFilters) clearFilters();
              confirm();
            }}
            size="small"
            style={{ width: 70 }}
          >
            Xóa
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => close()}
          >
            Đóng
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#ea9105' : undefined }} />
    ),
    onFilter: (value: any, record: T) => {
      const rawVal = customGetter ? customGetter(record) : getNestedValue(record, dataIndex);
      if (rawVal === undefined || rawVal === null) return false;
      const targetStr = removeVietnameseTones(String(rawVal));
      const searchStr = removeVietnameseTones(String(value));
      return targetStr.includes(searchStr);
    },
  };
}

/**
 * Creates Ant Design Table column props for select / multi-select filter
 */
export function getColumnSelectFilterProps<T>(
  dataIndex: string,
  options?: Array<{ text: string; value: string | number | boolean }>,
  dataSource?: T[],
  customGetter?: (record: T) => any
): Partial<ColumnType<T>> {
  let filterOptions = options;

  // If no static options provided, extract unique values from dataSource
  if (!filterOptions && dataSource && dataSource.length > 0) {
    const uniqueValues = new Set<string>();
    dataSource.forEach((item) => {
      const val = customGetter ? customGetter(item) : getNestedValue(item, dataIndex);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        uniqueValues.add(String(val).trim());
      }
    });
    filterOptions = Array.from(uniqueValues).sort().map((v) => ({
      text: v,
      value: v,
    }));
  }

  return {
    filters: filterOptions || [],
    filterSearch: true,
    onFilter: (value: any, record: T) => {
      const recordVal = customGetter ? customGetter(record) : getNestedValue(record, dataIndex);
      if (recordVal === undefined || recordVal === null) return false;
      return String(recordVal).trim().toLowerCase() === String(value).trim().toLowerCase();
    },
  };
}

/**
 * Sorter helper for strings (Vietnamese-aware), numbers, or dates
 */
export function getColumnSorter<T>(
  dataIndex: string,
  type: 'string' | 'number' | 'date' = 'string',
  customGetter?: (record: T) => any
) {
  return (a: T, b: T) => {
    const valA = customGetter ? customGetter(a) : getNestedValue(a, dataIndex);
    const valB = customGetter ? customGetter(b) : getNestedValue(b, dataIndex);

    if (valA === undefined || valA === null) return -1;
    if (valB === undefined || valB === null) return 1;

    if (type === 'number') {
      return Number(valA) - Number(valB);
    }

    if (type === 'date') {
      return new Date(valA).getTime() - new Date(valB).getTime();
    }

    return String(valA).localeCompare(String(valB), 'vi');
  };
}

/**
 * Universal object search predicate that checks if a record matches a query string.
 * Supports Vietnamese tone removal, nested objects, arrays, and optional field key filtering.
 */
export function matchRecordSearch(record: any, query: string, targetKeys?: string[]): boolean {
  if (!query || !String(query).trim()) return true;
  if (!record || typeof record !== 'object') return false;

  const normalizedQuery = removeVietnameseTones(String(query));
  if (!normalizedQuery) return true;

  const checkValue = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return removeVietnameseTones(String(val)).includes(normalizedQuery);
    }
    if (Array.isArray(val)) {
      return val.some(checkValue);
    }
    if (typeof val === 'object') {
      return Object.values(val).some(checkValue);
    }
    return false;
  };

  if (targetKeys && targetKeys.length > 0) {
    return targetKeys.some((k) => checkValue(getNestedValue(record, k)));
  }

  return Object.entries(record).some(([k, v]) => {
    if (typeof v === 'function' || k.startsWith('_') || k === 'key') return false;
    return checkValue(v);
  });
}

/**
 * Filter an array of records using the universal search predicate
 */
export function filterRecords<T>(records: T[], query: string, targetKeys?: string[]): T[] {
  if (!query || !String(query).trim()) return records;
  return records.filter((r) => matchRecordSearch(r, query, targetKeys));
}
