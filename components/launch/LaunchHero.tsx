/**
 * M1 · LaunchHero
 * — Crown SVG (inline, colour anchor) + bilingual kicker + slogan.
 * Slogan: "WHO RULES THE WORLD? / YOU DECIDE." (Playfair Display italic)
 */
export function LaunchHero() {
  return (
    <section className="hero" aria-label="Launch hero">
      {/* Registered crown mark — inline for the colour anchor (#FCD006). */}
      <svg
        className="hero-crown"
        viewBox="0 0 143.938 134.878"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="WorldCrown48 crown"
      >
        <path
          fill="#FCD006"
          d="M141.13,72.455c-0.728-0.064-1.409,0.143-1.972,0.521c-0.097,0.066-0.188,0.132-0.285,0.199c-9.776,6.764-26.054,14.975-38.315,5.759C87.99,69.486,80.666,51.155,77.34,40.736c-0.006-0.019-0.011-0.036-0.018-0.054c-0.376-1.129-1.389-1.985-2.649-2.096c-1.26-0.11-2.407,0.557-2.974,1.604c-0.009,0.017-0.016,0.033-0.026,0.05c-5.084,9.684-15.481,26.464-29.498,33.585C28.5,80.771,13.895,69.859,5.442,61.5c-0.084-0.083-0.163-0.164-0.246-0.246c-0.489-0.47-1.125-0.792-1.852-0.855c-1.692-0.148-3.185,1.104-3.333,2.797c-0.018,0.205-0.013,0.407,0.008,0.605l0.013,0.077l10.049,58.828l0.03,0.168c0.216,1.361,1.325,2.455,2.76,2.581l53.787,4.706l0.004,0l0.004,0l53.786,4.706c1.435,0.125,2.717-0.76,3.165-2.062l0.059-0.161l20.111-56.189l0.026-0.073c0.057-0.19,0.096-0.389,0.113-0.595C144.075,74.095,142.822,72.603,141.13,72.455z"
        />
        <circle fill="#FCD006" cx="77.036" cy="11.563" r="11.562" />
      </svg>

      <div className="hero-kicker">
        <span className="dot" aria-hidden="true" />
        지금 진행 중 · A WORLDCROWN48 TOURNAMENT IS OPEN
      </div>
      <h1 className="hero-line1">WHO RULES THE WORLD?</h1>
      <p className="hero-line2">YOU DECIDE.</p>
    </section>
  );
}
