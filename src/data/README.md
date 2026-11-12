# src/data — browser data loaders

Fetches `/data/<id>/*.json` and frame manifests, validates them with `core`, and returns typed objects or typed errors
(`network`, `http`, `parse`, `validation`, `stale`). Network and 5xx errors retry twice with backoff. Created in Phase 5.
Never substitutes invented data when a load fails.
