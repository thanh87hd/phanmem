import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { message } from 'antd';
import RegulatoryExams from '../RegulatoryExams';
import api from '../../services/api';
import dayjs from 'dayjs';

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
 * UAT: docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md → TC-BKS-02
 *   "Quản Lý & Giám Sát Kiến Nghị Đoàn Thanh Tra NHNN" (/regulatory-exams)
 *
 * API thật của trang (đối chiếu backend/src/regulatory-exams/regulatory-exams.controller.ts):
 *   GET    /regulatory-exams                        → danh sách đợt thanh tra (KHÔNG kèm query params)
 *   POST   /regulatory-exams                        → tạo đợt thanh tra
 *   POST   /regulatory-exams/:id/findings           → thêm kết luận/kiến nghị của đợt
 *   GET    /regulatory-exams/:id                    → refresh drawer kết luận
 */
describe('RegulatoryExams - TC-BKS-02 (Giám sát kiến nghị đoàn thanh tra NHNN)', { timeout: 60000 }, () => {
  const hnnnFinding = {
    id: 9001,
    findingTitle: 'Cấp tín dụng vượt thẩm quyền tại CN Hà Nội',
    department: 'CN Hà Nội',
    deadline: '2025-12-31',
    status: 'InProgress',
  };
  const secondFinding = {
    id: 9002,
    findingTitle: 'Thiếu hồ sơ bảo đảm tiền vay',
    department: 'CN Đà Nẵng',
    deadline: '2025-11-30',
    status: 'Open',
  };
  const findingAddedByTest = {
    id: 9003,
    findingTitle: 'Báo cáo Thống đốc NHNN định kỳ chậm tiến độ',
    department: 'Phòng KTNB Hội sở',
    deadline: '2025-12-31',
    status: 'Resolved',
  };

  const hnnnExam = {
    id: 101,
    title: 'Thanh tra chuyên đề hoạt động cấp tín dụng 2025',
    authority: 'NHNN',
    startDate: '2025-08-01',
    endDate: '2025-09-30',
    status: 'Open',
    findings: [hnnnFinding, secondFinding],
  };

  const stateAuditExam = {
    id: 102,
    title: 'Kiểm toán Nhà nước - Báo cáo tài chính 2024',
    authority: 'KTNN',
    startDate: '2025-03-01',
    endDate: '2025-05-15',
    status: 'Closed',
    findings: [],
  };

  const getMock = api.get as unknown as {
    mock: { calls: unknown[][] };
    mockImplementation: (fn: (url: string, config?: unknown) => unknown) => void;
  };
  const postMock = api.post as unknown as { mock: { calls: unknown[][] } };

  beforeEach(() => {
    vi.clearAllMocks();

    getMock.mockImplementation((url: string) => {
      if (url === '/regulatory-exams') {
        return Promise.resolve({ data: [hnnnExam, stateAuditExam] });
      }
      if (url === '/regulatory-exams/101') {
        // Sau khi thêm kiến nghị, drawer được refresh bằng GET chi tiết đợt thanh tra
        return Promise.resolve({
          data: { ...hnnnExam, findings: [hnnnFinding, secondFinding, findingAddedByTest] },
        });
      }
      return Promise.resolve({ data: [] });
    });

    (api.post as any).mockResolvedValue({ data: { success: true } });
    (api.patch as any).mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Lần render bảng antd đầu tiên trong file tốn > 1s (thực tế vài giây) → phải đặt
   * timeout tường minh, nếu không test sẽ flaky theo tải máy.
   */
  const waitForExamTable = async () => {
    await waitFor(
      () => {
        expect(screen.getByText(hnnnExam.title)).toBeDefined();
      },
      { timeout: 25000 },
    );
  };

  const waitForDrawer = async () => {
    await waitFor(
      () => {
        expect(screen.getByText(`Kết luận: ${hnnnExam.title}`)).toBeDefined();
      },
      { timeout: 20000 },
    );
  };

  /** Mở modal antd và chờ footer render (không phụ thuộc class DOM nội bộ của antd v6). */
  const openModalAndGetOk = async () =>
    screen.findByRole('button', { name: 'OK' }, { timeout: 20000 });

  /**
   * antd Form.Item đặt id = tên field cho control bên trong. Dùng id thay vì
   * getByLabelText vì antd còn gắn aria-label = tiêu đề cột cho các cột sortable
   * ("Ngày bắt đầu", "Ngày kết thúc", "Trạng thái"...) → label bị trùng.
   */
  const formControl = (id: string): HTMLElement => {
    const node = document.querySelector<HTMLElement>(`#${id}`);
    if (!node) throw new Error(`Không tìm thấy control #${id}`);
    return node;
  };

  /**
   * rc-picker (antd v6) chỉ nhận text qua sự kiện paste; `format="DD/MM/YYYY"` chặn
   * fireEvent.change. Cách ổn định nhất là mở panel lịch rồi click vào ô ngày —
   * ô ngày của panel hiển thị đúng số ngày trong tháng hiện tại.
   */
  const activeDatePickerDayCells = (): Element[] => {
    const dropdowns = Array.from(document.querySelectorAll('.ant-picker-dropdown')).filter(
      (node) => !node.classList.contains('ant-picker-dropdown-hidden'),
    );
    const active = dropdowns[dropdowns.length - 1];
    if (!active) return [];
    return Array.from(active.querySelectorAll('.ant-picker-cell-inner'));
  };

  const pickDayInCurrentMonth = async (inputId: string, day: number) => {
    const input = formControl(inputId);
    fireEvent.click(input);
    await waitFor(
      () => {
        expect(activeDatePickerDayCells().length).toBeGreaterThan(0);
      },
      { timeout: 20000 },
    );
    const cell = activeDatePickerDayCells().find((node) => node.textContent === String(day));
    if (!cell) throw new Error(`Không tìm thấy ô ngày ${day} của DatePicker #${inputId}`);
    fireEvent.click(cell);
  };

  /** antd v6 Select mở dropdown bằng mousedown trên chính input (role=combobox). */
  const selectOption = async (inputId: string, optionText: string) => {
    fireEvent.mouseDown(formControl(inputId));
    const option = await screen.findByTitle(optionText, undefined, { timeout: 20000 });
    fireEvent.click(option);
  };

  it('TC-BKS-02.A: tải danh sách đợt thanh tra khi mount bằng GET /regulatory-exams (không query params)', async () => {
    render(<RegulatoryExams />);

    await waitForExamTable();

    // Chỉ 1 request khi mount và KHÔNG kèm tham số lọc nào
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/regulatory-exams');

    expect(screen.getByText('Regulatory Exam Tracker')).toBeDefined();
    expect(
      screen.getByText(
        'Quản lý và theo dõi các kết luận từ NHNN, Kiểm toán Nhà nước và cơ quan khác',
      ),
    ).toBeDefined();

    // Đợt thanh tra NHNN: cơ quan / ngày / trạng thái / số kiến nghị
    const hnnnRow = screen.getByText(hnnnExam.title).closest('tr');
    if (!hnnnRow) throw new Error(`Không tìm thấy dòng bảng cho "${hnnnExam.title}"`);
    const hnnnScope = within(hnnnRow as HTMLElement);
    expect(hnnnScope.getByText('NHNN')).toBeDefined();
    expect(hnnnScope.getByText('Open')).toBeDefined();
    expect(hnnnScope.getByText('2025-08-01')).toBeDefined();
    expect(hnnnScope.getByText('2025-09-30')).toBeDefined();
    expect(hnnnScope.getByRole('button', { name: /Xem Kết luận \(2\)/ })).toBeDefined();

    // Đợt kiểm toán Nhà nước: trạng thái Closed và chưa có kiến nghị
    const stateAuditRow = screen.getByText(stateAuditExam.title).closest('tr');
    if (!stateAuditRow) throw new Error(`Không tìm thấy dòng bảng cho "${stateAuditExam.title}"`);
    const stateAuditScope = within(stateAuditRow as HTMLElement);
    expect(stateAuditScope.getByText('KTNN')).toBeDefined();
    expect(stateAuditScope.getByText('Closed')).toBeDefined();
    expect(stateAuditScope.getByText('2025-03-01')).toBeDefined();
    expect(stateAuditScope.getByText('2025-05-15')).toBeDefined();
    expect(stateAuditScope.getByRole('button', { name: /Xem Kết luận \(0\)/ })).toBeDefined();
  });

  it('TC-BKS-02.B: mở drawer đợt NHNN và render danh mục kiến nghị kèm đơn vị/hạn/trạng thái', async () => {
    render(<RegulatoryExams />);

    await waitForExamTable();

    fireEvent.click(screen.getByRole('button', { name: /Xem Kết luận \(2\)/ }));

    await waitForDrawer();

    expect(screen.getByText(hnnnFinding.findingTitle)).toBeDefined();
    expect(screen.getByText(secondFinding.findingTitle)).toBeDefined();
    expect(screen.getByText('CN Hà Nội')).toBeDefined();
    expect(screen.getByText('CN Đà Nẵng')).toBeDefined();
    expect(screen.getByText('2025-12-31')).toBeDefined();
    expect(screen.getByText('2025-11-30')).toBeDefined();
    expect(screen.getByText('InProgress')).toBeDefined();
    // Không phát sinh thêm request khi chỉ mở drawer (dữ liệu kiến nghị đã có trong list payload)
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('TC-BKS-02.C: tạo đợt thanh tra POST /regulatory-exams với payload ngày đã format YYYY-MM-DD', async () => {
    const successSpy = vi.spyOn(message, 'success');
    // Chọn ngày trong tháng hiện tại để panel lịch không phải điều hướng tháng
    const startDate = dayjs().date(15);
    const endDate = dayjs().date(20);

    render(<RegulatoryExams />);

    await waitForExamTable();

    fireEvent.click(screen.getByRole('button', { name: /Thêm Đợt Thanh tra/ }));

    const okButton = await openModalAndGetOk();

    fireEvent.change(formControl('title'), {
      target: { value: 'Thanh tra chuyên đề hoạt động cấp tín dụng 2025 (bổ sung)' },
    });
    await selectOption('authority', 'Ngân hàng Nhà nước (NHNN)');
    await pickDayInCurrentMonth('startDate', 15);
    await pickDayInCurrentMonth('endDate', 20);

    // DatePicker hiển thị theo format DD/MM/YYYY
    expect((formControl('startDate') as HTMLInputElement).value).toBe(
      startDate.format('DD/MM/YYYY'),
    );
    expect((formControl('endDate') as HTMLInputElement).value).toBe(
      endDate.format('DD/MM/YYYY'),
    );

    fireEvent.click(okButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/regulatory-exams', {
        title: 'Thanh tra chuyên đề hoạt động cấp tín dụng 2025 (bổ sung)',
        authority: 'NHNN',
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
      });
    });

    // Đúng 1 request POST, không gửi kèm field thừa
    expect(postMock.mock.calls).toHaveLength(1);
    expect((postMock.mock.calls[0][1] as Record<string, unknown>)).toStrictEqual({
      title: 'Thanh tra chuyên đề hoạt động cấp tín dụng 2025 (bổ sung)',
      authority: 'NHNN',
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
    });

    expect(successSpy).toHaveBeenCalledWith('Thêm đợt thanh tra thành công');
    // Lưu xong phải tải lại danh sách
    await waitFor(() => {
      expect(
        getMock.mock.calls.filter((call) => call[0] === '/regulatory-exams').length,
      ).toBe(2);
    });
  });

  it('TC-BKS-02.D: thêm kiến nghị POST /regulatory-exams/:id/findings rồi refresh drawer bằng GET chi tiết', async () => {
    const successSpy = vi.spyOn(message, 'success');
    const deadline = dayjs().date(20);

    render(<RegulatoryExams />);

    await waitForExamTable();

    fireEvent.click(screen.getByRole('button', { name: /Xem Kết luận \(2\)/ }));
    await waitForDrawer();

    fireEvent.click(screen.getByRole('button', { name: /Thêm Kết luận/ }));

    const okButton = await openModalAndGetOk();

    fireEvent.change(formControl('findingTitle'), {
      target: { value: findingAddedByTest.findingTitle },
    });
    fireEvent.change(formControl('department'), {
      target: { value: findingAddedByTest.department },
    });
    await pickDayInCurrentMonth('deadline', 20);
    expect((formControl('deadline') as HTMLInputElement).value).toBe(
      deadline.format('DD/MM/YYYY'),
    );

    fireEvent.click(okButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/regulatory-exams/101/findings', {
        findingTitle: findingAddedByTest.findingTitle,
        department: findingAddedByTest.department,
        deadline: deadline.format('YYYY-MM-DD'),
      });
    });

    expect(postMock.mock.calls).toHaveLength(1);
    expect(successSpy).toHaveBeenCalledWith('Thêm kết luận/kiến nghị thành công');

    // Drawer được refresh bằng GET /regulatory-exams/101 và hiển thị kiến nghị mới
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/regulatory-exams/101');
    });
    await waitFor(() => {
      expect(screen.getByText(findingAddedByTest.findingTitle)).toBeDefined();
    });
    expect(screen.getByText('Phòng KTNB Hội sở')).toBeDefined();
    expect(screen.getByText('Resolved')).toBeDefined();
    // Danh sách cũng được tải lại (fetchExams sau khi thêm thành công)
    expect(
      getMock.mock.calls.filter((call) => call[0] === '/regulatory-exams').length,
    ).toBeGreaterThanOrEqual(2);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('TC-BKS-02.E: tìm kiếm được xử lý phía client, không gọi thêm API lọc', async () => {
    render(<RegulatoryExams />);

    await waitForExamTable();

    fireEvent.change(screen.getByPlaceholderText('Tìm kiếm đợt thanh tra, cơ quan...'), {
      target: { value: 'Kiểm toán Nhà nước' },
    });

    await waitFor(() => {
      expect(screen.queryByText(hnnnExam.title)).toBeNull();
    });
    expect(screen.getByText(stateAuditExam.title)).toBeDefined();
    expect(screen.queryByText('NHNN')).toBeNull();
    // Vẫn chỉ có request load ban đầu → lọc không đẩy lên server
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/regulatory-exams');

    // "Xóa bộ lọc" bật khi có filter và trả lại toàn bộ danh sách, vẫn không gọi API
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => {
      expect(screen.getByText(hnnnExam.title)).toBeDefined();
    });
    expect(screen.getByText(stateAuditExam.title)).toBeDefined();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('TC-BKS-02.F (GAP): UI chưa có chức năng xoá đợt thanh tra/kiến nghị nên DELETE không bao giờ được gọi', async () => {
    render(<RegulatoryExams />);

    await waitForExamTable();

    fireEvent.click(screen.getByRole('button', { name: /Xem Kết luận \(2\)/ }));
    await waitForDrawer();

    // Backend có DELETE /regulatory-exams/:id và DELETE /regulatory-exams/findings/:findingId
    // (backend/src/regulatory-exams/regulatory-exams.controller.ts), nhưng component
    // không render bất kỳ nút xoá nào → không có request DELETE.
    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^(Xóa|Xoá)$/ })).toBeNull();

    // Cột "Hành động" của mỗi đợt thanh tra chỉ có đúng 1 nút: Xem Kết luận (n)
    const hnnnRow = screen.getByText(hnnnExam.title).closest('tr');
    if (!hnnnRow) throw new Error(`Không tìm thấy dòng bảng cho "${hnnnExam.title}"`);
    const cells = hnnnRow.querySelectorAll('td');
    expect(cells).toHaveLength(6);
    const actionCell = cells[5] as HTMLElement;
    const actionButtons = within(actionCell).getAllByRole('button');
    expect(actionButtons).toHaveLength(1);
    expect(actionButtons[0].textContent).toContain('Xem Kết luận (2)');

    // Bảng kiến nghị trong drawer cũng không có nút hành động nào (không có Xoá/Sửa)
    const findingRow = screen.getByText(hnnnFinding.findingTitle).closest('tr');
    if (!findingRow) throw new Error(`Không tìm thấy dòng kiến nghị "${hnnnFinding.findingTitle}"`);
    expect(within(findingRow as HTMLElement).queryAllByRole('button')).toHaveLength(0);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
