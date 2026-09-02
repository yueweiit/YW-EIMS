# EIMS OAuth2 SSO 接入文档

> 接入双方的改造项、交付资料、字段字典和验收清单请先阅读 [EIMS SSO 外部系统接入实施与交付规范](eims-sso-integration-guide.md)。本文主要作为 OAuth2/OIDC 接口参考。

## 一、概述

EIMS 提供标准 OAuth 2.0 + OIDC 单点登录服务。第三方系统（ERP、HR、CRM 等）接入后，用户只需登录 EIMS 即可免登访问所有已接入的系统。

### 接入前提

- 在 EIMS 后台「OAuth2 应用管理」中注册你的应用，获取 `client_id` 和 `client_secret`
- 在 EIMS 后台「OAuth2 账号绑定」中建立 EIMS 用户与你系统用户的绑定关系

---

## 二、OAuth2 端点一览

| 端点 | 地址 | 说明 |
|------|------|------|
| 授权端点 | `GET /oauth/authorize` | 用户登录 + 授权 |
| 授权事务信息 | `GET /oauth/authorize/transaction` | EIMS 授权页读取已校验的授权信息（需 EIMS 登录） |
| Token 端点 | `POST /oauth/token` | 用 code 换 token |
| 用户信息端点 | `GET /oauth/userinfo` | 获取当前用户信息 |
| 单点退出端点 | `GET /oauth/logout` | 清理 EIMS 会话并撤销相关刷新令牌 |
| OIDC 发现 | `GET /oauth/.well-known/openid-configuration` | 自动发现配置 |
| JWKS | `GET /oauth/jwks` | 公钥，用于验证 JWT |

> 基础地址示例：`https://eims.example.com`

---

## 三、接入流程

### 3.1 整体时序图

```
用户                  ERP 系统                    EIMS (SSO)
 │                      │                            │
 │  1. 访问 ERP         │                            │
 ├─────────────────────>│                            │
 │                      │                            │
 │                      │  2. 发现未登录，跳转 EIMS    │
 │                      ├───────────────────────────>│
 │                      │     GET /oauth/authorize   │
 │                      │     ?client_id=erp         │
 │                      │     &redirect_uri=回调地址   │
 │                      │     &response_type=code    │
 │                      │     &scope=openid profile  │
 │                      │     &state=random123       │
 │                      │     &code_challenge=...    │
 │                      │     &code_challenge_method=S256 │
 │                      │                            │
 │  3. 用户登录 + 授权   │                            │
 ├──────────────────────────────────────────────────>│
 │                      │                            │
 │                      │  4. EIMS 回调 ERP，带 code  │
 │                      │<───────────────────────────┤
 │                      │     302 → 回调地址?code=xxx  │
 │                      │     &state=random123       │
 │                      │                            │
 │                      │  5. 用 code 换 token        │
 │                      ├───────────────────────────>│
 │                      │     POST /oauth/token      │
 │                      │                            │
 │                      │  6. 返回 access_token       │
 │                      │<───────────────────────────┤
 │                      │                            │
 │                      │  7. 获取用户信息             │
 │                      ├───────────────────────────>│
 │                      │     GET /oauth/userinfo    │
 │                      │     Authorization: Bearer  │
 │                      │                            │
 │                      │  8. 返回 sso_user_id        │
 │                      │<───────────────────────────┤
 │                      │                            │
 │                      │  9. 查绑定表，找到本地用户    │
 │                      │  10. 用本地用户登录 ERP      │
 │  登录成功             │                            │
 │<─────────────────────┤                            │
```

### 3.2 详细步骤

#### 步骤 1：跳转到 EIMS 授权页

当你的系统发现用户未登录时，将浏览器重定向到：

```
GET https://eims.example.com/oauth/authorize
  ?client_id={你的client_id}
  &redirect_uri={你的回调地址}
  &response_type=code
  &scope=openid profile
  &state={随机字符串，必填，用于防CSRF}
  &code_challenge={PKCE challenge，必填}
  &code_challenge_method=S256
  &nonce={OIDC 随机字符串，可选，建议传入}
```

**参数说明：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `client_id` | 是 | EIMS 分配给你的应用 ID |
| `redirect_uri` | 是 | 必须与 EIMS 后台注册的回调地址完全一致 |
| `response_type` | 是 | 固定填 `code` |
| `scope` | 是 | `openid` 必填，`profile` 返回用户名姓名，`email` 返回邮箱，空格分隔 |
| `state` | 是 | 随机字符串，回调时原样返回，用于防 CSRF |
| `code_challenge` | 是 | PKCE challenge，必须是 S256 |
| `code_challenge_method` | 是 | 固定填 `S256` |
| `nonce` | 否 | OIDC 随机字符串；传入后会原样写入 ID Token，客户端应校验 |

EIMS 会先校验上述参数，并将完整请求保存在短期服务端事务中。浏览器授权页只接收随机 `transaction_id`，不能通过修改地址栏替换 `redirect_uri`、scope、state 或 PKCE 参数。

新建的 OAuth2 应用默认强制使用 PKCE。为兼容已经上线且只能在服务端保存 `client_secret` 的旧 ERP 客户端，管理员可以在“OAuth2 应用管理”中关闭该应用的“强制使用 PKCE”；这只允许该客户端省略 PKCE，不会放宽已提交 PKCE 请求的校验。新系统仍应按上面的标准流程实现 PKCE。

#### 步骤 2：处理回调

用户在 EIMS 登录并授权后，EIMS 会将浏览器重定向回你的回调地址：

```
GET {你的回调地址}?code={授权码}&state={你之前传的state}
```

**你需要做的：**
1. 验证 `state` 是否与你之前生成的一致
2. 提取 `code` 参数
3. 用 `code` 去换 token（下一步）

#### 步骤 3：用 code 换取 Token

```
POST https://eims.example.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={上一步获取的code}
&redirect_uri={你的回调地址}
&client_id={你的client_id}
&client_secret={你的client_secret}
```

**成功响应：**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "id_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**错误响应：**

```json
{
  "statusCode": 401,
  "message": "invalid_grant: authorization code is invalid or expired"
}
```

#### 步骤 4：获取用户信息

```
GET https://eims.example.com/oauth/userinfo
Authorization: Bearer {access_token}
```

**响应：**

```json
{
  "sub": "1001",
  "name": "张三",
  "preferred_username": "zhangsan"
}
```

| 字段 | 说明 |
|------|------|
| `sub` | **EIMS 统一用户 ID**（最重要，用这个查绑定关系） |
| `name` | 用户姓名 |
| `preferred_username` | 登录用户名 |
| `email` | 邮箱（需要 scope 包含 email） |

#### 步骤 5：查找绑定关系，登录本地用户

`/oauth/userinfo` 会自动返回绑定信息（如果已绑定），无需额外调用：

```json
{
  "sub": "1001",
  "name": "张三",
  "preferred_username": "zhangsan",
  "app_user_id": "8888",
  "app_username": "zhangsan"
}
```

| 字段 | 说明 |
|------|------|
| `app_user_id` | **你系统里的本地用户 ID**（如果已绑定），始终按字符串处理；即使原始 ID 是数字也不要转成 number |
| `app_username` | 你系统里的用户名（方便展示） |

**处理逻辑：**

- 如果 `app_user_id` 存在 → 用它在你系统里找到对应用户，完成登录
- 如果 `app_user_id` 不存在 → 用户未绑定，提示联系管理员在 EIMS 后台绑定账号

EIMS 不下发业务系统角色。ERP、CRM、MES 等系统的角色、菜单和 API 权限由各自系统管理。

---

## 四、Token 刷新

`access_token` 有效期默认 1 小时。过期后用 `refresh_token` 刷新：

```
POST https://eims.example.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={之前的refresh_token}
&client_id={你的client_id}
&client_secret={你的client_secret}
```

返回格式与首次获取 token 相同。

---

## 五、Token 撤销

```
POST https://eims.example.com/oauth/revoke
Content-Type: application/x-www-form-urlencoded

token={要撤销的refresh_token}
&client_id={你的client_id}
&client_secret={你的client_secret}
```

成功返回 HTTP 200（无论 token 是否存在）。

---

## 六、安全注意事项

1. **`client_secret` 只在服务端使用**，绝对不能暴露到前端
2. **`state` 参数必须验证**，防止 CSRF 攻击
3. **标准客户端必须使用 PKCE S256**，并在 token 请求中提交原始 `code_verifier`；只有管理员明确设置为旧版兼容的服务端客户端才可省略
4. **`code` 只能使用一次**，用完即失效（默认 10 分钟过期）
5. **`redirect_uri` 必须精确匹配**，EIMS 会严格校验
6. **生产环境 EIMS、客户端和回调地址必须使用 HTTPS**
7. **退出登录时可跳转 OIDC `end_session_endpoint`（即 `/oauth/logout`）；`post_logout_redirect_uri` 必须是客户端已注册的回调地址**

单点退出示例：

```
GET https://eims.example.com/oauth/logout
  ?id_token_hint={客户端保存的ID Token}
  &post_logout_redirect_uri={已注册的回调地址}
  &state={客户端随机字符串}
```

该端点会清理当前 EIMS 浏览器 Cookie，并撤销 EIMS 会话和 OAuth 刷新令牌。业务系统自己的登录 Cookie、菜单和 API 权限仍由业务系统负责清理和校验。

---

## 七、常见问题

### Q: code 过期了怎么办？
A: 授权码有效期 10 分钟，过期后需要重新走授权流程。

### Q: 如何测试？
A: 可以用 curl 模拟：
```bash
# 1. 浏览器访问授权地址，登录后拿到 code
# 2. 用 code 换 token
curl -X POST https://eims.example.com/oauth/token \
  -d "grant_type=authorization_code" \
  -d "code=你的code" \
  -d "redirect_uri=你的回调地址" \
  -d "client_id=你的client_id" \
  -d "client_secret=你的client_secret"

# 3. 用 token 获取用户信息
curl https://eims.example.com/oauth/userinfo \
  -H "Authorization: Bearer 你的access_token"
```

### Q: 没有绑定关系会怎样？
A: `/oauth/userinfo` 仍然会返回 `sub`（EIMS 用户 ID），但你需要在自己系统里处理"未绑定"的情况，比如提示用户联系管理员绑定账号。

### Q: 支持 OIDC 发现吗？
A: 支持。访问 `GET /oauth/.well-known/openid-configuration` 可以获取所有端点信息，支持标准 OIDC 客户端库自动配置。
