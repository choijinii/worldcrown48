/**
 * 영상 대회 크라운 카드의 사진 = 그 엔트리의 유튜브 썸네일 (IMAGE-1 PR 3 · 원장 D-77 결정 ②).
 *
 * 서버(onChampionConfirmed)가 썸네일을 받아 카드 사진 자리에 그린다. 주소는 무대 포스터와 같은 순서
 * (가로 hq720 · 세로 oar2 → hqdefault). 유튜브는 없는 썸네일 대신 120px 회색 자리 그림을 주기도 한다 —
 * 그것도 실패로 본다(lib/thumbnail/poster 와 같은 판정). 다 실패하면 null → 이니셜.
 *
 * 순수 + 주입: 받기는 `fetchFn`(실서비스 = 전역 fetch), 그림 폭 읽기는 canvas 없이 머리 바이트로.
 */

/** 실서비스는 늘 i.ytimg.com. 에뮬레이터 시험만 가짜 썸네일 서버(YT_THUMB_BASE)를 쓴다 — CI 는 바깥을 부르지 않는다. */
export function youtubeThumbBase(env: Record<string, string | undefined>): string {
  return (env.FUNCTIONS_EMULATOR === "true" && env.YT_THUMB_BASE) || "https://i.ytimg.com";
}

interface FetchLike {
  ok: boolean;
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** 유튜브 회색 자리 그림의 폭(120) 이하 = 실패. */
const PLACEHOLDER_MAX_WIDTH = 120;

/** JPEG(SOF) · PNG(IHDR) 머리에서 폭을 읽는다. 모르면 0. */
export function imageWidth(buf: Buffer): number {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return buf.readUInt32BE(16);
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return 0;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return buf.readUInt16BE(i + 7);
      }
      i += 2 + len;
    }
  }
  return 0;
}

export async function fetchFirstThumb(
  urls: readonly string[],
  fetchFn: (url: string) => Promise<FetchLike>,
): Promise<Buffer | null> {
  for (const url of urls) {
    try {
      const res = await fetchFn(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (imageWidth(buf) > PLACEHOLDER_MAX_WIDTH) return buf;
    } catch {
      // 다음 주소
    }
  }
  return null;
}
