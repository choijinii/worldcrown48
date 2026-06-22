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
import { FinalPickView } from "@/components/arena/FinalPickView";
import { RoundTransition } from "@/components/arena/RoundTransition";
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
  const uid = useAuthStore((s) => s.user?.uid);

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
        onVoteSuccess();
      } catch (e) {
        const code = (e as { code?: string }).code;
        showToast(
          code === "functions/resource-exhausted"
            ? "잠시 후 다시 시도해주세요."
            : "투표에 실패했어요. 다시 시도해주세요.",
          "error",
        );
      } finally {
        setSubmitting(false);
        setPickedId(null);
      }
    },
    [tournamentId, submitting, checkCanVote, addVote, onVoteSuccess],
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
    const champ = progress?.championId ? byId(progress.championId) : null;
    return (
      <Center>
        <div>
          <div style={{ fontSize: 44 }}>👑</div>
          <div style={{ color: "#fcd006", fontWeight: 800, fontSize: 22 }}>
            Champion 확정{champ ? ` · ${champ.name}` : ""}
          </div>
        </div>
      </Center>
    );
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
    <div className={styles.arena} data-arena-surface="vs">
      <MatchView
        title={tournament.title}
        left={left}
        right={right}
        pickedId={pickedId}
        loading={submitting}
        onVote={vote}
      />
      {loginModal}
    </div>
  );
}
