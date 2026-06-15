import { supabase } from '../lib/supabase';
import type { Json } from '../lib/database.types';
import { stripExcludedTurns, type GameState, type Turn } from '../types';

const BUCKET = 'game-images';

export interface SaveMeta {
  id: string;
  title: string;
  updatedAt: string;
  turnCount: number;
}

/** 유저의 모든 세이브 슬롯 목록 (최근 수정순) */
export async function listSaves(): Promise<SaveMeta[]> {
  const { data, error } = await supabase
    .from('saves')
    .select('id, title, updated_at, turn_count')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    turnCount: r.turn_count,
  }));
}

export interface JourneyStats {
  adventures: number; // 만든 모험(세이브) 수
  turns: number; // 누적 이야기 턴 수
  spentCredits: number; // 누적 소비 크레딧
  images: number; // 그려낸 삽화 수
  tokens: number; // 누적 토큰 수 (입력+출력)
}

/**
 * 유저의 누적 여정 통계. saves(턴 합계)와 credit_ledger(소비/토큰)를 집계한다.
 * credit_ledger는 RLS로 본인 행만 읽힌다.
 */
export async function getJourneyStats(saves: SaveMeta[]): Promise<JourneyStats> {
  const adventures = saves.length;
  const turns = saves.reduce((sum, s) => sum + (s.turnCount || 0), 0);

  const { data, error } = await supabase
    .from('credit_ledger')
    .select('delta, type, meta')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  let spentCredits = 0;
  let images = 0;
  let tokens = 0;
  for (const row of data ?? []) {
    if (row.type === 'spend_text' || row.type === 'spend_image') {
      spentCredits += Math.abs(row.delta);
    }
    if (row.type === 'spend_image') images += 1;
    const meta = row.meta as { in?: number; out?: number } | null;
    if (meta && typeof meta === 'object') {
      tokens += (meta.in ?? 0) + (meta.out ?? 0);
    }
  }

  return { adventures, turns, spentCredits, images, tokens };
}

export async function loadSave(id: string): Promise<GameState> {
  const { data, error } = await supabase.from('saves').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return {
    title: data.title,
    fixedMemory: data.fixed_memory ?? '',
    rollingSummary: data.rolling_summary ?? '',
    turns: (data.turns as unknown as Turn[]) ?? [],
    summarizedTurnCount: data.summarized_turn_count ?? 0,
    archive: data.archive ?? '',
  };
}

/** 새 세이브 행 생성 → 생성된 id 반환 */
export async function createSave(userId: string, rawGame: GameState): Promise<string> {
  const game = stripExcludedTurns(rawGame);
  const { data, error } = await supabase
    .from('saves')
    .insert({
      user_id: userId,
      title: game.title || '새 모험',
      fixed_memory: game.fixedMemory,
      rolling_summary: game.rollingSummary,
      summarized_turn_count: game.summarizedTurnCount,
      turns: game.turns as unknown as Json,
      archive: game.archive,
      turn_count: game.turns.length,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** 기존 세이브 덮어쓰기 (자동저장) */
export async function updateSave(id: string, rawGame: GameState): Promise<void> {
  const game = stripExcludedTurns(rawGame);
  const { error } = await supabase
    .from('saves')
    .update({
      title: game.title || '새 모험',
      fixed_memory: game.fixedMemory,
      rolling_summary: game.rollingSummary,
      summarized_turn_count: game.summarizedTurnCount,
      turns: game.turns as unknown as Json,
      archive: game.archive,
      turn_count: game.turns.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSave(id: string): Promise<void> {
  const { error } = await supabase.from('saves').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** base64 PNG을 Storage에 올리고 공개 URL을 반환 */
export async function uploadImage(
  userId: string,
  saveId: string,
  base64: string,
): Promise<string> {
  const path = `${userId}/${saveId}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, base64ToBytes(base64), { contentType: 'image/png' });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
