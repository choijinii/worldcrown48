# WorldCrown48 — 단일 진실(SST) 정합성 감사 보고서

**감사일:** 2026-05-25
**범위:** 활성 문서 35개 전수 정독 (`_archive/` 구버전·백업 제외)
**감사 수행:** Claude (Cowork) — 1차 핵심 9개 + 2차 26개

---

## 1. 요약

WorldCrown48 문서 체계를 전수 점검한 결과 **총 37건의 정합성 충돌**을 확인했습니다.

먼저 좋은 소식 — **핵심 용어는 견고합니다.** Contestant·Match·Voter·Champion·Crown Card·Tournament Deadline·advanceRound, "Round에는 Deadline이 없다", "THE FINAL = 3명 중 1명 선택" 같은 정의는 35개 문서 전부에서 일치합니다. `LANGUAGE.md`의 IMMUTABLE TERMINOLOGY RULE이 성공적으로 작동하고 있습니다.

문제는 용어가 아니라 **용어 바깥의 단일 진실**입니다. 같은 사실(프레임워크·색상·DB 스키마)이 여러 문서에 복사되어 있고, 한쪽만 갱신되면서 나머지가 거짓이 된 구조적 문제입니다. 이것이 UI를 여러 번 다시 만들게 된 직접 원인으로 보입니다.

| 심각도 | 건수 | 의미 |
|--------|------|------|
| 🔴 치명적 | 17 | UI·코드를 다시 만들게 만드는 충돌 |
| 🟠 높음 | 11 | 코드 혼선·재작업 유발 |
| 🟡 중간 | 9 | 문서 위생 정리 필요 |

> **Claude Design 핸드오프 전에 최소한 🔴 치명적 17건은 반드시 해소해야 합니다.**

---

## 해결 현황 (2026-05-25 갱신)

| 항목 | 상태 |
|------|------|
| C3~C14 · 디자인 토큰 — 금지색 제거 + 로고 v3.0 팔레트 정합 | ✅ 해결 — 전 활성 문서 검증 완료 |
| C15~C17 · 폐기된 "AI GENERATED" 배지 | ✅ 해결 — "● AI-Report"로 통일 |
| C1~C2 · 프레임워크 분열 (Vite vs Next.js) | ⚠️ 부분 — 구버전 문서에 정정 배너 부착 (전체 재작성 미착수) |
| 🟠 높음 H1~H11 — DB 스키마·라우팅·'FIFA' 값 등 | ⏳ 미착수 — Phase 2 |
| 🟡 중간 M1~M9 — 문서 지도·버전 표기 등 | ⏳ 미착수 — Phase 3 (일부 SST 참조는 정정됨) |

**디자인 토큰 단일 진실:** 색·폰트 토큰 값은 이제 `docs/design/colors_and_type.css` 한 곳이며, 로고 v3.0 팔레트(gold `#FCD006` 등)에 정합됨. 구버전 `PRD-MVP1_v2_1.md`는 `_archive/planning/`로 이동.

---

## 2. 🔴 치명적 (17건)

### 2-1. 프레임워크 분열

| # | 충돌 | 근거 |
|---|------|------|
| C1 | lite-specs와 마스터 문서의 프레임워크가 다름 | 마스터(CLAUDE·CONTEXT·ARCHITECTURE·CODING_CONTEXT·PRD·v4.9·WORKFLOW·ProjectSkill) = **Next.js 14 App Router**. lite-specs `00-foundation·A1·B1·C1·D1·E1`(+A0·C4) = **Vite + React Router v6 SPA** (`import.meta.env.VITE_*`, 포트 5173, `index.html` 리라이트). lite-specs `G1·C3`만 Next.js. |
| C2 | `docs/design/Cinematic Landing Page Builder.md`가 다른 스택 | `npm create vite` + React 19 명시. Domain 0 가이드로 연결돼 있어 잘못된 스택이 유입됨. |

### 2-2. 디자인 토큰 — 금지된 구버전 색 잔존

v2.2 "Twilight Stadium" 팔레트가 현행. 폐기된 v1 색(`#05070A` `#0A0D12` `#F8FAFC` `#30363D` `#8B949E` `#FAFBFC` `#0E1217`)이 다음 문서에 살아 있음:

| # | 위치 | 내용 |
|---|------|------|
| C3 | `WorldCrown48_ARCHITECTURE.md` | 디자인 토큰 섹션·에이전트 임무 템플릿이 `#05070A`·`#F8FAFC` 사용 |
| C4 | `docs/planning/WorldCrown48_v4_9.md` §3.2 | 토큰 블록 전체가 v1 색. §3.3 템플릿도 동일 |
| C5 | `docs/lite-specs/A0-launch-pad.md` | `bg-wc-bg-deep: #05070A` |
| C6 | `docs/lite-specs/C2-crown-card.md` | Canvas에 `#05070A`·`#F8FAFC`·`#8B949E` 하드코딩 |
| C7 | `docs/lite-specs/E1-policy-hub.md` | `#FAFBFC`·`#64748B` |
| C8 | `docs/lite-specs/G1-admin-dashboard.md` | `bg-wc-bg-light: #FAFBFC` |

### 2-3. 디자인 토큰 — 같은 토큰, 다른 값

| # | 토큰 | 충돌하는 값 |
|---|------|-------------|
| C9 | `bg-soft` (카드 배경) | `#1E1E7A` (DESIGN_BRIEF·lite-specs·SKILL) ↔ `#1E1E48` (CONTEXT) |
| C10 | `text-light` | `#1A1A2E` (DESIGN_BRIEF·SKILL) ↔ `#141466` (CONTEXT) |
| C11 | `bg-elevated` | `#334066` (디자인 시스템·Stitch) ↔ `#1A1A70` (lite-specs) |
| C12 | `border` | `#2A2D6B` (기준) ↔ `#2A3A66` (docs/design/README) |
| C13 | 디자인 토큰 SST에 값이 없음 | `WC48_DESIGN_SYSTEM_v2.2.md`가 SST로 선언됐으나 실제 색 값을 담지 않고 v2.1·`colors_and_type.css`로 떠넘김 |
| C14 | `docs/design/README.md` 전체가 v2.1 | 스스로 v2.1로 선언, `reference/`의 구버전을 라이브 소스로 취급 |

### 2-4. 폐기된 "AI GENERATED" 배지 잔존

불변 원칙상 "AI GENERATED"는 완전 폐기, "● AI-Report"로 통일. 그러나:

| # | 위치 |
|---|------|
| C15 | `docs/PRD-MVP1_v2_1.md` — §4-5·§9·§6-4 세 곳 |
| C16 | `docs/lite-specs/C2-crown-card.md` — Canvas에 `ctx.fillText('AI GENERATED', ...)` 하드코딩 |
| C17 | `docs/design/README.md` — 3곳, "mandatory badge"로 명시 |

---

## 3. 🟠 높음 (11건)

| # | 충돌 | 내용 |
|---|------|------|
| H1 | 컬렉션 명명법 | camelCase(`rankingCache` — LANGUAGE.md·PRD) ↔ snake_case(`ranking_cache` — ARCHITECTURE·CODING_CONTEXT·v4.9·lite-specs 전체) |
| H2 | Tournament status enum | 6종(LANGUAGE.md·PRD) ↔ 3종 `draft/active/closed`(lite-specs·v4.9·ARCHITECTURE) ↔ 5종(디자인 v2.2) |
| H3 | `category` 값에 'FIFA' | 금지어 'FIFA'를 enum 값으로 사용 — B1·G1·v4.9·ARCHITECTURE·CODING_CONTEXT. PRD만 `'football'`. 디자인은 'FOOTBALL' 표시 지시 |
| H4 | `tournamentType`·`entryUnit` 필드 | CODING_CONTEXT·v4.9·LANGUAGE.md에는 있고, lite-specs·PRD·ARCHITECTURE에는 없음 |
| H5 | Tournament 스키마 중복 정의 | 약 6개 문서에 각각 정의, `settings` 필드 수 3개↔4개 등 상이 |
| H6 | `winnerId` ↔ `contestantId` | votes 필드명 — PRD·ProjectSkill은 `winnerId`, v4.9·C1·C3·LANGUAGE.md는 `contestantId`(C1은 winnerId 명시 금지) |
| H7 | `order` ↔ `seed` | Contestant 배치 필드명 — B1·PRD는 `order`, v4.9는 `seed` |
| H8 | 라우팅 — The Pitch | `/` (대부분) ↔ `/home` (CODING_CONTEXT) |
| H9 | 라우팅 — Policy Hub | `/policies` (대부분) ↔ `/policy` (CODING_CONTEXT) |
| H10 | 라우팅 — Admin | `/admin` (LANGUAGE.md·PRD·v4.9·ProjectSkill) ↔ `/admin/dashboard` (G1·CODING_CONTEXT) |
| H11 | i18n 로케일 경로 누락 | ProjectSkill·v4.9는 `/ko/ /en/ /es/` 접두 경로 의무화, lite-specs 라우팅은 로케일 세그먼트 누락 |

---

## 4. 🟡 중간 (9건)

| # | 충돌 | 내용 |
|---|------|------|
| M1 | 불변 원칙 번호 불일치 | CLAUDE.md=8개, CONTEXT=10개, PRD=6행(무번호), v4.9=3대 원칙 — "원칙 #N" 상호 참조가 깨짐 |
| M2 | 문서 지도 4종 불일치 | CLAUDE.md 표·DESIGN_BRIEF 3-tier·CONTEXT 역할목록·WC48_WORKFLOW 우선순위가 서로 다름. WORKFLOW 우선순위는 CLAUDE.md·DESIGN_BRIEF를 누락하고 ProjectSkill 자체 선언과도 모순 |
| M3 | 낡은 `LANGUAGE.md v1.2` 참조 | 실제 v1.4. CONTEXT·CODING_CONTEXT·ProjectSkill·WC48_WORKFLOW·FAN_INTELLIGENCE·SKILL.md가 v1.2를 가리킴 |
| M4 | 파일 내부 버전 모순 | CONTEXT(머리말 v0.6 ↔ 본문 "v0.5"), DESIGN_BRIEF(머리말 v1.1 ↔ 꼬리말 v1.0), PRD(제목 v2.1 ↔ 본문 v2.2 인용), ProjectSkill(v1.8인데 구조 블록에 CLAUDE v1.1·LANGUAGE v1.2 기재) |
| M5 | 존재하지 않는 파일 참조 | `WC48_SVG_GUIDE.md`(CONTEXT·WORKFLOW), `WorldCrown48_PolicyHub_v1_0.html`(v4.9), `DesignDocSkill_v1.0`(PRD) |
| M6 | `GIT_WORKFLOW.md` 낡은 투표 정책 | 예시 커밋 메시지에 "5회→1회" 기재 — 확정 정책 "1일 5회"와 모순 |
| M7 | "48명" vs "48개" | CONTEXT·ARCHITECTURE·B1·PRD에 "48명" 잔존 — LANGUAGE.md v1.4는 "48개" |
| M8 | "24 rounds" 오표기 | docs/design/README·Stitch SKILL이 "24 rounds"라 표기 — 실제 5 라운드(48강~결승), 24는 1라운드 Match 수 |
| M9 | README "Round X/24" 글로벌 진행바 | SKILL.md가 명시적으로 금지한 패턴을 README가 사용 |

---

## 5. 권장 단일 진실(SST) 지도

원칙: **각 사실은 정확히 한 문서에만 산다. 나머지는 "그 문서를 보라"고 가리키기만 한다.** (용어를 LANGUAGE.md 하나로 모은 방식이 성공했으므로 동일 원리를 확장.)

| 진실의 종류 | 단일 진실(SST) | 나머지 문서가 할 일 |
|-------------|----------------|----------------------|
| 용어 | `LANGUAGE.md` | "LANGUAGE.md 참조"만 — 현행 유지 |
| 디자인 토큰(색·폰트) | `docs/design/colors_and_type.css` (실제 값 보유) | v2.2 문서·DESIGN_BRIEF·CONTEXT는 값 복사 삭제, 참조만 |
| DB 스키마 | `types/index.ts` (코드 자체가 진실) | 모든 문서는 스키마 값 복사 삭제, 참조만 |
| 프레임워크·폴더·라우팅 | `WorldCrown48_ARCHITECTURE.md` 한 곳 | lite-specs는 중복 정의 삭제, 참조만 |
| 작업 순서 | `WC48_WORKFLOW.md` | 현행 유지 |
| 문서 지도 | `CLAUDE.md` 한 곳 | DESIGN_BRIEF·CONTEXT의 중복 지도 삭제 |

---

## 6. 권장 수정 로드맵

**Phase 1 — 핸드오프 차단 해제 (🔴 치명적 17건)**
프레임워크를 Next.js 14로 공식 확정하고 lite-specs 6종을 갱신하거나 "구버전"으로 표시. 금지색을 전 문서에서 제거(특히 C2 Crown Card Canvas). "AI GENERATED"를 전 문서에서 제거(특히 C2 Canvas). → Claude Design 핸드오프는 이 단계 완료 후 진행.

**Phase 2 — 코드 정합성 (🟠 높음 11건)**
DB 스키마를 `types/index.ts`로 단일화, 컬렉션 명명법·status enum 통일, `category` 'FIFA'→'football', `winnerId`→`contestantId`, 라우팅 경로 통일.

**Phase 3 — 문서 위생 (🟡 중간 9건)**
문서 지도를 1개로, 버전 표기 정정, 낡은 상호 참조 갱신, 존재하지 않는 파일 참조 제거.

**Phase 4 — 검증**
수정 후 재감사로 잔여 충돌 0 확인.

---

## 부록 — 점검한 문서 (35)

**1차 (9):** CLAUDE.md · DESIGN_BRIEF.md · LANGUAGE.md · CONTEXT_v0_6.md · docs/design/WC48_DESIGN_SYSTEM_v2.2.md · WorldCrown48_ARCHITECTURE.md · WC48_CODING_CONTEXT_v1.md · docs/lite-specs/00-foundation.md · docs/lite-specs/A1-the-pitch.md

**2차 (26):** WC48_WORKFLOW.md · WorldCrown48_ProjectSkill_v1_8.md · GIT_WORKFLOW.md · docs/CODING_GUIDELINES.md · docs/PRD-MVP1_v2_1.md · docs/planning/WorldCrown48_v4_9.md · docs/lite-specs(A0·B1·C1·C2·C3·C4·D1·E1·G1·RENAME_GUIDE) · WC48_FAN_INTELLIGENCE_v1_0.md · docs/design(SKILL.md·README.md·WC48_Stitch_DesignSpec_v1.0.md·Cinematic Landing Page Builder.md) · docs/i18n/I18N_POLICY.md · docs/agents(AGENT_TEAM·issue-tracker·triage-labels·domain)

**제외:** `_archive/` (구버전), `docs/agents/CONTEXT_backup_v0.1.md` (백업)

*감사 수행: Claude (Cowork) | 2026-05-25 | 본 보고서는 마스터 문서가 아닌 1회성 감사 산출물입니다.*
