---
name: worldcrown48-project-skill
description: >
  WorldCrown48(월크48) 프로젝트의 핵심 지식 파일입니다.
  Claude가 월크48 관련 모든 작업을 수행할 때 이 파일을 우선 참조하세요.
  기술 결정, 서비스 정체성, 투표 정책, 아키텍처 원칙이 모두 담겨 있습니다.
  이 스킬은 다음 상황에서 반드시 사용합니다:
  - 월크48 코드 작성 또는 수정 요청
  - 투표 정책 관련 질문
  - 대진/라운드/경기 구조 설계
  - 기술 스택 선택 관련 질문
  - Tournament Host / Voter 권한 관련 작업
  - MVP 기능 범위 확인
  - 로컬 파일 관리 및 터미널 작업 안내
  - Claude 협업 방식 관련 질문
---

# WorldCrown48 (월크48) — 프로젝트 마스터 스킬 v1.4

## 🧭 이 스킬을 사용하는 방법

이 스킬은 Claude Code 및 Claude와의 모든 대화에서
**월크48 프로젝트의 "공식 기억"** 역할을 합니다.

코드 작성, 정책 결정, 설계 검토, 파일 관리 전에 이 파일을 먼저 참조하세요.

---

## PART 1 — 서비스 정체성 (가장 중요)

### 월크48이란?
```
서비스명: WorldCrown48 (월크48)
도메인:   worldcrown48.com
성격:     글로벌 팬 투표 플랫폼 (이상형 월드컵 방식)
목표:     2026년 FIFA 북중미 월드컵 시즌에 글로벌 런칭
```

### ✅ 서비스의 본질 — 반드시 기억할 것

```
월크48 = 팬이 좋아하는 Contestant를 투표하는 서비스

투표의 의미:
  "나는 이 후보가 더 좋다" (팬의 선호 표현)
  → 현실 경기 결과 예측 아님
  → 내기/베팅 아님
  → 객관적 순위 평가 아님

Tournament의 의미:
  Tournament Host가 만든 48명짜리 이상형 월드컵 이벤트
  → FIFA Tournament라도 실제 FIFA 결과와 연동 없음
  → K-POP, 영화, 스포츠 등 어떤 카테고리도 가능
  → 모든 Tournament는 같은 구조, 같은 규칙 적용
```

### ❌ 이런 이해는 완전히 틀렸습니다

| 틀린 이해 | 올바른 이해 |
|-----------|-------------|
| "FIFA Tournament는 실제 FIFA 일정을 따른다" | Tournament는 Round Deadline만 따름 |
| "라운드별 기간이 정해져 있다 (24h, 12h...)" | 라운드 기간 없음, Round Deadline만 있음 |
| "투표 결과로 우승 예측 정확도를 평가" | 예측 게임이 아님. 정확도 없음 |
| "경기 결과 API 연동이 필요하다" | 외부 API 연동 불필요 |
| "시스템이 자동으로 라운드를 종료한다" | Tournament Host가 Round Deadline 설정 후 직접 전환 |

---

## PART 2 — 핵심 역할 3가지

> ⚠️ 세 역할을 절대 혼용하지 말 것. 코드 함수명도 반드시 분리.

```
System Admin (시스템 관리자)       →  role: 'admin'
  플랫폼 전체 운영·관리.
  DB 접근, 전체 유저 관리, 플랫폼 설정 등 최상위 권한 보유.
  MVP에서는 대표님 본인.

Tournament Host (대진을 만든자)    →  role: 'host'
  Tournament를 생성하고 Round Deadline을 설정하는 사람.
  본인이 만든 Tournament에 대한 관리 권한만 보유.
  MVP에서는 System Admin만 Host 가능.
  MVP 이후: 일반 유저도 Host가 될 수 있도록 확장 예정.

Voter (투표 참여자)                →  role: 'voter'
  Tournament에 참여하여 Vote하는 일반 사용자.
  계정당 동일 Tournament에서 1일 5 Match 참여 가능.
```

```typescript
// 권한 확인 함수 — 반드시 분리 사용
const isSystemAdmin = (user: User) => user.role === 'admin';

const isTournamentHost = (user: User, tournament: Tournament) =>
  user.role === 'admin' || tournament.hostUid === user.uid;

// ❌ isSystemAdmin()으로 Round Deadline 권한 확인 금지
// ✅ isTournamentHost(user, tournament) 사용
```

---

## PART 3 — 대진(Tournament) 구조 완전 이해

### 핵심 용어 정의 (LANGUAGE.md v1.2 기준)

```
Tournament (대진):
  - 48명의 Contestant이 참여하는 하나의 완전한 이상형 월드컵 이벤트
  - Tournament Host가 생성하고 Tournament Deadline을 설정

Round (라운드):
  - Tournament의 진행 단계: 48강 → 24강 → 12강 → 6강 → Final
  - Round에는 Deadline이 없음 — Voter 투표 흐름에 따라 시스템이 자동 전환
  - 라운드 전환: Voter가 해당 Round 마지막 Match 완료 → advanceRound() 자동 실행

Match (매치):
  - 두 Contestant의 1:1 투표
  - Voter에게 순서대로 하나씩 제시됨 (동시 진행 아님)
  - 48강 = 24 Matches, 24강 = 12 Matches

Vote (투표):
  - 한 Match에서 두 Contestant 중 하나를 선택하는 행위
  - 계정당 동일 Tournament에서 1일 1회만 투표 가능
```

### Tournament Deadline 원칙 (★ v1.5 개정)

```
✅ Tournament Deadline 설정 권한 = Tournament Host
✅ Tournament Deadline: 해당 Tournament 전체의 투표 마감일시
✅ 시스템에 하드코딩된 라운드 기간 없음
✅ Round에는 Deadline이 없음 — Voter 투표 흐름에 따라 자동 전환

❌ "48강은 24시간" 같은 자동 기간 로직 코딩 금지
❌ Round별 Deadline 설정 불가 (존재하지 않는 개념)
❌ 외부 일정(FIFA 등)에 맞춰 Round를 자동 전환하는 로직 금지
❌ Host가 라운드를 수동 전환하는 기능 없음 (시스템이 자동 처리)
```

### Tournament 생명주기

```
1. Tournament Host가 Tournament 생성
   └── 주제 입력 + 48명 Contestant 설정 (AI Fill or 수동)
   └── Tournament Deadline 설정 (전체 투표 마감일시)

2. 48강 시작 → Voter가 순서대로 1:1 Match 투표 시작
   └── Voter가 24번째(마지막) Match 완료 → 시스템이 자동으로 라운드 전환
   └── "맨 어브 더 월드컵 24강" 화면 표시 (Round Transition)

3. 24강 시작 → Voter가 순서대로 1:1 Match 투표 계속
   └── Voter가 12번째(마지막) Match 완료 → 시스템이 자동으로 라운드 전환
   └── 이후 동일 방식으로 12강 → 6강 → 결승 자동 진행

4. Champion 확정
   └── Crown Card 자동 생성 + SNS 공유
```

---

## PART 4 — 투표 정책 (v4.2 확정)

### 핵심 규칙

```
계정당 동일 Tournament에서 1일 1회만 투표 가능
(하루에 하나의 Match만 투표 가능 — 자정 KST 기준 리셋)

복수 Tournament:
  각 Tournament별 별도 1회 카운트 (독립 적용)

계정 신뢰성:
  Google / Apple 소셜 로그인 필수 (익명 계정 없음)

랭킹 노출 원칙:
  Vote Count(절대 수치) 노출 금지
  Vote Rate(득표율 %) + 1시간 캐시만 표시
```

### 부정투표 방어 전략

```
1차 방어 (계정 신뢰성):
  - Google / Apple 소셜 로그인 필수
  - 신규 계정 이메일 인증 필수

2차 방어 (다중 계정 감지):
  - fingerprintjs 디바이스 핑거프린팅
  - IP 기반 동일 IP 다계정 탐지 (Cloud Functions)

3차 방어 (이상 패턴 감지):
  - 1분 내 과도한 API 호출 Rate Limiting
  - Tournament Host 어뷰징 알림 대시보드

랭킹 노출 정책:
  - Vote Count(절대 수치) 절대 노출 금지
  - Vote Rate(%) + 1시간 캐시만 표시
```

### Firestore votes 스키마

```javascript
{
  userId: "uid_xxxxx",
  tournamentId: "tournament_yyy",
  matchId: "match_zzz",
  candidateId: "candidate_aaa",
  votedAt: Timestamp,
  date: "2026-06-19",     // YYYY-MM-DD, KST
  ipHash: "sha256_hash",  // IP 해시 (원본 저장 안 함)
  deviceId: "fp_hash"     // fingerprintjs 해시
}

// 일일 투표 횟수 확인 쿼리:
// userId == ? AND tournamentId == ? AND date == TODAY → count
// count < 5 이면 투표 허용
```

---

## PART 5 — 기술 스택 (v4.1 확정)

### 확정 스택

```yaml
# 프론트엔드
framework:   "Next.js 14 (App Router)"
language:    "TypeScript"
ui_library:  "Tailwind CSS 3.4 + Shadcn/UI"
animation:   "Framer Motion"
icons:       "Lucide React"

# 백엔드
realtime:    "Firebase Realtime DB"
database:    "Firestore"
auth:        "Firebase Auth"
functions:   "Cloud Functions (Node.js)"
storage:     "Firebase Storage"

# AI
model:       "claude-sonnet-4-20250514"

# 인프라
deploy:      "Vercel"
cdn:         "Cloudflare"
fraud:       "fingerprintjs + ip-api.com"

# 사용 안 함 (MVP 전 기간)
not_used:    "Flutter Web"
```

### 디자인 토큰 — 듀얼 테마 팔레트 (★ v1.5 개정)

```css
/* ── 다크 테마 (Domain 0, 1, 2, 3) ── */
--color-bg-deep:    #05070A;   /* 가장 깊은 배경 */
--color-bg-default: #0A0D12;   /* 기본 다크 배경 */
--color-bg-soft:    #0E1217;   /* 카드/패널 배경 */
--color-gold:       #FFD700;   /* 브랜드 골드 (양쪽 공통) */
--color-text:       #F8FAFC;   /* 다크 기본 텍스트 */
--color-border:     #30363D;   /* 다크 테두리 */
--color-muted:      #8B949E;   /* 다크 보조 텍스트 */

/* ── 라이트 테마 (Domain 4, 5, 6) ── */
--color-bg-light:      #FAFBFC;   /* 라이트 배경 */
--color-surface-light:  #FFFFFF;   /* 라이트 카드 배경 */
--color-text-light:     #1A1A2E;   /* 라이트 기본 텍스트 */
--color-border-light:   #E2E8F0;   /* 라이트 테두리 */
--color-muted-light:    #64748B;   /* 라이트 보조 텍스트 */
```

> 다크 배경은 #05070A 단일 고정이 아닙니다.
> 도메인 성격에 따라 deep/default/soft 범위 내에서 유연하게 적용합니다.
> --color-gold: #FFD700만 양쪽 테마에서 공통 필수입니다.

---

## PART 6 — 도메인 및 권한 구조

### 7개 도메인 (MVP 1 기준, ★ v1.5 테마 추가)

```
THE PITCH   (/)                          🌑 다크
  모든 사용자 접근 가능
  "대진 만들기" 버튼: Tournament Host만 활성화, Voter는 disabled

THE LAB     (/admin/lab)                 🌑 다크
  Tournament Host 전용 — MVP 기간 Voter 완전 비공개
  Next.js 미들웨어에서 isTournamentHost() 검증 필수

THE ARENA   (/arena/[id])                🌑 다크
  로그인 Voter 투표 가능
  비로그인: 투표 시도 시 로그인 유도

THE LOCKER ROOM (/profile)               ☀️ 라이트 (MVP 2부터)
  유저 프로필, 투표 기록 (MVP 2)

POLICY HUB  (/policies)                  ☀️ 라이트
  모든 사용자 접근 가능 — MVP 1 필수

ADMIN DASHBOARD (/admin)                 ☀️ 라이트
  System Admin 전용, 통합 관리 콘트롤
```

---

## PART 7 — 48 Nodes 슬라이드 구조 (v4.1 확정)

```
구조: 8페이지 × 6개 Node = 48개 Candidate

UI 동작:
  - Framer Motion AnimatePresence 페이지 전환
  - 좌우 스와이프 (useSwipeable)
  - 상단 Progress Bar: "페이지 N/8 (완료 M/48)"

Node 상태:
  - 비어있음: 카메라 아이콘 + 번호
  - 채워짐: Candidate 이미지 미리보기 + 이름

완료 조건:
  - 48개 Node 모두 채워야 "저장하기" 활성화

파일 업로드:
  - Node 클릭 → 파일 input 트리거
  - Firebase Storage 업로드 → URL Firestore 저장
```

---

## PART 8 — 에이전트 임무 템플릿

모든 Claude Code 대화 시작 시 이 템플릿 사용:

```
당신은 '월크48 [모듈명] 전담 개발자'입니다.

[필수 참조 원칙]
- 월크48은 팬 투표 서비스입니다. 예측 게임/내기가 아닙니다.
- Tournament Deadline은 Tournament Host가 직접 설정합니다.
  Round Deadline은 존재하지 않습니다 (v0.2 폐지).
  시스템이 Voter 투표 흐름에 따라 자동으로 라운드를 전환합니다.
- Flutter를 사용하지 마세요. Next.js 14 + TypeScript입니다.
- Vote Count(절대 수치)를 UI에 노출하지 마세요.
  Vote Rate(%)만 표시합니다.
- Candidate는 Contestant입니다. Battle은 Match입니다 (v1.2 용어 통일).

역할 및 권한:
  - 담당 모듈: [모듈명]
  - 금지: 다른 도메인/모듈 코드 수정
  - 허용: 담당 모듈 폴더 내 모든 파일 생성/수정

기술 스택:
  - 프론트엔드: Next.js 14 (App Router) + TypeScript
  - UI: Tailwind CSS + Shadcn/UI + Framer Motion
  - 백엔드: Firebase (Firestore / Realtime DB / Cloud Functions)
  - 디자인 토큰:
    * 다크 테마: #05070A(배경) #FFD700(골드) #F8FAFC(텍스트)
    * 라이트 테마: #FAFBFC(배경) #FFD700(골드) #1A1A2E(텍스트)

지금 구현할 기능:
  1. [구체적 기능 1]
  2. [구체적 기능 2]
  3. [구체적 기능 3]

완료 기준:
  - [테스트 가능한 완료 조건]

시작해주세요.
```

---

## PART 9 — FAQ

**Q: Tournament는 실제 FIFA 2026 일정을 따라야 하나요?**
A: 아닙니다. Tournament Host가 설정한 Tournament Deadline만 유효합니다.

**Q: Round별 기간을 설정하는 로직이 필요하지 않나요?**
A: 불필요합니다. Round에는 Deadline이 없습니다. Voter의 투표 흐름에 따라 시스템이 자동으로 라운드를 전환합니다.

**Q: Voter가 Tournament를 만들 수 있나요?**
A: MVP 기간에는 불가합니다. System Admin만 /admin/lab에서 생성 가능. MVP 이후 검토 예정입니다.

**Q: 비로그인 상태에서 투표할 수 있나요?**
A: 불가합니다. 투표 시 Google/Apple 로그인이 필수입니다.

**Q: 하루 투표 제한은 전체 합산인가요, Tournament별인가요?**
A: Tournament별 1회 (각 Tournament마다 독립 카운트, 1일 1 Match만 가능).

**Q: 투표 결과로 예측 정확도를 보여주는 기능이 필요하지 않나요?**
A: 전혀 필요 없습니다. 팬 선호 투표 서비스이지 예측 서비스가 아닙니다.

---

## PART 10 — Claude 협업 운영 가이드 [v1.4 신규]

> 대표님과 Claude(48티오)가 협업하면서 실제로 겪은 문제와 해결책을 기록합니다.
> 다음 번에 같은 실수를 반복하지 않기 위한 운영 가이드입니다.

---

### 10-1. Claude가 볼 수 있는 것 vs 없는 것

```
✅ Claude가 볼 수 있는 것:
  - 이 대화창에서 주고받은 내용
  - 대표님이 이 Claude 프로젝트에 직접 업로드한 파일
    (프로젝트 지식 = Project Knowledge)
  - 대표님이 대화창에 첨부(드래그 앤 드롭)한 파일

❌ Claude가 볼 수 없는 것:
  - 대표님 Mac 로컬 폴더 (~/Projects/worldcrown48/ 등)
  - 로컬에 저장된 파일 내용
  - 이전 대화 내용 (새 대화를 시작하면 초기화됨)
```

**⚠️ 핵심 원칙:**
> Claude가 "파일이 없습니다"라고 해도, 로컬에 있을 수 있습니다.
> 로컬 파일 확인은 반드시 터미널 `find` 명령어로 직접 확인하세요.

```bash
# 로컬 파일 찾기 예시
find ~ -name "CONTEXT.md" 2>/dev/null
find ~ -name "*.md" 2>/dev/null
```

---

### 10-2. 로컬 파일 작업 표준 절차

**Claude가 만든 파일을 로컬에 반영할 때 반드시 이 순서를 따르세요.**

```
Step 1. 로컬에 기존 파일이 있는지 확인
  find ~/Projects/worldcrown48/ -name "파일명" 2>/dev/null

Step 2. 기존 파일 백업 (있다면)
  cp ~/Projects/worldcrown48/파일명 ~/Projects/worldcrown48/파일명_backup_날짜.md

Step 3. Claude가 만든 파일 다운로드
  → 대화창에서 파일 옆 ↓ (다운로드) 버튼 클릭
  → ~/Downloads/ 에 저장됨

Step 4. 다운로드 확인
  find ~/Downloads -name "파일명" 2>/dev/null

Step 5. 로컬 프로젝트에 복사
  cp ~/Downloads/파일명 ~/Projects/worldcrown48/파일명

Step 6. 정상 반영 확인
  head -3 ~/Projects/worldcrown48/파일명
```

**⚠️ 터미널 명령어는 반드시 한 줄씩 입력하고 Enter**
여러 줄을 한 번에 붙여넣으면 명령어가 섞여 오류가 납니다.

---

### 10-3. 파일 다운로드 버튼 위치

Claude가 파일을 만들면 대화창에 아래처럼 표시됩니다:

```
📄 파일명
   파일명.md        ← 파일 이름
   [ ↓ ]           ← 이 버튼을 클릭하면 ~/Downloads/ 에 저장됨
```

다운로드 버튼을 누르지 않으면 로컬에 파일이 없습니다.
터미널 cp 명령어를 실행하기 전에 반드시 다운로드 먼저!

---

### 10-4. Mac 로컬 프로젝트 구조 (실제 경로)

```
실제 경로: /Users/jinii/Projects/worldcrown48/

~/Projects/worldcrown48/
├── CLAUDE.md                           ← Claude 에이전트 진입점 (v1.1)
├── CONTEXT.md                          ← 프로젝트 컨텍스트 (v0.3)
├── LANGUAGE.md                         ← 공식 한/영 용어 정의서 (v1.2)
├── WorldCrown48_ProjectSkill.md        ← 마스터 스킬 (v1.5)
├── WorldCrown48_Stitch_Design_Spec_v2.0.docx
├── docs/
└── graphify-out/
```

**경로 단축키:**
```bash
# worldcrown48 폴더로 이동
cd ~/Projects/worldcrown48

# 폴더 안 파일 목록 확인
ls ~/Projects/worldcrown48/

# 폴더를 Finder에서 열기
open ~/Projects/worldcrown48/
```

---

### 10-5. Claude 프로젝트 지식 관리

**프로젝트 지식(Project Knowledge)에 올려야 할 파일:**

| 파일 | 용도 | 업로드 시점 |
|------|------|------------|
| `CONTEXT.md` | 프로젝트 전체 컨텍스트 | 업데이트마다 재업로드 |
| `LANGUAGE.md` | 공식 용어 정의 | 업데이트마다 재업로드 |
| `WorldCrown48_ProjectSkill.md` | 마스터 스킬 (이 파일) | 업데이트마다 재업로드 |

**업로드 방법:**
```
Claude.ai → 프로젝트 선택 → 설정(⚙️) → 프로젝트 지식 → 파일 추가
```

**⚠️ 주의:** 로컬 파일을 수정해도 Claude 프로젝트 지식은 자동 동기화 안 됩니다.
변경 후 반드시 수동으로 재업로드하세요.

---

### 10-6. 자주 발생하는 문제와 해결책

| 문제 상황 | 원인 | 해결 방법 |
|-----------|------|-----------|
| Claude가 "파일이 없다"고 함 | 로컬 파일은 Claude가 볼 수 없음 | `find ~` 명령어로 직접 확인 |
| cp 명령어에서 "No such file or directory" | 다운로드를 안 했거나 경로가 틀림 | 다운로드 버튼 클릭 후 `find ~/Downloads` 확인 |
| 터미널 명령어 오류 | 여러 줄을 한 번에 붙여넣음 | 한 줄씩 입력하고 Enter |
| 새 대화에서 이전 내용을 모름 | Claude는 대화 간 기억 없음 | 프로젝트 지식에 파일 업로드로 해결 |
| 용어가 혼용됨 (관리자/Host 등) | LANGUAGE.md 미참조 | LANGUAGE.md 먼저 확인 |

---

## PART 11 — 변경 이력

| 버전 | 날짜 | 주요 내용 |
|------|------|-----------|
| **v1.5** | **2026-05-13** | **CLAUDE.md v1.1 · CONTEXT.md v0.3 정책 변경 반영** |
| | | ★ "Candidate" → "Contestant" 용어 전체 통일 (LANGUAGE.md v1.2) |
| | | ★ "Round Deadline" 폐지 → "Tournament Deadline"만 존재 |
| | | ★ Round 자동 전환 원칙 재정의: Host 수동 전환 → Voter 투표 흐름 자동 |
| | | ★ 일일 투표 제한: 5회 → 1회로 강화 |
| | | ★ 디자인 토큰: 단일 다크 → 듀얼 테마 팔레트 (다크 + 라이트) |
| | | ★ 도메인 구조에 테마 표시 추가 (🌑 다크 / ☀️ 라이트) |
| | | ★ 에이전트 임무 템플릿에 듀얼 테마 디자인 토큰 반영 |
| | | 로컬 경로 및 파일 버전 정보 최신화 |
| v1.4 | 2026-05 | PART 10 신규 추가: Claude 협업 운영 가이드 |
| | | Claude 접근 범위 명확화 (로컬 vs 프로젝트 지식) |
| | | 로컬 파일 작업 표준 절차 6단계 수립 |
| | | 다운로드 버튼 안내, Mac 실제 경로 기록 |
| | | 자주 발생하는 문제 & 해결책 표 추가 |
| | | 전체 역할 용어 수정 (관리자 → Tournament Host) |
| v1.3 | 2026-05 | 서비스 정체성 명문화, 라운드 기간 고정 제거 |
| | | Tournament Host 역할 신규 정의 |
| | | Round Deadline = Tournament Host 권한 확립 |
| v1.2 | 2026-05 | 투표 정책 v4.2 (Layer 1 제거) |
| v1.1 | 2026-05 | Flutter → Next.js 전환 기록 |
| v1.0 | 2026-05 | 최초 작성 |

---

*© 2026 WorldCrown48 | 작성: 48티오 | ProjectSkill v1.5 | CONFIDENTIAL*
