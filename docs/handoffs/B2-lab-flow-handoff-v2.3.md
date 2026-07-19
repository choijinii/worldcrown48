# B-2 — The Lab 생성 플로우 5단계 개편 (Handoff v2.3 — kickoff 가능)

| 항목 | 값 |
|---|---|
| 모듈 ID | `b2-lab-flow` |
| 브랜치 | `feat/b2-lab-flow` |
| 워크트리 | `~/Projects/wc48-b2` |
| 기준 HEAD | `origin/main` 최신 (**TX-0 e4a5a00 머지 이후** — `git fetch origin` 후 확인) |
| 핸드오프 버전 | **v2.3** |
| 상태 | **kickoff 가능** — 선행 조건 2개 모두 충족 확인 (2026-07-11) |
| 선행 조건 | ✅ TX-0 머지(e4a5a00)+functions·rules 배포 + 라이브 워크스루 실증 ✅ ANTHROPIC_API_KEY versions/5 바인딩 + **AI Fill 실호출 성공 검증 (2026-07-11 대표 실증 — 프로덕션 Lab에서 48명 채움 확인)** |

---

## §0 자가 검증

```bash
pwd                       # → ~/Projects/wc48-b2
git branch --show-current # → feat/b2-lab-flow
git fetch origin && git log origin/main --oneline -1   # e4a5a00 이후 확인
```

**자가 검증 통과 ≠ 작업 권한. "통과, 작업 시작합니다" 통보 후 진행.**

## §0.5 Stack Truth (2026-07-11 확인)

npm · vitest node(`lib/__tests__`, `functions/src/__tests__`) · 컴포넌트 렌더 테스트 금지 · CSS 변수+CSS Modules(Tailwind 없음) · 수제 i18n Context `?lang=`, ko/en/es · E2E spec 경로 명시 · 시드는 E2E spec 내 firebase-admin + `seed-preview.mjs` · 배포는 `--project worldcrown48` 명시.

## §1 Pre-flight
- 필독 메모리: [[tx0-shipped-2026-07-11]] [[project-reorg-ux-decisions-2026-07-10]] [[project-lab-flow-redesign-2026-07-05]] [[project-dp1-ux-findings-2026-07-05]] [[project-i18n-trilingual-userGen-2026-07-01]] [[project-i18n-content-handoff-2026-07-05]] [[feedback-firestore-composite-index]]
- 필독 문서: `CLAUDE.md`(v2.2) · `LANGUAGE.md`(v1.7 §13) · `docs/mental-model/MENTAL_MODEL.svg` · `docs/handoffs/i18n-content-translation-handoff.md` · `docs/handoffs/TX0-taxonomy-handoff.md` · `docs/lite-specs/TX0-taxonomy.md` · `docs/lite-specs/B1-the-lab.md`

---

## §2 Module Identity & Goals

**문제 (대표 실사용 2026-07-05):** 현재 Lab은 "제목+카테고리 → AI 48명 추천"이 유일한 진행 경로. AI 호출 실패 시 생성 플로우 전체가 차단 — AI가 단일 장애점.

**목표:** AI를 **관문(gate)에서 옵션(helper)으로** 강등. 호스트 직접 입력 경로가 항상 열려 있는 5단계 플로우.

```
STEP 1 페이지: ①제목(필수·50자) ②카테고리(필수 — TX-0 categories 데이터 기반, 운영자는 전 status 선택 가능)
              ③설명(참가 대상 서술 · 선택) ④키워드(필수 — 칩 UI · ✨AI 생성 버튼 + 직접 수정)
              ⑤Tournament Deadline(필수 — 날짜 선택, 기본 프리셋 7일 후) (UX-3)
              ⑥[다음] — ①②④⑤ 충족 시 활성 (AI 성공 여부와 무관)
STEP 2 페이지: 48칸 그리드 — 채우기 4방식 병행
              ✏️직접 입력 · ✨AI 48명 전체 · ✨빈칸만 AI · ✨AI 후 개별 수정
              → 토너먼트 생성 (48/48) → 내 Tournament 리스트 + [Arena에서 보기] CTA
```

**대표 결정 3건 (2026-07-05, 유지):**
1. **키워드 역할 = 3중**: (a) AI 48명 추천 힌트 (b) C-4 뉴스API 검색 키워드 (c) C-5 Fan Intelligence 생성 키워드. 저장까지가 B-2 스코프, 소비는 각 모듈 몫.
2. 이미지 자동 소싱 → **B-3 분리** (Out of Scope).
3. 제목·설명 **생성 시 1회 자동 번역** (ko/en/es, Haiku) → DB 저장. 입력 언어는 아무거나 1개.

**대개편 반영:** 카테고리는 TX-0 산출물(`lib/taxonomy/`·데이터 기반 CategorySelect — 배포 완료) 사용. B-2에서 카테고리 목록·검증 신규 작성 금지.

## §3 Scope (Work Items)

| # | 영역 | 작업 |
|---|---|---|
| 1 | `lib/lab/tournamentDoc.ts` | Tournament 스키마 확장: `description: { ko?, en?, es? }` · `keywords: string[]` (≤12개, 각 ≤30자) · title 3언어 확장 · **deadline 입력 검증(미래 시각 필수)**. 스키마 검증 순수 함수 |
| 2 | `functions/src/aiSuggestKeywords.ts` (신규 callable) | 제목+카테고리+설명 → 키워드 8~12개 생성. Haiku 모델. aiFillContestants의 auth+rate limit 패턴 복제 |
| 3 | `functions/src/aiFillContestants.ts` + `core/aiFillCore.ts` | 입력 확장: `description`·`keywords`·`existing: string[]`(빈칸만 모드). **`catch {}` → 원본 에러 `logger.error` 기록** (DP-1 결함 정정) |
| 4 | `functions/src/translateTournamentMeta.ts` (신규, 또는 publish 경로 통합) | 발행 시 title·description 미보유 언어 Haiku 1회 번역 → 저장 |
| 5 | `components/admin/lab/` | STEP 1 재구성(설명 textarea + 키워드 칩 + AI 생성 버튼 + **Deadline 날짜 선택기**) · STEP 2 채우기 4방식 툴바 · `TournamentList`에 "Arena에서 보기" 링크(`/arena/{id}`) |
| 6 | **Navbar Locker Room 복원** (UX-1) | 비활성 Locker Room 버튼 → `/account` 라이브 링크 복원 (DP-1 발견: 기능은 라이브인데 버튼만 stale) |
| 7 | **배너 카피 오탈** 편승 | `lib/i18n/messages.ts` L187 `"이 Tournament은"` → `"이 Tournament는"` |
| 8 | i18n 키 | 신규 UI 문구 ko/en/es 3언어 |
| 9 | `docs/lite-specs/B1-the-lab.md` | 새 플로우로 갱신 + Domain 2 wireframe 정합 확인 ([[feedback-verify-conflicting-specs]]) + 상단 대개편 정합성 배너 해소 |
| 10 | `LANGUAGE.md` | ✅ **Tournament Keywords** 용어 등재 (❌ 태그·해시태그 금지) |
| 11 | 테스트 | 스키마·키워드·deadline 검증·빈칸만 병합 단위테스트 + Lab E2E 갱신 |
| 12 | **★v2.3 편승 — 참가 한도 메시지 3언어화** | `functions/src/onVote.ts` L165의 `resource-exhausted` 메시지가 **한국어 하드코딩** ("오늘 참가할 수 있는 Tournament를 모두 사용했어요 (5/5)") → en/es 사용자에게도 한국어 노출. **서버는 에러 코드·details(예: `daily_limit`)로 구분값만 전달, 클라이언트 토스트가 i18n 키(ko/en/es)로 매핑**하도록 전환 (Phase D′ 워크스루 중 발견 2026-07-11) |

## §4 ADR-B2 후보 (구현자가 확정 기록)

- **키워드 저장**: Tournament 문서 內 배열 (별도 컬렉션 X, 신규 인덱스 불필요)
- **빈칸만 AI**: 클라이언트가 `existing` 배열 전송 → 프롬프트 "제외 목록" 주입 → 부족분만 파싱. 전량 재생성 후 병합 금지(채운 칸 보존)
- **번역 실패 시**: 발행 성공 + 미번역 언어는 원문 fallback, 관리자 재발행으로 처리
- **Deadline 기본 프리셋**: 생성 시점 +7일(프리셋 칩: 3일/7일/14일 + 직접 선택). Round Deadline 개념 생성 금지 — Deadline은 Tournament에만 (불변 원칙)
- **에러 코드 계약(#12)**: 서버 HttpsError의 `details.code` 값 목록을 lib에 상수화 — 클라이언트·서버가 같은 소스 공유

## §5 Implementation Plan — §11 Superpowers TDD

- **Phase 1:** 스키마 확장 + 검증 순수 함수 — deadline 포함 (RED→GREEN→COMMIT)
- **Phase 2:** `aiSuggestKeywords` callable + aiFillCore 입력 확장·에러 로깅 + **onVote 에러 코드 전환(#12)** (unit RED→GREEN→COMMIT)
- **Phase 3:** STEP 1 UI 재구성 — 다음 버튼 활성 로직은 `lib/lab/`로 추출해 단위테스트
- **Phase 4:** STEP 2 채우기 4방식 + TournamentList Arena 링크 + Navbar 복원 + 오탈 수정
- **Phase 5:** 발행 시 번역 + E2E + 스펙·LANGUAGE 갱신
- **Phase D′ (강제):** 시드 → AI 없이 직접 입력만으로 발행 1회 + AI 경로로 발행 1회 → 두 대회 Arena 진입 → Navbar Locker Room 클릭 → 한/영 토글 → **?lang=en에서 참가 한도 초과 토스트 영어 확인(#12)** → cleanup

## §6 Acceptance Criteria

1. **AI가 완전히 죽어 있어도** 제목+카테고리+키워드 직접 입력+Deadline+직접 입력 48명만으로 발행 성공 (단일 장애점 제거 — 핵심 AC)
2. 키워드 AI 생성: 8~12개 제안, 추가·삭제·수정 가능. **최소 1개 없으면 다음 비활성** — 단 AI 실패 시에도 직접 타이핑으로 충족 가능 (AC#1 양립)
3. 빈칸만 AI: 기존 채운 칸 100% 보존 + 중복 이름 0
4. 발행 문서에 `keywords[]` + title·description 3언어 + 유효한 deadline 존재
5. 내 Tournament 리스트에서 Arena로 1클릭 진입 + **Navbar에서 Locker Room(/account) 진입 가능**
6. AI 실패 시 토스트에 원인 구분(인증/한도/기타) + 서버 로그에 원본 에러 기록
7. 카테고리 선택지가 categories 데이터와 일치 (하드코딩 목록 재도입 금지)
8. **참가 한도 초과 안내가 ?lang=ko/en/es 각 언어로 표시** (#12 — 서버 메시지 하드코딩 제거 확인)
9. 기존 불변 원칙 회귀 없음 (Crown Gold만·FIFA 금지·Vote Count 금지·Round Deadline 없음)

## §7 Testing / §8 Edge Cases

- Edge: 키워드 0개로 AI 전체 추천(제목·설명만) · 47칸 채우고 빈칸만 AI(1명 요청) · 같은 이름 대소문자 중복 · es 긴 단어 칩 overflow · **과거 날짜 deadline 입력(거부)** · 데스크탑 가드(≥1440) 유지 · **한도 5/5 상태에서 6번째 대회 투표 시도(3언어 토스트)**
- E2E는 `?lang=ko` 강제 · spec 경로 명시 · 시드 RESET 선행

## §9 Out of Scope

- **TX-0 영역**: categories 스키마·검증·CategorySelect 자체 수정 (완료·배포됨)
- **우측 상설 프레임(뉴스뷰·배너)**: Pitch 개편 모듈에서 글로벌 컴포넌트로 제작 후 Lab 적용
- **Crown Card 관련 일체**: 기존 페이지 방식 유지 확정 (2026-07-11), 재도전 기능은 미결(대표 답변 대기)
- **B-3**: 이미지 자동 소싱
- **MVP2**: 일반 유저 모바일 생성 플로우
- C-4·C-5의 키워드 실제 소비 로직

## §12 Push 확인 · §13 Branch Alias URL

템플릿 v2.1 (2026-07-10 정정판 — §13 "Vercel 대시보드 커밋 SHA 대조") 그대로.
시각 검증 URL: `https://worldcrown48-git-feat-b2-lab-flow-choijiniis-projects.vercel.app`

---
## 변경 이력
- **v2.3 (2026-07-11, TX-0 Phase D′ 직후):** 선행 조건 2개 충족 확인(kickoff 가능 전환) · **#12 참가 한도 메시지 3언어화 편승 추가**(onVote.ts ko 하드코딩 발견) · AC#8·Edge·Phase 2/D′ 반영 · 필독 문서에 TX0 산출물 추가 · ※ v2.2 파일이 스테이징 정리로 유실되어 동일 내용 기반 재생성
- v2.2 (2026-07-10): Taxonomy 연동 · UX-1 Navbar 복원 · UX-3 Deadline 폼 · 배너 오탈 편승 · 우측 프레임 Out of Scope
- v2.1 (2026-07-05, DP-1 세션): 초안
