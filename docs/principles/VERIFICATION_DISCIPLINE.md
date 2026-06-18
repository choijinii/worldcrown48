# VERIFICATION_DISCIPLINE.md — 진단·검증·완료 판정 원칙 v1.1

> 인프라 작업(Vercel · Firebase · DNS · Cloud Functions · 환경변수)에 들어가기 전 **반드시** 본다.
> CLAUDE.md / MENTAL_MODEL.svg 와 동격 우선순위.
> 위반 시 1인 개발자의 시간이 직접 손실된다 — 가장 비싼 비용.

작성: 2026-06-13 · 계기: Vercel ENV 6개 변수 반복 작업 사건 (§4 위반 사례 로그 참조)

---

## §1. 5대 원칙

| # | 원칙 | 한 줄 정의 | 위반 신호 (이런 표현이 나오면 STOP) |
|---|------|-----------|-------------------------------|
| **P1** | 가설은 가설로 | 증거 없는 추측을 **단정으로 말하지 않는다.** 가설은 항상 "후보 A / B / C" 병렬 + 확률·근거 명시 | **금지 표현 (증거 표 없이 사용 시 즉시 응답 폐기):** "가장 유력", "보통은 ~", "아마 ~", "거의 확실", "~일 거예요", "원래 ~ 이에요" |
| **P2** | 원인 모를 땐 변명 금지 | "캐시일 수도", "이미 끝났을 텐데요" 같은 추정성 회피 금지. 모르면 **"모릅니다 — 증거 ⓐⓑⓒ 중 하나가 필요합니다"** 라고 명시 | "아마 ~", "원래는 ~" 으로 얼버무림 |
| **P3** | 완료 판정은 런타임에서 | UI 값 노출·명령 성공·콘솔 응답은 "설정"이지 "완료"가 아니다. **배포된 도메인에서 실제 동작 확인**까지 마쳐야 완료 | 핸드오프·메모리에 "X 완료"라고만 적고 검증 결과·스크린샷·로그 없음 |
| **P4** | 검증 체크리스트 의무 | 작업 종료 전 해당 인프라의 체크리스트(§3 하위 문서)를 한 줄씩 ✅. 누락 시 **"미완 상태"** 로 핸드오프 | 체크리스트 없이 "다 됐어요" 선언 |
| **P5** | **사용자 증언 우선** | 사용자가 자기 환경·파일·화면에 대해 한 진술은 **1차 증거**다. 내가 자기 도구(bash·grep 등) 한 번의 결과로 반박하기 전 ① 정확한 경로·저장 상태·탭 표시를 사용자에게 먼저 확인 ② 그래도 불일치하면 양쪽 다 가능한 시나리오를 가설로 병렬 제시. 사용자 증언을 "가능성 낮음"·"fake"·"환각"으로 분류 절대 금지 | 사용자가 "X 있어요" 했는데 내가 도구 1회 결과로 "X 없습니다, 다른 걸 보신 것 같습니다" 단정 |

---

## §2. 진단 플로우 (위반 시 즉시 STOP)

```
[문제 발생]
   ↓
증거 수집 (ⓐ 콘솔 화면 캡처 / ⓑ 빌드·런타임 로그 / ⓒ 에러 메시지 전문 중 ≥1)
   ↓ ※ 수집 전에 가설을 단정하면 P1 위반
가설 N개 병렬 제시 — 각 가설 = (메커니즘 · 발생 확률 · 검증 방법)
   ↓
가설별 검증 실행
   ↓
원인 확정 (증거가 가설을 뒷받침할 때에만)
   ↓
수정 → 런타임 재검증 → §3 체크리스트 마감 → 핸드오프 기록 → §4 로그 (필요 시)
```

**증거 ⓐⓑⓒ 분류:**

| 기호 | 종류 | 예시 |
|------|------|------|
| ⓐ | 콘솔/UI 화면 캡처 | Vercel Env, Firebase Console, Cloudflare DNS, GitHub Actions 화면 |
| ⓑ | 로그 | 빌드 로그, runtime 로그, 브라우저 콘솔, `firebase deploy` 출력 |
| ⓒ | 에러 메시지 전문 | 사용자 화면 에러, CLI stderr, 알림 메시지 (요약 금지 — 전문 그대로) |

---

## §3. 하위 체크리스트 색인

각 파일은 **"작업 → 검증 명령 → 합격 기준"** 3단 표로 작성. P4 의무 대상.

| 파일 | 다루는 작업 | 합격 기준 (요약) | 상태 |
|------|------------|-----------------|------|
| [vercel-env-vars.md](../checklists/vercel-env-vars.md) | Vercel 환경변수 추가/수정 | 3 Scope(P/Prev/Dev) 명시 + Redeploy 트리거 + 런타임 동작 확인 | ⬜ 작성 예정 |
| [vercel-deploy.md](../checklists/vercel-deploy.md) | Vercel 배포 전반 | 도메인 응답 200 + 핵심 페이지 렌더 + 브라우저 콘솔 에러 0 | ⬜ 작성 예정 |
| [firebase-functions-deploy.md](../checklists/firebase-functions-deploy.md) | Cloud Functions 배포 | 빌드 성공 + 호출 응답 + IAM(빌드 서비스 계정) 권한 확인 | ⬜ 작성 예정 |
| [firebase-rules-deploy.md](../checklists/firebase-rules-deploy.md) | Firestore 룰 배포 | 룰 컴파일 + 예상 deny/allow 케이스 통과 | ⬜ 작성 예정 |
| [firebase-auth-domains.md](../checklists/firebase-auth-domains.md) | **Firebase Auth Authorized domains 등록 (v2.1 신설)** | **Firebase Console → Auth → Settings → Authorized domains 에 localhost + worldcrown48.firebaseapp.com + worldcrown48.com + 이번 PR의 Vercel Preview URL 모두 등록 + Console 에러 "current domain is not authorized" 0건** | ⬜ 작성 예정 |
| [dns-records.md](../checklists/dns-records.md) | DNS(Cloudflare) 변경 | DNS 전파 확인 + 인증서 발급 + Vercel "Valid Configuration ✅" | ⬜ 작성 예정 |

**`firebase-auth-domains` 트리거 (2026-06-15 신설)**: Firebase Auth(`signInWithPopup`·`signInWithRedirect`·`sendSignInLinkToEmail`·`linkWithPopup`·`linkWithRedirect`) 호출하는 모든 PR. **B안 정책 — PR마다 Preview 도메인 등록 의무**. Firebase는 wildcard(`*.vercel.app`) 미지원. 누락 시 OAuth 팝업이 즉시 닫혀 사용자 좌절.

---

## §4. 위반 사례 로그 (학습 데이터)

새 항목 추가 시 같은 실수가 다시 발생하지 않도록 **반드시** 기록한다.

| 일자 | 사건 | 위반 원칙 | 결과 | 학습 |
|------|------|----------|------|------|
| 2026-06-13 | Vercel ENV 6개 변수 — 증거 없이 "이미 설정 완료"라고 단정. 메모리에 무엇을 / 어느 Scope에 / 어떤 빌드까지 적용했는지 미기록 | P1, P3 | 사용자가 변수를 다시 넣어야 함. 시간 손실. 신뢰 손상 | UI 값 노출 ≠ 완료. 런타임 검증 필수. **본 문서 신설 계기** |
| 2026-06-13 (확정) | 위 사건 캡처 4장으로 단정: Production·Preview·Development 3개 환경 **모두 Firebase 키 0개**. `.env.local`도 THENEWSAPI_TOKEN만 존재. 메모리 `project-a0-launch-pad-deployed.md`의 "Vercel env vars 설정"·"`.env.local`에 6개" 양쪽 모두 사실 아님 | P1, P3 | A-0 Launch Pad는 부분 배포 상태였음 (Firestore 룰만 OK, Firebase Client SDK 비작동) | "PR 머지 + Vercel 배포 성공" ≠ "기능 작동". 매 모듈마다 런타임 라이브 검증 의무. 메모리에 검증 캡처 첨부 의무 |
| 2026-06-11 ~ 2026-06-14 (3일 누적) | **메타 위반 — 문서 미준수.** ① 이전 세션 미검증 "완료" 기록(P3) → ② 사용자가 발견·검증 요청 → ③ VERIFICATION_DISCIPLINE.md **신설** → ④ **문서 신설 직후 P1 재위반**: 대표님의 ".env.local에 6개 있다" 증언을 bash cat 1회 결과로 "lib/firebase.ts 코드를 보신 것이 가장 유력"이라고 단정. 사용자 증언을 사실상 "fake" 취급 → ⑤ 실제로는 VS Code 미저장 버퍼. **Cmd+S 1회로 해소** | P1·P3 + **메타 위반(자가 작성 문서 미준수)** | **사용자 2일 손실.** 신뢰 심각한 손상. 단순 작업("저장 → 붙여넣기")이 3일짜리 분쟁으로 확대 | 1) 원칙 작성 ≠ 원칙 준수. **강제 장치 필요** → P5(사용자 증언 우선) 신설 + P1 금지 표현 6개 명시 + §7(자가 점검) + §8(분노 트리거) 신설. 2) 사용자 증언 신뢰 우선이 자기 도구 결과보다 우선함. 도구 1회 결과는 환경 차이(저장·캐시·경로) 가능성 항상 가짐 |
| 2026-06-15 | **PR #20 (D-1) Firebase Authorized domains 누락 사고.** ① D-1 핸드오프 v2.0 §10 Done-Definition에 "Vercel Preview 라이브 URL에서 로그인 흐름 1회 통과"는 있었지만 **Firebase Console 설정 단계 누락** → ② Claude Code가 Preview 배포 후 자가 검증을 안 했거나 못 했음 → ③ 대표님이 Preview에서 SIGN IN 클릭 → OAuth 팝업이 즉시 닫힘 → ④ Console 에러 메시지(`current domain is not authorized for OAuth operations`)로 원인 확인 → ⑤ Firebase Console에서 Preview 도메인 추가로 5분 만에 해소. **Cowork(나)가 이전 핸드오프에서도 §11 Superpowers를 "권장"으로만 적어 자동 그물망에서 빠뜨림** | P4(체크리스트) + **메타 위반(메모 `feedback-superpowers-in-handoff.md` 미준수)** | 대표 시간 손실. "왜 Superpowers 적용 안 했는지 다시 질책" | 1) `firebase-auth-domains` 체크리스트 신설(본 §3). 2) D-1 핸드오프 v2.1로 개정 — §11 Superpowers 자동 테스트 별도 섹션 강제 + Playwright E2E 4개 시나리오 필수 + Done-Definition에 Firebase Authorized domains 등록 의무 추가. 3) 메모 `feedback-superpowers-in-handoff.md` v2 강화(셀프체크리스트 4문항) + `feedback-firebase-auth-domains-checklist.md` 신설 + 핸드오프 템플릿 동일 갱신. **B안 정책 확정: PR마다 Preview 도메인 등록** |

---

## §5. CLAUDE.md 연계 (적용 방법)

`CLAUDE.md` 최상단 STOP 박스에 다음 한 줄을 추가한다:

> **인프라 작업(배포 · 환경변수 · DNS · Functions) 전 `docs/principles/VERIFICATION_DISCIPLINE.md` 4대 원칙 확인.**

우선순위:
```
MENTAL_MODEL.svg  ≥  VERIFICATION_DISCIPLINE.md  >  LANGUAGE.md  >  기타
```

---

## §7. 자가 점검 강제 (Self-Audit Trigger)

인프라/배포/환경설정 관련 응답을 **작성 직전**, §1 5대 원칙을 다시 읽는다. 위반 신호 1개라도 자가 검출되면 **응답 폐기 후 재작성**.

체크리스트 (응답 직전 1회):
- [ ] 증거 없이 단정 표현 썼나? (P1 금지 표현 6개 — "가장 유력" 등)
- [ ] "모릅니다" 회피 → "아마" 변명으로 도망쳤나? (P2)
- [ ] "X 완료" 적었는데 런타임 증거 없나? (P3)
- [ ] 체크리스트 한 줄도 ✅ 안 했나? (P4)
- [ ] **사용자 증언을 도구 1회 결과로 부정했나?** (P5)

---

## §8. 사용자 분노 트리거 (Escalation Protocol)

사용자가 다음 표현을 쓰면 **즉시 일반 응답 중단**:

- "시간 손실", "낭비", "왜 또", "X일 동안", "또 같은 실수", "분노/화/짜증", "wasted"

즉시 절차:
1. 사과·해명보다 먼저 — **최근 5턴 자가 감사**: 어떤 원칙을 어디서 위반했는지 표로 정리
2. 위반 사례 §4에 **신규 항목 정식 등록** (사실 그대로, 변명 없이)
3. 신규 위반 패턴이면 §1에 원칙 신설 또는 강화
4. 그 후에야 본론 작업 재개
5. 사과는 짧고 구체. **자기 비하·과도한 사과 금지** (도리어 사용자 시간 더 뺏음)

---

## §6. 메모리 연계

Cowork·Claude Code의 영구 메모리에 다음 항목을 유지:
- `feedback-evidence-before-diagnosis.md` — P1·P2 행동 규칙
- `feedback-deploy-verify-committed-state.md` — P3 검증 기준

새 위반 사례가 §4 로그에 들어갈 때마다, 그 사례에서 추출 가능한 행동 규칙이 있으면 메모리에 신규 feedback 항목으로 등록한다.

---

*© 2026 WorldCrown48 · VERIFICATION_DISCIPLINE.md v1.0*
*개정 주기: §4 위반 사례 추가 시마다 — 반복되는 학습은 §1 원칙으로 승급 검토.*
