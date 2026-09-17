# 계측 이벤트 명세 — WorldCrown48 (v1.2)

작성: 2026-08-27 · **v1.2 개정: 2026-09-08 (티오 — 참가 규칙 v2.1 반영 + 코드 이름 대조)**
저장 위치: `marketing/00_strategy/EVENT_SPEC.md`
목적: 마케팅 판정 지표를 계산하기 위해 **반드시 수신되어야 하는 이벤트** 목록
개발 요청: 코드의 실제 이벤트명과 대조하여 **누락 여부 확인**

---

## 사용 안내

- 아래 이벤트명은 **제안**입니다. 코드에 이미 다른 이름으로 구현되어 있다면
  **코드 쪽 이름을 정본으로 삼고**, 이 문서를 그에 맞게 갱신합니다.
- 중요한 것은 이름이 아니라 **① 그 시점에 이벤트가 발생하는가 ② 필요한 파라미터가 붙는가** 입니다.
- 파라미터가 없으면 이벤트가 있어도 판정에 쓸 수 없습니다.

---

## 공통 파라미터

아래 4개는 **모든 이벤트에 공통으로** 붙어야 교차 분석이 가능합니다.

| 파라미터 | 값 | 없으면 못 하는 것 |
|---|---|---|
| `is_guest` | true / false | 게스트와 로그인 사용자 비교 불가 |
| `tournament_id` | 문서 ID | 토너먼트별 성과 비교 불가 |
| `category` | kpop / creator | **카테고리별 전략 판단 불가** |
| `lang` | ko / en / es | 언어권별 이탈 차이 파악 불가 |

---

## 핵심 이벤트 6종

### 1. 토너먼트 시작
```
event: tournament_start
발생: 첫 매치 화면이 표시된 시점
params: (공통) + entry_point (home / share_link / news / direct)
```
**측정 대상** — 유입 대비 시작률. `entry_point`로 공유 유입의 시작률을 따로 볼 수 있음.

### 2. 라운드 진행 ★ 가장 중요
```
event: round_advance
발생: 각 라운드 완료 시 (48 → 24 → 12 → 6 → FINAL)
params: (공통) + round (48 / 24 / 12 / 6 / final)
```
**측정 대상** — **이탈 라운드**. "몇 명이 나갔다"가 아니라 "12강에서 나갔다"를 알아야
라운드 구조와 임베드 길이를 고칠 수 있음. **이 이벤트가 없으면 W4 베타의 의미가 절반으로 줄어듦.**

### 3. 챔피언 확정
```
event: champion_confirmed
발생: THE FINAL 선택 완료 시
params: (공통) + champion_id + duration_sec (시작~완주 소요 초)
```
**측정 대상** — **완주율**(기준 50%). `duration_sec`로 실제 소요 시간 실측.

### 4. Crown Card 생성
```
event: crown_card_created
발생: 카드 이미지 생성 완료 시
params: (공통) + card_id
```
**측정 대상** — 완주에서 카드까지의 이탈 여부.

### 5. 공유 클릭 — ★ v1.2: 코드 이름을 정본으로 (3개로 나뉘어 있음)
```
event: crown_shared_x        ← channel = x
event: crown_shared_native   ← channel = native (기기 공유 시트)
event: crown_downloaded      ← channel = download (fmt: story / feed / both)
발생: 각 버튼 클릭 시 (이미 구현됨)
params: (공통 4개 — ✅ RUN-1 PR 2에서 구현) + fmt
```
**측정 대상** — **공유율**(기준 10%). ⚠️ 09-08 실측: 이 3개 이벤트에 **공통 파라미터(is_guest·category·lang)가 붙어 있지 않았다** → RUN-1 PR 2에서 추가. `kakao` 채널은 코드에 없다(구현 계획 없음).
**v2.1 주의** — 게스트 공유가 열리므로 공유율은 반드시 **`is_guest`로 나눠서** 본다. 섞으면 회원 공유율이 부풀려 보인다. "게스트 공유 개방이 유입을 만들었는가"는 `is_guest=true`의 이 3이벤트 ÷ 게스트 `champion_confirmed`로 판정.

### 6. 게스트 → 로그인 전환
```
event: guest_signin_convert
발생: 게스트 세션이 로그인 계정으로 연결된 시점 (linkSessionVote 성공)
params: trigger_point (card_modal / quota_limit / guest_limit / other)   ← ✅ v1.2: guest_limit 구현 완료 (RUN-1 PR 2)
```
**측정 대상** — **전환율**(기준 30%). `trigger_point`로 어느 지점이 전환을 만드는지 확인.
**v2.1 의미** — `card_modal` = Crown Card의 **저장(다운로드) 잠금** 배너에서 로그인 · `guest_limit` = **하루 3판 소진** 모달에서 로그인(v2.1의 주 전환 지점) · `quota_limit` = 로그인 사용자의 일일 한도(Google 버튼이 숨겨져 실제론 거의 0).

---

## 추가 필요 2종 (당초 목록에서 누락)

### 7. 잠금 배너 노출 — ★ v1.2: 의미가 바뀜 (이름은 유지)
```
event: share_locked_view
발생: 게스트가 Crown Card 모달의 잠금 배너를 본 시점 — v2.1부터 이 배너는 "공유 잠금"이 아니라 "저장(다운로드) 잠금"이다
params: (공통)
```
**왜 필요한가** — 전환율의 분모 중 하나. v2.1에서 게스트 공유가 열렸으므로 이 배너의 유인은 "간직하려면 로그인"이다. 이름을 바꾸면 GA 과거 데이터와 끊기므로 **이름은 유지하고 정의만 갱신**한다.

### 9. ★ v1.2 신설 — 게스트 3판 소진 모달 노출
```
event: guest_limit_view
발생: 게스트가 하루 3판을 다 쓰고 guest_limit 로그인 모달을 본 시점 (1회)
params: (공통) + runs_today (=3)
```
**왜 필요한가** — v2.1에서 **회원 전환의 주 지점이 "공유 잠금"에서 "3판 소진"으로 옮겨갔다.** 이 분모가 없으면 게스트 전환율 30% 판정이 불가능하다(08-27에 7번을 추가한 것과 같은 이유). ✅ **구현 완료 (RUN-1 PR 2)** — `app/arena/[tournamentId]/page.tsx` 에서 발화한다(모달은 tournament·category를 모른다).

### 10. ★ v1.2 신설 — 판(회차) 단위 계측 (PR 3)
```
event: first_vote            발생: 한 판(Run)의 첫 선택 시 1회. params: (공통) + run_index
match_session_id             해시 입력에 run_index 추가 → 판마다 다른 값 (사람×대회 1:1 가정 폐기)
```
**왜 필요한가** — 참가 규칙 v2.0으로 한 사람이 같은 대회를 하루 5판까지 돈다. 회차가 없으면 완주율·이탈 라운드가 판 단위로 안 나뉜다. (09-03 서신 참조)

### 8. 사전등록 완료 — ★ v1.2: 코드 이름을 정본으로
```
event: waitlist_submit        (중복 시 waitlist_duplicate)
발생: 웨이트리스트 등록 성공 시 (이미 구현됨)
params: email_hash
```
**UTM 유지 확인(09-08)** — 이벤트에 utm 파라미터는 없지만, GA4는 유입 출처(utm_source/medium/campaign)를 **세션 단위로 자동 귀속**하므로 "어느 채널에서 온 등록인가"는 GA 보고서(이벤트 × 세션 소스/매체)로 볼 수 있다. 별도 구현 불필요.
**왜 필요한가** — **사전등록 500명 목표의 측정 수단**입니다.
어느 채널에서 온 방문자가 등록까지 갔는지 알아야 W5 중간 점검에서 전략을 수정할 수 있습니다.
(계측 코드가 이미 있다고 들었으므로, UTM이 등록 시점까지 유지되는지만 확인 필요)

---

## 데이터 정합성 — 확인 요청 1건

쿠키 동의 게이트 때문에, **분석 동의를 거부한 사용자는 위 이벤트가 전혀 발생하지 않습니다.**
따라서 GA 수치는 항상 실제보다 낮게 나옵니다.

**대조 방법**
- Firestore의 `votes` / `roundProgress` 컬렉션에는 동의 여부와 무관하게 기록이 남습니다.
- GA의 `champion_confirmed` 수 ÷ Firestore의 실제 완주 기록 수 = **동의율 보정계수**
- 이 계수를 알면 GA 수치를 실제 규모로 환산할 수 있습니다.

W4 베타 때 한 번만 대조해 두면, 이후 모든 판정에 적용할 수 있습니다.

---

## 판정 지표와의 대응

| 지표 | 필요 이벤트 | 계산 (v1.2) |
|---|---|---|
| 완주율 | 1, 3 | `champion_confirmed` ÷ `tournament_start` — **is_guest로 분리해서 본다** |
| 이탈 라운드 | 2 | 라운드별 `round_advance` 감소 곡선 |
| 공유율 | 3, 5 | (`crown_shared_x` + `crown_shared_native` + `crown_downloaded`) ÷ `champion_confirmed` — **is_guest 분리 필수** |
| 게스트 공유 개방 효과 | 5 | `is_guest=true` 공유 이벤트 수 · 공유 링크 유입(`utm_medium=share`, 이벤트 `is_guest` 아님 — 유입은 세션 소스로) |
| 게스트 전환율 | 6, 7, 9 | `guest_signin_convert` ÷ (`guest_limit_view` + `share_locked_view`) · trigger_point별로 나눠 어느 지점이 전환을 만드는지 판정 |
| 사전등록 | 8 | 누적 `waitlist_submit` × 세션 소스/매체 |
| 유입 출처 비중 | 전체 | `utm_medium` = share / owned 비중 |

---

## 갱신 기록

| 날짜 | 내용 |
|---|---|
| 2026-08-27 | 최초 작성 · 6종 → 8종으로 확대 (분모 이벤트 누락 발견) |
| 2026-09-09 | **RUN-1 PR 2 구현 반영 (개발)** — ⑤ 공유 3이벤트에 공통 4파라미터 부착(`ShareMenu` 가 `track` → `trackWithConsent`) · ⑥ `trigger_point` 에 `guest_limit` 버킷(`LoginModal` + `SignInTriggerPoint`) · ⑦ `share_locked_view` 주석을 "저장 잠금"으로 갱신(이름 유지) · ⑨ `guest_limit_view` 신설. **주의**: `is_guest` 판별을 `!canShare` → `!canSave` 로 바꿨다 — v2.1에서 `canShare` 는 항상 true라 게스트 판별에 못 쓴다. |
| 2026-09-08 | **v1.2 (티오)** — 참가 규칙 v2.1(게스트 3판·공유 개방·저장 잠금·게스트의 선택 랭킹 제외) 반영. ⑤·⑧은 코드 이름을 정본으로 교체(`crown_shared_*`·`crown_downloaded` / `waitlist_submit`) · ⑤에 공통 파라미터 누락 발견 → PR 2 · ⑥ trigger_point에 `guest_limit` · ⑦ 정의를 "저장 잠금"으로 · **⑨ `guest_limit_view` 신설(PR 2)** · ⑩ `first_vote`·match_session_id 회차(PR 3) · 판정 지표를 is_guest 분리로 재정의. 용어: "표" 낱말 금지 → "선택" |
| 2026-08-30 | 개발 측 대조 완료 — `app/arena`·`components/arena`·`lib/arena` 전체에 계측이 전혀 없었음을 확인. ① tournament_start · ② round_advance · ③ champion_confirmed · ④ crown_card_created · ⑥ guest_signin_convert · ⑦ share_locked_view, 총 6종 구현(PR 대기, feat/instrumentation-funnel-a). ⑤ share_click · ⑧ waitlist_signup은 이번 범위 밖 — 다음 소킥. |
