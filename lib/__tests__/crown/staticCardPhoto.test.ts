/** IMAGE-1 — 크라운 카드 창의 HTML 미리보기: 그림 엔트리면 사진 자리에 그 그림, 아니면 이니셜. */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CrownStaticCard } from "@/components/crown/CrownStaticCard";

const base = { initial: "A", name: "N", title: "T", url: "u", path: "", campaign: "site" };
describe("CrownStaticCard", () => {
  it("photoUrl 이 있으면 그림 · object-position 은 focusY", () => {
    const html = renderToStaticMarkup(
      createElement(CrownStaticCard, { data: { ...base, photoUrl: "https://firebasestorage.googleapis.com/x", photoFocusY: 30 } }),
    );
    expect(html).toContain('data-testid="crown-card-photo"');
    expect(html).toContain('src="https://firebasestorage.googleapis.com/x"');
    expect(html).toContain("object-position:50% 30%");
  });
  it("없으면 이니셜", () => {
    const html = renderToStaticMarkup(createElement(CrownStaticCard, { data: base }));
    expect(html).not.toContain('data-testid="crown-card-photo"');
    expect(html).toContain(">A</div>");
  });
});
