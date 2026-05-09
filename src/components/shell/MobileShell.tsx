import type { ReactNode } from "react";

/**
 * The 430px-wide mobile frame used across the app. On viewports >=500px
 * it renders as a centered "device" with rounded corners.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="ss-frame">
      <div className="ss-shell">{children}</div>
    </div>
  );
}
