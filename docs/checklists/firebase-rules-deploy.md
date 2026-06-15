# firebase-rules-deploy.md

> `VERIFICATION_DISCIPLINE.md` §3 — Firestore rules + indexes deploy checklist.
> Walked through once **per deploy** that changes rules or indexes.
> Last update: 2026-06-15 (D-1 The Locker Room — votes / auditLog / userPrefs rules + votes composite index — 첫 배포 완료).

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

| 작업 | 검증 명령 | 합격 기준 | 결과 (2026-06-15) |
|---|---|---|---|
| 룰 구문 컴파일 | `npx firebase deploy --only firestore:rules --dry-run` | "Compiled successfully" 또는 dry-run 시뮬레이션 통과. 컴파일 에러 0 | ✅ deploy 단계의 사전 컴파일에서 `cloud.firestore: rules file firestore.rules compiled successfully` 확인 (별도 dry-run 호출 없이 본 deploy의 사전 단계로 검증) |
| 인덱스 JSON 유효성 | `cat firestore.indexes.json \| jq .` | 파싱 통과 (jq 에러 없음) | ✅ `node -e require('./firestore.indexes.json')` 으로 검증 (jq 미설치 환경 대체) — `indexes: 2, fieldOverrides: 0` |
| firebase.json 포인터 | `cat firebase.json \| jq '.firestore.indexes'` | `"firestore.indexes.json"` 출력 | ✅ `firestore.indexes → firestore.indexes.json` 확인 |
| 활성 프로젝트 확인 | `cat .firebaserc` 또는 `npx firebase use` | 대상 프로젝트 ID 정확 | ✅ `worldcrown48` (default) |

## Deploy

| 작업 | 검증 명령 | 합격 기준 | 결과 (2026-06-15) |
|---|---|---|---|
| 룰 배포 | `npx firebase deploy --only firestore:rules` | `✔  firestore: released rules ... to cloud.firestore` 출력 | ✅ `✔ firestore: released rules firestore.rules to cloud.firestore` (합쳐서 `firestore` 타깃으로 실행) |
| 인덱스 배포 | `npx firebase deploy --only firestore:indexes` | `✔  firestore: deployed indexes ... successfully` 출력 | ✅ `✔ firestore: deployed indexes in firestore.indexes.json successfully for (default) database` |
| (또는 합쳐서) | `npx firebase deploy --only firestore` | 위 두 줄 모두 출력 | ✅ 본 배포는 이 형태로 1회 실행 — 룰 + 인덱스 동시 배포, `✔ Deploy complete!` 종료 |
| 콘솔 — 룰 갱신 시각 | Firebase Console → Firestore → Rules → "Last deployed" | 방금 시각 표시 | ⏳ 대표 콘솔 확인 (deploy CLI 출력으로는 갱신 사실 확인 — 시각 표시는 콘솔 새로고침 1회 필요) |
| 콘솔 — 인덱스 빌드 상태 | Firebase Console → Firestore → Indexes | 두 신규 composite index 모두 표시. 상태가 "Building" → 몇 분 후 "Enabled" | ⏳ 대표 콘솔 확인. CLI `npx firebase firestore:indexes` 출력으로 두 인덱스 정의 등록 확인됨 (state 값은 콘솔에서만) |

### 배포 출력 (2026-06-15)

```
i  cloud.firestore: checking firestore.rules for compilation errors...
✔  cloud.firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
i  firestore: deploying indexes...
✔  firestore: deployed indexes in firestore.indexes.json successfully for (default) database
✔  firestore: released rules firestore.rules to cloud.firestore

✔  Deploy complete!
```

### `firebase firestore:indexes` 등록 인덱스 (2026-06-15)

```
1. votes(userId ASC, sessionId ASC, __name__ ASC) — density: SPARSE_ALL
2. votes(userId ASC, tournamentId ASC, date ASC, __name__ ASC) — density: SPARSE_ALL
```

(`__name__`은 Firestore가 자동 부여하는 doc ID 정렬 키 — 정상)

## 룰 동작 검증 (P3 · emulator 또는 콘솔)

> **대표님 Vercel Preview e2e 단계에서 누적 검증.** 라이브 URL에서 실제 호출 결과로 채워 PR 코멘트에 누적.

### votes

| 시나리오 | 명령 | 합격 기준 | 결과 (2026-06-15) |
|---|---|---|---|
| 본인 vote 읽기 | 로그인 후 콘솔에서 `firestore.collection('votes').where('userId','==',본인uid).get()` | 정상 결과 | ⏳ Vercel Preview e2e (시나리오 3 — 첫 vote 후 votes 쿼리) |
| 타인 vote 읽기 | `where('userId','==','다른uid').get()` | `permission-denied` | ⏳ Vercel Preview e2e (선택 검증) |
| 클라이언트 vote 쓰기 | `firestore.collection('votes').add({...})` | `permission-denied` (callable만 허용) | ⏳ Vercel Preview e2e (선택 검증) |

### auditLog

| 시나리오 | 명령 | 합격 기준 | 결과 (2026-06-15) |
|---|---|---|---|
| 클라이언트 read | `firestore.collection('auditLog').get()` | `permission-denied` | ⏳ Vercel Preview e2e (선택 검증) |
| 클라이언트 write | `firestore.collection('auditLog').add({...})` | `permission-denied` | ⏳ Vercel Preview e2e (선택 검증) |
| 관리자 콘솔 read | Firebase Console → auditLog 직접 조회 | 정상 (관리자 화면은 IAM 기반, 룰 우회) | ⏳ Vercel Preview e2e 시나리오 7 — 삭제 후 auditLog 1건 표시 |

### userPrefs

| 시나리오 | 명령 | 합격 기준 | 결과 (2026-06-15) |
|---|---|---|---|
| 본인 prefs read/write | 로그인 후 `doc('userPrefs/본인uid').set({uid, lang:'ko', updatedAt:serverTimestamp()})` | 정상 | ⏳ D-1 MVP는 userPrefs write 호출하지 않음 — 정책은 deploy됨, 실 사용은 후속 |
| 스키마 외 필드 포함 | `set({uid, lang:'ko', updatedAt:serverTimestamp(), extra:'x'})` | `permission-denied` (hasOnly 위반) | ⏳ (위와 동일) |
| 잘못된 lang 값 | `set({uid, lang:'fr', updatedAt:serverTimestamp()})` | `permission-denied` | ⏳ (위와 동일) |
| 타인 prefs write | `doc('userPrefs/다른uid').set(...)` | `permission-denied` | ⏳ (위와 동일) |

### 인덱스

| 시나리오 | 명령 | 합격 기준 | 결과 (2026-06-15) |
|---|---|---|---|
| 1일 카운트 쿼리 (votes 3-key) | useVoteGate 동작 (5번 투표 후 6번째) | "오늘의 투표를 모두 사용했어요" 모달 표시. 콘솔 로그에 인덱스 누락 에러 없음 | ⏳ Vercel Preview e2e (C-1 vote engine 미구현 — D-1 단독으로는 5회 한도 트리거 불가. linkSessionVote 호출 시 userId,sessionId 인덱스만 1회 사용됨) |
| 인덱스 빌드 완료 | Firebase Console → Indexes | 두 composite index 모두 "Enabled" | ⏳ 대표 콘솔 확인 (빌드 보통 1~5분 소요) |

## 위반 신호 (STOP)

- 룰 배포 출력 없이 콘솔에 갱신 미반영 → 1분 대기 후 재확인. 그래도 없으면 **P3 위반**
- 인덱스가 "Building" 상태에서 첫 쿼리 → "The query requires an index" 에러 발생 가능. **빌드 완료까지 대기**
- votes 쿼리 시 `failed-precondition: requires an index` → 인덱스 필드 순서 확인. Firebase Console의 "Create index" 링크 사용 시 indexes.json 동기화 잊지 말 것
- 타인 vote read 가 성공 → **권한 누출** · 즉시 룰 롤백 + diff 재검토

---

## Follow-up 사안 (2026-06-15 deploy 후 발견)

본 배포는 통과했으나, 다음 1건은 별도 작업으로 처리:

1. **인덱스 빌드 완료 확인 타이밍** — `firebase firestore:indexes` CLI는 빌드 상태(Building/Enabled)를 노출하지 않음. Vercel Preview e2e 진입 전 콘솔에서 "Enabled" 확인 필요. 빌드 미완료 상태에서 첫 votes 쿼리는 `requires an index` 에러 — Firestore가 새 인덱스 생성 링크를 안내하지만, **이미 정의된 인덱스가 빌드 중일 뿐**이므로 새 인덱스 만들지 말고 대기.

---

*© 2026 WorldCrown48 · D-1 rules + indexes deploy checklist · 2026-06-15 신규 · 2026-06-15 첫 배포 결과 반영*
