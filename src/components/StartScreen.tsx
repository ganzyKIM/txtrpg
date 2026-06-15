import { useState } from 'react';

interface Props {
  busy: boolean;
  onLoadFile: () => void;
  onNewGame: (title: string, setup: string) => void;
}

const SETUP_PLACEHOLDER = `자유롭게 원하는 세계와 주인공을 설정하세요.

예시 ①  SF 우주 탐험
- 세계관: 인류가 은하계로 뻗어나간 2400년대. 각 행성마다 독자적인 문명이 발달했다.
- 주인공: 리아. 29세 여성 우주 정찰대원. 냉철하고 분석적이지만 동료에게는 따뜻하다.
- 시작 상황: 정체불명의 신호를 따라간 외딴 소행성에서 오래된 외계 유적을 발견한다.

예시 ②  현대 도시 스릴러
- 세계관: 겉으로는 평범한 현대 서울. 단, 인구의 1%는 초능력을 숨기고 살아간다.
- 주인공: 강민준. 35세 형사. 능력은 없지만 특유의 직감과 끈질김으로 사건을 해결한다.
- 시작 상황: 연쇄 실종 사건을 조사하다 피해자 모두 초능력자였다는 사실을 알게 된다.`;

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
