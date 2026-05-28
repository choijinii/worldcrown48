# Lite Spec — C5 Fan Intelligence (AI-Report News)
# Domain 3 THE ARENA — M7 AI 뉴스 · AI-Report News View | 에이전트 C-5
# 🆕 신규 생성 — 2026-05-25 | 작성: Claude (Cowork)

> 이 문서는 월크48 **AI 뉴스 생성(Fan Intelligence)** 기능의 개발 명세서입니다.
> 전략 단일 진실: `WC48_FAN_INTELLIGENCE_v1_0.md` — 이 문서는 그 전략을 "바로 코딩 가능한" 명세로 옮긴 것입니다.
> 뉴스룸 컨테이너·키워드 뉴스는 `docs/lite-specs/C4-newsroom.md`를 참조합니다.

---

## ⛔ 절대 규칙

```
✅ AI-Report 2중 표기 의무
   - 카드 목록: "● AI-Report" 배지 (11px, 골드 #FCD006)
   - 기사 본문: "✦ AI-Report" 인라인 블록 (12px, 골드 배경)
   - HTML 메타태그: <meta name="content-type" content="ai-report" /> (EU AI Act Art.50)
⛔ "AI GENERATED" 표기 절대 금지 — 폐기 완료. "AI-Report"만 사용
✅ 기사 근거 = 월크48 실제 팬 투표 데이터(ranking_cache)만. 외부 학습데이터 추측 금지
✅ 관리자 승인 없이 게시 금지 — status=published 전 reviewedBy(관리자 uid) 필수
⛔ Vote Count(절대 수치) 본문 노출 금지 — Vote Rate(%)만 허용
⛔ 우승자 예측·실제 경기 결과 언급 금지 (서비스 정체성)
✅ 다크 테마 (Domain 3 = bg-wc-bg-deep) · 반응형 3화면(375 / 768 / 1440)
✅ 다국어: ko + en 동시 생성 (MVP 1·1.5). es는 MVP 2
```

---

## 1. 도메인 개요

**Fan Intelligence**는 월크48에 쌓인 실제 팬 투표 데이터를 근거로 Claude(AI)가 작성하고,
관리자(System Admin)가 검토·승인해 발행하는 월크48 고유의 뉴스 포맷입니다.

이 명세서가 다루는 기능은 두 갈래입니다.

| 갈래 | 설명 | 담당 화면 |
|---|---|---|
| **AI-Report News View** | 발행된 Fan Intelligence 기사를 Voter에게 보여주는 칼럼 | The Arena 뉴스룸 / The Pitch 뉴스룸 |
| **Fan Intelligence 생성기** | 관리자가 기사를 생성·검수·승인하는 도구 | Admin Dashboard (Domain 6 M5) |

> ⚠️ 용어 안내: 대표님 요청서의 "AI Generated News View"는, 불변 원칙상 "AI GENERATED" 표기가
> 폐기되고 "AI-Report"로 확정되어 있어, 본 명세서는 **"AI-Report News View"**로 표기합니다.
> (UI 칼럼 헤더 라벨은 §6 참조)

---

## 2. MVP 단계별 범위 (★ 가장 먼저 읽을 것)

```
MVP 1   — 2026-05-31
  · The Arena 뉴스룸 2칼럼 중 'AI-Report News View' 칼럼을 UI로 구현
  · 단, 발행된 기사가 없으므로 → "준비 중" 빈 상태(empty state) 노출
  · ai_news 컬렉션 읽기(조회)만 구현. 생성 기능 없음
  · 에이전트 C-5 담당

MVP 1.5 — 2026-06-10  ★ 핵심
  · Admin Dashboard에 [Fan Intelligence 생성] 버튼 추가
  · 관리자 수동 생성: ranking_cache → Claude API → 초안 → 검수 → 승인 → 발행
  · 런치 뉴스(Operation Launch News) 1건 발행이 목표
  · generateFanIntelligence Cloud Function (이 문서 §4)

MVP 2   — 2026-07
  · 자동화: 특이점 4종(T-1~T-4) + Champion 트리거
  · generateAINews Cloud Function (v4.9 §13 / 에이전트 F-1)
  · 본 문서 §4의 수동 흐름에서 [버튼] 자리만 자동 트리거로 교체
```

---

## 3. 컴포넌트 트리

### 3-1. 표시 측 (Voter — The Arena 뉴스룸)

```
<Newsroom tournamentId={id}>            # 컨테이너 — C4 참조
  <KeywordNewsView />                    # 좌 칼럼 (키워드 뉴스 7건) — C4 참조
  <AIReportNewsView tournamentId={id}>   # 우 칼럼 (AI-Report 뉴스 3건) — 이 문서
    <AIReportCard article={a} />         # MVP 1.5+ : 발행 기사 카드
    <AIReportEmptyState />               # MVP 1   : "준비 중" 빈 상태
</Newsroom>

<AIReportArticle article={a} />          # 기사 본문 상세 뷰 (모달 또는 /arena/[id]/news/[newsId])
```

### 3-2. 생성 측 (관리자 — Admin Dashboard, MVP 1.5)

```
<FanIntelligenceGenerator>               # Domain 6 M5 내부
  <TournamentPicker />                   # 대상 Tournament 선택
  <GenerateButton />                     # [Fan Intelligence 생성] — generateFanIntelligence 호출
  <DraftReviewPanel draft={draft}>        # 생성된 초안 검토
    <AutoCheckChecklist result={...} />   # AI 자동 검수 6항목 결과
    <BilingualEditor />                   # ko / en 본문 수동 편집
    <ApproveButton /> <RejectButton />    # 승인 / 반려
```

---

## 4. 생성 흐름 (MVP 1.5 수동) + Cloud Function

```
관리자 → Admin Dashboard → [Fan Intelligence 생성] 버튼 클릭
   ↓
generateFanIntelligence (Cloud Function · onCall · 관리자 전용)
   ① ranking_cache/{tournamentId} 읽기 (Vote Rate %만)
   ② tournaments/{tournamentId} 읽기 (제목·tournamentType)
   ③ tournamentType 분기 프롬프트 구성 (§5)
   ④ Claude API 호출 — ko·en 본문 생성
   ⑤ AI 자동 검수 6항목 실행 → autoCheckResult (§6)
   ⑥ ai_news 문서 생성 (status='pending_review')
   ↓
관리자 검토 화면 → 승인 / 수정 후 승인 / 반려
   · 승인 → status='published', publishedAt 기록 → 뉴스룸 노출
   · 반려 → status='rejected'
```

```ts
// functions/src/generateFanIntelligence.ts  — MVP 1.5
import { onCall, HttpsError } from 'firebase-functions/v2/https'

export const generateFanIntelligence = onCall(async (req) => {
  // 0. 관리자 권한 확인 (System Admin 전용)
  if (req.auth?.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', '관리자만 생성할 수 있습니다')
  }
  const { tournamentId, type } = req.data as { tournamentId: string; type: AINewsType }

  // 1. 데이터 로드 — 절대 수치 없이 Vote Rate(%)만
  const cacheSnap = await db.doc(`ranking_cache/${tournamentId}`).get()
  const tournSnap = await db.doc(`tournaments/${tournamentId}`).get()
  if (!cacheSnap.exists || !tournSnap.exists) {
    throw new HttpsError('not-found', '투표 데이터 또는 대진 정보를 찾을 수 없습니다')
  }
  const cache = cacheSnap.data()!
  const tourn = tournSnap.data()!
  const top5 = await resolveTop5(tournamentId, cache.rankings) // [{ contestantName, voteRate }]

  // 2. 프롬프트 구성 — tournamentType 분기 (§5)
  const prompt = buildPrompt(tourn, top5, type)

  // 3. Claude API 호출 — ko / en 본문
  const draft = await callClaude(prompt) // { titleKo, titleEn, bodyKo, bodyEn }

  // 4. AI 자동 검수 6항목 (§6)
  const autoCheckResult = runAutoCheck(draft, top5)

  // 5. ai_news 문서 생성 — 관리자 검토 대기
  const ref = await db.collection('ai_news').add({
    tournamentId,
    type,                                  // 'launch_news' | 'champion' | 'anomaly'
    trigger: { type: 'manual', detail: '관리자 수동 생성' },
    content: draft,
    crownCardUrl: null,
    aiDisclosure: {
      label: 'AI-Report',
      model: 'claude-sonnet-4-20250514',
      dataSource: 'worldcrown48-fan-votes',
      dataTimestamp: cache.cachedAt,
    },
    voteData: { top5, collectedAt: cache.cachedAt },
    status: 'pending_review',
    autoCheckResult,
    reviewedBy: null, reviewedAt: null, publishedAt: null,
    isLaunchNews: type === 'launch_news',
    createdAt: FieldValue.serverTimestamp(),
  })
  return { newsId: ref.id, autoCheckResult }
})
```

> ⚠️ GNews와 달리 AI 뉴스는 캐시가 아니라 발행 문서입니다. `ai_news`는 영구 저장됩니다.
> 클라이언트는 `ai_news` 컬렉션을 `status=='published'` 조건으로 직접 쿼리합니다(Cloud Function 불필요).

---

## 5. 프롬프트 템플릿 (tournamentType 분기)

```
[공통 시스템 지시]
You are WorldCrown48's Fan Intelligence reporter.
Write a data-driven article based ONLY on the real fan-voting data below.
- MUST use Vote Rate (%) only. NEVER use absolute vote counts.
- NEVER predict real match outcomes. NEVER mention betting.
- Tone: engaging global sports journalism, neutral, MZ sporty.
- Output BOTH Korean and English. Length 300–400 words each.
- End body with the AI-Report disclosure block (§6 ①).

[데이터 주입]
Tournament: {title}
TournamentType: {tournamentType}
Top 5 (Vote Rate %): {top5}
Data collected: {dataTimestamp}

[tournamentType 분기 — v4.9 §9 / LANGUAGE.md §9 규칙]
nation_cup  → "전 세계 팬이 선택한 2026 월드컵 인기 국가대표팀 TOP 5"
player_mvp  → "팬이 선택한 2026 월드컵 인기 선수 TOP 5"
artist      → "글로벌 팬이 선택한 K-POP 월드 챔피언 TOP 5"
custom      → 관리자 정의 제목 사용
```

> 런치 뉴스(`type='launch_news'`) 상세 프롬프트는 `WC48_FAN_INTELLIGENCE_v1_0.md §3` 참조.

---

## 6. AI 자동 검수 6항목

생성 직후 `runAutoCheck()`가 자동 실행하며, 결과는 관리자 검토 화면에 ✅/❌로 표시됩니다.

```
① hasAiLabel   — AI-Report 표기 블록이 본문에 존재하는가 (EU AI Act Art.50)
② dataMatch    — 본문 수치가 ranking_cache와 일치하는가 (±1%p 이내)
③ noDefamation — 특정 인물·팀 비방·명예훼손 표현이 없는가
④ noCopyright  — 외부 저작물 무단 인용이 없는가
⑤ hasSources   — "Based on WorldCrown48 fan voting data" 출처가 명시됐는가
⑥ meetsLength  — ko·en 각각 200자 이상 2,000자 이하인가
→ 6항목 전체 통과 = allPassed:true. 1개라도 실패 시 관리자 검토 화면에 ❌ 강조
```

본문 하단 AI-Report 블록 (① 충족용 고정 문구):

```
✦ This report was generated by AI (Claude) based on WorldCrown48
  verified fan voting data. Reviewed by WC48 Editorial.
```

---

## 7. TypeScript 타입 — ai_news 스키마

> ★ v4.9 §14.6 `ai_news` 스키마를 ko/en 이중 언어 지원으로 확장한 버전입니다(v4.9도 동기화 필요).

```ts
type AINewsType    = 'launch_news' | 'champion' | 'anomaly'
type AINewsStatus  = 'pending_review' | 'approved' | 'rejected' | 'published'
type AINewsTrigger = 'manual' | 'T-1' | 'T-2' | 'T-3' | 'T-4' | 'champion'

interface AINews {
  id: string
  tournamentId: string
  type: AINewsType
  trigger: { type: AINewsTrigger; detail: string }

  content: {
    titleKo: string; titleEn: string
    bodyKo: string;  bodyEn: string
  }
  crownCardUrl: string | null          // 대표 이미지 — Crown Card 재활용 (저작권 제로)

  aiDisclosure: {                       // EU AI Act 준수
    label: 'AI-Report'
    model: string                       // 'claude-sonnet-4-20250514'
    dataSource: 'worldcrown48-fan-votes'
    dataTimestamp: Timestamp
  }
  voteData: {                           // 신뢰 근거 — Vote Rate(%)만
    top5: Array<{ contestantName: string; voteRate: number }>
    collectedAt: Timestamp
  }

  status: AINewsStatus
  autoCheckResult: {
    hasAiLabel: boolean; dataMatch: boolean; noDefamation: boolean
    noCopyright: boolean; hasSources: boolean; meetsLength: boolean
    allPassed: boolean
  }
  reviewedBy: string | null             // 관리자 uid (EU 편집 책임 증명)
  reviewedAt: Timestamp | null
  publishedAt: Timestamp | null
  isLaunchNews: boolean                 // 런치 뉴스 = 뉴스룸 상단 고정
  createdAt: Timestamp
}
```

---

## 8. 상태 (로컬 — AIReportNewsView 컴포넌트)

```ts
const [articles, setArticles] = useState<AINews[]>([])
const [loading, setLoading]   = useState(true)

useEffect(() => {
  // ai_news 직접 쿼리: 발행된 것만, 최신순 3건
  const q = query(
    collection(db, 'ai_news'),
    where('tournamentId', '==', tournamentId),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(3),
  )
  getDocs(q).then(snap => {
    setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as AINews)))
    setLoading(false)
  })
}, [tournamentId])
```

---

## 9. UI 사양

### AIReportCard (발행 기사 카드 — MVP 1.5+)

```
카드 배경: bg-wc-surface · border border-wc-border · rounded-panel
hover: border-wc-primary · shadow-gold
바이라인 1행: "WC48 · Fan Intelligence · {publishedAt}" — text-[11px] text-wc-muted
바이라인 2행: "● AI-Report" — text-[11px] · color #FCD006  ← 절대 규칙
제목: content.titleKo (locale=ko) / titleEn (locale=en) — text-[15px] font-semibold line-clamp-2
대표 이미지: crownCardUrl (있을 때만) — aspect-square rounded-card object-cover
isLaunchNews=true → 카드 상단 "LAUNCH" 골드 핀 배지 + 뉴스룸 최상단 고정
```

### AIReportArticle (기사 본문 상세 뷰)

```
제목 → 바이라인(● AI-Report) → 대표 이미지 → 본문
본문 하단: "✦ AI-Report" 인라인 블록 — 12px · 골드 텍스트 + bg-wc-gold-subtle 블록
<head>에 <meta name="content-type" content="ai-report" /> 삽입 (EU 기계 판독)
```

### AIReportEmptyState (MVP 1 — 발행 기사 0건)

```
중앙 정렬: 크라운 아웃라인 아이콘(wc48-crown-outline.svg, 48px, opacity 0.4)
1행: "Fan Intelligence 준비 중" — text-[14px] text-wc-text
2행: "팬 투표가 모이면 AI-Report가 이곳에 발행됩니다" — text-[12px] text-wc-muted
⚠️ 재시도 버튼 없음 (오류가 아니라 정상적인 빈 상태)
```

---

## 10. 반응형 레이아웃 (Arena 뉴스룸 2칼럼)

> 뉴스룸 컨테이너 전체 레이아웃은 C4-newsroom.md §UI 사양을 단일 진실로 합니다. 아래는 AI 칼럼 관점.

```
데스크탑(1440px): 좌 Keyword(7) | 우 AI-Report(3) — 2칼럼 (좌 60% / 우 40%)
태블릿(768px)  : 2칼럼 유지하되 각 칼럼 1열 세로 나열
모바일(375px)  : 칼럼을 탭으로 전환 — [키워드 뉴스] / [AI-Report] 탭. 기본 탭=키워드
```

---

## 11. Acceptance Criteria

### MVP 1 (5/31)
- [ ] Arena 뉴스룸에 AI-Report 칼럼이 2칼럼 레이아웃으로 렌더링 (3화면)
- [ ] 발행 기사 0건 → AIReportEmptyState "준비 중" 정상 노출
- [ ] 모바일에서 [키워드]/[AI-Report] 탭 전환 동작
- [ ] ai_news 쿼리(status='published') 정상 — 0건이어도 오류 없음

### MVP 1.5 (6/10)
- [ ] Admin Dashboard [Fan Intelligence 생성] 버튼 → generateFanIntelligence 호출
- [ ] ranking_cache 기반 ko·en 초안 생성 확인
- [ ] AI 자동 검수 6항목 결과가 검토 화면에 ✅/❌ 표시
- [ ] 관리자 승인 → status='published' → 뉴스룸 카드 노출 확인
- [ ] 카드 "● AI-Report" 배지 + 본문 "✦ AI-Report" 블록 + 메타태그 3중 표기 확인
- [ ] isLaunchNews=true 기사가 뉴스룸 최상단 고정 확인
- [ ] 본문에 Vote Count(절대 수치) 미노출 — Vote Rate(%)만

---

## 12. 관련 문서

```
WC48_FAN_INTELLIGENCE_v1_0.md  → AI-Report 전략·프롬프트·런치 뉴스 (전략 SST)
docs/lite-specs/C4-newsroom.md  → 뉴스룸 컨테이너·키워드 뉴스 뷰 (표시 측 SST)
WorldCrown48_v4_9.md §7 M7      → AI 뉴스 팩토리 자동화 (MVP 2)
WorldCrown48_v4_9.md §14.6      → ai_news 스키마 (본 문서 §7로 동기화 필요)
LANGUAGE.md §11                 → Newsroom·Keyword News View·AI-Report News View 용어
PRD-MVP1_v2_2.md                → MVP 범위·일정
```

---

## 변경 이력

| 버전 | 날짜 | 주요 내용 |
|---|---|---|
| v1.0 | 2026-05-25 | 최초 작성. Fan Intelligence 개발 명세 — 표시 측(AI-Report News View) + 생성 측(generateFanIntelligence) 분리 정의. MVP 1/1.5/2 단계 범위 확정. ai_news 스키마 ko/en 이중 언어 확장. |

---

*© 2026 WorldCrown48 | C5-fan-intelligence.md v1.0 | CONFIDENTIAL*
