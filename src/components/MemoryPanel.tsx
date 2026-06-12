import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  fixedMemory: string;
  rollingSummary: string;
  onSave: (fixedMemory: string, rollingSummary: string) => void;
  onClose: () => void;
}

export default function MemoryPanel({
  open,
  fixedMemory,
  rollingSummary,
  onSave,
  onClose,
}: Props) {
  const [fixed, setFixed] = useState(fixedMemory);
  const [summary, setSummary] = useState(rollingSummary);

  useEffect(() => {
    if (open) {
      setFixed(fixedMemory);
      setSummary(rollingSummary);
    }
  }, [open, fixedMemory, rollingSummary]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 650 }} onClick={(e) => e.stopPropagation()}>
        <h3>기억 관리</h3>
        <p style={{ fontSize: 12, color: '#5f6368', marginTop: 0 }}>
          AI가 매 턴 참조하는 기억입니다. 잘못 기록된 설정이 있다면 직접 수정하세요.
        </p>

        <label>고정 메모리 (장기 기억 — 인물/지역/설정/주요 이벤트):</label>
        <textarea rows={14} value={fixed} onChange={(e) => setFixed(e.target.value)} />

        <label>줄거리 요약 (중기 기억 — 자동 갱신됨):</label>
        <textarea rows={7} value={summary} onChange={(e) => setSummary(e.target.value)} />

        <div className="modal-buttons">
          <button className="secondary" onClick={onClose}>
            취소
          </button>
          <button
            onClick={() => {
              onSave(fixed, summary);
              onClose();
            }}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
