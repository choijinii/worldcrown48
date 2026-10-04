# Claude Code 작업 지시 — 세션 재개 + NODE-1 (Cloud Functions Node.js 20 → 22 전환)
작성: 티오(Cowork) · 2026-09-26 (토) 22:10 KST · 대표 승인 후 전달

## 0. 왜 이 문서가 있나 (배경)
- 2026-09-26, 대표가 "ARENA-1 PR 3 — 차트·Crown Score" Claude Code 창을 실수로 닫았다. **잃은 것은 없다.**
  - PR #107은 09-25 01:14 KST에 squash 머지됨 → main = `d2e6685` (origin/main과 같음, 티오가 읽기 전용으로 확인).
  - main에서 `firebase deploy --only firestore:rules` · `firebase deploy --only functions:scheduleRankingCache` 둘 다 Deploy complete (09-25).
- 닫히기 전에 남아 있던 일: ① C-3 규칙 테스트 4개(머지 전 '판정 보류'로 둔 것)를 main에서 다시 돌려 초록 확인 ② 눈검사용 테스트 대회 시드 방법 보고 ③ 배포 때 나온 경고(Node.js 20 폐기) 처리.
- 대표 지시(09-26): **Node.js 20 문제는 미루다 잊을 수 있으니 지금 바로 처리한다.**

## 1. 확정 사실 (근거 확인 완료 — 다시 묻지 말 것)
- Google 공식 표(docs.cloud.google.com/run/docs/runtime-support): `nodejs20` 지원 중단(deprecation) 2026-04-30, **폐기(decommission) 2026-10-30** — 이 날 이후에는 함수를 새로 만들거나 **고쳐서 다시 배포할 수 없다**. `nodejs22` 폐기 2027-10-31.
- 저장소의 기존 계획(outputs/SESSION-HANDOFF_2026-08-28 §86, docs/checklists/firebase-functions-deploy.md)이 이미 "engines를 `"22"`로 + firebase-functions 최신화"로 정해 두었다. **목표 버전 = Node 22.** (24로 가지 않는다 — 런칭 10/08 직전이라 변경 폭을 최소화. 24는 런칭 후 여유 있을 때 별도 검토.)
- 현재: `functions/package.json` engines.node = `"20"`, firebase-functions `^6.0.1`(설치본 6.6.0), firebase-admin `^12.7.0`. firebase.json에는 runtime 지정 없음(engines가 결정).
- npm 최신(09-26 확인): firebase-functions **7.4.0** (peer: firebase-admin ^11~^14 허용 → admin 12 그대로 사용 가능). firebase-functions 7.0 파괴적 변경 = `functions.config()` 삭제 · Node 16 지원 종료 · TS5/ES2022 · v1 Event→LegacyEvent 이름 변경. 티오가 grep한 결과 `functions/src`에 `functions.config()`·`firebase-functions/v1` 사용 없음 → **직접 다시 확인할 것.**
- main은 보호 브랜치 — 직접 push 금지. 브랜치 → PR → 대표 머지. 배포는 main에서만(predeploy-guard).

## 2. Phase 0 — 상태 점검 후 STOP (코드 변경 금지)
1. `git fetch` 후 main == origin/main == `d2e6685` 인지. 아니면 즉시 STOP·보고.
2. 작업 트리 상태 보고(대표가 만든 추적 안 되는 폴더 `Claude outputs/` 등은 **건드리지 말 것**).
3. `.git/index.lock` 있으면 보고만(지우지 말 것). `.git/index.lock.stale-cowork-0923`은 티오가 남긴 빈 파일, 무시.
4. 아래 Phase 1~3 계획을 5줄 이내로 보고하고 **대표 "진행" 답을 기다린다.**

## 3. Phase 1 — C-3 재실행 (main에서, 코드 변경 없음)
- `npm run test:rules` (또는 ranking-rules만) 실행 → 머지 전 '판정 보류'였던 4개 포함 전부 결과 표로 보고.
- 초록이면 "C-3 확정 초록"으로 기록. 빨강이면 **고치지 말고** STOP·원인 보고(빨간불을 "가짜"라 부르지 말 것 — "판정 불능/실패"로 부를 것).

## 4. Phase 2 — NODE-1 PR (브랜치 `chore/node22-runtime`)
범위(이것만):
1. `functions/package.json` engines.node `"20"` → `"22"`.
2. firebase-functions `^6.0.1` → `^7.4.0`. firebase-admin은 **그대로(^12)**. 다른 의존성 올리지 말 것.
3. `functions/package-lock.json` 갱신(`npm install` in functions/).
4. `.github/workflows/functions-build.yml`의 node-version `'20'` → `'22'` (함수 빌드 CI를 실제 런타임과 맞춤). **다른 E2E 워크플로우 12개의 node-version은 이번에 건드리지 않는다** — 발견 사항으로만 보고.
5. `docs/checklists/firebase-functions-deploy.md` 23행 검증 명령을 `grep '"node"' functions/package.json`(→ `"22"`)로 정정 + 경고 follow-up 항목 해소 표시.
6. 7.x 파괴적 변경에 걸리는 코드가 있으면 **고치기 전에 STOP·보고**(범위 확장 여부는 대표 결정).

검증(PR 올리기 전 전부):
- `cd functions && npm run build` 경고·오류 0
- `cd functions && npm test` 전부 초록
- PR의 CI 전부 초록(빨강이면 판정 보류 처리·원인 보고)
- 화면 문구 변경 없음(있으면 안 됨).

PR 본문: 왜(10-30 폐기일·근거 URL), 무엇을 바꿨나, 바꾸지 않은 것(firebase-admin·E2E 워크플로우), 배포 방법.

## 5. Phase 3 — 머지 후 배포 안내 (대표가 실행)
대표가 머지하면 대표에게 **한 줄씩 따로 상자에** 안내:
1. `git checkout main` → `git pull` (main 최신화 — predeploy-guard 통과 조건)
2. `firebase deploy --only functions --project worldcrown48` — **전체 함수 재배포**(런타임이 바뀌므로 모든 함수가 다시 올라감). 몇 분 걸림.
   - 만약 "소스에 없는 함수를 삭제할까요?(y/N)" 질문이 나오면 **N** 으로 답하고 함수 이름을 보고받을 것.
3. `firebase functions:list --project worldcrown48` → 모든 함수의 Runtime 칸이 `nodejs22`인지 확인. 결과 표로 정리.
- 배포 후 경고에 "Node.js 20" 문구가 사라졌는지 확인.

## 6. Phase 4 — 눈검사 준비 보고 (실행하지 말고 방법만)
- `scripts/seed-chart-preview.mjs`로 테스트 대회를 만들 때 **서비스 계정 키 없이** 할 방법(예: `gcloud auth application-default login` 등)이 있는지, 없으면 키를 안전하게 쓰는 절차(키 내용을 채팅에 붙이지 않기, `pbpaste` 사용, 끝나면 파일 삭제)를 보고.
- 눈검사 항목: 시드 대회 차트(Crown Score 정수·? 설명창, ko/en/es) + 실제 대회의 "10판 미만 대기 문구" 3언어. 끝나면 `--clean`.
- 사전 점검(Claude Code가 먼저 같은 경로를 걸어 보고 결과 표)을 마친 뒤에만 대표 눈검사 요청.

## 7. 보고 방식
- 각 Phase 끝마다 결과를 `outputs/NODE-1_보고_2026-09-26.md`에 **누적 기록**하고 채팅에는 요약 + "파일에 전체 기록" 한 줄. (대표가 티오에게 파일을 그대로 전달한다.)
- 용어는 처음 쓸 때 한 줄로 풀이. 대표에게 줄 터미널 명령은 한 줄씩 따로 상자.

## 8. Auto-STOP (아래면 즉시 멈추고 보고)
- main 해시 불일치 · 7.x 파괴적 변경 코드 발견 · 테스트/CI 빨강 · 배포 오류 · 함수 삭제 질문 · 범위 밖 파일 변경 필요.

## 9. 완료 기준 (DoD)
- [ ] C-3 main 재실행 초록(또는 실패 원인 보고)
- [ ] NODE-1 PR 머지, CI 전부 초록
- [ ] main에서 전체 함수 배포 완료, `functions:list` 전부 nodejs22
- [ ] 체크리스트 문서 정정
- [ ] 눈검사 시드 방법 보고
- [ ] `outputs/NODE-1_보고_2026-09-26.md` 완성
