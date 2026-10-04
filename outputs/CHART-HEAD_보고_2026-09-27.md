# CHART-HEAD 보고 — 차트 화면 머리 부분 정리
작성: Claude Code · 2026-09-27 (누적 기록)

---

## Phase 0 — 구조 파악 · 승인표 · 결과: 승인표 작성 완료, 대표 답 대기 (커밋 0)

### 브랜치
- `feat/chart-head` ← origin/main `1d6ada9`. 기본 추적(origin/main)은 해제함 — 첫 push 때 자기 이름으로 올라가게
- 작업 트리: 추적 파일 변경 없음. 대표 폴더(`Claude outputs/` 등)는 건드리지 않음

### 현재 구조 (바꿀 곳)
| 파일 | 지금 하는 일 |
|---|---|
| `app/arena/[tournamentId]/ranking/page.tsx` | 캐시 구독 · 대회 문서 읽기(제목·마감) · labels 조립. `deadlineLabel`만 ko/en으로 박혀 있음(70행) · "다음 발표" 문구를 계산해 넘김 |
| `components/ranking/RankingHeader.tsx` | 눈썹 → 제목 → `Crown Score ?`(+설명창) → 다음 발표 한 줄 → 마감 알약 순서 |
| `components/ranking/RankingView.tsx` | 머리 + 상태별 본문(skeleton / waiting / list) · CSS 전부(STYLE 문자열) |
| `lib/i18n/messages.ts` | `chart.kicker` · `chart.note` · `chart.score.help` · `chart.waiting.title` · `ranking.nextUpdate.today/tomorrow` |
| `lib/ranking/nextRankingUpdate.ts` · `rankState.ts` | 다음 발표 판정(KST 시 주입) · `showNextUpdateLine`(마감 뒤 감춤) |

- "지난 발표(Updated)" 문구는 **아직 없는 새 문구** → 승인표 B4
- 마감 es 결함 원인 확인: `deadlineLabel: lang === "ko" ? "토너먼트 마감" : "Tournament Deadline"`

### 승인표
`outputs/CHART-HEAD_승인표_2026-09-27.md` — 배치 8항목(지시서대로) + 문구 전후 비교 3언어 + **대표 결정 7건**
| # | 결정 | 추천 |
|---|---|---|
| 1 | 마감 한 줄 es 문구 | Cierre del torneo |
| 2 | 마감 한 줄 대문자 변환 | 끈다 (Tournament deadline) |
| 3 | Crown Score 제목 | 글자는 원형 "Crown Score", CSS로 대문자 표시 |
| 4 | 설명창 버튼 모양 | `?` 유지 (조금 키움) |
| 5 | Updated 문구 | 지난 발표: / Updated: / Actualizado: |
| 6 | 어제·그 이전 표기 | 어제 / yesterday / ayer · 그 이전은 `09·24` 날짜 |
| 7 | 하이드레이션 오류 | RankingView 속 따옴표 한 줄만 제거 (ModuleNav는 범위 밖이라 오류 9건은 남음) |

### 발견
- 지시서가 인용한 정본 `CROWN_SCORE v1.1`은 저장소에 없음(v1.0만 있음) → (이후 티오가 파일을 넣었고 이번 PR에 함께 커밋)
- LANGUAGE.md의 ko 공식 표기는 "대진 마감일"인데 화면은 원래 "토너먼트 마감" → 이번엔 ko 문구를 바꾸지 않음(추천)

---

## 대표 답 (2026-09-27)
- **"전부 추천대로"** → 결정 1~7 모두 ★안
- 추가 ①: 휴대폰에서도 CHART · 대회 제목 · 마감 한 줄은 그대로 나온다 (지시서 배치도 갱신본 다시 읽음 → 반영)
- 추가 ②: `marketing/00_strategy/CROWN_SCORE_v1.1.md`(티오 작성)를 이번 PR에 함께 커밋. 커밋 전에 전문을 읽었고, 비밀값이나 개인정보는 없음
- 결정 7의 나머지(ModuleNav)는 NAV-1 몫으로 아래에 기록

---

## Phase 1 — 구현 · 결과: ✅

### 바꾼 파일
| 파일 | 변경 |
|---|---|
| `lib/ranking/lastRankingUpdate.ts` (신규) | "지난 발표" 판정 순수 함수. `generatedAt`의 KST **날짜**로 today / yesterday / date를 가르고, `HH:MM` · `MM·DD`를 만든다. 날짜 문자열은 `todayKST` 하나로 센다 |
| `lib/__tests__/ranking/lastRankingUpdate.test.ts` (신규) | 9건 — 오늘 · 새벽의 어제 21:00 · 이틀 이상(날짜) · UTC와 KST 날짜 경계 · 분 단위 · 월말/연말 · 자정 00:00 · 시계가 뒤처진 경우. **실패 먼저 확인 → 구현 → 통과** |
| `lib/i18n/messages.ts` | 새 키 4개 3언어: `chart.deadline.label`(토너먼트 마감 / Tournament deadline / Cierre del torneo) · `ranking.updated.today/yesterday/date` |
| `components/ranking/RankingHeader.tsx` | 배치 교체: 눈썹 → 제목 → 마감 한 줄(알약·아이콘·영어 aria-label 제거) → **목록 위 줄**[Crown Score 제목 + ? \| 발표 시각 알약] → (열면) 설명창. 제목 밑 "다음 발표" 한 줄은 삭제 |
| `components/ranking/RankingView.tsx` | CSS: 눈썹 11→**22px** · `.rank-deadline` 평범한 줄 · `.rank-bar` flex-wrap(넓으면 알약이 오른쪽 끝, 좁으면 다음 줄 왼쪽 끝) · `.rank-score-title` 18px 굵게 금색, CSS로 대문자 · `?` 16→20px · `.rank-pill`(옛 마감 알약 스타일, 글자 왼쪽 맞춤, 두 부분은 각각 한 덩어리라 가운뎃점 뒤에서만 줄바꿈) · 옛 `.t-deadline`·`.rank-note` 삭제 · **STYLE 안 따옴표·꺾쇠·& 0개**(결정 7) |
| `app/arena/[tournamentId]/ranking/page.tsx` | 마감 라벨을 카탈로그에서 가져옴(es 결함 해소) · `updatedText` 계산(마운트 뒤에만 시계를 읽음 — 하이드레이션 안전) · 낡은 "LABELS는 2언어" 주석 정정 |
| `e2e/c3-ranking.spec.ts` | `.rank-note` 선택자 → `chart-score-title` · 마감 한 줄 3언어 + 대문자 변환 없음 · 알약의 지난 발표 문구(3언어 정규식) · 마감 후에도 지난 발표는 남음 · 대기 화면에서 Crown Score 줄이 대기 문구 **위** · **신규 배치 테스트**(1440: 알약 오른쪽 끝 = 목록 오른쪽 끝, 같은 줄 / 320·360: 다음 줄, 왼쪽 끝 = 목록 왼쪽 끝, 글자 왼쪽 맞춤, 가로 넘침 0, 머리 요소 전부 보임) |
| `marketing/00_strategy/CROWN_SCORE_v1.1.md` (신규) | 티오가 넣은 정본 v1.1 — 커밋만 함 |

- 바꾸지 않은 것: ModuleNav(RANKING 탭 · NAV-1) · 설명창 문구 · 대기 문구 · 다음 발표 문구 · 새벽 감춤 규칙 · 색 토큰(새 색 0) · 함수·규칙(배포 불필요)
- 기존 E2E 결함 1건도 함께 고침: 대기 화면 테스트의 `expect(body).not.toContain("9")`는 예전부터 시각에 따라 깨질 수 있었다("내일 09:00"). 이제 머리에 시각이 늘 있으므로 **대기 상자 안**과 "9판" 꼴만 보도록 좁힘

### 검증
| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 0 |
| `npm test` | ✅ 104 files / **1199 tests** (새 9건 포함) |
| `npm run check:hex` | ✅ raw hex 0 |
| `npm run build` | ✅ 성공. 경고 1건(protobufjs "Critical dependency")은 **main에서도 같은 기존 경고** |
| ESLint | 저장소에 설정 없음(`next lint`가 설정 마법사를 띄움) → 해당 없음 |
| E2E | CI에서 실행(PREVIEW_URL + 키 필요, 로컬 skip) |

---

## Phase 2 — 확인 캡처 · 결과: ✅ 7장 (`outputs/CHART-HEAD_캡처_2026-09-27/`)

### 방법 (서비스 계정 키 없음)
- Firestore 에뮬레이터(Java 21 한시 지정) · 프로젝트 **`demo-chart-head`**. `demo-` 접두어는 프로덕션에 닿을 수 없는 에뮬레이터 전용 이름
- 시드: `seed-chart-preview.mjs`와 **같은 캐시 모양**(549·431·318·262·149 · runsTotal 120). 지난 발표 = 가장 최근 크론 시각(오늘 09:00 KST). 대기 화면용 대회는 runsTotal 3. 대회 문서는 `active`로 넣음(권한 오류 없이 제목이 보이는 상태 = 로그인한 대표가 보는 화면과 같음)
- 로컬 개발 서버(:3100)를 에뮬레이터에 붙이려고 `lib/firebase.ts`에 **임시 5줄**을 넣었다. 캡처 뒤 `git checkout`으로 **되돌렸고 커밋에 없다**(되돌린 뒤 `TEMP-CHART` 0건 확인). 이 저장소 클라이언트에는 에뮬레이터 연결 경로가 없어서 필요했음
- 개발 모드 전용 오류 배지(Next.js 좌하단 "1 error")는 캡처에서만 가림. 프로덕션에는 없는 요소

### 측정 (Playwright, deviceScaleFactor 2)
| 캡처 | 상태 | 눈썹 | 알약 좌/우 | 목록 좌/우 | 알약 위치 | 가로 넘침 | 알약 문구 |
|---|---|---|---|---|---|---|---|
| ko-desktop (1440) | loaded | 22px | 797 / **1098** | 342 / **1098** | 같은 줄 | 0 | 지난 발표: 오늘 09:00 · 다음 발표: 오늘 21:00 |
| en-desktop | loaded | 22px | 673 / **1098** | 342 / **1098** | 같은 줄 | 0 | Updated: today 09:00 KST · Next update: today 21:00 KST |
| es-desktop | loaded | 22px | 600 / **1098** | 342 / **1098** | 같은 줄 | 0 | Actualizado: hoy 09:00 KST · Próxima actualización: hoy 21:00 KST |
| ko-mobile (360) | loaded | 22px | **32** / 328 | **32** / 328 | 다음 줄 | 0 | (2줄, 가운뎃점 뒤에서 꺾임) |
| en-mobile | loaded | 22px | **32** / 328 | **32** / 328 | 다음 줄 | 0 | 〃 |
| es-mobile | loaded | 22px | **32** / 328 | **32** / 328 | 다음 줄 | 0 | 〃 |
| waiting-ko-mobile | waiting | 22px | **32** / 328 | **32** / 328 | 다음 줄 | 0 | 〃 + 아래에 대기 문구 |

- 7장 모두 Crown Score는 정수만 보이고, 세 비율·Vote Count는 나오지 않음. 마감 한 줄: 토너먼트 마감 / Tournament deadline / **Cierre del torneo**
- 첫 캡처에서 모바일 알약이 "Próxima / actualización"처럼 **문구 중간에서** 꺾이는 것을 발견 → 두 부분을 각각 한 덩어리로 묶어 **가운뎃점 뒤에서만** 꺾이게 고친 뒤 다시 찍음

### 하이드레이션 (결정 7) — 차트 쪽은 해소, ModuleNav 쪽이 남음 → **NAV-1 몫**
- 서버 HTML의 `<style>` 블록 속 이스케이프 개수(개발 서버 SSR에서 셈):
  | 블록 | 이 PR 전 | 이 PR 후 |
  |---|---|---|
  | `.sf-ranking`(RankingView) | 1건 이상(`[aria-expanded=&quot;true&quot;]`) | **0** |
  | `.module-nav`(ModuleNav) | 6 | 6 (범위 밖 — 손대지 않음) |
- 중간에 한 번, **내가 새로 쓴 CSS 주석** 속 `<style>`·`&quot;` 글자가 다시 이스케이프를 3건 만든 것을 SSR 검사가 잡았다 → 설명을 JS 주석(STYLE 문자열 밖)으로 옮김. STYLE 문자열에 `" ' < > &`가 0개인 것 확인
- **NAV-1 인계**: `components/arena/ModuleNav.tsx` STYLE의 따옴표 속성 선택자 3줄(`[data-active="true"]` 등)이 차트 페이지(확인됨)와 Crown Card `/champion` 페이지(같은 ModuleNav를 씀 · 미확인)에서 하이드레이션 실패 → 페이지 전체를 클라이언트 렌더로 다시 그림(#423)을 만든다. 고치는 법은 같다: 따옴표를 빼거나(`[data-active=true]`) `dangerouslySetInnerHTML`로 넣기. 고치기 전까지 차트 페이지 콘솔 오류는 0이 되지 않는다
- c3 E2E의 "콘솔 오류 0" 단언은 `console` 이벤트만 보고 `pageerror`는 보지 않는다. 그래서 이 하이드레이션 오류를 잡지 못한다 → NAV-1에서 `pageerror`도 함께 세기를 권장

### 기타 관찰 (이번에 안 고침)
- 한국어 긴 제목이 음절 중간에서 꺾임("퍼포먼스/는?") — 기존 동작. `word-break: keep-all` 한 줄로 고칠 수 있음. 승인 범위 밖이라 보고만
- 캡처 속 "Failed to load resource 400" 1건 = 가짜 API 키(demo-key)로 익명 로그인을 시도한 것 → 로컬 하네스에서만 생기는 것

---

## Phase 3 — PR #109 · 상태: ⛔ CI 빨강 1건 → Auto-STOP (고치지 않고 보고)
https://github.com/choijinii/worldcrown48/pull/109 · 커밋 `11f2066`

| 체크 | 결과 |
|---|---|
| build · guard · Vercel · Vercel Preview Comments | ✅ |
| test ×6 (C-3 외 워크플로) | ✅ |
| **C-3 Ranking E2E** | ❌ **13 passed · 1 failed** (재시도 2번 모두 같은 실패) |

### 실패 1건 — 판정: **테스트 결함 (내가 새로 쓴 단언 한 줄), 앱 회귀 아님**
- 테스트: `차트 이름 3언어 … (+ 마감 한 줄 3언어)` (spec 258행)
- 실패한 줄: 274행 `await expect(page.locator("text=/^Ranking$/i")).toHaveCount(0);` → 기대 0, 실제 **1**
- 원인: 이 단언은 "화면에 RANKING **제목**을 새로 만들지 않는다"를 지키려고 넣었다. 그런데 **페이지 전체**를 뒤져서, 메뉴 줄(ModuleNav)에 원래부터 있는 **"Ranking" 탭**(NAV-1에서 정리하기로 한 것, 이번엔 건드리지 않음)에 걸렸다. 같은 테스트의 앞 단언(눈썹·Crown Score 제목)은 3언어 모두 통과했고, 실패는 첫 언어(ko)의 이 줄에서 멈췄다
- 이번 PR이 새로 추가한 배치 테스트 · 알약 문구 · 대기 화면 순서 · 마감 후 지난 발표 테스트는 **전부 통과**
- 고치는 법(한 줄): 검사 범위를 차트 본문으로 좁힌다 → `page.getByTestId("ranking-view").locator("text=/^Ranking$/i")`. 이러면 "차트 화면 안에 RANKING 제목이 없다"만 지키고 메뉴 탭은 NAV-1 몫으로 남는다
- ⚠️ 이 실패 때문에 같은 테스트 안의 **마감 한 줄 3언어 단언(275~278행)은 CI에서 아직 한 번도 실행되지 않았다.** 로컬 캡처로는 3언어 모두 확인했지만 CI 근거는 수정 후 재실행에서 나온다

### 수정 후 재실행 — ✅ CI 전부 초록 (11/11) · 대표 머지 대기
- 대표 "진행" → 274행 한 줄만 수정: 검사 범위를 `ranking-view`(차트 본문)로 한정. 커밋 `359a202`
- C-3 Ranking E2E 로그: **`Running 14 tests` → `14 passed`** (skip 0 · 재시도 없음). 앞 실행에서 돌지 못했던 **마감 한 줄 3언어 단언도 이번에 통과**
  - 같은 작업의 유닛 111 · functions 480 · 규칙 96도 모두 통과
- 나머지: build · guard · Vercel · Vercel Preview Comments · test 6개 모두 ✅
- 머지 후: 함수·규칙 변경이 없어 **firebase 배포 불필요**. Vercel이 main을 자동 배포한다

---

## 머지 · 배포 · 프로덕션 확인 — ✅ 완료
- PR #109 머지: 2026-09-27 21:56 KST → main `75458a7` · Vercel Production 배포 **success** (21:57 KST). firebase 배포는 필요 없음
- 프로덕션 비로그인 확인(Playwright · 실제 대회 `FbzCreuLSW4l7u0VUsKs` · 10판 미만 대기 화면):

| 폭 | 언어 | 눈썹 | 마감 한 줄 | 알약 | 알약 좌/우 → 기준 | 가로 넘침 |
|---|---|---|---|---|---|---|
| 1440 | ko | 22px | 토너먼트 마감 2026·11·30 | 지난 발표: 오늘 21:00 · 다음 발표: 내일 09:00 | 오른쪽 1098 = 목록 1098 | 0 |
| 1440 | en | 22px | Tournament deadline 2026·11·30 | Updated: today 21:00 KST · Next update: tomorrow 09:00 KST | 1098 = 1098 | 0 |
| 1440 | es | 22px | **Cierre del torneo** 2026·11·30 | Actualizado: hoy 21:00 KST · Próxima actualización: mañana 09:00 KST | 1098 = 1098 | 0 |
| 360 | ko·en·es | 22px | 같음 | 같음 (다음 줄) | 왼쪽 32 = 목록 32 | 0 |

- 옛 "다음 발표" 한 줄(`.rank-note`)은 없음 · 대기 상자는 알약 **아래**
- 21:00 크론이 방금 돌아 "지난 발표: 오늘 21:00"이 실제 크론 값으로 나옴 → `generatedAt` 경로가 프로덕션에서 동작함을 확인
- 콘솔: 하이드레이션 오류 9건(#425·#418·#423)은 그대로 → 원인은 ModuleNav, **NAV-1 몫** (차트 쪽 `<style>` 이스케이프 0건은 이 PR에서 해결)

## DoD
- [x] 머리 5가지 (눈썹 2배 · 마감 한 줄 · CROWN SCORE 제목 · 발표 시각 알약 · 옛 줄 삭제) + 모바일 배치
- [x] es 마감 결함 해소
- [x] 승인표 → 대표 승인 → 커밋
- [x] 유닛 · 빌드 · 타입 · CI 11/11 초록
- [x] 키 없이 에뮬레이터 캡처 7장
- [x] PR 머지 · 프로덕션 확인
- [x] CROWN_SCORE v1.1 커밋
- [ ] (인계) NAV-1: ModuleNav 따옴표 CSS 3줄 + E2E가 pageerror도 세기 + RANKING 탭 정리
