# CARD-FIX 계획 — 서버 Crown Card 복구 (canvas, 2026-10-04)

킥: `outputs/KICK_CARD-FIX_서버크라운카드-canvas복구_v1.0_2026-10-04.md` · 지시서: `outputs/PROMPT_ClaudeCode_CARD-FIX_…_2026-10-04.md` (23:37 수정본)
브랜치: `fix/card-fix-canvas-node22` (origin/main `5bd5853` 기준)

| # | 무엇 | 확인 수단 |
|---|---|---|
| 0 | 원인 확정 — 배포 시각·런타임 ↔ 첫 실패 시각 · canvas 2.11.2 설치 파일 목록 | functions:log(감사 로그 포함) · GitHub 릴리스 자산 |
| 0 | `crown_cards`·`crown-cards/` PNG 를 읽는 곳 목록 | grep |
| 1 | `render failed` 로그 기반 메일 알림 — 요금 확인 → 설정(gcloud 없으면 콘솔 단계 안내) → 시험 메일 1통 | 공식 가격 페이지 · 대표 메일함 |
| 2 | canvas 2.11.2(optional) → **canvas 3.2.3(dependencies)** · `canvasServer.ts` 주석만 정정(그리기 코드 무변경) | functions build · 단위 시험 · root tsc |
| 2 | 새 부품으로 같은 시드 PNG 저장 + 브라우저 그림과 비교 | `outputs/CARD-FIX_캡처_2026-10-04/` |
| 3 | PR → CI(functions-build 의 Node 22 `npm ci` = 리눅스 설치 확인) → 대표 병합·이 함수만 배포 → log 0 · #114 재실행 hf3 5/5 | CI 로그 · functions:log |

하지 않는 것: 새 PNG 그림 시험(대표 23:37) · 백필 · 디자인/재시도 정책 · 다른 함수 · E2E-1 브랜치.
