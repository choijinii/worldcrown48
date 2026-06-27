# WC48 — `dev-visual-aid` Handoff v1.0

**Phase 2 PR B** · Dev Nav · Language Toggle · Seed Unification · imageUrl Spec · Handoff v2.1 Template

| 항목 | 값 |
|---|---|
| 모듈 ID | `dev-visual-aid` |
| 브랜치 | `feat/dev-visual-aid` |
| 워크트리 | `~/Projects/wc48-dev-aid` |
| 기준 HEAD | `d2229b8` (hotfix #29) |
| Base 브랜치 | `main` |
| 작업자 | Claude Code (auto mode) |
| 검수자 | 대표 (디자이너) + Cowork (Claude Sonnet) |
| 작성일 | 2026-06-27 |
| 핸드오프 버전 | v1.0 |

---

## §0 자가 검증 (Self-Check Before Start)

**Claude Code는 작업 시작 전 다음을 모두 통과해야 함. 통과하지 못하면 즉시 STOP하고 사용자에게 보고.**

```bash
# 1. 현재 워크트리 확인
pwd
# → /Users/jinii/Projects/wc48-dev-aid 이어야 함 (~/Projects/worldcrown48 아님)

# 2. 현재 브랜치 확인
git branch --show-current
# → feat/dev-visual-aid 이어야 함

# 3. 현재 HEAD 확인
git log --oneline -1
# → d2229b8 fix(functions): add qrcode-generator dependency for _crown mirror (#29)

# 4. 디자인 결정 5건 메모리 확인 (자동 로드되었는지)
# A1 = 한/영 토글 헤더 우측
# B2 = 글로브 + 드롭다운
# C2 = localStorage + Cmd+Shift+D 단축키
# D1 = 우측 하단 floating 버튼
# E3 = 외부 URL + 업로드 둘 다
```

**자가 검증 통과 ≠ 작업 권한.** 사용자에게 "자가 검증 통과, 작업 시작합니다"로 통보 후 진행.

---

## §1 Pre-flight Checklist

작업 시작 전 다음을 모두 읽어야 함:

### 필독 메모리 (자동 로드되지만 명시적 참조 의무)

- [[project-dev-visual-aid-decisions-2026-06-27]] — 디자인 결정 5건 (A1·B2·C2·D1·E3)
- [[project-c3-followup-decision-2026-06-26]] — PR B scope 5 work items
- [[project-c3-sequel-done-2026-06-27]] — 직전 main HEAD = d2229b8
- [[feedback-preview-no-dev-nav]] — Dev Nav 필요성 근거
- [[feedback-visual-verification-incomplete]] — 디자이너 시각 점검 의무
- [[feedback-final-phase-push-check]] — 마지막 Phase push 확인 강제
- [[feedback-handoff-commit-to-worktree]] — main 직접 commit 금지
- [[feedback-stop-bypass-loop]] — 우회 2번 막히면 즉시 STOP
- [[feedback-deployed-version-stale]] — commit ≠ push ≠ deploy ≠ CDN
- [[feedback-i18n-test-determinism]] — E2E UI assertion은 ?lang= 쿼리로 언어 강제
- [[feedback-explain-dev-tooling]] — 개발 용어 첫 등장 시 풀어쓰기

### 필독 문서

- `CLAUDE.md` — 에이전트 진입점 + 8 불변 원칙
- `LANGUAGE.md` — 용어 단일 진실
- `docs/mental-model/MENTAL_MODEL.svg` — 멘탈 모델 (가장 먼저)
- `docs/design/WC48_DESIGN_SYSTEM_v2.3.md` — 디자인 토큰
- `docs/principles/VERIFICATION_DISCIPLINE.md` — 인프라 작업 4대 원칙
- 와이어프레임(있을 경우) — Domain 0 헤더 영역, 글로브 드롭다운 패턴

---

## §2 Module Identity & Goals

### 모듈 정체성

`dev-visual-aid`는 **인프라성 보조 모듈**이다. 일반 사용자 노출 0, 운영·테스트·디자인 검증 보조 전용.

- ❌ Voter 경험과 무관 (Voter는 Dev Nav 존재 자체를 모름)
- ❌ Tournament/Match/Contestant 도메인 로직 변경 없음
- ✅ 디자이너 출신 대표가 7 도메인을 빠르게 시각 검증 가능
- ✅ 모든 모듈(B-1·C-1·C-2·C-3·D-1·E-1) 시드를 단일 명령으로 주입 가능
- ✅ 향후 모든 모듈 핸드오프에 "시각 검증 진입 가이드" 단계 강제

### 핵심 목표 (이 PR로 해소되는 문제)

1. **글로벌 도메인 nav 부재** — Launch Pad는 단일 funnel 설계라 다른 도메인 진입 불가. 운영자/디자이너가 빌드된 도메인을 직접 못 봄. ([[feedback-preview-no-dev-nav]])
2. **한/영 전환 수동** — 현재 ?lang= 쿼리만 있고 UI 토글 없음. 디자이너 시각 점검 시 URL 직접 수정해야 함.
3. **시드 명령 분산** — 모듈마다 다른 스크립트(seed-c1.mjs, seed-c3.mjs 등). 통합 진입점 없음.
4. **핸드오프 v2.0의 시각 검증 단계 누락** — Phase D' "Dev Visual Aid" 단계 없음. 다음 모듈에서 같은 문제 재발 가능.
5. **imageUrl 출처 미문서화** — B-1 The Lab에서 어떻게 입력받는지 spec 없음.

---

## §3 Scope (5 Work Items)

| ID | Work Item | 영향 범위 | Phase |
|---|---|---|---|
| W-1 | Dev Nav 위젯 — 7 도메인 빠른 진입 | 글로벌 (전 페이지) | Phase B |
| W-2 | 한/영 토글 버튼 — 🌐 글로브 + 드롭다운 | 글로벌 (전 페이지) | Phase A |
| W-3 | `functions/scripts/seed-preview.mjs` 통합 | 인프라 (스크립트) | Phase C |
| W-4 | 핸드오프 v2.1 템플릿 — Phase D' "Dev Visual Aid" 단계 추가 | 문서 (향후 모든 모듈) | Phase E |
| W-5 | `docs/lite-specs/imageUrl-source.md` 신설 | 문서 (B-1 연계) | Phase D |

---

## §4 Architecture Decision Records (ADRs)

### ADR-0007 — Language Toggle Component Architecture

**Status:** Accepted (2026-06-27)

**Decision:**
- **위치:** 글로벌 헤더 우측, SIGN IN 버튼 옆 (A1)
- **형태:** 🌐 글로브 아이콘 + 드롭다운 (B2). trigger는 `🌐 KO` 형태(글로브 + 현재 언어 약자).
- **상태 동기화:** `?lang=ko` ↔ `?lang=en` URL 쿼리 + `<html lang>` 속성 갱신 + Next.js `useRouter` 활용.
- **확장성:** MVP2 진입 시 Español 추가 = locale enum에 `'es'` 추가만으로 완료. 컴포넌트 변경 없음.

**Why:** 디자이너 출신 대표 결정 (Cowork 추천 B1 KO/EN 두 글자 토글에서 변경). MVP2 다국어 확장 대비 + 글로벌 서비스 표준 패턴 일치.

**Consequences:**
- MVP1에서는 옵션 2개라 드롭다운이 약간 over-engineered. 그러나 MVP2 진입 시점에 다시 리팩토링하는 비용보다 적음.
- 키보드 접근성 (Tab → Enter → 화살표 키)을 위해 native `<select>` 대신 ARIA 패턴 사용 필수.

### ADR-0008 — Dev Nav Activation Strategy

**Status:** Accepted (2026-06-27)

**Decision:**
- **활성화:** `localStorage.setItem('wc48_dev_nav', '1')` (C2)
- **단축키:** `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows) — 한 번 누르면 토글
- **URL 쿼리 X:** `?dev=1` 활성화 방식 채택 안 함
- **환경변수 X:** `NEXT_PUBLIC_PREVIEW_MODE` 채택 안 함

**Why:** 디자이너 출신 대표 결정 (Cowork 추천 그대로). 한 번 켜면 브라우저 닫을 때까지 유지. 일반 사용자가 우연히 노출될 위험 0. Production·Preview 어디서나 동일 동작.

**Consequences:**
- 단축키 충돌 가능성 — `Cmd+Shift+D` 는 macOS Safari "Bookmarks Bar 토글"과 겹침. Chrome·Firefox 우선이라 허용. 충돌 시 대안 단축키 핸드오프 footnote에 명시.
- E2E 테스트에서 Dev Nav 활성화 시나리오는 `page.evaluate(() => localStorage.setItem(...))` 로 트리거.

### ADR-0009 — imageUrl Sourcing Strategy (MVP1)

**Status:** Accepted (2026-06-27)

**Decision:**
- **MVP1:** B-1 The Lab UI에 두 가지 입력 분기 제공 (E3)
  - (i) 외부 URL 텍스트 필드 — `https://...` 직접 붙여넣기
  - (ii) 파일 드래그앤드롭 → Cloud Storage 자동 업로드 → URL 자동 채움
- **MVP1.5:** Fan Intelligence가 SNS에서 자동 추출 시 (ii) 흐름으로 통합
- **저장 위치:** Cloud Storage 버킷 `wc48-contestant-images/`, 경로 `{tournamentId}/{contestantId}.{ext}`

**Why:** MVP1 빠른 시연(외부 URL)과 안정적 운영(Cloud Storage 자체 호스팅) 모두 지원. Cloud Storage 무료 한도 5GB 활용.

**Consequences:**
- 외부 URL 입력 시 CORS·호스팅 사라짐 위험을 대표가 인지하고 사용
- 파일 업로드 흐름은 Cloud Functions의 `generateUploadUrl` 패턴 사용 (C-2와 동일)
- 본 PR에서는 **lite-spec 문서화만 수행** — B-1 Lab UI 실제 구현은 별도 PR (B-1 후속)에서

---

## §5 Implementation Plan (개요)

### Phase A — Language Toggle (W-2)
1. `components/i18n/LanguageToggle.tsx` 신설 — 🌐 + 드롭다운
2. `lib/i18n/useLocaleSync.ts` 신설 — URL 쿼리 ↔ `<html lang>` 동기화 훅
3. `components/layout/GlobalHeader.tsx` (또는 기존 헤더)에 토글 배치 (우측 SIGN IN 옆)
4. Vitest 단위 테스트 + Playwright E2E (?lang=ko → toggle 클릭 → ?lang=en 확인)

### Phase B — Dev Nav (W-1)
1. `lib/dev/useDevNav.ts` 신설 — localStorage + 단축키 핸들러
2. `components/dev/DevNavFab.tsx` 신설 — 우측 하단 floating 버튼 (⚙️)
3. `components/dev/DevNavSheet.tsx` 신설 — 펼친 nav 시트 (7 도메인 링크)
4. `app/layout.tsx`에 `<DevNavFab />` 마운트 (조건부 렌더)
5. E2E: 단축키 → 버튼 노출 → 클릭 → 시트 펼침 → 각 도메인 링크 hover

### Phase C — seed-preview.mjs 통합 (W-3)
1. `functions/scripts/seed-preview.mjs` 신설 — 단일 진입점
2. 기존 `seed-c1.mjs`·`seed-c3.mjs` 등을 모듈로 import
3. CLI 옵션: `--module=all|b1|c1|c2|c3|d1|e1`, `--cleanup`, `--deadline=past|future`
4. 멱등성 보장: 재실행 시 기존 데이터 덮어쓰지 않고 skip
5. README에 사용 예시 추가

### Phase D — imageUrl 출처 문서화 (W-5)
1. `docs/lite-specs/imageUrl-source.md` 신설
2. ADR-0009 내용 + B-1 Lab UI mock + Cloud Storage 버킷 정책 명시
3. MVP1.5 Fan Intelligence 연계 시점 추정 (2026-08 예상)

### Phase E — 핸드오프 v2.1 템플릿 (W-4)
1. `docs/templates/handoff-v2.1.md` 신설
2. v2.0 대비 추가: §11.5 "Phase D' Dev Visual Aid" 단계
3. 마지막 Phase push 확인 의무 명시 ([[feedback-final-phase-push-check]])
4. Vercel branch alias URL 형식 명시 ([[feedback-deployed-version-stale]])
5. v2.0 → v2.1 마이그레이션 가이드 (기존 핸드오프는 그대로 두고 신규부터 v2.1)

---

## §6 Acceptance Criteria

### Phase A (Language Toggle)

- [ ] `LanguageToggle.tsx` 렌더 시 🌐 + 현재 언어 약자 표시
- [ ] 드롭다운 클릭 → 한국어·English 옵션 표시
- [ ] 옵션 선택 시 URL이 `?lang=ko` 또는 `?lang=en` 으로 갱신
- [ ] `<html lang>` 속성이 동기화
- [ ] 키보드 접근성: Tab → Enter → 화살표 키 ↑↓ → Enter 선택
- [ ] 글로벌 헤더 우측 SIGN IN 옆 배치 (7 도메인 모두)
- [ ] Vitest 5+ tests passing, Playwright 2+ E2E tests passing

### Phase B (Dev Nav)

- [ ] `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Win) 단축키로 활성/비활성 토글
- [ ] 활성 상태에서 우측 하단 ⚙️ floating 버튼 표시
- [ ] localStorage `wc48_dev_nav` 값 토글 동작
- [ ] ⚙️ 클릭 → 시트 펼침 → 7 도메인 링크 (Launch Pad·Arena·Lab·Account·Policies·Admin·Locker Room MVP2 disabled)
- [ ] 일반 사용자에게 노출 0 (`localStorage` 미설정 시 DOM에 마운트 안 됨)
- [ ] Vitest 5+ tests passing, Playwright 3+ E2E tests passing
- [ ] **사양 충돌 점검:** SNS 공유 버튼과 z-index 충돌 없음 (C-2 CrownCard share 버튼 확인)

### Phase C (seed-preview.mjs)

- [ ] `node functions/scripts/seed-preview.mjs --module=all` 실행 가능
- [ ] 모든 모듈 시드 1회 명령으로 주입
- [ ] `--cleanup` 옵션으로 시드 데이터 제거 가능
- [ ] `--deadline=past` 옵션으로 C-3 deadline 게이트 테스트 가능
- [ ] 재실행 시 멱등성 (중복 데이터 생성 X)
- [ ] README 사용 예시 4개 이상

### Phase D (imageUrl-source.md)

- [ ] `docs/lite-specs/imageUrl-source.md` 존재
- [ ] ADR-0009 결정 + B-1 Lab UI mock 포함
- [ ] Cloud Storage 버킷 경로 정책 명시
- [ ] MVP1.5 Fan Intelligence 연계 시점 추정 포함

### Phase E (핸드오프 v2.1)

- [ ] `docs/templates/handoff-v2.1.md` 존재
- [ ] v2.0 대비 §11.5 "Phase D' Dev Visual Aid" 단계 추가
- [ ] §12 마지막 Phase push 확인 의무 명시
- [ ] §13 Vercel branch alias URL 형식 명시
- [ ] 마이그레이션 가이드 포함

---

## §7 Testing Strategy

### Vitest (단위 테스트)

- `LanguageToggle.test.tsx` — 렌더, 드롭다운 펼침, 옵션 선택, ARIA 속성
- `useLocaleSync.test.ts` — 쿼리 ↔ html lang 동기화
- `useDevNav.test.ts` — localStorage 토글, 단축키 핸들러
- `DevNavFab.test.tsx` — 조건부 렌더, 클릭 핸들러
- `DevNavSheet.test.tsx` — 7 도메인 링크 존재, disabled 상태

### Playwright (E2E)

> **결정론 보장:** UI 텍스트 assertion은 반드시 `?lang=ko` 또는 `?lang=en` 쿼리로 언어 강제. [[feedback-i18n-test-determinism]]

- `language-toggle.spec.ts`
  - `?lang=ko` 진입 → 토글 클릭 → English 선택 → URL이 `?lang=en` 확인
  - `<html lang="en">` 확인
- `dev-nav.spec.ts`
  - 단축키 시뮬레이션 → ⚙️ 버튼 노출 확인
  - ⚙️ 클릭 → 시트 펼침 → 7 도메인 링크 확인
  - localStorage 값 확인
- `dev-nav-mobile-320.spec.ts`
  - 모바일 viewport에서 ⚙️ 위치·시트 펼침 동작

### CI 통합

- `.github/workflows/test.yml` 에 본 모듈 spec 경로 명시 ([[feedback-workflow-spec-scope]])
- Firestore emulator 사용 X (시드 스크립트 별도 검증)

---

## §8 Edge Cases & Failure Modes

| # | Edge Case | 대응 |
|---|---|---|
| 1 | localStorage 비활성화 (incognito strict) | DevNav 활성화 실패 → 단축키 누름 시 console.warn + Toast 알림 |
| 2 | `?lang=` 쿼리 잘못된 값 (`?lang=xx`) | 기본값 `ko`로 fallback, console.warn |
| 3 | 키보드 단축키 충돌 (Safari 북마크 바) | 첫 우선 Chrome·Firefox. Safari 사용자는 단축키 작동 안 함 → 핸드오프 footnote 명시 |
| 4 | Dev Nav 시트 펼친 상태에서 라우팅 | 페이지 이동 시 시트 자동 닫힘 |
| 5 | 모바일에서 ⚙️ 버튼 vs SNS 공유 버튼 충돌 | Dev Nav z-index = 60, SNS 공유 = 50. fixed position bottom-right offset 다르게 |
| 6 | seed-preview.mjs 중복 실행 | 멱등성 검사 (Firestore document existence check) |
| 7 | seed-preview.mjs Production 환경 실행 차단 | `NODE_ENV !== 'production'` 검사. Production 시도 시 즉시 abort |
| 8 | LanguageToggle 키보드 trap | ARIA Combobox 패턴 + Escape 키로 닫힘 |

---

## §9 Out of Scope (이번 PR에서 하지 않는 것)

- ❌ Locker Room (D-1) 실제 페이지 — Dev Nav에 disabled placeholder만
- ❌ MVP2 Spanish locale 추가 — enum만 확장 가능하게 설계, 실제 추가 X
- ❌ Fan Intelligence imageUrl 자동 추출 — MVP1.5에서
- ❌ B-1 The Lab UI 실제 imageUrl 입력 컴포넌트 — lite-spec만 작성, 구현은 B-1 후속 PR
- ❌ 운영자(Admin) 전용 nav — Dev Nav는 디자인 검증용. Admin 전용 UI는 Domain 6
- ❌ A/B 테스트, 분석 트래킹 — Dev Nav 사용 자체 측정 X

---

## §10 References

### 메모리 (위에서 명시한 11건 외 추가)

- [[project-positioning-multi-category-2026-06-06]] — WC48 다종목 포지셔닝 (MVP2 영향)
- [[project-categories-2026-06-20]] — 6 카테고리 확정 (Dev Nav 도메인 라벨에 활용 가능)
- [[feedback-keep-responses-short]] — PR description 작성 시 짧게
- [[feedback-no-dark-mode-visuals]] — 다이어그램·시각화에 라이트 hex 명시

### 문서

- `CLAUDE.md` 8 불변 원칙
- `LANGUAGE.md` 용어
- `docs/design/WC48_DESIGN_SYSTEM_v2.3.md` 토큰
- `docs/principles/VERIFICATION_DISCIPLINE.md` 인프라 4대 원칙

### 외부 표준

- [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) — LanguageToggle
- [WCAG 2.1 AA 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html) — 단축키 접근성

---

## §11 Superpowers TDD — Phase A~E

> **규칙:** 각 Phase는 RED(실패하는 테스트) → GREEN(테스트 통과 최소 구현) → REFACTOR(코드 정리) → COMMIT (작은 단위 commit) 순서로 진행. 한 Phase 안에서 단축 금지.

### Phase A — Language Toggle (W-2)

#### A.RED
```bash
# 새 spec 파일 작성, 실패 확인
cd ~/Projects/wc48-dev-aid
pnpm test components/i18n/LanguageToggle
# → "Cannot find module 'components/i18n/LanguageToggle'" 또는 유사 에러
```

작성할 테스트:
1. 렌더 시 🌐 + 현재 언어 약자 표시
2. 드롭다운 클릭 → 옵션 2개 표시
3. 옵션 선택 → onChange 콜백 호출
4. ARIA Combobox 패턴 준수

#### A.GREEN
1. `components/i18n/LanguageToggle.tsx` 신설 — 최소 구현
2. `lib/i18n/useLocaleSync.ts` 신설
3. 테스트 통과 확인

#### A.REFACTOR
1. 스타일 토큰 (디자인 시스템 v2.3 색·spacing) 적용
2. ARIA 패턴 완성 (aria-expanded, aria-controls, role="combobox")
3. 키보드 접근성 (Tab·Enter·화살표·Escape)

#### A.COMMIT
```bash
git add components/i18n/ lib/i18n/
git commit -m "feat(dev-aid): LanguageToggle component (🌐 + dropdown)

- ADR-0007: globe icon + dropdown, 우측 헤더, ?lang= 쿼리 동기화
- ARIA Combobox pattern (a11y compliant)
- Vitest 5 unit tests + Playwright 2 e2e tests"
```

#### A.E2E
```bash
pnpm playwright test e2e/language-toggle.spec.ts
# → 2 tests passing
```

---

### Phase B — Dev Nav (W-1)

#### B.RED
```bash
pnpm test lib/dev/useDevNav components/dev/DevNavFab
# → 실패 확인
```

작성할 테스트:
1. `useDevNav` — localStorage 토글 동작
2. 단축키 핸들러 등록·해제
3. `DevNavFab` — 비활성 시 null, 활성 시 ⚙️ 렌더
4. `DevNavSheet` — 7 도메인 링크 (Locker Room disabled "Coming soon")

#### B.GREEN
1. `lib/dev/useDevNav.ts` — useEffect로 단축키 등록, localStorage state
2. `components/dev/DevNavFab.tsx` — fixed bottom-right ⚙️
3. `components/dev/DevNavSheet.tsx` — 펼친 시트 (모달 X, popover 패턴)
4. `app/layout.tsx`에 `<DevNavFab />` 마운트

#### B.REFACTOR
1. Crown Gold (#FCD006) ⚙️ 아이콘 색 — 디자인 시스템 일치
2. z-index 60 (SNS 공유 50보다 위)
3. SSR safe (typeof window check)

#### B.COMMIT
```bash
git add lib/dev/ components/dev/ app/layout.tsx
git commit -m "feat(dev-aid): Dev Nav FAB + sheet (Cmd+Shift+D toggle)

- ADR-0008: localStorage + 단축키 활성화, ?dev=1 X, 환경변수 X
- 우측 하단 floating, 7 도메인 빠른 진입 (Locker Room MVP2 disabled)
- Vitest 5 tests + Playwright 3 e2e tests (포함 mobile-320)"
```

#### B.E2E
```bash
pnpm playwright test e2e/dev-nav.spec.ts e2e/dev-nav-mobile-320.spec.ts
# → 3 tests passing
```

---

### Phase C — seed-preview.mjs 통합 (W-3)

#### C.RED
```bash
node functions/scripts/seed-preview.mjs --module=all
# → "Cannot find module" 또는 실행 실패
```

#### C.GREEN
1. `functions/scripts/seed-preview.mjs` 신설
2. 기존 시드 스크립트 모듈로 import (`seed-c1.mjs`, `seed-c3.mjs` 등)
3. CLI 파싱 (`yargs` 또는 native)
4. `--module=all|b1|c1|c2|c3|d1|e1` 분기

#### C.REFACTOR
1. 멱등성 검사 (Firestore document existence)
2. `--cleanup` 옵션 — 시드 데이터 제거
3. `--deadline=past|future` 옵션 — C-3 게이트 테스트
4. 명령어 도움말 (`--help`)
5. Production 환경 차단 (`NODE_ENV !== 'production'`)

#### C.COMMIT
```bash
git add functions/scripts/seed-preview.mjs functions/scripts/README.md
git commit -m "feat(dev-aid): unified seed-preview.mjs entry point

- 모든 모듈 시드 단일 명령 (--module=all)
- 멱등성 보장, --cleanup, --deadline 옵션
- Production 환경 차단 (safeguard)"
```

#### C.Verify
```bash
# Preview Firebase에 시드 1회 주입
node functions/scripts/seed-preview.mjs --module=all
# Firestore에서 모든 모듈 데이터 확인
# cleanup
node functions/scripts/seed-preview.mjs --module=all --cleanup
```

---

### Phase D — imageUrl 출처 문서화 (W-5)

#### D.RED
N/A (문서 작업, 테스트 없음)

#### D.GREEN
1. `docs/lite-specs/imageUrl-source.md` 신설
2. 섹션:
   - 개요 (왜 필요한가)
   - ADR-0009 결정 사항
   - B-1 Lab UI mock (ASCII 또는 mermaid)
   - Cloud Storage 버킷 정책
   - MVP1.5 Fan Intelligence 연계

#### D.REFACTOR
1. LANGUAGE.md 용어 일치 검증
2. WC48_DESIGN_SYSTEM_v2.3 토큰 인용

#### D.COMMIT
```bash
git add docs/lite-specs/imageUrl-source.md
git commit -m "docs(dev-aid): imageUrl source lite-spec

- ADR-0009 명문화: 외부 URL + Cloud Storage 업로드 둘 다 (MVP1)
- B-1 The Lab 연계, MVP1.5 Fan Intelligence 자동 추출 대비
- Cloud Storage 버킷 wc48-contestant-images/{tournamentId}/{contestantId}.{ext}"
```

---

### Phase E — 핸드오프 v2.1 템플릿 (W-4)

#### E.RED
N/A (문서 작업)

#### E.GREEN
1. `docs/templates/handoff-v2.1.md` 신설
2. v2.0 대비 추가:
   - §11.5 "Phase D' Dev Visual Aid" 단계
   - §12 마지막 Phase push 확인 의무
   - §13 Vercel branch alias URL 형식
   - §14 시각 검증 진입 가이드
3. 마이그레이션 가이드 — 기존 핸드오프는 v2.0 유지, 신규부터 v2.1

#### E.REFACTOR
1. 메모리 참조 링크 검증
2. 표·코드 블록 정렬

#### E.COMMIT
```bash
git add docs/templates/handoff-v2.1.md
git commit -m "docs(dev-aid): handoff template v2.1

- §11.5 Phase D' Dev Visual Aid 단계 추가
- §12 마지막 Phase push 확인 의무 명시
- §13 Vercel branch alias URL 형식 명시
- §14 시각 검증 진입 가이드 추가"
```

---

## §12 마지막 Phase 종료 후 Push 확인 의무 ([[feedback-final-phase-push-check]])

**Phase E 종료 후 PR draft 만들기 전 다음 명령 의무 실행:**

```bash
# 1. 모든 commit이 push되었는지 확인
cd ~/Projects/wc48-dev-aid
git push origin feat/dev-visual-aid

# 2. 원격 HEAD가 로컬 HEAD와 일치 확인
git log --oneline -5
git log origin/feat/dev-visual-aid --oneline -5
# → 두 결과가 일치해야 함

# 3. Vercel branch alias URL에서 새 deploy timestamp 확인 (push 1~3분 내)
# → https://worldcrown48-git-feat-dev-visual-aid-choijiniis-projects.vercel.app
# → 페이지 풋터의 deploy timestamp가 최근인지 확인
```

**❌ 절대 금지:**
- `git commit` 후 `git push` 생략하고 PR description 작성 — push 안 된 commit은 PR에 안 보임
- Vercel deploy-hash URL 사용 (다음 §13 참조)

---

## §13 Vercel Branch Alias URL ([[feedback-deployed-version-stale]])

PR description·핸드오프·시각 검증 가이드의 모든 URL은 **branch alias 형식** 사용:

✅ **사용:**
```
https://worldcrown48-git-feat-dev-visual-aid-choijiniis-projects.vercel.app
```

❌ **금지 (deploy-hash URL):**
```
https://worldcrown48-{hash}-choijiniis-projects.vercel.app  ← 절대 X
```

**이유:** deploy-hash URL은 특정 commit 스냅샷에 고정. 다음 push 시 자동 업데이트 안 됨. 디자이너 시각 점검 시 stale 버전 보게 됨 (C-3 sequel 사건).

---

## §14 Visual Verification Entry Guide (PR description 의무 포함)

PR draft 작성 시 description에 다음 섹션 필수:

### A. Dev Nav 활성화 시나리오

1. Preview URL 진입: `https://worldcrown48-git-feat-dev-visual-aid-choijiniis-projects.vercel.app`
2. `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Win) 누름
3. 우측 하단 ⚙️ 버튼 노출 확인
4. ⚙️ 클릭 → 시트 펼침 → 7 도메인 링크 확인

### B. 한/영 토글 시나리오

1. 헤더 우측 🌐 KO 클릭
2. 드롭다운 펼침 → English 선택
3. URL `?lang=en` 확인
4. 본문 텍스트 영어로 전환 확인

### C. 직접 진입 URL (Dev Nav 없이도 시각 확인 가능)

| 도메인 | URL |
|---|---|
| Launch Pad | `/` |
| Arena VS | `/arena/{tournamentId}` |
| Arena Ranking | `/arena/{tournamentId}/ranking` |
| Crown Card | `/arena/{tournamentId}/crown` |
| Lab (Admin) | `/admin/lab` |
| Policies | `/policies/privacy` |
| Account | `/account` |

### D. seed-preview.mjs 실행 명령

```bash
# 모든 모듈 시드 1회 주입
cd ~/Projects/wc48-dev-aid
node functions/scripts/seed-preview.mjs --module=all

# C-3 deadline 게이트 테스트
node functions/scripts/seed-preview.mjs --module=c3 --deadline=past

# 시드 cleanup
node functions/scripts/seed-preview.mjs --module=all --cleanup
```

### E. 디자이너 시각 점검 체크리스트

- [ ] Dev Nav ⚙️ 버튼이 Crown Gold (#FCD006)인지
- [ ] 시트 펼침 애니메이션이 부드러운지 (Framer Motion ease)
- [ ] 시트에서 Locker Room "Coming soon" 표시 (disabled)인지
- [ ] 모바일 320px에서 ⚙️ 위치 적절한지 (SNS 공유 버튼과 충돌 X)
- [ ] 🌐 글로브 드롭다운 펼침 위치 자연스러운지
- [ ] 드롭다운 옵션 hover 상태 디자인 일관성

---

## Auto-STOP Conditions (8건) — 발생 시 즉시 작업 중단

> Claude Code가 auto mode에서 다음 조건 발생 시 즉시 멈추고 사용자에게 보고. 우회·시도 반복 절대 금지 ([[feedback-stop-bypass-loop]]).

| # | 조건 | 대응 |
|---|---|---|
| 1 | Phase RED 테스트가 처음부터 통과 (실패 테스트 작성 실패) | STOP. 테스트 케이스 재검토 사용자 확인 |
| 2 | TypeScript 컴파일 에러 발생 | STOP. 에러 메시지 그대로 보고, 우회 X |
| 3 | CI red 발생 (GitHub Actions 실패) | STOP. CI 로그 링크 보고 |
| 4 | npm/pnpm install 실패 (의존성 충돌) | STOP. 에러 그대로 보고. `--force` 우회 X |
| 5 | Firebase 시크릿 키 누락 발견 | STOP. `firebase functions:secrets:set` 안내 후 사용자 확인 ([[feedback-secret-firebase-not-env.md]]) |
| 6 | 외부 도메인 호출 필요 (cors·proxy) 발견 | STOP. 본 PR scope 벗어남. 별도 PR 분리 권유 |
| 7 | 사양 충돌 발견 (wireframe vs lite-spec vs 본 핸드오프) | STOP. 충돌 내용 그대로 보고. 임의 결정 X ([[feedback-verify-conflicting-specs.md]]) |
| 8 | 메모리에 명시된 금지 사항 발견 (예: dark mode 시각화·main 직접 commit) | STOP. 메모리 인용 후 사용자 확인 |

**STOP 보고 형식:**
```
STOP: Auto-STOP Condition #{번호} 발동
- 발생 위치: Phase X, 파일 Y
- 증상: <콘솔/CI 로그 그대로>
- 추정 원인: <확신 있는 경우만, 없으면 "미상">
- 대기 사항: 사용자 결정 필요
```

---

## §15 Definition of Done (PR 머지 조건)

- [ ] Phase A~E 모두 commit 완료
- [ ] `git push origin feat/dev-visual-aid` 완료 + 원격 HEAD = 로컬 HEAD 확인
- [ ] Vercel branch alias URL에서 새 deploy timestamp 확인
- [ ] PR description에 §14 시각 검증 진입 가이드 포함
- [ ] CI green (Vitest + Playwright)
- [ ] 디자이너(대표) 시각 점검 통과
- [ ] 메모리 갱신: `project-dev-visual-aid-done-2026-06-XX.md`

---

## §16 Post-Merge Cleanup

머지 후 다음 작업:

```bash
# 1. main 동기화
cd ~/Projects/worldcrown48
git checkout main
git pull origin main

# 2. 워크트리 제거
git worktree remove ~/Projects/wc48-dev-aid

# 3. 브랜치 정리 (원격은 GitHub UI에서 머지 시 자동)
git branch -D feat/dev-visual-aid

# 4. (선택) 기타 머지된 워크트리 정리
git worktree remove ~/Projects/wc48-c1  # C-1 종료된 지 오래
git worktree remove ~/Projects/wc48-c3  # C-3 종료
```

---

*© 2026 WorldCrown48 | dev-visual-aid Handoff v1.0 | CONFIDENTIAL*
