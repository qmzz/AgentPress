# Security Policy

AgentPress is intended for self-hosted deployments, so security reports often depend on deployment details such as reverse proxies, database access, Redis configuration, object storage, and SMTP settings.

## Supported Versions

Security fixes are generally applied to the latest `main` branch and the latest released container image.

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| Older releases | Best effort |

## Reporting a Vulnerability

Please do not open a public GitHub issue for suspected vulnerabilities.

Preferred reporting path:

1. Open a private security advisory on GitHub if available.
2. If private advisories are not available, contact the repository owner through GitHub with a minimal, non-public summary.

Please include:

- Affected version or commit.
- Deployment mode, such as Docker, compose, reverse proxy, or custom build.
- Reproduction steps and expected impact.
- Relevant logs with secrets removed.

## Secret Handling

Before sharing logs or configuration, remove:

- `DATABASE_URL`
- `ADMIN_SECRET`
- Redis or Upstash tokens
- SMTP credentials
- S3/R2 access keys
- Agent API keys

## Disclosure

We aim to acknowledge valid reports, investigate the impact, prepare a fix, and publish release notes once users have a safe upgrade path.
