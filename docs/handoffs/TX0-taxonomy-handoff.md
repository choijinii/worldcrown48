# TX-0 — 카테고리 Taxonomy 데이터 전환 (Handoff v2.1)

| 항목 | 값 |
|---|---|
| 모듈 ID | `tx0-taxonomy` |
| 브랜치 | `feat/tx0-taxonomy` |
| 워크트리 | `~/Projects/wc48-tx0` |
| 기준 HEAD | `origin/main` 최신 (**HF-3.1 c58be42 머지 이후** — `git fetch origin` 후 확인) |
| 핸드오프 버전 | **v2.1** |
| 상태 | **kickoff 준비 완료** — §4 매핑표 대표 확정 (2026-07-10) |
| 선행 조건 | 없음 (대개편의 첫 모듈 — B-2·Pitch 개편·Arena 홈이 전부 이 모듈에 의존) |

---

## §0 자가 검증

```bash
pwd                       # → ~/Projects/wc48-tx0
git branch --show-current # → feat/tx0-taxonomy
git fetch origin && git log origin/main --oneline -1
```

**자가 검증 통과 ≠ 작업 권한. "통과, 작업 시작합니다" 통보 후 진행.**

## §0.5 Stack Truth (2026-07-10 확인)

npm · vitest node(`lib/__tests__`, `functions/src/__tests__`) · 컴포넌트 렌더 테스트 금지 · CSS 변수+CSS Modules(Tailwind 없음) · 수제 i18n Context `?lang=`, ko/en/es · E2E spec 경로 명시 · 시드는 E2E spec 내 firebase-admin + `seed-preview.mjs` · 배포는 `--project worldcrown48` 명시.

## §1 Pre-flight
- 필독 메모리: [[project-reorg-ux-decisions-2026-07-10]] [[project-categories-2026-06-20]] [[feedback-firestore-composite-index]] [[feedback-wc48-anime-terminology]] [[feedback-verify-conflicting-specs]]
- 필독 문서: `CLAUDE.md` · `LANGUAGE.md` · `docs/mental-model/MENTAL_MODEL.svg` · `outputs/handoffs-staging/WC48_개편결정_v1_2026-07-10.md`

---

## §2 Module Identity & Goals

**배경 (대표 결정 2026-07-10, 대개편):** 카테고리 체계가 6종 고정(2026-06-20)에서 **3단계 순차 런칭 체계**로 전면 개편됨. 카테고리 추가·숨김·순서 변경이 배포 없이 가능해야 하므로, 코드에 박힌 enum을 Firestore 데이터로 전환한다.

**현재 상태 (2026-07-10 grep 증거):**
- Enum 위치: `lib/types/tournament.ts` L22-31 — `CATEGORIES` tuple(FOOTBALL·KPOP·ANIME·GAMING·MOVIE·OTHER) + `Category` 파생 타입
- 소비자 6곳: `lib/lab/categories.ts`(isValidCategory 런타임 가드) · `components/admin/lab/CategorySelect.tsx`(LABELS+드롭다운) · `functions/src/core/crownCardRecord.ts` · `functions/src/core/aiFillCore.ts` · `functions/scripts/seed-preview.mjs` · 테스트 4파일
- Pitch·Arena는 아직 카테고리 미소비 (A-1은 category 필터 없음) — 전환 파급 없음

**목표:** `categories` Firestore 컬렉션 신설 + 전 소비자를 데이터 기반으로 전환 + 기존 Tournament 이전. 완료 시 카테고리 운영 = 데이터 수정.

## §3 Scope (Work Items)

| # | 영역 | 작업 |
|---|---|---|
| 1 | `categories` 컬렉션 스키마 | 문서: `{ id, name: {ko,en,es}, status: 'hidden'\|'scheduled'\|'live', phase: number, order: number }`. 스키마 검증 순수 함수 `lib/taxonomy/` |
| 2 | 시드 데이터 | 10개 카테고리 등록: KPOP(live·P1) · CREATOR(live·P1) · KDRAMA(scheduled·P2) · ESPORTS(scheduled·P2) · ANIME_WEBTOON(scheduled·P3) · GLOBAL_POP(scheduled·P3) · HOLLYWOOD(scheduled·P3) · FOOTBALL(hidden) · GAMING(hidden·보존) · OTHER(hidden·레거시). ※ 1차 런칭 전까지 Voter 표면 노출은 별도 플래그가 아닌 Pitch 개편 모듈 몫 — TX-0은 데이터만 |
| 3 | `lib/types/tournament.ts` | `CATEGORIES` tuple 제거 → `Category = string` + 데이터 대조 검증으로 전환. `lib/lab/categories.ts`의 `isValidCategory`는 categories 컬렉션 조회(서버) / 프리로드 목록(클라이언트) 대조로 재구현 |
| 4 | `components/admin/lab/CategorySelect.tsx` | 하드코딩 LABELS 제거 → categories 데이터 기반 드롭다운. **운영자 도구이므로 hidden 포함 전 status 표시**(status 라벨 병기) — 2차·3차 콘텐츠 선행 제작 가능해야 함 |
| 5 | `functions/src/core/crownCardRecord.ts` · `aiFillCore.ts` | Category 참조를 데이터 검증 방식으로 갱신 (호출부 계약 유지) |
| 6 | 기존 Tournament 이전 | 이전 스크립트: §4 매핑표 적용, dry-run 출력 후 실행. Production 실행은 대표 확인 후 |
| 7 | `functions/scripts/seed-preview.mjs` | 새 카테고리 ID로 갱신 |
| 8 | `LANGUAGE.md` | ✅ **Category Taxonomy**(카테고리=데이터 원칙) · ✅ **Voter Count**(Tournament 단위 참여 Voter 수 — Vote Count와 별개 개념, 랭킹 외 노출은 임계치 해금 규칙) · ✅ **ANIME & WEBTOON**(상위 카테고리, 하위 태그 ANIME=기존 정의 유지·WEBTOON·MANGA) 등재. 기존 ANIME 정의 변경 금지 (RULE 1) |
| 9 | Firestore rules·인덱스 | categories 읽기 공개·쓰기 admin 한정. 신규 query 패턴 인덱스 점검 ([[feedback-firestore-composite-index]]) |
| 10 | 테스트 | 스키마 검증·status 필터·이전 매핑 단위테스트 + 기존 4개 테스트 파일 갱신 |

## §4 ADR-TX0 (매핑표 대표 확정 — 2026-07-10)

**기존 → 신규 카테고리 매핑 (확정):**

| 기존 | 신규 | 비고 |
|---|---|---|
| FOOTBALL | FOOTBALL (hidden) | 유지·숨김 |
| KPOP | KPOP | 그대로 |
| ANIME | ANIME_WEBTOON | 흡수 |
| GAMING | GAMING (hidden) | **보존·숨김** — 게임 캐릭터 소재는 ESPORTS(프로게이머·팀)와 별개, 추후 카테고리 재활용 여지 (대표 확정) |
| MOVIE | HOLLYWOOD | **흡수** (대표 확정) |
| OTHER | OTHER (hidden) | 레거시 보존용 hidden 항목으로 유지 |

- **카테고리 ID는 영문 대문자 스네이크** (표시명은 name.{ko,en,es})
- **클라이언트 카테고리 목록**: 페이지 로드 시 1회 fetch + 모듈 캐시 (실시간 구독 불필요 — 변경 빈도 낮음)

## §5 Implementation Plan — §11 Superpowers TDD

- **Phase 1:** 스키마 + 검증 순수 함수 (RED→GREEN→COMMIT)
- **Phase 2:** lib 전환 + functions 소비자 갱신 (unit RED→GREEN→COMMIT)
- **Phase 3:** CategorySelect 데이터 기반 전환 + 시드
- **Phase 4:** 이전 스크립트(dry-run) + rules·인덱스 + LANGUAGE.md·lite-spec 갱신
- **Phase D′ (강제):** 시드 → Lab에서 신규 카테고리로 대회 1개 생성·발행 → Arena 진입 → 카테고리 status를 데이터로 바꿔 반영 확인 → cleanup

## §6 Acceptance Criteria

1. 카테고리 추가·숨김·순서 변경이 **배포 없이 categories 문서 수정만으로** 전 화면 반영
2. `CATEGORIES` tuple이 코드베이스에서 완전 제거 (grep 0건)
3. FOOTBALL = hidden 상태로 Lab에서만 보임(운영자), 기존 FOOTBALL 대회는 정상 동작
4. 기존 Tournament 전건 매핑 이전 완료 (dry-run 로그 = 실제 결과)
5. AI Fill·Crown Card·투표 흐름 회귀 없음 (기존 테스트 green)
6. LANGUAGE.md 신규 용어 3건 등재, 기존 용어 정의 변경 0건

## §7 Testing / §8 Edge Cases

- Edge: 존재하지 않는 categoryId로 생성 시도(거부) · hidden 카테고리 대회의 Voter 직접 URL 진입(허용 — 숨김은 탐색 노출만 제어) · 카테고리 0개 fetch 실패 시 Lab 폼 동작
- E2E는 `?lang=ko` 강제 · spec 경로 명시 · 시드 RESET 선행

## §9 Out of Scope

- Pitch 카테고리 섹션 렌더링 (Pitch 개편 모듈)
- Arena 홈·카테고리 nav (Arena 홈 모듈)
- Voter Count 집계·임계치 해금 UI (Pitch 개편 모듈)
- 우측 상설 프레임

## §12 Push 확인 · §13 Branch Alias URL

템플릿 v2.1 (2026-07-10 정정판 — §13 "Vercel 대시보드 커밋 SHA 대조") 그대로.
시각 검증 URL: `https://worldcrown48-git-feat-tx0-taxonomy-choijiniis-projects.vercel.app`

---
*작성: Cowork 대개편 세션 2026-07-10 · 근거: 대개편 UX 결정 + 코드 grep 증거(enum 소비자 6곳) · §4 매핑표 대표 확정 완료(GAMING hidden 보존·MOVIE→HOLLYWOOD) — kickoff 가능*
