'use client';

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

/**
 * Browser auth client. Talks to the Better Auth route handler mounted at
 * /api/auth. Same-origin, so no baseURL needed.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization: organizationActions,
  useListOrganizations,
  useActiveOrganization,
} = authClient;
