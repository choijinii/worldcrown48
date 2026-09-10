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
import { crownActionState } from "@/lib/crown/crownActions";
import { matchSessionId } from "@/lib/analytics/matchSessionId";

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
  const isGuest = Boolean(user?.isAnonymous);
  // v2.1: 공유는 게스트에게도 열려 있고 저장(다운로드)만 로그인 게이트다 (§16 2·3).
  const { canShare, canSave } = crownActionState({ isSignedIn: Boolean(user) && !isGuest });

  const tournament = useVoteStore((s) => s.tournament);
  const contestants = useVoteStore((s) => s.contestants);
  const loadTournament = useVoteStore((s) => s.loadTournament);
  const run = useVoteStore((s) => s.run);

  // `?run=n` — 완주 화면의 "이전 참여의 Crown Card" 목록이 붙이는 회차. 없으면 현재 회차다.
  //
  // 이게 없으면 목록의 모든 링크가 **최신 카드로** 간다(2026-09-09 §7 검증에서 실측:
  // 1회차 링크를 눌렀는데 2회차 Champion이 떴다). AC 5의 "지난 판의 카드를 각각 조회"가
  // 보존만 되고 조회가 안 되던 지점이다.
  //
  // useSearchParams 대신 window 에서 읽는다 — 정적 렌더 경로에서 Suspense 경계를
  // 요구하지 않아 이 한 줄 때문에 빌드 형태를 바꾸지 않아도 된다.
  const [requestedRun, setRequestedRun] = useState<number | undefined>(undefined);
  useEffect(() => {
    const raw = Number(new URLSearchParams(window.location.search).get("run"));
    setRequestedRun(Number.isInteger(raw) && raw >= 1 ? raw : undefined);
  }, []);

  // 회차마다 진행 문서가 다르다 — 딥링크로 들어와도 그 계정의 그 회차를 본다.
  const progress = useRoundTransition(
    uid,
    tournamentId,
    requestedRun ?? run?.displayRunIndex,
  );
  const [loginOpen, setLoginOpen] = useState(false);

  // 판(회차) 열쇠 (EVENT_SPEC v1.2 ⑩) — 공유·저장 이벤트를 **그 판**에 묶는다. 딥링크로 들어온
  // 경우엔 `?run=` 이 가리키는 회차가 곧 그 판이다. 회차를 못 정했으면 키를 싣지 않는다.
  const shownRunIndex = requestedRun ?? run?.displayRunIndex;
  const msid =
    uid && shownRunIndex
      ? matchSessionId(uid, tournamentId, shownRunIndex)
      : null;

  useEffect(() => {
    if (uid) void loadTournament(tournamentId, uid, isGuest);
  }, [uid, tournamentId, loadTournament, isGuest]);

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
      <CrownCardModal data={data} canShare={canShare} canSave={canSave} onSignIn={() => setLoginOpen(true)} tournamentId={tournamentId} category={tournament.category} matchSessionId={msid ?? undefined} />
      <LoginModal
        isOpen={loginOpen}
        reason="share"
        onClose={() => setLoginOpen(false)}
        onSuccess={() => setLoginOpen(false)}
      />
    </>
  );
}
