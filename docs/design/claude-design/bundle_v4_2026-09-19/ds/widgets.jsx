/* WorldCrown48 DS — shared showcase widgets.
   Exports to window for cross-file (Babel scope) use. */

const { useState, useEffect, useRef, useCallback } = React;

/* ── copy helper + toast bus ── */
function fireToast(msg) {
  window.dispatchEvent(new CustomEvent("ds-toast", { detail: msg }));
}
function copyText(text, label) {
  try {
    navigator.clipboard.writeText(text);
    fireToast((label || "Copied") + " · " + text);
  } catch (e) {
    fireToast("Copy blocked by browser");
  }
}

/* ── Section wrapper ── */
function Section({ id, num, title, desc, children }) {
  return (
    <section id={id} className="ds-section" data-screen-label={title}>
      <div className="ds-section__head">
        <span className="ds-section__num">{num}</span>
        <h2 className="ds-section__title">{title}</h2>
        {desc ? <p className="ds-section__desc">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

/* ── Block (labelled sub-group) ── */
function Block({ label, note, children }) {
  return (
    <div className="ds-block">
      {label ? <div className="ds-block__label">{label}</div> : null}
      {children}
      {note ? <p className="ds-block__note">{note}</p> : null}
    </div>
  );
}

/* ── Color swatch (click to copy) ── */
function Swatch({ fill, tag, name, value, role, tagColor }) {
  return (
    <div className="sw" onClick={() => copyText(value, name)} title={"Copy " + value}>
      <div className="sw__fill" style={{ background: fill }}>
        {tag ? <span className="sw__tag" style={tagColor ? { color: tagColor } : null}>{tag}</span> : null}
      </div>
      <div className="sw__body">
        <div className="sw__name">{name}</div>
        <div className="sw__meta">{value}</div>
        {role ? <div className="sw__role">{role}</div> : null}
      </div>
    </div>
  );
}

/* ── Spec table ── */
function SpecTable({ rows }) {
  // rows: [{ token, value, desc }]
  return (
    <div className="stage stage--col" style={{ padding: 0, display: "block" }}>
      <table className="spec">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="spec__token" onClick={() => r.token && copyText(r.token, "Token")} style={r.token ? { cursor: "pointer" } : null}>{r.token}</td>
              {r.value !== undefined ? <td className="spec__val">{r.value}</td> : null}
              <td className="spec__desc" colSpan={r.value === undefined ? 2 : 1}>{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Stage (component canvas) ── */
function Stage({ cap, children, className, style }) {
  return (
    <div className={"stage " + (className || "")} style={style}>
      {cap ? <span className="stage__cap">{cap}</span> : null}
      {children}
    </div>
  );
}

/* ── Rule card ── */
function Rule({ kind, title, children }) {
  return (
    <div className={"rule is-" + kind}>
      <span className="rule__flag">{kind === "do" ? "DO" : "DON'T"}</span>
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  );
}

/* ── Magnetic button (cursor-tracking hover) ── */
function MagneticButton({ children, variant = "gold", size, onClick, style }) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left - r.width / 2;
    const my = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${mx * 0.22}px, ${my * 0.3}px)`;
  }, []);
  const reset = useCallback(() => { if (ref.current) ref.current.style.transform = "translate(0,0)"; }, []);
  const cls = ["btn", "btn--" + variant, size ? "btn--" + size : ""].join(" ");
  return (
    <button ref={ref} className={cls} onMouseMove={onMove} onMouseLeave={reset} onClick={onClick} style={style}>
      {children}
    </button>
  );
}

Object.assign(window, { fireToast, copyText, Section, Block, Swatch, SpecTable, Stage, Rule, MagneticButton });
