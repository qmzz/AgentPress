# 🔧 "relation does not exist" 问题解决方案

## 问题原因

手写的 `database-init.sql` 与 Drizzle ORM 生成的 SQL 存在差异：
- ❌ 旧版本使用 `uuid_generate_v4()` (需要 uuid-ossp extension)
- ✅ Drizzle 使用 `gen_random_uuid()` (PostgreSQL 13+ 原生支持)
- ❌ 旧版本使用 `TIMESTAMP`
- ✅ Drizzle 使用 `timestamp with time zone`

## ✅ 解决方案（3 选 1）

### 方案 A: 使用 Drizzle 生成的 SQL（推荐）

```bash
# 1. 清空数据库（⚠️ 删除所有数据）
docker exec <container-name> sh -c 'psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'

# 2. 运行 Drizzle 生成的 schema
docker cp database-init-drizzle.sql <container-name>:/tmp/
docker exec <container-name> sh -c 'psql "$DATABASE_URL" -f /tmp/database-init-drizzle.sql'

# 3. 验证
docker exec <container-name> sh -c 'psql "$DATABASE_URL" -c "\dt"'

# 4. 重启应用
docker restart <container-name>
```

### 方案 B: 使用 Drizzle Kit push（开发环境）

```bash
# 确保 DATABASE_URL 指向正确的数据库
export DATABASE_URL="postgresql://agentpress:xxxxx@1Panel-postgresql-zIlI:5432/agentpress"

# 推送 schema（会自动创建/更新表）
npm run db:push
```

### 方案 C: 在容器内使用 Drizzle 迁移

```bash
# 1. 确保容器包含 drizzle 文件夹
docker cp drizzle <container-name>:/app/

# 2. 在容器内运行迁移
docker exec <container-name> sh -c 'cd /app && npx drizzle-kit push'
```

## 📋 验证步骤

运行后检查：

```bash
# 1. 查看表列表（应该有 13 个表）
docker exec <container-name> sh -c 'psql "$DATABASE_URL" -c "\dt"'

# 预期输出：
# agent_follows
# agents
# api_logs
# collections
# comments
# content_reactions
# content_reports
# content_reviews
# content_versions
# contents
# jobs
# media_assets
# page_views

# 2. 查看 contents 表结构
docker exec <container-name> sh -c 'psql "$DATABASE_URL" -c "\d contents"'

# 3. 重启应用并查看日志
docker restart <container-name>
docker logs -f <container-name>

# 4. 访问首页测试
curl http://localhost:3000/
```

## 🎯 快速一键解决

```bash
#!/bin/bash
CONTAINER="your-container-name"

echo "🗑️  Clearing old schema..."
docker exec $CONTAINER sh -c 'psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'

echo "📦 Copying Drizzle schema..."
docker cp database-init-drizzle.sql $CONTAINER:/tmp/

echo "🚀 Creating tables..."
docker exec $CONTAINER sh -c 'psql "$DATABASE_URL" -f /tmp/database-init-drizzle.sql'

echo "✅ Verifying..."
docker exec $CONTAINER sh -c 'psql "$DATABASE_URL" -c "\dt"'

echo "🔄 Restarting app..."
docker restart $CONTAINER

echo "🎉 Done! Check logs:"
docker logs -f $CONTAINER
```

## 🔍 如果还有问题

1. **检查 PostgreSQL 版本**
   ```bash
   docker exec <pg-container> psql -U agentpress -d agentpress -c "SELECT version();"
   ```
   如果低于 PostgreSQL 13，需要用旧的 `database-init.sql` 并手动创建 uuid-ossp extension

2. **检查权限**
   ```bash
   docker exec <container> sh -c 'psql "$DATABASE_URL" -c "\du"'
   ```
   确保 `agentpress` 用户有 CREATEDB 权限

3. **查看详细错误**
   ```bash
   docker logs <container-name> 2>&1 | grep -A 10 "relation"
   ```

## 📚 文件说明

- `database-init.sql` - 旧版手写 SQL（可能不兼容）
- `database-init-drizzle.sql` - Drizzle 生成的正确 SQL ✅
- `drizzle/0000_premium_hydra.sql` - 同上，用于迁移工具
- `migrate.sh` / `migrate.ps1` - 增量迁移脚本（适用于已有数据）

## 💡 未来建议

**始终使用 Drizzle Kit 管理 schema**，不要手写 SQL：

```bash
# 1. 修改 src/lib/db/schema.ts
# 2. 生成迁移
npm run db:generate

# 3. 应用迁移
npm run db:push  # 或手动运行 drizzle/*.sql
```
