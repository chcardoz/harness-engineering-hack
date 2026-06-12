# Better Auth

## What It Is

Better Auth is a framework-agnostic TypeScript authentication library with a plugin ecosystem. It fits a TypeScript/Next.js/Hono/Express style MVP well.

Official docs: https://better-auth.com/docs/introduction

## Relevant Capabilities

- Email/password and social sign-in patterns.
- Server-side `auth.api` methods and client SDK methods.
- Database-backed auth with adapters and generated/migrated schemas.
- Plugin system for extra auth and authorization features.
- Organization plugin for multi-tenant company accounts.

Sources:

- Introduction: https://better-auth.com/docs/introduction
- Basic usage: https://better-auth.com/docs/basic-usage
- Database concepts: https://www.better-auth.com/docs/concepts/database
- Plugins: https://better-auth.com/docs/concepts/plugins
- Organization plugin: https://www.better-auth.com/docs/plugins/organization
- Next.js integration: https://www.better-auth.com/docs/integrations/next
- Hono integration: https://better-auth.com/docs/integrations/hono
- Express integration: https://better-auth.com/docs/integrations/express

## Fit For Yougrep MVP

Use Better Auth for:

- recruiter/company login.
- organization creation.
- organization membership.
- organization-scoped jobs/channels/candidates.
- candidate login or magic-link/session flow if candidate state must persist.

The Organization plugin supports organizations, members, teams, invitations, active organization, roles, permissions, and schema customization. That maps directly to a company-side recruiting product.

## Suggested Data Boundary

Every company-side object should be tenant-scoped:

- `organization_id` on jobs/channels.
- `organization_id` on connector accounts.
- `organization_id` on candidate applications.
- `organization_id` on recruiter messages and agent outputs.
- role/permission checks before reading candidate/interview data.

Candidate-facing interview links should not expose organization-private channel history. The interview agent can receive a distilled job brief/context pack generated from the company thread and connectors.

## Risks And Caveats

- Better Auth handles auth, not product-level authorization by itself. The app still needs explicit organization checks on every protected route/query.
- If using non-Kysely ORM adapters, migration behavior differs; plan schema generation/migration carefully.
- Candidate data is sensitive. Treat session validation and server-side authorization as required, not optional.

## MVP Recommendation

Use Better Auth with the Organization plugin from day one. Even if collaboration is deferred, each company account should own an organization so jobs, connectors, candidates, and traces have a clean tenant boundary.
