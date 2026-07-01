# A1-i18n Completion — Design (ko/en/es)

> Source of truth: `docs/handoffs/A1-i18n-completion-handoff-v2.md` (대표, v2.0, 2026-07-01)
> This doc records the **decomposition + interface contracts** agreed in brainstorming (2026-07-01).
> Branch: `feat/a1-i18n-completion`.

## Goal (핸드오프 §2)

언어 토글(KO/EN/ES) 또는 `?lang=`을 바꾸면 The Pitch·Launch Pad 전체 텍스트가 즉시 해당
언어로 바뀌고, Tournament 제목은 `{ ko, en, es }` 다국어 객체로 저장되며, 운영자/유저는
아무 언어 1개만 입력해도 AI가 나머지 2개를 자동으로 채운다.

## Locked decisions (핸드오프 §3)

- P1 지원 언어 = ko / en / es (스페인어).
- P2 구조는 지금 3언어 완성. es 문구 콘텐츠는 AI 초벌 + en 폴백 허용("구조는 지금, 번역은 천천히").
- P3 title 입력 = "아무 언어 1개 → AI가 나머지 채움". 유저에게 특정 언어 강제 금지.
- P4 es는 AI 자동 채움이 사실상 필수(운영자 스페인어 불가). 채운 뒤 검수 가능.
- P5 유저 대회 생성 UI는 MVP2지만 타입·규칙·번역 callable·운영자 TitleInput은 지금 반영(재작업 0).

## Hard constraints (핸드오프 §5·§9)

- ❌ **next-intl 도입 금지.** 실제 인프라 = React Context(`lib/i18n.tsx`) + `?lang=` 쿼리.
  I18N_POLICY §2·§3의 next-intl/`/ko/` 라우팅은 미구현 초안(함정 1). 현행 Context 방식을 확장.
- Lang 확장은 **4곳 lockstep**: `Lang` 타입 · `locale.ts` · `resolveBootLang` · `isLang`.
  하나라도 누락 시 `?lang=es` → 조용히 en 폴백 버그.
- 정적 문구는 전부 `messages.ts` 키 경유. 인라인 한/영 문자열 0건.
- 번역금지 고유명사(LANGUAGE.md §10 / I18N_POLICY §5): 모든 언어에서 원문 유지.
- title 표시는 무조건 `getTitle(title, lang)` 경유. 문자열 직접 렌더 금지.
- `HeroSection`의 L2 마커 `"Ultimate Crown?"` en 값 정확 보존(route-swap/CDN grep 대상).

## Decomposition — 3 slices

각 슬라이스는 자체 spec→plan→TDD→review→PR 사이클. 순서 = 배포 순서 = 의존성 순서.

### Slice ① 로케일 배선 + 정적 UI 키 시스템 (핸드오프 §4-A·B·C)

- **es 4곳 lockstep**
  - `lib/cookieConsent.ts` L54 `type Lang = "ko" | "en"` → `... | "es"` (근원 타입)
  - `lib/locale.ts`: `SUPPORTED_LOCALES`에 `"es"`; `LOCALE_META.es = { label: "Español", abbrev: "ES" }`; `isLang`에 `"es"`
  - `lib/i18n.tsx` `resolveBootLang`: `?lang=es` 허용 + `nav.startsWith("es") → "es"` 분기
  - `components/i18n/LanguageToggle.tsx`: 코드 변경 없이 3옵션 렌더(E2E 검증)
- **키 시스템 신규**
  - `lib/i18n/messages.ts`: 단일 카탈로그. 키 `domain.component.key`. 타입으로 ko/en/es 키 1:1 강제. es 없으면 en 폴백.
  - `lib/i18n/useT.ts`: `useT() → t(key, vars?)`. 내부 `useI18n().lang` 읽어 해석. `{count}` 보간.
- **11개 컴포넌트 하드코드 → 키 전환**: pitch 7 (`HeroSection` `LabEntryCard` `NewsFeedItem` `NewsroomFeed` `PitchPage` `TournamentCard` `TrendingFeed`) + launch 4 (`FeaturedTournament` `LaunchHero` `SNSLinks` `WaitlistForm`).
- **인터페이스 계약**: `t(key, vars?)` → string(항상). 미존재 키 = 컴파일 타입 에러. es 미번역 = en 폴백(빈 화면·키 노출 금지).
- **테스트**: `lib/i18n/__tests__/useT.test.ts`(키 해석·en 폴백·보간) 유닛 + `e2e/a1-i18n.spec.ts`(토글 3언어 텍스트 변경·`?lang=es` 부트·Console 0) + `.github/workflows/a1-i18n-e2e.yml`.
- **문서 정합**: 작업 말미 `I18N_POLICY.md` §2·§3에 "⚠️ 현행 구현은 Context 방식 — next-intl 안 미채택(2026-07-01)" 주석 1줄.

### Slice ② Tournament title 다국어 객체화 (핸드오프 §4-D · 함정 3)

- `lib/i18n/localizedText.ts` (NEW): `LocalizedText = { ko?; en?; es? }`(최소 1개) + `getTitle(t, lang)`(요청→en→any; string이면 그대로 = 마이그레이션 그레이스).
- `lib/types/tournament.ts` L52 `title: string` → `LocalizedText`.
- `lib/lab/titleValidation.ts`: `validateTitle` 유지 + `validateLocalizedTitle(lt)`(최소 1 언어 non-empty, 각 ≤ 50자).
- `lib/lab/tournamentDoc.ts`: 검증된 `LocalizedText` 기록.
- `firestore.rules`: title string(구) OR map(신) 둘 다 허용. map일 때 각 ≤ 50자, 최소 1키.
- `scripts/migrate-tournament-title.mjs` (NEW): string → `{ [감지언어]: string }`. `--dry-run`(기본)/`--commit`. 감지: 한글 포함 ko, 아니면 en.
- **배포 순서(함정 3)**: firestore.rules 먼저 배포 → 마이그레이션 실행 → 코드 배포.
- **테스트**: `localizedText.test.ts`(getTitle 폴백·string 그레이스) + `titleValidation.test.ts`(validateLocalizedTitle) 유닛 + rules 통합(Emulator: string/map allow·deny).

### Slice ③ AI 자동 채움 파이프라인 (핸드오프 §4-E · 함정 5)

- `functions/src/core/translateTitleCore.ts` (NEW): 순수. `{ text, sourceLang }` → Claude 프롬프트 → `{ ko, en, es }` 파싱. aiFillCore 패턴 복제(node-env vitest).
- `functions/src/translateTournamentTitle.ts` (NEW): onCall. `requireAuth`(로그인 필수) + rate limit. aiFillContestants 구조 미러.
- `functions/src/index.ts`: `export { translateTournamentTitle }`.
- `components/admin/lab/TitleInput.tsx`: 언어 탭(KO/EN/ES) + "✨ AI로 나머지 채우기" 버튼. 아무 탭 1개 입력 → 호출 → 3개 채움 → 검수/수정. 50자 카운터 활성 탭 기준. Crown Gold(#FCD006) 활성 탭.
- **배포**: `firebase deploy --only functions:translateTournamentTitle`.
- **테스트**: `translateTitleCore.test.ts`(프롬프트 구성·응답 파싱·에러, Claude 목킹) 유닛.

## Analytics (핸드오프 §8)

- `cookie_lang_switch { from, to, surface }` (기존 유지)
- `title_ai_translate { sourceLang, ok }` (슬라이스 ③)

## Done definition (핸드오프 §10, 슬라이스별 부분 적용)

Acceptance(§2·§7) 통과 · Hard Constraints 위반 0(특히 next-intl 미도입·인라인 한글 0) ·
CLAUDE.md 불변원칙 위반 0(#3·#4·#5) · 번역금지 고유명사 원문 유지 · 3계층 테스트 PASS +
Console 0 · Vercel Preview 3언어 육안 확인 · (슬라이스 ③) callable 배포.

## Superpowers workflow (핸드오프 §11)

슬라이스마다: writing-plans → TDD(RED-GREEN-REFACTOR) → requesting-code-review → PR.
E2E는 spec 경로 명시(`e2e/a1-i18n.spec.ts`)로 false-red 방지.
