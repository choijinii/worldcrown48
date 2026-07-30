# 조사 태스크 — C-1·G-1 E2E 본체 실패 4건 (다음 세션용)

| 항목 | 값 |
|---|---|
| 작성 | 2026-07-30 (ND-1.1 라이브 검증 후속 세션) |
| 분리 배경 | PR #49(frozen-preview 함정 일괄 제거) 머지 후, **프리뷰 함정과 무관한** 각 모듈 E2E 본체 실패가 정확히 드러남 |
| 스코프 | **조사 전용.** 원인(앱 회귀 vs 스펙 노후) 규명 → 각 모듈 소관 수정. ND-1/CI-fix 스코프 밖 |
| ⚠️ 전제 | 아래 실패들은 **프리뷰 해석 함정이 아니다.** 4개 워크플로우 모두 `Resolve … Preview URL` + `Wait for Preview reachability` 스텝은 **통과**(✓)했고, 실패는 **E2E 테스트 본체**에서 발생. 즉 올바른(이 커밋의) 프리뷰에 대한 실제 실패 |

> **맥락:** PR #49 이전에는 고정 `*_PREVIEW_URL` 시크릿이 stale 배포를 가리켜 CI 결과 자체가 무의미했다(`feedback-c2-preview-url-pinned`). 이제 각 워크플로우가 자기 커밋의 프리뷰를 테스트하므로, 아래 red는 **신뢰할 수 있는 실제 실패**다. PR #49가 실패를 "만든" 게 아니라 "정직하게 드러낸" 것.

증거 출처: PR #49 run — C-1 `30546736137` · G-1 `30546736135` (`gh run view <id> --log-failed`).

---

## 실패 4건

### 1. G-1 `e2e/g1-admin-dashboard.spec.ts:100` — non-authenticated /admin → needs-signin card
- **에러:** `expect(locator('.gate-card[data-st="needs-signin"]')).toBeVisible()` 실패 (미표시).
- **선존 여부:** **PR #47에서도 실패**(당시 stale 프리뷰라 원인 불명이었음). 즉 최소 ND-1 이전부터 존재.
- **가설(우선순위 순):**
  1. `e2e/global-setup.ts`가 커스텀 토큰으로 **로그인된 storageState**를 저장 → 이 테스트의 페이지 컨텍스트가 인증 상태라 `/admin`이 needs-signin이 아니라 대시보드/forbidden 리다이렉트를 렌더. → 이 케이스는 **비로그인 컨텍스트**로 열어야 함(storageState 미적용 or 새 컨텍스트).
  2. `AdminAuthGuardLight`의 gate-card 마크업/`data-st` 속성이 스펙 기대와 달라짐.
- **볼 곳:** `e2e/g1-admin-dashboard.spec.ts:100` · `e2e/global-setup.ts`(storageState) · `components/admin/dashboard/AdminAuthGuardLight.tsx`(`.gate-card[data-st]`).
- **재현:** `PREVIEW_URL=<이 커밋 프리뷰> npm run test:e2e -- e2e/g1-admin-dashboard.spec.ts` + 트레이스(`test-results/**/trace.zip`)로 실제 렌더 상태 확인.

### 2. G-1 `e2e/g1-admin-dashboard.spec.ts:124` — SiteMapSheet ☰ → Domain 6 live link ("Coming soon cleared")
- **에러:** Domain 6(Admin)가 SiteMapSheet에서 **live 링크가 아님**(스펙은 "Coming soon" 해제 기대).
- **가설:** 배포된 앱에서 Domain 6가 여전히 "Coming soon"으로 게이팅됨 vs 스펙이 live 전환을 이미 기대. `lib/layout/domains.ts`의 Domain 6 상태와 스펙 기대 불일치일 가능성.
- **볼 곳:** `e2e/g1-admin-dashboard.spec.ts:124` · `lib/layout/domains.ts` · SiteMapSheet 컴포넌트(`components/layout/**`).
- **판정 포인트:** 앱이 맞고 스펙이 낡았는지(도메인 상태 값 확인), 아니면 앱 회귀인지.

### 3. C-1 `e2e/c1-anon-gate.spec.ts:127` — 5/5 Voter의 6번째 NEW Tournament → daily-limit LoginModal
- **에러:** `expect(getByTestId('vote-left')).toContainText("P1")` 실패 — `vote-left` 지표에 기대 substring `"P1"` 없음.
- **가설:**
  1. 프리뷰에 **5/5 상태 Voter 시드가 없음** → daily-participation 카운터/`vote-left` 표기가 스펙 전제와 다름(시드 의존 테스트).
  2. `vote-left` 표기 포맷이 바뀜(예: "P1" 라벨 체계 변경).
- **볼 곳:** `e2e/c1-anon-gate.spec.ts:127` + 그 시드 블록(firebase-admin 시드) · daily-participation 로직(`functions/src/core/participation.ts`, `lib/voteGate.ts`) · `vote-left` 렌더 컴포넌트.
- **재현:** 시드(5개 Tournament 참가 상태) 선행 여부 확인이 핵심.

### 4. C-1 `e2e/c1-arena-flow.spec.ts:264` — mobile 320px 매치 렌더 (wireframe compare 캡처)
- **에러:** `expect(getByText('No Vote Rate %')).toBeVisible()` 실패 (320px에서 미표시).
- **가설:**
  1. 매치 화면에 **활성 Tournament 시드**가 필요한데 프리뷰에 없어 매치가 안 뜸(→ 문구도 없음).
  2. "No Vote Rate %" 안내 문구/위치가 바뀜(불변 원칙 #8 관련 표기 — Vote Rate 노출 금지 문구).
- **볼 곳:** `e2e/c1-arena-flow.spec.ts:264` · 매치 화면 컴포넌트(`components/arena/**`) · 320px 레이아웃.

---

## 공통 다음 단계
1. 각 실패의 **Playwright 트레이스/스크린샷**을 먼저 열기(`gh run download` 또는 `test-results/`). 실제 렌더 DOM을 보고 "앱 회귀 vs 스펙 노후"를 가른다.
2. **시드 의존** 테스트(C-1 #3·#4, 일부 G-1)는 프리뷰에 필요한 시드가 있었는지부터 확인 — 시드 부재면 테스트 전제 문제(스펙/CI 시드 보강), 시드 있는데 실패면 앱 회귀.
3. G-1 #1은 **global-setup 인증 상태 간섭** 가설을 먼저 검증(비로그인 컨텍스트 필요 여부).
4. 결과에 따라 모듈별(C-1 / G-1) 수정 PR로 분리. **frozen-preview 재도입 금지** — 프리뷰 해석은 이미 head-SHA로 올바름.

## 관련
- 프리뷰 함정 수정: PR #49 (`fix/ci-preview-headsha`) — C1·C2·D1·G1 head-SHA 해석 통일. D-1·C-2는 이 수정으로 완전 green.
- 참조 메모리: `feedback-c2-preview-url-pinned` · `feedback-workflow-spec-scope`.

*© 2026 WorldCrown48 | 조사 메모 (다음 세션용) | CONFIDENTIAL*
