# EIMS 与 CRM 单点登录对接方案

## 1. 对接目标

CRM 作为 OAuth 2.0/OIDC 客户端，EIMS 作为统一认证中心。用户访问 CRM 时：

1. CRM 未登录时跳转到 EIMS。
2. 用户在 EIMS 已登录时直接授权；未登录时先完成 EIMS 登录。
3. EIMS 将一次性授权码回调给 CRM。
4. CRM 服务端使用授权码换取 token，再获取 EIMS 用户信息。
5. CRM 根据 `app_user_id` 找到本地用户并建立 CRM 会话。

本方案沿用 EIMS 当前 ERP 的 SSO 机制，不共享数据库、不传递用户密码、不把 `client_secret` 放到浏览器。

EIMS 会将授权请求保存在短期服务端事务中，授权页地址只包含随机 `transaction_id`；CRM 不需要读取或拼接该事务，也不能依赖浏览器地址栏中的 OAuth 参数。

## 2. 需要双方确认的信息

| 项目 | EIMS 提供 | CRM 提供 |
| --- | --- | --- |
| EIMS 公网地址 | `https://eims.example.com` | — |
| OAuth 应用名称 | CRM | — |
| `client_id` / `client_secret` | 注册后提供 | 安全保存 secret |
| 回调地址 | 注册并严格校验 | 提供正式、测试环境地址 |
| CRM 本地用户 ID | — | 提供用户 ID |
| 用户绑定关系 | 在 EIMS 后台维护 | 配合提供账号清单或绑定接口 |
| CRM 登录落地页 | — | 提供回调成功后的页面/登录接口 |

建议分别为测试环境和生产环境创建两个 OAuth 应用，避免回调地址、密钥和用户数据混用。

## 3. EIMS 端点

基础地址为 EIMS 对外 HTTPS 地址；所有端点前的 `/oauth` 不变。

| 用途 | 方法 | 地址 |
| --- | --- | --- |
| OIDC 发现 | GET | `/oauth/.well-known/openid-configuration` |
| 发起授权 | GET | `/oauth/authorize` |
| 授权码换 token | POST | `/oauth/token` |
| 获取用户信息 | GET | `/oauth/userinfo` |
| 刷新 token | POST | `/oauth/token` |
| 撤销 refresh token | POST | `/oauth/revoke` |
| 公钥 | GET | `/oauth/jwks` |

CRM 可以优先读取 OIDC Discovery，不要把环境地址硬编码到多个地方。

## 4. 浏览器登录流程

### 4.1 跳转授权

CRM 发现用户未登录时，由服务端生成高强度随机 `state`，保存到该用户的短期 session 中，然后重定向浏览器：

```text
GET https://eims.example.com/oauth/authorize
  ?response_type=code
  &client_id={CRM_CLIENT_ID}
  &redirect_uri={CRM_CALLBACK_URI}
  &scope=openid%20profile%20email
  &state={RANDOM_STATE}
  &code_challenge={PKCE_CODE_CHALLENGE}
  &code_challenge_method=S256
```

`code_challenge`/`code_verifier` 为必填，且只能使用 `S256`。CRM 如果使用服务端机密客户端，也必须确保 `client_secret` 只在服务端使用。

### 4.2 CRM 回调

EIMS 授权成功后回调：

```text
GET {CRM_CALLBACK_URI}?code={AUTHORIZATION_CODE}&state={RANDOM_STATE}
```

CRM 必须：

1. 校验回调中的 `state` 与 session 中的值完全一致，并立即删除已使用的 state。
2. 处理 `error=access_denied` 等失败参数。
3. 服务端立即使用 `code` 换 token；授权码只能使用一次，默认有效期 10 分钟。
4. 不要把 `code`、`access_token` 或 `refresh_token`写入 URL、日志或前端页面。

## 5. 换取 Token

推荐使用 HTTP Basic 传递客户端凭据；EIMS 同时兼容表单参数方式。

```http
POST https://eims.example.com/oauth/token
Authorization: Basic base64(CRM_CLIENT_ID:CRM_CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code={AUTHORIZATION_CODE}&redirect_uri={CRM_CALLBACK_URI}&code_verifier={PKCE_CODE_VERIFIER}
```

成功响应：

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "eyJ..."
}
```

CRM 应将 token 保存在服务端 session 或加密存储中，并根据 `expires_in` 提前刷新。EIMS refresh token 会轮换，刷新成功后必须用新返回的 refresh token 覆盖旧值。

## 6. 获取用户和账号绑定

```http
GET https://eims.example.com/oauth/userinfo
Authorization: Bearer {ACCESS_TOKEN}
```

已申请 `openid profile email` 时，典型响应如下：

```json
{
  "sub": "1001",
  "name": "张三",
  "preferred_username": "zhangsan",
  "email": "zhangsan@example.com",
  "app_user_id": 8888,
  "app_username": "zhangsan"
}
```

字段约定：

| 字段 | CRM 处理方式 |
| --- | --- |
| `sub` | EIMS 统一用户 ID；作为稳定的跨系统身份标识保存 |
| `preferred_username` | EIMS 登录账号，不能替代 CRM 本地用户主键 |
| `email` | 可用于人工核对，不建议单独作为唯一绑定依据 |
| `app_user_id` | CRM 本地用户 ID；存在时直接登录对应 CRM 用户 |
| `app_username` | CRM 本地用户名，仅用于展示或核对 |

如果没有 `app_user_id`，说明 CRM 账号尚未绑定。CRM 应提示“账号未绑定，请联系管理员”，不得仅凭用户名自动创建高权限账号或放行登录。

EIMS 后台路径：

- “OAuth2 应用管理”：创建 CRM 应用、配置回调地址和 scope。
- “OAuth2 账号绑定”：将 EIMS 用户与 CRM 的 `app_user_id`、`app_username` 建立一对一绑定。

同一个 CRM 用户只能绑定一个 EIMS 用户；同一个 EIMS 用户在 CRM 应用下也只能绑定一个 CRM 用户。

## 7. CRM 侧伪代码

```text
if crm_session exists:
    continue

state = random()
verifier = random()
save_to_session(state, verifier, ttl=10min)
redirect_to_eims(state, challenge=SHA256_BASE64URL(verifier))

callback(code, state):
    saved = load_and_delete_session_state()
    if saved is missing or saved.state != state:
        reject("invalid state")

    tokens = POST /oauth/token(
        grant_type=authorization_code,
        code=code,
        redirect_uri=exact_callback_uri,
        code_verifier=saved.verifier,
        client_credentials=server_only,
    )
    user = GET /oauth/userinfo with tokens.access_token

    if user.app_user_id is missing:
        reject("CRM account is not bound")
    crm_user = find_crm_user(user.app_user_id)
    if crm_user is disabled or missing:
        reject("CRM account is unavailable")
    create_crm_session(crm_user)
    redirect_to_original_page()
```

## 8. 登出与异常处理

CRM 登出时至少清理自己的本地 session；如需撤销 EIMS refresh token：

```http
POST https://eims.example.com/oauth/revoke
Content-Type: application/x-www-form-urlencoded

token={REFRESH_TOKEN}&client_id={CRM_CLIENT_ID}&client_secret={CRM_CLIENT_SECRET}
```

以下情况统一回到 CRM 登录入口并重新发起授权：

- token 过期且 refresh token 刷新失败；
- EIMS 用户被禁用；
- CRM 账号不存在、被禁用或未绑定；
- `invalid_grant`、`invalid_client`、`invalid_token`；
- 回调 `state` 校验失败。

## 9. 安全要求

- 生产环境 EIMS、CRM 及回调地址必须使用 HTTPS。
- `client_secret` 只保存在 CRM 服务端密钥管理或环境变量中，不得提交代码仓库。
- `redirect_uri` 必须与 EIMS 注册值逐字符一致，包含协议、域名、端口、路径和尾部斜杠。
- 必须校验 `state`；建议启用 PKCE `S256`。
- 不记录 Authorization header、token、code、secret；必要时只记录请求追踪 ID 和错误类型。
- CRM 不应直接验证或解析 access token 后放行，用户身份以 `/oauth/userinfo` 校验结果为准；如本地验证 JWT，必须校验签名、`iss`、`aud`、`exp` 和 `kid`。
- EIMS RSA 公私钥需要持久化。容器重建不能导致 OAuth 签名密钥变化；当前 Docker Compose 已通过 `oauth2-keys` 卷持久化。

## 10. 联调验收清单

1. 测试和生产的 OAuth 应用、回调地址、secret 已分离。
2. 未登录访问 CRM 能跳到 EIMS，登录后能回到 CRM 原页面。
3. 已登录 EIMS 时访问 CRM 不需要再次输入密码。
4. CRM 能正确校验 `state`，伪造或重复回调会被拒绝。
5. 授权码重复使用会失败，错误码能回到 CRM 登录页。
6. 已绑定用户能登录正确的 CRM 账号，未绑定用户不能登录。
7. 禁用 EIMS 用户或 CRM 用户后，重新登录会被拒绝。
8. access token 过期后 refresh token 能轮换成功；旧 refresh token 不能再次使用。
9. EIMS 或 CRM 重启后，已签发的 token 和回调流程仍可正常验证。
10. 日志、浏览器地址栏、前端源码中均没有 secret 和 token。

## 11. CRM 需要交付给 EIMS 的材料

- 测试环境 CRM 地址；
- 测试环境 OAuth 回调地址；
- 生产环境 CRM 地址及回调地址；
- CRM 本地用户 ID、用户名与 EIMS 用户的绑定清单；
- CRM 登录接口/会话机制说明；
- 测试账号和联调联系人。

EIMS 收到以上材料后，创建 CRM OAuth 应用并通过安全渠道交付 `client_id` 和 `client_secret`。secret 仅展示/交付一次；遗失时通过 EIMS 后台重置并同步更新 CRM 配置。
