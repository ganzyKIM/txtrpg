import { useState, type CSSProperties } from 'react';
import type { JourneyStats, SaveMeta } from '../save/cloudSave';
import { TEXT_TIERS } from '../config/models';
import StarfieldBackground, { type RGB, type Tint } from './StarfieldBackground';

interface Props {
  busy: boolean;
  saves: SaveMeta[];
  savesLoading: boolean;
  stats: JourneyStats | null;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
  onImportFile: () => void;
  onNewGame: (title: string, setup: string, tint?: RGB) => void;
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
  color: RGB;
  snippet: string;
}

const GENRES: Choice[] = [
  { label: '정통 판타지', icon: '⚔️', color: [214, 172, 82], snippet: '검과 마법이 살아 숨쉬는 중세 판타지 세계. 모험가와 왕국, 던전과 마물, 고대의 전설이 존재한다.' },
  { label: 'SF·우주', icon: '🚀', color: [92, 172, 255], snippet: '인류가 별과 별 사이를 오가는 먼 미래. 첨단 기술과 외계 문명, 거대한 우주선과 식민 행성이 펼쳐진다.' },
  { label: '현대 도시', icon: '🌆', color: [150, 122, 232], snippet: '겉으로는 평범한 현대 도시. 그러나 그 이면에는 숨겨진 비밀과 초자연적 존재가 도사린다.' },
  { label: '무협·동양', icon: '🐉', color: [72, 200, 150], snippet: '무공과 협객이 강호를 누비는 동양 무협 세계. 문파와 비급, 은원과 강호의 의리가 얽힌다.' },
  { label: '호러·미스터리', icon: '🕯️', color: [200, 64, 74], snippet: '한 치 앞을 알 수 없는 미스터리와 공포가 감도는 세계. 풀리지 않는 수수께끼와 보이지 않는 위협이 주인공을 옥죈다.' },
  { label: '학원·일상', icon: '🌸', color: [255, 150, 192], snippet: '청춘과 우정, 설렘이 가득한 학원·일상 무대. 평범한 하루 속에서 작지만 특별한 사건들이 벌어진다.' },
  { label: '사이버펑크', icon: '🌃', color: [240, 72, 200], snippet: '네온이 빗물에 번지는 거대 메가시티. 거대 기업과 해커, 의체와 전뇌가 뒤얽힌 하이테크 로우라이프의 세계.' },
  { label: '포스트 아포칼립스', icon: '☢️', color: [214, 122, 62], snippet: '문명이 무너진 폐허의 대지. 살아남은 자들이 자원을 두고 다투는 황폐하고 거친 종말 이후의 세계.' },
  { label: '스팀펑크', icon: '⚙️', color: [200, 150, 92], snippet: '증기와 톱니바퀴로 움직이는 빅토리아풍 세계. 비행선과 기계장치, 발명가들의 낭만이 가득하다.' },
  { label: '신화·전설', icon: '🏺', color: [182, 142, 255], snippet: '신과 영웅, 괴수가 살아 숨쉬는 신화의 시대. 운명의 실타래와 신탁, 거대한 전설이 펼쳐진다.' },
  { label: '해양·대항해', icon: '🌊', color: [60, 182, 222], snippet: '미지의 바다로 나아가는 대항해 시대. 해적과 보물, 폭풍과 전설의 섬이 수평선 너머에서 기다린다.' },
];

const PROTAGONISTS: Choice[] = [
  { label: '평범한 주인공', icon: '🙂', color: [184, 192, 212], snippet: '어디에나 있을 법한 평범한 인물이지만, 운명에 이끌려 비범한 사건에 휘말린다.' },
  { label: '숨은 능력자', icon: '✨', color: [255, 212, 92], snippet: '남들이 모르는 특별한 힘이나 재능을 지녔지만 그것을 숨기고 살아가는 인물.' },
  { label: '노련한 전문가', icon: '🎯', color: [120, 172, 255], snippet: '자신의 분야에서 잔뼈가 굵은 베테랑. 냉철하고 노련하지만 남모를 사연을 품고 있다.' },
  { label: '정체불명의 이방인', icon: '🌫️', color: [162, 162, 192], snippet: '과거나 기억이 베일에 싸인 인물. 자신이 누구인지조차 이야기를 따라 차차 밝혀나가야 한다.' },
  { label: '몰락한 귀족', icon: '👑', color: [212, 182, 122], snippet: '한때 모든 것을 누렸으나 모든 것을 잃은 인물. 자존심과 회한을 품고 재기를 꿈꾼다.' },
  { label: '천재 발명가', icon: '🔬', color: [92, 212, 212], snippet: '기상천외한 발상과 손재주를 지닌 인물. 호기심이 때로 사고를, 때로 기적을 부른다.' },
  { label: '떠도는 방랑자', icon: '🧭', color: [200, 172, 132], snippet: '한곳에 머물지 않고 길 위에서 살아가는 인물. 자유롭지만 마음 한구석엔 그리움이 있다.' },
  { label: '복수를 꿈꾸는 자', icon: '🗡️', color: [210, 82, 82], snippet: '잊지 못할 상처를 안고 복수를 벼르는 인물. 그 집념이 길을 밝히기도, 삼키기도 한다.' },
  { label: '선택받은 운명', icon: '🌟', color: [255, 230, 142], snippet: '예언이나 운명에 의해 특별한 사명을 짊어진 인물. 거대한 흐름의 중심에 서 있다.' },
  { label: '반항아·아웃사이더', icon: '🔥', color: [255, 132, 72], snippet: '규칙과 질서에 맞서는 반항적인 인물. 거칠지만 누구보다 뜨거운 신념을 품고 있다.' },
];

const MOODS: Choice[] = [
  { label: '밝고 유쾌한', icon: '☀️', color: [255, 206, 92], snippet: '밝고 유쾌하며 경쾌한 모험. 위기 속에서도 유머와 따뜻함을 잃지 않는다.' },
  { label: '진지한 서사', icon: '🏛️', color: [150, 172, 212], snippet: '진지하고 장대한 서사. 운명과 선택, 성장과 희생이 묵직하게 그려진다.' },
  { label: '어둡고 긴장감', icon: '🌑', color: [96, 106, 146], snippet: '어둡고 긴장감 넘치는 분위기. 한 치 앞을 알 수 없는 위험과 서스펜스가 감돈다.' },
  { label: '잔잔하고 감성적', icon: '🍃', color: [130, 212, 162], snippet: '잔잔하고 서정적인 분위기. 인물의 감정과 관계, 일상의 작은 순간들이 섬세하게 그려진다.' },
  { label: '로맨틱한', icon: '💞', color: [255, 150, 182], snippet: '설렘과 두근거림이 흐르는 로맨틱한 분위기. 인물 사이의 감정과 관계가 이야기의 중심이 된다.' },
  { label: '코믹·개그', icon: '🤡', color: [255, 182, 82], snippet: '엉뚱하고 유쾌한 코믹 분위기. 예상을 빗나가는 상황과 능청스러운 대사가 웃음을 자아낸다.' },
  { label: '장엄한 서사시', icon: '🎺', color: [212, 182, 122], snippet: '운명을 건 거대한 서사시. 영웅과 시대, 흥망성쇠가 웅장하게 펼쳐진다.' },
  { label: '미스터리·서스펜스', icon: '🔍', color: [142, 122, 202], snippet: '단서와 반전이 얽힌 미스터리. 진실을 향해 한 겹씩 벗겨내는 긴장감이 흐른다.' },
  { label: '몽환적·초현실', icon: '🌙', color: [172, 152, 255], snippet: '꿈과 현실의 경계가 흐릿한 몽환적 분위기. 비현실적이고 시적인 이미지가 가득하다.' },
  { label: '비장한·하드보일드', icon: '🥃', color: [182, 122, 102], snippet: '냉정하고 비정한 하드보일드 분위기. 건조한 문체와 묵직한 페이소스가 깔린다.' },
];

const GENDERS: Choice[] = [
  { label: '남성', icon: '♂', color: [92, 152, 255], snippet: '남성' },
  { label: '여성', icon: '♀', color: [255, 142, 182], snippet: '여성' },
  { label: '미상', icon: '⚧', color: [182, 152, 232], snippet: '성별은 자유롭게' },
];

const AGES: Choice[] = [
  { label: '소년·소녀', icon: '🌱', color: [122, 220, 142], snippet: '10대 소년·소녀' },
  { label: '청년', icon: '🔆', color: [92, 202, 232], snippet: '20대 청년' },
  { label: '중년', icon: '🌗', color: [222, 172, 92], snippet: '중년' },
  { label: '노년', icon: '🕯️', color: [202, 142, 112], snippet: '노년' },
  { label: '미상', icon: '❔', color: [172, 172, 192], snippet: '나이는 자유롭게' },
];

/** 카테고리별 번짐 발원점(0~1 비율) — 화면의 서로 다른 지점에서 색이 퍼진다 */
const ORIGIN = {
  genre: { fx: 0.22, fy: 0.26 },
  hero: { fx: 0.78, fy: 0.30 },
  mood: { fx: 0.5, fy: 0.74 },
  gender: { fx: 0.18, fy: 0.7 },
  age: { fx: 0.82, fy: 0.68 },
} as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 선택된 칩에 자기 색을 입히는 인라인 스타일 (CSS 우선순위와 무관하게 항상 적용) */
function chipStyle(c: Choice, active: boolean): CSSProperties {
  if (!active) return {};
  const [r, g, b] = c.color;
  const dr = Math.round(r * 0.62);
  const dg = Math.round(g * 0.62);
  const db = Math.round(b * 0.62);
  return {
    background: `linear-gradient(135deg, rgb(${r},${g},${b}), rgb(${dr},${dg},${db}))`,
    borderColor: `rgb(${r},${g},${b})`,
    color: '#fff',
    boxShadow: `0 4px 20px rgba(${r},${g},${b},0.55), 0 0 0 1px rgba(${r},${g},${b},0.6)`,
  };
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
  const [gender, setGender] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [extra, setExtra] = useState('');

  const hasJourney = !!stats && (stats.turns > 0 || stats.adventures > 0);

  const choiceReady =
    genre !== null && hero !== null && mood !== null && gender !== null && age !== null;

  // 현재 선택에 따른 배경 색 물감들
  const tints: Tint[] = [];
  if (genre !== null) tints.push({ key: 'genre', color: GENRES[genre].color, ...ORIGIN.genre });
  if (hero !== null) tints.push({ key: 'hero', color: PROTAGONISTS[hero].color, ...ORIGIN.hero });
  if (mood !== null) tints.push({ key: 'mood', color: MOODS[mood].color, ...ORIGIN.mood });
  if (gender !== null) tints.push({ key: 'gender', color: GENDERS[gender].color, ...ORIGIN.gender });
  if (age !== null) tints.push({ key: 'age', color: AGES[age].color, ...ORIGIN.age });

  /** 선택된 색들을 평균낸 웜홀용 톤 */
  function combinedTint(): RGB | undefined {
    if (tints.length === 0) return undefined;
    const sum = tints.reduce(
      (acc, t) => [acc[0] + t.color[0], acc[1] + t.color[1], acc[2] + t.color[2]] as RGB,
      [0, 0, 0] as RGB,
    );
    return [
      Math.round(sum[0] / tints.length),
      Math.round(sum[1] / tints.length),
      Math.round(sum[2] / tints.length),
    ];
  }

  function buildChoiceSetup(): string {
    const lines = [
      `- 세계관: ${GENRES[genre!].snippet}`,
      `- 주인공: ${GENDERS[gender!].snippet} / ${AGES[age!].snippet}. ${PROTAGONISTS[hero!].snippet}`,
      `- 분위기: ${MOODS[mood!].snippet}`,
    ];
    if (extra.trim()) lines.push(`- 추가 요청: ${extra.trim()}`);
    return lines.join('\n');
  }

  function handleStart() {
    if (setupMode === 'choice') {
      if (!choiceReady) return;
      const autoTitle = title.trim() || `${GENRES[genre!].label} 모험`;
      onNewGame(autoTitle, buildChoiceSetup(), combinedTint());
    } else {
      if (!setup.trim()) return;
      onNewGame(title.trim() || '새 모험', setup.trim());
    }
  }

  const startDisabled = busy || (setupMode === 'choice' ? !choiceReady : !setup.trim());

  const renderChips = (
    list: Choice[],
    selected: number | null,
    onPick: (i: number) => void,
  ) => (
    <div className="choice-chips">
      {list.map((c, i) => (
        <button
          key={i}
          className={selected === i ? 'choice-chip selected' : 'choice-chip'}
          style={chipStyle(c, selected === i)}
          onClick={() => onPick(i)}
        >
          <span className="chip-icon">{c.icon}</span>
          {c.label}
        </button>
      ))}
    </div>
  );

  return (
    <div id="start-screen">
      <StarfieldBackground tints={tints} />
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
            <p className="setup-hint">
              마음에 드는 칩을 골라보세요. 고를 때마다 우주에 그 색이 번져 나가요 🌌
            </p>

            <div className="choice-group">
              <span className="choice-label">🌍 세계관</span>
              {renderChips(GENRES, genre, setGenre)}
            </div>

            <div className="choice-group">
              <span className="choice-label">🧑 주인공</span>
              {renderChips(PROTAGONISTS, hero, setHero)}
            </div>

            <div className="choice-group choice-group-inline">
              <span className="choice-label">⚧ 성별</span>
              {renderChips(GENDERS, gender, setGender)}
            </div>

            <div className="choice-group choice-group-inline">
              <span className="choice-label">🎂 연령</span>
              {renderChips(AGES, age, setAge)}
            </div>

            <div className="choice-group">
              <span className="choice-label">🎭 분위기</span>
              {renderChips(MOODS, mood, setMood)}
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
          {busy
            ? '오프닝 장면 생성 중...'
            : setupMode === 'choice' && !choiceReady
              ? '모든 항목을 골라주세요'
              : '✦ 모험 시작'}
        </button>
      </div>
    </div>
  );
}
