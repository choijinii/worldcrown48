/**
 * /arena/[tournamentId] — The Arena (Domain 3, Voter-facing).
 *
 * Wires the tested logic to the wireframe-matched components:
 *   voteStore.loadTournament → selectCurrentMatch → MatchView / FinalPickView
 *   vote → useVoteGate (guest 1 / daily 5) → onVote callable → optimistic addVote
 *   round complete → advanceRound writes roundProgress → useRoundTransition →
 *     RoundTransition overlay → (THE FINAL) Champion
 *
 * The bracket is never stored — it's recomputed from votes each render
 * (ADR-0001), so a refresh resumes at the exact current match.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";
import { useVoteGate } from "@/lib/voteGate";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/useT";
import { voteErrorMessageKey } from "@/lib/voteErrorCodes";
import { localizedTitle } from "@/lib/tournamentTitle";
import { LoginModal, type LoginReason } from "@/components/auth/LoginModal";
import type { Contestant } from "@/lib/types/tournament";
import {
  useVoteStore,
  selectCurrentMatch,
  selectCurrentRound,
  selectIsComplete,
} from "@/lib/arena/voteStore";
import { isFinalRound, type RoundIndex } from "@/lib/arena/roundConfig";
import { useRoundTransition } from "@/lib/arena/useRoundTransition";
import { MatchView } from "@/components/arena/MatchView";
import { ModuleNav } from "@/components/arena/ModuleNav";
import { FinalPickView } from "@/components/arena/FinalPickView";
import { RoundTransition } from "@/components/arena/RoundTransition";
import { CrownCardModal } from "@/components/crown/CrownCardModal";
import { toCrownData } from "@/lib/crown/championLoader";
import styles from "@/components/arena/arena.module.css";

function Center({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      role="status"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#f2f2f5",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

export default function ArenaPage(): JSX.Element {
  const tournamentId = String(useParams().tournamentId);
  const { t, lang } = useT();
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid;
  // Share/download require a real (non-anonymous) sign-in (AC-9/10).
  const canShare = Boolean(user && !user.isAnonymous);

  const tournament = useVoteStore((s) => s.tournament);
  const contestants = useVoteStore((s) => s.contestants);
  const loading = useVoteStore((s) => s.loading);
  const error = useVoteStore((s) => s.error);
  const loadTournament = useVoteStore((s) => s.loadTournament);
  const addVote = useVoteStore((s) => s.addVote);

  const { checkCanVote, onVoteSuccess } = useVoteGate();
  const progress = useRoundTransition(uid, tournamentId);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<LoginReason | null>(null);
  const [dismissedTo, setDismissedTo] = useState(0);

  useEffect(() => {
    if (uid) void loadTournament(tournamentId, uid);
  }, [uid, tournamentId, loadTournament]);

  const byId = useCallback(
    (id: string): Contestant | undefined => contestants.find((c) => c.id === id),
    [contestants],
  );

  const vote = useCallback(
    async (contestantId: string) => {
      const state = useVoteStore.getState();
      const match = selectCurrentMatch(state);
      if (!match || submitting) return;

      const gate = await checkCanVote(tournamentId);
      if (gate.status === "login_required") {
        setModal(gate.reason);
        return;
      }
      if (gate.status === "daily_limit_reached") {
        setModal("daily_limit");
        return;
      }

      setPickedId(contestantId);
      setSubmitting(true);
      try {
        const call = httpsCallable(getFunctionsInstance(), "onVote");
        await call({
          tournamentId,
          round: match.round,
          matchId: match.matchId,
          contestantId,
        });
        addVote({ round: match.round, matchId: match.matchId, contestantId });
        onVoteSuccess(tournamentId);
      } catch (e) {
        const code = (e as { code?: string }).code;
        // HF-3 W3: the Guest Run server guard rejects a policy-violating anon
        // vote (completed run / second Tournament) with permission-denied even
        // if the client gate was bypassed — surface the LoginModal, not a toast.
        if (code === "functions/permission-denied") {
          setModal("vote");
        } else {
          // #12: localize off the server's details.code (daily_limit /
          // rate_limited) — no more hardcoded Korean for en/es Voters.
          showToast(t(voteErrorMessageKey(e)), "error");
        }
      } finally {
        setSubmitting(false);
        setPickedId(null);
      }
    },
    [tournamentId, submitting, checkCanVote, addVote, onVoteSuccess, t],
  );

  const loginModal = (
    <LoginModal
      isOpen={modal !== null}
      reason={modal ?? "vote"}
      onClose={() => setModal(null)}
      onSuccess={() => setModal(null)}
    />
  );

  if (loading && !tournament) return <Center>불러오는 중…</Center>;
  if (error === "not-found" || (!loading && !tournament))
    return (
      <Center>
        토너먼트를 찾을 수 없어요.&nbsp;
        <a href="/" style={{ color: "#fcd006" }}>
          홈으로
        </a>
      </Center>
    );

  // Round transition (from roundProgress onSnapshot) — show before the next match.
  if (
    progress?.toRound &&
    !progress.complete &&
    progress.toRound > dismissedTo
  ) {
    return (
      <div className={styles.arena} data-arena-surface="transition">
        <RoundTransition
          fromRound={progress.fromRound as RoundIndex}
          toRound={progress.toRound as RoundIndex}
          onDone={() => setDismissedTo(progress.toRound as number)}
        />
      </div>
    );
  }

  const state = useVoteStore.getState();
  const complete = selectIsComplete(state) || Boolean(progress?.complete);
  if (complete) {
    // C-2: the Voter confirmed a Champion → auto-open the Crown Card modal in
    // place (AC-1). The champion is resolved from the per-Voter roundProgress
    // doc (championId) — never a global tournaments.status (§9 trap #1).
    const champ = progress?.championId ? byId(progress.championId) : null;
    if (champ && tournament) {
      const data = toCrownData(champ, tournament);
      return (
        <div className={styles.arena} data-arena-surface="champion">
          <CrownCardModal data={data} canShare={canShare} onSignIn={() => setModal("share")} tournamentId={tournamentId} />
          {loginModal}
        </div>
      );
    }
    // championId not yet readable (Eventarc trigger lag) — brief hold.
    return <Center>👑 Champion 확정 · Crown Card 준비 중…</Center>;
  }

  const match = selectCurrentMatch(state);
  const round = selectCurrentRound(state);
  if (!match || !tournament) return <Center>…</Center>;

  if (isFinalRound(round)) {
    const finalists = match.contestantIds
      .map(byId)
      .filter((c): c is Contestant => Boolean(c));
    return (
      <div className={styles.arena} data-arena-surface="final">
        <FinalPickView
          finalists={finalists}
          pickedId={pickedId}
          disabled={submitting}
          onPick={vote}
        />
        {loginModal}
      </div>
    );
  }

  const left = byId(match.contestantIds[0]);
  const right = byId(match.contestantIds[1]);
  if (!left || !right) return <Center>…</Center>;

  return (
    <>
      <ModuleNav tournamentId={tournamentId} />
      <div className={styles.arena} data-arena-surface="vs">
        <MatchView
          title={localizedTitle(tournament, lang)}
          left={left}
          right={right}
          pickedId={pickedId}
          loading={submitting}
          onVote={vote}
        />
        {loginModal}
      </div>
    </>
  );
}
