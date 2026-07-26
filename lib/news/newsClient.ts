/**
 * newsClient — the /admin/newsdesk + /news Firestore/callable data layer.
 *
 * Firestore I/O is glue (E2E-covered, per the voteStore/pitchStore precedent);
 * the pure pieces (schema · transitions · render selector) live in articleDoc.ts
 * / renderArticle.ts and are unit-tested. Writes here succeed only for the admin
 * (firestore.rules: news write = admin only) — the console is gated regardless.
 *
 * The publish/unpublish transitions are guarded client-side by canTransition
 * (defense-in-depth); the rules are the real boundary.
 */
"use client";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  setDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDb, getFunctionsInstance } from "@/lib/firebase";
import {
  canTransition,
  buildSlug,
  emptyLocalizedText,
  emptyLocalizedBlocks,
  type ArticleDoc,
  type ArticleStatus,
  type ArticleTemplate,
  type Lang,
  type LocalizedText,
  type LocalizedBlocks,
} from "./articleDoc";

export interface ArticleRecord extends Omit<ArticleDoc, "createdAt" | "publishedAt"> {
  createdAtMs: number | null;
  publishedAtMs: number | null;
}

function toMs(v: unknown): number | null {
  return v && typeof (v as { toMillis?: () => number }).toMillis === "function"
    ? (v as { toMillis: () => number }).toMillis()
    : null;
}

function toRecord(id: string, data: Record<string, unknown>): ArticleRecord {
  return {
    slug: String(data.slug ?? id),
    template: data.template as ArticleTemplate,
    status: data.status as ArticleStatus,
    title: (data.title as LocalizedText) ?? emptyLocalizedText(),
    subhead: (data.subhead as LocalizedText) ?? emptyLocalizedText(),
    body: (data.body as LocalizedBlocks) ?? emptyLocalizedBlocks(),
    evidence: (data.evidence as ArticleDoc["evidence"]) ?? { asOf: "", stats: [] },
    origin: data.origin as ArticleDoc["origin"],
    tournamentId: data.tournamentId as string | undefined,
    createdAtMs: toMs(data.createdAt),
    publishedAtMs: toMs(data.publishedAt),
  };
}

/** Admin: live feed of ALL articles (any status), newest first. */
export function subscribeAllArticles(
  cb: (articles: ArticleRecord[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(collection(getDb(), "news"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toRecord(d.id, d.data()))),
    (e) => onError?.(e),
  );
}

/** Public: live feed of PUBLISHED articles, newest published first. */
export function subscribePublishedArticles(
  cb: (articles: ArticleRecord[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(
    collection(getDb(), "news"),
    where("status", "==", "published"),
    orderBy("publishedAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toRecord(d.id, d.data()))),
    (e) => onError?.(e),
  );
}

export async function getArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  const snap = await getDoc(doc(getDb(), "news", slug));
  return snap.exists() ? toRecord(snap.id, snap.data()) : null;
}

/** draft → published (stamps publishedAt). Guarded by canTransition. */
export async function publishArticle(article: ArticleRecord): Promise<void> {
  if (!canTransition(article.status, "published")) {
    throw new Error(`cannot publish from ${article.status}`);
  }
  await updateDoc(doc(getDb(), "news", article.slug), {
    status: "published",
    publishedAt: serverTimestamp(),
  });
}

/** published → archived (내리기). */
export async function unpublishArticle(article: ArticleRecord): Promise<void> {
  if (!canTransition(article.status, "archived")) {
    throw new Error(`cannot archive from ${article.status}`);
  }
  await updateDoc(doc(getDb(), "news", article.slug), { status: "archived" });
}

/** Save 3-language editor edits (title/subhead/body). Never touches status. */
export async function saveArticleFields(
  slug: string,
  fields: { title: LocalizedText; subhead: LocalizedText; body: LocalizedBlocks },
): Promise<void> {
  await updateDoc(doc(getDb(), "news", slug), {
    title: fields.title,
    subhead: fields.subhead,
    body: fields.body,
  });
}

export interface GenerateDraftInput {
  template: ArticleTemplate;
  sourceLang?: Lang;
  topic?: string;
  tournamentId?: string;
}

/** Call the admin generateNewsDraft callable. Returns the new draft slug. */
export async function generateNewsDraft(
  input: GenerateDraftInput,
): Promise<string> {
  const callable = httpsCallable<GenerateDraftInput, { slug: string }>(
    getFunctionsInstance(),
    "generateNewsDraft",
  );
  const res = await callable(input);
  return res.data.slug;
}

/**
 * 백지 작성 — write an empty draft directly (manual_blank, no AI). The admin then
 * fills the editor. Uses a client-minted slug; a random token keeps it unguessable.
 */
export async function createBlankDraft(dateYYYYMMDD: string): Promise<string> {
  const token = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  const slug = buildSlug({ dateYYYYMMDD, token });
  const body = emptyLocalizedBlocks();
  body.ko = [{ type: "lead", text: "…" }];
  await setDoc(doc(getDb(), "news", slug), {
    slug,
    template: "column" as ArticleTemplate,
    status: "draft" as ArticleStatus,
    title: { ...emptyLocalizedText(), ko: "제목 없음" },
    subhead: emptyLocalizedText(),
    body,
    evidence: { asOf: "", stats: [] },
    origin: "manual_blank",
    tournamentId: null,
    publishedAt: null,
    createdAt: serverTimestamp(),
  });
  return slug;
}
