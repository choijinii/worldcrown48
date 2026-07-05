# Lite Spec — #6 Google 로그인 + 투표 게이트

> ⚠️ **[2026-05-25 정합성 정정]** 이 문서의 프레임워크·환경변수·폴더 구조·라우팅 표기 중 일부는 구버전(Vite + React Router)입니다. **WorldCrown48의 공식 스택은 Next.js 14 (App Router)입니다** — CLAUDE.md 불변 원칙 #8(스택 고정). 프레임워크·폴더 구조·라우팅의 단일 진실은 `WorldCrown48_ARCHITECTURE.md` + `WC48_CODING_CONTEXT_v1.md`입니다. 이 문서의 화면 구성·컴포넌트·기능 명세 자체는 유효합니다.

# ✅ Step 1 업그레이드 — 2026-05-14
# 🔴 주요 수정: 비로그인 1회 투표 정책 확인, Daily Participation Limit 로직
# 🔧 HF-1 정정 (2026-07-05): "Tournament당 1일 5표" → "1일 신규 Tournament 5개 참가"

---

## ⛔ 절대 규칙
```
✅ Daily Participation Limit: 1일(KST) 신규 참가 Tournament 5개 한도.
   이미 참가한 Tournament 안에서는 무제한 (브래킷 구조상 대회당 최대 46표로 자연 상한)
✅ 비로그인: 세션 1회 투표 허용 → 2회째부터 로그인 요청 (불변)
✅ Rate Limit: 1분 5회 초과 시 resource-exhausted (per-uid 토큰 버킷, C-3)
✅ 로그인 후 세션 투표 uid 연결: Cloud Function 자동 처리
```

---

## 컴포넌트 트리

```
<AuthProvider>                   # Firebase Auth 상태 구독
  <Navbar>
    <SignInButton />              # 비로그인 시
    <UserAvatar />               # 로그인 시 (골드 테두리 원형)
  </Navbar>
  <VoteGate>                     # 투표 전 권한 확인
    <LoginModal />               # 로그인 유도 모달
```

## 상태 (authStore.ts — Zustand)

```ts
{
  user: FirebaseUser | null,
  loading: boolean,
  sessionVoteUsed: boolean,      // 비로그인 1회 투표 사용 여부
  // actions
  signInWithGoogle: () => Promise<void>,
  signOut: () => Promise<void>,
  markSessionVoteUsed: () => void,
}
```

## 투표 게이트 로직 (useVoteGate 훅)

```ts
// 투표 가능 여부 체크 — 3단계
function useVoteGate() {
  const { user, sessionVoteUsed, markSessionVoteUsed } = useAuthStore()

  async function checkCanVote(tournamentId: string): Promise<VoteGateResult> {
    // Step 1: Rate Limit — onVote Cloud Function (per-uid 토큰 버킷, 1분 5회)

    // Step 2: 비로그인 세션 체크 (불변)
    if (!user) {
      if (!sessionVoteUsed) return { status: 'allowed' }
      return { status: 'login_required', reason: 'vote' }
    }

    // Step 3: 로그인 유저 — Daily Participation Limit 체크.
    // 이미 참가한 Tournament면 무제한 허용, 신규 Tournament는 5개까지만.
    const { participatedTournamentIds } = await getDailyParticipation(user.uid)
    if (participatedTournamentIds.includes(tournamentId)) {
      return { status: 'allowed' }
    }
    if (participatedTournamentIds.length >= 5) {
      return { status: 'daily_limit_reached' }
    }

    return { status: 'allowed' }
  }

  function onVoteSuccess() {
    if (!user) markSessionVoteUsed()
  }

  return { checkCanVote, onVoteSuccess }
}

// KST 기준 오늘 참가한 Tournament 집합 조회 — 단일 doc 읽기 (신규 index 불필요).
async function getDailyParticipation(userId: string): Promise<{ participatedTournamentIds: string[] }> {
  const todayKST = getTodayKST() // "2026-07-05" (UTC+9 자정 기준)
  const snap = await getDoc(doc(db, 'daily_participation', `${userId}_${todayKST}`))
  return { participatedTournamentIds: snap.exists() ? (snap.data().tournamentIds ?? []) : [] }
}

type VoteGateResult =
  | { status: 'allowed' }
  | { status: 'login_required'; reason: 'vote' | 'share' }
  | { status: 'daily_limit_reached' }
```

## Crown Card 공유 게이트

```ts
function useShareGate() {
  const { user } = useAuthStore()
  function checkCanShare(): VoteGateResult {
    return user ? { status: 'allowed' } : { status: 'login_required', reason: 'share' }
  }
  return { checkCanShare }
}
```

## LoginModal Props

```ts
interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  reason: 'vote' | 'share' | 'daily_limit'
  onSuccess?: () => void
}
// reason별 표시 문구:
//   'vote'        → "투표하려면 로그인이 필요해요"
//   'share'       → "공유하려면 로그인이 필요해요"
//   'daily_limit' → "오늘 참가할 수 있는 Tournament를 모두 사용했어요 (5/5)"
```

## Navbar UI

```
비로그인: [SIGN IN] 버튼 (wc-bg-elevated, 구글 아이콘)
로그인:   아바타 (ring-2 ring-wc-primary 골드 원형) + displayName
반응형:
  모바일: Navbar에는 로고만 → 하단 MobileTabBar에 프로필 탭
  데스크탑: Navbar 우측 메뉴 전체 표시
```
# Lite Spec — #10 GDPR 데이터 삭제 요청
# ✅ Step 1 업그레이드 — 2026-05-14

---

## ⛔ 절대 규칙
```
✅ audit_log 컬렉션 3년 보관 의무 (GDPR Article 17)
✅ 삭제 후 audit_log에 uid_hash 보존 (uid 원문 저장 금지)
✅ vote_stats 집계 데이터는 보존 (익명, 개인식별 불가)
✅ 에이전트 D-1 담당 (MVP 1 필수)
```

---

## 컴포넌트 트리

```
<UserSettingsDropdown>
  <SettingsMenuItem label="계정 설정" />
  <SettingsMenuItem label="내 데이터 삭제 요청" onClick={openDeleteModal} />
  <SettingsMenuItem label="로그아웃" />

<DeleteAccountModal isOpen={...}>
  <WarningMessage />
  <ConfirmInput />               # "DELETE" 직접 입력
  <DeleteButton />
```

## onUserDelete Cloud Function

```ts
// functions/src/onUserDelete.ts
exports.onUserDelete = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', '로그인 필요')

  const batch = writeBatch(db)

  // 1. Firestore 사용자 데이터 삭제
  batch.delete(doc(db, 'users', uid))

  const votes = await getDocs(
    query(collection(db, 'votes'), where('userId', '==', uid))
  )
  votes.forEach(v => batch.delete(v.ref))

  const consents = await getDocs(
    query(collection(db, 'cookie_consents'), where('uid', '==', uid))
  )
  consents.forEach(c => batch.delete(c.ref))

  // 2. audit_log 보존 (3년 — GDPR 의무)
  // ✅ uid_hash만 저장 (uid 원문 저장 금지)
  batch.set(doc(collection(db, 'audit_log')), {
    uid: uid,                          // ← 삭제 처리 후 hash로 교체
    action: 'GDPR_DELETE',
    timestamp: serverTimestamp(),
  })

  await batch.commit()

  // 3. Firebase Auth 계정 삭제
  await admin.auth().deleteUser(uid)

  // ✅ vote_stats (Realtime DB 집계) 보존 — 개인식별 불가 익명 데이터
})
```

## 흐름

```
아바타 클릭 → 드롭다운 → "내 데이터 삭제 요청"
→ DeleteAccountModal (경고 + "DELETE" 입력)
→ onUserDelete Cloud Function 호출
→ 자동 로그아웃 + "/" 이동
→ 토스트: "요청이 접수됐습니다"
```

## Props

```ts
interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}
```
