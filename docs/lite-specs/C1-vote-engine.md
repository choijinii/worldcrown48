# Lite Spec — #9 The Arena — 1:1 투표 엔진 + 실시간 집계

> ⚠️ **[2026-05-25 정합성 정정]** 이 문서의 프레임워크·환경변수·폴더 구조·라우팅 표기 중 일부는 구버전(Vite + React Router)입니다. **WorldCrown48의 공식 스택은 Next.js 14 (App Router)입니다** — CLAUDE.md 불변 원칙 #8(스택 고정). 프레임워크·폴더 구조·라우팅의 단일 진실은 `WorldCrown48_ARCHITECTURE.md` + `WC48_CODING_CONTEXT_v1.md`입니다. 이 문서의 화면 구성·컴포넌트·기능 명세 자체는 유효합니다.

> 🛑 **MENTAL_MODEL 우선** — 라운드·매치·득표 규칙 시각 진실: `docs/mental-model/MENTAL_MODEL.svg` (충돌 시 SVG 우선)

# ✅ Step 1 업그레이드 — 2026-05-14
# 🔴 가장 많은 수정: Contestant, 라운드 번호 체계, advanceRound 로직, voteCount 금지

---

## ⛔ 절대 규칙
```
✅ Contestant, ContestantCard (❌ Candidate, CandidateCard)
✅ currentRound: 1~5 (❌ 48/24/12/6/3/1)
✅ advanceRound()는 Voter별 자동 실행 (❌ 전체 글로벌 라운드 전환 아님)
✅ voteCount props 금지 — ContestantCard에 절대 수치 전달 금지
✅ 투표 후 rate(%)만 표시 — ranking_cache에서 조회
✅ Round Deadline 없음 — Voter 투표 흐름 기반 자동 전환
✅ 에이전트 C-1 담당 (투표 엔진), C-2 (Crown Card), C-3 (랭킹/어뷰징)
```

---

## 컴포넌트 트리

```
<ArenaDomain tournamentId={params.id}>
  {/* ❌ RoundBadge "N강 · X/Y" HUD 절대 금지 — Voter는 관중 아닌 선수 */}
  <MatchView match={currentMatch}>
    <ContestantCard contestant={left} onVote={castVote} />   # ✅
    <VsSymbol />                           # 골드 테두리 원형 VS
    <ContestantCard contestant={right} onVote={castVote} />  # ✅
  </MatchView>
  {/* 진행 피드백은 시각적 미니 인디케이터만 허용 (텍스트 HUD 금지) */}
  <RoundTransition />                      # 라운드 전환 이벤트 화면 (Framer Motion)
                                           # "🎉 24강 시작!" — 라운드 사이에만 노출
  {/* ❌ VoteRateBar는 여기 없음 — 랭킹 화면에서만 허용 */}
```

> **Round 배지의 진짜 정체**: HUD가 아니라 **라운드 전환 이벤트의 이름**.
> Voter가 ROUND OF 48의 마지막 매치(24/24) 완료 → `<RoundTransition>` 전체 화면 이벤트 → "🎉 24강 시작!" 1~2초 노출 → 다음 매치 화면(HUD 없음). 매치 진행 중에는 Round 정보를 화면에 띄우지 않는다.

---

## 라운드 구조 (1~5 체계)

```ts
const ROUND_CONFIG = {
  1: { name: '48강', nameEn: 'ROUND OF 48', matchCount: 24, contestants: 48 },
  2: { name: '24강', nameEn: 'ROUND OF 24', matchCount: 12, contestants: 24 },
  3: { name: '12강', nameEn: 'ROUND OF 12', matchCount: 6,  contestants: 12 },
  4: { name: '6강',  nameEn: 'ROUND OF 6',  matchCount: 3,  contestants: 6  },
  5: { name: '결승', nameEn: 'THE FINAL',   matchCount: 1,  contestants: 3  },
  //  ★ round 5 (THE FINAL):
  //    contestants: 3 — 6강 3 Match 후 3명 잔류 (WC48 고유 구조)
  //    matchCount:  1 — 3명을 동시에 표시, Voter가 1명 직접 선택 (1v1 아님)
  //    isFinal:     true → FinalPickView 컴포넌트로 렌더링
} as const

// ❌ 절대 금지: currentRound = 48, 24, 12, 6, 3, 1 (이 숫자 체계 사용 금지)
// ❌ 절대 금지: "ROUND OF 16", "QUARTERFINAL", "SEMIFINAL" (FIFA 표준 — WC48에 없음)
```

### Round 전환 ANNOUNCEMENT 표기 (RoundTransition 이벤트 전용)

```
한국어: "🎉 N강 시작!"       예) "🎉 24강 시작!"
영문:   "🎉 ROUND OF N BEGINS"   예) "🎉 ROUND OF 24 BEGINS"
결승:   "🎉 THE FINAL"  (3명 동시 선택 화면으로 이동)
```

> ⚠️ 위 표기는 **라운드 전환 이벤트 화면(`<RoundTransition>`)에서만** 사용.
> 매치 화면 상단·하단·헤더 어디에도 라운드 정보 텍스트 노출 금지.

### THE FINAL UI 스펙 (round 5 전용)

```tsx
// round 5 진입 시 MatchView 대신 FinalPickView 렌더링
{currentRound === 5 ? (
  <FinalPickView
    finalists={finalists}       // contestants: 3명
    onPick={confirmChampion}    // 1명 선택 → Champion 확정
  />
) : (
  <MatchView match={currentMatch}>   // round 1~4: 기존 1v1 MatchView
    ...
  </MatchView>
)}

// FinalPickView: 3개 ContestantCard를 나란히 표시
// 선택 즉시 → Champion 확정 → advanceRound() → Crown Card 생성
// ❌ 금지: 결승을 1v1 Match 2개로 쪼개는 것 (3강 → 2강 추가 라운드 ❌)
```

---

## 상태 (voteStore.ts — Zustand)

```ts
{
  tournament: Tournament | null,
  contestants: Contestant[],       // ✅ (❌ candidates)
  currentRound: number,            // ✅ 1~5 (❌ 48/24/12)
  currentMatchIndex: number,
  votedMatchIds: Set<string>,
  rateCache: Record<string, string>,  // contestantId → "34.5" (%)
  // ✅ liveCount 금지 — 절대 수치 구독 안 함
  // actions
  loadTournament: (id: string) => Promise<void>,
  castVote: (matchId: string, contestantId: string) => Promise<void>,
  subscribeToRates: (tournamentId: string) => () => void,  // ranking_cache 구독
  subscribeToRoundTransition: (voterId: string, tournamentId: string) => () => void,
}
```

---

## castVote 로직 (핵심)

```ts
async function castVote(matchId: string, contestantId: string) {  // ✅ contestantId
  // Step 1: VoteGate 확인 (06-auth-vote-gate 참조)
  const result = await checkCanVote(tournamentId)
  if (result.status === 'login_required') { openLoginModal(result.reason); return }
  if (result.status === 'daily_limit_reached') { showDailyLimitToast(); return }

  // Step 2: onVote Cloud Function 호출 (서버사이드 검증 포함)
  // → Rate Limit 체크 (1분 10회 → 15분 쿨다운)
  // → 1일 5회 한도 체크
  // → Realtime DB 트랜잭션 (+1)
  // → Firestore votes 기록
  const onVoteFn = httpsCallable(functions, 'onVote')
  await onVoteFn({
    tournamentId,
    matchId,
    contestantId,           // ✅ (❌ winnerId)
    deviceId: getDeviceId() ?? null,
  })

  // Step 3: 세션 투표 소모 처리
  onVoteSuccess()

  // Step 4: votedMatchIds 업데이트
  votedMatchIds.add(matchId)

  // Step 5: advanceRound()는 Cloud Function이 자동 실행
  //   → 이 Voter의 해당 Round 마지막 Match 완료 시 자동
  //   → 클라이언트는 Realtime DB roundTransitions 구독으로 감지
}
```

---

## advanceRound — ⚠️ 핵심 수정 (기존 로직과 완전히 다름)

```ts
// ❌ 기존 (틀린 방식): 전체 라운드 완료 판단
// exports.onVoteCreated = ... completedMatches >= roundMatchCount → createNextRound()

// ✅ 올바른 방식: Voter별 개인 진행 기반 자동 전환
// functions/src/advanceRound.ts

exports.advanceRound = onDocumentCreated('votes/{voteId}', async (event) => {
  const { userId, tournamentId, matchId, round } = event.data.data()

  // 이 Voter가 현재 Round의 마지막 Match를 완료했는지 확인
  const roundMatchCount = ROUND_CONFIG[round].matchCount

  const voterRoundVotes = await getDocs(query(
    collection(db, 'votes'),
    where('userId', '==', userId),
    where('tournamentId', '==', tournamentId),
    where('round', '==', round)
  ))

  if (voterRoundVotes.size < roundMatchCount) return  // 아직 완료 안 됨

  const isFinalRound = round === 5

  if (isFinalRound) {
    // Champion 확정 → CrownCard 생성 트리거
    await confirmChampion(tournamentId, userId)
  } else {
    // 다음 Round 전환 이벤트 발행 (Voter 개인)
    await realtimeDb.ref(`roundTransitions/${userId}/${tournamentId}`).set({
      fromRound: round,
      toRound: round + 1,
      timestamp: Date.now(),
    })
  }
  // ✅ 다른 Voter의 진행에 영향 없음
})

// ❌ 절대 금지:
// rounds[round].deadline 참조
// 전체 tournament의 currentRound를 이 함수에서 업데이트
```

---

## 라운드 전환 UI (useRoundTransition 훅)

```ts
// Realtime DB 구독: roundTransitions/{userId}/{tournamentId}
function useRoundTransition(userId: string, tournamentId: string) {
  const [transitionEvent, setTransitionEvent] = useState<RoundTransitionEvent | null>(null)

  useEffect(() => {
    const ref = rtdb.ref(`roundTransitions/${userId}/${tournamentId}`)
    const unsubscribe = ref.on('value', (snapshot) => {
      const event = snapshot.val()
      if (event) setTransitionEvent(event)
    })
    return () => ref.off('value', unsubscribe)
  }, [userId, tournamentId])

  return { transitionEvent }
}

// RoundTransition 컴포넌트: Framer Motion
// 트리거 시: 전체 화면 오버레이 → 라운드 전환 카드 팝업 (spring 애니메이션)
// "계속하기" 버튼 → 다음 Round Match 진행
```

---

## ContestantCard Props (✅ CandidateCard 아님)

```ts
interface ContestantCardProps {
  contestant: Contestant    // ✅ (❌ candidate)
  isSelected: boolean
  onVote: (contestantId: string) => void
  // ❌ voteCount 절대 금지 — props에 수치 전달 금지
}
// 이미지: 4:5 비율 object-cover
// 모바일: 160×200px / 태블릿: 200×260px / 데스크탑: 240×320px
// hover: border-2 border-wc-primary + scale(1.03)
// 선택 후: border-4 border-wc-primary + 골드 체크 뱃지

// 투표 후 rate 표시: VoteRateBar (별도 컴포넌트)
//   → ranking_cache에서 rate(%) 조회 → rateCache 상태 참조
//   ❌ Realtime DB count 직접 구독 및 표시 금지
```

---

## VoteRateBar (투표 후만 표시)

```ts
interface VoteRateBarProps {
  rateA: string   // "34.5" (% 문자열)
  rateB: string   // "65.5"
  // ❌ countA, countB 절대 금지
}
// A: bg-wc-primary (Gold), B: bg-wc-muted
// 투표 전: 숨김 / 투표 후: 슬라이드 인 애니메이션
```

---

## 반응형

```
데스크탑(1440px): ContestantCard 좌우 50% (VS 중앙)
태블릿(768px):   ContestantCard 좌우 배치 (약간 좁게)
모바일(375px):   ContestantCard 상하 배치 (VS 중간)
```
