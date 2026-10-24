/**
 * NameLanguagePanel — 발행된 대회의 엔트리 이름 en·es 를 보고 고친다 (NAME-I18N-1 PR 2 · 원장 D-61).
 *
 * "내 Tournament" 줄에서 연다. 한글 이름은 보기만(정본), 영어·스페인어 칸만 고친다.
 * 영어 칸이 빈 이름(AI 가 못 받았거나 발음이 안 맞아 비운 것 · 대표 2026-10-24 A안)은
 * "먼저 볼 이름"으로 맨 위에 모은다 — 화면에 한글로 보이는 이름들이다.
 * 규칙·판정은 lib/lab/nameEdits.ts(단위 시험). 저장은 nameI18n 한 칸만(주인만 — firestore.rules).
 */
"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/useT";
import { editEn, nameEditRows, planNameEdits, type NameEditRow } from "@/lib/lab/nameEdits";
import { lab } from "./theme";

const input = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 6,
  border: `1px solid ${lab.border}`,
  background: lab.bg,
  color: lab.text,
  fontSize: 13,
  fontFamily: lab.font,
} as const;

export function NameLanguagePanel({ tournamentId }: { tournamentId: string }): JSX.Element {
  const { t } = useT();
  const [loaded, setLoaded] = useState<NameEditRow[] | null>(null);
  const [rows, setRows] = useState<NameEditRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const snap = await getDocs(
          query(collection(getDb(), "contestants"), where("tournamentId", "==", tournamentId)),
        );
        const r = nameEditRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        if (!alive) return;
        setLoaded(r);
        setRows(r);
      } catch {
        if (alive) showToast(t("lab.names.toast.loadFail"), "error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [tournamentId, t]);

  function update(id: string, patch: (r: NameEditRow) => NameEditRow) {
    setRows((prev) => prev.map((r) => (r.id === id ? patch(r) : r)));
  }

  async function save() {
    if (!loaded) return;
    const { writes, invalid } = planNameEdits(loaded, rows);
    if (invalid.length > 0) {
      showToast(t("lab.names.toast.hangul"), "error");
      return;
    }
    if (writes.length === 0) {
      showToast(t("lab.names.toast.nothing"), "info");
      return;
    }
    setSaving(true);
    try {
      const db = getDb();
      const batch = writeBatch(db);
      for (const w of writes) batch.update(doc(db, "contestants", w.id), { nameI18n: w.nameI18n });
      await batch.commit();
      const saved = new Map(writes.map((w) => [w.id, w.nameI18n]));
      const next = rows.map((r) => {
        const n = saved.get(r.id);
        return n ? { ...r, en: n.en, es: n.es } : r;
      });
      setLoaded(next);
      setRows(next);
      showToast(t("lab.names.toast.saved"), "success");
    } catch {
      showToast(t("lab.names.toast.saveFail"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      data-testid={`name-panel-${tournamentId}`}
      style={{ flexBasis: "100%", marginTop: 8, paddingTop: 12, borderTop: `1px solid ${lab.border}` }}
    >
      <div style={{ fontWeight: 700, fontSize: 13 }}>{t("lab.names.title")}</div>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: lab.textSub }}>{t("lab.names.hint")}</p>
      {loaded === null ? (
        <div role="status" style={{ color: lab.textMuted, fontSize: 13 }}>
          {t("lab.list.loading")}
        </div>
      ) : (
        <>
          <div
            style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 1fr 1fr", gap: 6, fontSize: 13 }}
          >
            <div style={{ display: "contents", color: lab.textMuted, fontSize: 12 }}>
              <span>{t("lab.names.colKo")}</span>
              <span>{t("lab.names.colEn")}</span>
              <span>{t("lab.names.colEs")}</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} data-testid={`name-row-${r.id}`} style={{ display: "contents" }}>
                <span style={{ alignSelf: "center" }}>
                  {r.name}
                  {r.flagged ? (
                    <span
                      data-testid={`name-flag-${r.id}`}
                      style={{ marginLeft: 6, color: lab.gold, fontSize: 11, fontWeight: 700 }}
                    >
                      {t("lab.names.flag")}
                    </span>
                  ) : null}
                </span>
                <input
                  value={r.en}
                  aria-label={t("lab.names.enAria", { name: r.name })}
                  onChange={(e) => update(r.id, (row) => editEn(row, e.target.value))}
                  style={input}
                />
                <input
                  value={r.es}
                  aria-label={t("lab.names.esAria", { name: r.name })}
                  onChange={(e) => update(r.id, (row) => ({ ...row, es: e.target.value }))}
                  style={input}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              marginTop: 12,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: lab.gold,
              color: "var(--color-bg-default)",
              fontWeight: 700,
              fontSize: 12,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {t("lab.names.save")}
          </button>
        </>
      )}
    </div>
  );
}
