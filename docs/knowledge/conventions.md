# 开发与维护约定

## 代码组织与复用

后端沿用 `backend/libs/<domain>/src` 的 Controller、Service、DTO、module 和 index 导出，通过 `@eims/<domain>` 别名引用。前端沿用 views、service/api、typings/api、router、locales 分层。公共能力见[架构](architecture.md)，不重复实现认证、权限、Excel 读写或错误包装。

数据库坚持 camelCase Prisma／DTO／普通 API 字段 + snake_case 数据库映射，每个 model 指定 Schema。历史 OA snake_case／中文字段是兼容性例外，不顺手统一。新状态用稳定编码，名称和提示通过[国际化规范](internationalization.md)显示。

后端单引号、尾随逗号；禁止新增 `as any`、`@ts-ignore`、`@ts-expect-error`。已有代码含 any 和部分未统一风格，记录现状不代表推荐继续使用，也不授权本任务重构。密码用 bcrypt，不返回密码或哈希；密钥仅在授权的生成／重置响应中一次性提供。

## 权限、事务与兼容性

- 新业务接口明确 PermissionGuard 和权限键；管理身份／信任关系的入口保留 AdminGuard。前端菜单、按钮与后端权限同时更新。
- DTO 校验不能用 TypeScript interface 代替；批量行需要运行时嵌套验证与数量限制。
- 删除、改码前核实引用方；唯一键作为数据库底线，不能用前置查重证明没有并发风险。
- 跨系统动作说明谁是数据来源、哪个事务先提交、失败如何恢复；不将 fire-and-forget 描述为可靠消息投递。
- 涉及 shared reactive 查询对象时保留引用；异步搜索／刷新检查旧响应是否覆盖新结果。可参考 [OAuth 绑定页](../../frontend/src/views/system/sso/oauth2-binding/index.vue)。
- 改接口同步检查 API 类型、表单、导出、第三方客户端；普通错误响应与 OAuth 协议响应不可混用。
- 日志保留可定位事件，避免请求体、凭据和不必要个人信息；安全审计入口见[身份模块](../modules/identity/README.md)。

## 验证命令来源

以下从 package.json／配置读取，用于后续授权开发任务；本轮没有执行。

| 工作目录 | 命令 | 范围／副作用 |
| --- | --- | --- |
| backend | `pnpm build` | Nest 编译，会生成 dist |
| backend | `pnpm test --runInBand` | Jest；配置 [jest.config.json](../../backend/jest.config.json)，具体用例可能含副作用，执行前检查 |
| backend | `pnpm test:e2e` | [e2e 配置](../../backend/test/jest-e2e.json)，可能创建应用／依赖环境，不用于本轮只读核实 |
| backend | `pnpm prisma:validate` | Schema 校验，不代表数据库已迁移 |
| backend | `pnpm prisma:generate` | 生成客户端，会写生成文件 |
| backend | `pnpm lint` | 带 `--fix`，会改文件；纯检查应选择适当无修复命令 |
| frontend | `pnpm typecheck` | vue-tsc --noEmit --skipLibCheck |
| frontend | `pnpm build` | Vite prod 构建，会生成产物，路由插件可能更新生成文件 |
| frontend | `pnpm exec tsx --test tests/dingtalk-login.test.ts` | 已存在的钉钉扫码回调测试 |
| frontend | `pnpm lint` | oxlint／eslint 均带修复参数，不是只读检查 |
| 仓库根 | `git diff --check` | 检查已跟踪差异的空白错误；新文件需另做文本与路径检查 |

依据：[backend/package.json](../../backend/package.json)、[frontend/package.json](../../frontend/package.json)。验证应按影响范围选择，不把历史测试结果当成本轮结果；数据库并发、SSO 和生产代理需要单独环境验收。

## 文档更新触发点

长期知识只记录规则、边界和代码入口。普通格式调整无需新增文档；业务流程、字段、权限、接口、集成或国际化实质变化时更新相应现有文档并检查索引。按[总索引](README.md)导航，不要求每次全仓扫描。所有分析和新文档使用简体中文。
