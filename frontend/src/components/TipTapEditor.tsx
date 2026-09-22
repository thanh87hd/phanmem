import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Button, Space, Tooltip, Select, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  TableOutlined,
  UndoOutlined,
  RedoOutlined,
  BgColorsOutlined,
  FontColorsOutlined,
  MinusOutlined,
} from '@ant-design/icons';

interface TipTapEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  const { t } = useTranslation();
  if (!editor) {
    return null;
  }

  // Heading Selector Options
  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
    ? 'h3'
    : 'p';

  const headingOptions = [
    { value: 'p', label: 'Văn bản thường (Paragraph)' },
    { value: 'h1', label: 'Tiêu đề lớn (Heading 1)' },
    { value: 'h2', label: 'Tiêu đề vừa (Heading 2)' },
    { value: 'h3', label: 'Tiêu đề nhỏ (Heading 3)' },
  ];

  const handleHeadingChange = (value: string) => {
    if (value === 'p') {
      editor.chain().focus().setParagraph().run();
    } else if (value === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (value === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (value === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  };

  // Color Menu Items
  const colorItems: MenuProps['items'] = [
    { key: '#000000', label: <span style={{ color: '#000000' }}>● Mặc định (Đen)</span>, onClick: () => editor.chain().focus().setColor('#000000').run() },
    { key: '#dc2626', label: <span style={{ color: '#dc2626' }}>● Rủi ro Cao (Đỏ)</span>, onClick: () => editor.chain().focus().setColor('#dc2626').run() },
    { key: '#d97706', label: <span style={{ color: '#d97706' }}>● Cảnh báo (Cam)</span>, onClick: () => editor.chain().focus().setColor('#d97706').run() },
    { key: '#b45309', label: <span style={{ color: '#b45309' }}>● Thương hiệu LPBank (Vàng hổ phách)</span>, onClick: () => editor.chain().focus().setColor('#b45309').run() },
    { key: '#ea9105', label: <span style={{ color: '#ea9105' }}>● Thương hiệu LPBank (Vàng Gold)</span>, onClick: () => editor.chain().focus().setColor('#ea9105').run() },
    { key: 'unset', label: '✕ Bỏ màu chữ', onClick: () => editor.chain().focus().unsetColor().run() },
  ];

  // Highlight Menu Items
  const highlightItems: MenuProps['items'] = [
    { key: '#fef08a', label: <span style={{ backgroundColor: '#fef08a', padding: '2px 8px', borderRadius: 4 }}>Highlight Vàng</span>, onClick: () => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run() },
    { key: '#fed7aa', label: <span style={{ backgroundColor: '#fed7aa', padding: '2px 8px', borderRadius: 4 }}>Highlight Cam</span>, onClick: () => editor.chain().focus().toggleHighlight({ color: '#fed7aa' }).run() },
    { key: '#bbf7d0', label: <span style={{ backgroundColor: '#bbf7d0', padding: '2px 8px', borderRadius: 4 }}>Highlight Xanh lá</span>, onClick: () => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run() },
    { key: '#bae6fd', label: <span style={{ backgroundColor: '#bae6fd', padding: '2px 8px', borderRadius: 4 }}>Highlight Xanh dương</span>, onClick: () => editor.chain().focus().toggleHighlight({ color: '#bae6fd' }).run() },
    { key: 'unset', label: '✕ Bỏ highlight', onClick: () => editor.chain().focus().unsetHighlight().run() },
  ];

  // Table Menu Items
  const tableItems: MenuProps['items'] = [
    {
      key: 'insertTable',
      label: '⊞ Chèn bảng mới (3x3)',
      onClick: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    { type: 'divider' },
    {
      key: 'addColumnAfter',
      label: '＋ Thêm cột bên phải',
      disabled: !editor.can().addColumnAfter(),
      onClick: () => editor.chain().focus().addColumnAfter().run(),
    },
    {
      key: 'deleteColumn',
      label: '－ Xóa cột hiện tại',
      disabled: !editor.can().deleteColumn(),
      onClick: () => editor.chain().focus().deleteColumn().run(),
    },
    { type: 'divider' },
    {
      key: 'addRowAfter',
      label: '＋ Thêm dòng bên dưới',
      disabled: !editor.can().addRowAfter(),
      onClick: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      key: 'deleteRow',
      label: '－ Xóa dòng hiện tại',
      disabled: !editor.can().deleteRow(),
      onClick: () => editor.chain().focus().deleteRow().run(),
    },
    { type: 'divider' },
    {
      key: 'mergeCells',
      label: '⛶ Gộp / Tách ô (Merge/Split)',
      disabled: !editor.can().mergeOrSplit(),
      onClick: () => editor.chain().focus().mergeOrSplit().run(),
    },
    {
      key: 'deleteTable',
      danger: true,
      label: '🗑 Xóa toàn bộ bảng',
      disabled: !editor.can().deleteTable(),
      onClick: () => editor.chain().focus().deleteTable().run(),
    },
  ];

  return (
    <div className="border-b border-slate-200 p-2 bg-slate-50/90 backdrop-blur rounded-t-xl flex flex-wrap items-center gap-1.5 text-xs">
      {/* 1. Heading Type */}
      <Select
        size="small"
        value={currentHeading}
        onChange={handleHeadingChange}
        options={headingOptions}
        style={{ width: 175 }}
        className="rounded"
      />

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* 2. Text Formatting */}
      <Space orientation="horizontal" size={2}>
        <Tooltip title="In đậm (Ctrl+B)">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}
            icon={<BoldOutlined />}
          />
        </Tooltip>
        <Tooltip title="In nghiêng (Ctrl+I)">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}
            icon={<ItalicOutlined />}
          />
        </Tooltip>
        <Tooltip title="Gạch chân (Ctrl+U)">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}
            icon={<UnderlineOutlined />}
          />
        </Tooltip>
        <Tooltip title="Gạch ngang">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}
            icon={<StrikethroughOutlined />}
          />
        </Tooltip>
      </Space>

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* 3. Color & Highlight */}
      <Space orientation="horizontal" size={2}>
        <Dropdown menu={{ items: colorItems }} trigger={['click']}>
          <Tooltip title="Màu chữ">
            <Button
              type="text"
              size="small"
              className="text-slate-600 flex items-center"
              icon={<FontColorsOutlined />}
            />
          </Tooltip>
        </Dropdown>
        <Dropdown menu={{ items: highlightItems }} trigger={['click']}>
          <Tooltip title="Tô sáng (Highlight)">
            <Button
              type="text"
              size="small"
              className={editor.isActive('highlight') ? 'bg-amber-100 text-amber-900' : 'text-slate-600'}
              icon={<BgColorsOutlined />}
            />
          </Tooltip>
        </Dropdown>
      </Space>

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* 4. Text Alignment */}
      <Space orientation="horizontal" size={2}>
        <Tooltip title="Căn trái">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}
            icon={<AlignLeftOutlined />}
          />
        </Tooltip>
        <Tooltip title="Căn giữa">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}
            icon={<AlignCenterOutlined />}
          />
        </Tooltip>
        <Tooltip title="Căn phải">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}
            icon={<AlignRightOutlined />}
          />
        </Tooltip>
        <Tooltip title="Căn đều hai bên (Justify)">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}
          >
            ↔
          </Button>
        </Tooltip>
      </Space>

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* 5. Lists & Structure */}
      <Space orientation="horizontal" size={2}>
        <Tooltip title="Danh sách đầu dòng">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}
            icon={<UnorderedListOutlined />}
          />
        </Tooltip>
        <Tooltip title="Danh sách số">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}
            icon={<OrderedListOutlined />}
          />
        </Tooltip>
        <Tooltip title="Danh sách checklist nhiệm vụ">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive('taskList') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}
            icon={<CheckSquareOutlined />}
          />
        </Tooltip>
        <Tooltip title="Trích dẫn (Blockquote)">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600'}
          >
            "
          </Button>
        </Tooltip>
        <Tooltip title="Đường kẻ ngang">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="text-slate-600"
            icon={<MinusOutlined />}
          />
        </Tooltip>
      </Space>

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* 6. Tables */}
      <Dropdown menu={{ items: tableItems }} trigger={['click']}>
        <Tooltip title="Thao tác Bảng">
          <Button
            type="text"
            size="small"
            className={editor.isActive('table') ? 'bg-blue-100 text-blue-800' : 'text-slate-600'}
            icon={<TableOutlined />}
          >
            Bảng
          </Button>
        </Tooltip>
      </Dropdown>

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* 7. History */}
      <Space orientation="horizontal" size={2}>
        <Tooltip title="Hoàn tác (Ctrl+Z)">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="text-slate-600"
            icon={<UndoOutlined />}
          />
        </Tooltip>
        <Tooltip title="Làm lại (Ctrl+Y)">
          <Button
            type="text"
            size="small"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="text-slate-600"
            icon={<RedoOutlined />}
          />
        </Tooltip>
      </Space>
    </div>
  );
};

const TipTapEditor: React.FC<TipTapEditorProps> = ({ value = '', onChange, placeholder = 'Nhập nội dung...' }) => {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[160px] p-4 text-sm font-sans',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) setIsReady(true);
  }, [editor]);

  if (!isReady) {
    return (
      <div className="border border-slate-200 rounded-xl h-[200px] flex items-center justify-center bg-slate-50 text-slate-400">
        Đang tải trình soạn thảo...
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-[#ea9105] focus-within:border-[#ea9105] focus-within:ring-2 focus-within:ring-orange-100 transition-all duration-200 shadow-xs">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default TipTapEditor;
