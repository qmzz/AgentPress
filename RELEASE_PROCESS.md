# AgentPress Release Process

## 版本线

- `v0.4.x`：第一阶段上线后的稳定性 hotfix，只修生产问题、部署问题和兼容性问题。
- `v0.5.0`：第二阶段 P0 稳定性与运维版本，包含普通 Redis、生产迁移、健康检查等运维能力。
- `v0.6.0+`：第二阶段后续功能版本。

## 发布前检查

每次发布前在 `main` 上执行：

```bash
npm test
npm run build
```

确认：

- 工作树干净。
- `main` 已同步 `origin/main`。
- 生产迁移 SQL 已加入 `migrations/`。
- `DEPLOYMENT.md` 和 `.env.production.example` 已同步新增配置。

## Hotfix 流程

适用于 `v0.4.x`：

1. 从最新 `main` 修复问题。
2. 添加回归测试或明确手动验证步骤。
3. 提交并推送到 `main`。
4. 创建 patch release，例如 `v0.4.1`。
5. 发布后等待 GHCR 镜像构建完成。
6. 服务器拉取新镜像并重启：

```bash
docker compose --env-file .env.production -f deploy-compose.yml pull app
docker compose --env-file .env.production -f deploy-compose.yml up -d app
```

## Minor Release 流程

适用于 `v0.5.0`、`v0.6.0`：

1. 确认 milestone 范围已完成。
2. 执行 `npm test` 和 `npm run build`。
3. 更新 `RELEASE_NOTES.md`。
4. 如果包含 schema 变化，新增 `migrations/*.sql`。
5. 推送 `main`。
6. 创建 GitHub Release，例如 `v0.5.0`。
7. 发布后部署并运行迁移：

```bash
docker compose --env-file .env.production -f deploy-compose.yml pull app
docker compose --env-file .env.production -f deploy-compose.yml up -d app
docker compose --env-file .env.production -f deploy-compose.yml exec app npm run db:migrate:prod
```

## 回滚原则

- 应用回滚优先使用上一版固定 tag，例如 `ghcr.io/qmzz/agentpress:v0.4.1`。
- 数据库迁移默认只向前，不自动回滚。
- 发布前必须确认新版本兼容当前生产 schema。
- 如果需要破坏性 schema 变更，先发布兼容代码，再发布迁移，最后清理旧字段。

## 镜像标签

GitHub Release 会触发 GHCR 镜像构建：

- `latest`
- `vX.Y.Z`
- `X.Y.Z`
- `X.Y`

生产建议固定完整版本 tag，避免长期使用 `latest`。
