# External access to the database (instead of the service role key)

The service role key is not retrievable on Lovable Cloud — it is injected into the backend at runtime and cannot be displayed or copied out. It also grants unrestricted access to every table, so handing it to an outside tool is unsafe even where possible.

Instead, this plan adds a small, token-protected API that an external tool can call over HTTPS.

## What gets built

1. A secret `EXTERNAL_API_TOKEN` that you create and store. You paste the same value into your external tool.
2. A read endpoint at `/api/public/external/papers` that returns paper records as JSON. It requires an `Authorization: Bearer <token>` header and rejects anything else with 401.
3. Query support for the common cases: filter by `status` (draft, sent_to_dqc, approved, not_approved), optional `since` date, and a capped `limit`.
4. Response fields limited to what a reporting tool needs — id, status, course name/code, class, semester, academic year, created-by email, timestamps. Question content and uploaded files stay out unless you ask for them.

## Usage once built

```text
curl -H "Authorization: Bearer <your token>" \
  "https://kjsit-qpd-gen.lovable.app/api/public/external/papers?status=approved"
```

## Technical notes

- TanStack server route under `src/routes/api/public/external/papers.ts`, since `/api/public/*` bypasses site auth; the handler itself enforces the bearer token with a constant-time comparison.
- The handler loads `supabaseAdmin` inside the handler via dynamic import after the token check, so the service-role client never enters the client bundle.
- Input parsed with Zod; `limit` capped at 200 to avoid unbounded reads.
- The token is stored as a Lovable Cloud secret, never written into the codebase.

## Open item

If the external tool also needs to write (e.g. mark a paper approved), tell me which action and I will add a matching POST endpoint under the same token.
