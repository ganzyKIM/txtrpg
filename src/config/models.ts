import type { TextTier } from '../types';

export interface TextTierInfo {
  tier: TextTier;
  /** UI에 노출되는 모델명 (한글 기준 화면) */
  label: string;
  /** 가격 안내 문구 */
  priceNote: string;
}

/**
 * 유저가 고르는 두 가지 텍스트 모델.
 * 실제 Gemini 모델 ID와 단가는 서버(config 테이블)에서 매핑/차감하며,
 * 여기서는 화면 표시와 선택값(tier)만 다룬다.
 */
export const TEXT_TIERS: TextTierInfo[] = [
  {
    tier: 'standard',
    label: 'Gemini 3.1 Flash (기본)',
    priceNote: '저렴 · 한 턴 약 11~30 크레딧',
  },
  {
    tier: 'pro',
    label: 'Gemini 3.5 Flash (고품질)',
    priceNote: '고품질 · 한 턴 약 33~88 크레딧 (기본의 약 3배)',
  },
];

export const IMAGE_MODEL_INFO = {
  label: 'Gemini 2.5 Flash Image',
  priceNote: '1장 약 188 크레딧 · 생성 시간 30~60초',
};

export const DEFAULT_TEXT_TIER: TextTier = 'standard';

export function tierLabel(tier: TextTier): string {
  return TEXT_TIERS.find((t) => t.tier === tier)?.label ?? tier;
}
