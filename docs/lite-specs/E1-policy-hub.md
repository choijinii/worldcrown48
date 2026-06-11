# Lite Spec — #3 쿠키 동의 배너

> ⚠️ **[2026-05-25 정합성 정정]** 이 문서의 프레임워크·환경변수·폴더 구조·라우팅 표기 중 일부는 구버전(Vite + React Router)입니다. **WorldCrown48의 공식 스택은 Next.js 14 (App Router)입니다** — CLAUDE.md 불변 원칙 #8(스택 고정). 프레임워크·폴더 구조·라우팅의 단일 진실은 `WorldCrown48_ARCHITECTURE.md` + `WC48_CODING_CONTEXT_v1.md`입니다. 이 문서의 화면 구성·컴포넌트·기능 명세 자체는 유효합니다.

# ✅ Step 1 업그레이드 — 2026-05-14

---

## ⛔ 절대 규칙
```
✅ marketing: false 고정 (MVP 3까지)
✅ 쿠키 배너는 MVP 1 런칭 당일부터 반드시 작동 (GDPR 법적 의무)
✅ 동의 기록은 Firestore cookie_consents에 서버 저장 필수
✅ 반응형 3화면: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
```

---

## 컴포넌트 트리

```
<CookieConsentProvider>          # Context + Firestore 저장
  <CookieBanner />               # 하단 고정 배너 (첫 방문 시)
    <ConsentModal />             # "설정하기" 클릭 시 표시
      <ConsentToggle category="functional" />
      <ConsentToggle category="analytics" />
```

## 상태 (consentStore.ts — Zustand)

```ts
{
  hasConsented: boolean,
  preferences: {
    essential: true,               // 항상 true — 변경 불가
    functional: boolean,
    analytics: boolean,
    marketing: false,              // MVP 3까지 고정 false
  },
  showBanner: boolean,
  showModal: boolean,
  // actions
  acceptAll: () => void,
  acceptEssentialOnly: () => void,
  savePreferences: (prefs: Omit<CookieConsent, 'uid' | 'timestamp' | 'ipHash'>) => Promise<void>,
}
```

## 핵심 로직

```ts
// 초기화: 앱 마운트 시 동의 기록 확인
// onMount → Firestore cookie_consents/{uid} 확인
//   → 있고 12개월 미만 → showBanner: false
//   → 없거나 만료 → showBanner: true

async function saveConsent(preferences: Partial<CookieConsent>) {
  const uid = auth.currentUser?.uid
  if (!uid) return

  await setDoc(doc(db, 'cookie_consents', uid), {
    uid,
    essential: true,             // 항상 true 강제
    functional: preferences.functional ?? false,
    analytics: preferences.analytics ?? false,
    marketing: false,            // MVP 3까지 고정
    timestamp: serverTimestamp(),
    ipHash: await fetchIpHash(), // Cloud Function으로 서버사이드 처리
  })
}
```

## UI 사양

```
위치: fixed bottom-0 left-0 right-0 z-50
배경: bg-wc-surface (다크) / bg-white (라이트 도메인은 해당 없음)
상단 테두리: border-t-2 border-wc-primary  ← Gold 테두리
버튼 순서:  [모두 허용 — bg-wc-primary text-black] 
            [필수만 — ghost] 
            [설정하기 — outline]
모달: Dialog 오버레이, 카테고리별 SwitchListTile
반응형:
  모바일: 버튼 세로 스택 (w-full)
  태블릿/데스크탑: 버튼 가로 배치
```

## Props 인터페이스

```ts
interface ConsentToggleProps {
  category: 'functional' | 'analytics'
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}
```
# Lite Spec — #4 Policy Hub 정책 페이지
# ✅ Step 1 업그레이드 — 2026-05-14

---

## ⛔ 절대 규칙
```
✅ 라이트 테마 적용 (Domain 5 = bg-wc-bg-light, text-wc-text-light)
✅ 반응형 3화면: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
✅ 에이전트 E-1 담당 (MVP 1 최우선)
```

---

## 컴포넌트 트리

```
<PolicyHub>
  <PolicyNav />                  # 정책 종류 좌측 사이드 네비 (데스크탑)
                                 # 상단 드롭다운 (모바일)
  <PolicyPage type={params.type}>
    <LanguageTabs lang={lang} onChange={setLang} />
    <PolicyContent lang={lang} type={type} />  # 마크다운 렌더링
```

## 라우팅

```
/policies/terms       → type="terms"
/policies/community   → type="community"
/policies/privacy     → type="privacy"
/policies/cookies     → type="cookies"
/notices              → NoticeList (공지사항)
```

## 콘텐츠 구조 (src/domains/policy/content/)

```
content/
  ko/
    terms.md
    community.md
    privacy.md
    cookies.md
  en/
    terms.md
    community.md
    privacy.md
    cookies.md
  es/                   # ← 추가: 스페인어 (글로벌 대응)
    terms.md
    ...
```

## 상태

```ts
const [lang, setLang] = useState<'ko' | 'en' | 'es'>('ko')
```

## 핵심 컴포넌트 Props

```ts
interface PolicyPageProps {
  type: 'terms' | 'community' | 'privacy' | 'cookies'
}

interface LanguageTabsProps {
  lang: 'ko' | 'en' | 'es'
  onChange: (lang: 'ko' | 'en' | 'es') => void
}
```

## UI 사양 (라이트 테마)

```
테마: bg-wc-bg-light (#F2F2F5), text-wc-text-light (#241754)
레이아웃:
  데스크탑(1440px): 좌측 사이드바(정책 목록) + 우측 콘텐츠
  태블릿(768px): 상단 탭 + 콘텐츠
  모바일(375px): 상단 드롭다운 + 콘텐츠

텍스트: text-wc-muted-light (#64748B), line-height: 1.8
제목: text-wc-text-light font-bold
이의신청 이메일: policy@worldcrown48.com (골드 링크)
```

## Firestore 연결 (notices 컬렉션)

```ts
// /notices 페이지용
interface Notice {
  id: string
  title: string
  content: string
  createdAt: Timestamp
  isPublished: boolean
}

// 쿼리
query(
  collection(db, 'notices'),
  where('isPublished', '==', true),
  orderBy('createdAt', 'desc')
)
```
