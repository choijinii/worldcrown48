/**
 * PolicyShell — composes the four sub-components into the 2-column
 * desktop / 1-column mobile layout (handoff §6 design reference).
 *
 *   PolicyShell
 *     ├── PolicyNav         (desktop only; <480px CSS hides it)
 *     ├── PolicyMain
 *     │     ├── PolicyDocSwitch (mobile only)
 *     │     ├── PolicyHeader
 *     │     └── PolicyContent
 *     └── PolicyAnchorBar   (mobile only)
 *
 * Server component — receives the bilingual document from the route.
 * Child client components handle the i18n context and scroll-spy.
 */

import type { BilingualPolicy } from "@/lib/policyTypes";
import { PolicyNav } from "./PolicyNav";
import { PolicyDocSwitch } from "./PolicyDocSwitch";
import { PolicyHeader } from "./PolicyHeader";
import { PolicyContent } from "./PolicyContent";
import { PolicyAnchorBar } from "./PolicyAnchorBar";

export interface PolicyShellProps {
  policy: BilingualPolicy;
}

export function PolicyShell({ policy }: PolicyShellProps): JSX.Element {
  return (
    <>
      <div className="policy-shell">
        <PolicyNav activeType={policy.type} />
        <main className="policy-main">
          <PolicyDocSwitch activeType={policy.type} />
          <PolicyHeader ko={policy.ko.frontmatter} en={policy.en.frontmatter} />
          <PolicyContent
            type={policy.type}
            koBody={policy.ko.body}
            enBody={policy.en.body}
          />
        </main>
      </div>
      <PolicyAnchorBar />
    </>
  );
}
