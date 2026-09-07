# Claude Code 전달 프롬프트 — RUN-1 (참가 규칙 v2.0 코드 정합)

> 대표님은 아래 `---8<---` 사이의 내용을 **통째로 복사해 Claude Code 입력창에 붙여넣기**만 하시면 됩니다.
> 작성: 티오(Cowork) · 2026-09-03 · 브랜치 `feat/run-1-participation-v2` (문서 커밋 `c2e2d90` 위)

---8<--- 여기서부터 복사 ---8<---

WorldCrown48 RUN-1 킥을 시작한다. 이 작업의 정본 지시서는 저장소 안에 있다.

## 0. 지금 브랜치와 첫 동작
현재 브랜치는 `feat/run-1-participation-v2` 이고, 직전 작업 브랜치(`feat/utm-campaign-qr-removal`, PR #89)에서 분기해 문서 커밋 1개(`c2e2d90`)가 이미 올라가 있다. **로컬 `main`은 stale하다 — 절대 기준으로 삼지 마라.**

첫 동작으로 원격을 최신화하고 그 위에 올려라. (티오가 작업한 VM에는 SSH 키가 없어 fetch를 못 했다. 너는 대표님 컴퓨터에서 도니 된다.)

```
git fetch origin
git rebase origin/main
```

리베이스 중 충돌이 나면 멈추고 대표님께 보고하라. 진행하지 말 것.

## 1. 필독 (이 순서로 전부)
1. `outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md` ← **이 작업의 본문. §0~§12 전부.**
2. `outputs/참가규칙_정본v2.0_판Run_2026-09-03.html` ← 규칙 정본
3. `outputs/RUN-1_작업명세서_v1.0_2026-09-03.html` ← 파일별 지시 12건 · 3언어 문구 승인본
4. `CLAUDE.md` 의 "⚖️ 참가 규칙" 절
5. `LANGUAGE.md` §2 용어(판 / 회차 / 일일 판 한도) + 금지어표

읽은 뒤 핸드오프 §0 자가 검증 명령을 **직접 실행**해 5개 항목이 전부 ✓ 인지 확인하고, 그 결과를 먼저 출력하라.

## 2. 한 줄 목표
한 Voter가 하나의 Tournament를 **하루(KST) 최대 5판**까지 완주할 수 있고, **판마다 대진표가 새로 섞이며 Crown Card가 1장씩** 남는다. **비로그인은 하루 통틀어 1판.**

현재 코드는 폐기된 옛 규칙(하루에 서로 다른 대회 5개)으로 동작한다. 이 작업은 그 어긋남을 대표 확정 정의에 맞추는 것이다.

설계의 뼈대는 한 줄이다 — 모든 기록의 이름표에 회차를 붙인다:
`{uid}_{tournamentId}` → `{uid}_{tournamentId}_r{runIndex}`
**단, 회차의 정본은 문서 필드 `runIndex`다. id 접미사는 키 충돌 방지용일 뿐이니 로직은 언제나 필드를 읽어라.**

## 3. 진행 단위 — PR 3개, 순서 엄수
- **Phase 1 (PR 1) — 서버 코어**: participation.ts · voteRecord.ts · onVote.ts · bracketSeed.ts · advanceRound/roundProgress · crownCardRecord.ts · onChampionConfirmed.ts · firestore.rules(`daily_participation` → `daily_runs` 컬렉션명만). 핸드오프 §3 표 그대로. **전체의 절반 이상이다.**
- **Phase 2 (PR 2) — 화면·문구**: voteGate.ts · `app/arena/[tournamentId]/page.tsx` 재입장 화면 · messages.ts · LoginModal.tsx · guestVoteGuard.ts
- **Phase 3 (PR 3) — 정리·계측**: 옛 문서 읽기 폴백(회차 없음 = 1회차) · `match_session_id` 해시에 runIndex 추가 · `first_vote` 이벤트 신설(판당 1회)

각 Phase는 **독립 PR**로 올리고, 앞 PR이 머지된 뒤 다음 Phase로 간다. PR 본문에 핸드오프 §10 종료 조건 체크리스트를 넣어라.

## 4. 작업 방식 — Superpowers TDD (2026-08-30에 이걸 빠뜨린 전례가 있다)
`/plugin install superpowers@claude-plugins-official` 이 활성화된 상태에서:
```
Phase 1 — /brainstorm : §2 목표 + §9 함정 7건을 입력해 접근 방식·의존성 순서 정리
Phase 2 — /plan       : §3 파일 순서 확정, §4 완료 조건 12개를 테스트 케이스로 매핑
Phase 3 — TDD RED-GREEN-REFACTOR : 순수 함수부터. 테스트 없이 구현 먼저 절대 금지
Phase 4 — /review     : §5 제약 위반 0건 · LANGUAGE.md 금지어 0건 · strict 통과
Phase 5 — /pr         : §10 종료 조건을 PR 본문에 포함
```
Superpowers가 설치돼 있지 않으면 **멈추고 대표님께 알려라** — 임의로 건너뛰지 말 것.
TDD 대상 파일 매핑은 핸드오프 §11.2 표를 그대로 따른다.

## 5. 절대 규칙 (핸드오프 §5)
**DO**
1. 회차의 정본은 **문서 필드 `runIndex`**. id의 `_r{n}`은 충돌 방지용.
2. 한도 판정은 **서버가 최종**. 클라 `voteGate`는 UX용이고 `onVote`가 독립 재판정한다.
3. **게스트 = 하루 통틀어 1판** (대회당 1판 아님).
4. **미완주 판도 회차를 소모**한다 — 판을 *시작*한 시점에 카운트. 재입장은 언제나 **이어하기**.
5. **마감 지난 대회는 새 판 불가.**
6. **지난 회차 Crown Card 전부 보존**, 각각 공유·저장 가능.
7. 화면 문구는 아래 §6 표 **그대로**. 한 글자도 바꾸지 마라.

**DON'T**
1. ❌ **"표"를 단위로 쓰는 문구 금지** — "1일 5표", "하루 230표", "46표", "투표 무제한" 전부 LANGUAGE.md 금지어. 사람에게 보이는 단위는 **판**뿐이다.
2. ❌ `rankingAggregator` / `scheduleRankingCache` 집계 로직 손대지 마라 (5판 전부 반영 확정이라 변경 불필요).
3. ❌ 기존 프로덕션 문서 일괄 변환 **마이그레이션 스크립트 금지** — 읽기 폴백으로 처리.
4. ❌ `bracket_seeds`의 create-once 불변 규칙 완화 금지 — 새 판은 **새 문서 id**로.
5. ❌ 문서 id를 `split('_')`로 잘라 tournamentId를 복원하는 코드 **신규 작성 금지**.
6. ❌ **Arena UI 대수술(ARENA-1/2)을 여기서 하지 마라** — 이 킥의 범위는 재입장 화면에 버튼·목록을 얹는 것까지.
7. ❌ 새 색·새 컴포넌트 만들지 마라. `docs/design/` v3.0 토큰과 기존 버튼 스타일 재사용.

## 6. 화면 문구 3언어 — 대표 승인 완료본 (글자 단위 그대로)

| 키 | ko | en | es |
|---|---|---|---|
| `arena.vote.dailyLimit` | 이 Tournament는 오늘 5판을 모두 도셨어요 (5/5) | You've played all 5 runs of this Tournament today (5/5) | Ya has jugado las 5 partidas de este Tournament hoy (5/5) |
| `dailyLimitSub` | 한국 시간 자정에 5판이 다시 채워져요. 다른 Tournament는 지금 바로 도실 수 있어요. | Your 5 runs reset at Seoul midnight. Other Tournaments are open right now. | Tus 5 partidas se reinician a medianoche de Seúl. Otros Tournaments están abiertos ahora. |
| `arena.run.playAgain` (신설) | 다시 도전 (n/5) | Play again (n/5) | Jugar otra vez (n/5) |
| `arena.run.pastCards` (신설) | 지난 판의 Crown Card | Your earlier Crown Cards | Tus Crown Cards anteriores |

"Tournament" · "Crown Card" 는 3언어 모두 **원문 그대로** (LANGUAGE.md RULE 1).
화면 문구를 위 표 밖에서 새로 만들거나 바꿔야 할 일이 생기면 **구현하지 말고 대표님께 승인 요청**하라.

## 7. 미리 실측된 함정 7건 (§9 — 여기서 사고가 난다)
1. ✅ Firestore 보안 규칙은 거의 그대로 둬도 된다. `docId.split('_')[0] == uid` 판정이라 `_r{n}`을 붙여도 첫 조각은 여전히 uid. **컬렉션명 바꾸는 `daily_participation` → `daily_runs`만 수정.**
2. ⚠️ **tournamentId에 `_`가 들어 있다** (`gen4_idol_48`·`best_stage_48`). 문서 id를 split해 tid를 복원하지 마라. `onChampionConfirmed`는 이미 필드(`after.tournamentId`)를 읽는다 — 그 방식을 유지·확장하라.
3. ⚠️ `bracket_seeds`는 create-once 불변이고 규칙이 키를 `['seed','createdAt']`로 제한한다. **회차는 문서 id에만 담고 필드는 건드리지 마라.**
4. ⚠️ 게스트 uid는 브라우저마다 새로 생기고 게스트 표도 랭킹에 집계된다. 게스트 1판 한도를 느슨하게 하면 랭킹 조작 비용이 0이 된다.
5. ⚠️ **클라·서버 게이트가 어긋나면 P0** (2026-07-05 사고가 정확히 이 유형). 두 판정을 같은 순수 함수 또는 동일 테스트 케이스로 묶어라.
6. ⚠️ "다시 도전"은 **완주 상태에서만** 노출. 미완주 재입장은 언제나 그 판을 이어서다.
7. ⚠️ 로컬 `main`은 매번 stale하다.

## 8. 완료 조건 (§4 — 12개 전부)
1. 같은 Tournament 하루 5판 완주 가능, 6판째 `daily_limit_reached`
2. 다른 Tournament는 별도 5판 (A 5판 소진해도 B는 그대로)
3. 판마다 대진표가 다르다 (1회차·2회차 bracket seed 상이)
4. 판마다 Crown Card 1장 (5판 → 5장, 각각 조회·공유)
5. 지난 판 카드 보존
6. 비로그인 하루 통틀어 1판 — 완주 후 재도전·타 대회 진입 모두 로그인 요구
7. KST 자정 리셋
8. 미완주 판도 회차 1개 차지, 재입장 = 이어하기
9. 마감 지난 Tournament는 새 판 불가
10. 랭킹 집계가 5판 전부 반영 (`rankingAggregator` 코드 변경 없이)
11. 옛 문서(회차 없음) 계정도 화면 정상 동작 — 1회차로 표시
12. 화면 문구 3언어가 §6 표와 글자 단위 일치

금지어 게이트: `grep -rn "5표\|46표\|투표 무제한" app lib components` 결과가 **0건**이어야 한다.

## 9. 각 PR 머지 후 — 네가 먼저 완주할 것
Vercel Preview에서 아래 5단계를 **네가 직접 끝까지 돌고**, 결과를 표로 보고한 뒤에 대표님 눈검사를 요청하라. 대표님께 "확인해 주세요"를 먼저 말하지 마라.
1. A대회 1판 완주 → 카드 1장 확인 → [다시 도전 (2/5)] 클릭
2. 2판째 진입 → **48강 첫 매치의 대진 조합이 1판째와 다른지 확인** ← 이 킥의 핵심 눈검증
3. 2판 완주 → 카드 2장이 모두 남아 있고 각각 공유되는지
4. A대회 5판 소진 → 6판째 차단 문구 확인 → B대회는 정상 진입
5. 시크릿 창(비로그인) 1판 완주 → 같은 대회 재도전·다른 대회 진입 모두 로그인 모달

## 10. 보고 방식
- 대표님은 코딩 초보다. 전문 용어·영어 약어는 **첫 등장마다 괄호로 쉬운 설명**을 달아라.
- 터미널 명령을 드릴 때는 **명령 하나당 코드 상자 하나**, 그리고 "이 줄이 무엇을 왜 하는지" 한 문장 + "성공하면 무엇이 보이는지".
- 화면에 보이는 글자(버튼명·라벨)를 바꿔야 하면 **커밋 전에 전후 비교로 승인**을 받아라.
- Phase가 끝날 때마다 변경된 화면의 전후 비교를 보여드려라.

---8<--- 여기까지 복사 ---8<---
