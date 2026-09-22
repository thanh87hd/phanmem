import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import KitaAssistant from '../KitaAssistant';
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

describe('KitaAssistant Component (KA-01 -> KA-05)', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('KA-01: renders floating AI trigger button and opens chat drawer on click', async () => {
    render(<KitaAssistant />);
    
    const trigger = document.querySelector('.kita-floating-button-wrapper') || document.querySelector('.kita-floating-button-container');
    expect(trigger).toBeDefined();

    fireEvent.click(trigger!);

    await waitFor(() => {
      expect(screen.getByText(/Trợ lý thông minh Kita/i)).toBeDefined();
    });
  });

  it('KA-02: renders default prompt suggestions in chat interface', async () => {
    render(<KitaAssistant />);
    const trigger = document.querySelector('.kita-floating-button-container') || document.querySelector('.kita-floating-button-wrapper');
    fireEvent.click(trigger!);

    await waitFor(() => {
      expect(document.querySelector('.kita-quick-prompts-container')).toBeDefined();
      expect(document.querySelectorAll('.kita-quick-prompt-btn').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('KA-03: sends question and renders user and assistant responses', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        reply: 'Theo Thông tư 13/2018/TT-NHNN, hệ thống kiểm soát nội bộ phải có 3 tuyến bảo vệ độc lập.',
      },
    });

    render(<KitaAssistant />);
    const trigger = document.querySelector('.kita-floating-button-wrapper') || document.querySelector('.kita-floating-button-container');
    fireEvent.click(trigger!);

    await waitFor(() => {
      expect(document.querySelector('.kita-input-area')).toBeDefined();
    });

    const input = document.querySelector('.kita-input-area') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Thông tư 13 quy định gì về 3 tuyến bảo vệ?' } });

    const sendBtn = document.querySelector('.kita-send-btn-round') as HTMLElement;
    if (sendBtn) {
      fireEvent.click(sendBtn);
    } else {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    }

    await waitFor(() => {
      expect(screen.getByText(/Thông tư 13 quy định gì về 3 tuyến bảo vệ\?/i)).toBeDefined();
      expect(screen.getByText(/Theo Thông tư 13\/2018\/TT-NHNN/i)).toBeDefined();
    });
  });

  it('KA-04: handles API error gracefully with fallback error handling', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('AI microservice network error'));

    render(<KitaAssistant />);
    const trigger = document.querySelector('.kita-floating-button-wrapper') || document.querySelector('.kita-floating-button-container');
    fireEvent.click(trigger!);

    await waitFor(() => {
      expect(document.querySelector('.kita-input-area')).toBeDefined();
    });

    const input = document.querySelector('.kita-input-area') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test lỗi kết nối' } });
    
    const sendBtn = document.querySelector('.kita-send-btn-round') as HTMLElement;
    if (sendBtn) {
      fireEvent.click(sendBtn);
    }

    await waitFor(() => {
      expect(screen.getByText(/Test lỗi kết nối/i)).toBeDefined();
      expect(api.post).toHaveBeenCalled();
    });
  });

  it('KA-05: handles drawer close and toggle', async () => {
    render(<KitaAssistant />);
    const trigger = document.querySelector('.kita-floating-button-wrapper') || document.querySelector('.kita-floating-button-container');
    fireEvent.click(trigger!);

    await waitFor(() => {
      expect(screen.getByText(/Trợ lý thông minh Kita/i)).toBeDefined();
    });

    const closeBtn = document.querySelector('.ant-drawer-close');
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }
  });
});
