/**
 * NavBrand — 왕관 + "WorldCrown48" 로고 부품 하나 (NAV-1 · 정본 v4 GNB.jsx `Brand`).
 *
 * 메뉴바와 ☰ 서랍 머리가 **같은 부품**을 쓴다 — 서랍이 열려도 로고가 같은 자리 · 같은 크기 ·
 * 같은 굵기로 겹쳐 보이게(정본 33–39). 크기·간격은 navbar.css 의 `.wc-brand` 한 곳에서 정한다
 * (데스크톱 왕관 26 · 15px/800 · 간격 10 / 휴대폰 왕관 20 · 13px · 간격 8).
 */
export function NavBrand(): JSX.Element {
  return (
    <span className="wc-brand">
      <img src="/brand/wc48-crown-filled.svg" alt="" className="wc-brand-crown" data-testid="brand-crown" />
      <span className="wc-brand-word" data-testid="brand-word">
        WorldCrown48
      </span>
    </span>
  );
}
