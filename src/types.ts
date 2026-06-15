export type TurnRole = 'user' | 'ai' | 'system';

export interface Turn {
  id: string;
  role: TurnRole;
  text: string;
  /** 이 턴에서 생성된 삽화 (base64 PNG, data: 접두사 제외) */
  images?: string[];
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
