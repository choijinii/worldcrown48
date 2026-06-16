# Handoff Brief — {MODULE_ID} {MODULE_NAME} ({DOMAIN_NAME})

> **From**: Cowork (기획·시안 분석) · **To**: Claude Code (실코드)
> **Date**: {YYYY-MM-DD} · **Author**: 대표 · **Version**: v{X.Y}
> **작업 브랜치**: `feat/{module-id}` (main 최신에서 분기 — Claude Code가 생성·push)
> **목표 산출물**: {주요 생성/수정 파일 목록}

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

다음 명령을 순서대로 실행해 결과가 모두 ✓ 인지 확인하세요. 하나라도 ✗ 이면 즉시 멈추고 대표에게 보고하세요.

### 0.1 작업 위치 검증

```bash
git branch --show-current
# 기대값: feat/{module-id}
```

### 0.2 핵심 파일 존재 검증

```bash
test -f CLAUDE.md && echo "✓ CLAUDE.md" || echo "✗ CLAUDE.md"
test -f LANGUAGE.md && echo "✓ LANGUAGE.md" || echo "✗ LANGUAGE.md"
test -f {LITE_SPEC_PATH} && echo "✓ lite-spec" || echo "✗ lite-spec"
test -f {THIS_HANDOFF_PATH} && echo "✓ handoff" || echo "✗ handoff"
```

### 0.3 의존성 검증

```bash
# {필요한 라이브러리 목록 확인}
```

✅ 위 검증이 모두 통과해야만 다음 §1로 진행할 수 있습니다.

---

## §1. Pre-flight Checklist — 읽기 (§0 통과 후)

```
☐ CLAUDE.md 읽음 (불변 원칙 8가지)
☐ LANGUAGE.md 읽음 (공식 용어)
☐ {LITE_SPEC} 읽음
☐ 이 핸드오프 문서 처음부터 끝까지 읽음
☐ Claude Design 번들/시안 확인
☐ docs/design/WC48_DESIGN_SYSTEM_v2.3.md 디자인 토큰 확인
```

---

## §2. Goal — 한 줄 결과 정의

> **{한 문장으로 완료 상태를 정의}**

---

## §3. Files to CREATE / MODIFY

| 경로 | 동작 | 비고 |
|---|---|---|
| `{path}` | **NEW** / **EDIT** | {설명} |

---

## §4. Acceptance Criteria — 완료 조건

```
☐ {조건 1}
☐ {조건 2}
...
```

---

## §5. Hard Constraints — DO / DON'T

### DO
- {필수 사항}

### DON'T
- {금지 사항}

---

## §6. Design Reference

### 핵심 컴포넌트 구조 (시안 기준)

```
{시안에서 추출한 컴포넌트 트리}
```

### 핵심 디자인 토큰

```css
{시안에서 추출한 CSS 변수}
```

### 반응형 브레이크포인트

| 구간 | 조건 | 주요 변화 |
|---|---|---|

---

## §7. Test Plan

### 수동 테스트

{시나리오 목록}

### 자동 테스트 — **§11로 이동·격상 (v2.1)**

⚠️ "권장" 표현 금지. 자동 테스트 항목은 모두 §11에서 **필수(Required)** 로 정의됩니다.

---

## §8. Analytics Events

```
이벤트명    파라미터    발생 시점
{이벤트 목록}
```

---

## §9. 알려진 함정 (Cowork이 미리 파악한 위험)

1. {함정 설명}

---

## §10. 핸드오프 종료 조건

Claude Code가 PR을 제출하면 대표가 다음을 확인:

```
☐ Acceptance Criteria 전 항목 통과
☐ Hard Constraints 위반 0건
☐ CLAUDE.md 불변 원칙 위반 0건
☐ LANGUAGE.md 금지 용어 사용 0건
☐ Test Plan 수동 시나리오 통과
☐ 반응형 브레이크포인트 통과
☐ Vercel Preview 배포 동작 확인

★ v2.1 추가 필수 항목 (Firebase Auth 사용 PR만 — 그 외 PR은 해당 사항 제외) ★
☐ Firebase Console → Authentication → Settings → Authorized domains 에 다음 모두 등록:
   - localhost · {project}.firebaseapp.com · {운영 도메인} · 이번 PR의 Preview URL
☐ §11 Playwright E2E {N}개 시나리오 GitHub Actions PASS
☐ E2E HTML 리포트 또는 영상(.webm) PR 본문 첨부
☐ Console 에러 0건 자동 검증 통과
☐ VERIFICATION_DISCIPLINE.md §3 firebase-auth-domains 체크리스트 ✅
```

---

## §11. Superpowers 워크플로우 지시 — Claude Code 필독

> ⚠️ 이 섹션은 **모든 Handoff Brief에 필수 포함**됩니다.
> Claude Code는 Superpowers 플러그인(`/plugin install superpowers@claude-plugins-official`)을
> 반드시 활성화한 상태에서 작업해야 합니다.

### 11.1 적용 단계 (순서 엄수)

```
Phase 1 — Brainstorming (5분)
  /brainstorm 명령으로 이 핸드오프의 §2 Goal + §9 함정을 입력
  → 구현 접근 방식, 잠재 위험, 의존성 순서를 정리

Phase 2 — Writing Plan
  /plan 명령으로 구현 계획 작성
  → §3 Files to CREATE/MODIFY 기반으로 파일별 작업 순서 확정
  → §4 Acceptance Criteria를 테스트 케이스로 매핑

Phase 3 — TDD RED-GREEN-REFACTOR (핵심)
  모든 신규 로직에 대해 다음 사이클을 반복:
  1. RED   — 테스트 먼저 작성 (§4 Acceptance Criteria 기반)
  2. GREEN — 테스트를 통과하는 최소 코드 작성
  3. REFACTOR — §5 Hard Constraints 준수 확인 + 코드 정리
  
  ⚠️ 테스트 없이 구현 코드를 먼저 작성하지 마세요.
  ⚠️ UI 컴포넌트도 렌더링 테스트 + 상태 전환 테스트 선행.

Phase 4 — Code Review
  /review 명령으로 자체 코드 리뷰 실행
  → 체크 항목:
    ☐ §5 Hard Constraints 위반 0건
    ☐ CLAUDE.md 불변 원칙 위반 0건 (특히 #1 테마, #2 Crown Gold, #5 FIFA 금지)
    ☐ LANGUAGE.md 금지 용어 0건
    ☐ TypeScript strict mode 통과
    ☐ console.error 0건

Phase 5 — PR 제출
  /pr 명령으로 PR 생성
  → PR 본문에 §10 종료 조건 체크리스트 포함
```

### 11.2 TDD 대상 매핑 (모듈별로 Cowork이 채움)

| 테스트 파일 | 테스트 대상 | §4 기준 |
|---|---|---|
| `__tests__/{target}.test.ts` | {테스트할 로직} | AC #{번호} |

> Cowork이 이 표를 모듈 특성에 맞게 채워서 보냅니다.
> 표가 비어 있으면 Claude Code가 §4 Acceptance Criteria에서 직접 추출하세요.

### 11.3 TDD 면제 조건

다음 경우에만 TDD를 건너뛸 수 있습니다 (사유를 PR에 명시):
- 순수 CSS/스타일링 변경 (로직 없음)
- 정적 콘텐츠 렌더링 (변환 로직 없음)
- 외부 라이브러리 설정 파일

그 외 모든 로직(상태 관리, API 호출, 유효성 검증, 라우팅 등)은 TDD 필수.

### 11.4 3계층 테스트 의무 (v2.1 신설 — "권장" 단어 금지)

| 계층 | 도구 | 적용 대상 | 통과 기준 |
|------|------|---------|----------|
| **유닛 (Unit)** | vitest | 순수 함수·유틸 | 100% PASS |
| **통합 (Integration)** | Firebase Emulator + vitest | Cloud Functions callable · Firestore rules deny/allow · rate limit | 100% PASS |
| **E2E (Playwright)** | `@playwright/test` | **핵심 사용자 흐름** (로그인·로그아웃·결제·삭제·투표·모달 게이트 등) | 100% PASS + Console 에러 0건 |

⚠️ **로그인·결제·인증·외부 OAuth 흐름은 E2E 의무.** 유닛만으로는 절대 못 잡는다 (PR #20 사고가 증거).

### 11.5 CI 통합 (GitHub Actions) — v2.1 신설

신규 파일: `.github/workflows/{domain}-e2e.yml`

```yaml
name: {Domain} E2E (Playwright)
on:
  pull_request:
    branches: [main]
    paths: [{변경 파일 경로 목록}]
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
      - run: npm run test:integration
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: playwright-report/ }
```

### 11.6 Console 에러 0건 자동 검증 (E2E 내장 코드)

```ts
test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text()));
});

test.afterEach(async () => {
  expect(consoleErrors, 'Console errors must be 0').toHaveLength(0);
});
```

---

## §12. Cowork 셀프체크리스트 — 핸드오프 publish 전 의무 (v2.1 신설)

> **다음 4문항 모두 ✓ 가 아니면 핸드오프 publish 금지. 재작성.**
> 메모 `feedback-superpowers-in-handoff.md` v2 강제 사항.

```
☐ §11 별도 섹션 존재? (§7 안쪽 묻기 금지)
☐ "권장" 단어 0건? (`grep -i "권장\|선택\|옵션\|가능하면" 핸드오프.md` → 0건. 있으면 "필수"로 치환)
☐ 핵심 사용자 흐름 E2E 시나리오 명시? (Playwright 코드 예시 포함)
☐ §10 Done-Definition에 E2E 증거 + Firebase Authorized domains(해당 시) 의무 항목 추가?
```

---

*템플릿 버전: v2.1 (2026-06-15 개정) — 3계층 테스트 의무화 + CI 통합 + Cowork 셀프체크리스트 §12 신설*
*v2.1 개정 사유: PR #20 (D-1) Firebase Authorized domains 누락 사고 — 자동 검증 그물망 강화*
*© 2026 WorldCrown48 | CONFIDENTIAL*
