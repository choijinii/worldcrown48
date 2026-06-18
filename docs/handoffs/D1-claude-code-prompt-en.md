# Claude Code Session Kickoff Prompt — D-1 The Locker Room (English)

> Usage
> 1) In terminal: `cd ~/Projects/worldcrown48 && claude`
> 2) Copy the entire content inside the ``` block below → paste into Claude Code chat → Enter
> 3) Claude Code will start from §0 self-verify

---

```
Hi. I'm the solo developer (CEO) of the worldcrown48 project.
This task is D-1 The Locker Room — Google social sign-in + GDPR data deletion.

## Task Order

Follow this handoff brief exactly, end to end. No improvisation.

  📄 docs/handoffs/D1-locker-room-handoff.md (v2.0, 2026-06-14)

This document was authored by Cowork (planning & docs role). §1~§10 plus
Appendix A~E together define the completion bar for a single PR.
Do not skip, shrink, or expand the scope on your own.

## Startup Procedure (strict order)

1. First, read docs/handoffs/D1-locker-room-handoff.md in full using the Read tool.
2. Then run §0 Self-Verify commands (§0.1 ~ §0.5) in order:
   - §0.1 Work location — current branch must be feat/d1-locker-room.
     If not, fetch latest main and create+push the branch.
   - §0.2 Existence check of 7 core files
   - §0.3 Dependency check (install zustand; confirm firebase-admin)
   - §0.4 Deprecated files absence check
   - §0.5 Policy sync check (MOST IMPORTANT) — `grep -c "비로그인 1회"`
     against docs/planning/WorldCrown48_v4_9.md must return ≥1; and
     `grep -n "익명 투표 없음"` must return nothing.
3. If ANY of §0.1~§0.5 fails, STOP IMMEDIATELY and report in Korean which
   check failed and the exact command output. Do not guess, work around,
   or proceed. (P1 principle in VERIFICATION_DISCIPLINE.md)
4. If all pass, read each of the 10 documents in §1 Pre-flight Checklist
   in order. Then restate the §2 Goal sentence back to me in Korean.
5. After that, start §3 Files to CREATE/MODIFY in the listed order.

## Working Principles

- Reply in Korean, polite tone. I'm a beginner coder.
  When you use English/technical acronyms (API, UI, SDK, etc.), put a
  short Korean explanation in parentheses.
- For anything you do not know, say so explicitly:
  "모릅니다 — 증거 ⓐⓑⓒ 중 하나가 필요합니다"
  Banned phrases: "아마 ~", "보통은 ~", "가장 유력" (see
  VERIFICATION_DISCIPLINE.md P1·P2).
- One thing per reply. No long option lists or auto-generated link dumps.
- Use TodoWrite to track progress through §3.
- After each file written, confirm TypeScript strict compilation passes.
- Commits: Conventional Commits format with Korean body.
  Example: "feat(d1): authStore Zustand 초기화 — Google sign-in 1단계"

## Hard Prohibitions

- ❌ Any violation of §5 Hard Constraints DON'T list in the handoff
- ❌ Showing Round Deadline, LIVE badge, winner prediction, or Vote Count
   (absolute numbers anywhere in UI)
- ❌ Using the words "FIFA" or "Official"
- ❌ Dark theme (Domain 4 is light theme — Immutable Principle #1)
- ❌ Storing raw uid in audit_log (must be SHA-256 hashed)
- ❌ Writing Apple sign-in code (Phase B, separate PR — see Appendix D)
- ❌ Skipping §0 self-verify and jumping into coding

## When Blocked

- Handoff vs. code conflict → handoff wins. If the doc needs a change,
  stop coding and report to me.
- lite-spec vs. higher-order plan (WorldCrown48_v4_9.md) conflict again
  → stop and report. No silent picking. (memory:
  feedback-verify-conflicting-specs)
- Infra work (Firebase Console, Vercel, DNS) → follow
  docs/principles/VERIFICATION_DISCIPLINE.md §3 checklists line by line
  and report each.

## Completion Bar

§10 Done-Definition checklist must be 100% green AND the live Vercel
Preview URL must demonstrate this end-to-end flow:

  1) Vote once without signing in
  2) Try a second vote → Google sign-in modal appears
  3) Sign in → the first vote gets linked to my account
  4) Open /account → click "내 데이터 삭제 요청"
  5) Type "DELETE" → confirm
  6) Auto sign-out, redirect to "/"
  7) Firestore Console: users·votes·cookieConsents cleared, audit_log
     gains 1 entry with a 64-char uidHash (no raw uid anywhere)

Then open a PR on GitHub with §10 checklist pasted in the body. Ping me
once it's ready. I'll merge to main and Vercel will auto-deploy.

Please begin from §0.1 now.
```

---

## Appendix — Common situations

### Q. "Claude Code reported §0.5 policy sync check FAILED"

→ The prefix PR (v4_9 + handoff v2.0 + memory changes) has not been merged
   to main yet. Choose one:

   A. Merge the prefix PR first, then run `git pull origin main` in Claude
      Code and retry. (Recommended.)
   B. Tell Claude Code to also pull those doc changes into the same branch:
      "Please cherry-pick the v4_9, handoff v2.0, and memory changes into
      feat/d1-locker-room as well, in their own commit."

### Q. "Claude Code stopped and asked me a question"

→ Good sign — it's honoring the no-guess rule. Paste the full question
   into Cowork (this chat) and I'll help craft an answer with you.

### Q. "How do I review the PR?"

→ Walk down §10 Done-Definition line by line. For any line you can't
   confirm as ✅, drop a PR comment: "This line not verified — please
   provide evidence (screenshot/log)."

---

*Prompt v1.0 · D-1 Claude Code session kickoff (English) · 2026-06-14*
