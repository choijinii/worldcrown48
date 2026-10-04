# Claude Code 작업 지시 — CARD-FIX (서버 크라운 카드 복구)
작성: 코티오(Cowork) · 2026-10-04 (일) 23:33 KST · 대표 승인 "(가)로 가자" · 23:37 수정(새 그림 시험 → 메일 알림, 백필 안 함) · 23:46 추가(운영자 페이지 알림)

## 0. 먼저 읽을 것
1. `outputs/KICK_CARD-FIX_서버크라운카드-canvas복구_v1.0_2026-10-04.md` — 이 작업의 킥. 범위·완료 기준은 킥이 정본.
2. `outputs/E2E-1_보고_2026-10-04.md` — 네가 쓴 E2E-1 보고서의 Auto-STOP 절(함수 로그 증거).
3. `functions/package.json` · `functions/src/core/canvasServer.ts` · `functions/src/onChampionConfirmed.ts` · `firebase.json`(functions predeploy) · `scripts/predeploy-guard.sh` · `.github/workflows/functions-build.yml`
4. `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` D-33(Node 22)

## 1. 확인된 사실 (출발점)
- `onChampionConfirmed` 실패: `Cannot find module 'canvas'` — 9/24~10/4 로그에 7건, 첫 건 9/27. 실패 시 재시도 없이 return → `crown_cards` 문서·Storage PNG가 안 생긴다.
- `canvas ^2.11.2`는 **optionalDependencies**. `canvasServer.ts` 주석은 "node-20 Functions runtime" 전제.
- ⚠ **너의 E2E-1 보고서는 "#108보다 먼저라 무관"이라 했지만 틀렸을 가능성이 크다.** #108 **병합**은 9/26 23:53이지만, 대표가 Node 22로 **함수 22개를 실제 배포한 것은 9/27**이고 첫 실패도 **9/27**이다. 병합일이 아니라 배포일로 대조하라.

## 2. 할 일 (Superpowers: 계획 → 시험 먼저 → 구현 → 검증)
브랜치 `fix/card-fix-canvas-node22` — **최신 origin/main 기준**(`git fetch origin` 먼저). E2E-1 브랜치(`test/e2e-1-guest-ci`)와 섞지 않는다. 계획서 `docs/superpowers/plans/2026-10-04-card-fix-canvas.md`.

### Phase 0 — 원인 확정 + 영향 목록 (코드 변경 없음)
- 함수 로그에서 9/27 첫 실패 시각과 배포 시각을 나란히 적는다(`firebase functions:log --only onChampionConfirmed --project worldcrown48` 읽기만).
- canvas 2.11.2의 Node 22 지원 여부를 **공식 근거**(패키지 릴리스 노트·prebuild 목록)로 확인. 추측으로 단정하지 않는다.
- `crown_cards` 문서·`crown-cards/` PNG를 읽는 곳 전부 목록(파일·화면·영향) — 예: `components/arena/RunCompleteActions.tsx`, `lib/crown/pastCards.ts` 등.

### Phase 1 — 실패를 알리는 장치 (새 그림 시험은 만들지 않는다 — 대표 23:37)
- 대표 판단: CI에서 PNG를 직접 그려 보는 새 시험은 손이 더 든다 → **만들지 않는다.** 카드가 실제로 만들어지는지는 hf3 E2E-1(`crown_cards` 문서 확인)이 이미 지켜본다.
- 대신 **실제 사이트의 실패를 대표 메일로 알린다**: 구글 클라우드 로그 기반 알림(log-based alert) — 조건 = `onChampionConfirmed` 로그에 `render failed` 포함, 받는 곳 = 대표 메일(jounnamu12@gmail.com — 대표가 확인한 주소로).
  - 먼저 **공식 문서로 요금을 확인**해 보고서에 적는다(무료 범위인지). 유료면 STOP하고 보고.
  - 설정은 `gcloud` 명령이 대표 컴퓨터에서 되면 네가 하고, 안 되면 콘솔 클릭 순서를 한 단계씩 대표에게 준다.
  - 설정 후 시험 알림 1통이 대표 메일에 오는지 확인한다.

- **운영자 페이지 알림도 추가**(23:46 대표 요청) — 시험 먼저:
  - `onChampionConfirmed`의 render 실패 경로에서 `admin_alerts`에 문서를 쓴다: type `crown_card_render_failed`, severity `high`, detail = 오류 첫 줄 + cardId, tournamentId. **열린(resolved=false) 같은 type 알림이 있으면 새로 만들지 말고 횟수(count)·마지막 시각만 갱신**(차트 이상 징후의 dedup 방식 `scheduleRankingCacheCore`와 같은 원칙). 알림 쓰기가 실패해도 함수는 지금처럼 재시도 없이 끝난다.
  - `components/admin/dashboard/AlertList.tsx`는 지금 모든 알림 제목을 "차트 이상 징후" 하나로 그린다 → **type별 제목**으로 바꾼다. 새 제목 후보: ko "크라운 카드 생성 실패" / en "Crown Card render failed". **화면 문구라 커밋 전에 전후 비교 승인표(`outputs/CARD-FIX_승인표_2026-10-0X.md`)를 만들고 STOP → 대표 승인 후 커밋.**
  - 단위 시험: 실패 시 알림 1건 생성 · 두 번째 실패는 같은 문서 갱신 · 알림 쓰기 오류가 함수를 던지게 하지 않음 · AlertList가 type별 제목을 그림.

### Phase 2 — 고치기
- Node 22에서 미리 만든 설치 파일로 설치되는 그림 부품으로 교체: 후보 ① `canvas` 3.x ② `@napi-rs/canvas`. Phase 0 근거로 하나를 고르고, 고른 이유를 보고서에 적는다. `createCanvas`·`getContext('2d')`·`toBuffer('image/png')` 사용처(`canvasServer.ts`)만 맞춘다. `drawLink` 등 그리기 코드는 바꾸지 않는다.
- 부품을 **dependencies(필수 설치)**로 옮긴다 → 설치 실패 = 배포 실패. (조용한 실패를 막는 첫째 장치, 추가 비용 0)
- `canvasServer.ts` 주석의 "node-20" 전제를 실제와 맞게 고친다.
- 결과 그림이 지금과 같은지: 새 부품으로 그린 PNG를 `outputs/CARD-FIX_캡처_2026-10-0X/`에 저장(같은 시드 데이터).

### Phase 3 — 검증과 배포 안내
- 로컬: functions 단위 시험 · `npm --prefix functions run build` · 루트 `npx tsc --noEmit` 초록.
- PR → CI 초록.
- **대표 병합 후 배포 명령을 한 줄씩 따로 상자로** 준다(이 함수만): 예) `git pull` → `firebase deploy --only functions:onChampionConfirmed --project worldcrown48`. predeploy 가드가 요구하는 절차를 먼저 확인해 그대로 안내한다.
- 배포 후: ① `functions:log`에 새 `render failed` 0 ② PR #114(E2E-1)의 C-1 워크플로를 다시 돌려 **hf3 5/5 · run1 통과 · 건너뜀 0** 숫자 확인 ③ 결과를 대표에게 보고 → 대표가 #114 병합.
- 대표 눈검사는 하나만 청한다: 실제 사이트에서 같은 대회를 두 번 완주한 뒤 "이전 참여의 Crown Card" 목록에 카드가 보이는지. 그 전에 네가 같은 경로를 로그·조회로 먼저 확인한다.

## 3. 하지 말 것 (OUT)
- 카드 디자인·문구 변경 · 재시도 정책 변경 · 다른 함수 변경 · 다른 함수 재배포(이 함수만).
- 운영자 페이지 알림 목록의 다른 부분 디자인 변경 · 9/27 이후 실패분 백필(**하지 않음 — 대표 확정**) · E2E-1 브랜치 수정 · CI용 새 PNG 그림 시험(대표 23:37 — 만들지 않음).
- 서비스 계정 키 새로 만들기.

## 4. 보고
- `outputs/CARD-FIX_보고_2026-10-0X.md` 누적. 채팅은 요약. 용어는 처음 쓸 때 풀이. main 직접 push 금지.

## 5. Auto-STOP
- 원인이 canvas 설치가 아닌 다른 것으로 드러날 때 · 그림 결과가 지금과 눈에 띄게 달라질 때 · 새 비밀값·키가 필요할 때 · 범위 밖 파일 변경이 필요할 때.
