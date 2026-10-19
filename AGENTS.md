# AGENTS.md — YW-EIMS

## 项目与知识库入口

YW-EIMS 企业信息管理系统：NestJS 11 + Prisma 6 + PostgreSQL 后端，Vue 3 + Vite 8 + SoybeanAdmin 前端。后端 Nest monorepo 与前端 pnpm workspace 分别管理，命令在对应子目录执行。默认用简体中文交流和维护文档。

- 按任务读取 [知识库总索引](docs/knowledge/README.md)，再进入相关模块；不要求全仓重复扫描。
- 数据库／API 变更参考 [数据库](docs/knowledge/database.md)、[数据字典](docs/knowledge/data-dictionary.md)、[API 总览](docs/knowledge/api-overview.md)。
- 认证／集成参考 [认证权限](docs/knowledge/authentication.md)、[系统集成](docs/knowledge/integrations.md)；已知事务与并发边界见 [可靠性清单](docs/knowledge/reliability.md)。
- 重要业务或架构变化同步更新受影响的现有文档；以实际代码核实，不将文档、静态检查或历史测试当作生产验收。

## 数据库命名

**Schema**：`public`（身份、权限、门户、安全）、`material`（物料）、`mold`（模具产品）、`oa`（审批映射与 ERP 缓存）。每个 model 使用 `@@schema()`；Schema 分区不等于多租户隔离。

| 层次 | 约定 | 示例 |
|---|---|---|
| 表名 | snake_case、显式 `@@map()`，沿用既有单复数命名 | `@@map("system_user")` |
| 列名 | snake_case、`@map()` | `userName String @map("user_name")` |
| Prisma 字段 | camelCase（TypeScript 侧） | `userName`, `createTime` |
| DTO / Entity 属性 | camelCase | `CreateUserDto.userName` |
| 普通 API JSON | camelCase；历史 OA 字段保留兼容 | `{ "userName": "admin" }` |

**规则**：多词列必须显式 `@map("snake_case")`。单词列（`id`、`password`、`status`、`roles`、`buttons`）无需 `@map`。

## Prisma 工作流

Schema 位于 `backend/libs/database/prisma/schema.prisma`，不是默认路径。

Prisma 命令须指定 `--schema`，或使用已有脚本；执行写操作须属于用户授权范围：

```bash
cd backend
pnpm prisma:generate    # 生成客户端
pnpm prisma:validate    # 校验 Schema
pnpm prisma:migrate     # 开发环境创建并执行迁移（交互式）
pnpm prisma:seed        # 写入种子数据，执行前核对目标库
pnpm prisma:studio      # 数据库管理界面，不是只读验证
```

**列重命名**：Prisma 不自动识别重命名，保留原有手工处理约定：
1. 在 Schema 更新 `@map("new_name")`。
2. 创建迁移目录和 `ALTER TABLE ... RENAME COLUMN` SQL，评估历史数据及调用方。
3. 若经授权采用手工 SQL 路径，在 backend 使用 `pnpm exec prisma db execute --schema libs/database/prisma/schema.prisma --file <migration.sql>`。
4. 仅在确认该迁移 SQL 已完整执行后，使用 `pnpm exec prisma migrate resolve --schema libs/database/prisma/schema.prisma --applied <migration_name>` 登记；不可用 resolve 跳过未执行的变更。

正式环境常规发布使用 `migrate deploy`；不能将以上特殊手工流程当作默认部署步骤。

**禁止**用 `prisma db push` 处理列重命名，尤其含 PostgreSQL 数组列的表：它可能生成 DROP+ADD 而非 RENAME，造成失败或数据损失。

## 后端架构

应用入口：`backend/apps/api/src/`。下表库位于 `backend/libs/`：

| 库 | 职责 |
|---|---|
| `common` / `config` / `database` | 统一协议、Joi 配置、Prisma／迁移／seed |
| `auth` / `user` / `roles` / `audit` | Cookie 会话、钉钉登录、用户、角色权限、安全日志与清理 |
| `material` / `mold-product` | 物料、单位、规则、模具产品及基础字典 |
| `oa` | 钉钉审批／快照、用友推单与缓存、ERPNext Item／映射／日志 |
| `oauth2-provider` / `portal` | OAuth2／OIDC、账号映射、统一门户目录与启动 |

库通过 `src/index.ts` 导出，使用 `@eims/<name>` 别名。物料和模具产品共用 oa 的 ErpNextService；公共库变更须检查跨模块影响。

## 常用命令

```bash
# 后端
cd backend
pnpm start:dev         # 默认 3000；会启动同步与清理等逻辑
pnpm build             # 编译
pnpm lint              # eslint --fix，会修改文件
pnpm test              # Jest 测试，先核对用例和环境

# 前端
cd frontend
pnpm dev               # Vite test mode；代理依实际前端配置
pnpm build             # Vite prod mode 构建
pnpm typecheck         # vue-tsc --noEmit --skipLibCheck
```

更多验证入口与副作用见 [开发约定](docs/knowledge/conventions.md)。仅文档分析时不自动运行构建、测试、服务、生成客户端或迁移。

## API 与安全约定

- 普通成功响应：`{ "code": "0000", "msg": "success", "data": ... }`；OAuth 协议接口保留原始响应。
- 浏览器使用 HttpOnly Cookie，写请求校验 CSRF；JWT 守卫兼容 Bearer，OAuth UserInfo 使用独立 OAuth Bearer。
- 401 业务码 `9999`；403 业务码 `8888`，也包括权限拒绝／CSRF，不能只解释为强制登出。
- 新接口复用 PermissionGuard／RequirePermission；管理身份与信任关系的入口保留 AdminGuard。
- 初始化管理员为 `superadmin`，密码来自 `EIMS_SEED_ADMIN_PASSWORD`，不记录实际值。
- 不擅自提交、推送、部署、迁移、改生产数据或启动外部同步；不清理或覆盖用户已有修改。

## 风格与国际化

- 后端使用单引号、尾随逗号（`.prettierrc`）。
- 不新增 `as any`、`@ts-ignore`、`@ts-expect-error`。
- 密码使用 bcrypt 哈希，API 不返回密码或密码哈希。
- 新可见文本复用 `$t`，同步 `zh-CN`／`en-US`／`es-MX` 资源及类型；详见 [国际化](docs/knowledge/internationalization.md)。业务名称翻译与界面翻译分开设计，保留历史导入表头与 API 兼容性。
