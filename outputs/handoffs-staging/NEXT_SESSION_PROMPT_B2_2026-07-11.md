# 다음 세션 킥오프 프롬프트 — B-2 (2026-07-11 작성)

> 이 파일 전체를 복사해서 새 Cowork 세션의 첫 메시지로 붙여넣으세요.

---

지난 세션(2026-07-11)에서 완료된 것 — 재확인 불필요:

1. **TX-0 SHIPPED**: PR #42 머지(e4a5a00) + functions·firestore rules 프로덕션 배포 + Phase D′ 라이브 워크스루 통과 (카테고리 10개 시드, 마이그레이션 dry-run=apply 일치, UNKNOWN 1건 콘솔 수정, Lab 드롭다운 검증). 대개편 문서 박제 19개도 PR #42에 커밋 완료
2. **B-2 선행 조건 2개 완전 실증**: ① TX-0 배포 ② AI Fill 새 키(versions/5) — 대표가 프로덕션 Lab에서 AI 추천 48명 채움 직접 확인. DP-1 무효 키 사건 종결. **B-2 걸림돌 0**
3. **참가 규칙 확정**: 하루 5회 = 전체 기준 신규 참가 5개(대회당 아님). 완주한 대회 재진입 → Crown Card + 배너 = 설계 의도(1계정 1완주)
4. **결함 발견 → B-2 편승**: 참가 한도 초과 메시지가 서버에 한국어 하드코딩(onVote.ts) → B-2 v2.3 스코프 #12로 등록됨
5. **재도전 결정 게이트 등록**: Arena 개편 설계 전 필수 결정 (B-2와 무관)

---

## STEP 1 — B-2 킥오프 (오늘의 본 작업)

**기준 핸드오프**: `outputs/handoffs-staging/B2-lab-flow-handoff-v2.3.md` (**v2.3이 최신** — v2.1·v2.2 무효)
**모듈 내용**: Lab 생성 플로우 5단계 개편 — AI를 관문에서 옵션으로 강등 + Deadline 폼(UX-3) + Navbar Locker Room 복원(UX-1) + 오탈·한도 메시지 3언어화 편승

이번엔 특별 절차 없음 — 문서가 전부 main에 커밋되어 있어서 표준 절차입니다:

```bash
# ① 워크트리 생성
cd ~/Projects/worldcrown48
git fetch origin
git worktree add ~/Projects/wc48-b2 -b feat/b2-lab-flow origin/main

# ② 핸드오프를 워크트리로 복사 (스테이징 파일은 커밋 전이라 워크트리에 없음)
cp outputs/handoffs-staging/B2-lab-flow-handoff-v2.3.md ~/Projects/wc48-b2/docs/handoffs/
```

③ 그 다음 Claude Code에서 B-2 핸드오프로 kickoff (기존 auto mode + Auto-STOP 패턴, §11 Superpowers TDD 포함 확인).

**Cowork(너)의 역할**: 절차 단계별 안내·검증, 진행 중 막히면 evidence-based 진단, 완료 후 Phase D′ 시각 검증(직접 입력만으로 발행 1회 + AI 경로 발행 1회 + ?lang=en 한도 토스트 확인)과 머지·배포(`--project worldcrown48` 명시) 확인.

---

## STEP 2 — 병행 작업 (B-2 돌아가는 동안)

1. **K-POP·CREATOR 이미지 소싱** — 7월말 런칭의 진짜 병목. `outputs/handoffs-staging/WC48_sourcing-tracker_2026-07-11.xlsx` 트래커가 있으니 이어서 진행 (Level 2 수동 승인 원칙)
2. **TX-0 워크트리 정리** (§16 Post-Merge Cleanup — 머지 확인됐으므로 안전):
```bash
cd ~/Projects/worldcrown48
git worktree remove ~/Projects/wc48-tx0
git branch -d feat/tx0-taxonomy 2>/dev/null; git fetch --prune
```
3. **지난 세션 뒷정리 3줄 미실행이면** (실행했는지 대표에게 먼저 확인):
```bash
git stash drop stash@{0}   # wc48-predeploy-redundant-docs (머지본과 동일 확인됨)
mkdir -p ~/.wc48-keys && mv ~/Downloads/worldcrown48-firebase-adminsdk-*.json ~/.wc48-keys/
```

---

## 미결 이월 (범위 밖, 잊지 말 것)

- **재도전 결정 게이트**: Arena 개편 설계 전 필수 — 쟁점 4개는 [[tx0-shipped-2026-07-11]]에 정리됨
- 디자인 토론: 동적 1:1 VS 매치·히어로 연출 + 디자인 시스템 v2.3/v2.4 반영 대기 + MENTAL_MODEL.svg 갱신
- SNS 공유 고도화 리서치 (Crown Card OG·공유 인텐트)
- 랭킹 개편(Crown Score) 구현 시: 콜드스타트 처리 · T-1~T-4 재검토
- 유실된 스테이징 산출물 재생성 필요 시: 결정 문서 v1.2·리서치 보고서 — 핵심 내용은 PR #42 박제 문서(CLAUDE.md v2.2·LANGUAGE.md v1.7)와 메모리에 보존됨
- E2E 워크플로우 일괄 정리 (frozen Preview URL + hf3-e2e.yml 신설 + C-1 공유 프리뷰 429)
- Anthropic 콘솔 안 쓰는 API 키 삭제 (보안 — 이번에 구키도 추가됐을 수 있으니 콘솔에서 확인)
- EN 푸터 "Cookie 설정 다시 열기" 한글 노출
- functions Node.js 20 런타임 2026-10-30 지원 종료 + firebase-functions 구버전 업그레이드 권고 (TX-0 배포 로그에서 재확인됨)
- firebase CLI 활성 프로젝트 꼬임 — 배포는 `--project worldcrown48` 명시

---

## 필독 메모리

[[tx0-shipped-2026-07-11]] [[project-reorg-ux-decisions-2026-07-10]] [[feedback-handoff-copy-into-worktree]] [[feedback-cross-verify-before-presenting]] [[feedback-superpowers-in-handoff]] [[feedback-detailed-session-handoff]] [[project-lab-flow-redesign-2026-07-05]]

---
*작성: Cowork TX-0 Phase D′ 세션 2026-07-11 · 다음 갱신: B-2 완료 시*
