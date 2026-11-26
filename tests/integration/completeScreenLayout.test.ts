/**
 * 완주 화면 배치 통합 (지시서 RUN-FIX-2 완주화면 v1.0 · 2026-11-25).
 *
 * 크라운 카드 창(CrownCardModal)이 화면 한 장을 통째로 차지하고 [다시 참여] 영역이 그 **아래 바깥에** 붙어 있어서
 * 버튼이 늘 첫 화면 밖이었다. 이제 완주 분기는 액션 영역을 창의 `footer` 로 넘겨, 카드와 **같은 무대(crownStage) 안**
 * 카드 바로 아래에 그린다. 서버 렌더로 그 구조를 확인한다(실제 첫 화면 안 여부는 E2E 가 세 화면 크기에서 본다).
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CrownCardModal } from "@/components/crown/CrownCardModal";
import { RunCompleteActions } from "@/components/arena/RunCompleteActions";

const data = { initial: "A", name: "N", title: "T", url: "worldcrown48.com", path: "", campaign: "site" };
const actions = createElement(RunCompleteActions, {
  run: { screen: "complete", displayRunIndex: 1, nextRunIndex: 2, runsToday: 1, limit: 3, canPlayAgain: true, blockedReason: null },
  uid: "u",
  tournamentId: "t",
  isGuest: true,
  nameOf: () => undefined,
  onPlayAgain: () => {},
  onSignIn: () => {},
});
const modal = (footer?: React.ReactNode) =>
  renderToStaticMarkup(createElement(CrownCardModal, { data, canShare: true, canSave: false, onSignIn: () => {}, footer }));

describe("완주 분기 — [다시 참여]가 크라운 카드와 같은 무대 안, 카드 바로 아래", () => {
  it("footer 를 넘기면 무대 안 · 카드 창 뒤에 그려진다", () => {
    const html = modal(actions);
    const stageAt = html.indexOf('data-testid="crown-stage"');
    const cardAt = html.indexOf('aria-label="Crown Card"');
    const footerAt = html.indexOf('data-testid="crown-footer"');
    const buttonAt = html.indexOf("Play again");
    expect(stageAt).toBeGreaterThan(-1);
    expect(footerAt, "footer 자리").toBeGreaterThan(cardAt);
    expect(buttonAt, "[다시 참여] 버튼이 footer 안").toBeGreaterThan(footerAt);
    // 무대 div 가 닫히기 전에 버튼이 나온다 = 같은 무대 안
    const sfCrown = html.slice(html.indexOf('data-testid="crown-modal"'));
    expect(sfCrown).toContain("Play again");
    expect(html).toMatch(/data-testid="crown-modal"[^>]*data-footer=""/);
  });

  it("footer 가 없으면(챔피언 착지 페이지) 예전 모양 그대로", () => {
    const html = modal();
    expect(html).not.toContain('data-testid="crown-footer"');
    expect(html).not.toMatch(/data-footer=/);
  });
});
