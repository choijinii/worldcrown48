# KICK-RESUME — 용어 표시 층 적용 이어받기 (편집 완료 → 검증·커밋·배포)

작성: 2026-08-08 | 발신: Cowork | 수신: Claude Code
원본 킥: `outputs/handoffs-staging/KICK_용어-표시층-적용_2026-08-06.md` (스코프·금지·완료 기준 전부 그대로 유효 — 필독)
결정 근거: `outputs/handoffs-staging/LANGUAGE-용어결정_확정_2026-08-06.md` (대표 확정 v1.0)

---

## 0. 확정 사실 — 재확인 불필요

- 이전 세션에서 이 킥이 **편집 단계까지 실행되고 중단**됐다. 현재 상태:
  - 브랜치: `feat/display-term-fan` (main `8daf358` = PR #59에서 분기, **브랜치 커밋 0개**)
  - **미커밋 변경 4파일** (staged 0건, 전부 working tree):
    1. `LANGUAGE.md` — §1에 "표시 용어(Display)" 열 + "표시 용어(Display Term) 층 — v2.0" 절, §13 Voter Count에 v2.0 표기 주석, 개정 이력 v2.0 행 추가됨
    2. `functions/src/core/newsPrompts.ts` — 지침 6 개정(팬/Fan 지칭 · "Voter" 독자 노출 금지 · Voter Count→참여 팬 수(Fan Count)) + 계약 표면 주석 갱신
    3. `functions/src/__tests__/newsPrompts.test.ts` — 표시 용어 describe 블록 추가(마커 4종 존재검증 + `NEWS_STYLE_GUIDE`에 Voter Count 부재 + Voter 정확히 1회=금지 지시 단언)
    4. `components/policy/ConsentModal.tsx` — 문구 3곳 (ko "팬 닉네임 자동 채움" / en "Fan nickname" / en "fans drop off")
- 로컬 main = `8daf358` (#59)까지 동기화 완료. E2E·CI 전부 green 기준점.
- 저작권 상담 답변 = 2026-08-08 기준 미도착 (이 작업과 무관).
- ⚠️ `.git/index.lock`이 남아 있을 수 있다 — Cowork가 원격 브리지로 `git status`를 돌리다 잠금 파일을 지우지 못한 것. git 명령이 "index.lock exists" 에러를 내면 `rm .git/index.lock` 후 재시도 (안전함, 다른 git 프로세스 없음 확인 후).

## 1. 남은 작업 (이 순서대로)

1. **기존 편집 검수** — 4파일 diff를 원본 킥 §1(스코프)·§2(금지)와 대조. 특히: 코드 식별자·DB 필드(`voterId`, `role:'voter'`) 무변경, `UserDropdown`/`UserAvatar` 기본값 "Voter" 무변경, LANGUAGE.md 기존 정의 문장 수정·삭제 0건(추가만) 확인.
2. **ConsentModal es 문구 확인** — 원본 킥 §1-C: "es 대응 문구 있으면 동일 적용". 현재 diff는 ml-ko/ml-en만 건드림. es 스팬이 존재하는데 누락됐으면 적용, 없으면 "es 문구 없음"으로 보고.
3. **테스트 실행** — functions 단위 테스트(newsPrompts 신규 describe 포함) green + client unit + 문구 assertion 있는 관련 E2E green. 스냅샷/assertion에 "Voter 닉네임" 등 옛 문구가 박혀 있으면 갱신.
4. **커밋 → PR 1개** — 문서(LANGUAGE.md)+코드(B·C) 포함. CI green 확인 시 함정 판별법 적용: 의심스러운 green은 로그에서 "Running N tests" 실행 건수 + 검사한 배포 주소(head SHA 프리뷰인지) 확인.
5. **머지 후 functions 재배포 필수** — newsPrompts는 배포돼야 다음 기사부터 반영. 배포 후 반영 확인 방법 1줄 보고.
6. **발행된 1호 기사에 "Voter" 표기 존재 여부 확인 → 보고만.** 수정은 대표 결정 사항 — 임의 수정 절대 금지.

## 2. 금지 (원본 킥 §2 그대로)

- 코드 식별자·DB 필드·컬렉션명 변경 금지 / 기본 표시 이름 "Voter" 유지 / 관리자 KPI 카드 유지 / 코드 주석 속 Voter 유지 / Tournament·Contestant 원어 유지 / LANGUAGE.md 기존 정의 문장 수정·삭제 금지
- 이 PR로 CI red가 생기면 안 된다 (red 발생 시 [[feedback-broken-signal-not-green]] 3분류로 보고: 이 PR 유발 / 판정 불능 / 실기 실패)
- 1호 기사 임의 수정 금지 (확인·보고만)

## 3. 완료 보고에 반드시 포함

1. 변경 전/후 문구 대조표 (LANGUAGE.md·newsPrompts·ConsentModal)
2. 테스트·CI 결과 (실행 건수 + 검사한 배포 주소)
3. functions 재배포 완료 + 반영 확인 방법 1줄
4. **1호 기사 속 Voter 표기 여부** → 대표 결정 대기 (1호 수정 vs 시대의 흔적으로 유지)
5. es 문구 적용 여부 (2번 결과)

---
*© 2026 WorldCrown48 | Kick Resume Prompt | outputs/handoffs-staging/*
