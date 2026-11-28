# NEWS-2 · 경고 남은 초안 발행 막기 · [경고 풀기] · 주간 대회 세기 · Share/Cuota — 실행 계획

> 대표 결정 2026-11-27(코워크 전달): ① 주간 초안 대회 세기(자동 · 손 같은 기준 · 숨김 빼기 · 진행 중 = 공개된 진행 중만) ② 점유율 Share · Cuota ③ 결정 J(경고 남은 초안 발행 금지 · 저장 때 서버 재검사 · 발행된 기사는 경고만) + [경고 풀기] 서버(18:17 승인). 화면(단추)은 A줄 newsdesk 탭.

## 설계 (Claude Code 판단)
- 발행 막기는 Firestore 규칙 — 서버만 쓰는 칸 checkWarnings · checkedText · checkBlocked · clearedWarnings. 초안 → 발행은 checkBlocked == false 이고 발행하는 글 == checkedText 일 때만(검사 안 한 글을 고치면서 발행하는 길 막힘). 뉴스데스크 화면 코드는 바꾸지 않아도 된다(저장 = 제목 · 부제 · 본문만 · 발행 = 상태만).
- 재검사 = 트리거 onNewsCheck(news/{slug} 쓰기 · 글이 checkedText 와 다를 때만 씀 · 문서 시각 조건).
- [경고 풀기] = 콜러블 clearNewsCheckWarnings · 기록 news_check_clears. "같은 경고" = 종류 · 언어 · 자리 · 걸린 말.
- 주간 = newsDraftRunners.selectWeeklyCaches 하나를 크론 · 콜러블이 함께 씀. 이름은 대회 문서 제목.
- 옛 기사 = scripts/ops/news-check-backfill.mjs list|apply(배포 뒤 한 번 · 규칙 배포 전에).

## 할 일 (TDD)
1. 유닛 newsCheckState.test · 통합 newsDraftRunners.test(selectWeeklyCaches · 주간 신호 · 생성 때 잠금) → 코드
2. 규칙 시험 news-publish-gate.rules.test → firestore.rules
3. 잠금 시험(newsNumberLock · tioKnowledge · newsCheck) Share/Cuota → 코드 · messages.ts
4. E2E news2-publish-gate.spec + CI 단계
5. 원장 D-107 · D-108 · D-109 · CLAUDE.md v2.17 · LANGUAGE.md · CROWN_SCORE_v1.1.md
