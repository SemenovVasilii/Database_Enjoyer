# Project rules

- The application is named DatabaseEnjoyer. Read `docs/architecture.md` and `docs/data-model.md` before changing storage or connectors.
- Connection passwords are encrypted; do not return secrets or raw driver errors through REST API.
- Connected database rows are read live and never stored in the metadata catalog.
- Preserve old metadata on sync failure and maintain light/dark semantic theme tokens.

- `web` and `server` are independent applications with their own npm manifests and lockfiles.
- Use npm in each application. Do not introduce a workspace or a shared runtime package.
- Applications communicate through REST API.
- Backend ORM and query builders are forbidden. Write SQL manually and pass values as query parameters.
- The root Compose file contains two applications and four databases: metadata PostgreSQL and test PostgreSQL, MySQL, MongoDB.
- Keep the frontend FSD architecture. Do not add tests unless requested.

<claude-mem-context>
# Memory Context

# [dbeaver_analog] recent context, 2026-09-15 10:44am GMT+3

No previous sessions found.
</claude-mem-context>
