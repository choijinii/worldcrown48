# 다음 세션 킥오프 프롬프트 (2026-07-20 작성)

> 이 파일 전체를 복사해서 새 Cowork 세션의 첫 메시지로 붙여넣으세요.

---

지난 세션(2026-07-19~20)에서 완료된 것 — 재확인 불필요:

1. **B-2 The Lab SHIPPED**: PR #43 머지 + functions 배포. Lab 5단계 플로우(AI 관문→옵션), Deadline 폼, Navbar Locker Room 복원, 한도 메시지 3언어화(#12). Phase D′에서 결함 3건 잡아 머지 전 수정
2. **B-2.1 (PR #44)**: titleI18n 표시 배선 5곳(Arena 매치·Pitch 카드·TournamentList·Launch 히어로·Arena ranking) + STEP 2 제목·설명 인라인 수정 + 참가자 카드 ✕ 일괄 지우기
3. **B-2.2 (PR #45·#46)**: 번역 코어 Option A(언어별 개별 호출 + logError, 침묵 실패 금지) + 백필 planner v2(한글 잔존 감지) + **백필 19건 --apply 성공**
4. **3언어 제목 프로덕션 실측 완료**: worldcrown48.com ES에서 "Torneo de Prueba-3..." 확인 (2026-07-20)
5. **이미지 소싱 1차**: K1 여자아이돌 승인 11/48 (설윤 1명 보류 — 커먼즈 라이선스 검토 도장 대기). 트래커 = `outputs/handoffs-staging/WC48_sourcing-tracker_2026-07-13.xlsx` (⚠️ 07-11 파일은 오염·폐기 대상)
6. **법리 전략 확정**: `docs/legal/WC48_IP-LEGAL-BRIEF_v1.0.md` — 무단 사용 금지, CC≠초상권, 결정 게이트 G-LEGAL-1(수익화 전 법무 검토)·G-LEGAL-2(MVP2 전 신고 채널)

---

## STEP 0 — 세션 시작 시 확인 (5분)

1. **cleanup 여부 확인**: 테스트 토너먼트 1·2·3(Torneo de Prueba) 등 테스트 대회 삭제했는지 대표에게 확인. 미삭제면 Lab에서 Eliminar로 정리
2. Claude Code 쓸 일 있으면 먼저 `/login` (지난 세션 말미에 "Login expired" 표시됨)
3. 워크트리 정리: `git worktree remove ~/Projects/wc48-b2` + `git branch -d feat/b2-lab-flow feat/b2-1-lab-polish` (머지 확인됐으므로 안전)

## STEP 1 — 오늘의 본 작업: 이미지 소싱 2차 (K1 잔여 37명)

- 트래커 `WC48_sourcing-tracker_2026-07-13.xlsx` 이어서. **반반 방식**(Cowork 12명 초안 → 대표 검토 → 라이선스 대표 직접 확인 → Cowork 트래커 반영)
- 2차 후보군: 아일릿 윤아·민주, 리센느(원이·미나미 — 생년 확인 필수), 키키, 하츠투하츠, 베이비몬스터 성인 멤버(아현·루카·파리타·아사), 에스파 닝닝·지젤, 아이브 리즈·레이·가을, 키스오브라이프 등
- 원칙: 만 19세 기준(2007-07-20 이전 출생만), **커먼즈 "라이선스 검토 완료" 도장 파일 우선**, NC/ND 탈락
- 설윤 보류 건 재확인 (검토 도장 찍혔는지)
- ⚠️ 트래커 쓰기 전 대표에게 "엑셀/Numbers에서 파일 닫혀 있는지" 확인 (덮어쓰기 사고 방지 규칙)

## STEP 2 — 병행·소형

- 승인 11명의 이미지 URL을 실제 대회에 넣어보는 시범: "가장 아름다운 k-pop 여자 아이돌" 대회의 해당 인물 칸에 커먼즈 URL 기입 → 그리드·Match VS에서 사진 표시 확인 (이미지 파이프라인 첫 실전)
- B1_PREVIEW_URL 등 *_PREVIEW_URL 시크릿 갱신 상태 확인

## 미결 이월 (범위 밖, 잊지 말 것)

- **48/24/12강 브래킷 선택** — Arena 개편 설계 시 재도전 결정 게이트와 함께 (대표 요청 2026-07-19)
- /account 페이지 스페인어 미지원 (D-1 유산)
- 임베드 슬롯(유튜브 공식 영상) — B-3 후보. 데모: `docs/demos/WC48_embed_demo_v1.html`
- E2E 워크플로우 일괄 정리 — C-1 만성 429 포함
- Node.js 20 런타임 2026-10-30 EOL + firebase-functions 구버전 업그레이드
- sourceLang 영속화 (백필 러너 권고사항)
- 재도전 결정 게이트(Arena 개편 전) · G-LEGAL-1(수익화 전) · G-LEGAL-2(MVP2 전)
- legal 플러그인 설치 + WC48 전용 legal-guardian 스킬 제작 (대표 결정 대기)

## 필독 메모리

[[b2-shipped-2026-07-20]] [[legal-ip-strategy-2026-07-13]] [[feedback-complete-prompts-for-claude-code]] [[feedback-report-github-actions-to-claude-code]] [[feedback-cross-verify-before-presenting]] [[tx0-shipped-2026-07-11]]

---
*작성: Cowork B-2 대장정 세션 2026-07-20 · 다음 갱신: 소싱 2차 완료 시*
