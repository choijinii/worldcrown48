/**
 * LAB-FIX-3b 통합 — 엔트리 칸 그리기: 리뷰 표시와 [영상]/[이미지] 버튼이 같은 한 줄(`slot-row-N`)에 있다.
 * 리뷰 표시는 왼쪽, 버튼 묶음은 줄의 마지막 자식(오른쪽 끝)이다. 리뷰 표시가 없어도 줄과 버튼 자리는 같다.
 * 주소 칸 자리(`slot-line-N`)는 그 줄 바로 다음 형제다 — 열고 닫아도 줄 위의 버튼은 움직이지 않는다.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseFragment } from "parse5";
import { ContestantEditor } from "@/components/admin/lab/ContestantEditor";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

type Node = { nodeName: string; attrs?: { name: string; value: string }[]; childNodes?: Node[] };
const attr = (n: Node, k: string) => n.attrs?.find((a) => a.name === k)?.value;
const els = (n: Node) => (n.childNodes ?? []).filter((c) => !c.nodeName.startsWith("#"));
function find(n: Node, id: string, parent: Node | null = null): { node: Node; parent: Node | null } | null {
  if (attr(n, "data-testid") === id) return { node: n, parent };
  for (const c of n.childNodes ?? []) {
    const hit = find(c, id, n);
    if (hit) return hit;
  }
  return null;
}
const contains = (n: Node, id: string): boolean => find(n, id) !== null;

const noop = () => {};
const base: ContestantDraft = { name: "민지", nationality: "KR", affiliation: "NewJeans", imageSearchKeyword: "" };
const tree = (extra: Record<string, unknown>, kind: "video" | "image" = "video") =>
  parseFragment(
    renderToStaticMarkup(
      createElement(ContestantEditor, {
        index: 3, contestant: { ...base, manualVideo: true }, onChange: noop, mediaKind: kind,
        video: { onAdd: async () => null, onRemove: noop },
        image: { onFile: noop, onUrl: async () => null, onRemove: noop },
        ...extra,
      } as never),
    ),
  ) as unknown as Node;

for (const [label, extra] of [
  ["리뷰 표시 있음(이름↔영상 불일치)", { videoMismatch: true }],
  ["리뷰 표시 없음", {}],
] as const) {
  describe(`칸 줄 — ${label}`, () => {
    const root = tree(extra);
    const row = find(root, "slot-row-3");
    it("줄이 있고, 버튼 묶음이 줄의 마지막 자식이며 [영상]이 그 안의 마지막 버튼", () => {
      expect(row).not.toBeNull();
      const kids = els(row!.node);
      const buttons = kids[kids.length - 1];
      expect(contains(buttons, "slot-video-3")).toBe(true);
      const bk = els(buttons);
      expect(attr(bk[bk.length - 1], "data-testid")).toBe("slot-video-3");
    });
    it("리뷰 표시는 같은 줄 왼쪽(버튼 묶음 앞)", () => {
      const kids = els(row!.node);
      expect(contains(kids[0], "slot-video-3")).toBe(false);
      expect(contains(row!.node, "contestant-review-3")).toBe("videoMismatch" in extra);
    });
    it("주소 칸 자리는 줄 바로 다음 형제", () => {
      const sibs = els(row!.parent!);
      const at = sibs.indexOf(row!.node);
      expect(attr(sibs[at + 1], "data-testid")).toBe("slot-line-3");
    });
  });
}

describe("이미지 대회 — [이미지]·[이미지 파일]도 같은 줄 오른쪽 끝", () => {
  it("버튼 묶음 = 줄의 마지막 자식, 그 안에 두 버튼", () => {
    const row = find(tree({ videoMismatch: true }, "image"), "slot-row-3")!;
    const kids = els(row.node);
    const buttons = kids[kids.length - 1];
    expect(contains(buttons, "slot-image-url-3")).toBe(true);
    expect(contains(buttons, "slot-image-file-3")).toBe(true);
  });
});

describe("리뷰 표시도 넣기 버튼도 없는 칸에는 빈 줄을 만들지 않는다", () => {
  it("종류 미정 · 리뷰 없음 → slot-row 없음", () => {
    const root = parseFragment(
      renderToStaticMarkup(createElement(ContestantEditor, { index: 3, contestant: base, onChange: noop, mediaKind: null } as never)),
    ) as unknown as Node;
    expect(find(root, "slot-row-3")).toBeNull();
  });
});
