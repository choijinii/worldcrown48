/**
 * betaPass — 1차 베타 명단 확인 콜러블 (BETA-PASS-1 · 지시서 §2-2).
 *
 *   request.data:  없음
 *   returns:       { token, expMs } — 화면이 쿠키 `wc48_beta` 로 심는다(lib/launch/betaPass.ts)
 *   errors:        unauthenticated    로그인 없음 · 익명 계정
 *                  permission-denied  명단에 없음 · 메일 미인증
 *                  internal           비밀 BETA_PASS_SECRET 이 비어 있음
 *
 * 명단 = `config/betaAllowlist.emails` — 클라이언트 규칙은 읽기 · 쓰기 모두 막고(firestore.rules),
 * 이 함수만 관리 SDK 로 읽는다. 런칭 시각은 환경 변수 LAUNCH_AT(없으면 코드 기본값) — 지난 값이면
 * 지금+14일(betaPassCore). 메일은 로그에 남기지 않는다.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { BetaPassError, issueBetaPass, launchAtFromEnv, type BetaAuth } from "./core/betaPassCore";

const BETA_PASS_SECRET = defineSecret("BETA_PASS_SECRET");

export const betaPass = onCall(
  {
    secrets: [BETA_PASS_SECRET],
    cors: ALLOWED_ORIGINS,
    // 로그인한 화면에서 부르지만 콜러블은 공개 호출이어야 한다(hashIp 403 사고 — 확인은 아래 request.auth).
    invoker: "public",
    timeoutSeconds: 20,
  },
  async (req): Promise<{ token: string; expMs: number }> => {
    const auth = req.auth as BetaAuth | undefined;
    const snap = auth ? await adminDb.doc("config/betaAllowlist").get() : null;
    try {
      return issueBetaPass({
        auth,
        allowlist: snap?.get("emails"),
        secret: BETA_PASS_SECRET.value() ?? "",
        nowMs: Date.now(),
        launchAtMs: launchAtFromEnv(process.env.LAUNCH_AT),
      });
    } catch (err) {
      if (err instanceof BetaPassError) throw new HttpsError(err.code, err.message);
      throw err;
    }
  },
);
