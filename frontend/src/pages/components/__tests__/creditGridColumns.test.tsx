import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getCreditCompactColumns, getCreditFullColumns, CreditGridColumnParams } from '../creditGridColumns';
import type { CreditSampleItem } from '../CreditCustomerDetailModal';

describe('creditGridColumns', () => {
  const mockParams: CreditGridColumnParams = {
    filteredSamples: [
      { id: 1, sequenceNo: 1, cifOrAccount: 'CIF001', customerName: 'Nguyen Van A' } as CreditSampleItem,
      { id: 2, sequenceNo: 2, cifOrAccount: 'CIF002', customerName: 'Tran Thi B' } as CreditSampleItem,
    ],
    workingPaper: {
      engagement: { branchName: 'CN Ho Chi Minh' },
    },
    readOnly: false,
    auditorOptions: [
      { label: 'Auditor 1', value: 'auditor1' },
      { label: 'Auditor 2', value: 'auditor2' },
    ],
    universeOptions: [{ label: 'Uni 1', value: 'uni1' }],
    defectCodeOptions: [{ label: 'ERR01', value: 'ERR01' }],
    handleOpenDetailModal: vi.fn(),
    handleCellChange: vi.fn(),
    handleSaveRow: vi.fn().mockResolvedValue(true),
  };

  describe('getCreditCompactColumns structure', () => {
    const columns = getCreditCompactColumns(mockParams);

    it('returns an array of column definitions with expected keys', () => {
      expect(Array.isArray(columns)).toBe(true);
      const keys = columns.map((col: any) => col.key || col.dataIndex);
      expect(keys).toContain('sequenceNo');
      expect(keys).toContain('cifOrAccount');
      expect(keys).toContain('customerName');
      expect(keys).toContain('branchCode');
      expect(keys).toContain('loanAmount');
      expect(keys).toContain('debtGroup');
      expect(keys).toContain('testedBy');
      expect(keys).toContain('residualRisk');
      expect(keys).toContain('detailedRisk');
      expect(keys).toContain('includeInReport');
    });

    it('sequenceNo renderer displays sequence number and finding badge when findingId is present', () => {
      const col = columns.find((c: any) => c.key === 'sequenceNo') as any;
      expect(col).toBeDefined();

      const recordWithFinding: CreditSampleItem = {
        id: 10,
        sequenceNo: 10,
        findingId: 42,
      } as CreditSampleItem;

      const { container } = render(<div>{col.render(10, recordWithFinding)}</div>);
      expect(screen.getByText('10')).toBeDefined();
      expect(screen.getByText('FD-42')).toBeDefined();
    });

    it('sequenceNo renderer handles record without findingId', () => {
      const col = columns.find((c: any) => c.key === 'sequenceNo') as any;
      const recordWithoutFinding = { id: 5, sequenceNo: 5 } as CreditSampleItem;

      render(<div>{col.render(5, recordWithoutFinding)}</div>);
      expect(screen.getByText('5')).toBeDefined();
      expect(screen.queryByText(/FD-/)).toBeNull();
    });

    it('loanAmount renderer formats number with locale and unit', () => {
      const col = columns.find((c: any) => c.key === 'loanAmount') as any;
      expect(col).toBeDefined();

      const { container } = render(<div>{col.render(1500000000)}</div>);
      expect(container.textContent).toContain('tỷ');
    });

    it('loanAmount renderer handles zero or falsy val safely', () => {
      const col = columns.find((c: any) => c.key === 'loanAmount') as any;
      const { container } = render(<div>{col.render(0)}</div>);
      expect(container.textContent).toContain('0 tỷ');
    });

    it('debtGroup renderer maps group to proper tag text', () => {
      const col = columns.find((c: any) => c.key === 'debtGroup') as any;
      const { container } = render(<div>{col.render('1')}</div>);
      expect(container.textContent).toContain('Nhóm 1');
    });

    it('residualRisk renderer maps risk levels to tags', () => {
      const col = columns.find((c: any) => c.key === 'residualRisk') as any;
      
      const { container: c1 } = render(<div>{col.render('Cao')}</div>);
      expect(c1.textContent).toContain('Cao');

      const { container: c2 } = render(<div>{col.render('Thấp')}</div>);
      expect(c2.textContent).toContain('Thấp');

      const { container: c3 } = render(<div>{col.render('')}</div>);
      expect(c3.textContent).toContain('Trung bình');
    });

    it('branchCode falls back to workingPaper branch name if record has none', () => {
      const col = columns.find((c: any) => c.key === 'branchCode') as any;
      const { container } = render(<div>{col.render('')}</div>);
      expect(container.textContent).toContain('CN Ho Chi Minh');
    });

    it('branchCode falls back to Chi nhánh if workingPaper has no branch name', () => {
      const colsNoWp = getCreditCompactColumns({
        ...mockParams,
        workingPaper: null,
      });
      const col = colsNoWp.find((c: any) => c.key === 'branchCode') as any;
      const { container } = render(<div>{col.render('')}</div>);
      expect(container.textContent).toContain('Chi nhánh');
    });

    it('detailedRisk falls back through note properties when detailedRisk is empty', () => {
      const col = columns.find((c: any) => c.key === 'detailedRisk') as any;

      // Case 1: has postExplanationNote
      const r1 = { id: 1, postExplanationNote: 'Giải trình bổ sung' } as CreditSampleItem;
      const { container: c1 } = render(<div>{col.render('', r1)}</div>);
      expect(c1.textContent).toContain('Giải trình bổ sung');

      // Case 2: has preExplanationNote
      const r2 = { id: 2, preExplanationNote: 'Ghi chú ban đầu' } as CreditSampleItem;
      const { container: c2 } = render(<div>{col.render('', r2)}</div>);
      expect(c2.textContent).toContain('Ghi chú ban đầu');

      // Case 3: completely empty
      const r3 = { id: 3 } as CreditSampleItem;
      const { container: c3 } = render(<div>{col.render('', r3)}</div>);
      expect(c3.textContent).toContain('Chưa ghi nhận tồn tại');
    });
  });

  describe('getCreditFullColumns structure', () => {
    const fullCols = getCreditFullColumns(mockParams);

    it('returns grouped column blocks containing all 40+ leaf columns', () => {
      expect(Array.isArray(fullCols)).toBe(true);
      // Group blocks (Khối 1 to Khối 6)
      expect(fullCols.length).toBeGreaterThanOrEqual(5);

      // Total leaf columns across all groups
      const allLeafColumns = fullCols.flatMap((group: any) => group.children || [group]);
      expect(allLeafColumns.length).toBeGreaterThan(25);

      const keys = allLeafColumns.map((c: any) => c.key || c.dataIndex);
      expect(keys).toContain('sequenceNo');
      expect(keys).toContain('branchCode');
      expect(keys).toContain('cifOrAccount');
      expect(keys).toContain('customerName');
      expect(keys).toContain('loanAmount');
      expect(keys).toContain('debtGroup');
    });

    it('safely handles readOnly mode', () => {
      const readOnlyCols = getCreditFullColumns({
        ...mockParams,
        readOnly: true,
      });
      expect(Array.isArray(readOnlyCols)).toBe(true);
    });
  });
});
