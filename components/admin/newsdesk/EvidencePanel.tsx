/**
 * EvidencePanel — 근거 데이터 스냅샷 (ND-1 §3 #8). 기사 옆에 evidence 수치 표를
 * 병기해 교차검증을 시스템화한다. Read-only — the operator verifies the article's
 * claims against the numbers the AI was actually given.
 */
"use client";

import { useT } from "@/lib/i18n/useT";
import type { Evidence } from "@/lib/news/articleDoc";
import styles from "./newsdesk.module.css";

export function EvidencePanel({ evidence }: { evidence: Evidence }): JSX.Element {
  const { t } = useT();
  return (
    <div className={styles.panel}>
      <div className={styles.panelLabel}>근거 스냅샷 · Evidence</div>
      <p className={styles.hint}>{t("newsdesk.evidence.hint")}</p>
      {evidence.stats.length === 0 ? (
        <div className={styles.empty}>근거 수치 없음</div>
      ) : (
        <table className={styles.evTable}>
          <thead>
            <tr>
              <th>LABEL</th>
              <th>VALUE</th>
            </tr>
          </thead>
          <tbody>
            {evidence.stats.map((s, i) => (
              <tr key={i}>
                <td>{s.label}</td>
                <td>{s.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {evidence.asOf ? (
        <div className={styles.evAsOf}>DATA {evidence.asOf}</div>
      ) : null}
    </div>
  );
}
