/**
 * articleRecord — the client/server-neutral shape of a `news` doc (timestamps
 * flattened to ms) + its pure decoder. Kept free of "use client" and of any
 * firebase import so BOTH the client data layer (newsClient) and the server
 * metadata fetch (newsServer) can map a Firestore snapshot the same way.
 */
import {
  emptyLocalizedText,
  emptyLocalizedBlocks,
  type ArticleDoc,
  type ArticleStatus,
  type ArticleTemplate,
  type LocalizedText,
  type LocalizedBlocks,
} from "./articleDoc";

export interface ArticleRecord
  extends Omit<ArticleDoc, "createdAt" | "publishedAt"> {
  createdAtMs: number | null;
  publishedAtMs: number | null;
}

export function toMs(v: unknown): number | null {
  return v && typeof (v as { toMillis?: () => number }).toMillis === "function"
    ? (v as { toMillis: () => number }).toMillis()
    : null;
}

/** Decode a raw `news` doc into an ArticleRecord (defensive defaults throughout). */
export function toArticleRecord(
  id: string,
  data: Record<string, unknown>,
): ArticleRecord {
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
