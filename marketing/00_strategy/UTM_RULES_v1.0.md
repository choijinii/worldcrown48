# UTM_RULES v1.0 — 정식 규격표

작성: 마케팅 채팅 / 승인 대기: 대표님 / 대조처: 티오(개발)
날짜: 2026-08-28 · 현행 코드 대비 **변경 2건 / 유지 3건 / 확인 요청 2건**

---

## 0. 먼저 — 현행 값에서 바꿔야 할 것 2가지

**① `utm_campaign = crown_card` 고정은 풀어야 합니다.**
지금 값이면 GA4에서 "크라운 카드 공유로 들어온 사람"은 세지지만, **어느 토너먼트에서 나온 공유인지**를 나눌 수 없습니다. 런칭 토너먼트가 4종이라 이건 그대로 손실입니다. `utm_campaign`은 토너먼트 슬러그로 내리고, `crown_card`는 `utm_content`로 옮기는 것을 제안합니다. 카드 포맷은 '캠페인'이 아니라 '소재'입니다.

**② `utm_medium = share`는 GA4가 못 알아볼 수 있습니다.**
GA4 기본 채널 그룹은 정해진 medium 값 목록(`organic` `cpc` `email` `referral` `affiliate` `social` 등)으로 분류합니다. 제가 아는 한 그 목록에 `share`는 없어서, 유저 공유 유입이 전부 **Unassigned**로 떨어질 가능성이 큽니다. 다만 이건 제 기억이라 **티오가 GA4 콘솔에서 실제 확인**해 주셔야 합니다.

`share`라는 값 자체는 우리 서비스 구조상 정확합니다(유저가 만든 공유 ≠ 우리가 올린 소셜 게시물). 그래서 값을 바꾸는 대신 **GA4에 맞춤 채널 그룹을 하나 만들어** `share`를 잡는 쪽을 권합니다. 값을 `social`로 바꾸면 우리 X 계정 게시물과 유저 공유가 한 통에 섞입니다.

---

## 1. 현행 3개 채널 확정표

| 채널 | utm_source | utm_medium | utm_campaign | utm_content | 현행 대비 |
|---|---|---|---|---|---|
| X 공유 버튼 | `x` | `share` | `{tournament_slug}` | `crown_card` | source·medium 유지 / campaign 변경 |
| 네이티브 공유시트 | `share_sheet` | `share` | `{tournament_slug}` | `crown_card` | source·medium 유지 / campaign 변경 |
| QR 코드 | `qr` | `offline` | `{tournament_slug}` | `crown_card` | **medium 변경** / campaign 변경 |

**QR의 medium을 `offline`으로 바꾸는 이유** — QR은 유저가 링크를 퍼뜨린 게 아니라 물리 접점에서 들어온 유입입니다. `share`에 섞으면 유저 공유 지표가 오염됩니다.

> **확인 요청 (중요)** — 요청 프롬프트에 QR이 "카드 이미지 속 QR코드"로 적혀 있습니다. 그런데 확정 사항은 **QR은 크라운 카드 본체에 넣지 않음 / 공유 메뉴·오프라인에만**입니다. 코드가 카드 본체에 QR을 굽고 있다면 정책과 어긋납니다. 티오 확인 부탁드립니다.

### tournament_slug 값

| 토너먼트 | slug |
|---|---|
| ① 최고의 무대 48 | `best_stage_48` |
| ② 현존 최고 퍼포먼스 아이돌 48 | `perform_idol_48` |
| ③ 4세대 최고로 사랑받는 아이돌 48 | `gen4_idol_48` |
| ④ K-POP 커버 크리에이터 48 | `cover_creator_48` |
| 토너먼트 밖(홈·랭킹·기사) 공유 | `site` |

---

## 2. 명명 규칙 (앞으로 추가되는 모든 채널에 적용)

1. **소문자 영문·숫자·언더스코어만.** 대문자·공백·한글·하이픈 금지. (UTM 값은 대소문자를 구분해서 `X`와 `x`가 다른 값으로 집계됩니다.)
2. 단어 구분은 **언더스코어(`_`)** 하나로 통일.
3. `utm_source` = **플랫폼 실명**. 서비스가 아니라 플랫폼입니다.
4. `utm_medium` = **아래 허용값에서만** 고릅니다. 새 값이 필요하면 이 문서를 먼저 고칩니다.

| utm_medium | 언제 쓰나 |
|---|---|
| `share` | 유저가 크라운 카드·링크를 직접 공유 |
| `social` | 우리 공식 계정이 올린 게시물 |
| `email` | 뉴스레터·보도자료 메일 |
| `cpc` | 유료 광고 |
| `referral` | 매체 기사·블로그 등 외부 링크 |
| `offline` | QR·오프라인 물류 |

5. `utm_campaign` = **토너먼트 슬러그** 또는 마케팅 캠페인 단위(`prelaunch` `launch_d1` `hangeul_chongong` 등).
6. `utm_content` = **소재 구분**. `crown_card` `og_card` `news_article` `profile_link`.
7. `utm_term`은 유료 광고 키워드 전용. 지금은 **사용하지 않습니다**.

### 앞으로 추가될 채널 예시

| 채널 | utm_source | utm_medium | 비고 |
|---|---|---|---|
| 카카오톡 공유 | `kakao` | `share` | 유저 공유 |
| 인스타그램 스토리·게시물(우리) | `instagram` | `social` | |
| 틱톡(우리) | `tiktok` | `social` | |
| 스레드(우리) | `threads` | `social` | |
| X 공식 계정 게시물 | `x` | `social` | 유저 공유와 medium으로 구분 |
| 보도자료 메일 | `press_release` | `email` | |
| 매체 기사 링크 | 매체 도메인 (`chosun` 등) | `referral` | |
| 오프라인 포스터 QR | `poster` | `offline` | |

---

## 3. 사전등록 폼의 UTM 유지 (EVENT_SPEC 확인 항목 답)

**UTM 값은 주소창 쿼리스트링에만 있고, 사용자가 페이지를 한 번만 이동해도 사라집니다.** 사전등록 폼이 랜딩 페이지와 다른 화면이면 `waitlist_signup` 이벤트에는 UTM이 안 붙습니다.

규칙으로 못 박습니다.

1. **첫 진입 시점에 UTM 5개를 세션 스토리지에 저장**한다. 키 예시: `wc48_utm`.
2. 이미 저장된 값이 있으면 **덮어쓰지 않는다** (첫 유입 출처 보존).
3. `waitlist_signup` 이벤트 전송 시 저장된 값을 이벤트 파라미터로 함께 보낸다.
4. 저장 유효기간은 **세션 단위**로 두되, 사전등록은 이탈 후 재방문 비율이 높을 수 있으므로 **7일 로컬 저장**도 검토 대상. 티오 판단에 맡깁니다.

> GA4는 세션 소스/매체를 자동으로 기록하지만, 그건 세션 단위 집계용입니다. **"이 등록자는 어디서 왔나"를 등록 건 단위로 보려면 위 저장 처리가 필요합니다.** 사전등록 500명이 최우선 목표라, 이건 계측 없이는 어느 팬베이스가 실제로 작동했는지 알 수 없게 됩니다.

---

## 4. 티오 대조용 요약

| 항목 | 현행 코드 | 규격표 | 조치 |
|---|---|---|---|
| utm_source (X) | `x` | `x` | 유지 |
| utm_source (공유시트) | `share_sheet` | `share_sheet` | 유지 |
| utm_source (QR) | `qr` | `qr` | 유지 |
| utm_medium (X·공유시트) | `share` | `share` | 유지 + GA4 맞춤 채널 그룹 생성 |
| utm_medium (QR) | `share` | `offline` | **변경** |
| utm_campaign (전 채널) | `crown_card` 고정 | `{tournament_slug}` | **변경** |
| utm_content | 없음 | `crown_card` | **신설** |
| 사전등록 UTM 유지 | 미확인 | 저장 후 이벤트 첨부 | **신설** |
| QR 위치 | 카드 이미지 속(?) | 카드 본체 제외 | **정책 확인 필요** |
