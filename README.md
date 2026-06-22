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
│   │   └── user/            # 用户管理模块
│   ├── prisma/schema.prisma # 数据模型定义
│   └── .env                 # 后端环境变量
├── frontend/                # SoybeanAdmin 前端
│   ├── src/
│   │   ├── service/api/     # API 接口定义
│   │   ├── typings/api/     # API 类型定义
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

### 后续规划

- [x] 物料管理
- [ ] 模具产品
- [ ] 外箱标签
- [ ] OA 审批推单

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
```

### 3. 安装依赖并初始化数据库

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

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
pnpm prisma:seed        # 初始化种子数据
pnpm prisma:studio      # 打开 Prisma Studio
```

### 前端

```bash
cd frontend
pnpm dev                # 开发模式启动
pnpm build              # 生产构建
pnpm typecheck          # TypeScript 类型检查
pnpm gen-route          # 重新生成 Elegant Router 路由
```

---

## API 约定

- 成功响应：`{ "code": "0000", "msg": "success", "data": ... }`
- 认证头：`Authorization: Bearer <token>`
- Token 过期 code：`9999`
- 强制登出 code：`8888`

---

## 开发规范

- 后端采用 NestJS monorepo 模式，业务模块按 `libs/<module>` 组织
- 前端路由通过 `src/views/` 目录结构自动生成（Elegant Router）
- 所有 API 类型定义在 `frontend/src/typings/api/` 下
- 用户密码使用 bcrypt 哈希存储，接口响应中不返回 password 字段
