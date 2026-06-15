# 数据库连接排查脚本
# 用于诊断 "relation does not exist" 问题

## 步骤 1: 检查 Docker 容器的环境变量

```bash
# 查看容器里的 DATABASE_URL
docker exec <container-name> printenv DATABASE_URL

# 或者查看所有环境变量
docker exec <container-name> env | grep DATABASE
```

## 步骤 2: 在容器内验证数据库连接

```bash
# 进入容器
docker exec -it <container-name> sh

# 测试连接（容器内）
apk add postgresql-client  # 如果没有 psql
psql $DATABASE_URL -c "\dt"
```

**预期结果**：应该看到 contents, collections 等 13 个表

**如果看不到**：说明容器连的数据库和你初始化的不是同一个

## 步骤 3: 检查数据库实例

```bash
# 检查你初始化的数据库
psql "postgresql://user:pass@host:5432/agentpress" -c "\dt"

# 检查容器连接的数据库（从步骤 1 获取 URL）
psql "<容器的DATABASE_URL>" -c "\dt"
```

**对比两个结果**，如果不同说明连错了数据库

## 步骤 4: 常见错误场景

### 场景 A: 本地初始化，Docker 连远程
- 初始化脚本：`psql postgresql://localhost:5432/agentpress`
- 容器环境变量：`DATABASE_URL=postgresql://remote-host:5432/agentpress`
- **结果**：本地有表，远程没表

### 场景 B: 数据库名不同
- 初始化脚本：连到 `agentpress`
- 容器环境变量：连到 `postgres` 或 `agentpress_test`
- **结果**：初始化的数据库和运行的不是同一个

### 场景 C: Docker Compose 用了 volume
- `docker-compose.yml` 里 postgres 用了持久化 volume
- 删除容器后数据还在，但你初始化的是新数据库
- **结果**：容器用的是旧数据

## 解决方案

### 方案 A: 在正确的数据库运行初始化

```bash
# 1. 获取容器的 DATABASE_URL
CONTAINER_DB_URL=$(docker exec <container-name> printenv DATABASE_URL)

# 2. 在该数据库运行初始化
psql "$CONTAINER_DB_URL" -f database-init.sql

# 3. 验证
psql "$CONTAINER_DB_URL" -c "\dt"
```

### 方案 B: 在容器内运行初始化

```bash
# 1. 拷贝脚本到容器
docker cp database-init.sql <container-name>:/tmp/

# 2. 在容器内执行
docker exec <container-name> psql $DATABASE_URL -f /tmp/database-init.sql

# 3. 验证
docker exec <container-name> psql $DATABASE_URL -c "\dt"
```

### 方案 C: 重建 Docker Compose 环境

```bash
# 停止并删除 volumes（⚠️ 会丢失数据）
docker-compose down -v

# 重新启动
docker-compose up -d

# 等待数据库启动（5-10秒）
sleep 10

# 初始化
docker-compose exec app psql $DATABASE_URL -f /app/database-init.sql
```

## 步骤 5: 最终验证

```bash
# 重启应用容器
docker restart <container-name>

# 查看日志
docker logs -f <container-name>

# 访问首页
curl http://localhost:3000/
```

如果还报错，提供：
1. `docker exec <container> printenv DATABASE_URL` 的输出
2. `psql $DATABASE_URL -c "\dt"` 的输出（两边都运行）
3. docker-compose.yml（如果有）
