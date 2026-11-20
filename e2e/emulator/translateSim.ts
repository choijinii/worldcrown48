/**
 * 크롬 번역 흉내 — 화면의 글자 마디를 <font><font>같은 글자</font></font> 로 바꿔 끼운다(원래 마디는 떨어진다).
 * 진짜 번역처럼 그 뒤에 새로 생기는 글자도 계속 바꿔 끼운다. 글자 내용은 그대로 둔다 — 그래야 "옛 이름이 남았는지"를
 * 지금 매치의 이름과 견줘 볼 수 있다(옛 마디는 떨어져서 React 가 고쳐도 화면에 안 나온다).
 * 하이드레이션이 끝난 뒤에 켜야 한다(진짜 번역도 다 읽은 뒤에 돈다) — `enableTranslateSim(page)`.
 */
import type { Page } from "@playwright/test";

const INIT = `(() => {
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "TITLE", "FONT"]);
  const wrap = (node) => {
    const p = node.parentNode;
    if (!p || p.nodeType !== 1 || SKIP.has(p.nodeName)) return;
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    if (p.closest && p.closest('[translate="no"], .notranslate')) return;
    const outer = document.createElement("font");
    outer.setAttribute("data-sim-translate", "");
    const inner = document.createElement("font");
    inner.textContent = node.nodeValue;
    outer.appendChild(inner);
    p.replaceChild(outer, node);
  };
  const walk = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(wrap);
  };
  window.__wc48SimTranslate = () => {
    if (window.__wc48SimOn) return;
    window.__wc48SimOn = true;
    document.documentElement.classList.add("translated-ltr");
    walk(document.body);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") { wrap(m.target); continue; }
        for (const n of m.addedNodes) {
          if (n.nodeType === 3) wrap(n);
          else if (n.nodeType === 1 && n.nodeName !== "FONT") walk(n);
        }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
})();`;

/** 새 페이지에 흉내 함수를 심는다(켜지는 않는다). */
export async function installTranslateSim(page: Page): Promise<void> {
  await page.addInitScript(INIT);
}

/** 지금 화면에서 번역 흉내를 켠다 — 주소를 새로 열면 다시 켜야 한다(앱 안 이동은 그대로 켜져 있다). */
export async function enableTranslateSim(page: Page): Promise<void> {
  if (process.env.SIM_OFF === "1") return; // 대조군 — 번역 없이 같은 길(원래 화면이 그런지 가린다)
  await page.evaluate(() => (window as unknown as { __wc48SimTranslate: () => void }).__wc48SimTranslate());
  await page.waitForFunction(() => document.querySelector("font[data-sim-translate]") !== null);
}
