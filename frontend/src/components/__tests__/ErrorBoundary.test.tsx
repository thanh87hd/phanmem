import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test Component Crashing Failure');
  }
  return <div>Component Rendered Normal Content</div>;
};

describe('ErrorBoundary Component (EB-01 -> EB-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Silence console.error for expected thrown error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('EB-01: renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Component Rendered Normal Content')).toBeDefined();
  });

  it('EB-02: catches unhandled error and renders fallback error UI', () => {
    render(
      <ErrorBoundary fallbackTitle="Lỗi hiển thị bảng dữ liệu">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Lỗi hiển thị bảng dữ liệu')).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Thử lại/i }) ||
        screen.getByRole('button', { name: /Trang Chủ/i }),
    ).toBeDefined();
  });

  it('EB-03: renders widget mode fallback card when isWidget=true', () => {
    render(
      <ErrorBoundary isWidget={true} fallbackTitle="Lỗi tải biểu đồ">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Lỗi tải biểu đồ')).toBeDefined();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeDefined();
  });

  it('EB-04: resets error state when retry button is clicked', () => {
    let shouldFail = true;
    const DynamicComponent = () => {
      if (shouldFail) throw new Error('First crash');
      return <div>Component Recovered Content</div>;
    };

    render(
      <ErrorBoundary isWidget={true}>
        <DynamicComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeDefined();

    // Fix component state so subsequent render succeeds
    shouldFail = false;
    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    expect(screen.getByText('Component Recovered Content')).toBeDefined();
  });
});
