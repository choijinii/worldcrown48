/**
 * tournamentDrafts — 저장소 · 발행 배치 통합 (EDITOR-FIX-1, 에뮬레이터 + 진짜 규칙).
 *
 * 저장(lib/lab/draftStore) → 다시 읽기 → 48칸·영상 설정까지 복원 · 목록 · 두 탭은 마지막
 * 저장이 이김 · 발행 배치(lib/lab/publishBatch)가 성공하면 초안이 지워지고, 실패하면 남는다.
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import { listMyDrafts, loadDraft, saveDraft, newDraftId } from "@/lib/lab/draftStore";
import { buildPublishBatch } from "@/lib/lab/publishBatch";
import { toDraftFields, type DraftEditorState } from "@/lib/lab/tournamentDraft";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

let testEnv: RulesTestEnvironment;

function contestant(i: number): ContestantDraft {
  return {
    name: `Entry ${i + 1}`,
    nationality: "KR",
    affiliation: `Group ${i + 1}`,
    imageSearchKeyword: `hint ${i + 1}`,
    videoId: "dQw4w9WgXcQ",
    videoStartSec: 10 + i,
    videoEndSec: 25 + i,
    videoSourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoOrientation: i % 2 ? "portrait" : "landscape",
    videoFocusY: 30,
  };
}

function editorState(overrides: Partial<DraftEditorState> = {}): DraftEditorState {
  return {
    step: 2,
    title: "최고의 보컬",
    category: "kpop",
    description: "설명",
    keywords: ["보컬", "키워드"],
    campaignSlug: "fall_2026",
    deadlineMs: 1_900_000_000_000,
    contestants: Array.from({ length: 48 }, (_, i) => contestant(i)),
    thumbnailPair: { a: 4, b: 30, aPos: 15, bPos: null, next: "a" },
    ...overrides,
  };
}

const ownerDb = (uid = "host-1") =>
  testEnv
    .authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } })
    .firestore() as unknown as Firestore;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-tournament-drafts-store",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seedDraft(id: string, uid: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "tournamentDrafts", id), {
      ...toDraftFields(editorState({ contestants: [] })),
      hostUid: uid,
      updatedAt: serverTimestamp(),
    });
  });
}

describe("저장소 통합 — 저장 → 다시 읽기 → 복원", () => {
  it("restores every field, all 48 slots and their video settings", async () => {
    const db = ownerDb();
    const id = newDraftId(db);
    const s = editorState();
    await saveDraft(db, id, "host-1", s);
    expect(await loadDraft(db, id)).toEqual(s);
  });

  it("lists my drafts newest first with title and saved time", async () => {
    const db = ownerDb();
    await saveDraft(db, "a", "host-1", editorState({ title: "first" }));
    await new Promise((r) => setTimeout(r, 20));
    await saveDraft(db, "b", "host-1", editorState({ title: "second" }));
    await seedDraft("other", "host-2");
    const list = await listMyDrafts(db, "host-1");
    expect(list.map((d) => d.title)).toEqual(["second", "first"]);
    expect(list[0].updatedAtMs).toBeGreaterThan(0);
  });

  it("last save wins when two tabs save the same draft", async () => {
    const tabA = ownerDb();
    const tabB = ownerDb();
    await saveDraft(tabA, "d1", "host-1", editorState({ title: "A" }));
    await saveDraft(tabB, "d1", "host-1", editorState({ title: "B" }));
    expect((await loadDraft(tabA, "d1"))?.title).toBe("B");
  });
});

describe("발행 배치 — 성공하면 초안 삭제, 실패하면 유지", () => {
  function tournamentData(hostUid: string) {
    return { title: "t", hostUid, status: "active" };
  }
  function contestantData(hostUid: string) {
    return (tournamentId: string) =>
      Array.from({ length: 48 }, (_, i) => ({ tournamentId, hostUid, name: `E${i}`, order: i + 1 }));
  }

  it("deletes the draft in the same batch when publish succeeds", async () => {
    const db = ownerDb();
    await saveDraft(db, "d1", "host-1", editorState());
    const { batch, tournamentId } = buildPublishBatch(db, {
      tournament: tournamentData("host-1"),
      contestants: contestantData("host-1"),
      draftId: "d1",
    });
    await assertSucceeds(batch.commit());
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      expect((await getDoc(doc(ctx.firestore(), "tournamentDrafts/d1"))).exists()).toBe(false);
      expect((await getDoc(doc(ctx.firestore(), "tournaments", tournamentId))).exists()).toBe(true);
    });
  });

  it("keeps the draft when publish fails (batch is atomic)", async () => {
    const db = ownerDb();
    await saveDraft(db, "d1", "host-1", editorState());
    // 남의 이름으로 발행 → 규칙 거부 → 배치 전체 실패
    const { batch } = buildPublishBatch(db, {
      tournament: tournamentData("someone-else"),
      contestants: contestantData("host-1"),
      draftId: "d1",
    });
    await assertFails(batch.commit());
    expect(await loadDraft(db, "d1")).toEqual(editorState());
  });

  // THUMB-1: 대표 매치는 편집기에선 그리드 칸 번호, 발행된 대회에선 contestant 문서 id.
  it("stores thumbnailPair as the picked contestants' ids in the same batch", async () => {
    const db = ownerDb();
    const { batch, tournamentId } = buildPublishBatch(db, {
      tournament: tournamentData("host-1"),
      contestants: contestantData("host-1"),
      draftId: null,
      thumbnailPair: { a: 4, b: 30, aPos: 15, bPos: 40 },
    });
    await assertSucceeds(batch.commit());
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const fs = ctx.firestore();
      const t = (await getDoc(doc(fs, "tournaments", tournamentId))).data()!;
      const a = (await getDoc(doc(fs, "contestants", t.thumbnailPair.a))).data()!;
      const b = (await getDoc(doc(fs, "contestants", t.thumbnailPair.b))).data()!;
      expect([a.order, b.order]).toEqual([5, 31]);
      expect([a.tournamentId, b.tournamentId]).toEqual([tournamentId, tournamentId]);
      expect([t.thumbnailPair.aPos, t.thumbnailPair.bPos]).toEqual([15, 40]);
    });
  });

  it("publishes without a draft (never saved) too", async () => {
    const db = ownerDb();
    const { batch } = buildPublishBatch(db, {
      tournament: tournamentData("host-1"),
      contestants: contestantData("host-1"),
      draftId: null,
    });
    await assertSucceeds(batch.commit());
  });
});
