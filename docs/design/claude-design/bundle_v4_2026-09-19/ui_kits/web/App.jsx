/* App — router for the WC48 demo SPA. */

function App() {
  const [tab, setTab] = useState("launch");
  return (
    <div className="app">
      <Nav tab={tab} setTab={setTab} />
      {tab === "launch" && <LaunchPad   setTab={setTab} />}
      {tab === "pitch"  && <Pitch       setTab={setTab} />}
      {tab === "arena"  && <Arena       setTab={setTab} />}
      {tab === "crown"  && <CrownReveal setTab={setTab} />}
      <Footer />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
