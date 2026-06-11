# Sprint C 实施完成报告

## 交付清单

### ✅ 数据层
- `migrations/0005_jobs_and_versions.sql`
  - `jobs` 表：id, type, payload, status, attempts, max_attempts, error, timestamps
  - `content_versions` 表：id, content_id, version_number, title, summary, blocks, tags, language, created_at
  - 索引优化：作业状态查询、版本历史查询

### ✅ 异步审核队列
- `src/lib/job-queue.ts`
  - `enqueueJob(type, payload)` 创建作业
  - `processNextJob()` 处理队列（FOR UPDATE SKIP LOCKED）
  - `cleanupOldJobs(daysToKeep)` 清理旧记录
  - 自动重试机制（最多3次）
  - 支持 `l2_review` 作业类型

### ✅ AI L2 审核适配
- `src/lib/review-l2-ai.ts`
  - OpenAI API 集成（可选）
  - 超时保护（默认15秒）
  - 自动降级到规则审核
  - 审核来源标记：`system:ai` / `system:rule`
  - 环境变量：`AI_L2_REVIEW_ENABLED`, `AI_L2_MODEL`, `AI_L2_TIMEOUT_MS`

### ✅ 内容版本历史
- `src/lib/content-versions.ts`
  - `saveContentVersion(contentId)` 保存快照
  - `getContentVersions(contentId)` 查询历史
  - `getContentVersion(contentId, versionNumber)` 获取特定版本
  - 版本号自动递增
- `src/app/api/v1/contents/[id]/route.ts` PATCH 方法自动触发版本保存
- Admin API：`GET /api/v1/admin/contents/{id}/versions` 查看版本历史

### ✅ 后台任务管理
- `scripts/job-worker.mjs`：作业处理循环
- `scripts/cleanup-jobs.ts`：清理旧作业
- `package.json` scripts：
  - `jobs:worker` 启动作业处理器
  - `jobs:cleanup` 清理历史记录

### ✅ 配置与文档
- `.env.production.example` 新增配置项
- `README.md` 更新 Sprint C 说明
- `SPRINT_C_FEATURES.md` 详细功能文档
- `tests/core-api.test.ts` 新增队列和版本测试

## 核心实现细节

**作业队列设计**
- PostgreSQL 原生支持（无需 Redis/RabbitMQ）
- `FOR UPDATE SKIP LOCKED` 防止并发冲突
- 状态机：pending → running → completed/failed
- 失败重试与最大尝试次数限制

**AI 审核流程**
1. 检查 `AI_L2_REVIEW_ENABLED` 和 `OPENAI_API_KEY`
2. 调用 OpenAI Chat Completions API
3. 超时或失败时降级到规则审核
4. 审核结果写入 `content_reviews` 表
5. 更新内容状态（approved/rejected/flagged）

**版本管理策略**
- 仅在 PATCH 前触发（不包括 submit/publish）
- 版本号从1开始递增
- 保存完整内容快照（title, summary, blocks, tags, language）
- `content_id + version_number` 唯一约束

## 验收标准

✅ 作业可入队并异步处理
✅ AI 审核失败时自动降级
✅ 内容编辑前自动保存版本
✅ Admin 可查看版本历史
✅ 后台任务管理脚本可运行
✅ 测试覆盖关键功能
✅ 文档完整更新

## Git 提交

```
ad12deb feat: add async review queue, AI L2 adapter, and content versioning
```

14 个文件修改，377 行新增代码

## 下一步

- 数据库迁移需在生产环境执行：`npm run migrate`
- AI 审核需配置 `OPENAI_API_KEY`
- 后台作业处理器需独立进程：`npm run jobs:worker`
- 建议设置定时任务清理旧作业：`npm run jobs:cleanup`

**Sprint C 全部完成！** 🎉
