# WorldCrown48 설계서 작성 스킬 (DesignDocSkill v1.0)

> **목적:** 월크48 플랫폼 구축 전략 설계서를 작성·수정할 때 반드시 준수해야 하는 불변 규칙과 구조 가이드.
> Claude Code 에이전트 및 Claude 대화에서 설계서 관련 작업 시 이 파일을 최우선 참조.

---

## ⛔ IMMUTABLE TERMINOLOGY RULE — 절대 불변 용어 규칙

> **RULE 1: NEVER change or overwrite an established term definition.**
> **RULE 2: When a new concept arises, CREATE A NEW TERM. Do NOT redefine existing terms.**
>
> 이 규칙은 모든 에이전트, 모든 세션, 모든 기여자에게 예외 없이 적용된다.
> 기존 용어를 임의로 변경하면 전체 모듈과 AI 뉴스 생성 전반에 연쇄 오류가 발생한다.
> 용어 정의의 단일 진실 공급원: `LANGUAGE.md`

---

## ★ 절대 불변 규칙 (위반 시 설계서 전체가 오염됨)

### 규칙 1: Round Deadline은 존재하지 않는 개념이다

```
❌ 절대 금지 — 아래 단어/개념은 설계서 어디에도 등장해서는 안 됨:
  - "Round Deadline"
  - "라운드 마감일"
  - "라운드 기간"
  - "라운드 마감"
  - "Deadline 도달 후 라운드 전환"
  - "Host가 라운드를 시작/전환/마감"
  - "Host가 수동으로 다음 라운드 시작"
  - "rounds[].deadline"  (Firestore 스키마에서도 금지)

✅ 올바른 개념:
  - Tournament Deadline = Tournament Host가 설정하는 Tournament 전체의 단 하나의 마감일
  - Round 전환 = Voter가 해당 Round의 마지막 Match 완료 → advanceRound() 시스템 자동 실행
  - Round에는 시작·종료·기간·마감 개념이 없음
  - Host는 라운드에 관여하지 않음
```

**왜 치명적인가:**
Round Deadline이 존재한다고 가정하면 → "Deadline 도달 시 Host가 수동으로 다음 라운드 시작"이라는 로직이 생김 → Host가 자리 비우면 100만 명의 투표가 멈춤 → 대진 진행 불가 → 서비스 불능

### 규칙 2: Voter 투표 흐름 기반 자동 전환이 진리

```
Voter 1명의 대진(Tournament) 전체 흐름:

1. Tournament 입장
2. 48강 Round: 24개 Match 순서대로 → Voter가 하나씩 선택
   → 24번째 Match 완료 → advanceRound() 자동 실행
3. 라운드 전환 효과: "맨 어브 더 월드컵 24강" (시스템 자동)
4. 24강 Round: 12개 Match 순서대로 → 마지막 완료 → 자동 전환
5. 라운드 전환 효과: "맨 어브 더 월드컵 12강" (시스템 자동)
6. 12강 Round: 6개 Match 순서대로 → 마지막 완료 → 자동 전환
7. 라운드 전환 효과: "맨 어브 더 월드컵 6강" (시스템 자동)
8. 6강 Round: 3개 Match 순서대로 → 마지막 완료 → 자동 전환
9. 라운드 전환 효과: "맨 어브 더 월드컵 결승" (시스템 자동)
10. 결승(3강 Final): 3명 중 1명 선택 → Champion 확정
11. Crown Card 생성 → 뉴스 선택 → SNS 공유

핵심: 이 전체 흐름에서 Host가 하는 일은 없다.
Voter가 하는 일은 "Match에서 한쪽을 선택하는 것" 뿐이다.
나머지는 모두 시스템 자동.
```

### 규칙 3: 반응형은 3가지 화면 모두 확인 (v4.8 확정)

```
반응형 대상 도메인: Domain 0, 1, 3, 4, 5
3가지 화면: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
데스크탑 전용: Domain 2 (THE LAB), Domain 6 (ADMIN DASHBOARD)

v4.7까지는 "모바일+PC" 2가지였으나, v4.8에서 태블릿 포함 3가지로 확장.
```

### 규칙 4: 용어 통일 (LANGUAGE.md v1.2 기준)

```
✅ Contestant (❌ Candidate)
✅ Match (❌ Battle, 배틀, 경기)
✅ Tournament Deadline (❌ Round Deadline — 존재하지 않는 개념)
✅ advanceRound() 시스템 자동 (❌ Host가 라운드를 전환한다)
✅ Voter (❌ 참여자, 유저, 사용자)
✅ Champion (❌ 우승자, 1등)
✅ Crown Card (❌ 결과 이미지, 결과 카드)
```

---

## 설계서 필수 구조 (v4.8 기준 — 단 하나도 빠지면 안 됨)

```
표지 + v4.0→v4.8 변경사항 요약 테이블
챕터 1: 월크48 핵심 3대 원칙
  - 원칙① 서비스 정체성 (v4.2 공식화)
  - 원칙② 대진 흐름 원칙 — Voter 투표 흐름 기반 자동 전환 (★ v4.8 전면 개정)
  - 원칙③ 투표 정책 (v4.2 확정)
챕터 2: 전략 개요 및 핵심 원칙
  - 2.1 전략 3대 원칙
  - 2.2 MVP 3단계 로드맵
  - 2.3 서비스 도메인 구조 — 총 7개
챕터 3: 기술 스택 확정
  - 3.1 Flutter vs Next.js 검토 결과
  - 3.2 v4.1 확정 기술 스택
  - 3.3 CONTEXT.md 표준 템플릿
[Domain 0] LAUNCH PAD — 도메인 개요 + 모듈 분해 + 제작 가이드 + 에이전트 A-0 + 전환 시점
[Domain 1] THE PITCH — 도메인 개요 + 모듈 분해 + 제작 가이드 + 에이전트 A-1
[Domain 2] THE LAB — 도메인 개요 + 모듈 분해 + M0 마법사 상세 + M2 48 Nodes 상세 + 제작 가이드 + 에이전트 B-1
[Domain 3] THE ARENA — 도메인 개요 + 모듈 분해 + M2 VS Battle 상세 + M7 부정투표 상세 + M8 뉴스룸 상세 + 뉴스 로드맵 + 제작 가이드 + 에이전트 C-1/C-2/C-3/C-4
[Domain 4] THE LOCKER ROOM — 도메인 개요 + 모듈 분해 + 제작 가이드 + 에이전트 D-1
[Domain 5] POLICY HUB — 도메인 개요 + 파일 분리 구조 + 모듈 분해 + 쿠키 3-티어 + 법적 문서 URL + 에이전트 E-1
[Domain 6] ADMIN DASHBOARD — 도메인 개요 + 모듈 분해 + 5지표 + 제작 가이드 + 에이전트 G-1
챕터 8: 전체 에이전트 배치 맵 (14개 에이전트)
챕터 9: Claude Code 바이브코딩 실행 완전 가이드 (핵심 원칙 + 임무 템플릿 + 터미널 명령어)
챕터 10: 백엔드 Cloud Functions 모듈 설계 (전체 목록 + onVote + scheduleRankingCache + getNewsCache)
챕터 11: Firestore 전체 컬렉션 스키마 (전체 목록 + tournaments + votes + ranking_cache + users)
챕터 12: 즉시 실행 체크리스트 (개발 시작 전 + MVP 1 에이전트 실행 순서 + MVP 1 완료 기준)
챕터 13: 용어 해설 (Glossary)
꼬리말 + 저작권
```

---

## Firestore 스키마 주의사항

```
tournaments 컬렉션:
  - tournamentDeadline: Timestamp  ← Tournament 전체 마감일 (유일한 Deadline)
  - rounds 배열에 deadline 필드 절대 금지
  - currentRound: number  ← 시스템이 advanceRound()로 자동 증가

❌ 금지 스키마:
  rounds: [{ roundNumber: 1, deadline: Timestamp }]  // deadline 필드 금지!

✅ 올바른 스키마:
  tournamentDeadline: Timestamp,  // Tournament 전체 마감일
  currentRound: 1,                // 시스템 자동 관리
```

---

## 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1.0 | 2026-05-13 | 최초 작성. Round Deadline 금지 규칙 영구 박제. 반응형 3화면 규칙. 설계서 필수 구조 정의. |

---

*© 2026 WorldCrown48 | 작성: 48티오 | DesignDocSkill v1.0 | CONFIDENTIAL*
