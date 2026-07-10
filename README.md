# YW-EIMS 企业信息管理系统

YW-EIMS（Enterprise Information Management System）是一个基于 **NestJS + SoybeanAdmin** 构建的企业信息管理平台，采用前后端分离架构。

> 重构自 [EIMS-System](https://github.com/yueweiit/EIMS-System)

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | NestJS 11、TypeScript、Prisma、PostgreSQL、JWT |
| 前端 | Vue 3、Vite 8、TypeScript、NaiveUI、Pinia、UnoCSS |
| 包管理 | pnpm（前后端均使用 pnpm workspace） |

---

## 项目结构

```
YW-EIMS/
├── backend/                 # NestJS 后端（monorepo）
│   ├── apps/
│   │   └── api/             # 主应用入口
│   ├── libs/
│   │   ├── common/          # 响应拦截器、异常过滤、分页 DTO、公共装饰器
│   │   ├── config/          # 环境配置与校验
│   │   ├── database/        # Prisma + 数据库访问
│   │   ├── auth/            # JWT 认证模块
│   │   ├── user/            # 用户管理模块
│   │   ├── material/        # 物料管理模块（物料、单位、编码规则）
│   │   ├── mold-product/    # 模具产品模块（手机型号、颜色、材质、模具、产品等）
│   │   └── oa/              # OA、ERPNext 同步与映射配置
│   ├── libs/database/prisma/schema.prisma # 数据模型定义
│   └── .env                 # 后端环境变量
├── frontend/                # SoybeanAdmin 前端
│   ├── src/
│   │   ├── service/api/     # API 接口定义
│   │   ├── typings/api/     # API 类型定义
│   │   ├── utils/           # 通用工具（Excel 导入/导出等）
│   │   ├── views/           # 页面视图
│   │   └── locales/         # 国际化
│   └── .env.test            # 前端环境变量（开发模式）
└── qa-user-management.png   # 用户管理页面验证截图
```

---

## 功能模块

### 已实现

- [x] NestJS monorepo 架构搭建
- [x] 前后端连通（Vite dev proxy）
- [x] 统一响应格式 `{ code, msg, data }`
- [x] JWT 认证（登录 / 获取用户信息 / 刷新 Token）
- [x] 系统用户管理（增删改查、分页、搜索）
- [x] 物料管理（物料、单位、编码规则，支持 Excel 导入 / 导出 / 下载模板）
- [x] 小工具：外箱标签（PDF 生成，支持 Excel 导入标签数据）
- [x] 模具产品（手机型号、颜色、材质、模具编码、模具、产品编码、产品、ERPNext 映射配置）
- [x] 物料、模具、产品创建后自动同步 ERPNext（best-effort，不阻塞主业务）
- [x] ERPNext 映射配置管理（列表、搜索、新增、编辑、删除，变更后自动刷新后端缓存）
- [x] 基础资料 Excel 能力（单位、编码规则、手机型号、颜色、材质、模具编码、产品编码、ERPNext 映射配置）

### 后续规划

- [ ] OA 审批推单增强
- [ ] ERPNext 同步结果可视化与重试队列

---

## 快速开始

### 环境要求

- Node.js >= 20.19.0
- pnpm >= 10.5.0
- PostgreSQL（本地或远程）

### 1. 创建数据库

```sql
CREATE DATABASE eims;
```

### 2. 配置后端环境变量

编辑 `backend/.env`：

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/eims?schema=public
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# DingTalk / OA（按需配置）
DINGTALK_CLIENT_ID=your-dingtalk-client-id
DINGTALK_CLIENT_SECRET=your-dingtalk-client-secret
DINGTALK_APP_KEY=your-dingtalk-app-key
DINGTALK_APP_SECRET=your-dingtalk-app-secret
DINGTALK_OA_DB_URL=postgresql://postgres:postgres@localhost:5432/dingtalk_oa

# ERPNext（按需配置；未配置 token 时会跳过远端创建）
ERPNEXT_AUTH_TOKEN=your-erpnext-token
ERPNEXT_ITEM_API_URL=http://deeplinkerp.com/api/resource/Item
```

### 3. 安装依赖并初始化数据库

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

> Prisma schema 位于 `backend/libs/database/prisma/schema.prisma`。如果手动执行 Prisma 命令，请带上 `--schema libs/database/prisma/schema.prisma`。
>
> 部署或已有迁移只需执行：`pnpm prisma migrate deploy --schema libs/database/prisma/schema.prisma`。ERPNext 映射配置依赖 `oa.erp_next_mappings` 表，缺少迁移会导致后端启动时报 `P2021`。

### 4. 启动后端

```bash
cd backend
pnpm start:dev
```

后端运行在 http://localhost:3000

### 5. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端运行在 http://localhost:9527

---

## 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| superadmin | 123456 | R_SUPER（超级管理员） |

---

## 常用命令

### 后端

```bash
cd backend
pnpm build              # 构建
pnpm start:dev          # 开发模式启动
pnpm prisma:migrate     # 执行数据库迁移
pnpm prisma:generate    # 生成 Prisma Client
pnpm prisma:validate    # 校验 Prisma schema
pnpm prisma:seed        # 初始化种子数据
pnpm prisma:studio      # 打开 Prisma Studio
```

### 前端

```bash
cd frontend
pnpm dev                # 开发模式启动
pnpm build              # 生产构建
pnpm build:test         # 测试环境构建
pnpm typecheck          # TypeScript 类型检查
pnpm gen-route          # 重新生成 Elegant Router 路由
```

---

## API 约定

- 成功响应：`{ "code": "0000", "msg": "success", "data": ... }`
- 认证头：`Authorization: Bearer <token>`
- Token 过期 code：`9999`
- 强制登出 code：`8888`

### 主要业务接口

- 物料管理：`/material`、`/unit`、`/material-code-rule`
- 模具产品：`/mold-product/phone-models`、`/mold-product/colors`、`/mold-product/mold-materials`、`/mold-product/mold-codes`、`/mold-product/molds`、`/mold-product/product-codes`、`/mold-product/products`
- ERPNext 映射配置：`GET/POST/PUT/DELETE /erpnext-mapping/...`

---

## Excel 导入 / 导出

前端基础资料页统一支持：

- `导入 Excel`
- `下载模板`
- `导出 Excel`

通用实现位于 `frontend/src/utils/excel-crud.ts`。页面通过字段配置生成模板、解析导入文件、导出当前筛选结果。导入目前复用各模块已有新增接口逐条创建，失败行会给出成功 / 失败数量提示。

已有专用批量导入接口的模块：

- 物料主数据：`POST /material/import`
- 模具管理：`POST /mold-product/molds/import`
- 产品管理：`POST /mold-product/products/import`

---

## ERPNext 同步

ERPNext 同步逻辑位于 `backend/libs/oa/src/erpnext/`，映射配置 CRUD 位于 `backend/libs/oa/src/erpnext-mapping/`。

- 后端启动时会加载 `oa.erp_next_mappings`，日志形如：`已加载 XX 条 ERPNext 映射配置`
- 物料、模具、产品创建后会 best-effort 调用 ERPNext Item API
- `ERPNEXT_AUTH_TOKEN` 未配置时，同步会跳过远端创建并返回提示，不影响本地业务保存
- 修改 `/erpnext-mapping` 配置后会自动刷新后端映射缓存

前端页面路径：`模具产品 -> ERPNext映射配置`（`/mold-product/erpnext-mapping`）

---

## 开发规范

- 后端采用 NestJS monorepo 模式，业务模块按 `libs/<module>` 组织
- 前端路由通过 `src/views/` 目录结构自动生成（Elegant Router）
- 所有 API 类型定义在 `frontend/src/typings/api/` 下
- 用户密码使用 bcrypt 哈希存储，接口响应中不返回 password 字段
- 数据库多 schema 使用 Prisma `@@schema()`，迁移文件位于 `backend/libs/database/prisma/migrations/`
