# YW-EIMS 项目知识库

本知识库用于按需恢复业务与技术上下文。核实日期：2026-10-19。除明确标注“待验证”的内容外，结论均已通过当前仓库源码或配置静态核实；不代表数据库现状、运行环境或生产联调已经验证。

YW-EIMS 是前后端分离的企业基础资料、模具产品、OA／ERP 集成和统一身份门户系统。应用入口为 [AppModule](../../backend/apps/api/src/app.module.ts)，数据定义以 [Prisma Schema](../../backend/libs/database/prisma/schema.prisma) 为准。

## 按任务阅读

| 任务 | 首选文档 |
| --- | --- |
| 了解定位、目录、技术栈 | [项目概况](project-overview.md)、[架构](architecture.md) |
| 定位功能与代码 | [业务地图](business-map.md)、下方模块索引 |
| 修改字段、关联或迁移 | [数据库](database.md)、[核心数据字典](data-dictionary.md) |
| 修改接口及调用方 | [API 总览](api-overview.md)、对应模块文档 |
| 登录、角色、接口授权、SSO | [认证与权限](authentication.md)、[身份管理](../modules/identity/README.md)、[OAuth2](../modules/oauth2/README.md) |
| 文案、导出、语言切换 | [国际化](internationalization.md) |
| 外部服务、同步、门户启动 | [集成](integrations.md)、[门户](../modules/portal/README.md) |
| 构建、配置、部署排查 | [运行与部署](deployment.md) |
| 开发与复用 | [开发约定](conventions.md)、[可靠性与待验证事项](reliability.md) |

## 业务模块索引

| 模块 | 覆盖范围 |
| --- | --- |
| [物料](../modules/material/README.md) | 物料、单位、编码规则、编码预览、两类导入、ERP 拉取 |
| [模具产品](../modules/mold-product/README.md) | 手机型号、颜色、材质、模具编码／模具、产品编码／产品 |
| [OA 与 ERP](../modules/oa/README.md) | 审批查询、用友推单、外部快照、定时同步、ERPNext 映射与日志 |
| [身份与访问管理](../modules/identity/README.md) | 本地及钉钉登录、用户、角色、功能权限、安全审计与清理 |
| [OAuth2／OIDC](../modules/oauth2/README.md) | 客户端、账号绑定、授权事务、令牌、退出 |
| [统一门户](../modules/portal/README.md) | 系统目录、角色可见性、账号绑定、启动地址 |
| [箱贴](../modules/box-label/README.md) | 浏览器 Excel 导入、箱贴 PDF，无业务后端持久化 |

上述模块覆盖当前 AppModule 注册的业务域与实际业务页面。`common/config/database` 和前端公共工具由架构、API、开发约定覆盖。`soybean-admin-example/` 是参考目录，未作为运行中业务模块分析；依赖、构建产物、个人配置及未跟踪演示文档不纳入扫描。

## 复用已有文档

- [SSO 实施与交付规范](../eims-sso-integration-guide.md)：双方职责、参数、交付与验收。
- [OAuth2 接口参考](../oauth2-sso-integration.md)：外部客户端对接流程。
- [CRM 接入方案](../crm-sso-integration.md)：目标系统的实施建议，不能视为 CRM 已上线证据。
- [门户使用说明](../portal-system-center.md)：管理员操作入口。
- [根 README](../../README.md)：现有运行说明；[项目规则](../../AGENTS.md)：开发约束。

## 使用与维护

1. 新任务先读适用的 AGENTS.md，再从本索引选择相关文档，不要求通读全库。
2. 修改前用实际代码核实关键规则；文档与代码冲突时修正受影响段落，不重复创建总结。
3. 模型与约束变更更新数据库／数据字典；路由与返回契约变更更新 API／模块；权限和跨系统变更同步认证／集成；文案与输出变更同步国际化。
4. 新业务域才新增模块文档；简单模块集中在 README，复杂流程按实际需要拆分。链接使用相对路径，避免复制 DTO、Schema 全文。
5. “已验证”必须注明是静态、自动化测试还是实际环境验收；本轮仅静态分析和文档检查，没有执行构建、测试、迁移或服务启动。
6. 不记录真实凭证、连接串、员工数据或生产业务内容。后续验证风险项需单独授权相应环境操作。

## 初始化验证记录

2026-10-19：完成 13 份项目级文档和 7 份领域模块文档；核对当前 Schema 的 36 个模型及业务 Controller 入口。对本轮 26 份新增／修改 Markdown 检查了 336 个本地链接，均可解析到现有文件或目录；新文档围栏、空白和凭据特征检查通过，`git diff --check` 通过。既有未跟踪 PPTX／DOCX 的 SHA-256 前后一致。

验证层级仅为源码静态核实和文档一致性检查：未执行构建、测试、迁移、seed、服务启动、外部 API 或生产访问。已识别的主业务域均有文档入口，逐函数安全审计、参考演示目录、真实业务数据和运行验收不在本轮覆盖范围；后续事项以可靠性清单为准。
