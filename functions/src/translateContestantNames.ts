/**
 * translateContestantNames — callable Cloud Function (The Lab 발행 · NAME-I18N-1 · 원장 D-61).
 *
 * translateContestantNamesCore 의 얇은 어댑터. 발행 때 한 번, 48명의 공식 영어 이름을
 * Haiku 1번으로 받는다. 관례는 translateTournamentMeta 와 같다(시크릿 · CORS · uid 속도 제한).
 *
 *   request.data:  { entries: [{ name, affiliation }], category }
 *   returns:       { nameI18n: [{ko,en,es}] (입력 순서), unsure: number[], failed: number[],
 *                    mismatch: [{ index, en }] (발음이 안 맞아 비운 칸 · 대표 2026-10-24 A안) }
 *
 * 코어는 AI 실패에 던지지 않는다(빈칸 + 로그). 여기서 던지는 것은 입력 오류뿐이고,
 * 그때도 클라이언트(lib/lab/translateNames.ts)가 한글 폴백으로 발행을 진행한다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import {
  MAX_NAME_ENTRIES,
  translateContestantNamesCore,
  type TranslateNamesResult,
} from "./core/translateContestantNamesCore";
import { HAIKU_MODEL } from "./core/models";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

/** 48명 × (번호·이름·sure) — 넉넉히. */
const NAMES_MAX_TOKENS = 4096;

const NAMES_RATE_LIMIT = 5;
const NAMES_RATE_WINDOW_MS = 60_000;
const uidBuckets = new Map<string, { count: number; windowStart: number }>();

function checkUidRateLimit(uid: string, now: number): boolean {
  const bucket = uidBuckets.get(uid);
  if (!bucket || now - bucket.windowStart >= NAMES_RATE_WINDOW_MS) {
    uidBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= NAMES_RATE_LIMIT;
}

export const translateContestantNames = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req): Promise<TranslateNamesResult> => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    if (!checkUidRateLimit(uid, Date.now())) {
      throw new HttpsError("resource-exhausted", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    }

    const entries = req.data?.entries;
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_NAME_ENTRIES) {
      throw new HttpsError("invalid-argument", `entries 는 1~${MAX_NAME_ENTRIES}명이어야 합니다.`);
    }
    const category = typeof req.data?.category === "string" ? req.data.category : "";

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "ANTHROPIC_API_KEY secret is not set. Run `firebase functions:secrets:set ANTHROPIC_API_KEY`.",
      );
    }
    const anthropic = new Anthropic({ apiKey });
    const createMessage = async (prompt: string): Promise<string> => {
      const resp = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: NAMES_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    };

    const result = await translateContestantNamesCore(
      {
        entries: entries.map((e: unknown) => {
          const o = (e ?? {}) as { name?: unknown; affiliation?: unknown };
          return {
            name: typeof o.name === "string" ? o.name : "",
            affiliation: typeof o.affiliation === "string" ? o.affiliation : "",
          };
        }),
        category,
      },
      { createMessage, logError: (msg, e) => logger.error(msg, e) },
    );
    if (result.unsure.length > 0) {
      logger.info(`translateContestantNames: ${result.unsure.length} name(s) unsure — review in The Lab`);
    }
    return result;
  },
);
