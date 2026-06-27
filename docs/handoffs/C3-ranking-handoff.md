# Handoff Brief — C-3 Ranking + Anomaly Detection (Domain 3 · The Arena)

> **From**: Cowork (기획·시안 분석·B-1/C-1/C-2 통합·lite-spec 재정의) · **To**: Claude Code (실코드)
> **Date**: 2026-06-25 · **Author**: 대표 · **Version**: v2.0
> **작업 브랜치**: `feat/c3-ranking` (워크트리 `/Users/jinii/Projects/wc48-c3` 권장 — C-2 패턴 [[project-c2-done-2026-06-24]])
> **목표 산출물**:
> - `app/arena/[tournamentId]/ranking/` (UI 페이지) + `components/ranking/*` (얇은 글루) + `lib/ranking/*` (순수 로직)
> - `functions/src/scheduleRankingCache.ts` (1시간 cron, Anomaly 탐지 통합)
> - `functions/src/onVote.ts` 패치 (rate limit 10 → 5)
> - `firestore.indexes.json` 갱신 (ranking_cache composite index)
> - `firestore.rules` 갱신 (ranking_cache: read public · write functions-only)
> **선행 모듈** (전부 완료, production 배포 검증됨):
> - **B-1 The Lab** (머지 `7eb2bad`) — `tournaments`, `contestants` 컬렉션 공급원
> - **C-1 Vote Engine** (머지 `f8aeee8` · `6ed0989` · `1eb0adb`) — `votes` 컬렉션 + `onVote` callable + `advanceRound` 트리거
> - **C-2 Crown Card** (머지 `32c0eb2`) — `roundProgress` per-Voter 완주 신호
> **캐노니컬 진실 공급원**: `docs/design/wireframes/Domain 3 · The Arena.html` **C3 · RANKING 섹션**
> - CSS line **370~404** (sf-ranking · anomaly · rank-list · rank-empty · rank-skel)
> - HTML line **751~779** (rank-head · anomaly badge · rank-list · empty state · skeleton)
> - JS line **978~** (rank rendering · state segments seg-rank: loaded/loading/empty/anomaly)

---

## ⚠️ v2.0 변경 사유 (Claude Code 필독)

이 핸드오프는 **lite-spec(`docs/lite-specs/C3-ranking-anomaly.md`, 2026-05-14 작성, 구버전)** 의 다음 4개 조항을 **wireframe + B-1/C-1 실제 구현 기준으로 재정의**합니다. 충돌 시 **wireframe + 실제 코드 우선**.

| lite-spec 표기 (폐기) | 실제 사용 (2026-06-25 결정) |
|---|---|
| ❌ `hashIp` = util function `lib/utils/hash.ts`, **16자리** | ✅ **callable Cloud Function** `functions/src/index.ts:108`, **64자리 hex**. 현재 E-1 Policy Hub의 consent 저장 전용. **C-3는 hashIp를 사용하지 않음** (votes에 ipHash 미저장) |
| ❌ votes 문서에 `ipHash`, `deviceId` 저장 | ✅ **현재 voteRecord 스키마: `{userId, tournamentId, round, matchId, contestantId, date}`만** (`functions/src/core/voteRecord.ts:9-16`). **스키마 변경 없음** — C-3는 기존 필드만 사용 |
| ❌ Rate limit 1분 10회 → 15분 쿨다운 (RTDB) | ✅ **1분 5회**로 강화 (in-memory per-uid token bucket, RTDB 미사용). 15분 쿨다운 도입 X — 현재 `onVote.ts:25-38` 패턴 그대로 유지하고 `RATE_LIMIT` 상수만 10 → 5 |
| ❌ T-3 "24h 200% 증가", T-4 "3위 이상 역전" — 정의만 있고 "구현 시 채우기" | ✅ **이 핸드오프에서 수식 확정** (§7) — 직전 24개 ranking_cache snapshot과 비교 |

**B-1/C-1/C-2에서 검증된 패턴을 그대로 계승합니다 (필수):**
- **로직-추출 피라미드**: 랭킹 계산·Anomaly 룰·rate-by-contestant 등 모든 결정 함수는 `lib/ranking/*` 순수 모듈로 추출 → **node-env vitest로 즉시 TDD**. 컴포넌트는 얇은 글루 → Playwright E2E로 커버.
- **Firestore Rules + composite index 사전 점검**: 새 query 패턴 도입 시 `firestore.indexes.json` 의무 검증 ([[feedback-firestore-composite-index]] — C-1 5시간 막힘의 진범).
- **i18n 결정론 + 시드 날짜 안티패턴 회피**: E2E의 UI 텍스트 assertion은 `?lang=` 강제 ([[feedback-i18n-test-determinism]]), 시드 데이터는 확정 과거일 또는 동적 계산 ([[feedback-seed-date-anti-pattern]]).

> 📌 **ADR-0006 (이 PR로 신설) — Ranking Cache 모델 확정**: lite-spec은 RTDB votes 카운트 + 매 시간 cron으로 가정. **C-1 실제 구현**(`functions/src/onVote.ts:79-102`)은 Firestore `votes` 컬렉션에 도큐먼트 단위로 기록한다. → **C-3 cron(`scheduleRankingCache`)은 Firestore aggregation query**(`count()` aggregation)로 contestantId별 voteCount 집계 + ranking_cache/{tournamentId} 문서 1개 갱신. RTDB 절대 사용 금지(스택 일관성).

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

```bash
# 0.1 위치
git branch --show-current            # 기대값: feat/c3-ranking
git log --oneline -5 main            # 기대값: C-2 머지 commit 32c0eb2 또는 그 이후

# 0.2 핵심 파일 존재
test -f CLAUDE.md && echo "✓ CLAUDE.md"
test -f LANGUAGE.md && echo "✓ LANGUAGE.md"
test -f docs/lite-specs/C3-ranking-anomaly.md && echo "✓ C3 lite-spec (참고용)"
test -f docs/handoffs/C3-ranking-handoff.md && echo "✓ this handoff"
test -f "docs/design/wireframes/Domain 3 · The Arena.html" && echo "✓ D3 wireframe (UI 진실 공급원)"
test -f docs/design/WC48_DESIGN_SYSTEM_v2.3.md && echo "✓ Design System v2.3"

# 0.3 C-1 선행 데이터 — votes 스키마 확인
grep -nE "userId|tournamentId|round|matchId|contestantId|date" functions/src/core/voteRecord.ts
# 기대 출력: VoteInput interface line 9~16에 6개 필드만 존재 (ipHash·deviceId 없음 확인)

grep -nE "RATE_LIMIT\s*=" functions/src/onVote.ts
# 기대 출력: line 26 RATE_LIMIT = 10 → 본 PR에서 5로 변경 예정

# 0.4 C-2 트리거 — roundProgress 형식 (참고용, C-3는 직접 구독 안함)
grep -nE "championId|complete: true" functions/src/advanceRound.ts
# 기대 출력: 존재 — C-2가 이미 사용 중

# 0.5 Firestore 인덱스 사전 점검 — ranking_cache 신규 query
grep -E "ranking_cache|rankingCache" firestore.indexes.json || echo "ℹ ranking_cache 인덱스 신규 추가 필요 ([[feedback-firestore-composite-index]])"

# 0.6 Firestore rules 사전 점검
grep -E "ranking_cache|rankingCache" firestore.rules || echo "ℹ ranking_cache rules 신설 필요 (read public · write functions-only)"

# 0.7 scheduler trigger 의존성
node -e "const p = require('./functions/package.json').dependencies; console.log(p['firebase-functions']);"
# 기대 출력: ^6.x 이상 (v2 scheduler 지원)
```

> 하나라도 ✗ 이면 즉시 멈추고 대표에게 보고. ([[feedback-evidence-before-diagnosis]])

---

## §1. Pre-flight Checklist — 읽기 (§0 통과 후)

```
☐ 🛑 docs/mental-model/MENTAL_MODEL.svg — 라운드·매치·득표 규칙 (변동 없음, 한 번 더 확인)
☐ CLAUDE.md 불변 원칙 8가지
  · 특히 #1 다크 테마 (Ranking은 Domain 3 = 다크)
  · #2 Crown Gold #FCD006
  · #4 AI-Report Footer-Only (Ranking 화면에 AI-Report 배지 절대 금지)
  · "Vote Rate(%) UI는 랭킹 화면에서만 허용. Vote Count(절대 수치) 금지" — 본 PR의 핵심 제약
☐ LANGUAGE.md — Vote Rate(%) vs Vote Count, Tournament Deadline, Contestant (Candidate 금지)
☐ docs/lite-specs/C3-ranking-anomaly.md — ⚠️ **참고용만**. 위 v2.0 변경 사유 4건과 충돌 시 wireframe + 실제 코드 우선
☐ docs/design/WC48_DESIGN_SYSTEM_v2.3.md — Domain 3 다크 토큰
☐ **docs/design/wireframes/Domain 3 · The Arena.html** — **UI/UX 진실 공급원**
  · line 370~404  CSS 토큰 (sf-ranking · anomaly · rank-list · rank-empty · rank-skel)
  · line 558~595  state segments (seg-rank: loaded/loading/empty/anomaly)
  · line 638      Match VS 화면 "No Vote Rate %" 명시 — 본 PR이 풀어줄 유일한 surface
  · line 751~779  마크업 (rank-head · t-deadline · anomaly badge · rank-list · empty · skeleton)
  · line 869      SURF_LABEL.ranking = 'RANKING' 라벨
  · line 978~     rank rendering JS (참고)
  → RankingView 컴포넌트 작성 후 **브라우저로 와이어프레임 직접 띄워 4 state 시각 대조 검증 의무**
☐ docs/handoffs/C1-vote-engine-handoff.md §부록 A·B (votes 스키마·rules diff) — C-3가 읽어가는 데이터 형식
☐ functions/src/core/voteRecord.ts (lines 9~16) — VoteInput 스키마 (변경 금지)
☐ functions/src/onVote.ts (lines 25~38) — rate limit token bucket 패턴 (RATE_LIMIT만 10 → 5 변경)
☐ memory [[project-c2-done-2026-06-24]] · [[project-c1-done-2026-06-23]] · [[feedback-firestore-composite-index]] · [[feedback-i18n-test-determinism]] · [[feedback-seed-date-anti-pattern]] · [[feedback-deployed-version-stale]]
```

---

## §2. Goal — 한 줄 결과 정의

> **`scheduleRankingCache` Cloud Function이 1시간마다 모든 active Tournament에 대해 Firestore aggregation으로 contestantId별 voteCount를 집계하고, 득표율(%) 기준 내림차순 정렬한 `ranking_cache/{tournamentId}` 문서를 갱신한다. 동시에 4종 Anomaly 룰(T-1~T-4)을 평가하여 발견 시 `admin_alerts/{alertId}` 문서로 기록한다. Voter가 Domain 3의 RANKING 탭에 진입하면 Next.js 14 client component가 ranking_cache 단일 문서를 구독(onSnapshot)하여 4 state(loaded/loading/empty/anomaly) 중 하나로 렌더링하고, 절대 Vote Count는 노출하지 않으며 Vote Rate(%)만 표시한다. `onVote.ts`의 rate limit 상수는 10 → 5로 강화된다.**

이 PR이 끝나면 **MVP1 표 #6 완료**, **MVP1 표 #7 (C-4 Newsroom)** 이 사용할 ranking_cache 자료가 존재합니다. Anomaly 탐지로 **MVP2 표의 Fan Intelligence (AI-Report)** 트리거 기반도 확보됩니다.

---

## §3. Files to CREATE / MODIFY

### 페이지·라우팅 (Next.js 14 App Router · Domain 3 다크)

| 경로 | 동작 | 비고 |
|---|---|---|
| `app/arena/[tournamentId]/ranking/page.tsx` | **NEW** | Voter가 RANKING 탭 진입 시 도착. `ranking_cache/{tournamentId}` snapshot 구독 |
| `app/arena/[tournamentId]/ranking/layout.tsx` | **NEW** | 다크 테마 강제 (Domain 3) — C-1·C-2 layout과 동일 패턴 |

### 순수 로직 (lib/ranking — node-env vitest로 TDD)

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/ranking/computeRankings.ts` | **NEW** | `(rawCounts: Map<contestantId, count>) → RankingEntry[]`. 득표율 계산·동률 처리·정렬 순수 함수 |
| `lib/ranking/anomalyRules.ts` | **NEW** | T-1·T-2·T-3·T-4 평가. `(currentCache, previousCaches[]) → AnomalyTag[]`. 순수 함수 |
| `lib/ranking/rateFormatter.ts` | **NEW** | `(rate: number) → string`. 소수점 첫째자리, "33.3%" 포맷. **never** 절대값 노출 |
| `lib/ranking/rankingTypes.ts` | **NEW** | `RankingEntry`, `RankingCache`, `AnomalyTag` 타입 정의 |

### 컴포넌트 (components/ranking — 얇은 글루, E2E 커버)

| 경로 | 동작 | 비고 |
|---|---|---|
| `components/ranking/RankingView.tsx` | **NEW** | wireframe `sf-ranking` 마크업 이식. `data-rank` state = `loaded`\|`loading`\|`empty`\|`anomaly` |
| `components/ranking/RankingHeader.tsx` | **NEW** | wireframe `rank-head` (kicker + title + note + t-deadline) |
| `components/ranking/AnomalyBadge.tsx` | **NEW** | wireframe `.anomaly` 배지 (T-1~T-4 태그 표시 + "sent to System Admin" 메시지) |
| `components/ranking/RankList.tsx` | **NEW** | wireframe `.rank-list` — rank/photo/name/rate(%) 행 반복. **Vote Count 절대 출력 금지** |
| `components/ranking/RankSkeleton.tsx` | **NEW** | wireframe `.rank-skel` 5줄 |
| `components/ranking/RankEmpty.tsx` | **NEW** | wireframe `.rank-empty` (crown-outline + "No ranking yet") |

### Cloud Functions (functions/src/ranking — TDD with firestore emulator)

| 경로 | 동작 | 비고 |
|---|---|---|
| `functions/src/scheduleRankingCache.ts` | **NEW** | v2 scheduler trigger `onSchedule({schedule: "every 60 minutes", region: "asia-northeast3"})`. active Tournaments 순회 + aggregation query + anomalyRules 평가 + ranking_cache write + admin_alerts write |
| `functions/src/core/rankingAggregator.ts` | **NEW** | 순수 함수 — votes 컬렉션 쿼리 결과를 contestantId 카운트 맵으로 환원. TDD 대상 |
| `functions/src/onVote.ts` | **EDIT** | line 26 `RATE_LIMIT = 10` → **`RATE_LIMIT = 5`** + 주석 업데이트 ("12초당 1회 — anti-abuse C-3 강화") |
| `functions/src/index.ts` | **EDIT** | `export { scheduleRankingCache } from "./scheduleRankingCache";` 추가 |

### Firestore 설정 (rules + indexes)

| 경로 | 동작 | 비고 |
|---|---|---|
| `firestore.rules` | **EDIT** | `match /ranking_cache/{tournamentId}` 신설 — read: `request.auth != null || true` (public read), write: false (functions-only). `match /admin_alerts/{alertId}` 신설 — read/write: admin custom claim만 |
| `firestore.indexes.json` | **EDIT** | `votes` 컬렉션 `(tournamentId, contestantId)` composite index (aggregation query용). `admin_alerts` `(resolved, createdAt desc)` |
| `firebase.json` | **확인** | functions region `asia-northeast3` 일치 확인 (C-1·C-2 동일) |

### 테스트

| 경로 | 동작 | 비고 |
|---|---|---|
| `__tests__/lib/ranking/computeRankings.test.ts` | **NEW** | 동률·0표·1명·48명·48 동률 엣지케이스 |
| `__tests__/lib/ranking/anomalyRules.test.ts` | **NEW** | T-1~T-4 각각 양성·음성·경계값 |
| `functions/src/__tests__/scheduleRankingCache.test.ts` | **NEW** | firestore emulator + 시드 votes + cron 1회 실행 → ranking_cache 검증 + admin_alerts 검증 |
| `functions/src/__tests__/onVote.test.ts` | **EDIT** | rate limit 5회 통과·6회 실패 케이스 추가 |
| `e2e/c3-ranking.spec.ts` | **NEW** | Playwright — Voter가 ranking 탭 진입 → 4 state 시각 대조 + Vote Count 미노출 회귀 가드 + `?lang=ko/en` 결정론 |

---

---

## §4. Acceptance Criteria — 완료 조건

```
☐ ranking_cache/{tournamentId} 컬렉션이 v2 scheduler(every 60 min, asia-northeast3)로 모든 active Tournament에 대해 갱신됨
☐ Firestore aggregation query(count())로 contestantId별 voteCount 집계. votes 컬렉션 풀스캔 금지 (composite index 필수)
☐ UI는 Vote Rate(%)만 표시, voteCount/totalVotes 필드는 client SDK로 가져오지만 DOM에 절대 출력하지 않음 (정적 분석 + E2E 회귀 가드)
☐ 4 state 시각적 wireframe ±2px 일치 — loaded(랭킹 행 N개) · loading(skeleton 5줄) · empty(crown-outline + 안내) · anomaly(loaded + 상단 anomaly 배지)
☐ Anomaly 발견 시 admin_alerts/{alertId} 문서 생성 (type='T-1'|...|'T-4', tournamentId, detail, createdAt, resolved=false)
☐ Anomaly 배지 UI: wireframe line 765~769 그대로 — "Ranking anomaly flagged for review" + 부제(예: "#1 lead margin 33.3%p over #2 · sent to System Admin") + 우측 태그(T-1·T-2 등)
☐ ranking_cache.rankings는 voteCount 0인 contestant도 포함(rank N+1부터 전부 0%) — 또는 voteCount>0만 (이번 PR에서는 voteCount>0만 노출, voteCount=0은 ranking_cache.rankings에 미포함 + empty state 처리)
☐ onVote.ts RATE_LIMIT 상수 10 → 5 변경 + 기존 token bucket 패턴 유지. 6회째 호출 시 resource-exhausted throw 단위테스트 통과
☐ lib/ranking/* 순수 함수 단위테스트 100% 통과 (node-env vitest, jsdom 불필요)
☐ functions/__tests__/scheduleRankingCache.test.ts — firestore emulator + 시드 votes(동적 날짜) + cron 1회 실행 → ranking_cache 검증 + admin_alerts 검증 통과
☐ e2e/c3-ranking.spec.ts — Playwright 4 state 캡처 + Vote Count 미노출 회귀 가드 + ?lang=ko/en 결정론 통과
☐ firestore.rules: ranking_cache read public, write functions-only. admin_alerts read/write admin 커스텀 클레임 only
☐ firestore.indexes.json: votes (tournamentId, contestantId), admin_alerts (resolved, createdAt desc) 인덱스 등록 + firebase deploy --only firestore:indexes 완료
☐ functions deploy: scheduleRankingCache + onVote(수정본) 둘 다 asia-northeast3 배포 완료 + Cloud Console에서 다음 cron 실행 시각 확인
☐ Tournament Deadline 헤더 칩 표시 (wireframe line 759~763) — Tournament 문서 deadline 필드 그대로
☐ Round 정보(N강·X/Y) UI 절대 노출 금지 (Round Scope Lock — CLAUDE.md 대진 흐름 원칙 #5)
```

---

## §5. Hard Constraints — DO / DON'T

### ✅ DO

- **Domain 3 다크 테마 강제** (Voter는 Domain 3 안에 있음). RANKING 탭 진입해도 라이트 X.
- **Vote Rate(%) 1~2자리 소수점 표기** — "33.3%", "55.5%". `rateFormatter` 순수 함수만 사용.
- **4 state 시각 대조** — 컴포넌트 작성 후 `docs/design/wireframes/Domain 3 · The Arena.html` 띄워서 ±2px 검증.
- **순수 함수 TDD** — computeRankings·anomalyRules·rateFormatter는 node-env vitest로 컴포넌트보다 먼저 작성.
- **Firestore composite index 사전 점검** — `votes.where('tournamentId', '==', X).aggregate('count')` 같은 쿼리는 `(tournamentId)` single index로 충분하지만, `(tournamentId, contestantId)` 그룹화는 composite 필요. 사전 등록 후 deploy.
- **`?lang=` 결정론 E2E** — wireframe 라벨 한글/영문 혼재. UI assertion은 무조건 lang 강제.
- **시드 동적 날짜** — `new Date(Date.now() - 24 * 3600 * 1000)` 또는 확정 과거일(2026-01-01). 하드코드 미래 날짜 절대 금지.
- **Anomaly 발견 시 즉시 alert** — `admin_alerts` 문서 생성. cron 다음 실행을 기다리지 않음.
- **functions deploy 검증** — main 머지 ≠ functions deploy ([[feedback-deployed-version-stale]]). 머지 직후 `firebase deploy --only functions:scheduleRankingCache,functions:onVote` 명시.

### ❌ DON'T

- **Vote Count(절대 수치) UI 노출 절대 금지** — CLAUDE.md 대진 흐름 원칙 #8. `voteCount` 필드를 무심코 `<td>{vote.voteCount}</td>` 같이 출력하면 회귀. E2E에 `expect(page.locator('text=/^\\d+표$/')).toHaveCount(0)` 회귀 가드.
- **votes 스키마 변경 금지** — `ipHash`·`deviceId` 추가 X. lite-spec과 충돌하더라도 현 voteRecord.ts:9-16 유지.
- **RTDB 사용 금지** — 모든 rate limit·집계·캐시는 Firestore. 스택 일관성.
- **AI-Report 배지 표시 금지** — Footer-Only Lock(원칙 #4). Ranking 화면에 "✦ AI-Report" 절대 X. AI-Report는 Newsroom 모달의 article footer 1곳만.
- **금지 라운드명** — "ROUND OF 16", "QUARTERFINAL", "SEMIFINAL". WC48는 ROUND OF 48 → 24 → 12 → 6 → THE FINAL.
- **Match VS 화면에 Vote Rate 노출 금지** — wireframe line 638 명시. Ranking 화면만 허용.
- **실제 IP 저장 금지** — lite-spec 원칙 그대로 유지 (어차피 votes에 ipHash 없음).
- **GH Actions setup-java 17 이하 금지** — Firestore emulator JVM crash ([[feedback-firebase-tools-java21.md]]). 새 workflow 추가 시 Java 21+.
- **다른 모듈의 playwright spec 침범 금지** — 새 워크플로우는 `--grep '@c3'` 또는 spec 경로 명시 ([[feedback-workflow-spec-scope]]).
- **per-Voter test isolation 누락 금지** — E2E 시드는 votes + roundProgress 먼저 삭제 ([[feedback-test-isolation-per-voter]]).
- **Cleanup 시 stale 배포 의심 금지** — main 머지 후 반드시 functions 배포 명시.

---

## §6. Data Model — `ranking_cache` 컬렉션 스키마

### 6.1 타입 정의 (`lib/ranking/rankingTypes.ts`)

```ts
import type { Timestamp } from "firebase/firestore";

/** UI에 표시할 단일 contestant 순위 행. */
export interface RankingEntry {
  /** 1-based rank. 동률은 동일 rank, 다음은 skip (1·1·3). */
  rank: number;
  contestantId: string;
  /** Tournament 시점의 비정규화 — UI render 시 contestants 컬렉션 join 불필요. */
  name: string;
  imageUrl: string | null;
  /**
   * 내부 only — UI에 절대 노출 금지 (Vote Count 금지 원칙).
   * cron 갱신/T-3 계산/Anomaly admin alert detail에만 사용.
   */
  voteCount: number;
  /** 소수점 첫째자리 percent. e.g. 33.3 → "33.3%". 100점 만점이 아니라 100 %p 비율. */
  rate: number;
}

export type AnomalyTag = "T-1" | "T-2" | "T-3" | "T-4";

export interface RankingCache {
  tournamentId: string;
  /** 1위~N위 순서. voteCount === 0인 contestant는 미포함. */
  rankings: RankingEntry[];
  /** 내부 only — UI 노출 금지. T-1/T-2 계산 검증용. */
  totalVotes: number;
  /** 이번 cron 실행에서 평가된 anomaly 태그. 빈 배열 = 정상. */
  anomalies: AnomalyTag[];
  generatedAt: Timestamp;
  /**
   * 0부터 시작. cron 실행마다 +1. T-3는 (current.sequence - 24) 비교,
   * T-4는 (current.sequence - 1) 비교에 사용.
   */
  generationSequence: number;
  /** 직전 generation 시각. 첫 실행은 null. */
  previousGeneratedAt: Timestamp | null;
}

/** admin_alerts/{alertId} — Anomaly 발견 시 cron이 생성. */
export interface AdminAlert {
  type: AnomalyTag;
  tournamentId: string;
  /** UI에 표시할 한 줄 — wireframe line 767 패턴. e.g. "#1 lead margin 33.3%p over #2". */
  detail: string;
  createdAt: Timestamp;
  /** Admin Dashboard에서 처리 시 true. */
  resolved: boolean;
}
```

### 6.2 Firestore 문서 경로

```
ranking_cache/{tournamentId}                              ← 최신 1개 (UI가 onSnapshot 구독)
ranking_cache/{tournamentId}/history/{generationSequence} ← 직전 24개 보존 (T-3/T-4 비교용)
admin_alerts/{alertId}                                    ← Anomaly 발견 시 신규 생성 (auto-id)
```

### 6.3 cron 실행 시 history 회전

```ts
// scheduleRankingCache 의사코드
async function rotateHistory(tournamentId: string, newCache: RankingCache) {
  const prev = await ranking_cache.doc(tournamentId).get();
  if (prev.exists) {
    const prevData = prev.data() as RankingCache;
    await ranking_cache.doc(tournamentId)
      .collection("history")
      .doc(String(prevData.generationSequence))
      .set(prevData);
    // 25개 이상이면 가장 오래된 것 삭제 (T-3가 24h 비교라 24개만 유지)
    const old = await ranking_cache.doc(tournamentId).collection("history")
      .orderBy("generationSequence", "asc").limit(1).get();
    if ((await ranking_cache.doc(tournamentId).collection("history").count().get()).data().count > 24 && !old.empty) {
      await old.docs[0].ref.delete();
    }
  }
  await ranking_cache.doc(tournamentId).set(newCache);
}
```

### 6.4 동률 처리 (TDD 엣지케이스)

- 두 contestant가 voteCount 동일 → 동일 `rank` 부여. 그 다음 `rank`는 건너뜀.
  - 예: 5표 / 5표 / 3표 → rank [1, 1, 3]
- 세 명 이상 동률도 동일 규칙.
- `rate`는 동일 (백분율이 같으므로).
- 동률 contestant 간 표시 순서는 `contestantId` 알파벳순(결정론적).

---

## §7. Anomaly Rules — T-1 / T-2 / T-3 / T-4 정확한 수식

`lib/ranking/anomalyRules.ts` — 순수 함수, vitest로 단위테스트.

### 7.1 T-1 — 1위 압도적 득표율 (>= 60%)

> 정상 토너먼트의 1위는 일반적으로 40~55% 범위. 60% 이상 = bot/조직적 투표 의심 신호.

```ts
function checkT1(current: RankingCache): boolean {
  if (current.rankings.length === 0) return false;
  return current.rankings[0].rate >= 60;
}
```

- 양성: rate = 60 (경계값)
- 양성: rate = 99.9
- 음성: rate = 59.9
- 음성: rankings = [] (empty Tournament)

### 7.2 T-2 — 1~2위 격차 압도적 (>= 30%p)

> 정상은 1~2위 격차 10~25%p. 30%p 이상 격차 = 의심.

```ts
function checkT2(current: RankingCache): boolean {
  if (current.rankings.length < 2) return false;
  return current.rankings[0].rate - current.rankings[1].rate >= 30;
}
```

- 양성: [55, 22.5, ...] → 32.5%p
- 양성: [40, 10, ...] → 30%p (경계값)
- 음성: [40, 11, ...] → 29%p
- 음성: rankings.length = 1 (1명만 투표)

### 7.3 T-3 — 24시간 내 1위 voteCount 200% 폭증

> "history 24개 전" 시점 cache와 비교. cron이 1시간이면 24개 전 = 24h 전.
>
> 폭증 정의: `(현재 voteCount - 24h 전 voteCount) / 24h 전 voteCount >= 2.0` (= 200% 증가, 3배).

```ts
function checkT3(current: RankingCache, history24: RankingCache | null): boolean {
  if (!history24 || current.rankings.length === 0) return false;
  const topId = current.rankings[0].contestantId;
  const oldEntry = history24.rankings.find(r => r.contestantId === topId);
  if (!oldEntry || oldEntry.voteCount === 0) return false;
  const growth = (current.rankings[0].voteCount - oldEntry.voteCount) / oldEntry.voteCount;
  return growth >= 2.0;
}
```

- 양성: 24h 전 voteCount=10, 현재=30 → growth=2.0 (경계값)
- 양성: 24h 전=5, 현재=20 → growth=3.0
- 음성: 24h 전=10, 현재=25 → growth=1.5
- 음성: history24 = null (Tournament 시작 24h 미만)
- 음성: 24h 전 voteCount=0 (분모 0 방지)

### 7.4 T-4 — 3위 이하 → 1·2위 순위 점프

> 직전 generation(1h 전)에서 rank >= 3이었던 contestant가 현재 rank <= 2.
> 정상적 자연 흐름이라면 3위가 1위로 1h만에 도약하는 일은 거의 없음.

```ts
function checkT4(current: RankingCache, history1: RankingCache | null): boolean {
  if (!history1 || current.rankings.length < 2) return false;
  const top2Ids = current.rankings.slice(0, 2).map(r => r.contestantId);
  for (const id of top2Ids) {
    const prev = history1.rankings.find(r => r.contestantId === id);
    if (prev && prev.rank >= 3) return true;
  }
  return false;
}
```

- 양성: 1h 전 rank=[A:1, B:2, C:3], 현재=[C:1, A:2, B:3] (C가 3→1)
- 음성: 1h 전 rank=[A:1, B:2, C:3], 현재=[A:1, B:2, C:3] (변동 없음)
- 음성: 1h 전 rank=[A:1, B:2], 현재=[B:1, A:2] (1↔2 스왑은 T-4 아님)
- 음성: history1 = null (첫 cron 실행)

### 7.5 통합 평가 함수

```ts
export function evaluateAnomalies(
  current: RankingCache,
  history1: RankingCache | null,
  history24: RankingCache | null,
): AnomalyTag[] {
  const tags: AnomalyTag[] = [];
  if (checkT1(current)) tags.push("T-1");
  if (checkT2(current)) tags.push("T-2");
  if (checkT3(current, history24)) tags.push("T-3");
  if (checkT4(current, history1)) tags.push("T-4");
  return tags;
}
```

### 7.6 admin_alerts detail 메시지 포맷 (wireframe 일치)

| 태그 | detail 포맷 | 근거 |
|---|---|---|
| T-1 | `"#1 ${name} at ${rate}% (≥60% threshold)"` | wireframe 패턴 변형 |
| T-2 | `"#1 lead margin ${gap.toFixed(1)}%p over #2"` | wireframe line 767 그대로 |
| T-3 | `"#1 ${name} +${growthPct}% in 24h"` | growthPct = (growth × 100).toFixed(0) |
| T-4 | `"${name} jumped rank ${prevRank}→${currentRank}"` | wireframe 패턴 변형 |

UI Anomaly 배지에는 detail에서 첫 줄만 표시(wireframe). admin_alerts에는 전체 보존.

---

---

## §8. Rate Limit 변경 — `onVote.ts` 패치

### 8.1 변경 범위 (최소)

```diff
// functions/src/onVote.ts

- // Per-uid token bucket — 10 calls / uid / minute / instance (B-1 pattern).
- const RATE_LIMIT = 10;
+ // Per-uid token bucket — 5 calls / uid / minute / instance (C-3 anti-abuse 강화).
+ // 12초당 1회 — 정상 voter의 Match 풀이 흐름(선택→Round 전환 애니→다음 Match)과 일치.
+ const RATE_LIMIT = 5;
  const RATE_WINDOW_MS = 60_000;
```

→ **이 한 줄과 주석만 변경**. token bucket 자료구조·checkRateLimit·throw 패턴 일체 유지. RTDB 도입·15분 쿨다운 도입 X.

### 8.2 사용자 메시지 (한국어 유지)

기존 throw 메시지 그대로 유지: `"요청이 너무 많습니다. 잠시 후 다시 시도해주세요."` — UI는 toast로 표시. 이번 PR에서 메시지 변경 X.

### 8.3 단위테스트 추가 (`functions/src/__tests__/onVote.test.ts`)

```ts
it("rate limit: 5회 호출까지 통과", async () => {
  for (let i = 0; i < 5; i++) {
    await expect(onVote(buildValidRequest())).resolves.toEqual({ ok: true });
  }
});

it("rate limit: 6회째 호출 resource-exhausted throw", async () => {
  for (let i = 0; i < 5; i++) await onVote(buildValidRequest());
  await expect(onVote(buildValidRequest())).rejects.toMatchObject({
    code: "resource-exhausted",
  });
});

it("rate limit: 1분 경과 후 카운트 리셋", async () => {
  for (let i = 0; i < 5; i++) await onVote(buildValidRequest());
  vi.advanceTimersByTime(60_001);
  await expect(onVote(buildValidRequest())).resolves.toEqual({ ok: true });
});
```

### 8.4 E2E 보강 (C-1 spec 회귀 가드)

`e2e/c1-arena-flow.spec.ts`의 기존 rate limit 가정값(10) → 5로 동기화. 회귀 검증.

---

## §9. Traps & Pitfalls — 사전 경고

> C-1·C-2에서 발견된 함정 + Ranking·Anomaly 도입으로 새로 생기는 함정.

### Trap #1 — Firestore aggregation cost

`votes.where(...).count()` aggregation은 read 1개로 카운트되지만, 매 cron 실행 × 활성 Tournament 수 × contestant 48명 = 매시간 수천 aggregation read. 비용 추적 의무 — Cloud Console → Firestore → Usage 패널에서 cron 후 read 차이 측정.

**완화**: cron 1회당 read = `2 × tournamentCount` (현재 + 직전 cache 1개). voteCount aggregation은 contestant 단위가 아니라 votes 컬렉션 1회 풀로드 후 메모리에서 그룹화. → §3 `rankingAggregator.ts` 패턴 그대로.

### Trap #2 — votes 컬렉션 풀스캔 위험

`votes.where('tournamentId', '==', X).get()` 은 모든 votes 문서를 가져옴(48만큼 페이징 필요). composite index `(tournamentId, contestantId)` 사전 등록 + cursor 페이징 필수. [[feedback-firestore-composite-index]] — C-1 5h 막힘의 진범.

**완화**: `lib/ranking/computeRankings.ts`는 input을 `Map<contestantId, count>`로만 받고, 실제 fetch는 `functions/src/core/rankingAggregator.ts`에서 페이징 처리. 순수 함수 분리.

### Trap #3 — cron 실행 시간 한계 (9분 timeout)

v2 scheduler 함수 기본 timeout 540초(9분). active Tournament 100개 × votes 1만건씩 = 위험. **방어**: cron 함수에 `timeoutSeconds: 540, memory: "512MiB"` 명시. 1000개 넘으면 batch 처리 또는 sharding 도입 (MVP2).

### Trap #4 — "active Tournament" 정의 함정

per-Voter brackets 모델([[project-c2-decisions-2026-06-23]])이라 Tournament에 글로벌 `status` 필드 없음. **active = `tournaments.deadline > now()`**. cron 함수가 `where('deadline', '>', admin.firestore.Timestamp.now())` 쿼리로 active 필터. 글로벌 `status='active'` 같은 필드 사용 절대 X.

### Trap #5 — Anomaly false negative (의도된 동작)

T-3는 history 24개 전 cache 필요. 신생 Tournament(첫 cron 실행, 24h 미만)는 T-3 평가 silent skip. 이건 **정상 동작이지 버그 아님**. PR description에 명시 + 단위테스트로 `history24 === null → false 반환` 확인.

### Trap #6 — In-memory rate limit instance 휘발

`uidBuckets`(`onVote.ts:28`)는 Cloud Run instance per. cold start 시 카운트 리셋 → 동일 uid가 instance 옮겨가며 5회씩 우회 가능. MVP1 트레이드오프로 수용 (lite-spec의 RTDB는 도입 X). MVP2에 Firestore/Redis 기반 분산 rate limit 검토 — [[project-c3-followups]] 메모리에 기록.

### Trap #7 — client에서 voteCount 누설

Firestore client SDK는 read 시 전 필드 가져옴. 보안 룰로 필드 masking 불가. → **방어 2중**:

1. **Static analysis** — `RankList.tsx`에서 `entry.voteCount` 참조 검색 grep으로 0건 확인 (lint rule 가능: `no-restricted-syntax`).
2. **E2E 회귀 가드** — `e2e/c3-ranking.spec.ts`에서 `await expect(page.locator('text=/^\\d+표$/')).toHaveCount(0)`, `await expect(page.locator('text=/Total Votes/i')).toHaveCount(0)`.

MVP2에 Cloud Function callable로 voteCount 제거된 ranking 반환 가능 — 비용 ↑.

### Trap #8 — admin_alerts 폭주

매 cron 실행마다 같은 T-1·T-2가 재평가 → 매시간 새 alert. 운영자 mailbox 폭주.

**방어 (이번 PR 필수)**: cron이 새 alert 만들기 전, `admin_alerts.where('tournamentId', '==', X).where('type', '==', tag).where('resolved', '==', false).limit(1)` 쿼리. 기존 미해결 alert 있으면 **createdAt만 갱신**(또는 lastSeenAt 필드 추가), 새 doc 생성 X. T-3/T-4는 anomaly 자체가 일시적 이벤트라 매번 새 alert OK — 단 detail 메시지로 구분.

### Trap #9 — 시드 데이터 미래 날짜 안티패턴 (재발 방지)

[[feedback-seed-date-anti-pattern]] — Tournament `deadline`은 동적(예: `Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000)`) 또는 확정 미래일 X — 미래 일자 하드코드는 시간 지나면 active 필터에서 빠짐. **확정 과거일도 안 됨** (active Tournament 아니라서 cron 스킵).

→ Tournament 시드: `deadline = now + 30d` 동적.

### Trap #10 — Cron region mismatch

`onSchedule({schedule: "every 60 minutes", region: "asia-northeast3"})` 명시 누락 시 Functions 기본 region(us-central1) 전개됨 → 다른 region 함수와 cold start 별도 + 사용자 IP에서 멀어짐.

**완화**: index.ts re-export 시 region 명시 + firebase.json `functions[].region` 확인.

### Trap #11 — Round Scope Lock 위반 위험 (UI)

wireframe line 638은 Match VS surface — Round HUD·Vote Rate 모두 금지. RankingView를 다른 surface에서 import해서 노출하면 Lock 위반. **방어**: RankingView는 오직 `app/arena/[tournamentId]/ranking/` 라우트에서만 import.

---

## §10. Verification — 머지 전·후 체크리스트

### 10.1 머지 전 (CI 자동)

```
☐ npm run typecheck — 0 error
☐ npm run lint — 0 error
☐ vitest run lib/ranking — 100% green
☐ vitest run functions/src/__tests__/onVote.test.ts — 100% green (rate limit 5회)
☐ vitest run functions/src/__tests__/scheduleRankingCache.test.ts (firestore emulator) — 100% green
☐ playwright test e2e/c3-ranking.spec.ts (3 viewport · ?lang=ko + ?lang=en) — 100% green
☐ Vote Count 회귀 가드 통과 — locator '^\\d+표$' 0건
☐ visual regression (Playwright screenshot) — wireframe 4 state ±2px
☐ firestore.indexes.json 변경분 lint — duplicate index 없음
```

### 10.2 머지 직후 (수동, 누락 시 [[feedback-deployed-version-stale]] 재발)

```bash
# 1. Firestore indexes deploy (cron 실행 전 필수)
firebase deploy --only firestore:indexes

# 2. Firestore rules deploy (ranking_cache·admin_alerts 신설)
firebase deploy --only firestore:rules

# 3. Functions deploy (scheduleRankingCache 신설 + onVote 수정본)
firebase deploy --only functions:scheduleRankingCache,functions:onVote

# 4. Cloud Console → Cloud Scheduler → scheduleRankingCache 다음 실행 시각 확인
#    https://console.cloud.google.com/cloudscheduler

# 5. 시드 Tournament 1개에 votes 50건 시드 후 첫 cron 강제 실행:
gcloud scheduler jobs run firebase-schedule-scheduleRankingCache-asia-northeast3 \
  --location=asia-northeast3

# 6. Firestore Console에서 ranking_cache/{tournamentId} 문서 생성 확인
#    + rankings 배열 sorted by rate desc 확인
#    + voteCount 필드 존재 (내부 only)
#    + anomalies 배열 (예상 anomaly와 일치)

# 7. Production에서 /arena/{tournamentId}/ranking 진입 → 4 state 시각 확인
#    + DevTools Network 탭에서 client read 1개만 발생 확인 (cache doc only)
```

### 10.3 PR Description 필수 포함

```markdown
## 배포 후 검증 결과
- Firestore indexes deploy: ✅ (commit SHA: ...)
- Firestore rules deploy: ✅
- Functions deploy: ✅ (scheduleRankingCache asia-northeast3)
- Cloud Scheduler 다음 실행: 2026-06-XX HH:MM (UTC)
- 시드 cron 강제 실행 결과: ranking_cache/{id} 생성 + rankings.length = N + anomalies = [...]
- /arena/{id}/ranking 시각 검증: ✅ (4 state 스크린샷 첨부)
```

---

## §11. Superpowers — TDD 진행 순서 (반드시 준수)

> [[feedback-superpowers-in-handoff]] — 이 섹션 누락 시 Claude Code가 TDD 건너뜀.

### Phase A — 순수 로직 (node-env vitest, no Firebase)

1. `__tests__/lib/ranking/computeRankings.test.ts` 작성 (RED)
   - 동률·0표·1명·48명·48 동률 엣지케이스 모두 작성 후
2. `lib/ranking/computeRankings.ts` 구현 (GREEN)
3. `__tests__/lib/ranking/anomalyRules.test.ts` 작성 (RED)
   - T-1·T-2·T-3·T-4 각각 양성·음성·경계값 명시
4. `lib/ranking/anomalyRules.ts` 구현 (GREEN)
5. `lib/ranking/rateFormatter.ts` + 테스트 (0%, 33.3%, 100%, NaN 가드)
6. `lib/ranking/rankingTypes.ts` (타입만, 테스트 X)
7. **commit `feat(c3): lib/ranking pure logic + tests`** — 이 단계까지 Firestore 미사용

### Phase B — Cloud Functions (firestore emulator)

1. `functions/src/__tests__/onVote.test.ts` 수정 — rate limit 5회 케이스 추가 (RED)
2. `functions/src/onVote.ts` 패치 RATE_LIMIT = 5 (GREEN)
3. `functions/src/__tests__/scheduleRankingCache.test.ts` 작성 (RED)
   - 시드 Tournament 1개 + votes 50건 + history 0개 → first run scenario
   - 시드 + history 1개 → T-4 평가 가능
   - 시드 + history 24개 → T-3 평가 가능
4. `functions/src/core/rankingAggregator.ts` 구현 (GREEN)
5. `functions/src/scheduleRankingCache.ts` 구현 (GREEN)
6. `functions/src/index.ts` re-export 추가
7. **commit `feat(c3): scheduleRankingCache cron + onVote rate limit 5`**

### Phase C — Firestore Rules + Indexes (emulator 통합)

1. `__tests__/rules/firestore-rules.test.ts` 보강 — ranking_cache read public + write denied, admin_alerts admin-only
2. `firestore.rules` 패치 (RED → GREEN)
3. `firestore.indexes.json` 패치 + lint
4. **commit `feat(c3): rules + indexes for ranking_cache · admin_alerts`**

### Phase D — UI 컴포넌트 (얇은 글루, Playwright E2E)

1. `components/ranking/RankingView.tsx` + sub-components 작성 (와이어프레임 line 751~779 그대로 이식)
2. `app/arena/[tournamentId]/ranking/page.tsx` + layout.tsx
3. wireframe 띄워서 4 state ±2px 시각 대조 (눈 검증)
4. `e2e/c3-ranking.spec.ts` 작성 — 시드 + ?lang=ko + ?lang=en + Vote Count 회귀 가드 + 4 state 스크린샷
5. **commit `feat(c3): RankingView UI + E2E`**

### Phase E — 머지 직전 보강

1. PR description에 §10.3 형식으로 검증 결과 작성
2. Visual regression baseline 업데이트 (필요 시)
3. CHANGELOG 갱신 (필요 시)
4. 시각 검증 스크린샷 첨부

### TDD 안전망

- 각 Phase commit 후 CI 모두 통과 확인 후 다음 Phase 진입.
- RED 단계에서 테스트만 작성 후 commit하지 말 것 (실패 commit 금지). RED → GREEN 한 commit.
- emulator 기반 테스트는 **반드시 동적 시드 날짜** ([[feedback-seed-date-anti-pattern]]).
- E2E는 **반드시 `?lang=` 강제** ([[feedback-i18n-test-determinism]]).
- 다른 모듈 spec 침범 금지 — workflow에 `--grep '@c3'` 또는 `e2e/c3-*.spec.ts` 경로 명시 ([[feedback-workflow-spec-scope]]).
- per-Voter test isolation — votes + roundProgress 사전 삭제 ([[feedback-test-isolation-per-voter]]).

---

## §12. 자율 실행 가이드 (Claude Code Auto Mode 권장)

C-2 자율 완료 패턴([[project-c2-done-2026-06-24]])을 그대로 계승:

- **Auto mode** 권장 — 1h 8m / 407k 토큰으로 4 Phase + PR draft 자동 완료한 선례.
- **Auto-STOP 조건** (필수): typecheck/lint 에러 / vitest 실패 / E2E 3회 연속 실패 / functions deploy 에러 / 새 Firestore index 사전 등록 누락 감지 시 즉시 STOP + 대표 보고.
- **자기 리뷰 단계** 필수 — PR draft 생성 직전 모든 변경 파일 self-review. C-2 5건 prod 버그 사전 차단 선례.

---

## §13. Out of Scope (이 PR에서 안 함)

- ❌ Fan Intelligence(AI-Report) 트리거 자동화 — MVP2. 이번 PR은 admin_alerts 생성만, AI 호출 안 함.
- ❌ Admin Dashboard UI에서 admin_alerts 표시 — G-1 모듈 (별도 PR).
- ❌ T-3/T-4 외 추가 anomaly 룰 (T-5, T-6 등) — MVP2 데이터 누적 후 검토.
- ❌ ranking_cache의 voteCount client masking (Cloud Function 가공) — MVP2 비용 분석 후.
- ❌ 분산 rate limit (Firestore/Redis) — MVP2.
- ❌ Voter A/B 테스트(Vote Rate 표기법 비교 등) — MVP2 이후.

---

## §14. 부록 — 참고 파일·인덱스 변경 diff

### A. firestore.rules diff (예상)

```diff
+ match /ranking_cache/{tournamentId} {
+   allow read: if true;
+   allow write: if false; // Cloud Functions only (admin SDK bypasses rules)
+
+   match /history/{generationSequence} {
+     allow read: if true;
+     allow write: if false;
+   }
+ }
+
+ match /admin_alerts/{alertId} {
+   allow read, write: if request.auth.token.admin == true;
+ }
```

### B. firestore.indexes.json diff (예상)

```diff
{
  "indexes": [
+   {
+     "collectionGroup": "votes",
+     "queryScope": "COLLECTION",
+     "fields": [
+       { "fieldPath": "tournamentId", "order": "ASCENDING" },
+       { "fieldPath": "contestantId", "order": "ASCENDING" }
+     ]
+   },
+   {
+     "collectionGroup": "admin_alerts",
+     "queryScope": "COLLECTION",
+     "fields": [
+       { "fieldPath": "resolved", "order": "ASCENDING" },
+       { "fieldPath": "createdAt", "order": "DESCENDING" }
+     ]
+   }
  ]
}
```

### C. functions/src/index.ts diff

```diff
+ // C-3 The Arena — ranking cache + anomaly detection.
+ export { scheduleRankingCache } from "./scheduleRankingCache";
```

---

*Handoff Brief v2.0 종료 — Claude Code 자율 실행 준비 완료.*


