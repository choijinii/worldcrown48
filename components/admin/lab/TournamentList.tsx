/**
 * TournamentList — operator's Tournaments with featured toggle + delete
 * (AC List #1-#5).
 *
 * Reads tournaments where hostUid == operator. The featured toggle uses the
 * tested planFeaturedToggle so exactly one Tournament stays featured (trap #7,
 * Launch Pad hero). Inline confirm (not window.confirm — E2E-friendly).
 *
 * ARENA-2 PR 3 (원장 D-86): 삭제 · 조기 마감 · 숨김은 관리자 함수 manageTournament 로만 한다
 * (브라우저 삭제는 규칙이 막는다). 참여가 없으면 [삭제], 있으면 그 자리가 [조기 마감] —
 * 고르는 규칙은 lib/lab/tournamentAdmin(tournamentRowActions), 참여 여부는 서버가 센다.
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
import type { MessageKey } from "@/lib/i18n/messages";
import {
  adminFailureMessageKey,
  tournamentRowActions,
  type TournamentAdminAction,
} from "@/lib/lab/tournamentAdmin";
import {
  adminErrorCode,
  fetchTournamentFanStates,
  runTournamentAdminAction,
} from "@/lib/lab/manageTournament";
import { getDb } from "@/lib/firebase";
import { showToast } from "@/lib/toast";
import { track } from "@/lib/analytics";
import { planFeaturedToggle } from "@/lib/lab/featuredToggle";
import { sortByCreatedAtDesc } from "@/lib/lab/sortTournaments";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import type { ThumbnailPair } from "@/lib/thumbnail/pair";
import { useCoverBroken } from "@/components/thumbnail/useCoverPair";
import type { LocalizedText } from "@/lib/types/tournament";
import type { Category } from "@/lib/types/tournament";
import { lab } from "./theme";
import { NameLanguagePanel } from "./NameLanguagePanel";

interface Row {
  id: string;
  title: string;
  titleI18n?: Partial<LocalizedText>;
  category: Category;
  status: string;
  totalContestants: number;
  featured: boolean;
  createdAt?: Timestamp;
  /**
   * LAB-EV-1 W7 — 주간 재검증 크론이 남기는 요약. 목록에서 Contestant 48개를
   * 다시 읽지 않고도 ⚠️를 띄우기 위해 Tournament 문서에 얹혀 있다.
   */
  videoAlert?: { failed?: number; warned?: number; checkedAt?: number };
  /** THUMB-1 — 대표 매치(A·B). 없으면 옛 대회. */
  thumbnailPair?: ThumbnailPair;
  tournamentDeadline?: Timestamp;
  /** ARENA-2 PR 3 — 조기 마감한 시각(manageTournament closeEarly). */
  closedEarlyAt?: Timestamp;
}

/** 확인이 필요한 동작 — [다시 보이기]는 되돌릴 수 있어 바로 한다. */
type ConfirmAction = Exclude<TournamentAdminAction, "unhide">;

const CONFIRM_COPY: Record<ConfirmAction, { note: MessageKey; confirm: MessageKey }> = {
  delete: { note: "lab.list.deleteNote", confirm: "lab.list.deleteConfirm" },
  closeEarly: { note: "lab.list.closeEarlyNote", confirm: "lab.list.closeEarlyConfirm" },
  hide: { note: "lab.list.hideNote", confirm: "lab.list.hideConfirm" },
};

const SUCCESS_COPY: Record<TournamentAdminAction, MessageKey> = {
  delete: "lab.list.toast.deleteSuccess",
  closeEarly: "lab.list.toast.closeEarlySuccess",
  hide: "lab.list.toast.hidden",
  unhide: "lab.list.toast.unhidden",
};

function millis(ts?: Timestamp): number | null {
  try {
    return ts ? ts.toMillis() : null;
  } catch {
    return null;
  }
}

/**
 * THUMB-1 (킥 §4 ㉣) — 고른 대표 매치의 그림이 안 뜨면(원본 삭제·비공개 · 엔트리 없음) 표시.
 * 피치 카드는 그동안 앞 번호 엔트리로 대체해 보인다. 저장하지 않고 볼 때마다 확인한다.
 */
function CoverBrokenFlag({ id, pair }: { id: string; pair?: ThumbnailPair }): JSX.Element | null {
  const { t } = useT();
  const broken = useCoverBroken(id, pair);
  if (!broken) return null;
  return (
    <span
      data-testid={`cover-broken-${id}`}
      style={{ marginLeft: 8, color: lab.crimson, fontSize: 12, fontWeight: 700 }}
    >
      ⚠️ {t("lab.list.coverBroken")}
    </span>
  );
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
  const { t, lang } = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; action: ConfirmAction } | null>(null);
  // 대회마다 참여가 있는지(서버가 센다). 없는 id = 아직 모름 → [삭제]도 [조기 마감]도 내밀지 않는다.
  const [fans, setFans] = useState<Record<string, { hasFans: boolean }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  // NAME-I18N-1 PR 2 — 이름 en·es 를 고치는 칸이 열린 대회(한 번에 하나).
  const [namesId, setNamesId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const snap = await getDocs(
        query(collection(db, "tournaments"), where("hostUid", "==", hostUid)),
      );
      const next = sortByCreatedAtDesc(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Row, "id">) })),
      );
      // 최신 등록이 맨 위 (client sort — 신규 인덱스 불필요, 위 helper 주석 참고).
      setRows(next);
      setFans(await fetchTournamentFanStates(next.map((r) => r.id)));
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

  async function act(action: TournamentAdminAction, id: string) {
    setBusyId(id);
    try {
      await runTournamentAdminAction(action, id);
      if (action === "delete") void track("admin_lab_delete", { tournament_id: id });
      setConfirm(null);
      showToast(t(SUCCESS_COPY[action]), "success");
      await load();
    } catch (err) {
      setConfirm(null);
      showToast(t(adminFailureMessageKey(action, adminErrorCode(err))), "error");
      // 그사이 참여가 생겼으면 [삭제] 자리가 [조기 마감]으로 바뀌어야 한다.
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const smallButton = {
    padding: "6px 10px",
    borderRadius: "var(--radius-border)",
    border: `1px solid ${lab.border}`,
    background: "transparent",
    color: lab.textMuted,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

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
          {rows.map((r) => {
            const a = tournamentRowActions({
              hasFans: fans[r.id]?.hasFans,
              status: r.status,
              deadlineMs: millis(r.tournamentDeadline),
              closedEarly: Boolean(r.closedEarlyAt),
              nowMs: Date.now(),
            });
            const confirming = confirm?.id === r.id ? confirm.action : null;
            return (
            <li
              key={r.id}
              data-testid={`tournament-row-${r.id}`}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
                borderRadius: "var(--radius-border)",
                background: lab.surface,
                border: `1px solid ${r.featured ? lab.gold : lab.border}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {localizedTitle(r, lang)}
                  {(r.videoAlert?.failed ?? 0) > 0 && (
                    <span
                      data-testid={`video-alert-${r.id}`}
                      title={t("lab.list.videoAlert", { n: r.videoAlert?.failed ?? 0 })}
                      style={{ marginLeft: 8, color: lab.crimson, fontSize: 12, fontWeight: 700 }}
                    >
                      ⚠️ {t("lab.list.videoAlert", { n: r.videoAlert?.failed ?? 0 })}
                    </span>
                  )}
                  <CoverBrokenFlag id={r.id} pair={r.thumbnailPair} />
                  {a.badges.map((b) => (
                    <span
                      key={b}
                      data-testid={`badge-${b}-${r.id}`}
                      style={{ marginLeft: 8, color: lab.textSub, fontSize: 12, fontWeight: 700 }}
                    >
                      {t(b === "hidden" ? "lab.list.badge.hidden" : "lab.list.badge.closedEarly")}
                    </span>
                  ))}
                </div>
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
                  borderRadius: "var(--radius-border)",
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
                onClick={() => setNamesId(namesId === r.id ? null : r.id)}
                aria-expanded={namesId === r.id}
                data-testid={`names-toggle-${r.id}`}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-border)",
                  border: `1px solid ${lab.border}`,
                  background: "transparent",
                  color: lab.textSub,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {namesId === r.id ? t("lab.names.close") : t("lab.names.open")}
              </button>

              <button
                type="button"
                onClick={() => toggleFeatured(r.id)}
                aria-pressed={r.featured}
                disabled={!a.canFeature}
                style={{
                  opacity: a.canFeature ? 1 : 0.4,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-border)",
                  border: `1px solid ${lab.gold}`,
                  background: r.featured ? lab.gold : "transparent",
                  color: r.featured ? "var(--color-bg-default)" : lab.gold,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: a.canFeature ? "pointer" : "default",
                }}
              >
                {r.featured ? "★ Featured" : "☆ Feature"}
              </button>

              {confirming ? (
                <span
                  data-testid={`admin-confirm-${r.id}`}
                  style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}
                >
                  <span style={{ fontSize: 12, color: lab.textSub }}>{t(CONFIRM_COPY[confirming].note)}</span>
                  <button
                    type="button"
                    onClick={() => act(confirming, r.id)}
                    disabled={busyId === r.id}
                    style={{ ...smallButton, border: "none", background: lab.crimson, color: "var(--color-white)", fontWeight: 700 }}
                  >
                    {t(CONFIRM_COPY[confirming].confirm)}
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} style={{ ...smallButton, color: lab.textSub }}>
                    {t("lab.list.deleteCancel")}
                  </button>
                </span>
              ) : (
                <>
                  {a.primary === "delete" && (
                    <button
                      type="button"
                      data-testid={`delete-${r.id}`}
                      onClick={() => setConfirm({ id: r.id, action: "delete" })}
                      aria-label={t("lab.list.deleteAria", { title: localizedTitle(r, lang) })}
                      style={smallButton}
                    >
                      {t("lab.list.delete")}
                    </button>
                  )}
                  {a.primary === "closeEarly" && (
                    <button
                      type="button"
                      data-testid={`close-early-${r.id}`}
                      onClick={() => setConfirm({ id: r.id, action: "closeEarly" })}
                      style={smallButton}
                    >
                      {t("lab.list.closeEarly")}
                    </button>
                  )}
                  {a.visibility === "hide" && (
                    <button
                      type="button"
                      data-testid={`hide-${r.id}`}
                      onClick={() => setConfirm({ id: r.id, action: "hide" })}
                      style={smallButton}
                    >
                      {t("lab.list.hide")}
                    </button>
                  )}
                  {a.visibility === "unhide" && (
                    <button
                      type="button"
                      data-testid={`unhide-${r.id}`}
                      onClick={() => act("unhide", r.id)}
                      disabled={busyId === r.id}
                      style={smallButton}
                    >
                      {t("lab.list.unhide")}
                    </button>
                  )}
                </>
              )}
              {namesId === r.id ? <NameLanguagePanel tournamentId={r.id} /> : null}
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
