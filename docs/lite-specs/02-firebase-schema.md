# Lite Spec — #2 Firebase 스키마 & Security Rules

## TypeScript 타입 정의

```ts
// tournaments
interface Tournament {
  id: string
  title: string
  category: 'WORLD_CUP' | 'KPOP'
  status: 'draft' | 'active' | 'completed'
  is_public: boolean
  created_by: string       // uid (해시)
  created_at: Timestamp
  total_votes?: number
  trend_score?: number
}

// candidates
interface Candidate {
  id: string
  tournament_id: string
  name: string
  image_url: string
  nationality: string
  position?: string        // 선수 포지션
  order: number            // 1~48
}

// votes
interface Vote {
  id: string
  tournament_id: string
  round: number            // 48 | 24 | 12 | 6 | 3 | 1
  match_id: string         // `${round}-${matchIndex}`
  winner_id: string        // candidate id
  device_hash: string      // 익명 식별자
  ip_hash: string          // 해시된 IP
  uid?: string             // 로그인 시만
  timestamp: Timestamp
}

// vote_stats (Realtime DB)
interface VoteStats {
  [candidateId: string]: {
    count: number
    trend_score: number
    updated_at: number     // unix ms
  }
}

// users
interface User {
  uid: string              // Firebase Auth uid
  region_code?: string     // 'KR' | 'US' 등
  created_at: Timestamp
  consent_version: string  // 동의한 약관 버전
}

// cookie_consents
interface CookieConsent {
  anonymous_id: string
  essential: true          // 항상 true
  functional: boolean
  analytics: boolean
  marketing: false         // MVP 3까지 항상 false
  timestamp: Timestamp
  ip_hash: string
}

// sanctions
interface Sanction {
  uid_hash: string
  type: 1 | 2 | 3 | 4 | 5  // 제재 단계
  reason: string
  expires_at?: Timestamp
  created_at: Timestamp
}
```

## Realtime Database 구조

```
/vote_stats
  /{tournamentId}
    /{candidateId}
      count: number
      trend_score: number
      updated_at: number

/active_matches
  /{tournamentId}
    current_round: number
    current_match_index: number
```

## Firestore Security Rules 핵심 패턴

```
// tournaments: 공개 읽기, 관리자만 쓰기
match /tournaments/{id} {
  allow read: if resource.data.is_public == true;
  allow write: if request.auth.uid == adminUid();
}

// votes: 인증 유저만 쓰기, 본인만 읽기
match /votes/{id} {
  allow read: if request.auth.uid == resource.data.uid;
  allow create: if request.auth != null;
}

// vote_stats: 공개 읽기, Functions만 쓰기
match /vote_stats/{id} {
  allow read: if true;
  allow write: if false; // Cloud Functions만
}

// cookie_consents: 익명 ID 기반 본인만
match /cookie_consents/{id} {
  allow read, write: if request.auth.uid == id
    || resource.data.anonymous_id == request.resource.data.anonymous_id;
}
```

## Firestore 인덱스 (firestore.indexes.json)

```json
[
  { "collection": "tournaments",
    "fields": [{"field": "is_public"}, {"field": "status"}, {"field": "trend_score", "order": "DESCENDING"}] },
  { "collection": "candidates",
    "fields": [{"field": "tournament_id"}, {"field": "order"}] },
  { "collection": "votes",
    "fields": [{"field": "tournament_id"}, {"field": "ip_hash"}, {"field": "timestamp", "order": "DESCENDING"}] }
]
```
