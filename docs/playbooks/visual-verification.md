# 시각 검증 플레이북 (Visual Verification Playbook)

> **이 문서의 목적**: 모듈 PR을 머지하기 전, 또는 시드 데이터를 검증할 때 **대표(디자이너 출신, 코딩 초보)가 매번 같은 순서로 따라 할 수 있도록** 시각 검증 4단계를 영구 기록.
>
> **언제 사용?**
> - Claude Code가 PR 완성하고 "Preview URL에서 확인해 주세요" 요청할 때
> - 시드 스크립트 실행 후 "데이터 잘 들어갔는지 보세요" 단계
> - 핸드오프 §7.3 시각 회귀 30 스크린샷 단계
> - 머지 후 Production 검증 단계
>
> **충돌 시 우선순위**: 핸드오프 §7 > 이 플레이북 > 기타

---

## 🗺 전체 흐름 한 장 요약

```
STEP 1. Vercel Dashboard에서 Preview URL 찾기 (3분)
   ↓
STEP 2. URL 뒤에 페이지 경로 붙여서 브라우저로 접속 (1분)
   ↓
STEP 3. 개발자 도구 열어서 320·768·1440 화면 크기 전환 (2분)
   ↓
STEP 4. wireframe과 비교 + 결함 캡처 + 채팅에 전달 (5~30분)
```

---

# STEP 1 · Vercel Preview URL 찾기

## 1-1. Vercel이 뭔지 먼저

**Vercel**(버셀, 회사명)은 우리 웹사이트(worldcrown48.com)를 호스팅(hosting, "서버에 띄워두기")해 주는 클라우드 서비스입니다. GitHub에 코드를 push할 때마다 Vercel이 자동으로 그 코드를 빌드해서 임시 URL에 띄워줘요. 그 임시 URL이 바로 **"Preview URL"** 입니다.

비유하자면, GitHub은 "옷이 들어있는 옷장"이고 Vercel은 "옷을 입혀서 마네킹에 세워두는 매장"이에요. PR마다 매장 안에 마네킹이 하나씩 새로 세워지고, 각 마네킹마다 고유한 진열 위치(URL)가 생깁니다.

## 1-2. Vercel 대시보드 접속

1. **사파리나 크롬에서** https://vercel.com 접속
2. 우측 상단 **"Log In"** 클릭 (이미 로그인 상태면 자동으로 대시보드로 들어감)
3. **GitHub 계정**(jounnamu12@gmail.com 연결된)으로 로그인

> 💡 처음 들어가실 때 회사 계정(Team)을 선택하라는 화면이 뜰 수도 있어요. **개인 계정(Hobby plan 또는 본인 이름)** 을 선택하시면 됩니다.

## 1-3. worldcrown48 프로젝트 클릭

대시보드 메인 화면에 카드 형태로 프로젝트 목록이 보입니다. **`worldcrown48`** 카드를 클릭하세요. (보통 1~2개만 있어서 바로 찾으실 거예요.)

## 1-4. Deployments 탭 클릭

프로젝트 메인 화면 상단에 탭 메뉴가 일렬로 있습니다:

```
Project | Deployments | Analytics | Speed Insights | Logs | Storage | Settings
                ↑
            이것 클릭
```

**"Deployments"** 탭을 클릭하면 시간순으로 배포 목록이 쭉 뜹니다.

## 1-5. 어떤 줄이 "내 PR의 Preview URL"인지

배포 목록의 각 줄에는 이런 정보가 표시됩니다:

```
[● Production]  worldcrown48.com           main         · 2시간 전
[● Preview]     worldcrown48-git-feat-...  feat/a1-...  · 5분 전   ← 이 줄!
[● Preview]     worldcrown48-git-feat-...  feat/c3-...  · 3일 전
```

내 PR의 Preview를 찾는 기준:
- **상태 라벨이 `Preview`** (회색 점) — Production(검은 점)은 worldcrown48.com 라이브 서비스
- **브랜치 이름이 내가 만든 PR 브랜치와 같음** (예: `feat/a1-the-pitch`)
- **시간이 최신** — 보통 맨 위 또는 두세 번째 줄

## 1-6. URL 복사

해당 줄을 찾으셨으면 두 가지 방법으로 URL을 얻을 수 있어요:

**방법 A — 줄 클릭해서 상세 화면 들어가기**
1. Preview 줄을 클릭하면 상세 페이지로 이동
2. 상단에 큰 URL이 표시됨 (예: `https://worldcrown48-git-feat-a1-the-pitch-jinii.vercel.app`)
3. URL 옆 **복사 아이콘 📋** 클릭

**방법 B — 줄에서 바로 ⤴ 아이콘 클릭**
1. Preview 줄 우측에 **외부 링크 아이콘 ⤴**(작은 화살표)이 보임
2. 클릭하면 새 탭에서 사이트가 바로 열림
3. 새 탭의 주소창 URL이 그 Preview URL

> 💡 URL 형태는 보통 이래요:
> ```
> https://worldcrown48-git-<브랜치이름>-<유저이름>.vercel.app
> ```
> 예: `https://worldcrown48-git-feat-a1-the-pitch-jinii.vercel.app`

---

# STEP 2 · 원하는 페이지로 접속

## 2-1. URL은 "현관문 주소"일 뿐

STEP 1에서 얻은 Preview URL은 우리 웹사이트의 **현관문 주소** 입니다. 들어가서 거실(`/`), 부엌(`/arena/dev-preview`), 침실(`/admin/lab`) 같은 **방마다** 가려면 URL 뒤에 경로를 추가해야 해요.

| 검증하고 싶은 화면 | URL 뒤에 추가할 경로 |
|---|---|
| 메인 (현재 A-0 Launch Pad, A-1 머지 후엔 The Pitch) | (없음 — Preview URL 그대로) |
| A-0 archive (A-1 머지 후) | `/launch` |
| A-1 The Pitch (작업 중인 모듈) | `/` 또는 `/?lang=en` |
| VS Battle 시드 데이터 확인 | `/arena/dev-preview` |
| Crown Card 결과 화면 | `/arena/dev-preview/champion` |
| Ranking 화면 | `/arena/dev-preview/ranking` |
| 운영자 콘솔 | `/admin/lab` |
| 정책 (개인정보·이용약관) | `/policies/privacy` · `/policies/terms` |
| 영문 토글 | URL 끝에 `?lang=en` 추가 |
| 한글 토글 | URL 끝에 `?lang=ko` 추가 |

## 2-2. 실제 URL 합치는 예시

**예시 1 — VS Battle 시드 확인 (오늘 작업)**
- Preview URL: `https://worldcrown48-git-feat-a1-the-pitch-jinii.vercel.app`
- 추가 경로: `/arena/dev-preview`
- **합친 전체 URL**: `https://worldcrown48-git-feat-a1-the-pitch-jinii.vercel.app/arena/dev-preview`
- 이 전체 URL을 브라우저 주소창에 붙여넣고 Enter

**예시 2 — A-1 영문 확인**
- 합친 전체 URL: `https://worldcrown48-git-feat-a1-the-pitch-jinii.vercel.app/?lang=en`

## 2-3. 자주 막히는 함정 — 로그인 화면 · 401 · "Authentication Required"

Vercel Preview URL에 처음 접속하시면 이런 화면이 뜰 수 있어요:

```
┌─────────────────────────────────────┐
│  🔒 Authentication Required          │
│                                      │
│  This Preview Deployment is          │
│  protected. Please log in to view.   │
│                                      │
│  [Continue with Vercel]              │
└─────────────────────────────────────┘
```

또는 그냥 **`401 Unauthorized`** 메시지만 뜰 수도 있어요.

**이유**: Vercel은 PR Preview를 기본적으로 보호 모드로 띄워서 외부인이 못 보게 막아요. 우리는 안 막혀도 되는 사람들(개발자 본인)이라 우회법이 있습니다.

### 해결법 ① — Vercel에 로그인 (가장 간단)

1. `[Continue with Vercel]` 또는 `[Log in to Vercel]` 버튼 클릭
2. STEP 1-2에서 쓴 GitHub 계정으로 로그인 (이미 다른 탭에 로그인 중이면 자동 통과)
3. 1~2초 후 Preview 화면이 정상 표시됨

이렇게 한 번 로그인하면 같은 브라우저에서 며칠간은 다시 안 묻습니다.

### 해결법 ② — 그래도 안 통과되면

Vercel 대시보드 → 프로젝트 → Settings → Deployment Protection 메뉴에서 보호 수준 확인:
- "Vercel Authentication" 켜져 있으면 → 위 해결법 ①
- "Password Protection" 켜져 있으면 → 설정한 비밀번호 입력
- "Standard Protection" 또는 "Off" 이면 → 누구나 접속 가능 (보호 없음)

대표님 프로젝트는 보통 ①이라 GitHub 로그인 한 번이면 끝납니다.

---

# STEP 3 · 다양한 화면 크기로 확인 (개발자 도구)

## 3-1. 개발자 도구 여는 법

화면이 잘 떴으면, 같은 페이지를 **모바일(320px)·태블릿(768px)·데스크탑(1440px)** 3가지 크기로 봐야 해요. 우리 디자인은 화면 크기마다 레이아웃이 달라지거든요.

**개발자 도구**(Developer Tools, 줄여서 DevTools)는 브라우저에 내장된 도구로, 웹사이트를 가짜 모바일·태블릿 화면 크기로 띄워볼 수 있어요.

### 사파리(Safari)
1. 메뉴바 → **Safari** → **설정** → **고급** 탭
2. 맨 아래 **"메뉴 막대에서 개발자용 메뉴 보기"** 체크
3. 메뉴바에 새로 생긴 **"개발자용"** → **"반응형 디자인 모드"** (단축키: ⌃⌘R)

### 크롬(Chrome) — 권장
1. **⌥+⌘+I** (Option+Command+I) → 우측 또는 하단에 개발자 도구 패널이 뜸
2. 좌측 상단의 **📱 디바이스 모드 아이콘** (휴대폰+태블릿 그림) 클릭
3. 페이지가 작아지면서 상단에 디바이스 선택 메뉴가 나타남
4. 상단 메뉴에서 **`Responsive`** 옆 숫자(예: 1440 x 900)를 클릭하면 직접 크기 입력 가능

## 3-2. 3가지 크기 전환

크롬 디바이스 모드에서:
- **모바일 320**: 상단 가로 크기 입력란에 `320` 입력 → Enter
- **태블릿 768**: 입력란에 `768` 입력 → Enter
- **데스크탑 1440**: 입력란에 `1440` 입력 → Enter

또는 드롭다운 메뉴에서 프리셋 선택:
- `iPhone SE` ≈ 375 (모바일 대표)
- `iPad Mini` ≈ 768 (태블릿)
- `Responsive` 1440 (데스크탑)

각 크기마다 페이지가 자동으로 다시 그려져요. **레이아웃이 바뀌는 순간을 직접 보실 수 있습니다.**

---

# STEP 4 · 결함 발견·캡처·전달

## 4-1. 무엇을 비교하나

| 비교 대상 | 어디서 확인 |
|---|---|
| wireframe HTML | `docs/design/wireframes/Domain N · XXX.html` 더블클릭으로 브라우저에서 열기 |
| 핸드오프 §4 Acceptance Criteria | `docs/handoffs/XX-XXX-handoff.md` |
| Hard Constraints 금지 항목 | 같은 핸드오프 §5 |

**비교 포인트:**
- 색상 — Crown Gold #FCD006 정확한지, 회색·다크 톤 일치하는지
- 간격(여백) — 카드 사이·문단 사이 간격이 wireframe과 같은지
- 폰트 크기·굵기 — 제목·본문 크기 차이가 일관적인지
- 텍스트 — 오타·번역 누락·금지 단어("FIFA"·"LIVE"·"Vote Count") 노출
- 상태 전환 — 호버·클릭·로딩·빈 상태 등이 wireframe대로 동작하는지

## 4-2. 캡처하는 법 (Mac)

- **⌘+Shift+4** → 마우스가 십자 모양으로 바뀜 → 캡처할 영역 드래그 → 데스크탑에 PNG 저장
- **⌘+Shift+5** → 캡처 도구 띄움 → 영역 선택·녹화·타이머 옵션 등
- **⌘+Shift+3** → 전체 화면 캡처

## 4-3. 채팅에 전달하는 법

1. 캡처한 PNG 파일을 채팅창에 **드래그&드롭** (또는 + 버튼 → 파일 선택)
2. 짧게 설명 추가:
   ```
   /arena/dev-preview 데스크탑 1440에서 봤는데,
   왕관 아이콘이 너무 흐려요. opacity 문제 같아요.
   ```
3. Cowork이 캡처 보고 진단·수정 안내

> 💡 화살표·동그라미 표시는 미리보기(Preview) 앱에서 가능 — 캡처 후 더블클릭으로 열고 상단 마크업 도구 사용.

---

# 🔁 매번 동일한 단축 절차 (한 페이지 검증 = 5분)

1. **터미널 또는 책갈피**에 Vercel 대시보드 URL 저장
2. **현재 진행 중인 PR의 Preview URL**을 메모(예: Notion 또는 스티키)에 적어두기
3. 검증할 페이지 — 위 STEP 2-1 표 참조해서 경로 합치기
4. 브라우저에서 ⌘+L → URL 붙여넣기 → Enter
5. ⌥+⌘+I → 디바이스 모드 → 320·768·1440 차례로
6. wireframe과 비교 → 결함 보이면 ⌘+Shift+4 → 채팅 드롭

---

# ⚠️ 시각 검증에서 자주 발생하는 함정 모음

| 함정 | 증상 | 원인 | 해결 |
|---|---|---|---|
| 401 / "Authentication Required" | Preview URL 접속 시 로그인 요구 | Vercel Preview Protection 기본 ON | STEP 2-3 해결법 ① |
| 잘못된 Preview 보고 있음 | 화면이 옛 버전 그대로 | 최신 push 전의 Preview URL을 봤음 | Deployments 탭 맨 위 줄로 가서 시간(분 단위) 확인 |
| 시드 없는 페이지 | "토너먼트를 찾을 수 없어요" | 로컬 시드 스크립트 미실행 | seed-preview.mjs --module=all 실행 |
| 모바일에서 보이던 결함이 데스크탑에서 안 보임 | 320px에서만 깨짐 | 반응형 분기 문제 | 핸드오프 §9 함정 표 참조 |
| Production은 잘 보이는데 Preview 깨짐 | 환경변수 차이 | Vercel Preview 환경변수 누락 | Settings → Environment Variables → "Preview" 체크 확인 |
| 한글은 잘 보이는데 영문 토글 시 깨짐 | `?lang=en` 후 누락된 텍스트 | i18n 키 누락 | locales/en.json grep 확인 |

---

# 🔗 관련 문서

- 핸드오프 템플릿 §7 Test Plan: `docs/templates/HANDOFF_BRIEF_TEMPLATE.md`
- Vercel 환경변수 체크리스트: `docs/checklists/vercel-env-vars.md`
- 검증 원칙(Verification Discipline): `docs/principles/VERIFICATION_DISCIPLINE.md`

---

*플레이북 버전: v1.0 (2026-06-29 생성)*
*다음 모듈 시각 검증 시 이 파일만 다시 펴서 단계별로 따라하세요.*
*© 2026 WorldCrown48 | CONFIDENTIAL*
