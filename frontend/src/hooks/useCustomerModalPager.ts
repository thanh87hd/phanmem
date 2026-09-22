import { useState, useEffect, useCallback } from 'react';

export interface UseCustomerModalPagerOptions {
  isOpen: boolean;
  currentIndex: number;
  totalCount: number;
  onIndexChange: (newIndex: number) => void;
  onSave?: (advanceToNext?: boolean) => void | Promise<void>;
  initialFullscreen?: boolean;
}

export interface UseCustomerModalPagerResult {
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleFullscreen: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  goPrev: () => void;
  goNext: () => void;
  goToIndex: (index: number) => void;
}

/**
 * Custom Hook: Quản lý điều hướng phân trang mẫu và phím tắt trong Modal toàn màn hình
 * Hỗ trợ:
 * - Ctrl+S / Cmd+S: Lưu mẫu hiện tại
 * - Alt + ArrowLeft: Quay lại mẫu trước
 * - Alt + ArrowRight: Chuyển sang mẫu tiếp theo
 * - Tự động dọn dẹp (cleanup) window event listener khi modal đóng
 */
export function useCustomerModalPager({
  isOpen,
  currentIndex,
  totalCount,
  onIndexChange,
  onSave,
  initialFullscreen = true,
}: UseCustomerModalPagerOptions): UseCustomerModalPagerResult {
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalCount - 1;

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  }, [currentIndex, onIndexChange]);

  const goNext = useCallback(() => {
    if (currentIndex < totalCount - 1) {
      onIndexChange(currentIndex + 1);
    }
  }, [currentIndex, totalCount, onIndexChange]);

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalCount) {
        onIndexChange(index);
      }
    },
    [totalCount, onIndexChange],
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Lắng nghe phím tắt bàn phím toàn cục khi modal mở
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (onSave) {
          onSave(false);
        }
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSave, goNext, goPrev]);

  return {
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    goToIndex,
  };
}
