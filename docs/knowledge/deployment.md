# 运行环境与部署

本文记录仓库配置，不是本轮部署操作记录。没有读取真实 `.env`，也没有执行构建、容器启动、迁移或远端访问。

## 拓扑和运行环境

| 部件 | 配置事实 |
| --- | --- |
| PostgreSQL | [Compose](../../docker-compose.yml)：postgres:16-alpine，宿主 5433 → 容器 5432；pgdata 数据卷；pg_isready 健康检查 |
| 后端 | [Dockerfile](../../backend/Dockerfile)：node:22-alpine，pnpm 11.8.0，构建时 Prisma generate + Nest build，运行 `node dist/apps/api/main` |
| 前端 | [Dockerfile](../../frontend/Dockerfile)：Node 构建，Nginx 托管 dist；Compose 默认 APP_PORT=8006 → 容器 80，实际端口取部署环境 |
| API 网络 | 后端未映射宿主端口；前端 Nginx `/api/` → backend:3000/，`/oauth/` → backend:3000/oauth/ |
| 持久化 | pgdata、oauth2-keys；后者挂到后端 `/app/keys`；前端 public/config 只读挂载 |
| TLS | 仓库内 Nginx 只监听 80，生产外层 HTTPS 代理配置不在此 Compose 中，待验证 |

开发脚本 `pnpm dev` 使用 Vite test mode，生产构建使用 prod mode；mode 名称不等于已存在自动化测试环境。[前端 package.json](../../frontend/package.json) 要求 Node >=20.19.0、pnpm >=10.5.0；镜像固定版本另见 Dockerfile。

## 环境变量用途

只列名称，不记录配置值。加载依据：[config.module.ts](../../backend/libs/config/src/config.module.ts)、[validation.ts](../../backend/libs/config/src/validation.ts) 及各集成 Service。

| 变量 | 用途／限制 |
| --- | --- |
| NODE_ENV、PORT、APP_PORT | 运行模式、后端监听、前端宿主端口；Compose 默认 production |
| POSTGRES_DB／USER／PASSWORD、DATABASE_URL | 数据库容器及 Prisma 连接；真实值仅在环境中管理 |
| JWT_SECRET、JWT_EXPIRES_IN | EIMS 访问 JWT；Joi 要求密钥至少 32 字符 |
| JWT_REFRESH_SECRET、JWT_REFRESH_EXPIRES_IN | 前者仍被配置校验要求，当前 AuthService 刷新令牌为随机值 + 数据库哈希；后者控制会话寿命，不要误写成当前刷新 JWT 签名机制 |
| AUTH_COOKIE_SECURE、CORS_ORIGINS、EIMS_FRONTEND_URL | Cookie 安全属性、允许来源、浏览器返回站点；production 检查 HTTPS |
| EIMS_SEED_ADMIN_PASSWORD | seed 初始化管理员密码，至少 12 字符；不应写入文档或日志 |
| DINGTALK_OAUTH_CLIENT_ID／CLIENT_SECRET／REDIRECT_URI／SCOPES／DEBUG | 钉钉网页登录配置；不要与审批 APP_KEY 混用 |
| DINGTALK_APP_KEY／APP_SECRET、DINGTALK_OA_DB_URL | 钉钉审批接口／外部快照库连接 |
| DINGTALK_AUTO_PROVISION_USERS | 默认启用快照自动建号；关闭不撤销已有账号 |
| ERP_APP_KEY／APP_SECRET | 用友令牌签名凭据 |
| ERPNEXT_AUTH_TOKEN、ERPNEXT_ITEM_API_URL | ERPNext Item 请求身份和地址 |
| OAUTH2_PROVIDER_ENABLED、OAUTH2_ISSUER | Provider 开关和对外 issuer；issuer 不追加 `/api` |
| OAUTH2_AUTH_CODE_EXPIRES_IN／ACCESS_TOKEN_EXPIRES_IN／REFRESH_TOKEN_EXPIRES_IN | OAuth 授权码、访问、刷新有效秒数 |
| OAUTH2_RSA_PRIVATE_KEY_PATH／PUBLIC_KEY_PATH | RSA 密钥文件位置；缺文件时服务启动可生成新密钥，必须保留卷和备份 |
| EXTERNAL_BUDGET／ERP／MES／CRM／LEMOS 对应的 `_URL`、`_SSO_START_URL` | 预置系统入口覆盖／SSO 备用地址；优先级见[门户](../modules/portal/README.md) |
| VITE_SERVICE_*、VITE_HTTP_PROXY、VITE_AUTH_ROUTE_MODE | 前端服务地址／业务码／代理／路由策略；打包时配置与后端运行时变量分开管理 |

## 运维约束与待验证

- [main.ts](../../backend/apps/api/src/main.ts) 在 production 要求 Secure Cookie、配置 URL 使用 HTTPS；Compose 给 Secure 的默认值为 false，不能直接用默认组合认定可启动生产服务。
- 镜像构建成功不等于运行容器已替换；源码更新不等于前端 dist 已更新。后续获授权部署时需确认提交、容器、日志、页面与 API 实际返回。
- 镜像启动命令不自动执行 migrate／seed。正式部署使用 Prisma migrate deploy 并指定 Schema；开发 migrate dev 不用于生产。操作说明复用[根 README](../../README.md)，执行前必须遵守任务授权。
- RSA 文件缺失会触发生成；不要删除 oauth2-keys 卷或把密钥写进 Git。数据库回滚不能用删卷代替；已有 SQL 历史未提供普遍可逆的 down migration。
- 当前源码未提供完整备份恢复、灰度回滚、集中指标平台配置。实际备份、证书、外层代理、多实例和监控告警均待环境核实。
- 后端启动会注册同步／清理任务并可能写数据库或生成密钥，因此知识库分析不通过启动服务来验证文档。
