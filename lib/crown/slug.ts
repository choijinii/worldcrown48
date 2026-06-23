/**
 * C-2 Crown Card · slug — filesystem-safe Champion slug for download filenames.
 *
 * Ported verbatim from the wireframe (line 1095): keep [A-Za-z0-9], collapse
 * every other run to a single dash, trim edge dashes, fall back to "champion".
 * Pure (handoff §3).
 */
export function slug(name: string): string {
  return (name || "champion")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "champion";
}

/** Download filename: `WC48-Crown-{slug}-{fmt}.png` (wireframe line 1342). */
export function crownFileName(name: string, fmt: string): string {
  return `WC48-Crown-${slug(name)}-${fmt}.png`;
}
