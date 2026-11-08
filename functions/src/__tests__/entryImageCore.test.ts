/**
 * IMAGE-1 PR 1 (원장 D-77) — 엔트리 그림 서버 코어.
 *   ④ URL 한 장: 내려받기(10초 · 10MB · image/*) → 긴 변 1600 jpg + 600 jpg · 세로 400px 미만 거부
 *   발행: 초안 경로 → tournaments 경로 복사 계획(남의 경로 거부)
 * 바깥 사이트는 부르지 않는다 — 시험 안에서 node:http 가짜 서버를 띄운다.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCanvas, loadImage } from "canvas";
import {
  ENTRY_IMAGE,
  ImportError,
  fetchImageBytes,
  fitLongEdge,
  isBlockedHost,
  parseImportRequest,
  planFinalize,
  resizeToJpegs,
} from "../core/entryImageCore";

function png(w: number, h: number): Buffer {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#336699";
  ctx.fillRect(0, 0, w, h);
  return c.toBuffer("image/png");
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "ok";
  } catch (e) {
    return e instanceof ImportError ? e.code : `other:${String(e)}`;
  }
}

let server: Server;
let base = "";
const JPG_BODY = png(800, 450);

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = req.url ?? "";
    if (url === "/ok.png") {
      res.writeHead(200, { "Content-Type": "image/png", "Content-Length": JPG_BODY.length });
      res.end(JPG_BODY);
    } else if (url === "/page.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html></html>");
    } else if (url === "/big-header") {
      res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Length": String(11 * 1024 * 1024) });
      res.write(Buffer.alloc(1024));
      // 본문을 끝까지 보내지 않는다 — 머리말만 보고 끊어야 한다.
    } else if (url === "/big-stream") {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      const chunk = Buffer.alloc(1024 * 1024);
      let sent = 0;
      const pump = () => {
        while (sent < 12) {
          sent++;
          if (!res.write(chunk)) return void res.once("drain", pump);
        }
        res.end();
      };
      pump();
    } else if (url === "/redir-meta") {
      res.writeHead(302, { Location: "http://169.254.169.254/computeMetadata/v1/" });
      res.end();
    } else if (url === "/redir-ok") {
      res.writeHead(302, { Location: "/ok.png" });
      res.end();
    } else if (url === "/redir-loop") {
      res.writeHead(302, { Location: "/redir-loop" });
      res.end();
    } else if (url === "/slow") {
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(JG());
      }, 2000);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
});
const JG = () => JPG_BODY;
const local = { allowLoopback: true };

describe("수치", () => {
  it("지시서 5절 값 그대로", () => {
    expect(ENTRY_IMAGE).toEqual({
      LONG_EDGE: 1600,
      THUMB_EDGE: 600,
      MAX_BYTES: 10 * 1024 * 1024,
      MIN_HEIGHT: 400,
      FETCH_TIMEOUT_MS: 10_000,
    });
  });
});

describe("fitLongEdge", () => {
  it("긴 변을 줄이고 비율 유지 · 작으면 키우지 않는다", () => {
    expect(fitLongEdge(3200, 1800, 1600)).toEqual({ w: 1600, h: 900 });
    expect(fitLongEdge(900, 1600, 1600)).toEqual({ w: 900, h: 1600 });
    expect(fitLongEdge(800, 450, 1600)).toEqual({ w: 800, h: 450 });
    expect(fitLongEdge(1000, 3000, 600)).toEqual({ w: 200, h: 600 });
  });
});

describe("fetchImageBytes", () => {
  it("그림 응답 → 바이트", async () => {
    const buf = await fetchImageBytes(`${base}/ok.png`, local);
    expect(buf.equals(JPG_BODY)).toBe(true);
  });
  it("text/html → not-image", async () => {
    expect(await codeOf(fetchImageBytes(`${base}/page.html`, local))).toBe("not-image");
  });
  it("Content-Length 11MB → too-large(본문을 기다리지 않는다)", async () => {
    expect(await codeOf(fetchImageBytes(`${base}/big-header`, { ...local, timeoutMs: 3000 }))).toBe("too-large");
  });
  it("길이 머리말 없이 10MB 넘게 흘려보냄 → too-large", async () => {
    expect(await codeOf(fetchImageBytes(`${base}/big-stream`, local))).toBe("too-large");
  });
  it("시간 초과 → fetch-failed", async () => {
    expect(await codeOf(fetchImageBytes(`${base}/slow`, { ...local, timeoutMs: 200 }))).toBe("fetch-failed");
  });
  it("404 → fetch-failed", async () => {
    expect(await codeOf(fetchImageBytes(`${base}/nope`, local))).toBe("fetch-failed");
  });
  it("http(s) 아닌 주소 → fetch-failed", async () => {
    expect(await codeOf(fetchImageBytes("file:///etc/passwd", local))).toBe("fetch-failed");
    expect(await codeOf(fetchImageBytes("data:image/png;base64,AAAA", local))).toBe("fetch-failed");
    expect(await codeOf(fetchImageBytes("not a url", local))).toBe("fetch-failed");
  });
  it("실서비스(allowLoopback 아님)에서는 내부 주소를 부르지 않는다", async () => {
    expect(await codeOf(fetchImageBytes(`${base}/ok.png`))).toBe("fetch-failed");
  });
});

describe("fetchImageBytes — 주소 되돌림(리뷰 I-4)", () => {
  it("되돌림이 내부 주소(메타데이터)를 가리키면 따라가지 않는다", async () => {
    expect(await codeOf(fetchImageBytes(`${base}/redir-meta`, local))).toBe("fetch-failed");
  });
  it("보통 되돌림은 따라간다", async () => {
    expect((await fetchImageBytes(`${base}/redir-ok`, local)).equals(JPG_BODY)).toBe(true);
  });
  it("끝없는 되돌림 → fetch-failed", async () => {
    expect(await codeOf(fetchImageBytes(`${base}/redir-loop`, local))).toBe("fetch-failed");
  });
});

describe("isBlockedHost — 빈틈(리뷰 I-4)", () => {
  it("IPv4 를 품은 IPv6 · 끝 점 · 100.64/10 · 0.x 도 막는다", () => {
    for (const h of ["[::ffff:127.0.0.1]", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "localhost.", "100.64.0.1", "100.127.255.1", "0.1.2.3"]) {
      expect(isBlockedHost(h, false), h).toBe(true);
    }
    expect(isBlockedHost("100.63.0.1", false)).toBe(false);
  });
});

describe("isBlockedHost", () => {
  it("내부 주소 · 메타데이터 서버 막음", () => {
    for (const h of ["localhost", "127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "metadata.google.internal", "[::1]", "0.0.0.0"]) {
      expect(isBlockedHost(h, false)).toBe(true);
    }
  });
  it("보통 도메인 · 공개 IP 통과 · 에뮬레이터는 loopback 허용(메타데이터는 늘 막음)", () => {
    expect(isBlockedHost("images.example.com", false)).toBe(false);
    expect(isBlockedHost("8.8.8.8", false)).toBe(false);
    expect(isBlockedHost("172.32.0.1", false)).toBe(false);
    expect(isBlockedHost("127.0.0.1", true)).toBe(false);
    expect(isBlockedHost("169.254.169.254", true)).toBe(true);
  });
});

describe("resizeToJpegs", () => {
  it("2000×1000 png → 1600×800 jpg + 600×300 jpg", async () => {
    const r = await resizeToJpegs(png(2000, 1000));
    expect([r.width, r.height]).toEqual([1600, 800]);
    const full = await loadImage(r.full);
    const thumb = await loadImage(r.thumb);
    expect([full.width, full.height]).toEqual([1600, 800]);
    expect([thumb.width, thumb.height]).toEqual([600, 300]);
    expect(r.full.subarray(0, 2).toString("hex")).toBe("ffd8");
  });
  it("작은 그림은 키우지 않는다", async () => {
    const r = await resizeToJpegs(png(500, 400));
    expect([r.width, r.height]).toEqual([500, 400]);
  });
  it("세로 399px → too-small · 400 은 통과", async () => {
    expect(await codeOf(resizeToJpegs(png(1200, 399)))).toBe("too-small");
    expect(await codeOf(resizeToJpegs(png(1200, 400)))).toBe("ok");
  });
  it("그림으로 못 읽는 바이트 → not-image", async () => {
    expect(await codeOf(resizeToJpegs(Buffer.from("<html>")))).toBe("not-image");
  });
});

describe("parseImportRequest", () => {
  it("올바른 입력", () => {
    expect(parseImportRequest({ draftId: "abcD123", slot: 47, url: "https://a.com/x.jpg" })).toEqual({
      draftId: "abcD123",
      slot: 47,
      url: "https://a.com/x.jpg",
    });
  });
  it("틀린 칸 · 틀린 초안 id · 주소 없음 → null", () => {
    expect(parseImportRequest({ draftId: "a", slot: 48, url: "https://a" })).toBeNull();
    expect(parseImportRequest({ draftId: "a", slot: 1.5, url: "https://a" })).toBeNull();
    expect(parseImportRequest({ draftId: "../x", slot: 1, url: "https://a" })).toBeNull();
    expect(parseImportRequest({ draftId: "a".repeat(65), slot: 1, url: "https://a" })).toBeNull();
    expect(parseImportRequest({ draftId: "a", slot: 1, url: "" })).toBeNull();
    expect(parseImportRequest(null)).toBeNull();
  });
});

describe("planFinalize", () => {
  it("칸이 든 경로 → 새 칸 번호 이름으로 짝을 짓는다(칸을 옮겨도)", () => {
    const plan = planFinalize("u1", "d1", "t9", [
      { slot: 0, storagePath: "entry-images/drafts/u1/d1/5.jpg" },
      { slot: 3, storagePath: "entry-images/drafts/u1/d1/3.jpg" },
    ]);
    expect(plan).toEqual([
      {
        slot: 0,
        from: "entry-images/drafts/u1/d1/5.jpg",
        fromThumb: "entry-images/drafts/u1/d1/5_600.jpg",
        to: "entry-images/tournaments/t9/0.jpg",
        toThumb: "entry-images/tournaments/t9/0_600.jpg",
      },
      {
        slot: 3,
        from: "entry-images/drafts/u1/d1/3.jpg",
        fromThumb: "entry-images/drafts/u1/d1/3_600.jpg",
        to: "entry-images/tournaments/t9/3.jpg",
        toThumb: "entry-images/tournaments/t9/3_600.jpg",
      },
    ]);
  });
  it("남의 uid · 다른 초안 · 이상한 경로 → 던진다", () => {
    expect(() => planFinalize("u1", "d1", "t9", [{ slot: 0, storagePath: "entry-images/drafts/u2/d1/0.jpg" }])).toThrow();
    expect(() => planFinalize("u1", "d1", "t9", [{ slot: 0, storagePath: "entry-images/drafts/u1/d2/0.jpg" }])).toThrow();
    expect(() => planFinalize("u1", "d1", "t9", [{ slot: 0, storagePath: "entry-images/drafts/u1/d1/../../x.jpg" }])).toThrow();
    expect(() => planFinalize("u1", "d1", "t9", [{ slot: 0, storagePath: "crown-cards/t/0.png" }])).toThrow();
  });
  it("틀린 칸 번호 · 틀린 대회 id → 던진다", () => {
    expect(() => planFinalize("u1", "d1", "t9", [{ slot: 48, storagePath: "entry-images/drafts/u1/d1/0.jpg" }])).toThrow();
    expect(() => planFinalize("u1", "d1", "../t", [{ slot: 0, storagePath: "entry-images/drafts/u1/d1/0.jpg" }])).toThrow();
  });
});
