export default function Home() {
  return (
    <main className="wrap">
      <div className="stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="logo"
          src="/brand/wc48-branding-vertical-dark.svg"
          alt="WorldCrown48"
          width={231}
          height={96}
        />

        <p className="eyebrow">THE GLOBAL FAN-VOTING ARENA</p>
        <h1 className="headline">COMING SOON</h1>
        <p className="sub">Vote for who you love. Crown your champion.</p>

        <div className="rule" />
        <p className="year">LAUNCHING 2026</p>
      </div>

      <footer className="foot">© 2026 WorldCrown48</footer>
    </main>
  );
}
