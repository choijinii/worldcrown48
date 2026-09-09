# 티오 다음 세션 지시서 — RUN-1 PR 2 진행 (2026-09-07 저녁 작성)

> 09-07 세션에서 **① v2.1 문서 전파 완료 · ② 문구 승인 완료 · ③ PR 2 프롬프트 발행**까지 끝났다.
> 다음 세션의 일 = **대표가 Claude Code로 PR 2를 돌리는 동안 티오가 병행 검증하고, 머지 후 §7 눈검사를 함께 완주**하는 것.

## 0. 시작 리추얼
1. 메모리: `user-communication-profile.md` → `no-pyo-word-at-all`(★'표' 낱말 금지) → `display-term-pan-softening`(★'판'→"참여" 순화) → `guest-policy-v2.1-2026-09-06` → `todo-expired-tournaments-cleanup` → `run1-kickoff-2026-09-04`
2. 필독: 이 파일 → `outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md` **v1.1**(§8 승인 최종본 · §14 · §16) → `outputs/PROMPT_ClaudeCode_RUN-1_PR2_2026-09-07.md`
3. ⏰ **GCP 결제 9/9(만료 9/10) — 09-07 대표 답 "아직, 9/9에 한다"** · Vercel Hobby→Pro · 대회 정리 마지노선 9/17(PR 2 0단계에서 처리)

## 1. 09-07 세션 결과
| | 결과 |
|---|---|
| 확인 3건 | GCP: 9/9 예정 유지 · 대회 정리: **팬용 4개 마감 연장 + 나머지(마감 없는 5개 포함) 숨김**, **시점 = PR 2 배포 전(0단계)** · §7 0단계 테스트 데이터: 미삭제/불명 → PR 2 0단계에서 확인·삭제 |
| 실측 4건 | ① votes에 게스트 표시 없음 → **PR 2에서 `isGuest` 신설** ② 소급 없음(대표) ③ `guest_runs.tournamentId`로는 3판·복수 대회 이어하기 불가 → 제거, `isContinue`로 ④ 공유 링크에 uid 없음 ✅ |
| 라이브 실측 | The Pitch "진행 중" 12개 중 **마감 남은 대회 0개**(지남 7 · 없음 5) → 대회 정리를 PR 2 배포 전제로 격상 |
| 문서 전파 | `LANGUAGE.md` v2.2 · `CLAUDE.md` v2.6 · 정본 v2.1 HTML · 핸드오프 v1.1(§5 DON'T 2 해제, §16 신설) · CONTEXT/CODING_CONTEXT/ProjectSkill 링크 · PR 1 spec/plan 배너 — 커밋 `e273782` |
| 문구 승인 | `guest_limit` 제목/부제 · `arena.guest.welcome/remaining` · `pitch.hero.sub`(예측·배당 삭제) 대표 원문 확정 + 09-05 승인본 5건 ko 순화 — 커밋 `c800093` |
| 용어 결정 2건 | **"표"는 낱말 자체 금지 → "선택"** · **화면에서 '판'은 "참여/N번 참여"로 순화**(시스템 용어 Run(판) 불변) — LANGUAGE.md §1·§7 박제 |
| 브랜치 | `feat/run-1-pr2-screens-v2.1` (main #92에서 분기) — 문서 커밋 3개 · **push는 대표 몫**(Claude Code가 fetch/rebase 후 push) |
| 도구 | **Chrome 확장 연결 성공**("Browser 1") — `worldcrown48.com/admin` 탭 열어 둠, Google 로그인은 대표가 눌러야 함 · 앱 내장 브라우저도 라이브 사이트 읽기 가능 · Firestore/구글 API는 맥 VM·클라우드 셸 모두 차단(403) |

## 2. 다음 세션에서 할 일
1. Claude Code가 낸 **0단계 대회 정리 보고 표**를 대표와 함께 확인 — 연장 날짜(제안 2026-11-30) · 숨김 목록 · 테스트 데이터 삭제. **보고 없이 쓰였으면 멈추고 보고**.
2. PR 2 진행 중 Claude Code가 새 문구를 요구하면 초안 → 대표 승인 → 핸드오프 §8 추가.
3. 머지·배포 후 **§7 5단계를 Chrome 확장으로 병행 검증**(핵심: 2판째 대진 상이 · 마감 안내 · 게스트 공유 열림/저장 잠김 · 4판째 `guest_limit`).
4. PR 2 종료 시 → PR 3 프롬프트(랭킹 `isGuest` 필터 · match_session_id 회차 · first_vote · 랭킹 12시간+발표 시각 · `is_guest` 공유 계측 · `daily_participation` 규칙 삭제).
5. 메모리 `run1-kickoff-2026-09-04.md`에 PR 2 결과 추기.

## 3. 하지 말 것
아레나 UI 대수술(ARENA-1/2) · MVP1.5 검수 재론 · 로그인 규칙 재론 · 게스트 정책 재론 · '표' 낱말 사용.

## 4. 다음 세션 시작 프롬프트 (대표가 복사)
```
WorldCrown48 이어서. RUN-1 PR 2가 Claude Code에서 진행 중이다.
먼저 읽어: 메모리 user-communication-profile → no-pyo-word-at-all → display-term-pan-softening
→ guest-policy-v2.1-2026-09-06 → todo-expired-tournaments-cleanup,
outputs/SESSION-HANDOFF_2026-09-07_티오-다음세션_PR2진행.md,
outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md(v1.1 §8·§14·§16).
확정(재론 금지): v2.1 게스트 정책 · '표' 낱말 금지(→선택) · 화면에서 '판'은 참여로 순화 · 문구 승인본은 §8.
할 일: Claude Code의 0단계 대회 정리 보고 검토 → PR 2 병행 검증(Chrome 확장) → 머지 후 §7 눈검사 → PR 3 프롬프트.
먼저 확인: GCP 결제(9/9) · PR 2 진행 상태(브랜치 feat/run-1-pr2-screens-v2.1, PR 번호).
첫 답변은 "지금 어디까지 와 있는지" 요약부터.
```
