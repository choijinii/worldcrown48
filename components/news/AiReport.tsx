/**
 * AiReport — ✦ AI-Report v2.5 블록 (ND-1 §3 #10). 기사 본문 블록 최하단(사이트
 * 푸터 아님). 문구는 i18n 3언어 키 + "· DATA {기준시각}". 스타일(8px·50%·골드 모노)는
 * news.module.css `.aiReport`.
 */
"use client";

import { useT } from "@/lib/i18n/useT";
import styles from "./news.module.css";

export function AiReport({ asOf }: { asOf: string }): JSX.Element {
  const { t } = useT();
  return (
    <div className={styles.articleFooter}>
      <div className={styles.aiReport} data-testid="ai-report">
        {t("news.aiReport")}
        {asOf ? ` · DATA ${asOf}` : ""}
      </div>
    </div>
  );
}
