# Lite Spec — A0 Launch Pad

> ⚠️ **[2026-05-25 정합성 정정]** 이 문서의 프레임워크·환경변수·폴더 구조·라우팅 표기 중 일부는 구버전(Vite + React Router)입니다. **WorldCrown48의 공식 스택은 Next.js 14 (App Router)입니다** — CLAUDE.md 불변 원칙 #8(스택 고정). 프레임워크·폴더 구조·라우팅의 단일 진실은 `WorldCrown48_ARCHITECTURE.md` + `WC48_CODING_CONTEXT_v1.md`입니다. 이 문서의 화면 구성·컴포넌트·기능 명세 자체는 유효합니다.

# Domain 0 — LAUNCH PAD | 에이전트 A-0 | MVP 1
# 🆕 신규 생성 — 2026-05-14

---

## ⛔ 절대 규칙
```
✅ 다크 테마 (bg-wc-bg-deep: #00003A)
✅ 반응형 3화면: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
✅ "FIFA", "Official" 문자 사용 금지 (상표권)
✅ 이메일 웨이트리스트 → Firestore waitlist 컬렉션 저장
✅ 전환 시점: 2026년 6월 FIFA 개막 직전 → Domain 1(The Pitch)으로 교체
```

---

## 도메인 개요

서비스 오픈 전 사전 공개 랜딩 페이지입니다.
Voter의 기대감을 높이고 이메일을 수집하는 것이 핵심 목적입니다.
FIFA 2026 개막일 카운트다운 + 웨이트리스트 + SNS 링크로 구성됩니다.

---

## 컴포넌트 트리

```
<LaunchPadDomain>
  <LaunchHero />               # M1 Hero
  <CountdownTimer />           # M2 카운트다운
  <WaitlistForm />             # M3 이메일 수집
  <SNSLinks />                 # M4 SNS 외부 링크
```

---

## 모듈별 명세

### M1 Hero Section

```
슬로건 라인1: "WHO RULES THE WORLD?"
             font-serif italic text-[48px] text-wc-text  (모바일 text-[32px])
슬로건 라인2: "FIND OUT SOON."
             font-serif italic text-[36px] text-wc-primary (Gold)

배경:
  bg-wc-bg-deep (#00003A)
  + radial-gradient(ellipse 80% 60% at 50% 40%,
      rgba(255,215,0,0.08) 0%, transparent 70%)

로고: 중앙 상단, 높이 모바일 80px / 데스크탑 120px
```

### M2 Countdown Timer

```tsx
// FIFA 2026 북중미 월드컵 개막일: 2026년 6월 11일
const TARGET_DATE = new Date('2026-06-11T00:00:00-05:00')  // 멕시코시티 기준

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

// 렌더링
<div class="font-mono">
  <CountdownUnit value={days}    label="DAYS"    />
  <CountdownUnit value={hours}   label="HOURS"   />
  <CountdownUnit value={minutes} label="MINS"    />
  <CountdownUnit value={seconds} label="SECS"    />
</div>

// CountdownUnit 스타일
숫자: text-wc-primary font-mono text-[64px] font-bold  (모바일 text-[48px])
레이블: text-wc-muted text-[14px] uppercase tracking-widest
구분자: "/" 또는 ":" text-wc-border
```

### M3 Waitlist Form

```tsx
interface WaitlistFormState {
  email: string
  loading: boolean
  submitted: boolean
}

// 제출 로직
async function submitWaitlist(email: string) {
  // 이메일 형식 검증
  if (!isValidEmail(email)) return

  // Firestore waitlist 컬렉션 저장
  await addDoc(collection(db, 'waitlist'), {
    email,
    createdAt: serverTimestamp(),
  })
}

// UI
입력 필드:
  border-b-2 border-wc-border bg-transparent text-wc-text
  focus: border-wc-primary + box-shadow: 0 2px 8px rgba(255,215,0,0.2)
  placeholder: "Enter your email"

제출 버튼: bg-wc-primary text-black font-semibold rounded-btn h-12
  모바일: w-full (세로 배치)
  데스크탑: 인라인 (가로 배치 + min-w-[160px])

제출 후: "✓ You're on the list!" 성공 메시지 (text-wc-success)
```

### M4 SNS Links

```tsx
const SNS_LINKS = [
  { platform: 'instagram', url: 'https://instagram.com/worldcrown48', icon: InstagramIcon },
  { platform: 'twitter',   url: 'https://twitter.com/worldcrown48',   icon: TwitterIcon },
  { platform: 'tiktok',    url: 'https://tiktok.com/@worldcrown48',   icon: TiktokIcon },
]

// 아이콘 크기: 24×24px
// 색상: text-wc-muted, hover: text-wc-primary (transition-colors)
// 배치: flex gap-6 justify-center
```

---

## 반응형 레이아웃

```
모바일(375px):
  - 슬로건 text-[32px]
  - 카운트다운 숫자 text-[48px]
  - 입력+버튼 세로 스택 (w-full)
  - 패딩: px-4

태블릿(768px):
  - 슬로건 text-[40px]
  - 카운트다운 숫자 text-[56px]
  - 입력+버튼 가로 배치

데스크탑(1440px):
  - 슬로건 text-[48px]
  - 카운트다운 숫자 text-[64px]
  - 전체 max-w-[800px] mx-auto 중앙 정렬
```

---

## Firestore 연결

```ts
// waitlist 컬렉션
interface Waitlist {
  id: string
  email: string
  createdAt: Timestamp
}

// Security Rules: 누구나 write 허용 (이메일 수집)
// match /waitlist/{id} { allow create: if true; }
```

---

## Acceptance Criteria

- [ ] 모바일(375px) 렌더링 정상
- [ ] 태블릿(768px) 렌더링 정상
- [ ] 데스크탑(1440px) 렌더링 정상
- [ ] 카운트다운 1초마다 업데이트 (setInterval)
- [ ] 이메일 제출 → Firestore 저장 확인
- [ ] 중복 이메일 제출 처리 (에러 표시)
- [ ] SNS 링크 외부 탭 열기 (target="_blank")
