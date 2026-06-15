import type { Settings, TextTier } from '../types';
import { IMAGE_MODEL_INFO, TEXT_TIERS } from '../config/models';

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

export default function SettingsModal({ open, settings, onChange, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>모델 설정</h3>

        <p className="settings-section-label">텍스트 모델 — 이야기 생성</p>
        <div className="tier-list">
          {TEXT_TIERS.map((t) => (
            <label
              key={t.tier}
              className={`tier-option${settings.textTier === t.tier ? ' selected' : ''}`}
            >
              <input
                type="radio"
                name="textTier"
                checked={settings.textTier === t.tier}
                onChange={() => onChange({ ...settings, textTier: t.tier as TextTier })}
              />
              <span className="tier-body">
                <span className="tier-label">{t.label}</span>
                <span className="tier-price">{t.priceNote}</span>
              </span>
            </label>
          ))}
        </div>

        <p className="settings-section-label" style={{ marginTop: 20 }}>이미지 모델 — 삽화 생성</p>
        <div className="image-model-box">
          <span className="image-model-icon">🖼️</span>
          <span className="tier-body">
            <span className="tier-label">{IMAGE_MODEL_INFO.label}</span>
            <span className="tier-price">{IMAGE_MODEL_INFO.priceNote}</span>
          </span>
        </div>

        <p className="settings-note">
          크레딧은 실제 사용한 토큰량에 따라 차감됩니다. 고품질 모델은 더 풍부한 표현을 생성하지만 약 3배의 크레딧이 소모됩니다. 이미지는 생성 시에만 차감됩니다.
        </p>

        <div className="modal-buttons">
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
