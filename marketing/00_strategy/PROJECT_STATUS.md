# WorldCrown48 — PROJECT_STATUS

작성: 2026-08-24 · 작성자: 티오(Cowork) · 방식: **리포지토리 읽기 전용 스캔**(코드 무수정) + 프로젝트 결정 기록 대조
기준 시점: main 브랜치 커밋 `a1d642c` (LAB-UX-1 PR-1 머지 직후). ※ 이 문서 작성 시각에 PR-2(편집기 데이터 개편)가 진행 중이므로, 편집기 관련 항목은 수일 내 갱신 예정.
표기 원칙: 코드·문서로 확인되지 않은 것은 **[확인 필요]**.

---

## 1. 폴더 구조 (2단계)

```
worldcrown48/
├─ app/                  # Next.js 화면 라우트
│  ├─ account/           #   Locker Room (내 계정)
│  ├─ admin/             #   운영자 콘솔 (lab 편집기 · newsdesk · dashboard)
│  ├─ arena/             #   투표 무대 (매치·챔피언·랭킹)
│  ├─ launch/            #   런치 패드 (사전등록 웨이트리스트)
│  ├─ news/              #   공개 뉴스룸 (/news + 기사 상세)
│  └─ policies/          #   약관·개인정보 등 정책 허브
├─ components/           # 화면 부품 (admin·arena·auth·crown·embed·i18n·launch·layout·media·news·pitch·policy·ranking …)
├─ lib/                  # 순수 로직 (arena·auth·crown·embed·i18n·lab·media·news·ranking·taxonomy·types …)
├─ functions/            # Firebase Cloud Functions (서버 로직)
├─ content/ko·en/        # 정책 문서 원문
├─ e2e/, tests/          # Playwright E2E · Firestore 규칙 테스트
├─ docs/                 # 설계 문서 (ADR·핸드오프·법무·디자인·멘탈모델 …)
├─ outputs/              # 킥 문서·목업·프로세스 킷
├─ public/brand·fonts/   # 브랜드 SVG 10종 · Pretendard 폰트
└─ scripts/, middleware.ts, firebase.json, next.config.mjs …
```

## 2. 기술 스택

- **프론트엔드**: Next.js 14.2.5 (App Router) · React 18 · TypeScript · Zustand(상태) · Recharts(어드민 차트) · focus-trap-react
- **백엔드/DB**: Firebase — Firestore(DB) · Auth(구글 로그인) · Cloud Functions v2(Node 20) · Storage(Crown Card 이미지) · Analytics
- **AI**: Anthropic Claude API(`@anthropic-ai/sdk`) — 48명 채우기·키워드 제안·다국어 번역·뉴스 초안·영상 관련성 판정
- **외부 API**: YouTube Data API v3 (영상 검색·임베드 검증, search 쿼터 100콜/일 별도 버킷)
- **배포**: Vercel (Pro) + Cloudflare(DNS) — worldcrown48.com. Firebase Functions는 별도 배포
- **테스트**: vitest 단위(웹 726 + functions 403, 08-24 기준 green) · Firestore 규칙 에뮬레이터 테스트 · Playwright E2E 15+ 스펙 · hex 가드(디자인 토큰 CI)

## 3. 구현 완료된 기능

- **The Pitch(홈)**: 트렌딩 토너먼트 피드, 히어로, 뉴스 레일(임시 배치)
- **Launch Pad(/launch)**: 사전등록 웨이트리스트 폼(이메일 수집·중복 방지·분석 이벤트)
- **Arena(투표)**: 48강→24→12→6→THE FINAL(3인 직접 선택) 개인 이진 트리 투표, 라운드 전환 연출, 게스트 1표 런 + 로그인 시 기록 이전(linkSessionVote), IP 해시 부정 방지
- **Champion·Crown Card**: 챔피언 확정 → Crown Card 이미지 생성(서버) → SNS 공유 메뉴·QR
- **랭킹**: 현행 = 누적 득표 점유율(rate%) 순위 + 서버 캐시(scheduleRankingCache). Crown Score(우승비율50+점유율50)는 확정 설계·**미구현**(랭킹 개편 킥에서 산식 페이지와 함께 구현 예정) ※08-27 정정
- **The Lab(운영자 편집기)**: 2단계 생성 플로우 — 제목·카테고리·키워드(AI 제안)·마감 → 48칸 그리드. **[🎬 동영상 생성] 자동 체인**(AI 48명 채우기 → 유튜브 영상 자동 소싱 → 검수 → "제안" 배지), 중복 의심·이름↔힌트 불일치 배지, 슬롯별 재검색·영상 미세조정(10초 루프 구간), 유튜브 링크 일괄 검수기, 쿼터 가드. 발행은 사람이 [토너먼트 생성] 클릭(R6 원칙)
- **뉴스**: News Desk 운영자 콘솔(이벤트/주간 크론/수동 트리거 → AI 초안 → 승인 발행제, 3언어 탭 편집, 근거 수치 패널) + 공개 /news 목록·기사 페이지(✦ AI-Report 푸터 규칙)
- **다국어(i18n)**: KO/EN/ES 3언어 — UI 문구 카탈로그 + 콘텐츠(제목·설명·기사)는 발행 시 1회 번역 저장
- **정책 허브·동의**: 약관/개인정보/쿠키 ko·en, 쿠키 동의 배너(분석/마케팅 게이트), 계정 삭제(onUserDelete)
- **어드민 대시보드**: KPI 카드·투표 속도 차트·알림 목록
- **디자인 시스템**: Twilight Stadium 토큰(콘트랙트 v2.3, hex 리터럴 0 CI 가드), 브랜드 SVG 10종

## 4. 작업 중 · 미완성

- **진행 중(이번 주)**: LAB-UX-1 PR-2 — 이미지 URL 칸 제거+영상 썸네일 폴백(완료), 소속 필드 신설+국가 ISO 코드(진행), 썸네일 프레이밍 가점, 배포·스모크
- **대기열(확정 순서)**: TOG-1(뉴스데스크 콘솔 다국어 이관) → **Arena 매치 대수술**(VS 스플릿 스크린·임베드 10초 루프 매치 무대·첫 입장 팝업) → **Pitch 쇼케이스**(모형 6카드 삭제·NewsRail 정식판) → **뉴스룸 승격**(도메인 격상·sitemap·Article schema·Around the Pitch) — 뉴스룸은 기획 선행 중(모듈 분해 완료)
- **후보/보류**: 참가자 DB 킥(실존·소속·논란 검증 층) · 32/16강 브래킷(런칭 후) · 얼굴 인식 스마트 크롭 · MVP2 유저 공개 준비(AI 기능 유저 쿼터·YouTube 쿼터 증설 신청)
- **코드 내 TODO 4건**: Pitch 뉴스 레일 임시 배치(개편 시 이사) · 어드민 알림 dismiss 백엔드 미구현 · 주간 뉴스 데이터 소스 스왑 예약(랭킹 개편 시) ×2
- 매치 화면은 현재 정지 썸네일/이니셜 표시 — 임베드가 흐르는 매치 무대는 Arena 대수술에서 구현 예정

## 5. 데이터 구조 (Firestore)

- **tournaments**: title + titleI18n(3언어) · description(3언어) · keywords(≤12) · category · status · hostUid · tournamentDeadline(대회 단위만 존재) · currentRound · totalContestants(48) · featured(동시 1개)
- **contestants**: tournamentId · order(1..48) · name(한/영 병기 단일 문자열, 무번역 정책) · nationality · position(→ 소속 affiliation 추가형 전환 진행 중) · imageSearchKeyword(AI 검색 힌트) · media.embed{videoId, start, duration}(영상 임베드) ※ imageUrl은 제거 진행 중(한 번도 사용 안 된 레거시)
- **votes / roundProgress / bracket_seeds / daily_participation**: 투표·개인 라운드 진행·랜덤 대진 시드·참가 쿼터
- **crown_cards**: 챔피언 카드(voterUid·championId·imageUrl=Storage 링크)
- **news_articles**: 3언어 제목·부제·본문 블록(히어로 이미지·임베드 블록 옵션)·근거 스냅샷·상태(draft→published)
- **ranking_cache / ai_usage / youtube_quota / video_search_cache**: 랭킹 캐시·AI 호출 캡·유튜브 쿼터 카운터·검색 캐시(TTL 7일)

## 6. 카테고리·콘텐츠 수량

- **카테고리**: 10개 운영(2026-07-11 TX-0 프로덕션 확인). 카테고리는 Firestore `categories` 컬렉션의 데이터(코드 하드코딩 아님) — 현재 정확한 목록·개수는 **[확인 필요 — Firestore 콘솔]** (문서상 KPOP·CREATOR·KDRAMA·ANIME 등 확인)
- **참가자(Contestant) 문서**: 발행분 528건 (2026-08-24 마이그레이션 조사에서 실측)
- **발행 토너먼트 수**: **[확인 필요 — Firestore 콘솔]** (산술상 48명×N)
- **발행 기사**: 3건+ (08-08 백필 기준, 이후 발행분 **[확인 필요]**)
- **웨이트리스트 등록 수**: **[확인 필요 — Firestore waitlist 컬렉션]**

## 7. 외부 연동

- **인증**: Firebase Auth — Google 로그인(운영자 게이트는 ADMIN_UID 화이트리스트) + 익명 게스트 세션
- **결제**: 없음 (수익 모델 미구현)
- **애널리틱스**: Firebase Analytics 래퍼 설치됨 — 이벤트 계측 코드 광범위(웨이트리스트·투표·공유·쿠키 등), **동의 게이트 내장**(분석 동의 전 no-op). 단, measurementId(GA 연결 키) 실제 설정 여부는 **[확인 필요 — Firebase 콘솔/환경변수]**
- **AI**: Anthropic API(서버 전용, Firebase Secrets 관리)
- **미디어**: YouTube Data API + 공식 임베드 플레이어(법률 검토 완료된 "임베드 파사드" 전략)
- **이메일**: Cloudflare 이메일 전달 → worldcrown48@gmail.com (발신은 미설정)
- **도메인/CDN**: Cloudflare DNS + Vercel

## 8. 마케팅 관점 — 현황과 갭

| 항목 | 상태 |
|---|---|
| 공유용 OG 이미지 | **없음** — OG 제목·설명은 있으나 `openGraph.images` 미지정, 전용 이미지 파일도 없음. **링크를 SNS에 공유하면 그림 없이 글자만 뜸. 우선 제작 추천(브랜드 SVG 자산은 준비돼 있음)** |
| 사전등록 폼 | **있음** — /launch 웨이트리스트(이메일 수집·중복 방지·이벤트 계측) |
| 애널리틱스 | 코드 설치·동의 게이트 완비. **실제 수집 여부(GA 키 설정)는 [확인 필요]** |
| sitemap | **없음**(robots.ts만 존재) — 뉴스룸 승격 킥에 sitemap·Article schema 예정 |
| 검색 색인 | Search Console 등록 여부 **[확인 필요 — 08-13 미결 그대로]** |
| 바이럴 루프 | Crown Card SNS 공유(+QR) 구현됨. UTM/유입 추적 처리 **[확인 필요]** |
| SNS 채널 | SNSLinks 컴포넌트 존재 — 실제 계정 개설·연결 상태 **[확인 필요]** |
| 언론/콘텐츠 | 자체 뉴스룸(3언어, 승인 발행제) 가동 — 인터넷신문 등록 절차는 미진행(확정만 됨) |

---
*갱신 규칙: 큰 킥(PR-2·Arena·Pitch·뉴스룸) 종료 시마다 이 문서를 갱신한다. 질문·정정은 티오(Cowork)에게.*
