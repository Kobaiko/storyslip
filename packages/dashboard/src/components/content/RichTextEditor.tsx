import React, { useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  Image, 
  List, 
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Eye,
  Edit3
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal, useModal } from '../ui/Modal';
import { Input } from '../ui/Form';
import { useToast } from '../ui/Toast';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, text: string) => void;
  initialText?: string;
}

function LinkModal({ isOpen, onClose, onInsert, initialText = '' }: LinkModalProps) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState(initialText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && text) {
      onInsert(url, text);
      setUrl('');
      setText('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Insert Link" size="sm">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Link Text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter link text"
          required
        />
        <Input
          label="URL"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
        />
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Insert Link</Button>
        </div>
      </form>
    </Modal>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  height = '400px',
  onImageUpload,
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkModal = useModal();
  const { success, error: showError } = useToast();

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          executeCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            executeCommand('redo');
          } else {
            executeCommand('undo');
          }
          break;
      }
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    try {
      const imageUrl = await onImageUpload(file);
      executeCommand('insertImage', imageUrl);
      success('Image uploaded successfully');
    } catch (error) {
      showError('Failed to upload image');
    }
  };

  const insertLink = (url: string, text: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const link = document.createElement('a');
      link.href = url;
      link.textContent = text;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      range.insertNode(link);
      selection.removeAllRanges();
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const getSelectedText = () => {
    const selection = window.getSelection();
    return selection ? selection.toString() : '';
  };

  const toolbarButtons = [
    { icon: Undo, command: 'undo', title: 'Undo (Ctrl+Z)' },
    { icon: Redo, command: 'redo', title: 'Redo (Ctrl+Shift+Z)' },
    { type: 'separator' },
    { icon: Heading1, command: 'formatBlock', value: 'h1', title: 'Heading 1' },
    { icon: Heading2, command: 'formatBlock', value: 'h2', title: 'Heading 2' },
    { icon: Heading3, command: 'formatBlock', value: 'h3', title: 'Heading 3' },
    { type: 'separator' },
    { icon: Bold, command: 'bold', title: 'Bold (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Italic (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Underline (Ctrl+U)' },
    { type: 'separator' },
    { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
    { type: 'separator' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Quote' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code Block' },
    { type: 'separator' },
    { icon: Link, action: 'link', title: 'Insert Link' },
    { icon: Image, action: 'image', title: 'Insert Image' },
  ];

  const handleToolbarAction = (button: any) => {
    if (button.action === 'link') {
      linkModal.open();
    } else if (button.action === 'image') {
      fileInputRef.current?.click();
    } else {
      executeCommand(button.command, button.value);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-300">
        <div className="flex items-center space-x-1">
          {toolbarButtons.map((button, index) => {
            if (button.type === 'separator') {
              return <div key={index} className="w-px h-6 bg-gray-300 mx-1" />;
            }

            const Icon = button.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => handleToolbarAction(button)}
                title={button.title}
                className="p-1.5"
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="p-1.5"
          >
            {isPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="ml-1 text-xs">
              {isPreview ? 'Edit' : 'Preview'}
            </span>
          </Button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div style={{ height }}>
        {isPreview ? (
          <div 
            className="p-4 prose prose-sm max-w-none overflow-y-auto h-full"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            className="p-4 outline-none overflow-y-auto h-full"
            style={{ minHeight: height }}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            dangerouslySetInnerHTML={{ __html: value }}
            data-placeholder={placeholder}
          />
        )}
      </div>

      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Link Modal */}
      <LinkModal
        isOpen={linkModal.isOpen}
        onClose={linkModal.close}
        onInsert={insertLink}
        initialText={getSelectedText()}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
        
        .prose h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 1rem 0;
        }
        
        .prose h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.75rem 0;
        }
        
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }
        
        .prose p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        
        .prose ul, .prose ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .prose blockquote {
          border-left: 4px solid #E5E7EB;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6B7280;
        }
        
        .prose pre {
          background-color: #F3F4F6;
          padding: 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .prose a {
          color: #3B82F6;
          text-decoration: underline;
        }
        
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}