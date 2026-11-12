# src/pages — routes

Present now (foundation versions): Landing, Earth Explorer, Studio, Time Travel, How it works, Accessibility, Not found. Each uses `PageHeader` and says honestly what is not built yet.
The route list, labels and titles live in `src/routes.ts`; `src/App.tsx` maps paths to pages. Pages compose lower layers and hold no logic of their own.
