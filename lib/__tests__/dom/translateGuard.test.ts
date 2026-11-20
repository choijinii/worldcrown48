/**
 * 번역 멈춤 그물 — 크롬 번역이 글자 마디를 <font> 로 바꿔 끼운 뒤 React 가 그 (이미 빠진) 마디를
 * 지우거나 그 앞에 끼우려 하면 DOM 이 NotFoundError 를 던져 화면이 멈춘다(React #11538).
 * 그물은 그 두 경우만 오류 없이 넘긴다 — 나머지는 원래 동작 그대로.
 * 유닛 환경은 node(jsdom 없음)라 DOM 과 같은 규칙으로 던지는 가짜 마디로 시험한다.
 */
import { describe, expect, it, vi } from "vitest";
import { installTranslateGuard } from "@/lib/dom/translateGuard";

class FakeNode {
  parentNode: FakeNode | null = null;
  children: FakeNode[] = [];
  constructor(public name: string) {}
  removeChild(child: FakeNode): FakeNode {
    const i = this.children.indexOf(child);
    if (i < 0) throw new Error("NotFoundError: The node to be removed is not a child of this node.");
    this.children.splice(i, 1);
    child.parentNode = null;
    return child;
  }
  insertBefore(node: FakeNode, ref: FakeNode | null): FakeNode {
    if (ref === null) return this.appendChild(node);
    const i = this.children.indexOf(ref);
    if (i < 0) throw new Error("NotFoundError: The node before which the new node is to be inserted is not a child of this node.");
    node.parentNode?.removeChild(node);
    this.children.splice(i, 0, node);
    node.parentNode = this;
    return node;
  }
  appendChild(node: FakeNode): FakeNode {
    node.parentNode?.removeChild(node);
    this.children.push(node);
    node.parentNode = this;
    return node;
  }
}

/** 시험마다 새 원형 — 패치가 다른 시험으로 새지 않게. */
function freshProto() {
  class N extends FakeNode {}
  return N;
}

/** 번역기 흉내: 마디를 <font> 로 바꿔 끼운다(원래 마디는 떨어진다). */
function translate(parent: FakeNode, text: FakeNode, Ctor: typeof FakeNode): FakeNode {
  const font = new Ctor("font");
  const i = parent.children.indexOf(text);
  parent.children[i] = font;
  font.parentNode = parent;
  text.parentNode = null;
  return font;
}

describe("installTranslateGuard", () => {
  it("번역으로 빠진 마디를 지우려 해도 던지지 않는다 · 그 마디를 돌려준다", () => {
    const N = freshProto();
    installTranslateGuard(N.prototype);
    const p = new N("p");
    const text = p.appendChild(new N("text"));
    translate(p, text, N);
    expect(() => p.removeChild(text)).not.toThrow();
    expect(p.removeChild(text)).toBe(text);
    expect(p.children.map((c) => c.name)).toEqual(["font"]); // 번역된 글자는 그대로 남는다
  });

  it("번역으로 빠진 마디 앞에 끼우려 하면 던지지 않고 끝에 붙인다(내용이 사라지지 않게)", () => {
    const N = freshProto();
    installTranslateGuard(N.prototype);
    const p = new N("p");
    const text = p.appendChild(new N("text"));
    translate(p, text, N);
    const span = new N("span");
    expect(() => p.insertBefore(span, text)).not.toThrow();
    expect(p.children.map((c) => c.name)).toEqual(["font", "span"]);
    expect(span.parentNode).toBe(p);
  });

  it("평소 동작은 그대로 — 진짜 자식은 지우고 · 앞에 끼우고 · ref 가 null 이면 끝에", () => {
    const N = freshProto();
    installTranslateGuard(N.prototype);
    const p = new N("p");
    const a = p.appendChild(new N("a"));
    const b = p.insertBefore(new N("b"), a);
    p.insertBefore(new N("c"), null);
    expect(p.children.map((c) => c.name)).toEqual(["b", "a", "c"]);
    p.removeChild(a);
    expect(p.children.map((c) => c.name)).toEqual(["b", "c"]);
    expect(b.parentNode).toBe(p);
  });

  it("한 번만 감싼다(두 번 불러도 원래 함수를 두 겹으로 감지 않는다) · 경고는 처음 한 번만", () => {
    const N = freshProto();
    const warn = vi.fn();
    expect(installTranslateGuard(N.prototype, warn)).toBe(true);
    const patched = N.prototype.removeChild;
    expect(installTranslateGuard(N.prototype, warn)).toBe(false);
    expect(N.prototype.removeChild).toBe(patched);
    const p = new N("p");
    const t1 = p.appendChild(new N("t1"));
    const t2 = p.appendChild(new N("t2"));
    translate(p, t1, N);
    translate(p, t2, N);
    p.removeChild(t1);
    p.removeChild(t2);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
