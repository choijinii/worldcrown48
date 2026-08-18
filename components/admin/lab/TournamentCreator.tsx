/**
 * TournamentCreator — the Lab's 5-step create flow container (B-2 개편).
 *
 *   STEP 1: 제목 + 카테고리 + 설명(선택) + 키워드(필수·✨AI) + Deadline → [다음]
 *           (다음 활성 = ①②④⑤ 충족, AI 성공 여부와 무관 — 핵심 AC#1)
 *   STEP 2: 48칸 그리드 — ✏️직접 · ✨AI 48명 · ✨빈칸만 AI · 개별 수정 → Publish
 *           (writeBatch: Tournament + 48 Contestants, atomic — trap #6)
 *
 * All gates/validation are the tested lib (validateTitle, isStep1Ready,
 * buildTournamentDoc …); this component is orchestration + Firebase wiring.
 * title·description are translated once at publish (translateTournamentMeta) and
 * stored additively (title stays the flat original — back-compat). §8 analytics
 * fire at each milestone.
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
import { isStep1Ready } from "@/lib/lab/step1Ready";
import { validateKeywords } from "@/lib/lab/keywordsValidation";
import { presetDeadlineMs, DEFAULT_DEADLINE_DAYS } from "@/lib/lab/deadlineValidation";
import { translateMeta } from "@/lib/lab/translateMeta";
import { loadCategories } from "@/lib/taxonomy/loadCategories";
import { categoryIds, type CategoryDoc } from "@/lib/taxonomy/category";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import { applyVideoAssignments, clearVideo, retimeDraft } from "@/lib/lab/videoDraft";
import {
  applySourcingResults,
  collectExcludedVideoIds,
  dropSourcingStates,
  toSourcingStates,
  type SourcingStates,
} from "@/lib/lab/sourcingDraft";
import { refreshSlotVideo } from "@/lib/lab/autoSource";
import { inspectErrorCode } from "@/lib/lab/inspectYouTube";
import { sourcingErrorMessage } from "@/lib/lab/sourcingMessages";
import type { SlotAssignment } from "@/lib/embed/parseBatch";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type { SourcingBatchSummary } from "@/lib/embed/sourcing/types";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";
import { AutoSourceBar } from "./AutoSourceBar";
import { YouTubeInspectorModal } from "./YouTubeInspectorModal";
import { SlotVideoTuner } from "./SlotVideoTuner";
import { TitleInput } from "./TitleInput";
import { CategorySelect } from "./CategorySelect";
import { DescriptionInput } from "./DescriptionInput";
import { KeywordChips } from "./KeywordChips";
import { DeadlinePicker } from "./DeadlinePicker";
import { Step2Summary } from "./Step2Summary";
import { ContestantGrid } from "./ContestantGrid";
import { FillToolbar } from "./FillToolbar";
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

function toDraft(c: AiSuggestion): ContestantDraft {
  return {
    name: c.name,
    nationality: c.nationality,
    position: c.position,
    imageUrl: "",
    imageSearchKeyword: c.imageSearchKeyword,
  };
}

export function TournamentCreator(): JSX.Element {
  const { t, lang } = useT();
  const uid = useAuthStore((s) => s.user?.uid) ?? "";
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  // Stable reference "now" for this create session (presets + gate use it).
  const [nowMs] = useState(() => Date.now());
  const [deadlineMs, setDeadlineMs] = useState(() =>
    presetDeadlineMs(Date.now(), DEFAULT_DEADLINE_DAYS),
  );
  const [contestants, setContestants] = useState<ContestantDraft[]>([]);
  const [filling, setFilling] = useState(false);
  const [keywordBusy, setKeywordBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [listRefresh, setListRefresh] = useState(0);
  // LAB-EV-1: 검수기 모달 + 슬롯 미세조정(열린 슬롯 index, 닫힘이면 null).
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [tuningIndex, setTuningIndex] = useState<number | null>(null);
  // LAB-EV-2: 슬롯별 소싱 배지(제안·수동 필요·실존 의심). 화면 전용 — 발행되지 않는다.
  const [sourcingStates, setSourcingStates] = useState<SourcingStates>({});
  const [refreshingIndex, setRefreshingIndex] = useState<number | null>(null);

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

  const step1Ready = isStep1Ready({
    title,
    category,
    keywords,
    deadlineMs,
    validCategoryIds,
    nowMs,
  });

  async function generateKeywords() {
    if (keywordBusy || !category) return;
    setKeywordBusy(true);
    try {
      const callable = httpsCallable<
        { title: string; category: string; description: string },
        { keywords: string[] }
      >(getFunctionsInstance(), "aiSuggestKeywords");
      const res = await callable({
        title: title.trim(),
        category,
        description: description.trim(),
      });
      // Merge into whatever the host already typed (dedupe/cap authoritative).
      const merged = validateKeywords([...keywords, ...res.data.keywords]);
      setKeywords(merged.values);
      void track("admin_lab_ai_keywords_success", {
        category,
        keyword_count: merged.values.length,
      });
    } catch (err) {
      const code = (err as { code?: string }).code ?? "unknown";
      void track("admin_lab_ai_keywords_error", { category, error_code: code });
      // AC#2: AI is a helper, not a gate — the host can still type by hand.
      showToast(t("lab.toast.keywordFail"), "error");
    } finally {
      setKeywordBusy(false);
    }
  }

  function goToStep2() {
    if (!step1Ready) return;
    void track("admin_lab_step1_submit", {
      category,
      title_length: title.trim().length,
      keyword_count: keywords.length,
    });
    setStep(2);
  }

  /**
   * STEP 2 fill. mode="all" replaces the whole roster; mode="blanks" requests
   * only the empty slots (excluding names already present) and merges into the
   * blanks — filled cells are preserved 100% (AC#3).
   */
  async function fillWithAI(mode: "all" | "blanks") {
    if (filling) return;
    const grid =
      contestants.length === TOTAL_CONTESTANTS
        ? contestants
        : Array.from({ length: TOTAL_CONTESTANTS }, (_, i) => contestants[i] ?? emptyDraft());
    const existingNames =
      mode === "blanks"
        ? grid.map((d) => d.name.trim()).filter(Boolean)
        : [];
    if (mode === "blanks" && existingNames.length >= TOTAL_CONTESTANTS) {
      showToast(t("lab.toast.noBlanks"), "info");
      return;
    }
    setFilling(true);
    const started = Date.now();
    try {
      const callable = httpsCallable<
        {
          title: string;
          category: string;
          description: string;
          keywords: string[];
          existing: string[];
        },
        { contestants: AiSuggestion[] }
      >(getFunctionsInstance(), "aiFillContestants");
      const res = await callable({
        title: title.trim(),
        category,
        description: description.trim(),
        keywords,
        existing: existingNames,
      });
      const incoming = res.data.contestants.map(toDraft);

      if (mode === "all") {
        setContestants(incoming);
        // LAB-EV-2 — 인물이 통째로 바뀌었다. 옛 소싱 배지를 남기면 "제안"이라
        // 써 있는 칸에 다른 사람이 앉아 있게 된다.
        setSourcingStates({});
      } else {
        // Fill only the empty slots, preserving every named cell (AC#3).
        let k = 0;
        const filledIndexes: number[] = [];
        const merged = grid.map((d, i) => {
          if (d.name.trim() || k >= incoming.length) return d;
          filledIndexes.push(i);
          return incoming[k++];
        });
        setContestants(merged);
        // 새로 채워진 칸만 배지를 떼어낸다 — 손대지 않은 칸의 결과는 유효하다.
        setSourcingStates((states) => dropSourcingStates(states, filledIndexes));
      }
      void track("admin_lab_ai_fill_success", {
        category,
        mode,
        duration_ms: Date.now() - started,
        contestant_count: incoming.length,
      });
    } catch (err) {
      const code = (err as { code?: string }).code ?? "unknown";
      void track("admin_lab_ai_fill_error", { category, mode, error_code: code });
      showToast(t("lab.toast.fillFail"), "error");
    } finally {
      setFilling(false);
    }
  }

  /**
   * LAB-EV-1 W4 — 검수 통과분을 슬롯 01..N에 얹는다. 차단 판정은 순수 층
   * (applyVideoAssignments)이 걸러내므로 여기서 다시 검사하지 않는다.
   */
  function applyVideoSlots(assignments: SlotAssignment[], verdicts: LinkVerdict[]) {
    setContestants((prev) =>
      applyVideoAssignments(prev, assignments, verdicts, TOTAL_CONTESTANTS, emptyDraft),
    );
  }

  /**
   * LAB-EV-2 — 소싱 배치 1회분을 그리드에 얹는다. 배치마다 즉시 반영해야 중간에
   * 쿼터가 끊겨도 앞선 배치의 결과가 남는다(runSourcingBatches의 부분 결과 계약).
   */
  function applySourcingBatch(batch: SourcingBatchSummary) {
    setContestants(
      (prev) =>
        applySourcingResults(prev, batch.results, TOTAL_CONTESTANTS, emptyDraft).drafts,
    );
    setSourcingStates((states) => ({ ...states, ...toSourcingStates(batch.results) }));
  }

  /** 슬롯 1개 캐시 우회 재검색 — 제안된 영상이 마음에 안 들 때(DoD). */
  async function refreshSlot(index: number) {
    if (refreshingIndex !== null) return;
    const draft = contestants[index];
    const name = (draft?.name ?? "").trim();
    if (!name) return;

    setRefreshingIndex(index);
    try {
      const hint = (draft.imageSearchKeyword ?? "").trim();
      const batch = await refreshSlotVideo({
        targets: [hint ? { index, name, searchHint: hint } : { index, name }],
        categoryKeywords: keywords,
        // 지금 붙어 있는 영상도 회피 목록에 넣는다 — 안 그러면 같은 걸 다시 준다.
        excludeVideoIds: [
          ...collectExcludedVideoIds(contestants, [index]),
          ...(draft.videoId ? [draft.videoId] : []),
        ],
      });
      applySourcingBatch(batch);
      if (batch.results[0]?.status !== "suggested") {
        showToast(t("lab.source.refreshEmpty"), "info");
      }
      void track("admin_lab_source_refresh", {
        status: batch.results[0]?.status ?? "unknown",
        search_calls: batch.spent.searchCalls,
      });
    } catch (err) {
      const code = inspectErrorCode(err);
      showToast(t(sourcingErrorMessage(code).key), "error");
      void track("admin_lab_source_refresh_error", { error_code: code });
    } finally {
      setRefreshingIndex(null);
    }
  }

  function retimeSlot(index: number, startSec: number, durationSec: number | null) {
    setContestants((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = retimeDraft(next[index], startSec, durationSec);
      return next;
    });
  }

  function removeSlotVideo(index: number) {
    setContestants((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = clearVideo(next[index]);
      return next;
    });
    // 영상을 뺐으면 "제안"은 더 이상 참이 아니다(LAB-EV-2).
    setSourcingStates((states) => dropSourcingStates(states, [index]));
    setTuningIndex(null);
  }

  function updateContestant(index: number, patch: Partial<ContestantDraft>) {
    // 이름을 지우면 그 칸은 다른 사람의 자리가 된다 — 배지도 함께 뗀다(LAB-EV-2).
    if (patch.name !== undefined && patch.name.trim() === "") {
      setSourcingStates((states) => dropSourcingStates(states, [index]));
    }
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
    if (!uid || !step1Ready) return;
    setPublishing(true);
    try {
      // Translate title + description once (미보유 언어만 Haiku; 실패 시 원문
      // fallback — 발행은 성공, ADR-B2 §4). Source lang = current UI lang.
      const meta = await translateMeta({
        title: title.trim(),
        description: description.trim(),
        sourceLang: lang,
      });

      const db = getDb();
      const batch = writeBatch(db);

      const tRef = doc(collection(db, "tournaments"));
      batch.set(tRef, {
        ...buildTournamentDoc(
          {
            title: title.trim(),
            titleI18n: meta.titleI18n,
            description: meta.descriptionI18n,
            keywords,
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
      showToast(t("lab.toast.publishSuccess"), "success");

      // Reset for the next Tournament; refresh the list.
      setStep(1);
      setTitle("");
      setCategory("");
      setDescription("");
      setKeywords([]);
      setDeadlineMs(presetDeadlineMs(Date.now(), DEFAULT_DEADLINE_DAYS));
      setContestants([]);
      setSourcingStates({});
      setListRefresh((n) => n + 1);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "unknown";
      void track("admin_lab_publish_error", { error_code: code });
      showToast(t("lab.toast.publishFail"), "error");
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
          {t("lab.header.title")}
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: lab.textMuted }}>
          STEP {step} / 2
        </p>
      </header>

      {step === 1 && (
        <div style={{ display: "grid", gap: 20 }}>
          <TitleInput value={title} onChange={setTitle} />
          <CategorySelect
            value={category}
            onChange={setCategory}
            categories={categories}
          />
          <DescriptionInput value={description} onChange={setDescription} />
          <KeywordChips
            value={keywords}
            onChange={setKeywords}
            onAiGenerate={generateKeywords}
            aiBusy={keywordBusy}
          />
          <DeadlinePicker value={deadlineMs} onChange={setDeadlineMs} nowMs={nowMs} />
          <button
            type="button"
            onClick={goToStep2}
            disabled={!step1Ready}
            data-testid="lab-next-button"
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background: step1Ready ? lab.gold : lab.surfaceElev,
              color: step1Ready ? "var(--color-bg-default)" : lab.textMuted,
              fontWeight: 800,
              fontSize: 15,
              fontFamily: lab.font,
              cursor: step1Ready ? "pointer" : "not-allowed",
            }}
          >
            {t("lab.next")}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "grid", gap: 24 }}>
          <Step2Summary
            title={title}
            description={description}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
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
              {t("lab.backToStep1")}
            </button>
            <PublishButton
              contestants={contestants}
              busy={publishing}
              onClick={publish}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <FillToolbar
              contestants={contestants}
              busy={filling}
              onFillAll={() => fillWithAI("all")}
              onFillBlanks={() => fillWithAI("blanks")}
            />
            <button
              type="button"
              onClick={() => setInspectorOpen(true)}
              data-testid="lab-open-embed-inspector"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${lab.border}`,
                background: "transparent",
                color: lab.textSub,
                fontSize: 13,
                fontFamily: lab.font,
                cursor: "pointer",
              }}
            >
              {t("lab.embed.open")}
            </button>
            {/* LAB-EV-2 — 손으로 링크를 붙이는 검수기 옆에 자동 소싱을 둔다.
                둘 다 같은 검증(LAB-EV-1)을 통과한 영상만 슬롯에 넣는다. */}
            <AutoSourceBar
              contestants={contestants}
              keywords={keywords}
              onBatch={applySourcingBatch}
              disabled={filling || publishing}
            />
          </div>
          <ContestantGrid
            contestants={contestants}
            onChange={updateContestant}
            onTune={setTuningIndex}
            sourcing={sourcingStates}
            onRefreshVideo={(index) => void refreshSlot(index)}
            refreshingIndex={refreshingIndex}
          />
        </div>
      )}

      {uid && <TournamentList hostUid={uid} refreshKey={listRefresh} />}

      {/* LAB-EV-1 — 검수기(W4)와 슬롯 미세조정(W5). 둘 다 STEP 2 전용. */}
      <YouTubeInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        onApply={applyVideoSlots}
      />
      {tuningIndex !== null && contestants[tuningIndex]?.videoId && (
        <SlotVideoTuner
          index={tuningIndex}
          draft={contestants[tuningIndex]}
          onRetime={(startSec, durationSec) => retimeSlot(tuningIndex, startSec, durationSec)}
          onRemove={() => removeSlotVideo(tuningIndex)}
          onClose={() => setTuningIndex(null)}
        />
      )}
    </main>
  );
}
