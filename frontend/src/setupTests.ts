import { vi, afterEach, afterAll } from 'vitest';
import { cleanup, act } from '@testing-library/react';
import { message } from 'antd';

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

/* ────────────────────────────────────────────────────────────────────────────
 * React 19 + jsdom teardown hygiene (global — the leak is framework level)
 *
 * React's Scheduler prefers Node's `setImmediate` whenever it exists
 * (scheduler.development.js:210-219), and both the passive-effect flush
 * (`schedulerEvent = window.event`, react-dom-client.development.js:17920) and
 * the render task (react-dom-client.development.js:18936) read the global
 * `window` as their first statement. Vitest deletes `window` when it tears the
 * jsdom environment down right after a test file finishes, so any Scheduler
 * callback still queued at that moment throws
 * "ReferenceError: window is not defined" and makes the run exit non-zero even
 * though every test passed.
 *
 * Two things keep such callbacks queued at teardown:
 *   1. antd's `message` notices run a requestAnimationFrame countdown
 *      (@rc-component/notification `useNoticeTimer`) that dispatches a React
 *      update every frame for 3s by default, on a React root that RTL's
 *      auto-cleanup does not own. Disabling the auto-close timer removes the
 *      recurring updates; destroying the root after each test removes the root.
 *   2. An update committed after the last macrotask boundary of a file leaves
 *      the passive-effect / render callback pending with nothing left to run it.
 *      The `afterAll` drain below gives the event loop real turns (jsdom rAF
 *      frames included) plus a macrotask turn, so that work runs while `window`
 *      still exists.
 * ──────────────────────────────────────────────────────────────────────────── */
message.config({ duration: 0 });

afterEach(async () => {
  await act(async () => {
    cleanup();
    message.destroy();
  });
});

afterAll(async () => {
  for (let turn = 0; turn < 3; turn += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      await new Promise<void>((resolve) => setImmediate(resolve));
    });
  }
});
