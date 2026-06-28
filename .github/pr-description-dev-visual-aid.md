## dev-visual-aid — Dev Nav · Language Toggle · Seed Unification · imageUrl Spec · Handoff v2.1

Phase 2 PR B. Infra-only aid (zero Voter exposure) so a designer can spot-check the 7 domains and switch language without editing URLs, plus a unified preview seeder and forward-looking docs.

> **⚠️ Draft.** CI E2E is **skipped (not failed)** until `DEV_VISUAL_AID_PREVIEW_URL` + `DEV_VISUAL_AID_TEST_UID` secrets and a Vercel Preview are provisioned, and the Preview domain is added to **Firebase Auth → Authorized domains** (same provisioning every prior module needed — [[feedback-firebase-auth-domains-checklist]]). Unit + tsc run and pass now.

### What shipped (5 phases, TDD)

| Phase | Work | Tests |
|---|---|---|
| A | `LanguageToggle` 🌐 dropdown (ADR-0007) — header right, `?lang=` + `<html lang>` sync, ARIA listbox | 9 unit + 2 E2E |
| B | Dev Nav FAB + sheet (ADR-0008) — `Cmd/Ctrl+Shift+D`, localStorage, 7 domains | 12 unit + 4 E2E |
| C | `functions/scripts/seed-preview.mjs` — `--module=all\|…`, `--cleanup`, `--deadline`, idempotent, prod-blocked | 11 unit (CLI) |
| D | `docs/lite-specs/imageUrl-source.md` (ADR-0009) | — |
| E | `docs/templates/handoff-v2.1.md` (+§0.5 Stack Truth, §11.5 Phase D′, §12/§13/§14) | — |

**216 unit tests green · `tsc --noEmit` clean.**

> **Decisions made under Auto-STOP #7 (stack conflict):** the v1.0 handoff assumed pnpm / component-tests / framer-motion / `seed-c*.mjs` — none exist here. 대표 chose to **follow repo conventions**: pure logic in `lib/` + Vitest, UI via Playwright E2E, CSS-only animation. The new handoff-v2.1 template's §0.5 encodes the real stack so this can't recur.

> **Known nuance:** the Language Toggle lives in `gnb-actions`, which existing `globals.css` hides at ≤768px (same as SIGN IN) — so it's desktop-only, matching "beside SIGN IN" literally. Mobile language switching remains on policy pages. Flag if mobile header placement is wanted (separate scope).

---

## 🔎 Visual Verification Entry Guide (§14)

Preview (branch alias — **not** a deploy-hash URL, [[feedback-deployed-version-stale]]):

```
https://worldcrown48-git-feat-dev-visual-aid-choijiniis-projects.vercel.app
```

### A. Dev Nav 활성화
1. Preview 진입 → `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Win)
2. 우측 하단 ⚙️ (Crown Gold) 노출 확인
3. ⚙️ 클릭 → 시트 펼침 → 7 도메인 링크 (Locker Room = "Coming soon" disabled)

### B. 한/영 토글
1. 헤더 우측 `🌐 KO` 클릭 → 드롭다운
2. **English** 선택 → URL `?lang=en` + `<html lang="en">` + 본문 전환
3. 키보드: Tab→Enter→↑↓→Enter, Escape로 닫힘(트리거로 포커스 복귀)

### C. 직접 진입 URL (Dev Nav 없이도 확인 가능)
| 도메인 | URL |
|---|---|
| Launch Pad | `/` |
| Arena VS | `/arena/dev-preview` |
| Arena Ranking | `/arena/dev-preview/ranking` |
| Lab | `/admin/lab` |
| Policies | `/policies/privacy` |
| Account | `/account` |

### D. seed 명령 (Arena 링크가 데이터를 가지려면 먼저 실행)
```bash
export FIREBASE_ADMIN_SDK_KEY='<key>'
node functions/scripts/seed-preview.mjs --module=all          # 전체 시드
node functions/scripts/seed-preview.mjs --module=c3 --deadline=past   # 랭킹 deadline 게이트
node functions/scripts/seed-preview.mjs --module=all --cleanup       # 정리
```

### E. 디자이너 시각 점검 체크리스트
- [ ] ⚙️ 버튼이 Crown Gold (#FCD006)
- [ ] 시트 펼침이 부드러운지 (CSS transition)
- [ ] Locker Room "Coming soon" disabled
- [ ] 모바일 320px에서 ⚙️ 위치 적절 (SNS 공유 z-index 9 < FAB 60 — 충돌 없음)
- [ ] 🌐 드롭다운 펼침 위치·hover 일관성
- [ ] 금지 패턴 0건 (라운드 HUD · LIVE 배지 · Vote Count)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
