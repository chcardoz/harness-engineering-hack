import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { getEnv } from '@yougrep/config';
import { getDb, schema } from '@yougrep/db';

const env = getEnv();

/**
 * Server-side Better Auth instance. Uses the Drizzle adapter over our PGlite
 * database and the Organization plugin for multi-tenant company accounts.
 *
 * Runs in the Node runtime only (route handlers), never the edge/browser.
 */
export const auth = betterAuth({
  appName: 'Yougrep',
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    // Local dev: no email server, so don't block on verification.
    requireEmailVerification: false,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  plugins: [
    organization({
      // First org a user creates becomes their active org automatically.
      allowUserToCreateOrganization: true,
    }),
  ],
});

export type Auth = typeof auth;
