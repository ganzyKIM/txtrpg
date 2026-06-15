# 텍스트 RPG — 멀티유저 유료 SaaS 전환 계획 (v3)

> 본 문서는 운영자(사장님)용 한국어 문서입니다.
> **단, 실제 코드 식별자/주석과 Gemini로 보내는 내부 프롬프트는 모두 영어로 작성합니다.**
> 유저에게 보이는 UI 텍스트만 한국어입니다.

## 0. 목표

기존 "BYOK 정적 사이트"를 **구글 로그인 + 크레딧 충전 + 유저별 DB**를 갖춘 멀티유저 유료 서비스로 전환한다.
API 키는 더 이상 브라우저에 두지 않고, 운영자의 키를 서버(프록시)에 숨긴다.

## 1. 확정 사항

| 항목 | 결정 |
|---|---|
| 인증 | Google 로그인 (Supabase Auth) |
| 텍스트 모델 | 유저가 **Gemini 3.1 Flash / 3.5 Flash 직접 선택** (비싼 모델은 크레딧이 그만큼 더 차감) |
| 이미지 모델 | **나노바나나2 (Gemini 3.1 Flash Image)**, 기본 1024px |
| 크레딧 단위 | **1 크레딧 = ₩1** |
| 과금 배수 | **실사용 원가 × 2** |
| 충전 | **수동** (운영자가 백오피스에서 잔액 입력) |
| 저장 | 유저별 **DB 자동저장** + 이미지는 Storage. `.rpgsave.json` 내보내기는 백업용으로 유지 |
| 콘텐츠 필터 | 안전필터 `BLOCK_NONE` 유지. **단 미성년 성적 콘텐츠(CSAM) 최소 방어선만 서버에 둠** (출시 전 재확인) |
| 언어 | UI=한국어 / 코드·내부 프롬프트=영어 (스토리 출력은 한국어로 지시) |

## 2. 과금 공식 (서버에서만 계산)

```
text_credits  = ceil( (in_tokens * in_rate + out_tokens * out_rate) * fx * markup )
image_credits = ceil( image_usd * fx * markup )   // 해상도별 고정
```

설정값(아래는 현재 기준, **DB config 테이블에 두어 언제든 수정**):

- `fx` (환율) = **1,400** ₩/$
- `markup` = **2**
- 모델 단가 (per 1M tokens, USD):
  - 3.1 Flash → 입력 **$0.50** / 출력 **$3.00**
  - 3.5 Flash → 입력 **$1.50** / 출력 **$9.00**
- 이미지 (나노바나나2, USD/장): 512px **$0.045** / 1024px **$0.067** / 4K **$0.151**

→ 토큰당 차감 크레딧 (fx×markup 적용):

| 모델 | 입력 1토큰 | 출력 1토큰 |
|---|---|---|
| 3.1 Flash | 0.0014 | 0.0084 |
| 3.5 Flash | 0.0042 | 0.0252 |

→ 이미지 1024px = `0.067 × 1400 × 2` ≈ **188 크레딧/장**

체감(한 턴 / 1장):
- 3.1 Flash 한 턴 ≈ 11~30 크레딧, 3.5 Flash 한 턴 ≈ 33~88 크레딧
- 이미지(1024px) ≈ 188 크레딧

## 3. 아키텍처

```
[브라우저 React 앱]  ── 구글 로그인 ──▶ [Supabase Auth]
     │  (JWT 첨부, API키 없음)
     │  POST /generate-text, /generate-image
     ▼
[Supabase Edge Functions = 프록시]   ◀── 운영자 Gemini 키(서버 비밀)
     │  ① JWT 검증 → 유저 식별
     │  ② 잔액 확인 (0이면 402 거부)
     │  ③ (영어) 시스템 프롬프트 + 메시지 구성
     │  ④ Gemini 호출 → usageMetadata 수신
     │  ⑤ 크레딧 차감 + 장부 기록 (원자적)
     │  ⑥ 세이브 갱신
     ▼
[Postgres]  profiles / saves / credit_ledger / config
[Storage]   생성 이미지 파일 (turns에는 URL만)
```

- 프론트 호스팅: Vercel / Cloudflare Pages / Surge 중 택1 (정적)
- 백오피스: 같은 앱 내 **관리자 전용 라우트**(admin 플래그로 게이트) 또는 별도 앱

## 4. DB 스키마 (초안)

- **profiles**: `id(uuid, =auth.uid), email, display_name, credits(bigint, 기본 0), is_admin(bool), created_at, last_seen_at`
- **saves**: `id, user_id, title, fixed_memory, rolling_summary, summarized_turn_count, turns(jsonb), archive, created_at, updated_at` — 유저당 여러 슬롯 허용
- **credit_ledger**: `id, user_id, delta(bigint), balance_after, type('topup'|'spend_text'|'spend_image'|'adjust'), meta(jsonb), created_at`
- **config**: `key(text PK), value(jsonb)` — fx, markup, 모델·이미지 단가

**RLS(행 보안) 핵심**:
- `profiles`: 본인 행 읽기 가능, **credits는 유저가 직접 수정 불가** (Edge Function/관리자만)
- `saves`: 본인 행만 CRUD
- `credit_ledger`: 본인 읽기만, 기록은 서버만
- `config`: 서버/관리자만

## 5. 내부 프롬프트 영어화 (이번에 함께 정리)

서버로 옮기면서 아래 프롬프트를 **영어로 재작성**한다. 핵심 규칙:
**"명령은 영어로, 그러나 스토리 본문은 한국어로 출력하라"** 고 모델에 지시한다.
(예: `You are the narrator of a Korean-language text RPG. Always write the story body in natural Korean.`)

영어화 대상:
1. 시스템 인스트럭션 (educational fiction 고지 + 고정 메모리 + 롤링 요약)
2. 서식 지시 (textOnly / choice)
3. 오프닝 생성 프롬프트
4. 이미지용 영어 프롬프트 생성 프롬프트
5. 메모리 접기(요약 갱신) 프롬프트
6. 고정 메모리 승격(추출) 프롬프트
7. 요약 재압축 프롬프트

UI 라벨/버튼/안내문은 한국어 유지.

## 6. 백오피스 기능

- 관리자 구글 계정만 접근 (`is_admin`)
- **유저 목록/검색**: 이메일·닉네임·잔액·가입일·최근접속
- **충전**: 유저 선택 → 금액 입력 → `add_credits` 호출 (장부 자동 기록)
- **사용/충전 내역**: 유저별 + 전체
- **차단/조정**: 유저 정지, 잔액 수동 조정
- **설정**: fx·markup·모델단가·이미지단가 편집
- **현황(선택)**: 총 충전액, 추정 API 원가, 마진, 일별 사용량

## 7. 단계별 로드맵 (각 단계 독립 배포 가능)

- **A. 기반**: Supabase 프로젝트 + 구글 로그인 + `profiles` + RLS + 로그인 UI
- **B. 프록시·과금**: Edge Function `generate-text/image`, 키 서버 이전, **내부 프롬프트 영어화**, 크레딧 차감/장부
- **C. 저장 이전**: 세이브를 DB로, 자동저장, 이미지 Storage 이전
- **D. 백오피스**: 유저관리·충전·내역·config 편집
- **E. 출시 점검**: CSAM 최소 가드, 약관/환불 안내, 무료티어 한계 점검

## 8. 무료 티어 한계 / 리스크

- Supabase 무료: DB 500MB, Storage 1GB, 함수 호출량 제한, **7일 미사용 시 프로젝트 일시정지**. 지인~수십 명 규모엔 충분. 이미지 누적이 용량을 가장 빨리 먹음.
- **환율 변동** → `config.fx`로 즉시 조정 + markup 2배 버퍼가 흡수.
- **실패한 생성**(특히 이미지) → 실패 시 크레딧 **환불** 처리.
- **콘텐츠 정책** → 내 키/계정 책임. CSAM 가드 필수, 그 외 표현은 개방.
- **단일 키 rate limit** → 유저 증가 시 쿼터/한도 모니터링.
```
```
변경 이력
- v3 (2026-06): SaaS 전환 계획 확정. 이전: BYOK 정적(v2).
```
