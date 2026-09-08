/**
 * /arena/[tournamentId] — The Arena (Domain 3, Voter-facing).
 *
 * Wires the tested logic to the wireframe-matched components:
 *   voteStore.loadTournament → resolveActiveRun(회차) → selectCurrentMatch →
 *     MatchView / FinalPickView
 *   vote → onVote callable → optimistic addVote (클라 게이트 없음 — 아래 참조)
 *   round complete → advanceRound writes roundProgress/{uid}_{tid}[_r{n}] →
 *     useRoundTransition → RoundTransition overlay → (THE FINAL) Champion
 *   완주 → CrownCardModal + RunCompleteActions([다시 참여] · 이전 참여 카드)
 *
 * The bracket is never stored — it's recomputed from votes each render
 * (ADR-0001), so a refresh resumes at the exact current match.
 *
 * RUN-1 v2.1: **회차와 한도 판정은 `voteStore` 한 곳에만 있다.** 이 페이지는 `run.screen`
 * 을 그리고 서버 오류의 `details.code` 로 모달을 고를 뿐, 스스로 판정하지 않는다 —
 * 판정이 두 곳이면 답도 두 개가 되고 그게 §9 함정 5다.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/useT";
import { trackWithConsent } from "@/lib/analytics";
import {
  commonEventParams,
  markTournamentStart,
  readTournamentDurationSec,
  resolveEntryPoint,
  roundParam,
} from "@/lib/analytics/funnelEvents";
import { voteErrorDetailCode, voteErrorMessageKey, VOTE_ERROR_CODES } from "@/lib/voteErrorCodes";
import { localizedTitle } from "@/lib/tournamentTitle";
import { LoginModal, type LoginReason } from "@/components/auth/LoginModal";
import type { Contestant } from "@/lib/types/tournament";
import {
  useVoteStore,
  selectCurrentMatch,
  selectCurrentRound,
  selectIsComplete,
} from "@/lib/arena/voteStore";
import { arenaScreenState } from "@/lib/arena/arenaScreen";
import { isFinalRound, type RoundIndex } from "@/lib/arena/roundConfig";
import { useRoundTransition } from "@/lib/arena/useRoundTransition";
import { MatchView } from "@/components/arena/MatchView";
import { ModuleNav } from "@/components/arena/ModuleNav";
import { FinalPickView } from "@/components/arena/FinalPickView";
import { RoundTransition } from "@/components/arena/RoundTransition";
import { CrownCardModal } from "@/components/crown/CrownCardModal";
import { RunCompleteActions } from "@/components/arena/RunCompleteActions";
import { toCrownData } from "@/lib/crown/championLoader";
import { crownActionState } from "@/lib/crown/crownActions";
import { loadOrCreateBracketSeed } from "@/lib/arena/bracketSeed";
import { getDb } from "@/lib/firebase";
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

export default function ArenaPage(): JSX.Element {
  const tournamentId = String(useParams().tournamentId);
  const { t, lang } = useT();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const uid = user?.uid;
  const isGuest = Boolean(user?.isAnonymous);
  // v2.1 (§16 2·3): 공유는 게스트에게 열렸고 **저장(다운로드)만** 로그인 게이트다.
  const { canShare, canSave } = crownActionState({ isSignedIn: Boolean(user) && !isGuest });

  const tournament = useVoteStore((s) => s.tournament);
  const contestants = useVoteStore((s) => s.contestants);
  const loading = useVoteStore((s) => s.loading);
  const error = useVoteStore((s) => s.error);
  const loadTournament = useVoteStore((s) => s.loadTournament);
  const addVote = useVoteStore((s) => s.addVote);
  // 회차는 스토어가 단독으로 정한다 — 화면은 읽기만 한다(§9 함정 5).
  const run = useVoteStore((s) => s.run);
  const seed = useVoteStore((s) => s.seed);

  const progress = useRoundTransition(uid, tournamentId, run?.displayRunIndex);

  // ── 계측 소킥 A (2026-08-30) — 투표 퍼널 4단계 ────────────────────────────
  // tournament_start / round_advance(48·24·12·6·final) / champion_confirmed.
  // 전부 "실제 이 화면에서 지금 막 일어난 일"만 기록한다 — /champion 딥링크
  // 재방문·타인의 공유 링크 열람에서는 안 찍히도록 이 페이지(투표 세션 본인)
  // 쪽에만 붙였다. ref들은 같은 값으로 두 번 안 쏘게 막는 가드일 뿐이다.
  const tournamentStartFiredRef = useRef<string | null>(null);
  const roundAdvanceFiredRef = useRef<number | null>(null);
  const championFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tournament) return;
    if (tournamentStartFiredRef.current === tournament.id) return;
    tournamentStartFiredRef.current = tournament.id;
    markTournamentStart(tournament.id);
    void trackWithConsent("tournament_start", {
      ...commonEventParams(tournament, isGuest, lang),
      entry_point: resolveEntryPoint(),
    });
  }, [tournament, isGuest, lang]);

  useEffect(() => {
    if (!tournament || !progress?.toRound || progress.complete) return;
    if (roundAdvanceFiredRef.current === progress.toRound) return;
    roundAdvanceFiredRef.current = progress.toRound;
    // toRound로 전환 중이라는 건 방금 fromRound를 다 통과했다는 뜻 — round_advance는
    // "막 완료한 라운드" 값을 보낸다.
    const completedRound = (progress.fromRound ?? progress.toRound - 1) as RoundIndex;
    void trackWithConsent("round_advance", {
      ...commonEventParams(tournament, isGuest, lang),
      round: roundParam(completedRound),
    });
  }, [tournament, progress?.toRound, progress?.fromRound, progress?.complete, isGuest, lang]);

  useEffect(() => {
    if (!tournament || !progress?.complete || !progress.championId) return;
    if (championFiredRef.current === progress.championId) return;
    championFiredRef.current = progress.championId;
    // THE FINAL 통과도 round_advance 시퀀스의 마지막 한 걸음이라 같이 보낸다
    // (EVENT_SPEC.md §2: "48 → 24 → 12 → 6 → FINAL").
    void trackWithConsent("round_advance", {
      ...commonEventParams(tournament, isGuest, lang),
      round: "final",
    });
    const durationSec = readTournamentDurationSec(tournament.id);
    void trackWithConsent("champion_confirmed", {
      ...commonEventParams(tournament, isGuest, lang),
      champion_id: progress.championId,
      ...(durationSec !== null ? { duration_sec: durationSec } : {}),
    });
  }, [tournament, progress?.complete, progress?.championId, isGuest, lang]);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<LoginReason | null>(null);
  const [dismissedTo, setDismissedTo] = useState(0);

  useEffect(() => {
    if (uid) void loadTournament(tournamentId, uid, isGuest);
  }, [uid, tournamentId, loadTournament, isGuest]);

  // [다시 참여]로 회차가 올라가면 씨앗도 그 회차 문서에서 새로 받아야 한다 — 안 그러면
  // seed 0으로 대진이 만들어져 "판마다 대진표가 다르다"(AC 3)가 깨진다.
  useEffect(() => {
    const idx = run?.displayRunIndex;
    if (!uid || !idx || seed !== 0) return;
    let cancelled = false;
    void loadOrCreateBracketSeed(getDb(), uid, tournamentId, idx).then((s) => {
      if (!cancelled) useVoteStore.setState({ seed: s });
    });
    return () => {
      cancelled = true;
    };
  }, [uid, tournamentId, run?.displayRunIndex, seed]);

  const byId = useCallback(
    (id: string): Contestant | undefined => contestants.find((c) => c.id === id),
    [contestants],
  );

  const vote = useCallback(
    async (contestantId: string) => {
      const state = useVoteStore.getState();
      const match = selectCurrentMatch(state);
      if (!match || submitting) return;

      // 클라이언트 게이트를 여기서 다시 돌리지 않는다. `run.screen` 이 이미 그 답이고,
      // "play" 가 아니면 이 화면 자체가 안 그려져 vote() 가 호출되지 않는다 — 판정이
      // 스토어 한 곳에만 남아 §9 함정 5가 구조로 막힌다. 서버가 최종 판정자다(§5 DO 2).
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
      } catch (e) {
        const detail = voteErrorDetailCode(e);
        // 막는 것과 왜 막혔는지 알려주는 것은 한 쌍이다(§14). 서버가 실은 코드로 갈라
        // 각각 제 화면을 띄운다 — 전부 일반 실패 배너로 흘리면 2026-09-06 P0가 재발한다.
        if (detail === VOTE_ERROR_CODES.GUEST_LIMIT) {
          // Google 버튼이 함께 뜨는 전환 지점 (AC 17).
          setModal("guest_limit");
        } else if (detail === VOTE_ERROR_CODES.DAILY_LIMIT) {
          setModal("daily_limit");
        } else {
          // deadline_passed 는 voteErrorMessageKey 가 마감 안내로 매핑한다.
          showToast(t(voteErrorMessageKey(e)), "error");
        }
        // 서버 판정과 화면을 다시 맞춘다 — 클라 게이트를 없앴으므로 재로드가 정합의 수단이다.
        if (uid) void loadTournament(tournamentId, uid, isGuest);
      } finally {
        setSubmitting(false);
        setPickedId(null);
      }
    },
    [tournamentId, submitting, addVote, t, uid, isGuest, loadTournament],
  );

  const loginModal = (
    <LoginModal
      isOpen={modal !== null}
      reason={modal ?? "vote"}
      onClose={() => setModal(null)}
      onSuccess={() => setModal(null)}
    />
  );

  // Which screen to show — pure, unit-tested in __tests__/arena/arenaScreen.
  // Previously inline here, where an unresolved uid fell through to the
  // not-found branch and flashed "찾을 수 없어요" on every entry (verdict §10.1).
  const screen = arenaScreenState({
    authLoading,
    uid,
    loading,
    hasTournament: Boolean(tournament),
    error,
  });

  if (screen === "loading") return <Center>{t("arena.load.loading")}</Center>;
  if (screen === "not-found")
    return (
      <Center>
        {t("arena.load.notFound")}&nbsp;
        <a href="/" style={{ color: "var(--color-gold)" }}>
          {t("arena.load.home")}
        </a>
      </Center>
    );
  if (screen === "load-failed")
    return (
      <Center>
        <div>
          <p style={{ marginBottom: 16 }}>{t("arena.load.failed")}</p>
          <button
            type="button"
            // With a uid we can just re-run the load. Without one the failure
            // is upstream (auth never resolved a user), so a reload is the only
            // thing that can actually recover.
            onClick={() =>
              uid
                ? void loadTournament(tournamentId, uid, isGuest)
                : window.location.reload()
            }
            style={{
              background: "var(--color-gold)",
              color: "var(--color-bg-default)",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("arena.load.retry")}
          </button>
          &nbsp;
          <a href="/" style={{ color: "var(--color-gold)" }}>
            {t("arena.load.home")}
          </a>
        </div>
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

  // 게스트가 오늘 3판을 다 쓰고 새 대회에 들어온 경우 — 안내 3지점 중 ③.
  // 완주 화면보다 앞에 둘 수 없다: 완주한 판이 있으면 그 카드를 먼저 보여줘야 한다.
  if (run?.screen === "guest_limit") {
    return (
      <div className={styles.arena} data-arena-surface="guest-limit">
        <Center>
          <div>
            <p style={{ marginBottom: 16 }}>{t("login.guest_limit.title")}</p>
            <button
              type="button"
              onClick={() => setModal("guest_limit")}
              style={{
                background: "var(--color-gold)",
                color: "var(--color-bg-default)",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("login.guest_limit.sub")}
            </button>
          </div>
        </Center>
        {loginModal}
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
          <CrownCardModal data={data} canShare={canShare} canSave={canSave} onSignIn={() => setModal("share")} tournamentId={tournamentId} category={tournament.category} />
          {run && uid ? (
            <RunCompleteActions
              run={run}
              uid={uid}
              tournamentId={tournamentId}
              isGuest={isGuest}
              nameOf={(id) => byId(id)?.name}
              onPlayAgain={() => useVoteStore.getState().startNextRun()}
              onSignIn={() => setModal("guest_limit")}
            />
          ) : null}
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
        {/* 게스트 안내 ① — 첫 진입(아직 한 판도 안 쓴 상태)에만 보인다. */}
        {isGuest && run?.runsToday === 0 ? (
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--color-text-muted)",
              margin: "var(--space-3) 0 0",
            }}
          >
            {t("arena.guest.welcome")}
          </p>
        ) : null}
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
