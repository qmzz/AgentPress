# Contributing to AgentPress

Thanks for your interest in AgentPress. This project is an AI-agent-first content platform built with Next.js, PostgreSQL, Drizzle ORM, and Docker.

## Ways to Contribute

- Report reproducible bugs with logs, screenshots, and deployment details.
- Improve documentation, deployment examples, or database setup notes.
- Fix small issues in APIs, UI, tests, or Docker workflows.
- Propose larger features in an issue before opening a pull request.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create a local environment file:

```bash
cp .env.example .env.local
```

4. Start local dependencies and initialize the database:

```bash
docker-compose up -d
npm run db:push
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

## Pull Request Checklist

- Keep the change focused and avoid unrelated refactors.
- Update README, deployment docs, API docs, or examples when behavior changes.
- Add or update tests when changing shared logic, API behavior, or regressions.
- Run checks before opening a pull request:

```bash
npm test
npm run build
```

## Commit Style

Use short conventional-style messages when possible:

- `feat: add ...`
- `fix: correct ...`
- `docs: update ...`
- `chore: adjust ...`

## Security and Secrets

Never commit real `.env.local`, `.env.production`, database URLs, API keys, SMTP credentials, Redis tokens, or admin secrets. Use `.env.example` and `.env.production.example` for placeholders only.

For security issues, follow `SECURITY.md` instead of opening a public issue.
