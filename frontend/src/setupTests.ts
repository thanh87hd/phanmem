import { vi } from 'vitest';

// Mock window.matchMedia for Ant Design responsive Grid / Breakpoint
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for Ant Design components (Modal, Table, Form, etc.)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = MockResizeObserver as any;

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock HTMLElement.prototype.scrollIntoView for JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();
