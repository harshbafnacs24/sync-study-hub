import type { ReactNode } from "react";

/**
 * The 430px-wide mobile frame used across the app. On viewports >=500px
 * it renders as a centered "device" with rounded corners.
 * Includes ambient background glow layers for visual depth.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="ss-frame">
      <div className="ss-shell">
        {/* Ambient background — barely-visible slow pulsing glows */}
        <div className="ss-ambient" aria-hidden="true">
          <div className="ss-ambient-glow ss-ambient-glow-1" />
          <div className="ss-ambient-glow ss-ambient-glow-2" />
        </div>
        {children}
      </div>
    </div>
  );
}

