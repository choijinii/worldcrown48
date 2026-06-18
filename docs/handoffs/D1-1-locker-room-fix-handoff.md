# Handoff Brief — D-1.1 Locker Room Fix (6건 버그 통합)

> **From**: Cowork (기획·정책·UX 결정) · **To**: Claude Code (실코드)
> **Date**: 2026-06-15 · **Author**: 대표 · **Version**: v1.0 (v2.1 템플릿 적용)
> **작업 브랜치**: `feat/d1-locker-room` 또는 `fix/d1-bugs`(Claude Code 판단)
> **목표 산출물**: D-1 v1.0(머지 전) 코드 패치 + `e2e/d1-auth.spec.ts`(NEW) + `.github/workflows/d1-e2e.yml`(NEW) + Playwright 설정
>
> **사유**: PR #20 (D-1 v1.0) Preview 테스트에서 대표 + Cowork 공동 발견한 **6건 버그**. 머지 전 같은 PR에서 통합 fix. 본 핸드오프는 D-1 v2.1 템플릿(2026-06-15 개정)을 처음 적용하는 fix 핸드오프.

---

## ⛔ 본 fix는 D-1 v1.0 PR(#20) 머지 전 완료해야 한다

| 항목 | 현재 상태 (2026-06-15 18:50 KST) |
|------|-------------------------------|
| PR #20 (feat/d1-locker-room) | **open · 미머지** |
| origin/main 최신 | `017bc78` (E-1 머지까지만) |
| origin/feat/d1-locker-room 최신 | `ed4c665` (핸드오프 v2.1 문서만 추가) |

**→ 같은 브랜치 `feat/d1-locker-room`에 추가 커밋 필수.** 별도 PR 분리 금지(메모 `feedback-no-deferred-dependencies`).

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

```bash
# 1. 작업 브랜치
git branch --show-current
# 기대값: feat/d1-locker-room (또는 fix/d1-bugs)

# 2. D-1 v1.0 코드가 이미 있는지
test -f lib/authStore.ts && echo "✓ authStore" || echo "✗ authStore"
test -f functions/src/onUserDelete.ts && echo "✓ onUserDelete" || echo "✗ onUserDelete"
test -f functions/src/linkSessionVote.ts && echo "✓ linkSessionVote" || echo "✗ linkSessionVote"
test -f app/account/page.tsx && echo "✓ /account" || echo "✗ /account"
test -d components/auth && echo "✓ components/auth" || echo "✗ components/auth"

# 3. v2.1 핸드오프(상위 문서) 존재 확인
test -f docs/handoffs/D1-locker-room-handoff.md && grep -q "v2.1" docs/handoffs/D1-locker-room-handoff.md && echo "✓ v2.1 상위 핸드오프" || echo "✗"

# 4. VERIFICATION_DISCIPLINE firebase-auth-domains 체크리스트 확인
grep -q "firebase-auth-domains" docs/principles/VERIFICATION_DISCIPLINE.md && echo "✓ 체크리스트" || echo "✗"

# 5. Playwright 미설치 확인 (아직 없어야 함)
grep -E '"@playwright/test"' package.json && echo "ALREADY" || echo "✓ 신규 설치 필요"
```

모두 ✓ 가 아니면 즉시 중단 + 대표 보고.

---

## §1. Pre-flight Checklist — 읽기

1. **상위 핸드오프 v2.1**: `docs/handoffs/D1-locker-room-handoff.md` (§9 함정 7·9·15 필독)
2. **VERIFICATION_DISCIPLINE.md** §3 `firebase-auth-domains` + §4 위반 사례 로그 (PR #20 사고)
3. **핸드오프 템플릿 v2.1**: `docs/templates/HANDOFF_BRIEF_TEMPLATE.md` §11.4~6 (3계층 테스트·CI·Console 0건)
4. CLAUDE.md 불변 원칙 8가지 (특히 #1 D4 라이트, #2 Crown Gold)
5. LANGUAGE.md 금지 용어 0건

---

## §2. Goal — 한 줄 결과 정의

**D-1 v1.0의 6건 버그를 fix하고, Playwright E2E 4개 시나리오로 회귀를 자동 차단한다.**

---

## §3. Files to MODIFY / CREATE

### MODIFY (기존 파일 패치)

| 파일 | 변경 사유 |
|------|---------|
| `lib/firebase.ts` 또는 `lib/authStore.ts` | **P1 fix**: `setPersistence(auth, browserLocalPersistence)`를 `signInWithPopup` **전에** await. §9 함정 7 |
| `components/auth/UserDropdown.tsx` | **P2 fix**: 로그아웃 클릭 → toast `signOut`-success 호출. AC §4-1 #232 |
| `components/auth/DeleteAccountModal.tsx` 또는 사용처 | **P2 fix**: 진입 경로(드롭다운 vs /account 버튼)에 무관하게 **단일 portal** 마운트. 화면 정중앙 고정 |
| `functions/src/onUserDelete.ts` | **P0 fix**: `admin.auth().deleteUser(uid)` 권한 + try/catch 시점에서 throw 보장. silent fail 금지. §9 함정 9 |
| `components/ui/Toast.tsx` 또는 토스트 컨테이너 | **P2 fix**: 위치 화면 중앙 상단 또는 우측 상단 + 지속시간 5초 + dismiss 버튼 |
| `components/auth/DeleteAccountModal.tsx` (스피너) | **P3 fix**: 빠른 응답 시 스피너 생략, 500ms 초과 시에만 노출 (UX 자연스러움) |

### CREATE (NEW)

| 파일 | 용도 |
|------|------|
| `e2e/d1-auth.spec.ts` | Playwright E2E 4개 시나리오 (§11.2) |
| `playwright.config.ts` | Playwright 설정 (헤드리스 크롬, baseURL, retries) |
| `.github/workflows/d1-e2e.yml` | GitHub Actions CI (§11.3) |
| `package.json` (수정) | `@playwright/test` 추가 + `test:e2e` 스크립트 |

### IAM 권한 (P0 사이드 작업)

| 작업 | 명령 |
|------|------|
| Cloud Function 서비스 계정에 `roles/firebaseauth.admin` 부여 | `gcloud projects add-iam-policy-binding worldcrown48 --member="serviceAccount:worldcrown48@appspot.gserviceaccount.com" --role="roles/firebaseauth.admin"` |
| 또는 Functions v2 SA 확인 → 권한 부여 | IAM Console 수동 확인 (`VERIFICATION_DISCIPLINE.md` §3 `firebase-functions-deploy` 체크리스트) |

---

## §4. Acceptance Criteria — 완료 조건 (Fix 6건 × 검증 수단)

### P0 — GDPR 삭제 실제 작동 (🚨 법적 위험 — 최우선)

```
☐ Cloud Function `onUserDelete`의 서비스 계정에 `roles/firebaseauth.admin` 권한 확인 (IAM Console 스크린샷)
☐ Functions 로그: deleteUser(uid) 호출 시 200 응답 (silent fail 0건)
☐ 삭제 실행 후 Firebase Auth Console — 해당 uid **존재하지 않음**
☐ 삭제 실행 후 Firestore — users/{uid} · votes(userId==uid) · cookieConsents/{uid} · userPrefs/{uid} **0건**
☐ 삭제 실행 후 동일 Google 계정으로 SIGN IN 시도 → **신규 가입처럼 처리** (새 uid 발급) 또는 "삭제 처리 중" 메시지
☐ audit_log에 신규 1건: `{ action: 'GDPR_DELETE', uidHash: SHA-256(uid 64자), timestamp }` — uid 평문 금지
☐ Cloud Function 실패 시 클라이언트에 error throw + 토스트 "삭제 중 오류가 발생했어요. policy@worldcrown48.com 으로 문의해 주세요." (§4-3 #258)
☐ §11 E2E 시나리오 #4 (GDPR 삭제 완전성) PASS
```

### P1 — persistence 유지 (탭 닫아도 자동 로그인)

```
☐ `setPersistence(auth, browserLocalPersistence)` 가 `signInWithPopup` **이전에** await 됨 (코드 라인 확인)
☐ lib/firebase.ts `getAuthInstance()` 직후 한 번만 호출 (멱등)
☐ 일반 크롬창에서 로그인 → 탭 닫기 → 새 탭에서 URL 재방문 → **아바타가 유지된 상태로 로드** (1초 뒤 SIGN IN으로 바뀌지 않음)
☐ 아바타가 1초 잠깐 떴다가 사라지는 증상 0건 (UX hydration mismatch도 해결)
☐ Console 에러 `auth/internal-error` 또는 persistence 관련 경고 0건
☐ §11 E2E 시나리오 #1 (persistence 유지) PASS
```

### P2 — 로그아웃 토스트 추가

```
☐ 드롭다운 "로그아웃" 클릭 → `signOut(auth)` await 후 → 토스트 "로그아웃 됐어요." (영문 "Logged out" 동시 또는 i18n)
☐ 토스트 노출 시간 5초 + 사용자 dismiss 가능
☐ §11 E2E 시나리오 #2 (로그아웃 토스트) PASS — `await expect(page.getByText(/로그아웃 됐어요/)).toBeVisible()`
```

### P2 — DeleteAccountModal 진입 경로 무관 단일 위치

```
☐ 모달이 `<body>` 직속 portal에 마운트 (createPortal) — 어떤 페이지/컴포넌트에서 열어도 같은 컨테이너
☐ /account 페이지 진입 vs 아바타 드롭다운 진입 → **모달 위치 동일** (화면 정중앙 fixed)
☐ 모바일 ≤480px 에서 full-bleed bottom sheet 유지 (핸드오프 §6 디자인 변경 금지)
☐ §11 E2E 시나리오 #3 (모달 위치 일관성) PASS — 두 진입점의 bounding box 동일성 검증
```

### P2 — 토스트 위치·지속시간 개선

```
☐ 토스트 위치: 데스크탑 우측 상단(top-right) 또는 화면 중앙 상단(top-center) — 우측 하단 금지(찾기 어려움, 대표 피드백)
☐ 토스트 지속시간: **5초** (기존 짧은 시간 → 5초로 통일)
☐ GDPR 삭제 안내 토스트("최대 30일 걸릴 수 있어요")는 **7초** 또는 dismiss 클릭 전 유지
☐ 한 화면에 동시 다중 토스트 시 위로 쌓이기(stacking) 자연스럽게
```

### P3 — 로딩 스피너 정책 (속도 빠르면 생략)

```
☐ `onUserDelete` callable 응답이 **500ms 이내** 도착하면 스피너 노출 X (대표 피드백: "스피너 필요없을 속도")
☐ **500ms 초과** 시에만 스피너 + "삭제 처리 중…" 텍스트 노출
☐ AC §4-3 #257 (스피너 의무)는 v1.0 위반이 아닌 **스펙 재해석**으로 처리 (본 핸드오프에서 결정)
```

---

## §5. Hard Constraints — DO / DON'T

### DO

- **persistence 호출 위치**: `getAuthInstance()` 직후 한 번 + await + `signInWithPopup` 이전 (§9 함정 7 정확히 준수)
- **onUserDelete IAM**: Functions v2 SA에 `roles/firebaseauth.admin` 부여 확인 (§9 함정 9)
- **Modal portal**: `createPortal(<DeleteAccountModal />, document.body)` — 진입 경로 무관 단일 마운트
- **Toast 위치 통일**: 시스템 전역 ToastContainer 단일 (Sonner 또는 자체 구현)
- **audit_log uidHash**: 평문 uid 절대 금지 — `crypto.subtle.digest('SHA-256', ...)` (lib/audit.ts 기존 함수 재사용)
- **§11 E2E 4개 시나리오 모두 PASS** + Console 에러 0건 자동 검증 (E2E afterEach)

### DON'T

- ❌ silent fail — `try { await deleteUser } catch { /* 무시 */ }` 절대 금지. throw로 클라이언트까지 전파
- ❌ persistence를 `signInWithPopup` 호출 **후** 또는 동기적으로 호출 (효과 없음)
- ❌ Modal을 컴포넌트 트리 안쪽에 마운트 (위치 어긋남 원인)
- ❌ 토스트 위치를 우측 하단 (대표 피드백 — 찾기 어려움)
- ❌ "권장" 표현 사용 (메모 `feedback-superpowers-in-handoff` v2)
- ❌ E2E 없이 머지 (메모 `feedback-superpowers-in-handoff` v2)

---

## §6. Design Reference (재인용)

상위 핸드오프 `D1-locker-room-handoff.md` §6 그대로 — 라이트 테마 토큰, Navbar, UserDropdown, DeleteAccountModal 카피 변경 없음. **위치·portal·persistence·IAM만 fix.**

---

## §7. Test Plan

### 수동 시나리오 (6개 — Fix 별 1개씩)

1. **P0 GDPR 삭제 완전성**: 테스트 계정 로그인 → DELETE 입력 → 삭제 → Firebase Auth Console에서 uid 사라짐 확인 → 같은 계정 재로그인 시도 → 신규 가입 처리
2. **P1 persistence**: 일반 크롬창 로그인 → 탭 닫기 → 새 탭에서 URL 재방문 → 아바타 즉시 유지 (1초 깜빡임 없음)
3. **P2 로그아웃 토스트**: 드롭다운 → 로그아웃 → 토스트 "로그아웃 됐어요." 5초 노출
4. **P2 모달 위치**: /account 버튼 진입 vs 드롭다운 진입 → 모달 위치·크기 동일
5. **P2 토스트 위치**: 우측 상단(또는 중앙 상단) 노출 + 5~7초 유지 + dismiss 가능
6. **P3 스피너**: 빠른 응답 시 스피너 비표시 / 느린 응답(500ms+) 시 스피너 표시

### 반응형 (재검증)

- 375 / 768 / 1440 × Modal·Toast·UserDropdown
- 모바일 토스트는 화면 하단 가능 (모바일 UX는 하단 통상 OK — 데스크탑만 우측 상단)

---

## §8. Analytics Events (변경 없음)

상위 핸드오프 §8 그대로. 단, 다음 1개 신규:

```ts
'gdpr_delete_failed' { code: string }  // P0 fix 후 onUserDelete 실패 분석용
```

---

## §9. 알려진 함정 (재인용 + 보강)

상위 핸드오프 §9 함정 15개 중 **본 fix에서 정면 충돌한 것**:

- **함정 7 (persistence 타이밍)** — v1.0 위반. fix 필수.
- **함정 9 (Cloud Function 삭제 권한)** — v1.0 위반. IAM 권한 확인 필수.
- **함정 15 (Firebase Authorized domains)** — 2026-06-15 해소 완료 (B안 적용). 본 fix 직접 영향 없음.

추가 함정 (본 fix 신설):

16. **Modal portal vs Tailwind z-index 충돌** — `createPortal`로 body 직속 마운트 후에도 부모 컨테이너의 `transform`이 있으면 fixed가 깨질 수 있다. body에 portal 마운트 시 inline-style로 `position: fixed` 보장.

17. **토스트 위치를 모달과 동일 portal에 마운트하면 z-index 충돌** — 토스트 portal은 별도 (`#toast-root`) 필수.

---

## §10. Done-Definition (대표 검수 체크리스트 — v2.1 강화)

```
☐ §4 P0 GDPR 삭제 8항목 모두 ✅
☐ §4 P1 persistence 6항목 모두 ✅
☐ §4 P2 토스트·모달 위치 항목 모두 ✅
☐ §4 P3 스피너 정책 ✅
☐ §5 Hard Constraints DO/DON'T 위반 0건
☐ CLAUDE.md 불변 원칙 8가지 위반 0건
☐ LANGUAGE.md 금지 용어 0건

★★ v2.1 자동 검증 필수 (이거 빠지면 머지 금지) ★★
☐ Firebase Console → Authentication → Settings → Authorized domains 에 다음 모두 등록 확인:
   - localhost
   - worldcrown48.firebaseapp.com
   - worldcrown48.com
   - 이번 PR의 Vercel Preview URL (B안 정책)
☐ Cloud Function 서비스 계정에 `roles/firebaseauth.admin` 부여 확인 (IAM Console 스크린샷 PR 본문 첨부)
☐ §11 Playwright E2E 4개 시나리오 GitHub Actions PASS (실패 트레이스 0건)
☐ E2E HTML 리포트 또는 영상(.webm) PR 본문 첨부 (GitHub Actions artifact 링크)
☐ Console 에러 0건 자동 검증 — E2E afterEach 내장 (`expect(consoleErrors).toHaveLength(0)`)
☐ Firestore 직접 쿼리: 테스트 계정 삭제 후 users·votes·cookieConsents·userPrefs 컬렉션 0건 (E2E 안에서 admin SDK로 검증)
☐ audit_log 신규 1건 uidHash 64자 검증 (E2E 안에서)
☐ VERIFICATION_DISCIPLINE.md §3 firebase-auth-domains + firebase-functions-deploy 체크리스트 각 한 줄씩 ✅
```

그 후 → PR #20 main 머지 → Vercel 프로덕션 자동 배포.

---

## §11. Superpowers 자동 테스트 — 필수 (Required)

> **본 섹션의 모든 항목은 DoD 통과 조건이다.** 누락 시 PR 머지 금지.
> 메모 `feedback-superpowers-in-handoff.md` v2 강제. "권장", "선택", "옵션", "가능하면" 단어 사용 금지.

### §11.1. 3계층 테스트 의무

| 계층 | 도구 | D-1.1 대상 | 통과 기준 |
|------|------|----------|----------|
| **유닛 (Unit)** | vitest | `lib/kst.ts` · `lib/audit.ts` · `lib/voteGate.ts` (v1.0에서 이미 작성됨 — 회귀 통과만 확인) | `npm run test:unit` 100% PASS |
| **통합 (Integration)** | Firebase Emulator + vitest | `onUserDelete` (deleteUser 권한·Firestore batch 검증) · `linkSessionVote` · `onRateLimitCheck` | `npm run test:integration` 100% PASS |
| **E2E (Playwright)** | `@playwright/test` | **persistence · 로그아웃 토스트 · 모달 위치 일관성 · GDPR 삭제 완전성** 4개 시나리오 | `npm run test:e2e` 100% PASS + Console 에러 0건 |

### §11.2. E2E 필수 시나리오 — 4개

신규 파일: `e2e/d1-auth.spec.ts`

```ts
import { test, expect } from '@playwright/test';
import * as admin from 'firebase-admin';

const PREVIEW_URL = process.env.PREVIEW_URL ?? 'http://localhost:3000';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
});

test.afterEach(async () => {
  expect(consoleErrors, 'Console errors must be 0').toHaveLength(0);
});

test.describe('D-1.1 Fix — 4 critical flows', () => {
  // ─────────────────────────────────────────
  test('1. P1 persistence — 탭 닫고 새 탭에서도 아바타 유지 (1초 깜빡임 없음)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/.auth/user.json' });
    const page = await ctx.newPage();
    await page.goto(PREVIEW_URL);

    // 아바타가 처음부터 노출 — 1초 후 SIGN IN으로 바뀌지 않아야 함
    await expect(page.getByTestId('user-avatar')).toBeVisible();
    await page.waitForTimeout(2000); // 2초 대기
    await expect(page.getByTestId('user-avatar')).toBeVisible(); // 여전히 유지
    await expect(page.getByRole('button', { name: /sign in/i })).not.toBeVisible();
  });

  // ─────────────────────────────────────────
  test('2. P2 로그아웃 토스트 — "로그아웃 됐어요." 5초 노출', async ({ page }) => {
    await page.context().storageState({ path: 'tests/.auth/user.json' });
    await page.goto(PREVIEW_URL);

    await page.getByTestId('user-avatar').click();
    await page.getByRole('menuitem', { name: /로그아웃/ }).click();

    await expect(page.getByText(/로그아웃 됐어요/)).toBeVisible({ timeout: 1000 });
    // 5초간 유지 확인
    await page.waitForTimeout(4000);
    await expect(page.getByText(/로그아웃 됐어요/)).toBeVisible();
    // 6초 후 사라짐
    await page.waitForTimeout(2000);
    await expect(page.getByText(/로그아웃 됐어요/)).not.toBeVisible();
  });

  // ─────────────────────────────────────────
  test('3. P2 DeleteAccountModal — 두 진입 경로 위치 동일', async ({ page }) => {
    await page.context().storageState({ path: 'tests/.auth/user.json' });

    // 경로 A: /account 페이지 진입
    await page.goto(`${PREVIEW_URL}/account`);
    await page.getByRole('button', { name: /내 데이터 삭제 요청/ }).click();
    const modalA = page.getByRole('dialog');
    const boxA = await modalA.boundingBox();
    await page.getByRole('button', { name: /취소/ }).click();

    // 경로 B: 아바타 드롭다운 진입
    await page.getByTestId('user-avatar').click();
    await page.getByRole('menuitem', { name: /내 데이터 삭제 요청/ }).click();
    const modalB = page.getByRole('dialog');
    const boxB = await modalB.boundingBox();

    // 두 진입점의 모달 bounding box 동일 (±1px 허용)
    expect(Math.abs(boxA!.x - boxB!.x)).toBeLessThan(2);
    expect(Math.abs(boxA!.y - boxB!.y)).toBeLessThan(2);
    expect(Math.abs(boxA!.width - boxB!.width)).toBeLessThan(2);
  });

  // ─────────────────────────────────────────
  test('4. P0 GDPR 삭제 — 데이터 실제 삭제 + uid 재로그인 불가', async ({ page }) => {
    const testUid = process.env.TEST_UID!;
    const testEmail = process.env.TEST_EMAIL!;

    await page.context().storageState({ path: 'tests/.auth/user.json' });
    await page.goto(`${PREVIEW_URL}/account`);
    await page.getByRole('button', { name: /내 데이터 삭제 요청/ }).click();
    await page.getByPlaceholder('DELETE').fill('DELETE');
    await page.getByRole('button', { name: /데이터 삭제 요청/ }).click();

    // 자동 로그아웃 + 메인 이동
    await expect(page).toHaveURL(PREVIEW_URL + '/');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 5000 });

    // 토스트
    await expect(page.getByText(/요청이 접수됐어요/)).toBeVisible();

    // Firebase Auth Admin SDK로 검증
    const auth = admin.auth();
    await expect(auth.getUser(testUid)).rejects.toThrow(/no user record/);

    // Firestore 검증
    const db = admin.firestore();
    expect((await db.collection('users').doc(testUid).get()).exists).toBe(false);
    expect((await db.collection('votes').where('userId', '==', testUid).get()).size).toBe(0);

    // audit_log 검증 (uidHash 64자, uid 평문 없음)
    const uidHash = require('crypto').createHash('sha256').update(testUid).digest('hex');
    const auditSnap = await db.collection('audit_log').where('uidHash', '==', uidHash).get();
    expect(auditSnap.size).toBe(1);
    expect(auditSnap.docs[0].data().uid).toBeUndefined(); // 평문 uid 없음
  });
});
```

### §11.3. CI 통합 — GitHub Actions

신규 파일: `.github/workflows/d1-e2e.yml`

```yaml
name: D-1 E2E (Playwright)
on:
  pull_request:
    branches: [main]
    paths:
      - 'components/auth/**'
      - 'lib/authStore.ts'
      - 'lib/firebase.ts'
      - 'lib/voteGate.ts'
      - 'functions/src/**'
      - 'app/account/**'
      - 'e2e/d1-auth.spec.ts'
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
      - name: Wait for Vercel Preview
        run: sleep 60   # Vercel 빌드 대기 (또는 vercel preview-deploy action)
      - run: npm run test:e2e
        env:
          PREVIEW_URL: ${{ secrets.D1_PREVIEW_URL }}
          TEST_UID: ${{ secrets.D1_TEST_UID }}
          TEST_EMAIL: ${{ secrets.D1_TEST_EMAIL }}
          FIREBASE_ADMIN_SDK_KEY: ${{ secrets.FIREBASE_ADMIN_SDK_KEY }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### §11.4. Firebase Emulator + 실제 Preview 혼용 전략

- **유닛·통합**: Firebase Emulator (격리·재현·비용 0)
- **E2E**: 실제 Vercel Preview + 전용 Firebase 프로젝트(`worldcrown48-e2e`) 사용 — 운영 데이터 오염 방지 필수
  - 또는 Preview 환경변수에 `NEXT_PUBLIC_USE_EMULATOR=true` 토글 (대표 결정 필요)

### §11.5. PR 본문 첨부 의무

PR 설명에 다음 3가지 명시:

1. GitHub Actions 통과 배지 또는 링크 — 세 계층(unit·integration·e2e) 모두 ✅
2. Playwright HTML 리포트 artifact 링크
3. **IAM Console 스크린샷** — Functions SA에 `roles/firebaseauth.admin` 부여 증명
4. Firebase Console → Auth → Settings → Authorized domains 등록 완료 스크린샷

---

## 부록 A — Cowork 셀프체크리스트 검증 (publish 전 ✓)

본 핸드오프 publish 전 4문항 검증 (메모 `feedback-superpowers-in-handoff` v2):

- [x] §11 별도 섹션 존재
- [x] "권장" 단어 0건 (본문 내 grep — 자동 테스트의 "권장 사항" 등 표현 0건)
- [x] 핵심 사용자 흐름 E2E 시나리오 명시 (4개 + Playwright 코드 예시 포함)
- [x] §10 Done-Definition에 Firebase Authorized domains + E2E 통과 증거 + IAM 스크린샷 의무 항목 포함

4/4 통과 → publish 가능.

---

*© 2026 WorldCrown48 | D-1.1 Fix Handoff v1.0 | CONFIDENTIAL*
*v2.1 템플릿(2026-06-15) 최초 적용 핸드오프*
