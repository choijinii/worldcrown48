/**
 * getAdminKpis — callable Cloud Function (G-1 Admin Dashboard · KPI snapshot).
 *
 * Thin adapter around the node-env-tested `buildAdminKpis` core: it owns the
 * Firestore I/O + Timestamp→ms flattening and leaves all window math to the
 * core. Inherits Seoul region + maxInstances=10 from setGlobalOptions (index.ts).
 *
 *   request.data: {}                       (no args)
 *   returns:      KpiSnapshot              (see core/buildAdminKpis.ts)
 *
 * Security (handoff §9 trap #5): `requireAdmin` runs FIRST — a Voter hitting the
 * URL from devtools is rejected server-side before any read. ADMIN_UID is the
 * functions-side env (NOT the client's NEXT_PUBLIC_ADMIN_UID, which the runtime
 * never sees); set it in functions/.env so process.env carries it at runtime.
 *
 * Cost (handoff §9 ethos — scheduleRankingCache reads votes ONCE): the all-time
 * total uses a count() aggregation; only the last ~48h of `votes` is read for
 * the windowed metrics, so a 60s poll never scans the whole collection.
 */
import { onCall } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import {
  buildAdminKpis,
  type AlertLike,
  type KpiSnapshot,
  type TournamentLike,
  type VoteLike,
} from "./core/buildAdminKpis";

/** Read window for the delta/chart math (prior-24h delta needs 48h). */
const WINDOW_MS = 48 * 60 * 60 * 1000;

function toMs(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

export const getAdminKpis = onCall(
  { cors: ALLOWED_ORIGINS, secrets: ["ADMIN_UID"] },
  async (req): Promise<KpiSnapshot> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);

    const now = Date.now();
    const since = Timestamp.fromMillis(now - WINDOW_MS);

    const [totalAgg, recentVotesSnap, tournamentsSnap, openAlertsSnap] =
      await Promise.all([
        adminDb.collection("votes").count().get(),
        adminDb.collection("votes").where("createdAt", ">", since).get(),
        adminDb.collection("tournaments").get(),
        adminDb.collection("admin_alerts").where("resolved", "==", false).get(),
      ]);

    const votes: VoteLike[] = recentVotesSnap.docs
      .map((d) => {
        const data = d.data();
        const createdAtMs = toMs(data.createdAt);
        return createdAtMs === null
          ? null
          : { userId: String(data.userId ?? ""), createdAtMs };
      })
      .filter((v): v is VoteLike => v !== null);

    const tournaments: TournamentLike[] = tournamentsSnap.docs.map((d) => {
      const data = d.data();
      return {
        status: String(data.status ?? ""),
        currentRound: Number(data.currentRound ?? 0),
        tournamentDeadlineMs: toMs(data.tournamentDeadline),
      };
    });

    const alerts: AlertLike[] = openAlertsSnap.docs.map((d) => {
      const data = d.data();
      return { resolved: false, createdAtMs: toMs(data.createdAt) ?? 0 };
    });

    return buildAdminKpis({
      votes,
      tournaments,
      alerts,
      now,
      totalVotesAllTime: totalAgg.data().count,
    });
  },
);
