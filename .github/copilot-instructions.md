## Freelance-Flow — Copilot instructions for code contributions

This file captures the minimal, concrete knowledge an AI coding agent needs to be immediately productive in this repository.

Keep guidance short and specific. When in doubt, follow existing project files (`README.md`, `src/*`) and mirror patterns already in the codebase.

1) Big-picture architecture
- Framework: Next.js (App Router), React + TypeScript (see `package.json`). Requires Node 18.17+.
- UI: Tailwind + shadcn/ui components (components live in `src/components`).
- Data: Local-first data persisted in-browser (PouchDB + JSON backups). See `src/lib/*` for persistence helpers and `src/components/local-backup-manager.tsx` or `src/components/backup-manager.tsx` for backup/restore UI.
- AI: Google Gemini preferred, OpenAI optional. Features under `src/components/ai/*`. Configuration lives in `appSettings` (see `src/lib/data.ts`, `src/app/dashboard/settings/page.tsx`). Model registry and fallbacks in `src/ai/utils/gemini-models.ts` and `src/ai/utils/gemini-api-service.ts`.
- Semantic search / Vector DB: In-memory vector DB scaffold under `src/lib/vector-db/*`. Tasks are indexed via `tasks-indexer.ts` and vectors are persisted for offline use via `persistence.ts`. Production adapters must implement `VectorDB` from `src/lib/vector-db/types.ts`.

2) Critical developer workflows (commands)
- Install deps: `npm install`.
- Dev server: `npm run dev` (Next.js on http://localhost:3000). Optionally `npx vercel dev` if you want Vercel-style serverless during local AI/dev work.
- Build: `npm run build` (Next production build).
- Typecheck: `npm run typecheck` (tsc --noEmit).
- Tests: `npm run test` (vitest). Tests are sparse; run typecheck to catch regressions.

3) Project-specific conventions & patterns
- Preferred AI provider: Google (Gemini). Provider and keys are read from `appSettings.preferredModelProvider`, `appSettings.googleApiKey`, `appSettings.openaiApiKey`. See `src/components/ai/*`, `src/components/quote-suggestion.tsx`, `src/hooks/useAppData.ts`.
- Embeddings API: Use `POST /api/embeddings` (`src/app/api/embeddings/route.ts`). It strictly requires `apiKey` in the request body and does not read server env vars. Call via `src/lib/vector-db/embeddings.ts` on the client.
- Vector DB: `InMemoryVectorDB` by default. To add a remote adapter, implement `VectorDB` and wire it in `src/lib/vector-db/service.ts`. Task indexing persists vectors to PouchDB via `src/lib/vector-db/persistence.ts` and upserts into the DB in `src/lib/vector-db/tasks-indexer.ts`.
- Feature flags & settings: `appSettings` is persisted with the rest of app data (local-first). Update via hooks/patterns in `src/hooks/useAppData.ts` and the Settings page.
- UI/Text: bilingual strings live in `src/lib/i18n.ts` and `src/lib/i18n/*`. Don’t hardcode strings.

4) Integration points & external dependencies to watch
- Google Gemini: Most AI components assume a Gemini key/model. Model registry in `src/ai/utils/gemini-models.ts`. Changing defaults may require updates in `src/lib/data.ts` and Settings UI.
- OpenAI support: Available but secondary; branch on provider and accept `provider` + `apiKey` + `model` inputs.
- Embeddings API: `src/app/api/embeddings/route.ts` requires a user-provided `apiKey` in the request body (no server ENV fallback). Keep keys in `appSettings` and pass explicitly from the client.

5) Small actionable rules for editing and PRs
- Preserve local-first behaviour: don’t move data server-side unless you add a migration plan (update `docs/` and backup flows). Users rely on JSON backups (see backup components).
- AI calls: prefer server `/api` routes when secrets are required, respect `appSettings`, support both Google/OpenAI where relevant, and use the embeddings bridge (`src/lib/vector-db/embeddings.ts`) for vector work.
- Tests: add unit tests for non-UI logic (vector-db adapters, tasks-indexer) with Vitest. For UI, do manual smoke tests on `npm run dev`.

6) Quick file references (examples)
- AI & embeddings: `src/app/api/embeddings/route.ts`, `src/lib/vector-db/embeddings.ts`, `src/lib/vector-db/tasks-indexer.ts`, `src/ai/utils/gemini-models.ts`, `src/ai/utils/gemini-api-service.ts`, `src/components/ai/*`.
- App settings: `src/lib/data.ts`, `src/lib/types.ts`, `src/hooks/useAppData.ts`, `src/app/dashboard/settings/page.tsx`.
- Vector DB scaffold: `src/lib/vector-db/*` (types, in-memory adapter, persistence, service).
- Backups/imports: `src/components/local-backup-manager.tsx`, `src/components/backup-manager.tsx`, `src/components/data-restore-card.tsx`, `scripts/load-test-data.js`.

7) Example tasks & how to approach them
- Add a new AI-driven feature: 1) add UI in `src/components/ai/`; 2) respect `appSettings` for provider/apiKey/model; 3) use `/api/embeddings` or a server-side AI endpoint where needed; 4) add tests for non-UI logic.
- Replace InMemoryVectorDB with Pinecone: implement `VectorDB` in `src/lib/vector-db/pinecone.ts`, wire it in `src/lib/vector-db/service.ts`, ensure indexing uses the same document shape as `tasks-indexer.ts` and persists vectors.

8) Safety & privacy notes
- The app is explicitly local-first. Only send user data to third-party AI services when the user has provided API keys in Settings and explicitly uses AI features. Avoid implicit server-side key usage.

If anything above is unclear or you want more detail on a specific area (for example, vector-db contract, AI request shapes, or how `appSettings` are persisted), tell me which part to expand and I will iterate.
