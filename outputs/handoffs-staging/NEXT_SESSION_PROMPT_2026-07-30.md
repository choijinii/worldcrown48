# WC48 다음 세션 시작 프롬프트 (작성 2026-07-30)

지난 세션(2026-07-26~30)에서 완료된 것 — 재확인 불필요:

1. **ND-1 News Desk 트랙 완결**: PR #47(본체)·#48(폴리시 5건)·#49(CI head-SHA 일괄 전환)·#50(조사 메모) **전부 머지 완료**. functions(신규 4종 포함)·rules·인덱스 배포 완료, admin 커스텀 클레임 설정 완료(`functions/scripts/set-admin-claim.mjs`), 미사용 시크릿 `C1/C2/D1/G1_PREVIEW_URL` 4종 삭제 완료
2. **★ 1호 기사 PUBLISHED** (주간 랭킹) — 인터넷신문 등록을 향한 기사 축적 시계 가동 시작. 목표 리듬 = 주 2~3건
3. **기사 작성 지침 7개 완성**: ①사용설명 금지 ②훅 필수 ③비주얼 병행 ④정서적 클로저 ⑤축제의 언어 ⑥용어·Vote Count 금지 ⑦**킥 비트**(클로저 직전 반전·콜백·강조 — 대표 지시로 추가, functions 재배포로 프로덕션 라이브)
4. NewsRail은 응급패치(불투명·겹침 해제)까지만 — **정식 디자인 = Pitch 개편(대개편) 스코프** (대표 결정, Claude Design 시안 취소). `TODO(ND-TEMP-MOUNT)` 주석 유지
5. **CI 신호 정상화**: 4개 워크플로우 frozen-preview 함정 제거 실증. D-1·C-2 = 완전 green. **C-1·G-1 = 실기 실패 4건 드러남** (아래 본 작업 A)
6. **프로세스 규칙 신설** (대표 지적 → 규칙화): [[feedback-broken-signal-not-green]] — 신호 고장 빨간불은 "가짜/무시"가 아니라 "판정 불능·보류". 이번 세션은 이 규칙을 읽고, **축하가 아니라 조사부터** 시작할 것

---

## STEP 0 — 세션 시작 시 확인 (5분)

1. **저작권 상담 답변 도착 여부** (~08-02 예상, Gmail + 저작권위원회 사이트) — **도착 시 모든 것에 우선**: PDF 보관 요청 → `docs/legal/WC48_저작권상담_질의서_v1_2026-07-25.md` 하단 매핑표대로 시스템 결정 → 법리 브리프 v2.1 갱신
2. 대표 로컬 main 동기화 확인 (`git pull origin main` — #48·#49·#50 머지분)
3. **wc48-nd1 워크트리 정리(§16)**: `git worktree remove ~/Projects/wc48-nd1` + 머지된 브랜치 정리(feat/nd1-news-desk·feat/nd1-1-newsdesk-polish·docs/nd1-e2e-followup). 구 스태시(6월 wip) 잔존 — 정리 여부 대표 확인
4. Claude Code 쓸 예정이면 `/login` 상태 확인

## 본 작업 후보 (우선순위 순 — 대표와 순서 확정 후 진행)

**A. C-1·G-1 E2E 실기 실패 조사** — 시작점 = `outputs/handoffs-staging/ND1-followup-e2e-body-failures-2026-07-30.md` (PR #50, 증거 run id·가설·spec:line·재현·판정 포인트 수록)
* 4건: ①G-1:100 needs-signin gate card 미표시(global-setup 인증 간섭 가설) ②**G-1:124 SiteMapSheet Domain 6 live link 아님 — 뉴스 접근성 = 등록 심사 연관 가능성, 최우선** ③C-1:127 vote-left "P1"(5/5 Voter 시드 의존) ④C-1:264 mobile320 'No Vote Rate %' 미표시
* 절차: 트레이스 먼저 열기 → 시드 의존 확인 → global-setup 검증. **스펙 노후 vs 앱 회귀 구분이 핵심**. frozen-preview 재도입 금지

**B. 2호 기사 발행** — 킥 지침(7번) 반영된 첫 초안 생성 → 1호와 글맛 비교 → 근거 패널 대조 → 발행. 주 2~3건 리듬 확립의 두 번째 걸음

**C. Pitch 개편(대개편 재개) 토의** — 우측 상설 프레임 + NewsRail 정식 디자인 포함. 실행 순서(확정): Pitch 개편 → Arena 홈(+Bracket Size 선택 UI) → 랭킹 개편(Crown Score). 랭킹 개편 핸드오프 작성 시 "News Desk 집계 함수 영향 체크"(TODO(ND-CROWN-SCORE)) 필수

## 미결 이월 (범위 밖, 잊지 말 것)

* 상담 답변 처리 (도착 시 최우선) — PDF 보관 + 매핑표 반영 + 브리프 v2.1
* 소싱 2차(K1 잔여 37명) — 상담 답변(⑥⑦) 후 판단
* 투표 완료 뉴스 스니펫 — 보류, 대표에게 개념을 그림으로 재설명 필요
* 신문법 필수 표시사항 체크리스트 (등록 신청 직전) · G-MEDIA-1(등록증 전)
* DMCA 지정대리인 등록($6, MVP2 전) · G-LEGAL-1(수익화 전) · G-LEGAL-2(MVP2 전)
* CLAUDE.md v2.3 개정(피벗 범위 확정 후) · 카피/용어(LANGUAGE.md 안건) · 수익모델 상세
* 48/24/12강 브래킷 선택 · /account 스페인어 · Node 20 EOL(2026-10-30) · sourceLang 영속화
* ~~E2E 워크플로우 일괄 정리~~ → **PR #49로 해결 완료** (목록에서 제거)

## 필독 메모리

[[nd1-handoff-2026-07-26]] [[feedback-broken-signal-not-green]] [[media-pivot-2026-07-21]] [[news-desk-2026-07-22]] [[festival-language-not-battle]] [[reorg-ux-decisions-2026-07-10]] [[feedback-complete-prompts-for-claude-code]] [[feedback-superpowers-in-handoff]]
