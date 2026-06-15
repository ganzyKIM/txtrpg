// 세이브 모듈 라운드트립 검증 스크립트 (node scripts/test-save.mjs)
import { readFileSync } from 'node:fs';
import { parseSave, serializeSave, exportPlainTxt, importLegacyTxt } from '../tmp/saveFile.mjs';

const legacy = readFileSync(new URL('../111.txt', import.meta.url), 'utf-8');

// 1) 레거시 임포트
const { game } = parseSave(legacy);
console.log('--- 레거시 임포트 ---');
console.log('fixedMemory 시작:', JSON.stringify(game.fixedMemory.slice(0, 30)));
console.log('archive 길이:', game.archive.length);
console.log('turns:', game.turns.map((t) => `${t.role}(${t.text.length}자)`).join(', '));
if (!game.fixedMemory.includes('알데리온 대륙')) throw new Error('고정 메모리 파싱 실패');
if (game.turns[game.turns.length - 1].text.length > 5100) throw new Error('테일 절단 실패');

// 2) JSON 직렬화 → 재파싱 라운드트립
const settings = { textTier: 'pro' };
game.turns.push({ id: 'img-turn', role: 'ai', text: '삽화 턴', images: ['QUJD'] });
game.rollingSummary = '중간 요약';
game.summarizedTurnCount = 1;
const json = serializeSave(game, settings, true);
const reparsed = parseSave(json);
console.log('--- JSON 라운드트립 ---');
const same =
  reparsed.game.fixedMemory === game.fixedMemory &&
  reparsed.game.rollingSummary === game.rollingSummary &&
  reparsed.game.summarizedTurnCount === game.summarizedTurnCount &&
  reparsed.game.archive === game.archive &&
  JSON.stringify(reparsed.game.turns) === JSON.stringify(game.turns) &&
  reparsed.settings.textTier === 'pro';
console.log('모든 필드 보존:', same);
if (!same) throw new Error('JSON 라운드트립 실패');

// 3) 이미지 제외 직렬화
const noImg = parseSave(serializeSave(game, settings, false));
if (noImg.game.turns.some((t) => t.images)) throw new Error('이미지 제외 실패');
console.log('이미지 제외 내보내기: OK');

// 4) txt 내보내기 → 레거시 재임포트
const txt = exportPlainTxt(game);
const reimported = importLegacyTxt(txt);
console.log('--- txt 재임포트 ---');
console.log('fixedMemory 보존:', reimported.fixedMemory === game.fixedMemory.trim());
console.log('archive에 신규 턴 포함:', reimported.archive.includes('삽화 턴'));
if (reimported.fixedMemory !== game.fixedMemory.trim()) throw new Error('txt 재임포트 실패');

console.log('\n✅ 모든 세이브 테스트 통과');
