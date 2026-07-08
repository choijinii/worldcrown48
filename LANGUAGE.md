---
## ⛔ IMMUTABLE TERMINOLOGY RULE — 절대 불변 용어 규칙

> **RULE 1: NEVER change or overwrite an established term definition.**
> **RULE 2: When a new concept arises, CREATE A NEW TERM. Do NOT redefine existing terms.**
>
> 이 규칙은 모든 에이전트, 모든 세션, 모든 기여자에게 예외 없이 적용된다.
> 기존 용어를 임의로 변경하면 전체 모듈과 AI 뉴스 생성 전반에 연쇄 오류가 발생한다.
> 새 개념이 필요하면 → 이 파일 하단 "신규 용어 추가" 섹션에 새 항목을 작성할 것.

---

# WorldCrown48 (월크48) — 공식 용어 정의서 (LANGUAGE.md)

**이 파일의 목적:** Claude Code 에이전트, 개발자, 기획자가 동일한 언어로 소통하기 위한 월크48 프로젝트의 **단일 진실 공급원(Single Source of Truth)** 용어집입니다.

- 모든 코드의 변수명·함수명·DB 컬렉션명은 이 파일의 English Term을 기준으로 합니다.
- 유의어 사용을 금지합니다. 아래 정의된 용어만 사용하세요.
- 새로운 용어가 필요할 경우 이 파일에 먼저 등록하고 사용하세요.

---

## 1. 핵심 역할(Role) 용어

⚠️ 가장 중요한 구분입니다. 세 역할을 절대 혼용하지 마세요.

| **한국어** | **English (공식)** | **코드 변수명** | **정의** |
| --- | --- | --- | --- |
| 시스템 관리자 | **System Admin** | role: 'admin' | 월크48 플랫폼 전체를 운영·관리하는 사람. DB 접근, 유저 관리, 플랫폼 설정 등 최상위 권한 보유. MVP에서는 대표님 본인. |
| **대진을 만든자** | **Tournament Host** | role: 'host' | **대진(Tournament)을 생성하고 운영하는 사람.** 본인이 만든 대진의 Tournament Deadline 설정, 대진 공개/비공개 권한 보유. MVP에서는 System Admin만 Host가 될 수 있음. MVP 이후 일반 유저도 Host가 될 수 있도록 확장 예정. |
| 투표 참여자 | **Voter** | role: 'voter' | 대진에 참여하여 투표하는 일반 사용자. 계정당 1일 5회 투표 가능. |

### 역할 간 관계 (MVP 기준)

```
System Admin
  └── Tournament Host 권한 포함 (MVP에서는 동일 인물)
        └── 본인이 만든 Tournament에 대한 Host 권한 보유

일반 유저 (Voter)
  └── Tournament Host 권한 없음 (MVP 기간)
  └── MVP 이후: Host로 업그레이드 가능 (검토 중)
```

❗ 코드 작성 시 주의:
- `isAdmin()` → System Admin 여부 확인 (플랫폼 전체 권한)
- `isHost(tournamentId)` → 특정 Tournament의 Host 여부 확인 (해당 대진 권한)
- 두 함수는 다른 로직입니다. 혼용 금지.

---

## 2. 서비스 핵심 구조 용어

### ★ v1.2 핵심 변경: Tournament → Round → Match 계층 구조 재정의

| **한국어** | **English (공식)** | **코드/DB명** | **정의** |
| --- | --- | --- | --- |
| **대진** | **Tournament** | tournament | **48개**의 Contestant이 참여하는 하나의 완전한 이상형 월드컵 이벤트. Tournament Host가 생성하고 **Tournament Deadline**을 설정함. Tournament은 5개 Round(48강→24강→12강→6강→결승)로 구성되며, Voter의 투표 진행에 따라 자동으로 흘러간다. |
| **라운드** | **Round** | round | Tournament 안에서 Voter의 투표 진행에 따라 **시스템이 자동으로 전환**하는 단계. Round 자체에는 **시작·종료·Deadline이 존재하지 않는다.** Voter가 해당 Round의 마지막 Match를 완료하면, 라운드 전환 효과가 표시된 후 다음 Round가 자동으로 시작된다. 48강(24 Match) → 24강(12 Match) → 12강(6 Match) → 6강(3 Match) → 결승(1 Final Match) 순서로 자동 진행. |
| **매치** | **Match** | match | 하나의 Round 안에서 두 Contestant이 1:1로 겨루는 투표 단위. Voter에게 **순서대로** 하나씩 제시되며, Voter가 한쪽을 선택하면 다음 Match가 자동으로 나타난다. |
| **후보** | **Contestant** | contestant | Tournament에 참여하는 투표 대상 (선수, 팀, 캐릭터, 인물, 음식 등 모든 개체). 하나의 Tournament에는 반드시 **48개**의 Contestant이 있음. ⚠️ 사람에 한정되지 않으므로 "48명" 아닌 "48개" 사용. |
| **투표** | **Vote** | vote | Voter가 하나의 Match에서 두 Contestant 중 하나를 선택하는 행위. |
| **득표** | **Vote Count** | voteCount | 특정 Contestant이 받은 투표의 합계. 랭킹 화면에는 절대 수치가 아닌 득표율(Vote Rate)만 표시. |
| **득표율** | **Vote Rate** | voteRate | 전체 투표 중 특정 Contestant이 받은 비율(%). 랭킹에 표시되는 유일한 수치. |
| **일일 참가 한도** | **Daily Participation Limit** | dailyParticipation | Voter 1명이 **하루(KST 기준)에 새로 참가할 수 있는 Tournament 수 = 5개**. 이미 참가한 Tournament 안에서는 투표 **무제한**(48강 브래킷 구조상 대회당 최대 46표로 자연 상한). 서버가 `daily_participation/${uid}_${date}` 단일 doc(`tournamentIds[]`)으로 원자적 집계. **HF-1 (2026-07-05) 도입** — 폐기된 "Daily Vote Limit(1일 5표)" 개념을 대체. |
| **우승자** | **Champion** | champion | 최종 결승(Final)에서 Voter가 선택한 최종 1인 Contestant. |
| **왕관** | **Crown** | crown | Champion에게 수여되는 월크48의 상징. 서비스명 WorldCrown48의 핵심 브랜드 요소. |
| **대진 마감일** | **Tournament Deadline** | tournamentDeadline | **Tournament Host가 설정**하는 **Tournament 전체**의 투표 마감 시각. Tournament에만 존재하며 Round에는 Deadline이 없다. |
| **결과 카드** | **Crown Card** | crownCard | Champion 확정 시 자동 생성되는 SNS 공유용 이미지 카드. 월크48의 핵심 바이럴 기능. |
| **라운드 전환 효과** | **Round Transition** | roundTransition | 각 Round의 마지막 Match 완료 후 → 다음 Round 시작 전에 표시되는 짧은 전환 화면. 예: "맨 어브 더 월드컵 24강". 시스템이 자동 실행. |
| ~~매치 진행 표시~~ (폐기됨) | ~~Match Progress~~ (deprecated) | ~~matchProgress~~ | ❌ **이 개념은 폐기됨 (2026-05-28).** Match 화면에는 Round/Match 번호 텍스트 HUD를 절대 표시하지 않는다. 이유: Voter는 매치 안의 **선수**이지 외부 **관중**이 아니다. "N강 · X/Y" 같은 표시는 관중 환상. Round 정보는 `roundTransition` 이벤트 화면에서만 노출된다. |
| **결승** | **THE FINAL** | final (round 5) | Tournament의 마지막 Round. 6강(3 Match)이 끝난 후 3명의 Contestant이 남으며, Voter가 이 3명을 동시에 보고 **1명을 직접 선택**해 Champion을 확정한다. 1v1 대결 2개로 분리되지 않는다. WC48 고유 구조 (표준 이상형 월드컵은 2명이 남아 결승). |

### ★ v1.5 핵심: Voter 1명의 대진 전체 흐름 (48강 기준)

```
[ROUND OF 48 — 시스템 상태, Voter UI 노출 안 됨]
1. Voter가 Tournament에 입장
2. Match 1: Contestant A vs B → 1명 선택 (화면에 Round/Match 번호 HUD 없음)
3. Match 2: Contestant C vs D → 선택
   ... (24번째까지 순서대로, 순수 매치 화면만 — 텍스트 HUD 0개)
4. Match 24 완료 (24/24)
   ★ Round Transition 이벤트 화면: "🎉 24강 시작!" (1~2초 전체 화면 자동 전환)

[ROUND OF 24 — 시스템 상태]
5. Match 1 ~ Match 12 (순서대로, HUD 없음)
   ★ Round Transition 이벤트: "🎉 12강 시작!"

[ROUND OF 12 — 시스템 상태]
6. Match 1 ~ Match 6 (순서대로, HUD 없음)
   ★ Round Transition 이벤트: "🎉 6강 시작!"

[ROUND OF 6 — 시스템 상태]
7. Match 1 ~ Match 3 (순서대로, HUD 없음)
   ★ Round Transition 이벤트: "🎉 THE FINAL!"

[THE FINAL — 3명 동시 표시]
8. 3명의 Contestant가 동시에 표시됨
   Voter가 이 중 1명을 직접 선택 → Champion 확정
   ⚠️ 1v1 매치 2개로 분리되지 않는다 (WC48 고유 구조)

[완료]
9. Crown Card 자동 생성 → 뉴스 선택 → SNS 공유 페이지
```

> **불변 규칙:**
> 1. Voter는 특정 Match를 직접 고르거나 건너뛸 수 없다. 반드시 순서대로 1개씩 진행.
> 2. Round에는 Deadline(타이머)이 없다. Voter의 마지막 Match 완료가 유일한 전환 조건.
> 3. THE FINAL은 항상 3명 동시 선택. 1v1 추가 매치 없음.
> 4. **Match 화면에는 Round/Match 번호 텍스트 HUD를 절대 표시하지 않는다.** Round 정보는 `roundTransition` 이벤트 화면(라운드 사이 1~2초 자동 전환)에서만 노출. 이유: Voter = 선수, 관중 아님.

---

## 3. 상태(Status) 용어

| **한국어** | **English (공식)** | **코드 값** | **의미** |
| --- | --- | --- | --- |
| 초안 | **Draft** | 'draft' | Tournament Host가 생성 중인 Tournament. 아직 공개되지 않음. |
| 공개 | **Published** | 'published' | 모든 Voter에게 공개된 Tournament. 투표 참여 가능. |
| 진행 중 | **Active** | 'active' | 현재 투표가 진행 중인 Tournament 상태. |
| 마감됨 | **Closed** | 'closed' | Tournament Deadline이 지나 투표가 종료된 Tournament. |
| 완료 | **Completed** | 'completed' | Champion이 확정된 Tournament. (Voter가 결승까지 완료) |
| 보관됨 | **Archived** | 'archived' | 종료 후 아카이브된 Tournament. 결과는 조회 가능. |

---

## 4. 행위(Action) 용어

| **한국어** | **English (공식)** | **코드 함수명** | **행위 주체** |
| --- | --- | --- | --- |
| 대진 만들기 | **Create Tournament** | createTournament() | Tournament Host |
| 대진 마감일 설정 | **Set Tournament Deadline** | setTournamentDeadline() | Tournament Host |
| 대진 공개 | **Publish Tournament** | publishTournament() | Tournament Host |
| 투표하기 | **Cast Vote** | castVote() | Voter |
| 다음 매치 표시 | **Next Match** | nextMatch() | System (자동) |
| 라운드 전환 | **Advance Round** | advanceRound() | System (자동) — Voter의 해당 Round 마지막 Match 완료 시 트리거 |
| 결과 확인 | **View Results** | viewResults() | 모든 사용자 |
| Crown Card 생성 | **Generate Crown Card** | generateCrownCard() | System (자동) — Champion 확정 시 트리거 |
| Crown Card 공유 | **Share Crown Card** | shareCrownCard() | Voter |

---

## 5. 화면(Screen/Page) 용어

| **한국어** | **English (공식)** | **URL 경로** | **설명** |
| --- | --- | --- | --- |
| 사전 랜딩 | **Launch Pad** | / (MVP 1 사전) | 이메일 웨이트리스트, FIFA 카운트다운. 서비스 오픈 전 운영. |
| 메인 홈 | **The Pitch** | / | 트렌딩 Tournament 그리드. 서비스 첫 인상 화면. |
| 대진 생성 공간 | **The Lab** | /admin/lab | Tournament Host가 대진을 만드는 공간. MVP에서는 /admin/lab으로 접근 제한. |
| 투표 경기장 | **The Arena** | /arena/[tournamentId] | Match가 진행되는 투표 화면. |
| 유저 공간 | **The Locker Room** | /profile | 개인 프로필, 투표 기록, 계정 설정. |
| 정책 허브 | **Policy Hub** | /policies | 이용약관, 개인정보처리방침, 쿠키 정책. |
| 관리자 대시보드 | **Admin Dashboard** | /admin | System Admin 전용 통합 관리 콘트롤 센터. |
| 1:1 투표 화면 | **VS Battle View** | /arena/[id] 내부 컴포넌트 | 두 Contestant이 나란히 표시되는 핵심 투표 UI. 순서대로 자동 전환. |
| 글로벌 랭킹 | **Crown Rankings** | /arena/[id]/rankings | Vote Rate(%)만 표시하는 랭킹 화면. |

---

## 6. 데이터(DB) 컬렉션 용어

| **한국어** | **Firestore 컬렉션명** | **설명** |
| --- | --- | --- |
| 대진 | tournaments | Tournament 전체 문서 (tournamentDeadline 포함) |
| 후보 | contestants | Tournament의 Contestant 목록 (48개) |
| 투표 기록 | votes | Voter의 투표 기록 (일별 집계용) |
| 유저 | users | 유저 정보 (role, 프로필) |
| 랭킹 캐시 | rankingCache | 1시간마다 갱신되는 Vote Rate 캐시 |
| 뉴스 캐시 | newsCache | GNews API 1시간 캐시 (25개 뉴스) |
| 쿠키 동의 | cookieConsents | GDPR 쿠키 동의 기록 |
| 공지사항 | notices | System Admin이 작성하는 공지 |
| 웨이트리스트 | waitlist | 이메일 웨이트리스트 (Domain 0) |
| 관리자 알림 | adminAlerts | 어뷰징 경고 알림 |
| 감사 로그 | auditLog | GDPR 삭제 감사 로그 (3년 보관) |
| 크라운 카드 | crownCards | Crown Card 메타데이터 |

> ★ v1.2 변경: `rounds`, `battles` 서브컬렉션 삭제.
> Round는 Voter의 투표 흐름에 따라 시스템이 자동 계산하는 진행 단계이며 별도의 DB 문서로 존재하지 않는다.
> Match 데이터는 tournaments 문서 내부에 배열 또는 서브데이터로 관리한다.

---

## 7. 금지 용어 (유의어 사용 금지)

아래 용어들은 공식 용어가 있으므로 절대 사용하지 마세요.
AI 에이전트가 혼용하면 즉시 지적하고 공식 용어로 교정하세요.

| **❌ 사용 금지** | **✅ 공식 용어** | **이유** |
| --- | --- | --- |
| 관리자가 마감일 설정 | **Tournament Host가 Tournament Deadline 설정** | '관리자'는 System Admin과 혼동됨 |
| 배틀, 경기 | **Match** | 공식 용어는 Match (★ v1.2 확정) |
| 참가자, 후보자 | **Contestant** | 공식 용어는 Contestant |
| Candidate | **Contestant** | v1.2에서 Contestant로 통일 |
| 득점 / 표 | **Vote Count / Vote Rate** | 상황에 따라 구분 사용 |
| 참여자 | **Voter** | 공식 용어는 Voter |
| 우승 | **Champion** | 공식 용어는 Champion |
| 결과 이미지 | **Crown Card** | 공식 용어는 Crown Card |
| 예측 | **(사용 금지)** | 월크48은 예측 서비스가 아님 |
| 베팅 | **(사용 금지)** | 월크48은 베팅 서비스가 아님 |
| 실제 경기 결과 연동 | **(사용 금지)** | 외부 경기 결과와 무관한 서비스 |
| Round Deadline | **(존재하지 않는 개념)** | ★ v1.2: Round에는 Deadline이 없다. Tournament Deadline만 존재 |
| 라운드 마감일 | **(존재하지 않는 개념)** | Round는 Voter 투표 흐름에 따라 자동 전환. 마감 개념 없음 |
| Daily Vote Limit / 1일 5표 / Tournament당 하루 5회 | **Daily Participation Limit (1일 신규 참가 5개)** | ★ HF-1 (2026-07-05): 투표 수를 세는 규칙은 폐기. 하루에 새로 참가하는 Tournament 수만 5개로 제한하고, 참가한 대회 안에서는 무제한 |
| 라운드 자동 종료 | **Voter의 마지막 Match 완료 → advanceRound()** | 종료가 아니라 '전환'이며 Voter 행동에 의해 트리거됨 |
| Host가 라운드를 전환한다 | **시스템이 자동으로 advanceRound()** | ★ v1.2: 라운드 전환은 Host가 아닌 시스템이 자동 수행 |

---

## 8. 서비스 브랜드 언어

| **개념** | **한국어 표현** | **English 표현** | **사용 위치** |
| --- | --- | --- | --- |
| 서비스명 | 월크48 | WorldCrown48 | 공식 문서, UI |
| 슬로건 | 팬의 열정으로 왕관을 | Crown the World's Favorite | 마케팅 |
| 대진 생성 CTA | 대진 만들기 | Create Tournament | 버튼 텍스트 |
| 투표 CTA | 지금 투표하기 | Vote Now | 버튼 텍스트 |
| 우승 선언 | 왕관을 차지했다! | The Crown Goes To... | 결과 화면 |
| 공유 유도 | 내 왕관 공유하기 | Share My Crown | Crown Card |
| 라운드 안내 | N강 진행 중 | Round of N — In Progress | 상태 표시 |
| 라운드 전환 | 맨 어브 더 월드컵 N강 | Man of the World Cup — Round of N | 전환 효과 화면 |
| **48강** | 48강 (24 Match) | **ROUND OF 48** | 1라운드 — Contestant 48개, Match 24개 |
| **24강** | 24강 (12 Match) | **ROUND OF 24** | 2라운드 — Contestant 24개, Match 12개 |
| **12강** | 12강 (6 Match) | **ROUND OF 12** | 3라운드 — Contestant 12개, Match 6개 |
| **6강** | 6강 (3 Match) | **ROUND OF 6** | 4라운드 — Contestant 6개, Match 3개 |
| **결승** | 결승 (Final) | **THE FINAL** | 최종 라운드 — Contestant 3개, Match 1개 |

> ⛔ **절대 금지**: "ROUND OF 16", "QUARTERFINAL", "SEMIFINAL", "ROUND OF 32" 등 FIFA 표준 대진 용어.
> WorldCrown48은 48개 Contestant 구조이므로 위 5단계 표기만 사용한다.

---

## 9. 신규 용어 — Tournament 확장 개념 (v1.3 추가)

> ⛔ 아래 용어는 기존 확정 용어(특히 `Contestant`)와 절대 혼용하지 않는다.
> 새 개념이 필요할 경우 이 섹션에 신규 항목을 추가하는 방식으로만 확장한다.

---

### Nation

| 항목 | 내용 |
|---|---|
| **English Term** | `Nation` |
| **한국어** | 국가대표팀 |
| **정의** | 국가 단위의 투표 대상. 국가대표팀 전체를 하나의 Entry로 취급한다. |
| **사용 조건** | `TournamentType = "nation_cup"` 인 경우에만 사용 |
| **예시** | 🇧🇷 Brazil · 🇰🇷 Korea Republic · 🇫🇷 France · 🇦🇷 Argentina |
| **Firestore 필드명** | `nation` (소문자) |
| **혼용 금지** | `Contestant`(개인)와 절대 혼용 금지. Nation은 팀, Contestant는 개인. |

```
// 올바른 사용 예
nation: { id: "BRA", nameKo: "브라질", nameEn: "Brazil", flag: "🇧🇷", confederation: "CONMEBOL" }

// 절대 금지
contestant: { id: "BRA", name: "Brazil" }  ← Contestant는 개인에만 사용
```

---

### TournamentType

| 항목 | 내용 |
|---|---|
| **English Term** | `TournamentType` |
| **한국어** | 토너먼트 유형 |
| **정의** | 토너먼트가 무엇을 투표 대상으로 하는지 분류하는 키값. 관리자가 토너먼트 생성 시 반드시 선택. AI 뉴스 팩토리(M7)는 이 값을 읽어 올바른 프롬프트 템플릿을 자동 선택한다. |
| **Firestore 필드명** | `tournamentType` (camelCase) |

**확정 값 목록 (Enum)**

| 값 | 투표 단위 | 설명 | 예시 |
|---|---|---|---|
| `"nation_cup"` | **Nation** (국가대표팀) | 어느 국가팀이 우승할지 예측 | 2026 월드컵 우승 예측 |
| `"player_mvp"` | **Contestant** (선수 개인) | 최고의 선수 1인 선발 | 2026 월드컵 MVP 투표 |
| `"artist"` | **Contestant** (아티스트) | K-POP 등 아티스트 인기 투표 | K-POP 월드 챔피언 |
| `"custom"` | **관리자 정의** | 향후 확장 카테고리 | 영화·드라마·음식 등 |

```javascript
// Firestore tournaments 컬렉션 필드
{
  tournamentType: "nation_cup",   // ← 이 값으로 AI 뉴스 프롬프트 자동 분기
  entryUnit: "Nation",            // nation_cup → Nation / 나머지 → Contestant
}
```

**AI 뉴스 M7 프롬프트 분기 규칙**

```
tournamentType === "nation_cup"  → Nation 기반 프롬프트
  예: "X만 명이 선택한 2026 월드컵 우승 예상 국가 TOP 5"

tournamentType === "player_mvp"  → Contestant(선수) 기반 프롬프트
  예: "팬이 선택한 2026 월드컵 MVP 후보 선수 TOP 5"

tournamentType === "artist"      → Contestant(아티스트) 기반 프롬프트
  예: "글로벌 팬이 선택한 K-POP 월드 챔피언 TOP 5"
```

---

## 10. 다국어(i18n) 관련 용어

> 상세 정책: `docs/i18n/I18N_POLICY.md`

| 개념 | 정의 | 비고 |
|------|------|------|
| **Locale** | 지원 언어 코드 (ko / en / es) | next-intl 표준 |
| **Default Locale** | `en` | 감지 실패 시 폴백 |
| **번역 불가 고유명사** | Tournament, Contestant, Match, Voter, Champion, Crown, Crown Card, AI-Report, The Pitch, The Arena, Launch Pad 등 | 이 용어들은 모든 언어에서 영문 원형 그대로 |
| **Español neutro** | 특정 국가 방언 없는 중립 스페인어 | MVP 2 es 번역 기준 |
| **번역 키 형식** | `{domain}.{component}.{key}` | 예: `arena.vsBattle.voteLeft` |

### 번역 불가 용어 목록 (전체)

아래 단어들은 **모든 언어(ko/en/es)에서 원문 영문 그대로** 사용합니다:

```
WorldCrown48 · Crown · Crown Card · AI-Report
Tournament · Contestant · Match · Voter · Champion
The Pitch · The Arena · The Lab · Launch Pad · The Locker Room · Policy Hub
LIVE · VOTE RATE · VS
```

---

## 11. 신규 용어 — 뉴스룸 개념 (v1.5 추가)

> ⛔ 아래 용어는 2026-05-25 대표님 지시(Arena 2칼럼 뉴스룸 + The Pitch 뉴스룸)로 신설.
> 상세 명세: `docs/lite-specs/C4-newsroom.md` · `docs/lite-specs/C5-fan-intelligence.md`

### Newsroom

| 항목 | 내용 |
|---|---|
| **English Term** | `Newsroom` |
| **한국어** | 뉴스룸 |
| **정의** | 대진 관련 뉴스를 모아 보여주는 화면. The Arena(2칼럼)와 The Pitch(통합 피드) 두 곳에 등장. |
| **구성** | Keyword News View + AI-Report News View |

### Keyword News View

| 항목 | 내용 |
|---|---|
| **English Term** | `Keyword News View` |
| **한국어** | 키워드 뉴스 뷰 |
| **정의** | Tournament 키워드 기반 **외부 뉴스**를 보여주는 뷰. GNews API → news_cache. AI 생성이 아님. |
| **분량** | The Arena 7건 / The Pitch 통합 피드에 합산 |
| **코드/DB** | `news_cache` |

### AI-Report News View

| 항목 | 내용 |
|---|---|
| **English Term** | `AI-Report News View` |
| **한국어** | AI-Report 뉴스 뷰 |
| **정의** | 월크48 **AI 생성 뉴스(Fan Intelligence)**를 보여주는 뷰. ai_news 컬렉션 기반. |
| **분량** | The Arena 3건 / The Pitch 통합 피드에 합산 |
| **혼용 금지** | ❌ "AI Generated News View" · "AI 생성 뉴스 뷰" — "AI GENERATED" 표기는 폐기됨. ✅ `AI-Report News View`만 사용 |
| **코드/DB** | `ai_news` |

### Fan Intelligence (정식 등재)

| 항목 | 내용 |
|---|---|
| **English Term** | `Fan Intelligence` |
| **한국어** | (번역 불가 — 영문 원형 사용) |
| **정의** | 실제 팬 투표 데이터 기반으로 AI(Claude)가 작성하고 관리자가 검토·승인하는 월크48 고유 뉴스 포맷. 바이라인 배지 "● AI-Report". |
| **전략 SST** | `WC48_FAN_INTELLIGENCE_v1_0.md` |

> 위 4개 용어 중 `AI-Report News View` · `Fan Intelligence`는 모든 언어에서 영문 원형 사용(§10 번역 불가 목록 준함).

---

## 12. 신규 용어 — Guest Run (v1.6 추가, HF-3)

| **한국어** | **English (공식)** | **코드 변수명** | **정의** |
| --- | --- | --- | --- |
| 게스트 런 (1회 완주) | **Guest Run** | `guestRun` / `guestTournamentId` | 비로그인(익명 uid) Voter가 **토너먼트 1개를 1회 완주**하는 것. A안(맛보기 모델) = Guest Run 1회 허용. 완주 후 또는 **두 번째 대회 진입 시** 로그인 필요. 로그인 시 Guest Run 전체(votes · bracket_seeds · roundProgress · Crown Card)가 새 uid로 이전됨(`linkSessionVote`). |

### ⛔ 금지 표현 (모호 — 스펙 오염의 원인)

| ❌ 금지 | ✅ 대체 |
| --- | --- |
| ~~게스트 1표~~ · ~~비로그인 1표~~ | Guest Run (토너먼트 1개 완주) |
| ~~세션 1회 투표~~ · ~~세션당 첫 투표 1건~~ | Guest Run |
| ~~2번째 Match부터 로그인~~ | 완주 후 · 두 번째 **대회**부터 로그인 |

> "1표"라는 용어의 모호함이 A안(비로그인 1회 완주)을 "매치 1클릭"으로 오독시켰다(UX-8 근본
> 원인). 상세 경위·설계 근거 → `docs/adr/0008-hf3-guest-run.md`.

---

## 변경 이력

| **버전** | **날짜** | **주요 변경** |
| --- | --- | --- |
| **v1.6** | **2026-07-08** | **★ §12 신규 — Guest Run 용어 등록 + 금지 표현(게스트 1표·세션 1회 투표) 박제** (HF-3, ADR-0008). "비로그인 1회"의 올바른 의미 = 토너먼트 1개 완주 |
| **v1.5** | **2026-05-25** | **★ §11 신규 — 뉴스룸 개념 용어 추가** (Newsroom · Keyword News View · AI-Report News View · Fan Intelligence). 대표님 지시(Arena 2칼럼 + The Pitch 뉴스룸) 반영 |
| **v1.4** | **2026-05-23** | **★ "48명" → "48개" 전면 수정** (Contestant = 사람만이 아님) |
| | | **§10 다국어(i18n) 어휘 섹션 신규 추가** |
| | | 번역 불가 고유명사 목록 공식화 |
| **v1.3** | **2026-05-17** | **★ 신규 용어 섹션 §9 추가** |
| | | Nation (국가대표팀 투표 단위) 신규 정의 |
| | | TournamentType (토너먼트 유형 분류 키) 신규 정의 — Enum 4종 확정 |
| | | ⛔ IMMUTABLE TERMINOLOGY RULE 최상단 박제 |
| v1.0 | 2026-05 | 최초 작성 |
| v1.1 | 2026-05 | Tournament Host 역할 신규 정의, System Admin과 분리, 전 용어 한/영 병기 |
| **v1.2** | **2026-05** | **★ 핵심 변경 — Round 재정의: Round에는 Deadline·시작·종료가 없음** |
| | | **Round는 Voter 투표 흐름에 따라 시스템이 자동 전환하는 단계** |
| | | **Round Deadline 개념 완전 폐지 → Tournament Deadline만 존재** |
| | | **Match 용어 확정 (Battle → Match). 코드/DB명 = match** |
| | | **Contestant 용어 통일 (Candidate → Contestant)** |
| | | **라운드 전환 효과(Round Transition) 신규 정의** |
| | | **Voter 대진 전체 흐름(48강→결승) 순서 공식 문서화** |
| | | **DB rounds/battles 서브컬렉션 삭제, Match는 tournaments 내부 관리** |
| | | **Domain 0 (Launch Pad) 화면 용어 추가** |

---

*© 2026 WorldCrown48 | 작성: 48티오 | LANGUAGE.md v1.6 | CONFIDENTIAL*
