import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
import { AuditFindingDetailDrawer } from '../AuditFindingDetailDrawer';
import api from '../../../services/api';
import { message } from 'antd';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../findingAiHeuristics', () => ({
  analyzeBankingFindingHeuristics: vi.fn().mockReturnValue({}),
}));

vi.mock('../FindingAppendicesManager', () => ({
  FindingAppendicesManager: () => <div data-testid="appendices-manager">Mock Appendices</div>,
}));

vi.mock('../FindingAiCopilotPanel', () => ({
  FindingAiCopilotPanel: () => <div data-testid="ai-copilot-panel">Mock AI Panel</div>,
}));

/**
 * React 19 flushes passive effects through the Scheduler; under jsdom the Scheduler falls
 * back to Node's `setImmediate`, and that callback reads the global `window` as its very
 * first statement (react-dom-client: `performWorkOnRootViaSchedulerTask`). Vitest deletes
 * `window` immediately after this file's tests finish, so any callback still queued at that
 * moment dies with "ReferenceError: window is not defined" and the run exits non-zero even
 * though every assertion passed.
 */
const flushPendingReactWork = async () => {
  for (let turn = 0; turn < 3; turn += 1) {
    await act(async () => {
      // Real time passes so in-flight jsdom rAF frames (rc-motion enter/leave of the
      // Drawer and of every select dropdown) can finish, then a macrotask turn lets the
      // Scheduler queue drain while `window` still exists.
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      await new Promise<void>((resolve) => setImmediate(resolve));
    });
  }
};

/**
 * antd's global `message` root is a React root RTL does not own: it keeps committing
 * (notice enter/exit motion, queue flushing) in macrotasks after a test has finished,
 * which is exactly how Scheduler callbacks end up queued at environment teardown.
 */
const unmountAllReactRoots = async () => {
  await act(async () => {
    cleanup();
    message.destroy();
  });
};

/**
 * --- antd v6 Select helpers -----------------------------------------------------------------
 * antd v6 only mounts a Select's dropdown into its body portal once that select has been
 * opened, and the selected label is rendered into `.ant-select-content` (there is no
 * `.ant-select-selection-item` any more). The dropdown belonging to one Form.Item is found
 * through the hidden a11y listbox whose id is `<Form.Item name>_list`, so option lookups are
 * scoped to the control under test and can never accidentally match another select.
 */
const openSelectDropdown = async (combobox: HTMLElement, controlName: string): Promise<HTMLElement> => {
  fireEvent.mouseDown(combobox);
  return waitFor(
    () => {
      const listbox = document.getElementById(`${controlName}_list`);
      expect(listbox).not.toBeNull();
      return listbox!.closest('.ant-select-dropdown') as HTMLElement;
    },
    { timeout: 5000 },
  );
};

/** Labels exactly as a user reads them in the open dropdown list. */
const readRenderedOptionLabels = (dropdown: HTMLElement): string[] =>
  Array.from(dropdown.querySelectorAll('.ant-select-item-option')).map(
    (option) => option.querySelector('.ant-select-item-option-content')?.textContent ?? '',
  );

const pickOptionFromDropdown = async (dropdown: HTMLElement, combobox: HTMLElement, optionLabel: string) => {
  const option = await waitFor(
    () => {
      const match = Array.from(dropdown.querySelectorAll('.ant-select-item-option')).find(
        (candidate) => candidate.querySelector('.ant-select-item-option-content')?.textContent === optionLabel,
      );
      expect(match).toBeDefined();
      return match as HTMLElement;
    },
    { timeout: 5000 },
  );

  fireEvent.click(option);

  // The picked label must be the one the control now displays.
  await waitFor(
    () => {
      expect(within(combobox.closest('.ant-select') as HTMLElement).getByText(optionLabel)).toBeDefined();
    },
    { timeout: 5000 },
  );
};

const selectFormOption = async (combobox: HTMLElement, controlName: string, optionLabel: string) => {
  const dropdown = await openSelectDropdown(combobox, controlName);
  await pickOptionFromDropdown(dropdown, combobox, optionLabel);
};

const typeIntoPlaceholder = async (placeholder: string, value: string) => {
  const field = screen.getByPlaceholderText(placeholder);
  fireEvent.change(field, { target: { value } });
  await waitFor(() => {
    expect((field as HTMLTextAreaElement).value).toBe(value);
  });
  return field as HTMLTextAreaElement;
};

describe('AuditFindingDetailDrawer - UAT Verification (TC-FIND-01 & TC-FIND-02)', { timeout: 90000 }, () => {
  const mockEngagements = [
    {
      id: 101,
      code: 'KTNB-2026-001',
      name: 'Kiểm toán Khối Khách hàng Doanh nghiệp',
      branchCode: 'HO',
      branchName: 'Hội sở chính',
      auditedDepartmentId: 1,
    },
    {
      id: 102,
      code: 'KTNB-2026-002',
      name: 'Kiểm toán Vận hành CN Sài Gòn',
      branchCode: 'SG01',
      branchName: 'Chi nhánh Sài Gòn',
      auditedDepartmentId: 2,
    },
  ];

  const defaultProps = {
    visible: true,
    onClose: vi.fn(),
    editingRecord: null,
    engagements: mockEngagements,
    users: [{ id: 1, fullName: 'KTV Nguyen Van A', email: 'ktv@lpbank.com.vn' }],
    units: [{ id: 1, name: 'Khối Kế toán' }],
    defectCodes: [],
    internalDefectCodes: [],
    nd340DefectCodes: [],
    nhanSuDefectCodes: [],
    currentUser: { id: 1, fullName: 'KTV Nguyen Van A' },
    onSuccess: vi.fn(),
  };

  /** The five C values typed by the auditor in this UAT run. */
  const fiveC = {
    title: 'Thiếu đối soát hồ sơ mở thẻ tín dụng',
    // Kept under 20 characters on purpose: at 20+ characters the drawer fires the
    // background `POST /ai/suggest-finding` auto-classification timer, which would add a
    // second `api.post` call to the save assertions below.
    condition: 'Chưa đối soát CCCD',
    consequence: 'Rủi ro giả mạo khách hàng và thất thoát vốn vay',
    cause: 'Cán bộ bỏ qua bước đối soát khuôn mặt',
    recommendation: 'Yêu cầu đối soát 100% hồ sơ mở thẻ trước khi giải ngân',
    criteria: 'Thông tư 17/2024/TT-NHNN, Điều 12 về nhận biết khách hàng',
  };

  const fillFiveCForm = async () => {
    await typeIntoPlaceholder('Nhập tiêu đề ngắn gọn...', fiveC.title);
    await typeIntoPlaceholder('Mô tả thực tế đang diễn ra...', fiveC.condition);
    await typeIntoPlaceholder('Hậu quả có thể xảy ra...', fiveC.consequence);
    await typeIntoPlaceholder('Nguyên nhân gốc rễ...', fiveC.cause);
    await typeIntoPlaceholder('Đề xuất hành động khắc phục...', fiveC.recommendation);
    await typeIntoPlaceholder('Nêu rõ điều, khoản, văn bản quy định pháp luật vi phạm...', fiveC.criteria);

    await selectFormOption(
      screen.getByRole('combobox', { name: /Phân loại nhóm \(Category\)/i }),
      'findingCategory',
      'Hoạt động (Operational)',
    );
    await selectFormOption(
      screen.getByRole('combobox', { name: /Tính chất Phát hiện \(Nature\)/i }),
      'findingNature',
      'Tuân thủ (Compliance)',
    );
    await selectFormOption(
      screen.getByRole('combobox', { name: /Đơn vị đầu mối phụ trách khắc phục \(KPCS\)/i }),
      'responsibleUnitId',
      'Khối Kế toán',
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/workstreams')) {
        return Promise.resolve({ data: [{ id: 1, name: 'Phần hành Tín dụng' }] });
      }
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: { id: 501 } });
  });

  afterEach(async () => {
    await unmountAllReactRoots();
  });

  afterAll(async () => {
    /**
     * antd's `message` auto-closes every toast after ~3s with real timers. If such a close
     * lands after this file's last test, its React update is scheduled onto the Scheduler
     * (setImmediate under jsdom) and rendered after Vitest has already deleted `window` —
     * the "ReferenceError: window is not defined" this file used to end with. Waiting the
     * toast lifetime out here keeps that work inside jsdom, *before* teardown.
     */
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 3200));
    });
    await act(async () => {
      message.destroy();
    });
    await flushPendingReactWork();
  });

  it('TC-FIND-01: saves the 5C form and POSTs the real /audit-findings payload', async () => {
    const successSpy = vi.spyOn(message, 'success');
    render(<AuditFindingDetailDrawer {...defaultProps} />);

    // Header title for new record
    expect(screen.getByText(/GHI NHẬN PHÁT HIỆN KIỂM TOÁN MỚI \(5C\)/i)).toBeDefined();

    // Select engagement input exists
    const engagementSelect = screen.getByRole('combobox', { name: /Đoàn kiểm toán \(Engagement\)/i });
    expect(engagementSelect).toBeDefined();

    // Open the dropdown
    const engagementDropdown = await openSelectDropdown(engagementSelect, 'engagementId');

    // Verify formatted label containing [Mã ĐKT] Tên cuộc kiểm toán
    expect(screen.getAllByText(/\[KTNB-2026-001\] Kiểm toán Khối Khách hàng Doanh nghiệp/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\[KTNB-2026-002\] Kiểm toán Vận hành CN Sài Gòn/i).length).toBeGreaterThan(0);
    expect(readRenderedOptionLabels(engagementDropdown)).toEqual([
      '[KTNB-2026-001] Kiểm toán Khối Khách hàng Doanh nghiệp',
      '[KTNB-2026-002] Kiểm toán Vận hành CN Sài Gòn',
    ]);

    // The UAT run picks the Sài Gòn engagement; its branch data must be inherited on save.
    await pickOptionFromDropdown(
      engagementDropdown,
      engagementSelect,
      '[KTNB-2026-002] Kiểm toán Vận hành CN Sài Gòn',
    );

    await fillFiveCForm();

    const saveButton = screen.getByRole('button', { name: /Lưu ghi nhận/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/audit-findings',
        expect.objectContaining({
          wpTitle: 'Kiểm toán Vận hành CN Sài Gòn',
          workingPaperId: null,
          engagementId: 102,
          findingTitle: fiveC.title,
          // Default risk level carried by the drawer for a brand new finding.
          riskLevel: 'Medium',
          // The component always opens new findings as 'Open'; UAT TC-FIND-01 expects
          // "Dự thảo (Draft)" — see the report (production gap, not asserted as Draft).
          status: 'Open',
          condition: fiveC.condition,
          consequence: fiveC.consequence,
          cause: fiveC.cause,
          recommendation: fiveC.recommendation,
          criteria: fiveC.criteria,
          branchCode: 'SG01',
          managingBranchCode: 'SG01',
          managingBranchName: 'Chi nhánh Sài Gòn',
          managingBranchId: 2,
          findingCategory: 'HoatDong',
          findingNature: 'TuanThu',
          reportedByAuditorId: 1,
          responsibleUnitId: 1,
          businessProcessId: null,
          proposerUserId: null,
          appraiserUserId: null,
          businessLeaderUserId: null,
          internalDefectCodeId: null,
          nd340DefectCodeId: null,
          nhanSuDefectCodeId: null,
          actualFineAmount: null,
          appendices: [],
        }),
      );
    });

    // Create path only: exactly one request, no PATCH.
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.patch).not.toHaveBeenCalled();

    const postPayload = (api.post as any).mock.calls[0][1];
    // UAT TC-FIND-01 expects the finding to carry an auto-generated code
    // (FIND-2026-001). The drawer never builds one client-side and never sends a
    // `findingCode` key at all, so the code can only come from the server.
    expect(postPayload).not.toHaveProperty('findingCode');

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('Đã ghi nhận phát hiện mới thành công');
      expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('TC-FIND-02: classifies the finding as High risk and submits riskLevel "High"', async () => {
    render(<AuditFindingDetailDrawer {...defaultProps} />);

    const riskSelect = screen.getByRole('combobox', { name: /Mức độ rủi ro/i });
    const riskDropdown = await openSelectDropdown(riskSelect, 'riskLevel');

    // The risk-level control really offers the High option, rendered with its Vietnamese label.
    expect(readRenderedOptionLabels(riskDropdown)).toEqual([
      'Nghiêm trọng (Critical)',
      'Cao (High)',
      'Trung bình (Medium)',
      'Thấp (Low)',
    ]);

    await pickOptionFromDropdown(riskDropdown, riskSelect, 'Cao (High)');

    // The drawer itself only renders the risk *control*: the red/High tag lives in the list
    // pages (e.g. AuditeePortal's findings table). The classification is therefore pinned
    // through the value the drawer displays and the value it submits.
    await fillFiveCForm();

    fireEvent.click(screen.getByRole('button', { name: /Lưu ghi nhận/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/audit-findings',
        expect.objectContaining({
          riskLevel: 'High',
          engagementId: 101,
          findingTitle: fiveC.title,
          condition: fiveC.condition,
          findingCategory: 'HoatDong',
          findingNature: 'TuanThu',
          responsibleUnitId: 1,
        }),
      );
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.patch).not.toHaveBeenCalled();

    // The High classification is still the shown value once the form has been saved.
    expect(within(riskSelect.closest('.ant-select') as HTMLElement).getByText('Cao (High)')).toBeDefined();
  });

  it('required-field guard: Save with an empty form shows the validation toast and sends no request', async () => {
    const errorSpy = vi.spyOn(message, 'error');
    render(<AuditFindingDetailDrawer {...defaultProps} />);

    const saveBtn = screen.getByRole('button', { name: /Lưu ghi nhận/i });
    expect(saveBtn).toBeDefined();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Form validation error toast should be triggered
      expect(errorSpy).toHaveBeenCalled();
    });

    // ...and it is the first missing required field of the 5C form (title), not a save error.
    expect(errorSpy).toHaveBeenCalledWith('Vui lòng nhập tiêu đề tóm tắt');
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
