# 티오 저녁 세션 시작 지시서 — 아레나 대개편 착수 (2026-08-31 오후 작성)

## 시작 리추얼 (순서 지킬 것)
1. 프로젝트 메모리 `user-communication-profile.md` → MEMORY.md 상단 → **이 파일** 순으로 읽기.
2. 결정에 쓰일 "확인된 사실"은 재실측(오늘 오전 "대회 0개" 오기 사고 — `utm-campaign-qr-branch-2026-08-31` 메모리 참고).
3. 큰 로드맵 질문은 불필요 — 아레나 대개편 근거 자료는 아래에 다 있음.

## 오늘 낮에 끝난 것 (git·프로덕션 반영 완료, 재조사 불필요)
- **PR #88(계측 소킥 A)·PR #89(QR 삭제 + utm_content + 캠페인 이름표 A안) 둘 다 머지·배포·프로덕션 눈검증 완료.** main = `85a56db`. 로컬 origin/main도 이 시점 최신(대표가 fetch 해줌).
- 편집기 STEP 1에 "캠페인 이름표" 칸 라이브. 마케팅 회신문 전달됨(`marketing/00_strategy/서신_티오→마케팅_UTM_RULES-v1.0-회신_2026-08-31.md`).
- 스택 PR 충돌(Squash 머지 후) 해결 절차는 메모리 `utm-campaign-qr-branch-2026-08-31`에 기록 — 재발 시 그대로.
- 로컬에 `backup/utm-campaign-qr-removal-pre-rebase` 브랜치 남아 있음 — 지워도 안전.

## 저녁 세션의 일: 아레나 매치 대수술 킥 문서 초안
근거 자료(전부 실재 확인됨):
- 확정 스펙: 프로젝트 메모리 `pitch-reorg-agenda` §"Arena 매치 무대 — 확정 스펙"(08-09 대표 확정): VS 스플릿 100vw/vh 50:50 · 호버 flex 1.5~2 + scale(1.1) + saturate 30→100% · 첫 입장 팝업 기기당 1회 · 터치 상하 2탭 · 픽 절정 연출 · 프리로드 · Round Scope Lock·득표율 미표시 · vs-foot 고지문 무대 제거 · 임베드 10초 루프(LoopPlayer, lib/embed 재사용) · Pitch 카드 축소판.
- 계측 내장 의무: `launch-v1_1-2026-08-27` — tournament_start·round_advance(round)·champion_confirmed를 아레나에 **내장**(계측 소킥 A가 이미 6종 구현·머지했으므로, 대수술 후에도 이 이벤트들이 살아있는지가 완료 기준에 들어가야 함).
- 디자인 계약: worldcrown48-design 스킬(v2.3 Twilight Stadium) + 테마 B안(매치·투표=다크). Round 라벨은 라운드 전환 화면에만.
- 동봉 의무: Stale-Doc Guard · 표시 용어 v2.0 인라인(`todo-display-terms-v2` §1) · Superpowers TDD §11(핸드오프 템플릿 v2.0, `handoff-brief-system`).
- 첫 입장 팝업 문구 ↔ 개인정보 정합은 미결(pitch-reorg-agenda §미결).

## 대표께 먼저 여쭐 것 (킥 문서 쓰기 전, 질문은 한 번에)
1. "동영상 위주 재구성"이 08-09 스펙(10초 루프 VS 스플릿) 그대로인지, 그 이상(예: 틱톡 임베드 — 08-31 핸드오프 미해결 5번과 연결)인지.
2. 실행 방식: Claude Code 핸드오프(TDD 포함) vs 티오 직접 — 계측 소킥 A 때 TDD 미적용 보완 논의도 함께.
3. 크라운 카드 시안(마케팅클로드) 논의를 아레나 킥 앞에 둘지 뒤에 둘지.

## 원칙 리마인드
실측 먼저("확인해보니 ~다") · 파생 수정은 사전 고지 · 확인 못 한 건 정직하게 · 문구는 대표 승인 게이트 · 명령은 한 줄씩 + 성공 신호.

---
## ▶ 저녁 세션 진행 기록 (08-31 밤 추가)
- 마케팅 문의 2건 처리: 런칭 부하 점검 회신(`marketing/00_strategy/서신_티오→마케팅_런칭부하점검-회신_2026-08-31.md`, Vercel=Hobby 정정 반영) · 대관 연출 인계 수령(`대관연출_인계_Crown_Ceremony_2026-08-31.md`) — §8 답변은 ARENA-1 킥 §C/§D에 반영, 마케팅 회신문 `서신_티오→마케팅_대관연출-확인회신_2026-08-31.md` 작성·저장 완료(대표가 마케팅클로드에 전달 예정).
- 대표 결정: 두 킥 분할 / VS 영상 호버·탭한 쪽만 재생 / Claude Design→Claude Code 하이브리드 / 아레나 홈 = ① 대회별 대기실 + 마감 포함 아카이브 / 전광판 = 썸네일 자동 콜라주.
- 발행: `handoffs-staging/KICK_ARENA-1_매치무대-대수술_2026-08-31.md`(v0.9) · `KICK_ARENA-2_아레나홈-대기실-아카이브_2026-08-31.md`(v0.5). 브리프·스케치 HTML 3종 outputs/.
- 다음 세션 할 일: ⓪ **아레나 홈 모양 ①(대회별 대기실)·전광판 콜라주 확정 재확인**(밤늦은 문답이라 확정 처리 보류) ① 대표의 ARENA-1 v0.9 검토 의견 반영 ② (완료) ③ 대표가 Claude Design 번들을 주면 킥 수치 규칙과 대조 → v1.0 ④ 부하 테스트 소킥(9/17) 준비.
- 메모리: `project-arena-kick-2026-08-31.md`(전부 기록) · `project-launch-load-assessment-2026-08-31.md`.
