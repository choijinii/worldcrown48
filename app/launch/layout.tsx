import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PREVIEW_COOKIE, hideNavOnLaunch } from "@/lib/launch/curtain";

/**
 * Launch Pad (A-0) route metadata — moved out of the root layout during the
 * A-1 route swap (handoff §3, Phase A). The root layout's metadata now
 * describes A-1 The Pitch; this nested layout restores A-0's original
 * title/description/OG for the `/launch` archive so the waitlist surface
 * keeps its identity in link previews.
 *
 * This is a nested layout: it adds metadata and passes children through.
 * <html>/<body> and all providers (I18n, Auth, cookie consent, Navbar)
 * stay in the root layout and continue to wrap this subtree.
 */
export const metadata: Metadata = {
  title: "WorldCrown48 — Who Rules the World?",
  description:
    "WorldCrown48 — the global fan arena. A WorldCrown48 tournament is open. Pick who you love. Crown your Champion.",
  openGraph: {
    title: "전 세계 팬들의 선택이 모이는 곳",
    description: "A global fan arena where every pick counts toward crowning one Champion.",
    url: "https://worldcrown48.com/launch",
    siteName: "WorldCrown48",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

/**
 * CURTAIN-1 — 런칭 전 커튼 중에는 메뉴바를 숨긴다. 메뉴바는 맨 바깥 틀에 있으므로 여기서는
 * 표시(`data-curtain-root`)만 달고, 숨기기는 navbar.css 가 한다(아레나 무대가 메뉴를 숨기는 것과
 * 같은 방식 — 메뉴바 자리도 함께 사라진다). 쿠키와 시각을 읽어야 해서 이 화면은 요청마다 그린다.
 */
export default function LaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hideNav = hideNavOnLaunch({
    env: { LAUNCH_CURTAIN: process.env.LAUNCH_CURTAIN, LAUNCH_AT: process.env.LAUNCH_AT },
    nowMs: Date.now(),
    previewCookie: cookies().get(PREVIEW_COOKIE)?.value,
  });
  return (
    <>
      {hideNav && <div data-curtain-root hidden />}
      {children}
    </>
  );
}
