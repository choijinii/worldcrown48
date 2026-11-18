/**
 * articleViewCore — 기사 조회 기록 저장 핵심 (PITCH-2 PR B · 원장 D-78 후보).
 *
 * 기사 옆 조회 칸 `news_views/{slug}` 에 `total` · `d<YYYYMMDD>`(KST) 를 1씩 더한다(대표 결정 2026-11-18).
 * 기사 문서 `news/{slug}` 는 건드리지 않는다 — 기사 목록을 실시간으로 보는 화면(피치 뉴스 칸 · /news ·
 * 관리자 뉴스 데스크)이 조회 하나마다 그 기사를 다시 받아 읽기 요금이 불어나지 않게.
 * 급등(최근 24시간 조회 증가)의 재료다. 계약(날짜 칸 이름 · 지울 칸)은 lib/news/articleViews 한 곳.
 * 기사가 지워지면 deleteArticleViewsCore 가 조회 칸도 지운다(onArticleDeleted 트리거).
 *
 * **1시간 1번**: 같은 연결(IP) · 같은 기사 · 같은 시간(정각~정각)이면 한 번만 센다. 표지 문서
 * `news_view_marks/{해시}` 를 create(이미 있으면 실패)로 만들어 동시에 와도 한 번만 센다. 표지에는 IP 를
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

/** 기사별 조회 칸 — 문서 id = 기사 slug · 칸 = ArticleViews(total · d<YYYYMMDD>). 누구나 읽고 함수만 쓴다. */
export const VIEWS_COLLECTION = "news_views";
export const VIEW_MARKS_COLLECTION = "news_view_marks";
/** gRPC 상태 번호 — 문서가 이미 있음. */
const ALREADY_EXISTS = 6;
const HOUR_MS = 3_600_000;
/** 표지 수명 — 한 시간 창이 끝난 뒤 넉넉히 1시간 더. */
export const VIEW_MARK_TTL_MS = 2 * HOUR_MS;

/** 같은 연결 · 같은 기사 · 같은 시간(정각~정각, KST 와 UTC 의 정각은 같다)이면 같은 id. */
export function viewMarkId(salt: string, ip: string, slug: string, nowMs: number): string {
  const hour = Math.floor(nowMs / HOUR_MS);
  return createHash("sha256").update(`${salt}\u0000${ip}\u0000${slug}\u0000${hour}`).digest("hex");
}

/** 에뮬레이터에서만 쓰는 연결 이름 — 에뮬레이터는 함수에 IP 를 넘겨 주지 않는다. */
export const EMULATOR_CLIENT = "emulator-local";

/** IPv6 는 앞 64비트(한 가정 · 한 기기가 받는 덩어리)로 묶는다 — 주소를 계속 바꿔 "1시간 1번"을 피하지 못하게. */
function normalizeIp(ip: string): string {
  const v4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (v4) return v4[1];
  if (!ip.includes(":")) return ip;
  const [head, tail] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  const first4 = groups.slice(0, 4).map((g) => (Number.parseInt(g || "0", 16) || 0).toString(16));
  return `${first4.join(":")}::/64`;
}

/**
 * 요청한 팬의 IP — X-Forwarded-For 머리글의 **맨 오른쪽** 값.
 *
 * 함수 틀(functions-framework)은 `trust proxy` 를 켜 두어 `req.ip` 가 머리글의 **맨 왼쪽** 값이 된다.
 * 구글 앞단은 머리글을 갈아 끼우지 않고 진짜 주소를 **뒤에 덧붙이므로** 맨 왼쪽은 팬이 적어 보낸 값이다
 * (리뷰 2026-11-18 — functions-framework 5.0.5 build/src/server.js 89줄 확인). 그래서 `req.ip` 는 보지 않는다.
 * 콜러블은 cloudfunctions.net · run.app 주소로 바로 부르므로(앞에 다른 프록시 없음) 맨 오른쪽 = 구글 앞단이 본 주소.
 * ⚠ 이 가정은 배포 뒤 가짜 머리글을 넣어 실측한다(PR 설명 배포 확인 표).
 *
 * 머리글이 없으면 빈 글자 → 세지 않는다. 에뮬레이터는 머리글도 IP 도 주지 않아 시험에서만 고정 이름.
 */
export function clientIpOf(
  raw: { ip?: string; headers?: Record<string, string | string[] | undefined> } | undefined,
  isEmulator: boolean,
): string {
  const header = raw?.headers?.["x-forwarded-for"];
  const joined = Array.isArray(header) ? header.join(",") : header ?? "";
  const last = joined.split(",").map((x) => x.trim()).filter(Boolean).pop() ?? "";
  if (last) return normalizeIp(last);
  return isEmulator ? EMULATOR_CLIENT : "";
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
  const viewsRef = db.collection(VIEWS_COLLECTION).doc(input.slug);
  const markRef = db.collection(VIEW_MARKS_COLLECTION).doc(input.markId);
  const today = todayKST(new Date(input.nowMs));

  // 트랜잭션을 쓰지 않는다 — 인기 기사 한 문서에 트랜잭션이 몰리면 다시 시도하다 실패한다(리뷰 3).
  // 중복 막기는 표지 create(이미 있으면 ALREADY_EXISTS)가 맡고, 덧셈은 읽지 않는 increment 라 겹쳐도 맞다.
  const [article, viewsSnap] = await Promise.all([articleRef.get(), viewsRef.get()]);
  if (!article.exists || article.get("status") !== "published") {
    return { counted: false, reason: "not-found" };
  }
  try {
    await markRef.create({ expireAt: deps.timestamp(viewMarkExpireAtMs(input.nowMs)) });
  } catch (err) {
    if ((err as { code?: unknown })?.code === ALREADY_EXISTS) return { counted: false, reason: "duplicate" };
    throw err;
  }

  const update: Record<string, unknown> = {
    total: deps.increment(1),
    [viewDayKey(today)]: deps.increment(1),
  };
  for (const key of bucketsToPrune(viewsSnap.data() as ArticleViews | undefined, today)) {
    update[key] = deps.deleteField();
  }
  // 첫 조회면 문서를 만들고, 있으면 칸만 더한다(merge). increment 는 읽지 않고 더하므로 겹쳐도 맞다.
  await viewsRef.set(update, { merge: true });
  return { counted: true };
}

/** 기사가 지워졌을 때 그 기사의 조회 칸을 지운다. 칸이 없어도 오류 없이 지나간다. */
export async function deleteArticleViewsCore(db: Firestore, slug: string): Promise<void> {
  await db.collection(VIEWS_COLLECTION).doc(slug).delete();
}
