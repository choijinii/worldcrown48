# WC48 — Module Handoff **TOK-1: 하드코딩 hex → 토큰 치환 스윕** (v2.1)

> 작성: Cowork(티오) · 2026-08-09 · 승인: 대표
> 배경: 2026-08-09 테마 B안(하이브리드) 확정. 어떤 테마 작업이든 선행되어야 하는 "빚 청산" 스윕.
> **이 킥은 시각 결과를 1픽셀도 바꾸지 않는다. 값의 이름만 바꾼다.**

| 항목 | 값 |
|---|---|
| 모듈 ID | `tok-1` |
| 브랜치 | `feat/tok-1` |
| 워크트리 | `~/Projects/wc48-tok1` |
| 기준 HEAD | `127aa81` |
| Base 브랜치 | `main` |
| 핸드오프 버전 | **v2.1** |

---

## §0 자가 검증 (Self-Check Before Start)

```bash
pwd                       # → ~/Projects/wc48-tok1 (메인 repo 아님)
git branch --show-current # → feat/tok-1
git log --oneline -1      # → 127aa81 (핸드오프 commit이 위에 있으면 parent 확인)
```

**자가 검증 통과 ≠ 작업 권한.** "통과, 작업 시작합니다" 통보 후 진행.

## §0.5 Stack Truth (grep로 재확인 후 진행)

| 영역 | 진실 | 함정 |
|---|---|---|
| 패키지 매니저 | **npm** | ❌ pnpm 아님 |
| 단위 테스트 | vitest `environment: node`, `include: lib/__tests__/**/*.test.ts` | ❌ 컴포넌트 렌더 테스트 금지 |
| 스타일 | CSS 변수(`app/globals.css`) + CSS Modules + inline style | ❌ Tailwind·shadcn 없음 |
| 애니메이션 | CSS transition/keyframes만 | ❌ framer-motion 미설치 |

## §1 Pre-flight
- 필독 메모리: [[pitch-reorg-agenda]] [[feedback-design-tokens-match-logo]] [[feedback-stale-deploy-recurrence-guard]]
- 필독 문서: `CLAUDE.md` · `app/globals.css`(토큰 원장) · `docs/design/WC48_DESIGN_SYSTEM_v2.3.md`

## §2 Module Identity & Goals
색상이 코드 곳곳에 하드코딩된 상태(실측 2026-08-09: **tsx 117곳/29파일 + css 모듈 9파일**)를 전부 `var(--token)` 참조로 치환한다. 목적: ①테마 B안(다크/화이트 하이브리드) 전환 비용을 "토큰 값 교체"로 낮춤 ②재유입 방지 가드 신설. **세맨틱 토큰 재설계는 하지 않는다** — 그건 Claude Design v3.0 트랙.

## §3 Scope (Work Items)

| # | 항목 | 파일 |
|---|---|---|
| W1 | tsx 29파일 hex → `var(--…)` 치환 (inline style 포함) | 아래 대상 목록 |
| W2 | CSS 모듈 9파일 hex → `var(--…)` 치환 | pitch.css, crown.module.css, navbar.css, newsdesk.module.css, NewsRail.module.css, news.module.css, arena.module.css, MediaSlot.module.css, admin.css |
| W3 | 매칭 토큰 없는 값 → `app/globals.css`에 신규 토큰 추가(기존 명명 관례 따름) | globals.css |
| W4 | **재유입 가드**: `scripts/check-hardcoded-hex.mjs` + CI 스텝(예외 목록 파일 기반) | scripts/, .github/workflows |
| W5 | CLAUDE.md에 규칙 1줄 박제: "컴포넌트에 raw hex 금지, 토큰만 사용 (가드: check-hardcoded-hex)" | CLAUDE.md |

**W1 대상 파일(29, 실측):** app/account/layout.tsx · app/account/page.tsx · app/admin/lab/layout.tsx · app/admin/newsdesk/layout.tsx · app/arena/[tournamentId]/{champion/layout,champion/page,layout,page,ranking/layout}.tsx · components/Toaster.tsx · components/admin/dashboard/{AdminAuthGuardLight,VoteSpeedChart}.tsx · components/admin/lab/{AdminAuthGuard,PublishButton,Step2Summary,TournamentCreator,TournamentList}.tsx · components/auth/{DeleteAccountModal,LoginModal,MobileProfileTab,SignInButton,UserAvatar,UserDropdown}.tsx · components/crown/ReturningCardBanner.tsx · components/dev/{DevNavFab,DevNavSheet}.tsx · components/i18n/LanguageToggle.tsx · components/launch/LaunchHero.tsx · components/news/ArticleView.tsx

## §4 ADRs (이 킥에서 확정)
- **ADR-TOK-1**: 치환은 "시각 동일" 원칙 — 색 값 자체를 바꾸지 않는다. 빈도 상위 실측: `#0E0944→--color-bg-default` · `#FCD006/#fcd006→--color-gold` · `#D7063A→--color-crimson` · `#00001f→--color-bg-void` · `#00003A→--color-bg-deep` · `#F2F2F5/#f2f2f5→` 문맥 판단(배경이면 `--color-bg-light`, 글자면 `--color-text`).
- **ADR-TOK-2**: 어드민 라이트 화면 계열(`#FFFFFF #E6EAF0 #D4DCE3 #3A4570` 등)은 globals.css에 **`/* light surface group — v3.0 화이트 테마의 씨앗 */`** 주석 아래 신규 토큰으로 묶는다(예: `--color-surface-white`, `--color-border-light`, `--color-ink-slate`). 이름은 용도 기반, 값은 현행 유지.
- **ADR-TOK-3**: **외부 브랜드 색은 토큰화하지 않는다** — 예: Google 로그인 버튼의 `#FBBC05` 등 서드파티 브랜드 팔레트. 해당 라인에 `/* brand-fixed: <이유> */` 주석 + W4 가드의 예외 목록(`scripts/hex-allowlist.json`)에 등록.
- **ADR-TOK-4**: `docs/`·`public/`·로고 SVG·`outputs/`는 스윕 대상 아님. rgba() 안의 hex 유사값은 기존 `--color-gold-subtle` 류 토큰과 일치할 때만 치환.

## §5 Implementation Plan
Phase A: 가드 스크립트(W4) 먼저 — 현재 위반 목록을 스냅샷으로 출력(RED 기준선 확보)
Phase B: css 모듈 9파일 치환(W2) + 신규 토큰(W3)
Phase C: tsx 29파일 치환(W1, inline style은 `var()` 문자열로)
Phase D: CI 연결 + CLAUDE.md 박제(W5) → 가드 green
Phase D′: Dev Visual Aid(§11.5)

## §6 Acceptance Criteria
- [ ] `node scripts/check-hardcoded-hex.mjs` → 위반 0건 (allowlist 예외만 통과)
- [ ] 시각 결과 변화 0 — 대표 눈 점검(§11.5)에서 "이전과 같음" 확인
- [ ] 기존 CI(Vitest + Playwright 스코프 스펙) green
- [ ] globals.css 신규 토큰에 그룹 주석 존재

## §7 Testing Strategy
- 가드 스크립트 자체를 `lib/__tests__/` 순수 단위테스트로 (탐지·allowlist·경로 제외 로직)
- UI 회귀는 기존 Playwright E2E 스모크 + Phase D′ 눈 검증 (렌더 테스트 신설 금지 — §0.5)

## §8 Edge Cases
- 소문자/대문자 hex 혼용(`#fcd006`) · 3자리 축약형(`#fff`) 탐지 포함
- inline style 객체 내 문자열 · template literal 내 hex
- box-shadow/gradient 등 복합 값 안의 hex

## §9 Out of Scope
- 색 값 변경·테마 전환·세맨틱 토큰 재설계(v3.0 트랙) · 화이트 테마 적용 · docs 스윕

## §11 Superpowers TDD — RED→GREEN→REFACTOR→COMMIT
각 Phase 단위로 강제. Phase A의 가드 스크립트가 전체 스윕의 RED 테스트 역할을 겸한다(위반 N건 → 0건). 단축 금지.

### §11.5 Phase D′ — Dev Visual Aid ★
D′.1 시드: `node functions/scripts/seed-preview.mjs --module=tok-1` → D′.2 Dev Nav(Cmd/Ctrl+Shift+D)로 Pitch·Arena·Lab·Account·Newsdesk 순회 → D′.3 한/영 토글 → D′.4 "색 변화 0" 자가 점검 → D′.5 cleanup.

## §12–§14
템플릿 v2.1 표준 그대로: push 확인 의무 · Vercel **branch alias URL만**(`worldcrown48-git-feat-tok-1-…`) · PR 본문에 §14 A~E 4블록(+E: "모든 화면 색 이전과 동일" 항목 추가).

## §15 Definition of Done
- [ ] 전 Phase commit+push, 원격 HEAD=로컬 HEAD
- [ ] Vercel branch alias 최신 배포 SHA = 로컬 HEAD
- [ ] CI green + 가드 스크립트 CI 편입
- [ ] 대표 시각 점검 통과(색 변화 0)
- [ ] 메모리 갱신 보고

## Auto-STOP
①치환 후 시각 차이 발견(값 매핑 불확실) ②토큰 이름 충돌 ③allowlist 판단 불가한 서드파티 색 ④기존 테스트 red — 즉시 중단·보고.

---
© 2026 WorldCrown48 · outputs/handoffs-staging/ · 작성 Cowork 2026-08-09
