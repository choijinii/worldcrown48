/**
 * ArticleEditor — 3언어 탭 편집기 + 발행/내리기 토글 (ND-1 §3 #8).
 *
 * Edits title/subhead/body per language (ko/en/es). Only TEXT is editable
 * (blockEditableText) — stats numbers and matchup proper nouns are shown read-only.
 * An empty target language can be seeded from the source ("원문 복사"). Publish is
 * an explicit act (canTransition draft→published); 내리기 archives.
 */
"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";
import {
  publishArticle,
  unpublishArticle,
  saveArticleFields,
  type ArticleRecord,
} from "@/lib/news/newsClient";
import {
  LANGS,
  type Lang,
  type LocalizedText,
  type LocalizedBlocks,
} from "@/lib/news/articleDoc";
import { firstFilledLang } from "@/lib/news/renderArticle";
import {
  blockEditableText,
  updateBlockText,
  cloneBlocksForTranslation,
} from "@/lib/news/blockEdit";
import { EvidencePanel } from "./EvidencePanel";
import styles from "./newsdesk.module.css";

export function ArticleEditor({
  article,
  onChanged,
}: {
  article: ArticleRecord;
  onChanged: () => void;
}): JSX.Element {
  const [lang, setLang] = useState<Lang>(firstFilledLang(article.title) ?? "ko");
  const [title, setTitle] = useState<LocalizedText>(article.title);
  const [subhead, setSubhead] = useState<LocalizedText>(article.subhead);
  const [body, setBody] = useState<LocalizedBlocks>(article.body);
  const [busy, setBusy] = useState(false);

  // Re-seed local state when a different article is selected.
  useEffect(() => {
    setTitle(article.title);
    setSubhead(article.subhead);
    setBody(article.body);
    setLang(firstFilledLang(article.title) ?? "ko");
  }, [article.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocks = body[lang] ?? [];
  const langEmpty = (title[lang] ?? "").trim() === "" && blocks.length === 0;

  function copyFromSource(): void {
    const src = firstFilledLang(article.title) ?? "ko";
    if (src === lang) return;
    setTitle((t) => ({ ...t, [lang]: t[src] }));
    setSubhead((s) => ({ ...s, [lang]: s[src] }));
    setBody((b) => ({ ...b, [lang]: cloneBlocksForTranslation(b[src] ?? []) }));
  }

  async function handleSave(): Promise<void> {
    setBusy(true);
    try {
      await saveArticleFields(article.slug, { title, subhead, body });
      showToast("저장되었습니다.");
      onChanged();
    } catch {
      showToast("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(): Promise<void> {
    setBusy(true);
    try {
      await saveArticleFields(article.slug, { title, subhead, body });
      await publishArticle(article);
      showToast("발행되었습니다.");
      onChanged();
    } catch {
      showToast("발행에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpublish(): Promise<void> {
    setBusy(true);
    try {
      await unpublishArticle(article);
      showToast("기사를 내렸습니다.");
      onChanged();
    } catch {
      showToast("내리기에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={styles.panel}>
        <div className={styles.panelLabel}>
          편집기 · {article.slug} · {article.status}
        </div>

        <div className={styles.tabs}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className={`${styles.tab} ${l === lang ? styles.tabActive : ""} ${
                (title[l] ?? "").trim() === "" ? styles.tabEmpty : ""
              }`}
              onClick={() => setLang(l)}
              data-testid={`lang-tab-${l}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {langEmpty ? (
          <div className={styles.field}>
            <button type="button" className={`${styles.btn} ${styles.small}`} onClick={copyFromSource}>
              원문 복사 (이 언어가 비어 있음)
            </button>
          </div>
        ) : null}

        <div className={styles.field}>
          <label className={styles.fieldLabel}>제목</label>
          <input
            className={styles.input}
            value={title[lang] ?? ""}
            onChange={(e) => setTitle((t) => ({ ...t, [lang]: e.target.value }))}
            data-testid="edit-title"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>부제</label>
          <textarea
            className={styles.textarea}
            value={subhead[lang] ?? ""}
            onChange={(e) => setSubhead((s) => ({ ...s, [lang]: e.target.value }))}
          />
        </div>

        {blocks.map((block, i) => (
          <div key={i} className={styles.block}>
            <div className={styles.blockType}>{block.type}</div>
            {blockEditableText(block).map((f) =>
              f.multiline ? (
                <textarea
                  key={f.path}
                  className={styles.textarea}
                  value={f.value}
                  onChange={(e) =>
                    setBody((b) => ({
                      ...b,
                      [lang]: updateBlockText(b[lang] ?? [], i, f.path, e.target.value),
                    }))
                  }
                />
              ) : (
                <input
                  key={f.path}
                  className={styles.input}
                  value={f.value}
                  onChange={(e) =>
                    setBody((b) => ({
                      ...b,
                      [lang]: updateBlockText(b[lang] ?? [], i, f.path, e.target.value),
                    }))
                  }
                />
              ),
            )}
          </div>
        ))}

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={handleSave} disabled={busy} data-testid="save-article">
            저장
          </button>
          {article.status !== "published" ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handlePublish}
              disabled={busy}
              data-testid="publish-article"
            >
              발행
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={handleUnpublish}
              disabled={busy}
              data-testid="unpublish-article"
            >
              내리기
            </button>
          )}
          {article.status === "published" ? (
            <a className={`${styles.btn} ${styles.small}`} href={`/news/${article.slug}`} target="_blank" rel="noreferrer">
              발행 페이지 열기 ↗
            </a>
          ) : null}
        </div>
      </div>

      <EvidencePanel evidence={article.evidence} />
    </div>
  );
}
