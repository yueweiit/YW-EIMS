# EIMS OAuth2 SSO 接入文档

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
| Token 端点 | `POST /oauth/token` | 用 code 换 token |
| 用户信息端点 | `GET /oauth/userinfo` | 获取当前用户信息 |
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
  &state={随机字符串，防CSRF}
```

**参数说明：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `client_id` | 是 | EIMS 分配给你的应用 ID |
| `redirect_uri` | 是 | 必须与 EIMS 后台注册的回调地址完全一致 |
| `response_type` | 是 | 固定填 `code` |
| `scope` | 是 | `openid` 必填，`profile` 返回用户名姓名，`email` 返回邮箱，空格分隔 |
| `state` | 推荐 | 随机字符串，回调时原样返回，用于防 CSRF |

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
  "app_user_id": 8888,
  "app_username": "zhangsan"
}
```

| 字段 | 说明 |
|------|------|
| `app_user_id` | **你系统里的用户 ID**（如果已绑定） |
| `app_username` | 你系统里的用户名（方便展示） |

**处理逻辑：**

- 如果 `app_user_id` 存在 → 用它在你系统里找到对应用户，完成登录
- 如果 `app_user_id` 不存在 → 用户未绑定，提示联系管理员在 EIMS 后台绑定账号

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
3. **`code` 只能使用一次**，用完即失效（默认 10 分钟过期）
4. **`redirect_uri` 必须精确匹配**，EIMS 会严格校验
5. **建议使用 HTTPS**，生产环境不要用 HTTP

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
