/**
 * listAdminAlerts — callable Cloud Function (G-1 Admin Dashboard · alert feed).
 *
 * Reads the admin-only `admin_alerts` collection with the admin SDK (bypassing
 * the `admin` custom-claim rule — handoff §9 trap #3: the client uses the
 * ADMIN_UID pattern, has no claim, so it can NEVER read admin_alerts directly).
 * Returns the most recent 50 as flat wire docs; the client's pure
 * `normalizeAlerts` derives severity, dedups, drops aged-out dismissed, and
 * sorts (kept client-side so it stays node-env testable).
 *
 *   request.data: {}
 *   returns:      { alerts: RawAdminAlert[] }
 *
 * Security: `requireAdmin` first (defense-in-depth — same as getAdminKpis).
 */
import { onCall } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";

const MAX_ALERTS = 50;

/** Flat wire shape — mirrors lib/admin/dashboard/types.ts RawAdminAlert. */
interface RawAdminAlertWire {
  id: string;
  type: string;
  detail: string;
  tournamentId: string;
  createdAtMs: number;
  resolved: boolean;
  severity?: "high" | "medium" | "low" | "dismissed";
}

export const listAdminAlerts = onCall(
  { cors: ALLOWED_ORIGINS, secrets: ["ADMIN_UID"] },
  async (req): Promise<{ alerts: RawAdminAlertWire[] }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);

    const snap = await adminDb
      .collection("admin_alerts")
      .orderBy("createdAt", "desc")
      .limit(MAX_ALERTS)
      .get();

    const alerts: RawAdminAlertWire[] = snap.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt;
      return {
        id: d.id,
        type: String(data.type ?? ""),
        detail: String(data.detail ?? ""),
        tournamentId: String(data.tournamentId ?? ""),
        createdAtMs: createdAt instanceof Timestamp ? createdAt.toMillis() : 0,
        resolved: Boolean(data.resolved),
        ...(data.severity ? { severity: data.severity } : {}),
      };
    });

    return { alerts };
  },
);
