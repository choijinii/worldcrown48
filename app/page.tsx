"use client";

import { useState } from "react";

// 구글 폼 전송 주소 + 이메일 칸 ID (사용자 폼에서 추출)
const FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSeSl0Q5q12ImXf6XLVEtAMqyYTd4xP1MEdaifQRiXjjbG6mNA/formResponse";
const EMAIL_ENTRY = "entry.1909095316";

type Status = "idle" | "submitting" | "done";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || status === "submitting") return;
    setStatus("submitting");

    const data = new FormData();
    data.append(EMAIL_ENTRY, email);

    try {
      // 구글 폼은 CORS 응답을 안 주므로 no-cors로 전송 (응답은 못 읽지만 저장은 됨)
      await fetch(FORM_ACTION, { method: "POST", mode: "no-cors", body: data });
    } catch {
      // opaque 응답 — 무시
    }
    setStatus("done");
  }

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

        {status === "done" ? (
          <p className="thanks">✦ You&apos;re on the list. See you at launch.</p>
        ) : (
          <form className="notify" onSubmit={handleSubmit}>
            <input
              className="notify-input"
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
            <button
              className="notify-btn"
              type="submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "…" : "Notify Me"}
            </button>
          </form>
        )}

        <p className="privacy">We&apos;ll only email you once, at launch.</p>
      </div>

      <footer className="foot">© 2026 WorldCrown48</footer>
    </main>
  );
}
