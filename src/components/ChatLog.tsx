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
}

export default function ChatLog({ turns, busy, onGenerateImage }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [imgBtn, setImgBtn] = useState<ImgBtnState | null>(null);

  const lastTurnId = turns.at(-1)?.id ?? null;
  const lastTurnRole = turns.at(-1)?.role ?? null;

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
    <div id="chatBox" ref={boxRef} onMouseUp={handleMouseUp}>
      {turns.map((turn) => (
        <div
          key={turn.id}
          className={
            turn.role === 'user' ? 'user-msg' : turn.role === 'ai' ? 'ai-msg' : 'system-msg'
          }
          data-turn-id={turn.id}
          data-turn-role={turn.role}
        >
          {turn.text}
          {turn.images?.map((b64, i) => (
            <img
              key={i}
              className="generated-image"
              src={`data:image/png;base64,${b64}`}
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
