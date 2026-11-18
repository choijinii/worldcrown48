# PITCH-2 PR B — 기사 조회 기록 (`recordArticleView`) 계획

- 지시서: `outputs/prompts/PROMPT_ClaudeCode_PITCH-2_v1.1a_2026-11-17.md` PR B 4·5 중 조회·급등 부분
- 추가 지시 ①: `outputs/prompts/PROMPT_ClaudeCode_PITCH-2_v1.1a_추가지시1_외신=TIOZ_2026-11-18.md` — 외신 받아오기 · `news_world` · TheNewsAPI 는 **만들지 않는다**
- 브랜치: `feat/pitch-2-news-functions` · 순서 PR B → PR A

## 무엇을 만드나

| 조각 | 파일 | 하는 일 |
|---|---|---|
| 순수 계약(한 곳) | `lib/news/articleViews.ts` (import 없음 → `copy-news` 로 functions 에 복사) | 날짜 칸 이름 `d<YYYYMMDD>` · 어제 날짜 · 급등 점수(오늘+어제) · 지울 옛 날짜 칸 · 급등 정렬(0·동점 → 최신 발행순) · 기사 주소 이름 검사 |
| 서버 핵심 | `functions/src/core/articleViewCore.ts` | 1시간 표지 id(소금+IP+기사+시 단위 해시) · 트랜잭션: 발행된 기사만 · 표지가 있으면 안 셈 · 없으면 표지 만들고 `views.total`+1 · `views.d<오늘>`+1 · 옛 날짜 칸 지움 |
| 콜러블 | `functions/src/recordArticleView.ts` | 로그인 없이 부름(익명 계정 안 만듦 · D-41) · `IP_HASH_SALT` · 인스턴스 메모리 분당 한도(홍수 막기) · IP 는 구글 앞단이 채운 `ip` 하나만 본다(비면 세지 않음 — 연결 주소 · X-Forwarded-For 는 받침으로 쓰지 않는다). 에뮬레이터는 IP 를 주지 않아 시험에서만 고정 이름 |
| 브라우저 | `lib/news/recordArticleView.ts` + `components/news/ArticleView.tsx` | 기사 지면을 열면 한 번 부름 · 같은 기사 1시간 로컬 메모(localStorage, 실패해도 무시) · 오류는 삼킨다(콘솔 오류 0) |
| 규칙 | `firestore.rules` | `news_view_marks` 브라우저 읽기·쓰기 전부 거부 · `news` 규칙은 그대로(브라우저는 조회 칸을 못 씀) |
| 지우기 | `firestore.indexes.json` | `news_view_marks.expireAt` TTL(자동 삭제) — 표지는 2시간 뒤 사라진다 |

**급등 정의(D-78 후보)** = 최근 24시간 조회 증가 = KST 오늘 칸 + 어제 칸의 합. 기사 문서에는 오늘·어제 두 칸만 남긴다.

**"1시간 1번"의 뜻(코티오 판단)** = 같은 연결(IP)·같은 기사는 시계의 한 시간(정각~정각) 안에 1번. 정각을 넘기면 다시 1번 셀 수 있다. 로컬 메모는 열고 나서 60분.

## 시험 (RED 먼저)

1. 유닛(루트 vitest) `lib/__tests__/news/articleViews.test.ts` — 날짜 칸 이름 · KST 자정 넘김(오늘+어제 합, 그제는 빠짐) · 월·해 넘김 어제 · 지울 칸 고르기 · 급등 정렬(0건 → 최신순 · 동점 → 최신순) · 주소 이름 검사
2. 유닛(functions vitest) `functions/src/__tests__/articleViewCore.test.ts` — 표지 id 가 시간·기사·IP 마다 다르고 같은 시간 안에서는 같음 · 소금 없으면 거부
3. 통합(에뮬레이터 · `npm run test:rules`) `tests/rules/article-view.store.test.ts` — 첫 조회 셈 · 같은 표지 다시 = 안 셈 · 초안 기사 = 안 셈 · 없는 기사 = 안 셈 · 옛 날짜 칸 지워짐 · 브라우저는 `news` 조회 칸을 못 씀 · `news_view_marks` 못 읽음/못 씀
4. E2E(에뮬레이터 Playwright) `e2e/emulator/pitch2-article-views.spec.ts` — 발행 기사 2건(새 기사 A · 옛 기사 B) → B 지면 열기 → `views.total` 1 → 급등 정렬에서 B 가 A 앞으로 → 다시 열어도 1(1시간 1번) → 익명 계정 0개(D-41) → 콘솔 오류 0. 홈의 급등 열은 PR A 에서 같은 정렬 함수를 쓴다.

## 하지 않는 것
외신 받아오기 · `news_world` · TheNewsAPI 토큰 · 화면 문구(이 PR 은 화면 글자를 하나도 더하지 않는다).
`.env.local` 의 빈 `THENEWSAPI_TOKEN=""` 줄은 지운다(깃에 없는 파일 — 대표 컴퓨터에서만).

## 병합 뒤 배포(대표 승인 후)
1. `firebase deploy --only firestore:rules,firestore:indexes --project worldcrown48` (규칙 + TTL)
2. `firebase deploy --only functions:recordArticleView --project worldcrown48`
함수가 없을 때 브라우저 호출은 조용히 실패하므로 순서가 바뀌어도 화면은 깨지지 않는다.
