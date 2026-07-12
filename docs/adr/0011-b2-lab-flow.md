# ADR-0011 — B-2: The Lab 생성 플로우 5단계 개편

- **Status**: Accepted (대표 확정 — 2026-07-05 결정 3건 유지 + 2026-07-12 additive title·모델 상수)
- **Context module**: B-2 The Lab (Domain 2) — Tournament 생성 플로우
- **Amends**: `docs/lite-specs/B1-the-lab.md` 의 2-step(제목+카테고리 → AI 48명) 플로우를 5단계로 대체
- **Relates**: `lib/lab/{tournamentDoc,keywordsValidation,deadlineValidation,step1Ready,translateMeta}.ts`, `lib/types/tournament.ts`, `lib/voteErrorCodes.ts`, `functions/src/{aiSuggestKeywords,translateTournamentMeta,aiFillContestants,onVote}.ts`, `functions/src/core/{models,aiFillCore,aiSuggestKeywordsCore,translateTournamentMetaCore,voteErrorCodes,parseContestants}.ts`, `components/admin/lab/*`, `components/layout/Navbar.tsx`

## Context

현재 Lab은 "제목+카테고리 → AI 48명 추천"이 유일한 진행 경로였다. AI 호출이 실패하면
생성 플로우 전체가 차단 — **AI가 단일 장애점**이었다(대표 실사용 2026-07-05). 목표는 AI를
**관문(gate)에서 옵션(helper)으로 강등**하고, 호스트 직접 입력 경로가 항상 열려 있는 5단계
플로우를 만드는 것.

## Decision

### 1. AI = 옵션. STEP 1 다음 게이트는 AI와 무관 (핵심 AC#1)

`isStep1Ready`(순수·테스트) = ①제목 ②카테고리 ④키워드 ⑤Deadline 충족. AI 키워드 생성이
완전히 죽어도 호스트가 키워드를 손으로 타이핑하면 진행된다. STEP 2도 ✏️직접 입력이 항상
가능하고 ✨AI 48/빈칸만은 보조 수단.

### 2. Title 3언어는 additive (가산) — 마이그레이션 아님

`Tournament.title: string`(원문 입력)은 **불변** — Arena/Pitch/Launch/Crown/TournamentList
8곳의 기존 read가 flat string에 의존하므로 객체화하면 스코프 밖 모듈이 회귀한다(Out-of-Scope
§9, AC#9). 대신 `titleI18n:{ko,en,es}` · `description:{ko,en,es}`를 **신규 추가**. 번역은
**저장만** 하고 소비는 각 모듈 몫(키워드와 동일 "store, don't consume" 철학).

### 3. 발행 시 1회 번역 + 실패 시 원문 fallback

호스트는 1개 언어(현재 UI lang)로 입력 → 발행 시 `translateTournamentMeta`(Haiku, 1회 호출)가
미보유 2개 언어 번역 → `titleI18n`/`description` 저장. 번역 실패 시 **발행은 성공**하고 미번역
언어는 원문 fallback(`fallbackMeta`), 관리자 재발행으로 처리. 클라이언트 `translateMeta`가
callable 실패를 catch → fallback.

### 4. 빈칸만 AI = 제외 목록 주입, 부족분만 파싱 (채운 칸 100% 보존)

클라이언트가 `existing`(채운 이름) 배열 전송 → `aiFillCore`가 프롬프트에 제외 목록 주입 +
`48 - existing.length`명만 요청/파싱(`parseAiContestants(text, count)`). 전량 재생성 후 병합
금지. 빈칸 슬롯에만 순서대로 채움.

### 5. 참가 한도 메시지 3언어화 (#12) — 에러 코드 계약

`onVote`의 `resource-exhausted`는 daily_limit / rate_limited 두 상황을 하나의 코드로 던지며
한국어 메시지가 하드코딩되어 en/es Voter에게 한국어가 노출됐다. 이제 서버는
`details.code`(`daily_limit`·`rate_limited`)만 전달하고, 클라이언트 `voteErrorMessageKey`가
i18n 키로 매핑 → Arena 토스트 ko/en/es. 서버·클라 상수는 `functions/`가 root `lib/`를 import
할 수 없으므로(tsconfig `rootDir: src`) **양측 이중 정의 + sync 주석**(repo 선례: Category /
TOTAL_CONTESTANTS / cors).

### 6. 모델 상수 단일화

`functions/src/core/models.ts` — `HAIKU_MODEL='claude-haiku-4-5'`(aiSuggestKeywords·
translateTournamentMeta) · `SONNET_MODEL='claude-sonnet-4-6'`(aiFillContestants 하드코딩도
교체). 이후 모델 교체는 이 파일 한 곳.

### 7. DP-1 결함 정정 — 원본 에러 로깅

`aiFillCore`의 `catch {}`(원본 에러 소실)를 `deps.logError?.(msg, e)` 후 throw로 변경. 실
callable은 `logger.error` 주입.

## Consequences

- **키워드 저장**: Tournament 문서 내 `keywords: string[]`(≤12, 각 ≤30) — 별도 컬렉션·인덱스 없음.
- **Deadline**: Tournament에만(불변 원칙 — Round Deadline 생성 금지). 프리셋 3/7/14일(기본 7),
  과거 거부. 순수 검증은 `deadlineMs`+`nowMs`(주입), 캘러가 `Timestamp.fromMillis` stamp.
- **신규 callable 2종**은 배포·실호출 검증이 대표 몫(ANTHROPIC_API_KEY 바인딩 기존). 미배포
  상태에서도 번역은 fallback으로 publish 성공.
- **역설계 위험 없음**: title 객체화 회피로 Out-of-Scope 모듈 무변경.
