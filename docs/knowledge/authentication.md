# 身份认证与权限

## 三条身份链路

| 链路 | 当前机制 | 代码依据 |
| --- | --- | --- |
| EIMS 账号密码 | bcrypt 比对，签发访问 JWT、随机刷新令牌；控制器写 Cookie，只返回 authenticated | [AuthController](../../backend/libs/auth/src/auth.controller.ts)、[AuthService](../../backend/libs/auth/src/auth.service.ts) |
| 钉钉网页登录 | OAuth state 校验和一次性消费；unionId 查已绑定 EIMS 用户；回调先生成短期票据，再交换 Cookie | [DingTalkOAuthService](../../backend/libs/auth/src/dingtalk-oauth.service.ts) |
| 外部系统 SSO | EIMS 为 OAuth2／OIDC Provider；授权码 + 客户端身份 + PKCE；RS256、JWKS、可撤销令牌 | [OAuth2 模块](../modules/oauth2/README.md) |

`eims_access`、`eims_refresh` 为 HttpOnly、SameSite=Lax；`eims_csrf` 可由 JS 读取并写入 `X-CSRF-Token`。Secure 由 `AUTH_COOKIE_SECURE` 控制，production 启动必须为 true。见 [auth-cookies.ts](../../backend/libs/auth/src/auth-cookies.ts)、[CsrfGuard](../../backend/libs/auth/src/guards/csrf.guard.ts)。

## 会话有效性

[JwtAuthGuard](../../backend/libs/auth/src/guards/jwt-auth.guard.ts) 优先读取 Bearer，否则读取访问 Cookie；除验证签名，还核对 accessTokenHash 对应会话、撤销／过期状态、用户启用状态和 sessionVersion。EIMS JWT 与外部 OAuth access token 的用途不同，不能混用。

每次账号密码登录／钉钉票据登录通过事务递增用户会话版本并撤销旧 EIMS 会话，再生成新令牌。刷新使用条件 updateMany 争抢旧令牌并轮换，检测重用时撤销令牌族。密码变更调用 revokeAllSessions；用户停用由后续请求的动态用户状态检查拒绝。版本事务、令牌生成以及密码更新并非全部处在同一事务，失败和并发仍需实际验证。

普通 `/auth/logout` 撤销提交的刷新／访问 Cookie 对应 EIMS 会话；OIDC `/oauth/logout` 的撤销范围另见模块。任何一方都不能直接清除外部业务系统域名下的会话。

## 权限模型

- User.roles 存编码数组，RoleService 只认启用 SystemRole；角色通过 SystemRolePermission 关联启用 SystemPermission。R_SUPER 得到 `*`。
- AdminGuard 重新查询启用角色，只接受 R_SUPER 或 R_ADMIN；PermissionGuard 查具体功能权限。拥有菜单不自动拥有新增／更新／删除权限。
- RequirePermission 使用 `getAllAndOverride`，方法注解覆盖类注解；没有注解时守卫放行。因此新敏感接口必须明确声明权限。
- 前端按 route.meta.roles／permission 裁剪路由、菜单，按钮调用公共权限 Hook；这不代替服务端控制。
- 门户 allowedRoles 是 EIMS 入口权限；OAuth 绑定映射外部账号；外部系统的角色、菜单、数据范围由外部系统负责。
- 当前没有按用户／组织进行通用行级租户过滤。功能权限与租户／数据权限不同，新增隔离需求需先设计，不能假定现有查询已隔离。

依据：[RoleService](../../backend/libs/roles/src/role.service.ts)、[AdminGuard](../../backend/libs/auth/src/guards/admin.guard.ts)、[PermissionGuard](../../backend/libs/roles/src/guards/permission.guard.ts)、[前端路由过滤](../../frontend/src/store/modules/route/shared.ts)。

## 其他安全机制与边界

生产 URL／CORS 检查和单跳代理信任在 [main.ts](../../backend/apps/api/src/main.ts)；认证特定端点的 IP 限流在 [RateLimitGuard](../../backend/libs/auth/src/guards/rate-limit.guard.ts)，采用 PostgreSQL 原子 UPSERT 桶，不是所有业务接口限流。登录每分钟 10 次，刷新、OAuth 发起／确认／token 每分钟 30 次，具体规则以 getRule 为准。

[安全审计](../modules/identity/README.md) 不保存请求体和认证凭据；写日志失败会记录错误但不回滚登录。仅能说明已有安全机制，不能据此宣称完整安全审计或生产认证验收通过。
