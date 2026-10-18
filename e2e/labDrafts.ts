/**
 * The Lab E2E 공용 — 초안(EDITOR-FIX-1) 때문에 생긴 두 가지를 맡는다.
 *
 * 1) 편집기는 내 초안이 있으면 [이어서 만들기] 목록부터 연다. 운영자 계정에 진짜
 *    초안(대표의 작업)이 있을 수 있으므로, 목록이 뜨면 [새로 시작]으로 빈 편집기에 간다.
 * 2) 자동 저장은 E2E 가 친 내용도 초안으로 남긴다. 정리는 **그 spec 이 쓴 제목**의
 *    초안만 지운다 — 운영자 계정의 다른 초안은 절대 건드리지 않는다.
 */
import { expect, type Page } from "@playwright/test";
import * as admin from "firebase-admin";

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}

function adminDb(): admin.firestore.Firestore | null {
  if (admin.apps.length === 0) {
    const sa = loadServiceAccount();
    if (!sa) return null;
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

/** /admin/lab 을 열고 빈 편집기(STEP 1)까지 간다. */
export async function openFreshLabEditor(page: Page, path = "/admin/lab?lang=ko"): Promise<void> {
  await page.goto(path);
  const title = page.getByLabel("Tournament 제목");
  const picker = page.getByTestId("draft-picker");
  await expect(title.or(picker).first()).toBeVisible();
  if (await picker.isVisible()) {
    await page.getByTestId("draft-new").click();
  }
  await expect(title).toBeVisible();
}

/** 운영자(TEST_UID)의 초안 중 제목이 정확히 `titles` 인 것만 지운다. */
export async function deleteE2EDrafts(titles: string[]): Promise<void> {
  const db = adminDb();
  const uid = process.env.TEST_UID;
  if (!db || !uid) return;
  const snap = await db.collection("tournamentDrafts").where("hostUid", "==", uid).get();
  const batch = db.batch();
  let n = 0;
  snap.forEach((d) => {
    if (titles.includes(String(d.get("title") ?? ""))) {
      batch.delete(d.ref);
      n++;
    }
  });
  if (n > 0) await batch.commit();
}

/** 운영자(TEST_UID)의 초안 중 제목이 `title` 인 것의 수. 관리자 키가 없으면 null(→ 단언 실패). */
export async function countE2EDrafts(title: string): Promise<number | null> {
  const db = adminDb();
  const uid = process.env.TEST_UID;
  if (!db || !uid) return null;
  const snap = await db
    .collection("tournamentDrafts")
    .where("hostUid", "==", uid)
    .where("title", "==", title)
    .get();
  return snap.size;
}
