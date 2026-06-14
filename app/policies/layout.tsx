/**
 * /policies layout — Domain 5 light-theme wrapper.
 *
 *   - data-theme="light" activates the light token block in globals.css
 *   - .domain-policy sets `container-type: inline-size` so the policy
 *     shell's container queries work (handoff §9 trap 6)
 *
 * Domain 0~3 (dark) surfaces are NOT affected — this wrapper is scoped to
 * /policies/* routes only.
 */

export default function PoliciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="light" className="domain-policy">
      {children}
    </div>
  );
}
