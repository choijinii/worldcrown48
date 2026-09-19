/* WorldCrown48 DS — Brand: crown marks · wordmark · lockups */

function SecBrand() {
  const crowns = [
    { src: "assets/wc48-crown-filled.svg", name: "Crown · Filled", file: "wc48-crown-filled.svg", bg: "var(--color-bg-deep)" },
    { src: "assets/wc48-crown-outline.svg", name: "Crown · Outline", file: "wc48-crown-outline.svg", bg: "var(--color-bg-deep)" },
    { src: "assets/wc48-crown-circle-filled.svg", name: "Circle · Filled", file: "wc48-crown-circle-filled.svg", bg: "#FFFFFF" },
    { src: "assets/wc48-crown-circle-outline.svg", name: "Circle · Outline", file: "wc48-crown-circle-outline.svg", bg: "#FFFFFF" },
  ];

  return (
    <Section id="brand" num="02 — BRAND" title="Brand marks"
      desc="Only registered SVG assets may represent the brand. Never redraw the crown. File names encode the background they sit on — “-dark” marks go on dark surfaces (light ink), “-light” marks go on light surfaces (dark ink).">

      <Block label="Crown — four marks">
        <div className="ds-grid ds-grid--4">
          {crowns.map((c) => (
            <div key={c.file} className="sw" onClick={() => copyText(c.file, "Asset")} style={{ cursor: "pointer" }}>
              <div className="sw__fill" style={{ background: c.bg, height: 130, display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
                <img src={c.src} alt={c.name} style={{ maxHeight: "100%", maxWidth: "100%" }} />
              </div>
              <div className="sw__body">
                <div className="sw__name">{c.name}</div>
                <div className="sw__meta">{c.file}</div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block label="Wordmark — “WorldCrown48” · both palettes">
        <div className="ds-grid ds-grid--2">
          <div className="sw" style={{ cursor: "default" }}>
            <div className="sw__fill" style={{ background: "var(--color-bg-deep)", height: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 24px" }}>
              <img src="assets/wc48-wordmark-dark.svg" alt="Wordmark on dark" style={{ width: "86%", height: "auto" }} />
            </div>
            <div className="sw__body"><div className="sw__name">On dark</div><div className="sw__meta">wc48-wordmark-dark.svg · #F2F2F5 ink</div></div>
          </div>
          <div className="sw" style={{ cursor: "default" }}>
            <div className="sw__fill" style={{ background: "#F2F2F5", height: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 24px" }}>
              <img src="assets/wc48-wordmark-light.svg" alt="Wordmark on light" style={{ width: "86%", height: "auto" }} />
            </div>
            <div className="sw__body"><div className="sw__name">On light</div><div className="sw__meta">wc48-wordmark-light.svg · #241754 ink</div></div>
          </div>
        </div>
      </Block>

      <Block label="Lockups — horizontal &amp; vertical" note="Each lockup ships in a dark and a light variant. Pair every mark with the background its name encodes so it always stays legible.">
        <div className="ds-grid ds-grid--2">
          <div className="sw" style={{ cursor: "default" }}>
            <div className="sw__fill" style={{ background: "var(--color-bg-deep)", height: 92, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 22px" }}>
              <img src="assets/wc48-branding-horizontal-dark.svg" alt="" style={{ maxHeight: "100%", maxWidth: "100%" }} />
            </div>
            <div className="sw__body"><div className="sw__name">Horizontal · dark</div><div className="sw__meta">wc48-branding-horizontal-dark.svg</div></div>
          </div>
          <div className="sw" style={{ cursor: "default" }}>
            <div className="sw__fill" style={{ background: "#F2F2F5", height: 92, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 22px" }}>
              <img src="assets/wc48-branding-horizontal-light.svg" alt="" style={{ maxHeight: "100%", maxWidth: "100%" }} />
            </div>
            <div className="sw__body"><div className="sw__name">Horizontal · light</div><div className="sw__meta">wc48-branding-horizontal-light.svg</div></div>
          </div>
          <div className="sw" style={{ cursor: "default" }}>
            <div className="sw__fill" style={{ background: "var(--color-bg-deep)", height: 168, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
              <img src="assets/wc48-branding-vertical-dark.svg" alt="" style={{ maxHeight: 132 }} />
            </div>
            <div className="sw__body"><div className="sw__name">Vertical · dark</div><div className="sw__meta">wc48-branding-vertical-dark.svg</div></div>
          </div>
          <div className="sw" style={{ cursor: "default" }}>
            <div className="sw__fill" style={{ background: "#F2F2F5", height: 168, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
              <img src="assets/wc48-branding-vertical-light.svg" alt="" style={{ maxHeight: 132 }} />
            </div>
            <div className="sw__body"><div className="sw__name">Vertical · light</div><div className="sw__meta">wc48-branding-vertical-light.svg</div></div>
          </div>
        </div>
      </Block>
    </Section>
  );
}

window.SecBrand = SecBrand;
