import { describe, it, expect } from 'vitest';
import {
  removeVietnameseTones,
  getNestedValue,
  getColumnSearchProps,
  getColumnSelectFilterProps,
  getColumnSorter,
  matchRecordSearch,
  filterRecords,
} from '../tableFilterHelper';

describe('tableFilterHelper', () => {
  // ─────────────────────────────────────────────────────────────
  // removeVietnameseTones
  // ─────────────────────────────────────────────────────────────
  describe('removeVietnameseTones', () => {
    it('removes diacritics from Vietnamese text', () => {
      expect(removeVietnameseTones('Kiểm toán nội bộ')).toBe('kiem toan noi bo');
    });

    it('converts đ → d and Đ → D (then lowercases)', () => {
      expect(removeVietnameseTones('Đơn vị')).toBe('don vi');
      expect(removeVietnameseTones('đề xuất')).toBe('de xuat');
    });

    it('returns empty string for falsy input', () => {
      expect(removeVietnameseTones('')).toBe('');
      expect(removeVietnameseTones(null as any)).toBe('');
      expect(removeVietnameseTones(undefined as any)).toBe('');
    });

    it('trims whitespace', () => {
      expect(removeVietnameseTones('  hello  ')).toBe('hello');
    });

    it('lowercases all output', () => {
      expect(removeVietnameseTones('ABC')).toBe('abc');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getNestedValue
  // ─────────────────────────────────────────────────────────────
  describe('getNestedValue', () => {
    const obj = {
      name: 'Test',
      role: { name: 'Admin', permissions: { read: true } },
      items: [1, 2, 3],
    };

    it('returns top-level value', () => {
      expect(getNestedValue(obj, 'name')).toBe('Test');
    });

    it('returns nested value via dot notation', () => {
      expect(getNestedValue(obj, 'role.name')).toBe('Admin');
    });

    it('returns deeply nested value', () => {
      expect(getNestedValue(obj, 'role.permissions.read')).toBe(true);
    });

    it('returns undefined for missing path', () => {
      expect(getNestedValue(obj, 'nonexistent')).toBeUndefined();
      expect(getNestedValue(obj, 'role.nonexistent')).toBeUndefined();
    });

    it('returns undefined for null object', () => {
      expect(getNestedValue(null, 'name')).toBeUndefined();
    });

    it('returns undefined for empty path', () => {
      expect(getNestedValue(obj, '')).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TF-01: getColumnSearchProps
  // ─────────────────────────────────────────────────────────────
  describe('getColumnSearchProps', () => {
    it('returns object with filterDropdown, filterIcon, and onFilter', () => {
      const props = getColumnSearchProps('name', 'Tên');
      expect(props).toHaveProperty('filterDropdown');
      expect(props).toHaveProperty('filterIcon');
      expect(props).toHaveProperty('onFilter');
    });

    it('onFilter matches Vietnamese text case-insensitively', () => {
      const props = getColumnSearchProps<{ name: string }>('name');
      const record = { name: 'Kiểm toán viên' };
      expect(props.onFilter!('kiem toan', record, [] as any)).toBe(true);
      expect(props.onFilter!('xyz', record, [] as any)).toBe(false);
    });

    it('onFilter returns false for null field value', () => {
      const props = getColumnSearchProps<{ name: string | null }>('name');
      const record = { name: null };
      expect(props.onFilter!('test', record, [] as any)).toBe(false);
    });

    it('supports customGetter', () => {
      const props = getColumnSearchProps<{ data: { val: string } }>(
        'data',
        'Data',
        (r) => r.data.val,
      );
      const record = { data: { val: 'Phát hiện' } };
      expect(props.onFilter!('phat hien', record, [] as any)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TF-02: getColumnSelectFilterProps
  // ─────────────────────────────────────────────────────────────
  describe('getColumnSelectFilterProps', () => {
    it('uses static options when provided', () => {
      const options = [
        { text: 'Active', value: 'Active' },
        { text: 'Inactive', value: 'Inactive' },
      ];
      const props = getColumnSelectFilterProps('status', options);
      expect(props.filters).toEqual(options);
    });

    it('extracts unique values from dataSource when no options', () => {
      const data = [
        { status: 'Active' },
        { status: 'Inactive' },
        { status: 'Active' },
        { status: null },
      ];
      const props = getColumnSelectFilterProps('status', undefined, data);
      expect(props.filters).toHaveLength(2);
      expect((props.filters as any[]).map((f: any) => f.value).sort()).toEqual(['Active', 'Inactive']);
    });

    it('onFilter matches case-insensitively', () => {
      const props = getColumnSelectFilterProps<{ status: string }>('status');
      const record = { status: 'Active' };
      expect(props.onFilter!('active', record, [] as any)).toBe(true);
      expect(props.onFilter!('ACTIVE', record, [] as any)).toBe(true);
    });

    it('onFilter returns false for null value', () => {
      const props = getColumnSelectFilterProps<{ status: string | null }>('status');
      expect(props.onFilter!('Active', { status: null }, [] as any)).toBe(false);
    });

    it('has filterSearch enabled', () => {
      const props = getColumnSelectFilterProps('status');
      expect(props.filterSearch).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TF-03: getColumnSorter
  // ─────────────────────────────────────────────────────────────
  describe('getColumnSorter', () => {
    it('sorts strings with Vietnamese locale', () => {
      const sorter = getColumnSorter<{ name: string }>('name', 'string');
      expect(sorter({ name: 'Anh' }, { name: 'Ba' })).toBeLessThan(0);
      expect(sorter({ name: 'Ba' }, { name: 'Anh' })).toBeGreaterThan(0);
    });

    it('sorts numbers correctly', () => {
      const sorter = getColumnSorter<{ amount: number }>('amount', 'number');
      expect(sorter({ amount: 100 }, { amount: 200 })).toBe(-100);
      expect(sorter({ amount: 300 }, { amount: 100 })).toBe(200);
    });

    it('sorts dates chronologically', () => {
      const sorter = getColumnSorter<{ date: string }>('date', 'date');
      expect(sorter({ date: '2025-01-01' }, { date: '2025-06-01' })).toBeLessThan(0);
      expect(sorter({ date: '2025-12-01' }, { date: '2025-01-01' })).toBeGreaterThan(0);
    });

    it('handles null values (null goes first)', () => {
      const sorter = getColumnSorter<{ name: string | null }>('name', 'string');
      expect(sorter({ name: null }, { name: 'Test' })).toBe(-1);
      expect(sorter({ name: 'Test' }, { name: null })).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // matchRecordSearch & filterRecords
  // ─────────────────────────────────────────────────────────────
  describe('matchRecordSearch', () => {
    const record = {
      id: 1,
      title: 'Phát hiện kiểm toán',
      status: 'Open',
      nested: { dept: 'CN Hà Nội' },
      tags: ['urgent', 'credit'],
    };

    it('returns true when query matches any field', () => {
      expect(matchRecordSearch(record, 'kiểm toán')).toBe(true);
      expect(matchRecordSearch(record, 'kiem toan')).toBe(true);
    });

    it('returns true for empty query', () => {
      expect(matchRecordSearch(record, '')).toBe(true);
      expect(matchRecordSearch(record, '   ')).toBe(true);
    });

    it('returns false when no match', () => {
      expect(matchRecordSearch(record, 'xyz123')).toBe(false);
    });

    it('searches nested objects', () => {
      expect(matchRecordSearch(record, 'Ha Noi')).toBe(true);
    });

    it('searches arrays', () => {
      expect(matchRecordSearch(record, 'urgent')).toBe(true);
      expect(matchRecordSearch(record, 'credit')).toBe(true);
    });

    it('restricts search to targetKeys when provided', () => {
      expect(matchRecordSearch(record, 'Open', ['title'])).toBe(false);
      expect(matchRecordSearch(record, 'Open', ['status'])).toBe(true);
    });

    it('skips functions and underscore/key fields', () => {
      const r = { _internal: 'secret', key: 'row-1', name: 'visible' };
      expect(matchRecordSearch(r, 'secret')).toBe(false);
      expect(matchRecordSearch(r, 'row-1')).toBe(false);
      expect(matchRecordSearch(r, 'visible')).toBe(true);
    });

    it('returns false for null/non-object record', () => {
      expect(matchRecordSearch(null, 'test')).toBe(false);
      expect(matchRecordSearch('string' as any, 'test')).toBe(false);
    });
  });

  describe('filterRecords', () => {
    const records = [
      { id: 1, name: 'Kiểm toán chi nhánh Hà Nội' },
      { id: 2, name: 'Kiểm toán chi nhánh Đà Nẵng' },
      { id: 3, name: 'Đánh giá rủi ro tín dụng' },
    ];

    it('returns all records for empty query', () => {
      expect(filterRecords(records, '')).toHaveLength(3);
    });

    it('filters by matching text (tone-insensitive)', () => {
      const result = filterRecords(records, 'ha noi');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('filters across multiple matches', () => {
      const result = filterRecords(records, 'kiem toan');
      expect(result).toHaveLength(2);
    });

    it('supports targetKeys', () => {
      const result = filterRecords(records, '1', ['id']);
      expect(result).toHaveLength(1);
    });
  });
});
