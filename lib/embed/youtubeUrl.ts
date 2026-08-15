/**
 * youtubeUrl — 붙여넣은 한 줄 → videoId(+시작 초) (LAB-EV-1 W4 · §5 Phase A).
 *
 * 운영자는 유튜브 "공유" 버튼이 준 링크를 그대로 붙여넣는다. 그 링크는
 * watch · youtu.be · shorts · embed · live 다섯 모양 중 하나이고, 공유 시점을
 * 담은 `t=` 파라미터가 붙어 오기도 한다. 그 시점은 운영자가 이미 "여기가
 * 킬링파트"라고 손으로 찍어준 값이므로 버리지 않고 그대로 실어 나른다.
 *
 * 실패는 이유별로 갈라서 돌려준다 — 검수기는 한 줄이 깨졌다고 47줄을 버리지
 * 않고, 몇 번째 줄이 왜 틀렸는지 짚어야 하기 때문이다(§8).
 */

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** watch?v= · youtu.be/ · shorts/ · embed/ · live/ — 다섯 모양에서 id를 집는다. */
const URL_ID_RE =
  /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

/** 유튜브 호스트로 보이는가 — "유튜브가 아님"과 "유튜브인데 id가 없음"을 가른다. */
const YOUTUBE_HOST_RE = /(?:^|\/\/|\.)(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//;

/** `t=1h2m3s` · `t=90s` · `t=90` 세 표기. */
const HMS_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;

export type LinkParseFailure = "blank" | "not-youtube" | "no-video-id" | "not-a-link";

export type LinkParseResult =
  | { ok: true; videoId: string; startSec: number | null }
  | { ok: false; reason: LinkParseFailure };

export function isValidVideoId(id: unknown): boolean {
  return typeof id === "string" && VIDEO_ID_RE.test(id);
}

/** URL 모양에서만 id를 뽑는다(맨 id는 받지 않는다 — mediaSlot의 기존 계약). */
export function extractVideoIdFromUrl(url: string): string | null {
  const m = url.match(URL_ID_RE);
  return m ? m[1] : null;
}

/** `t` / `start` 파라미터 값을 초로. 해석 불가·음수는 null. */
export function parseStartParam(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(HMS_RE);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function startSecOf(line: string): number | null {
  const m = line.match(/[?&#](?:t|start)=([^&#\s]+)/);
  return m ? parseStartParam(m[1]) : null;
}

/**
 * 한 줄 판정. 성공하면 videoId + (있으면) 시작 초.
 * 스프레드시트에서 복사하면 따옴표가 딸려 오므로 앞뒤 따옴표·공백을 벗긴다.
 */
export function parseYouTubeLink(line: string): LinkParseResult {
  const raw = line.trim().replace(/^["'<]+|["'>,]+$/g, "").trim();
  if (!raw) return { ok: false, reason: "blank" };

  const id = extractVideoIdFromUrl(raw);
  if (id) return { ok: true, videoId: id, startSec: startSecOf(raw) };

  // 맨 id만 붙여넣은 경우(유튜브 스튜디오에서 복사하면 이렇게 나온다).
  if (isValidVideoId(raw)) return { ok: true, videoId: raw, startSec: null };

  if (YOUTUBE_HOST_RE.test(raw)) return { ok: false, reason: "no-video-id" };
  if (/^https?:\/\//i.test(raw) || /\w+\.\w{2,}\//.test(raw)) {
    return { ok: false, reason: "not-youtube" };
  }
  return { ok: false, reason: "not-a-link" };
}
