# Lite Spec — TX-0 · Category Taxonomy (카테고리 데이터 전환)

> 진실 우선순위: `MENTAL_MODEL.svg` ≥ `VERIFICATION_DISCIPLINE.md` > `CLAUDE.md v2.2` > `LANGUAGE.md v1.7 §13` > 이 문서.
> 근거: `docs/handoffs/TX0-taxonomy-handoff.md` (v2.1) · `outputs/handoffs-staging/WC48_개편결정_v1_2026-07-10.md` (v1.2).

---

## ⛔ 절대 규칙

```
✅ 카테고리 = Firestore `categories` 컬렉션 데이터  (❌ 코드 enum / CATEGORIES tuple)
✅ Category (타입) = string (카테고리 id)            (❌ 6-값 union)
✅ 유효성 = 로드된 id 목록 대조(데이터 기반)         (❌ 하드코딩 tuple 대조)
✅ 카테고리 id = UPPER_SNAKE · 표시명 = name.{ko,en,es}
✅ 추가·숨김·순서 변경 = 데이터 수정(배포 없음)
```

---

## 스키마 — `categories/{id}`

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string (UPPER_SNAKE) | 카테고리 id (= 문서 id) |
| `name` | `{ ko, en, es }` | 로케일 표시명 (3종 필수, §10 i18n) |
| `status` | `'hidden' \| 'scheduled' \| 'live'` | 런칭 상태 |
| `phase` | number | 순차 런칭 단계 (0 = hidden 보존, 1·2·3 = 1·2·3차) |
| `order` | number | 표시 정렬 순서 |

순수 검증·헬퍼: `lib/taxonomy/category.ts`
(`validateCategoryDoc` · `isValidCategoryId(value, validIds)` · `selectCategories(cats, statuses)` · `categoryIds`).
클라이언트 로더: `lib/taxonomy/loadCategories.ts` (페이지 로드 1회 fetch + 모듈 캐시, where/orderBy 없음 → 복합 인덱스 불필요).

---

## 시드 데이터 (10종, 3단계 런칭 — `functions/scripts/seed-categories.mjs`)

| 단계 | id | status | phase |
|---|---|---|---|
| 1차 | `KPOP` · `CREATOR` | live | 1 |
| 2차 | `KDRAMA` · `ESPORTS` | scheduled | 2 |
| 3차 | `ANIME_WEBTOON` · `GLOBAL_POP` · `HOLLYWOOD` | scheduled | 3 |
| 보존 | `FOOTBALL` · `GAMING` · `OTHER` | hidden | 0 |

> Voter 표면 노출(어떤 status를 어디에 보이는가)은 Pitch/Arena 개편 모듈 몫. TX-0은 **데이터만** 심는다.

---

## 이전(마이그레이션) — §4 매핑표 (⛔ 대표 확정, 고정)

| 기존 | 신규 | 비고 |
|---|---|---|
| FOOTBALL | FOOTBALL | 유지·숨김 |
| KPOP | KPOP | 그대로 |
| ANIME | ANIME_WEBTOON | 흡수 |
| GAMING | GAMING | 보존·숨김 |
| MOVIE | HOLLYWOOD | 흡수 |
| OTHER | OTHER | 레거시 보존 |

스크립트: `functions/scripts/migrate-categories.mjs` — **dry-run 기본**, `--apply`로 실행,
`NODE_ENV=production`에서 `--apply` **하드 거부**(Production 이전은 대표 확정 후 통제된 실행). 매핑 불가 카테고리는 절대 자동 기록하지 않고 dry-run에 노출.
순수 계획: `functions/scripts/migrate-categories.lib.mjs` (`planCategoryMigration`).

---

## 보안 규칙 (`firestore.rules`)

```
match /categories/{categoryId} {
  allow read: if true;                                       // 공개 참조 데이터(PII 없음)
  allow write: if request.auth != null
               && request.auth.token.admin == true;          // 시드/마이그레이션(admin SDK) · 미래 admin UI
}
```
테스트: `tests/rules/categories.rules.test.ts` (emulator, `npm run test:rules`, Java 21).

---

## 소비자 계약

| 위치 | 검증 방식 |
|---|---|
| `buildTournamentDoc(input, validCategoryIds)` | **권위 있는** id 멤버십 검증 (생성 시점) — 잘못된 카테고리는 발행 불가 |
| `CategorySelect` (운영자) | 전 status 표시(hidden 포함) + status 라벨 병기 |
| `AiFillButton` | `isValidCategory(category, validCategoryIds)` 게이트 |
| `functions` `aiFillCore` · `crownCardRecord` | shape 검증(비어있지 않은 문자열)만 — 카테고리는 검증된 Tournament doc/프롬프트용, 시그니처 불변 |

---

## 범위 밖 (다른 모듈)

- Pitch 카테고리 섹션 렌더링 · status 기반 Voter 노출
- Arena 홈·카테고리 nav
- Voter Count 집계·임계치 해금 UI
