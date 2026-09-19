/**
 * /arena/[tournamentId] — The Arena (Domain 3, Voter-facing).
 *
 * Wires the tested logic to the wireframe-matched components:
 *   voteStore.loadTournament → resolveActiveRun(회차) → selectCurrentMatch →
 *     SplitStage(ARENA-1 VS 스플릿 무대) / FinalPickView
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
  markFirstVote,
  markTournamentStart,
  readTournamentDurationSec,
  resolveEntryPoint,
  roundParam,
} from "@/lib/analytics/funnelEvents";
import { matchSessionId } from "@/lib/analytics/matchSessionId";
import { voteErrorDetailCode, voteErrorMessageKey, VOTE_ERROR_CODES } from "@/lib/voteErrorCodes";
import { GUEST_DAILY_RUN_LIMIT } from "@/lib/run/guestRun";
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
import { SplitStage } from "@/components/arena/SplitStage";
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

  // ── 판(회차) 단위 계측 (EVENT_SPEC v1.2 ⑩ · RUN-1 PR 3) ────────────────────
  // 한 사람이 같은 대회를 하루 5판까지 돈다. 회차가 이벤트에 안 실리면 완주율·이탈 라운드가
  // 판 단위로 안 나뉜다. `run` 은 `tournament` 와 **같은 set() 으로 함께** 들어오므로
  // (voteStore.loadTournament), 아래 이벤트들이 도는 시점엔 이미 값이 있다.
  const runIndex = run?.displayRunIndex;
  const msid =
    uid && runIndex ? matchSessionId(uid, tournamentId, runIndex) : null;

  // ── 계측 소킥 A (2026-08-30) — 투표 퍼널 4단계 ────────────────────────────
  // tournament_start / round_advance(48·24·12·6·final) / champion_confirmed.
  // 전부 "실제 이 화면에서 지금 막 일어난 일"만 기록한다 — /champion 딥링크
  // 재방문·타인의 공유 링크 열람에서는 안 찍히도록 이 페이지(투표 세션 본인)
  // 쪽에만 붙였다. ref들은 같은 값으로 두 번 안 쏘게 막는 가드일 뿐이다.
  //
  // 🔴 RUN-1 PR 3 — **가드 키가 대회가 아니라 판(msid)이다.** [다시 참여]는 페이지를
  // 언마운트하지 않고 스토어만 바꾸므로(`startNextRun`), 대회 id로 잠근 ref는 2판째에도
  // 그대로 살아 있어 이벤트를 통째로 삼킨다. 그러면 이 PR이 붙인 회차 계측에
  // **분모(tournament_start)가 없고**, 같은 Champion으로 두 번 이기면(팬에게는 흔한 일)
  // 2판째가 완주하지 않은 것처럼 보인다.
  const tournamentStartFiredRef = useRef<string | null>(null);
  const roundAdvanceFiredRef = useRef<string | null>(null);
  const championFiredRef = useRef<string | null>(null);
  const guestLimitFiredRef = useRef(false);

  useEffect(() => {
    // msid 는 tournament 과 함께(같은 set()) 채워지므로 여기서 기다릴 일이 없다.
    if (!tournament || !msid || !runIndex || !uid) return;
    if (tournamentStartFiredRef.current === msid) return;
    tournamentStartFiredRef.current = msid;
    markTournamentStart(uid, tournament.id, runIndex);
    void trackWithConsent("tournament_start", {
      ...commonEventParams(tournament, isGuest, lang),
      match_session_id: msid,
      entry_point: resolveEntryPoint(),
    });
  }, [tournament, isGuest, lang, msid, runIndex, uid]);

  useEffect(() => {
    if (!tournament || !progress?.toRound || progress.complete) return;
    const roundKey = `${msid ?? tournament.id}:${progress.toRound}`;
    if (roundAdvanceFiredRef.current === roundKey) return;
    roundAdvanceFiredRef.current = roundKey;
    // toRound로 전환 중이라는 건 방금 fromRound를 다 통과했다는 뜻 — round_advance는
    // "막 완료한 라운드" 값을 보낸다.
    const completedRound = (progress.fromRound ?? progress.toRound - 1) as RoundIndex;
    void trackWithConsent("round_advance", {
      ...commonEventParams(tournament, isGuest, lang),
      ...(msid ? { match_session_id: msid } : {}),
      round: roundParam(completedRound),
    });
  }, [tournament, progress?.toRound, progress?.fromRound, progress?.complete, isGuest, lang, msid]);

  useEffect(() => {
    if (!tournament || !progress?.complete || !progress.championId || !runIndex || !uid) return;
    // 판까지 포함한 키 — 2판째에 같은 Champion이 나와도 반드시 다시 쏜다.
    const championKey = `${msid ?? tournament.id}:${progress.championId}`;
    if (championFiredRef.current === championKey) return;
    championFiredRef.current = championKey;
    // THE FINAL 통과도 round_advance 시퀀스의 마지막 한 걸음이라 같이 보낸다
    // (EVENT_SPEC.md §2: "48 → 24 → 12 → 6 → FINAL").
    void trackWithConsent("round_advance", {
      ...commonEventParams(tournament, isGuest, lang),
      ...(msid ? { match_session_id: msid } : {}),
      round: "final",
    });
    const durationSec = readTournamentDurationSec(uid, tournament.id, runIndex);
    void trackWithConsent("champion_confirmed", {
      ...commonEventParams(tournament, isGuest, lang),
      ...(msid ? { match_session_id: msid } : {}),
      champion_id: progress.championId,
      ...(durationSec !== null ? { duration_sec: durationSec } : {}),
    });
  }, [tournament, progress?.complete, progress?.championId, isGuest, lang, msid, runIndex, uid]);

  // guest_limit_view (EVENT_SPEC v1.2 §9, 신설) — 게스트가 3판 소진 모달을 본 시점에 1회.
  // v2.1에서 회원 전환의 주 지점이 "공유 잠금"에서 "3판 소진"으로 옮겨갔으므로 **이 이벤트가
  // 전환율의 분모다.** 없으면 게스트 전환율 30% 판정 자체가 불가능하다.
  // 모달은 tournament·category를 모르기 때문에 페이지에서 쏜다.

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<LoginReason | null>(null);
  const [dismissedTo, setDismissedTo] = useState(0);

  useEffect(() => {
    if (uid) void loadTournament(tournamentId, uid, isGuest);
  }, [uid, tournamentId, loadTournament, isGuest]);

  useEffect(() => {
    if (modal !== "guest_limit" || !tournament || guestLimitFiredRef.current) return;
    guestLimitFiredRef.current = true;
    void trackWithConsent("guest_limit_view", {
      ...commonEventParams(tournament, isGuest, lang),
      runs_today: run?.runsToday ?? GUEST_DAILY_RUN_LIMIT,
    });
  }, [modal, tournament, isGuest, lang, run?.runsToday]);

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

  // 판이 끝나는 순간 판 상태를 서버에서 **다시 읽는다**.
  //
  // `run` 은 `loadTournament` 시점의 값이라 방금 끝낸 판이 반영돼 있지 않다. 그대로 두면
  // 완주 화면이 한 판 뒤처진 숫자를 보인다 — 게스트가 1판을 막 끝냈는데 "다시 참여 (0/3)"
  // 와 "오늘 남은 참여 가능 횟수는 : 3판" 이 뜬다(2026-09-09 프로덕션 §7 검증에서 실측).
  //
  // 숫자만의 문제가 아니다. `canPlayAgain`·`blockedReason` 도 진입 시점 기준이라
  // 이어하던 판을 끝낸 팬은 [다시 참여]가 **비활성인 채로 이유도 없이** 남는다
  // (진입 시 판정이 `continue` → canPlayAgain false). 즉 이 PR의 주 기능이 새로고침
  // 전까지 죽어 있다.
  //
  // championId 로 가드해 판마다 한 번만 다시 읽는다.
  const runRefreshedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || !progress?.complete || !progress.championId) return;
    if (runRefreshedForRef.current === progress.championId) return;
    runRefreshedForRef.current = progress.championId;
    void loadTournament(tournamentId, uid, isGuest);
  }, [
    uid,
    tournamentId,
    isGuest,
    loadTournament,
    progress?.complete,
    progress?.championId,
  ]);

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

        // first_vote (EVENT_SPEC v1.2 ⑩) — **한 판의 첫 선택에 정확히 1회.**
        // 판정은 두 겹이다: ① `state.votes.length === 0` — 이 호출 직전에 그 판의 선택이
        // 하나도 없었다(이어하기로 돌아온 판은 여기서 걸린다. 탭을 닫았다 열어 마커가
        // 사라져도 마찬가지다) ② `markFirstVote` 의 회차별 sessionStorage 마커 — 같은 세션의
        // 새로고침을 막는다. 반대로 **새 판(회차 +1)은 키가 달라 반드시 다시 발화**한다.
        // ⚠️ 성공 직후에만 쏜다 — 서버가 거절한 선택은 판을 시작시키지 않는다.
        if (
          tournament &&
          state.votes.length === 0 &&
          runIndex &&
          uid &&
          markFirstVote(uid, tournamentId, runIndex)
        ) {
          void trackWithConsent("first_vote", {
            ...commonEventParams(tournament, isGuest, lang),
            ...(msid ? { match_session_id: msid } : {}),
            run_index: runIndex,
          });
        }
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
    [
      tournamentId,
      submitting,
      addVote,
      t,
      uid,
      isGuest,
      loadTournament,
      tournament,
      lang,
      msid,
      runIndex,
    ],
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

  // 마감된 Tournament에 **한 판도 안 돈 팬**이 처음 들어온 경우 (AC 16).
  // 완주 화면의 [다시 참여] 비활성만으로는 부족하다 — 그 팬에게는 완주 화면이 없다.
  // 이 안내와 서버의 마감 강제는 한 쌍이다(§14): 강제만 있고 설명이 없던 것이
  // 2026-09-06 P0였고, 그래서 이 화면과 onVote 의 deadlinePassed 복원이 같은 커밋에 있다.
  if (run?.screen === "deadline_passed") {
    return (
      <div className={styles.arena} data-arena-surface="deadline">
        <Center>
          <div>
            <p style={{ marginBottom: 16 }}>{t("arena.run.deadlinePassed")}</p>
            <a href="/" style={{ color: "var(--color-gold)" }}>
              {t("arena.load.home")}
            </a>
          </div>
        </Center>
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
          <CrownCardModal data={data} canShare={canShare} canSave={canSave} onSignIn={() => setModal("share")} tournamentId={tournamentId} category={tournament.category} matchSessionId={msid ?? undefined} />
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
      {/* 아레나 탭 줄(ModuleNav)은 매치 화면에 두지 않는다 — D-08 네 층(메뉴→안내→무대→배너)·
          정본 디자인(D-20)에 없다. 랭킹 경로는 NAV-1 서랍이 맡는다 (대표 판정 2026-09-19). */}
      <div className={styles.arena} data-arena-surface="vs">
        {/* ARENA-1 PR 1 — VS 스플릿 무대 (원장 D-08·D-11·D-17). 선택 엔진은 그대로:
            무대가 확정 연출(520ms) 뒤 같은 vote(contestantId) 를 부른다 (R1). */}
        <SplitStage
          title={localizedTitle(tournament, lang)}
          description={tournament.description?.[lang] || undefined}
          left={left}
          right={right}
          loading={submitting}
          onVote={vote}
          onSignIn={() => setModal("vote")}
          notice={
            // 게스트 안내 ① — 첫 진입(아직 한 판도 안 쓴 상태)에만 보인다.
            isGuest && run?.runsToday === 0 ? (
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
            ) : null
          }
        />
        {loginModal}
      </div>
    </>
  );
}
