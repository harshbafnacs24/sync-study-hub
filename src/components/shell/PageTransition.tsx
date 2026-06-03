import type { ReactNode } from "react";

/**
 * Wraps a page's root content to apply the unified fade-up enter animation.
 * Uses display:contents — zero layout impact, pure visual polish.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="ss-page">{children}</div>;
}
