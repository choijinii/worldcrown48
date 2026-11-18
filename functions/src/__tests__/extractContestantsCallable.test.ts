/**
 * LAB-FIX-4 통합 — extractContestantsFromVideos 콜러블이 묶음 · 대회 제목 · 설명을 받아 **SONNET_MODEL**
 * (thinking 명시적 비활성)로 부르는지. 네트워크 없이: Anthropic SDK · onCall · 한도 · 비밀을 가짜로 바꿔 끼운다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));
vi.mock("firebase-functions/v2/https", () => ({
  onCall: (_opts: unknown, handler: unknown) => handler,
  HttpsError: class extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));
vi.mock("firebase-functions/params", () => ({ defineSecret: () => ({ value: () => "test-key" }) }));
vi.mock("firebase-functions", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock("../aiQuota", () => ({ consumeAiDailyQuota: vi.fn(async () => {}) }));

import { SONNET_MODEL, SONNET_THINKING } from "../core/models";

type Handler = (req: { auth?: { uid: string }; data: unknown }) => Promise<{ extractions: { name: string }[] }>;

describe("extractContestantsFromVideos — 묶음을 받아 Sonnet 으로", () => {
  beforeEach(() => {
    process.env.ADMIN_UID = "admin";
    create.mockReset();
    create.mockResolvedValue({
      content: [{ type: "text", text: '{"extractions":[{"id":"esz-HscCZaE","name":"W-Unit","affiliation":"","nationality":"VN","confident":true}]}' }],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: "end_turn",
    });
  });

  it("세 줄 · 대회 제목 · 설명이 지시문에 실리고 모델은 SONNET + thinking 끔", async () => {
    const mod = await import("../extractContestants");
    const handler = mod.extractContestantsFromVideos as unknown as Handler;
    const res = await handler({
      auth: { uid: "admin" },
      data: {
        items: [{ videoId: "esz-HscCZaE", title: "TEMPEST - 'BAD NEWS' Dance Cover by W-UNIT from Vietnam", channelTitle: "W-Unit" }],
        entryUnit: "group",
        aiBrief: { entry: "영상에서 춤춘 댄스 크루", extra: "", rules: "원곡 가수는 엔트리가 아니다." },
        tournamentTitle: "올 한 해 가장 빛난 K-pop 댄스 크루는 누구일까?",
        tournamentDescription: "국내외 댄스 크루",
      },
    });
    expect(res.extractions[0].name).toBe("W-Unit");
    const call = create.mock.calls[0][0] as { model: string; thinking: unknown; messages: { content: string }[] };
    expect(call.model).toBe(SONNET_MODEL);
    expect(call.thinking).toEqual(SONNET_THINKING);
    const prompt = call.messages[0].content;
    expect(prompt).toContain("이 대회의 엔트리는 영상에서 춤춘 댄스 크루이다");
    expect(prompt).toContain("고르는 조건: 원곡 가수는 엔트리가 아니다.");
    expect(prompt).toContain("올 한 해 가장 빛난 K-pop 댄스 크루는 누구일까?");
    expect(prompt).toContain("국내외 댄스 크루");
  });
});
