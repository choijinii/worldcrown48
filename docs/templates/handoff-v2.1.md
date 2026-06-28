# WC48 — Module Handoff Template **v2.1**

> 모듈 핸드오프(§0–§16) 작성용 템플릿. `{...}` 를 채워 `docs/handoffs/{module}-handoff.md` 로 저장.
> v2.0 대비 추가: **§0.5 Stack Truth · §11.5 Phase D′ Dev Visual Aid · §12 Push 확인 의무 · §13 Branch Alias URL · §14 시각 검증 진입 가이드.**
> 마이그레이션: 기존 핸드오프는 v2.0 유지. **신규 핸드오프부터 v2.1.** (이 파일 최하단 마이그레이션 가이드 참조.)

| 항목 | 값 |
|---|---|
| 모듈 ID | `{module-id}` |
| 브랜치 | `feat/{module-id}` |
| 워크트리 | `~/Projects/wc48-{short}` |
| 기준 HEAD | `{hash}` |
| Base 브랜치 | `main` |
| 핸드오프 버전 | **v2.1** |

---

## §0 자가 검증 (Self-Check Before Start)

```bash
pwd                      # → 워크트리 경로 (메인 repo 아님)
git branch --show-current # → feat/{module-id}
git log --oneline -1     # → 기대 HEAD (핸드오프 commit이 위에 있으면 그 parent 확인)
```

> **주의:** 핸드오프 문서 자체가 브랜치에 commit되면 HEAD가 기대값의 **자식**이 된다.
> 이때는 `git log --oneline -1 HEAD~1` 로 parent가 기대 HEAD인지 확인하면 통과 (benign).

**자가 검증 통과 ≠ 작업 권한.** "통과, 작업 시작합니다" 통보 후 진행.

---

## §0.5 Stack Truth (v2.1 신설 — 반드시 grep로 확인 후 작성)

> ⛔ **핸드오프 작성자 의무:** 아래를 **추정하지 말고** 실제 repo에서 확인해 채운다.
> v1.0 dev-visual-aid 핸드오프가 "표준 Next.js 스택"을 가정해 Auto-STOP #7을 유발한 사건 재발 방지.
> ([[project-dev-visual-aid-stack-conflict]])

```bash
ls *lock*                                  # npm(package-lock) vs pnpm(pnpm-lock)
node -e "const d={...require('./package.json').dependencies,...require('./package.json').devDependencies};\
['@testing-library/react','jsdom','framer-motion','gsap','tailwindcss','next-intl'].forEach(k=>console.log(d[k]?'✅':'❌',k))"
grep -n environment vitest.config.ts       # node vs jsdom
grep -n include vitest.config.ts           # 테스트 위치 패턴
```

**WC48 실제 스택 (2026-06 기준 — 변하면 이 표 갱신):**

| 영역 | 진실 | 함정 |
|---|---|---|
| 패키지 매니저 | **npm** (`npm ci` / `npm run …`) | ❌ pnpm 아님 |
| 단위 테스트 | vitest `environment: node`, `include: lib/__tests__/**/*.test.ts` | ❌ `@testing-library/react`·jsdom **없음** → React **컴포넌트 테스트 전례 0** |
| 테스트 관례 | **로직을 `lib/`로 추출 → 순수 단위테스트 + UI는 Playwright E2E** | ❌ `*.test.tsx` 렌더 테스트 만들지 말 것 |
| 애니메이션 | **CSS transition/keyframes만** | ❌ framer-motion·gsap **미설치** (도입은 ADR + 스택변경) |
| 스타일 | CSS 변수(`app/globals.css`) + CSS Modules + inline style | ❌ Tailwind·shadcn 없음 |
| i18n | 수제 React Context (`lib/i18n.tsx`), `?lang=` 쿼리 | ❌ next-intl 없음 |
| 시드 | **E2E spec 내부 firebase-admin** + `functions/scripts/seed-preview.mjs` | ❌ `seed-c*.mjs` 같은 표준 시더 없음 |

> "Vitest N+ tests" 같은 문구는 **순수 단위테스트 N개**로 해석한다 (컴포넌트 테스트 아님).

---

## §1 Pre-flight Checklist
- 필독 메모리: `{[[memory-links]]}`
- 필독 문서: `CLAUDE.md` · `LANGUAGE.md` · `docs/mental-model/MENTAL_MODEL.svg` · `docs/design/WC48_DESIGN_SYSTEM_v2.3.md` · 인프라 작업 시 `docs/principles/VERIFICATION_DISCIPLINE.md`

## §2 Module Identity & Goals · §3 Scope (Work Items 표) · §4 ADRs · §5 Implementation Plan
- v2.0와 동일. (모듈별로 채움.)

## §6 Acceptance Criteria · §7 Testing Strategy · §8 Edge Cases · §9 Out of Scope · §10 References
- v2.0와 동일. §7은 **§0.5 Stack Truth 관례를 따른다** (순수 로직 단위테스트 + Playwright E2E).

---

## §11 Superpowers TDD — Phase 단위 RED→GREEN→REFACTOR→COMMIT

각 Phase: **RED**(실패 테스트) → **GREEN**(최소 구현) → **REFACTOR** → **COMMIT**. 단축 금지.
> 컴포넌트는 §0.5에 따라 **순수 로직만 단위테스트**하고 UI는 E2E로 검증한다.

### §11.5 Phase D′ — Dev Visual Aid (v2.1 신설) ★

> **모든 모듈 핸드오프에 강제.** 디자이너(대표)가 빌드된 화면을 실제로 보게 하는 단계.
> 누락 시 "코드는 됐는데 아무도 못 봄" 문제 재발 ([[feedback-preview-no-dev-nav]] [[feedback-visual-verification-incomplete]]).

```
D′.1  시드 주입:  node functions/scripts/seed-preview.mjs --module={module}
        (deadline 게이트가 있으면 --deadline=past|future)
D′.2  Dev Nav로 진입:  Cmd/Ctrl+Shift+D → ⚙️ → 해당 도메인 링크
        또는 §14-C 직접 진입 URL 표 사용
D′.3  한/영 토글:  헤더 🌐 → KO/EN 전환해 양 언어 시각 확인
D′.4  체크리스트:  §14-E 디자이너 시각 점검 항목 자가 점검
D′.5  cleanup:  node functions/scripts/seed-preview.mjs --module={module} --cleanup
```

---

## §12 마지막 Phase 종료 후 Push 확인 의무 ([[feedback-final-phase-push-check]])

```bash
git push origin feat/{module-id}
git log --oneline -5                              # 로컬
git log origin/feat/{module-id} --oneline -5      # 원격 — 두 결과 일치해야 함
git rev-parse HEAD; git rev-parse origin/feat/{module-id}   # 동일 hash 확인
```

**❌ 절대 금지:** `git commit` 후 `git push` 생략하고 PR 작성 — push 안 된 commit은 PR·Preview에 안 보임.

---

## §13 Vercel Branch Alias URL ([[feedback-deployed-version-stale]])

PR·핸드오프·시각 검증의 모든 URL은 **branch alias 형식**:

```
✅ https://worldcrown48-git-feat-{module-id}-choijiniis-projects.vercel.app
❌ https://worldcrown48-{hash}-choijiniis-projects.vercel.app   ← deploy-hash 금지 (stale 고정)
```

push 1~3분 후 풋터 deploy timestamp가 최신인지 확인 ([[feedback-deployed-version-stale]]).

---

## §14 Visual Verification Entry Guide (PR description 의무 포함)

PR 본문에 아래 4블록 필수.

**A. Dev Nav 활성화 시나리오** — Preview 진입 → `Cmd/Ctrl+Shift+D` → ⚙️ → 시트 → 도메인 링크.
**B. 한/영 토글 시나리오** — 헤더 🌐 → English/한국어 → `?lang=` + 본문 전환 확인.
**C. 직접 진입 URL 표** — 도메인별 경로 (예: Launch Pad `/`, Arena `/arena/{tid}`, Ranking `/arena/{tid}/ranking`, Lab `/admin/lab`, Policies `/policies/privacy`, Account `/account`).
**D. seed 명령** — `node functions/scripts/seed-preview.mjs --module={module}` (+ `--deadline` / `--cleanup`).
**E. 디자이너 시각 점검 체크리스트** — Crown Gold(#FCD006) 사용·모바일 320px·금지 패턴(라운드 HUD·LIVE 배지·Vote Count) 0건 등.

---

## §15 Definition of Done
- [ ] Phase 전체 commit + `git push` + 원격 HEAD = 로컬 HEAD
- [ ] Vercel branch alias URL 새 deploy timestamp 확인
- [ ] PR description에 §14 시각 검증 가이드 포함
- [ ] CI green (Vitest + Playwright, 모듈 spec 스코프 [[feedback-workflow-spec-scope]])
- [ ] 디자이너(대표) 시각 점검 통과 (§11.5 Phase D′)
- [ ] 메모리 갱신

## §16 Post-Merge Cleanup
- main 동기화 → `git worktree remove` → 브랜치 정리.

---

## Auto-STOP Conditions (8건) — 발생 시 즉시 중단·보고

| # | 조건 |
|---|---|
| 1 | RED 테스트가 처음부터 통과 |
| 2 | TypeScript 컴파일 에러 |
| 3 | CI red |
| 4 | npm install 실패 (의존성 충돌) — `--force` 우회 X |
| 5 | Firebase 시크릿 누락 |
| 6 | 외부 도메인 호출(cors/proxy) 필요 — scope 밖 |
| 7 | **사양 충돌 (핸드오프 vs 실제 코드/스택, wireframe vs lite-spec)** — §0.5로 사전 차단하되 잔존 시 STOP |
| 8 | 메모리 명시 금지사항 발견 (main 직접 commit·dark-mode 시각화 등) |

우회 2번 막히면 즉시 사용자 보고 ([[feedback-stop-bypass-loop]]).

**STOP 보고 형식:**
```
STOP: Auto-STOP Condition #{번호} 발동
- 발생 위치: Phase X, 파일 Y
- 증상: <로그 그대로>
- 추정 원인: <확신 있으면만, 없으면 "미상">
- 대기 사항: 사용자 결정 필요
```

---

## 마이그레이션 가이드 (v2.0 → v2.1)

1. **기존 핸드오프는 건드리지 않는다.** v2.0 그대로 유지.
2. **신규 핸드오프부터 이 v2.1 템플릿** 사용.
3. v2.0 핸드오프를 개정할 일이 생기면 최소 다음만 추가:
   - **§0.5 Stack Truth** (가장 중요 — 스택 추정 금지)
   - **§11.5 Phase D′ Dev Visual Aid**
   - **§12 Push 확인 / §13 Branch Alias URL / §14 시각 검증 가이드**
4. 버전 라벨을 `v2.1`로 올리고 변경 이력에 사유 기재.

---

*© 2026 WorldCrown48 | Module Handoff Template v2.1 | CONFIDENTIAL*
*v2.1 개정 사유: dev-visual-aid v1.0 핸드오프 스택 추정 → Auto-STOP #7 사건. §0.5 Stack Truth + Phase D′ 시각 검증 강제로 재발 차단.*
