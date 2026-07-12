/**
 * TournamentCreator — the Lab's two-step flow container (handoff §6).
 *
 *   Step 1: title + category + "AI Fill" → calls aiFillContestants callable.
 *   Step 2: edit the 48 nodes → Publish (writeBatch: Tournament + 48
 *           Contestants, atomic — trap #6).
 *
 * All logic is the tested lib (validateTitle, buildTournamentDoc,
 * buildContestantDocs); this component is the orchestration + Firebase wiring.
 * §8 analytics events fire at each milestone.
 */
"use client";

import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getDb, getFunctionsInstance } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";
import { showToast } from "@/lib/toast";
import { track } from "@/lib/analytics";
import {
  buildTournamentDoc,
  buildContestantDocs,
  type ContestantDraft,
} from "@/lib/lab/tournamentDoc";
import { loadCategories } from "@/lib/taxonomy/loadCategories";
import { categoryIds, type CategoryDoc } from "@/lib/taxonomy/category";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import { lab } from "./theme";
import { TitleInput } from "./TitleInput";
import { CategorySelect } from "./CategorySelect";
import { AiFillButton } from "./AiFillButton";
import { ContestantGrid } from "./ContestantGrid";
import { PublishButton } from "./PublishButton";
import { TournamentList } from "./TournamentList";

type AiSuggestion = {
  name: string;
  nationality: string;
  position: string;
  imageSearchKeyword: string;
};

function emptyDraft(): ContestantDraft {
  return {
    name: "",
    nationality: "",
    position: "",
    imageUrl: "",
    imageSearchKeyword: "",
  };
}

export function TournamentCreator(): JSX.Element {
  const uid = useAuthStore((s) => s.user?.uid) ?? "";
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [contestants, setContestants] = useState<ContestantDraft[]>([]);
  const [filling, setFilling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [listRefresh, setListRefresh] = useState(0);

  // TX-0: categories are DATA — fetch the `categories` collection once (module
  // cached) and drive the dropdown + the data-driven validation from it.
  const validCategoryIds = categoryIds(categories);
  useEffect(() => {
    let alive = true;
    void loadCategories().then((cats) => {
      if (alive) setCategories(cats);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function fillWithAI() {
    if (!category) return;
    setFilling(true);
    void track("admin_lab_step1_submit", {
      category,
      title_length: title.trim().length,
    });
    const started = Date.now();
    try {
      const callable = httpsCallable<
        { title: string; category: string },
        { contestants: AiSuggestion[] }
      >(getFunctionsInstance(), "aiFillContestants");
      const res = await callable({ title: title.trim(), category });
      const drafts = res.data.contestants.map((c) => ({
        name: c.name,
        nationality: c.nationality,
        position: c.position,
        imageUrl: "",
        imageSearchKeyword: c.imageSearchKeyword,
      }));
      setContestants(drafts);
      setStep(2);
      void track("admin_lab_ai_fill_success", {
        category,
        duration_ms: Date.now() - started,
        contestant_count: drafts.length,
      });
    } catch (err) {
      const code = (err as { code?: string }).code ?? "unknown";
      void track("admin_lab_ai_fill_error", { category, error_code: code });
      showToast("AI 추천 실패. 다시 시도해주세요.", "error");
    } finally {
      setFilling(false);
    }
  }

  function updateContestant(index: number, patch: Partial<ContestantDraft>) {
    setContestants((prev) => {
      const next =
        prev.length === TOTAL_CONTESTANTS
          ? [...prev]
          : Array.from({ length: TOTAL_CONTESTANTS }, (_, i) => prev[i] ?? emptyDraft());
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  async function publish() {
    if (!uid || !category) return;
    setPublishing(true);
    try {
      const db = getDb();
      const batch = writeBatch(db);

      const tRef = doc(collection(db, "tournaments"));
      // TODO(B-2 Phase 3/4): replace this temporary wiring with real form state
      // (keyword chips, description textarea, deadline picker, translated
      // titleI18n). Schema (Phase 1) is in place; the STEP 1 UI lands next.
      const nowMs = Date.now();
      const deadlineMs = nowMs + 7 * 86_400_000;
      batch.set(tRef, {
        ...buildTournamentDoc(
          {
            title,
            titleI18n: { ko: title, en: title, es: title },
            description: { ko: "", en: "", es: "" },
            keywords: [title.trim()],
            category,
            hostUid: uid,
            deadlineMs,
          },
          validCategoryIds,
          nowMs,
        ),
        createdAt: serverTimestamp(),
        tournamentDeadline: Timestamp.fromMillis(deadlineMs),
      });

      for (const c of buildContestantDocs(tRef.id, uid, contestants)) {
        batch.set(doc(collection(db, "contestants")), c);
      }

      await batch.commit();
      void track("admin_lab_publish", { tournament_id: tRef.id, category });
      showToast("✓ 토너먼트 생성 완료", "success");

      // Reset for the next Tournament; refresh the list.
      setStep(1);
      setTitle("");
      setCategory("");
      setContestants([]);
      setListRefresh((n) => n + 1);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "unknown";
      void track("admin_lab_publish_error", { error_code: code });
      showToast("저장 실패. 데이터는 그대로 유지됩니다. 다시 시도해주세요.", "error");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: step === 2 ? "none" : 560,
        margin: "0 auto",
        padding: "56px 32px",
        fontFamily: lab.font,
        color: lab.text,
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.08em",
            color: lab.gold,
            fontWeight: 700,
          }}
        >
          DOMAIN 2 · THE LAB
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800 }}>
          Tournament 만들기
        </h1>
      </header>

      {step === 1 && (
        <div style={{ display: "grid", gap: 20 }}>
          <TitleInput value={title} onChange={setTitle} />
          <CategorySelect
            value={category}
            onChange={setCategory}
            categories={categories}
          />
          <AiFillButton
            title={title}
            category={category}
            validCategoryIds={validCategoryIds}
            busy={filling}
            onClick={fillWithAI}
          />
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "grid", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${lab.border}`,
                background: "transparent",
                color: lab.textSub,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ← 제목·카테고리 수정
            </button>
            <PublishButton
              contestants={contestants}
              busy={publishing}
              onClick={publish}
            />
          </div>
          <ContestantGrid contestants={contestants} onChange={updateContestant} />
        </div>
      )}

      {uid && <TournamentList hostUid={uid} refreshKey={listRefresh} />}
    </main>
  );
}
