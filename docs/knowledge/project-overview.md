# 项目概况

## 定位与边界

YW-EIMS 管理物料及模具产品主数据，查询钉钉审批并向用友推送采购单，同时向 ERPNext 同步 Item，并作为外部系统 OAuth2／OIDC 身份中心和门户。当前注册模块和 Schema 未体现仓库库存台账、财务记账或自行执行审批流的能力。

依据：[AppModule](../../backend/apps/api/src/app.module.ts)、[Schema](../../backend/libs/database/prisma/schema.prisma)、[业务地图](business-map.md)。业务实际使用部门及生产数据规模待验证，文档中的角色指技术权限边界。

## 技术栈与目录

| 位置 | 实际职责与依赖 |
| --- | --- |
| [backend/package.json](../../backend/package.json) | NestJS 11、TypeScript、Prisma 6、JWT、bcryptjs、Axios、pg、Nest Schedule、Joi、class-validator；Jest／ts-jest |
| [frontend/package.json](../../frontend/package.json) | Vue 3.5、Vite 8、TypeScript、Naive UI、Pinia、Vue Router、UnoCSS、vue-i18n 11、ExcelJS、pdfmake |
| [backend/apps/api/src](../../backend/apps/api/src) | 单个 Nest HTTP 应用，统一守卫、拦截器、异常处理 |
| [backend/libs](../../backend/libs) | common、config、database、auth、roles、user、material、mold-product、oa、oauth2-provider、portal、audit |
| [frontend/src/views](../../frontend/src/views) | 业务页面及内置登录／异常页 |
| [frontend/src/service/api](../../frontend/src/service/api) / [typings/api](../../frontend/src/typings/api) | API 调用与 TypeScript 契约 |
| [frontend/src/router](../../frontend/src/router) | Elegant Router 生成配置、路由守卫 |
| [frontend/src/locales](../../frontend/src/locales) | 中、英、墨西哥西语资源及日期／组件语言桥接 |
| [frontend/packages](../../frontend/packages) | `@sa/axios`、hooks、utils、materials 等工作区包 |
| [backend/libs/database/prisma](../../backend/libs/database/prisma) | Schema、SQL migrations、seed |
| [docker-compose.yml](../../docker-compose.yml) | PostgreSQL 16、Node 后端、Nginx 前端，数据卷与密钥卷 |

后端是 Nest monorepo，前端有自己的 pnpm workspace；根目录没有统一 package.json 或根 pnpm workspace，命令需要在相应子目录执行。版本以上述依赖声明为描述依据，精确解析版本以各自 lockfile 为准。

## 入口和配置

- 后端 [main.ts](../../backend/apps/api/src/main.ts) 创建应用，默认监听 3000，启用验证管道、带凭据 CORS 和生产 HTTPS 检查。
- 前端 [main.ts](../../frontend/src/main.ts) 初始化应用；页面通过公共 request 调用后端。
- [配置模块](../../backend/libs/config/src/config.module.ts) 加载 `.env`、`../.env` 并执行 [Joi 校验](../../backend/libs/config/src/validation.ts)。真实配置未读取；环境变量用途见[部署文档](deployment.md)。
- [Nginx](../../frontend/nginx.conf) 将 `/api/` 去前缀代理到后端，`/oauth/` 保留路径代理；Nest 本身没有全局 `/api` 前缀。
- 运行脚本见[开发约定](conventions.md)。本轮只记录命令，没有执行运行、安装、测试或构建。

## 当前能力边界

界面注册 `zh-CN`、`en-US`、`es-MX`，不意味着所有后端提示、业务名称和打印内容均已多语言化。认证包括本地 Cookie 会话、钉钉登录和外部 OAuth 令牌三条链路。四个 PostgreSQL Schema 是业务分区，不是租户隔离。外部数据库和接口的可达性、权限及部署启用状态均待实际环境验证。
