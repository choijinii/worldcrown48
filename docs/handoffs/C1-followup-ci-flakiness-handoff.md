# Handoff Brief — C-1 후속 ① CI Firestore Flakiness 안정화

> **From**: Cowork (기획·진단 검증) · **To**: Claude Code (실코드)
> **Date**: 2026-06-23 · **Author**: 대표 · **Version**: v1.0
> **작업 브랜치**: `feat/c1-fix-ci-flakiness` (main 최신에서 분기)
> **목표 산출물**: `lib/firebase.ts` 수정 + CI 그린 증명 (E2E 6/6 PASS + Console 에러 0건)
> **우선순위**: 중간 — C-2 이전에 반드시 머지 (다음 모든 모듈의 CI 신뢰도 회복용)

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

```bash
git fetch origin && git checkout main && git pull
git log --oneline -3
# 기대: 최상단 = f8aeee8 (C-1 머지 commit)

git checkout -b feat/c1-fix-ci-flakiness
git branch --show-current
# 기대: feat/c1-fix-ci-flakiness

test -f lib/firebase.ts && echo "✓ firebase.ts" || echo "✗"
test -f e2e/c1-anon-gate.spec.ts && echo "✓ anon-gate spec" || echo "✗"
test -f .github/workflows/c1-e2e.yml && echo "✓ c1 workflow" || echo "✗"

# Firebase SDK 버전 확인 (수정 방향에 영향)
grep '"firebase"' package.json
```

✅ 모두 통과해야 §1로 진행.

---

## §1. Pre-flight Checklist

```
☐ CLAUDE.md 읽음
☐ docs/principles/VERIFICATION_DISCIPLINE.md P1~P4 읽음 (인프라 작업 의무)
☐ 메모리 검토: project-c1-followups-2026-06-23 + feedback-evidence-before-diagnosis
☐ lib/firebase.ts 현재 구현 (line 60~90 — try-catch + experimentalForceLongPolling) 정독
☐ e2e/c1-anon-gate.spec.ts 실패 시나리오 정독
☐ 실패한 CI 로그 직접 확인 (GitHub Actions → 최근 c1-e2e 워크플로우)
```

---

## §2. Goal — 한 줄

> **GitHub Actions에서 `c1-e2e` 워크플로우가 6/6 시나리오 PASS + Console 에러 0건으로 일관 그린이 된다.**

---

## §3. 증상 (Cowork이 메모리에서 확인한 사실)

```
E2E 2개 일관 실패:
  ① anon-gate 6번째 daily-limit modal 미표시
  ② FINAL championId 30s timeout

콘솔 에러 (3번 일관 재현 — timing race 아님 확정):
  • WebChannelConnection RPC 'Listen' stream transport errored
  • Could not reach Cloud Firestore backend [code=unavailable]

확정 사실:
  • committedVotes=5 — voting 로직 자체는 작동
  • 환경 이슈 (CI 헤드리스 Chromium에서 WebChannel transport 불안정)
  • initializeFirestore({experimentalForceLongPolling: true}) 이미 lib/firebase.ts:76에 적용됨
    → 그런데도 에러 발생 = 가설 재검증 필요
```

---

## §4. 진단 단계 (evidence-based — 결론 미리 내지 말 것)

### Phase 1 — CI 로그에서 증거 확보 (최우선)

```bash
# GitHub Actions 가장 최근 실패한 c1-e2e 워크플로우 열기
# Playwright HTML report artifact 다운로드
# 두 가지 확인:
#   1. WebChannel 에러가 발생한 정확한 시점 (snapshot listener vs query)
#   2. initializeFirestore가 실제 호출됐는지 (try-catch가 catch로 빠졌는지)
```

### Phase 2 — 의심 영역 검증 (가설 ≠ 결론)

| 가설 | 검증 방법 |
|---|---|
| H1: try-catch가 silent failure | lib/firebase.ts line 76 try 블록에 임시 `console.warn('[FB] init path')` + line 84 catch 블록에 `console.warn('[FB] fallback path')` 넣고 CI 재실행 → 어느 path가 호출됐는지 확인 |
| H2: experimentalForceLongPolling 부족 | Firebase JS SDK 버전 확인 후 `experimentalLongPollingOptions: { timeoutSeconds: 30 }` 추가 시도 |
| H3: Firestore init 호출 순서 | `getDb()` 첫 호출 시점이 onSnapshot 등록 직전인지 확인 — 그렇다면 init이 다른 트랜잭션 중에 race |
| H4: 헤드리스 Chromium의 HTTP/2 streaming 한계 | Playwright config에 `--disable-http2` 같은 launch flag 적용 시도 |

⚠️ **위 4개는 가설일 뿐.** Claude Code가 CI 로그 증거를 본 후 실제 원인을 확정하고 수정 방향을 결정.
⚠️ **메모리 [[feedback-evidence-before-diagnosis]] 준수**: 증거 없이 H1~H4 중 하나를 단정해서 수정 PR 내지 말 것.

### Phase 3 — 수정 + 검증

```
1. 진단 확정 후 lib/firebase.ts 수정 (최소 diff)
2. 로컬에서 npm run test:e2e 6/6 PASS 확인
3. PR 생성 → CI 자동 실행
4. CI 그린 확인 (최소 3회 재실행 — flakiness 검증)
5. 3회 모두 그린이면 머지 가능
```

---

## §5. Files to CREATE / MODIFY

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/firebase.ts` | **EDIT** | getDb() 초기화 로직 (line 60~90) 수정 |
| `e2e/c1-anon-gate.spec.ts` | **EDIT (선택)** | 진단 결과에 따라 retry/wait 로직 보강 가능 |
| `playwright.config.ts` | **EDIT (선택)** | launch flag 조정 필요 시 |
| `docs/adr/0002-firestore-ci-transport.md` | **NEW** | 진단 결과 + 수정 근거 + 향후 가이드 (모든 후속 모듈의 참조 문서) |

---

## §6. Hard Constraints

### DO
- ✅ CI 로그 증거 확인 후 수정 — 가설로 코드부터 바꾸지 말 것
- ✅ 최소 diff (대규모 리팩터링 금지)
- ✅ 수정 후 CI 3회 연속 그린 확인
- ✅ ADR 작성으로 향후 모듈이 같은 함정에 안 빠지게 가이드

### DON'T
- ❌ Firebase Emulator 기반 E2E로 전환 (큰 작업 — 별도 ADR 필요, 이번 PR 범위 아님)
- ❌ test.skip으로 실패 시나리오 우회
- ❌ 메모리 가설을 그대로 따르기 (이미 부분적으로 틀린 것 확인됨)
- ❌ lib/firebase.ts 외 다른 모듈에 영향 가는 변경

---

## §7. Acceptance Criteria

```
☐ CI 로그에서 실패 원인 명확히 식별됨 (PR 본문에 인용)
☐ lib/firebase.ts diff가 최소 (~10줄 이내)
☐ 로컬 npm run test:e2e — 6/6 PASS
☐ GitHub Actions c1-e2e — 3회 연속 그린 (flakiness 제거 증명)
☐ Console 에러 0건 자동 검증 통과
☐ ADR 0002 작성됨 (진단·수정·근거)
☐ B-1 워크플로우 (이번 PR이 e2e/* 또는 playwright.config.ts 건드릴 경우 자동 트리거) — admin E2E도 그린
```

---

## §8. 알려진 함정

1. **e2e/* 또는 playwright.config.ts 건드리면 B-1 워크플로우 동시 트리거** — 2026-06-23 등록된 B1_PREVIEW_URL/UID/EMAIL 시크릿 덕에 진짜 admin E2E가 실행됨. B-1 admin E2E도 같이 그린이 나와야 머지 가능.
2. **CI Ubuntu의 Firebase SDK 버전과 로컬 Mac의 버전이 다를 수 있음** — package-lock.json 기준으로 통일 확인.
3. **try-catch silent failure 패턴 자체가 안티패턴** — 진단을 어렵게 만든 1차 원인. catch 안에서 console.warn 최소한 남기는 것 권장.

---

## §9. 핸드오프 종료 조건

```
☐ §7 Acceptance 전 항목 통과
☐ CI 3회 연속 그린 (스크린샷/링크 PR 본문 첨부)
☐ ADR 0002 작성 + PR에 포함
☐ 대표 승인 → squash 머지 → main 자동 배포 확인
```

---

## §10. 후속 작업 (이 PR 이후)

- 이 PR 머지 → C-2 Crown Card 핸드오프 작성 시작 (Cowork)
- ADR 0002의 가이드를 C-2 핸드오프 §9에 인용

---

## §11. Superpowers 워크플로우 지시 — Claude Code 필독

### 11.1 적용 단계

```
Phase 1 — Brainstorming
  /brainstorm 으로 §3 증상 + §4 H1~H4 가설 입력
  → CI 로그를 봐야 어느 가설이 맞는지 알 수 있음을 인지

Phase 2 — Evidence Gathering (수정 코드 작성 전)
  GitHub Actions에서 가장 최근 실패한 c1-e2e 워크플로우 로그 + Playwright HTML report 다운로드
  → 어느 가설이 증거와 맞는지 확정

Phase 3 — TDD RED-GREEN-REFACTOR
  진단 확정 → 수정 → 로컬 E2E 6/6 PASS

Phase 4 — Code Review
  /review 로 자체 점검 (§6 Hard Constraints 위반 0건)

Phase 5 — PR 제출
  PR 본문에 CI 로그 증거 인용 + ADR 0002 링크 + §7 체크리스트
```

### 11.2 TDD 대상 매핑

| 테스트 파일 | 테스트 대상 | §7 기준 |
|---|---|---|
| `e2e/c1-anon-gate.spec.ts` | 6번째 daily-limit modal 표시 | AC #3, #4 |
| `e2e/c1-final-champion.spec.ts` (또는 동등 spec) | FINAL championId 30s 내 표시 | AC #3, #4 |

### 11.3 TDD 면제

이 PR은 **버그 수정 + ADR** 성격이라 신규 로직 추가 없음. 기존 E2E 시나리오를 그대로 사용해 수정 검증.

### 11.4 3계층 테스트 — 이번 PR 적용 범위

| 계층 | 적용 여부 | 사유 |
|---|---|---|
| Unit | ❌ 불필요 | firebase.ts 초기화 함수는 환경 의존적, 유닛 테스트로 검증 불가 |
| Integration | ❌ 불필요 | Firestore Rules 변경 없음 |
| **E2E** | ✅ 필수 | 이 버그는 헤드리스 Chromium + WebChannel transport 한정 — E2E만이 진실 |

### 11.5 CI 그린 증명 의무

```
PR 본문에 다음 3가지 포함:
  ① 수정 전 실패 CI 링크 (증거)
  ② 수정 후 3회 연속 그린 CI 링크 (검증)
  ③ Playwright HTML report 첨부 (Console 에러 0건 자동 검증 결과)
```

---

## §12. 진실 공급원

```
1. lib/firebase.ts (feat/c1-vote-engine — main 머지됨)
2. e2e/c1-anon-gate.spec.ts (failing scenario)
3. .github/workflows/c1-e2e.yml (CI 설정)
4. 메모리: project-c1-followups-2026-06-23 (증상 기록)
5. 메모리: feedback-evidence-before-diagnosis (방법론)
```

---

*© 2026 WorldCrown48 | C-1 후속 ① CI Flakiness Handoff v1.0 | CONFIDENTIAL*
