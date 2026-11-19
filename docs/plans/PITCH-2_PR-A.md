# PITCH-2 PR A — The Pitch(홈) 화면 계획

- 지시서: `outputs/prompts/PROMPT_ClaudeCode_PITCH-2_v1.1a_2026-11-17.md`(0′절 우선) + 추가 지시 ① `…_추가지시1_외신=TIOZ_2026-11-18.md`(다르면 이것이 이김)
- 브랜치: `feat/pitch-2-screen` (main 468a71b 에서) · 시안 `docs/design/claude-design/PITCH-2_2026-11-05/`
- PR B(#169) 이후: 조회 칸은 `news_views/{slug}`(대표 결정 11/18) — HOT 열 · 오른쪽 칸 뉴스는 여기를 읽는다(지시서의 `views.total` = 이 문서의 `total`).

## 데이터 — 읽기 한 곳(`lib/pitch/homeData.ts`) · 순수 규칙은 따로

| 자료 | 어디서 | 방식 |
|---|---|---|
| 공개 대회 | `tournaments` status==active (기존 pitchStore 구독 · 개수 제한 없앰) | 실시간 — 내리기 뒤 1분 안 표지 바뀜(useCoverPair · D-93) |
| 판 수 · 차트 | `ranking_cache/{id}` (대회마다 1문서) | 한 번 읽기 |
| 기사 | `news` published (기존 `subscribePublishedArticles` 대신 한 번 읽기) | 한 번 읽기 |
| 조회 칸 | `news_views/{slug}` (발행 기사마다) | 한 번 읽기 |
| 홍보 장 | `config/pitch.promoVideoUrl` · `promoPosterUrl` — 우리가 만든 영상 파일(Storage `pitch/promo/` 의 mp4) + 정지 그림 (읽기 누구나 · 쓰기 관리자 · 추가 지시 ②) | 한 번 읽기 · 둘 다 비면 4장 |
| 외신 | `lib/pitch/worldPress.ts` `loadWorldPress(cat)` → 언제나 `[]` | 추가 지시 ① |

## 순수 규칙 (RED 먼저 · `lib/__tests__/pitch.*.test.ts`)

1. `openTournaments(list, now, env)` — 공개(D-66 · 숨김 제외) + 마감 전(조기 마감 포함) · `splitChartTournaments` 재사용
2. `heroSlides({promo, open, runsTotalById})` — 홍보 장 1(영상 또는 정지 그림이 있으면) + 최신 대회 1 + 판 수 많은 순 3(최신 대회 빼고 · 캐시 없음 = 0 → 최신 발행순 뒤) · 모자라면 있는 만큼 (추가 지시 ② 6절) · `promoAssetUrl` = 우리 버킷 `pitch/promo/` 아래 주소만
3. `paginate(list, page, 6)` · `readPitchParams(search)` / `pitchHref({cat, page})` — `?cat=` `?page=` (범위 밖 page → 1 또는 마지막)
4. `articleCategory(article, tournamentsById)` — 연결 대회의 카테고리 · 없으면 null(전체 탭에만)
5. `newsColumns(articles, viewsBySlug, cat, todayKst)` — LATEST 최신 3 · HOT 급등 3(`sortTrending` · 0/동점 최신순)
6. `heroNews(articles, viewsBySlug)` — 누적 조회 많은 순 3(0/동점 최신순)
7. `chartPicks(rows, cat)` — 점수 보이는 차트(10판 이상 · `deriveRankState`)만 · 큰 차트 = 판 수 가장 많은 것 · 2×2 = 그다음 최근 발표 4 · 오른쪽 칸 = 가장 최근 발표 1
8. 배너 자리 `pitch-news-below` · `pitch-charts-below` 가 `BANNER_SLOT_NAMES` 에 · 기본 공지(②=member 글 · ③=6절 8번)
9. `TIOZ_BAND_ENABLED === false` → DOM 없음 · `loadWorldPress` → `[]` → "기사 없음" 모양 · TIOZ 카드 부품 견본 1건(시험 파일 안)

## 화면 (배치 11단 · 1절 · 시안 값)

제목 줄(GLOBAL FAN ARENA) → 히어로(924:372 · 5장 · 10초 · 600ms · 점 8 · 화살표 44 마우스 때만 · B안 ken 휴대폰 끔) + 오른쪽 칸(차트 1줄 132 + 뉴스 3줄 72) → TIOZ 띠(꺼짐) → Trending(탭 · 340px 자동 열 · 6장/쪽) → 배너 ① `pitch-between` → Create 띠(140/104 · COMING SOON) → NEWS ROOM(LATEST · HOT · WORLD PRESS · 카드 96) → 배너 ② `pitch-news-below` → CHARTS(320 + 2×2 · 휴대폰 1열 4줄 80) → 배너 ③ `pitch-charts-below` → 공용 바닥 띠(+ 커뮤니티 가이드 · © 줄).

지우는 것: `HeroSection`(글자 히어로) · `LabEntryCard` · `NewsroomFeed`/`NewsFeedItem` 견본 · `NewsRail` 임시 마운트 · 홈 바닥 문구 · 안 쓰게 된 사전 키(`pitch.hero.*` · `pitch.lab.*` · `pitch.news.*` — grep 뒤).

## 시험

- 유닛: 위 순수 규칙 1~9 + 부품(TIOZ 카드 · 빈 WORLD PRESS 열 · TIOZ 띠 없음)
- 통합(에뮬레이터 규칙): `config/pitch` 읽기 누구나 · 쓰기 관리자만
- E2E(`?lang=` 고정 · 에뮬레이터 시드 `e2e: true`): §11.2 ①~⑪ — ⑪ 커튼은 `playwright.curtain.config.ts` 한 줄

## 하지 않는 것
지시서 3절 그대로(매치 무대 · 아레나 홈 · 크라운 카드 · 메뉴바 · 내리기 · 그림 확인 창 · 편집기 · 커튼 · `lib/thumbnail` 규칙 · 대회 문서 새 칸 · 표에 없는 문구 · 새 색).

## 추가 지시 ② 반영 (2026-11-19)
- 홍보 장 = 우리가 만든 영상 파일 `<video muted autoplay loop playsinline>` · 조작 단추 없음 · 휴대폰(≤480)과 움직임 줄이기 = 정지 그림만 · 첫 장이 보일 때만 재생 · 장 전체 = 같은 탭 `/arena` · 유튜브 연결 없음.
- 히어로 5장 = 홍보 1 + 최신 대회 1 + 참여 많은 대회 3(최신 대회 중복 없음).
- storage.rules `pitch/promo/{file}` — 읽기 공개 · 쓰기 관리자(익명 아님) · video/mp4 · image/*.
- 시안 영어 글자 되살림: 오른쪽 칸 머리 CROWN SCORE · NEWSROOM · 큰 차트 그림 위 CROWN SCORE · 빈 차트 안내 위 CROWN SCORE · 홍보 장 WORLDCROWN48 · FILM.
- "이어서 하기" 알약 = 메뉴바 안 · 언어 토글 바로 앞(모든 화면 공용). 390 폭은 B(대표 결정 2026-11-19) — 알약이 떠 있는 동안 ≤480 에서 워드마크 글자를 숨긴다 · 알약 설명 줄은 초점 · 마우스 때만(대표 확인 2026-11-19).

## 추가 지시 ② 7절 반영 (대표 2026-11-19 12:16 — 1절 · 6절보다 앞선다)
- 첫 장 = 영상 + "WORLDCROWN48 · FILM" 글자 하나(시안 자리 · 크기) · 제목 · 버튼 없음 · 읽어 주는 이름 "WorldCrown48". 사전 키 `pitch.home.promo.title` 삭제(6절 1번 문구 쓰지 않음).
- 대회 장 = 제목만(카테고리 칩 · 참가하기 버튼 없음) · 장 전체가 링크 하나 `heroSlideHref` → `/arena?t=`(D-71) · Tab → Enter.
- 화살표 · 점은 링크 밖. 휴대폰 밀기(`heroSwipe` · 40px 이상 옆으로 = 넘김 · 10px 넘게 움직이고 떼면 이동 안 함 · 세로가 더 크면 넘기지 않음) · `touch-action: pan-y`.
- 누를 수 있다는 표시 = 손가락 모양 + 표지 `filter: brightness(1.08)`(새 색 없음) · 키보드 초점 = 금색 테두리 토큰.
