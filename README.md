# YW-EIMS

YW-EIMS（Enterprise Information Management System）是一个前后端分离的企业信息管理系统，面向基础资料、模具/产品管理、OA 审批和 ERPNext 集成等业务场景。

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 后端 | NestJS 11、TypeScript、Prisma 6、PostgreSQL、JWT |
| 前端 | Vue 3、Vite 8、TypeScript、Naive UI、Pinia、UnoCSS |
| 部署方式 | Docker Compose |
| 外部集成 | ERPNext Item API、钉钉 OA 数据库/接口 |

## 项目结构

```text
YW-EIMS/
├─ backend/                         # NestJS 后端 monorepo
│  ├─ apps/api/                     # API 应用入口
│  ├─ libs/
│  │  ├─ common/                    # 统一响应、异常过滤、分页 DTO 等
│  │  ├─ config/                    # 环境变量加载与校验
│  │  ├─ database/                  # PrismaService、Schema、迁移与种子
│  │  ├─ auth/                      # JWT 登录、刷新与鉴权守卫
│  │  ├─ user/                      # 系统用户管理
│  │  ├─ material/                  # 物料、单位、编码规则
│  │  ├─ mold-product/              # 模具产品基础资料
│  │  └─ oa/                        # OA、ERPNext 映射、同步日志
│  ├─ libs/database/prisma/
│  │  └─ schema.prisma              # 实际 Prisma Schema（非默认路径）
│  └─ .env                          # 后端环境变量
├─ frontend/                        # Vue + SoybeanAdmin 前端
│  ├─ src/views/                    # 页面
│  ├─ src/service/api/               # API 请求定义
│  ├─ src/typings/api/               # API 类型
│  ├─ src/utils/                    # Excel、标签等通用工具
│  ├─ src/router/                   # Elegant Router 路由
│  └─ .env.*                        # 前端环境配置
└─ README.md
```

## 已实现功能

- JWT 登录、刷新 Token、用户信息和系统用户管理
- 物料、单位、物料编码规则管理，支持 Excel 模板、导入和导出
- 模具产品资料：手机型号、颜色、材质、模具编码、模具、产品编码和产品
- ERPNext 映射配置管理及 Item 同步
- ERPNext 同步日志查询与失败重试
- OA 审批查询、审批状态校验和推单相关能力
- 统一 API 响应格式及全局异常处理

## 环境要求

- Docker Engine 24+
- Docker Compose v2+
- 生产环境建议使用 HTTPS 反向代理

## Docker 部署

### 1. 配置环境变量

复制根目录环境变量模板并填写生产配置：

```bash
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
```

至少需要修改 PostgreSQL、`DATABASE_URL`、`JWT_SECRET` 和 `JWT_REFRESH_SECRET`。钉钉 OAuth、ERPNext、OAuth2/OIDC SSO 等功能还需要补充对应的环境变量。

`DATABASE_URL` 在容器内必须使用 PostgreSQL 服务名 `postgres`，例如：

```env
DATABASE_URL=postgresql://eims:strong-password@postgres:5432/eims?schema=public
```

### 2. 构建并启动

```bash
docker compose up -d --build
```

前端默认通过 `APP_PORT` 暴露，访问 `http://localhost:8003`（可在 `.env` 中修改）。后端 API 通过前端 Nginx 的 `/api` 反向代理访问，不需要单独暴露宿主机端口。Docker 环境下 OAuth2/OIDC 的 `OAUTH2_ISSUER` 应配置为浏览器可访问的前端根地址，例如 `http://localhost:8003`，不要追加 `/api`。

### 外部系统入口和 SSO 配置

首页“系统”卡片的地址，以及 ERP OAuth 登录参数，统一配置在：

```text
frontend/public/config/external-systems.json
```

Docker Compose 会把这个目录挂载到前端 Nginx。修改配置后不需要重新构建镜像，执行下面的命令让前端容器重新加载配置即可：

```bash
docker compose restart frontend
```

ERP 配置示例：

```json
{
  "externalSystems": {
    "erp": {
      "url": "https://your-erp.example.com",
      "oauth": {
        "authorizeUrl": "http://your-eims.example.com:8006/oauth/authorize",
        "clientId": "your-client-id",
        "redirectUri": "https://your-erp.example.com/api/method/custom_filters.overrides.oauth.login_via_eims",
        "scope": "openid profile email"
      }
    }
  }
}
```

`clientId` 可以放在前端配置中，`clientSecret` 不要放入前端；OAuth 客户端密钥只应保存在 ERP 或后端服务中。修改已有系统的 URL 或 OAuth 参数只需编辑这个 JSON。若要增加全新的系统卡片，还需要在前端补充卡片名称、图标和国际化文案。

### 3. 执行数据库迁移和种子数据

首次部署或升级数据库结构时执行：

```bash
docker compose run --rm backend npx prisma migrate deploy --schema libs/database/prisma/schema.prisma
docker compose run --rm backend npx ts-node libs/database/prisma/seed.ts
```

Prisma Schema 位于 `backend/libs/database/prisma/schema.prisma`。生产环境只执行 `migrate deploy`，不要使用 `prisma db push`。

### 4. 常用 Docker 命令

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose restart backend
docker compose down
docker compose down -v       # 删除数据库数据卷，请谨慎执行
```

## 默认账号

| 用户名 | 密码 |
| --- | --- |
| `superadmin` | `123456` |

首次运行种子脚本后使用该账号登录。生产环境请立即修改密码和 JWT 密钥。

## 本地开发辅助

项目部署和运行以 Docker Compose 为准。需要调试源码时，可以单独启动依赖服务：

```bash
docker compose up -d postgres
```


## API 约定

成功响应格式：

```json
{ "code": "0000", "msg": "success", "data": {} }
```

- 请求鉴权：`Authorization: Bearer <token>`
- Token 过期：业务码 `9999`
- 强制退出：业务码 `8888`
- 业务冲突（HTTP 409）会返回具体原因，前端统一以警告提示展示
- 密码使用 bcrypt 哈希，接口不会返回 `password`

主要接口前缀：

| 业务 | 前缀 |
| --- | --- |
| 认证 | `/auth` |
| 用户 | `/user` |
| 物料 | `/material`、`/unit`、`/material-code-rule` |
| 模具产品 | `/mold-product/*` |
| OA | `/oa/*` |
| ERPNext 映射 | `/erpnext-mapping` |
| ERPNext 同步日志 | `/erpnext-sync-log` |

## 数据库约定

业务表使用 PostgreSQL schema 隔离，Prisma 模型统一使用 `@@schema()` 和 `@@map()`：

- `public`：系统公共表
- `material`：物料业务表
- `mold`：模具产品业务表
- `oa`：OA 与 ERPNext 相关表

多词字段使用 snake_case 数据库列名，并通过 Prisma `@map()` 映射为 camelCase 字段。

## Excel 能力

前端通用实现位于 `frontend/src/utils/excel-crud.ts`，基础资料页面通常支持：

- 下载导入模板
- 导入 Excel 并逐行反馈结果
- 导出当前筛选结果

批量导入接口目前包括物料、模具和产品等业务模块，具体以对应 Controller 为准。

## ERPNext 集成

ERPNext 相关代码位于 `backend/libs/oa/src/erpnext/`。物料、模具和产品创建后可按配置 best-effort 同步为 ERPNext Item；同步结果写入同步日志表，并可在前端“ERPNext 同步日志”页面查看和重试失败记录。

相关配置：

```env
ERPNEXT_AUTH_TOKEN=your-erpnext-token
ERPNEXT_ITEM_API_URL=http://deeplinkerp.com/api/resource/Item
```

## 开发规范

- 后端业务按 `backend/libs/<module>` 拆分，并通过 `@eims/<module>` 路径别名引用
- 前端页面放在 `frontend/src/views/`，API 定义放在 `frontend/src/service/api/`
- API 类型集中放在 `frontend/src/typings/api/`
- 数据库结构变更必须通过 Prisma migration 管理，不要使用 `prisma db push` 替代正式迁移
- 不提交真实数据库密码、JWT 密钥、ERPNext Token 或钉钉密钥

## 许可证

本项目为企业内部应用，具体使用和分发权限以项目所有者规定为准。
