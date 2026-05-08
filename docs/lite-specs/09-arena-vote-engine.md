# Lite Spec — #9 The Arena — 1:1 투표 엔진 + 실시간 집계

## 컴포넌트 트리

```
<ArenaDomain tournamentId={params.id}>
  <RoundBadge round={round} />             # "Round of 48: Heat 01"
  <MatchView match={currentMatch}>
    <CandidateCard candidate={left} onVote={castVote} />
    <VsSymbol />                           # 골드 테두리 원형 VS
    <CandidateCard candidate={right} onVote={castVote} />
  </MatchView>
  <ProgressDots total={totalMatches} current={matchIndex} />
  <VoteResultBar leftPct={pct} rightPct={100-pct} />  # 투표 후 표시
```

## 상태 (arenaStore.js — Zustand)

```js
{
  tournament: Tournament | null,
  candidates: Candidate[],
  currentRound: number,             // 48 | 24 | 12 | 6 | 3 | 1
  currentMatchIndex: number,
  votedMatchIds: Set<string>,       // 이미 투표한 matchId
  liveStats: VoteStats,             // Realtime DB 구독
  // actions
  loadTournament: (id) => Promise<void>,
  castVote: (matchId, winnerId) => Promise<void>,
  subscribeToStats: (tournamentId) => unsubscribe,
}
```

## castVote 로직

```js
async function castVote(matchId, winnerId) {
  const { status } = checkCanVote()         // VoteGate 확인
  if (status === 'login_required') { openLoginModal(); return }

  // Realtime DB 트랜잭션으로 count 업데이트
  const statRef = ref(rtdb, `vote_stats/${tournamentId}/${winnerId}`)
  await runTransaction(statRef, (current) => ({
    count: (current?.count || 0) + 1,
    trend_score: calculateTrendScore(current),
    updated_at: Date.now(),
  }))

  // Firestore에 투표 기록 저장
  await addDoc(collection(db, 'votes'), {
    tournament_id: tournamentId,
    round: currentRound,
    match_id: matchId,
    winner_id: winnerId,
    device_hash: getDeviceHash(),
    ip_hash: await getIpHash(),
    uid: user?.uid || null,
    timestamp: serverTimestamp(),
  })

  votedMatchIds.add(matchId)
  onVoteSuccess()                           // 세션 투표 소모
}
```

## 라운드 진행 (Cloud Function)

```js
// 트리거: votes 컬렉션 onCreate
exports.onVoteCreated = onDocumentCreated('votes/{voteId}', async (event) => {
  const { tournament_id, round, match_id } = event.data.data()

  // 현재 라운드 모든 매치 완료 확인
  const roundMatchCount = round / 2
  const completedMatches = await countCompletedMatches(tournament_id, round)

  if (completedMatches >= roundMatchCount) {
    const nextRound = round / 2
    if (nextRound < 1) {
      // 결승 완료 → 우승자 확정
      await finalizeTournament(tournament_id)
    } else {
      await createNextRound(tournament_id, nextRound)
    }
  }
})
```

## CandidateCard Props

```ts
interface CandidateCardProps {
  candidate: Candidate
  isSelected: boolean
  voteCount: number
  onVote: (candidateId: string) => void
}
// 이미지: 4:5 비율, object-cover
// hover: 골드 2px 테두리 + scale(1.02) 애니메이션
// 선택 후: 골드 테두리 + 득표율 오버레이
```

## 반응형

- PC: 좌우 50%씩 배치 (VS 중앙)
- 모바일: 상하 배치 (VS 중간)
