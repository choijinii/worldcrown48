/**
 * crownRenderAlert — 서버 Crown Card 그리기 실패를 운영자 페이지 알림(admin_alerts)으로 남긴다.
 *
 * CARD-FIX(2026-10-04): 2026-09-27 Node 22 배포부터 `Cannot find module 'canvas'` 로 카드가 한 장도
 * 안 만들어졌는데, 함수는 로그 한 줄만 남기고 끝나 1주일 넘게 아무도 몰랐다. 운영자가 보는 곳에
 * 남긴다.
 *
 * 중복 방지는 차트 이상 징후(scheduleRankingCacheCore 의 T-1/T-2)와 같은 원칙이다: 같은 종류의
 * **열린(resolved=false)** 알림이 있으면 새로 만들지 않고 그 문서의 횟수(count)와 마지막 시각을
 * 갱신한다. 원인이 하나(부품 설치)면 실패는 완주마다 반복되므로, 매번 새 문서를 만들면 목록이
 * 같은 알림으로 덮인다. 대회를 가리지 않는다 — 그리기 실패는 대회의 사정이 아니다.
 *
 * `createdAt` 이 마지막 시각 역할을 한다(차트 dedup 이 갱신 때 createdAt 을 새로 쓰는 것과 같다).
 * 운영자 목록이 createdAt 순으로 정렬하고 "N분 전"을 그리므로, 갱신된 알림이 위로 올라온다.
 * 처음 시각은 `firstSeenAt` 에 남는다.
 *
 * 순수 판정(planRenderFailureAlert)과 쓰기(recordRenderFailure)를 나눈다. 쓰기는 저장소를 주입받아
 * 에뮬레이터 없이 시험한다. **알림 쓰기가 실패해도 던지지 않는다** — 카드 그리기 실패는 영구
 * 실패라 재시도하지 않는다는 원칙(onChampionConfirmed)을 알림 때문에 깨지 않는다.
 */

export const CROWN_RENDER_ALERT_TYPE = "crown_card_render_failed";

export interface RenderFailure {
  error: unknown;
  cardId: string;
  tournamentId: string;
}

export interface OpenAlert {
  id: string;
  count: number;
}

export type RenderAlertPlan =
  | {
      action: "create";
      doc: {
        type: typeof CROWN_RENDER_ALERT_TYPE;
        severity: "high";
        detail: string;
        tournamentId: string;
        cardId: string;
        count: number;
        resolved: false;
      };
    }
  | {
      action: "update";
      id: string;
      patch: { count: number; detail: string; tournamentId: string; cardId: string };
    };

function firstLine(error: unknown): string {
  const raw = error instanceof Error ? error.message : error == null ? "" : String(error);
  const line = raw.split("\n")[0].trim();
  return line || "unknown error";
}

export function planRenderFailureAlert(
  input: RenderFailure & { open: OpenAlert | null },
): RenderAlertPlan {
  const detail = `${firstLine(input.error)} · ${input.cardId}`;
  if (!input.open) {
    return {
      action: "create",
      doc: {
        type: CROWN_RENDER_ALERT_TYPE,
        severity: "high",
        detail,
        tournamentId: input.tournamentId,
        cardId: input.cardId,
        count: 1,
        resolved: false,
      },
    };
  }
  const prev = Number.isFinite(input.open.count) && input.open.count > 0 ? input.open.count : 1;
  return {
    action: "update",
    id: input.open.id,
    patch: { count: prev + 1, detail, tournamentId: input.tournamentId, cardId: input.cardId },
  };
}

/** admin_alerts 에 닿는 최소 면 — 실제 구현은 onChampionConfirmed 가 admin SDK 로 만든다. */
export interface AlertStore {
  /** 이 종류의 열린(resolved=false) 알림 하나 — 없으면 null. */
  findOpen(): Promise<OpenAlert | null>;
  /** 새 알림. 시각(createdAt·firstSeenAt)은 저장소가 찍는다. */
  create(doc: Record<string, unknown>): Promise<void>;
  /** 열린 알림 갱신. 마지막 시각(createdAt)은 저장소가 찍는다. */
  update(id: string, patch: Record<string, unknown>): Promise<void>;
}

/** 실패를 알림으로 남긴다. 어떤 오류도 밖으로 던지지 않는다. */
export async function recordRenderFailure(store: AlertStore, failure: RenderFailure): Promise<void> {
  try {
    const plan = planRenderFailureAlert({ ...failure, open: await store.findOpen() });
    if (plan.action === "create") await store.create(plan.doc);
    else await store.update(plan.id, plan.patch);
  } catch (err) {
    console.warn("[crownRenderAlert] admin_alerts write failed — ignored:", err);
  }
}
