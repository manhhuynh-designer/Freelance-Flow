## Freelance-Flow — Copilot instructions for code contributions

This file captures the minimal, concrete knowledge an AI coding agent needs to be immediately productive in this repository.

Keep guidance short and specific. When in doubt, follow existing project files (`README.md`, `src/*`) and mirror patterns already in the codebase.

1) Big-picture architecture
- Framework: Next.js (app router), React + TypeScript (see `package.json`).
- UI: Tailwind + shadcn/ui components (components live in `src/components`).
- Data: Local-first app data persisted in-browser (PouchDB + JSON backups). Look for `src/lib/*` for persistence helpers and `local-backup-manager.tsx` for backup/restore UI.
- AI: Integrates with Google Gemini (preferred) and optionally OpenAI. AI features are in `src/components/ai/*`, with configuration stored in `appSettings` (see `src/lib/data.ts` and `src/app/dashboard/settings/page.tsx`).
- Semantic search / Vector DB: lightweight in-memory vector DB scaffold in `src/lib/vector-db/*`. Production replacement should implement the `VectorDB` interface described in `src/lib/vector-db/types.ts`.

2) Critical developer workflows (commands)
- Install deps: `npm install`.
- Dev server: `npm run dev` (Next.js on localhost:3000). Use `npx vercel dev` if you need to run serverless AI flows alongside Next during local Genkit/dev work (mentioned in README).
- Build: `npm run build` (Next production build).
- Typecheck: `npm run typecheck` (tsc --noEmit).
- Tests: `npm run test` (vitest). Note: tests are sparse; run full typecheck after changes to prevent regressions.

3) Project-specific conventions & patterns
- Preferred AI provider: Google (Gemini). Code often chooses provider by reading `appSettings.preferredModelProvider` and selects API key from `appSettings.googleApiKey` / `openaiApiKey` — see `src/components/quote-suggestion.tsx`, `src/components/ai/*`, and `src/hooks/useAppData.ts`.
- Embeddings path: The app provides `/api/embeddings` (see `src/app/api/embeddings/route.ts`), which supports both Google and OpenAI providers. Client calls to generate embeddings typically route through `src/lib/vector-db/embeddings.ts` which will call `/api/embeddings` from the browser.
- Vector DB: `InMemoryVectorDB` is the default. If adding a remote adapter, implement `VectorDB` and wire into `src/lib/vector-db/service.ts` and `tasks-indexer.ts`.
- Feature flags & settings: app settings are stored in `appSettings` on the application data object; use existing setters and patterns in `src/hooks/useAppData.ts` and the settings page to update persisted config.
- UI/Text: bilingual strings live in `src/lib/i18n.ts` and `src/lib/i18n/*` files — update translations in these files rather than hardcoding.

4) Integration points & external dependencies to watch
- Google Gemini: Many AI components assume a Gemini-compatible API key and model (see `GEMINI_MODELS` usages in `src/app/dashboard/settings/page.tsx`). Changing defaults requires updating `src/lib/data.ts` and the settings UI.
- OpenAI support: available but secondary; code paths often branch provider selection. When adding new AI calls, accept `provider` + `apiKey` + `model` inputs.
- Embeddings API route: `src/app/api/embeddings/route.ts` must be used for client-side embedding requests to avoid exposing secret keys.

5) Small actionable rules for editing and PRs
- Preserve local-first behaviour: don't migrate data to a server unless a clear migration plan is added (update `docs/` and backups). Many users rely on local JSON backups (see `src/components/local-backup-manager.tsx`).
- When adding AI calls, follow the existing pattern: prefer server-side /api routes for secret usage, accept both Google/OpenAI, and honor `appSettings` when present.
- Add unit tests for non-UI logic (vector-db adapters, tasks-indexer) using Vitest. For UI changes, prefer manual smoke testing in `npm run dev`.

6) Quick file references (examples)
- AI & embeddings: `src/app/api/embeddings/route.ts`, `src/lib/vector-db/embeddings.ts`, `src/lib/vector-db/tasks-indexer.ts`, `src/components/ai/*`.
- App settings: `src/lib/data.ts`, `src/hooks/useAppData.ts`, `src/app/dashboard/settings/page.tsx`.
- Vector DB scaffold: `src/lib/vector-db/*` (types, in-memory adapter, service).
- Backups/imports: `src/components/local-backup-manager.tsx`, `src/components/data-restore-card.tsx`, `scripts/load-test-data.js`.

7) Example tasks & how to approach them
- Add a new AI-driven feature: 1) add UI in `src/components/ai/`; 2) respect `appSettings` for provider/apiKey/model; 3) call `/api/embeddings` or server-side AI endpoint; 4) add tests for non-UI logic.
- Replace InMemoryVectorDB with Pinecone: implement `VectorDB` in `src/lib/vector-db/pinecone.ts`, wire to `service.ts`, ensure indexing uses same document shape as `tasks-indexer.ts`.

8) Safety & privacy notes
- The app is explicitly local-first. Don't send user data to third-party services except when the user has provided API keys in settings and explicitly triggers AI features (see i18n FAQ and terms pages).

If anything above is unclear or you want more detail on a specific area (for example, vector-db contract, AI request shapes, or how `appSettings` are persisted), tell me which part to expand and I will iterate.
