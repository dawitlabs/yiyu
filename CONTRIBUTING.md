# Contributing to yiyu

## Getting set up

See [README.md](README.md) for local setup (Docker Postgres, migrations, running the API).

## Workflow

1. Branch off `main` — never commit directly to it.
2. Keep commits small and focused; each one should represent a single logical change.
3. Open a PR against `main` once your branch builds, vets, and passes tests.

## Before opening a PR

```sh
go build ./...
go vet ./...
go test ./...
gofmt -l .   # should print nothing
```

If you touched `internal/adapters/repository/queries/`, run `sqlc generate` and commit the regenerated files alongside your query changes.

If you added a migration, run `make migrate-status` to confirm it applies cleanly, and make sure it has a working `-- +goose Down` — migrations must be rollbackable.

## Commit messages

Format: `type(scope): description` — lowercase, imperative, no trailing period.

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `ci`.

Breaking changes: `feat(api)!: description`.

Examples:
```
feat(auth): add session-based login
fix(repository): correct admin user role update query
```

## Code standards

- No placeholder code — no `// TODO`, no stubs, no half-finished implementations.
- No abstractions beyond what the current task needs.
- Validate and sanitize all input at system boundaries (HTTP handlers). Never trust client-sent IDs for ownership checks.
- Parameterized queries only — no raw string interpolation into SQL.
- Never log PII (emails, password hashes, tokens) or expose internal error details to API responses — log server-side, return a safe generic message to the client.
- New env var → add a placeholder to `.env.example` in the same commit.

## Security

Found a security issue? Please do not open a public issue. Open a private security advisory on GitHub, or contact the maintainer directly instead.

## License

By contributing, you agree your contributions will be licensed under the project's [MIT License](LICENSE).
