# Claude Code 작업 지시 — E2E-1 (게스트 흐름 E2E 복구 + CI 연결)
작성: 코티오(Cowork) · 2026-10-04 (일) 21:55 KST

## 0. 먼저 읽을 것 (순서대로)
1. `CLAUDE.md` (v2.8 — 문서 PR이 병합된 뒤의 main 기준. 아직 병합 전이면 브랜치 `docs/claude-md-v2.8-ledger`의 것)
2. `outputs/KICK_E2E-1_게스트E2E복구-CI연결_v1.0_2026-10-04.md` — 이 작업의 킥. 범위 IN/OUT과 완료 기준은 킥이 정본이다.
3. `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` 의 **D-41**(익명 계정 생성 자리 셋) · `LANGUAGE.md §2`(참가 규칙 v2.1: 게스트 하루 통틀어 3판)
4. `e2e/hf3-guest-run.spec.ts` · `e2e/run1-daily-run-limit.spec.ts` · `.github/workflows/c1-e2e.yml` · `playwright.config.ts` · `tsconfig.json`

## 1. 확인된 사실 (티오 실측 — 다시 조사하지 말고 출발점으로 쓴다)
- `e2e/hf3-guest-run.spec.ts`는 `.github/workflows/` 어디에도 연결돼 있지 않다(시험 파일 18개 중 유일).
- 이 파일은 TypeScript 파서 기준 **문법 오류 5건**: 451행 `',' expected`, 458행 `Declaration or statement expected` 등. 443행 `});`로 E2E-2(v2.1) 시험이 끝난 뒤, 옛 v2.0 시험의 꼬리(445~457행: "A different Tournament → gated" · "계속하려면 로그인이 필요해요")가 떨어져 남아 있다. `git log`상 마지막 변경 = #93(46a8abe).
- `tsconfig.json` include에 `e2e/`가 없어서 타입 검사가 이 오류를 못 잡았다.
- PR #112(ANON-1) 머리 커밋 8e6bf30에서 C-1 워크플로(`c1-e2e.yml`, run 37168533572)의 "E2E (Playwright)" 단계는 success. 이 단계는 `c1-arena-flow` · `run1-daily-run-limit` · `arena1-split-stage`만 돈다.
- D-41 이후 익명 계정은 ① 쿠키 동의 저장 ② 아레나 입장 ③ 크라운 카드 입장에서만 생긴다. hf3 시험의 `anonUidFrom(page)`는 아레나 페이지에서 uid를 읽으므로 원리상 맞지만, **실제로 확인**하라.

## 2. 할 일 (Superpowers 순서: 계획 → 시험 먼저 → 구현 → 검증)
### Phase 0 — 계획 (STOP 없음, 바로 Phase 1로)
- 브랜치 `test/e2e-1-guest-ci` (최신 origin/main 기준 — 먼저 `git fetch origin`).
- 계획서를 `docs/superpowers/plans/2026-10-04-e2e-1-guest-ci.md`에 남긴다(무엇을 · 어떤 순서로 · 무엇으로 확인).

### Phase 1 — 고아 방지 시험 먼저 (빨강 확인)
- `lib/__tests__/ci/e2eWiring.test.ts`: `e2e/*.spec.ts` 파일마다 `.github/workflows/*.yml` 어딘가에 그 파일 이름이 있어야 한다. 의도적으로 빼는 파일이 생기면 시험 안의 허용 목록에 **이유와 함께** 적게 한다(지금은 허용 목록 비어 있음).
- 이 시험은 지금 `hf3-guest-run.spec.ts` 때문에 **빨강**이어야 한다 → 빨강을 확인하고 기록.

### Phase 2 — 복구
1. `hf3-guest-run.spec.ts`의 떨어진 조각을 정리해 문법 오류 0. 조각 안에 v2.1 시험에 없는 확인이 있으면 버리기 전에 보고서에 적는다(v2.0 문구 "계속하려면 로그인이 필요해요"는 v2.1에서 `login.guest_limit` 문구로 바뀌었으므로 되살리지 않는다).
2. 시험 5개의 기대값을 확정 규칙과 대조한다: 게스트 하루 통틀어 3판(4판째 차단 + Google 버튼) · 대회를 건너가도 판 중간이면 막지 않음 · 로그인 연결 시 진행 이전 · 이미 끝낸 대회 충돌 처리. **규칙과 시험이 다르면 시험을 고치고, 제품과 규칙이 다르면 멈추고 보고**한다.
3. `tsconfig.e2e.json`(extends `./tsconfig.json`, include `e2e/**/*.ts`, 필요하면 playwright 타입) + `package.json`에 `"typecheck:e2e"` 스크립트. **본 `tsconfig.json`은 바꾸지 않는다**(Vercel 빌드가 쓰는 파일). 다른 e2e 파일에서 타입 오류가 나오면 목록을 보고하고, 고치는 범위가 작으면 같이 고친다(제품 코드 아님).
4. `c1-e2e.yml`의 E2E 명령에 `e2e/hf3-guest-run.spec.ts` 추가 + `npm run typecheck:e2e` 단계 추가(E2E 앞). 비밀값은 이미 있는 것만 쓴다(`TEST_UID`=`C1_TEST_UID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `FIREBASE_ADMIN_SDK_KEY`). **새 비밀값이 필요해지면 STOP.**
5. 같은 `TEST_UID`를 쓰는 c1·run1·arena1·hf3 시험끼리 서로의 Voter 상태(votes·roundProgress·guest_runs)를 오염시키지 않는지 확인 — 각 시험이 쓰는 대회 ID와 정리 순서를 표로 보고(과거 mobile-320 사고 교훈: 같은 Voter를 쓰는 시험은 시작 전에 상태를 RESET).

### Phase 3 — 검증
- 로컬: `npx vitest run lib/__tests__/ci` 초록 · `npm run typecheck:e2e` 초록 · `npx tsc --noEmit` 초록.
- 고아 방지 시험에서 워크플로 줄 하나를 잠깐 빼면 빨강이 되는지 한 번 확인하고 되돌린다.
- PR → C-1 워크플로 로그에서 **hf3 5개 · run1 통과, 건너뜀 0** 숫자를 확인(`Playwright HTML report` 아티팩트 또는 로그 요약 줄). "success"만으로 판정하지 않는다 — 시험이 `test.skip`으로 건너뛰어도 단계는 success가 되기 때문.
- 시험 뒤 시드 대회 `hf3-guest-e2e-a/b`와 그 시험이 만든 익명 계정이 정리됐는지 확인.

## 3. 하지 말 것 (OUT)
- 제품 코드(app/ · components/ · lib/ 의 실행 코드) · firestore.rules · functions/ 변경.
- 다른 워크플로의 Node 버전 '20' 변경(D-33 런칭 후).
- CI 익명 계정 청소(CI-ANON-1) · 테스트용 파이어베이스 분리(D-41 제안 4).
- 쿠키 동의(COOKIE-1)·서랍(NAV-1) 시험.

## 4. 보고
- `outputs/E2E-1_보고_2026-10-0X.md`에 누적 기록: Phase별 결과 · 빨강→초록 증거 · 시험별 통과/건너뜀 숫자 · 고친 기대값과 그 근거(규칙 문서 줄).
- 채팅엔 요약. 대표에게 줄 터미널 명령은 **한 줄씩 따로 상자**. 용어는 처음 쓸 때 풀이. main은 보호 브랜치 — `git push origin main` 금지, 브랜치 → PR.

## 5. Auto-STOP (멈추고 보고)
- 시험이 제품 결함을 가리킬 때(규칙대로인데 화면이 다르게 동작) · 새 비밀값이나 서비스 계정 키가 필요할 때 · 범위 밖 파일을 고쳐야 할 때 · CI 빨강의 원인이 이 PR 밖에 있을 때.

## 6. 완료 조건 (킥 §5와 같음)
- 문법 오류 0 · `typecheck:e2e` 초록 · hf3 5개와 run1 통과(건너뜀 0) · 고아 방지 시험 초록(빼면 빨강 확인) · 시드·익명 계정 정리 · 보고서.
- 화면·문구 변경 없음 → 눈검사 없음. 함수·규칙 변경 없음 → 파이어베이스 배포 없음. 대표는 병합만.
