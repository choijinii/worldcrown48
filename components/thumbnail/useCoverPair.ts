/**
 * 대회 커버(대표 매치 VS 장면)에 필요한 엔트리 읽기 (THUMB-1 PR 2 · 킥 §4 ㉣).
 *
 * 고르는 규칙은 lib/thumbnail/cover(순수·유닛 테스트) — 여기는 Firestore 읽기와 그림 확인만.
 *   · 피치 카드 `useCoverPair` — 고른 두 개만 먼저 읽는다(2건). 옛 대회이거나 대체가 필요하면
 *     그때 대회의 엔트리 전체를 읽는다(`needsFullList`). 그림이 깨지면(`onBroken`) 그 엔트리를
 *     지워진 것으로 보고 다시 고른다 — 다음 앞 번호가 들어간다.
 *   · 관리자 목록 `useCoverBroken` — 고른 두 개의 포스터를 직접 불러 보고 깨졌는지 판정한다.
 *     **저장하지 않는다**(쓰기·규칙·함수 없음) — 표시는 볼 때마다 그 자리에서 다시 판정한다.
 *
 * 읽기 실패는 콘솔 오류로 올리지 않는다(빈 칸 커버가 설계된 폴백) — warn 만 남긴다.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, documentId, getDocs, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { posterSources } from "@/lib/media/stageCrop";
import { coverSides, needsFullList, probePoster, type CoverContestant, type CoverSides } from "@/lib/thumbnail/cover";
import type { ThumbnailPair } from "@/lib/thumbnail/pair";
import type { PosterOutcome } from "@/lib/thumbnail/poster";

const toCover = (id: string, data: Record<string, unknown>): CoverContestant => ({
  id,
  order: typeof data.order === "number" ? data.order : Number.POSITIVE_INFINITY,
  media: data.media as CoverContestant["media"],
});

async function readPairDocs(pair: ThumbnailPair): Promise<CoverContestant[]> {
  const snap = await getDocs(
    query(collection(getDb(), "contestants"), where(documentId(), "in", [pair.a, pair.b])),
  );
  return snap.docs.map((d) => toCover(d.id, d.data()));
}

async function readAllDocs(tournamentId: string): Promise<CoverContestant[]> {
  const snap = await getDocs(
    query(collection(getDb(), "contestants"), where("tournamentId", "==", tournamentId), orderBy("order")),
  );
  return snap.docs.map((d) => toCover(d.id, d.data()));
}

const pairKey = (p: ThumbnailPair | undefined) => (p ? `${p.a}|${p.b}|${p.aPos}|${p.bPos}` : "");

export function useCoverPair(
  tournamentId: string,
  pair: ThumbnailPair | undefined,
): CoverSides & { onBroken: (side: "a" | "b") => void } {
  const [docs, setDocs] = useState<CoverContestant[] | null>(null);
  const [full, setFull] = useState(false);
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const key = pairKey(pair);
  // 읽기 세대 — 대회·대표 매치가 바뀌면 늘어난다. 늦게 온 옛 응답은 버린다.
  const gen = useRef(0);

  // 고른 두 개만 먼저(옛 대회는 바로 전체).
  useEffect(() => {
    const my = ++gen.current;
    setDocs(null);
    setFull(!pair);
    setBroken(new Set());
    (pair ? readPairDocs(pair) : readAllDocs(tournamentId))
      .then((d) => gen.current === my && setDocs(d))
      .catch((err) => {
        console.warn("[cover] contestants read failed", err);
        if (gen.current === my) setDocs([]);
      });
    // pair 는 key 로 비교한다(문서가 다시 와도 같은 값이면 다시 읽지 않는다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, key]);

  const sides = useMemo(() => coverSides(pair, docs ?? [], broken), [pair, docs, broken]);
  const wantFull = docs !== null && !full && needsFullList(pair, sides);

  // 대체가 필요해지면(지워짐 · 그림 깨짐) 그때 대회의 엔트리 전체를 읽는다 — 한 번만.
  useEffect(() => {
    if (!wantFull) return;
    const my = gen.current;
    setFull(true);
    readAllDocs(tournamentId)
      .then((d) => gen.current === my && setDocs(d))
      .catch((err) => console.warn("[cover] contestants read failed", err));
  }, [wantFull, tournamentId]);

  const onBroken = useCallback(
    (side: "a" | "b") => {
      const id = side === "a" ? sides.aId : sides.bId;
      if (id) setBroken((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    },
    [sides.aId, sides.bId],
  );

  return docs === null ? { a: null, b: null, aId: null, bId: null, replaced: false, onBroken } : { ...sides, onBroken };
}

function loadImage(src: string): Promise<PosterOutcome> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ loadedWidth: img.naturalWidth });
    img.onerror = () => resolve("error");
    img.src = src;
  });
}

/**
 * 관리자 목록 — 고른 대표 매치(A·B)가 피치에 그대로 뜨는가. null = 확인 중 · 대표 매치가 없는 옛
 * 대회는 늘 false(고른 적이 없으니 깨질 것도 없다).
 */
export function useCoverBroken(tournamentId: string, pair: ThumbnailPair | undefined): boolean | null {
  const [broken, setBroken] = useState<boolean | null>(pair ? null : false);
  const key = pairKey(pair);

  useEffect(() => {
    if (!pair) {
      setBroken(false);
      return;
    }
    let alive = true;
    setBroken(null);
    (async () => {
      const docs = await readPairDocs(pair);
      const sides = coverSides(pair, docs, new Set());
      if (sides.replaced) return true; // 문서가 없거나 영상이 없다
      const picked = [sides.a, sides.b].filter((s): s is NonNullable<typeof s> => s !== null);
      const results = await Promise.all(
        picked.map((s) => probePoster(posterSources(s.videoId, s.orientation), loadImage)),
      );
      return results.includes("broken");
    })()
      .then((b) => alive && setBroken(b))
      .catch((err) => {
        console.warn("[cover] cover check failed", err);
        if (alive) setBroken(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, key]);

  return broken;
}
