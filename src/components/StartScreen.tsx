import { useState } from 'react';

interface Props {
  busy: boolean;
  onLoadFile: () => void;
  onNewGame: (title: string, setup: string) => void;
}

const SETUP_PLACEHOLDER = `예시:
- 세계관: 중세 판타지 대륙 알데리온. 마법과 검이 공존하는 세계.
- 주인공: 김동훈. 힘 강화 마법을 쓰는 전사형 마법사 용병. 돈과 효율을 중시하지만 정의감도 있음.
- 시작 상황: 국경 도시의 여관에서 수상한 의뢰를 받는다.`;

export default function StartScreen({ busy, onLoadFile, onNewGame }: Props) {
  const [title, setTitle] = useState('');
  const [setup, setSetup] = useState('');

  return (
    <div id="start-screen">
      <h1>📜 텍스트 RPG</h1>

      <div className="start-card">
        <h2>이어하기</h2>
        <p>
          세이브 파일(.rpgsave.json)이나 기존 텍스트 세이브(.txt)를 불러와 모험을 이어갑니다.
        </p>
        <button onClick={onLoadFile} disabled={busy}>
          세이브 파일 불러오기
        </button>
      </div>

      <div className="start-card">
        <h2>새 모험 시작</h2>
        <p>세계관과 주인공을 간단히 적으면 AI가 오프닝 장면을 만들어 줍니다.</p>
        <input
          type="text"
          placeholder="모험 제목 (저장 파일명으로 사용됩니다)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          rows={8}
          placeholder={SETUP_PLACEHOLDER}
          value={setup}
          onChange={(e) => setSetup(e.target.value)}
        />
        <button
          disabled={busy || !setup.trim()}
          onClick={() => onNewGame(title.trim() || '새 모험', setup.trim())}
        >
          {busy ? '오프닝 생성 중...' : '모험 시작'}
        </button>
      </div>
    </div>
  );
}
