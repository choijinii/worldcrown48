/**
 * articleViewCore — 기사 조회 기록 저장 핵심 (PITCH-2 PR B · 원장 D-78 후보).
 *
 * 우리 기사 `news/{slug}` 에 `views.total` · `views.d<YYYYMMDD>`(KST) 를 1씩 더한다.
 * 급등(최근 24시간 조회 증가)의 재료다. 계약(날짜 칸 이름 · 지울 칸)은 lib/news/articleViews 한 곳.
 *
 * **1시간 1번**: 같은 연결(IP) · 같은 기사 · 같은 시간(정각~정각)이면 한 번만 센다. 표지 문서
 * `news_view_marks/{해시}` 를 트랜잭션 안에서 만들어 동시에 와도 한 번만 센다. 표지에는 IP 를
 * 남기지 않는다(id 가 소금 섞은 해시 · 칸은 지울 시각 expireAt 하나) — Firestore TTL 이 2시간 뒤 지운다.
 *
 * 발행된 기사만 센다(초안 · 내린 기사 · 없는 기사는 문서를 건드리지 않는다).
 *
 * Firestore 와 서버 표지(increment · delete · Timestamp)는 주입받는다 — 콜러블(functions 의
 * firebase-admin)과 에뮬레이터 시험(루트의 firebase-admin)이 같은 코드를 돈다(waitlistCore 와 같은 이유).
 */
import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { bucketsToPrune, viewDayKey, type ArticleViews } from "../_news/articleViews";
import { todayKST } from "../_run/kstReset";

export const VIEW_MARKS_COLLECTION = "news_view_marks";
const HOUR_MS = 3_600_000;
/** 표지 수명 — 한 시간 창이 끝난 뒤 넉넉히 1시간 더. */
export const VIEW_MARK_TTL_MS = 2 * HOUR_MS;

/** 같은 연결 · 같은 기사 · 같은 시간(정각~정각, KST 와 UTC 의 정각은 같다)이면 같은 id. */
export function viewMarkId(salt: string, ip: string, slug: string, nowMs: number): string {
  const hour = Math.floor(nowMs / HOUR_MS);
  return createHash("sha256").update(`${salt}\u0000${ip}\u0000${slug}\u0000${hour}`).digest("hex");
}

export function viewMarkExpireAtMs(nowMs: number): number {
  return nowMs + VIEW_MARK_TTL_MS;
}

export interface RecordViewDeps {
  increment: (n: number) => unknown;
  deleteField: () => unknown;
  timestamp: (ms: number) => unknown;
}

export type RecordViewResult =
  | { counted: true }
  | { counted: false; reason: "not-found" | "duplicate" };

export async function recordArticleViewCore(
  db: Firestore,
  input: { slug: string; markId: string; nowMs: number },
  deps: RecordViewDeps,
): Promise<RecordViewResult> {
  const articleRef = db.collection("news").doc(input.slug);
  const markRef = db.collection(VIEW_MARKS_COLLECTION).doc(input.markId);
  const today = todayKST(new Date(input.nowMs));

  return db.runTransaction(async (tx) => {
    const [article, mark] = await Promise.all([tx.get(articleRef), tx.get(markRef)]);
    if (!article.exists || article.get("status") !== "published") {
      return { counted: false, reason: "not-found" } as const;
    }
    if (mark.exists) return { counted: false, reason: "duplicate" } as const;

    const update: Record<string, unknown> = {
      "views.total": deps.increment(1),
      [`views.${viewDayKey(today)}`]: deps.increment(1),
    };
    for (const key of bucketsToPrune(article.get("views") as ArticleViews | undefined, today)) {
      update[`views.${key}`] = deps.deleteField();
    }
    tx.create(markRef, { expireAt: deps.timestamp(viewMarkExpireAtMs(input.nowMs)) });
    tx.update(articleRef, update);
    return { counted: true } as const;
  });
}
