# 🎨 WorldCrown48 (월클48) — UI 디자인 시스템 v4
# WC48_DESIGN_SYSTEM_v4.md
# Twilight Stadium Edition — Arena Match Stage 편입 | v4.2 2026-09-19 | 작성 티오 · 승인 대표
# 기반: v2.4 토큰 100% 계승 + 아레나 매치 무대(ARENA-1)·메뉴바·☰ 서랍·"선택 이어가기" 신규 편입
# 실측 원본: `docs/design/claude-design/Arena_Match_Stage_v1A_9boards_2026-09-19.dc.html` (대표 수정본, 2026-09-19 04:18 저장) — 이 문서의 모든 신규 수치는 이 파일에서 뽑았다.

> **이 파일의 지위** — 디자인 토큰·컴포넌트 규격의 단일 진실 공급원. 단, **결정의 뜻·이유·기각안은 `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md`(원장)가 정본**이며, 이 문서와 원장이 다르면 원장이 이긴다. 이 문서는 원장의 결정을 "그리는 사람·코드가 쓰는 값"으로 옮긴 것이다.
>
> **v4에서 v2.4를 버리지 않는다.** v2.4의 토큰·금지 규칙은 그대로 유효하고, v4는 그 위에 아레나 무대 층을 얹는다. v2.4에만 있는 랜딩 연출 절(§4-C·§10-A·§10-B 등)은 v4에 다시 쓰지 않고 v2.4를 참조한다.
>
> **정본 규칙 (원장 D-20 · 2026-09-19)** — 색·크기·부품의 **정본은 클로드 디자인 "WorldCrown48 Design System"** 이다. 저장소의 `colors_and_type.css`·`kit.css`는 그 **내보낸 사본**(손편집 금지). 이 문서는 해설서이며, 아래 §2-B 표는 **2026-09-19 실측 스냅샷**이다 — 내보낸 css가 들어오면 css가 이기고, 어긋나면 이 표를 고친다. `arena_stage_tokens.css`는 2026-09-19 내보내기에 **정본 파일로 포함**되었으므로 이제 임시가 아니다(내보낸 사본).
>
> **v4.2 동기화 기록 (2026-09-19)** — 클로드 디자인 내보내기(`docs/design/claude-design/bundle_v4_2026-09-19/`)로 `colors_and_type.css`·`arena_stage_tokens.css`를 덮어썼다. **발견**: 저장소에 있던 옛 `colors_and_type.css`(2026-05-25판)는 정본과 이미 갈라져 있었다 — 모서리 반경 5px(옛 파일 8~32px), `--color-gold-bright #FBB03B`(옛 #FFE25C), 간격 토큰 `--space-N`(옛 `--spacing-*`), 글자 크기 `--text-*`·줄높이 `--lh-*` 45개는 옛 파일에만 있었고 코드(`app/globals.css`)는 **정본 쪽**을 쓰고 있었다. 옛 파일은 `docs/design/reference/colors_and_type_2026-05-25_stale.css`로 보관. §2-A 표의 13개 색 값은 정본과 같음을 확인.
>
> **코드 반영 파일** — `docs/design/arena_stage_tokens.css` (이 문서 §2-B·§3·§4를 CSS 변수로 옮긴 것). Claude Code는 이 CSS 파일을 `app/globals.css` 옆에 넣고 `var(--…)`로만 쓴다(raw hex 금지).

---

## 0. 폐기 컨셉 경고 (클로드 디자인·코드 공통 첫 줄)
- "WorldCrown48 아레나 무대 리디자인"(2026-06, 축구 선수·축구 경기 컨셉) — **폐기.** 어떤 브리프에도 참조 금지. (원장 D-07)
- 세계관 = **스포츠**(팬이 관중이 아니라 선수). 시상식·대관식 프레임 금지. (D-07)

## 1. v2.4 → v4 변경 요약
| # | 항목 | v2.4 | v4 |
|---|---|---|---|
| ① | 아레나 매치 화면 | 카드 2장 그리드 + VS 배지 | **VS 스플릿 무대** — 프레임 1320×680, 칸 640×640 두 개 맞붙음 (D-11) |
| ② | 무대 위 글씨 | (미정) | 이름·국적·소속·영상 제목을 **반투명 색 띠** 위에 오버랩 (D-11 바뀜 09-17) |
| ③ | 무대 조작 | (미정) | 호버 칸 1.2배 + 포스터 줌 1.06 + 옆칸 채도 50% + 클릭 = 선택 (D-11) |
| ④ | 모바일 | 상하 2분할 | 세로 = 상하 / **가로 = 좌우 50:50 자동 전환, 메뉴 없음** (D-17) |
| ⑤ | 메뉴바 | The Pitch · The Lab · Locker Room · Vote Now | **☰ · 로고 · The Pitch · The Arena · Newsroom · Locker Room · 언어 · 로그인/아바타** (D-19) |
| ⑥ | ☰ 서랍 | 카드 8줄 | **단어 나열 + ▸ 토글**, 팬용 5항목 (D-19) |
| ⑦ | "선택 이어가기" | 없음 | 메뉴바 아래 안내 문구 층 오른쪽 끝, 조건부 (D-18) |
| ⑧ | 라운드·득표율·타이머 | 매치 화면 금지 | 유지 + **개발자 고지문(vs-foot)도 금지** — 무대 금지 4종 (D-11) |
| ⑨ | **아레나 바탕색** | `#00003A`(로고 토큰) / 코드 `#00001F` / 원장 `#0B1020` 3중 불일치 | **대표 수정본 기준으로 확정** — §2-C |

## 2. 색 토큰

### 2-A. 계승 (v2.4 · `docs/design/colors_and_type.css` 그대로 · 로고 앵커 ▸logo)
| 토큰 | 값 | 쓰임 |
|---|---|---|
| `--color-bg-deep` | `#00003A` ▸logo | 페이지 바탕(피치·랜딩 등 **아레나 밖** 다크 면) |
| `--color-bg-default` | `#0E0944` | 기본 면 (아레나에서는 **서랍 바탕**으로 씀) |
| `--color-bg-soft` | `#241754` ▸logo | 카드 (아레나에서는 **칸 바탕·알약 글자색**) |
| `--color-bg-elevated` | `#362261` | 떠 있는 면 (아바타 그라데이션 위쪽) |
| `--color-gold` | `#FCD006` ▸logo | **강조 하나뿐** (Crown Gold) — VS·알약·The Arena 제목 |
| `--color-gold-hover` | `#E3BB05` | 골드 눌림 |
| `--color-turquoise` | `#00A3B7` ▸logo | **왼쪽** 상태색 (띠) |
| `--color-crimson` | `#D7063A` ▸logo | **오른쪽** 상태색 (띠) |
| `--color-text` | `#F2F2F5` ▸logo | 본문 |
| `--color-text-sub` | `#B1B5C4` ▸logo | 보조 (메뉴 글자·설명·언어 칩) |
| `--color-text-muted` | `#484B67` ▸logo | 흐림 |

### 2-B. 신규 — 아레나 무대 층 (대표 수정본 실측 · 2026-09-19)
| 토큰 | 값 | 어디에 |
|---|---|---|
| `--arena-page-bg` | `linear-gradient(0deg, #0C0F18 0%, #1B1931 100%)` | 데스크톱 아레나 화면 바탕 (아래가 어둡고 위가 밝음) |
| `--arena-page-bg-mobile` | `#0F0F1E` | 모바일 세로·가로 바탕 (단색) |
| `--arena-ink` | `#0B1020` | 어두운 덮개·그림자의 기준색 — `rgba(11,16,32,α)`로만 씀 |
| `--arena-nav-bg` | `linear-gradient(90deg, #0F0F1D, #171740)` | 메뉴바 (모바일: `#171740 → #16163C`) |
| `--arena-nav-border` | `rgba(255,255,255,.08)` | 메뉴바 테두리 1px, 모서리 2px |
| `--arena-nav-text` | `#B1B5C4` · 현재 페이지 `#FFFFFF` | 메뉴 글자 14px |
| `--arena-icon` | `#EAEAF2` | ☰ 선(18×1.75, 간격 5)·아바타 글자·띠의 국적·소속 |
| `--arena-frame-bg` | `#07070D` | 무대 프레임 바탕(칸 바깥 패딩 20 영역) |
| `--arena-frame-border` | `1px solid rgba(252,208,6,.16)` | 프레임 테두리 (연한 골드) |
| `--arena-cell-bg` | `#241754` | 칸 바탕(포스터 없을 때) |
| `--arena-cell-border` | `1px solid rgba(255,255,255,.10)` | 칸 테두리 기본 |
| `--arena-cell-confirm-border` | `2px solid #FCD006` | 선택 확정 순간 칸 테두리 |
| `--arena-cell-confirm-shadow` | `0 0 0 1px rgba(252,208,6,.55), 0 26px 64px rgba(252,208,6,.26)` | 선택 확정 순간 |
| `--arena-cell-shade` | `linear-gradient(180deg, rgba(11,16,32,.42) 0%, rgba(11,16,32,0) 34%, rgba(11,16,32,0) 52%, rgba(11,16,32,.72) 100%)` | 칸 위 세로 덮개(위·아래 어둡게) |
| `--arena-cell-glow` | `radial-gradient(circle at 50% 46%, rgba(252,208,6,.30) 0%, rgba(252,208,6,0) 68%)` | 칸 가운데 골드 빛 |
| `--arena-band-left-bg` | `rgba(0,163,183,.22)` | 왼쪽 띠 바탕 — **투명도 22% = 대표 그림 값** |
| `--arena-band-left-border` | `1px solid rgba(0,163,183,.65)` | 왼쪽 띠 테두리 |
| `--arena-band-right-bg` | `rgba(215,6,58,.22)` | 오른쪽 띠 바탕 |
| `--arena-band-right-border` | `1px solid rgba(215,6,58,.65)` | 오른쪽 띠 테두리 |
| `--arena-band-blur` | `blur(8px)` | 띠 `backdrop-filter` |
| `--arena-band-desc` | `#DDDDEA` | 띠의 영상 제목 글자 |
| `--arena-vs` | `#FCD006` · 그림자 `0 8px 40px #0C0D10E6` | VS 표식 (모바일 그림자 `0 6px 28px rgba(11,16,32,.9)`) |
| `--arena-continue-bg` / `-text` | `#FCD006` / `#241754` | "선택 이어가기" 알약 |
| `--arena-lang-chip-border` | `#FFFFFF38` (= rgba(255,255,255,.22)) | 언어 칩 테두리, 글자 `#B1B5C4` |
| `--arena-avatar-bg` | `linear-gradient(180deg, #362261, #241754)` · 테두리 `rgba(255,255,255,.22)` | 아바타 32px |
| `--arena-drawer-bg` | `#0E0944` | ☰ 서랍 바탕 |
| `--arena-drawer-border` | `1px solid rgba(255,255,255,.10)` · 그림자 `24px 0 64px rgba(0,0,0,.5)` | 서랍 오른쪽 경계 |
| `--arena-drawer-row` | `#D8D9E4` 500 / 현재 페이지 `#FFFFFF` 700 + 왼쪽 선 `2px solid rgba(255,255,255,.55)` | 서랍 1단계 항목 |
| `--arena-drawer-child` | `#B1B5C4` 500 | 서랍 하위 항목 |
| `--arena-drawer-arrow` | `#8E90A6` | ▸ 토글 (열리면 90° 회전, 160ms) |
| `--arena-drawer-chip` | 켜짐 `rgba(255,255,255,.16)` + `#FFFFFF` / 꺼짐 투명 + `#8E90A6` · 테두리 `rgba(255,255,255,.14)` | 서랍 하단 KO·EN·ES |
| `--arena-banner` | 점선 `1px dashed rgba(255,255,255,.16)` · 바탕 `rgba(36,23,84,.4)` | 배너 자리(비움) |

### 2-C. 바탕색 3중 불일치 — 해소 (2026-09-19 · 대표 지시 "수정본 기준")
| 어디 | 값 | 처분 |
|---|---|---|
| 대표 수정본(아레나) | `#0C0F18 → #1B1931` 그라데이션 / 모바일 `#0F0F1E` | **아레나 화면 바탕 = 이것.** 토큰 `--arena-page-bg(-mobile)` |
| 원장 D-08 색 줄 `#0B1020` | 수정본에서 **덮개·그림자 기준색**으로 쓰임 (`rgba(11,16,32,α)`) | 바탕이 아니라 잉크색. 토큰 `--arena-ink`. 원장 D-08에 바뀜 줄로 정정 |
| 코드 `--color-bg-void: #00001F` | 아레나 옛 코드 값 | ARENA-1 구현 때 아레나 범위에서 `--arena-page-bg`로 교체. 다른 도메인은 손대지 않음 |
| 로고 토큰 `--color-bg-deep #00003A` | 피치·랜딩 등 아레나 밖 | **유지.** 아레나만 예외 |

## 3. 아레나 매치 무대 — 규격 (수정본 실측 + 원장 D-08·D-11·D-12·D-15·D-17)
### 3-A. 데스크톱 1440 — 좌표는 화면 왼쪽 위 기준
| 층 | 자리 | 값 |
|---|---|---|
| ① 메뉴바 | left 60 · top 20 · **1320×64** · 안쪽 패딩 0 10 0 14 · 항목 간격 26 | ☰ 44×44 원형 호버 `rgba(255,255,255,.08)` → 로고(글자 15px 800) → 메뉴 4개 14px → (오른쪽) 언어 칩(JetBrains Mono 11px, .14em, 패딩 7×14, 999) → 아바타 32 |
| ② 안내 문구 층 | left 171 · top 94 · 폭 1100 · 가운데 정렬 | "The Arena" Playfair Display italic **35px** 300 골드 / 대회 제목 **27px** 700 −.02em lh 1.25 / 설명 14px `#B1B5C4` |
| ② "선택 이어가기" | **right 70 · top 98** · 높이 30 · 패딩 0 16 · 999 | Inter 13px 700, 골드 바탕·`#241754` 글자 |
| ③ 무대 프레임 | left 60 · **top 220** · **1320×680** · 패딩 20 | 프레임 바탕 `#07070D`, 테두리 골드 .16 |
| ③ 칸 | **640×640** ×2, 틈 0 | 바탕 `#241754`, 테두리 흰 .10, `overflow:hidden` |
| ③ VS | 프레임 정중앙 고정 | Playfair italic 700 **136px** 골드, z 9, `pointer-events:none` |
| — 첫 화면 경계 | top 900 | 이 아래는 스크롤 |
| ④ 배너 자리 | left 60 · **top 960** · **1320×140** | 비워 둠(런칭 후 MVP2) |

### 3-B. 띠(오버랩) — 칸 안쪽
- 자리: 칸 안쪽 **left 24 · right 24 · bottom 24**, 패딩 12 16, 항목 간격 14, `backdrop-filter: blur(8px)`, `pointer-events:none`
- 왼쪽 칸은 이름→국적·소속→영상 제목 순(row), 오른쪽 칸은 **거울 배치**(row-reverse)
- 이름 **24px 700** −.01em / 국적·소속 JetBrains Mono **11px 600 .14em** `#EAEAF2` (`국적 · 소속`) / 영상 제목 **13px** `#DDDDEA` (넘치면 …)
- 칸 위 덮개 2겹: `--arena-cell-shade`(세로) + `--arena-cell-glow`(골드 빛), 둘 다 `pointer-events:none`

### 3-C. 조작 (수정본 코드 그대로)
| 항목 | 값 |
|---|---|
| 호버 칸 | `transform: scale(1.2)` · 기준점 왼쪽 칸 `left center` / 오른쪽 칸 `right center` (모바일 상하: `center top` / `center bottom`) · z 4 |
| 포스터 줌 | 칸 안 포스터 `scale(1.06)` (별개 효과) |
| 옆칸 | `filter: saturate(50%)` 크기 그대로 |
| 들어갈 때 | `transform 300ms cubic-bezier(.2,.9,.3,1.15), filter 280ms cubic-bezier(.2,.9,.3,1.15)` |
| 빠질 때 | `transform 200ms cubic-bezier(.4,0,.2,1), filter 200ms cubic-bezier(.4,0,.2,1)` |
| 선택 확정 | 커진 칸 클릭 → 테두리 `2px #FCD006` + 골드 그림자, 옆칸 `brightness(.4)`, z 7, **520ms 뒤 다음 매치** |
| 모바일 | 1탭 = 확대·재생(arm) / 2탭 = 확정. 세로·가로 동일 (D-17) |
| 영상 | 유튜브 iframe `autoplay=1&mute=1&controls=0&loop=1&playlist={id}&start={s}&end={e}&modestbranding=1&rel=0&disablekb=1&playsinline=1&iv_load_policy=3`, `pointer-events:none`, 호버/탭한 쪽 1개만 (D-12) |
| 포스터→영상 | 0.2~0.3초 크로스페이드, 잘리는 위치 일치 (D-15) |

### 3-D. 크롭 (수정본 `crop()` 그대로)
- 세로 9:16: `width 100% · height 177.78% · top = −(77.78 × focusY ÷ 100)%` (focusY 기본 40 → top −31.11%)
- 가로 16:9: `width 177.78% · height 100% · left −38.89%`
- 포스터·영상 같은 상자에 같은 식 적용 → 전환 때 튀지 않음 (D-15)
- 참가자 자료 칸: `orientation` · `focusY` · `start` · `end` (+ `videoId`)

### 3-E. 모바일 (D-17 · 수정본 실측)
| 항목 | 세로 390×844 | 가로 844×390 |
|---|---|---|
| 바탕 | `#0F0F1E` | `#0F0F1E` |
| 메뉴바 | left 12 · top 10 · **366×48**, `#171740→#16163C`, ☰ 40×40 · 로고 · 언어 칩(10px) · 아바타 32 | **없음** |
| "선택 이어가기" | right 12 · top 64 · 높이 28 · 패딩 0 14 · 12px 700 | 없음 |
| 무대 프레임 | left 12 · top 68 · **366×732**, 테두리 골드 .16, 상하 2분할 | left 56 · top 12 · **732×366**, 좌우 50:50 |
| 칸 | 364×365 ×2 (위/아래) | 366×366 ×2 |
| 띠 | inset 12 · 패딩 9 12 · 간격 8 · 이름 (수정본 값) · 국적·소속 10px · 제목 11px | 세로와 동일 |
| VS | **58px**, 그림자 `0 6px 28px rgba(11,16,32,.9)` | 58px |
| 한 줄 안내 | top 812 · JetBrains Mono 10px .1em `#B1B5C4` "가로로 돌리면 무대가 더 크게 열립니다" | 없음 (대신 상단 가운데 안내 알약 1개) |

## 4. 메뉴바 · ☰ 서랍 · "선택 이어가기" (D-18·D-19 · 구현 = NAV-1)
### 4-A. 메뉴바 — §3-A ① 참조. 항목: ☰ · 로고 · The Pitch · The Arena · Newsroom · Locker Room · 언어 · 로그인/아바타. The Lab은 관리자만. "Vote Now" 삭제. 낱말 금지: 투표·Vote·표·예측·배당 (D-03).
### 4-B. ☰ 서랍 (수정본 실측)
- 왼쪽에서 밀려 나옴. **폭 320 · 화면 높이 전부**(데스크톱) / 모바일 화면폭−56. 바탕 `#0E0944`, 오른쪽 경계 흰 .10, 그림자 `24px 0 64px rgba(0,0,0,.5)`.
- 머리 64: × 닫기 44×44 (19px `#EAEAF2`), 아래 구분선 흰 .08.
- 1단계 행: 높이 **44**, 왼쪽 패딩 16, 글자 **15px**, 기본 500 `#D8D9E4`, 현재 페이지 700 `#FFFFFF` + 왼쪽 선 2px 흰 .55. ▸ 10px `#8E90A6`, 열리면 90° 회전 160ms.
- 하위 행: 높이 **34**, 왼쪽 패딩 34, 글자 13px 500 `#B1B5C4`.
- 바닥: 구분선 → 언어 칩 KO·EN·ES(JetBrains Mono 11px, 패딩 5 9) → 로그인/로그아웃.
- 항목: The Pitch / The Arena ▸ / Newsroom ▸ / Locker Room(부제 없음) / Policy Hub ▸ / ─ / 언어 / 로그인·로그아웃 / ─(관리자만) / The Lab / Admin Dashboard. Launch Pad 없음.
### 4-C. "선택 이어가기" — §3-A ②·§3-E 참조. 조건: 끝내지 않은 참여가 있을 때만(`roundProgress`), 그 대회 매치 화면에서는 숨김. 3언어: ko 선택 이어가기 · en Continue your picks · es Continuar tus elecciones.

## 5. 계승 금지 규칙 (v2.4 그대로 · 재확인)
- Round Scope Lock — 라운드명은 RoundTransition 화면에서만. 무대 금지 4종: 라운드 라벨 · 득표율 · 마감 타이머 · 개발자 고지문.
- TournamentCard에 LIVE 배지 금지 · Round Card 금지.
- `✦ AI-Report`는 기사 푸터 1곳만.
- raw hex 금지 — 코드는 `var(--token)`만. 순수 블랙 `#000000` 금지 (수정본도 `#07070D`까지만 내려감).
- 강조색은 Crown Gold 하나. Turquoise/Crimson은 좌/우 상태색으로만.

## 6. 클로드 디자인 "WorldCrown48 Design System" 프로젝트에 넣는 법
1. 이 파일(v4)과 `docs/design/arena_stage_tokens.css`를 ＋로 첨부.
2. 입력: "첨부한 WC48_DESIGN_SYSTEM_v4 §2-B·§2-C의 토큰과 §3·§4의 컴포넌트(아레나 바탕·메뉴바·무대 프레임·칸·띠·VS·선택 이어가기 알약·☰ 서랍)를 디자인 시스템에 **추가**하라. 기존 v2.4 토큰은 값을 바꾸지 마라. arena_stage_tokens.css를 colors_and_type.css 옆에 그대로 넣어라. 끝나면 추가한 토큰 목록을 표로 보고하고, **디자인 시스템을 내보내기(Export)** 해서 `colors_and_type.css`·`kit.css`를 새 버전으로 만들어라."
3. 내보낸 css를 `docs/design/`에 덮어쓴다 → `arena_stage_tokens.css` 삭제 → 티오가 이 문서 §2-B를 css 기준으로 대조·정정(v4.2).

## 변경 이력
- **v4.2 (2026-09-19)** — 클로드 디자인 내보내기로 css 사본 동기화, 옛 colors_and_type.css 보관, arena_stage_tokens.css = 내보낸 사본.
- **v4.1 (2026-09-19)** — 대표 수정본(`Arena Match Stage.dc (1).html`)에서 실측 값 전부 채움. 바탕색 3중 불일치를 수정본 기준으로 해소(§2-C). `arena_stage_tokens.css` 동봉.
- v4.0 (2026-09-19, 초안) — v2.4 계승 + 아레나 무대·메뉴바·서랍·이어가기 편입.
