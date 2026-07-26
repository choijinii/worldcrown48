/**
 * /news/[slug] — 기사 고유 URL (ND-1 §3 #9). Server route: generateMetadata emits
 * per-article <title>/<description> (심사용 사이트 기본기), then renders the client
 * <ArticleView> for the language-aware 지면. A draft/archived/absent slug shows a
 * "not found" notice (not a hard 404 — §8 내리기 후 접근은 안내).
 */
import type { Metadata } from "next";
import { getPublishedArticleServer } from "@/lib/news/newsServer";
import { firstFilledLang } from "@/lib/news/renderArticle";
import { ArticleView } from "@/components/news/ArticleView";
import { ArticleNotFound } from "@/components/news/ArticleNotFound";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getPublishedArticleServer(params.slug);
  if (!article) {
    return { title: "Newsroom · WorldCrown48", robots: { index: false } };
  }
  const lang = firstFilledLang(article.title) ?? "ko";
  const title = article.title[lang] || "WorldCrown48 Newsroom";
  const description = article.subhead[lang] || "";
  return {
    title: `${title} · WorldCrown48`,
    description,
    openGraph: { title, description, type: "article" },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const article = await getPublishedArticleServer(params.slug);
  if (!article) return <ArticleNotFound />;
  return <ArticleView article={article} />;
}
