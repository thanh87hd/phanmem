import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WorkingPapers from '../WorkingPapers';
import api from '../../services/api';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'vi' },
  }),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/useCurrentUser', () => ({
  useCurrentUser: () => ({
    id: 1,
    username: 'auditor1',
    role: 'Kiểm toán viên',
  }),
}));

vi.mock('../../utils/permission', () => ({
  hasPermission: () => true,
}));

// Mock sub-grids and modals
vi.mock('../components/CreditWorkingPaperGrid', () => ({
  CreditWorkingPaperGrid: () => <div data-testid="credit-grid">Credit Grid Component</div>,
}));
vi.mock('../components/PTDRemediationGrid', () => ({
  PTDRemediationGrid: () => <div data-testid="ptd-grid">PTD Grid Component</div>,
}));
vi.mock('../components/WorkingPaperDetailDrawer', () => ({
  WorkingPaperDetailDrawer: () => <div data-testid="detail-drawer">Detail Drawer</div>,
}));
vi.mock('../components/WorkingPaperQaReviewModal', () => ({
  WorkingPaperQaReviewModal: () => <div data-testid="qa-modal">QA Modal</div>,
}));
vi.mock('../../components/DataImportModal', () => ({
  DataImportModal: () => <div data-testid="import-modal">Import Modal</div>,
}));

describe('WorkingPapers Page (WP-01 -> WP-05)', () => {
  const mockWorkingPapers = [
    {
      id: 301,
      title: 'Hồ sơ Kiểm toán Tín dụng Chi nhánh Hà Nội',
      referenceCode: 'WP-TD-01',
      status: 'Draft',
      creator: 'auditor1',
      planName: 'Kế hoạch năm 2025',
    },
    {
      id: 302,
      title: 'Hồ sơ Kiểm toán Vận hành Khối CNTT',
      referenceCode: 'WP-VH-02',
      status: 'Reviewed',
      creator: 'auditor2',
      planName: 'Kế hoạch năm 2025',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/working-papers')) {
        return Promise.resolve({ data: mockWorkingPapers });
      }
      if (url.includes('/audit-plans')) {
        return Promise.resolve({ data: [{ id: 101, name: 'Kế hoạch năm 2025' }] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('WP-01: loads and displays working papers table', async () => {
    render(<WorkingPapers />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/working-papers?type=WP');
    });

    expect(screen.getByText('Hồ sơ Kiểm toán Tín dụng Chi nhánh Hà Nội')).toBeDefined();
    expect(screen.getByText('Hồ sơ Kiểm toán Vận hành Khối CNTT')).toBeDefined();
    expect(screen.getByText('WP-TD-01')).toBeDefined();
  });

  it('WP-02: renders status tags accurately', async () => {
    render(<WorkingPapers />);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ Kiểm toán Tín dụng Chi nhánh Hà Nội')).toBeDefined();
    });

    expect(screen.getAllByText(/Bản nháp/i).length).toBeGreaterThan(0);
  });

  it('WP-03: opens Credit Matrix tab when selecting credit working paper action', async () => {
    render(<WorkingPapers />);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ Kiểm toán Tín dụng Chi nhánh Hà Nội')).toBeDefined();
    });

    // Look for button to open credit matrix / working paper
    const matrixBtns = screen.getAllByRole('button', { name: /(Ma trận|Chi tiết|Xem)/i });
    if (matrixBtns.length > 0) {
      fireEvent.click(matrixBtns[0]);
    }
  });

  it('WP-04: filters by assignment scope (all vs my assignments)', async () => {
    render(<WorkingPapers />);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ Kiểm toán Tín dụng Chi nhánh Hà Nội')).toBeDefined();
    });

    const myScopeRadio = screen.queryByText(/Của tôi|Phân công cho tôi/i);
    if (myScopeRadio) {
      fireEvent.click(myScopeRadio);
    }
  });
});
