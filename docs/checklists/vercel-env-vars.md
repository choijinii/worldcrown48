# vercel-env-vars.md — Vercel 환경변수 추가·수정 체크리스트

> 상위 원칙: [VERIFICATION_DISCIPLINE.md](../principles/VERIFICATION_DISCIPLINE.md) P3·P4
> 적용 시점: Vercel에 NEXT_PUBLIC_* 또는 서버 환경변수를 **추가 / 수정 / 삭제**할 때마다

---

## A. 사전 확인 (작업 시작 전)

| # | 항목 | 확인 방법 | 합격 기준 |
|---|------|----------|----------|
| A1 | 변수명을 코드 참조와 1:1 일치 확인 | `grep -rh "process\.env\." app lib components` | 코드의 변수명 == 입력할 변수명 (오타·대소문자 0) |
| A2 | 각 변수의 **Scope** 결정 | 미리 결정 (아래 표) | 변수마다 P/Prev/Dev 중 적용 환경 명시 |
| A3 | 값에 따옴표·공백·줄바꿈 없음 | 붙여넣기 전 텍스트 에디터에서 확인 | 앞뒤 공백 0, 따옴표 0 |

**WC48 Firebase 변수 6개의 기본 Scope:**

| # | 변수 | Production | Preview | Development |
|---|------|:---------:|:-------:|:-----------:|
| 1 | NEXT_PUBLIC_FIREBASE_API_KEY | ✅ | ✅ | ✅ |
| 2 | NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | ✅ | ✅ | ✅ |
| 3 | NEXT_PUBLIC_FIREBASE_PROJECT_ID | ✅ | ✅ | ✅ |
| 4 | NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | ✅ | ✅ | ✅ |
| 5 | NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | ✅ | ✅ | ✅ |
| 6 | NEXT_PUBLIC_FIREBASE_APP_ID | ✅ | ✅ | ✅ |
| (7) | NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID | ✅ (선택) | ✅ (선택) | ⬜ |
| (8) | NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION | (코드 기본값 `asia-northeast3` 사용 시 생략 가능) | | |

> ⚠️ 모든 환경에 같은 값 사용. 다른 Firebase 프로젝트를 쓸 경우에만 환경별로 분리.

---

## B. 입력 (Vercel UI)

| # | 작업 | 어디서 | 합격 기준 |
|---|------|--------|----------|
| B1 | Settings → Environments 진입 | Vercel 대시보드 → 해당 프로젝트 → Settings → Environments | 좌측 사이드바 "Environments" 활성 |
| B2 | 대상 환경 행 클릭 (Production → Preview → Development 순) | 환경 행 자체 클릭 (Create Environment 버튼 X — 그건 Pro 전용) | 환경 상세 페이지 진입, "Environment Variables" 섹션 보임 |
| B3 | + Add Environment Variable 클릭 → 변수명·값 입력 | 우측 상단 버튼 | 변수가 목록에 노출 |
| B4 | A1 표대로 모든 필수 변수 입력 완료 | 환경별로 반복 | 각 환경 = 6개 (또는 7개) |

---

## C. 검증 (P3 — 런타임 동작 확인까지)

⚠️ **B까지 끝났다고 "완료"가 아님.** 아래 C 단계까지 끝나야 완료.

| # | 검증 항목 | 방법 | 합격 기준 |
|---|----------|------|----------|
| C1 | 재배포 트리거 (NEXT_PUBLIC_*는 빌드 시점 정적 박힘) | Vercel Dashboard → Deployments → 최신 빌드 우측 ⋯ → **Redeploy** (Use existing Build Cache **OFF**) | 새 배포 status = Ready |
| C2 | 빌드 로그에서 변수 누락 경고 없음 | Vercel 빌드 로그 확인 | "missing" / "undefined" / "is not defined" 키워드 0건 |
| C3 | 라이브 도메인에서 Firebase 초기화 성공 | https://worldcrown48.com 접속 → 브라우저 콘솔(F12) | `Firebase env vars missing` 에러 0건. Firestore/Auth 호출 정상 |
| C4 | (있다면) Preview 배포에서도 동일 확인 | 임의 브랜치 push → Preview URL 접속 | C2·C3 동일 |
| C5 | 변수 노출 확인 (NEXT_PUBLIC_만) | 페이지 뷰소스 또는 콘솔 `console.log(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)` | 정확한 값 노출 (NEXT_PUBLIC_는 의도된 노출) |

---

## D. 기록 (P4)

| # | 작업 | 기록 위치 |
|---|------|----------|
| D1 | 적용 환경·변수 목록·작업 일자 기록 | 메모리 또는 `docs/handoffs/` 핸드오프 파일 |
| D2 | 검증 캡처 (C3 콘솔 화면) 첨부 | 핸드오프 또는 PR 설명 |
| D3 | 작업 중 발견한 새로운 함정은 §E에 추가 | 본 파일 §E |

---

## E. 함정 로그 (작업 중 발견한 것)

| 일자 | 함정 | 해결 |
|------|------|------|
| 2026-06-13 | Vercel UI 변경 — "Environment Variables"가 좌측 별도 메뉴가 아닌 **"Environments" 페이지에서 각 환경 행을 클릭해 진입**하는 구조로 바뀜. Pre-production 환경 신규 생성은 Pro 전용이지만, 기존 Production/Preview/Development의 변수 추가는 Hobby에서 가능 | B2 단계에 명시 |
| 2026-06-13 | Hobby 플랜에서 "Create Environment" 버튼은 Pre-production 환경 *신규 생성*용 → Upgrade to Pro 요구. 우리에게 필요한 건 기존 환경 안의 **변수 추가**라 무료 가능 | B2 단계에 명시 |

---

*v1.0 · 2026-06-13 작성 · 위반 사례에서 발견되는 새 함정은 §E에 누적*
