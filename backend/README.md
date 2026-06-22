# YW-EIMS 后端

NestJS + Prisma + PostgreSQL 构建的企业信息管理系统后端。采用 monorepo 结构，业务模块按 `libs/<module>` 组织，由 `apps/api` 统一暴露 HTTP 接口。

> 完整项目说明见根目录 [README.md](../README.md)。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | NestJS 11 |
| 语言 | TypeScript 5 |
| ORM | Prisma 6 |
| 数据库 | PostgreSQL |
| 认证 | JWT + bcrypt |
| 包管理 | pnpm workspace |

---

## 项目结构

```
backend/
├── apps/
│   └── api/                  # 主应用入口
├── libs/
│   ├── common/               # 响应拦截器、异常过滤、分页 DTO、公共装饰器
│   ├── config/               # 环境配置与校验
│   ├── database/             # Prisma 客户端与数据库访问
│   ├── auth/                 # JWT 认证模块
│   ├── user/                 # 系统用户管理模块
│   └── material/             # 物料管理模块（新增）
├── libs/database/prisma/     # Prisma schema、迁移、种子脚本
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### 模块说明

| 模块 | 路径 | 职责 |
|------|------|------|
| common | `libs/common` | 统一响应格式、全局异常处理、分页 DTO、Public 装饰器 |
| config | `libs/config` | `.env` 加载与校验 |
| database | `libs/database` | PrismaService、PrismaModule（Global） |
| auth | `libs/auth` | 登录、Token 刷新、JWT Guard |
| user | `libs/user` | 系统用户增删改查 |
| material | `libs/material` | 物料主数据、单位、编码规则管理 |

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

### 2. 配置环境变量

复制 `backend/.env.example` 为 `backend/.env`（或按项目已有 `.env` 填写）：

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

### 4. 启动服务

```bash
# 开发模式（热重载）
pnpm start:dev

# 生产模式
pnpm build
pnpm start:prod
```

后端运行在 http://localhost:3000。

---

## 常用命令

```bash
pnpm build              # 构建生产包
pnpm start:dev          # 开发模式启动
pnpm lint               # ESLint 检查并自动修复
pnpm test               # 运行所有单元测试
pnpm test:watch         # 监听模式运行测试
pnpm test:cov           # 生成测试覆盖率报告
pnpm prisma:generate    # 生成 Prisma Client
pnpm prisma:validate    # 校验 Prisma schema
pnpm prisma:migrate     # 执行数据库迁移
pnpm prisma:seed        # 初始化种子数据（可重复执行）
pnpm prisma:studio      # 打开 Prisma Studio
```

---

## 数据库架构

### 多 Schema 隔离

为了隔离不同业务模块的数据库表，项目启用 Prisma `multiSchema` preview feature，当前包含两个 schema：

| Schema | 说明 | 包含表 |
|--------|------|--------|
| `public` | 系统公共表 | `system_user` |
| `material` | 物料管理模块 | `materials`、`units`、`material_code_rules` |

Schema 定义见 `libs/database/prisma/schema.prisma`。

### 核心模型

| 模型 | Schema | 表名 | 说明 |
|------|--------|------|------|
| `User` | public | `system_user` | 系统用户 |
| `Material` | material | `materials` | 物料申请主数据 |
| `Unit` | material | `units` | 单位编码与名称映射 |
| `MaterialCodeRule` | material | `material_code_rules` | 编码前缀字典 |

### 种子数据

`libs/database/prisma/seed.ts` 会幂等地写入：

- 1 个默认系统用户 `superadmin`
- 32 个常用单位（`01` ~ `32`）
- 19 条编码前缀规则

运行 `pnpm prisma:seed` 多次不会重复插入数据。

---

## 物料管理模块

### 设计说明

物料管理模块（`libs/material`）完全独立于 `public` schema 中的系统用户表，使用 `material` schema 存储三类数据：

- **物料主数据**（`materials`）：记录申请人、物料名称、规格、编码、单位等。
- **单位表**（`units`）：维护单位编码（如 `01`）与单位名称（如 `kg`）的映射。
- **编码规则表**（`material_code_rules`）：维护字母前缀（如 `YL`、`MT`）与含义说明。

物料编码中的前缀（如 `YL000001` 中的 `YL`）会自动解析，并回写 `codePrefix` 与 `explainContent`；单位名称也会自动解析为 `unitCode`。

### API 接口

#### 物料主数据 `/material`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/material/page` | 分页查询物料列表 |
| GET | `/material/:id` | 根据 ID 查询物料 |
| POST | `/material` | 创建物料 |
| PUT | `/material/:id` | 更新物料 |
| DELETE | `/material/:id` | 删除物料 |

#### 单位 `/unit`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/unit/page` | 分页查询单位列表 |
| GET | `/unit/:unitCode` | 根据编码查询单位 |
| POST | `/unit` | 创建单位 |
| PUT | `/unit/:unitCode` | 更新单位 |
| DELETE | `/unit/:unitCode` | 删除单位（被物料引用时禁止删除） |

#### 编码规则 `/material-code-rule`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/material-code-rule/page` | 分页查询编码规则 |
| GET | `/material-code-rule/:codePrefix` | 根据前缀查询规则 |
| POST | `/material-code-rule` | 创建编码规则 |
| PUT | `/material-code-rule/:codePrefix` | 更新编码规则（级联更新物料 explainContent） |
| DELETE | `/material-code-rule/:codePrefix` | 删除编码规则（级联清空物料 explainContent） |

所有接口均需要 JWT 认证，请在请求头中携带：

```
Authorization: Bearer <token>
```

---

## 响应约定

- 成功响应：

```json
{
  "code": "0000",
  "msg": "success",
  "data": { ... }
}
```

- Token 过期：`401 Unauthorized`，msg 为 `token expired or invalid`
- 通用错误：HTTP 状态码 + 统一响应体

---

## 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| superadmin | 123456 | R_SUPER（超级管理员） |

---

## 本地冒烟测试

启动服务后，可按以下步骤验证核心链路（PowerShell 示例）：

```powershell
# 1. 登录获取 token
$login = curl -s -X POST http://localhost:3000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"userName":"superadmin","password":"123456"}'
$token = ($login | ConvertFrom-Json).data.token

# 2. 查询用户信息（S3 回归）
curl -s http://localhost:3000/auth/getUserInfo -H "Authorization: Bearer $token"

# 3. 查询单位列表（S1 happy path）
curl -s http://localhost:3000/unit/page -H "Authorization: Bearer $token"

# 4. 查询编码规则列表
curl -s http://localhost:3000/material-code-rule/page -H "Authorization: Bearer $token"

# 5. 创建物料
curl -s -X POST http://localhost:3000/material -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"applicant":"smoke","materialName":"测试物料","code":"YL000001","unit":"kg"}'

# 6. 查询物料分页
curl -s http://localhost:3000/material/page -H "Authorization: Bearer $token"

# 7. 重复执行种子脚本验证幂等性（S2）
pnpm prisma:seed
pnpm prisma:seed
```

验证要点：

- 登录成功并返回 `token`。
- `/unit/page` 返回 `total = 32`。
- `/material-code-rule/page` 返回 `total = 19`。
- 创建物料时，`codePrefix` 自动解析为 `YL`，`explainContent` 自动解析为 `Materia prima原料`，`unitCode` 自动解析为 `01`。
- 重复执行 `pnpm prisma:seed` 后单位与规则数量不变。
- 未携带 Token 或 Token 无效时返回 `401`。

