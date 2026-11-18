/**
 * recordArticleView (브라우저) — 기사 지면을 열면 조회 기록 콜러블을 한 번 부른다 (PITCH-2 PR B).
 *
 * 같은 브라우저 · 같은 기사는 **1시간 로컬 메모**(localStorage)로 다시 부르지 않는다. 서버도 같은
 * 연결 · 같은 기사 · 같은 시간은 한 번만 세므로(news_view_marks) 메모는 호출 수를 줄이는 몫이다.
 *
 * 조용히 실패한다: 저장소가 막혀도(사생활 창 등) 부르고, 콜러블이 실패해도 던지지 않고 콘솔에도
 * 남기지 않는다 — 조회 기록 때문에 지면이 깨지거나 콘솔 오류가 생기면 안 된다.
 *
 * 로그인하지 않는다 — 익명 계정을 만들지 않는다(원장 D-41). 콜러블은 공개 호출이다.
 */
import { isValidArticleSlug } from "./articleViews";

export const VIEW_MEMO_KEY = "wc48_article_views";
export const VIEW_MEMO_TTL_MS = 3_600_000;

export interface RecordViewClientDeps {
  storage: Storage | null;
  call: (slug: string) => Promise<unknown>;
  now: () => number;
}

type Memo = Record<string, number>;

function readMemo(storage: Storage | null, now: number): Memo {
  try {
    const raw = storage?.getItem(VIEW_MEMO_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const fresh: Memo = {};
    for (const [slug, at] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof at === "number" && now - at < VIEW_MEMO_TTL_MS) fresh[slug] = at;
    }
    return fresh;
  } catch {
    return {};
  }
}

function writeMemo(storage: Storage | null, memo: Memo): void {
  try {
    storage?.setItem(VIEW_MEMO_KEY, JSON.stringify(memo));
  } catch {
    /* 저장소가 막혀 있으면 메모 없이 지낸다 */
  }
}

function defaultDeps(): RecordViewClientDeps {
  let storage: Storage | null = null;
  try {
    storage = typeof window === "undefined" ? null : window.localStorage;
  } catch {
    storage = null;
  }
  return {
    storage,
    now: () => Date.now(),
    call: async (slug) => {
      const [{ httpsCallable }, { getFunctionsInstance }] = await Promise.all([
        import("firebase/functions"),
        import("@/lib/firebase"),
      ]);
      await httpsCallable(getFunctionsInstance(), "recordArticleView")({ slug });
    },
  };
}

/** 불렀으면 true. 메모 때문에 건너뛰었거나 실패하면 false. 절대 던지지 않는다. */
export async function recordArticleViewOnce(
  slug: string,
  deps: RecordViewClientDeps = defaultDeps(),
): Promise<boolean> {
  if (!isValidArticleSlug(slug)) return false;
  const now = deps.now();
  const memo = readMemo(deps.storage, now);
  if (memo[slug] !== undefined) return false;

  // 부르기 전에 메모 — 같은 화면이 두 번 붙어도(StrictMode) 한 번만 부른다. 실패하면 되돌린다.
  writeMemo(deps.storage, { ...memo, [slug]: now });
  try {
    await deps.call(slug);
    return true;
  } catch {
    writeMemo(deps.storage, memo);
    return false;
  }
}
