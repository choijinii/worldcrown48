/**
 * seed-preview.lib.mjs — pure helpers for the unified preview seeder (W-3).
 *
 * No firebase-admin / no I/O here so this unit-tests in the repo's node-env
 * Vitest. The runnable script (seed-preview.mjs) imports these.
 */

/** Modules the seeder knows how to inject. */
export const MODULES = ["a1", "b1", "c1", "c2", "c3", "d1", "e1"];

/** Days a preview Deadline sits in the past / future. */
export const DEADLINE_OFFSET_DAYS = 30;

/**
 * Expand a `--module=` value to a concrete module list.
 *  - undefined / "all"  → every module
 *  - "c3"               → ["c3"]
 *  - "b1,c1"            → ["b1", "c1"]
 * Throws on any unknown module.
 */
export function resolveModules(moduleArg) {
  if (!moduleArg || moduleArg === "all") return [...MODULES];
  const requested = String(moduleArg)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = requested.filter((m) => !MODULES.includes(m));
  if (invalid.length) {
    throw new Error(
      `Unknown module(s): ${invalid.join(", ")}. Valid: all, ${MODULES.join(", ")}`,
    );
  }
  return requested;
}

/**
 * Parse argv (already sliced past `node script`) into options.
 * Throws on unknown flags and invalid values — fail loud, no silent defaults.
 */
export function parseArgs(argv) {
  const out = { module: "all", cleanup: false, deadline: "future", help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      out.help = true;
    } else if (arg === "--cleanup") {
      out.cleanup = true;
    } else if (arg.startsWith("--module=")) {
      out.module = arg.slice("--module=".length);
    } else if (arg.startsWith("--deadline=")) {
      const v = arg.slice("--deadline=".length);
      if (v !== "past" && v !== "future") {
        throw new Error(`--deadline must be 'past' or 'future', got '${v}'`);
      }
      out.deadline = v;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return out;
}

/** A Deadline `Date` relative to `now` per the `--deadline` option. */
export function deadlineFromOption(option, now) {
  const ms = DEADLINE_OFFSET_DAYS * 24 * 60 * 60 * 1000;
  return option === "past"
    ? new Date(now.getTime() - ms)
    : new Date(now.getTime() + ms);
}

/** Production guard (handoff §8 #7): never seed against a production runtime. */
export function isProductionBlocked(env) {
  return (env && env.NODE_ENV) === "production";
}
