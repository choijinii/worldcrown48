# Handoff Brief — A1-i18n 다국어 완성 (ko/en/es) — The Pitch·Launch Pad·The Lab 걸침

> **From**: Cowork (기획·시안 분석) · **To**: Claude Code (실코드)
> **Date**: 2026-07-01 · **Author**: 대표 · **Version**: v2.0
> **작업 브랜치**: `feat/a1-i18n-completion` (main 최신에서 분기 — 기존 동명 워크트리에 핸드오프만 있으면 그 위에 이어서. Claude Code가 생성·push)
> **목표 산출물**: 3언어(ko/en/es) 정적 UI 키 시스템 + Tournament title 다국어 객체화 + 운영자/유저 "아무 언어 1개 입력 → AI 자동 채움" 파이프라인
> **이 문서가 대체함**: A1-i18n-completion-handoff v1.0 (ko/en 2언어 한정본) — 본 v2.0이 최신 진실

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

### 0.1 작업 위치

```bash
git branch --show-current      # 기대값: feat/a1-i18n-completion
git log --oneline -1 origin/main   # d4c7aba 이후(G-1 머지) 최신인지
```

### 0.2 핵심 파일 존재

```bash
test -f lib/i18n.tsx && echo "✓ i18n.tsx" || echo "✗"
test -f lib/locale.ts && echo "✓ locale.ts" || echo "✗"
test -f lib/cookieConsent.ts && echo "✓ cookieConsent(Lang)" || echo "✗"
test -f lib/types/tournament.ts && echo "✓ tournament type" || echo "✗"
test -f components/admin/lab/TitleInput.tsx && echo "✓ TitleInput" || echo "✗"
test -f functions/src/core/aiFillCore.ts && echo "✓ aiFillCore(참조 패턴)" || echo "✗"
test -f docs/i18n/I18N_POLICY.md && echo "✓ I18N_POLICY" || echo "✗"
```

### 0.3 의존성

```bash
# 신규 런타임 의존성 없음. next-intl 설치 금지(§9 함정 1).
# 번역 callable은 기존 Claude API 패턴(aiFillContestants) 재사용 — 새 SDK 도입 금지.
grep -n '"@anthropic-ai/sdk"' functions/package.json   # 이미 존재해야 함(있으면 그걸 사용)
```

✅ 위가 모두 통과해야 §1로 진행.

---

## §1. Pre-flight — 읽기

```
☐ CLAUDE.md (불변 원칙 8가지 — 특히 #3 글로벌, #4 AI-Report, #5 FIFA 금지)
☐ LANGUAGE.md (공식 용어 — 번역 금지 고유명사)
☐ docs/i18n/I18N_POLICY.md (단, §9 함정 1 필독 — 이 문서의 next-intl/URL 라우팅 부분은 실제 코드와 불일치·구현 금지)
☐ 이 핸드오프 처음부터 끝까지
☐ 실제 i18n 인프라 코드: lib/i18n.tsx · lib/locale.ts · lib/useLocaleSync.ts · components/i18n/LanguageToggle.tsx
☐ docs/design/WC48_DESIGN_SYSTEM_v2.3.md
```

---

## §2. Goal — 한 줄 결과 정의

> **언어 토글(KO/EN/ES)을 누르거나 `?lang=` 을 바꾸면 The Pitch·Launch Pad 전체 텍스트가 즉시 해당 언어로 바뀌고, Tournament 제목은 `{ ko, en, es }` 다국어 객체로 저장되며, 운영자/유저는 아무 언어 1개만 입력해도 AI가 나머지 2개를 자동으로 채운다.**

---

## §3. 핵심 정책 결정 (대표 확정 · 2026-07-01)

| # | 결정 | 출처 |
|---|---|---|
| P1 | 지원 언어 = **ko / en / es**(스페인어). "라틴어" 아님 확인됨 | 대표 2026-07-01 |
| P2 | **구조(아키텍처)는 지금 3언어로 완성**. 스페인어 문구 콘텐츠는 AI 초벌 + 점진적 검수 허용("구조는 지금, 번역은 천천히") | 대표 2026-07-01 |
| P3 | Tournament title 입력 = **"아무 언어나 1개 입력 → AI가 나머지 자동 채움"**(유저·운영자 공통 모델). 유저에게 특정 언어(영어 등) 강제 안 함 | 대표 2026-07-01 |
| P4 | 운영자(대표)는 스페인어를 못 하므로 **es는 AI 자동 채움이 사실상 필수**. 채운 뒤 검수·수정 가능 | 파생 |
| P5 | 유저(Voter)의 대회 생성 화면은 MVP2지만, **본 파이프라인·타입·규칙은 지금 반영**해 MVP2 재작업 0 | 대표 2026-07-01 |

---

## §4. Files to CREATE / MODIFY

### A. 로케일 배선 (es 추가 — 4곳 lockstep)

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/cookieConsent.ts` | **EDIT** | `type Lang = "ko" \| "en"` → `"ko" \| "en" \| "es"` (line 54) |
| `lib/locale.ts` | **EDIT** | `SUPPORTED_LOCALES`에 `"es"` 추가 · `LOCALE_META.es = { label: "Español", abbrev: "ES" }` · `isLang`에 `value === "es"` 추가 |
| `lib/i18n.tsx` | **EDIT** | `resolveBootLang`: `?lang=es` 허용 + `nav.startsWith("es") → "es"` 분기 추가 |
| `components/i18n/LanguageToggle.tsx` | **검증만** | 이미 `SUPPORTED_LOCALES` 데이터 구동 — 코드 변경 없이 3옵션 렌더돼야 함(E2E로 확인) |

### B. 정적 UI 키 시스템 (신규)

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/i18n/messages.ts` | **NEW** | 단일 진실 메시지 카탈로그. 키 규칙 `domain.component.key`(I18N_POLICY §3). 타입으로 ko/en/es **키 1:1 일치 강제**. es 없으면 en 폴백 |
| `lib/i18n/useT.ts` | **NEW** | `useT()` → `t(key, vars?)`. 내부에서 `useI18n().lang` 읽어 messages에서 해석. `{count}` 등 보간 지원 |
| `lib/i18n/__tests__/useT.test.ts` | **NEW** | 키 해석·폴백·보간 유닛 테스트 |

### C. 11개 컴포넌트 하드코드 → 키 전환

| 경로 | 동작 |
|---|---|
| `components/pitch/HeroSection.tsx` `LabEntryCard.tsx` `NewsFeedItem.tsx` `NewsroomFeed.tsx` `PitchPage.tsx` `TournamentCard.tsx` `TrendingFeed.tsx` | **EDIT** (7) — 인라인 한/영 문자열 제거, `useT` 키로 대체 |
| `components/launch/FeaturedTournament.tsx` `LaunchHero.tsx` `SNSLinks.tsx` `WaitlistForm.tsx` | **EDIT** (4) |

> ⚠️ `HeroSection.tsx`의 L2 마커 `"Ultimate Crown?"` 는 route-swap/CDN 체크가 grep하는 문자열(기존 §0/§10). 키로 옮기되 **en 값이 정확히 "Ultimate Crown?" 유지**돼야 함.

### D. Tournament title 다국어 객체화

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/i18n/localizedText.ts` | **NEW** | `type LocalizedText = { ko?: string; en?: string; es?: string }`(최소 1개 존재) + `getTitle(t: LocalizedText \| string, lang: Lang): string`(요청 언어 → en → 존재하는 아무 값 폴백; string이면 그대로 반환 = 마이그레이션 그레이스) |
| `lib/types/tournament.ts` | **EDIT** | `title: string` → `title: LocalizedText`(line 52) |
| `lib/lab/titleValidation.ts` | **EDIT** | 언어별 검증. `validateTitle(raw)`은 유지하되 `validateLocalizedTitle(lt)` 추가: 최소 1개 언어 비어있지 않음 + 각 값 ≤ 50자 |
| `lib/lab/tournamentDoc.ts` | **EDIT** | `title: title.value`(string) → 검증된 `LocalizedText` 기록 |
| `firestore.rules` | **EDIT** | tournaments create/update의 title 검증: **string(구) OR map(신) 둘 다 일시 허용**(마이그레이션 그레이스). map일 때 각 값 ≤ 50자, 최소 1키 |
| `scripts/migrate-tournament-title.mjs` | **NEW** | 기존 `title: string` 문서 → `{ [감지언어]: string }` 변환. `--dry-run`(기본) / `--commit`. 감지: 한글 포함이면 ko, 아니면 en |

### E. AI 자동 채움 파이프라인 (P3·P4 핵심)

| 경로 | 동작 | 비고 |
|---|---|---|
| `functions/src/core/translateTitleCore.ts` | **NEW** | 순수 로직: 입력 `{ text, sourceLang }` → Claude 프롬프트 구성 → `{ ko, en, es }` 파싱. **aiFillCore.ts 패턴 그대로 복제**(node-env vitest 가능하도록 I/O 분리) |
| `functions/src/translateTournamentTitle.ts` | **NEW** | `onCall` 어댑터. `requireAuth`(로그인 필요) + rate limit. `aiFillContestants.ts` 구조 미러 |
| `functions/src/index.ts` | **EDIT** | `export { translateTournamentTitle }` 추가 |
| `functions/src/core/__tests__/translateTitleCore.test.ts` | **NEW** | 프롬프트 구성·파싱·에러 유닛 테스트(Claude 응답은 목킹) |
| `components/admin/lab/TitleInput.tsx` | **EDIT** | 단일 input → **언어 탭(KO/EN/ES) + "✨ AI로 나머지 언어 채우기" 버튼**. 아무 탭 1개 입력 → 버튼 클릭 → `translateTournamentTitle` 호출 → 3개 채움 → 운영자 검수/수정. 50자 카운터는 활성 탭 기준 |

### F. 테스트 / CI

| 경로 | 동작 |
|---|---|
| `e2e/a1-i18n.spec.ts` | **NEW** — 토글 3언어 전환 시 텍스트 실제 변경 + `?lang=es` 부트 + Console 에러 0 |
| `.github/workflows/a1-i18n-e2e.yml` | **NEW** — §11.5 표준 |

---

## §5. Hard Constraints — DO / DON'T

### DO
- 지원 언어 추가는 **Lang·locale.ts·resolveBootLang·isLang 4곳을 반드시 동시에**. 하나라도 빠지면 `?lang=es`가 조용히 en으로 폴백돼 버그가 숨는다.
- 정적 문구는 전부 `messages.ts` 키 경유. **인라인 한국어/영어 문자열 0건**(전환 후 `grep -rnE '[가-힣]' components/pitch components/launch` 로 잔존 한글 확인).
- es 값이 아직 없으면 **en으로 폴백**(빈 화면·키 노출 금지). es 문구는 I18N_POLICY §6 "중립 스페인어(Español neutro)" 톤.
- 번역 금지 고유명사(I18N_POLICY §5): WorldCrown48, Crown, Crown Card, The Pitch/Arena/Lab, Launch Pad, AI-Report, Tournament, Contestant, Match, Voter, Champion — **어느 언어에서도 원문 유지**.
- Tournament title 표시는 **무조건 `getTitle(title, lang)` 경유**. `tournament.title`을 문자열로 직접 렌더 금지(마이그레이션 전 객체/문자 혼재).

### DON'T
- ❌ **next-intl 설치·도입 금지.** 실제 인프라는 React Context(`lib/i18n.tsx`) + `?lang=` 쿼리. I18N_POLICY의 next-intl/`/ko/` 라우팅 서술은 미구현 초안(§9 함정 1).
- ❌ `<html lang>` 루트 하드코딩 "ko" 되돌리기 금지 — `useLocaleSync`가 관리.
- ❌ AI 번역에 새 SDK/라이브러리 추가 금지 — 기존 `@anthropic-ai/sdk` + aiFill 패턴 재사용.
- ❌ 유저 입력 시 특정 언어 강제 금지(P3). "영어 필수" 같은 게이트 넣지 말 것.
- ❌ Vote Count 등 CLAUDE.md 불변 원칙 위반 금지(이번 작업 범위 밖이라도 건드리지 말 것).

---

## §6. Design Reference

- 토글 UI: 기존 `LanguageToggle.tsx`(ADR-0007, 🌐 globe + listbox) 그대로. ES 옵션만 데이터로 추가돼 3줄 드롭다운.
- TitleInput 다국어: 다크 테마(`components/admin/lab/theme.ts`의 `lab.*` 토큰) 유지. 언어 탭은 Crown Gold(#FCD006) 활성 표시. "✨ AI로 채우기" 버튼은 기존 AiFillButton(Contestants) 시각 언어와 통일.
- 색·타이포는 Claude Design 번들 / WC48_DESIGN_SYSTEM_v2.3 기준. 새 색 도입 금지.

---

## §7. Test Plan (수동)

1. 헤더 토글 → KO/EN/ES 3개 노출, 선택 시 The Pitch 히어로·CTA·트렌딩 텍스트 즉시 변경.
2. `?lang=es` 직접 진입 → 스페인어 부트(또는 미번역분 en 폴백), Console 에러 0.
3. The Lab에서 제목 한국어만 입력 → "AI로 채우기" → en·es 채워짐 → 저장 → The Pitch 카드가 현재 언어로 표시.
4. 기존(마이그레이션 전) string title 대회도 깨지지 않고 표시(getTitle 그레이스).

> 자동 테스트는 §11 필수(Required).

---

## §8. Analytics Events

```
cookie_lang_switch   { from, to, surface }      토글 언어 변경 (기존 유지)
title_ai_translate   { sourceLang, ok }         AI 자동 채움 버튼 클릭·결과
```

---

## §9. 알려진 함정 (Cowork이 미리 파악)

1. **[최우선] I18N_POLICY.md ↔ 실제 코드 불일치.** 정책 문서 §2·§3은 `next-intl` + `/ko/ /en/ /es/` URL 라우팅을 기술하지만, **실제 구현은 그렇지 않다**(React Context + `?lang=` 쿼리, `lib/i18n.tsx`). next-intl을 도입하면 전체 라우팅을 갈아엎게 되어 A-1 SHIPPED 상태를 깨뜨린다. **실제 코드 방식(Context + messages.ts + useT)을 확장**할 것. 작업 마지막에 `I18N_POLICY.md`의 §2·§3에 "⚠️ 현행 구현은 Context 방식 — 아래 next-intl 안은 미채택(2026-07-01)" 주석 1줄 추가해 문서 정합화.
2. **Lang 확장 4곳 lockstep**(§5 DO 첫 줄). `resolveBootLang`이나 `isLang`에 es를 빠뜨리면 `?lang=es`가 조용히 en으로 떨어져 "es 안 됨" 버그로 재현된다.
3. **title 마이그레이션 그레이스.** 배포 순서상 규칙(string OR map 허용)을 **코드 배포보다 먼저** 반영하지 않으면, 기존 string 문서 읽기/쓰기가 규칙에 막힌다. **배포 순서 필수**: firestore.rules 먼저 배포 → 마이그레이션 스크립트 실행 → 코드 배포.
4. **HeroSection L2 마커**(`"Ultimate Crown?"`)의 en 값 보존(§4-C). route-swap/CDN 체크가 이 문자열을 grep한다.
5. **AI 번역 비용/레이트리밋.** `translateTournamentTitle`은 로그인 필수 + rate limit(기존 onVote·aiFill 패턴 참조). 무인증 호출 방어.
6. **es 콘텐츠 미완 상태로 머지 가능**(P2). es 값 공백은 en 폴백이 받으므로, 스페인어 검수 미완이 머지 블로커가 되면 안 된다.

---

## §10. 핸드오프 종료 조건

```
☐ Acceptance Criteria(§2·§7) 전 항목 통과
☐ Hard Constraints(§5) 위반 0건 — 특히 next-intl 미도입, 인라인 한글 0건
☐ CLAUDE.md 불변 원칙 위반 0건 (#3 글로벌·#4 AI-Report·#5 FIFA)
☐ LANGUAGE.md/I18N_POLICY §5 번역금지 고유명사 원문 유지
☐ Test Plan 수동 시나리오 통과
☐ Vercel Preview에서 3언어 토글 실제 텍스트 변경 확인(디자이너 눈 점검)
☐ §11 Playwright E2E 통과 + 리포트/영상 PR 첨부
☐ Console 에러 0건 자동 검증 통과
(이 PR은 Firebase Auth 신규 흐름 없음 → Authorized domains 항목 제외. 단 translateTournamentTitle callable은 배포 필요)
☐ functions 배포: firebase deploy --only functions:translateTournamentTitle
```

---

## §11. Superpowers 워크플로우 지시 — Claude Code 필독

> Superpowers 플러그인 활성 상태 필수. 아래 Phase 순서 엄수.

### 11.1 적용 단계
```
Phase 1 — /brainstorm : §2 Goal + §9 함정 입력 → 접근·의존 순서 정리
Phase 2 — /plan       : §4 파일 기준 순서 확정, §7·§11.2를 테스트로 매핑
Phase 3 — TDD RED-GREEN-REFACTOR (아래 11.2)
Phase 4 — /review     : §5 위반·CLAUDE.md 위반·strict·console.error 0 점검
Phase 5 — /pr         : PR 본문에 §10 체크리스트 포함
```
⚠️ 테스트 없이 구현 코드 먼저 작성 금지. UI 컴포넌트도 렌더/상태전환 테스트 선행.

### 11.2 TDD 대상 매핑

| 테스트 파일 | 대상 | 계층 |
|---|---|---|
| `lib/i18n/__tests__/useT.test.ts` | 키 해석·en 폴백·`{var}` 보간 | 유닛 |
| `lib/i18n/__tests__/localizedText.test.ts` | `getTitle` 폴백(lang→en→any) · string 그레이스 | 유닛 |
| `lib/lab/__tests__/titleValidation.test.ts` | `validateLocalizedTitle`(최소1·50자) | 유닛 |
| `functions/src/core/__tests__/translateTitleCore.test.ts` | 프롬프트 구성·응답 파싱·에러(Claude 목킹) | 유닛 |
| `functions/src/__tests__/...rules` | title string OR map allow/deny | 통합(Emulator) |
| `e2e/a1-i18n.spec.ts` | 토글 3언어 텍스트 변경 · `?lang=es` 부트 · Console 0 | E2E |

### 11.3 TDD 면제
- 순수 CSS·정적 마크업(로직 없음)·설정 파일만. 그 외(키 해석·검증·번역·마이그레이션) TDD 필수.

### 11.4 3계층 테스트 의무
| 계층 | 도구 | 대상 | 기준 |
|---|---|---|---|
| 유닛 | vitest | useT·getTitle·validateLocalizedTitle·translateTitleCore | 100% PASS |
| 통합 | Emulator+vitest | firestore.rules title string/map | 100% PASS |
| E2E | Playwright | 언어 토글 흐름·부트 | 100% PASS + Console 0 |

### 11.5 CI — `.github/workflows/a1-i18n-e2e.yml`
```yaml
name: A1-i18n E2E (Playwright)
on:
  pull_request:
    branches: [main]
    paths:
      - 'lib/i18n/**'
      - 'lib/locale.ts'
      - 'lib/cookieConsent.ts'
      - 'components/pitch/**'
      - 'components/launch/**'
      - 'components/admin/lab/**'
      - 'e2e/a1-i18n.spec.ts'
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:unit
      - run: npx playwright test e2e/a1-i18n.spec.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report-a1-i18n, path: playwright-report/ }
```
> ⚠️ playwright test에 **spec 경로 명시**(다른 모듈 spec까지 돌려 false-red 방지 — 기존 워크플로우 교훈).

### 11.6 Console 에러 0 검증 (E2E 내장)
```ts
let consoleErrors: string[] = [];
test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
});
test.afterEach(() => expect(consoleErrors, 'Console errors must be 0').toHaveLength(0));
```

---

## §12. Cowork 셀프체크리스트 (publish 전)
```
☑ §11 별도 섹션 존재
☑ "권장" 0건 (자동 테스트는 모두 필수로 기술)
☑ 핵심 흐름 E2E 시나리오 + Playwright 코드 예시 포함
☑ §10 Done-Definition에 E2E 증거 + callable 배포 항목 포함
```

---

## 부록 · 이관 시 열린 항목 (대표 판단 대기 — 블로커 아님)
- es **정적 UI 문구의 최종 검수**: 지금은 AI 초벌 + en 폴백으로 머지 가능(P2·P6). 원어민/AI 재검수는 별도 후속.
- 유저(Voter) 대회 생성 UI 자체는 **MVP2**. 본 핸드오프는 타입·규칙·번역 callable·운영자 TitleInput까지(=재작업 0 기반)만 포함.

---

*© 2026 WorldCrown48 | A1-i18n Completion Handoff v2.0 | CONFIDENTIAL*
