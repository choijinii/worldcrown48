/**
 * RunCompleteActions — 완주 화면의 액션 영역 (RUN-1 §6).
 *
 * Crown Card 아래에 얹는 것까지가 이 킥의 범위다(§5 DON'T 6: Arena UI 대수술 금지).
 * 새 색·새 컴포넌트를 만들지 않고 `crown.module.css` 의 기존 버튼 스타일을 재사용한다
 * (§5 DON'T 7). 색은 전부 `var(--color-…)` 토큰이다(불변 원칙 #2-1).
 *
 *   [ 다시 참여 (2/5) ]            ← 한도·마감·게스트 한도에 걸리면 비활성 + 이유 한 줄
 *   ▸ 이전 참여의 Crown Card (1장)  ← 접힘 목록, 각 카드 조회
 *
 * 막힘을 **버튼과 한 줄 안내**로만 표현하는 것이 설계다. 완주 화면을 차단 화면으로 갈아치우면
 * 팬이 방금 만든 Crown Card를 못 본다(차단 문구 원칙: 막고 나서 길을 열어준다).
 *
 * 이전 카드는 `crown_cards` 를 **쿼리하지 않고** 회차별 get 으로 집는다 — 규칙이 문서 id
 * 접두사로 소유자를 판정해 list 를 거부하기 때문이다(`lib/crown/pastCards.ts` 주석 참조).
 */
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useT } from "@/lib/i18n/useT";
import { runDocId } from "@/lib/run/runDocId";
import type { ActiveRunState } from "@/lib/run/activeRun";
import { pastRunIndices, type PastCard } from "@/lib/crown/pastCards";
import styles from "@/components/crown/crown.module.css";

interface RunCompleteActionsProps {
  run: ActiveRunState;
  uid: string;
  tournamentId: string;
  isGuest: boolean;
  /** Contestant id → 표시 이름. 이미 로드된 목록에서 뽑아 넘긴다. */
  nameOf: (contestantId: string) => string | undefined;
  onPlayAgain: () => void;
  /** 게스트가 한도로 막혔을 때 — 로그인 모달을 연다(Google 버튼이 있는 전환 지점). */
  onSignIn: () => void;
}

export function RunCompleteActions({
  run,
  uid,
  tournamentId,
  isGuest,
  nameOf,
  onPlayAgain,
  onSignIn,
}: RunCompleteActionsProps): JSX.Element {
  const { t } = useT();
  const [pastCards, setPastCards] = useState<PastCard[]>([]);

  useEffect(() => {
    const indices = pastRunIndices(run.displayRunIndex);
    if (indices.length === 0) {
      setPastCards([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const found: PastCard[] = [];
      for (const runIndex of indices) {
        try {
          const snap = await getDoc(
            doc(getDb(), "crown_cards", runDocId(uid, tournamentId, runIndex)),
          );
          const championContestantId = snap.data()?.championContestantId;
          if (snap.exists() && typeof championContestantId === "string") {
            found.push({ runIndex, championContestantId });
          }
        } catch {
          // 한 장을 못 읽는다고 목록 전체를 잃지 않는다 — 나머지는 그대로 보여준다.
        }
      }
      if (!cancelled) setPastCards(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, tournamentId, run.displayRunIndex]);

  // 게스트에게 보이는 남은 횟수 — 안내 3지점 중 ②(1판 완주 후 Crown Card 화면).
  const remaining = Math.max(0, run.limit - run.runsToday);

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "0 auto",
        padding: "var(--space-5) var(--space-4) var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <button
        type="button"
        className={`${styles.shareBtn} ${styles.primary}`}
        onClick={run.canPlayAgain ? onPlayAgain : undefined}
        disabled={!run.canPlayAgain}
        style={{ opacity: run.canPlayAgain ? 1 : 0.4, cursor: run.canPlayAgain ? "pointer" : "default" }}
      >
        {t("arena.run.playAgain", { n: run.runsToday, limit: run.limit })}
      </button>

      {/* 막힌 이유를 말한다. "할 수 없다"는 이미 비활성 버튼이 눈으로 말하므로
          문구는 갈 곳을 말해야 한다(2026-09-05 대표 확정 차단 문구 원칙). */}
      {run.blockedReason === "daily_limit" ? (
        <p style={subStyle}>
          <strong style={{ display: "block", color: "var(--color-text)", fontWeight: 600 }}>
            {t("arena.vote.dailyLimit")}
          </strong>
          {t("arena.vote.dailyLimitSub")}
        </p>
      ) : null}

      {run.blockedReason === "deadline_passed" ? (
        <p style={subStyle}>{t("arena.run.deadlinePassed")}</p>
      ) : null}

      {run.blockedReason === "guest_limit" ? (
        <button type="button" className={styles.shareBtn} onClick={onSignIn}>
          {t("login.guest_limit.title")}
        </button>
      ) : null}

      {/* 게스트 안내 ② — 남은 참여 횟수 + 저장 잠금. 막히지 않았을 때만 보인다
          (막혔으면 위의 guest_limit 안내가 그 자리를 대신한다). */}
      {isGuest && run.blockedReason !== "guest_limit" ? (
        <p style={subStyle}>{t("arena.guest.remaining", { n: remaining })}</p>
      ) : null}

      {pastCards.length > 0 ? (
        <details style={{ marginTop: "var(--space-2)" }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: 13,
              color: "var(--color-text-muted)",
              padding: "var(--space-2) 0",
            }}
          >
            {t("arena.run.pastCards")} ({pastCards.length})
          </summary>
          <ul style={{ listStyle: "none", margin: "var(--space-2) 0 0", padding: 0 }}>
            {pastCards.map((card) => (
              <li key={card.runIndex} style={{ marginTop: "var(--space-2)" }}>
                <a
                  href={`/arena/${tournamentId}/champion?run=${card.runIndex}`}
                  className={styles.shareBtn}
                  style={{ textDecoration: "none", display: "flex" }}
                >
                  {nameOf(card.championContestantId) ?? card.championContestantId}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

const subStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--color-text-muted)",
  textAlign: "center",
};
