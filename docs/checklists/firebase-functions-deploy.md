# firebase-functions-deploy.md

> `VERIFICATION_DISCIPLINE.md` §3 — Cloud Functions deploy checklist.
> Walked through once **per deploy** that adds or modifies any function.
> Last update: 2026-06-15 (D-1 The Locker Room — onUserDelete + linkSessionVote).

---

## Scope of this run (D-1)

| Function | Region | Auth | Side effects |
|----------|--------|------|--------------|
| `hashIp` (existing) | asia-northeast3 | none | per-instance rate-limit only |
| `onUserDelete` (new) | asia-northeast3 | required (caller uid) | Firestore deletes · auditLog write · Auth `deleteUser` |
| `linkSessionVote` (new) | asia-northeast3 | required (caller uid) | Firestore vote updates · Auth `deleteUser` of the anon uid |

---

## Pre-deploy

| 작업 | 검증 명령 | 합격 기준 |
|---|---|---|
| Node 20 활성 (functions engines) | `cd functions && node -v` | `v20.*` 출력 |
| TypeScript 컴파일 클린 | `cd functions && npx tsc --noEmit` | 출력 없음(에러 0) |
| firebase-admin 설치 확인 | `grep firebase-admin functions/package.json` | `"firebase-admin": "^12.*"` 표시 |
| firebase CLI 로그인 | `npx firebase login:list` | 대표 계정 email 표시 |
| 활성 프로젝트 확인 | `npx firebase projects:list` 또는 `cat .firebaserc` | 대상 프로젝트 ID 정확 |
| Blaze 플랜 확인 | Firebase Console → Usage and Billing | "Blaze (Pay as you go)" 표시 |

## Deploy

| 작업 | 검증 명령 | 합격 기준 |
|---|---|---|
| 함수 배포 | `cd functions && npm run deploy` (혹은 `npx firebase deploy --only functions:onUserDelete,functions:linkSessionVote`) | `✔ Deploy complete!` 라인 출력 |
| 빌드 로그 무경고 | 위 출력 상단 | TypeScript warning 0 · Build error 0 |
| 신규 함수 콘솔 등록 | Firebase Console → Functions | `onUserDelete`, `linkSessionVote` 둘 다 활성 + region `asia-northeast3` 표시 |

## IAM (P4·§9-9 함정)

| 작업 | 검증 명령 | 합격 기준 |
|---|---|---|
| Functions 서비스 계정 `roles/firebaseauth.admin` 권한 | Google Cloud Console → IAM → 서비스 계정 검색 (`PROJECT_NUMBER-compute@developer.gserviceaccount.com` 또는 `firebase-functions-runtime@...`) | "Firebase Authentication Admin" role 부여됨 |
| (권한 누락 시) 부여 | IAM 화면에서 "역할 추가" → "Firebase Authentication Admin" | 부여 후 콘솔 새로고침 시 표시 |

## Runtime 검증 (P3)

| 작업 | 검증 명령 | 합격 기준 |
|---|---|---|
| onUserDelete 호출 (테스트 계정) | 브라우저 콘솔에서 `await firebase.functions().httpsCallable('onUserDelete')()` 또는 /account 페이지 "DELETE" 입력 | `{ ok: true, deletedVotes: <n> }` 응답, HTTP 200 |
| Firestore — users/{uid} 삭제 확인 | Firebase Console → Firestore → users/{uid} 조회 | "문서가 존재하지 않습니다" |
| Firestore — votes (userId==uid) 0건 | Console → Firestore → votes 컬렉션 쿼리 (`userId == uid`) | 결과 0건 |
| Firestore — cookieConsents/{uid}, userPrefs/{uid} 삭제 | Console에서 각 경로 조회 | 둘 다 "존재하지 않음" |
| Firestore — auditLog 신규 1건 | Console → auditLog → timestamp DESC 최상단 | `{ action: "GDPR_DELETE", uidHash: <64자 hex>, timestamp: <방금> }` |
| auditLog 에 uid 평문 미저장 | 위 문서 본문 | `uid` 필드 자체 없음, `uidHash`만 존재 |
| Auth 계정 삭제 확인 | Firebase Console → Authentication → Users | 해당 uid 사라짐 (캐시 새로고침 1회 필요) |
| linkSessionVote 호출 (anon→Google e2e) | 시나리오: 익명 1회 투표 → Google 로그인 → 즉시 콘솔 votes 쿼리 | 그 vote의 `userId` 가 Google uid 로 업데이트됨, anon uid 사라짐 |
| Functions 로그 200 | `cd functions && npm run logs` 또는 Cloud Logging "lastResponseCode=200" 필터 | 두 함수 각각 호출 직후 200 entry |

## 위반 신호 (STOP)

- `Deploy complete!` 출력 + Console에 함수 표시 안 됨 → 캐시 1분 대기 후 재확인. 그래도 없으면 **P3 위반** — "배포 성공" 단정 금지
- 함수 호출 시 `permission-denied` → IAM 권한 누락 (위 §IAM 다시)
- 호출 200 + Firestore 영향 없음 → 코드 로직 회귀 의심. 즉시 코드 diff 확인
- auditLog 에 uid 원문 저장 발견 → **GDPR Art. 17 위반** · 즉시 함수 롤백 + 사고 보고

---

*© 2026 WorldCrown48 · D-1 deploy checklist · 2026-06-15 신규*
