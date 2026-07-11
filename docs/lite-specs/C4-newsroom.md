> ⚠️ **2026-07-11 대개편 정합성 공지** — 이 문서의 일부 내용이 대개편 결정으로 대체되었습니다.
> 충돌 시 최신 진실 우선순위: `CLAUDE.md v2.2 「🔄 2026-07 대개편」` > `LANGUAGE.md v1.7 §13` > 이 문서.
> 상세 결정: `outputs/handoffs-staging/WC48_개편결정_v1_2026-07-10.md` (v1.2)
> 대체된 것: **Arena 뉴스룸(2칼럼) 계획은 삭제됨** → 전 화면 **우측 상설 프레임**(Pitch·Lab·Arena·Locker Room, 매치·Crown Card 제외, 모바일 인라인)으로 대체. 뉴스 데이터 파이프라인(GNews·news_cache)과 용어는 유지

# Lite Spec — C4 Newsroom (Keyword News View)
# Domain 3 THE ARENA — M6 뉴스룸 | 에이전트 C-4 | MVP 1
# 🆕 신규 생성 — 2026-05-14 | ✏️ v1.1 개정 — 2026-05-25

> **v1.1 개정 요약 (대표님 지시 반영)**
> - 키워드 뉴스 25개 → **7개**로 축소 (Arena 뉴스 총량 25 → 10)
> - 아레나 뉴스룸을 **2칼럼 레이아웃**으로 변경 — 좌: Keyword News View(7) · 우: AI-Report News View(3)
> - **The Pitch 뉴스룸 신규 추가** — 키워드+AI 통합 생성순 6건 (홈 중간, Trending 섹션 바로 밑)
> - AI-Report 칼럼 상세는 `C5-fan-intelligence.md` 단일 진실. 이 문서는 컨테이너·키워드 뉴스 담당
> - 스택: Next.js 14 (App Router) 기준으로 재작성 — v1.0의 구버전(Vite) 표기 폐기. 단일 진실: `WorldCrown48_ARCHITECTURE.md`

---

## ⛔ 절대 규칙
```
✅ GNews API 키워드 뉴스 7개 (★ v1.1: 25 → 7)
✅ Firestore news_cache 1시간 캐시 필수 (API 비용 절감)
✅ getNewsCache Cloud Function 경유 (클라이언트 직접 API 호출 금지)
✅ 뉴스 저작권: 기사 본문 절대 저장 금지 — 제목+출처+URL+썸네일만
✅ 다크 테마 (Arena·Pitch 뉴스룸 모두 bg-wc-bg-deep)
✅ 반응형 3화면: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
✅ 외부 뉴스 카드 클릭 → target="_blank" rel="noopener noreferrer"
```

---

## 1. 도메인 개요

뉴스룸은 두 종류의 뉴스를 묶어 보여주는 화면이며, **2곳에 등장**합니다.

| 위치 | 형태 | 구성 | MVP |
|---|---|---|---|
| **The Arena** | 2칼럼 | 좌: Keyword News View(7) · 우: AI-Report News View(3) | MVP 1 |
| **The Pitch** | 통합 1피드 | 키워드+AI-Report를 생성순으로 6건 (홈 중간 섹션) | MVP 1 |

- **Keyword News View** — Tournament 키워드 기반 외부 뉴스. GNews API → news_cache. (이 문서)
- **AI-Report News View** — 월크48 AI 생성 뉴스(Fan Intelligence). ai_news 컬렉션. (`C5-fan-intelligence.md`)

> MVP 1 시점: AI-Report 칼럼은 발행 기사가 없어 "준비 중" 빈 상태로 노출됩니다(C5 §9).

---

## 2. 컴포넌트 트리

### 2-1. The Arena 뉴스룸 (2칼럼)

```
<Newsroom variant="arena" tournamentId={id}>
  <NewsroomColumn title="키워드 뉴스">
    <KeywordNewsView articles={keywordArticles}>   # 7건
      <FeaturedNewsCard article={articles[0]} />   # 피처드 1
      <NewsCard article={a} /> ×6                  # 나머지 6
  <NewsroomColumn title="AI-Report">
    <AIReportNewsView tournamentId={id} />          # 3건 — C5 참조
  <NewsSource />                                    # "Powered by GNews"
```

### 2-2. The Pitch 뉴스룸 (통합 피드)

```
<Newsroom variant="pitch">
  <NewsroomHeader title="뉴스룸" />
  <UnifiedNewsFeed items={merged}>                  # 키워드+AI 생성순 6건
    <NewsFeedItem item={i} />                       # type='keyword' | 'ai-report'
  <NewsroomMoreLink href="/arena/..." />            # '더 보기'
```

---

## 3. getNewsCache Cloud Function (키워드 뉴스)

```ts
// functions/src/getNewsCache.ts
// Voter가 아레나 진입 시 클라이언트가 호출
exports.getNewsCache = onRequest(async (req, res) => {
  const tournamentId = req.query.tournamentId as string

  // 1. Firestore 캐시 확인 (1시간 TTL)
  const cached = await db.doc(`news_cache/${tournamentId}`).get()
  const ONE_HOUR = 60 * 60 * 1000
  if (cached.exists) {
    const data = cached.data()!
    if (Date.now() - data.cachedAt.toMillis() < ONE_HOUR) {
      res.json({ articles: data.articles, fromCache: true }); return
    }
  }

  // 2. 캐시 만료 → GNews API 호출 (★ v1.1: max=7)
  const tournament = await db.doc(`tournaments/${tournamentId}`).get()
  const keywords = extractKeywords(tournament.data()!.title)
  const response = await fetch(
    `https://gnews.io/api/v4/search?q=${encodeURIComponent(keywords)}&max=7&lang=${req.query.lang ?? 'en'}&apikey=${process.env.GNEWS_API_KEY}`
  )
  const data = await response.json()

  // 3. 저작권: 제목+출처+URL+썸네일만 저장 (본문 절대 금지)
  const articles: NewsArticle[] = data.articles.map((a: any) => ({
    title: a.title, source: a.source.name, url: a.url,
    imageUrl: a.image ?? null, publishedAt: a.publishedAt,
  }))

  // 4. Firestore news_cache 저장
  await db.doc(`news_cache/${tournamentId}`).set({
    tournamentId, articles, keywords, cachedAt: FieldValue.serverTimestamp(),
  })
  res.json({ articles, fromCache: false })
})

// 키워드 추출 (Tournament 제목 기반 — 선택적으로 상위 Contestant 이름 결합 가능)
function extractKeywords(title: string): string {
  return title.replace(/[^\w\s]/g, '').trim()
}
```

---

## 4. The Pitch 뉴스룸 — 통합 피드 로직

The Pitch 뉴스룸은 키워드 뉴스와 AI-Report 뉴스를 **생성순(최신순)**으로 병합해 6건 노출합니다.

```ts
// 통합 피드 구성 (MVP 1: 대표 Tournament 1개 기준 — 다국어/다대진은 MVP 2 확장)
async function buildPitchNewsFeed(tournamentId: string): Promise<UnifiedNewsItem[]> {
  // (a) 키워드 뉴스 — news_cache
  const cache = await db.doc(`news_cache/${tournamentId}`).get()
  const keywordItems: UnifiedNewsItem[] = (cache.data()?.articles ?? []).map(a => ({
    type: 'keyword', title: a.title, url: a.url,
    imageUrl: a.imageUrl, source: a.source, date: a.publishedAt,
  }))

  // (b) AI-Report 뉴스 — ai_news (published만)
  const aiSnap = await getDocs(query(
    collection(db, 'ai_news'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'), limit(6),
  ))
  const aiItems: UnifiedNewsItem[] = aiSnap.docs.map(d => {
    const n = d.data()
    return { type: 'ai-report', title: n.content.titleKo, url: `/arena/${n.tournamentId}/news/${d.id}`,
             imageUrl: n.crownCardUrl, source: 'WC48 Fan Intelligence', date: n.publishedAt }
  })

  // (c) 생성순 병합 → 상위 6건
  return [...keywordItems, ...aiItems]
    .sort((x, y) => +new Date(y.date) - +new Date(x.date))
    .slice(0, 6)
}
```

---

## 5. TypeScript 타입

```ts
interface NewsArticle {            // 키워드 뉴스 (news_cache 내부)
  title: string
  source: string
  url: string
  imageUrl: string | null
  publishedAt: string              // ISO 8601
}

interface NewsCache {
  tournamentId: string
  articles: NewsArticle[]          // ★ v1.1: 최대 7개
  keywords: string
  cachedAt: Timestamp
  // ⚠️ 본문(content/description) 저장 금지
}

interface UnifiedNewsItem {        // The Pitch 통합 피드 항목
  type: 'keyword' | 'ai-report'
  title: string
  url: string                      // keyword=외부 URL / ai-report=내부 경로
  imageUrl: string | null
  source: string
  date: string                     // ISO 8601 — 정렬 기준
}
```

---

## 6. 상태 (로컬 — Newsroom 컴포넌트)

```ts
const [articles, setArticles]   = useState<NewsArticle[]>([])
const [loading, setLoading]     = useState(true)
const [fromCache, setFromCache] = useState(false)

useEffect(() => {
  fetch(`/api/news?tournamentId=${tournamentId}&lang=${locale}`)
    .then(r => r.json())
    .then(data => { setArticles(data.articles); setFromCache(data.fromCache); setLoading(false) })
}, [tournamentId, locale])
```

---

## 7. UI 사양

### Newsroom 컨테이너 — Arena (2칼럼)

```
데스크탑(1440px): 2칼럼 — 좌 Keyword 60% / 우 AI-Report 40%, gap-6
태블릿(768px)  : 2칼럼 유지, 각 칼럼 내부 1열 세로 나열
모바일(375px)  : 칼럼을 탭으로 — [키워드 뉴스] / [AI-Report] 전환. 기본 탭=키워드
칼럼 헤더: text-[13px] font-semibold text-wc-text + 골드 언더라인 2px
```

### FeaturedNewsCard (키워드 뉴스 첫 기사)

```
크기: w-full · h-[200px]
썸네일: object-cover rounded-card
오버레이: linear-gradient(to top, rgba(6,12,59,0.85), transparent 55%)
제목: text-[16px] font-semibold text-wc-text · 절대 위치 하단 · line-clamp-2
출처+시간: text-[11px] text-wc-muted
```

### NewsCard (나머지 키워드 뉴스 6개)

```
배경: bg-wc-surface · border border-wc-border · rounded-panel
hover: border-wc-primary · shadow-gold
썸네일: h-[96px] object-cover rounded-t-panel (없으면 골드 크라운 플레이스홀더)
제목: text-[13px] font-medium text-wc-text · line-clamp-2
출처: text-[11px] text-wc-muted / 발행일: 상대 시간("2시간 전")
```

### The Pitch — NewsFeedItem (통합 피드)

```
행 형태: 썸네일(64×64 rounded-panel) + 제목 2줄 + 메타 1줄, py-3 구분선
type 배지: keyword="뉴스"(회색 칩) / ai-report="● AI-Report"(골드 11px) ← C5 절대 규칙
제목: text-[14px] font-medium line-clamp-2
메타: source · 상대 시간 — text-[11px] text-wc-muted
클릭: keyword → 외부 새 탭 / ai-report → 내부 기사 뷰
```

### 로딩 / 빈 상태 / 오류

```
로딩: Skeleton 카드 3개 (animate-pulse)
키워드 뉴스 없음: "관련 뉴스를 찾을 수 없어요" + 재시도 버튼
API 오류: "뉴스를 불러오지 못했어요" + 재시도 버튼
AI-Report 칼럼 빈 상태: C5 §9 AIReportEmptyState ("준비 중" — 재시도 버튼 없음)
```

---

## 8. The Pitch 배치

```
The Pitch(홈) 세로 순서:
  M1 Hero → M2 Trending 대진 그리드 → ★ M5 뉴스룸(통합 6건) → Footer
                                       └ Trending 섹션 '바로 밑' (대표님 지정)
섹션 제목: "뉴스룸" · 우측 '더 보기' 링크 → Arena 뉴스룸
```

---

## 9. Acceptance Criteria

### The Arena 뉴스룸
- [ ] 데스크탑/태블릿 2칼럼(키워드 7 · AI-Report 3) 렌더링
- [ ] 모바일 [키워드]/[AI-Report] 탭 전환 동작
- [ ] 최초 로드: getNewsCache 호출 / 1시간 내 재방문: fromCache:true
- [ ] GNews 결과 7건 이하로 표시 (max=7)
- [ ] 뉴스 카드 클릭 → 새 탭 / news_cache 본문 미저장 확인
- [ ] AI-Report 칼럼 빈 상태(준비 중) 정상 노출 (C5)

### The Pitch 뉴스룸
- [ ] Trending 섹션 바로 밑에 뉴스룸 섹션 렌더링 (3화면)
- [ ] 키워드+AI-Report 생성순 병합 6건 노출
- [ ] type 배지(뉴스 / ● AI-Report) 구분 표시
- [ ] '더 보기' → Arena 뉴스룸 이동

---

## 10. 관련 문서

```
docs/lite-specs/C5-fan-intelligence.md → AI-Report News View · 생성 (단일 진실)
WorldCrown48_v4_9.md §7 M6             → 아레나 뉴스룸
WorldCrown48_v4_9.md §5 M5             → The Pitch 뉴스룸 (v1.1 신규)
LANGUAGE.md §11                        → Newsroom·Keyword News View 용어
PRD-MVP1_v2_2.md                       → MVP 범위·일정
```

---

## 변경 이력

| 버전 | 날짜 | 주요 내용 |
|---|---|---|
| v1.0 | 2026-05-14 | 최초 작성. GNews 25개 단일 피드 뉴스룸. |
| v1.1 | 2026-05-25 | 대표님 지시 반영 — 키워드 7개 축소, Arena 2칼럼(키워드7+AI3), The Pitch 통합 뉴스룸(6건) 신규, AI-Report 칼럼은 C5로 분리, Next.js 14 스택 정합. |

---

*© 2026 WorldCrown48 | C4-newsroom.md v1.1 | CONFIDENTIAL*
