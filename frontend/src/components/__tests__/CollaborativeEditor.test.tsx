import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CollaborativeEditor from '../CollaborativeEditor';

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

const { mockProviderOn, mockProviderDestroy, MockWebsocketProvider, MockDoc } = vi.hoisted(() => {
  const mockProviderOn = vi.fn();
  const mockProviderDestroy = vi.fn();
  const MockWebsocketProvider = vi.fn(function (this: any, _url: string, _room: string, _doc: any) {
    this.on = mockProviderOn;
    this.destroy = mockProviderDestroy;
  });
  const MockDoc = vi.fn(function (this: any) {});
  return { mockProviderOn, mockProviderDestroy, MockWebsocketProvider, MockDoc };
});

vi.mock('y-websocket', () => ({
  WebsocketProvider: MockWebsocketProvider,
}));

// Mock @tiptap/react – focus on component behaviour, not editor internals.
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn().mockReturnValue(null),
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock('yjs', () => ({
  Doc: MockDoc,
  default: { Doc: MockDoc },
}));
vi.mock('@tiptap/extension-collaboration', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));
vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

// ── Helpers ────────────────────────────────────────────────────────────────
/** Simulate a status event dispatched by the WS provider. */
function triggerStatus(status: string) {
  // mockProviderOn stores calls as [[event, handler], ...].
  const statusCall = mockProviderOn.mock.calls.find(([e]) => e === 'status');
  if (statusCall) statusCall[1]({ status });
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('CollaborativeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the editor content area', () => {
    render(<CollaborativeEditor docName="test-doc" />);
    expect(screen.getByTestId('editor-content')).toBeDefined();
  });

  it('shows "connecting" badge initially (before WS status event)', () => {
    render(<CollaborativeEditor docName="test-doc" />);
    expect(screen.getByText(/Đang kết nối/i)).toBeDefined();
  });

  it('shows "connected" badge after provider fires connected status', async () => {
    render(<CollaborativeEditor docName="test-doc" />);
    await act(async () => triggerStatus('connected'));
    expect(screen.getByText(/Đã kết nối/i)).toBeDefined();
  });

  it('shows "connecting" badge when status is disconnected', async () => {
    render(<CollaborativeEditor docName="test-doc" />);
    // First connect, then disconnect.
    await act(async () => triggerStatus('connected'));
    await act(async () => triggerStatus('disconnected'));
    expect(screen.getByText(/Đang kết nối/i)).toBeDefined();
  });

  it('creates a new provider with correct docName and WS URL', () => {
    render(<CollaborativeEditor docName="report-42-summary" />);
    expect(MockWebsocketProvider).toHaveBeenCalledWith(
      expect.stringContaining('localhost:1234'),
      'report-42-summary',
      expect.anything()
    );
  });

  it('destroys the WS provider on unmount', () => {
    const { unmount } = render(<CollaborativeEditor docName="test-doc" />);
    unmount();
    expect(mockProviderDestroy).toHaveBeenCalledTimes(1);
  });

  it('re-connects when docName prop changes', () => {
    const { rerender } = render(<CollaborativeEditor docName="report-1" />);
    rerender(<CollaborativeEditor docName="report-2" />);
    // Provider should have been created twice (once per docName).
    expect(MockWebsocketProvider).toHaveBeenCalledTimes(2);
    expect(mockProviderDestroy).toHaveBeenCalledTimes(1); // first provider cleaned up
  });
});
