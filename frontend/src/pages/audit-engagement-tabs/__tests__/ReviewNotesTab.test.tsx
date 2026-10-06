import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
import { message, Modal } from 'antd';
import { ReviewNotesTab } from '../ReviewNotesTab';
import api from '../../../services/api';

/**
 * UAT automation for ReviewNotesTab (Sổ tay Điểm Soát Xét - Mẫu biểu MB-10).
 *
 *   TC-WP-06 "Trưởng Đoàn Soát Xét Cấp 1 & Tạo Review Note"
 *   TC-WP-07 "Phản Hồi & Đóng Review Note"
 *
 * Endpoints pinned from the source (ReviewNotesTab.tsx):
 *   GET  /working-papers/review-notes?engagementId=<id>          (fetchNotes, line 67)
 *   POST /working-papers/review-notes                            (handleCreateNote, line 89)
 *        body: { engagementId, workingPaperId, workstreamId, note }   (note is .trim()ed)
 *   POST /working-papers/review-notes/<noteId>/respond           (handleConfirmRespond, line 116)
 *        body: { response }                                          (response is .trim()ed)
 *   POST /working-papers/review-notes/<noteId>/close             (handleCloseNote -> Modal.confirm onOk, line 139)
 *        NO body — called with the URL only.
 */

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

/**
 * ReviewNotesTab renders hard-coded Vietnamese copy (it does not call useTranslation),
 * but the house convention mocks react-i18next so no transitively loaded module can
 * reach the real i18next singleton during a page-level render.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

const ENGAGEMENT_ID = 77;
/** Exact request the component issues on mount: one URL string, no axios config object. */
const LIST_URL = `/working-papers/review-notes?engagementId=${ENGAGEMENT_ID}`;

/* ─────────────────────────── mocked Review Notes payload ─────────────────────────── */

/** OPEN and never answered -> the IIA 1311 backend would reject a close; no "Ký đóng". */
const OPEN_NO_RESPONSE = {
  id: 201,
  reviewSeq: 'RN-01',
  status: 'OPEN',
  note: 'Bổ sung đối chiếu sao kê chi tiết cho mẫu 25 khoản vay',
  reviewerName: 'Trần Văn Hải',
  createdAt: '2026-03-01T09:30:00',
  auditorResponse: null,
  auditorName: null,
  responseAt: null,
  workingPaper: { id: 11, referenceCode: 'WP-2026-001', title: 'Thử nghiệm cơ bản khoản vay' },
  workstream: null,
};

/** Still OPEN but the KTV already answered -> closing is allowed. */
const OPEN_WITH_RESPONSE = {
  id: 202,
  reviewSeq: 'RN-02',
  status: 'OPEN',
  note: 'Làm rõ chênh lệch số dư tiền gửi tại ngày 31/12/2025',
  reviewerName: 'Trần Văn Hải',
  createdAt: '2026-03-02T10:15:00',
  auditorResponse: 'Đã đối chiếu, chênh lệch do bút toán treo chưa hạch toán',
  auditorName: 'Nguyễn Thị Mai',
  responseAt: '2026-03-03T08:05:00',
  workingPaper: null,
  workstream: { id: 21, title: 'Phân hành Tín dụng' },
};

/** KTV answered and the note is waiting for the reviewer's signature. */
const RESOLVED_NOTE = {
  id: 203,
  reviewSeq: 'RN-03',
  status: 'RESOLVED',
  note: 'Bổ sung bằng chứng kiểm tra chứng từ giải ngân',
  reviewerName: 'Trần Văn Hải',
  createdAt: '2026-03-04T14:00:00',
  auditorResponse: 'Đã bổ sung bảng đối chiếu chi tiết, kèm sao kê ngân hàng',
  auditorName: 'Nguyễn Thị Mai',
  responseAt: '2026-03-05T09:00:00',
  workingPaper: null,
  workstream: null,
};

const CLOSED_NOTE = {
  ...RESOLVED_NOTE,
  id: 204,
  reviewSeq: 'RN-04',
  status: 'CLOSED',
};

/** Second closed note, no WP and no workstream -> the "Toàn bộ cuộc KT" fallback cell. */
const CLOSED_NOTE_2 = {
  ...RESOLVED_NOTE,
  id: 205,
  reviewSeq: 'RN-05',
  status: 'CLOSED',
  workingPaper: null,
  workstream: null,
};

const FULL_LIST = [OPEN_NO_RESPONSE, OPEN_WITH_RESPONSE, RESOLVED_NOTE, CLOSED_NOTE, CLOSED_NOTE_2];

/* ───────────────────────────────── helpers ───────────────────────────────── */

/**
 * The row antd renders for a note: `rowKey="id"` becomes `data-row-key` on the <tr>,
 * so every per-note query below is scoped to exactly one note and cannot match another
 * row's identical button label / status tag.
 */
const tableRow = (id: number) =>
  waitFor(
    () => {
      const row = document.querySelector(`tr[data-row-key="${id}"]`) as HTMLElement | null;
      expect(row).not.toBeNull();
      return row as HTMLElement;
    },
    { timeout: 20000 },
  );

/** Reads the rendered number of an antd <Statistic> identified by its exact title. */
const statisticValue = (titleText: string): string => {
  const title = screen.getByText(titleText);
  const root = title.closest('.ant-statistic');
  expect(root).not.toBeNull();
  const value = root!.querySelector('.ant-statistic-content-value');
  expect(value).not.toBeNull();
  return (value!.textContent ?? '').trim();
};

const typeIntoTextarea = async (placeholder: string, value: string) => {
  const textarea = screen.getByPlaceholderText(placeholder) as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value } });
  await waitFor(() => {
    expect(textarea.value).toBe(value);
  });
  return textarea;
};

/**
 * React 19 flushes passive effects through the Scheduler; under jsdom that falls back to
 * Node's `setImmediate`, whose callback reads the global `window` as its first statement.
 * Vitest deletes `window` when this file's environment is torn down, so any callback still
 * queued at that moment dies with "ReferenceError: window is not defined" and the run
 * exits non-zero even though every assertion passed. Give the queue real turns while
 * `window` still exists.
 */
const flushPendingReactWork = async () => {
  for (let turn = 0; turn < 3; turn += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      await new Promise<void>((resolve) => setImmediate(resolve));
    });
  }
};

/**
 * Modal.confirm renders into its own React root (created by rc-util's render, not by RTL),
 * so `cleanup()` alone leaves that root committing after the test finished.
 */
const unmountAllReactRoots = async () => {
  await act(async () => {
    cleanup();
    message.destroy();
    Modal.destroyAll();
  });
};

const NOTE_PLACEHOLDER =
  'Nêu rõ các thiếu sót trong hồ sơ, bằng chứng chưa đầy đủ hoặc thủ tục kiểm tra cần làm rõ...';
const RESPONSE_PLACEHOLDER =
  'Giải trình chi tiết các phát hiện, căn cứ thực hiện hoặc ghi rõ tên file bằng chứng bổ sung đã đính kèm...';

describe('ReviewNotesTab - UAT Verification (TC-WP-06 & TC-WP-07)', { timeout: 60000 }, () => {
  const renderTab = (onNotesUpdated = vi.fn()) => {
    render(
      <ReviewNotesTab
        engagementId={ENGAGEMENT_ID}
        currentUser={{ id: 9, fullName: 'Trần Văn Hải' }}
        workingPapers={[{ id: 11, referenceCode: 'WP-2026-001', title: 'Thử nghiệm cơ bản khoản vay' }]}
        workstreams={[{ id: 21, title: 'Phân hành Tín dụng', assignedAuditorName: 'Nguyễn Thị Mai' }]}
        onNotesUpdated={onNotesUpdated}
      />,
    );
    return onNotesUpdated;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // mockReset (not just clear) so no one-shot value queued by a previous test leaks.
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.get as any).mockResolvedValue({ data: [] });
    (api.post as any).mockResolvedValue({ data: { success: true } });
  });

  afterEach(async () => {
    await unmountAllReactRoots();
  });

  afterAll(async () => {
    await act(async () => {
      message.destroy();
      Modal.destroyAll();
    });
    await flushPendingReactWork();
  });

  /* ══════════════════════════════ TC-WP-06 ══════════════════════════════ */

  it('TC-WP-06 (1/4): loads the list from GET /working-papers/review-notes?engagementId=77 and renders reviewer, status tag, content and RN sequence', async () => {
    (api.get as any).mockResolvedValue({ data: FULL_LIST });
    const onNotesUpdated = renderTab();

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(LIST_URL);
      },
      { timeout: 20000 },
    );
    // Exact call shape: one URL argument, no axios options object.
    expect((api.get as any).mock.calls[0]).toEqual([LIST_URL]);
    expect(api.get).toHaveBeenCalledTimes(1);

    const openRow = await tableRow(OPEN_NO_RESPONSE.id);
    expect(within(openRow).getByText('RN-01')).toBeDefined();
    expect(
      within(openRow).getByText('Bổ sung đối chiếu sao kê chi tiết cho mẫu 25 khoản vay'),
    ).toBeDefined();
    expect(within(openRow).getByText('Trần Văn Hải')).toBeDefined();
    expect(within(openRow).getByText(/01\/03\/2026 09:30/)).toBeDefined();
    expect(within(openRow).getByText('⚠️ Đang mở (Open)')).toBeDefined();
    expect(within(openRow).getByText('WP-2026-001 - Thử nghiệm cơ bản khoản vay')).toBeDefined();
    expect(within(openRow).getByText('Chưa giải trình')).toBeDefined();

    // Workstream-linked note: workstream title + the KTV's answer with its timestamp.
    const answeredRow = await tableRow(OPEN_WITH_RESPONSE.id);
    expect(within(answeredRow).getByText('RN-02')).toBeDefined();
    expect(within(answeredRow).getByText('Phân hành Tín dụng')).toBeDefined();
    expect(
      within(answeredRow).getByText('Đã đối chiếu, chênh lệch do bút toán treo chưa hạch toán'),
    ).toBeDefined();
    expect(within(answeredRow).getByText('Nguyễn Thị Mai')).toBeDefined();
    expect(within(answeredRow).getByText(/03\/03\/2026 08:05/)).toBeDefined();

    // Reviewer's instruction is shown verbatim in the KTV column header of the modal too,
    // but in the table it is the "Ý kiến chỉ đạo" cell.
    const resolvedRow = await tableRow(RESOLVED_NOTE.id);
    expect(within(resolvedRow).getByText('RN-03')).toBeDefined();
    expect(within(resolvedRow).getByText('⏳ Chờ duyệt đóng')).toBeDefined();
    expect(
      within(resolvedRow).getByText('Đã bổ sung bảng đối chiếu chi tiết, kèm sao kê ngân hàng'),
    ).toBeDefined();

    const closedRow = await tableRow(CLOSED_NOTE.id);
    expect(within(closedRow).getByText('RN-04')).toBeDefined();
    expect(within(closedRow).getByText('✓ Đã đóng (Closed)')).toBeDefined();

    // No WP and no workstream -> the "Toàn bộ cuộc KT" fallback.
    const engagementLevelRow = await tableRow(CLOSED_NOTE_2.id);
    expect(within(engagementLevelRow).getByText('RN-05')).toBeDefined();
    expect(within(engagementLevelRow).getByText('Toàn bộ cuộc KT')).toBeDefined();

    // The seeded header is rendered for the screen (MB-10).
    expect(
      screen.getByText('Sổ tay Điểm Soát Xét Của Lãnh Đạo Đoàn (Mẫu Biểu MB-10)'),
    ).toBeDefined();

    // A successful load notifies the parent exactly once.
    await waitFor(() => {
      expect(onNotesUpdated).toHaveBeenCalledTimes(1);
    });
  });

  it('TC-WP-06 (2/4): statistics cards and the IIA 1311 hard-gate warning match the loaded payload', async () => {
    (api.get as any).mockResolvedValue({ data: FULL_LIST });
    renderTab();
    await tableRow(OPEN_NO_RESPONSE.id);

    // 5 notes: 2 OPEN, 1 RESOLVED, 2 CLOSED.
    expect(statisticValue('TỔNG ĐIỂM SOÁT XÉT')).toBe('5');
    expect(statisticValue('ĐANG MỞ (CẦN GIẢI TRÌNH)')).toBe('2');
    expect(statisticValue('ĐÃ GIẢI TRÌNH (CHỜ ĐÓNG)')).toBe('1');
    expect(statisticValue('ĐÃ ĐÓNG HOÀN TẤT')).toBe('2');

    // unclosedCount = openCount + resolvedCount = 3 -> warning gate, not the success gate.
    expect(
      screen.getByText('Cổng Kiểm Soát Chất Lượng IIA 1311 (Supervisory Review Gate - MB-10)'),
    ).toBeDefined();
    expect(
      screen.getByText('3 điểm soát xét chưa được Người soát xét xác nhận ĐÓNG'),
    ).toBeDefined();
    expect(
      screen.queryByText(
        'Đạt Chuẩn Kiểm Soát Chất Lượng IIA 1311: 100% Điểm Soát Xét Đã Được Đóng',
      ),
    ).toBeNull();
  });

  it('TC-WP-06 (4/4): a note with no response can never be closed - "Ký đóng" is absent, "Giải trình" is present', async () => {
    // REGRESSION (IIA 1311): the backend now rejects closing an OPEN note without an
    // auditor response, so the button must not be offered for that state.
    (api.get as any).mockResolvedValue({ data: FULL_LIST });
    renderTab();

    const unresolvedRow = await tableRow(OPEN_NO_RESPONSE.id);
    expect(within(unresolvedRow).queryByRole('button', { name: /Ký đóng/ })).toBeNull();
    expect(within(unresolvedRow).getByRole('button', { name: /Giải trình/ })).toBeDefined();

    // OPEN but already answered by the KTV -> closing IS allowed.
    const answeredRow = await tableRow(OPEN_WITH_RESPONSE.id);
    expect(within(answeredRow).getByRole('button', { name: /Ký đóng/ })).toBeDefined();

    // RESOLVED -> closing IS allowed.
    const resolvedRow = await tableRow(RESOLVED_NOTE.id);
    expect(within(resolvedRow).getByRole('button', { name: /Ký đóng/ })).toBeDefined();

    // CLOSED -> neither action is offered.
    const closedRow = await tableRow(CLOSED_NOTE.id);
    expect(within(closedRow).queryByRole('button', { name: /Ký đóng/ })).toBeNull();
    expect(within(closedRow).queryByRole('button', { name: /Giải trình/ })).toBeNull();

    // Nothing is posted just by rendering the gating.
    expect(api.post).not.toHaveBeenCalled();
  });

  it('TC-WP-06 (3/4): creates a review note -> exact POST /working-papers/review-notes payload, success toast and refetch', async () => {
    (api.get as any).mockResolvedValue({ data: FULL_LIST });
    const successSpy = vi.spyOn(message, 'success');
    renderTab();
    await tableRow(OPEN_NO_RESPONSE.id);

    fireEvent.click(screen.getByRole('button', { name: /Thêm Điểm Soát Xét/ }));

    await waitFor(
      () => {
        expect(screen.getByText('Tạo Điểm Soát Xét Mới (Mẫu biểu MB-10)')).toBeDefined();
      },
      { timeout: 15000 },
    );

    // Required-field rule is enforced before any request leaves the browser.
    fireEvent.click(screen.getByRole('button', { name: /Lưu Điểm Soát Xét/ }));
    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập nội dung chỉ đạo soát xét')).toBeDefined();
    });
    expect(api.post).not.toHaveBeenCalled();

    // The typed value is padded on both ends on purpose: the component must trim it.
    await typeIntoTextarea(
      NOTE_PLACEHOLDER,
      '   Yêu cầu bổ sung bảng đối chiếu số dư chi tiết cho WP-2026-001   ',
    );

    fireEvent.click(screen.getByRole('button', { name: /Lưu Điểm Soát Xét/ }));

    await waitFor(
      () => {
        expect(api.post).toHaveBeenCalledWith('/working-papers/review-notes', {
          engagementId: ENGAGEMENT_ID,
          // Neither Select was touched -> the component sends explicit nulls, not undefined.
          workingPaperId: null,
          workstreamId: null,
          note: 'Yêu cầu bổ sung bảng đối chiếu số dư chi tiết cho WP-2026-001',
        });
      },
      { timeout: 15000 },
    );

    expect(api.post).toHaveBeenCalledTimes(1);
    expect((api.post as any).mock.calls[0]).toEqual([
      '/working-papers/review-notes',
      {
        engagementId: ENGAGEMENT_ID,
        workingPaperId: null,
        workstreamId: null,
        note: 'Yêu cầu bổ sung bảng đối chiếu số dư chi tiết cho WP-2026-001',
      },
    ]);

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('Đã tạo điểm soát xét (MB-10) thành công');
    });

    // fetchNotes() runs again after a successful create.
    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledTimes(2);
      },
      { timeout: 15000 },
    );
    expect((api.get as any).mock.calls[1]).toEqual([LIST_URL]);
  });

  /* ══════════════════════════════ TC-WP-07 ══════════════════════════════ */

  it('TC-WP-07 (1/2): the KTV responds -> exact POST /working-papers/review-notes/202/respond payload, success toast and refetch', async () => {
    (api.get as any).mockResolvedValue({ data: [OPEN_WITH_RESPONSE] });
    const successSpy = vi.spyOn(message, 'success');
    renderTab();

    const row = await tableRow(OPEN_WITH_RESPONSE.id);
    fireEvent.click(within(row).getByRole('button', { name: /Giải trình/ }));

    await waitFor(
      () => {
        expect(screen.getByText('KTV Giải Trình Điểm Soát Xét RN-02')).toBeDefined();
      },
      { timeout: 15000 },
    );

    // Scope to the only open dialog (antd v6 panel class is `.ant-modal-container`):
    // the same instruction text also lives in the table row.
    const respondDialog = await waitFor(
      () => {
        const dialog = document.querySelector('.ant-modal-container') as HTMLElement | null;
        expect(dialog).not.toBeNull();
        return dialog as HTMLElement;
      },
      { timeout: 15000 },
    );

    // The modal echoes the reviewer's original instruction and pre-fills the existing answer.
    expect(
      within(respondDialog).getByText('Làm rõ chênh lệch số dư tiền gửi tại ngày 31/12/2025'),
    ).toBeDefined();
    const textarea = within(respondDialog).getByPlaceholderText(
      RESPONSE_PLACEHOLDER,
    ) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(textarea.value).toBe('Đã đối chiếu, chênh lệch do bút toán treo chưa hạch toán');
    });

    // Required-field rule: clearing the prefill blocks the request entirely.
    fireEvent.change(textarea, { target: { value: '' } });
    fireEvent.click(within(respondDialog).getByRole('button', { name: /Gửi Giải Trình/ }));
    await waitFor(() => {
      expect(within(respondDialog).getByText('Vui lòng nhập nội dung giải trình')).toBeDefined();
    });
    expect(api.post).not.toHaveBeenCalled();

    await typeIntoTextarea(
      RESPONSE_PLACEHOLDER,
      '   Đã bổ sung sao kê ngân hàng và bảng đối chiếu chi tiết cho KTV trưởng đoàn   ',
    );

    fireEvent.click(screen.getByRole('button', { name: /Gửi Giải Trình/ }));

    await waitFor(
      () => {
        expect(api.post).toHaveBeenCalledWith(
          `/working-papers/review-notes/${OPEN_WITH_RESPONSE.id}/respond`,
          { response: 'Đã bổ sung sao kê ngân hàng và bảng đối chiếu chi tiết cho KTV trưởng đoàn' },
        );
      },
      { timeout: 15000 },
    );

    expect(api.post).toHaveBeenCalledTimes(1);
    expect((api.post as any).mock.calls[0]).toEqual([
      '/working-papers/review-notes/202/respond',
      { response: 'Đã bổ sung sao kê ngân hàng và bảng đối chiếu chi tiết cho KTV trưởng đoàn' },
    ]);

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('Đã gửi giải trình điểm soát xét');
    });

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledTimes(2);
      },
      { timeout: 15000 },
    );
    expect((api.get as any).mock.calls[1]).toEqual([LIST_URL]);
  });

  it('TC-WP-07 (2/2): the reviewer signs the note off -> Modal.confirm then exact POST /working-papers/review-notes/203/close (no body)', async () => {
    // First load: the note is RESOLVED. The refetch after closing returns it CLOSED.
    (api.get as any)
      .mockResolvedValueOnce({ data: [RESOLVED_NOTE] })
      .mockResolvedValueOnce({ data: [CLOSED_NOTE] });
    const successSpy = vi.spyOn(message, 'success');
    renderTab();

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(LIST_URL);
      },
      { timeout: 20000 },
    );

    const row = await tableRow(RESOLVED_NOTE.id);
    expect(within(row).getByText('⏳ Chờ duyệt đóng')).toBeDefined();
    expect(statisticValue('ĐÃ ĐÓNG HOÀN TẤT')).toBe('0');

    fireEvent.click(within(row).getByRole('button', { name: /Ký đóng/ }));

    // Modal.confirm renders asynchronously into document.body.
    const confirmBox = await waitFor(
      () => {
        const box = document.querySelector('.ant-modal-confirm') as HTMLElement | null;
        expect(box).not.toBeNull();
        return box as HTMLElement;
      },
      { timeout: 15000 },
    );

    // antd feeds the confirm title to both the Modal header and `.ant-modal-confirm-title`,
    // so the title is asserted inside the confirm body only.
    const confirmParagraph = confirmBox.querySelector('.ant-modal-confirm-paragraph') as HTMLElement;
    expect(confirmParagraph).not.toBeNull();
    expect(
      within(confirmParagraph).getByText('Ký đóng Điểm soát xét RN-03?'),
    ).toBeDefined();
    expect(
      within(confirmParagraph).getByText(
        'Người soát xét / Trưởng đoàn xác nhận giải trình của KTV đạt yêu cầu và chính thức ĐÓNG điểm soát xét theo chuẩn IIA 1311.',
      ),
    ).toBeDefined();
    expect(within(confirmBox).getByRole('button', { name: 'Hủy' })).toBeDefined();

    // Cancelling is not the chosen path: press the real OK button of the confirm dialog.
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận Đóng' }));

    await waitFor(
      () => {
        expect(api.post).toHaveBeenCalledWith(
          `/working-papers/review-notes/${RESOLVED_NOTE.id}/close`,
        );
      },
      { timeout: 15000 },
    );

    // One argument only: the close endpoint takes no body.
    expect(api.post).toHaveBeenCalledTimes(1);
    expect((api.post as any).mock.calls[0]).toEqual([
      '/working-papers/review-notes/203/close',
    ]);

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('Đã đóng điểm soát xét thành công');
    });

    // fetchNotes() runs again after the close.
    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledTimes(2);
      },
      { timeout: 15000 },
    );

    // The refetched note is CLOSED, offers no further action...
    const closedRow = await tableRow(CLOSED_NOTE.id);
    expect(within(closedRow).getByText('✓ Đã đóng (Closed)')).toBeDefined();
    expect(within(closedRow).queryByRole('button', { name: /Ký đóng/ })).toBeNull();
    expect(within(closedRow).queryByRole('button', { name: /Giải trình/ })).toBeNull();

    // ...the counters move and the IIA 1311 hard gate is satisfied.
    expect(statisticValue('TỔNG ĐIỂM SOÁT XÉT')).toBe('1');
    expect(statisticValue('ĐANG MỞ (CẦN GIẢI TRÌNH)')).toBe('0');
    expect(statisticValue('ĐÃ GIẢI TRÌNH (CHỜ ĐÓNG)')).toBe('0');
    expect(statisticValue('ĐÃ ĐÓNG HOÀN TẤT')).toBe('1');
    expect(
      screen.getByText(
        'Đạt Chuẩn Kiểm Soát Chất Lượng IIA 1311: 100% Điểm Soát Xét Đã Được Đóng',
      ),
    ).toBeDefined();
    expect(
      screen.queryByText('Cổng Kiểm Soát Chất Lượng IIA 1311 (Supervisory Review Gate - MB-10)'),
    ).toBeNull();
  });
});
