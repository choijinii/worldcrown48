/**
 * TournamentList — operator's Tournaments with featured toggle + delete
 * (AC List #1-#5).
 *
 * Reads tournaments where hostUid == operator. The featured toggle uses the
 * tested planFeaturedToggle so exactly one Tournament stays featured (trap #7,
 * Launch Pad hero). Delete cascades: the Tournament doc + all its Contestants
 * in one writeBatch. Inline confirm (not window.confirm — E2E-friendly).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { showToast } from "@/lib/toast";
import { track } from "@/lib/analytics";
import { planFeaturedToggle } from "@/lib/lab/featuredToggle";
import { sortByCreatedAtDesc } from "@/lib/lab/sortTournaments";
import { useT } from "@/lib/i18n/useT";
import type { Category } from "@/lib/types/tournament";
import { lab } from "./theme";

interface Row {
  id: string;
  title: string;
  category: Category;
  status: string;
  totalContestants: number;
  featured: boolean;
  createdAt?: Timestamp;
}

const kst = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmt(ts?: Timestamp): string {
  try {
    return ts ? kst.format(ts.toDate()) : "—";
  } catch {
    return "—";
  }
}

export function TournamentList({
  hostUid,
  refreshKey,
}: {
  hostUid: string;
  refreshKey: number;
}): JSX.Element {
  const { t } = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const snap = await getDocs(
        query(collection(db, "tournaments"), where("hostUid", "==", hostUid)),
      );
      setRows(
        // 최신 등록이 맨 위 (client sort — 신규 인덱스 불필요, 위 helper 주석 참고).
        sortByCreatedAtDesc(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Row, "id">) })),
        ),
      );
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Lab] tournament list load failed:", err);
      }
      showToast(t("lab.list.toast.loadFail"), "error");
    } finally {
      setLoading(false);
    }
  }, [hostUid, t]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function toggleFeatured(id: string) {
    const currentFeaturedIds = rows.filter((r) => r.featured).map((r) => r.id);
    const plan = planFeaturedToggle(currentFeaturedIds, id);
    if (plan.length === 0) return;
    try {
      const db = getDb();
      const batch = writeBatch(db);
      for (const w of plan) {
        batch.update(doc(db, "tournaments", w.id), { featured: w.featured });
      }
      await batch.commit();
      void track("admin_lab_featured_toggle", { tournament_id: id });
      await load();
    } catch {
      showToast(t("lab.list.toast.featuredFail"), "error");
    }
  }

  async function remove(id: string) {
    try {
      const db = getDb();
      const cSnap = await getDocs(
        query(collection(db, "contestants"), where("tournamentId", "==", id)),
      );
      const batch = writeBatch(db);
      cSnap.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "tournaments", id));
      await batch.commit();
      void track("admin_lab_delete", { tournament_id: id });
      setConfirmId(null);
      showToast(t("lab.list.toast.deleteSuccess"), "success");
      await load();
    } catch {
      showToast(t("lab.list.toast.deleteFail"), "error");
    }
  }

  return (
    <section style={{ marginTop: 48, fontFamily: lab.font, color: lab.text }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
        {t("lab.list.title")}
      </h2>

      {loading ? (
        <div role="status" style={{ color: lab.textMuted, fontSize: 13 }}>
          {t("lab.list.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ color: lab.textMuted, fontSize: 13 }}>
          {t("lab.list.empty")}
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <li
              key={r.id}
              data-testid={`tournament-row-${r.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
                borderRadius: 10,
                background: lab.surface,
                border: `1px solid ${r.featured ? lab.gold : lab.border}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: lab.textMuted }}>
                  {r.category} · {r.status} ·{" "}
                  {t("lab.list.contestantsCount", { n: r.totalContestants })} ·{" "}
                  {fmt(r.createdAt)}
                </div>
              </div>

              <Link
                href={`/arena/${r.id}`}
                data-testid={`arena-link-${r.id}`}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${lab.turquoise}`,
                  background: "transparent",
                  color: lab.turquoise,
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t("lab.list.arenaLink")}
              </Link>

              <button
                type="button"
                onClick={() => toggleFeatured(r.id)}
                aria-pressed={r.featured}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${lab.gold}`,
                  background: r.featured ? lab.gold : "transparent",
                  color: r.featured ? "#0E0944" : lab.gold,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {r.featured ? "★ Featured" : "☆ Feature"}
              </button>

              {confirmId === r.id ? (
                <span style={{ display: "inline-flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: lab.crimson,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t("lab.list.deleteConfirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${lab.border}`,
                      background: "transparent",
                      color: lab.textSub,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {t("lab.list.deleteCancel")}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(r.id)}
                  aria-label={t("lab.list.deleteAria", { title: r.title })}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `1px solid ${lab.border}`,
                    background: "transparent",
                    color: lab.textMuted,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {t("lab.list.delete")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
