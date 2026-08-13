# 텍스트 RPG

Gemini로 진행하는 멀티유저 텍스트 RPG 웹앱. 구글 로그인 · 크레딧 과금 · 유저별 클라우드 세이브.

- 배포: https://txtrpg-rpg.surge.sh
- 계획 문서: [docs/PLAN-saas.md](docs/PLAN-saas.md)

## 아키텍처

```
[React SPA]  ──구글 로그인──▶  [Supabase Auth]
   │  JWT 첨부, API 키 없음
   ▼
[Edge Functions]  ◀── GEMINI_API_KEY (서버 비밀)
   generate-text / generate-image / admin
   JWT 검증 → 잔액 확인 → Gemini 호출 → 크레딧 차감 + 장부 기록
   ▼
[Postgres] profiles / saves / credit_ledger / config   [Storage] 생성 이미지
```

**Gemini API 키는 절대 클라이언트에 두지 않는다.** Edge Function 서버 시크릿에만 존재한다.
`profiles.credits`는 RLS로 유저 직접 수정이 차단되어 있고, Edge Function과 관리자만 쓸 수 있다.

## 기능

- **3계층 메모리**: 고정 메모리(장기 설정) + 롤링 요약(자동 갱신) + 최근 턴 원문만 전송 → 토큰 절약
- **기억 관리**: AI가 기억하는 설정/요약을 직접 열람·수정
- **클라우드 세이브**: 유저별 DB 자동저장(디바운스 800ms). `.rpgsave.json` / `.txt` 내보내기는 백업용
- **삽화 생성**: 본문 문장을 드래그하면 해당 장면을 이미지로 생성 (크레딧 소모 큼)
- **서식**: 일반 서술 / 객관식(A·B·C) 전개, Undo/Redo, 턴 제외
- **크레딧**: 잔액 배지에서 충전 요청. 관리자 백오피스에서 수동 충전
- **연출**: 별하늘 캔버스 배경, 웜홀 전환. 새 모험은 워프 애니메이션 중에 세이브 생성과 첫 장면 생성을 병렬 처리해 진입 즉시 본문이 보인다
- **첫 진입 안내**: 새 모험 시작 시 조작법 오버레이 1회 표시

## 개발

```bash
npm install
npm run dev      # 로컬 개발 서버 (5173)
npm run build    # 타입체크 + 프로덕션 빌드
```

배포 (Surge, 수동):

```bash
npm run build && npx surge dist txtrpg-rpg.surge.sh
```

### 백엔드 설정

`.env.local`에 Supabase 공개 값:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Supabase 쪽:

```bash
supabase db push                          # migrations/001~004 적용
supabase secrets set GEMINI_API_KEY=...   # 서버 전용
supabase functions deploy generate-text
supabase functions deploy generate-image
supabase functions deploy admin
```

## 진행 상황

| 단계 | 내용 | 상태 |
|---|---|---|
| A | Supabase + 구글 로그인 + profiles + RLS | ✅ |
| B | Edge Function 프록시, 키 서버 이전, 크레딧 차감/장부 | ✅ |
| C | 세이브 DB 이전, 자동저장, 이미지 Storage | ✅ |
| D | 백오피스 (유저관리·충전·내역·config) | ✅ |
| E | 출시 점검 — CSAM 가드, 약관/환불 안내, 무료티어 한계 | ⬜ 미착수 |

**출시 전 남은 것** (E단계)

- Edge Function에 CSAM 최소 가드 (서버측 차단)
- 이용약관 / 환불 안내 UI
- Supabase 무료티어 한계 점검 (Storage 1GB, 7일 미사용 시 일시정지)
- 구버전에 하드코딩됐던 Gemini 키 폐기·재발급 확인
