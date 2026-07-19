> ✅ **2026-07-12 — B-2 완료: Lab 생성 플로우 5단계로 갱신됨** (ADR-0011).
> 아래 "B-2 현행 플로우" 섹션이 현재의 진실이며, 그 뒤 레거시 2-step 명세는 **참고용 이력**이다.
> 충돌 시 우선순위: `docs/adr/0011-b2-lab-flow.md` > `CLAUDE.md v2.2 「🔄 2026-07 대개편」` > `LANGUAGE.md §13` > 이 문서 레거시 본문.

---

## 🟢 B-2 현행 플로우 (5단계, 2026-07-12 — ADR-0011)

**핵심 원칙: AI = 옵션(helper), 관문 아님.** AI가 완전히 죽어 있어도 직접 입력만으로 발행 성공.

```
STEP 1 (제목·카테고리·설명·키워드·Deadline)
  ①제목(필수·50자)  ②카테고리(필수 — TX-0 categories 데이터, 운영자는 전 status 선택)
  ③설명(선택·참가 대상 서술)  ④키워드(필수·칩 UI · ✨AI 생성 + 직접 수정, ≤12개·각 ≤30자)
  ⑤Tournament Deadline(필수 · 프리셋 3/7/14일·기본 7 · 과거 거부)
  → [다음] : ①②④⑤ 충족 시 활성 (AI 성공 여부와 무관 — isStep1Ready)
STEP 2 (48칸 그리드 · 채우기 4방식)
  ✏️직접 입력 · ✨AI 48명 전체 · ✨빈칸만 AI(채운 칸 100% 보존) · 개별 수정
  → Publish (48/48) → 내 Tournament 리스트 [Arena에서 보기 →]
발행 시: title·description 1회 자동 번역(Haiku, ko/en/es) → titleI18n·description 저장(additive)
```

**컴포넌트 트리 (현행):**
```
<TournamentCreator>
  STEP 1: <TitleInput/> <CategorySelect/> <DescriptionInput/> <KeywordChips/> <DeadlinePicker/> [다음]
  STEP 2: <FillToolbar/> <ContestantGrid><ContestantEditor/></ContestantGrid> <PublishButton/>
<TournamentList/>   # 각 행 "Arena에서 보기 →" (/arena/{id})
```

**스키마 확장(additive)**: `title:string`(원문 유지) + `titleI18n:{ko,en,es}` · `description:{ko,en,es}` · `keywords:string[]` · `tournamentDeadline`(유효 미래 시각). 상세 → ADR-0011.

**Callable**: `aiSuggestKeywords`(Haiku, STEP1 ✨) · `translateTournamentMeta`(Haiku, 발행 시) · `aiFillContestants`(Sonnet, description·keywords·existing 입력 확장). 모델 상수 = `functions/src/core/models.ts`.

**#12 참가 한도 3언어화**: `onVote`는 `details.code`(daily_limit/rate_limited)만 전달, 클라 `voteErrorMessageKey`가 i18n 토스트로 매핑(ko/en/es).

**AI 모델 표기 정정**: 아래 레거시 "절대 규칙"의 `claude-sonnet-4-20250514`는 이력. 현행은 `models.ts` 상수(SONNET_MODEL=`claude-sonnet-4-6`, HAIKU_MODEL=`claude-haiku-4-5`)가 단일 진실.

---

# 📜 (레거시 이력) Lite Spec — #8 Admin Lab — Claude API 48명 추천 + 대진 생성

> ⚠️ **[2026-05-25 정합성 정정]** 이 문서의 프레임워크·환경변수·폴더 구조·라우팅 표기 중 일부는 구버전(Vite + React Router)입니다. **WorldCrown48의 공식 스택은 Next.js 14 (App Router)입니다** — CLAUDE.md 불변 원칙 #8(스택 고정). 프레임워크·폴더 구조·라우팅의 단일 진실은 `WorldCrown48_ARCHITECTURE.md` + `WC48_CODING_CONTEXT_v1.md`입니다. 이 문서의 화면 구성·컴포넌트·기능 명세 자체는 유효합니다.

# ✅ Step 1 업그레이드 — 2026-05-14
# 🔴 주요 수정: Candidate→Contestant, candidates→contestants 전체 교체

---

## ⛔ 절대 규칙
```
✅ Contestant, contestants (❌ Candidate, candidates — 전체 교체)
✅ aiFillContestants Cloud Function명 (❌ recommendCandidates)
✅ 데스크탑 전용 레이아웃 (min-width: 1440px 기준)
✅ 에이전트 B-1 담당 (MVP 1)
✅ Claude 모델: claude-sonnet-4-20250514 (❌ claude-sonnet-4-6)
```

---

## 컴포넌트 트리

```
<LabDomain>                      # /admin/lab, 관리자 uid 검증
  <TournamentCreator>
    <TitleInput />
    <AiFillButton />             # ✅ (❌ AiRecommendButton)
    <ContestantGrid>             # ✅ (❌ CandidateGrid)
      <ContestantEditor index={i} contestant={c} onChange={...} />
    </ContestantGrid>
    <PublishButton />
  </TournamentCreator>
  <TournamentList />
```

## aiFillContestants Cloud Function

```ts
// functions/src/aiFillContestants.ts  ✅ (❌ recommendCandidates)
exports.aiFillContestants = onCall(async ({ title }) => {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',  // ✅ 최신 모델명
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `다음 Tournament 제목에 맞는 Contestant 48명을 추천해줘.
제목: "${title}"
각 Contestant는 JSON 배열로 반환:
[{ name: string, nationality: string, position: string, imageSearchKeyword: string }]
퍼포먼스 기반 공개 데이터만 사용. 반드시 정확히 48명.`
    }]
  })
  return JSON.parse(response.content[0].text)
})
```

## 상태 (로컬 — TournamentCreator)

```ts
const [title, setTitle] = useState('')
const [contestants, setContestants] = useState<Partial<Contestant>[]>([])  // ✅ contestants
const [loading, setLoading] = useState(false)       // AI 로딩
const [step, setStep] = useState<1 | 2>(1)          // 1: 제목입력 | 2: Contestant 편집
```

## ContestantEditor Props (✅ CandidateEditor 아님)

```ts
interface ContestantEditorProps {
  index: number           // 1~48
  contestant: Partial<Contestant>  // ✅
  onChange: (index: number, field: keyof Contestant, value: string) => void
}
// 표시: 번호(order), 이름 입력, 국적, imageUrl 입력, 검색 키워드
```

## Firestore 저장 로직

```ts
async function publishTournament() {
  const tournamentRef = doc(collection(db, 'tournaments'))
  const batch = writeBatch(db)

  batch.set(tournamentRef, {
    title,
    category: 'KPOP',  // 2026-07-11 정정: 'FIFA'는 유효 카테고리가 아님 + FIFA 표기 금지 원칙 위반
    status: 'active',
    hostUid: user.uid,
    createdAt: serverTimestamp(),
    tournamentDeadline: selectedDeadline,  // ✅ (❌ rounds[].deadline)
    currentRound: 1,                       // ✅ 1~5 체계로 시작
    totalContestants: 48,
    settings: { aiNews: false, multiLang: false, showRanking: true }
  })

  contestants.forEach((c, i) => {
    const contestantRef = doc(collection(db, 'contestants'))  // ✅ contestants
    batch.set(contestantRef, {
      ...c,
      tournamentId: tournamentRef.id,
      order: i + 1,
    })
  })

  await batch.commit()
}
```

## 접근 제어

```ts
useEffect(() => {
  if (!user || user.uid !== import.meta.env.VITE_ADMIN_UID) {
    navigate('/')
  }
}, [user])
```

## 48 Nodes 그리드 UI

```
데스크탑 전용: grid grid-cols-6 gap-4
각 노드: 80×80px 이미지 + 이름 텍스트
비어있는 노드: border-2 border-dashed border-wc-border + "+" 아이콘
채워진 노드: Contestant 이미지 (object-cover rounded-panel)
AI Fill 버튼: border-2 border-wc-primary text-wc-primary
  로딩 중: "✨ Claude AI가 48명을 추천 중..."
```
