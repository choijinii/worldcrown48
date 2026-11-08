/**
 * IMAGE-1 (원장 D-77) — Storage 공개 주소와 출처 도메인 글자. 순수 · import 없음
 * (functions 미러 `copy-embed.mjs` 가 그대로 복사한다).
 *
 * 주소는 **다운로드 토큰이 없다** — storage.rules 가 entry-images 읽기를 공개로 두므로 필요 없다.
 * 같은 칸에 그림을 다시 넣으면 파일 이름이 같아 덮어쓰므로, `version`(addedAt)을 `&v=` 로 붙여
 * 브라우저 캐시를 깬다.
 */
export const STORAGE_ORIGIN = "https://firebasestorage.googleapis.com";

/** `origin` 은 에뮬레이터 시험 때만 바꾼다(예: http://127.0.0.1:9199). */
export function publicStorageUrl(bucket: string, path: string, version?: number, origin: string = STORAGE_ORIGIN): string {
  const base = `${origin}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
  return typeof version === "number" ? `${base}&v=${version}` : base;
}

/** 출처 페이지의 호스트(앞의 "www." 를 뗀 소문자). http(s) 가 아니거나 틀린 주소면 빈 글자. */
export function sourceHost(sourcePage: string | undefined): string {
  if (!sourcePage) return "";
  try {
    const u = new URL(sourcePage);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
