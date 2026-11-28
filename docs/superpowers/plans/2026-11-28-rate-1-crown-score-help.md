# RATE-1 PR A — Crown Score 설명창 3언어 · 산정 기준 페이지 · 세 비율 영어 · 스페인어 이름

> 지시서: `outputs/prompts/PROMPT_ClaudeCode_RATE-1_CrownScore설명창·산정기준페이지·T5원장정리_v1.0_2026-11-28.md`
> 근거: 원장 D-108 · `marketing/00_strategy/CROWN_SCORE_v1.1.md` · 대표 결정 L · M (2026-11-28)

**Goal:** 차트 "?" 설명창을 대표 승인 글(§3)로 바꾸고, 같은 글을 정책 문서 "Crown Score 산정 기준"에 싣고, 세 비율의 영어 · 스페인어 정본 이름(결정 L)을 AI 지시문 · 번역 용어 · 검사 그물에 넣는다.

**Architecture:** 세 비율 이름의 단일 자리는 `functions/src/core/displayTerms.ts` `CHART_RATE_TERMS`(AI 지시문 · 번역 용어 · 기사 숫자 칸 그물 · rate_claim 이 모두 여기서 읽음). 설명창 글은 `lib/i18n/messages.ts` `chart.score.help` 하나. 정책 페이지는 기존 정책 문서 방식(`POLICY_TYPES` → 경로 · 왼쪽 목록 · 메뉴 · 사이트맵 · `content/{ko,en,es}/crown-score.md`).

## Global Constraints
- 설명창 3언어 글 = 지시서 §3 글자 그대로(줄 나눔 그대로). 들여 쓴 줄(점수표 줄)은 화면에서 들여 쓴다.
- 페이지 이름 = Crown Score 산정 기준 / How Crown Score works / Cómo se calcula Crown Score (대표 승인 2026-11-28).
- 비정본 이름: Reach · Wins · Picks · Share / Alcance · Victorias · Elecciones · Cuota — 화면 · AI 지시문 0건(그물 목록 예외).
- 이 밖의 새 화면 문구는 만들지 않고 3언어 안을 대표에게 묻는다.
- 금지 낱말 · raw hex · 3언어 키 누락 0.

## Review Focus
- 영어 "fans' picks" · 스페인어 "las elecciones de los fans" 같은 보통 낱말이 비정본 이름 그물에 잘못 걸리지 않는다(비율 맥락 — 퍼센트 옆 · 숫자 칸 라벨 — 에서만 잡는다).
- 여러 낱말 정본 이름(Placement score rate · Tasa de puntuación por posición)이 rate_claim 에 "정본 아님"으로 잘못 걸리지 않는다.
- 390px 시트가 화면 밖으로 잘리지 않고 끝까지 스크롤된다 · 넓은 화면에서 긴 줄이 잘리지 않는다.
- 정책 페이지가 다른 정책 시험(한국어 원문 우선 조항 · es 구조 대조 · 투표 낱말 0)을 그대로 통과한다.

## Tasks
1. **세 비율 이름(functions)** — `CHART_RATE_TERMS` en · es 를 결정 L 로 · `NON_CANONICAL_RATE_NAMES_EN/ES` · `newsCheck` rate_name 에 en · es 비정본 이름(퍼센트 옆 · 라벨) · rate_claim 이 정본 구절을 먼저 빼고 본다. 시험: newsCheck · newsNumberLock · tioKnowledge.
2. **설명창 글** — `chart.score.help` = §3 · `resolveHelpText` 가 들여쓰기 표지를 남김 · 시험: §3 글자 대조 · 예시 530 = `crownScoreOf`.
3. **설명창 모양** — 390px 시트(아래에서 올라옴 · 최대 높이 · 스크롤 · [닫기]) · 넓은 화면 잘림 없음. E2E: c3 · news1 · news2 설명창 시험 갱신 + 390px 시트 끝까지 스크롤.
4. **산정 기준 페이지** — `POLICY_TYPES` · `POLICY_NAV` · `nav.sub.crownScore` · `navMap` · `content/*/crown-score.md` · 사이트맵. 시험: 정책 시험 묶음 · 사이트맵 · E2E Policy Hub 목록 → 페이지.
5. **문서** — `CROWN_SCORE_v1.1.md` 6-2 · 원장 결정 L · M(번호는 그때 원장 끝).
