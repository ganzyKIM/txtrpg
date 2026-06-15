export type TurnRole = 'user' | 'ai' | 'system';

export interface Turn {
  id: string;
  role: TurnRole;
  text: string;
  /** 이 턴에서 생성된 삽화 (base64 PNG, data: 접두사 제외) */
  images?: string[];
  /** true면 저장(DB/파일)과 AI 문맥에서 제외. 화면에는 흐리게 표시 */
  excluded?: boolean;
}

export interface GameState {
  title: string;
  /** 1계층: 고정 메모리 (인물/지역/고유명사/주요 이벤트) — 항상 시스템 인스트럭션으로 전송 */
  fixedMemory: string;
  /** 2계층: 롤링 요약 — 최근 윈도우에서 밀려난 턴들의 압축 기억 */
  rollingSummary: string;
  /** 3계층: 턴 원문. turns[0..summarizedTurnCount)는 이미 rollingSummary에 반영됨 */
  turns: Turn[];
  summarizedTurnCount: number;
  /** 레거시 txt 임포트 시 전체 진행 기록 보존용. API로는 절대 전송하지 않음 */
  archive: string;
}

/** 유저가 고르는 텍스트 모델 등급 (실제 모델 ID/단가는 서버가 매핑) */
export type TextTier = 'standard' | 'pro';

export interface Settings {
  textTier: TextTier;
}

export type ReplyMode = 'textOnly' | 'choice';

export function newTurn(role: TurnRole, text: string, images?: string[]): Turn {
  return { id: crypto.randomUUID(), role, text, images };
}

/**
 * 저장 직전 호출: excluded 턴을 제거한 게임 상태를 반환한다.
 * summarizedTurnCount(요약 경계 인덱스)도 경계 앞에서 제거된 만큼 보정한다.
 * 제외 턴이 없으면 원본을 그대로 돌려준다.
 */
export function stripExcludedTurns(game: GameState): GameState {
  if (!game.turns.some((t) => t.excluded)) return game;
  let removedBeforeBoundary = 0;
  const turns = game.turns.filter((t, i) => {
    if (t.excluded) {
      if (i < game.summarizedTurnCount) removedBeforeBoundary += 1;
      return false;
    }
    return true;
  });
  return {
    ...game,
    turns,
    summarizedTurnCount: game.summarizedTurnCount - removedBeforeBoundary,
  };
}

export function emptyGame(title: string, fixedMemory = ''): GameState {
  return {
    title,
    fixedMemory,
    rollingSummary: '',
    turns: [],
    summarizedTurnCount: 0,
    archive: '',
  };
}
