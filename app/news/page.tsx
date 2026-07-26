/**
 * /news — 뉴스 목록 (ND-1 §3 #9). Server route with static list metadata; the
 * live published feed renders in the <NewsList> client component.
 */
import type { Metadata } from "next";
import { NewsList } from "@/components/news/NewsList";

export const metadata: Metadata = {
  title: "Newsroom · WorldCrown48",
  description:
    "WorldCrown48 뉴스룸 — 팬이 만드는 Tournament 소식. News, made by fans.",
};

export default function NewsIndexPage(): JSX.Element {
  return <NewsList />;
}
