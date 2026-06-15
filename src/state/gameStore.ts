import type { GameState, Turn } from '../types';
import type { MemoryUpdate } from '../memory/memory';

const MAX_PAST = 30;

export interface StoreState {
  game: GameState | null;
  past: GameState[];
  future: GameState[];
  /** 마지막 저장 이후 변경 여부 (beforeunload 경고용) */
  dirty: boolean;
}

export const initialStore: StoreState = {
  game: null,
  past: [],
  future: [],
  dirty: false,
};

export type StoreAction =
  | { type: 'load'; game: GameState }
  | { type: 'reset' }
  // 한 교환(유저 입력)의 시작: 스냅샷을 남기고 유저 턴 추가
  | { type: 'beginExchange'; turn: Turn }
  // AI 응답 턴 추가 (스냅샷 없음 — undo 시 교환 전체가 되돌려짐)
  | { type: 'addAiTurn'; turn: Turn }
  // API 실패 시 직전 스냅샷으로 복원 (redo 스택에 넣지 않음)
  | { type: 'rollbackExchange' }
  | { type: 'attachImage'; turnId: string; image: string }
  | { type: 'toggleExclude'; turnId: string }
  | { type: 'memoryUpdate'; update: MemoryUpdate }
  | { type: 'editMemory'; fixedMemory: string; rollingSummary: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'markSaved' };

function pushPast(past: GameState[], snapshot: GameState): GameState[] {
  const next = [...past, snapshot];
  return next.length > MAX_PAST ? next.slice(next.length - MAX_PAST) : next;
}

export function storeReducer(state: StoreState, action: StoreAction): StoreState {
  const { game } = state;

  switch (action.type) {
    case 'load':
      return { game: action.game, past: [], future: [], dirty: false };

    case 'reset':
      return initialStore;

    case 'beginExchange': {
      if (!game) return state;
      return {
        game: { ...game, turns: [...game.turns, action.turn] },
        past: pushPast(state.past, game),
        future: [],
        dirty: true,
      };
    }

    case 'addAiTurn': {
      if (!game) return state;
      return { ...state, game: { ...game, turns: [...game.turns, action.turn] }, dirty: true };
    }

    case 'rollbackExchange': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return { ...state, game: prev, past: state.past.slice(0, -1) };
    }

    case 'attachImage': {
      if (!game) return state;
      const turns = game.turns.map((t) =>
        t.id === action.turnId ? { ...t, images: [...(t.images ?? []), action.image] } : t,
      );
      return {
        game: { ...game, turns },
        past: pushPast(state.past, game),
        future: [],
        dirty: true,
      };
    }

    case 'toggleExclude': {
      if (!game) return state;
      const turns = game.turns.map((t) =>
        t.id === action.turnId ? { ...t, excluded: t.excluded ? undefined : true } : t,
      );
      return {
        game: { ...game, turns },
        past: pushPast(state.past, game),
        future: [],
        dirty: true,
      };
    }

    case 'memoryUpdate': {
      if (!game) return state;
      const u = action.update;
      // 백그라운드 갱신 도중 undo 등으로 턴이 줄었으면 무시 (정합성 보호)
      if (u.summarizedTurnCount !== undefined && u.summarizedTurnCount > game.turns.length) {
        return state;
      }
      return {
        ...state,
        game: {
          ...game,
          rollingSummary: u.rollingSummary ?? game.rollingSummary,
          summarizedTurnCount: u.summarizedTurnCount ?? game.summarizedTurnCount,
          fixedMemory: u.fixedMemory ?? game.fixedMemory,
        },
        dirty: true,
      };
    }

    case 'editMemory': {
      if (!game) return state;
      return {
        ...state,
        game: { ...game, fixedMemory: action.fixedMemory, rollingSummary: action.rollingSummary },
        dirty: true,
      };
    }

    case 'undo': {
      if (!game || state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        game: prev,
        past: state.past.slice(0, -1),
        future: [game, ...state.future],
        dirty: true,
      };
    }

    case 'redo': {
      if (!game || state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        game: next,
        past: pushPast(state.past, game),
        future: rest,
        dirty: true,
      };
    }

    case 'markSaved':
      return { ...state, dirty: false };

    default:
      return state;
  }
}
