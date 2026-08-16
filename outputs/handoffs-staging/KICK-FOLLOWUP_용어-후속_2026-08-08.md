# KICK-FOLLOWUP — 용어 표시 층 후속 (재배포 + 기사 백필 + 정책 원문 정합)

작성: 2026-08-08 | 발신: Cowork | 수신: Claude Code (PR #60 세션 이어서 — /clear 불필요)
전제: 네가 방금 낸 완료 보고 + PR #60 코멘트(issuecomment-5225242449)가 이 킥의 사실 기반이다.

---

## 0. 대표 결정 (2026-08-08 확정)

1. **발행 기사 속 "Voter" → 전부 "팬"(ko) / "fan(s)"(en)으로 수정** — "시대의 흔적 유지" 아님. 네 보고 표의 발행 기사 전부(20260726-6c93cc · 20260726-3fb980 · 20260730-ca4f8c, ko 총 11회 + en 대응 전부)가 대상.
2. **content/ko/cookies.md · content/en/cookies.md의 동일 문구 3종도 함께 수정** — 동의창(ConsentModal)과 정합. 표시 용어만 바꾸고 정책의 법적 내용·구조는 무변경.
3. ConsentModal es 문구 = 적용 대상 없음 보고 승인. 동의창 스페인어는 MVP 2 다국어 확장 미결로 이월 (이 킥 스코프 아님).

## 1. 작업 순서

1. **PR #60 머지 확인 후 functions 4종 재배포** (generateNewsDraft · onTournamentOpened · onChampionForNews · scheduleWeeklyNews) + 네가 보고한 반영 확인 방법으로 확인 1줄.
2. **cookies.md 소형 PR 1개** — ko·en 두 파일의 해당 3종 문구를 ConsentModal 최종 문구와 동일하게. (코드 레포 변경이므로 PR·CI 경유)
3. **발행 기사 백필** — prod Firestore 기사 문서의 Voter 표기 교체.
   - 수정 전 각 문서 원본 스냅샷 백업 (B-2 백필 19건 때와 같은 방식 권장 — outputs/에 보관)
   - 교체 원칙: 지칭만 교체. 문장 다듬기·재작성 금지, 다른 필드·AI-Report 배지·수치 불변
   - "Voter Count" 계열 표기가 기사 안에 있으면 "참여 팬 수"/"Fan Count"로 함께 교체
   - 교체 후 발행 URL 3건 실측 확인 (ko·en 각각)

## 2. 금지

- 기사 내용 중 Voter 지칭 외 부분 수정 금지 (문체 개선 유혹 금지 — 백필은 기계적 교체)
- 코드 식별자·DB 필드명 불변 (문서 내용 필드의 텍스트만)
- cookies.md의 법적 조항·구조 변경 금지 (지칭 문구 3종만)

## 3. 완료 보고

1. 재배포 완료 + 반영 확인 1줄 (배포 후 생성 초안에 Voter 없음 확인)
2. cookies.md PR 번호 + CI 결과
3. 백필 전/후 대조표 (기사별 교체 건수, 백업 파일 위치)
4. 발행 URL 3건 실측 결과

---
*© 2026 WorldCrown48 | Kick Follow-up | outputs/handoffs-staging/*
