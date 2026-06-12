# 텍스트 RPG (Gemini 기반)

Gemini API로 진행하는 텍스트 RPG 웹앱. 장면을 선택해 삽화 이미지를 생성할 수 있고, 토큰을 아끼는 3계층 메모리 시스템으로 긴 모험을 이어갈 수 있다.

## 사용 방법

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 무료 Gemini API 키 발급
2. 앱 접속 → `[도구] API 및 모델 설정`에서 키 입력 (키는 내 브라우저에만 저장됨)
3. 새 모험을 시작하거나 세이브 파일을 불러와 진행

## 기능

- **3계층 메모리**: 고정 메모리(장기 설정) + 롤링 요약(자동 갱신) + 최근 턴 원문만 API로 전송 → 토큰 절약
- **기억 관리**: AI가 기억하는 설정/요약을 직접 보고 수정 가능
- **세이브**: `.rpgsave.json` 파일로 저장 (이미지 포함). Chrome/Edge에서는 같은 파일에 덮어쓰기 저장. 구버전 `[고정 메모리]/[진행 기록]` txt 세이브도 불러오기 가능
- **삽화 생성**: 본문에서 문장을 드래그하면 해당 장면을 이미지로 생성
- **서식**: 일반 서술 / 객관식(A,B,C) 전개, Undo/Redo

## 개발

```bash
npm install
npm run dev      # 로컬 개발 서버
npm run build    # 프로덕션 빌드 (타입체크 포함)
node scripts/test-save.mjs  # 세이브 라운드트립 테스트 (사전: npx esbuild src/save/saveFile.ts --bundle --format=esm --outfile=tmp/saveFile.mjs)
```

main 브랜치에 push하면 GitHub Actions가 자동으로 GitHub Pages에 배포한다.
