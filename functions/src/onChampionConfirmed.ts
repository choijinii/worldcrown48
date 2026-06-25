/**
 * onChampionConfirmed — Firestore trigger that generates a Voter's Crown Card
 * (Domain 3 · The Arena, handoff §3, 부록 D, ADR-0005).
 *
 * C-1 is per-Voter: there is NO global `tournaments.status='closed'`. When a
 * Voter completes THE FINAL, advanceRound sets `roundProgress.complete=true` +
 * `championId`. This trigger fires on that false→true edge, renders the 1.91:1
 * PNG server-side, uploads it to Storage, and writes the `crown_cards` doc.
 *
 * Idempotent: the pure guard ignores redelivered "already complete" events, and
 * we skip if `crown_cards/{cardId}` already exists — so a Voter gets exactly one
 * card per Tournament even under at-least-once trigger delivery.
 *
 * Region inherits `asia-northeast3` from setGlobalOptions in index.ts.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "./admin";
import { shouldGenerateCrownCard, type RoundProgressData } from "./core/onChampionConfirmedCore";
import { buildCrownCardRecord, crownCardId } from "./core/crownCardRecord";
import { renderCrownPng } from "./core/canvasServer";

const VICTORY_PATH = "48 → 24 → 12 → 6 → THE FINAL";

export const onChampionConfirmed = onDocumentUpdated(
  "roundProgress/{progressId}",
  async (event) => {
    const before = event.data?.before.data() as RoundProgressData | undefined;
    const after = event.data?.after.data() as RoundProgressData | undefined;

    if (!shouldGenerateCrownCard(before, after) || !after) return;
    const voterUid = after.userId as string;
    const tournamentId = after.tournamentId as string;
    const championId = after.championId as string;

    // Idempotency — never regenerate an existing card.
    const cardId = crownCardId(voterUid, tournamentId);
    const cardRef = adminDb.collection("crown_cards").doc(cardId);
    if ((await cardRef.get()).exists) return;

    // Denormalise Tournament + Champion Contestant for the card.
    const [tournamentSnap, contestantSnap] = await Promise.all([
      adminDb.collection("tournaments").doc(tournamentId).get(),
      adminDb.collection("contestants").doc(championId).get(),
    ]);
    const tournament = tournamentSnap.data();
    const contestant = contestantSnap.data();
    if (!tournament || !contestant) return;

    const championName = String(contestant.name ?? "");
    const tournamentTitle = String(tournament.title ?? "");
    const tournamentCategory = String(tournament.category ?? "");

    // Render the 1.91:1 PNG. A render failure is PERMANENT (e.g. the optional
    // node-canvas binary is absent on this instance) — log and return WITHOUT
    // throwing, so the at-least-once trigger does not retry-storm for days.
    let png: Buffer;
    try {
      png = renderCrownPng({
        initial: championName.trim() ? Array.from(championName.trim())[0].toUpperCase() : "?",
        name: championName,
        title: tournamentTitle,
        url: "worldcrown48.com",
        path: VICTORY_PATH,
      });
    } catch (err) {
      console.error(
        `[onChampionConfirmed] render failed for ${cardId} (canvas unavailable?) — skipping without retry:`,
        err,
      );
      return;
    }

    // Upload (admin SDK only — storage.rules). storage.rules makes /crown-cards
    // publicly readable, so we use the tokenless Firebase media URL — no
    // getSignedUrl, which would need signBlob perms the default runtime SA lacks.
    const storagePath = `crown-cards/${tournamentId}/${voterUid}.png`;
    const bucket = adminStorage.bucket();
    await bucket.file(storagePath).save(png, { contentType: "image/png", resumable: false });
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

    // Write the crown_cards doc (createdAt stamped here; builder validates).
    const record = buildCrownCardRecord({
      voterUid,
      tournamentId,
      championId,
      tournamentTitle,
      tournamentCategory,
      imageUrl,
    });
    await cardRef.set({ ...record, createdAt: FieldValue.serverTimestamp() });
  },
);
