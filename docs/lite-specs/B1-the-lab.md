# Lite Spec — #8 Admin Lab — Claude API 48명 추천 + 대진 생성

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
    category: 'FIFA',
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
