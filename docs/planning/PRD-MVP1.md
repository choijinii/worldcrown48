# WorldCrown48 MVP 1 — Product Requirements Document

**작성일:** 2026-05-08  
**런칭 목표:** 2026년 6월 11일 전 (FIFA 북중미 월드컵 개막 전)  
**상태:** ready-for-agent

---

## Problem Statement

전 세계 축구 팬들은 월드컵 시즌마다 "최고의 선수는 누구인가"를 두고 열띤 토론을 벌이지만, 이를 구조적으로 경험할 수 있는 플랫폼이 없다. 기존 SNS 여론조사는 단순 찬반 투표에 그치며, 48명의 후보를 1:1 토너먼트 방식으로 가려내는 팬덤 경험은 존재하지 않는다. 팬들은 자신의 투표 결과를 시각적으로 공유하고 싶지만 그럴 수 있는 도구도 없다.

---

## Solution

WorldCrown48(월크48)은 48명의 후보를 1:1 녹아웃 방식으로 투표해 최후의 1인을 가리는 글로벌 팬덤 토너먼트 플랫폼이다. 투표 결과는 Crown Card라는 시각적 카드로 생성되어 SNS에 공유되며, 바이럴 루프를 형성한다. MVP 1은 2026 FIFA 북중미 월드컵 개막(6월 11일) 전에 월드컵 선수 대진으로만 운영되며, 관리자가 큐레이션한 고품질 대진으로 서비스를 시작한다.

---

## User Stories

### 일반 방문자 (비로그인)

1. 방문자로서, 로그인 없이 The Pitch(홈)에서 현재 진행 중인 대진 목록을 볼 수 있어야 한다. 그래야 어떤 토너먼트가 있는지 파악하고 참여 여부를 결정할 수 있다.
2. 방문자로서, 대진 카드를 클릭하면 The Arena로 이동해 1:1 투표 화면을 볼 수 있어야 한다. 그래야 즉시 참여할 수 있다.
3. 방문자로서, 로그인 없이 1회 투표할 수 있어야 한다. 그래야 진입 장벽 없이 서비스를 경험할 수 있다.
4. 방문자로서, 투표 후 Crown Card가 자동으로 생성되어 미리보기로 보여야 한다. 그래야 카드를 보고 공유 여부를 결정할 수 있다.
5. 방문자로서, Crown Card 미리보기를 로그인 없이 볼 수 있어야 한다. 그래야 카드의 가치를 확인한 후 로그인을 결정할 수 있다.
6. 방문자로서, Crown Card 공유 버튼을 클릭하면 구글 로그인 요청을 받아야 한다. 그래야 공유 전에 계정이 생성된다.
7. 방문자로서, 사이트 첫 방문 시 쿠키 동의 배너를 하단에서 볼 수 있어야 한다. 그래야 개인정보 처리 방식을 선택할 수 있다.
8. 방문자로서, 쿠키 배너에서 "모두 허용", "필수만 허용", "설정하기" 중 하나를 선택할 수 있어야 한다.
9. 방문자로서, 이용약관과 커뮤니티 가이드라인 페이지를 볼 수 있어야 한다.
10. 방문자로서, 정책 페이지를 한국어와 영어 탭으로 전환해서 볼 수 있어야 한다.

### 로그인 유저

11. 유저로서, 구글 계정으로 로그인할 수 있어야 한다.
12. 유저로서, 로그인 후 Crown Card를 이미지 파일로 다운로드할 수 있어야 한다.
13. 유저로서, Crown Card를 트위터/X, 인스타그램 스토리용으로 공유할 수 있어야 한다.
14. 유저로서, 내가 참여한 토너먼트 목록을 볼 수 있어야 한다.
15. 유저로서, 투표 기록이 저장되어 다시 방문해도 내 결과를 볼 수 있어야 한다.
16. 유저로서, 계정 설정에서 내 데이터 삭제를 요청할 수 있어야 한다 (GDPR Right to Erasure).
17. 유저로서, 같은 토너먼트에 중복 투표를 시도하면 차단 메시지를 받아야 한다.

### 관리자

18. 관리자로서, `/admin` 페이지에서 대진 제목을 입력하면 Claude API가 48명 후보를 자동으로 추천해야 한다.
19. 관리자로서, AI 추천 후보 목록을 검토하고 수정·삭제·순서 변경을 할 수 있어야 한다.
20. 관리자로서, 각 후보의 이미지 URL을 입력하거나 검색 링크를 통해 확인할 수 있어야 한다.
21. 관리자로서, 대진을 공개/비공개 상태로 설정해 The Pitch에 노출 여부를 제어할 수 있어야 한다.
22. 관리자로서, 진행 중인 대진의 실시간 투표 현황을 볼 수 있어야 한다.
23. 관리자로서, 비정상 투표 패턴이 감지되면 알림을 받아야 한다.

### 시스템

24. 시스템은 동일 IP에서 같은 토너먼트에 1시간 내 2회 이상 투표를 차단해야 한다.
25. 시스템은 투표 집계를 Firebase Realtime Database 트랜잭션으로 처리해 정확도를 보장해야 한다.
26. 시스템은 48강 → 24강 → 12강 → 6강 → 3강 → 결승 라운드를 자동으로 진행해야 한다.
27. 시스템은 모든 AI 생성 콘텐츠에 "AI GENERATED" 배지를 자동으로 표시해야 한다.
28. 시스템은 쿠키 동의 선택을 서버(Firestore)에 저장해 GDPR 감사 추적 요건을 충족해야 한다.

---

## Implementation Decisions

### 모듈 구성

**1. VoteEngine**
- Firebase Realtime Database 트랜잭션 기반 1:1 투표 처리
- IP 기반 중복 투표 방지 (Cloud Functions에서 검증, 1시간 1투표)
- 라운드 자동 진행 로직: 현재 라운드 전체 매치 완료 감지 → 다음 라운드 자동 생성
- 비로그인: sessionStorage로 투표 여부 추적 (서버 IP 검증 병행)

**2. TournamentStore**
- Firestore `tournaments` 컬렉션: id, title, category, status, created_by, is_public, created_at
- Firestore `candidates` 컬렉션: id, tournament_id, name, image_url, nationality, order
- Firestore `vote_stats` 실시간 집계: candidate_id별 count, trend_score
- 읽기 최적화: Firestore 캐싱 + Realtime DB는 실시간 집계에만 사용

**3. CrownCardGenerator**
- 클라이언트 사이드 HTML Canvas 기반 이미지 생성
- 로그인 불필요 (브라우저에서 직접 렌더링)
- 출력: PNG 이미지 (1080×1080 정사각형, SNS 최적화)
- 디자인: Deep Midnight 배경, Gold 테두리, 우승자 이미지 + 이름 + 토너먼트 명 + 월크48 워터마크
- 공유 시에만 Firebase Auth 확인

**4. AuthGate**
- Firebase Auth Google Provider
- 흐름: 비로그인 → 1회 투표 허용 → Crown Card 미리보기 → 공유 클릭 → 로그인 모달
- 로그인 후 이전 투표 기록 연결 (uid 매핑)

**5. CookieConsent**
- 3-티어: 필수(항상 활성) / 기능(선택) / 분석(선택)
- 마케팅 쿠키: MVP 3까지 비활성
- 동의 저장: Firestore `cookie_consents` 컬렉션 (uid_hash 또는 anonymous_id, ip_hash, timestamp, 선택값)
- 재동의 주기: 12개월
- 위치: 화면 하단 고정 (position: fixed, bottom: 0)

**6. AdminTournamentCreator**
- 경로: `/admin` (Firebase Auth 관리자 role 확인)
- Claude API 호출: 대진 제목 입력 → `claude-sonnet-4-6` 모델로 48명 후보 추천 (이름, 국적, 포지션)
- 이미지: 후보별 Wikipedia/Getty 검색 링크 자동 제안, 관리자 최종 URL 입력
- 저장: Firestore에 tournament + candidates 일괄 저장

**7. PolicyHub (Domain 5)**
- 경로: `/policies/terms`, `/policies/community`, `/policies/privacy`, `/policies/cookies`
- 한국어 기본, 영어 탭 전환
- 콘텐츠: v3.0 설계서 §2.1~§2.5 전문 기반

**8. TrendingFeed (Domain 1: The Pitch)**
- Firestore 쿼리: `is_public == true`, `status == active`, `trend_score` 내림차순
- 실시간 업데이트: Firestore onSnapshot 리스너
- 카드 레이아웃: 반응형 2열 그리드, hover 시 골드 좌측 보더 활성화

### 기술 스택 확정

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | React 18 + Tailwind CSS v4 |
| 상태 관리 | Zustand (경량, Firebase 연동 적합) |
| 백엔드 DB | Firebase Firestore + Realtime Database |
| 인증 | Firebase Auth (Google Provider) |
| 서버리스 | Cloud Functions for Firebase (Node.js) |
| AI | Claude API (claude-sonnet-4-6) — 관리자 후보 추천 |
| 호스팅 | Vercel (프론트) + Firebase (백엔드) |
| CDN/보안 | Cloudflare (worldcrown48.com) |

### 데이터 스키마 핵심

```
tournaments: { id, title, category, status, is_public, created_at }
candidates:  { id, tournament_id, name, image_url, nationality, order }
vote_stats:  { tournament_id, candidate_id, count, trend_score }
votes:       { tournament_id, round, match_id, winner_id, device_hash, timestamp }
cookie_consents: { anonymous_id, essential, functional, analytics, timestamp, ip_hash }
```

### 디자인 시스템 토큰 (Tailwind 커스텀 설정)

```
--color-bg:      #05070A  (Deep Midnight)
--color-surface: #0E1217
--color-primary: #FFD700  (Pure Gold)
--color-text:    #F8FAFC
--color-muted:   #64748B
--color-border:  #1E293B
```

폰트: Inter (본문) + Playfair Display Italic (타이틀). 다크모드 전용, 라이트모드 없음.

---

## Testing Decisions

좋은 테스트의 기준: 구현 세부사항이 아닌 외부 동작을 테스트한다. 내부 함수 호출 순서가 아니라 "투표 후 집계가 정확히 1 증가한다"와 같은 관찰 가능한 결과를 검증한다.

### 테스트 대상 모듈

| 모듈 | 테스트 유형 | 핵심 케이스 |
|---|---|---|
| VoteEngine | 통합 테스트 (Firebase Emulator) | 정상 투표, 중복 투표 차단, 라운드 자동 진행 |
| CrownCardGenerator | 유닛 테스트 | 캔버스 출력 크기(1080×1080), 필수 요소 존재 여부 |
| CookieConsent | 통합 테스트 | 동의 선택 후 Firestore 저장 확인, 재방문 시 배너 미표시 |
| AdminTournamentCreator | 유닛 테스트 | Claude API 응답 파싱, 48명 정확히 반환, 오류 처리 |
| AuthGate | E2E 테스트 | 비로그인 투표 → 카드 미리보기 → 공유 시 로그인 모달 트리거 |

### 테스트 환경

- Firebase Local Emulator Suite (Firestore + Auth + Functions)
- Playwright E2E (크리티컬 사용자 흐름)
- Vitest (유닛 테스트)

---

## Out of Scope (MVP 1)

- **Domain 2: The Lab** — 런칭 직후 별도 스프린트로 개발
- **K-POP 카테고리** — 7월 추가
- **AI Quick-Collect** — The Lab 개발 시 함께 구현
- **Domain 4: The Locker Room** — MVP 2
- **AI 뉴스 팩토리** — MVP 2
- **Crown Card 공유 후 소셜 미디어 딥링크** — MVP 2
- **B2B SaaS / API 접근권** — MVP 3
- **마케팅 쿠키** — MVP 3
- **모바일 앱 (iOS/Android)** — 계획 없음
- **Flutter Web** — 채택하지 않음

---

## Further Notes

- **FIFA 상표권**: "FIFA", "Official" 표기 절대 금지. "2026 월드컵 선수 팬 투표" 방식으로만 표현.
- **초상권**: AI 이미지 수집 시 퍼포먼스·기록 기반 공개 데이터만 사용. 얼굴 이미지는 관리자가 수동으로 공개 출처 URL 입력.
- **운영 체계**: MVP 1~2는 1인 운영. AI 자동 탐지(Claude API 콘텐츠 모더레이션) 비중 최대화.
- **The Lab 우선순위**: 런칭 직후 최우선 개발. 관리자 `/admin` 페이지의 AI 추천 로직을 The Lab에 재사용.
- **이의 신청 이메일**: policy@worldcrown48.com
