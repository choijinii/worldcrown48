# Handoff Brief — D-1 The Locker Room (Domain 4)

> ## ⚠️ 2026-07-07 Guest Run 재정의 (HF-3) — 아래 "비로그인 1회" 관련 서술 대체 고지
> A안(맛보기 모델)의 올바른 정의는 **"비로그인 Voter가 토너먼트 1개를 1회 완주"**(= **Guest Run**)이며,
> 이 문서 곳곳의 "1회 투표"·"세션 1회 투표"·"2번째 Match부터 로그인" 서술은 **"1표" 용어의 모호함이 낳은
> 스펙 오염**(UX-8 근본 원인)이다. 해당 정책 절은 **HF-3 핸드오프**
> (`docs/handoffs/HF3-guest-run-handoff.md`) + **ADR-0008** + **LANGUAGE.md §12(Guest Run)** 가 대체한다.
> 게이트 기준은 `!user`가 아니라 `isAnonymous`, `linkSessionVote`는 votes·bracket_seeds뿐 아니라
> roundProgress·Crown Card 이전 + daily_participation 병합까지 수행한다. (v2.0 본문은 이력 보존을 위해 유지)


> **From**: Cowork (기획·정책·UX 결정) · **To**: Claude Code (실코드)
> **Date**: 2026-06-14 (v2.0) · 2026-06-15 (v2.1 개정) · **Author**: 대표 · **Version**: v2.1
> **작업 브랜치**: `feat/d1-locker-room` (main 최신에서 분기 — Claude Code가 생성·push)
> **목표 산출물**: `components/auth/` + `lib/authStore.ts` + `lib/voteGate.ts` + `functions/src/onUserDelete.ts` + `functions/src/linkSessionVote.ts` + `app/account/page.tsx`(최소) + `firestore.rules`(EDIT) + `app/layout.tsx`(Navbar wrap) + **`e2e/d1-auth.spec.ts`(NEW · §11 필수)** + **`.github/workflows/d1-e2e.yml`(NEW · §11 필수)**
>
> **v2.1 개정 사유 (2026-06-15)**: PR #20 Preview 머지 후 SIGN IN 클릭 시 OAuth 팝업이 즉시 닫히는 버그를 대표 손 클릭으로 발견. 원인은 Firebase Authorized domains 누락. 자동 검증 그물망에서 빠져있었음.
> **v2.1 변경 요약**: ① §11 Superpowers 자동 테스트 — 필수 섹션 신설(별도) ② §10 Done-Definition에 Firebase Authorized domains 등록 + E2E 통과 증거 의무 추가 ③ §9 함정 #15 신설(Firebase Authorized domains 누락) ④ §7의 "권장" → §11의 "필수"로 격상

---

## 🛑 v2.0 정책 충돌 해소 — 2026-06-14 대표 확정

v1.0 작성 직후 대표가 발견한 **상위 기획서 ↔ lite-spec 정책 충돌**을 정식 해소했습니다.

| 문서 | v1.0 시점 | 충돌 내용 |
|------|----------|----------|
| `docs/lite-specs/D1-locker-room.md` (Step 1 · 2026-05-14) | A안 — 맛보기 1회 → 로그인 | "비로그인 세션 1회 투표 허용" |
| `docs/planning/WorldCrown48_v4_9.md` (line 154·157) | B안 — 처음부터 강제 로그인 | "익명 투표 없음" |

**대표 결정 (2026-06-14):** A안(맛보기 모델) 채택. 사유 — 첫 체험 후 가입 전환율 우선, lite-spec 원안 유지.

**조치 완료:**
1. `WorldCrown48_v4_9.md` §원칙 ③ 투표 정책 표 — 5·6·7행 신설(비로그인 1회 허용 / 본인 연결 의무 / 로그인 후 한도) + 설계 철학 v2로 갱신
2. 본 핸드오프 v2.0 — A안 전제로 §3 `linkSessionVote` 정식 포함, §9 함정 14번 추가(충돌 사후 검증 의무), 부록 E v1.0→v2.0 이력
3. 메모리 `feedback-verify-conflicting-specs.md` 신규 — 작업 시작 전 lite-spec ↔ 상위 기획서 정합성 검증 의무

---

## ⚠️ 이 핸드오프의 기준 결정 (Cowork 확정 사항)

| 항목 | 결정 | 사유 |
|------|------|------|
| 산출물 형태 | Handoff Brief 1건 | 역할분담 메모리(`workflow-role-division.md`) — Cowork=기획·핸드오프, Claude Code=실코드 |
| **로그인 정책** | **A안 · 맛보기 모델 (비로그인 1회 허용 → 2회째부터 로그인)** | 2026-06-14 대표 확정. lite-spec 원안. v4_9와 동기화 완료 |
| 로그인 제공자 (Phase A · MVP1) | **Google만** | lite-spec 원안. 일정·검수 위험 최소화. 글로벌 커버리지 충분 |
| 로그인 제공자 (Phase B · MVP1.5~MVP2) | **Apple 추가** | iOS Safari 친화 + App Store 정책. Apple Developer 계정($99/년) + Service ID + Email Relay 도메인 인증 필요 → MVP1 머지 후 별도 PR |
| GDPR 삭제 진입점 | **Navbar 아바타 드롭다운** | D1 lite-spec 원안. 모바일은 하단 탭바 프로필에서 동일 드롭다운 호출 |
| `/account` 페이지 | **있음(최소)** | 드롭다운에서 "계정 설정" 클릭 시 진입. 표시 항목: displayName · email · 가입일 · 데이터 삭제 버튼. 향후 확장 거점 |
| 비로그인 1회 투표 → 로그인 시 uid 연결 | **포함(MVP1 필수)** | A안의 핵심 메커니즘. `linkSessionVote` callable Cloud Function 신설 |

> ⚠️ 위 결정은 본 핸드오프 §3·§4·§5 전체의 전제다. 변경 시 대표에게 재합의 요청 + v4_9·lite-spec 동시 갱신.

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

다음 명령을 순서대로 실행해 결과가 모두 ✓ 인지 확인하세요. 하나라도 ✗ 이면 즉시 멈추고 대표에게 보고하세요. 절대 "파일이 없다"고 단정 짓지 말고, 경로·worktree·브랜치를 재확인하세요. (`VERIFICATION_DISCIPLINE.md` P1·P5)

### 0.1 작업 위치 검증

```bash
# 현재 브랜치 확인 — feat/d1-locker-room 여야 함
git branch --show-current
# 기대값: feat/d1-locker-room

# 만약 없다면 (E-1 머지 후 main 기준으로 분기):
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/d1-locker-room
git push -u origin feat/d1-locker-room
```

### 0.2 핵심 파일 존재 검증 (7개)

```bash
# 1. CLAUDE.md v2.1 (STOP 박스 + 불변 원칙 8가지)
test -f CLAUDE.md && head -30 CLAUDE.md | grep -q "v2.1" && echo "✓ CLAUDE.md v2.1" || echo "✗ CLAUDE.md"

# 2. LANGUAGE.md
test -f LANGUAGE.md && echo "✓ LANGUAGE.md" || echo "✗ LANGUAGE.md"

# 3. D-1 lite-spec
test -f docs/lite-specs/D1-locker-room.md && echo "✓ D-1 lite-spec" || echo "✗ D-1 lite-spec"

# 4. 이 핸드오프 문서 자체
test -f docs/handoffs/D1-locker-room-handoff.md && echo "✓ D-1 handoff" || echo "✗ D-1 handoff"

# 5. 디자인 시스템 v2.4
test -f docs/design/WC48_DESIGN_SYSTEM_v2.4.md && echo "✓ Design System v2.4" || echo "✗ Design System"

# 6. VERIFICATION_DISCIPLINE.md (인프라 작업 가드)
test -f docs/principles/VERIFICATION_DISCIPLINE.md && echo "✓ Verification" || echo "✗ Verification"

# 7. lib/firebase.ts (Auth singleton 패턴 그대로 사용)
test -f lib/firebase.ts && grep -q "getAuthInstance" lib/firebase.ts && echo "✓ firebase.ts" || echo "✗ firebase.ts"
```

### 0.3 의존성 검증

```bash
# 신규 추가 후보 라이브러리 (이미 있는지 먼저 확인)
grep -E '"(zustand|firebase-admin)"' package.json | wc -l
# 0 → 미설치 (예상). 아래 명령으로 설치:
#   npm install zustand
# (firebase-admin은 functions/package.json 에 별도 — 아래 확인)

grep -E '"firebase-admin"' functions/package.json && echo "✓ firebase-admin (functions)" || echo "✗ functions/firebase-admin"
# 없으면: cd functions && npm install firebase-admin

# firebase Web SDK v12 (이미 설치됨)
grep -E '"firebase"' package.json && echo "✓ firebase Web SDK"
```

### 0.4 deprecated 파일 부재 검증

```bash
# 옛 Stitch v3.0·옛 디자인 시안은 참조 금지
find . -name "*Stitch*v3*" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null
# 기대값: 출력 없음

# E-1 머지 흔적 — cookie_consents 컬렉션명이 카멜케이스(cookieConsents)로 들어있음 (의도된 변형). D-1은 §5 DO 항목 참고
grep -n "cookieConsents" firestore.rules | head -2
# 기대값: 라인 2개 이상 (E-1이 만든 룰 존재)
```

### 0.5 정책 동기화 검증 (v2.0 신설 — 가장 중요)

```bash
# A안(맛보기 모델)이 상위 기획서·lite-spec·핸드오프 3곳에 모두 일관되게 표기되어 있는지
grep -c "비로그인 1회" docs/planning/WorldCrown48_v4_9.md
# 기대값: 1 이상  (0이면 v4_9 동기화 누락 — 즉시 중단하고 대표에게 보고)

grep -c "세션 1회 투표 허용" docs/lite-specs/D1-locker-room.md
# 기대값: 1 이상

grep -c "linkSessionVote" docs/handoffs/D1-locker-room-handoff.md
# 기대값: 3 이상  (§3 + §부록 A + §9 등)

# 만약 v4_9에 "익명 투표 없음" 이 살아있으면 충돌 미해소 상태:
grep -n "익명 투표 없음" docs/planning/WorldCrown48_v4_9.md
# 기대값: 출력 없음 (있으면 §9-14 함정 미해소 — 즉시 중단)
```

✅ 위 0.1~0.5 검증이 모두 통과해야 §1로 진행 가능합니다.

---

## §1. Pre-flight Checklist — 읽기 (§0 통과 후)

```
☐ CLAUDE.md v2.1 — 불변 원칙 8가지. 특히 #1 듀얼테마(D4=라이트), #7 웹 전용, #8 스택 고정
☐ LANGUAGE.md — Voter / Contestant / Tournament / Vote Rate(%) 등 공식 용어
☐ docs/lite-specs/D1-locker-room.md — #6 Google 로그인 + 투표 게이트 / #10 GDPR 삭제
☐ docs/lite-specs/C1-vote-engine.md — Vote Engine과의 결합 지점(useVoteGate 호출 위치)
☐ docs/handoffs/D1-locker-room-handoff.md (이 문서) 처음부터 끝까지
☐ docs/principles/VERIFICATION_DISCIPLINE.md — P1~P5. 인프라 변경(Firebase Auth provider, Cloud Function 배포) 전 의무
☐ docs/design/WC48_DESIGN_SYSTEM_v2.4.md — 라이트 테마 토큰(§6 참조)
☐ content/ko/privacy.md §3·§5 — GDPR 삭제권·보관기간 법적 근거 (UX 카피와 일치 필수)
☐ firestore.rules — 현재 cookieConsents 룰 패턴 학습 (소유자 격리)
☐ functions/src/index.ts — Functions v2 callable 패턴 학습 (region asia-northeast3)
☐ lib/firebase.ts — Auth singleton + ensureAnonymousUid() 패턴 그대로 활용
```

---

## §2. Goal — 한 줄 결과 정의

> **Voter가 Google 계정으로 로그인할 수 있고, 비로그인 1회 투표 후 로그인하면 그 투표가 본인 uid로 자동 연결되며, 언제든 "내 데이터 삭제 요청"으로 GDPR Article 17 의무에 부합하는 완전 삭제를 받을 수 있다.**

법적 의무(GDPR Art. 17 삭제권 + Art. 30 처리기록 의무) + 서비스 가치(투표 한도 5회 안정 운영)가 동시에 걸린 모듈입니다.

---

## §3. Files to CREATE / MODIFY

### 3-1. 상태·게이트 (D1·M1 — Auth Core)

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/authStore.ts` | **NEW** | Zustand — user · loading · sessionVoteUsed + signInWithGoogle · signOut · markSessionVoteUsed |
| `lib/voteGate.ts` | **NEW** | useVoteGate · useShareGate · getTodayVoteCount(KST 자정 기준) |
| `lib/kst.ts` | **NEW** | `getTodayKST(): string` — `"YYYY-MM-DD"` (UTC+9 자정). 외부 라이브러리 X, Intl.DateTimeFormat 사용 |
| `lib/audit.ts` | **NEW** | `hashUid(uid: string): Promise<string>` — Web Crypto SHA-256, GDPR audit_log 저장용 |

### 3-2. 컴포넌트 (D1·M2 — UI)

| 경로 | 동작 | 비고 |
|---|---|---|
| `components/auth/AuthProvider.tsx` | **NEW** | `onAuthStateChanged` 구독 + authStore 동기화. RootLayout 안쪽에 mount |
| `components/auth/Navbar.tsx` | **NEW** | 라이트 테마 GNB. SignInButton ↔ UserAvatar 전환 |
| `components/auth/SignInButton.tsx` | **NEW** | "SIGN IN" 버튼 (Google 아이콘 SVG inline) → signInWithGoogle |
| `components/auth/UserAvatar.tsx` | **NEW** | 로그인 시: photoURL ring-2 gold 원형 + displayName. 클릭 → UserDropdown |
| `components/auth/UserDropdown.tsx` | **NEW** | 드롭다운 메뉴: "계정 설정" · "내 데이터 삭제 요청" · "로그아웃" |
| `components/auth/LoginModal.tsx` | **NEW** | reason prop ('vote'·'share'·'daily_limit') 따라 카피 변경. focus-trap-react 재사용 |
| `components/auth/DeleteAccountModal.tsx` | **NEW** | 경고 + "DELETE" 직접 입력 → onUserDelete 호출. focus-trap-react |
| `components/auth/MobileProfileTab.tsx` | **NEW** | 모바일 하단 탭바 우측 프로필 항목 (드롭다운 동일) |

### 3-3. /account 페이지 (D1·M3 — 최소)

| 경로 | 동작 | 비고 |
|---|---|---|
| `app/account/page.tsx` | **NEW** | 라이트 테마. displayName · email · 가입일 · "내 데이터 삭제 요청" 버튼 |
| `app/account/layout.tsx` | **NEW** | `<div data-theme="light">` wrap (불변 원칙 #1) |

### 3-4. Cloud Functions (D1·M4 — 서버)

| 경로 | 동작 | 비고 |
|---|---|---|
| `functions/src/onUserDelete.ts` | **NEW** | callable. users·votes·cookieConsents·userPrefs 일괄 삭제 + audit_log에 hashUid + Auth 계정 삭제 |
| `functions/src/linkSessionVote.ts` | **NEW** | callable. 익명 uid로 저장된 vote 1건을 새 Google uid로 이전 (userId 필드 갱신) |
| `functions/src/index.ts` | **EDIT** | 위 두 함수 export 추가 |

### 3-5. 보안 룰 (D1·M5 — Firestore)

| 경로 | 동작 | 비고 |
|---|---|---|
| `firestore.rules` | **EDIT** | `/votes/{voteId}` · `/audit_log/{logId}` · `/userPrefs/{uid}` 룰 추가 (§부록 B) |

### 3-6. 기존 파일 수정

| 경로 | 동작 | 비고 |
|---|---|---|
| `app/layout.tsx` | **EDIT** | `<AuthProvider>` 추가 (CookieConsentProvider 안쪽). `<Navbar>` mount |
| `app/globals.css` | **EDIT** | `.domain-locker` 라이트 wrapper 토큰 alias (E-1 토큰 그대로 재사용 — 신규 hex 추가 금지) |
| `package.json` | **EDIT** | `zustand` 추가 |
| `functions/package.json` | **EDIT** | `firebase-admin` 추가 (이미 있으면 skip) |

---

## §4. Acceptance Criteria — 완료 조건 (43개)

### 4-1. 로그인 (D1·M1·M2) — 9개

```
☐ Navbar 우측 "SIGN IN" 버튼 클릭 → Google OAuth 팝업 → 로그인 성공 시 UserAvatar로 전환 (3초 내)
☐ Google 팝업 거절·차단·네트워크 오류 → 토스트 "로그인에 실패했어요. 다시 시도해 주세요." (영문 동시 표기)
☐ 새 탭·새 방문 시 자동 로그인 유지 (Firebase persistence: local)
☐ UserAvatar 표시: photoURL(원형 56x56 desktop · 40x40 mobile, ring-2 gold #FCD006), displayName(말줄임 24자)
☐ photoURL 없을 때 displayName 이니셜 폴백 (검정 #0E0944 배경 + 골드 글자)
☐ UserAvatar 클릭 → UserDropdown 열림 (모바일은 bottom sheet 변형)
☐ UserDropdown 외부 클릭·Escape → 닫힘
☐ "로그아웃" 클릭 → signOut → Navbar 즉시 SIGN IN 복귀. 토스트 "로그아웃 됐어요."
☐ aria: SIGN IN 버튼 aria-label="Sign in with Google". UserAvatar 버튼 aria-expanded, role="button"
```

### 4-2. 투표 게이트 (D1·M1) — 8개

```
☐ 비로그인 1회째 투표 → 허용 + sessionVoteUsed=true
☐ 비로그인 2회째 투표 → LoginModal(reason='vote') 표시, "투표하려면 로그인이 필요해요"
☐ 로그인 후 LoginModal 자동 닫힘 + 보류된 투표가 본인 uid로 진행 (linkSessionVote 호출)
☐ 로그인 유저 1일 5회 한도 도달 → LoginModal(reason='daily_limit'), "오늘의 투표를 모두 사용했어요 (5/5)"
☐ KST 자정 기준 일일 카운트 리셋 (date 필드 == getTodayKST())
☐ 1분 10회 초과 → onRateLimitCheck Cloud Function 429 → "잠시 후 다시 시도해 주세요 (15분 쿨다운)"
☐ Rate Limit·일일 한도 모달은 동시에 뜨지 않음 (우선순위: Rate > Daily > Login)
☐ Crown Card 공유 클릭 시 비로그인 → LoginModal(reason='share'), "공유하려면 로그인이 필요해요"
```

### 4-3. GDPR 삭제 (D1·M3·M4·M5) — 11개

```
☐ UserDropdown "내 데이터 삭제 요청" 클릭 → DeleteAccountModal 열림
☐ 모달 상단: "이 작업은 되돌릴 수 없어요" + 삭제 범위 4줄(계정·투표 기록·쿠키 동의·환경설정)
☐ 모달 하단: "보존되는 항목" 명시(익명 통계·법적 감사 로그(3년))
☐ "DELETE" 직접 입력 칸 (소문자·공백 거부, 정확히 일치 시에만 빨간 버튼 활성)
☐ "데이터 삭제 요청" 클릭 → onUserDelete 호출 → 로딩 스피너 → 성공 시 자동 로그아웃 + "/" 이동
☐ 토스트: "요청이 접수됐어요. 처리에 최대 30일 걸릴 수 있어요." (privacy.md §3 정합)
☐ onUserDelete 실패 → "삭제 중 오류가 발생했어요. policy@worldcrown48.com 으로 문의해 주세요."
☐ Firestore 검증: users/{uid} · votes(userId==uid) · cookieConsents/{uid} · userPrefs/{uid} 0건
☐ Firestore 검증: audit_log 에 신규 1건 — { action: 'GDPR_DELETE', uidHash: SHA-256(uid), timestamp } — **uid 원문 저장 금지**
☐ Firebase Auth Console 검증: 해당 uid 계정 없음
☐ vote_stats(Realtime DB) — **보존** (익명 집계, 개인식별 불가)
```

### 4-4. /account 페이지 (D1·M3) — 4개

```
☐ 비로그인 접근 → "/" 리다이렉트 (Next.js middleware 또는 클라이언트 가드)
☐ 라이트 테마 (bg #F2F2F5, royal #241754) — Domain 5와 동일 토큰 alias
☐ displayName · email · 가입일(YYYY-MM-DD KST) 표시. email 마스킹 옵션 X (본인 화면이므로)
☐ "내 데이터 삭제 요청" 버튼 = DeleteAccountModal 동일 진입점
```

### 4-5. 전역 — 7개

```
☐ Domain 4 라이트 테마 적용 (Navbar·Dropdown·Modals·/account) — wrapper data-theme="light"
☐ Domain 0~3 다크 surface 위에 Navbar overlay 시 토큰 충돌 없음 (Navbar 자체 wrapper로 스코프)
☐ Crown Gold #FCD006 — UserAvatar ring, 활성 버튼 hover 가장자리 (불변 원칙 #2)
☐ TypeScript strict 통과 (lib/authStore.ts · functions/src/* 포함)
☐ console.error 0건 (로그인·로그아웃·삭제 흐름 전체)
☐ Lighthouse 접근성 90+ (Navbar, /account)
☐ public/ 자산 — Google G 아이콘 SVG (Apple은 Phase B 진입 시 추가)
```

### 4-6. linkSessionVote (D1·M4) — 4개

```
☐ 익명 uid(A)로 vote 1건 저장 → 동일 세션에서 Google 로그인(새 uid B) → linkSessionVote(A→B) 호출
☐ Cloud Function: votes 컬렉션에서 userId==A & sessionId==current 만 검색해 userId=B로 갱신 (전체 votes 스캔 금지)
☐ 익명 계정(A)은 deleteUser(A) 로 정리 — orphan 익명 누적 방지
☐ 실패 시 클라이언트는 sessionVoteUsed=true 유지 (이중 투표 방지). 토스트 "투표 연결에 실패했어요"
```

---

## §5. Hard Constraints — DO / DON'T

### DO

- **Domain 4 라이트 테마** — `[data-theme="light"]` 또는 `.domain-locker` wrapper. 토큰은 E-1이 추가한 라이트 토큰 그대로 재사용(신규 hex 도입 금지)
- **Crown Gold `#FCD006`** — UserAvatar ring, 활성 hover. 불변 원칙 #2
- **Firebase Auth** GoogleAuthProvider. `signInWithPopup`(데스크탑) → 실패 시 `signInWithRedirect`(모바일·iOS Safari) 폴백
- **persistence: browserLocalPersistence** — 닫았다 켜도 로그인 유지
- **익명 Auth 활용** — E-1이 이미 도입한 ensureAnonymousUid() 그대로. uid 생성 위치 중복 금지
- **callable Cloud Function**(`onCall`) — region `asia-northeast3` 유지 (functions/src/index.ts 전역 옵션)
- **audit_log 보존** — GDPR Art. 30 처리기록 의무. uid는 **SHA-256 해시만** 저장 (uid 원문 저장 금지)
- **DeleteAccountModal "DELETE" 영문 대문자** 입력 — 실수 삭제 방지 (i18n에서도 동일 문자열)
- **focus-trap-react** — LoginModal·DeleteAccountModal·UserDropdown(bottom sheet) 모두 키보드 트랩
- **반응형 3 BP** — 모바일 375 / 태블릿 768 / 데스크탑 1440. 모바일은 하단 탭바 프로필 진입점

### DON'T

- **다크 테마 금지** — D4는 라이트 (불변 원칙 #1)
- **localStorage 사용 금지** — Firebase Auth 내부 persistence는 OK. 그 외 인증 상태·세션 표지 localStorage 금지
- **uid 원문을 audit_log에 저장 금지** — SHA-256(uid) 만. 위반 시 GDPR Art. 17 위반
- **Vote Count(절대 수치) UI 노출 금지** — `Today X/5` 같은 카운터는 라벨로만, 절대 수치 다른 어디에도 노출 금지 (lite-spec과 충돌 없음 — 한도 안내는 허용)
- **FIFA·Official 문자 사용 금지** — 불변 원칙 #5
- **Apple/Facebook/X 프로바이더 코드 작성 금지** — Phase B 별도 PR (Apple Developer 계정 + Service ID 발급 후)
- **`AI-Report` 표기 금지** — D4는 등장 불가 (Footer-Only Lock v2.4)
- **Vite·React Router 표기 무시** — lite-spec 일부 구버전. Next.js 14 App Router로 재해석
- **Firestore 컬렉션명 변경 금지** — 신규 컬렉션 `votes` · `audit_log` · `userPrefs` (snake/camel 혼용 주의: §부록 B 참조)
- **Round 정보·LIVE 배지·우승자 예측 표기 금지** — D4 어디에도 (불변 원칙)

---

## §6. Design Reference

### 라이트 테마 토큰 (E-1 알리아스 — 신규 hex 추가 금지)

```css
/* app/globals.css 안 [data-theme="light"], .domain-policy, .domain-locker 셀렉터에 추가 */
[data-theme="light"], .domain-policy, .domain-locker {
  /* 배경 */
  --color-bg-light:       #F2F2F5;
  --color-surface-light:  #FFFFFF;
  --color-surface-soft:   #F8F8FB;
  /* 텍스트 */
  --color-text-light:     #0E0944;
  --color-text-sub-light: #3A4570;
  --color-text-muted-light:#8C99B3;
  /* 보더 */
  --color-border-light:   #D4DCE3;
  --color-border-soft:    #E6EAF0;
  /* 골드 (테마 공통) */
  --color-gold:           #FCD006;
  --color-gold-hover:     #E3BB05;
  --color-gold-glow:      rgba(252,208,6,0.25);
  /* 시맨틱 */
  --color-crimson:        #D7063A;  /* DeleteAccountModal CTA */
  --color-turquoise:      #00A3B7;  /* 성공 토스트 */
  /* 그림자 */
  --shadow-modal: 0 24px 60px rgba(14,9,68,0.22);
  --shadow-gold:  0 0 28px rgba(252,208,6,0.30);
}
```

### Navbar — 컴포넌트 구조

```
<header.gnb data-theme="light">
  <a.gnb-logo href="/">WORLD CROWN 48</a>
  <nav.gnb-links>...(MVP1 후 추가)</nav>
  <div.gnb-actions>
    [비로그인] <SignInButton />  — "SIGN IN" 골드 outline 버튼
    [로그인]   <UserAvatar />    — ring-2 ring-[--color-gold] + displayName
  </div>
</header>
```

### UserDropdown — 메뉴 구조

```
<menu.dropdown>
  ── 헤더 (photoURL 80x80 + displayName + email)
  ── 항목 1: 계정 설정      → /account
  ── 항목 2: 내 데이터 삭제 요청 → DeleteAccountModal
  ── 구분선
  ── 항목 3: 로그아웃        → signOut
</menu>
모바일: 하단 bottom sheet (높이 60vh, swipe-down 닫기, swipe-y 비활성)
```

### DeleteAccountModal — 카피 (한국어 기준)

```
■ 헤더
  "내 데이터 삭제 요청"
  "Delete my data"

■ 본문 — 빨간 경고 박스
  "이 작업은 되돌릴 수 없어요."
  "확인 후 30일 이내 다음 항목이 영구 삭제돼요."

■ 삭제 항목 (체크 아이콘 4줄)
  ✓ 계정 정보 (Google 연결 끊김, 표시 이름·이메일·프로필 이미지 삭제)
  ✓ 투표 기록 (지금까지 한 모든 Match 투표)
  ✓ 쿠키 동의 기록
  ✓ 환경설정 (언어·테마 등)

■ 보존 항목 (회색 박스)
  • 익명 집계 통계 (개인식별 불가, vote_stats)
  • 법적 감사 로그 (3년 보관, uidHash만 — GDPR Art. 30 의무)

■ 확인 입력
  "다음 문자를 입력해 주세요: DELETE"
  [입력 칸]

■ 액션
  [취소] (gray outline)
  [데이터 삭제 요청] (#D7063A · DELETE 일치 시 활성)
```

### Apple 로그인 — Phase B 디자인 메모 (코드 작성 금지, 참고용)

```
■ 버튼: SignInButton의 두 번째 카드 (구분선 위)
  [G Google로 계속하기]
  [ Apple로 계속하기]   ← Apple HIG 검정 버튼 (배경 #000, 글자 흰색)
■ provider: new OAuthProvider('apple.com'). scopes: email, name
■ Email Relay: privaterelay.appleid.com 도메인 — Apple 콘솔에 worldcrown48.com 인증 + DNS TXT 등록 필요
```

---

## §7. Test Plan

### 수동 시나리오 (12개)

1. 첫 방문 → 쿠키 동의 → Tournament 1개 투표 → 로그인 유도 → Google 로그인 → 1회 투표가 본인 uid로 연결됨
2. 로그인 상태에서 같은 Tournament 5회 투표 → 6회째 daily_limit 모달
3. 자정 KST 통과 후 (수동 시계 조작) → 다시 5회 가능
4. 1분간 10회 빠른 클릭 → 11번째에 Rate Limit 토스트
5. 로그인 → 새 탭 → 자동 로그인 유지 (persistence)
6. 로그인 → 아바타 클릭 → "계정 설정" → /account 진입
7. /account → "데이터 삭제 요청" → "DELETE" 입력 → 삭제 성공 → 자동 로그아웃 → "/"
8. 삭제 직후 Firestore Console: users·votes·cookieConsents 0건, audit_log 1건(uidHash)
9. 삭제 직후 Firebase Auth Console: 해당 uid 사라짐
10. iOS Safari 모바일: 팝업 차단 → redirect 폴백으로 로그인
11. Crown Card 공유 비로그인 클릭 → reason='share' 모달
12. Google 로그인 취소(팝업 닫기) → 에러 토스트, sessionVoteUsed 변동 없음

### 반응형 (3 BP × 4 surface = 12개)

- 375 / 768 / 1440 × Navbar / Dropdown / LoginModal / DeleteAccountModal
- 모바일 Navbar는 로고만, 프로필은 하단 탭바
- 모바일 Dropdown은 bottom sheet
- 모달은 모바일 ≤480px에서 full-bleed bottom sheet

### 자동 테스트 — **§11로 이동·격상 (v2.1)**

⚠️ v2.0에서 "권장"으로 적었던 자동 테스트 항목은 **§11 Superpowers 자동 테스트 — 필수**로 이동·격상되었습니다. 유닛 테스트만이 아니라 **통합·E2E 3계층 모두 필수**입니다. §11을 반드시 읽으세요.

---

## §8. Analytics Events

```ts
// lib/analytics.ts 에 추가 (E-1 패턴 따라 NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID 있을 때만 발송)
'auth_signin_attempt'      { provider: 'google' }
'auth_signin_success'      { provider: 'google', isNewUser: boolean }
'auth_signin_error'        { provider: 'google', code: string }
'auth_signout'             {}
'vote_gate_login_required' { reason: 'vote'|'share' }
'vote_gate_daily_limit'    { tournamentId: string }
'vote_gate_rate_limit'     {}
'session_vote_linked'      { ok: boolean }
'account_delete_open'      {}
'account_delete_confirm'   {}  // "DELETE" 입력 통과
'account_delete_success'   {}
'account_delete_error'     { code: string }
```

(`marketing` 카테고리 동의 없이도 발송 가능한 essential·functional 범위에 한함 — privacy.md §2 정합)

---

## §9. 알려진 함정 (Cowork이 미리 파악한 위험 — 15개)

1. **iOS Safari 팝업 차단** — `signInWithPopup` 실패율이 높다. `signInWithRedirect` 폴백 필수. 리다이렉트 복귀 시 `getRedirectResult` 처리도 함께. (모르면 Firebase Auth 공식 문서 확인 — P2)

2. **익명 → Google 계정 전환** — `linkWithCredential`을 쓰면 익명 uid가 그대로 유지되지만, **이미 다른 디바이스에서 같은 Google 계정으로 가입한 경우 충돌**(`auth/credential-already-in-use`)이 발생한다. 이때는 익명 uid를 버리고 기존 Google uid로 sign-in → `linkSessionVote(익명uid, Google uid)` 흐름이 더 안전. 핸드오프는 이 안전 흐름을 채택했다.

3. **vote 컬렉션 일괄 스캔 비용** — onUserDelete에서 `where userId == uid` 쿼리는 인덱스 필수. 미생성 시 첫 호출에서 실패 + 콘솔에 인덱스 생성 링크 노출. **사전에 `firestore.indexes.json`에 추가**:
   ```json
   { "collectionGroup":"votes","fields":[{"fieldPath":"userId","order":"ASCENDING"}] }
   ```

4. **KST 자정 경계** — `new Date().toISOString().slice(0,10)`은 UTC 기준이라 한국 사용자 09:00 전후로 카운트가 어긋난다. **반드시 `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'})`** 또는 수동 오프셋 +9h. lite-spec의 `getTodayKST()` 시그니처 그대로.

5. **GDPR audit_log uid 평문 저장 사고** — lite-spec D-1 §10의 예제 코드에 주석으로만 적혀 있고 실제 `batch.set`에는 `uid: uid` 원문이 들어있다. **핸드오프 §부록 B의 최종 스키마(`uidHash`)로 덮어쓰기.** 위반 시 GDPR Art. 17 위반.

6. **/account 비로그인 접근** — Next.js App Router의 SSR 단계에서는 Firebase Auth user를 알 수 없다. 클라이언트 가드(`useEffect`) + `router.replace('/')`로 처리. 미들웨어는 불가.

7. **persistence 설정 타이밍** — `setPersistence(auth, browserLocalPersistence)`는 `signInWithPopup` **전에** await 해야 효과적. lib/firebase.ts의 `getAuthInstance()` 직후 호출.

8. **이미지 호스트 화이트리스트** — Google photoURL은 `lh3.googleusercontent.com`. `next.config.mjs` `images.remotePatterns`에 추가 필요. 누락 시 빌드 통과 + 런타임 403.

9. **Cloud Function 삭제 권한** — `admin.auth().deleteUser(uid)` 는 functions의 서비스 계정에 `roles/firebaseauth.admin` 필요. Functions v2 기본 SA가 부족할 수 있다 — 첫 배포 후 IAM Console에서 권한 확인(`VERIFICATION_DISCIPLINE.md` §3 firebase-functions-deploy 체크리스트).

10. **vote_stats 보존 결정** — Realtime DB의 집계 카운터는 익명·역추적 불가 데이터로 본 핸드오프는 보존을 채택했다. **단, 집계가 uid·email 등 식별자를 키로 쓰는 구조라면 재논의 필요.** 현 시점 lite-spec C1·C3 기준 안전.

11. **Firestore 컬렉션명 표기 혼선** — E-1이 만든 `cookieConsents`(camelCase)와 lite-spec 표준(`cookie_consents` snake)가 충돌. **D-1 신규는 CLAUDE.md "DB 컬렉션명 정합" 지침 따라 snake_case 채택**: `votes` · `audit_log` · `user_prefs`. 코드 안 타입명은 PascalCase(`Vote`, `AuditLog`)로 분리 — DB명만 snake_case.

12. **DeleteAccountModal "DELETE" 입력 i18n** — 영어 키워드 그대로 두는 게 실수 방지에 더 강하다. `content/ko`·`content/en` 공통으로 "DELETE" 사용 + 안내 문구만 번역.

13. **Apple Phase B 진입 시 도메인 인증** — `worldcrown48.com` Apple Service ID 등록 → Apple 콘솔이 요구하는 DNS TXT 레코드 Cloudflare에 추가. DNS 변경은 `VERIFICATION_DISCIPLINE.md` §3 dns-records 체크리스트 의무 대상.

14. **상위 기획서 ↔ lite-spec 충돌 (v2.0 신설)** — 본 핸드오프 v1.0 작성 직후 발견: `WorldCrown48_v4_9.md` line 154가 "익명 투표 없음"으로 정반대를 표기했었음. **2026-06-14 A안(맛보기) 채택으로 v4_9를 갱신해 단일 진실 회복**. Claude Code는 §0 자가검증에서 `grep "비로그인 1회" docs/planning/WorldCrown48_v4_9.md` 가 1건 이상 나오는지 확인할 것 — 0건이면 동기화 누락이므로 즉시 중단.

15. **Firebase Authorized domains 누락 (v2.1 신설 · 실제 사고 기반)** — **2026-06-15 PR #20 사고**: Vercel Preview URL이 Firebase Console의 Authorized domains에 등록 안 되어 OAuth 팝업이 즉시 닫혔다. 사용자는 영문도 모르고 좌절. **원인 메시지**: `The current domain is not authorized for OAuth operations. Add your domain to the OAuth redirect domains list in the Firebase console → Authentication → Settings → Authorized domains tab.`
   - **Vercel은 PR마다 새 Preview 도메인 생성**: `worldcrown48-git-<branch-name>-choijiniis-projects.vercel.app`
   - **Firebase는 wildcard 미지원** (`*.vercel.app` 등록 불가) → 정확한 도메인 매번 등록 필수
   - **정책 (2026-06-15 대표 확정, B안)**: PR마다 Preview 도메인을 Authorized domains에 등록. 번거롭더라도 머지 전 OAuth 검증 가능하게 함. A안(Production만 등록) 폐기.
   - **체크리스트**: `VERIFICATION_DISCIPLINE.md` §3 `firebase-auth-domains` 의무 실행. §10 Done-Definition에 명시.

---

## §10. Done-Definition (대표 검수 체크리스트)

Claude Code가 PR을 제출하면 대표가 다음을 한 줄씩 ✅:

```
☐ §4 Acceptance Criteria 43개 모두 통과 (사인업 9 + 게이트 8 + GDPR 11 + /account 4 + 전역 7 + linkSessionVote 4)
☐ §5 Hard Constraints DO/DON'T 위반 0건
☐ CLAUDE.md 불변 원칙 8가지 위반 0건 (#1 D4 라이트, #2 Crown Gold만, #4 AI-Report 미사용, #5 FIFA 미사용, #7 웹 전용)
☐ LANGUAGE.md 금지 용어 0건
☐ §7 수동 시나리오 12개 통과
☐ 반응형 12개(3 BP × 4 surface) 통과
☐ Firestore Console — 테스트 계정 삭제 후 users·votes·cookieConsents 0건, audit_log 1건(uidHash 64자)
☐ Firebase Auth Console — 삭제된 uid 사라짐 (캐시 새로고침)
☐ Realtime DB Console — vote_stats 카운터는 유지(증명 스크린샷)
☐ Cloud Functions 배포 성공(onUserDelete + linkSessionVote) + 호출 로그 200
☐ firestore.rules deploy 성공 + emulator 또는 콘솔에서 deny 케이스 확인
☐ firestore.indexes.json deploy 성공 (votes.userId 인덱스)
☐ Vercel Preview 배포 — 라이브 URL에서 로그인·삭제 흐름 end-to-end 1회 통과 (P3 의무)
☐ public/ 에셋 (Google G svg) 포함
☐ VERIFICATION_DISCIPLINE.md §3 체크리스트 — firebase-functions-deploy / firebase-rules-deploy / vercel-env-vars / **firebase-auth-domains (v2.1 신설)** 한 줄씩 ✅

★★ v2.1 추가 필수 항목 (이거 빠지면 머지 금지) ★★
☐ **Firebase Console → Authentication → Settings → Authorized domains** 에 다음 모두 등록 확인:
   - `localhost` (개발)
   - `worldcrown48.firebaseapp.com` (기본)
   - `worldcrown48.com` (운영)
   - **이번 PR의 Preview URL** (B안 정책 — 매 PR 등록 의무) — 예: `worldcrown48-git-feat-d1-locker-room-choijiniis-projects.vercel.app`
☐ **§11 Playwright E2E 4개 시나리오** GitHub Actions에서 모두 PASS (`.github/workflows/d1-e2e.yml` 실행 로그)
☐ **E2E HTML 리포트 또는 실행 영상(.webm)** PR 본문에 첨부 (GitHub Actions artifact 링크 가능)
☐ **Console 에러 0건 자동 검증** — E2E 내장 (`expect(consoleErrors).toHaveLength(0)`)
☐ **Preview URL에서 직접 SIGN IN 클릭 → Google 팝업 정상 유지** 1회 확인 (자동 + 수동 둘 다)
```

그 후 → main 머지 → Vercel 프로덕션 자동 배포.

---

## §11. Superpowers 자동 테스트 — 필수 (Required)

> **본 섹션의 모든 항목은 DoD 통과 조건이다.** 누락 시 PR 머지 금지.
> 메모 `feedback-superpowers-in-handoff.md` v2 강제 사항. "권장", "선택", "옵션", "가능하면" 단어 금지.
> v2.1 신설 사유 — 2026-06-15 PR #20 OAuth 사고로 "자동 검증 그물망" 부재 확인.

### §11.1. 3계층 테스트 의무

| 계층 | 도구 | D-1 대상 | 통과 기준 |
|------|------|---------|----------|
| **유닛 (Unit)** | vitest | `lib/kst.ts`(타임존 5개) · `lib/audit.ts`(hashUid 결정성·64자) · `lib/voteGate.ts`(3 가지) | `npm run test:unit` 100% PASS |
| **통합 (Integration)** | Firebase Emulator + vitest | `onUserDelete` · `linkSessionVote` · `onRateLimitCheck` callable + `firestore.rules` deny 케이스 | `npm run test:integration` 100% PASS |
| **E2E (Playwright)** | `@playwright/test` | 로그인 · 로그아웃 · /account · GDPR 삭제 4개 시나리오 (헤드리스 크롬) | `npm run test:e2e` 100% PASS + Console 에러 0건 |

### §11.2. E2E 필수 시나리오 — 4개

신규 파일: `e2e/d1-auth.spec.ts`

```ts
import { test, expect } from '@playwright/test';

const PREVIEW_URL = process.env.PREVIEW_URL ?? 'http://localhost:3000';

test.describe('D-1 Locker Room — Auth & GDPR', () => {
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

  test('1. Google 로그인 → 아바타 전환 (3초 내)', async ({ page }) => {
    await page.goto(PREVIEW_URL);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Firebase Emulator 또는 테스트 Google 계정 OAuth 처리
    await expect(page.getByTestId('user-avatar')).toBeVisible({ timeout: 3000 });
  });

  test('2. 아바타 드롭다운 → 로그아웃 → SIGN IN 복귀', async ({ page }) => {
    // 사전 로그인 상태 → 아바타 클릭 → 로그아웃 → SIGN IN 노출
  });

  test('3. /account 비로그인 접근 → / 리다이렉트', async ({ page }) => {
    await page.goto(`${PREVIEW_URL}/account`);
    await expect(page).toHaveURL(PREVIEW_URL + '/');
  });

  test('4. DELETE 입력 → 데이터 삭제 → 자동 로그아웃 → audit_log 1건', async ({ page }) => {
    // 사전 로그인 → 드롭다운 → "내 데이터 삭제 요청" → "DELETE" 입력 → 확인
    // Firestore Admin SDK로 audit_log uidHash 64자 검증
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
      - run: npm run test:e2e
        env:
          PREVIEW_URL: ${{ github.event.pull_request.head.repo.html_url }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### §11.4. PR 본문 — 실행 증거 첨부 의무

PR 설명에 다음 3가지 첨부:

1. **GitHub Actions 통과 배지 또는 링크** — 세 계층(unit·integration·e2e) 모두 ✅
2. **Playwright HTML 리포트 artifact 링크** — 위 워크플로우의 upload-artifact 결과물
3. **실패 시 자동 캡처 트레이스(.zip)** — `playwright-report/trace/` 폴더 첨부

### §11.5. Firebase Emulator 사용 안내

E2E와 통합 테스트는 실제 Firebase가 아닌 **로컬 Emulator**로 실행 (테스트 비용·격리·재현성):

```bash
firebase emulators:start --only auth,firestore,functions
npm run test:e2e
```

`firebase.json`에 emulator 설정 추가. Google OAuth는 Emulator의 mock auth 사용.

---

## 부록 A — 로그인 흐름 시퀀스 다이어그램 (텍스트)

```
[비로그인 1회째 투표]
Voter → VS Battle View → 좌측 카드 클릭
      → useVoteGate.checkCanVote()
        → !user && !sessionVoteUsed → { status: 'allowed' }
      → vote 기록 (userId: anonUid, sessionId: <uuid>, date: KST)
      → onVoteSuccess() → markSessionVoteUsed()

[비로그인 2회째 → 로그인]
Voter → 두 번째 Match 시작
      → useVoteGate.checkCanVote()
        → !user && sessionVoteUsed → { status: 'login_required', reason:'vote' }
      → LoginModal 표시
      → "Google 로그인" 클릭 → signInWithGoogle()
        ↓
        [팝업 성공]                 [팝업 차단]
        signInWithPopup            signInWithRedirect → getRedirectResult on return
        ↓                           ↓
      onAuthStateChanged(user=Google uid)
      → authStore.user = user
      → linkSessionVote(anonUid, googleUid) callable
        → Cloud Function: votes where userId==anonUid && sessionId==current → set userId=googleUid
        → admin.auth().deleteUser(anonUid)
      → LoginModal.onSuccess() → 두 번째 Match 투표 재시도 → 'allowed' → 기록

[GDPR 삭제]
User → Avatar → Dropdown → "내 데이터 삭제 요청"
     → DeleteAccountModal → "DELETE" 입력 → 액션
     → onUserDelete callable
       → Firestore batch: users/{uid}, votes(where userId==uid), cookieConsents/{uid}, user_prefs/{uid} delete
       → audit_log set { action:'GDPR_DELETE', uidHash: SHA-256(uid), timestamp: serverTimestamp() }
       → admin.auth().deleteUser(uid)
     → 클라이언트: signOut → router.replace('/') → 토스트
```

---

## 부록 B — Firestore 스키마·룰

### `votes/{voteId}` (NEW)

```ts
interface Vote {
  userId: string            // 익명 uid 또는 Google uid
  sessionId: string         // 브라우저 세션 UUID (linkSessionVote 검색 키)
  tournamentId: string
  matchId: string
  contestantId: string
  date: string              // "YYYY-MM-DD" KST 자정 기준
  createdAt: Timestamp      // serverTimestamp()
}
```

### `audit_log/{logId}` (NEW · 자동 ID)

```ts
interface AuditLog {
  action: 'GDPR_DELETE' | 'GDPR_EXPORT' | 'ADMIN_OVERRIDE'
  uidHash: string           // SHA-256(uid) — 64자 hex. **uid 원문 저장 금지**
  timestamp: Timestamp
  meta?: Record<string, string|number|boolean>  // 행위별 부속 정보
}
```

### `user_prefs/{uid}` (NEW)

```ts
interface UserPrefs {
  uid: string
  lang: 'ko'|'en'
  theme?: 'auto'|'dark'|'light'
  updatedAt: Timestamp
}
```

### Security Rules 추가 (firestore.rules)

```
// ── votes ─────────────────────────────────────────────
// 본인 vote만 read. write는 Cloud Function(서비스 계정)이 처리 — 클라이언트 직접 write 금지.
match /votes/{voteId} {
  allow read: if request.auth != null
              && resource.data.userId == request.auth.uid;
  allow write: if false;   // onVote / linkSessionVote callable 만 사용
}

// ── audit_log ─────────────────────────────────────────
// 클라이언트 read·write 모두 금지. 관리자(Admin Dashboard)는 서비스 계정으로 우회.
match /audit_log/{logId} {
  allow read, write: if false;
}

// ── user_prefs ────────────────────────────────────────
// 본인만 read·write. 스키마 키 제한.
match /user_prefs/{uid} {
  allow read, write: if request.auth != null
                     && request.auth.uid == uid
                     && request.resource.data.uid == uid
                     && request.resource.data.keys().hasOnly(['uid','lang','theme','updatedAt'])
                     && (request.resource.data.lang == 'ko' || request.resource.data.lang == 'en');
}
```

### Indexes (firestore.indexes.json)

```json
{
  "indexes": [
    {
      "collectionGroup": "votes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId",   "order": "ASCENDING" },
        { "fieldPath": "tournamentId", "order": "ASCENDING" },
        { "fieldPath": "date",     "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "votes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId",    "order": "ASCENDING" },
        { "fieldPath": "sessionId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 부록 C — i18n 핵심 카피 (ko/en)

| 위치 | ko | en |
|---|---|---|
| SIGN IN 버튼 | "SIGN IN" | "SIGN IN" |
| LoginModal reason='vote' | "투표하려면 로그인이 필요해요" | "Sign in to cast your vote" |
| LoginModal reason='share' | "공유하려면 로그인이 필요해요" | "Sign in to share your Crown Card" |
| LoginModal reason='daily_limit' | "오늘의 투표를 모두 사용했어요 (5/5)" | "You've used today's votes (5/5)" |
| Rate Limit 토스트 | "잠시 후 다시 시도해 주세요" | "Please try again in a moment" |
| Dropdown 항목 1 | "계정 설정" | "Account Settings" |
| Dropdown 항목 2 | "내 데이터 삭제 요청" | "Delete my data" |
| Dropdown 항목 3 | "로그아웃" | "Sign out" |
| Delete 성공 토스트 | "요청이 접수됐어요. 처리에 최대 30일 걸릴 수 있어요." | "Request received. Processing may take up to 30 days." |

---

## 부록 D — Phase B(Apple Sign-In) 진입 조건

다음을 모두 충족한 후 별도 PR(`feat/d1-locker-room-apple`) 로 진행:

```
☐ Apple Developer Program 가입 ($99/년 자동 갱신 확인)
☐ App ID + Service ID + Key 발급 (Sign in with Apple 활성화)
☐ worldcrown48.com 도메인 + Return URL Apple 콘솔 등록
☐ Cloudflare DNS TXT 레코드 추가 (Apple 도메인 인증)
☐ Firebase Auth 콘솔 Apple 공급자 활성 + Service ID/Key 입력
☐ Private Email Relay 활성 (apple.com/privaterelay 인증)
☐ App Store 정책 검토(웹만이라 직접 영향 없으나 Apple HIG의 버튼 디자인 의무)
```

비용: 연 $99 + DNS 변경 작업 시간 30분 ~ 1시간.
일정 영향: MVP1(2026-05-31)에는 미포함. MVP1.5(2026-06-10)~MVP2 사이 진입 권장.

---

## 부록 E — 버전 이력

| 버전 | 일자 | 변경 |
|---|---|---|
| v1.0 | 2026-06-14 (오전) | 신규. 대표 의제(Google+Apple·Navbar 드롭다운·Handoff 산출물) 반영. E-1 v2.0 패턴 계승. 정책 충돌 미해소 |
| v2.0 | 2026-06-14 (오후) | **정책 충돌 해소.** v4_9 ↔ lite-spec 충돌 발견 → A안(맛보기 모델) 대표 확정 → v4_9 §원칙③ 갱신 + §0.5 정책 동기화 검증 신설 + §9-14 함정 신설 + 본 부록 갱신 |

---

*Handoff Brief v2.0 · D-1 The Locker Room · WorldCrown48 · 2026-06-14*
*© 2026 WorldCrown48 · CONFIDENTIAL*
