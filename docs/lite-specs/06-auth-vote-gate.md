# Lite Spec — #6 Google 로그인 + 비로그인 투표 게이트

## 컴포넌트 트리

```
<AuthProvider>                   # Firebase Auth 상태 구독
  <Navbar>
    <SignInButton />              # 비로그인 시
    <UserAvatar />               # 로그인 시
  </Navbar>
  <VoteGate>                     # 투표 전 권한 확인
    <LoginModal />               # 로그인 유도 모달
```

## 상태 (authStore.js — Zustand)

```js
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

## 비로그인 투표 게이트 로직

```js
// useVoteGate 훅
function useVoteGate() {
  const { user, sessionVoteUsed, markSessionVoteUsed } = useAuthStore()

  function checkCanVote() {
    if (user) return 'allowed'              // 로그인 유저: 항상 허용
    if (!sessionVoteUsed) return 'allowed'  // 비로그인 첫 투표: 허용
    return 'login_required'                 // 비로그인 2회 이상: 로그인 요청
  }

  function onVoteSuccess() {
    if (!user) markSessionVoteUsed()        // 세션 투표 소모 처리
  }

  return { checkCanVote, onVoteSuccess }
}
```

## Crown Card 공유 게이트

```js
function useShareGate() {
  const { user } = useAuthStore()

  // 공유 전 로그인 확인
  function checkCanShare() {
    return user ? 'allowed' : 'login_required'
  }
}
```

## LoginModal Props

```ts
interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  reason: 'vote' | 'share'      // 표시 문구 분기
  onSuccess?: () => void        // 로그인 후 원래 동작 재개
}
```

## Navbar UI

- 비로그인: `SIGN IN` 버튼 (흰 배경, 검정 텍스트, 구글 파비콘)
- 로그인: 아바타 이미지 (골드 테두리 원형) + 이름
- 로그인 후 이전 세션 투표 uid 연결: Cloud Function trigger
