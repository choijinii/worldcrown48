# WC48 다음 세션 시작 프롬프트 (작성 2026-08-07)

## 지난 세션(2026-08-02~07)에서 완료된 것 — 재확인 불필요

1. **C-1·G-1 E2E 조사 트랙 완전 종결**: 실패 7건·근본원인 4개 전부 판정. G-1 3건 = 스펙 결함 → PR #51 머지(red→green 실측). C-1 4건 = HF-2 유래였으나 판별 실험(동의 프로브)으로 **CI 한정 확정, P0 해제** → PR #54 Arena 로딩 하드닝 머지(무한 정지 제거·not-found 0.3초 플래시 수정·320px 6.4s→3.7s). 판정 보고서 #52·#53·#56 머지. CI Write 채널 근본원인 = **issue #55**(연구 과제, 별도 일정)
2. **hashIp 403 해결**: 진범 = Cloud Run 미인증 호출 권한(IAM) 부재 (CORS 미배포 아니었음). 대표가 콘솔에서 "공개 액세스 허용" 설정 → POST 200 실측. 교훈: 403+Google Frontend HTML = 함수 도달 전 차단 = IAM 의심
3. **Firestore 테스트 문서 2건 대표가 콘솔에서 삭제 완료**
4. **/news 사이트맵 노출**: PR #57 머지 — SiteMapSheet에 Newsroom 항목(Domain 7 신설 없이 n:null), 등록 심사 도달성 확보
5. **CI 정비 완전 종결 (#57·#58·#59)**: E2E 워크플로 10개 전부 head-SHA 해석기 O · PREVIEW_URL env 0 · self-path O · skip 게이트 0(프리뷰 없으면 hard fail) · 시크릿 참조 0건. **함정 2종 판별법**: 의심스러운 green은 로그에서 "Running N tests" + 검사한 배포 주소 확인
6. **용어 표시 층 확정 (대표 결정 6건)**: Voter 표시 = ko "팬" / en·es "Fan". ★기사 최우선. Voter Count → "참여 팬 수"/"Fan Count". 기본 닉네임 "Voter" 유지(의도된 예외). ConsentModal 변경, 관리자 화면·Tournament/Contestant 원어 유지. 확정본: `outputs/handoffs-staging/LANGUAGE-용어결정_확정_2026-08-06.md`
7. 6월 스태시 패치 백업 후 drop, 워크트리 정리(wc48-nd1·wc48-b2), Stale-Doc Guard 문구는 CLAUDE.md 개정 때 재활용 (백업: outputs/handoffs-staging/stash-2026-06-11-*.patch)

## STEP 0 — 세션 시작 시 확인 (5분)

1. **저작권 상담 답변 도착 여부** (대표가 사이트 직접 확인 중, 08-07 기준 미도착) — 도착 시 모든 것에 우선: PDF 보관 → `docs/legal/WC48_저작권상담_질의서_v1_2026-07-25.md` 매핑표 반영 → 법리 브리프 v2.1
2. 대표 로컬 main 동기화 (`git pull origin main` — #59까지) + Claude Code `/login` 상태

## 본 작업 (우선순위 순)

**A. 용어 킥 실행** — Claude Code `/clear` 후 `outputs/handoffs-staging/KICK_용어-표시층-적용_2026-08-06.md` 전체 붙여넣기.
- 스코프: LANGUAGE.md 개정(표시 용어 열) + newsPrompts.ts 기사 지침(팬/Fan·참여 팬 수) + ConsentModal 3곳. 코드 식별자·기본 닉네임 "Voter"·관리자 화면 불변
- **functions 재배포 필수** (기사 지침은 배포돼야 다음 기사부터 반영)
- 완료 보고에 "1호 기사 속 Voter 표기 여부" 포함 → **대표 결정**: 1호 수정 vs 시대의 흔적으로 유지

**B. 2호 기사 발행** — 용어 적용 후 생성하면 "팬" 언어의 첫 기사. 킥 비트 지침 반영 첫 실전. 1호와 글맛 비교 → 근거 패널 대조 → 발행. 주 2~3건 리듬의 두 번째 걸음

**C. Pitch 개편(대개편) 토의** — 안건 누적: [[pitch-reorg-agenda]] — ①우측 상설 프레임 + NewsRail 정식 디자인 ②SiteMapSheet 정식 디자인(2026-08-06 대표: 현행 투박한 박스 → 간결·미니멀) ③랭킹 개편 핸드오프 시 News Desk 집계 영향 체크. 시안 = 대표 + Claude Design → 구현 = Claude Code. 실행 순서(확정): Pitch 개편 → Arena 홈(+Bracket Size UI) → 랭킹 개편(Crown Score)

## 미결 이월 (범위 밖, 잊지 말 것)

- 상담 답변 처리 (도착 시 최우선) · 소싱 2차(K1 잔여 37명, 상담 ⑥⑦ 후 판단)
- **seed-news.mjs D′ — 우선순위 상향됨**: AI-Report E2E 단언(nd1-news-desk.spec.ts:81)이 프리뷰 기사 부재로 CI에서 한 번도 실행 안 됨
- issue #55 (CI Write 채널 원인 연구)
- 용어 미결 2건: Tournament Host 한국어 표기("대진을 만든자" 어색) · 게스트 표기 점검
- 신문법 필수 표시사항 체크리스트(등록 신청 직전) · G-MEDIA-1 · DMCA 대리인($6, MVP2 전) · G-LEGAL-1/2
- CLAUDE.md 개정(피벗 범위 확정 후 — AI-Report v2.5·디자인 시스템 참조·Stale-Doc Guard 포함) · 수익모델 상세
- 48/24/12강 브래킷 선택 · /account 스페인어 · Node 20 EOL(2026-10-30, Cloud Run 콘솔 경고 노출 중) · sourceLang 영속화 · 투표 완료 뉴스 스니펫(보류)

## 필독 메모리

[[c1g1-e2e-verdict-2026-08-04]] [[language-display-terms-2026-08-06]] [[pitch-reorg-agenda]] [[feedback-broken-signal-not-green]] [[feedback-e2e-frozen-preview-url]] [[festival-language-not-battle]] [[feedback-complete-prompts-for-claude-code]] [[feedback-claude-code-suggested-prompts]] [[feedback-explain-dev-tooling]] (은어 첫 사용 시 설명 규칙 포함)
