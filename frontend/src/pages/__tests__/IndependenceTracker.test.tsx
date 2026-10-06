import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { message } from 'antd';
import dayjs from 'dayjs';
import IndependenceTracker from '../IndependenceTracker';
import api from '../../services/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'vi', changeLanguage: vi.fn() },
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

/**
 * GAP — see TC-SYS-03.J at the bottom of this file:
 * IndependenceTracker.tsx (lines 1-42) imports no permission/CASL helper at all. Mocking the
 * repo-wide helper with a blanket DENY documents that the denial cannot change a single byte of
 * this page's output, i.e. the page performs no permission-aware rendering.
 */
vi.mock('../../utils/permission', () => ({
  hasPermission: () => false,
  getPermissionKey: () => '',
}));

/**
 * UAT: TC-SYS-03 "Kiểm Tra Thời Gian Cách Ly Độc Lập KTV (IIA 1100 / TT 13)".
 *
 * API thật của trang (đối chiếu src/pages/IndependenceTracker.tsx):
 *   GET    /independence/declarations                                  (fetchData, line 95)
 *   GET    /independence/rotations                                     (fetchData, line 96)
 *   GET    /independence/cooling-off                                   (fetchData, line 97)
 *   GET    /users                                                      (fetchData line 98 + fetchMetadata line 81)
 *   GET    /departments                                                (fetchMetadata, line 82)
 *   POST   /independence/declarations                                  (line 133)
 *   POST   /independence/declarations/:id/approve-exception            (line 145)
 *   POST   /independence/declarations/:id/reject-exception             (line 157)
 *   POST   /independence/rotations                                     (line 196)
 *   DELETE /independence/rotations/:id                                 (line 208)
 *   POST   /independence/cooling-off                                   (line 243)
 *   DELETE /independence/cooling-off/:id                               (line 255)
 *
 * Quy tắc cách ly trong source (line 682): "Cán bộ ... chuyển sang Khối KTNB không được tham gia
 * kiểm toán các hoạt động, quy trình hoặc đơn vị mà mình từng trực tiếp đảm nhiệm trong vòng 12
 * tháng gần nhất kể từ ngày chuyển công tác" (tag "IIA Standard 2.2").
 */

const TODAY = dayjs();

/** KTV chuyển sang KTNB 2 tháng trước → còn 10 tháng cách ly (ĐANG trong cửa sổ 12 tháng). */
const TRANSFER_INSIDE_WINDOW = TODAY.subtract(2, 'month');
const COOLING_OFF_END_INSIDE = TRANSFER_INSIDE_WINDOW.add(12, 'month');

/** KTV chuyển sang KTNB 18 tháng trước → đã hết 12 tháng cách ly được 6 tháng. */
const TRANSFER_OUTSIDE_WINDOW = TODAY.subtract(18, 'month');
const COOLING_OFF_END_OUTSIDE = TRANSFER_OUTSIDE_WINDOW.add(12, 'month');

const isoDate = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');
const vnDate = (d: dayjs.Dayjs) => d.format('DD/MM/YYYY');

const USERS = [
  {
    id: 11,
    fullName: 'Trần Văn Hải',
    username: 'haitv',
    department: 'Phòng KTNB Hội sở',
    jobTitle: 'Kiểm toán viên chính',
  },
  {
    id: 12,
    fullName: 'Nguyễn Thị Mai',
    username: 'maint',
    department: 'Phòng KTNB Miền Nam',
    jobTitle: 'Trưởng đoàn',
  },
  {
    id: 13,
    fullName: 'Đỗ Minh Khuê',
    username: 'khuetm',
    department: 'Phòng KTNB Hội sở',
    jobTitle: 'Kiểm toán viên',
  },
];

const DEPARTMENTS = [
  { id: 1, name: 'Chi nhánh Hà Nội', code: 'CN-HN' },
  { id: 2, name: 'Khối Khách hàng Doanh nghiệp', code: 'KHDN' },
];

/** Cột "Kiểm toán viên" của bảng luân chuyển (line 833): `{fullName} ({username} — {department})`. */
const rotationAuditorOptionLabel = (u: (typeof USERS)[number]) =>
  `${u.fullName} (${u.username} — ${u.department})`;
/** Option "Đơn vị / Phòng ban" (line 946): `{name} ({code})`. */
const departmentOptionLabel = (d: (typeof DEPARTMENTS)[number]) => `${d.name} (${d.code})`;
/** Option "Cán bộ / KTV mới chuyển sang KTNB" (line 929): `{fullName} ({username} — {jobTitle || 'KTV'})`. */
const coolingOffUserOptionLabel = (u: (typeof USERS)[number]) =>
  `${u.fullName} (${u.username} — ${u.jobTitle || 'KTV'})`;

const DECLARATIONS = [
  {
    id: 501,
    year: 2026,
    auditor: { id: 11, fullName: 'Trần Văn Hải', username: 'haitv' },
    hasConflict: false,
    details: '',
    declaredAt: '2026-01-15',
    caeApprovalStatus: null,
  },
  {
    id: 502,
    year: 2026,
    auditor: { id: 12, fullName: 'Nguyễn Thị Mai', username: 'maint' },
    hasConflict: true,
    details: 'Có anh ruột là Giám đốc Chi nhánh Hà Nội',
    declaredAt: '2026-02-20',
    caeApprovalStatus: 'Pending',
    caeNotes: '',
  },
  {
    id: 503,
    year: 2025,
    auditor: { id: 14, fullName: 'Hoàng Văn Phúc', username: 'phuchv' },
    hasConflict: true,
    details: 'Sở hữu 5% cổ phần tại đối tác cung cấp dịch vụ',
    declaredAt: '2025-03-10',
    caeApprovalStatus: 'Approved',
    caeApprovedByName: 'CAE Lê Văn An',
    caeNotes: 'Đã bố trí KTV khác thay thế',
  },
  {
    id: 504,
    year: 2025,
    auditor: { id: 15, fullName: 'Bùi Thị Oanh', username: 'oanhbt' },
    hasConflict: true,
    details: 'Em ruột làm Kế toán trưởng Chi nhánh Đà Nẵng',
    declaredAt: '2025-04-05',
    caeApprovalStatus: 'Rejected',
    caeNotes: 'Chưa đủ căn cứ phê duyệt',
  },
];

const ROTATIONS = [
  {
    id: 601,
    auditorName: 'Trần Văn Hải',
    departmentName: 'Chi nhánh Hà Nội',
    lastAuditDate: '2023-12-31',
    nextAllowedAuditDate: '2026-12-31',
    isRestricted: true,
  },
];

/**
 * Tên KTV của bảng cách ly cố tình KHÔNG trùng tên với bảng khai báo: antd Tabs giữ pane đã
 * kích hoạt trong DOM (chỉ ẩn đi) nên mọi truy vấn `screen.getByText(<tên KTV>)` sau khi đổi tab
 * phải là duy nhất.
 */
const COOLING_OFF = [
  {
    id: 701,
    fullName: 'Đinh Bảo Long',
    username: 'longdb',
    jobTitle: 'Kiểm toán viên',
    priorDepartments: 'Chi nhánh Hà Nội',
    transferDate: isoDate(TRANSFER_INSIDE_WINDOW),
    coolingOffEndDate: isoDate(COOLING_OFF_END_INSIDE),
  },
  {
    id: 702,
    fullName: 'Phạm Quốc Bảo',
    username: 'baopq',
    role: { name: 'Trưởng đoàn' },
    priorDepartments: 'Khối Khách hàng Doanh nghiệp',
    transferDate: isoDate(TRANSFER_OUTSIDE_WINDOW),
    coolingOffEndDate: isoDate(COOLING_OFF_END_OUTSIDE),
  },
  {
    id: 703,
    fullName: 'Vũ Thanh Tùng',
    username: 'tungvt',
    jobTitle: 'Chuyên viên KTNB',
    priorDepartments: 'Phòng Kế toán Hội sở',
    transferDate: '2020-01-01',
    coolingOffEndDate: null,
  },
];

/** Dữ liệu cho nhánh fallback của source (lines 103-111): /independence/cooling-off trả rỗng. */
const FALLBACK_USERS = [
  {
    id: 21,
    fullName: 'Lê Hoàng Nam',
    username: 'namlh',
    jobTitle: 'Kiểm toán viên',
    priorDepartments: 'Khối KHDN',
    coolingOffEndDate: isoDate(COOLING_OFF_END_INSIDE),
  },
  {
    id: 22,
    fullName: 'Ngô Thị Hồng',
    username: 'hongnt',
    jobTitle: 'Kiểm toán viên',
    coolingOffEndDate: isoDate(COOLING_OFF_END_OUTSIDE),
  },
  {
    // Không có priorDepartments lẫn coolingOffEndDate → bị loại khỏi bảng cách ly
    id: 23,
    fullName: 'Hoàng Văn Phúc',
    username: 'phuchv2',
    jobTitle: 'Chuyên viên',
  },
];

/**
 * --- antd v6 Select helpers (dùng cùng kỹ thuật như AuditFindingDetailDrawer.uat.test.tsx) -----
 * Dropdown của một Select chỉ được portal vào body sau khi Select đó được mở, và được định vị
 * qua listbox ẩn có id `<Form.Item name>_list` nên không thể lẫn với Select khác trên trang.
 */
const openSelectDropdown = async (combobox: HTMLElement, controlName: string): Promise<HTMLElement> => {
  fireEvent.mouseDown(combobox.closest('.ant-select-selector') || combobox);
  return waitFor(
    () => {
      const listbox = document.getElementById(`${controlName}_list`);
      expect(listbox).not.toBeNull();
      return listbox!.closest('.ant-select-dropdown') as HTMLElement;
    },
    { timeout: 10000 },
  );
};

/** Nhãn option đúng như người dùng đọc thấy trong danh sách đang mở. */
const readOptionLabels = (dropdown: HTMLElement): string[] =>
  Array.from(dropdown.querySelectorAll('.ant-select-item-option')).map(
    (option) => option.querySelector('.ant-select-item-option-content')?.textContent ?? '',
  );

const pickOption = async (dropdown: HTMLElement, combobox: HTMLElement, optionLabel: string) => {
  const option = await waitFor(
    () => {
      const match = Array.from(dropdown.querySelectorAll('.ant-select-item-option')).find(
        (candidate) => candidate.querySelector('.ant-select-item-option-content')?.textContent === optionLabel,
      );
      expect(match).toBeDefined();
      return match as HTMLElement;
    },
    { timeout: 10000 },
  );

  fireEvent.click(option);

  await waitFor(
    () => {
      expect(within(combobox.closest('.ant-select') as HTMLElement).getByText(optionLabel)).toBeDefined();
    },
    { timeout: 10000 },
  );
};

/**
 * Bấm nút OK của Popconfirm đang mở (antd chỉ mount popconfirm sau lần mở đầu tiên).
 * Cú click được bọc trong `act` async vì handler `onConfirm` là async: sau `await api.post(...)`
 * component setState (đóng modal + fetchData) ở microtask kế tiếp, và popconfirm còn đóng bằng
 * hiệu ứng rc-motion trên các frame sau đó.
 */
const confirmPopconfirm = async () => {
  const okButton = await waitFor(
    () => {
      const buttons = Array.from(
        document.querySelectorAll('.ant-popconfirm-buttons button.ant-btn-primary'),
      ) as HTMLElement[];
      expect(buttons.length).toBeGreaterThan(0);
      return buttons[buttons.length - 1];
    },
    { timeout: 10000 },
  );

  await act(async () => {
    fireEvent.click(okButton);
    await new Promise<void>((resolve) => setTimeout(resolve, 60));
  });
};

const tabButton = (key: string): HTMLElement => {
  const button = document.querySelector(`.ant-tabs-tab[data-node-key="${key}"] .ant-tabs-tab-btn`);
  if (!button) throw new Error(`Không tìm thấy tab "${key}"`);
  return button as HTMLElement;
};

const rowOf = (uniqueCellText: string): HTMLElement => {
  const cell = screen.getByText(uniqueCellText);
  const row = cell.closest('tr');
  if (!row) throw new Error(`Không tìm thấy dòng bảng chứa "${uniqueCellText}"`);
  return row as HTMLElement;
};

/**
 * rc-table render tiêu đề cột hai lần khi có `scroll={{ x }}`: một `<th>` thật và một `<div>`
 * ẩn (`height: 0; overflow: hidden`) dùng để đo bề rộng cột. Vì vậy mọi truy vấn tiêu đề phải
 * nhắm vào `<th>` của bảng cụ thể, không dùng getByText trần.
 */
const tableOfRow = (uniqueCellText: string): HTMLElement => {
  const table = rowOf(uniqueCellText).closest('table');
  if (!table) throw new Error(`Không tìm thấy bảng chứa "${uniqueCellText}"`);
  return table as HTMLElement;
};

const headerTextsOf = (table: HTMLElement): string[] =>
  Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent);

const getMock = api.get as unknown as {
  mock: { calls: unknown[][] };
  mockImplementation: (fn: (url: string, config?: unknown) => unknown) => void;
};
const postMock = api.post as unknown as { mock: { calls: unknown[][] } };

describe('IndependenceTracker - TC-SYS-03 (Cách ly độc lập KTV, IIA 1100 / TT 13/2018)', { timeout: 60000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getMock.mockImplementation((url: string) => {
      if (url === '/independence/declarations') return Promise.resolve({ data: DECLARATIONS });
      if (url === '/independence/rotations') return Promise.resolve({ data: ROTATIONS });
      if (url === '/independence/cooling-off') return Promise.resolve({ data: COOLING_OFF });
      if (url === '/users') return Promise.resolve({ data: USERS });
      if (url === '/departments') return Promise.resolve({ data: DEPARTMENTS });
      return Promise.resolve({ data: [] });
    });

    (api.post as any).mockResolvedValue({ data: { success: true } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });
  });

  /**
   * Lần render bảng antd đầu tiên tốn > 1s trong jsdom → luôn chờ với timeout tường minh,
   * nếu không test sẽ flaky theo tải máy.
   */
  const waitForFirstTable = async () => {
    await waitFor(
      () => {
        expect(screen.getByText('Trần Văn Hải')).toBeDefined();
      },
      { timeout: 25000 },
    );
  };

  const switchToCoolingOffTab = async () => {
    fireEvent.click(tabButton('3'));
    // Nút hành động ở header chỉ được render khi activeTab === '3' → xác nhận đã đổi tab.
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /Khai báo Cách ly Đơn vị cũ/ })).toBeDefined();
      },
      { timeout: 25000 },
    );
  };

  const waitForRow = async (uniqueCellText: string) => {
    await waitFor(
      () => {
        expect(screen.getByText(uniqueCellText)).toBeDefined();
      },
      { timeout: 25000 },
    );
  };

  it('TC-SYS-03.A: mount gọi ĐÚNG 6 request (không query params) và render tiêu đề trang', async () => {
    render(<IndependenceTracker />);

    await waitForFirstTable();

    // Đúng thứ tự + đúng URL + không kèm params/config nào
    expect(getMock.mock.calls.map((call) => call[0])).toStrictEqual([
      '/independence/declarations',
      '/independence/rotations',
      '/independence/cooling-off',
      '/users',
      '/users',
      '/departments',
    ]);
    expect(getMock.mock.calls.every((call) => call.length === 1)).toBe(true);
    expect(getMock.mock.calls).toHaveLength(6);
    // Chỉ đọc dữ liệu khi mount — chưa ghi gì
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();

    expect(
      screen.getByText(/Tính Độc Lập & Khách Quan \(Independence & Objectivity\)/),
    ).toBeDefined();
    expect(
      screen.getByText(
        'Đánh giá tính Độc lập, Khách quan, Luân chuyển KTV (TT13) và Cách ly đơn vị cũ (Theo Chuẩn mực IIA 2024)',
      ),
    ).toBeDefined();
    expect(screen.getByText('1. Lịch sử Khai báo Xung đột Lợi ích')).toBeDefined();
    expect(screen.getByText('2. Lịch Luân chuyển KTV (Auditor Rotation)')).toBeDefined();
    expect(screen.getByText('3. Cách ly Đơn vị cũ (Cooling-Off 12 tháng - IIA 2.2)')).toBeDefined();
  });

  it('TC-SYS-03.B: bảng khai báo xung đột render đúng tag độc lập, ngày khai báo và trạng thái CAE', async () => {
    render(<IndependenceTracker />);

    await waitForFirstTable();

    // KTV hoàn toàn độc lập — không cần CAE duyệt
    const independentRow = within(rowOf('Trần Văn Hải'));
    expect(independentRow.getByText('2026')).toBeDefined();
    expect(independentRow.getByText('@haitv')).toBeDefined();
    expect(independentRow.getByText('Hoàn toàn độc lập')).toBeDefined();
    expect(
      independentRow.getByText(
        'Cam kết không có người thân quản lý hoặc lợi ích tài chính tại các ĐVĐKT',
      ),
    ).toBeDefined();
    expect(independentRow.getByText('15/01/2026')).toBeDefined();
    expect(independentRow.getByText('Không cần duyệt')).toBeDefined();

    // KTV có xung đột, đang chờ CAE duyệt → có 2 nút Duyệt / Từ chối ngoại lệ
    const conflictRow = within(rowOf('Nguyễn Thị Mai'));
    expect(conflictRow.getByText('Có xung đột')).toBeDefined();
    expect(conflictRow.getByText('Có anh ruột là Giám đốc Chi nhánh Hà Nội')).toBeDefined();
    expect(
      conflictRow.getByText('Cần bố trí KTV khác thay thế khi kiểm toán đơn vị liên quan'),
    ).toBeDefined();
    expect(conflictRow.getByText('20/02/2026')).toBeDefined();
    expect(conflictRow.getByText('Chờ CAE duyệt')).toBeDefined();
    expect(conflictRow.getByRole('button', { name: 'Duyệt' })).toBeDefined();
    expect(conflictRow.getByRole('button', { name: 'Từ chối' })).toBeDefined();

    // Ngoại lệ đã được CAE duyệt / từ chối
    expect(within(rowOf('Hoàng Văn Phúc')).getByText('Đã duyệt ngoại lệ')).toBeDefined();
    expect(within(rowOf('Bùi Thị Oanh')).getByText('Từ chối ngoại lệ')).toBeDefined();
  });

  it('TC-SYS-03.C: KTV còn trong cửa sổ cách ly 12 tháng bị gắn cảnh báo vi phạm (tag volcano)', async () => {
    render(<IndependenceTracker />);

    await waitForFirstTable();
    await switchToCoolingOffTab();
    await waitForRow('Đinh Bảo Long');

    // Toàn bộ tiêu đề cột của bảng cách ly độc lập
    expect(headerTextsOf(tableOfRow('Đinh Bảo Long'))).toStrictEqual([
      'Kiểm toán viên',
      'Đơn vị công tác trước đây',
      'Thời hạn cách ly độc lập (Cooling-off 12 tháng)',
      'Chuẩn mực áp dụng',
      'Hành động',
    ]);
    // Cột chuẩn mực: mỗi dòng cách ly một tag
    expect(screen.getAllByText('IIA Standard 2.2')).toHaveLength(COOLING_OFF.length);

    const violationRow = within(rowOf('Đinh Bảo Long'));

    // Đơn vị cũ + lệnh cấm phân công
    expect(violationRow.getByText('Chi nhánh Hà Nội')).toBeDefined();
    expect(
      violationRow.getByText(/Cấm phân công kiểm toán đơn vị này trong thời hạn cách ly/),
    ).toBeDefined();
    expect(violationRow.getByText('@longdb (Kiểm toán viên)')).toBeDefined();

    // Cảnh báo VI PHẠM: tag màu volcano "Đang cách ly đến: <ngày hết hạn cách ly>"
    const warningTag = violationRow.getByText(/Đang cách ly đến:/).closest('.ant-tag') as HTMLElement;
    expect(warningTag.className.split(/\s+/)).toContain('ant-tag-volcano');
    expect(violationRow.getByText(vnDate(COOLING_OFF_END_INSIDE))).toBeDefined();
    expect(violationRow.queryByText(/Đã hết hạn cách ly/)).toBeNull();
    expect(violationRow.queryByText('Đã hoàn thành cách ly')).toBeNull();
  });

  it('TC-SYS-03.D: KTV đã hết thời hạn cách ly KHÔNG bị gắn cảnh báo "Đang cách ly đến"', async () => {
    render(<IndependenceTracker />);

    await waitForFirstTable();
    await switchToCoolingOffTab();
    await waitForRow('Phạm Quốc Bảo');

    const expiredRow = within(rowOf('Phạm Quốc Bảo'));
    expect(expiredRow.getByText('Khối Khách hàng Doanh nghiệp')).toBeDefined();
    expect(expiredRow.getByText('@baopq (Trưởng đoàn)')).toBeDefined();

    // Tag xanh "Đã hết hạn cách ly (<ngày>)" — không còn là vi phạm
    const expiredTag = expiredRow
      .getByText(`Đã hết hạn cách ly (${vnDate(COOLING_OFF_END_OUTSIDE)})`)
      .closest('.ant-tag') as HTMLElement;
    expect(expiredTag.className.split(/\s+/)).toContain('ant-tag-green');
    expect(expiredRow.queryByText(/Đang cách ly đến/)).toBeNull();

    // GAP: ghi chú "⛔ Cấm phân công kiểm toán đơn vị này trong thời hạn cách ly" được render
    // VÔ ĐIỀU KIỆN (source line 480-482) nên dòng ĐÃ HẾT cách ly vẫn mang lệnh cấm phân công.
    expect(
      expiredRow.getByText(/Cấm phân công kiểm toán đơn vị này trong thời hạn cách ly/),
    ).toBeDefined();

    // Không có ngày kết thúc cách ly → nhánh thứ ba của source (line 492)
    const emptyRow = within(rowOf('Vũ Thanh Tùng'));
    expect(emptyRow.getByText('Đã hoàn thành cách ly')).toBeDefined();
    expect(emptyRow.queryByText(/Đang cách ly đến/)).toBeNull();
  });

  it('TC-SYS-03.E: khai báo cách ly → POST /independence/cooling-off với mặc định +12 tháng rồi tải lại', async () => {
    const successSpy = vi.spyOn(message, 'success');

    render(<IndependenceTracker />);

    await waitForFirstTable();
    await switchToCoolingOffTab();
    await waitForRow('Đinh Bảo Long');

    fireEvent.click(screen.getByRole('button', { name: /Khai báo Cách ly Đơn vị cũ/ }));
    const okButton = await screen.findByRole(
      'button',
      { name: 'Lưu Khai Báo Cách Ly' },
      { timeout: 20000 },
    );
    expect(screen.getByText('Khai báo Thời hạn Cách ly Đơn vị cũ (IIA Standard 2.2)')).toBeDefined();

    // Mặc định của form: ngày chuyển = hôm nay, hết cách ly = +12 tháng (source line 219-222)
    expect((screen.getByLabelText('Ngày chính thức chuyển sang KTNB') as HTMLInputElement).value).toBe(
      TODAY.format('DD/MM/YYYY'),
    );
    expect(
      (screen.getByLabelText('Thời hạn cách ly độc lập (Đủ 12 tháng)') as HTMLInputElement).value,
    ).toBe(TODAY.add(12, 'month').format('DD/MM/YYYY'));

    const userCombobox = screen.getByLabelText('Cán bộ / KTV mới chuyển sang KTNB');
    const userDropdown = await openSelectDropdown(userCombobox, 'userId');
    expect(readOptionLabels(userDropdown)).toStrictEqual(USERS.map(coolingOffUserOptionLabel));
    await pickOption(userDropdown, userCombobox, coolingOffUserOptionLabel(USERS[2]));

    const deptCombobox = screen.getByLabelText('Đơn vị / Phòng ban công tác trước đây');
    const deptDropdown = await openSelectDropdown(deptCombobox, 'priorDepartments');
    expect(readOptionLabels(deptDropdown)).toStrictEqual(DEPARTMENTS.map(departmentOptionLabel));
    await pickOption(deptDropdown, deptCombobox, departmentOptionLabel(DEPARTMENTS[0]));

    fireEvent.click(okButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/independence/cooling-off', {
        userId: 13,
        priorDepartments: 'Chi nhánh Hà Nội',
        transferDate: TODAY.format('YYYY-MM-DD'),
        coolingOffEndDate: TODAY.add(12, 'month').format('YYYY-MM-DD'),
      });
    });

    // Đúng 1 request, payload đã format ngày và KHÔNG có field thừa
    expect(postMock.mock.calls).toHaveLength(1);
    expect(postMock.mock.calls[0][1]).toStrictEqual({
      userId: 13,
      priorDepartments: 'Chi nhánh Hà Nội',
      transferDate: TODAY.format('YYYY-MM-DD'),
      coolingOffEndDate: TODAY.add(12, 'month').format('YYYY-MM-DD'),
    });
    expect(successSpy).toHaveBeenCalledWith(
      'Khai báo thời hạn cách ly đơn vị cũ (Cooling-off) thành công',
    );

    // Lưu xong phải tải lại toàn bộ dữ liệu (fetchData → 4 GET)
    await waitFor(() => {
      expect(
        getMock.mock.calls.filter((call) => call[0] === '/independence/cooling-off'),
      ).toHaveLength(2);
    });
    expect(
      getMock.mock.calls.filter((call) => call[0] === '/independence/declarations'),
    ).toHaveLength(2);
  });

  it('TC-SYS-03.F: CAE phê duyệt ngoại lệ → POST /independence/declarations/502/approve-exception + tải lại', async () => {
    const successSpy = vi.spyOn(message, 'success');

    render(<IndependenceTracker />);

    await waitForFirstTable();

    fireEvent.click(within(rowOf('Nguyễn Thị Mai')).getByRole('button', { name: 'Duyệt' }));
    await confirmPopconfirm();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/independence/declarations/502/approve-exception', {
        notes: 'Phê duyệt ngoại lệ kèm biện pháp kiểm soát giảm thiểu',
      });
    });

    expect(postMock.mock.calls).toHaveLength(1);
    expect(successSpy).toHaveBeenCalledWith('Đã phê duyệt ngoại lệ xung đột lợi ích (CAE)');
    await waitFor(() => {
      expect(
        getMock.mock.calls.filter((call) => call[0] === '/independence/declarations'),
      ).toHaveLength(2);
    });
  });

  it('TC-SYS-03.G: CAE từ chối ngoại lệ → POST /independence/declarations/502/reject-exception + tải lại', async () => {
    const successSpy = vi.spyOn(message, 'success');

    render(<IndependenceTracker />);

    await waitForFirstTable();

    fireEvent.click(within(rowOf('Nguyễn Thị Mai')).getByRole('button', { name: 'Từ chối' }));
    await confirmPopconfirm();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/independence/declarations/502/reject-exception', {
        notes: 'Từ chối ngoại lệ xung đột lợi ích',
      });
    });

    expect(postMock.mock.calls).toHaveLength(1);
    expect(successSpy).toHaveBeenCalledWith('Đã từ chối ngoại lệ xung đột');
    await waitFor(() => {
      expect(
        getMock.mock.calls.filter((call) => call[0] === '/independence/declarations'),
      ).toHaveLength(2);
    });
  });

  it('TC-SYS-03.H: luân chuyển KTV (TT13 Điều 16) mặc định Cool-off +3 năm và POST /independence/rotations', async () => {
    render(<IndependenceTracker />);

    await waitForFirstTable();

    fireEvent.click(tabButton('2'));
    fireEvent.click(
      await screen.findByRole(
        'button',
        { name: /Thiết lập Luân chuyển KTV/ },
        { timeout: 20000 },
      ),
    );
    const okButton = await screen.findByRole(
      'button',
      { name: 'Lưu Quy Định Luân Chuyển' },
      { timeout: 20000 },
    );
    expect(
      screen.getByText('Thiết lập Quy định Luân chuyển KTV (Thông tư 13/2018/TT-NHNN)'),
    ).toBeDefined();

    // Mặc định: lần cuối = hôm nay, cho phép kiểm lại = +3 năm, áp dụng hạn chế (source 170-174)
    expect((screen.getByLabelText('Lần cuối thực hiện kiểm toán') as HTMLInputElement).value).toBe(
      TODAY.format('DD/MM/YYYY'),
    );
    expect(
      (screen.getByLabelText('Thời hạn cho phép kiểm lại (Sau Cool-off)') as HTMLInputElement).value,
    ).toBe(TODAY.add(3, 'year').format('DD/MM/YYYY'));
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');

    const auditorCombobox = screen.getByLabelText('Kiểm toán viên luân chuyển');
    const auditorDropdown = await openSelectDropdown(auditorCombobox, 'auditorName');
    expect(readOptionLabels(auditorDropdown)).toStrictEqual(USERS.map(rotationAuditorOptionLabel));
    await pickOption(auditorDropdown, auditorCombobox, rotationAuditorOptionLabel(USERS[0]));

    const deptCombobox = screen.getByLabelText('Đơn vị đã thực hiện kiểm toán liên tiếp');
    const deptDropdown = await openSelectDropdown(deptCombobox, 'departmentName');
    await pickOption(deptDropdown, deptCombobox, departmentOptionLabel(DEPARTMENTS[0]));

    fireEvent.click(okButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/independence/rotations', {
        auditorName: 'Trần Văn Hải',
        departmentName: 'Chi nhánh Hà Nội',
        lastAuditDate: TODAY.format('YYYY-MM-DD'),
        nextAllowedAuditDate: TODAY.add(3, 'year').format('YYYY-MM-DD'),
        isRestricted: true,
      });
    });

    expect(postMock.mock.calls).toHaveLength(1);
    await waitFor(() => {
      expect(
        getMock.mock.calls.filter((call) => call[0] === '/independence/rotations'),
      ).toHaveLength(2);
    });
  });

  it('TC-SYS-03.I: /independence/cooling-off rỗng → bảng cách ly suy ra từ /users và loại người không có dữ liệu', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/independence/cooling-off') return Promise.resolve({ data: [] });
      if (url === '/independence/declarations') return Promise.resolve({ data: [] });
      if (url === '/independence/rotations') return Promise.resolve({ data: [] });
      if (url === '/users') return Promise.resolve({ data: FALLBACK_USERS });
      if (url === '/departments') return Promise.resolve({ data: DEPARTMENTS });
      return Promise.resolve({ data: [] });
    });

    render(<IndependenceTracker />);

    await waitFor(
      () => {
        expect(
          screen.getByText(/Tính Độc Lập & Khách Quan \(Independence & Objectivity\)/),
        ).toBeDefined();
      },
      { timeout: 25000 },
    );

    await switchToCoolingOffTab();

    await waitForRow('Lê Hoàng Nam');

    // Có coolingOffEndDate còn hạn → vi phạm
    const insideRow = within(rowOf('Lê Hoàng Nam'));
    expect(insideRow.getByText('Khối KHDN')).toBeDefined();
    expect(insideRow.getByText(vnDate(COOLING_OFF_END_INSIDE))).toBeDefined();

    // Có coolingOffEndDate đã hết hạn, KHÔNG có priorDepartments → "Chưa ghi nhận" + đã hết cách ly
    const outsideRow = within(rowOf('Ngô Thị Hồng'));
    expect(outsideRow.getByText('Chưa ghi nhận')).toBeDefined();
    expect(outsideRow.getByText(`Đã hết hạn cách ly (${vnDate(COOLING_OFF_END_OUTSIDE)})`)).toBeDefined();

    // Không có cả hai trường → không thuộc bảng cách ly
    expect(screen.queryByText('Hoàng Văn Phúc')).toBeNull();
  });

  it('TC-SYS-03.J (GAP): trang không có phân quyền — hasPermission=false vẫn render đủ tab, nút và dữ liệu', async () => {
    render(<IndependenceTracker />);

    await waitForFirstTable();

    // Trước khi đổi tab: các hành động của tab 1 vẫn hiện dù quyền bị từ chối toàn bộ
    expect(
      screen.getByRole('button', { name: /Khai báo Xung đột Lợi ích Hàng năm/ }),
    ).toBeDefined();
    // Nút có icon (PlusOutlined mang aria-label="plus") nên accessible name có tiền tố icon.
    expect(screen.getByRole('button', { name: /Gửi bản khai báo mới/ })).toBeDefined();
    expect(within(rowOf('Nguyễn Thị Mai')).getByRole('button', { name: 'Duyệt' })).toBeDefined();

    await switchToCoolingOffTab();
    await waitForRow('Đinh Bảo Long');

    expect(screen.getByRole('button', { name: /Khai báo cán bộ cách ly/ })).toBeDefined();
    expect(screen.getByText('Đinh Bảo Long')).toBeDefined();
    expect(headerTextsOf(tableOfRow('Đinh Bảo Long'))).toContain(
      'Thời hạn cách ly độc lập (Cooling-off 12 tháng)',
    );
  });
});
