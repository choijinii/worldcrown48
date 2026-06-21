# Handoff Brief — B-1 The Lab (Domain 2)

> **From**: Cowork (기획·시안 분석·Domain 2 결정 통합) · **To**: Claude Code (실코드)
> **Date**: 2026-06-20 · **Author**: 대표 · **Version**: v2.0
> **작업 브랜치**: `feat/b1-the-lab` (이미 워크트리로 존재 — `/Users/jinii/Projects/wc48-b1`)
> **목표 산출물**: `app/admin/lab/` + `components/admin/lab/` + `functions/src/aiFillContestants.ts` + Firestore Security Rules 추가

---

## ⚠️ v2.0 변경 사유 (Claude Code 필독)

이 핸드오프는 **B-1 lite-spec(Vite + React Router 구버전 표기)** 를 **Next.js 14 App Router로 재해석**하여 작성됩니다. lite-spec의 화면 구성·컴포넌트 명세는 유효하지만, 프레임워크·라우팅·환경변수 표기는 다음과 같이 강제 매핑됩니다.

| lite-spec 표기 | 실제 사용 (Next.js 14) |
|---|---|
| `import.meta.env.VITE_ADMIN_UID` | `process.env.NEXT_PUBLIC_ADMIN_UID` |
| `useNavigate()` | `useRouter()` from `next/navigation` |
| `routes/admin-lab.tsx` | `app/admin/lab/page.tsx` |
| `claude-sonnet-4-20250514` | **`claude-sonnet-4-6`** (2026-06 최신 — Sonnet 4.6) |

또한 **Domain 2 단계별 노출 전략(2026-06-06 결정)** 을 반영합니다.

- **MVP1**: 운영자(대표) 전용 — `/admin/lab/` 게이트된 라우트, Voter 접근 0
- **MVP2**: Voter용 별도 UX (이번 PR 범위 X — 별도 PRD)

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

다음 명령을 순서대로 실행하여 모든 결과가 ✓ 인지 확인하세요. 하나라도 ✗ 이면 즉시 멈추고 대표에게 보고하세요.

### 0.1 작업 위치 검증

```bash
# 현재 브랜치 확인 — 반드시 feat/b1-the-lab 여야 함
git branch --show-current
# 기대값: feat/b1-the-lab

# 만약 다른 브랜치라면 — 기존 워크트리(wc48-b1)로 이동
cd /Users/jinii/Projects/wc48-b1
git branch --show-current
# 기대값: feat/b1-the-lab

# 만약 wc48-b1이 prunable 상태라면 main 최신을 rebase
git fetch origin
git rebase origin/main
```

### 0.2 핵심 파일 존재 검증

```bash
test -f CLAUDE.md && echo "✓ CLAUDE.md" || echo "✗ CLAUDE.md"
test -f LANGUAGE.md && echo "✓ LANGUAGE.md" || echo "✗ LANGUAGE.md"
test -f docs/lite-specs/B1-the-lab.md && echo "✓ B1 lite-spec" || echo "✗ B1 lite-spec"
test -f docs/handoffs/B1-the-lab-handoff.md && echo "✓ B1 handoff" || echo "✗ B1 handoff"
test -f docs/design/WC48_DESIGN_SYSTEM_v2.4.md && echo "✓ Design System v2.4" || echo "✗ Design System"
test -d app/admin 2>/dev/null && echo "✓ app/admin 디렉토리 존재" || echo "ℹ app/admin 신규 생성 필요"
```

### 0.3 의존성 검증

```bash
# Firebase Admin SDK + Anthropic SDK 설치 확인
grep -E '"(firebase-admin|@anthropic-ai/sdk|firebase-functions)"' functions/package.json | wc -l
# 기대값: 3

# 클라이언트 Firebase 확인
grep -E '"(firebase)"' package.json | wc -l
# 기대값: 1

# 부족 시 설치
# cd functions && npm install firebase-admin @anthropic-ai/sdk firebase-functions
```

### 0.4 환경변수 검증

```bash
# 클라이언트 (.env.local 또는 Vercel 환경변수)
grep -E "^NEXT_PUBLIC_ADMIN_UID=" .env.local 2>/dev/null && echo "✓ ADMIN_UID 설정됨" || echo "✗ ADMIN_UID 필요 — 대표에게 요청"

# Cloud Functions (functions/.env)
grep -E "^ANTHROPIC_API_KEY=" functions/.env 2>/dev/null && echo "✓ ANTHROPIC_API_KEY 설정됨" || echo "✗ ANTHROPIC_API_KEY 필요"
```

> 💡 `NEXT_PUBLIC_ADMIN_UID`는 Firebase Auth에서 발급된 대표 계정 UID. 없으면 대표가 Firebase Console → Authentication에서 자기 UID 확인 후 추가.
> 💡 `ANTHROPIC_API_KEY`는 Anthropic Console(console.anthropic.com)에서 발급. 이미 보유 (US$5 충전 완료).

✅ 위 검증이 모두 통과해야만 다음 §1로 진행할 수 있습니다.

---

## §1. Pre-flight Checklist — 읽기 (§0 통과 후)

```
☐ CLAUDE.md v2.1 읽음 (불변 원칙 8가지, 특히 #1 다크 테마·#2 Crown Gold·#5 FIFA 금지)
☐ LANGUAGE.md 읽음 (Contestant·Tournament·Voter·Match·Champion 공식 용어)
☐ docs/lite-specs/B1-the-lab.md 읽음 (화면 구성·컴포넌트만 — 프레임워크 표기는 §위 매핑 참조)
☐ docs/handoffs/B1-the-lab-handoff.md(이 문서) 처음부터 끝까지 읽음
☐ docs/design/WC48_DESIGN_SYSTEM_v2.4.md 다크 테마 토큰 확인 (Domain 2 = 다크)
☐ docs/operations/PARALLEL_PIPELINE_PLAYBOOK_v1.0.md §6 Phase C·D 흐름 확인
☐ Domain 2 결정사항 (이 문서 §9 참조): 운영자 전용 게이트, 다종목 시드
```

---

## §2. Goal — 한 줄 결과 정의

> **운영자(대표)가 `/admin/lab/`에서 토너먼트 제목 + 카테고리를 입력하고 "AI Fill" 버튼을 누르면, Claude API가 48명의 Contestant를 추천·생성하여 운영자가 검수·편집 후 Firestore에 Tournament + 48개 Contestant 문서를 일괄 저장할 수 있다.**

이 PR이 끝나면 **C-1 Vote Engine이 사용할 실제 Tournament 데이터가 Firestore에 존재**합니다.

---

## §3. Files to CREATE / MODIFY

### 페이지·라우팅 (Next.js 14 App Router)

| 경로 | 동작 | 비고 |
|---|---|---|
| `app/admin/lab/page.tsx` | **NEW** | LabDomain 진입 + 관리자 UID 검증 |
| `app/admin/lab/layout.tsx` | **NEW** | Admin 전용 레이아웃 (다크 테마 강제) |
| `middleware.ts` | **EDIT** (없으면 NEW) | `/admin/*` 경로 미인증 시 `/`로 리다이렉트 |

### 컴포넌트

| 경로 | 동작 | 비고 |
|---|---|---|
| `components/admin/lab/TournamentCreator.tsx` | **NEW** | 메인 컨테이너 (Step 1: 제목+카테고리 / Step 2: Contestant 편집) |
| `components/admin/lab/TitleInput.tsx` | **NEW** | 토너먼트 제목 입력 + 글자수 카운터 |
| `components/admin/lab/CategorySelect.tsx` | **NEW** | 카테고리 드롭다운 (FOOTBALL/BASKETBALL/KPOP/ANIME 등) — G-1과 재사용 |
| `components/admin/lab/AiFillButton.tsx` | **NEW** | "✨ Claude AI가 48명 추천" 트리거 |
| `components/admin/lab/ContestantGrid.tsx` | **NEW** | 6×8 grid 컨테이너 (48 nodes) |
| `components/admin/lab/ContestantEditor.tsx` | **NEW** | 개별 Contestant 편집 (이름·국적·이미지URL·검색 키워드) |
| `components/admin/lab/PublishButton.tsx` | **NEW** | Firestore 일괄 저장 (writeBatch) |
| `components/admin/lab/TournamentList.tsx` | **NEW** | 운영자가 생성한 Tournament 목록 (featured 토글 포함) |

### Cloud Function

| 경로 | 동작 | 비고 |
|---|---|---|
| `functions/src/aiFillContestants.ts` | **NEW** | onCall Cloud Function, Claude API 호출 + 48명 반환 |
| `functions/src/index.ts` | **EDIT** | `aiFillContestants` export 추가 |

### Firestore 규칙

| 경로 | 동작 | 비고 |
|---|---|---|
| `firestore.rules` | **EDIT** | `tournaments/{id}` + `contestants/{id}` 컬렉션 규칙 추가 |

### 타입 정의

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/types/tournament.ts` | **NEW** | Tournament + Contestant 인터페이스 (C-1·C-2도 참조 예정) |

### 기존 파일 확인

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/firebase.ts` | **CONFIRM** | Firebase client 초기화 (auth, firestore, functions) |
| `app/layout.tsx` | **NO CHANGE** | 글로벌 레이아웃 그대로 |

---

## §4. Acceptance Criteria — 완료 조건 (32개)

### 접근 제어 (Critical · 8개)

```
☐ /admin/lab 접근 시 Firebase Auth 로그인 상태 확인
☐ 로그인 상태가 아니면 /signin?redirect=/admin/lab 로 자동 리다이렉트
☐ 로그인됐지만 uid !== NEXT_PUBLIC_ADMIN_UID 면 / (홈) 으로 리다이렉트
☐ middleware.ts 또는 page.tsx 서버 컴포넌트에서 1차 차단 (브라우저 진입 전)
☐ Voter는 어떤 경로로도 /admin/lab/* 진입 불가 (직접 URL 입력 포함)
☐ Firestore Rules도 hostUid === request.auth.uid 검증 (방어 심화)
☐ 일반 페이지(/, /tournaments/...) 에서 /admin 으로의 노출된 링크 0개
☐ console.error 0건 + 권한 위반 시 사용자 친화적 메시지 (한국어)
```

### Step 1: 제목 + 카테고리 입력 (5개)

```
☐ TitleInput: 최대 50자, 글자수 카운터 표시 (실시간), 빈 값일 때 AiFillButton 비활성
☐ CategorySelect: 6개 카테고리 옵션 표시 (FOOTBALL · KPOP · ANIME · GAMING · MOVIE · OTHER)
   ※ "WORLD CUP 2026" 같은 단일 종목 박힌 값 금지 (Domain 2 결정사항)
   ※ 카테고리 enum은 G-1 관리자 콘솔과 동일 (대표 결정 2026-06-20)
☐ AiFillButton: 클릭 시 functions.aiFillContestants() 호출 → Step 2 진입
☐ 로딩 중 표시: "✨ Claude AI가 48명을 추천 중... (약 15초)"
☐ API 에러 시 사용자 친화 토스트: "AI 추천 실패. 다시 시도해주세요." + console 로그
```

### Step 2: 48 Nodes 편집 (Critical · 8개)

```
☐ ContestantGrid: 6열 8행 = 48개 노드, 데스크탑 전용 (min-width: 1440px)
☐ 각 노드: 정사각형(120×120px), 이미지 미리보기 영역 + 이름 텍스트
☐ AI 추천 결과 반영: name, nationality, position, imageSearchKeyword 자동 채움
☐ imageUrl은 빈 값으로 두어 운영자가 수동 입력 (Cloud Function에서 자동 검색 X — 저작권)
☐ ContestantEditor 인라인 편집: 각 필드 클릭 시 input 활성화
☐ 빈 노드는 점선 테두리 + "+" 아이콘 (border-2 border-dashed)
☐ 모바일(< 1440px) 접근 시 "Desktop only" 안내 화면 표시
☐ 48 미만일 때 PublishButton 비활성 (정확히 48명 필수)
```

### Step 3: Firestore 저장 (6개)

```
☐ PublishButton 클릭 → writeBatch로 Tournament + 48 Contestants 원자적 저장
☐ Tournament 문서 필드: title, category, status='active', hostUid, createdAt(serverTimestamp), tournamentDeadline(null 기본), currentRound=1, totalContestants=48, settings: { aiNews: false, multiLang: false, showRanking: true }, featured: false
☐ Contestant 문서 필드: tournamentId, order(1~48), name, nationality, position, imageUrl, imageSearchKeyword
☐ 저장 중 PublishButton 비활성 + "저장 중... " 스피너
☐ 저장 성공 시 토스트 "✓ 토너먼트 생성 완료" + TournamentList 새로고침
☐ 저장 실패 시 토스트 + 에러 로그 (모든 데이터 유지 — 사용자가 재시도 가능)
```

### TournamentList (운영자 도구 · 5개)

```
☐ 운영자가 생성한 모든 Tournament 표시 (hostUid 기준 query)
☐ 각 항목: title, category, status, createdAt, totalContestants, featured 플래그 표시
☐ featured 토글: 클릭 시 해당 Tournament만 featured=true, 나머지 모두 false (단일 featured 보장)
   ※ Domain 0 Launch Pad의 Featured Tournament 히어로가 이 플래그로 표시됨
☐ 삭제 버튼: 확인 모달 후 Tournament + 연결된 모든 Contestant 일괄 삭제
☐ 빈 상태: "아직 생성된 Tournament가 없습니다. 위에서 첫 토너먼트를 만들어보세요."
```

---

## §5. Hard Constraints — DO / DON'T

### DO

- **Next.js 14 App Router 사용** — lite-spec의 Vite·React Router 표기 무시. 모든 라우팅은 `app/` 하위 + `next/navigation`
- **다크 테마 사용** — Domain 2는 Domain 0~3 다크 그룹 (CLAUDE.md 불변 원칙 #1)
- **Crown Gold `#FCD006`** — AI Fill 버튼, Publish 버튼의 포인트 컬러
- **공식 용어 절대 준수**: `Contestant` (✗ Candidate), `Tournament` (✗ 대회·이벤트), `Voter` (✗ 유저), `Match` (✗ Battle), `Champion` (✗ 우승자) — LANGUAGE.md
- **Cloud Function 이름**: `aiFillContestants` (✗ recommendCandidates)
- **Claude 모델**: `claude-sonnet-4-6` (2026-06 기준 최신 — Sonnet 4.6)
- **writeBatch** 사용 (Tournament + 48 Contestants 원자적 저장)
- **TypeScript strict mode** — 모든 컴포넌트 props·state·Firestore 응답에 타입 명시
- **데스크탑 전용** — `min-width: 1440px`. 모바일은 명시적 안내
- **카테고리 다양화** — `FOOTBALL · KPOP · ANIME · GAMING · MOVIE · OTHER` 6개 (대표 결정 2026-06-20). 단일 종목 박힌 값 금지

### DON'T

- **lite-spec의 Vite 표기 그대로 코딩 금지** — `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`
- **claude-sonnet-4-20250514 모델 사용 금지** — 구버전. `claude-sonnet-4-6` 사용
- **이미지 자동 다운로드 금지** — 저작권 위험. Cloud Function은 `imageSearchKeyword`만 반환, 실제 이미지는 운영자가 수동 입력
- **"FIFA", "Official", "World Cup 2026" 시드 키워드 박지 말 것** — 불변 원칙 #5 + Domain 2 결정사항
- **`Round Deadline` 개념 도입 금지** — Tournament Deadline만 존재. 라운드별 마감 X (CLAUDE.md 대진 흐름 #1)
- **`Vote Count` UI 노출 금지** — 절대 수치 금지 (불변 원칙 #1 — 대진 흐름)
- **AI-Report 표기 금지** — Lab 화면에 등장 불가 (Footer-Only Lock v2.4)
- **localStorage / sessionStorage 사용 금지** — 모든 상태는 useState (세션) + Firestore (영속)
- **한국적 시드 키워드 박지 말 것** — 글로벌 MZ Sporty 럭셔리 (불변 원칙 #3)
- **Voter UI에서 /admin/lab/* 링크 노출 금지** — 운영자 전용, 검색 엔진 노출도 X (robots.txt에 `Disallow: /admin/` 추가 필수)

---

## §6. Design Reference

### 핵심 컴포넌트 구조 (lite-spec + Domain 2 결정 통합)

```
<LabDomain>                                  — app/admin/lab/page.tsx
  <AdminAuthGuard>                           — uid !== ADMIN_UID 차단
    <TournamentCreator>                      — components/admin/lab/
      {step === 1 && (
        <Step1>
          <TitleInput value={title} onChange={...} />
          <CategorySelect value={category} onChange={...} />  ← Domain 2 신설
          <AiFillButton disabled={!title || !category} onClick={fillWithAI} />
        </Step1>
      )}
      {step === 2 && (
        <Step2>
          <ContestantGrid>
            {contestants.map((c, i) => (
              <ContestantEditor key={i} index={i} contestant={c} onChange={...} />
            ))}
          </ContestantGrid>
          <PublishButton disabled={contestants.length !== 48} onClick={publish} />
        </Step2>
      )}
    </TournamentCreator>
    <TournamentList hostUid={user.uid} />
  </AdminAuthGuard>
</LabDomain>
```

### 핵심 디자인 토큰 (Domain 2 = 다크 테마)

```css
/* 배경 */
--color-bg-dark:         #0E0944;   /* deep twilight */
--color-surface-dark:    #1A1466;   /* surface */
--color-surface-elev:    #241754;   /* elevated (모달·카드) */

/* 텍스트 */
--color-text-dark:       #FFFFFF;
--color-text-sub:        #B8C4D9;
--color-text-muted:      #6B7896;

/* Crown Gold (포인트) */
--color-gold:            #FCD006;
--color-gold-hover:      #E3BB05;
--color-gold-subtle:     rgba(252,208,6,0.12);
--color-gold-glow:       rgba(252,208,6,0.30);

/* 시맨틱 */
--color-crimson:         #D7063A;   /* 에러·삭제 */
--color-turquoise:       #00A3B7;   /* 성공·Saved */

/* 보더 */
--color-border-dark:     rgba(255,255,255,0.12);
--color-border-dashed:   rgba(252,208,6,0.40);   /* 빈 노드용 */
```

### 48 Nodes 그리드 (lite-spec 기준)

```css
.contestant-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(8, auto);
  gap: 16px;
  min-width: 1440px;
}

.contestant-node {
  aspect-ratio: 1 / 1;
  border-radius: 5px;
  background: var(--color-surface-dark);
  position: relative;
}

.contestant-node--empty {
  border: 2px dashed var(--color-border-dashed);
}

.contestant-node--filled {
  border: 1px solid var(--color-border-dark);
}

.ai-fill-button {
  border: 2px solid var(--color-gold);
  color: var(--color-gold);
  background: var(--color-gold-subtle);
}

.ai-fill-button:hover {
  background: var(--color-gold-glow);
}
```

### 반응형

| 구간 | 조건 | 동작 |
|---|---|---|
| 데스크탑 | ≥ 1440px | 정상 동작 |
| 그 외 | < 1440px | "Desktop only" 안내 화면 (간단한 그래픽 + 메시지) |

---

## §7. Test Plan

### 수동 테스트 시나리오 (12개)

1. **비로그인 상태로 /admin/lab 접근** → /signin으로 자동 리다이렉트 확인
2. **Voter 계정으로 로그인 후 /admin/lab 접근** → / (홈)으로 리다이렉트 확인
3. **운영자 계정 로그인 → /admin/lab** → 정상 진입 확인
4. **빈 제목으로 AiFillButton 클릭** → 버튼 비활성 확인
5. **제목·카테고리 입력 후 AiFillButton 클릭** → 로딩 메시지 표시 + 15초 내 48명 채워짐
6. **Step 2에서 Contestant 이름 편집** → 변경 사항 즉시 반영
7. **이미지 URL 빈 노드 + 채워진 노드** → 빈 점선 vs 채워진 보더 시각 구분
8. **47명만 채운 상태에서 PublishButton** → 버튼 비활성 확인
9. **48명 모두 채운 후 Publish** → Firestore에 tournaments + 48 contestants 생성 확인
10. **TournamentList featured 토글** → 한 개만 true로 유지, 다른 것 자동 false 확인
11. **TournamentList 삭제** → 확인 모달 → Tournament + 모든 Contestant 삭제 확인
12. **모바일(390×844) 접근** → "Desktop only" 안내 화면 표시

### 반응형 테스트

- 1440 / 1920 / 2560 (모두 정상 동작)
- 1024 / 768 / 390 (모두 "Desktop only" 안내)

---

## §8. Analytics Events

```
이벤트명                     파라미터                                       발생 시점
admin_lab_view              { uid }                                       /admin/lab 진입
admin_lab_step1_submit      { category, title_length }                    AiFillButton 클릭
admin_lab_ai_fill_success   { category, duration_ms, contestant_count }   AI 응답 수신
admin_lab_ai_fill_error     { category, error_code }                      Cloud Function 실패
admin_lab_contestant_edit   { field: 'name'|'nationality'|... }           각 필드 편집
admin_lab_publish           { tournament_id, category }                   PublishButton 성공
admin_lab_publish_error     { error_code }                                Firestore 저장 실패
admin_lab_featured_toggle   { tournament_id, from, to }                   featured 플래그 변경
admin_lab_delete            { tournament_id }                             Tournament 삭제
```

---

## §9. 알려진 함정 (Cowork이 미리 파악한 위험)

1. **Domain 2 단계별 노출 (가장 중요)** — MVP1에서 Voter UI에 /admin/lab/* 노출하면 안 됨. Voter용 UX는 MVP2 별도 PRD. 메인 네비게이션·푸터에 링크 0개, robots.txt에 `Disallow: /admin/` 추가.

2. **lite-spec의 Vite 표기 함정** — `import.meta.env.VITE_ADMIN_UID` 그대로 쓰면 Next.js에서 동작 안 함. 반드시 `process.env.NEXT_PUBLIC_ADMIN_UID`로 재해석. **이걸 놓치면 빌드는 통과해도 런타임에 admin UID가 `undefined`가 되어 모든 사용자가 admin이 됨 (위험!).**

3. **Claude 모델 버전 함정** — lite-spec의 `claude-sonnet-4-20250514`는 구버전. 2026-06 기준 `claude-sonnet-4-6` 사용. Anthropic SDK 문서에서 최신 모델명 확인.

4. **단일 카테고리 박힘 위험** — "World Cup 2026"으로 시드 시작하면 다종목 플랫폼 정체성 훼손 (Domain 2 결정). CategorySelect는 G-1 관리자 콘솔 컴포넌트와 동일 enum 사용. 정확히 6개 카테고리 표시 (FOOTBALL · KPOP · ANIME · GAMING · MOVIE · OTHER — 대표 결정 2026-06-20).

5. **이미지 저작권 함정** — Claude API가 추천한 Contestant의 실제 이미지를 자동 다운로드하지 말 것. `imageSearchKeyword`만 받아서 운영자가 수동으로 라이선스 확인된 이미지 URL 입력. CLAUDE.md 불변 원칙 #6 (이미지 소싱 Level 1~3).

6. **Firestore 저장 원자성** — `writeBatch` 필수. Tournament는 저장됐는데 일부 Contestant가 실패하면 데이터 불일치. batch.commit()이 atomic 보장.

7. **featured 플래그 단일성** — 한 번에 하나의 Tournament만 featured=true 여야 함 (Launch Pad 히어로가 `featured == true LIMIT 1`로 query). 토글 시 트랜잭션으로 기존 featured 끄고 새로 켜기.

8. **Claude API 응답 형식 불일치 위험** — `response.content[0].text`가 항상 JSON 배열이라는 보장 없음. JSON.parse 전 try-catch + 48명 정확 검증. 부족하면 사용자에게 "재시도" 옵션 제공.

9. **운영자 계정 단일성** — MVP1은 대표 1인. 향후 멀티 운영자 시 `admins` Firestore 컬렉션 도입 필요 (이번 범위 X). 지금은 환경변수 단일 UID로 충분.

10. **Cloud Function 비용 함정** — Claude API 호출은 유료. 48명 추천 시 약 $0.05~0.10 / 호출. 운영자가 실수로 100번 호출하면 $10 손실. **Cloud Function에 rate limit 필수** (분당 5회, 일일 50회 — Firestore counter 또는 Firebase App Check로 구현).

11. **데스크탑 전용 안내** — 1440px 미만에서 그냥 깨진 화면 보여주지 말고, 명시적 "Desktop only" 안내. CSS `@media (max-width: 1439px)` 처리.

12. **워크트리 함정** — `wc48-b1` 이 이미 존재(prunable). 그 안에 이전 작업 흔적이 있을 수 있음. §0.1에서 `git rebase origin/main`으로 최신화 후 시작.

13. **middleware.ts 함정** — Next.js middleware는 Edge Runtime이라 Firebase Admin SDK 사용 불가. 클라이언트 측 onAuthStateChanged + 페이지 컴포넌트의 서버측 redirect 조합으로 처리.

---

## §10. 핸드오프 종료 조건

Claude Code가 PR을 제출하면 대표(또는 Antigravity)가 다음을 확인:

```
☐ Acceptance Criteria 32개 전 항목 통과
☐ Hard Constraints DO/DON'T 위반 0건
☐ CLAUDE.md 불변 원칙 위반 0건 (특히 #1 다크 테마, #2 Crown Gold, #5 FIFA 금지)
☐ LANGUAGE.md 금지 용어 사용 0건 (Candidate·Battle·우승자 등)
☐ Test Plan 수동 12개 시나리오 통과
☐ 데스크탑 3개 사이즈 + 모바일 3개 사이즈 반응형 통과
☐ Vercel Preview 배포 동작 확인
☐ Firestore Security Rules 배포 + 운영자 외 접근 차단 확인
☐ Cloud Function aiFillContestants 배포 + 호출 동작 확인 (Anthropic API 키 환경변수 등록)
☐ TypeScript strict mode 통과 (npm run type-check)
☐ Lint 통과 (npm run lint)
☐ Console 에러 0건 자동 검증 통과

★ v2.1 필수 항목 ★
☐ §11 Playwright E2E 4개 시나리오 GitHub Actions PASS
☐ E2E HTML 리포트 PR 본문 첨부
☐ Firebase Authorized domains 등록 (Production + Preview)
☐ Cloud Function 비용 모니터링 알림 설정 (월 $20 초과 시 이메일)
```

---

## §11. Superpowers 워크플로우 지시 — Claude Code 필독

> ⚠️ 이 섹션은 **모든 Handoff Brief에 필수 포함**됩니다.
> Claude Code는 Superpowers 플러그인을 활성화한 상태에서 작업해야 합니다.

### 11.1 적용 단계 (순서 엄수)

```
Phase 1 — Brainstorming (5분)
  /brainstorm 으로 §2 Goal + §9 함정(특히 #1·#2·#4·#10) 입력
  → 운영자 UID 검증·다종목 시드·rate limit 전략 정리

Phase 2 — Writing Plan
  /plan 으로 §3 Files to CREATE/MODIFY 기반 작업 순서 확정
  → 우선순위: types → middleware → AuthGuard → Cloud Function → 컴포넌트 → Firestore Rules

Phase 3 — TDD RED-GREEN-REFACTOR (핵심)
  반드시 다음 순서:
  1. RED   — 테스트 먼저 작성
  2. GREEN — 최소 코드로 통과
  3. REFACTOR — Hard Constraints 준수 확인

⚠️ 테스트 없이 구현 코드 먼저 작성 금지.

Phase 4 — Code Review
  /review 로 자체 리뷰:
    ☐ §5 Hard Constraints 위반 0건
    ☐ CLAUDE.md 불변 원칙 위반 0건
    ☐ LANGUAGE.md 금지 용어 0건
    ☐ TypeScript strict mode 통과
    ☐ console.error 0건

Phase 5 — PR 제출
  /pr 명령으로 PR 생성
  PR 본문에 §10 종료 조건 체크리스트 포함
```

### 11.2 TDD 대상 매핑 (이번 모듈)

| 테스트 파일 | 테스트 대상 | §4 AC 번호 |
|---|---|---|
| `__tests__/middleware.test.ts` | `/admin/*` 비인증 차단 | 접근제어 #4 |
| `__tests__/AdminAuthGuard.test.tsx` | uid !== ADMIN_UID 리다이렉트 | 접근제어 #3 |
| `__tests__/TitleInput.test.tsx` | 50자 제한 + 카운터 | Step1 #1 |
| `__tests__/CategorySelect.test.tsx` | 5+ 카테고리 옵션 렌더 | Step1 #2 |
| `__tests__/AiFillButton.test.tsx` | 빈 값 비활성, 클릭 시 호출 | Step1 #1·#3 |
| `__tests__/ContestantGrid.test.tsx` | 48 노드 렌더, 빈/채워진 분기 | Step2 #1·#6 |
| `__tests__/PublishButton.test.tsx` | 48명 미만 비활성, writeBatch 호출 | Step2 #8, Step3 #1 |
| `functions/__tests__/aiFillContestants.test.ts` | Claude API 모킹, 48명 반환 검증 | Step1 #3·#5 |
| `__tests__/featured-toggle.test.ts` | 단일 featured 보장 트랜잭션 | List #3 |
| `e2e/admin-lab-flow.spec.ts` | 운영자 로그인 → Tournament 생성 → featured 토글 | Step1~3 통합 |

### 11.3 TDD 면제 조건

- 순수 CSS 스타일링 (로직 없음)
- Storybook story 파일
- 정적 안내 화면 ("Desktop only" 등 변환 로직 없는 텍스트)

### 11.4 3계층 테스트 의무

| 계층 | 도구 | 적용 | 통과 기준 |
|---|---|---|---|
| **유닛** | vitest | 컴포넌트·유틸 | 100% PASS |
| **통합** | Firebase Emulator + vitest | Cloud Function callable · Firestore Rules deny/allow | 100% PASS |
| **E2E** | Playwright | 로그인 → 생성 → featured 토글 → 삭제 | 100% PASS + Console 에러 0건 |

⚠️ **운영자 인증·Firestore 저장·featured 토글은 E2E 의무.**

### 11.5 CI 통합 — `.github/workflows/b1-e2e.yml`

```yaml
name: B-1 The Lab E2E (Playwright)
on:
  pull_request:
    branches: [main]
    paths:
      - 'app/admin/**'
      - 'components/admin/**'
      - 'functions/src/aiFillContestants.ts'
      - 'firestore.rules'
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: playwright-report/ }
```

### 11.6 Console 에러 0건 자동 검증

```ts
test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text()));
});

test.afterEach(async () => {
  expect(consoleErrors, 'Console errors must be 0').toHaveLength(0);
});
```

---

## §12. Cowork 셀프체크리스트 — publish 전 의무

```
☑ §11 별도 섹션 존재
☑ "권장" 단어 0건 (모두 "필수"로 작성)
☑ 핵심 흐름 E2E 시나리오 명시 (로그인→생성→featured→삭제)
☑ §10 종료조건에 E2E 증거 + Firebase Authorized domains 의무 포함
☑ Domain 2 결정사항(MVP1 운영자 전용·다종목 시드) §1·§5·§9 반영
☑ lite-spec의 Vite 표기 → Next.js 14 매핑 명시
☑ Claude 모델 버전 정정 (claude-sonnet-4-5)
☑ 이미지 자동 다운로드 금지 명시
```

---

## 부록 A — Firestore 스키마

### Collection: `tournaments/{tournamentId}`

```ts
interface Tournament {
  id: string                          // doc id
  title: string                       // max 50
  category: 'FOOTBALL' | 'KPOP' | 'ANIME' | 'GAMING' | 'MOVIE' | 'OTHER'
  status: 'active' | 'ended' | 'draft'
  hostUid: string                     // 운영자 UID
  createdAt: Timestamp
  tournamentDeadline: Timestamp | null  // Round Deadline 아님 — Tournament 전체 마감
  currentRound: 1 | 2 | 3 | 4 | 5     // 5 = THE FINAL
  totalContestants: 48
  settings: {
    aiNews: boolean
    multiLang: boolean
    showRanking: boolean
  }
  featured: boolean                   // 단일 true 보장 (Launch Pad 히어로)
}
```

### Collection: `contestants/{contestantId}`

```ts
interface Contestant {
  id: string
  tournamentId: string                // tournaments/{id} 참조
  order: number                       // 1~48
  name: string
  nationality: string
  position: string
  imageUrl: string                    // 운영자 수동 입력 (저작권 확인됨)
  imageSearchKeyword: string          // Claude가 추천한 검색어
}
```

### Security Rules 추가

```
match /tournaments/{tournamentId} {
  allow read: if true;                        // 누구나 읽기 (Voter 투표 위해)
  allow create: if request.auth.uid == request.resource.data.hostUid
                && request.auth.token.admin == true;  // custom claim 또는 비교
  allow update, delete: if request.auth.uid == resource.data.hostUid;
}

match /contestants/{contestantId} {
  allow read: if true;
  allow create, update, delete: if request.auth != null
    && get(/databases/$(database)/documents/tournaments/$(request.resource.data.tournamentId)).data.hostUid == request.auth.uid;
}
```

> 💡 Firebase Custom Claims로 `admin: true` 부여하는 것이 가장 안전. 다만 MVP1은 환경변수 UID 비교로 단순 처리해도 무방.

---

## 부록 B — Cloud Function 골격

```ts
// functions/src/aiFillContestants.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const aiFillContestants = onCall({
  region: 'asia-northeast3',           // 서울
  maxInstances: 10,
  timeoutSeconds: 60,
  // Rate limit은 Firebase App Check 또는 별도 Firestore counter로 구현
}, async (request) => {
  const { title, category } = request.data;

  if (!request.auth) throw new HttpsError('unauthenticated', '로그인 필요');
  if (!title || !category) throw new HttpsError('invalid-argument', 'title, category 필수');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `다음 Tournament 제목과 카테고리에 맞는 Contestant 48명을 추천해줘.
제목: "${title}"
카테고리: ${category}

각 Contestant를 JSON 배열로 반환:
[{ "name": string, "nationality": string, "position": string, "imageSearchKeyword": string }]

규칙:
- 정확히 48명
- 퍼포먼스 기반 공개 데이터만 사용
- 미성년자 금지
- 카테고리에 맞는 활동 영역 (position 필드)`
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  // JSON 추출 + 검증
  let contestants;
  try {
    const match = text.match(/\[[\s\S]*\]/);
    contestants = JSON.parse(match?.[0] || text);
  } catch {
    throw new HttpsError('internal', 'AI 응답 파싱 실패');
  }
  
  if (!Array.isArray(contestants) || contestants.length !== 48) {
    throw new HttpsError('internal', `48명 정확히 필요 (받음: ${contestants?.length})`);
  }

  return { contestants };
});
```

---

## 부록 C — v1.0 → v2.0 변경 이력

| 항목 | v1.0 (예상) | v2.0 |
|---|---|---|
| Domain 2 결정 반영 | X | ✅ MVP1 운영자 전용·다종목 시드 |
| lite-spec Vite 매핑 | 명시 안 함 | ✅ Next.js 14 매핑 표 |
| Claude 모델 버전 | claude-sonnet-4-20250514 | ✅ claude-sonnet-4-6 |
| §0 자가 검증 | X | ✅ 4단계 명령 |
| §11 Superpowers TDD | X | ✅ 10개 테스트 매핑 |
| §12 셀프체크 | X | ✅ 8 항목 |
| 알려진 함정 | 명시 안 함 | ✅ 13개 (Vite·모델·저작권·rate limit 등) |
| Acceptance Criteria | 명시 안 함 | ✅ 32개 |

---

*Handoff Brief v2.0 · B-1 The Lab · WorldCrown48 · 2026-06-20*
*© 2026 WorldCrown48 · CONFIDENTIAL*
