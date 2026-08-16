# WC48 다음 세션 시작 프롬프트 (작성 2026-08-08 저녁)

## 지난 세션(2026-08-08)에서 완료된 것 — 재확인 불필요

1. **용어 표시 층 트랙 완전 SHIPPED** — PR #60(표시 용어)·#63(작성 층 회귀)·#64(번역 층 용어집 displayTerms.ts)·#61(쿠키 정책)·#62(백필 도구+실행) 전부 머지·배포·라이브 실측. 발행 기사 3건 백필 완료(30필드, 잔여 0, 원본 백업 outputs/에 로컬 보관). 3언어 4축 검증: Voter 0 · 팬/fan/fans · aficionado·votante 0 · 고유명사 영문 유지. es 지칭 "fan(s)" 고정은 대표 확정(B안).
2. **저작권 상담 답변 수령·처리 완료** — 예측 7건 전부 방향 적중 + 신규 쟁점 1(§104조의2 추출 적법성). 임베드 = 대법원 판례로 안전 확인(최강 카드 공식화). **클립 파이프라인 = 임베드 파사드 기본값 확정**(7/21 조항 발동, 대표 승인). CC-NC 전면 배제 확정. G-LEGAL-3 게이트 완료. 산출물: `docs/legal/WC48_저작권상담_답변_2026-08-08.md`(+PDF) · `WC48_IP-LEGAL-BRIEF_v2.1.md` — PR #65에 커밋됨.
3. **KICK-DOCS-SYNC 완료 — PR #65** (머지는 대표가 세션 말미 진행, STEP 0에서 확인) — CLAUDE.md v2.3(Stale-Doc Guard 신설·AI-Report v2.5·표시 용어·MVP 언어 각주)·DESIGN_BRIEF·C5·I18N_POLICY 배너·locale.ts 주석·법무 문서 2+1건 커밋. "결정↔문서 어긋남" 사건(es MVP2 오답) 일소.
4. **재발 방지 규칙 확립**: ①결정 확정 시 같은 세션에서 규범 문서 grep 스윕(Stale-Doc Guard, CLAUDE.md에도 박제) ②용어·표시 규칙 변경 시 LLM이 텍스트를 만지는 전 층(작성·번역) 점검 ③프롬프트 변경은 테스트 green이어도 생성물 눈 확인 필수
5. **자격증명**: 키 값 셸·리포 잔존 0. 서비스 계정 키 2개 존재 확인 → 대표가 `37e1f69147` 폐기+파일 삭제 예정(STEP 0 확인)
6. **기사 카운트 정정**: 발행 기사 이미  3건 → **다음 기사는 4호** ("2호" 표현 폐기)

## STEP 0 — 세션 시작 확인 (3분)

1. PR #65 머지 완료 여부 (미머지면 먼저)
2. 서비스 계정 키 정리 완료 여부 (콘솔에서 37e1f69147 폐기 + Downloads .json 삭제)
3. 대표 로컬 `git pull origin main` + Claude Code `/login` 상태

## 본 작업 — C. Pitch 대개편 토의 (이 세션의 단일 주제, 길고 어려운 토의 예상)

**배경 (2026-08-08 대표 강한 문제 제기 + Cowork 코드 실측):** The Pitch의 뉴스 노출이 3중 — ①"Around the Pitch" 6카드 = 6월 A-1 와이어프레임 **하드코딩 모형**(가짜 기사·링크 없음·picsum 랜덤 이미지·"Powered by GNews"는 문자열뿐, 연동 0건) ②"더 보기→Arena Newsroom"(진짜) ③우측 하단 NewsRail 응급패치(진짜). **thenewsapi는 가입 ~2달째 연동 코드 0건.** 생산 라인(기사 생성·3언어·용어)은 완성됐으나 노출 화면이 6월 모형 그대로인 불일치 상태.

**토의 안건 (상세 = 메모리 [[pitch-reorg-agenda]]):**
1. **The Pitch 첫 화면 우선순위** — 방문자가 가장 먼저 만나야 할 것 (대표의 이상적 그림 청취부터 시작)
2. **뉴스 창구 1원칙** — 뉴스룸 3개→1개 통합 구조
3. **Around the Pitch 존폐** — 대표 확정 원칙 "모형·미연동 섹션은 **삭제 또는 즉시 실데이터 연결**, 숨김 금지" 적용: thenewsapi로 살릴지 / 섹션째 삭제할지 (Cowork 참고 의견: 외부 뉴스는 어디에나 있는 콘텐츠, 우리 기사는 우리만의 콘텐츠 — 정체성 기준으로 판단)
4. **기사 이미지 정책** — 이미지 없는 기사의 카드 디자인 (브랜드 카드/타이포 카드, 대표 디자인 영역)
5. NewsRail 정식 디자인 + 우측 상설 프레임 (TODO(ND-TEMP-MOUNT))
6. SiteMapSheet 정식 디자인 (간결·미니멀)
7. es 커버리지 스윕 (정책 문서 content/es·ConsentModal·/account — 정책 문서는 AI 번역 후 대표 검수)
8. **디자인 시스템 v2.3 vs v2.4 단일 진실 확정** (CLAUDE.md는 v2.3 지정, v2.4(Footer-Only Lock) 존재·terms/privacy가 인용 — Claude Design과 함께 확정 후 소형 PR)

**진행 방식**: 토의(Cowork)로 스코프·정보 구조 확정 → 시안(대표+Claude Design) → 핸드오프 작성(Cowork) → 구현(Claude Code). 개편 화면은 표시 용어(팬/Fan/fans) 기준.

## 미결 이월 (범위 밖, 잊지 말 것)

- **4호 기사 발행** — 팬 언어+킥 비트+용어집 전부 라이브라 언제든 가능. 개편과 병행 또는 후순위 (대표 판단)
- **소싱 2차** (K1 잔여 37명) — 법적 기준 확정됨(NC 배제·묵시적 허락 부정·임베드 우선). Pitch 개편 후
- 3fb980 ko 기존 오타 "어떤 한글로 는" (수정 여부 대표 판단) · 약관/커뮤니티/개인정보 원문 Voter = 법적 정의어라 의도적 유지(변경은 G-LEGAL 영역)
- Tournament Host 한국어 표기 · 게스트 표기 점검 · issue #55(CI Write 연구) · Node 20 EOL(2026-10-30) · 신문법 필수 표시 체크리스트 · G-MEDIA-1 · DMCA 대리인 · G-LEGAL-1(수익화 전, 중요도 상향)·G-LEGAL-2 · 수익모델 상세 · 48/24/12 브래킷 · sourceLang 영속화 · 클립 재개 조건(추출 수단 §104조의2 확인 + 대표 재결정)

## 필독 메모리

[[pitch-reorg-agenda]] (토의 안건 상세) [[language-display-terms-2026-08-06]] (SHIPPED 상태·교훈) [[legal-ip-strategy-2026-07-13]] (상담 반영본) [[project-design-system-rebuild]] (v2.3/v2.4 충돌) [[feedback-decision-doc-sync]] [[feedback-broken-signal-not-green]] [[festival-language-not-battle]] [[feedback-complete-prompts-for-claude-code]] [[feedback-claude-code-suggested-prompts]] [[feedback-explain-dev-tooling]] (은어 첫 사용 시 설명 포함)

---
*© 2026 WorldCrown48 | Next Session Prompt | outputs/handoffs-staging/*
