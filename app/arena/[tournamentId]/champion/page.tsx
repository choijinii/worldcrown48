/**
 * /arena/[tournamentId]/champion — the Crown Card destination.
 *
 * The shareable / deep-linkable home of a Voter's Crown Card (handoff §3). Reads
 * the per-Voter `roundProgress/{uid}_{tid}` doc (C-1, ADR-0005) — NOT a global
 * `tournaments.status` (there is none in the per-Voter model, §9 trap #1). When
 * the Voter has confirmed a Champion, it resolves the Contestant via
 * championLoader and opens the dark Crown Card modal.
 *
 * Thin glue over tested logic (championLoader / lib/crown/*) — E2E-covered.
 */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { useVoteStore } from "@/lib/arena/voteStore";
import { useRoundTransition } from "@/lib/arena/useRoundTransition";
import { LoginModal } from "@/components/auth/LoginModal";
import { CrownCardModal } from "@/components/crown/CrownCardModal";
import { ReturningCardBanner } from "@/components/crown/ReturningCardBanner";
import { ModuleNav } from "@/components/arena/ModuleNav";
import { resolveChampionId, toCrownData } from "@/lib/crown/championLoader";

function Center({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      role="status"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text)",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

export default function ChampionPage(): JSX.Element {
  const tournamentId = String(useParams().tournamentId);
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid;
  const canShare = Boolean(user && !user.isAnonymous);

  const tournament = useVoteStore((s) => s.tournament);
  const contestants = useVoteStore((s) => s.contestants);
  const loadTournament = useVoteStore((s) => s.loadTournament);
  const progress = useRoundTransition(uid, tournamentId);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (uid) void loadTournament(tournamentId, uid);
  }, [uid, tournamentId, loadTournament]);

  // No confirmed Champion yet (or still loading the per-Voter doc).
  if (!progress?.complete || !progress.championId) {
    return (
      <Center>
        아직 확정된 Champion이 없어요.&nbsp;
        <a href={`/arena/${tournamentId}`} style={{ color: "var(--color-gold)" }}>
          The Arena로
        </a>
      </Center>
    );
  }

  // Guard against the shared voteStore still holding a DIFFERENT tournament
  // (deep-link before loadTournament resolves) — never render a stale card.
  if (!tournament || tournament.id !== tournamentId) return <Center>Crown Card 불러오는 중…</Center>;

  const championId = resolveChampionId(progress);
  const champion = contestants.find((c) => c.id === championId);
  if (!champion) return <Center>Crown Card 불러오는 중…</Center>;

  const data = toCrownData(champion, tournament);

  return (
    <>
      <ReturningCardBanner tournamentId={tournamentId} />
      <ModuleNav tournamentId={tournamentId} />
      <CrownCardModal data={data} canShare={canShare} onSignIn={() => setLoginOpen(true)} tournamentId={tournamentId} />
      <LoginModal
        isOpen={loginOpen}
        reason="share"
        onClose={() => setLoginOpen(false)}
        onSuccess={() => setLoginOpen(false)}
      />
    </>
  );
}
