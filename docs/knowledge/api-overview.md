# API 总体设计

## 路径和协议

后端使用 Nest Controller REST 风格路由，无统一版本号前缀。内部 `/material` 等路径在浏览器通过 `/api/material` 访问；Nginx 去除 `/api/` 前缀。OAuth 标准端点另以根 `/oauth/` 代理。依据：[main.ts](../../backend/apps/api/src/main.ts)、[nginx.conf](../../frontend/nginx.conf)。

普通成功结果由 [TransformInterceptor](../../backend/libs/common/src/interceptors/transform.interceptor.ts) 包装为：

```json
{ "code": "0000", "msg": "success", "data": {} }
```

分页常用 `current`、`size`，结果 `data={records,total,current,size}`。[PaginationDto](../../backend/libs/common/src/dto/pagination.dto.ts) 默认 1／10，size 上限 100；有些 Controller 自行转换参数，不应声称所有接口都复用了该 DTO。POST 未指定 HttpCode 时使用框架默认状态；业务成功码与 HTTP 状态分别处理。

## 模块入口

下表写后端内部前缀，具体方法、参数和权限见模块，字段详情直接读取 DTO 和前端 API 类型。

| 前缀 | Controller 来源 | 主要调用方／说明 |
| --- | --- | --- |
| `/auth` | [auth.controller.ts](../../backend/libs/auth/src/auth.controller.ts) | 登录页、Pinia auth；本地登录、刷新、登出、用户信息、钉钉回调／票据交换 |
| `/user` | [user.controller.ts](../../backend/libs/user/src/user.controller.ts) | 用户管理 |
| `/roles`、`/permissions` | [roles](../../backend/libs/roles/src) | 角色、功能目录、系统和功能授权 |
| `/material`、`/unit`、`/material-code-rule` | [material](../../backend/libs/material/src) | 物料、单位、规则；[模块接口](../modules/material/README.md) |
| `/mold-product/*` | [mold-product](../../backend/libs/mold-product/src) | 七类基础资料与导入；[模块接口](../modules/mold-product/README.md) |
| `/oa/approval`、`/oa/search` | [oa](../../backend/libs/oa/src) | 审批详情、推单、资料匹配 |
| `/erpnext-mapping`、`/erpnext-sync-log` | [oa](../../backend/libs/oa/src) | 映射 CRUD、同步记录与重试 |
| `/oauth` | [oauth2.controller.ts](../../backend/libs/oauth2-provider/src/oauth2.controller.ts) | 外部系统授权／令牌接口、浏览器授权确认 |
| `/oauth2/clients`、`/oauth2/bindings` | [oauth2-provider](../../backend/libs/oauth2-provider/src) | 客户端和账号映射管理 |
| `/portal`、`/portal/admin/systems` | [portal](../../backend/libs/portal/src) | 首页系统、权限摘要、启动及管理员目录 |
| `/audit/security` | [audit.controller.ts](../../backend/libs/audit/src/audit.controller.ts) | 安全日志分页 |
| `/` | [app.controller.ts](../../backend/apps/api/src/app.controller.ts) | 受默认认证保护的 Hello World；不是独立数据库健康检查 |

前端调用集中在 [service/api](../../frontend/src/service/api)，[typings/api](../../frontend/src/typings/api) 维护响应类型。未发现运行入口注册 Swagger／OpenAPI，接口定义以 Controller、DTO、Service 和前端调用为准，不假设存在 `/api-docs`。

## 认证、权限与错误

- 普通受保护接口用 EIMS Cookie／兼容 Bearer；写请求携带 Cookie 时校验 CSRF。`@Public()` 只跳过 JWT 守卫，不意味着没有协议校验或 CSRF 限制。
- `PermissionGuard` + `@RequirePermission` 从数据库计算权限；用户、角色、权限、客户端、绑定、门户管理、安全审计等管理入口还使用 AdminGuard。方法权限覆盖类级权限，不能误解为自动要求两者同时满足。
- [异常过滤器](../../backend/libs/common/src/filters/all-exception.filter.ts)：401→`9999`，403→`8888`，400→`1001`，其他默认 `1000`，保留 HTTP 状态，`data:null`。403 也用于功能权限拒绝／CSRF，不仅是强制登出。
- [前端 request](../../frontend/src/service/request/index.ts) 读取环境中的错误码策略，401 类业务码可触发共享刷新 Promise；409 展示警告。不能把 HTTP 2xx 直接视为业务同步成功，OA 推单还可能返回 `data.code=error`。
- OAuth token、userinfo、revoke 等协议响应绕过普通包装，失败返回 `error`／`error_description`，不得用普通 request 的 `response.data.data` 解析。详见[OAuth2 模块](../modules/oauth2/README.md)。

## 校验与兼容性

全局 ValidationPipe 为 `whitelist:true, transform:true`；接口中的 TypeScript interface／内联对象／普通数组类型不具备等同 class DTO 的运行时逐字段验证。例如物料 `import-existing` 和 OA `sync-erp` 需要单独评估，见[可靠性](reliability.md)。

新 API 应用 camelCase 字段与稳定状态码；历史 OA 接口使用 `oa_code`、`modal_data`、`oa_details` 和中文表单键，属于既有契约，不能在局部任务中直接更名。修改公共响应、错误码、导入格式或身份字段必须同时核对全部调用方及外部客户端。
