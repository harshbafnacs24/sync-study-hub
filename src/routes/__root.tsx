import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { AuthProvider } from "../lib/auth-context";

function NotFoundComponent() {
  return (
    <div className="ss-frame">
      <div className="ss-shell" style={{ padding: 24, justifyContent: "center", alignItems: "center" }}>
        <h1 className="ss-display" style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--color-primary)" }}>404</h1>
        <p className="ss-mono" style={{ color: "var(--color-muted-foreground)", marginTop: 8, fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          page not found
        </p>
        <Link to="/" className="ss-btn ss-btn-primary" style={{ marginTop: 20 }}>Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="ss-frame">
      <div className="ss-shell" style={{ padding: 24, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <h2 className="ss-display" style={{ fontSize: "1.4rem", fontWeight: 800 }}>Something broke</h2>
        <p style={{ color: "var(--color-muted-foreground)", marginTop: 8, fontSize: "0.85rem" }}>
          {error.message}
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button
            className="ss-btn ss-btn-primary"
            onClick={() => { router.invalidate(); reset(); }}
          >
            Try again
          </button>
          <Link to="/" className="ss-btn ss-btn-outline">Home</Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Sync & Study" },
      { name: "description", content: "Sync & Study — collaborative study and productivity for focused students." },
      { name: "theme-color", content: "#0c0c0c" },
      { property: "og:title", content: "Sync & Study" },
      { property: "og:description", content: "Collaborative study sessions, Pomodoro, and AI-assisted learning." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster theme="dark" position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
