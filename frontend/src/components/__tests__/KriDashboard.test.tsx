import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MultiMetadataUpload } from '../KriDashboard';
import api from '../../services/api';
import { message } from 'antd';

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
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Same hygiene measure as AuditEngagements.test.tsx: antd's static `message` API renders
// into a global React root that RTL's auto-cleanup does not own.
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      loading: vi.fn(),
      open: vi.fn(),
      destroy: vi.fn(),
      config: vi.fn(),
    },
  };
});

const AUDIT_UNIVERSES = [
  { id: 11, name: 'Chi nhánh Hà Nội', departmentCode: 'CN01' },
  { id: 12, name: 'Chi nhánh Đà Nẵng', departmentCode: 'CN02' },
];

/**
 * Adds one file through the real antd Upload.Dragger <input type="file"> so the component's
 * own `beforeUpload` -> `handleFilesAdded` path runs (no internals are stubbed).
 */
function addFileThroughDragger(fileName: string) {
  const file = new File(['kri,row,data'], fileName, { type: 'application/vnd.ms-excel' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(fileInput).not.toBeNull();
  act(() => {
    fireEvent.change(fileInput, { target: { files: [file] } });
  });
  return file;
}

async function clickUploadButton() {
  const uploadButton = await screen.findByRole('button', {
    name: /Tải lên & Lưu tất cả \(1 file\)/,
  });
  await act(async () => {
    fireEvent.click(uploadButton);
  });
}

describe('MultiMetadataUpload (FIX 1 — optional onUploaded callback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('KRI-01: uploads successfully when NO onUploaded prop is passed (must not throw a TypeError)', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        totalFiles: 1,
        totalAlertsCreated: 2,
        files: [{ fileName: 'kri_t1.xlsx', status: 'success', alertsCreated: 2 }],
      },
    });

    render(<MultiMetadataUpload auditUniverses={AUDIT_UNIVERSES} departments={[]} />);

    addFileThroughDragger('kri_t1.xlsx');
    await clickUploadButton();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    const [url, body, config] = vi.mocked(api.post).mock.calls[0];
    expect(url).toBe('/continuous-monitoring/kri/upload-per-file');
    expect(body).toBeInstanceOf(FormData);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
    expect(JSON.parse((body as FormData).get('filesMetadata') as string)).toEqual([
      {
        fileName: 'kri_t1.xlsx',
        reportMonth: expect.any(Number),
        reportYear: expect.any(Number),
      },
    ]);

    // The success message proves the callbacks after the upload actually ran to completion.
    expect(message.success).toHaveBeenCalledTimes(1);
    expect(message.success).toHaveBeenCalledWith('Tải lên thành công 1 file — tổng 2 chỉ số KRI');
    // Regression: the unguarded `onUploaded()` used to throw inside the try-block, which the
    // catch swallowed into `message.error`.
    expect(message.error).not.toHaveBeenCalled();

    expect(screen.getByText('2 chỉ số')).toBeDefined();
  });

  it('KRI-02: still invokes onUploaded when the prop IS provided', async () => {
    const onUploaded = vi.fn();
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        totalFiles: 1,
        totalAlertsCreated: 3,
        files: [{ fileName: 'kri_t2.xlsx', status: 'success', alertsCreated: 3 }],
      },
    });

    render(
      <MultiMetadataUpload auditUniverses={AUDIT_UNIVERSES} departments={[]} onUploaded={onUploaded} />,
    );

    addFileThroughDragger('kri_t2.xlsx');
    await clickUploadButton();

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });

    expect(message.success).toHaveBeenCalledWith('Tải lên thành công 1 file — tổng 3 chỉ số KRI');
    expect(message.error).not.toHaveBeenCalled();
    expect(screen.getByText('3 chỉ số')).toBeDefined();
  });
});
