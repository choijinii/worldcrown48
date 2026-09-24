# 티오 다음 세션 지시서 — ARENA-1 PR 2b 종결 → PR 3 착수 (2026-09-23 22:30 KST 작성)

> **ARENA-1 PR 2b(#106)는 09-23 밤 머지됐다.** CI 전부 초록(C-1 E2E 28/28 · flaky 0), 대표 눈검사 3항목 + 모바일 세로 결승 제목 18px = 머지로 합격 처리. 머지 뒤 사람 절차 없음(rules·functions 배포 불필요).
> 다음 세션의 일 = **① PR 3 프롬프트 발행(초안 완성돼 있음) → ② 클로드 코드 승인 게이트(문구) 대응 → ③ 프리플라이트 → 대표 눈검사 → 머지 → `firestore:rules` 배포 → ARENA-1 킥 종료 기록.**

## 0. 시작 리추얼 (예외 없음)
1. **첫 줄에 날짜·시간(KST)**. 마지막 줄도.
2. 메모리 먼저: `user-communication-profile` → `project-arena1-pr2-decisions-2026-09-20` → `feedback-banner-slot-and-design-source`(D-20·D-21) → `no-pyo-word-at-all` → `feedback-broken-signal-not-green` → `feedback-complete-prompts-for-claude-code` → `feedback-preflight-before-eye-inspection`.
3. 필독 순서: 이 파일 → `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md`(**원장이 이긴다** — D-00~D-30 + 바뀜) → `outputs/PROMPT_ClaudeCode_ARENA-1_PR3_PickNow+랭킹상시공개+규범문서_2026-09-23.md`(발행할 프롬프트) → `outputs/KICK_ARENA-1_v1.1_매치무대-대수술_2026-09-10.md` §12 부록 · M9 · H 절.
4. 판단 전에 원장·킥을 먼저 연다. 화면만 보고 판단하지 않는다. **확정된 것을 선택지로 다시 내놓지 않는다.**

## 1. 09-20~23 세션에서 확정된 것 (원장에 기록됨)
| 번호 | 무엇 | 한 줄 |
|---|---|---|
| D-24 | 대관 연출 폐기 | 결승 확정 → 짧은 확정 반응 → 바로 Crown Card. 계측 ceremony 2종 만들지 않음 |
| D-25 | 결승 제목 낱말 | ko "당신의 최애를 골라 주세요" / en "Pick your Choe-ae" / es "Elige a tu Choe-ae" — 로마자 **Choe-ae** 고정 |
| D-26 | PR 2 분할 · 문구 기록 | 2a(#105) 가로 첫 탭 전체화면 · 게스트 안내 제거 · 문구 3언어 / 2b(#106) 네 화면 + 배너 970/320. 승인 문구 14건 적용 |
| D-27 | 사전등록 이미지 | 매치 무대 캡처 + 대표 일러스트(실존 인물 얼굴 금지). 마케팅에 서신 전달(Drive 코워크 폴더) |
| D-28 | 크라운 표식 | Crown Card에만. 무대(매치·확정·결승·전환) 안에는 없음. 예외 = 메뉴바 로고 · 첫 입장 팝업 머리 |
| D-29 | 결승 3분할 | 확대 1.3배 · 띠 3색(Turquoise / Crown Gold / Crimson, 배경 22% · 테두리 65%) |
| D-21 바뀜 | 배너 자리 | 데스크톱 970×90 · 모바일 세로 320×100 · 가로 없음 · 라운드 전환 없음 |
| D-19 바뀜·보충 | 서랍 | The Arena ▸ Arena Home · K-POP · CREATOR(영어) / Newsroom ▸ 6개. 코드는 NAV-1 |
| D-13 바뀜 | 팝업 필수 문장 | "Crown Card는 Tournament가 끝난 뒤 공개됩니다" 3언어 |
| **D-30** | **랭킹 상시 공개** | **마감 전에도 순위 공개, 비로그인 포함(09-23 대표). PR 3에서 코드 반영** |

**PR 2b에서 정리된 것**: `arena.round.spectatorNote` 키 삭제(코너 라벨 4개가 대체, 94222ad) · `{n}` = 다음 라운드에 남는 인원 · 모바일 세로 결승 칸 232 유지 + 제목 18px · 첫 입장 팝업 localStorage `wc48:arena:intro:v1` · 새 토큰(`--arena-band-mid-*`, finalScale 1.3, 확정 링 520ms) — **클로드 디자인 DS에 되돌려 넣는 일은 아직 안 함**(§5).

## 2. 이번에 확인·종결한 것
- GitHub E2E 실패 알림 2건(c7f8e99 · b541f08)은 머지 전 커밋의 옛 실패 → 2e65730에서 수정 → 종결. 새 문제 아님.
- 디자인 정본 v2(27장) 합격, 저장소 `docs/design/claude-design/Arena_Match_Stage_v2_27boards_2026-09-22.dc.html` + `export_v2_2026-09-22/`.
- PR #104(COOKIE-1 초안 문서) 머지됨(b120825). COOKIE-1 **승인반영 프롬프트**는 `outputs/PROMPT_ClaudeCode_COOKIE-1_v1.0_승인반영_2026-09-20.md`.

**운영 스모크 (09-23 22:40, 클로드 코드) — 합격**: 데스크톱·모바일 세로·가로 3화면 콘솔 에러 0, 팝업 3언어 정상, 배너 970×90 / 320×100 / 가로 없음, 쓰기 0건. 확정 연출·라운드 전환·결승은 판을 만들어야 해서 스모크 미실행 → E2E 3건(e12f94e 초록)이 대신 덮음. 익명 6명 생성 → 대표가 삭제 완료(22:55).
**스모크가 남긴 관찰 2건**: ① 쿠키 동의 바가 운영에서 무대와 첫 입장 팝업 버튼까지 가린다 → **COOKIE-1 시급도 상향**(PR 3 직후 첫 소킥 후보) ② 모바일 세로에서 회전 안내가 팝업 안과 무대 아래에 동시에 두 번 보임(팝업 닫히면 하나) → 다음 눈검사 항목.

## 3. 다음 — PR 3 (프롬프트 완성본 있음)
- 파일: `outputs/PROMPT_ClaudeCode_ARENA-1_PR3_PickNow+랭킹상시공개+규범문서_2026-09-23.md`
- 범위: A 메뉴바 Vote Now → 참가하기 / Pick Now / Elige ahora(D-23, 승인 불필요) · B '투표' 낱말 전수 교체(승인 게이트 — `pitch.hero.cta.start` "투표 시작" · 실패 안내 "투표에 실패했어요" 2건 이미 발견) · C 랭킹 상시 공개(rules 마감 게이트 삭제 · `locked` 제거 · "다음 발표" 줄 켜기 · `voteCount` 미노출) · D 규범 문서 4건 · E 테스트.
- 발행 절차: 클로드 코드 `/clear` → 프롬프트 붙여넣기 → §5 문구 게이트에서 STOP하면 티오가 전/후를 대표에게 보여 승인 받기 → 프리플라이트 캡처 3장 → 대표 눈검사 → 머지.
- **머지 뒤 사람 절차(대표)**: `firebase deploy --only firestore:rules` (한 줄, 이걸 해야 랭킹이 실제로 열림) → 클로드 코드에 "PR #NNN 머지·rules 배포했다" 한 줄 보고.
- PR 3 머지 = **ARENA-1 킥 종료** → 원장에 종료 기록 + 킥 §12-E 마감.

## 4. PR 3 다음 열차 (순서 확정 아님 — 대표와 한 줄 확인)
| 소킥 | 내용 | 상태 |
|---|---|---|
| E2E-1 | `hf3-guest-run` E2E 복구(#93부터 문법 오류) + CI 연결 + tsc가 e2e/ 보게 | **런칭 전 필수 승격 권고** — 프롬프트 티오가 씀 |
| COOKIE-1 | 동의 저장 버그 + 동의 바 한 줄 56px·가로 비표시 | 프롬프트 완성, 발행만 |
| NAV-1 | 서랍(Arena Home·K-POP·CREATOR / Newsroom 6) · "선택 이어가기" 알약 | 디자인 정본 있음, 프롬프트 없음 |
| FONT-1 | Pretendard woff2 서브셋(Lighthouse 54/73) | 런칭 전 필수 |
| BANNER-1 | 관리자 배너 CRUD | 후순위 |

## 5. 병렬로 챙길 것 (대표 몫, 세션마다 한 줄 확인)
- Vercel Pro 전환 — **09-20 완료** (더 확인 안 해도 됨)
- 클로드 디자인 DS에 PR 2b 새 토큰 되돌려 넣기(배너 970/320 · finalScale 1.3 · 가운데 띠 · 확정 링) + README 옛 낱말 정리 — 다음 내보내기 때
- 익명 사용자 삭제 — **완료** (09-20분 5명 + 09-23분 6명, 22:55 대표 실행, 실패 0). 두 tsv는 버려도 됨. 교훈: tsv에 제목 줄이 있으면 삭제 스크립트가 `uid` 글자를 한 명으로 세어 성공 수가 +1로 보임 — 다음 스모크부터 제목 줄 없이
- `docs/design/claude-design/K-pop 아이돌 VS 무대 디자인.zip`(38MB) 휴지통 — **커밋 금지**
- 마케팅(마코·마티오) 회신 3건: 사전등록 이미지 장수·크기 · EVENT_SPEC ceremony 2종 삭제 동의 · Crown Card 개편 요구
- 광고(애드센스)는 MVP2 이후 — 건드리지 말 것

## 6. 하지 말 것
참가 규칙 재론 · '표' 낱말(티오 채팅 포함) · 탭 규칙 변경(1탭 확대·2탭 확정) · 로드맵 재기준 · `git push origin main` · Cowork에서 git 상태 변경 명령 · 확정을 선택지로 재제시 · 클로드 코드 입력창의 미리 채워진 문장을 대표 지시로 취급 · 터미널 명령 여러 줄 한 상자 · 빨간불을 "무시 가능"이라 부르기(판정 보류로).

## 7. 다음 세션 시작 프롬프트 (대표가 복사)
```
WorldCrown48 이어서. 지금 날짜·시간(KST)부터 첫 줄에 적어.
ARENA-1 PR 2b(#106)는 09-23 밤 머지됐고 CI 전부 초록, 눈검사 합격 처리, 사람 절차 없음. 다음은 PR 3 착수다.
먼저 읽어: 메모리 user-communication-profile → project-arena1-pr2-decisions-2026-09-20 → no-pyo-word-at-all → feedback-broken-signal-not-green → feedback-preflight-before-eye-inspection,
outputs/SESSION-HANDOFF_2026-09-23_티오-다음세션_PR3착수.md → outputs/DECISIONS_결정원장_v1.0_2026-09-11.md(원장이 이김, D-30까지) → outputs/PROMPT_ClaudeCode_ARENA-1_PR3_PickNow+랭킹상시공개+규범문서_2026-09-23.md.
확정(재론 금지): D-08~D-30 전부. 특히 D-23(참가하기/Pick Now/Elige ahora) · D-30(랭킹 상시 공개, 비로그인 포함) · D-24(대관 연출 폐기) · 탭 규칙 · 배너 970/320.
할 일: ① PR 3 프롬프트를 클로드 코드(/clear 후)에 넣을 수 있게 마지막 점검 후 발행 ② 클로드 코드가 §5 문구 게이트에서 멈추면 전/후 3언어를 나에게 보여 승인 받아 ③ 프리플라이트 캡처 3장 받고 눈검사 요청 ④ 머지 뒤 firestore:rules 배포 명령 한 줄 주고 클로드 코드에 보고 ⑤ ARENA-1 킥 종료를 원장·킥 §12-E에 기록.
병렬 확인 한 줄: 38MB zip 버렸는지 · 마케팅 회신 3건 왔는지.
용어는 처음 쓸 때 한 줄 풀이, 터미널 명령은 한 줄씩 따로 상자, 세션 끝에 "제가 이해한 것 5줄" 확인 후 문서·메모리.
```

## 8. 상태 스냅샷 (2026-09-23 22:30 KST)
- main = **e12f94e** (#106, 클로드 코드 확인 22:23). 원격 브랜치 3개(PR 1·2a·2b) 삭제됨, 로컬 브랜치는 남아 있음(스쿼시 머지라 `-d` 거부 — 지워도 됨). 옛 `.git/index.lock` 잔해 정리됨.
- 미커밋: `.claude/` · `Claude outputs/`(익명 uid tsv — **커밋 금지**) · `docs/design/claude-design/export_v2_2026-09-22/uploads/`(옛 지시문 md·캡처 png — 정본에 불필요, 커밋 여부 대표 판단) · 38MB zip(**커밋 금지**).
- 아티팩트: PR 2b 발행판 https://claude.ai/artifact/SsPqu7CSsU5GNk1G5E1sTY · 디자인 지시 v1.6 https://claude.ai/artifact/JgLs7YXzZGbpyr28ePehoz
- 세 가족: 코티오(개발, 이 프로젝트) · 마코(마케팅 Cowork, 같은 프로젝트) · 마티오(마케팅 채팅) — 다리는 Drive `WorldCrown48/마케팅` · `코워크` 폴더.

— 작성 2026-09-23 22:30 KST · 티오
