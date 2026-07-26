# ND-1 — News Desk 뉴스 팩토리 (Handoff v1.0 — kickoff 가능)

| 항목 | 값 |
|---|---|
| 모듈 ID | `nd1-news-desk` |
| 브랜치 | `feat/nd1-news-desk` |
| 워크트리 | `~/Projects/wc48-nd1` |
| 기준 HEAD | `origin/main` 최신 (**86d2264 「docs: 미디어 피벗·News Desk 세션 산출물 박제」 이후** — ⚠️ 대표가 `git push origin main` 완료한 뒤 kickoff. predeploy 가드가 로컬≠GitHub main이면 배포 차단) |
| 핸드오프 버전 | **v1.0** (템플릿 v2.1 준거) |
| 상태 | **kickoff 가능** — 샘플 v3 기준본 승인 완료 (2026-07-26), 저작권 상담 답변과 무관하게 진행 가능 |
| 전략 맥락 | 인터넷신문사업자 등록(대구시청)의 전제 = 자체 기사 축적. News Desk는 뉴스 팩토리 1호 모듈이자 등록 심사용 실증 시스템 |

---

## §0 자가 검증

```bash
pwd                       # → ~/Projects/wc48-nd1
git branch --show-current # → feat/nd1-news-desk
git fetch origin && git log origin/main --oneline -1   # 86d2264 이후 확인
```

**자가 검증 통과 ≠ 작업 권한. "통과, 작업 시작합니다" 통보 후 진행.**

## §0.5 Stack Truth (2026-07-26 grep 재확인)

npm · vitest `environment: node`(`lib/__tests__`, `functions/src/__tests__`) · React 컴포넌트 렌더 테스트 금지(전례 0 — 로직은 `lib/`로 추출해 순수 단위테스트, UI는 Playwright E2E) · CSS 변수(`app/globals.css`)+CSS Modules(Tailwind·shadcn 없음) · 수제 i18n Context `lib/i18n.tsx` + `?lang=`, ko/en/es · Cloud Functions v2, region **asia-northeast3** · 크론 전례 = `functions/src/scheduleRankingCache.ts`(`onSchedule`, every 60 minutes) · Firestore 트리거 전례 = `functions/src/onChampionConfirmed.ts`(`onDocumentUpdated`) · 번역 코어 = `functions/src/core/translateTournamentMetaCore.ts`(**Option A: 언어별 개별 Haiku 호출 + `logError`**) · 시드는 E2E spec 내 firebase-admin + `functions/scripts/seed-preview.mjs` · 배포는 `--project worldcrown48` 명시.

## §1 Pre-flight

- 필독 메모리: [[news-desk-2026-07-22]] [[media-pivot-2026-07-21]] [[festival-language-not-battle]] [[reorg-ux-decisions-2026-07-10]] [[feedback-complete-prompts-for-claude-code]] [[feedback-stale-deploy-recurrence-guard]]
- 필독 문서: `CLAUDE.md`(v2.2) · `LANGUAGE.md`(v1.7 §13) · `outputs/handoffs-staging/WC48_미디어피벗결정_v0.1_2026-07-21.md`(§6 타임라인·스왑 구조) · **기준본 `outputs/news-samples/WC48_news-sample_tournament-open_v3_2026-07-24.html`**(승인 완료 — 기사 지면·AI-Report v2.5의 시각 진실) · `docs/demos/WC48_embed_demo_v1.html`(임베드 파사드 데모) · `docs/design/WC48_DESIGN_SYSTEM_v2.3.md`

---

## §2 Module Identity & Goals

**문제:** 인터넷신문 등록 심사에는 실제 돌아가는 뉴스 시스템 + 자체 기사 축적(2~4주, 주 2~3건)이 선행되어야 한다. 현재 repo에는 `/news`도, 기사 데이터 모델도, 초안 생성 경로도 없다.

**목표 (한 줄):** 대표(발행인)가 `/admin/newsdesk`에서 AI 초안을 검토·편집·승인하면 `/news`와 우측 뉴스뷰에 3언어 기사가 발행되는, **승인제 뉴스 팩토리**를 프로덕션에 세운다.

```
[자동 초안 3경로]                          [발행인 승인제]              [노출 2면]
① 이벤트: Tournament 오픈 → 오픈 기사 초안   /admin/newsdesk           /news 목록
② 이벤트: Champion 확정 → 결과 기사 초안  →  초안 대기함 → 3언어 편집  →  /news/[slug] 기사(고유 URL)
③ 크론: 매주 금 12:00 KST → 주간 랭킹 초안   → 근거 스냅샷 대조 → 발행    우측 뉴스뷰 NewsRail(임시 마운트)
④ 수동: 주제 입력 → AI 초안 / 백지 작성
```

**절대 규칙: 어떤 경로도 자동 발행하지 않는다. 트리거·크론·callable은 `draft` 생성까지만. `published` 전환은 /admin/newsdesk의 대표 조작만 가능.**

## §3 Scope (Work Items)

| # | 영역 | 작업 |
|---|---|---|
| 1 | `lib/news/articleDoc.ts` (신규) | `news` 컬렉션 스키마 + 검증 순수 함수. 필드: `slug`(고유·불변) · `template: 'open'\|'result'\|'weekly'\|'column'` · `status: 'draft'\|'published'\|'archived'` · `title/subhead/body` 3언어(`{ko,en,es}`) · **`body`는 구조화 블록 배열**(§4 ADR) · `evidence`(근거 데이터 스냅샷: 수치 표 + 기준시각) · `tournamentId?` · `createdAt/publishedAt` · `origin: 'event_open'\|'event_champion'\|'cron_weekly'\|'manual_ai'\|'manual_blank'` |
| 2 | `functions/src/core/newsDigestCore.ts` (신규) | 뉴스용 집계 순수 함수 — 기존 `ranking_cache`(`scheduleRankingCacheCore`·`rankingAggregator`) 산출물을 입력으로 받아 기사 근거 수치(참가 규모·라운드 진행·주간 동향)로 요약. **집계 로직 신규 발명 금지 — 기존 캐시 재활용** |
| 3 | `functions/src/core/newsPrompts.ts` (신규) | 기사 템플릿 프롬프트 4종(오픈·결과·주간 랭킹·자유 칼럼). **§5.5의 작성 지침 5개 + 금지어를 시스템 프롬프트에 그대로 박제.** 출력 = 구조화 블록 JSON(제목·부제·본문·수치 텍스트까지 — 지면 디자인은 렌더러 몫) |
| 4 | `functions/src/generateNewsDraft.ts` (신규 callable) | admin 전용(`requireAdmin` 패턴). 입력: 템플릿 종류(+수동은 주제 텍스트) → newsDigestCore 근거 수집 → Haiku 초안 → `draft` 저장. **rate limit 20건/KST일**(`participation.ts`의 KST 일 카운트 패턴 복제) |
| 5 | `functions/src/core/translateArticleCore.ts` (신규) | `translateTournamentMetaCore`의 **Option A 패턴 복제**(언어별 개별 호출 + 실패 언어만 원문 fallback + `logError`). 기사 title/subhead/body 블록 텍스트 대상 |
| 6 | 이벤트 트리거 2종 (신규 파일) | `functions/src/onTournamentOpened.ts` — tournaments `onDocumentCreated`(Lab 발행 = status 'active' 생성) → 오픈 기사 draft. `functions/src/onChampionForNews.ts` — champion 확정 false→true 엣지 → 결과 기사 draft. **기존 `onChampionConfirmed.ts`(Crown Card) 수정 금지 — 별도 트리거 파일** |
| 7 | `functions/src/scheduleWeeklyNews.ts` (신규) | `onSchedule({ schedule: "0 12 * * 5", timeZone: "Asia/Seoul", region: "asia-northeast3" })` → 주간 랭킹 동향 draft |
| 8 | `app/admin/newsdesk/` + `components/admin/newsdesk/` (신규) | **The Lab 패턴 준수**(`app/admin/lab`·`lib/lab/adminGate.ts` 재활용). 구성: 초안 대기함(draft→검토→발행/보류) · 3언어 탭 편집기 · **근거 데이터 스냅샷 패널**(기사 옆에 evidence 수치 표 병기 — 교차검증의 시스템화) · 발행/내리기 토글 · 템플릿 선택 + 주제 입력(수동 경로) · 백지 작성 |
| 9 | `app/news/page.tsx` + `app/news/[slug]/page.tsx` (신규) | 목록 + 기사 페이지(고유 URL). 렌더러는 **기준본 v3 지면과 시각 일치**(masthead·스탯 타일·매치업 VS·드롭캡·정서적 클로저). `generateMetadata`로 기사별 title/description 메타 태그(심사용 사이트 기본기) |
| 10 | ✦ AI-Report v2.5 블록 | 기사 **본문 블록 최하단**(사이트 푸터 아님). 문구: `✦ AI-Report · 발행인이 검토·승인했습니다 · DATA {기준시각}` — **8px · opacity 0.5 · 골드(#FCD006) · 모노 폰트**. 문구는 i18n 3언어 키로 |
| 11 | `components/news/NewsRail.tsx` (신규) | 우측 뉴스뷰 — 섬네일+제목, **건수 제한 없음(스크롤되는 만큼)**. 자체 데이터 fetch하는 **독립·자기완결 컴포넌트**. **임시 마운트(대표 확정 2026-07-26):** The Pitch(`app/page.tsx`) 데스크톱(≥1024px) 우측 + 모바일 하단 인라인 섹션. 마운트 지점에 `// TODO(ND-TEMP-MOUNT): Pitch 개편 시 우측 상설 프레임으로 이사` 주석 필수 |
| 12 | Contestant 미디어 스왑 그릇 | `lib/lab/tournamentDoc.ts` Contestant에 `media?: { type: 'image'\|'embed'\|'clip', embed?: { videoId, start, end } }` 추가(기존 `imageUrl` 유지 — 하위호환, media 부재 시 image 취급). `components/` `MediaSlot` 스왑 렌더러: image 기본 · **embed = 파사드 패턴**(정지 이미지 → hover 시 YouTube 공식 iframe lazy-load, start 파라미터, mute — `docs/demos/WC48_embed_demo_v1.html` 준거) · **clip = 스키마 예약만, 렌더 경로 구현 금지**(저작권 상담 답변 후 별도 모듈) |
| 13 | Firestore rules + 인덱스 | `news`: public read는 `status == 'published'`만 · write는 admin만. rules 테스트 필수. 목록·NewsRail 쿼리 인덱스 |
| 14 | 문서·i18n | 신규 UI 문구 ko/en/es · `docs/lite-specs/ND1-news-desk.md` 신설(**C4-newsroom의 후계임을 명시, C4 스테일 스펙 구현 금지**) · `LANGUAGE.md`에 News Desk 용어 등재 |

## §4 ADR-ND1 후보 (구현자가 확정 기록)

- **본문 블록 모델**: `blocks: [{type: 'lead'|'paragraph'|'stats'|'matchups'|'closer'|'hero', ...}]` — 기준본 v3의 지면 요소와 1:1. "초안 = 제목·부제·본문·수치 텍스트, 지면 디자인은 발행 시 템플릿 자동 적용" 사양의 구현 형태
- **slug 형식**: `{YYYYMMDD}-{6자리 base36}` 등 URL-safe·불변·비추측성 — 확정은 구현자
- **evidence 저장**: 기사 문서 內 JSON(별도 컬렉션 X) — 기사와 근거의 원자적 동행
- **rate limit 카운터**: KST 일 단위 카운터 문서(`participation.ts` 패턴) — 20/일 초과 시 `resource-exhausted` + `details.code`(클라이언트 i18n 매핑, `voteErrorCodes.ts` 계약 방식)
- **트리거 멱등성**: 같은 Tournament에 오픈/결과 초안 중복 생성 방지 — `origin`+`tournamentId` 기존 draft 존재 시 skip (at-least-once 전달 대비, `onChampionConfirmed`의 멱등 패턴 참조)

## §5 Implementation Plan — §11 Superpowers TDD

- **Phase 1:** `lib/news/` 스키마·블록 검증·slug (RED→GREEN→COMMIT)
- **Phase 2:** `newsDigestCore` 집계 + `newsPrompts` 4종 + `translateArticleCore` (unit RED→GREEN)
- **Phase 3:** `generateNewsDraft` callable + rate limit + 트리거 2종 + 주간 크론 (unit + integration)
- **Phase 4:** `/admin/newsdesk` UI — 활성 로직은 `lib/news/`로 추출해 단위테스트
- **Phase 5:** `/news` 목록·기사 렌더러(기준본 v3 정합) + AI-Report v2.5 + NewsRail 임시 마운트
- **Phase 6:** Contestant `media` 스왑 그릇 + MediaSlot(임베드 파사드) — clip 렌더 금지 확인 테스트 포함
- **Phase 7:** rules·인덱스·i18n·lite-spec·LANGUAGE.md + E2E + CI
- **Phase D′ (강제):** 시드 → ①수동 AI 초안 생성 → 3언어 탭 편집 → 발행 → `/news` 목록·기사 URL·NewsRail 3면 확인 ② Tournament 발행 → 오픈 draft 자동 생성 확인(발행은 안 됨) ③ AI-Report 8px·50%·골드 확인 ④ 한/영 토글 ⑤ 임베드 파사드 hover 동작 → cleanup

### §5.5 기사 작성 지침 — newsPrompts 4종 전부에 시스템 프롬프트로 박제 (필수)

```
1. 사용설명 금지 — "참여는 무료", "~하면 시작됩니다" 류 안내문 쓰지 않는다.
2. 훅 필수 — 리드에 호기심 자극(긴장·장면·질문). 설명형 리드 금지.
3. 비주얼 병행 — 서술만으로 부족. stats(스탯 타일)·matchups(매치업 VS) 블록을 데이터로 출력.
4. 마무리는 매뉴얼이 아니라 정서적 클로저 한 줄 (closer 블록).
5. 축제의 언어 — 전투 은유 금지: 잔인한·앙숙·격돌·혈투·생존·왕좌·전력을 꺼내다·피해 갈 곳 없다.
   매치는 싸움이 아니라 "어느 쪽을 더 사랑하는지 고르는 순간". 애정·자랑·발견·설렘의 언어.
   변환 예: "잔인한 대진"→"눈을 뗄 수 없는 만남" · "앙숙"→"나란히 차트를 달군 두 곡" · "왕좌는 하나"→"당신의 한 곡을 고를 시간"
6. LANGUAGE.md 공식 용어 준수 (Tournament·Champion·Voter·Crown Score 등).
   절대 득표수(Vote Count)는 어떤 기사에도 쓰지 않는다 — 비율·순위·Voter Count만.
```

## §6 Acceptance Criteria

1. **자동 발행 0건** — 트리거·크론·callable 어느 경로도 `status`를 `published`로 만들 수 없음 (integration 테스트로 증명)
2. Tournament 발행(Lab) 시 오픈 기사 draft, Champion 확정 시 결과 기사 draft가 **각 1건만**(멱등) 생성
3. 금 12:00 KST 크론이 주간 랭킹 draft 생성 (`0 12 * * 5` + `Asia/Seoul` — 테스트는 코어 함수 직접 호출)
4. `/admin/newsdesk`에서 초안 검토→3언어 편집→발행→내리기 전 과정 동작, 근거 스냅샷 패널에 evidence 수치 표 병기
5. 발행 기사가 `/news` 목록 + `/news/[slug]` 고유 URL + NewsRail 3면에 노출, draft는 public에서 read 불가(rules 테스트)
6. 기사 지면이 기준본 v3와 시각 정합(masthead·스탯 타일·매치업·드롭캡·클로저) + **AI-Report v2.5 스펙 정확 일치**(본문 블록 최하단 · 문구 · 8px · 50% · 골드 모노)
7. 초안 생성 rate limit 20/KST일 — 21번째 호출 거부 + 3언어 안내(`details.code` 방식)
8. 기사 title/subhead/body 3언어 — 실패 언어만 원문 fallback + `logError` (Option A 회귀 없음)
9. newsPrompts 4종 전부에 §5.5 지침 6항 포함 (프롬프트 문자열 단위테스트로 존재 검증)
10. Contestant `media` 스왑: 기존 데이터(imageUrl만) 100% 하위호환 · embed 파사드 hover 동작 · **clip 타입은 저장은 되나 렌더 경로 없음**
11. 기존 불변 원칙 회귀 없음 (Crown Gold만 · FIFA 금지 · Vote Count 금지 · LIVE 배지 금지 · Round Scope Lock)

## §7 Testing / §8 Edge Cases

- Edge: 초안 생성 중 Tournament 삭제 · evidence 수치 0건(참가 직후 크론) · 3언어 중 es만 번역 실패 · slug 충돌 · 발행 후 재편집(재발행 흐름) · 내리기(published→archived) 후 URL 접근(404 아닌 안내) · NewsRail 기사 0건 상태 · 미디어 embed인데 videoId 무효 · 20/20 도달 후 이벤트 트리거(트리거는 rate limit 면제 — 대표 조작이 아니므로 별도 카운트 금지 여부 구현자 확정 기록)
- E2E는 `?lang=ko` 강제 · spec 경로 명시 · 시드 RESET 선행 · admin 흐름은 시드 admin 계정

## §9 Out of Scope

- **우측 상설 프레임 본체** — Pitch 개편(대개편) 스코프. ND-1은 NewsRail 컴포넌트+임시 마운트까지
- **Crown Score** — 랭킹 개편(대개편) 스코프. 주간 랭킹 기사는 현행 `ranking_cache`(누적 기반) 사용. `newsDigestCore`에 `// TODO(ND-CROWN-SCORE): 랭킹 개편 시 데이터 소스 스왑` 주석 필수
- **클립 파이프라인(공장)** — 저작권 상담 답변(~08-02) 후 별도 모듈. ND-1은 clip 스키마 예약(그릇)까지
- **투표 완료 뉴스 스니펫** — 보류 (대표 개념 재설명 대기)
- **외부 뉴스 API 수집** — 도입 금지 (자체 생산 30% 요건에 불리, 등록 전략 위배)
- **C4-newsroom lite-spec** — 스테일. 구현 참조 금지 (정합성 배너 참조, ND1 lite-spec이 후계)
- 신문법 필수 표시사항(제호·발행인 표기 등) — 등록 신청 직전 별도 모듈 · 댓글·구독·RSS · MVP2 일반 유저 노출 범위 확대

## §10 핸드오프 종료 조건

```
☐ Acceptance Criteria 11항 전 항목 통과
☐ Hard Constraints(§9 금지 포함) 위반 0건 · CLAUDE.md 불변 원칙 위반 0건 · LANGUAGE.md 금지 용어 0건
☐ §11 3계층 테스트 GitHub Actions PASS + E2E HTML 리포트 또는 영상(.webm) PR 본문 첨부
☐ Console 에러 0건 자동 검증 통과 (§11.6 코드 내장)
☐ Vercel Preview(branch alias)에서 발행 전 과정 1회 통과
☐ 디자이너(대표) 시각 점검: 기준본 v3 대조 + AI-Report v2.5 + 모바일 320px
```

## §11 Superpowers 자동 테스트 — 필수 (Required)

> Superpowers 플러그인 활성 상태에서 작업. Phase마다 RED→GREEN→REFACTOR→COMMIT, 단축 금지.
> 테스트 없이 구현 코드 먼저 작성 금지. 아래 전부 **필수** — DoD 통과 조건.

### 11.2 TDD 대상 매핑

| 테스트 파일 | 테스트 대상 | §6 기준 |
|---|---|---|
| `lib/__tests__/news.articleDoc.test.ts` | 스키마 검증·블록 모델·slug·상태 전이(자동 발행 불가) | AC 1·5 |
| `functions/src/__tests__/newsDigestCore.test.ts` | ranking_cache → 기사 근거 수치 요약 | AC 3·4 |
| `functions/src/__tests__/newsPrompts.test.ts` | 4종 프롬프트에 지침 6항·금지어 존재 검증 | AC 9 |
| `functions/src/__tests__/translateArticleCore.test.ts` | Option A 언어별 호출·부분 실패 fallback·logError | AC 8 |
| `functions/src/__tests__/generateNewsDraft*.test.ts` | rate limit 20/KST일·admin 가드·origin 기록 | AC 7 |
| `functions/src/__tests__/newsTriggers*.test.ts` | 오픈/결과 트리거 멱등·draft-only | AC 1·2 |
| `lib/__tests__/news.mediaSlot.test.ts` | media 스왑 판정(하위호환·clip 렌더 배제) 순수 로직 | AC 10 |
| rules 테스트 | news published만 public read · draft admin only | AC 5 |

### 11.4 3계층 의무

| 계층 | 도구 | 대상 | 기준 |
|---|---|---|---|
| 유닛 | vitest | 위 매핑 표 전체 | 100% PASS |
| 통합 | Firebase Emulator + vitest | rules deny/allow · callable rate limit · 트리거 draft-only | 100% PASS |
| E2E | Playwright | ① admin: 초안 생성→편집→발행→/news 확인→내리기 ② public: /news→기사 URL→AI-Report 존재→draft 접근 불가 ③ NewsRail 노출·스크롤 | 100% PASS + Console 에러 0건 |

### 11.5 CI — `.github/workflows/news-e2e.yml` (신규, 기존 워크플로우 yml 패턴 복제, paths: app/news·app/admin/newsdesk·components/news·lib/news·functions/src/*ews*)

### 11.6 Console 에러 0건 자동 검증 — 템플릿 v2.1 §11.6 코드 그대로 E2E에 내장

## §12 Push 확인 · §13 Branch Alias URL · §14 시각 검증

템플릿 v2.1 그대로 — 마지막 Phase 후 `git push` + 원격 HEAD 일치 확인 의무. PR 본문에 §14 A~E 4블록(Dev Nav·한/영 토글·직접 진입 URL 표·seed 명령·디자이너 체크리스트) 필수.
시각 검증 URL: `https://worldcrown48-git-feat-nd1-news-desk-choijiniis-projects.vercel.app`
직접 진입: `/news` · `/news/{slug}` · `/admin/newsdesk` · The Pitch `/`(NewsRail 임시 마운트)

---

## 변경 이력
- **v1.0 (2026-07-26):** 초판. News Desk 확정 사양(2026-07-22) + 미디어피벗결정 v0.1 §6(스왑 구조·타임라인) + 샘플 v3 기준본 승인 + NewsRail 임시 마운트 대표 확정 반영. Cowork 셀프체크 4문항 ✓ (§11 별도 섹션 · 모달 "권장" 0건 · 핵심 흐름 E2E 명시 · §10 E2E 증거 의무)

*© 2026 WorldCrown48 | ND-1 News Desk Handoff v1.0 | CONFIDENTIAL*
