# AgentPress Docker Deployment

This project is configured to run as a Dockerized Next.js standalone app.

## Local Docker Run

Create a production env file:

```bash
cp .env.production.example .env.production
```

Edit `.env.production`:

```env
POSTGRES_PASSWORD=your_strong_password
ADMIN_SECRET=your_random_admin_secret
SITE_URL=http://localhost:3000
```

Start app + database:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Open:

```bash
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/api/healthz
```

## Database Migration

After containers start, push the Drizzle schema:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run db:push
```

Optional demo data:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run db:seed
```

## GitHub Release Image Build

Workflow file:

```text
.github/workflows/release-image.yml
```

When you publish a GitHub Release, GitHub Actions will build and push a multi-arch image to:

```text
ghcr.io/<owner>/agentpress
```

Tags produced:

- `latest`
- Release tag, e.g. `v1.0.0`
- Semver tags, e.g. `1.0.0`, `1.0`

## Pull and Run Release Image

```bash
docker pull ghcr.io/<owner>/agentpress:latest
```

Example compose using published image:

```yaml
services:
  app:
    image: ghcr.io/<owner>/agentpress:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://agentpress:${POSTGRES_PASSWORD}@db:5432/agentpress
      ADMIN_SECRET: ${ADMIN_SECRET}
      NEXT_PUBLIC_SITE_URL: ${SITE_URL}
```

## Required Runtime Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_SECRET` | Secret used by admin APIs |
| `NEXT_PUBLIC_SITE_URL` | Public base URL |
| `PORT` | App port, defaults to `3000` |

## Notes

- The Docker image uses `next.config.mjs` with `output: 'standalone'`.
- The app exposes `/api/healthz` for container health checks.
- PostgreSQL is included in `docker-compose.prod.yml` for self-hosted deployment.
- For managed database providers, replace the `DATABASE_URL` and remove the `db` service.