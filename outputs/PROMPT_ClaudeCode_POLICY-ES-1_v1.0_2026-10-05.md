# Claude Code 전달 프롬프트 — POLICY-ES-1 (동의 층·정책 문서 스페인어판) · **v1.0 (2026-10-05)**

> **상태: 실행 가능.** 대표 결정 2026-10-05 밤("언젠가 해야 하는 일이면 먼저 — 스페인어를 넣어서 만들어라") + 세부 3건 승인.
> 정본 우선순위: **① 결정 원장 `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` > ② 이 프롬프트 > ③ 기타 문서**
> 담당: Claude Code · 방식: **Superpowers**(테스트 먼저 → 계획 → 구현 → 검증). 계획서는 `docs/superpowers/plans/`에.
> 기준: main `3f712aa`(PR #117 COOKIE-1 병합 · `firestore.rules` 배포 완료 이후).
> 런칭 전 순서: E2E-1(끝) → CARD-FIX(끝) → COOKIE-1(끝) → **POLICY-ES-1(이 작업)** → NAV-1 → THUMB-1 → FONT-1 → ARENA-2 → 크라운 카드 새 디자인.

---

## §0 목적 / 완료 정의(DoD)

**목적(의도 먼저)**: 서비스는 3개 언어(ko·en·es)를 내세우는데, 동의 층(동의 바·설정 창)과 정책 문서 4개만 한국어·영어뿐이다. 스페인어 팬이 **무엇에 동의하는지 자기 언어로 읽게** 한다. COOKIE-1에서 es 동의 **저장**은 이미 열었다 — 이번은 **글자**다.

**DoD**
- [ ] 화면 언어가 es일 때 동의 바·설정 창이 **스페인어 + 영어** 병기로 보인다(한국어 자리를 스페인어로). 화면 언어가 ko·en일 때는 **지금과 한 글자도 다르지 않다**.
- [ ] 정책 문서 4개(`terms` · `privacy` · `cookies` · `community`)의 스페인어판 `content/es/*.md`가 있고, 정책 페이지 언어 탭이 **KO · EN · ES** 3개다.
- [ ] 정책 문서 3개 언어 모두에 **"번역본과 내용이 다르면 한국어 원문이 우선한다"** 조항이 있다(§9 게이트 3).
- [ ] 사이트맵에 정책 페이지 es 주소가 언어판 묶음으로 들어간다(D-42 갱신).
- [ ] 동의 기록 버전(`CURRENT_POLICY_VERSION = "1.0"`)은 **바뀌지 않는다** — 이미 동의한 팬에게 동의 바가 다시 뜨면 안 된다(§4 R4).
- [ ] 데스크톱(1024·1280·1366·1440) es 동의 바 접힌 높이 실측 보고 — 목표 56px 한 줄(§9 게이트 1).
- [ ] `npx vitest run` · `npx tsc --noEmit` · `npm run check:hex` · `cd functions && npm run build` green · 규칙 무변경 · Console 에러 0.
- [ ] 최종 보고에 "핸드오프와 달랐던 점" + **스페인어 → 한국어 되번역 표**(§9 게이트 2).

## §1 필독 (이 순서로)

1. 결정 원장 — **D-41**(익명 계정 생성 자리 · 건드리지 않음) · **D-42**(사이트맵 hreflang — "정책은 ko·en만"이었던 것을 이번에 es까지로 넓힌다).
2. `outputs/PROMPT_ClaudeCode_COOKIE-1_v1.2_2026-10-05.md` — 직전 작업의 RULE(R1 문구 불변 · R2 동의 전 필수 쿠키만 · R9 통계 게이트). 이번에도 유효하다.
3. `components/policy/CookieBanner.tsx` — 머리말·제목·본문(ko `.cb-body` + en `.cb-body-en`)·'자세히 · Details'·버튼 3개.
4. `components/policy/ConsentModal.tsx` — 카테고리 4개 이름·설명·버튼.
5. `components/policy/LanguageTabs.tsx`(KO/EN 2개 고정) · `components/policy/PolicyHeader.tsx`(`DOC_NAMES` ko/en) · `app/policies/[type]/page.tsx`(ko·en md를 함께 읽어 CSS로 숨김 · `alternates.languages` ko/en).
6. `content/ko/*.md` · `content/en/*.md` — 프론트매터 `version` · `lastUpdated`.
7. `lib/cookieConsent.ts` `CURRENT_POLICY_VERSION`(84) — 정책 문서 프론트매터 `version`과 연결돼 있는지 **먼저 확인**(§6).
8. `app/sitemap.ts` + 사이트맵 테스트(D-42).
9. 기존 화면 문구의 스페인어 사전(`lib/i18n` 등 es 키) — 같은 낱말은 같은 번역으로(용어 일관성).

## §2 실측 (2026-10-05 · main `3f712aa` · 티오 코드 대조)

| # | 현상 | 실물 |
|---|---|---|
| 1 | 동의 바는 화면 언어와 상관없이 ko + en 고정 | `CookieBanner.tsx` — `.cb-body`(ko) + `.cb-body-en`(en), 버튼 "필수만 · Reject non-essential" 등 병기 |
| 2 | 설정 창 스페인어 없음 | `ConsentModal.tsx`에 es 문자열 0 |
| 3 | 정책 문서 ko·en만 | `content/` 아래 `en` · `ko` 폴더만, 각 4개(영어 합계 약 33KB) |
| 4 | 정책 페이지 언어 탭 2개 | `LanguageTabs.tsx` `onPick(next: "ko" \| "en")` · `PolicyHeader.tsx` `DOC_NAMES` ko/en |
| 5 | 정책 페이지 언어판 안내 ko/en | `page.tsx` `alternates.languages` ko·en만 |
| 6 | "번역본 우선 언어" 조항 없음 | 4개 문서 어디에도 없음(이용약관 §11 준거법 = 대한민국 법) |

## §3 스코프

| | 내용 |
|---|---|
| **IN** | ① 동의 바 es 판(스페인어 + 영어 병기) ② 설정 창 es 판 ③ 정책 문서 4개 스페인어판 `content/es/` ④ 정책 페이지 3언어 탭·헤더 이름·언어판 안내 ⑤ 3개 언어 정책 문서에 "한국어 원문 우선" 조항 ⑥ 사이트맵 정책 es 추가(D-42 갱신) ⑦ `cookie_lang_switch`의 from/to에 es 허용 ⑧ 위 모두의 테스트 |
| **OUT** | ko·en 화면의 동의 바·설정 창 문구(한 글자도 바꾸지 않음) · 정책 내용 자체의 변경(조항 추가는 §9 게이트 3의 한 줄뿐) · 동의 카테고리·모달 구조 · `CURRENT_POLICY_VERSION` · `firestore.rules` · 통계 게이트(R9) · 익명 계정 생성 자리(D-41) · 다른 화면의 스페인어 문구 |

## §4 RULE

- **R1 ko·en 문구 불변** — ko·en 화면의 동의 바·설정 창 글자는 지금과 동일. 기존 문구 스냅샷 테스트(`cookieBannerCopy.test.ts`)는 그대로 green이어야 한다.
- **R2 동의 전 필수 쿠키만** — 변함없음.
- **R3 원문 = 한국어** — 스페인어판은 **한국어 원문에서** 번역하고 영어판과 대조한다. 영어판에만 있는 표현을 새로 만들지 않는다.
- **R4 동의 버전 불변** — `CURRENT_POLICY_VERSION`은 "1.0" 그대로. 정책 문서 프론트매터 `version`·`lastUpdated`는 조항 추가에 맞춰 올리되(예: 1.0 → 1.1, 2026-10-05), 그것이 동의 버전을 바꾸거나 동의 바를 다시 띄우면 **STOP**.
- **R5 스페인어 문체** — 중립적인 국제 스페인어(특정 국가 속어 금지). 정책 문서는 `usted` 존대, 버튼·라벨은 동사 원형 등 짧고 중립적으로. 브랜드 원칙: 전투 은유 금지 · 축제·설렘의 언어. 화면 표기 용어(팬/Fan 등)는 기존 es 사전과 같은 낱말.
- **R6 색·크기는 토큰만** — raw hex 금지.
- **R7 무대·배너 불변** — `SplitStage`·`BannerSlot`·`stageLayout` 무변경. COOKIE-1의 여백(`consentBarReserve`)·가로 미룸 동작 유지.

## §5 Phase 분할 (Phase = 커밋 1개 · TDD RED→GREEN)

- **A 동의 바 es** — 테스트 먼저: lang=es일 때 머리말·제목·본문·'자세히'·버튼 3개가 es + en, lang=ko·en일 때 기존 스냅샷과 동일. → 구현. 데스크톱 4폭 높이 실측.
- **B 설정 창 es** — 같은 방식(카테고리 4개 이름·설명·버튼).
- **C 정책 문서 es** — `content/es/{terms,privacy,cookies,community}.md`(프론트매터 `lang: es`). 테스트: 4개 존재 · 프론트매터 필드가 ko/en과 같은 구조 · 제목(H2) 개수가 ko와 같음(누락 방지).
- **D 원문 우선 조항** — 3개 언어 × 4개 문서 같은 위치(문서 머리 안내 블록 권장)에 §9 게이트 3 문장. 프론트매터 `version`·`lastUpdated` 갱신(R4 확인).
- **E 정책 페이지 3언어** — `LanguageTabs` ES 탭 · `PolicyHeader` es 이름 · `page.tsx` es md 로드 · `alternates.languages` es · `?lang=es` 직접 진입 시 es 표시.
- **F 사이트맵** — 정책 4개 × es 언어판 추가 · D-42 테스트 갱신.
- **G 검증·PR** — §7.

## §6 Auto-STOP

- 정책 문서 `version` 갱신이 `CURRENT_POLICY_VERSION`과 연결돼 동의 바를 다시 띄우게 되는 경우 → STOP(R4).
- es 동의 바가 데스크톱 1024 이상에서 한 줄(56px 근처)에 안 들어가는 경우 → 글자를 줄이지 말고 STOP, 실측 높이와 후보안 보고(§9 게이트 1).
- ko·en 문구가 한 글자라도 바뀌어야 하는 경우 → STOP(R1).
- 번역 중 원문(ko)과 영어판의 **뜻이 다른 곳**을 발견한 경우 → 번역은 ko 기준으로 하고, 차이 목록을 보고서 C에 적어라(영어판 수정은 하지 않음).
- `firestore.rules` 변경이 필요해 보이는 경우 → STOP.
- 실물이 §2와 다름 → STOP(근거 + 권장안).

## §7 검증 하네스

| | 무엇 | 통과 기준 |
|---|---|---|
| 기계 | `npx vitest run` · `npx tsc --noEmit` · `npm run check:hex` · `cd functions && npm run build` | green |
| 기계 | `cookieBannerCopy.test.ts`(ko·en 스냅샷) | 변경 없이 green |
| 기계 | es 문구 스냅샷 · 정책 문서 구조 테스트 · 사이트맵 테스트 | green |
| 기계 | `anonCreationSites` · `e2eWiring` · `consentGate` · `consentRace` | green |
| 기계 | E2E 회귀: `d1-auth` · `c1-arena-flow` · `run1-daily-run-limit` · `arena1-split-stage` · `hf3-guest-run` | 100% · 건너뜀 0 |
| 기계 | 새 e2e 파일을 만들면 워크플로에 연결(`e2eWiring`) | green |
| 사람 | 프리뷰 시크릿 창 `/?lang=es`: 동의 바가 스페인어 + 영어 · '자세히'로 펼치면 스페인어 본문 | 대표 확인 |
| 사람 | 프리뷰 `/policies/cookies?lang=es`: 탭 KO·EN·ES, 스페인어 본문, 맨 위 "한국어 원문 우선" 안내 | 대표 확인 |
| 사람 | 프리뷰 시크릿 창 `/?lang=ko`: 동의 바가 오늘과 똑같다 | 대표 확인 |

## §8 PR 본문

A 무엇을 했나 · B 어떻게 확인했나 · C 판단이 필요했던 것(원문·영어판 뜻 차이 목록 포함) · D 핸드오프와 달랐던 점 · **E 스페인어 → 한국어 되번역 표**(동의 바·설정 창 문자열 전부 + 원문 우선 조항 3개 언어 + 정책 문서는 절 제목과 절마다 한 줄 요지) · F 리뷰어 체크리스트.

## §9 승인 게이트

| # | 필요한 것 | 상태 |
|---|---|---|
| 1 | **es 화면 = 스페인어 + 영어 병기** — 동의 바·설정 창에서 한국어 자리를 스페인어로. ko·en 화면은 그대로. *의도*: 스페인어 팬이 자기 언어로 읽되, 영어를 안전망으로 남긴다. *이 결정이 정하지 않는 것*: ko·en 화면 · 동의 바 높이 기준(데스크톱 한 줄 56px 목표는 COOKIE-1 그대로 — 안 되면 §6 STOP) | ✅ 결정 (2026-10-05 대표) |
| 2 | **스페인어 문구 승인 방식** — AI 번역 → 티오가 원문과 교차 검수 → 대표가 **한국어 되번역 표**로 승인. **동의 바·설정 창 문자열은 커밋 전에 표를 보여 주고 승인받아라**(새 화면 문구 · 대표 상시 원칙). 정책 문서 4개는 PR의 되번역 요지 표로 승인. | ✅ 결정 (2026-10-05 대표) |
| 3 | **"한국어 원문 우선" 조항** — 3개 언어 정책 문서 4개 모두에 넣는다. 문장 초안(대표 승인 전 커밋 금지 — 전후 비교 제시): ko "이 문서는 한국어로 작성되었으며, 번역본과 내용이 다를 경우 한국어 원문이 우선합니다." / en "This document was written in Korean. If a translation differs from the Korean original, the Korean original prevails." / es "Este documento fue redactado en coreano. Si una traducción difiere del original en coreano, prevalecerá el original en coreano." 티오는 법률가가 아니다 — 수익화 전 법무 검토(G-LEGAL-1) 때 함께 본다. | ✅ 결정 (2026-10-05 대표) — 문장은 커밋 전 승인 |
| 4 | **범위 = 정책 문서 4개 전부** | ✅ 결정 (2026-10-05 대표) |

## §10 참고 — 경위

COOKIE-1 눈검사(2026-10-05 밤)에서 대표가 "ES에서 동의 바는 한국어와 영어뿐"을 발견했다. COOKIE-1은 문구 불변(R1, 9/20 확정)이라 es **저장**만 열었다. 대표 원칙("언젠가 해야 할 일이면 먼저")에 따라 런칭 전 순서 NAV-1 앞에 넣었다.

*v1.0 · 2026-10-05 · 티오(Cowork)*
