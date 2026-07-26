/**
 * GeneratePanel — 초안 생성 (ND-1 §3 #8): 템플릿 선택 + 주제 입력(수동 AI 경로) +
 * 백지 작성. Calls the admin generateNewsDraft callable (draft-only) or writes a
 * blank draft. Never publishes.
 */
"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { showToast } from "@/lib/toast";
import { getTodayKST } from "@/lib/kst";
import {
  generateNewsDraft,
  createBlankDraft,
  type GenerateDraftInput,
} from "@/lib/news/newsClient";
import { newsErrorMessageKey } from "@/lib/news/newsErrorCodes";
import type { ArticleTemplate } from "@/lib/news/articleDoc";
import styles from "./newsdesk.module.css";

const TEMPLATES: { value: ArticleTemplate; label: string }[] = [
  { value: "open", label: "오픈 (Tournament 개막)" },
  { value: "result", label: "결과 (Champion 확정)" },
  { value: "weekly", label: "주간 랭킹 동향" },
  { value: "column", label: "자유 칼럼 (주제 입력)" },
];

export function GeneratePanel({
  onCreated,
}: {
  onCreated: (slug: string) => void;
}): JSX.Element {
  const { t } = useT();
  const [template, setTemplate] = useState<ArticleTemplate>("open");
  const [topic, setTopic] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [busy, setBusy] = useState(false);

  const needsTournament = template === "open" || template === "result";
  const needsTopic = template === "column";

  async function handleGenerate(): Promise<void> {
    setBusy(true);
    try {
      const input: GenerateDraftInput = { template, sourceLang: "ko" };
      if (needsTournament) input.tournamentId = tournamentId.trim();
      if (needsTopic) input.topic = topic.trim();
      const slug = await generateNewsDraft(input);
      showToast("초안이 생성되었습니다.");
      onCreated(slug);
    } catch (err) {
      showToast(t(newsErrorMessageKey(err)));
    } finally {
      setBusy(false);
    }
  }

  async function handleBlank(): Promise<void> {
    setBusy(true);
    try {
      const slug = await createBlankDraft(getTodayKST());
      showToast("백지 초안을 만들었습니다.");
      onCreated(slug);
    } catch {
      showToast(t("newsdesk.error.generateFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelLabel}>초안 생성 · Generate</div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="nd-template">
          템플릿
        </label>
        <select
          id="nd-template"
          className={styles.select}
          value={template}
          onChange={(e) => setTemplate(e.target.value as ArticleTemplate)}
        >
          {TEMPLATES.map((tpl) => (
            <option key={tpl.value} value={tpl.value}>
              {tpl.label}
            </option>
          ))}
        </select>
      </div>

      {needsTournament ? (
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="nd-tid">
            Tournament ID
          </label>
          <input
            id="nd-tid"
            className={styles.input}
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            placeholder="tournaments/{id}"
          />
        </div>
      ) : null}

      {needsTopic ? (
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="nd-topic">
            주제
          </label>
          <input
            id="nd-topic"
            className={styles.input}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 여름 플레이리스트의 심리학"
          />
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleGenerate}
          disabled={busy || (needsTournament && !tournamentId.trim()) || (needsTopic && !topic.trim())}
          data-testid="generate-draft"
        >
          {busy ? "생성 중…" : "AI 초안 생성"}
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={handleBlank}
          disabled={busy}
        >
          백지 작성
        </button>
      </div>
      <div className={styles.hint}>
        생성은 <b>초안(draft)</b>까지만. 발행은 아래 편집기에서 검토 후 직접 누릅니다.
        (하루 20건 한도)
      </div>
    </div>
  );
}
