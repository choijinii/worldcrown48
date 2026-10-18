/**
 * 초안 자동 저장기 (EDITOR-FIX-1) — 저장 시점과 순서만 맡는다. 무엇을 어디에 쓰는지는
 * 주입받은 `save` 가 안다(Firestore 를 모르는 순수 층이라 가짜 시계로 시험한다).
 *
 *   schedule(v) — 입력이 멈추고 `delayMs` 뒤 저장(디바운스, 마지막 값만)
 *   flush()     — 지금 저장(단계 이동 · AI 호출 직전). 진행 중인 저장까지 기다린다
 *   retry()     — 실패한 저장 다시(더 새 입력이 있으면 그것을)
 *   stop()      — 발행 직전: 남은 입력을 버리고 진행 중인 저장을 기다린 뒤 잠근다.
 *                 안 그러면 발행이 지운 초안을 늦게 도착한 저장이 되살린다
 *   resume()    — 잠금 해제(발행 실패 · 새 초안 시작)
 *
 * 저장은 **한 번에 하나**만 돈다(직렬화). 실패는 삼키지 않고 상태 "error"로 알린다.
 */

export type AutosaveStatus =
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error" };

export interface DraftAutosaver<T> {
  schedule(value: T): void;
  flush(): Promise<void>;
  retry(): Promise<void>;
  stop(): Promise<void>;
  resume(): void;
}

export function createDraftAutosaver<T>(opts: {
  save: (value: T) => Promise<void>;
  delayMs: number;
  onStatus: (status: AutosaveStatus) => void;
  now?: () => number;
}): DraftAutosaver<T> {
  const now = opts.now ?? Date.now;
  let pending: { value: T } | null = null;
  let failed: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let stopped = false;
  // stop() 이 올리는 세대 번호 — 줄 서 있던 저장이 잠금 뒤에 돌지 않게 한다.
  let generation = 0;

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  async function run(value: T, gen: number) {
    if (gen !== generation) return;
    opts.onStatus({ kind: "saving" });
    try {
      await opts.save(value);
      failed = null;
      opts.onStatus({ kind: "saved", at: now() });
    } catch {
      failed = { value };
      opts.onStatus({ kind: "error" });
    }
  }

  function flush(): Promise<void> {
    clearTimer();
    if (pending) {
      const { value } = pending;
      const gen = generation;
      pending = null;
      chain = chain.then(() => run(value, gen));
    }
    return chain;
  }

  return {
    schedule(value) {
      if (stopped) return;
      pending = { value };
      clearTimer();
      timer = setTimeout(() => void flush(), opts.delayMs);
    },
    flush,
    retry() {
      if (!pending && failed) pending = failed;
      return flush();
    },
    stop() {
      stopped = true;
      generation++;
      clearTimer();
      pending = null;
      return chain;
    },
    resume() {
      stopped = false;
    },
  };
}
