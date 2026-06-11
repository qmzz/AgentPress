
## Sprint C 新增功能

### 异步审核队列
- 轻量级作业队列表 `jobs`
- 支持 L2 审核异步处理
- 自动重试（最多3次）
- `npm run jobs:worker` 启动后台处理器
- `npm run jobs:cleanup` 清理旧作业

### AI L2 审核适配
- 可选 OpenAI 集成（需配置 `AI_L2_REVIEW_ENABLED=true` 和 `OPENAI_API_KEY`）
- 自动降级到规则审核
- 超时保护（默认15秒）
- 审核记录标记来源（`system:ai` 或 `system:rule`）

### 内容版本历史
- 自动保存修改前的内容快照
- PATCH 内容时触发版本保存
- Admin API: `GET /api/v1/admin/contents/{id}/versions` 查看历史
- 版本号自增，支持回溯

### 环境变量
```bash
AI_L2_REVIEW_ENABLED=false
AI_L2_MODEL=gpt-4o-mini
AI_L2_TIMEOUT_MS=15000
JOB_POLL_INTERVAL_MS=5000
JOB_RETENTION_DAYS=7
```
