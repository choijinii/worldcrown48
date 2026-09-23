/* BannerSlot — the reserved notice strip under the Arena stage frame.
   Two sizes only, both centred on the page:
     desktop  970 x 90   (1440 page -> left 235)
     mobile   320 x 100  (390 page  -> left 35, 12px below the stage frame)
   Mobile landscape and the Round-transition screen carry NO banner.
   The slot holds ONE line of product notice copy — never an ad image, never a crown mark. */

const COPY = {
  "ko": {
    "out": "로그인하면 크라운 카드를 간직하고, 대회마다 하루 5번 참여할 수 있어요",
    "in": "대회를 마치면 크라운 카드가 생겨요 — 친구에게 공유해 보세요"
  },
  "en": {
    "out": "Sign in to keep your Crown Card and pick 5 times a day in every Tournament",
    "in": "Finish the Tournament and your Crown Card appears — share it with a friend"
  },
  "es": {
    "out": "Inicia sesión para guardar tu Crown Card y elegir 5 veces al día en cada Tournament",
    "in": "Al terminar el Tournament aparece tu Crown Card — compártela con alguien"
  }
};

function BannerSlot({
  variant = "desktop",
  state = "signed-out",
  lang = "ko",
  children,
  style,
  ...rest
}) {
  const mobile = variant === "mobile";
  const copy = (COPY[lang] || COPY.ko)[state === "signed-in" ? "in" : "out"];
  return (
    <div
      {...rest}
      style={{
        width: mobile ? 320 : 970,
        height: mobile ? 100 : 90,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: mobile ? "0 18px" : "0 28px",
        border: "1px dashed rgba(255,255,255,.16)",
        background: "rgba(36,23,84,.4)",
        borderRadius: "var(--radius-rect, 0)",
        ...style
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: mobile ? 13 : 14,
          lineHeight: 1.5,
          color: "var(--color-text-sub, #DDDDEA)",
          textAlign: "center"
        }}
      >
        {children || copy}
      </span>
    </div>
  );
}

module.exports = { BannerSlot };
