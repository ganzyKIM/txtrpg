import { useRef, useState } from 'react';
import type { ReplyMode } from '../types';

interface Props {
  busyMessage: string | null;
  mode: ReplyMode;
  onModeChange: (mode: ReplyMode) => void;
  onSend: (text: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function InputBar({
  busyMessage,
  mode,
  onModeChange,
  onSend,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }

  function send() {
    const trimmed = text.trim();
    if (!trimmed || busyMessage) return;
    setText('');
    if (taRef.current) taRef.current.style.height = 'auto';
    onSend(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div id="input-area">
      <textarea
        ref={taRef}
        className="chat-input"
        rows={2}
        placeholder="문서 내용을 이어서 작성하고 Enter키를 누르세요... (줄바꿈은 Shift+Enter)"
        value={text}
        disabled={!!busyMessage}
        onChange={(e) => {
          setText(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
      />
      <div id="status-bar">
        <div>
          {canUndo && (
            <button className="btn-action btn-undo" onClick={onUndo}>
              ↶ 지우기 (Undo)
            </button>
          )}
          {canRedo && (
            <button className="btn-action btn-redo" onClick={onRedo}>
              ↷ 되살리기 (Redo)
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          {busyMessage && (
            <div id="loading-container">
              <div className="loading-bar" />
              <span>{busyMessage}</span>
            </div>
          )}
          <div style={{ marginLeft: 10 }}>
            서식:{' '}
            <select
              className="mode-select"
              value={mode}
              onChange={(e) => onModeChange(e.target.value as ReplyMode)}
            >
              <option value="textOnly">일반 서술</option>
              <option value="choice">객관식 전개</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
