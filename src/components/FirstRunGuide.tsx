interface Props {
  onClose: () => void;
}

export default function FirstRunGuide({ onClose }: Props) {
  return (
    <div className="frg-overlay" onClick={onClose}>
      <div className="frg-card" onClick={(e) => e.stopPropagation()}>
        <button className="frg-close" onClick={onClose} aria-label="닫기">✕</button>

        <div className="frg-star">✦</div>
        <h2 className="frg-title">모험이 시작됩니다</h2>

        <ol className="frg-list">
          <li>
            <span className="frg-num">01</span>
            <div className="frg-body">
              <strong>이야기를 읽어보세요</strong>
              <p>
                AI가 오프닝 장면을 썼습니다.
                본문 마지막에는 다음에 할 수 있는 행동을{' '}
                <em>A · B · C</em> 선택지로 제안합니다.
              </p>
            </div>
          </li>
          <li>
            <span className="frg-num">02</span>
            <div className="frg-body">
              <strong>행동을 아래 입력칸에 적어 진행하세요</strong>
              <p>
                제안된 선택지를 고르거나, 원하는 행동을 자유롭게 직접 쓸 수 있습니다.
                입력한 내용을 바탕으로 이야기가 계속 이어집니다.
              </p>
            </div>
          </li>
          <li>
            <span className="frg-num">03</span>
            <div className="frg-body">
              <strong>장면을 이미지로 생성할 수 있어요</strong>
              <p>
                본문 텍스트를 드래그하면 해당 장면을 삽화로 만들 수 있습니다.
                단, 이미지 생성은 <em>크레딧을 상당히 소모</em>합니다.
              </p>
            </div>
          </li>
        </ol>

        <button className="frg-btn" onClick={onClose}>
          모험 시작 ▶
        </button>
      </div>
    </div>
  );
}
