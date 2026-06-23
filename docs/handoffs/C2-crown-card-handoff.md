# Handoff Brief — C-2 Crown Card (Domain 3 · The Arena)

> **From**: Cowork (기획·시안 분석·C-1 통합·트리거 모델 재정의) · **To**: Claude Code (실코드)
> **Date**: 2026-06-23 · **Author**: 대표 · **Version**: v2.0
> **작업 브랜치**: `feat/c2-crown-card` (워크트리 `/Users/jinii/Projects/wc48-c2` 필수)
> **목표 산출물**: `app/arena/[tournamentId]/champion/` + `components/crown/*` + `lib/crown/*` (순수 캔버스 렌더러) + `functions/src/onChampionConfirmed.ts` + `storage.rules` (신설) + `firestore.indexes.json` 갱신 + `firebase.json`에 storage 블록 추가
> **선행 모듈**: **C-1 Vote Engine** (머지 `f8aeee8`, `6ed0989`, `1eb0adb`, Production 배포 완료) — `roundProgress/{userId}_{tournamentId}` 문서 공급원
> **캐노니컬 진실 공급원**: `docs/design/wireframes/Domain 3 · The Arena.html` **C2 · CROWN CARD 섹션 (line 294~370, 모달 마크업 line 683~749, 캔버스 JS line 1068~1402)**

---

## ⚠️ v2.0 변경 사유 (Claude Code 필독)

이 핸드오프는 **lite-spec(`docs/lite-specs/C2-crown-card.md`, 2026-05-14 작성, 구버전)** 의 다음 3개 조항을 **wireframe 기준으로 재정의**합니다. 충돌 시 **wireframe 우선**.

| lite-spec 표기 (폐기) | 실제 사용 (wireframe v2.3 + 2026-06-23 결정) |
|---|---|
| ❌ "● AI-Report" 배지 표시 의무 (line 11·87~91) | ✅ **NO AI-Report badge** — wireframe line 305 명시 + CLAUDE.md 원칙 #4 Footer-Only Lock |
| ❌ Canvas 1200×630 단일 포맷만 (line 32~92) | ✅ **3개 포맷 동시 지원** — `story` 1080×1920 (9:16) · `feed` 1080×1350 (4:5) · `link` 1200×630 (1.91:1). 사용자가 다운로드 직전 토글로 선택 |
| ❌ Twitter + Download 2버튼만 (line 23~30) | ✅ **정교한 풀버전 공유 모달** — 메인 2버튼 + "More share" → 포맷 칩 + 네이티브 공유 + Save both ratios + Link 복사 토스트 |

**C-1에서 검증된 패턴을 그대로 계승합니다 (필수):**
- **로직-추출 피라미드**: 캔버스 렌더링 결정·텍스트 fit·QR 좌표 계산은 모두 `lib/crown/*` 순수 모듈로 추출하여 **node-env vitest로 즉시 TDD** (canvas는 `node-canvas` 또는 jsdom polyfill로 헤드리스 검증). 컴포넌트는 얇은 글루 → Playwright E2E로 커버.
- **Firestore Rules + Storage Rules**: rules는 batch/트랜잭션 미커밋 문서를 보지 못한다 — 필요한 권한 필드는 doc에 비정규화.
- **Cloud Function 시크릿**: `defineSecret`만, `functions/.env` 절대 금지 ([[feedback-secret-firebase-not-env.md]]).

> 📌 **ADR-0005 (이 PR로 신설) — 트리거 모델 재정의**: lite-spec은 "tournaments.status='closed' 전환 → Cloud Function"으로 가정했으나, **C-1 실제 구현**(`functions/src/advanceRound.ts:46-58`)은 **per-Voter brackets** 모델이라 글로벌 `tournaments.status`를 변경하지 않는다. Voter 각자가 결승까지 풀면 `roundProgress/{userId}_{tournamentId}.complete = true, championId = <picked>` 로 기록된다. → **C-2 트리거는 `onDocumentUpdated('roundProgress/{progressId}')`** 에서 `before.complete !== true && after.complete === true` 감지로 변경. Crown Card는 **per-Voter 자산**이며 Voter 각자 하나씩 생성된다.

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

```bash
# 0.1 위치
git branch --show-current            # 기대값: feat/c2-crown-card
git log --oneline -5 main            # 기대값: C-1 머지 commit f8aeee8 또는 그 이후

# 0.2 핵심 파일 존재
test -f CLAUDE.md && echo "✓ CLAUDE.md"
test -f LANGUAGE.md && echo "✓ LANGUAGE.md"
test -f docs/lite-specs/C2-crown-card.md && echo "✓ C2 lite-spec (참고용)"
test -f docs/handoffs/C2-crown-card-handoff.md && echo "✓ this handoff"
test -f "docs/design/wireframes/Domain 3 · The Arena.html" && echo "✓ D3 wireframe (UI 진실 공급원)"
test -f docs/design/WC48_DESIGN_SYSTEM_v2.3.md && echo "✓ Design System v2.3"

# 0.3 C-1 선행 데이터 — roundProgress 구조 확인
grep -nE "championId|roundProgress" functions/src/advanceRound.ts   # championId 필드 존재해야
# 기대 출력: line 46 decision === "champion", line 52 championId: contestantId ?? null
grep -nE "complete: true" functions/src/advanceRound.ts             # complete flag 존재해야

# 0.4 Tournament 인터페이스 — 글로벌 champion 필드 부재 확인 (per-Voter 모델 증거)
grep -nE "championId|championContestantId|champion:" lib/types/tournament.ts
# 기대 출력: 없음 (Tournament 전역에는 champion 필드 없음 — per-Voter 모델)

# 0.5 Storage 사전 점검
grep -nE "getStorage|Storage" lib/firebase.ts || echo "ℹ Storage 접근자 신규 추가 필요"
test -f storage.rules && echo "✓ storage.rules" || echo "✗ storage.rules 신설 필요"
grep -E "\"storage\"" firebase.json || echo "ℹ firebase.json에 storage 블록 추가 필요"
grep -E "^NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=" .env.local 2>/dev/null && echo "✓ Storage bucket env" || echo "✗ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET — Vercel/.env.local 확인 (대표 보고)"

# 0.6 Firestore 인덱스 사전 점검 — crown_cards 신규 query 패턴
grep -E "crown_cards|crownCards" firestore.indexes.json || echo "ℹ crown_cards 인덱스 신규 추가 필요 ([[feedback-firestore-composite-index]])"

# 0.7 의존성 — html2canvas 또는 node-canvas 등 사용 라이브러리 사전 확정 (§9 trap #6)
node -e "console.log(require('./package.json').dependencies['qrcode-generator'] || 'qrcode-generator 미설치')"
```

> 하나라도 ✗ 이면 즉시 멈추고 대표에게 보고. (B-1 / C-1 선례 — 누락 입력은 진행 불가 [[feedback-evidence-before-diagnosis]])

---

## §1. Pre-flight Checklist — 읽기 (§0 통과 후)

```
☐ 🛑 docs/mental-model/MENTAL_MODEL.svg — 라운드·매치·득표 규칙 (변동 없음, 한 번 더 확인)
☐ CLAUDE.md 불변 원칙 8가지 (특히 #1 다크 테마 / #2 Crown Gold #FCD006 / #4 AI-Report Footer-Only / #5 FIFA 금지 / #8 스택 고정)
☐ LANGUAGE.md — Champion(영문 원형 유지) · Crown Card(번역 불가 §10) · Tournament Deadline
☐ docs/lite-specs/C2-crown-card.md — ⚠️ **참고용만**. 위 v2.0 변경 사유 3건과 충돌 시 wireframe 우선
☐ docs/design/WC48_DESIGN_SYSTEM_v2.3.md — Domain 3 다크 토큰 (`#00003A` deep / `#241754` soft / `#362261` elev / `#FCD006` gold / Playfair Display Italic / JetBrains Mono / Inter+Pretendard)
☐ **docs/design/wireframes/Domain 3 · The Arena.html** — **UI/UX 진실 공급원**
   · line 294~370   CSS 토큰 (crown-stage / crown-halo / crown-modal / crown-card / share-actions / share-menu / sm-formats / cc-toast)
   · line 683~749   모달 마크업 (3 상태 = ready / menu / unauth)
   · line 1068~1402 캔버스 JS (FORMATS 객체 · drawPortrait · drawLink · drawQR · download · nativeShare · shareX)
   → CrownCardModal·ShareMenu 컴포넌트 작성 후 **브라우저로 와이어프레임 직접 띄워 시각 대조 검증 의무**
☐ docs/handoffs/C1-vote-engine-handoff.md §부록 A·B (votes 스키마·rules diff) — C-2가 읽어가는 데이터 형식
☐ functions/src/advanceRound.ts (lines 20~80) — `roundProgress` 문서 정확한 형식 (championId · complete · updatedAt)
☐ memory [[project-c2-decisions-2026-06-23]] · [[feedback-i18n-test-determinism]] · [[feedback-seed-date-anti-pattern]] · [[feedback-test-isolation-per-voter]] · [[feedback-firestore-composite-index]]
```

---

## §2. Goal — 한 줄 결과 정의

> **Voter가 결승(THE FINAL)에서 1명을 선택해 `roundProgress.complete=true`가 기록되면, 클라이언트는 즉시 Crown Card 모달을 다크 테마로 열어 3개 캔버스 포맷(9:16·4:5·1.91:1)을 선택 가능한 공유 메뉴와 함께 보여준다. Voter는 Download / X 인텐트 / 네이티브 공유 / Save both ratios / Link 복사를 무로그인 미리보기 + 로그인 후 공유의 2단계 게이트로 사용할 수 있고, 백그라운드에서 `onChampionConfirmed` Cloud Function이 1.91:1 PNG를 Firebase Storage에 업로드하고 `crown_cards/{cardId}` 메타데이터를 기록한다.**

이 PR이 끝나면 **C-3 Ranking이 참조할 per-Voter 결과 자산**과 **MVP 2 Locker Room이 표시할 Crown Card 히스토리**가 존재합니다.

---

## §3. Files to CREATE / MODIFY

### 페이지·라우팅 (Next.js 14 App Router · Domain 3 다크)
| 경로 | 동작 | 비고 |
|---|---|---|
| `app/arena/[tournamentId]/champion/page.tsx` | **NEW** | Voter가 THE FINAL 완료 직후 redirect 도착지. `roundProgress` snapshot 구독 |
| `app/arena/[tournamentId]/champion/layout.tsx` | **NEW** | 다크 테마 강제 (Domain 3) — C-1 layout과 동일 패턴 |

### 순수 로직 (lib/crown — node-env vitest로 TDD)
| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/crown/formats.ts` | **NEW** | `FORMATS = { story:{w:1080,h:1920}, feed:{w:1080,h:1350}, link:{w:1200,h:630} }`. type `FormatKey = 'story'\|'feed'\|'link'` |
| `lib/crown/canvas/drawPortrait.ts` | **NEW** | wireframe line 1182~1250 이식. 9:16/4:5 공통 렌더러. ctx·W·H·data·crownImg 인자만 받는 순수 함수 |
| `lib/crown/canvas/drawLink.ts` | **NEW** | wireframe line 1252~1296 이식. 1.91:1 좌:photo / 우:정보+QR |
| `lib/crown/canvas/drawQR.ts` | **NEW** | qrcode-generator 래핑. `qrcode-generator@1.4.4` (브라우저 CDN과 동일 버전 npm 설치) |
| `lib/crown/canvas/primitives.ts` | **NEW** | `rr`(rounded rect) · `fit`(text fit) · `ls`(letterSpacing) · `crownGlyph` · `crownHero` · `bg` · `drawBadge` (wireframe line 1097~1166 이식) |
| `lib/crown/slug.ts` | **NEW** | 파일명 안전 slug — `name → "WC48-Crown-{slug}-{fmt}.png"` |
| `lib/crown/championLoader.ts` | **NEW** | `roundProgress/{userId}_{tournamentId}` snapshot → `{championContestant, tournament, voterPath}` 변환. `championId` null이면 throw |
| `lib/crown/shareIntents.ts` | **NEW** | Twitter intent URL 빌더 · Web Share API feature detect · 폴백 분기 |

### 컴포넌트 (components/crown — 얇은 글루, E2E 커버)
| 경로 | 동작 | 비고 |
|---|---|---|
| `components/crown/CrownCardModal.tsx` | **NEW** | wireframe `sf-crown` 마크업 이식. `data-crown` state = `ready`\|`menu`\|`loading`\|`unauth` |
| `components/crown/CrownStaticCard.tsx` | **NEW** | ready 상태 1.91:1 미리보기 (HTML/CSS, Canvas 아님) — wireframe `.crown-card` 마크업 그대로 |
| `components/crown/ShareActions.tsx` | **NEW** | ready 상태 3버튼 (Download / Share to X / Instagram → menu 전환) |
| `components/crown/ShareMenu.tsx` | **NEW** | menu 상태 — 포맷 칩 + 캔버스 미리보기 + Download/Native/Both/X 버튼 + Toast |
| `components/crown/FormatChips.tsx` | **NEW** | wireframe `.sm-formats` 3-way 토글 (aria-pressed) |
| `components/crown/CrownCanvasPreview.tsx` | **NEW** | `<canvas>` ref + `drawPortrait`/`drawLink` 호출. fmt props로 자동 재렌더 |
| `components/crown/LoginPromptBanner.tsx` | **NEW** | wireframe `.login-banner` — 비로그인 시 공유 액션 disable + 안내 |
| `components/crown/CrownHaloBackground.tsx` | **NEW** | wireframe `.crown-halo` (radial pulse 3.2s). `data-reduced-motion` 존중 |
| `components/crown/CrownToast.tsx` | **NEW** | wireframe `.cc-toast` — "Link 복사됨" · "PNG 저장 완료" 등 |

### Cloud Functions (functions/src — 코어 추출 후 vitest)
| 경로 | 동작 | 비고 |
|---|---|---|
| `functions/src/onChampionConfirmed.ts` | **NEW** | **트리거**: `onDocumentUpdated('roundProgress/{progressId}')`. before.complete!==true && after.complete===true 감지 시 발화. 멱등 (crown_cards 중복 생성 차단) |
| `functions/src/core/crownCardRecord.ts` | **NEW** | crown_cards doc builder + 검증 (순수 / vitest) |
| `functions/src/core/canvasServer.ts` | **NEW** | `node-canvas` 기반 1.91:1 PNG 버퍼 생성. lib/crown/canvas/*는 isomorphic으로 작성하여 functions에서 직접 import 필수 (중복 구현 금지) |

### 보안·인프라
| 경로 | 동작 | 비고 |
|---|---|---|
| `storage.rules` | **NEW** | `crown-cards/{tournamentId}/{cardId}.png` read=true / write=false (admin SDK만) |
| `firebase.json` | **EDIT** | `"storage": { "rules": "storage.rules" }` 블록 추가 |
| `firestore.indexes.json` | **EDIT** | `crown_cards` collection group: `(userId ASC, createdAt DESC)` 인덱스 신규 등록 ([[feedback-firestore-composite-index]] 강제) |
| `firestore.rules` | **EDIT** | `/crown_cards/{id}` read 허용 (본인 + featured), write 차단 |
| `lib/firebase.ts` | **EDIT** | `getStorageInstance()` 함수 추가 — 기존 패턴(getDb / getAuthInstance) 그대로 |

### 테스트 (§11 매핑과 1:1)
| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/__tests__/crown/formats.test.ts` | **NEW** | FORMATS 객체 immutability + 타입 |
| `lib/__tests__/crown/drawPortrait.test.ts` | **NEW** | jsdom canvas로 좌표·텍스트 fit 검증 |
| `lib/__tests__/crown/drawQR.test.ts` | **NEW** | QR 매트릭스 결정성 |
| `lib/__tests__/crown/championLoader.test.ts` | **NEW** | championId null → throw / 정상 변환 |
| `functions/src/__tests__/crownCardRecord.test.ts` | **NEW** | doc builder + 멱등 |
| `tests/rules/storage-rules.test.ts` | **NEW** | crown-cards read 허용 / write 차단 (emulator) |
| `tests/rules/crown-firestore-rules.test.ts` | **NEW** | crown_cards Voter read 허용 / write 차단 |
| `e2e/c2-crown-card-flow.spec.ts` | **NEW** | login→final pick→modal open→format toggle→download→toast (Console 0 가드 + `?lang=ko` 강제) |

---

## §4. Acceptance Criteria — 완료 조건

```
[기능]
☐ AC-1  Voter가 결승에서 1명 선택 → 1초 이내 Crown Card 모달이 다크 테마로 자동 오픈
☐ AC-2  ready 상태에 1.91:1 미리보기 카드 + 3버튼(Download / X / Instagram) 노출
☐ AC-3  Instagram 버튼 클릭 → menu 상태 전환, 포맷 칩 3개(`story` 9:16 / `feed` 4:5 / `link` 1.91:1) 표시
☐ AC-4  포맷 칩 토글 → 캔버스 즉시 재렌더 (50ms 이내), 차원 라벨 자동 갱신 ("1080 × 1920 px · PNG" 등)
☐ AC-5  Download 버튼 → 선택 포맷 PNG 다운로드 + "PNG 저장 완료 · {fmt}" 토스트 2.8초
☐ AC-6  Save both ratios 버튼 → 9:16 + 4:5 두 장 연속 저장 + 토스트
☐ AC-7  X 버튼 → twitter.com/intent/tweet 새 창 열고 link 포맷 PNG 자동 저장 + 안내 토스트
☐ AC-8  Native Share (Web Share API 가능 시) → navigator.share files 호출, 미지원 시 download로 폴백
☐ AC-9  무로그인 진입 시 미리보기는 동작 / 모든 공유·다운로드 버튼은 unauth 배너로 disabled
☐ AC-10 로그인 시 즉시 unauth 배너 해제 + 액션 활성화

[캔버스 정합]
☐ AC-11 wireframe drawPortrait와 픽셀 좌표 ±2px 이내 일치 (visual regression 또는 좌표 단위 테스트)
☐ AC-12 wireframe drawLink와 픽셀 좌표 ±2px 이내 일치
☐ AC-13 모든 포맷에서 QR 코드가 worldcrown48.com을 스캔 가능하게 렌더 (실제 디바이스 1회 확인)
☐ AC-14 Champion 이름이 컨테이너 폭을 초과하지 않음 (fit() 동적 폰트 사이즈)
☐ AC-15 NO "AI-Report" 배지 / NO "FIFA" / NO "Official" / NO Vote Count 표시

[백엔드]
☐ AC-16 `onChampionConfirmed` Cloud Function이 roundProgress.complete 전환 시 한 번만 실행 (멱등)
☐ AC-17 생성된 1.91:1 PNG가 `gs://{bucket}/crown-cards/{tournamentId}/{voterUid}.png`에 업로드
☐ AC-18 `crown_cards/{cardId}` doc에 `{voterUid, tournamentId, championContestantId, imageUrl, format, createdAt}` 저장
☐ AC-19 동일 roundProgress 재업데이트 시 crown_cards 추가 생성 없음 (idempotency key = `${voterUid}_${tournamentId}`)

[i18n · 접근성]
☐ AC-20 ko/en 양 언어에서 모든 라벨·토스트 정상 표시 (`?lang=ko` E2E 강제 [[feedback-i18n-test-determinism]])
☐ AC-21 reduced-motion: on 시 halo pulse 정지 (wireframe line 299)
☐ AC-22 키보드만으로 포맷 토글·Download·모달 닫기 가능 (Tab 순서 + Esc)
☐ AC-23 모든 버튼 aria-label / 토스트는 role="status" aria-live="polite"

[품질]
☐ AC-24 TypeScript strict 통과 / next build 통과 / Vercel Preview 동작
☐ AC-25 console.error 0건 (E2E `afterEach` 가드)
☐ AC-26 §11 Playwright E2E 5개 시나리오 GitHub Actions PASS
```

---

## §5. Hard Constraints — DO / DON'T

### DO
- 캔버스 좌표·폰트·색상 토큰은 모두 **wireframe line 1068~1402의 값 그대로**. 임의 변경 금지.
- Crown Gold는 `#FCD006` 하나만 (CLAUDE.md 원칙 #2). 다른 골드 변형(`#FFD700`, `#FFC107` 등) 사용 금지.
- 모달은 **항상 다크 테마**. Domain 3 토큰만 사용 (`#00003A` / `#241754` / `#362261` / `#F2F2F5`).
- 캔버스 렌더 로직은 `lib/crown/canvas/*` 순수 함수로 추출. 컴포넌트는 ref + props만.
- Cloud Function 시크릿은 `defineSecret`만 ([[feedback-secret-firebase-not-env.md]]). `functions/.env` 절대 금지.
- 시드 데이터·테스트 fixture는 `SEED_PAST_DATE = "2020-01-01"` 또는 동적 계산만 사용 ([[feedback-seed-date-anti-pattern]]).
- E2E URL에 `?lang=ko` 또는 `?lang=en` 강제 ([[feedback-i18n-test-determinism]]).
- per-Voter 격리 테스트는 `votes` + `roundProgress` 컬렉션 RESET 후 실행 ([[feedback-test-isolation-per-voter]]).
- crown_cards 신규 query 패턴은 `firestore.indexes.json` 에 사전 등록 ([[feedback-firestore-composite-index]]).
- Storage 신규 도입 — `storage.rules` 신설 + `firebase.json` storage 블록 추가 + `lib/firebase.ts`에 `getStorageInstance()` 추가.
- `lib/crown/canvas/*` 는 **isomorphic 작성** (브라우저 Canvas2D + node-canvas 동일 API). 클라이언트와 Cloud Function이 동일 코드 사용.

### DON'T
- ❌ **AI-Report 배지 표시 금지**. wireframe line 305 "NO AI-Report badge" 명시. CLAUDE.md 원칙 #4 Footer-Only Lock. lite-spec의 "표시 의무" 조항은 폐기됨.
- ❌ **"FIFA" / "Official" 표기 금지** (CLAUDE.md 원칙 #5). 모든 캔버스 텍스트·메타데이터에서 0건.
- ❌ **Vote Count(절대 수치) 표시 금지**. Crown Card는 챔피언 정체성만 표시. 표·수치 0개.
- ❌ Round HUD 텍스트("N강 · X/Y" 등) Crown Card에 표시 금지. wireframe `path` 필드(`48 → 24 → 12 → 6 → THE FINAL`)는 우승 경로 시각 흐름만 표현 — 텍스트 그대로 사용.
- ❌ 글로벌 `tournaments.status='closed'` 전환 대기 금지. C-1은 per-Voter 모델 — `tournaments`에 champion 필드 없음. 트리거는 `roundProgress` 문서.
- ❌ lite-spec의 `championContestantId` 필드명 그대로 사용 금지. **C-1 실제 필드명은 `championId`**. crown_cards 스키마는 `championContestantId`로 정규화하되 매핑 로직은 `championLoader.ts`에서 처리.
- ❌ `localStorage` / `sessionStorage`로 Crown Card 캐싱 금지. Firestore + Storage가 단일 진실.
- ❌ 캔버스 폰트로 `Pretendard` 단일 사용 금지 — wireframe은 `"Inter","Pretendard",sans-serif` 순서. font-family 문자열 그대로 복제.
- ❌ html2canvas / dom-to-image 라이브러리 사용 금지 — 모두 native Canvas 2D API로만 구현 (서버 렌더링 호환 + 폰트 정밀도 + 번들 사이즈). §9 trap #6 결정 근거.

---

## §6. Design Reference

### 핵심 컴포넌트 구조 (wireframe 기준)

```
<CrownCardModal data-crown={state}>          state = 'ready' | 'menu' | 'loading' | 'unauth'
├── <CrownHaloBackground />                  radial pulse 3.2s, reduced-motion 존중
└── <div.crown-modal>                        max-w=600px (ready/menu portrait) / 940px (link)
    ├── <div.crown-modal-head>               ready 상태에서만 표시
    │   ├── <div.crown-eyebrow>              "챔피언 확정 · Champion confirmed"
    │   ├── <div.crown-confirm>              "Your Crown is <em>{name}</em>"
    │   └── <TournamentDeadlineChip />       기존 컴포넌트 재사용
    │
    ├── <CrownStaticCard />                  ready 상태 정적 미리보기 (HTML/CSS, 1.91:1 비율)
    │   └── <crown-loading />                백엔드 생성 중 스피너 (data-crown="loading")
    │
    ├── <ShareActions>                       ready 상태 3버튼 (data-crown="ready")
    │   ├── <button#dlBtn>                   Download (story 즉시 저장)
    │   ├── <button#xBtn>                    Share to X (link 포맷 전환 + intent)
    │   └── <button#igBtn>                   Instagram (menu 상태로 전환)
    │
    ├── <ShareMenu>                          menu 상태 (data-crown="menu")
    │   ├── <button.sm-back />                ← back to ready
    │   ├── <FormatChips />                  story · feed · link (aria-pressed 토글)
    │   ├── <CrownCanvasPreview fmt={...} /> <canvas#ccPreview>
    │   ├── <div.sm-actions>                 Download + Native Share
    │   ├── <div.sm-net>                     Save both ratios · Post to X
    │   └── <CrownToast />                   "PNG 저장 완료 · story" 등
    │
    └── <LoginPromptBanner />                unauth 상태 (data-crown="unauth")
        share-actions opacity 0.4 + pointer-events: none
```

### 핵심 디자인 토큰 (wireframe 직접 인용)

```css
/* 색상 — Domain 3 다크 */
--color-bg-deep:     #00003A   /* canvas BG_DEEP */
--color-bg-soft:     #241754   /* canvas BG_SOFT */
--color-bg-elevated: #362261   /* canvas BG_ELEV */
--color-gold:        #FCD006   /* Crown Gold (CLAUDE.md 원칙 #2) */
--color-gold-glow:   rgba(252,208,6,0.7)
--color-text:        #F2F2F5   /* canvas TEXT */
--color-text-sub:    #B1B5C4   /* canvas SUB */
--color-text-muted:  #7A7FB0   /* canvas MUT */

/* 폰트 */
--font-display: '"Playfair Display","Playfair Display Local",serif'   /* Champion 이름 italic 900 */
--font-sans:    '"Inter","Pretendard",sans-serif'                      /* 본문 */
--font-mono:    '"JetBrains Mono",monospace'                           /* 차원 라벨 */

/* 캔버스 포맷 */
FORMATS = {
  story: { w: 1080, h: 1920, label: '1080 × 1920 px · PNG' },   /* 9:16  Instagram Stories / Reels */
  feed:  { w: 1080, h: 1350, label: '1080 × 1350 px · PNG' },   /* 4:5   Instagram Feed */
  link:  { w: 1200, h: 630,  label: '1200 × 630 px · PNG'  }    /* 1.91:1 X / Facebook / 카카오톡 OG */
}
```

### 반응형 브레이크포인트

| 구간 | 조건 | 주요 변화 |
|---|---|---|
| 모바일 320px | min-width: 320px | 모달 폭 = 100% - 16px, 캔버스 미리보기 max-height: 60vh, 포맷 칩 가로 스크롤 |
| 태블릿 768px | min-width: 768px | 모달 max-width: 600px (portrait) / 940px (link), 캔버스 max-height: 620px (wireframe line 359) |
| 데스크탑 1024px+ | min-width: 1024px | wireframe 기본 레이아웃 그대로 |

### 모션·접근성

- `crown-halo` radial pulse: 3.2s ease-in-out infinite (wireframe line 298)
- `[data-reduced-motion="on"]` 시 halo 정지 (wireframe line 299)
- 포맷 칩 전환 framer-motion 80ms ease-out
- 캔버스 재렌더는 `requestAnimationFrame` 1회만 — 동기 호출 금지

---

## §7. Test Plan

### 수동 테스트 (대표가 PR Preview에서 확인)

1. **결승 직후 자동 오픈** — Voter A 계정으로 결승까지 풀고, THE FINAL에서 1명 선택 → 1초 내 모달 자동 오픈
2. **포맷 토글** — 9:16 → 4:5 → 1.91:1 차례로 클릭 → 캔버스 즉시 재렌더 + 차원 라벨 자동 갱신
3. **다운로드** — 각 포맷에서 Download 클릭 → PNG 다운로드 + "PNG 저장 완료" 토스트
4. **Save both ratios** — Both 클릭 → 9:16 + 4:5 두 장 연속 저장 (브라우저가 다운로드 묶음 허용해야)
5. **X 인텐트** — X 버튼 클릭 → 새 창에 twitter.com/intent/tweet 텍스트+URL 자동 채워짐 + link PNG 다운로드 안내 토스트
6. **무로그인** — 시크릿창에서 게스트로 결승까지 → 모달 열림 + 미리보기 동작 + 공유 액션 disable + 로그인 배너
7. **로그인 전환** — 배너에서 Sign in → 모달 그대로 + 액션 활성화
8. **reduced-motion** — OS 설정에서 모션 줄이기 ON → halo pulse 정지 확인
9. **언어 전환** — `?lang=ko` / `?lang=en` 두 URL에서 라벨·토스트 정상 표시
10. **모바일 320px** — Chrome DevTools 320px 너비에서 모달·캔버스 미리보기 동작

### 자동 테스트 — §11로 이동·격상

⚠️ "권장" 표현 금지. 자동 테스트 항목은 모두 §11에서 **필수(Required)** 로 정의됩니다.

---

## §8. Analytics Events

```
이벤트명                  파라미터                          발생 시점
crown_modal_opened       { tournamentId, voterUid }       roundProgress.complete=true 감지 직후
crown_format_changed     { tournamentId, fromFmt, toFmt } 포맷 칩 클릭
crown_downloaded         { tournamentId, fmt }            Download 또는 Save both 성공
crown_shared_native      { tournamentId, fmt }            navigator.share 성공
crown_shared_x           { tournamentId }                 X 인텐트 새 창 오픈
crown_card_generated     { tournamentId, voterUid, ms }   onChampionConfirmed Cloud Function 완료
```

---

## §9. 알려진 함정 (Cowork이 미리 파악한 위험)

1. **트리거 모델 함정** — lite-spec은 `tournaments.status='closed'` 전환 가정. 실제 C-1 구현은 per-Voter brackets로 `tournaments`에 champion 필드 없음. **트리거를 `onDocumentUpdated('roundProgress/{progressId}')`** 로 변경 + before.complete!==true && after.complete===true 가드. §0.4 grep 결과로 증거 확인 의무.

2. **i18n 결정론화** — E2E URL에 `?lang=ko` 또는 `?lang=en` 강제. 안 그러면 브라우저 locale에 따라 텍스트가 달라져 false-red 발생. C-1 후속 진범 1/2 ([[feedback-i18n-test-determinism]]).

3. **시드 날짜 안티패턴** — 테스트 fixture에 하드코드 날짜(예: `new Date('2025-12-31')`) 금지. `SEED_PAST_DATE = "2020-01-01"` 상수 사용 또는 동적 계산. Tournament Deadline 검증 로직이 "오늘 < deadline"에 의존하므로 미래 날짜는 시간이 지나면 자동으로 깨진다. C-1 후속 진범 2/2 ([[feedback-seed-date-anti-pattern]]).

4. **Voter 격리 RESET 의무** — per-Voter 브래킷 의존 E2E는 `votes` + `roundProgress` 컬렉션을 테스트 시작 전 먼저 삭제. 이전 Voter의 잔여 데이터가 남으면 결승 완료 감지가 false-positive로 트리거됨. mobile-320 진범, ADR-0004 정정 근거 ([[feedback-test-isolation-per-voter]]).

5. **Firestore composite index 사전 점검** — `crown_cards` 컬렉션에 `(userId ASC, createdAt DESC)` query를 사용할 예정 (Locker Room 대비). 인덱스를 `firestore.indexes.json`에 사전 등록하지 않으면 첫 query 시 5시간 막힘 가능 ([[feedback-firestore-composite-index]] — C-1 5시간 막힘의 진범).

6. **html2canvas vs native Canvas** — DOM-to-image 라이브러리는 폰트 정밀도 + 그라데이션 정합 + 서버 렌더링 호환에서 모두 실패. wireframe이 이미 native Canvas 2D API로 검증됨 → 그대로 이식. 라이브러리 추가 금지.

7. **node-canvas vs browser Canvas API 차이** — `node-canvas`는 `ctx.letterSpacing` 미지원. wireframe의 `ls()` 헬퍼는 try/catch로 무시되도록 작성되어 있으나 서버 렌더 결과의 자간이 클라이언트와 다를 수 있음. → 1.91:1 서버 PNG는 SNS OG용이므로 자간 1~2px 차이 허용 / 다운로드는 클라이언트 캔버스 사용으로 정합 유지.

8. **Storage CORS** — Firebase Storage 신규 도입 시 CORS 설정 필요할 수 있음. SDK getDownloadURL은 CORS 제약 없지만 직접 fetch 시 차단됨. 클라이언트는 SDK 사용으로 우회.

9. **QR 라이브러리 버전 호환** — wireframe은 `qrcode-generator@1.4.4` CDN 사용. npm 설치 시 동일 버전 픽스. 다른 라이브러리(qrcode, qr-image 등)는 매트릭스 결정성이 달라 시각 회귀 발생.

10. **Web Share API 폴백** — `navigator.canShare({files:[file]})`는 모바일 Safari·Chrome에서만 true. 데스크탑·구형 브라우저는 false → download 폴백 + 안내 토스트 ("이 브라우저는 직접 공유를 지원하지 않아 이미지를 저장했어요"). wireframe line 1352 그대로.

11. **Workflow spec 격리** — `.github/workflows/c2-e2e.yml`에서 `npx playwright test e2e/c2-*.spec.ts` 와 같이 spec 경로를 명시적으로 지정. 안 그러면 C-1·B-1·E-1·D-1 spec까지 함께 실행되어 false-red ([[feedback-workflow-spec-scope.md]]).

12. **Firebase Authorized domains** — Storage·Auth 도메인은 Firebase Console → Authentication → Settings → Authorized domains에 Preview URL을 미리 등록. C-2는 Auth 흐름 그대로 사용 + Storage 신규이므로 D-1 PR #20 사고 그물망 적용 ([[feedback-firebase-auth-domains-checklist.md]]).

13. **데드라인 알림** — 이 PR은 MVP 1 발사대(C-3 Ranking)의 직전 모듈. Tournament Deadline UI는 이미 표시되지만 발사대 일정(2026-05-31)이 가까워지고 있다 — "여유" 표현 금지. 작업 시작 즉시 진행 ([[feedback-deadline-no-procrastination.md]]).

---

## §10. 핸드오프 종료 조건

Claude Code가 PR을 제출하면 대표가 다음을 확인:

```
☐ §4 Acceptance Criteria 26개 전 항목 통과
☐ §5 Hard Constraints 위반 0건
☐ CLAUDE.md 불변 원칙 위반 0건 (특히 #1 다크 / #2 Crown Gold / #4 AI-Report Footer-Only / #5 FIFA 금지)
☐ LANGUAGE.md 금지 용어 0건 (Candidate / winner / 결과 이미지 등)
☐ TypeScript strict 통과 / next build 통과 / Vercel Preview 동작
☐ console.error 0건 자동 검증 통과
☐ 와이어프레임 시각 대조 — 브라우저에서 wireframe HTML과 모달을 나란히 띄워 ±2px 이내 검증 스크린샷 PR 첨부

★ v2.1 필수 (인프라) ★
☐ storage.rules 신설 + emulator 테스트 통과
☐ firebase.json에 storage 블록 추가 + `firebase deploy --only storage` 성공
☐ firestore.indexes.json에 crown_cards (userId ASC, createdAt DESC) 인덱스 등록 + 배포 완료
☐ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 환경변수 Production·Preview·Development 모두 등록
☐ Firebase Console → Authentication → Settings → Authorized domains 에 Preview URL 등록 ([[feedback-firebase-auth-domains-checklist]])
☐ onChampionConfirmed Cloud Function asia-northeast3 배포 + 트리거 동작 확인

★ v2.1 필수 (E2E) ★
☐ §11 Playwright E2E 5개 시나리오 GitHub Actions PASS
☐ E2E HTML 리포트 또는 영상(.webm) PR 본문 첨부
☐ 워크플로우 spec 격리(`playwright test e2e/c2-*.spec.ts`) — B-1·C-1 선례
☐ Vercel Preview Protection Bypass 토큰 사용 ([[feedback-vercel-preview-protection-401]])
☐ VERIFICATION_DISCIPLINE.md 4대 원칙 P1~P4 점검 보고
```

---

## §11. Superpowers 워크플로우 지시 — Claude Code 필독

> ⚠️ 이 섹션은 모든 Handoff Brief의 필수 강제 항목입니다.
> Claude Code는 Superpowers 플러그인을 활성화한 상태에서 작업해야 합니다.

### 11.1 적용 단계 (순서 엄수 + Phase 분할)

작업 분량이 6~10시간으로 모듈 중 가장 크므로, **단일 PR이되 내부 Phase 1~3 분할 진행**:

```
[Pre-flight]
/brainstorm 명령 — §2 Goal + §9 함정 13개 입력 → 접근 방식·위험·의존성 순서 정리
/plan 명령 — Phase 1·2·3 작업 순서 확정, §3 Files를 Phase별로 매핑

[Phase 1 — 1.91:1 기본 카드 + 모달 골격 (2~3시간)]
  RED   → lib/crown/canvas/drawLink.test.ts (좌표·텍스트 fit 검증)
  GREEN → drawLink.ts + primitives.ts + formats.ts
  RED   → components/crown/CrownCardModal.test.tsx (ready/unauth 상태 렌더)
  GREEN → CrownCardModal + CrownStaticCard + LoginPromptBanner
  REFACTOR → §5 Hard Constraints + LANGUAGE.md 점검

[Phase 2 — 3 포맷 + 공유 메뉴 + 토스트 (2~3시간)]
  RED   → drawPortrait.test.ts (9:16/4:5 공통 좌표)
  GREEN → drawPortrait.ts + drawQR.ts
  RED   → ShareMenu.test.tsx (포맷 토글 + 캔버스 재렌더)
  GREEN → ShareMenu + FormatChips + CrownCanvasPreview + CrownToast + shareIntents
  REFACTOR → wireframe 시각 대조 + reduced-motion 점검

[Phase 3 — Storage + Cloud Function + Rules (2~4시간)]
  RED   → tests/rules/storage-rules.test.ts (read 허용 / write 차단)
  GREEN → storage.rules + firebase.json + lib/firebase.ts getStorageInstance
  RED   → functions/src/__tests__/crownCardRecord.test.ts (doc builder + 멱등)
  GREEN → onChampionConfirmed + crownCardRecord + canvasServer
  RED   → tests/rules/crown-firestore-rules.test.ts
  GREEN → firestore.rules diff + firestore.indexes.json
  REFACTOR → 멱등성·CORS·node-canvas 차이 검증

[Phase 4 — E2E + Code Review]
  /review 명령 → §5 Hard Constraints·CLAUDE.md·LANGUAGE.md·strict·console 0 점검
  e2e/c2-crown-card-flow.spec.ts 작성 (`?lang=ko` 강제, beforeEach RESET, console 0 가드)
  GitHub Actions 통과 → /pr 명령으로 PR 생성

[Phase 5 — PR 제출]
  PR 본문에 §10 종료 조건 체크리스트 포함 (드래프트 OK)
  Phase 1·2·3 커밋을 명확히 분리 — squash 금지
```

### 11.2 TDD 대상 매핑 (node-env vitest = 즉시 / functions vitest / rules emulator / E2E)

| 테스트 파일 | 테스트 대상 | 계층 | §4 AC |
|---|---|---|---|
| `lib/__tests__/crown/formats.test.ts` | FORMATS immutable + 타입 | unit | AC-3, AC-4 |
| `lib/__tests__/crown/drawLink.test.ts` | 1.91:1 좌표·텍스트 fit | unit | AC-12, AC-14 |
| `lib/__tests__/crown/drawPortrait.test.ts` | 9:16/4:5 공통 좌표·QR 좌표 | unit | AC-11, AC-13, AC-14 |
| `lib/__tests__/crown/drawQR.test.ts` | QR 매트릭스 결정성 | unit | AC-13 |
| `lib/__tests__/crown/championLoader.test.ts` | championId null throw / 정상 변환 | unit | AC-1 |
| `lib/__tests__/crown/shareIntents.test.ts` | X intent URL · Web Share feature detect | unit | AC-7, AC-8 |
| `functions/src/__tests__/crownCardRecord.test.ts` | crown_cards doc builder + 멱등 키 | functions | AC-18, AC-19 |
| `functions/src/__tests__/onChampionConfirmedCore.test.ts` | before/after complete 전환 감지 + noop | functions | AC-16 |
| `tests/rules/storage-rules.test.ts` | crown-cards read 허용 / write 차단 | rules | AC-17 |
| `tests/rules/crown-firestore-rules.test.ts` | crown_cards Voter read / write 차단 | rules | AC-18 |
| `e2e/c2-crown-card-flow.spec.ts` | login→final pick→modal→toggle→download→toast (Console 0, `?lang=ko`) | E2E | AC-1~10, AC-20, AC-25 |
| `e2e/c2-crown-mobile-320.spec.ts` | 모바일 320px 모달·캔버스 미리보기 | E2E | AC-25 (반응형) |

### 11.3 TDD 면제 조건

- 순수 CSS / Tailwind 클래스 매핑
- 정적 SVG 아이콘 (lucide-react)
- Framer Motion 애니메이션 스타일 토큰

그 외 모든 로직(캔버스 좌표·포맷 토글·공유 분기·Cloud Function 멱등·Storage 업로드)은 TDD 필수.

### 11.4 3계층 테스트 의무 (v2.1 강제)

| 계층 | 도구 | 적용 대상 | 통과 기준 |
|---|---|---|---|
| **유닛** | vitest + jsdom canvas | drawLink/drawPortrait/drawQR/championLoader/shareIntents | 100% PASS |
| **통합** | Firebase Emulator (Firestore + Storage) + vitest | onChampionConfirmed 멱등 + crown_cards 트랜잭션 + storage.rules + firestore.rules | 100% PASS |
| **E2E** | @playwright/test | final pick→modal→toggle→download→toast + 무로그인 게이트 + 모바일 320px | 100% PASS + Console 0 |

⚠️ **결승 완료→Crown Card 자동 오픈 흐름은 E2E 의무.** 유닛만으로는 절대 못 잡는다 (C-1 5시간 막힘 + D-1 PR #20 사고가 증거).

### 11.5 CI 통합 (GitHub Actions)

신규 파일: `.github/workflows/c2-e2e.yml`

```yaml
name: C-2 Crown Card E2E (Playwright)
on:
  pull_request:
    branches: [main]
    paths:
      - 'app/arena/**'
      - 'components/crown/**'
      - 'lib/crown/**'
      - 'lib/firebase.ts'
      - 'functions/src/onChampionConfirmed.ts'
      - 'functions/src/core/crownCardRecord.ts'
      - 'storage.rules'
      - 'firestore.rules'
      - 'firestore.indexes.json'
      - 'e2e/c2-*.spec.ts'
      - '.github/workflows/c2-e2e.yml'
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '21' }   # firebase-tools 호환 [[feedback-firebase-tools-java21]]
      - run: npm ci
      - run: npm install -g firebase-tools
      - run: npx playwright install --with-deps chromium
      - run: npm run test:unit -- lib/__tests__/crown
      - run: npm run test:functions -- crownCardRecord onChampionConfirmedCore
      - run: firebase emulators:exec --only firestore,storage "npm run test:rules -- crown"
      - run: npx playwright test e2e/c2-*.spec.ts   # spec 격리 — B-1·C-1 선례
        env:
          PREVIEW_URL: ${{ secrets.C2_PREVIEW_URL }}
          BYPASS_TOKEN: ${{ secrets.VERCEL_AUTOMATION_BYPASS_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: c2-playwright-report, path: playwright-report/ }
```

### 11.6 Console 에러 0건 자동 검증 (E2E 내장)

```ts
let consoleErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text()));
});
test.afterEach(async () => {
  expect(consoleErrors, 'Console errors must be 0').toHaveLength(0);
});
```

---

## §12. Cowork 셀프체크리스트 — 핸드오프 publish 전 의무

```
☑ §11 별도 섹션 존재 (Superpowers TDD)
☑ "권장" 단어 0건 grep 통과 (`grep -i "권장\|선택\|옵션\|가능하면" docs/handoffs/C2-crown-card-handoff.md` → 0건, 있으면 "필수"로 치환)
☑ 핵심 사용자 흐름 E2E 시나리오 명시 (final pick→modal→format toggle→download→toast)
☑ §10 종료조건에 E2E 증거 + Firebase Authorized domains + Storage rules 배포 + 인덱스 배포 의무
☑ C-1 선행 의존(roundProgress.complete + championId) §3·§9 trap #1·§0.3-0.4 self-verify 반영
☑ lite-spec 폐기 3건(AI-Report 배지·1포맷·2버튼)을 v2.0 변경 사유 표에 명시
☑ wireframe line 번호(294~370, 683~749, 1068~1402) 직접 인용
☑ per-Voter 트리거 모델(roundProgress) — 글로벌 tournaments.status 가정 폐기 — ADR-0005 신설
☑ 시드 날짜·i18n·격리 RESET 함정 §9에 모두 포함
☑ html2canvas vs native Canvas 결정 §5 DON'T + §9 trap #6에 근거 명시
```

---

## 부록 A — crown_cards 스키마 (C-2 확정)

```ts
interface CrownCard {
  id: string;                        // `${voterUid}_${tournamentId}` (멱등 키)
  voterUid: string;                  // 결승을 푼 Voter의 uid (익명 uid 허용)
  tournamentId: string;
  championContestantId: string;      // ✅ (lite-spec 표기 유지)
                                     // — C-1 roundProgress에서는 `championId`로 저장됨, championLoader가 매핑
  tournamentTitle: string;           // 비정규화 — Crown Card 카드에 표시
  tournamentCategory: Category;      // FOOTBALL · KPOP · ANIME · GAMING · MOVIE · OTHER
  imageUrl: string;                  // gs://{bucket}/crown-cards/{tournamentId}/{voterUid}.png 의 download URL
  format: 'link';                    // 서버 생성은 link(1.91:1)만 — 다른 포맷은 클라이언트 즉시 렌더
  createdAt: Timestamp;              // serverTimestamp
}
```

> Locker Room(MVP 2)이 `where('voterUid','==',uid) orderBy('createdAt','desc')` 로 조회 예정 → 인덱스 `(voterUid ASC, createdAt DESC)` 사전 등록.

---

## 부록 B — Firestore Rules diff (요지)

```
match /crown_cards/{id} {
  // 본인의 카드 + featured 카드(MVP 2 Hall of Fame) read 허용
  allow read: if request.auth != null
              && (resource.data.voterUid == request.auth.uid
                  || resource.data.featured == true);
  // 클라이언트 write 차단 — onChampionConfirmed(admin SDK)만
  allow write: if false;
}
```

---

## 부록 C — Storage Rules (신설)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /crown-cards/{tournamentId}/{cardFile} {
      allow read:  if true;                  // SNS 공유용 공개 read
      allow write: if false;                 // admin SDK만
    }
    match /{allPaths=**} {
      allow read, write: if false;           // 화이트리스트만
    }
  }
}
```

---

## 부록 D — Cloud Function 골격

```ts
// functions/src/onChampionConfirmed.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
setGlobalOptions({ region: "asia-northeast3" });

export const onChampionConfirmed = onDocumentUpdated(
  "roundProgress/{progressId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    // 1) 결승 완료 전환 감지 (멱등)
    if (before?.complete === true || after.complete !== true) return;
    if (!after.championId || !after.userId || !after.tournamentId) return;

    // 2) 멱등 — 이미 생성된 카드 차단
    const cardId = `${after.userId}_${after.tournamentId}`;
    const cardRef = adminDb.collection("crown_cards").doc(cardId);
    const exist = await cardRef.get();
    if (exist.exists) return;

    // 3) Tournament + Contestant 메타 비정규화
    const [tournament, contestant] = await Promise.all([
      adminDb.collection("tournaments").doc(after.tournamentId).get(),
      adminDb.collection("contestants").doc(after.championId).get(),
    ]);

    // 4) Server-side 1.91:1 PNG 렌더 → Storage 업로드 → download URL
    const buffer = await renderCrownPng({ tournament, contestant, format: "link" });
    const storagePath = `crown-cards/${after.tournamentId}/${after.userId}.png`;
    await adminStorage.bucket().file(storagePath).save(buffer, { contentType: "image/png" });
    const [imageUrl] = await adminStorage.bucket().file(storagePath).getSignedUrl({ action: "read", expires: "01-01-2100" });

    // 5) crown_cards doc 멱등 set
    await cardRef.set(buildCrownCardRecord({
      id: cardId,
      voterUid: after.userId,
      tournamentId: after.tournamentId,
      championContestantId: after.championId,   // ← 매핑
      tournament: tournament.data(),
      imageUrl,
      format: "link",
    }));
  },
);
```

> 코어 로직(`buildCrownCardRecord`, `renderCrownPng`)은 `functions/src/core/`에 순수 함수로 추출 + vitest TDD.

---

*Handoff Brief v2.0 · C-2 Crown Card (Domain 3 The Arena) · WorldCrown48 · 2026-06-23*
*© 2026 WorldCrown48 · CONFIDENTIAL*
