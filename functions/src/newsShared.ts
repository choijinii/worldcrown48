/**
 * newsShared — non-pure helpers shared by the ND-1 callable/triggers/cron (the
 * Anthropic client + slug minting + KST label). Kept out of core/ because these
 * touch the SDK + crypto; the tested decisions live in core/news*.
 */
import Anthropic from "@anthropic-ai/sdk";
import * as crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { HAIKU_MODEL } from "./core/models";
import { buildSlug, type ArticleDoc } from "./_news/articleDoc";
import type { ExistingDraftKey } from "./core/newsDraftAssembly";

const NEWS_MAX_TOKENS = 2048;

/** A createMessage bound to a Haiku call — the injected dep for the pipeline. */
export function makeNewsCreateMessage(
  apiKey: string,
): (prompt: string) => Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  return async (prompt: string): Promise<string> => {
    const resp = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: NEWS_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });
    const block = resp.content[0];
    return block && block.type === "text" ? block.text : "";
  };
}

/** {YYYYMMDD}-{6 hex}. hex ⊂ base36, so buildSlug validates it. */
export function newNewsSlug(kstDay: string): string {
  const token = crypto.randomBytes(3).toString("hex"); // 6 chars, 0-9a-f
  return buildSlug({ dateYYYYMMDD: kstDay, token });
}

const kstStampFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Epoch ms → "YYYY-MM-DD HH:mm KST" (the AI-Report DATA {기준시각} label). */
export function kstStamp(ms: number): string {
  // sv-SE yields "YYYY-MM-DD HH:mm".
  return `${kstStampFmt.format(new Date(ms))} KST`;
}

/**
 * Existing (origin, tournamentId) keys for one Tournament — feeds newsDraftExists
 * for trigger idempotency. Uses a single-field tournamentId equality (auto-indexed,
 * no composite index needed); origin is compared in memory.
 */
export async function existingDraftKeys(
  tournamentId: string,
): Promise<ExistingDraftKey[]> {
  const snap = await adminDb
    .collection("news")
    .where("tournamentId", "==", tournamentId)
    .get();
  return snap.docs.map((d) => ({
    origin: String(d.data().origin ?? ""),
    tournamentId: String(d.data().tournamentId ?? ""),
  }));
}

/** Persist a draft under its slug doc id, stamping createdAt server-side. */
export async function writeNewsDraft(
  draft: Omit<ArticleDoc, "createdAt">,
): Promise<void> {
  await adminDb
    .collection("news")
    .doc(draft.slug)
    .set({ ...draft, createdAt: FieldValue.serverTimestamp() });
}
