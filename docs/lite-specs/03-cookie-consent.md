# Lite Spec — #3 쿠키 동의 배너

## 컴포넌트 트리

```
<CookieConsentProvider>          # Context + Firestore 저장
  <CookieBanner />               # 하단 고정 배너 (첫 방문 시)
    <ConsentModal />             # "설정하기" 클릭 시 표시
      <ConsentToggle category="functional" />
      <ConsentToggle category="analytics" />
```

## 상태 (consentStore.js — Zustand)

```js
{
  hasConsented: boolean,           // 동의 완료 여부
  preferences: {
    essential: true,               // 항상 true
    functional: boolean,
    analytics: boolean,
    marketing: false,              // MVP 3까지 고정
  },
  showBanner: boolean,
  showModal: boolean,
  // actions
  acceptAll: () => void,
  acceptEssentialOnly: () => void,
  savePreferences: (prefs) => void,
}
```

## 핵심 로직

```js
// 초기화: 앱 마운트 시 동의 기록 확인
onMount → Firestore cookie_consents 확인
  → 있고 12개월 미만 → showBanner: false
  → 없거나 만료 → showBanner: true

// 동의 저장
saveConsent(preferences) {
  const anonymousId = getAnonymousId()   // localStorage에 UUID 생성·저장
  await setDoc(doc(db, 'cookie_consents', anonymousId), {
    ...preferences,
    anonymous_id: anonymousId,
    ip_hash: await fetchIpHash(),        // Cloud Function 호출
    timestamp: serverTimestamp(),
  })
}
```

## Props 인터페이스

```ts
// ConsentToggle
interface ConsentToggleProps {
  category: 'functional' | 'analytics'
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}
```

## UI 사양

- 위치: `fixed bottom-0 left-0 right-0 z-50`
- 배경: `bg-wc-surface border-t border-wc-border`
- 버튼 순서: [모두 허용 — Primary] [필수만 — Ghost] [설정하기 — Outline]
- 모달: Dialog 오버레이, 카테고리별 SwitchListTile
