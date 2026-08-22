"use client";

import { createAuthClient } from "better-auth/react";

/**
 * No baseURL on purpose: the client talks to the same origin it was served
 * from, which keeps things working behind any reverse proxy / domain.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
