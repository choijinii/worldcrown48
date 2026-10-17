/**
 * TournamentCreator — the Lab's 5-step create flow container (B-2 개편).
 *
 *   STEP 1: 제목 + 카테고리 + 설명(선택) + 키워드(필수·✨AI) + Deadline → [다음]
 *           (다음 활성 = ①②④⑤ 충족, AI 성공 여부와 무관 — 핵심 AC#1)
 *   STEP 2: 결과물 2버튼([🎬 동영상 생성]·[🖼 이미지 생성]) + 48칸 그리드 → Publish
 *           (writeBatch: Tournament + 48 Contestants, atomic — trap #6)
 *
 * LAB-UX-1(2026-08-23)에서 STEP 2의 **순서를 화면이 갖게** 됐다. 예전에는 부품
 * 버튼 네 개(AI 48명 · 빈칸만 AI · 검수기 · 자동 소싱)가 늘어서 있었고 운영자가
 * 매번 순서를 기억해야 했다. 이제 체인이 그 순서를 소유한다:
 *   🎬 = aiFillContestants → (쿼터 확인) → autoSourceVideos ×N배치 → 검수 배지
 *   🖼 = aiFillContestants → 검수 배지 (search 콜 0)
 * 새 서버 API는 없다(R2) — 기존 콜러블을 클라이언트가 순서대로 부를 뿐이다.
 *
 * All gates/validation are the tested lib (validateTitle, isStep1Ready,
 * buildTournamentDoc …); this component is orchestration + Firebase wiring.
 * title·description are translated once at publish (translateTournamentMeta) and
 * stored additively (title stays the flat original — back-compat). §8 analytics
 * fire at each milestone.
 *
 * EDITOR-FIX-1(2026-10-17): 편집 내용은 서버 초안(`tournamentDrafts`)으로 자동 저장된다
 * — 입력이 멈춘 뒤 DRAFT_SAVE_DELAY_MS · 단계 이동 · AI 호출 직전 · 탭을 떠날 때.
 * 열 때 내 초안이 있으면 [이어서 만들기] 목록이 먼저 뜬다. 발행이 성공하면 같은
 * writeBatch 에서 초안이 지워진다(publishBatch.ts).
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { serverTimestamp, Timestamp } from "firebase/firestore";
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
import { KEYWORDS_MAX, mergeKeywords } from "@/lib/lab/keywordsValidation";
import { presetDeadlineMs, DEFAULT_DEADLINE_DAYS } from "@/lib/lab/deadlineValidation";
import { translateMeta } from "@/lib/lab/translateMeta";
import { loadCategories } from "@/lib/taxonomy/loadCategories";
import { categoryIds, type CategoryDoc } from "@/lib/taxonomy/category";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import {
  applyVideoAssignments,
  clearVideo,
  reframeDraft,
  releaseRenamedSlot,
  retimeDraft,
} from "@/lib/lab/videoDraft";
import type { EmbedOrientation } from "@/lib/media/mediaSlot";
import {
  applySourcingResults,
  buildSourcingTargets,
  chainTargets,
  collectExcludedVideoIds,
  dropSourcingStates,
  toSourcingStates,
  type SourcingStates,
} from "@/lib/lab/sourcingDraft";
import {
  autoSourceVideos,
  previewSourcingQuota,
  refreshSlotVideo,
  runSourcingBatches,
  type SourcingQuotaPreview,
} from "@/lib/lab/autoSource";
import { deriveReviewFlags } from "@/lib/lab/reviewFlags";
import {
  applyExtractions,
  blankSlotIndexes,
  type ExtractedContestant,
} from "@/lib/lab/pasteExtract";
import { step2Counters } from "@/lib/lab/step2Counters";
import { isRenamedTo } from "@/lib/lab/nameKey";
import { inspectErrorCode } from "@/lib/lab/inspectYouTube";
import { sourcingErrorMessage } from "@/lib/lab/sourcingMessages";
import type { SlotAssignment } from "@/lib/embed/parseBatch";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type { SourcingBatchSummary, SourcingTarget } from "@/lib/embed/sourcing/types";
import { useT } from "@/lib/i18n/useT";
import { buildPublishBatch } from "@/lib/lab/publishBatch";
import { createDraftAutosaver, type AutosaveStatus } from "@/lib/lab/draftAutosaver";
import { deleteDraft, listMyDrafts, loadDraft, newDraftId, saveDraft } from "@/lib/lab/draftStore";
import {
  isDraftBlank,
  type DraftEditorState,
  type DraftSummary,
} from "@/lib/lab/tournamentDraft";
import { lab } from "./theme";
import { DraftStatus } from "./DraftStatus";
import { DraftPicker } from "./DraftPicker";
import { SourcingQuotaDialog } from "./SourcingQuotaDialog";
import { YouTubeInspectorModal } from "./YouTubeInspectorModal";
import { SlotVideoTuner } from "./SlotVideoTuner";
import { TitleInput } from "./TitleInput";
import { CampaignSlugInput } from "./CampaignSlugInput";
import { CategorySelect } from "./CategorySelect";
import { DescriptionInput } from "./DescriptionInput";
import { KeywordChips } from "./KeywordChips";
import { DeadlinePicker } from "./DeadlinePicker";
import { Step2Summary } from "./Step2Summary";
import { ContestantGrid } from "./ContestantGrid";
import { GeneratePanel, type ChainStage } from "./GeneratePanel";
import { PublishButton } from "./PublishButton";
import { TournamentList } from "./TournamentList";

type AiSuggestion = {
  name: string;
  /** ISO 3166-1 alpha-2 — 서버가 정규화해서 준다(normalizeCountry). */
  nationality: string;
  /** 소속(그룹·팀·채널) — PR-2 신설 필드. */
  affiliation?: string;
  /**
   * @deprecated 옛 계약. **배포 순서 때문에 남겨 둔다**: 프론트는 머지 즉시
   * Vercel로 나가지만 functions는 사람이 따로 배포한다. 그 창 동안 배포된 옛
   * 함수는 `position`으로 답하고, 그때 affiliation이 undefined가 되면
   * Firestore가 undefined를 거부해 **발행이 통째로 실패한다**(E2E가 잡았다).
   */
  position?: string;
  imageSearchKeyword: string;
};

/**
 * 입력이 멈춘 뒤 저장까지 기다리는 시간. 1.5초 — 한 낱말을 치는 사이 쉼(보통 1초 안)
 * 에는 저장하지 않고, 손을 뗀 뒤엔 곧 저장된다. 새로고침으로 잃을 수 있는 입력은
 * 최대 이만큼이다(탭을 떠날 때는 즉시 저장을 한 번 더 시도한다). 한 문서에 1초에
 * 1회 남짓이라는 Firestore 쓰기 권장 속도 안에도 든다.
 */
const DRAFT_SAVE_DELAY_MS = 1500;

function emptyDraft(): ContestantDraft {
  return {
    name: "",
    nationality: "",
    affiliation: "",
    imageSearchKeyword: "",
  };
}

function toDraft(c: AiSuggestion): ContestantDraft {
  return {
    name: c.name ?? "",
    nationality: c.nationality ?? "",
    // 새 키 우선, 없으면 옛 키, 그래도 없으면 빈 문자열 — 어떤 경우에도
    // undefined를 만들지 않는다(Firestore 거부 → 발행 실패).
    affiliation: c.affiliation ?? c.position ?? "",
    imageSearchKeyword: c.imageSearchKeyword ?? "",
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
  const [campaignSlug, setCampaignSlug] = useState("");
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
  // LAB-UX-1: 결과물 체인([🎬 동영상 생성] = 채우기→소싱→검수). 단계와 진행률은
  // 버튼 하나가 다 보여준다 — 부품 버튼이 사라졌으므로 여기가 유일한 창구다.
  const [chainStage, setChainStage] = useState<ChainStage | null>(null);
  const [sourceProgress, setSourceProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [quotaPreview, setQuotaPreview] = useState<SourcingQuotaPreview | null>(null);
  // 다이얼로그 [소싱 시작]이 눌릴 때 쓸 재료. 확인 창을 사이에 두고 넘어가야 해서
  // state가 아니라 ref다 — 렌더를 한 번 더 돌릴 이유가 없고, 체인 안에서 읽는
  // 값이 화면 상태보다 항상 최신이어야 한다(setContestants는 비동기다).
  const pendingRun = useRef<{ targets: SourcingTarget[]; drafts: ContestantDraft[] } | null>(
    null,
  );

  // EDITOR-FIX-1 — 초안. "choose" = 이어서 만들기 목록, "edit" = 편집기.
  const [phase, setPhase] = useState<"loading" | "choose" | "edit">("loading");
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus | null>(null);
  // 처음 저장할 때 정한다 — 아무것도 안 친 편집기는 문서를 만들지 않는다.
  const draftIdRef = useRef<string | null>(null);
  const uidRef = useRef(uid);
  uidRef.current = uid;
  // 마지막으로 저장을 맡긴 내용. 같은 내용을 다시 쓰지 않는다(초안을 열기만 해도
  // "마지막 저장"이 바뀌면 목록 순서가 거짓말을 한다).
  const lastQueuedRef = useRef<string>("");
  const prevStepRef = useRef(step);
  const [autosaver] = useState(() =>
    createDraftAutosaver<DraftEditorState>({
      delayMs: DRAFT_SAVE_DELAY_MS,
      onStatus: setSaveStatus,
      save: async (state) => {
        const db = getDb();
        if (!draftIdRef.current) draftIdRef.current = newDraftId(db);
        await saveDraft(db, draftIdRef.current, uidRef.current, state);
      },
    }),
  );
  const editorState: DraftEditorState = {
    step,
    title,
    category,
    description,
    keywords,
    campaignSlug,
    deadlineMs,
    contestants,
  };

  /**
   * 검수 배지 두 종(중복 의심·이름↔힌트 불일치)은 그리드 상태에서 **파생**된다.
   * 채우기 응답에 실어오지 않는 이유는 reviewFlags.ts 머리주석에 있다 — 운영자가
   * 이름을 고치는 순간 판정이 따라 움직여야 한다.
   */
  const reviewFlags = useMemo(
    () =>
      deriveReviewFlags(
        Array.from({ length: TOTAL_CONTESTANTS }, (_, i) => {
          const d = contestants[i];
          return {
            name: d?.name ?? "",
            affiliation: d?.affiliation ?? "",
            imageSearchKeyword: d?.imageSearchKeyword ?? "",
          };
        }),
      ),
    [contestants],
  );
  const counters = step2Counters(
    contestants,
    sourcingStates,
    reviewFlags,
    TOTAL_CONTESTANTS,
  );

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

  // 열 때: 내 초안이 있으면 목록부터.
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    listMyDrafts(getDb(), uid)
      .then((list) => {
        if (!alive) return;
        setDrafts(list);
        setPhase(list.length > 0 ? "choose" : "edit");
      })
      .catch(() => {
        if (!alive) return;
        showToast(t("lab.draft.listFail"), "error");
        setPhase("edit");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열 때 한 번
  }, [uid]);

  // 자동 저장 — 내용이 바뀌면 디바운스, 단계가 바뀌면 즉시.
  const editorJson = JSON.stringify(editorState);
  useEffect(() => {
    if (phase !== "edit" || !uid) return;
    const stepChanged = prevStepRef.current !== step;
    prevStepRef.current = step;
    if (editorJson === lastQueuedRef.current) return;
    if (!draftIdRef.current && isDraftBlank(editorState)) return;
    lastQueuedRef.current = editorJson;
    autosaver.schedule(editorState);
    if (stepChanged) void autosaver.flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editorJson 이 editorState 를 대신한다
  }, [editorJson, phase, uid]);

  // 탭을 떠날 때(새로고침·창 닫기·다른 탭) 남은 입력을 바로 보낸다.
  useEffect(() => {
    const flushNow = () => void autosaver.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autosaver]);

  function applyEditorState(s: DraftEditorState) {
    setStep(s.step);
    prevStepRef.current = s.step;
    setTitle(s.title);
    setCategory(s.category);
    setDescription(s.description);
    setKeywords(s.keywords);
    setCampaignSlug(s.campaignSlug);
    setDeadlineMs(s.deadlineMs);
    setContestants(s.contestants);
    setSourcingStates({});
    lastQueuedRef.current = JSON.stringify(s);
  }

  function blankEditorState(): DraftEditorState {
    return {
      step: 1,
      title: "",
      category: "",
      description: "",
      keywords: [],
      campaignSlug: "",
      deadlineMs: presetDeadlineMs(Date.now(), DEFAULT_DEADLINE_DAYS),
      contestants: [],
    };
  }

  async function openDraft(id: string) {
    try {
      const loaded = await loadDraft(getDb(), id);
      if (!loaded) throw new Error("missing");
      await autosaver.stop();
      draftIdRef.current = id;
      applyEditorState(loaded);
      setSaveStatus(null);
      autosaver.resume();
      setPhase("edit");
    } catch {
      showToast(t("lab.draft.openFail"), "error");
    }
  }

  async function startNewDraft() {
    await autosaver.stop();
    draftIdRef.current = null;
    applyEditorState(blankEditorState());
    setSaveStatus(null);
    autosaver.resume();
    setPhase("edit");
  }

  async function removeDraft(id: string) {
    try {
      if (draftIdRef.current === id) {
        await autosaver.stop();
        draftIdRef.current = null;
      }
      await deleteDraft(getDb(), id);
      setDrafts((list) => list.filter((d) => d.id !== id));
    } catch {
      showToast(t("lab.draft.deleteFail"), "error");
    }
  }

  async function showDraftList() {
    await autosaver.flush();
    try {
      setDrafts(await listMyDrafts(getDb(), uid));
    } catch {
      showToast(t("lab.draft.listFail"), "error");
    }
    setPhase("choose");
  }

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
    // AI 호출 직전 저장 — 응답을 기다리다 새로고침해도 입력은 남는다.
    await autosaver.flush();
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
      // LAB-UX-1: 상한을 여기서 **자른다**. 예전엔 정규화만 하고 잘라내지 않아
      // 재클릭 시 8 + 12 = 20이 그대로 들어갔고 계수기가 "20/12"가 됐다.
      const merged = mergeKeywords(keywords, res.data.keywords);
      setKeywords(merged.values);
      if (merged.dropped > 0) {
        showToast(
          t("lab.keywords.capped", { max: KEYWORDS_MAX, dropped: merged.dropped }),
          "info",
        );
      }
      void track("admin_lab_ai_keywords_success", {
        category,
        keyword_count: merged.values.length,
        dropped: merged.dropped,
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
  /**
   * 채우기 1회. 돌려주는 `filledIndexes`가 **이번에 새로 채워진 칸**이다 —
   * 빈칸 체인이 그 칸들만 소싱하려면 이 목록이 있어야 한다(안 그러면 이미 영상이
   * 붙은 47칸까지 다시 검색해 하루 쿼터를 통째로 태운다).
   */
  async function fillWithAI(
    mode: "all" | "blanks",
  ): Promise<{ drafts: ContestantDraft[]; filledIndexes: number[] } | null> {
    if (filling) return null;
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
      return null;
    }
    setFilling(true);
    await autosaver.flush();
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
      // 체인이 다음 단계(소싱)에서 쓸 명단. setContestants는 비동기라 이 함수가
      // 돌려주는 배열이 유일하게 확실한 최신본이다.
      let applied: ContestantDraft[];
      let touched: number[];

      if (mode === "all") {
        applied = Array.from(
          { length: TOTAL_CONTESTANTS },
          (_, i) => incoming[i] ?? emptyDraft(),
        );
        touched = applied.map((d, i) => (d.name.trim() ? i : -1)).filter((i) => i >= 0);
        setContestants(applied);
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
        applied = merged;
        touched = filledIndexes;
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
      return { drafts: applied, filledIndexes: touched };
    } catch (err) {
      const code = (err as { code?: string }).code ?? "unknown";
      void track("admin_lab_ai_fill_error", { category, mode, error_code: code });
      showToast(t("lab.toast.fillFail"), "error");
      return null;
    } finally {
      setFilling(false);
    }
  }

  /**
   * LAB-EV-1 W4 — 검수 통과분을 슬롯 01..N에 얹는다. 차단 판정은 순수 층
   * (applyVideoAssignments)이 걸러내므로 여기서 다시 검사하지 않는다.
   */
  /**
   * 붙여넣은 링크 1회분을 그리드에 얹는다 (LAB-UX-1 ③).
   *
   * 두 단계다: ① 영상 주입(LAB-EV-1의 기존 계약 그대로) ② 제목에서 읽어낸
   * 인물 채우기 + 배지. ②는 ①의 결과 위에서 돌아야 한다 — 같은 setState 안에서
   * 이어 붙이지 않으면 한쪽이 다른 쪽을 덮는다.
   */
  function applyVideoSlots(
    assignments: SlotAssignment[],
    verdicts: LinkVerdict[],
    extractions: ExtractedContestant[],
  ) {
    let tally = { named: 0, manual: 0 };
    setContestants((prev) => {
      const withVideo = applyVideoAssignments(
        prev,
        assignments,
        verdicts,
        TOTAL_CONTESTANTS,
        emptyDraft,
      );
      // 차단 판정은 주입되지 않았으므로 그 슬롯은 배지도 받지 않는다.
      const injected = assignments.filter((a) =>
        verdicts.some((v) => v.videoId === a.videoId && v.status !== "blocked"),
      );
      const applied = applyExtractions(
        withVideo,
        injected,
        extractions,
        TOTAL_CONTESTANTS,
        emptyDraft,
      );
      tally = applied.tally;
      setSourcingStates((states) => ({ ...states, ...applied.states }));
      return applied.drafts;
    });
    void track("admin_lab_paste_extract", { named: tally.named, manual: tally.manual });
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

  /**
   * [🖼 이미지 생성] — 채우기 → 검수 (LAB-UX-1 결정 ①).
   *
   * 검색 콜을 한 번도 쓰지 않는 경로다. "검수"는 채워진 48칸을 중복 의심·이름↔힌트
   * 불일치로 훑는 일이고, 그 판정은 `reviewFlags`가 상태에서 파생한다 — 여기서는
   * 결과를 세어 한 줄로 알려주기만 하면 된다.
   */
  async function generateImages() {
    if (chainStage) return;
    setChainStage("filling");
    try {
      const filled = await fillWithAI("all");
      if (!filled) return;
      const drafts = filled.drafts;
      const flags = deriveReviewFlags(
        drafts.map((d) => ({
          name: d.name,
          affiliation: d.affiliation,
          imageSearchKeyword: d.imageSearchKeyword,
        })),
      );
      const c = step2Counters(drafts, {}, flags, TOTAL_CONTESTANTS);
      showToast(t("lab.generate.imagesDone", { filled: c.filled, todo: c.todo }), "success");
      void track("admin_lab_chain_images", { filled: c.filled, todo: c.todo });
    } finally {
      setChainStage(null);
    }
  }

  /**
   * 결과물 체인 — 채우기 → (쿼터 확인) → 소싱 → 검수.
   *
   * [🎬 동영상 생성]은 48칸 전부(mode="all"), [빈칸만 AI로 채우기]는 **이번에 채운
   * 칸만**(mode="blanks") 태운다. 원래 빈칸 경로는 채우기에서 끝나서, 새로 들어온
   * 인물에게 영상도 배지도 [새 영상 찾기]도 없는 칸이 남았다 — 복구 수단이 링크
   * 붙여넣기뿐이었다(대표 스모크 2026-08-25).
   *
   * R2: 새 서버 API를 만들지 않는다. 기존 콜러블 두 개(aiFillContestants,
   * autoSourceVideos)를 클라이언트가 **순서대로** 부를 뿐이다. 순서를 화면이
   * 갖는다는 게 이번 재편의 전부다.
   *
   * 확인 창은 채우기 **뒤**에 뜬다(결정 3 유지). 견적이 "몇 칸을 검색하는가"에
   * 달려 있어서, 명단이 없으면 물어볼 수 있는 게 없다.
   */
  async function startVideoChain(mode: "all" | "blanks") {
    if (chainStage) return;
    setChainStage("filling");
    let filled: { drafts: ContestantDraft[]; filledIndexes: number[] } | null = null;
    try {
      filled = await fillWithAI(mode);
    } finally {
      if (!filled) setChainStage(null);
    }
    if (!filled) {
      showToast(t("lab.generate.chainFillFailed"), "error");
      return;
    }
    const drafts = filled.drafts;

    // 빈칸 경로는 **이번에 채운 칸만** 소싱한다 — 규칙은 순수 층에서 잠근다.
    const targets = chainTargets(drafts, mode, filled.filledIndexes);
    if (targets.length === 0) {
      setChainStage(null);
      showToast(t("lab.source.noTargets"), "info");
      return;
    }

    // 견적은 드라이런이라 search 콜을 쓰지 않는다. 실패하면 체인을 멈춘다 —
    // 남은 콜을 모르는 채로 48칸을 태우게 두지 않는다.
    try {
      const preview = await previewSourcingQuota(targets, keywords);
      pendingRun.current = { targets, drafts };
      setQuotaPreview(preview);
    } catch (err) {
      setChainStage(null);
      const code = inspectErrorCode(err);
      // 토스트는 4초 뒤 사라진다. 그것만 남기면 다음 디버거는 "버튼을 눌렀는데
      // 아무 일도 안 일어난다"만 보게 된다 — autoSource.ts의 "실패를 조용히
      // 삼키지 않는다"를 이 경로에도 적용한다.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Lab] previewSourcingQuota failed:", code, err);
      }
      showToast(t(sourcingErrorMessage(code).key), "error");
      void track("admin_lab_source_preview_error", { error_code: code });
    }
  }

  /** 확인 창 [취소] — 채워진 명단은 그대로 두고 소싱만 접는다. */
  function cancelVideoChain() {
    pendingRun.current = null;
    setQuotaPreview(null);
    setChainStage(null);
  }

  /** 확인 창 [소싱 시작] — 배치를 순차로 돌리고 배치마다 그리드에 얹는다. */
  async function runVideoChain() {
    const run = pendingRun.current;
    pendingRun.current = null;
    setQuotaPreview(null);
    if (!run) {
      setChainStage(null);
      return;
    }

    setChainStage("sourcing");
    const started = Date.now();
    const result = await runSourcingBatches(
      {
        targets: run.targets,
        categoryKeywords: keywords,
        excludeVideoIds: collectExcludedVideoIds(
          run.drafts,
          run.targets.map((x) => x.index),
        ),
      },
      {
        call: autoSourceVideos,
        onBatch: applySourcingBatch,
        onProgress: (done, total) => setSourceProgress({ done, total }),
      },
    );
    setSourceProgress(null);
    setChainStage(null);

    // 부분 결과 계약: 중간에 끊겨도 앞선 배치는 그리드에 남아 있다. 그걸 말해준다.
    if (result.error) {
      const code = inspectErrorCode(result.error);
      showToast(t(sourcingErrorMessage(code).key), "error");
      showToast(t("lab.generate.chainStopped", { remaining: result.remaining }), "info");
      void track("admin_lab_source_error", {
        error_code: code,
        remaining: result.remaining,
        sourced: result.tally.suggested,
      });
    } else if (result.remaining > 0) {
      showToast(t("lab.generate.chainStopped", { remaining: result.remaining }), "info");
    }
    if (result.tally.suggested + result.tally.manual + result.tally.unknownPerson > 0) {
      showToast(
        t("lab.source.done", {
          suggested: result.tally.suggested,
          manual: result.tally.manual,
          unknown: result.tally.unknownPerson,
          searches: result.tally.searchCalls,
        }),
        result.error ? "info" : "success",
      );
    }
    void track("admin_lab_source_run", {
      duration_ms: Date.now() - started,
      targets: run.targets.length,
      suggested: result.tally.suggested,
      manual: result.tally.manual,
      unknown_person: result.tally.unknownPerson,
      cache_hits: result.tally.cacheHits,
      ai_judged: result.tally.aiJudged,
      ambiguous: result.tally.ambiguous,
      search_calls: result.tally.searchCalls,
      units: result.tally.units,
      remaining: result.remaining,
    });
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

  function reframeSlot(index: number, patch: { orientation?: EmbedOrientation; focusY?: number }) {
    setContestants((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = reframeDraft(next[index], patch);
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
    const current = contestants[index];
    const renamed =
      patch.name !== undefined && isRenamedTo(current?.name ?? "", patch.name);
    // 이름을 지우거나(LAB-EV-2) 다른 인물로 고치면(LAB-UX-1) 그 칸은 다른 사람의
    // 자리가 된다 — 배지도 함께 뗀다.
    if (patch.name !== undefined && (patch.name.trim() === "" || renamed)) {
      setSourcingStates((states) => dropSourcingStates(states, [index]));
    }
    if (renamed) showToast(t("lab.contestant.released"), "info");
    setContestants((prev) => {
      const next =
        prev.length === TOTAL_CONTESTANTS
          ? [...prev]
          : Array.from({ length: TOTAL_CONTESTANTS }, (_, i) => prev[i] ?? emptyDraft());
      // 이름이 바뀐 칸은 이전 인물의 영상·검색어까지 뗀 draft로 갈아 끼운다.
      // 그러지 않으면 카드에는 새 이름이, 재생에는 옛 인물이 남는다.
      const base = renamed
        ? releaseRenamedSlot(next[index], patch.name as string)
        : next[index];
      next[index] = { ...base, ...patch };
      return next;
    });
  }

  async function publish() {
    if (!uid || !step1Ready) return;
    setPublishing(true);
    // 발행이 지울 초안을 늦게 도착한 저장이 되살리지 않게 저장을 멈춘다.
    await autosaver.stop();
    const draftId = draftIdRef.current;
    try {
      // Translate title + description once (미보유 언어만 Haiku; 실패 시 원문
      // fallback — 발행은 성공, ADR-B2 §4). Source lang = current UI lang.
      const meta = await translateMeta({
        title: title.trim(),
        description: description.trim(),
        sourceLang: lang,
      });

      const db = getDb();
      const tournament = {
        ...buildTournamentDoc(
          {
            title: title.trim(),
            titleI18n: meta.titleI18n,
            description: meta.descriptionI18n,
            keywords,
            category,
            hostUid: uid,
            deadlineMs,
            campaignSlug,
          },
          validCategoryIds,
          nowMs,
        ),
        createdAt: serverTimestamp(),
        tournamentDeadline: Timestamp.fromMillis(deadlineMs),
      };
      // 초안 삭제는 같은 배치 — 발행이 성공해야만 지워진다(EDITOR-FIX-1).
      const { batch, tournamentId } = buildPublishBatch(db, {
        tournament,
        contestants: (id) => buildContestantDocs(id, uid, contestants),
        draftId,
      });

      await batch.commit();
      draftIdRef.current = null;
      void track("admin_lab_publish", { tournament_id: tournamentId, category });
      showToast(t("lab.toast.publishSuccess"), "success");

      // Reset for the next Tournament; refresh the list.
      setStep(1);
      setTitle("");
      setCategory("");
      setDescription("");
      setKeywords([]);
      setCampaignSlug("");
      setDeadlineMs(presetDeadlineMs(Date.now(), DEFAULT_DEADLINE_DAYS));
      setContestants([]);
      setSourcingStates({});
      setSaveStatus(null);
      lastQueuedRef.current = "";
      setListRefresh((n) => n + 1);
      autosaver.resume();
    } catch (err) {
      const code = (err as { code?: string }).code ?? "unknown";
      void track("admin_lab_publish_error", { error_code: code });
      showToast(t("lab.toast.publishFail"), "error");
      // 발행 실패 — 초안은 그대로다. 멈춰 둔 저장을 다시 켜고 지금 내용을 맡긴다.
      autosaver.resume();
      lastQueuedRef.current = JSON.stringify(editorState);
      autosaver.schedule(editorState);
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
        {phase === "edit" && (
          <>
            <div
              style={{
                margin: "6px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <span style={{ fontSize: 13, color: lab.textMuted }}>STEP {step} / 2</span>
              <button
                type="button"
                onClick={() => void showDraftList()}
                data-testid="draft-back-to-list"
                style={{
                  flexShrink: 0,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${lab.border}`,
                  background: "transparent",
                  color: lab.textSub,
                  fontSize: 12,
                  fontFamily: lab.font,
                  cursor: "pointer",
                }}
              >
                {t("lab.draft.backToList")}
              </button>
            </div>
            {/* 저장 상태는 자기 줄을 갖는다 — 긴 실패 문구(es 2줄)가 나타나도 위 줄이 밀리지 않고,
                상태가 처음 생길 때 화면이 튀지 않게 한 줄 높이를 비워 둔다. */}
            <div style={{ marginTop: 6, minHeight: 26, display: "flex", alignItems: "center" }}>
              <DraftStatus status={saveStatus} onRetry={() => void autosaver.retry()} />
            </div>
          </>
        )}
      </header>

      {phase !== "edit" && (
        <DraftPicker
          drafts={drafts}
          loading={phase === "loading"}
          onOpen={(id) => void openDraft(id)}
          onDelete={(id) => void removeDraft(id)}
          onNew={() => void startNewDraft()}
        />
      )}

      {phase === "edit" && step === 1 && (
        <div style={{ display: "grid", gap: 20 }}>
          <TitleInput value={title} onChange={setTitle} />
          <CampaignSlugInput value={campaignSlug} onChange={setCampaignSlug} />
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

      {phase === "edit" && step === 2 && (
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
          <GeneratePanel
            counters={counters}
            stage={chainStage}
            progress={sourceProgress}
            onGenerateVideos={() => void startVideoChain("all")}
            onGenerateImages={() => void generateImages()}
            onPasteLinks={() => setInspectorOpen(true)}
            // 빈칸도 같은 체인을 탄다 — 채우기로 끝나면 영상도 배지도 없는 칸이
            // 남아 복구가 안 된다(대표 스모크 지적 ②).
            onFillBlanks={() => void startVideoChain("blanks")}
            hasBlanks={counters.filled < TOTAL_CONTESTANTS}
            disabled={publishing}
          />
          <ContestantGrid
            contestants={contestants}
            onChange={updateContestant}
            onTune={setTuningIndex}
            sourcing={sourcingStates}
            reviewFlags={reviewFlags}
            onRefreshVideo={(index) => void refreshSlot(index)}
            refreshingIndex={refreshingIndex}
          />
          <p style={{ margin: 0, fontSize: 12, color: lab.textMuted }}>
            {t("lab.fill.hint")}
          </p>
        </div>
      )}

      {uid && <TournamentList hostUid={uid} refreshKey={listRefresh} />}

      {/* LAB-UX-1 — 체인의 쿼터 확인 창(결정 3). 견적은 드라이런이라 0콜이다. */}
      {quotaPreview && (
        <SourcingQuotaDialog
          preview={quotaPreview}
          onCancel={cancelVideoChain}
          onRun={() => void runVideoChain()}
        />
      )}

      {/* LAB-EV-1 — 검수기(W4)와 슬롯 미세조정(W5). 둘 다 STEP 2 전용. */}
      <YouTubeInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        blankIndexes={blankSlotIndexes(contestants, TOTAL_CONTESTANTS)}
        onApply={applyVideoSlots}
      />
      {tuningIndex !== null && contestants[tuningIndex]?.videoId && (
        <SlotVideoTuner
          index={tuningIndex}
          draft={contestants[tuningIndex]}
          onRetime={(startSec, durationSec) => retimeSlot(tuningIndex, startSec, durationSec)}
          onReframe={(patch) => reframeSlot(tuningIndex, patch)}
          onRemove={() => removeSlotVideo(tuningIndex)}
          onClose={() => setTuningIndex(null)}
        />
      )}
    </main>
  );
}
