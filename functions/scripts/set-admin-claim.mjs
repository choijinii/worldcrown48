#!/usr/bin/env node
/**
 * set-admin-claim.mjs — grant the `admin` custom claim to the operator uid
 * (ND-1: /admin/newsdesk client reads/writes the news collection, whose rules
 * require request.auth.token.admin == true).
 *
 * Secrets are passed by ENV ONLY and NEVER printed:
 *   OP_UID       = operator uid (from `firebase functions:secrets:access ADMIN_UID`)
 *   SA_KEY_FILE  = path to a Firebase service-account key JSON  (preferred), or
 *   FIREBASE_ADMIN_SDK_KEY = raw/base64 service-account JSON
 *
 * Output is a single boolean line — no uid, no key, ever.
 */
import admin from "firebase-admin";
import { readFileSync } from "node:fs";

const uid = (process.env.OP_UID || "").trim();
if (!uid) {
  console.error("OP_UID 미설정 (환경변수로 전달).");
  process.exit(1);
}

let svc;
const keyFile = process.env.SA_KEY_FILE;
const rawKey = process.env.FIREBASE_ADMIN_SDK_KEY;
try {
  if (keyFile) {
    svc = JSON.parse(readFileSync(keyFile, "utf8"));
  } else if (rawKey) {
    svc = JSON.parse(
      rawKey.trim().startsWith("{") ? rawKey : Buffer.from(rawKey, "base64").toString("utf8"),
    );
  } else {
    console.error("SA_KEY_FILE 또는 FIREBASE_ADMIN_SDK_KEY 필요.");
    process.exit(1);
  }
} catch {
  console.error("서비스계정 키를 읽/파싱하지 못함 (경로/형식 확인). 값은 출력 안 함.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(svc) });

await admin.auth().setCustomUserClaims(uid, { admin: true });
const u = await admin.auth().getUser(uid);
// 오직 boolean만 출력 — uid/키는 절대 찍지 않음.
console.log("done. admin =", u.customClaims?.admin === true);
process.exit(0);
