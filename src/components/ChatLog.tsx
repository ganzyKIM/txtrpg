import { useEffect, useRef, useState } from 'react';
import type { Turn } from '../types';

interface ImgBtnState {
  top: number;
  left: number;
  turnId: string;
  text: string;
}

interface Props {
  turns: Turn[];
  busy: boolean;
  onGenerateImage: (turnId: string, selectedText: string) => void;
  onToggleExclude: (turnId: string) => void;
  onScrollDir?: (hideHeader: boolean) => void;
}

export default function ChatLog({ turns, busy, onGenerateImage, onToggleExclude, onScrollDir }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [imgBtn, setImgBtn] = useState<ImgBtnState | null>(null);
  const lastScrollTop = useRef(0);

  const lastTurnId = turns.at(-1)?.id ?? null;
  const lastTurnRole = turns.at(-1)?.role ?? null;

  function handleScroll() {
    const box = boxRef.current;
    if (!box || !onScrollDir) return;
    const cur = box.scrollTop;
    const delta = cur - lastScrollTop.current;
    // 위쪽 끝 근처에서는 항상 헤더를 보여준다
    if (cur < 40) onScrollDir(false);
    else if (delta > 6) onScrollDir(true); // 아래로 스크롤 → 숨김
    else if (delta < -6) onScrollDir(false); // 위로 스크롤 → 표시
    lastScrollTop.current = cur;
  }

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !lastTurnId) return;
    if (lastTurnRole === 'ai') {
      // 새 AI 응답의 첫 줄이 chatBox 상단에 오도록 스크롤
      const el = box.querySelector(`[data-turn-id="${lastTurnId}"]`) as HTMLElement | null;
      if (el) box.scrollTop = el.offsetTop;
    } else {
      // 유저 입력 전송 후에는 바닥으로 내려 로딩 상태가 보이도록
      box.scrollTop = box.scrollHeight;
    }
  }, [lastTurnId, lastTurnRole]);

  function handleMouseUp() {
    window.setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      const box = boxRef.current;
      if (!text || !sel || sel.rangeCount === 0 || !box) {
        setImgBtn(null);
        return;
      }
      // 선택 영역이 속한 AI 턴 찾기
      const anchor = sel.anchorNode;
      let el: HTMLElement | null =
        anchor instanceof HTMLElement ? anchor : anchor?.parentElement ?? null;
      while (el && !el.dataset.turnId) el = el.parentElement;
      if (!el || el.dataset.turnRole !== 'ai') {
        setImgBtn(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      setImgBtn({
        top: rect.top - boxRect.top + box.scrollTop - 38,
        left: Math.max(0, rect.left - boxRect.left),
        turnId: el.dataset.turnId!,
        text,
      });
    }, 30);
  }

  function handleGenerate() {
    if (!imgBtn) return;
    const { turnId, text } = imgBtn;
    setImgBtn(null);
    window.getSelection()?.removeAllRanges();
    onGenerateImage(turnId, text);
  }

  return (
    <div id="chatBox" ref={boxRef} onMouseUp={handleMouseUp} onScroll={handleScroll}>
      {turns.map((turn) => (
        <div
          key={turn.id}
          className={
            (turn.role === 'user' ? 'user-msg' : turn.role === 'ai' ? 'ai-msg' : 'system-msg') +
            (turn.excluded ? ' turn-excluded' : '')
          }
          data-turn-id={turn.id}
          data-turn-role={turn.role}
        >
          {turn.role !== 'system' && (
            <button
              className="turn-exclude-toggle"
              title={turn.excluded ? '저장에 다시 포함' : '이 턴을 저장에서 제외'}
              onClick={() => onToggleExclude(turn.id)}
            >
              {turn.excluded ? '↩ 저장에 포함' : '✕ 저장 제외'}
            </button>
          )}
          {turn.text}
          {turn.images?.map((img, i) => (
            <img
              key={i}
              className="generated-image"
              src={img.startsWith('http') || img.startsWith('data:') ? img : `data:image/png;base64,${img}`}
              alt="생성된 삽화"
            />
          ))}
        </div>
      ))}
      {imgBtn && !busy && (
        <button
          id="imgGenBtn"
          style={{ top: imgBtn.top, left: imgBtn.left }}
          onClick={handleGenerate}
        >
          🖼️ 이미지로 변환
        </button>
      )}
    </div>
  );
}
