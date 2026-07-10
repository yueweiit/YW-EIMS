# YW-EIMS

YW-EIMS（Enterprise Information Management System）是一个前后端分离的企业信息管理系统，面向基础资料、模具/产品管理、OA 审批和 ERPNext 集成等业务场景。

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 后端 | NestJS 11、TypeScript、Prisma 6、PostgreSQL、JWT |
| 前端 | Vue 3、Vite 8、TypeScript、Naive UI、Pinia、UnoCSS |
| 包管理 | pnpm |
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

- Node.js >= 20.19.0
- pnpm >= 10.5.0
- PostgreSQL 14+（本地或远程实例）

## 快速启动

### 1. 配置数据库

创建业务数据库，例如：

```sql
CREATE DATABASE eims;
```

复制并编辑后端配置：

```bash
cd backend
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
```

至少需要配置 `DATABASE_URL`、JWT 密钥。ERPNext 和钉钉相关变量按实际集成需求配置；未配置 ERPNext Token 时，远程同步会跳过，不影响本地业务保存。

### 2. 安装后端依赖并初始化数据库

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:validate
pnpm prisma:migrate
pnpm prisma:seed
```

Prisma Schema 位于 `backend/libs/database/prisma/schema.prisma`，手动执行 Prisma 命令时必须添加：

```bash
--schema libs/database/prisma/schema.prisma
```

### 3. 启动后端

```bash
cd backend
pnpm start:dev
```

API 默认地址为 `http://localhost:3000`。

### 4. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认地址为 `http://localhost:9527`，开发环境通过 Vite 代理访问后端 `/api`。

## 默认账号

| 用户名 | 密码 |
| --- | --- |
| `superadmin` | `123456` |

首次运行种子脚本后使用该账号登录。生产环境请立即修改密码和 JWT 密钥。

## 常用命令

### 后端

```bash
cd backend
pnpm start:dev          # 开发模式
pnpm build              # 构建
pnpm lint               # ESLint 修复
pnpm test               # 单元测试
pnpm prisma:generate   # 生成 Prisma Client
pnpm prisma:validate   # 校验 Schema
pnpm prisma:migrate    # 创建并应用迁移
pnpm prisma:seed       # 初始化/补充种子数据
pnpm prisma:studio     # 打开 Prisma Studio
```

### 前端

```bash
cd frontend
pnpm dev                # 开发模式
pnpm build              # 生产构建
pnpm build:test         # 测试环境构建
pnpm typecheck          # TypeScript 类型检查
pnpm lint               # Oxlint + ESLint 修复
pnpm gen-route          # 生成路由
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
