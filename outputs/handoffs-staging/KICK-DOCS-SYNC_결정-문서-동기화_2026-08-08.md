# KICK-DOCS-SYNC — 확정 결정 ↔ 문서 동기화 (stale 일소)

작성: 2026-08-08 | 발신: Cowork | 수신: Claude Code
배경: 확정된 결정이 CLAUDE.md 등 규범 문서에 제때 반영되지 않아, 2026-08-08 Cowork·Claude Code 모두 "es는 MVP 2 언어"로 오답하는 사고 발생 (대표 지적). Cowork가 전 문서 grep 스윕으로 어긋난 곳을 전수 조사했고, 이 킥은 그 수정 명세다.
실행 시점: KICK-FOLLOWUP(재배포·백필·cookies.md) 완료 후. **별도 docs PR 1개.**

---

## 0. 확정 사실 (수정의 근거가 되는 결정 3건)

- **결정 ①** (2026-07-01): 3언어(ko/en/es) 아키텍처는 **지금**, 스페인어 콘텐츠는 점진적. 실측(2026-08-08): SUPPORTED_LOCALES에 es 라이브, UI 사전 es 113건, Lab 제목 3언어, 뉴스 3언어. 잔여 구멍 3곳(정책 문서 content/es 부재·ConsentModal ml-es 부재·/account)은 **Pitch 개편 "es 커버리지 스윕"으로 확정** (2026-08-08 대표 결정).
- **결정 ②** (2026-07-22): AI-Report 표기 = **v2.5** — "✦ AI-Report", 기사 푸터 1곳 전용(Footer-Only Lock), 8px·50% 투명도. "● AI-Report 11px 카드 배지"는 구버전.
- **결정 ③** (2026-08-06): Voter 표시 용어 층 — 독자 노출 텍스트 = 팬(ko)/Fan(en·es). LANGUAGE.md는 PR #60에서 v2.0으로 개정 완료(단일 진실). 나머지 문서는 미반영.

## 1. 수정 대상 (파일별 명세)

### A. `CLAUDE.md` (v2.2 → v2.3)
1. **L56 불변 원칙 #4**: `배지: "● AI-Report" (11px, #FCD006)` → v2.5 기준으로 교체: `표기: "✦ AI-Report" — 기사 푸터 1곳 전용(Footer-Only Lock), 8px·50%. "AI GENERATED"·카드 배지 완전 폐기`
2. **L135~137 MVP 마일스톤 표 언어 열**: 표 아래 각주 추가 — `※ 2026-07-01 결정으로 3언어(ko/en/es) 아키텍처는 조기 적용되어 라이브(토글·UI·뉴스·Lab 제목). es 잔여 3곳(정책 문서·동의창·/account)은 Pitch 개편 es 스윕에서 처리.`
3. **필수 용어 표(L120 부근)**: 표 아래에 표시 용어 층 1줄 추가 — `※ 표시 용어(Display) 층 v2.0 (2026-08-06): 독자 노출 텍스트의 Voter = "팬"/"Fan". 상세·예외(기본 닉네임 "Voter" 유지 등) = LANGUAGE.md §1`
4. **L154 "Voters 이벤트"** 예시 `"1,000 Voters 모으기"` → `"1,000 팬 모으기"` (독자 노출 카피 예시이므로 표시 용어 적용)
5. **문서 체계 표의 `CONTEXT.md`** → 실제 파일명 `CONTEXT_v0_6.md`로 정정
6. **Stale-Doc Guard 절 신설**: `outputs/handoffs-staging/stash-2026-06-11-*.patch`에 백업된 Stale-Doc Guard 문구 재활용 — 핵심 규칙: "대표 결정이 확정되면 같은 킥/세션 안에서 CLAUDE.md·LANGUAGE.md·CONTEXT·관련 lite-spec·코드 주석을 grep 스윕해 갱신한다. 갱신 불가 시 명시 태스크를 즉시 생성한다. 문서와 결정이 충돌하면 결정 문서(outputs/handoffs-staging/ 확정본)가 우선."
7. 버전 표기 v2.3 (2026-08-08) + 개정 이력 1줄

### B. `lib/locale.ts` 주석 2곳 (L8·L14)
- `adding Español at MVP2` / `'es' joins at MVP2` → 현행 반영: es는 이미 shipped. 예: `/** Locales shipped, in display order. es live since 2026-07 (A1-i18n). */` (코드 로직 무변경, 주석만)

### C. `docs/i18n/I18N_POLICY.md` (v1.0, 2026-05-23)
- 전면 개정은 스코프 밖. **문서 머리에 stale 배너 추가**: `⚠️ [2026-08-08] 이 문서는 v1.0(2026-05-23) 기준으로 현행과 불일치: ①es는 MVP2 대기가 아니라 라이브(2026-07-01 결정) ②구현은 next-intl이 아니라 수제 Context(lib/i18n). 현행 기준 = lib/locale.ts·lib/i18n/ + docs/handoffs/i18n-content-translation-handoff.md. 이 문서를 작업 기준으로 삼지 말 것.`

### D. `docs/lite-specs/C5-fan-intelligence.md` L29
- `es는 MVP 2` → `es 포함 3언어 동시 생성 (2026-07-01 결정, 뉴스 파이프라인 라이브)`

### E. `DESIGN_BRIEF.md` — AI-Report 규격 전체 (L59·L98·L175·L187~192)
- `● AI-Report 11px` 카드 배지 규격 → v2.5로 교체: ✦ AI-Report·기사 푸터 전용·8px·50%. 카드 배지 규격 절은 "폐기(v2.5)" 표시.

### F. `docs/design/SKILL.md` L61~63 + `docs/design/README.md` L3 배너
- SKILL.md: 카드 배지 11px·본문 12px → v2.5(✦·푸터 전용·8px·50%)로 교체
- README.md 정정 배너 속 `AI 배지는 "● AI-Report"` → `"✦ AI-Report" (v2.5)`로 정정 (배너 자체가 stale해진 상태)

### G. `CONTEXT_v0_6.md`
- 파일 전체를 같은 기준으로 grep 스윕 (es·MVP2·AI-Report·Voter 표시) — 발견 시 동일 원칙으로 수정, 결과 보고에 포함

### H. `docs/legal/` 신규 2파일 커밋 (2026-08-08 추가)
- Cowork가 워킹트리에 저장해 둔 untracked 파일 2건을 이 PR에 포함해 커밋: `docs/legal/WC48_저작권상담_답변_2026-08-08.md` (한국저작권위원회 답변 원문+매핑표) · `docs/legal/WC48_IP-LEGAL-BRIEF_v2.1.md` (법리 브리프 개정). **내용 수정 금지 — 커밋만.** (상담 답변 2026-08-08 수령, G-LEGAL-3 게이트 완료 기록)

### I. `LANGUAGE.md` — es 지칭 고정 결정 반영 확인 (2026-08-08 추가, 대표 확정)
- 2026-08-08 대표 결정(B안): **es 독자 지칭 = "fan(s)" 고정** — 번역 층이 aficionados·votantes로 옮기지 않음 (구현 = PR #64 displayTerms.ts). LANGUAGE.md §1 표시 용어 층에 이 결정이 반영돼 있는지 확인하고, 없으면 1~2줄 추가 (기존 정의 문장 수정·삭제 금지 원칙 동일). 개정 이력에 1줄.
- 같은 절 부근에 미결 2건 각주 등록(내용 수정 아님, 기록만): ①발행 기사 3fb980 ko 문단 기존 오타 "어떤 한글로 는" — 수정 여부 대표 판단 대기 ②약관·커뮤니티·개인정보 정책 원문 속 Voter는 계약 당사자 정의어로 **의도적 유지** — 변경은 법적 검토(G-LEGAL) 영역.

## 2. 금지

- **역사 문서 무변경**: docs/handoffs/·docs/superpowers/plans·specs 등 날짜 박힌 실행 기록은 당시 사실이므로 수정 금지 (superpowers plan 속 "es joins at MVP2" 포함)
- LANGUAGE.md 재수정 금지 (PR #60에서 이미 v2.0 완료)
- 코드 로직 변경 금지 (locale.ts는 주석만)
- MENTAL_MODEL.svg 변경 금지 (이번 스윕에서 어긋남 미발견)

## 3. 완료 기준·보고

1. docs PR 1개, CI green (locale.ts 주석 변경이 테스트에 안 걸리는지 확인)
2. 보고: 파일별 전/후 대조표 + G(CONTEXT_v0_6.md) 스윕 결과
3. 최종 검증: `grep -rn "MVP2\|MVP 2" --include="*.md" CLAUDE.md docs/lite-specs/ docs/i18n/ DESIGN_BRIEF.md lib/locale.ts` 결과에 es 관련 stale 표현 0건 + `grep -rn "● AI-Report\|11px" CLAUDE.md DESIGN_BRIEF.md docs/design/SKILL.md docs/design/README.md` 에 현행 주장 0건(역사 인용 제외)

---
*© 2026 WorldCrown48 | Kick Prompt | outputs/handoffs-staging/*
