# Handoff Brief — C-3 Sequel: Visual Polish + Spec Correction (PR #28 보강)

> **From**: Cowork (시각 검증·사양 누락 발견·재정의) · **To**: Claude Code (실코드, auto mode)
> **Date**: 2026-06-26 · **Author**: 대표 · **Version**: v1.0
> **작업 브랜치**: `feat/c3-ranking` (PR #28에 commit 추가 — 새 브랜치 X)
> **워크트리**: `/Users/jinii/Projects/wc48-c3` (이미 존재, C-3 원본 핸드오프와 같은 위치)
> **PR**: 기존 PR #28 그대로. 머지 시점 = 본 sequel 완료 후 통합 squash merge.
>
> **목표 산출물 (7 work items, 6 Phase)**:
> - W-1 카피 수정 (`absolute counts` 오역 제거)
> - W-2 T-1 anomaly Voter UI 완전 제거 (`ranking_cache` 스키마 변경 · `admin_alerts`만 유지)
> - W-3 랭킹 명수 — 데스크톱 active 전체 · 모바일 top 12
> - W-4 골드 보더 1px → 2px + glow shadow
> - W-5 왕관 opacity 0.5 → 0.85 + width 52 → 64 + drop-shadow
> - W-6 **아레나 모듈 nav 신규** (4 tab: VS Battle · Crown Card · Ranking · Newsroom)
> - W-7 **Ranking 공개 시점 = Tournament Deadline 후만** + "locked" state 추가 + 시드 옵션 추가

---

## ⚠️ 이 핸드오프는 PR #28의 연속이다 (재시작 아님)

C-3 원본 핸드오프(`docs/handoffs/C3-ranking-handoff.md` v2.0)에서 5 Phase로 완성된 코드(`5b8bb58 → 3d06840 + 7a34ff3`)는 **그대로 유지**합니다. 본 sequel은 그 위에 **6 Phase commit을 추가**해서 시각 검증·사양 재정의를 반영합니다.

**왜 별도 PR이 아니라 같은 PR #28에 commit 추가인가:**
- W-2(T-1 제거)는 `ranking_cache` 스키마 변경 → C-3가 만든 스키마를 **production 전에** 바로잡는 게 깨끗 (한 번도 main에 안 들어간 상태로 수정)
- W-6(모듈 nav)는 와이어프레임 사양 누락 — 원본 누락이 아니라 핸드오프 결함이었으므로 같은 PR에서 수정이 맞음
- W-7(Deadline 후만 공개)은 ADR-0006 정정 — main에 가기 전에 수정해야 ADR이 일관됨

**왜 C-3 PR 머지를 미루는가** ([[project-c3-followup-decision-2026-06-26]]):
- 디자이너 출신 대표 시각 검증에서 8건 결함 발견 — 그대로 머지하면 production에 결함 노출
- 카피 모순·anomaly UX 결함은 사용자 신뢰 직결 — main 진입 전 정정 필수

---

## §0. 자가 검증 (코드 작성 전 반드시 모두 ✓)

```bash
# 0.1 위치 + 브랜치 + 선행 PR 상태
git branch --show-current                    # 기대: feat/c3-ranking
git log --oneline -8                         # 기대 최신: 7a34ff3 ci(c3): scoped E2E ... → 3d06840 → 9ad7fc3 → e2d0c78 → c69b733 → 5b8bb58 → 14fcfd9 → ...

# 0.2 핵심 파일 존재
test -f docs/handoffs/C3-ranking-handoff.md && echo "✓ C-3 원본 핸드오프 (참고용)"
test -f docs/handoffs/C3-sequel-handoff.md && echo "✓ 본 핸드오프"
test -f "docs/design/wireframes/Domain 3 · The Arena.html" && echo "✓ D3 wireframe"
test -f docs/adr/0006-c3-ranking-cache-model.md && echo "✓ ADR-0006 (본 PR에서 정정 예정)"

# 0.3 현재 ranking_cache 스키마 — anomalyTag/anomalyDetail 존재 확인
grep -nE "anomalyTag|anomalyDetail" lib/ranking/rankingTypes.ts functions/src/core/scheduleRankingCacheCore.ts
# 기대: 둘 다 등장 (제거 대상)

# 0.4 현재 RankingView state union — "anomaly" 포함 확인
grep -nE "type RankState|state.*anomaly" components/ranking/RankingView.tsx
# 기대: 4 state union (loaded/loading/empty/anomaly) — 본 PR에서 anomaly 제거 + locked 추가

# 0.5 wireframe nav 사양 위치 (W-6 기준 라인)
grep -nE "tab\".*data-s|class=\"tab\"" "docs/design/wireframes/Domain 3 · The Arena.html" | head -8
# 기대: line 591~596에 6 tab — 본 PR에서 4 tab으로 정제 (대표 결정: Round Transition·THE FINAL은 VS Battle sub-state라 제외)

# 0.6 firestore.rules — ranking_cache 현재 조건
grep -nE "ranking_cache|tournamentDeadline" firestore.rules
# 기대: ranking_cache public read (조건 없음) — 본 PR에서 deadline 조건 추가

# 0.7 시드 스크립트 — deadline 옵션 부재 확인
grep -nE "deadline.*Date\.now|--deadline" functions/scripts/seed-c3-preview.mjs
# 기대: deadline = now + 30d 고정 — 본 PR에서 --deadline=past|future 옵션 추가

# 0.8 선행 모듈 페이지 (모듈 nav 통합 대상) 존재
test -f app/arena/\[tournamentId\]/page.tsx && echo "✓ VS Battle 페이지"
test -f app/arena/\[tournamentId\]/champion/page.tsx && echo "✓ Crown Card 페이지"
test -f app/arena/\[tournamentId\]/ranking/page.tsx && echo "✓ Ranking 페이지"
```

하나라도 ✗이면 즉시 STOP하고 대표 보고. ([[feedback-evidence-before-diagnosis]])

---

## §1. Pre-flight Checklist (§0 통과 후)

```
☐ 🛑 docs/mental-model/MENTAL_MODEL.svg — Tournament Deadline 개념 재확인
☐ CLAUDE.md 불변 원칙 8가지 — 특히 #4 AI-Report Footer-Only, #8 Vote Count 금지
☐ LANGUAGE.md — Tournament Deadline, Vote Rate(%), active 상태
☐ docs/handoffs/C3-ranking-handoff.md v2.0 (원본, 참고만) — 5 Phase 완성 코드
☐ docs/adr/0006-c3-ranking-cache-model.md — 본 PR에서 anomalyTag denormalization 결정 철회
☐ docs/design/wireframes/Domain 3 · The Arena.html — UI/UX 진실 공급원
  · line 591~596 tabstrip 사양 (6 tab → 본 PR은 4 tab으로 정제, 대표 결정)
  · line 758 ranking 카피 원본 ("fan share, no absolute counts" 영문 — 본 PR에서 한국어 재번역)
☐ docs/design/WC48_DESIGN_SYSTEM_v2.3.md — Crown Gold #FCD006, 다크 토큰
☐ 메모리 필독:
  · [[project-c3-followup-decision-2026-06-26]] — 본 PR의 결정 5건 (대표)
  · [[feedback-visual-verification-incomplete]] — 디자이너 시각 점검 의무
  · [[feedback-preview-no-dev-nav]] — 시각 검증 워크플로우 결함
  · [[feedback-firestore-composite-index]] — 새 query 패턴 의무 검증
  · [[feedback-seed-date-anti-pattern]] — 시드 동적 날짜
  · [[feedback-workflow-spec-scope]] — c3-e2e.yml 이미 추가됨 (7a34ff3)
  · [[feedback-i18n-test-determinism]] — E2E ?lang= 강제
  · [[feedback-test-isolation-per-voter]] — 시드 재실행 시 votes·roundProgress 사전 삭제
```

---

## §2. 7 Work Items — 명확한 사양

### W-1. 카피 수정 (Phase A)

**대상 파일:**
- `app/arena/[tournamentId]/ranking/page.tsx` — `labels` prop 객체
- (i18n 사전이 별도 파일이면 그쪽)

**변경:**
```diff
- note: "VOTE RATE (%) · 투표 완료 후 공개 · 절대 수치 비공개"
+ note: "VOTE RATE (%) · 투표 완료 후 공개"
```

영문도 동일하게:
```diff
- note: "VOTE RATE (%) · published after vote close · no absolute counts"
+ note: "VOTE RATE (%) · published after vote close"
```

**왜:**
- "절대 수치 비공개"는 원본 영문 `fan share, no absolute counts`의 직역인데 한국어로 보면 **의미 불명** ("절대 안 공개?" "Vote Count 절대 X?" 혼동)
- "투표 완료 후 공개"만 남기면 W-7(deadline 후만 공개)과 동작이 정확히 일치 → 모순 해소
- Vote Count 금지 원칙(CLAUDE.md 원칙 #8)은 코드·rules로 강제되어 있지 카피로 알릴 사항 아님

**테스트:** vitest snapshot 또는 E2E `expect(page.locator("text=절대 수치")).toHaveCount(0)`

---

### W-2. T-1 Anomaly Voter UI 완전 제거 (Phase B + ADR-0006 정정)

**핵심 변경: `ranking_cache` 스키마에서 anomaly 필드 삭제, RankingView에서 anomaly state 제거.**

**대상 파일:**
1. `lib/ranking/rankingTypes.ts` — `RankingCache` 인터페이스에서 `anomalyTag`, `anomalyDetail` 필드 제거
2. `functions/src/core/scheduleRankingCacheCore.ts` — `buildRankingUpdate`가 ranking_cache 문서에 anomaly 필드 안 쓰도록 수정. **단 `admin_alerts` 작성은 그대로 유지** — anomalyRules는 cron 내부에서 여전히 실행되고, 결과는 admin_alerts에만 기록됨.
3. `lib/ranking/anomalyRules.ts` — **유지** (admin 전용). 다만 `buildAlertDetail`은 admin_alerts.detail에만 쓰임을 주석으로 명시.
4. `components/ranking/RankingView.tsx`:
   - `RankState` union에서 `"anomaly"` 제거 → `"loaded" | "loading" | "empty" | "locked"` (locked는 W-7에서 추가)
   - AnomalyBadge import 제거
   - state="anomaly" 분기 제거
5. `components/ranking/AnomalyBadge.tsx` — **삭제** (Voter UI에서 안 쓰이므로). admin 대시보드(G-1, 미구현)가 추후 별도 컴포넌트 사용.
6. `e2e/c3-ranking.spec.ts`:
   - `anomaly state` 테스트 케이스 삭제 (또는 admin 전용 시드로 변경 — 본 PR scope 밖)
   - `test-c3-anomaly` 시드는 유지 (admin_alerts 생성 검증용으로 재해석)
7. `docs/adr/0006-c3-ranking-cache-model.md`:
   - 「Decision」 섹션에 「**Amendment (2026-06-26)**」 추가:
     > anomalyDetail denormalization 결정은 철회한다. ranking_cache는 순수 Voter 데이터(rankings + tournamentTitle + generatedAt + lastFreezeAt)만 보관하고, anomaly 신호는 admin_alerts 컬렉션을 통해 운영자만 접근한다. 이유: Voter UI에서 1위 ≥60%가 "이상 징후"로 표시되면 정당한 인기 1위도 부정 의심 신호로 읽혀 브랜드·공정성 신뢰 훼손.

**왜:** 대표 결정 — 정당한 1위 인기도 60% 넘을 수 있는데, 한국어 "이상 징후"가 부정 의심으로 읽힘. Voter UI에서 완전 분리. admin_alerts는 운영자 채널로 유지.

**테스트:**
- Phase B vitest: `expect(rankingCache).not.toHaveProperty("anomalyTag")` + `expect(rankingCache).not.toHaveProperty("anomalyDetail")`
- Phase D E2E: `expect(page.locator("text=이상 징후")).toHaveCount(0)` + `expect(page.locator("text=AnomalyBadge")).toHaveCount(0)` (cross-page regression guard)

---

### W-3. 랭킹 명수 — 데스크톱 active 전체 / 모바일 top 12 (Phase C)

**대상 파일:**
- `lib/ranking/computeRankings.ts` — 변경 없음 (0-vote 제외 + active 전체 반환은 현 동작)
- `components/ranking/RankList.tsx` — CSS @media 추가
- `components/ranking/RankingView.tsx` — 기존 `entries` 전부 RankList에 넘김 (제한 없음)

**CSS 추가 (RankingView `<style>` 안):**
```css
/* 모바일에서는 top 12만 표시 (대표 결정 2026-06-26) */
@media (max-width: 520px) {
  .rank-row:nth-child(n+13) {
    display: none;
  }
}
```

**왜:** 데스크톱은 active contestants 전부 (Voter가 자기 후보 찾기 쉽도록). 모바일은 화면 좁아 top 12만 (스크롤 부담 완화).

**테스트:**
- Phase C: vitest는 computeRankings 단위 테스트 그대로 유지 (변경 없음)
- Phase D E2E: viewport mobile (375px)에서 13번째 row 비가시 확인 — `expect(page.locator('.rank-row').nth(12)).not.toBeVisible()`

---

### W-4. 골드 보더 200% + glow (Phase D)

**대상 파일:** `components/ranking/RankingView.tsx` (`<style>` 안)

```diff
.rank-row.top {
-  border: 1px solid var(--color-gold-bright);
+  border: 2px solid var(--color-gold-bright);
+  box-shadow: 0 0 24px rgba(252, 208, 6, 0.25);
}
```

**왜:** 디자이너 출신 대표 시각 점검 — 어두운 네이비 배경에서 1px 골드 보더는 약함. 2px + glow로 1위 위계 명확히. Crown Gold(#FCD006) 토큰 유지 — 새 색상 도입 X.

---

### W-5. 왕관 opacity + drop-shadow (Phase D)

**대상 파일:** `components/ranking/RankingView.tsx` (`<style>` 안의 `.rank-empty img`)

```diff
.rank-empty img {
-  width: 52px;
-  opacity: 0.5;
+  width: 64px;
+  opacity: 0.85;
+  filter: drop-shadow(0 0 12px rgba(252, 208, 6, 0.18));
}
```

**왜:** 0.5 opacity로 디자이너 눈에 거의 안 보임 ([[feedback-visual-verification-incomplete]]). 0.85 + Crown Gold glow로 "은은하지만 명확히 인지" 균형.

---

### W-6. 아레나 모듈 nav 신규 — 4 tab (Phase E)

**4 tab 사양 (대표 결정 — 와이어프레임 6 tab에서 정제):**
| Tab | 경로 | 상태 |
|---|---|---|
| 1. VS Battle | `/arena/[id]` | ✅ 구현됨 (C-1) |
| 2. Crown Card | `/arena/[id]/champion` | ✅ 구현됨 (C-2) |
| 3. Ranking | `/arena/[id]/ranking` | ✅ 구현됨 (C-3) |
| 4. Newsroom | `/arena/[id]/newsroom` | ❌ 미구현 (C-4·C-5) → **disabled tab + "Coming soon" 배지** |

> Round Transition·THE FINAL은 VS Battle의 sub-state이지 별도 tab 아님. Voter는 자동 advance로 진행하므로 nav 불필요. ([[project-c3-followup-decision-2026-06-26]])

**대상 파일 (신규):**
- `components/arena/ModuleNav.tsx` — 4 tab 컴포넌트. `usePathname()`으로 현재 active tab 자동 감지. Newsroom은 `aria-disabled="true"` + cursor:not-allowed + "Coming soon" 마이크로카피.
- `components/arena/ModuleNav.module.css`는 만들지 말고 RankingView 패턴처럼 컴포넌트 내부 `<style>` 또는 globals.css 토큰 활용 (디자인 시스템 일관성).

**대상 파일 (수정 — 3 페이지에 ModuleNav 통합):**
- `app/arena/[tournamentId]/page.tsx` (VS Battle)
- `app/arena/[tournamentId]/champion/page.tsx` (Crown Card)
- `app/arena/[tournamentId]/ranking/page.tsx` (Ranking)

**위치 결정:**
- 페이지 상단, 헤더 바로 아래
- VS Battle 화면은 풀스크린 vote가 핵심 — sticky 사용 X (vote 흐름 방해)
- 일반 scroll로 따라가는 방식 (scroll 시 사라짐)
- 모바일에서는 가로 scroll 가능한 chip 스타일

**스타일 가이드 (디자이너 결정):**
- 다크 테마 — 아레나 페이지는 모두 Domain 3 다크
- active tab: Crown Gold #FCD006 border + 골드 텍스트
- inactive tab: 회색 텍스트 + 투명 border
- disabled (Newsroom): opacity 0.4 + cursor:not-allowed + 우측에 "Coming soon" 작은 chip

**테스트:**
- Phase E vitest: ModuleNav 단위 테스트 — usePathname mock 후 active tab 강조 확인, disabled 클릭 무반응
- Phase F E2E: 3 페이지에서 각각 ModuleNav 렌더 확인 + 클릭 시 라우팅 확인 + Newsroom 클릭 무반응

---

### W-7. Ranking 공개 시점 = Tournament Deadline 후 (Phase F)

**핵심 변경: Deadline 전이면 "locked" state, Deadline 후이면 기존 loaded/empty.**

**대상 파일:**

1. `components/ranking/RankingView.tsx`:
   - `RankState` union에 `"locked"` 추가 → 최종: `"loaded" | "loading" | "empty" | "locked"`
   - locked state 렌더: 새 컴포넌트 `RankLocked` 신규 — "토너먼트 진행 중 · 마감 후 공개됩니다" + 시계/자물쇠 아이콘 + Deadline 표시
2. `components/ranking/RankLocked.tsx` — 신규 컴포넌트:
   ```tsx
   export function RankLocked({ deadlineText }: { deadlineText: string }) {
     return (
       <div className="rank-locked" data-testid="rank-locked">
         <img src="/brand/wc48-lock-circle-outline.svg" alt="" />
         <div className="rl-title">토너먼트 진행 중</div>
         <div className="rl-sub">마감 후 공개됩니다 · {deadlineText}</div>
       </div>
     );
   }
   ```
   - 일러스트 아이콘은 디자인 시스템에서 새로 만들어야 함 → 일단 wc48-crown-circle-outline.svg를 임시 사용하거나, opacity 0.85로 자물쇠 SVG 임시. 본 PR에서는 자물쇠 SVG가 없으면 새로 SVG 코드 인라인 작성 (Crown Gold stroke).
3. `app/arena/[tournamentId]/ranking/page.tsx`:
   - Tournament doc subscribe → `tournamentDeadline > now`이면 state="locked"
   - Deadline 후이면 기존 흐름 (ranking_cache subscribe)
4. `firestore.rules`:
   ```diff
   match /ranking_cache/{tournamentId} {
   - allow read: if true;
   + allow read: if get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.tournamentDeadline < request.time;
     allow write: if false;
     match /history/{generationSequence} {
   -   allow read: if true;
   +   allow read: if get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.tournamentDeadline < request.time;
       allow write: if false;
     }
   }
   ```
5. `tests/rules/ranking-rules.test.ts`:
   - 새 시나리오 추가: deadline > now → permission-denied / deadline <= now → allow
6. `functions/scripts/seed-c3-preview.mjs`:
   - CLI 옵션 추가 — `--deadline=past|future` (기본 future = 현 동작). past는 deadline = now - 1d.
   - 시각 검증 시 `--deadline=past`로 재실행하면 Loaded·Empty가 보임. 단 운영 후 Tournament는 future 시드만 의미 있음 (cron 트리거).
   - README 주석에 명시.

**Defense in depth:**
- Layer 1: UI에서 deadline 체크 → locked state 렌더 (UX)
- Layer 2: firestore.rules에서 deadline 체크 → admin SDK 우회 외엔 client read 차단 (security)
- 둘 다 통과 시에만 데이터 노출

**테스트:**
- Phase F rules: `tests/rules/ranking-rules.test.ts` — deadline 시나리오 2건 추가
- Phase F E2E: 시드 재실행으로 `test-c3-loaded-future`(deadline+30d, locked 검증) + `test-c3-loaded-past`(deadline-1d, loaded 검증) 둘 다 시각 확인
- vitest 단위 — page.tsx 단위 테스트는 안 만들고 E2E로 커버

**왜 Tournament Deadline 후 공개로 바꾸나:** 대표 결정 — 순수·임팩트 우선. 마감 전 ranking 노출은 표심에 영향 (선두 후보로 쏠림 = 풍토 위험). 마감 후 공개로 "공정한 한 표"의 무게 보존 + Crown Card 발표 효과 극대화.

---

## §3. 작업 위치 + 산출물 (Phase별 commit 기준)

| Phase | commit message 형식 | 추가/수정 파일 |
|---|---|---|
| **A** | `fix(c3): copy — drop ambiguous "no absolute counts"` | `app/arena/[tournamentId]/ranking/page.tsx` (labels) · `e2e/c3-ranking.spec.ts` (regression guard) |
| **B** | `feat(c3): remove anomaly from ranking_cache · admin_alerts only` | `lib/ranking/rankingTypes.ts` · `functions/src/core/scheduleRankingCacheCore.ts` · `functions/src/_ranking/*` (mirror) · `components/ranking/RankingView.tsx` · `components/ranking/AnomalyBadge.tsx` (DEL) · `e2e/c3-ranking.spec.ts` · `docs/adr/0006-c3-ranking-cache-model.md` |
| **C** | `feat(c3): mobile responsive — top 12 only on ≤520px` | `components/ranking/RankingView.tsx` (CSS @media) |
| **D** | `feat(c3): top row 2px gold border + crown opacity 0.85 + glow` | `components/ranking/RankingView.tsx` (CSS) |
| **E** | `feat(arena): module nav — 4 tab (VS Battle · Crown Card · Ranking · Newsroom)` | `components/arena/ModuleNav.tsx` (NEW) · `app/arena/[tournamentId]/page.tsx` · `app/arena/[tournamentId]/champion/page.tsx` · `app/arena/[tournamentId]/ranking/page.tsx` · `lib/__tests__/arena/ModuleNav.test.tsx` (NEW) · `e2e/c3-ranking.spec.ts` (nav regression) |
| **F** | `feat(c3): ranking gated by Tournament Deadline · locked state` | `components/ranking/RankingView.tsx` · `components/ranking/RankLocked.tsx` (NEW) · `app/arena/[tournamentId]/ranking/page.tsx` · `firestore.rules` · `tests/rules/ranking-rules.test.ts` · `functions/scripts/seed-c3-preview.mjs` (deadline 옵션) |

각 Phase는 **RED → GREEN 한 commit**으로 종료. C-2/C-3 패턴 그대로 ([[project-c2-done-2026-06-24]]).

---

## §4. 데이터 모델 변경 — RankingCache 인터페이스

**Before (현재, 5b8bb58):**
```typescript
export interface RankingCache {
  tournamentId: string;
  tournamentTitle: string;
  rankings: RankingEntry[];
  anomalyTag: AnomalyTag | null;     // ← 제거
  anomalyDetail: string | null;       // ← 제거
  generatedAt: TimestampLike;
  lastFreezeAt: TimestampLike | null;
}
```

**After (W-2 적용):**
```typescript
export interface RankingCache {
  tournamentId: string;
  tournamentTitle: string;
  rankings: RankingEntry[];
  generatedAt: TimestampLike;
  lastFreezeAt: TimestampLike | null;
}
```

**admin_alerts 변경 없음** — 운영자만 보는 채널 그대로 유지. anomalyRules.ts는 functions 안에서 cron이 호출하고 결과는 admin_alerts에만 기록.

---

## §5. firestore.rules 변경 (W-7)

```js
match /ranking_cache/{tournamentId} {
  allow read: if exists(/databases/$(database)/documents/tournaments/$(tournamentId))
              && get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.tournamentDeadline < request.time;
  allow write: if false;

  match /history/{generationSequence} {
    allow read: if exists(/databases/$(database)/documents/tournaments/$(tournamentId))
                && get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.tournamentDeadline < request.time;
    allow write: if false;
  }
}
```

**비용 영향:** ranking 페이지 1회 방문당 `Tournament` 문서 read 1건 추가 (rules의 get 호출). active Tournament 사용자 수 × 페이지 방문 횟수 = 추가 read 비용. Firestore free tier 50K reads/day 기준 평가 — MVP1 트래픽에서는 무시 가능.

**admin_alerts 규칙 변경 없음.**

---

## §6. UI 컴포넌트 변경 요약

| 컴포넌트 | 변경 |
|---|---|
| `RankingView.tsx` | state union 변경 (anomaly 제거, locked 추가), AnomalyBadge import 제거, CSS @media + 골드 보더 + 왕관 opacity |
| `RankList.tsx` | 변경 없음 (CSS만 RankingView 안에서 처리) |
| `RankEmpty.tsx` | 변경 없음 (CSS만 RankingView 안에서 처리) |
| `AnomalyBadge.tsx` | **삭제** |
| `RankLocked.tsx` | **신규** (locked state 렌더) |
| `ModuleNav.tsx` | **신규** (4 tab, usePathname 기반 active 감지) |
| `RankingHeader.tsx` | 변경 없음 (카피는 labels prop으로 page에서 주입) |
| `RankSkeleton.tsx` | 변경 없음 |

---

## §7. 카피 (i18n)

```typescript
// app/arena/[tournamentId]/ranking/page.tsx
const labels: RankingViewLabels = {
  kicker: lang === "ko" ? "랭킹 · RANKING" : "RANKING · 랭킹",
  note: lang === "ko"
    ? "VOTE RATE (%) · 투표 완료 후 공개"        // 절대 수치 비공개 삭제
    : "VOTE RATE (%) · published after vote close",
  deadlineLabel: lang === "ko" ? "토너먼트 마감" : "Tournament closes",
  // anomalyTitle 필드 삭제 (W-2)
  // 추가: locked state 카피 (W-7)
  lockedTitle: lang === "ko" ? "토너먼트 진행 중" : "Tournament in progress",
  lockedSub: lang === "ko" ? "마감 후 공개됩니다" : "Published after the tournament closes",
};
```

---

## §8. 시드 스크립트 업데이트 (W-7 보조)

`functions/scripts/seed-c3-preview.mjs`에 CLI 옵션 추가:

```javascript
const args = process.argv.slice(2);
const deadlineMode = args.find(a => a.startsWith("--deadline="))?.split("=")[1] ?? "future";
const deadlineMs = deadlineMode === "past"
  ? Date.now() - 1 * 86_400 * 1000      // 1일 전
  : Date.now() + 30 * 86_400 * 1000;    // 30일 후 (기본)
```

**사용법:**
```bash
# 시각 검증용 (Loaded·Empty 시각 확인)
GOOGLE_APPLICATION_CREDENTIALS=... PREVIEW_URL=... node functions/scripts/seed-c3-preview.mjs --deadline=past

# 운영 시뮬레이션 (cron 트리거 검증)
GOOGLE_APPLICATION_CREDENTIALS=... PREVIEW_URL=... node functions/scripts/seed-c3-preview.mjs --deadline=future
```

**주의:** `.git/info/exclude`에 등록되어 있어 commit 안 됨. 본 PR에서도 변경 commit X — 워크트리 로컬에서만 수정.

---

## §9. Trap·주의 (11건)

1. **anomaly 코드 흔적 0건 보장** — `grep -rn "anomalyTag\|anomalyDetail\|AnomalyBadge" components/ app/ functions/src/scheduleRankingCacheCore* lib/ranking/rankingTypes*` 결과 0건. 단 admin_alerts·anomalyRules 안의 참조는 OK.
2. **ranking_cache history 스키마 일관성** — history 문서도 anomaly 필드 없는 새 스키마. 기존 시드된 history는 stale → 시드 재실행으로 갱신.
3. **시드 멱등성 깨짐 방지** — `--deadline=past`로 재시드하면 기존 future 시드 데이터와 충돌 가능. 시드 스크립트는 target별 delete-then-reseed 패턴 유지.
4. **rules의 get() 비용** — `get(/databases/$(database)/documents/tournaments/$(tournamentId))`이 ranking_cache read마다 발생. emulator test에서도 시뮬레이션 (vitest.rules.config.ts).
5. **Deadline 경계 시점** — `tournamentDeadline === now` 시 어떻게? `< request.time`이라 정확히 같으면 read X. 1초 차이로 풀림. 사용자 입장에선 자연스러움.
6. **ModuleNav active tab 결정** — pathname `startsWith` 사용 시 `/arena/[id]`가 모든 sub-route prefix → 정확한 match 필요. `pathname === '/arena/...'` exact 또는 `endsWith('/ranking')`/`/champion`/`/newsroom` 패턴.
7. **Newsroom disabled 클릭 처리** — `<Link>` 사용 시 disabled 효과 X. `<button>` + onClick 비활성 + `aria-disabled`로 처리.
8. **C-1/C-2 페이지에 ModuleNav 추가 시 회귀** — VS Battle E2E가 첫 화면 selector를 깨지 않게. `data-testid="module-nav"`로 격리.
9. **W-2 PR 머지 시 production cron 동작** — 현재 production은 PR #28 미머지 상태라 ranking_cache 컬렉션 자체가 비어있음. 머지 후 cron 처음 실행될 때 새 스키마로 작성 → 마이그레이션 불필요.
10. **시각 검증 시드 잔재** — `test-c3-*` 시드는 production Firebase에 남아있음 (deadline=future). 머지 후 별도 cleanup 명령 또는 deadline 지난 후 자동 정리. PR description에 cleanup 명시.
11. **다국어 결정론** — E2E의 모든 ?lang= 강제 유지. anomaly E2E 케이스 삭제 시 ?lang= 토글 회귀 확인.

---

## §10. PR Description 형식 (Phase F 종료 후 PR #28에 추가 정보)

기존 PR #28 description에 추가:

```markdown
## Sequel (2026-06-26 시각 검증 후 추가)

8건 디자인·사양 결함 발견 → 6 Phase commit으로 정정.

### 통합 결정 (대표 2026-06-26)
1. PR #28 통합 머지 (단독 머지 보류)
2. T-1 anomaly Voter UI 완전 제거 — ranking_cache 스키마 정정, admin_alerts만 유지
3. 랭킹 명수 — 데스크톱 active 전체 / 모바일 top 12
4. Ranking 공개 시점 = Tournament Deadline 후만 (UI + rules defense in depth)
5. 모듈 nav = 4 tab (VS Battle · Crown Card · Ranking · Newsroom)

### Sequel Phase별 commit
- Phase A: ${commitA} — 카피 수정
- Phase B: ${commitB} — anomaly 제거 + ADR-0006 정정
- Phase C: ${commitC} — 모바일 top 12
- Phase D: ${commitD} — 골드 보더 + 왕관 polish
- Phase E: ${commitE} — 4 tab 모듈 nav
- Phase F: ${commitF} — Deadline 게이트 + locked state

### Self-review 결과
- anomaly 코드 흔적 (UI·types·_ranking mirror) 0건 — grep ✓
- ranking_cache 스키마 통일 (history 포함) ✓
- ModuleNav 3 페이지 통합 + active tab 정확 감지 ✓
- locked state UI + rules deadline 게이트 둘 다 통과 ✓
- 시드 --deadline=past 옵션 작동 (visual verification 가능) ✓
- E2E ?lang= 결정론 유지 ✓
- vitest 단위테스트 모두 green ✓

### 배포 후 검증 (머지 직후)
- [ ] firebase deploy --only firestore:rules,firestore:indexes,functions:scheduleRankingCache
- [ ] Cloud Scheduler 다음 실행 시각 확인
- [ ] 시드 cron 1회 강제 실행 → 새 스키마 ranking_cache 작성 확인
- [ ] /arena/{id}/ranking 4 state(loaded·empty·locked·loading) 시각 검증 스크린샷
- [ ] /arena/{id} VS Battle + /arena/{id}/champion Crown Card에서 ModuleNav 회귀 확인
- [ ] test-c3-* 시드 cleanup 또는 deadline 만료 대기
```

---

## §11. Superpowers TDD — Phase A~F 엄수

각 Phase는 다음 패턴:

```
RED   : 테스트 작성 (실패해야 함) — vitest 또는 Playwright
GREEN : 최소 코드로 통과
REFACTOR : 필요 시 정리 (선택)
COMMIT : 한 commit으로 묶음
```

### Phase A · 카피 수정 (RED → GREEN)
- RED: e2e/c3-ranking.spec.ts에 `await expect(page.locator("text=절대 수치")).toHaveCount(0)` 추가 → fail
- GREEN: page.tsx labels에서 카피 제거 → pass
- COMMIT: `fix(c3): copy — drop ambiguous "no absolute counts"`

### Phase B · Anomaly 제거 (RED → GREEN)
- RED: vitest에 `expect(rankingCache).not.toHaveProperty("anomalyTag")` → fail
- GREEN: types + scheduleRankingCacheCore + RankingView + AnomalyBadge 삭제 → pass
- ADR-0006 update + copy-ranking.mjs 재실행으로 mirror 동기화
- COMMIT: `feat(c3): remove anomaly from ranking_cache · admin_alerts only`

### Phase C · 모바일 top 12 (RED → GREEN)
- RED: Playwright viewport 375px에서 13번째 row 보임 → fail
- GREEN: CSS @media (max-width: 520px) → pass
- COMMIT: `feat(c3): mobile responsive — top 12 only on ≤520px`

### Phase D · 디자인 polish (RED → GREEN)
- RED: 시각 회귀 baseline 깨지면 RED (또는 단위 테스트 생략 가능 — CSS만)
- GREEN: CSS 수정 + visual regression baseline 갱신
- COMMIT: `feat(c3): top row 2px gold border + crown opacity 0.85 + glow`

### Phase E · 모듈 nav (RED → GREEN)
- RED: vitest에 `expect(screen.getByText("VS Battle")).toBeInTheDocument()` → fail
- GREEN: ModuleNav.tsx + 3 페이지 통합 → pass
- E2E: ModuleNav 클릭 → 라우팅 정확
- COMMIT: `feat(arena): module nav — 4 tab (VS Battle · Crown Card · Ranking · Newsroom)`

### Phase F · Deadline 게이트 (RED → GREEN)
- RED: rules 테스트 `deadline > now → permission-denied` → fail
- GREEN: firestore.rules 수정 → pass
- E2E: locked state 시각 확인 + 시드 --deadline=past 재실행
- COMMIT: `feat(c3): ranking gated by Tournament Deadline · locked state`

---

## §12. Auto-STOP 조건

C-3 원본 핸드오프와 동일 — 다음 발생 시 즉시 STOP하고 대표 보고:
1. `npm run typecheck` 또는 `npm run lint` 에러 (재시도 1회 후 실패)
2. vitest 3회 연속 동일 실패
3. Playwright E2E 3회 연속 동일 실패
4. Firestore emulator 실패 또는 Java 버전 불일치
5. `firebase deploy --only firestore:rules` 에러 (이번 PR은 deploy까지 안 가지만 emulator 검증 실패 포함)
6. 핸드오프와 wireframe이 동시에 모호 (예: ModuleNav disabled 톤·Newsroom 카피)
7. Tournament Deadline 시점 정의 모호 (Date 객체 vs Timestamp 변환)
8. 디자인 토큰 새로 필요 (예: 자물쇠 아이콘 — 없으면 SVG 인라인 작성)

STOP 보고 형식: `⛔ STOP — [원인 1줄] · [증거 file:line] · [필요 결정]`

---

## §13. 시작 신호

§0 자가 검증 8개 모두 ✓ 후 Phase A 진입. 각 Phase는 1~3줄 보고로 시작·종료.

Phase F 완료 후 PR #28 description 업데이트 + Ready for review 전환은 **수동** (대표가 시각 검증 후 결정).

지금 시작해.
