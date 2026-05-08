# Lite Spec — #12 부정투표 방지 — Cloud Functions IP 검증

## 검증 Cloud Function

```js
// functions/src/validateVote.js
exports.validateVote = onCall(async ({ tournament_id, match_id }, context) => {
  const ipHash = hashIp(context.rawRequest.ip)
  const uid = context.auth?.uid || null

  // 1. IP 기반 중복 투표 확인 (1시간 내)
  const oneHourAgo = Timestamp.fromMillis(Date.now() - 3600000)
  const recentVotes = await getDocs(query(
    collection(db, 'votes'),
    where('tournament_id', '==', tournament_id),
    where('ip_hash', '==', ipHash),
    where('timestamp', '>', oneHourAgo)
  ))

  if (!recentVotes.empty) {
    throw new HttpsError('already-exists', '이미 투표했습니다. 1시간 후 다시 시도해주세요.')
  }

  // 2. uid 기반 중복 확인 (로그인 유저)
  if (uid) {
    const uidVotes = await getDocs(query(
      collection(db, 'votes'),
      where('tournament_id', '==', tournament_id),
      where('uid', '==', uid)
    ))
    if (!uidVotes.empty) {
      throw new HttpsError('already-exists', '이미 참여한 토너먼트입니다.')
    }
  }

  return { allowed: true }
})
```

## 이상 패턴 감지 (Cron — 5분 간격)

```js
// functions/src/detectFraud.js
exports.detectFraud = onSchedule('every 5 minutes', async () => {
  const fiveMinAgo = Timestamp.fromMillis(Date.now() - 300000)

  // IP당 5분 내 5회 이상 투표 감지
  const suspiciousIps = await aggregateVotesByIp(fiveMinAgo)

  for (const { ip_hash, count } of suspiciousIps) {
    if (count >= 5) {
      await flagSuspiciousIp(ip_hash)
      await sendAdminAlert({
        type: 'suspicious_ip',
        ip_hash,
        vote_count: count,
        window: '5min',
      })
    }
  }
})
```

## IP 해시 유틸리티

```js
// 실제 IP 저장 금지 — SHA-256 해시만 저장
import { createHash } from 'crypto'

function hashIp(ip) {
  return createHash('sha256')
    .update(ip + process.env.IP_HASH_SALT)
    .digest('hex')
    .slice(0, 16)    // 16자리만 (역추적 방지)
}
```

## 클라이언트 통합

```js
// castVote 함수 내 — Firestore 직접 쓰기 전에 Cloud Function 검증 먼저
const validate = httpsCallable(functions, 'validateVote')
const { data } = await validate({ tournament_id, match_id })
if (!data.allowed) throw new Error('투표 불가')
// 검증 통과 후 Realtime DB 트랜잭션 실행
```

## 저장 원칙

- 실제 IP 주소: 절대 저장 금지
- `ip_hash`: SHA-256 + salt, 16자리만 저장
- `device_hash`: navigator.userAgent + screen 해상도 해시
