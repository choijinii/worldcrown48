# NEWS-1 · TIO 기본 지식 다섯 층 + 생성 뒤 검사 + 점유율 이름 — 실행 계획

> 지시서: `outputs/prompts/PROMPT_ClaudeCode_NEWS-1_TIO기본지식·생성뒤검사·점유율_v1.0_2026-11-27.md`
> 대표 승인 2026-11-27: 계획 · 금지 낱말 목록 · 편집 방침 자리(`config/newsPolicy` · 콜러블로만 읽고 씀).
> 점유율 en · es(Share · Cuota)는 대표 확인 전 — 한국어만 바꾼다.
> 건드리지 않는 파일: `functions/src/core/pressPrompt.ts` · `components/admin/newsdesk/`(A줄 newsdesk 탭).

## 설계 (요약)

- `functions/src/core/tioKnowledge.ts` (새 파일 · 순수)
  - `TIO_FACT_SHEET` — 1층 · 지시서 §12 35줄 글자 그대로(묶음 제목 7줄 포함).
  - `TIO_STYLE_SKILL` — 2층 · 지금 `NEWS_STYLE_GUIDE` 7개 지침 + 기사 뼈대 + 넓힌 금지 낱말. `NEWS_STYLE_GUIDE` 는 이것의 다른 이름으로 남긴다(옛 시험 · import 유지).
  - `TIO_KIND_SKILLS` — 3층 · press(빈자리) · open · result · weekly · column. 지금 지시문의 종류별 고정 문장을 그대로 옮김.
  - `buildTioPrompt({ kind, task, policyLines, data })` — 1 → 2 → 3(그 종류) → 4(그 종류 줄) → 할 일 줄 → 데이터 → 출력 모양.
  - `TIO_LAYER_LIMITS` — 1층 6,000 · 2층 3,000 · 3층 장마다 3,000 · 4층 30줄 · 줄마다 200자.
  - `NewsPolicyLine { text, reason, addedAt, kinds? }` · `validateNewsPolicyLines` · `policyLinesFor(lines, kind)`.
- `FORBIDDEN_WAR_WORDS`(8개)는 그대로(외신 지시문이 import). 더한 낱말은 `EXTRA_WAR_WORDS` · 금지 목록은 `TIO_FORBIDDEN_WORDS`.
- `functions/src/core/newsCheck.ts` (새 파일 · 순수) — `checkDraftText(draft)` → `CheckWarning[]`
  - `{ rule: "forbidden_word" | "wrong_number" | "percent", lang, field: "title" | "subhead" | "body.N", match }`
  - 퍼센트 판정은 `newsDraftAssembly` 의 비율 낱말 판정(`isRateLabel`)을 함께 쓴다.
- `newsDraftPipeline.assembleLocalizedDraft` — 번역 뒤 `checkWarnings` 를 붙인다(늘 배열). 상태는 `draft` 그대로.
- 편집 방침: `functions/src/core/newsPolicyCore.ts`(검사 · 저장 판단) + `functions/src/newsPolicy.ts`(콜러블 `getNewsPolicy` · `saveNewsPolicy` · 관리자만) + `firestore.rules` `config/newsPolicy` 전면 거부.
- 신호 셋 · `generateNewsDraft` 가 `config/newsPolicy` 줄을 읽어 넘긴다(읽기 실패 = 빈 목록 + 기록, 초안은 계속).
- 점유율(한국어): `CHART_RATE_TERMS.pick.ko` · `chart.score.help` ko 셋째 줄 · `NUMBER_RULE_LINES` · 선두 줄 · 문서.

## 할 일 (TDD — 시험 먼저 빨강 → 초록)

1. 유닛 `tioKnowledge.test.ts` — 35줄 글자 그대로 · 상한 · 조립 순서 · 종류 줄만 · 금지 낱말 목록 포함.
2. 유닛 `newsCheck.test.ts` — 3언어 금지 낱말(걸릴 것 / 안 걸릴 것) · 숫자 짝 · 16강 · 퍼센트.
3. 유닛 `newsPolicyCore.test.ts` — 30줄 · 200자 · 이유 필수 · kinds 검사 · addedAt 채우기.
4. 통합 `newsDraftRunners.test.ts` 보탬 — 개막 · 결과 · 주간 신호의 지시문에 1~4층 · 틀린 응답 → checkWarnings · status draft.
5. 규칙 시험 `tests/rules/news-policy.rules.test.ts` — 관리자 · 손님 모두 읽기 · 쓰기 0.
6. 점유율 — 기존 잠금 시험(`newsNumberLock` · `newsPrompts`)을 새 낱말로 먼저 고쳐 빨강 → 코드.
7. E2E `e2e/emulator/news1-tio-knowledge.spec.ts` — saveNewsPolicy → 주간 초안 지시문에 그 줄 · 틀린 가짜 응답 → checkWarnings · 차트 설명창 셋째 줄 "점유율".
8. 원장 결정 G · H · I · `CLAUDE.md` · `LANGUAGE.md` · `CROWN_SCORE_v1.1.md` 전파.
9. 검사: functions · 루트 vitest · tsc · rules · check:hex · 금지 낱말 · E2E → PR(직전 main 최신 받아 다시).
