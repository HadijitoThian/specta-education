import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// ─── QueryClient ─────────────────────────────────────────────────────────────
// CRITICAL: staleTime=5min + refetchOnWindowFocus=false prevents the auth
// redirect loop where staffAuth.me refetches on tab-switch and briefly returns
// null, triggering the auth guard to redirect to /staff-login.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes — data is fresh, no background refetch
      refetchOnWindowFocus: false,     // Never refetch when user switches tabs
      refetchOnReconnect: false,       // Never refetch on network reconnect
      retry: false,                    // Don't retry — avoids cascading error redirects
    },
  },
});

// ─── Global error handler ─────────────────────────────────────────────────────
// ONLY redirect when the server explicitly throws UNAUTHED_ERR_MSG ("Please login (10001)").
// Any other error (network, 500, timeout) must NOT redirect — it would log staff out.
// CRM/staff routes use their own JWT cookie auth, NOT Manus OAuth.
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Only act on the explicit "Please login (10001)" message
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  const path = window.location.pathname;

  // CRM and Social Studio show their own inline sign-in forms — never redirect.
  if (path.startsWith("/crm") || path.startsWith("/sosmed") || path.startsWith("/SosMed")) return;

  // Legacy /staff routes → the single team sign-in page (/login).
  if (path.startsWith("/staff")) {
    if (path === "/login") return;
    window.location.href = "/login";
    return;
  }

  // Student portal routes
  if (path.startsWith("/student") || path.startsWith("/my-journey")) {
    if (path === "/student/login" || path === "/student/register") return;
    window.location.href = "/student/login";
    return;
  }

  // Admin and all other routes → Manus OAuth
  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </HelmetProvider>
);
