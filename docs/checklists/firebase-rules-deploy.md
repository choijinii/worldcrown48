# firebase-rules-deploy.md

> `VERIFICATION_DISCIPLINE.md` §3 — Firestore rules + indexes deploy checklist.
> Walked through once **per deploy** that changes rules or indexes.
> Last update: 2026-06-15 (D-1 The Locker Room — votes / auditLog / userPrefs rules + votes composite index).

---

## Scope of this run (D-1)

| Resource | Change |
|----------|--------|
| `firestore.rules` | + `match /votes/{voteId}` (owner-read, callable-write only) |
| `firestore.rules` | + `match /auditLog/{logId}` (read/write blocked at rules layer) |
| `firestore.rules` | + `match /userPrefs/{uid}` (owner read/write + schema) |
| `firestore.indexes.json` (신규) | + composite index `votes(userId, tournamentId, date)` |
| `firestore.indexes.json` (신규) | + composite index `votes(userId, sessionId)` |
| `firebase.json` | + `"indexes": "firestore.indexes.json"` |

---

## Pre-deploy

| 작업 | 검증 명령 | 합격 기준 |
|---|---|---|
| 룰 구문 컴파일 | `npx firebase deploy --only firestore:rules --dry-run` | "Compiled successfully" 또는 dry-run 시뮬레이션 통과. 컴파일 에러 0 |
| 인덱스 JSON 유효성 | `cat firestore.indexes.json \| jq .` | 파싱 통과 (jq 에러 없음) |
| firebase.json 포인터 | `cat firebase.json \| jq '.firestore.indexes'` | `"firestore.indexes.json"` 출력 |
| 활성 프로젝트 확인 | `cat .firebaserc` 또는 `npx firebase use` | 대상 프로젝트 ID 정확 |

## Deploy

| 작업 | 검증 명령 | 합격 기준 |
|---|---|---|
| 룰 배포 | `npx firebase deploy --only firestore:rules` | `✔  firestore: released rules ... to cloud.firestore` 출력 |
| 인덱스 배포 | `npx firebase deploy --only firestore:indexes` | `✔  firestore: deployed indexes ... successfully` 출력 |
| (또는 합쳐서) | `npx firebase deploy --only firestore` | 위 두 줄 모두 출력 |
| 콘솔 — 룰 갱신 시각 | Firebase Console → Firestore → Rules → "Last deployed" | 방금 시각 표시 |
| 콘솔 — 인덱스 빌드 상태 | Firebase Console → Firestore → Indexes | 두 신규 composite index 모두 표시. 상태가 "Building" → 몇 분 후 "Enabled" |

## 룰 동작 검증 (P3 · emulator 또는 콘솔)

### votes

| 시나리오 | 명령 | 합격 기준 |
|---|---|---|
| 본인 vote 읽기 | 로그인 후 콘솔에서 `firestore.collection('votes').where('userId','==',본인uid).get()` | 정상 결과 |
| 타인 vote 읽기 | `where('userId','==','다른uid').get()` | `permission-denied` |
| 클라이언트 vote 쓰기 | `firestore.collection('votes').add({...})` | `permission-denied` (callable만 허용) |

### auditLog

| 시나리오 | 명령 | 합격 기준 |
|---|---|---|
| 클라이언트 read | `firestore.collection('auditLog').get()` | `permission-denied` |
| 클라이언트 write | `firestore.collection('auditLog').add({...})` | `permission-denied` |
| 관리자 콘솔 read | Firebase Console → auditLog 직접 조회 | 정상 (관리자 화면은 IAM 기반, 룰 우회) |

### userPrefs

| 시나리오 | 명령 | 합격 기준 |
|---|---|---|
| 본인 prefs read/write | 로그인 후 `doc('userPrefs/본인uid').set({uid, lang:'ko', updatedAt:serverTimestamp()})` | 정상 |
| 스키마 외 필드 포함 | `set({uid, lang:'ko', updatedAt:serverTimestamp(), extra:'x'})` | `permission-denied` (hasOnly 위반) |
| 잘못된 lang 값 | `set({uid, lang:'fr', updatedAt:serverTimestamp()})` | `permission-denied` |
| 타인 prefs write | `doc('userPrefs/다른uid').set(...)` | `permission-denied` |

### 인덱스

| 시나리오 | 명령 | 합격 기준 |
|---|---|---|
| 1일 카운트 쿼리 (votes 3-key) | useVoteGate 동작 (5번 투표 후 6번째) | "오늘의 투표를 모두 사용했어요" 모달 표시. 콘솔 로그에 인덱스 누락 에러 없음 |
| 인덱스 빌드 완료 | Firebase Console → Indexes | 두 composite index 모두 "Enabled" |

## 위반 신호 (STOP)

- 룰 배포 출력 없이 콘솔에 갱신 미반영 → 1분 대기 후 재확인. 그래도 없으면 **P3 위반**
- 인덱스가 "Building" 상태에서 첫 쿼리 → "The query requires an index" 에러 발생 가능. **빌드 완료까지 대기**
- votes 쿼리 시 `failed-precondition: requires an index` → 인덱스 필드 순서 확인. Firebase Console의 "Create index" 링크 사용 시 indexes.json 동기화 잊지 말 것
- 타인 vote read 가 성공 → **권한 누출** · 즉시 룰 롤백 + diff 재검토

---

*© 2026 WorldCrown48 · D-1 rules + indexes deploy checklist · 2026-06-15 신규*
