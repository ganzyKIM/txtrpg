import { useEffect, useState } from 'react';
import type { Settings } from '../types';
import { listModels, type ModelLists } from '../api/gemini';

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

export default function SettingsModal({ open, settings, onChange, onClose }: Props) {
  const [models, setModels] = useState<ModelLists | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshModels(apiKey: string) {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const lists = await listModels(apiKey);
      setModels(lists);
      const next = { ...settings };
      // 선택된 모델이 없으면 합리적인 기본값 자동 선택
      if (!next.textModel && lists.textModels.length > 0) {
        const preferred =
          lists.textModels.find((m) => m.id.includes('flash') && !m.id.includes('lite')) ??
          lists.textModels[0];
        next.textModel = preferred.id;
        next.textModelTokenLimit = preferred.inputTokenLimit;
      }
      if (!next.imageModel && lists.imageModels.length > 0) {
        const preferred =
          lists.imageModels.find(
            (m) => m.id.includes('imagen-3') || m.id.includes('flash-image'),
          ) ?? lists.imageModels[0];
        next.imageModel = preferred.id;
      }
      onChange(next);
    } catch (err) {
      setError((err as Error).message);
      setModels(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && settings.apiKey && !models && !loading) {
      void refreshModels(settings.apiKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 450 }} onClick={(e) => e.stopPropagation()}>
        <h3>API 및 모델 설정</h3>

        <label>Gemini API 키 (브라우저에만 저장됩니다):</label>
        <input
          type="password"
          value={settings.apiKey}
          placeholder="Google AI Studio에서 발급한 API 키"
          onChange={(e) => onChange({ ...settings, apiKey: e.target.value })}
        />

        <label>AI 모델 (텍스트 생성용):</label>
        <select
          value={settings.textModel}
          onChange={(e) => {
            const chosen = models?.textModels.find((m) => m.id === e.target.value);
            onChange({
              ...settings,
              textModel: e.target.value,
              textModelTokenLimit: chosen?.inputTokenLimit ?? settings.textModelTokenLimit,
            });
          }}
        >
          {settings.textModel && !models && (
            <option value={settings.textModel}>{settings.textModel}</option>
          )}
          {!settings.textModel && !models && <option value="">모델을 불러와주세요</option>}
          {models?.textModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.id})
            </option>
          ))}
        </select>

        <label>AI 모델 (이미지 생성용):</label>
        <select
          value={settings.imageModel}
          onChange={(e) => onChange({ ...settings, imageModel: e.target.value })}
        >
          {settings.imageModel && !models && (
            <option value={settings.imageModel}>{settings.imageModel}</option>
          )}
          {!settings.imageModel && !models && <option value="">모델을 불러와주세요</option>}
          {models?.imageModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.id})
            </option>
          ))}
        </select>

        {error && <p style={{ color: '#d93025', fontSize: 12 }}>오류: {error}</p>}

        <div className="modal-buttons">
          <button
            className="secondary"
            disabled={loading || !settings.apiKey}
            onClick={() => void refreshModels(settings.apiKey)}
          >
            {loading ? '불러오는 중...' : '모델 새로고침'}
          </button>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
