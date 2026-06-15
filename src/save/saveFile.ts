import type { GameState, Settings, TextTier, Turn } from '../types';
import { newTurn, stripExcludedTurns } from '../types';

const SAVE_VERSION = 1 as const;

export interface SaveFileData {
  version: typeof SAVE_VERSION;
  savedAt: string;
  title: string;
  fixedMemory: string;
  rollingSummary: string;
  turns: Turn[];
  summarizedTurnCount: number;
  archive: string;
  settings?: { textTier?: TextTier };
}

export interface ParsedSave {
  game: GameState;
  settings?: { textTier?: TextTier };
}

export function serializeSave(
  rawGame: GameState,
  settings: Settings,
  includeImages: boolean,
): string {
  const game = stripExcludedTurns(rawGame);
  const data: SaveFileData = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    title: game.title,
    fixedMemory: game.fixedMemory,
    rollingSummary: game.rollingSummary,
    turns: includeImages
      ? game.turns
      : game.turns.map(({ images: _images, ...rest }) => rest),
    summarizedTurnCount: game.summarizedTurnCount,
    archive: game.archive,
    settings: { textTier: settings.textTier },
  };
  return JSON.stringify(data, null, 1);
}

/** JSON 세이브 / 레거시 txt 모두 자동 감지하여 파싱 */
export function parseSave(content: string): ParsedSave {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed) as SaveFileData;
    if (!Array.isArray(data.turns)) throw new Error('세이브 파일 형식이 올바르지 않습니다.');
    return {
      game: {
        title: data.title ?? '모험',
        fixedMemory: data.fixedMemory ?? '',
        rollingSummary: data.rollingSummary ?? '',
        turns: data.turns,
        summarizedTurnCount: Math.min(data.summarizedTurnCount ?? 0, data.turns.length),
        archive: data.archive ?? '',
      },
      settings: data.settings,
    };
  }
  return { game: importLegacyTxt(content) };
}

/**
 * 레거시 [고정 메모리]/[진행 기록] txt 임포트.
 * 전체 기록은 archive에 보존하고, 마지막 5000자만 최근 컨텍스트 턴으로 사용한다 (기존 동작과 동일).
 */
export function importLegacyTxt(content: string): GameState {
  let fixedMemory = '';
  let record = content;

  if (content.includes('[고정 메모리]') && content.includes('[진행 기록]')) {
    const parts = content.split('[진행 기록]');
    fixedMemory = parts[0].replace('[고정 메모리]', '').trim();
    record = parts.slice(1).join('[진행 기록]').trim();
  }

  let tail = record;
  if (record.length > 5000) {
    const sliceStart = record.length - 5000;
    const nextNewline = record.indexOf('\n', sliceStart);
    tail = record.substring(nextNewline !== -1 ? nextNewline : sliceStart).trim();
  }

  const turns: Turn[] = [];
  if (tail) {
    turns.push(newTurn('system', '(이전 진행 내용은 요약 및 아카이브로 보존되었습니다)'));
    turns.push(newTurn('ai', tail));
  }

  return {
    title: '불러온 모험',
    fixedMemory,
    rollingSummary: '',
    turns,
    summarizedTurnCount: 0,
    archive: record,
  };
}

/** 레거시 호환 txt로 내보내기 (소설처럼 읽기/공유용, 기존 포맷으로 재임포트 가능) */
export function exportPlainTxt(game: GameState): string {
  const recordParts: string[] = [];
  if (game.archive.trim()) recordParts.push(game.archive.trim());
  for (const t of game.turns) {
    if (t.role === 'system' || t.excluded) continue;
    recordParts.push(t.text);
  }
  return `[고정 메모리]\n${game.fixedMemory.trim()}\n\n\n[진행 기록]\n${recordParts.join('\n\n')}`;
}

// ---------- 파일 입출력 (File System Access API + 다운로드 폴백) ----------

type FileHandle = {
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  name: string;
};

let currentHandle: FileHandle | null = null;

export function hasFileHandle(): boolean {
  return currentHandle !== null;
}

export function currentFileName(): string | null {
  return currentHandle?.name ?? null;
}

export function resetFileHandle(): void {
  currentHandle = null;
}

function supportsFsAccess(): boolean {
  return 'showSaveFilePicker' in window;
}

/** 단순 다운로드 (txt 내보내기 등 핸들과 무관한 저장용) */
export function downloadText(content: string, fileName: string): void {
  downloadBlob(content, fileName);
}

function downloadBlob(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * 저장. FS Access 지원 브라우저(Chrome/Edge)는 같은 파일에 덮어쓰기,
 * 미지원이면 다운로드 폴백. 반환값: 실제 저장된 파일명 (취소 시 null)
 */
export async function saveToFile(
  content: string,
  suggestedName: string,
  forceNewFile = false,
): Promise<string | null> {
  if (!supportsFsAccess()) {
    downloadBlob(content, suggestedName);
    return suggestedName;
  }
  try {
    if (!currentHandle || forceNewFile) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentHandle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'RPG 세이브 파일',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
    }
    const writable = await currentHandle!.createWritable();
    await writable.write(content);
    await writable.close();
    return currentHandle!.name;
  } catch (err) {
    if ((err as DOMException).name === 'AbortError') return null;
    throw err;
  }
}

/** 파일 열기. FS Access 지원 시 핸들을 유지해 이후 덮어쓰기 저장 가능 */
export async function openSaveFile(): Promise<{ content: string; name: string } | null> {
  if (supportsFsAccess() && 'showOpenFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: '세이브 파일 (json/txt)',
            accept: { 'application/octet-stream': ['.json', '.txt'] },
          },
        ],
      });
      const file: File = await handle.getFile();
      const content = await file.text();
      // txt(레거시)는 덮어쓰기 대상이 아니므로 json일 때만 핸들 유지
      currentHandle = file.name.endsWith('.json') ? handle : null;
      return { content, name: file.name };
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return null;
      throw err;
    }
  }
  // 폴백: <input type="file">
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve({ content: await file.text(), name: file.name });
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
