import { useState } from 'react';
import type { JourneyStats, SaveMeta } from '../save/cloudSave';
import { TEXT_TIERS } from '../config/models';
import StarfieldBackground from './StarfieldBackground';

interface Props {
  busy: boolean;
  saves: SaveMeta[];
  savesLoading: boolean;
  stats: JourneyStats | null;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
  onImportFile: () => void;
  onNewGame: (title: string, setup: string) => void;
}

/** 큰 수를 1.2천 / 3.4만 형태로 다듬는다 */
function fmtCompact(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1).replace(/\.0$/, '')}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}천`;
  return n.toLocaleString();
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function StartScreen({
  busy,
  saves,
  savesLoading,
  stats,
  onContinue,
  onDelete,
  onImportFile,
  onNewGame,
}: Props) {
  const [title, setTitle] = useState('');
  const [setup, setSetup] = useState('');

  const hasJourney = !!stats && (stats.turns > 0 || stats.adventures > 0);

  return (
    <div id="start-screen">
      <StarfieldBackground />
      <h1>📜 텍스트 RPG</h1>
      <p className="subtitle">AI와 떠나는, 오직 나만의 이야기</p>

      {hasJourney && stats && (
        <div className="journey-dashboard">
          <p className="journey-headline">
            지금까지 <b>{stats.adventures}</b>개의 세계를 열고, <b>{stats.turns.toLocaleString()}</b>번의
            이야기를 이어왔어요 ✨
          </p>
          <div className="journey-stats">
            <div className="journey-stat">
              <span className="journey-icon">🌍</span>
              <span className="journey-num">{stats.adventures.toLocaleString()}</span>
              <span className="journey-cap">떠난 모험</span>
            </div>
            <div className="journey-stat">
              <span className="journey-icon">📖</span>
              <span className="journey-num">{stats.turns.toLocaleString()}</span>
              <span className="journey-cap">이야기 턴</span>
            </div>
            <div className="journey-stat">
              <span className="journey-icon">🖼️</span>
              <span className="journey-num">{stats.images.toLocaleString()}</span>
              <span className="journey-cap">그려낸 삽화</span>
            </div>
            <div className="journey-stat">
              <span className="journey-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
              </span>
              <span className="journey-num">{fmtCompact(stats.tokens)}</span>
              <span className="journey-cap">자아낸 단어</span>
            </div>
          </div>
          <p className="journey-foot">
            오늘은 또 어떤 이야기가 당신을 기다리고 있을까요?
          </p>
        </div>
      )}

      <div className="start-card guide-card">
        <h2>이용 안내</h2>
        <ul className="guide-list">
          <li>
            <b>🖼️ 장면을 이미지로</b> — 진행 중 마음에 드는 문장을 <b>드래그</b>하면
            나타나는 <b>'이미지로 변환'</b> 버튼으로 그 장면의 삽화를 생성할 수 있어요.
          </li>
          <li>
            <b>💬 두 가지 진행 방식</b> — 입력창 오른쪽 <b>서식 선택기</b>에서 고를 수 있어요.
            <b>일반 서술</b>은 소설처럼 이야기가 자연스럽게 이어지고,
            <b>객관식 전개</b>는 상황 묘사 후 A·B·C 선택지를 제시합니다.
          </li>
          <li>
            <b>⚙️ 모델 설정</b> — 상단 <b>[도구] 모델 설정</b>에서 AI 모델을 고를 수 있어요.
            <b>{TEXT_TIERS[0].label}</b>은 빠르고 저렴하며,
            <b>{TEXT_TIERS[1].label}</b>은 더 풍부한 묘사를 제공하지만 크레딧이 약 3배 소모돼요.
          </li>
        </ul>
      </div>

      <div className="start-card">
        <h2>이어하기</h2>
        {savesLoading ? (
          <p>저장 목록을 불러오는 중...</p>
        ) : saves.length === 0 ? (
          <p>저장된 모험이 없습니다. 아래에서 새 모험을 시작해 보세요.</p>
        ) : (
          <ul className="save-list">
            {saves.map((s) => (
              <li key={s.id} className="save-item">
                <button className="save-open" disabled={busy} onClick={() => onContinue(s.id)}>
                  <span className="save-title">{s.title}</span>
                  <span className="save-meta">{s.turnCount}턴 · {formatDate(s.updatedAt)}</span>
                </button>
                <button className="save-delete" disabled={busy} title="삭제" onClick={() => onDelete(s.id)}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M6 6l1 14h10l1-14" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="ghost-btn" disabled={busy} onClick={onImportFile}>
          📂 파일에서 가져오기 (.json / .txt)
        </button>
      </div>

      <div className="start-card">
        <h2>새 모험 시작</h2>
        <p>세계관과 주인공을 간단히 설명하면 AI가 오프닝 장면을 만들어 드립니다.</p>
        <input
          type="text"
          placeholder="모험 제목 (예: 은하의 끝에서)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          rows={9}
          placeholder={SETUP_PLACEHOLDER}
          value={setup}
          onChange={(e) => setSetup(e.target.value)}
        />
        <button
          className="btn-primary"
          disabled={busy || !setup.trim()}
          onClick={() => onNewGame(title.trim() || '새 모험', setup.trim())}
        >
          {busy ? '오프닝 장면 생성 중...' : '✦ 모험 시작'}
        </button>
      </div>
    </div>
  );
}
