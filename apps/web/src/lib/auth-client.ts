"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

// Mesma origem — o Next rewrite em next.config.ts proxya /api/auth/* para a API.
// Assim o cookie de sessão fica no origin do browser, sem headache de CORS.
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
