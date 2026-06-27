# AgentPress 数据库初始化与排障

本文专门处理数据库初始化和 `relation "contents" does not exist` / `relation "collections" does not exist` 这类问题。

## 1. 先判断部署场景

### 全新数据库

数据库里还没有 AgentPress 表。执行完整脚本：

- 推荐文件：`schema.sql`
- 兼容文件：`database-init.sql`，内容与 `schema.sql` 保持一致

### 旧版本升级

数据库里已经有 AgentPress 表。不要执行完整建表脚本，执行增量迁移：

```bash
npm run db:migrate:prod
```

Docker 部署时用：

```bash
docker compose -f deploy-compose.yml --env-file .env.production run --rm app npm run db:migrate:prod
```

## 2. 终端执行 SQL

### 外部 PostgreSQL

```bash
psql "postgresql://agentpress:password@host:5432/agentpress" -f schema.sql
```

### Compose 内置 PostgreSQL

```bash
docker compose -f deploy-compose.yml --env-file .env.production up -d db
docker compose -f deploy-compose.yml --env-file .env.production run --rm app npm run db:init:prod
```

如果使用源码构建 compose，把 `deploy-compose.yml` 换成 `docker-compose.prod.yml`。

## 3. 数据库控制台执行 SQL

适用于 1Panel、pgAdmin、DBeaver、Supabase SQL Editor 等工具：

1. 进入目标数据库，确认数据库名是 `agentpress` 或你的实际库名。
2. 打开仓库中的 `schema.sql`。
3. 复制完整 SQL 内容。
4. 粘贴到 SQL 控制台并执行。
5. 执行后运行：

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

预期能看到 `agents`、`contents`、`collections`、`agent_api_keys` 等表。

## 4. 排查 relation does not exist

这个错误通常不是代码问题，而是应用连接的数据库没有表。

### 步骤 1：查看应用实际连接的数据库

```bash
docker compose -f deploy-compose.yml --env-file .env.production exec app printenv DATABASE_URL
```

或普通 Docker：

```bash
docker exec agentpress printenv DATABASE_URL
```

### 步骤 2：检查同一个数据库里有没有表

外部 PostgreSQL：

```bash
psql "<上一步输出的 DATABASE_URL>" -c "\dt"
```

Compose 内置 PostgreSQL：

```bash
docker compose -f deploy-compose.yml --env-file .env.production exec db \
  psql -U agentpress -d agentpress -c "\dt"
```

### 步骤 3：如果没有表，执行初始化

全新库执行：

```bash
psql "<上一步输出的 DATABASE_URL>" -f schema.sql
```

如果你只能进数据库控制台，就复制 `schema.sql` 完整内容执行。

## 5. 常见误区

### 初始化了 A 数据库，应用连接 B 数据库

最常见。务必以应用容器里的 `DATABASE_URL` 为准。

### Docker 网络不通

如果 PostgreSQL 是 1Panel 已有容器，AgentPress 必须加入同一个 external network，且 `DATABASE_URL` 里的 host 要用 PostgreSQL 容器名或服务名。

### 普通 Redis 与 Upstash 填反

这不会导致建表失败，但会影响注册和限流功能：

- 普通 Redis：`REDIS_URL=redis://host:6379`
- Upstash REST：`UPSTASH_REDIS_REST_URL=https://...`

### 使用了旧的 database-init.sql

当前仓库中 `database-init.sql` 已与 `schema.sql` 同步。若你手里有旧版本文件，请丢弃旧文件，重新使用最新版 `schema.sql`。

## 6. 最终验证

```bash
curl http://localhost:3000/api/healthz
```

如果应用仍报数据库缺表，请提供以下三项：

1. 应用容器内 `printenv DATABASE_URL` 输出，密码可打码。
2. 对同一连接串执行 `\dt` 的结果。
3. 使用的 compose 文件中 `environment` 和 `networks` 部分。
