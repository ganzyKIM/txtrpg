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

interface Choice {
  label: string;
  icon: string;
  snippet: string;
}

const GENRES: Choice[] = [
  { label: '정통 판타지', icon: '⚔️', snippet: '검과 마법이 살아 숨쉬는 중세 판타지 세계. 모험가와 왕국, 던전과 마물, 고대의 전설이 존재한다.' },
  { label: 'SF·우주', icon: '🚀', snippet: '인류가 별과 별 사이를 오가는 먼 미래. 첨단 기술과 외계 문명, 거대한 우주선과 식민 행성이 펼쳐진다.' },
  { label: '현대 도시', icon: '🌆', snippet: '겉으로는 평범한 현대 도시. 그러나 그 이면에는 숨겨진 비밀과 초자연적 존재가 도사린다.' },
  { label: '무협·동양', icon: '🐉', snippet: '무공과 협객이 강호를 누비는 동양 무협 세계. 문파와 비급, 은원과 강호의 의리가 얽힌다.' },
  { label: '호러·미스터리', icon: '🕯️', snippet: '한 치 앞을 알 수 없는 미스터리와 공포가 감도는 세계. 풀리지 않는 수수께끼와 보이지 않는 위협이 주인공을 옥죈다.' },
  { label: '학원·일상', icon: '🌸', snippet: '청춘과 우정, 설렘이 가득한 학원·일상 무대. 평범한 하루 속에서 작지만 특별한 사건들이 벌어진다.' },
];

const PROTAGONISTS: Choice[] = [
  { label: '평범한 주인공', icon: '🙂', snippet: '어디에나 있을 법한 평범한 인물이지만, 운명에 이끌려 비범한 사건에 휘말린다.' },
  { label: '숨은 능력자', icon: '✨', snippet: '남들이 모르는 특별한 힘이나 재능을 지녔지만 그것을 숨기고 살아가는 인물.' },
  { label: '노련한 전문가', icon: '🎯', snippet: '자신의 분야에서 잔뼈가 굵은 베테랑. 냉철하고 노련하지만 남모를 사연을 품고 있다.' },
  { label: '정체불명의 이방인', icon: '🌫️', snippet: '과거나 기억이 베일에 싸인 인물. 자신이 누구인지조차 이야기를 따라 차차 밝혀나가야 한다.' },
];

const MOODS: Choice[] = [
  { label: '밝고 유쾌한', icon: '☀️', snippet: '밝고 유쾌하며 경쾌한 모험. 위기 속에서도 유머와 따뜻함을 잃지 않는다.' },
  { label: '진지한 서사', icon: '🏛️', snippet: '진지하고 장대한 서사. 운명과 선택, 성장과 희생이 묵직하게 그려진다.' },
  { label: '어둡고 긴장감', icon: '🌑', snippet: '어둡고 긴장감 넘치는 분위기. 한 치 앞을 알 수 없는 위험과 서스펜스가 감돈다.' },
  { label: '잔잔하고 감성적', icon: '🍃', snippet: '잔잔하고 서정적인 분위기. 인물의 감정과 관계, 일상의 작은 순간들이 섬세하게 그려진다.' },
];

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
  const [setupMode, setSetupMode] = useState<'choice' | 'free'>('choice');
  const [genre, setGenre] = useState<number | null>(null);
  const [hero, setHero] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [extra, setExtra] = useState('');

  const hasJourney = !!stats && (stats.turns > 0 || stats.adventures > 0);

  const choiceReady = genre !== null && hero !== null && mood !== null;

  function buildChoiceSetup(): string {
    const lines = [
      `- 세계관: ${GENRES[genre!].snippet}`,
      `- 주인공: ${PROTAGONISTS[hero!].snippet}`,
      `- 분위기: ${MOODS[mood!].snippet}`,
    ];
    if (extra.trim()) lines.push(`- 추가 요청: ${extra.trim()}`);
    return lines.join('\n');
  }

  function handleStart() {
    if (setupMode === 'choice') {
      if (!choiceReady) return;
      const autoTitle = title.trim() || `${GENRES[genre!].label} 모험`;
      onNewGame(autoTitle, buildChoiceSetup());
    } else {
      if (!setup.trim()) return;
      onNewGame(title.trim() || '새 모험', setup.trim());
    }
  }

  const startDisabled = busy || (setupMode === 'choice' ? !choiceReady : !setup.trim());

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
        <div className="setup-mode-tabs">
          <button
            className={setupMode === 'choice' ? 'setup-tab active' : 'setup-tab'}
            onClick={() => setSetupMode('choice')}
          >
            간편 선택
          </button>
          <button
            className={setupMode === 'free' ? 'setup-tab active' : 'setup-tab'}
            onClick={() => setSetupMode('free')}
          >
            직접 작성
          </button>
        </div>

        {setupMode === 'choice' ? (
          <>
            <p className="setup-hint">몇 가지만 고르면 AI가 나머지 이야기를 만들어 드려요.</p>

            <div className="choice-group">
              <span className="choice-label">🌍 세계관</span>
              <div className="choice-chips">
                {GENRES.map((c, i) => (
                  <button
                    key={i}
                    className={genre === i ? 'choice-chip selected' : 'choice-chip'}
                    onClick={() => setGenre(i)}
                  >
                    <span className="chip-icon">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="choice-group">
              <span className="choice-label">🧑 주인공</span>
              <div className="choice-chips">
                {PROTAGONISTS.map((c, i) => (
                  <button
                    key={i}
                    className={hero === i ? 'choice-chip selected' : 'choice-chip'}
                    onClick={() => setHero(i)}
                  >
                    <span className="chip-icon">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="choice-group">
              <span className="choice-label">🎭 분위기</span>
              <div className="choice-chips">
                {MOODS.map((c, i) => (
                  <button
                    key={i}
                    className={mood === i ? 'choice-chip selected' : 'choice-chip'}
                    onClick={() => setMood(i)}
                  >
                    <span className="chip-icon">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="모험 제목 (선택 - 비우면 자동 생성)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              rows={2}
              placeholder="원하는 디테일이 있다면 자유롭게 적어주세요 (선택). 예: 주인공 이름은 '리안', 비 내리는 밤에 시작"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </>
        ) : (
          <>
            <p className="setup-hint">세계관과 주인공을 직접 자유롭게 설정하세요.</p>
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
          </>
        )}

        <button className="btn-primary" disabled={startDisabled} onClick={handleStart}>
          {busy ? '오프닝 장면 생성 중...' : '✦ 모험 시작'}
        </button>
      </div>
    </div>
  );
}
