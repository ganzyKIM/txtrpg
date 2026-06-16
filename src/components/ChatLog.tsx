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
  const headerHiddenRef = useRef(false);
  const suppressUntil = useRef(0);

  const lastTurnId = turns.at(-1)?.id ?? null;
  const lastTurnRole = turns.at(-1)?.role ?? null;

  /** 헤더 상태를 바꾸고, 그로 인한 레이아웃 리플로우 스크롤 이벤트를 잠시 무시한다 */
  function setHeader(hide: boolean) {
    if (headerHiddenRef.current === hide || !onScrollDir) return;
    headerHiddenRef.current = hide;
    suppressUntil.current = performance.now() + 220;
    onScrollDir(hide);
  }

  function handleScroll() {
    const box = boxRef.current;
    if (!box || !onScrollDir) return;
    const cur = box.scrollTop;
    const delta = cur - lastScrollTop.current;
    lastScrollTop.current = cur;

    // 헤더 토글이 일으킨 리플로우 스크롤 이벤트는 무시 (진동 방지)
    if (performance.now() < suppressUntil.current) return;

    // 바닥/천장 근처에서는 토글하지 않는다 — 헤더 높이 변화가 scrollTop을
    // 끌어당겨 열림⇄닫힘이 반복되는 진동을 원천 차단
    const distToBottom = box.scrollHeight - cur - box.clientHeight;
    if (distToBottom < 90) return;
    if (cur < 40) {
      setHeader(false);
      return;
    }
    if (delta > 6) setHeader(true); // 아래로 스크롤 → 숨김
    else if (delta < -6) setHeader(false); // 위로 스크롤 → 표시
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
