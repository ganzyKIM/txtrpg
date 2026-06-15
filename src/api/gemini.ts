const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// 본 프로그램은 교육 목적의 문학적 픽션 생성 도구입니다.
// 가상의 인물과 이야기만을 다루므로 모든 안전 필터를 해제합니다.
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

export interface ModelInfo {
  id: string;
  displayName: string;
  inputTokenLimit: number;
}

export interface ModelLists {
  textModels: ModelInfo[];
  imageModels: ModelInfo[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GenerateOptions {
  system?: string;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  promptTokenCount: number;
}

interface RawModel {
  name: string;
  displayName: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
}

function toInfo(m: RawModel): ModelInfo {
  return {
    id: m.name.replace('models/', ''),
    displayName: m.displayName,
    inputTokenLimit: m.inputTokenLimit ?? 128_000,
  };
}

export async function listModels(apiKey: string): Promise<ModelLists> {
  const res = await fetch(`${BASE}/models?key=${encodeURIComponent(apiKey)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const models: RawModel[] = data.models ?? [];

  const textModels = models
    .filter(
      (m) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        m.name.includes('gemini') &&
        !m.name.includes('-image') &&
        !m.name.includes('vision'),
    )
    .map(toInfo);

  const imageModels = models
    .filter(
      (m) =>
        m.name.includes('imagen') ||
        m.name.includes('imagegeneration') ||
        m.name.includes('-image'),
    )
    .map(toInfo);

  return { textModels, imageModels };
}

export async function generateText(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    safetySettings: SAFETY_SETTINGS,
    generationConfig: { temperature: options.temperature ?? 0.75 },
  };
  if (options.system) {
    body.system_instruction = { parts: [{ text: options.system }] };
  }

  const res = await fetch(
    `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('');
  if (!text) throw new Error('응답에서 텍스트를 추출하지 못했습니다.');
  const promptTokenCount: number = data.usageMetadata?.promptTokenCount ?? 0;
  return { text, promptTokenCount };
}

/** 이미지 생성. base64 PNG 데이터(data: 접두사 제외)를 반환 */
export async function generateImage(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  if (model.includes('gemini') || model.includes('flash-image')) {
    const res = await fetch(
      `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const parts: Array<{ inlineData?: { data: string }; inline_data?: { data: string } }> =
      data.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const b64 = part.inlineData?.data ?? part.inline_data?.data;
      if (b64) return b64;
    }
    throw new Error('이미지 데이터를 추출하지 못했습니다.');
  }

  // Imagen 계열 (:predict)
  const res = await fetch(
    `${BASE}/models/${model}:predict?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } }),
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('이미지 데이터를 추출하지 못했습니다.');
  return b64;
}
