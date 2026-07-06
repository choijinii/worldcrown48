# Lite Spec — #12 부정투표 방지 — Cloud Functions 검증
# ✅ Step 1 업그레이드 — 2026-05-14
# 🔴 주요 수정: uid 기반 "한 Tournament 1회" 제한 삭제
# 🔧 HF-1 정정 (2026-07-05): "1일 5표" → Daily Participation Limit (신규 Tournament 5개/일)

---

## ⛔ 절대 규칙
```
✅ Daily Participation Limit: 1일(KST) 신규 참가 Tournament 5개.
   이미 참가한 Tournament 안에서는 무제한 (❌ Tournament당 5표 카운트 아님)
✅ Rate Limit: 1분 20회 초과 시 resource-exhausted (per-uid 토큰 버킷, HF-1.5 — 3초당 1표)
✅ 실제 IP 저장 금지 — sha256(ip + salt) 16자리만
✅ device_hash: MVP 2 (fingerprintjs) — MVP 1에서는 null 허용
⛔ uid 기반 "이미 참여한 토너먼트" 차단 금지 (같은 대회 계속 진행이 핵심)
```

---

## onVote Cloud Function (통합 검증)

```ts
// functions/src/onVote.ts
// Rate Limit + Daily Limit + DB 트랜잭션 + Firestore 기록 통합

exports.onVote = onCall(async (request) => {
  const { tournamentId, matchId, contestantId, deviceId } = request.data
  const userId = request.auth?.uid
  if (!userId) throw new HttpsError('unauthenticated', '로그인 필요')

  // ── Step 1: Rate Limiting (1분 10회 → 15분 쿨다운) ──
  const RATE_LIMIT_WINDOW_MS = 60 * 1000       // 1분
  const RATE_LIMIT_MAX = 10
  const COOLDOWN_MS = 15 * 60 * 1000           // 15분

  const cooldownRef = rtdb.ref(`rateLimits/${userId}/cooldownUntil`)
  const cooldownSnap = await cooldownRef.get()
  if (cooldownSnap.val() && Date.now() < cooldownSnap.val()) {
    const remaining = Math.ceil((cooldownSnap.val() - Date.now()) / 60000)
    throw new HttpsError('resource-exhausted', `Rate limit. ${remaining}분 후 재시도`)
  }

  const timestampsRef = rtdb.ref(`rateLimits/${userId}/timestamps`)
  const tsSnap = await timestampsRef.get()
  const timestamps: number[] = tsSnap.val() || []
  const recent = timestamps.filter(t => Date.now() - t < RATE_LIMIT_WINDOW_MS)

  if (recent.length >= RATE_LIMIT_MAX) {
    await cooldownRef.set(Date.now() + COOLDOWN_MS)
    throw new HttpsError('resource-exhausted', '1분 10회 초과. 15분 후 재시도')
  }
  await timestampsRef.set([...recent, Date.now()])

  // ── Step 2: Daily Participation Limit (KST 기준) ──
  // 신규 참가 Tournament는 하루 5개까지. 이미 참가한 Tournament는 무제한.
  // 단일 doc 읽기 (daily_participation/${uid}_${date}) — votes 쿼리·신규 index 불필요.
  const todayKST = getTodayKST()
  const partSnap = await getDoc(doc(db, 'daily_participation', `${userId}_${todayKST}`))
  const participatedIds: string[] = partSnap.exists() ? (partSnap.data().tournamentIds ?? []) : []
  if (!participatedIds.includes(tournamentId) && participatedIds.length >= 5) {
    throw new HttpsError('resource-exhausted', '오늘 참가할 수 있는 Tournament를 모두 사용했어요 (5/5)')
  }
  // 참가 doc 갱신은 신규 Tournament일 때만 (arrayUnion) — 같은 대회 재투표는 한도 미소비.

  // ── Step 3: Realtime DB 트랜잭션 (+1) ──
  const voteRef = rtdb.ref(`votes/${matchId}/${contestantId}`)
  await voteRef.transaction((current) => (current || 0) + 1)

  // ── Step 4: Firestore 투표 기록 ──
  await addDoc(collection(db, 'votes'), {
    userId,
    tournamentId,
    matchId,
    contestantId,            // ✅ (❌ winner_id)
    round: getCurrentRound(tournamentId),
    votedAt: serverTimestamp(),
    date: todayKST,
    ipHash: hashIp(request.rawRequest.ip ?? ''),
    deviceId: deviceId ?? null,
  })

  return { success: true }
  // → advanceRound() Firestore 트리거가 자동 실행 (votes 쓰기 감지)
})
```

---

## 이상 패턴 4종 탐지 (scheduleRankingCache — 매 1시간)

```ts
// functions/src/scheduleRankingCache.ts
// 특이점 4종 탐지 → generateAINews 트리거 (MVP 2)

const ANOMALY_RULES = {
  'T-1': (rankings: RankingCache['rankings']) => {
    const top = rankings[0]
    return parseFloat(top.rate) >= 60  // 1위 득표율 60% 이상
  },
  'T-2': (rankings: RankingCache['rankings']) => {
    if (rankings.length < 2) return false
    return parseFloat(rankings[0].rate) - parseFloat(rankings[1].rate) >= 30  // 격차 30%p
  },
  'T-3': () => {
    // 24시간 내 득표율 증가 200% 이상 (이전 캐시와 비교)
    // 구현: 이전 ranking_cache와 현재 비교
    return false // 구현 시 채우기
  },
  'T-4': () => {
    // 3위 이상 순위 역전 발생
    // 구현: 순위 변화 감지
    return false // 구현 시 채우기
  },
}
```

---

## IP 해시 유틸리티

```ts
// src/lib/utils/hash.ts
import { createHash } from 'crypto'

export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(ip + process.env.IP_HASH_SALT)
    .digest('hex')
    .slice(0, 16)    // 16자리 (역추적 방지)
}

// ✅ 실제 IP 저장 절대 금지
// ✅ device_hash: fingerprintjs MVP 2에서 추가
```

---

## onAbuseDetect Cloud Function

```ts
// functions/src/onAbuseDetect.ts
// 트리거: admin_alerts 컬렉션 새 문서 생성 시

exports.onAbuseDetect = onDocumentCreated('admin_alerts/{alertId}', async (event) => {
  const alert = event.data.data() as AdminAlert

  // 관리자 이메일 알림 (Firebase Email Extension 또는 SendGrid)
  await sendAdminEmail({
    subject: `[월크48] 어뷰징 감지 — ${alert.type}`,
    body: `Tournament: ${alert.tournamentId}\n${alert.detail}`,
  })
})
```

---

## 클라이언트 통합

```ts
// castVote 함수: 직접 DB 쓰기 금지 → onVote Cloud Function만 호출
const onVoteFn = httpsCallable(functions, 'onVote')
await onVoteFn({ tournamentId, matchId, contestantId, deviceId })
// ✅ 검증 + DB 쓰기 모두 서버사이드에서 처리
```
