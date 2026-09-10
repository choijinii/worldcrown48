# 티오 다음 세션 지시서 — RUN-1 PR 3 착수 (2026-09-09 밤 작성)

> **PR 2는 09-09 밤에 공식 종료됐다** — #93·#94 머지·배포, 프로덕션 검증, 대표 눈검사(게스트 3판 소진 문구 확인, 속도 정상)까지.
> 다음 세션의 일 = **① 핸드오프 §8 문구 2건 추가 → ② PR 3 프롬프트 발행 → ③ 보안 숙제(키 폐기) 확인.**

## 0. 시작 리추얼
1. **첫 줄에 날짜·시간(KST)** — 대표 지시(09-09). 마지막 줄도 날짜·시간.
2. 메모리: `user-communication-profile.md`(★09-09 갱신 — 티오만 아는 참조 금지·검증된 일 재요청 금지) → `no-pyo-word-at-all` → `display-term-pan-softening` → `run1-kickoff-2026-09-04`(PR 2 종료 기록) → `todo-expired-tournaments-cleanup`(완료)
3. 필독: 이 파일 → `outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md` v1.1 §3 Phase 3 · §8 · §16 → `marketing/00_strategy/EVENT_SPEC.md` v1.2
4. ⏰ 확인: **GCP 결제(9/9 예정이었음 — 했는지)** · Vercel Hobby→Pro · 9/17 부하 테스트 준비

## 1. 09-08~09 결과 요약
| | 결과 |
|---|---|
| 0단계 대회 정리 | 팬용 4개 마감 11/30 연장 · 15개 draft · 테스트 익명 1개(50문서) 삭제. 마감 남음 4·지남 0·없음 0 |
| PR #93 | 18 태스크 TDD, functions 453 tests, CI green → 머지·배포 |
| PR #94 | 프로덕션 검증에서 잡은 결함 2건(완주 직후 판 상태 stale · 지난 카드 링크 최신으로 감) 수정 → 머지·재배포·재확인 |
| §7 검증 | 로그인 5판 소진·B대회 별도 5판·게스트 안내 3지점·공유 개방/저장 잠금·guest_limit·linkSessionVote 이관 전부 PASS |
| 대표 눈검사 | 시크릿 창 3판 → 4판째 차단 문구 정확 · **속도 정상** (Claude Code의 9~14초는 자동 도구 쪽) |
| 추가 승인 문구(09-09) | 배너 "미리보기와 공유는 자유 · 저장하려면 로그인이 필요해요." / 모달 share "저장하려면 로그인이 필요해요" / [다시 참여 (n/한도)] 변수화 — **§8에 아직 미반영** |
| 라이브 4개 | 런칭용 아님 — 기존 콘텐츠 임시 연장. 런칭 라인업 확정 시 처리(유지/ended/편입) + "테스트 토너먼트-3" 제목 정리 |

## 2. 다음 세션 할 일
1. 핸드오프 §8에 위 문구 2건 + (n/한도) 변수화를 ✅ 승인본으로 추가, 커밋.
2. **PR 3 프롬프트** 작성·발행: `rankingAggregator`에서 `isGuest === true` 제외(메모리 필터, 옛 기록은 집계) · `first_vote`(판당 1회, run_index) · `match_session_id` 해시에 회차 · `scheduleRankingCache` 60분→12시간 + 랭킹 화면 "다음 발표" 문구(§8 승인본) · `firestore.rules`의 `daily_participation` 블록 삭제 · `crown_cards`·`roundProgress` 필드 `runIndex` 없을 때 1 폴백. 배포 후 §7 확인 = 게스트 판이 랭킹에 안 실리는지(시크릿 창 1판 → 랭킹 캐시 갱신 후 변화 없음).
3. 보안: Claude Code에게 **"서비스 계정 키 ID별 사용처(로컬 파일·GitHub Secrets·Firebase Secrets) 표"** 요청 → 안 쓰는 키만 Google Cloud 콘솔에서 폐기. 대표는 09-09 ~/Downloads 키 4개 휴지통 처리(지시함 — 완료 여부 한 번 확인).
4. Claude Code 재시작(업데이트 적용) + `/clear`는 PR 3 시작 전에.

## 3. 하지 말 것
아레나 UI 대수술(ARENA-1/2) · MVP1.5 검수 재론 · 참가 규칙(v2.0/v2.1) 재론 · '표' 낱말 · **티오만 아는 문서 번호로 말하기 · 이미 검증된 일을 대표에게 다시 시키기**.

## 4. 다음 세션 시작 프롬프트 (대표가 복사)
```
WorldCrown48 이어서. RUN-1 PR 2는 끝났고 PR 3 차례다.
먼저 읽어: 메모리 user-communication-profile → no-pyo-word-at-all → display-term-pan-softening → run1-kickoff-2026-09-04,
outputs/SESSION-HANDOFF_2026-09-09_티오-다음세션_PR3착수.md, outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md(§3 Phase 3·§8·§16).
확정(재론 금지): v2.1 게스트 정책 · '표' 낱말 금지(→선택) · 화면에서 '판'은 참여로 순화 · 문구 승인본은 §8.
할 일: ① §8에 09-09 승인 문구 2건 추가 ② PR 3 프롬프트 발행 ③ 서비스 계정 키 사용처 확인 후 폐기 안내.
먼저 확인: GCP 결제 했는지 · 다운로드 폴더 키 4개 지웠는지.
첫 줄에 날짜·시간부터, 그다음 "지금 어디까지 와 있는지" 요약.
```
