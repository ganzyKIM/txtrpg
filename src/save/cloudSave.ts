import { supabase } from '../lib/supabase';
import type { Json } from '../lib/database.types';
import type { GameState, Turn } from '../types';

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
export async function createSave(userId: string, game: GameState): Promise<string> {
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
export async function updateSave(id: string, game: GameState): Promise<void> {
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
