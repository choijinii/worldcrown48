# Claude Code 지시서 — OPS-FIX-1 · 실서비스에 남은 E2E 시험 대회 정리 + 재발 방지 (v1.0 · 2026-10-22 · 코티오)

## 0. 한 줄
실서비스 피치에 자동 시험(E2E)이 심은 가짜 진행 중 대회("ARENA-1 스플릿 무대" 등)가 보인다. **운영 사고(원장 D-52)** 로 바로 고친다. 정본 결정 = 원장 D-66(아래 §6 그대로 원장에 옮긴다).

## 1. 먼저 읽기
- `outputs/LEDGER_D-63~D-66_원장옮김용_2026-10-22.md` (이 PR이 원장에 옮긴다)
- `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` D-41(익명 계정) · D-45(끝난 대회 = `tournamentDeadline` 기준) · D-52(운영 사고)
- 이 파일과 원장 옮김용 파일은 **아직 커밋 전**이라 메인 폴더 `/Users/jinii/Projects/worldcrown48/outputs/` 에만 있다. 워크트리에서 일하면 그 절대 경로로 읽고, 첫 커밋 때 워크트리 `outputs/` 로 복사해 함께 넣는다.

## 2. 코티오가 읽기 전용으로 확인한 사실 (origin/main 8753e8f 기준 — 다시 실측해서 맞는지 확인)
- `tournaments/{id}` 를 `status: "active"` 로 직접 심는 시험: `e2e/arena1-split-stage.spec.ts`(TID `arena1-e2e-tournament`, 제목 "ARENA-1 스플릿 무대") · `c1-arena-flow` · `c2-crown-card-flow` · `c2-crown-mobile-320` · `c3-ranking` · `hf3-guest-run` · `run1-daily-run-limit` · `thumb1-pitch`.
- 미리보기와 실서비스가 같은 Firebase 프로젝트를 쓴다 → 시험 대회가 실서비스 목록에도 잡힌다.
- 시험마다 `afterAll` 정리는 있다. CI가 취소·시간 초과로 끊기면 정리가 돌지 않아 남는다(추정 — §3 ①에서 실제 남은 문서와 CI 이력으로 확인).
- 공개 목록 쿼리: `lib/pitch/pitchStore.ts` · `lib/records/recordsData.ts` · `lib/seo/sitemapData.ts` · `components/launch/FeaturedTournament.tsx` (모두 `status == "active"`).

## 3. 할 일 (브랜치 `fix/ops-fix-1` → PR → 대표 병합. main 직접 push 금지)
① **조사 먼저 · 쓰기 없음** — 실서비스 Firestore에 남은 시험 대회를 찾는다: 위 시험들의 TID 목록 + `hostUid == "seed-operator"` + 제목·문서 id에 e2e/E2E/test가 든 것. 표(문서 id · 제목 · 생성 시각 · 어느 시험 것인지 · 딸린 contestants 수)로 보고. 가능하면 어느 CI 실행이 끊겨 남겼는지 GitHub Actions 이력에서 찾는다.
② **정리 스크립트** `functions/scripts/clear-e2e-leftovers.mjs` — 기본은 미리 보기(dry-run, 지울 목록만 출력), `--apply` 때만 지움. 지우는 것: 그 대회 문서 + 그 대회의 `contestants` · `votes` · `roundProgress` · `bracket_seeds` · `tournament_runs` · `crown_cards` · `ranking_cache` · `guest_runs` 안의 그 대회 흔적. **지우지 않는 것: 사용자 계정·익명 계정(2026-10-18 대표 결정), 진짜 대회.** 열쇠는 `GOOGLE_APPLICATION_CREDENTIALS=~/wc48-keys/admin-key.json` (기존 `clear-waitlist-test.mjs` 와 같은 방식). 스크립트가 처음에 연결된 프로젝트 id를 출력할 것.
③ **재발 방지**
  - a. 시험이 심는 모든 대회 문서에 `e2e: true` 를 넣는다(공용 도우미로 모아도 좋다).
  - b. 순수 함수 하나 `isPublicTournament(doc, deployEnv)` — 실서비스(production 배포)면 `e2e === true` 를 뺀다, 미리보기·로컬이면 그대로. §2의 공개 목록 네 곳이 모두 이 함수를 지난다(쿼리 조건이 아니라 받아 온 뒤 거르기 → 새 색인 불필요). 사이트맵(서버)과 화면(브라우저) 모두 같은 함수. 유닛 시험 포함.
  - c. 고아 시험 방지 장치(`lib/__tests__/ci/e2eWiring.test.ts`)처럼, `e2e/` 파일에서 `tournaments/` 에 쓰면서 `e2e: true` 가 없으면 빨강이 되는 유닛 시험.
  - d. Playwright 전역 마무리(globalTeardown)에서 `e2e == true` 이고 만든 지 2시간 넘은 대회만 쓸어 낸다(동시에 도는 다른 CI 실행의 대회는 건드리지 않게).
  - e. 앞으로 만들 아레나 홈(ARENA-2)도 b의 함수를 쓰도록 `docs/` 또는 CLAUDE.md 의 공개 목록 규칙에 한 줄.
④ 원장: §6 그대로 `outputs/LEDGER_D-63~D-66_…` 의 **D-63~D-66 네 항목 전부**를 원장 맨 끝에 붙인다(이 PR이 원장 옮김 담당).

## 4. 멈출 곳 (STOP · 보고 후 대표 답 기다림)
- §3 ① 표가 나오면 멈춘다. 지울 목록에 진짜 대회처럼 보이는 것이 하나라도 있으면 표에 표시.
- 스크립트는 대표가 직접 실행한다. 보고에 **명령을 한 줄씩 따로 코드 상자**로: (1) 미리 보기 실행 (2) `--apply` 실행 (3) 다시 미리 보기로 0건 확인. 각 상자 위에 "왜 하는지" 한 줄.

## 5. 끝났다고 말하려면 (Done)
- [ ] 유닛·규칙 시험 + 해당 E2E 전부 초록, PR CI 초록, `git push` 확인
- [ ] 미리보기 배포에서 시험 대회가 여전히 보이고 시험이 통과함(시험을 깨지 않았다는 증거)
- [ ] 대표 스크립트 실행 뒤 실서비스 피치 · `/records` · `sitemap.xml` 에 시험 대회 0 — 스모크(같은 경로를 직접 걸어 본 사전 점검) 결과 표를 보고한 뒤에만 대표 눈검사 요청
- [ ] 화면 문구 변경 없음(있으면 커밋 전 대표 승인)

## 6. 하지 말 것
익명 계정·사용자 계정 삭제 · 시험용 Firebase 분리(런칭 후 과제) · 진짜 대회 문서 변경 · 랭킹 산식·발표 시각 변경 · 새 npm 패키지 · 범위 밖 정리.
