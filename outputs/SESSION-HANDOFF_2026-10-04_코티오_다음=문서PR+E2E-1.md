# 세션 인계 — 2026-10-04 (일) · 코티오 → 다음 세션 코티오

이 세션: 2026-09-28 19:40 KST 시작 ~ 2026-10-04 14:20 KST 마감 (중간에 며칠 쉼)

## 0. 다음 세션 시작 프롬프트 (대표님이 그대로 붙여 넣기)

```
코티오야, WorldCrown48 이어서 하자. 첫 줄에 [환경: 코워크 · 코티오]와 지금 날짜·시간(KST)을 적어 줘.

먼저 이 순서로 읽어:
1) 프로젝트 문서 claude/SESSION-HANDOFF_2026-10-04_코티오_다음=문서PR+E2E-1.md (이 인계서)
2) 저장소 outputs/DECISIONS_결정원장_v1.0_2026-09-11.md 의 D-33 ~ D-42
3) 저장소 outputs/CLAUDE-md_중간점검_2026-10-04.html (CLAUDE.md에서 고칠 12곳)

확정된 것(다시 묻지 말 것): 원장 D-01 ~ D-42 전부.

오늘 할 일:
① 문서 PR 하나 — CLAUDE.md v2.8(중간점검 표 12곳) + 결정 원장 D-33~D-42 + 커밋 안 된 outputs 문서들. 브랜치로 만들고 push 명령은 한 줄씩 줘.
② #112(익명 계정) 병합 때 게스트 E2E(hf3-guest-run · run1-daily-run-limit)가 통과했는지 GitHub에서 확인하고, 파이어베이스 인증 사용량 그래프가 줄었는지 내가 캡처를 보내면 판정해 줘.
③ 런칭 전 순서 첫 번째 E2E-1을 시작해 — 킥 문서와 Claude Code 프롬프트까지.

규칙: 초보자에게 설명하듯, 용어는 처음 쓸 때 괄호 풀이. 터미널 명령은 한 줄씩 따로 상자. main은 보호 브랜치(브랜치→PR→병합). 화면·흐름을 바꾸는 코드는 Claude Code에 넘겨 Superpowers(테스트 먼저→계획→검증)로. 긴 작업은 시간 먼저 알려 주기. 세션 끝에 "제가 이해한 것 5줄" 확인 후 문서·메모리.
```

## 1. 이 세션에서 병합·확정된 것

| 무엇 | PR · 결정 | 상태 |
|---|---|---|
| 검색 엔진용 사이트맵 + robots.txt Sitemap 줄 | #110 (9/28) | 실제 사이트 200 확인 · 서치 콘솔(도메인 방식) 제출 완료 |
| 사이트맵 언어별 주소 안내(hreflang) | #111 (10/4) · 원장 D-42 | 실제 사이트 확인: 주소 64개, 모두 언어판 묶음 |
| 익명 계정은 쿠키 동의 저장 · 아레나 입장 · 크라운 카드 입장에서만 | #112 (10/4) · 원장 D-41 | 병합 완료 · 효과 실측은 아직 |

- 원장 D-41·D-42는 네 줄 형식으로 기록했습니다(로컬 파일, 다음 문서 PR로 커밋).
- COOKIE-1 지시서 머리에 "익명 로그인 시점은 D-41로 이미 처리 — #112 위에서 작업"을 덧붙였습니다.
- 대표님이 "이해한 것 5줄"을 확인하셨습니다(익명 계정 규칙 · 기각된 제안 2~4 · 개발 일지 기록 원칙).

## 2. 만든 문서 (링크)

- 익명 600명 조사 보고서: https://claude.ai/artifact/WcmX7ByJWhsEPpzwvAdXRz
- 개발 일지 v2: https://claude.ai/artifact/HBrB4gyXdjJKy3zZEySxTc · A4 PDF outputs/월크48_개발일지_v2_A4_2026-10-04.pdf
- GA4 이벤트 목록: https://claude.ai/artifact/FAs86DpkgyuH95QXqQQ4tc
- CLAUDE.md 중간 점검: https://claude.ai/artifact/BvkAhjqGN2becGkFYixE5a

## 3. 중간 점검 결과 요약 (상세는 점검 문서)

- CLAUDE.md v2.7(9/24)은 그 뒤 결정을 반영하지 못했습니다. 급한 3곳은 ① 도메인 테마 표(D-40) ② 디자인 정본 = 클로드 디자인(D-20) ③ 결정 원장을 우선순위에 넣기입니다.
- 그다음으로 중요한 곳: 대진 크기 선택은 런칭 후(D-09) · 기본 표시 이름 팬/Fan(D-32) · 익명 계정 규칙(D-41) · 런칭일 10/8과 로드맵 v1.1 · 런칭 전 순서(D-36). 정리할 곳: Realtime DB 표기 삭제(쓰는 곳 없음) · Node 22(D-33) · 카테고리 날짜 · 사이트맵(D-42).
- **결정 원장이 저장소에 덜 올라가 있습니다.** 저장소에는 항목 40개, 로컬에는 50개입니다. 커밋 안 된 outputs 파일은 20개입니다(git status 기준).
- **Superpowers**: 테스트 먼저 쓰기는 지켜지고 있습니다. 계획서(docs/superpowers/)는 RUN-1 이후 없습니다. 티오가 직접 만든 #110~#112는 Superpowers 절차 밖입니다. 앞으로 화면·흐름을 바꾸는 코드는 Claude Code에 넘깁니다.
- **worldcrown48-design 스킬**이 "v2.3"으로 소개돼 있어 낡은 것으로 보입니다. v4 기준으로 갱신이 필요합니다.

## 4. 남은 일 (우선순위 순)

1. **문서 PR** — CLAUDE.md v2.8 + 원장 D-33~D-42 + 커밋 안 된 outputs 문서. (9/29부터 "맨 앞"이었는데 아직 못 함)
2. **ANON-1 효과 확인** — #112 병합 때 게스트 E2E 결과 확인. 며칠 뒤 파이어베이스 인증 사용량 그래프로 판정(PR 없는 날 익명 계정이 늘면 재조사).
3. **E2E-1** → COOKIE-1 → NAV-1 → THUMB-1 → FONT-1 → ARENA-2 → 크라운 카드 새 디자인 (D-36).
4. 대표님 몫:
   - GA4 주요 이벤트 등록. "코드로 만들기"에서 만들기 버튼이 안 눌렸는데, 주요 이벤트 스위치가 꺼졌거나 창이 좁아 버튼이 잘린 것으로 보입니다. 안 되면 이벤트가 들어온 뒤 별표로 표시합니다.
   - GA4 맞춤 정의 6개 등록: is_guest · category · lang · round · trigger_point · entry_point
   - 서치 콘솔 사이트맵 상태가 "성공"으로 바뀌었는지 확인
5. 작은 숙제: 쿠키 이벤트 5개(cookie_banner_view 등)는 문서에만 있고 코드에 없습니다. COOKIE-1 때 판단합니다. worldcrown48-design 스킬도 갱신해야 합니다.
6. ARENA-2 킥에서 정할 작은 것 3가지: 게시판 정렬 · 검색 범위 · 카테고리별 나누기 (9/29 인계서).

## 5. 도구 메모 (티오용)

- 대표님 컴퓨터(device) VM에서 `git fetch https://github.com/choijinii/worldcrown48.git +main:refs/remotes/origin/main`이 됩니다(저장소 공개). 로컬 main이 낡았으면 이걸로 갱신합니다.
- VM에서 vitest: `$HOME/rb`에 `@rolldown/binding-linux-arm64-gnu@<rolldown 버전>`을 받고 `NODE_PATH=$HOME/rb/node_modules`로 실행합니다. 작업 폴더에는 main의 node_modules 심볼릭 링크를 둡니다.
- git 작업 전에 **삭제 권한을 먼저** 받습니다. 그러지 않으면 index.lock·HEAD.lock이 남습니다.
- 클라우드와 VM 모두 www.worldcrown48.com 접속이 막혀 있습니다. 실제 사이트 확인은 Claude in Chrome으로 합니다.
- 소스 전체를 클라우드로 옮기는 압축 업로드는 보안 판정으로 거절됐습니다. 다시 시도하지 않습니다.
