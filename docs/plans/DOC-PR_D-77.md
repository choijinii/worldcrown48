# DOC-PR D-77 — CLAUDE.md v2.9 문서 PR 계획

지시서: `outputs/PROMPT_ClaudeCode_CLAUDEmd_문서PR_D-77_v1.0_2026-11-06.md` (코티오 · 2026-11-06)
원장 변경 없음 · D-52·D-77 전파. 원장 끝 번호 = D-84(main f3170b8) · D-75·D-76·D-77 은 이미 main 원장에 있다 → 다시 붙이지 않는다.

## 순서 (§11.1)
1. 이 계획 → 2. `scripts/check-docs.mjs` 먼저 만들고 지금 CLAUDE.md 에서 **빨강** 확인 → 3. 7줄 고쳐 **초록** → 4. §10 검증 결과를 PR 에.

## 고칠 자리 (main f3170b8 기준 줄 번호)
| # | 파일:줄 | 바꿈 |
|---|---|---|
| 1 | CLAUDE.md:71 불변 원칙 6 | 지시서 §1-1 문장 전문으로 교체 · 옛 Level 1/2 문장은 `~~취소선~~` 으로 남김 |
| 2 | CLAUDE.md:148 뒤 | `>` 한 줄 — 카드 사진 자리(D-77) |
| 3 | CLAUDE.md:194 | 런칭 = 2026-11-26(목) 0시 KST(D-52) · 원래 목표 10/08 = 49일 밀림(D-10) · 총공 · 마감 12/26 · 기준 문서 줄은 그대로 |
| 4 | CLAUDE.md:196·197 | 런칭 전 순서 — 끝난 것 ✅(근거 커밋 PR 설명에) + YT-FIX-1 · IMAGE-1 PR 1 · 2 · 3 · PITCH-2 · 크라운 카드 · "10/8 런칭 기준" → "11/26 런칭 기준" |
| 5 | CLAUDE.md:91 뒤 | 대진 흐름 원칙 #14 이미지 엔트리 |
| 6 | CLAUDE.md:172 앞(필수 용어 표) + LANGUAGE.md §7 금지 표 | 팀 AI 지시문 · 금지 = 팀 경로(코드 이름) |
| 7 | CLAUDE.md:15·17 위·253 위·263 | v2.9 (2026-11-06) — 제목 줄·머리 줄·개정 이력 행·꼬리 줄 |

## 검사 — `scripts/check-docs.mjs` (`npm run check:docs` · `.github/workflows/docs-check.yml`)
- 순수 함수 = `scripts/check-docs.lib.mjs`, 단위 시험 = `lib/__tests__/docsCheck.test.ts` (hex 가드와 같은 짜임).
- **금지 낱말** — `git diff <base> -- CLAUDE.md LANGUAGE.md` 의 추가 줄에 `FIFA` · `참가자` · `투표` · `Vote`(낱말) · 숫자+`표` · `팀 경로` · `월드컵` 0건. 예외 구절: `이상형 월드컵` · `'팀 경로'라 부르지 않는다` · `팀 경로(코드 이름)`. base 기본값 `origin/main`, CI 는 PR base.
- **링크 깨짐** — 두 파일 속 `marketing/` · `docs/` · `lib/` 로 시작하는 경로가 있는지(확장자 없는 모듈 경로는 .ts/.tsx/.mjs/.md 로 찾음). 이미 깨져 있던 경로는 `scripts/docs-link-allowlist.json` 에 사유와 함께(이 PR 범위 밖 — 7줄 밖 수정 금지).
- **Stale-Doc 대조** — ① CLAUDE.md 에 원장 D-77 정의 줄 따옴표 안 원칙 문장이 글자 그대로 ② 런칭 절에 `2026-11-26` ③ 런칭 전 순서 줄에 `IMAGE-1 PR 1 · 2 · 3` ④ 불변 원칙 6행에서 `Level 1 자동허용` 이 취소선 밖에 없음 ⑤ 런칭 절의 `10/08`·`10/8` 은 "49일 밀림" 줄에만.

## 하지 않는 것
원장 수정 · 7줄 밖 문장 다듬기 · 기술 스택 표 · 테마 지도 · 참가 규칙 절 · 로드맵 HTML · FIFA 낱말 추가 · main 직접 push.
