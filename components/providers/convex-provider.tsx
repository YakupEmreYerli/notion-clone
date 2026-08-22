"use client";

import { ReactNode, useCallback, useMemo } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

import { authClient } from "@/lib/auth-client";

let convexClient: ConvexReactClient | undefined;

const getConvexClient = (url: string) => {
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set — point it at your self-hosted Convex backend.",
    );
  }

  convexClient ??= new ConvexReactClient(url);
  return convexClient;
};

/**
 * Bridges the Better Auth session to Convex.
 *
 * Convex only ever sees a short-lived RS256 JWT minted by Better Auth's jwt
 * plugin and verified through the JWKS advertised at
 * /.well-known/openid-configuration.
 */
const useBetterAuthForConvex = () => {
  const { data: session, isPending } = authClient.useSession();

  const sessionId = session?.session?.id;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!sessionId) return null;

      try {
        const res = await fetch("/api/auth/token", {
          credentials: "include",
          cache: forceRefreshToken ? "no-store" : "default",
        });

        if (!res.ok) return null;

        const data = (await res.json()) as { token?: string };
        return data.token ?? null;
      } catch {
        return null;
      }
    },
    [sessionId],
  );

  return useMemo(
    () => ({
      isLoading: isPending,
      isAuthenticated: !!sessionId,
      fetchAccessToken,
    }),
    [isPending, sessionId, fetchAccessToken],
  );
};

export const ConvexClientProvider = ({
  children,
  convexUrl,
}: {
  children: ReactNode;
  convexUrl: string;
}) => {
  return (
    <ConvexProviderWithAuth
      client={getConvexClient(convexUrl)}
      useAuth={useBetterAuthForConvex}
    >
      {children}
    </ConvexProviderWithAuth>
  );
};
