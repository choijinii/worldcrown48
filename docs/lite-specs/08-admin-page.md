# Lite Spec — #8 Admin 페이지 — Claude API 48명 추천 + 대진 생성

## 컴포넌트 트리

```
<AdminDomain>                    # /admin 라우트, 관리자 uid 검증
  <TournamentCreator>
    <TitleInput />               # 대진 제목 입력
    <AiRecommendButton />        # Claude API 호출 트리거
    <CandidateGrid>              # 48개 후보 편집 그리드
      <CandidateEditor index={i} candidate={c} onChange={...} />
    </CandidateGrid>
    <PublishButton />            # Firestore 저장 + 공개
  </TournamentCreator>
  <TournamentList />             # 기존 대진 목록 + 상태 관리
```

## Claude API 호출 (Cloud Function)

```js
// functions/src/recommendCandidates.js
exports.recommendCandidates = onCall(async ({ title }) => {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `다음 토너먼트 제목에 맞는 후보 48명을 추천해줘.
제목: "${title}"
각 후보는 JSON 배열로 반환: [{name, nationality, position, wiki_search_url}]
퍼포먼스 기반 공개 데이터만 사용. 반드시 48명.`
    }]
  })
  return JSON.parse(response.content[0].text)
})
```

## 상태 (로컬 — TournamentCreator)

```js
const [title, setTitle] = useState('')
const [candidates, setCandidates] = useState([])   // Candidate[48]
const [loading, setLoading] = useState(false)       // AI 로딩
const [step, setStep] = useState(1)                 // 1: 제목입력 | 2: 후보편집
```

## CandidateEditor Props

```ts
interface CandidateEditorProps {
  index: number          // 1~48
  candidate: Partial<Candidate>
  onChange: (index: number, field: string, value: string) => void
}
// 표시: 번호, 이름 입력, 국적, 이미지URL 입력, 위키 검색 링크
```

## Firestore 저장 로직

```js
async function publishTournament() {
  const tournamentRef = doc(collection(db, 'tournaments'))
  const batch = writeBatch(db)

  batch.set(tournamentRef, { title, category, status: 'active', is_public: true, ... })

  candidates.forEach((c, i) => {
    const candidateRef = doc(collection(db, 'candidates'))
    batch.set(candidateRef, { ...c, tournament_id: tournamentRef.id, order: i + 1 })
  })

  await batch.commit()
}
```

## 접근 제어

```js
// AdminDomain 마운트 시
useEffect(() => {
  if (!user || user.uid !== import.meta.env.VITE_ADMIN_UID) {
    navigate('/')
  }
}, [user])
```
