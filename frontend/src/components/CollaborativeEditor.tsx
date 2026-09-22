import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  docName: string;  // unique per document section, e.g. 'report-42-summary'
  userName?: string;
}

// ponytail: URL từ env – local dev dùng ws://, production dùng wss://
const WS_URL = (import.meta as any).env?.VITE_COLLAB_WS_URL || 'ws://localhost:1234';

const CollaborativeEditor: React.FC<Props> = ({ docName, userName = 'Unknown' }) => {
  const { t } = useTranslation();
  // useRef keeps the Y.Doc stable across re-renders so Collaboration extension stays bound.
  const ydocRef = useRef(new Y.Doc());
  const [connected, setConnected] = useState(false);

  const editor = useEditor({
    extensions: [
      // Disable TipTap's built-in history – Yjs manages undo/redo via its own mechanism.
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydocRef.current }),
    ],
  });

  useEffect(() => {
    const provider = new WebsocketProvider(WS_URL, docName, ydocRef.current);

    provider.on('status', ({ status }: { status: string }) => {
      setConnected(status === 'connected');
    });

    return () => {
      provider.destroy();
    };
  }, [docName]); // re-connect only when docName changes

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
      <div
        style={{
          fontSize: 11,
          color: connected ? '#16a34a' : '#9ca3af',
          background: connected ? '#f0fdf4' : '#f9fafb',
          padding: '4px 10px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {connected ? '● Cộng tác trực tuyến – đã kết nối' : '○ Đang kết nối đến máy chủ cộng tác...'}
      </div>
      <div style={{ padding: 8 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default CollaborativeEditor;
