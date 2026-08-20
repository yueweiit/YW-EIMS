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
| 部署方式 | Docker Compose |

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

## Docker 部署

后端由根目录 `docker-compose.yml` 构建和启动，通常不需要在宿主机安装 Node.js 或 PostgreSQL。

```bash
cd ..
docker compose up -d --build
docker compose run --rm backend npx prisma migrate deploy --schema libs/database/prisma/schema.prisma
docker compose run --rm backend npx ts-node libs/database/prisma/seed.ts
```

查看后端日志：

```bash
docker compose logs -f backend
```

后端容器内部监听 `3000`，生产环境通过前端 Nginx 或外部反向代理提供访问。

---

## 常用 Docker 命令

```bash
docker compose build backend
docker compose up -d backend
docker compose restart backend
docker compose exec backend npx prisma migrate status --schema libs/database/prisma/schema.prisma
docker compose logs -f backend
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

运行容器内的 seed 命令多次不会重复插入数据。

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

启动 Docker Compose 后，可按以下步骤验证核心链路（PowerShell 示例）。接口通过前端 Nginx 的 `/api` 代理访问：

```powershell
# 1. 登录获取 token
$login = curl -s -X POST http://localhost:8003/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"userName":"superadmin","password":"123456"}'
$token = ($login | ConvertFrom-Json).data.token

# 2. 查询用户信息（S3 回归）
curl -s http://localhost:8003/api/auth/getUserInfo -H "Authorization: Bearer $token"

# 3. 查询单位列表（S1 happy path）
curl -s http://localhost:8003/api/unit/page -H "Authorization: Bearer $token"

# 4. 查询编码规则列表
curl -s http://localhost:8003/api/material-code-rule/page -H "Authorization: Bearer $token"

# 5. 创建物料
curl -s -X POST http://localhost:8003/api/material -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"applicant":"smoke","materialName":"测试物料","code":"YL000001","unit":"kg"}'

# 6. 查询物料分页
curl -s http://localhost:8003/api/material/page -H "Authorization: Bearer $token"

# 7. 重复执行种子脚本验证幂等性（S2）
docker compose run --rm backend npx ts-node libs/database/prisma/seed.ts
docker compose run --rm backend npx ts-node libs/database/prisma/seed.ts
```

验证要点：

- 登录成功并返回 `token`。
- `/unit/page` 返回 `total = 32`。
- `/material-code-rule/page` 返回 `total = 19`。
- 创建物料时，`codePrefix` 自动解析为 `YL`，`explainContent` 自动解析为 `Materia prima原料`，`unitCode` 自动解析为 `01`。
- 重复执行 seed 命令后单位与规则数量不变。
- 未携带 Token 或 Token 无效时返回 `401`。

