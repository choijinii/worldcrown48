/* The Arena — Domain 3 · VS Battle voting.
   Strictly v2.3 compliant:
   - NO Round/Match counter, NO daily vote quota — don't fit the Arena concept
   - NO Vote Rate (%) during voting — bandwagon bias
   - NO "ENDS IN" timer
   - NO LIVE pill anywhere — WC48 does not live-stream
   - NO AI-Report on cards/banners — article footers only
*/

function Contestant({ data, side, state, onPick }) {
  const won  = state.won === side;
  const lost = state.won && state.won !== side;
  const cls = ["contestant", `contestant--${side}`];
  if (won) cls.push("is-won");
  if (lost) cls.push("is-lost");
  return (
    <div className={cls.join(" ")} onClick={() => !state.won && onPick(side)}>
      <div className="contestant__portrait">{data.initial}</div>
      <div className="contestant__name">{data.name}</div>
      <div className="contestant__meta">{data.meta}</div>
    </div>
  );
}

function Arena({ setTab }) {
  const list = window.WC_DATA.CONTESTANTS;
  const [pairIdx, setPairIdx] = useState(0);
  const [state, setState] = useState({ won: null });

  const a = list[(pairIdx * 2) % list.length];
  const b = list[(pairIdx * 2 + 1) % list.length];

  function pick(side) {
    if (state.won) return;
    setState({ won: side });
  }
  function next() {
    setState({ won: null });
    setPairIdx((i) => (i + 1) % Math.floor(list.length / 2));
  }
  function finishToCrown() {
    setTab("crown");
  }

  return (
    <main className="container" style={{ flex: 1 }}>
      <section className="arena">
        <div className="arena__head">
          <div>
            <div className="arena__eyebrow">The Arena</div>
            <h2 className="arena__title">최고의 퍼포먼스 무대 · 2026</h2>
          </div>
        </div>

        {/* VS Stage */}
        <div className="vs-stage">
          <div className="vs-stage__header">
            <div>
              <div className="vs-stage__tour">
                {state.won
                  ? <span style={{ color: "var(--color-gold)" }}>Crown cast — advance to next Match</span>
                  : <span>Pick a Contestant. The system advances automatically.</span>}
              </div>
            </div>
          </div>

          <div className="vs-stage__body">
            <Contestant data={a} side="left"  state={state} onPick={pick} />
            <div className="vs-stage__glyph">vs</div>
            <Contestant data={b} side="right" state={state} onPick={pick} />
          </div>

          {/* Vote buttons — only show when not yet decided.
              ★ NO Vote Rate (%) displayed during the Match (v2.3 §Vote Rate Scope). */}
          {!state.won && (
            <div className="vote-row">
              <button className="vote-btn vote-btn--left" onClick={() => pick("left")}>
                <small>PICK LEFT</small>
                <span className="name">{a.name}</span>
              </button>
              <button className="vote-btn vote-btn--right" onClick={() => pick("right")}>
                <small>PICK RIGHT</small>
                <span className="name">{b.name}</span>
              </button>
            </div>
          )}
        </div>

        <div className="arena__below">
          {state.won ? (
            <>
              <MagneticButton size="lg" onClick={next}>Next Match · 다음 매치 →</MagneticButton>
              <MagneticButton variant="ghost" size="lg" onClick={finishToCrown}>Jump to Crown Reveal</MagneticButton>
            </>
          ) : (
            <>
              <MagneticButton variant="ghost" size="lg">Share this Match</MagneticButton>
              <MagneticButton variant="secondary" size="lg" onClick={() => setTab("pitch")}>Back to Pitch</MagneticButton>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

Object.assign(window, { Arena });
