# Claude Code 세션 시작 프롬프트 — D-1 The Locker Room

> 사용법
> 1) 터미널에서 `cd ~/Projects/worldcrown48 && claude` 실행
> 2) 아래 코드블록(``` 안쪽) 전체를 복사 → Claude Code 채팅창에 붙여넣고 Enter
> 3) Claude Code가 §0 자가검증부터 시작합니다

---

```
안녕하세요. 저는 worldcrown48 프로젝트의 1인 개발자(대표)입니다.
이번 작업은 D-1 The Locker Room — Google 소셜 로그인 + GDPR 데이터 삭제 구현입니다.

## 작업 지시

다음 핸드오프 브리프를 처음부터 끝까지 그대로 따라 진행해 주세요.

  📄 docs/handoffs/D1-locker-room-handoff.md (v2.0, 2026-06-14)

이 문서는 Cowork(기획·문서 담당)에서 작성한 것이며, §1~§10 + 부록 A~E까지가
한 PR의 완성 기준입니다. 임의 변경·생략·확장 금지입니다.

## 시작 절차 (반드시 이 순서)

1. 먼저 docs/handoffs/D1-locker-room-handoff.md 전문을 Read 도구로 읽으세요.
2. 그 다음 §0 자가검증 (§0.1 ~ §0.5) 명령을 순서대로 실행하세요.
   - §0.1 작업 위치 검증 — 현재 브랜치가 feat/d1-locker-room 이 아니면
     main 최신을 받아 새 브랜치를 만들고 origin에 push.
   - §0.2 핵심 파일 7개 존재 검증
   - §0.3 의존성 검증 (zustand 신규 설치, firebase-admin 확인)
   - §0.4 deprecated 파일 부재 검증
   - §0.5 정책 동기화 검증 (가장 중요 — v4_9에 "비로그인 1회" 1건 이상,
     "익명 투표 없음" 0건이어야 함)
3. 0.1~0.5 중 하나라도 실패하면 **즉시 멈추고 어떤 검증이 실패했는지 한국어로
   보고**해 주세요. 절대 임의로 우회·추측·진행하지 마세요. (P1 원칙)
4. 모두 통과하면 §1 Pre-flight Checklist 10개 문서를 차례로 Read 하고
   §2 Goal 문장 1줄을 다시 한국어로 복창해 주세요.
5. 그 후 §3 Files to CREATE/MODIFY 순서대로 코드 작성.

## 작업 원칙

- 응답은 한국어 존댓말로 부드럽게 해 주세요. 저는 코딩 초보자입니다.
  영어 약어(API·UI·SDK 등)는 괄호 안에 쉬운 설명을 붙여 주세요.
- 모르는 것은 "모릅니다 — 증거 ⓐⓑⓒ 중 하나가 필요합니다"라고 명시해 주세요.
  추측·"아마 ~"·"보통 ~" 같은 표현 금지. (docs/principles/VERIFICATION_DISCIPLINE.md
  의 P1·P2 원칙)
- 한 응답에 한 가지 일만. 긴 옵션·자동 링크 금지.
- TodoWrite 도구로 §3 파일 작성 진행 상태를 관리해 주세요.
- 매 파일 작성 후 TypeScript strict 컴파일 통과 확인.
- 커밋 메시지는 Conventional Commits 형식 + 한국어 본문.
  예: "feat(d1): authStore Zustand 초기화 — Google sign-in 1단계"

## 절대 금지

- ❌ 핸드오프 §5 Hard Constraints DON'T 항목 위반
- ❌ Round Deadline·LIVE 배지·우승자 예측·Vote Count(절대 수치) 표시
- ❌ FIFA·Official 문자 사용
- ❌ 다크 테마 (D4는 라이트)
- ❌ uid 원문을 audit_log 에 저장 (반드시 SHA-256 해시)
- ❌ Apple 로그인 코드 작성 (Phase B 별도 PR — 부록 D 참조)
- ❌ §0 검증을 건너뛰고 코드 작성 시작

## 막혔을 때

- 핸드오프 문서와 코드가 충돌 → 핸드오프 우선. 문서 수정이 필요하면
  코드를 멈추고 저에게 보고.
- lite-spec 과 상위 기획서(WorldCrown48_v4_9.md) 가 또 충돌 → 즉시 보고.
  임의 선택 금지. (메모리 feedback-verify-conflicting-specs 참조)
- Firebase Console·Vercel 등 인프라 작업이 필요 → docs/principles/VERIFICATION_DISCIPLINE.md
  의 §3 체크리스트 한 줄씩 보고하며 진행.

## 완료 기준

§10 Done-Definition 체크리스트 전 항목 통과 + 라이브 Vercel Preview URL에서
다음 흐름이 작동:

  비로그인 첫 투표 → 두 번째 투표 시도 → Google 로그인 모달 → 로그인 성공
  → 첫 투표가 본인 계정으로 연결됨 → /account → "데이터 삭제 요청" →
  "DELETE" 입력 → 삭제 완료 → 자동 로그아웃 → "/"

그 후 PR(Pull Request)을 GitHub에 제출하고 본문에 §10 체크리스트를 붙여
저에게 알려 주세요. 제가 main에 머지하면 Vercel이 자동 배포합니다.

지금 §0.1 부터 시작해 주세요.
```

---

## 부록 — 자주 묻는 상황

### Q. "Claude Code 가 §0.5 정책 동기화 검증 실패라고 보고했어요"

→ 선행 PR(v4_9 + 핸드오프 v2.0 + 메모리 변경)을 아직 main 에 머지하지 않은
   상태입니다. 다음 중 한 가지를 선택:

   A. 선행 PR을 먼저 머지한 후 Claude Code 에서 `git pull origin main` 하고
      재시도 (권장)
   B. 같은 브랜치 `feat/d1-locker-room` 에 문서 변경분도 함께 포함시키도록
      Claude Code 에 지시 → "v4_9·핸드오프 v2.0·메모리 변경분도 본 브랜치에
      체리픽해서 함께 커밋해 주세요" 라고 한 줄 추가

### Q. "Claude Code 가 도중에 멈추고 질문해요"

→ 좋은 신호입니다. 임의 진행 금지 원칙을 지키고 있다는 뜻이에요.
   질문 전문을 Cowork(여기)에 그대로 붙여넣어 주시면 함께 답변을 만들겠습니다.

### Q. "PR 검수가 어려워요. 뭘 봐야 하나요?"

→ §10 Done-Definition 체크리스트만 한 줄씩 따라가시면 됩니다. 한 줄이라도
   ✗ 면 PR 본문에 "이 줄 미통과 — 증거 부탁드려요" 라고 댓글 달아 주세요.

---

*프롬프트 v1.0 · D-1 Claude Code 세션 시작용 · 2026-06-14*
