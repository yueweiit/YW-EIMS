# EIMS SSO 外部系统接入实施与交付规范

版本：v1.0  
适用系统：ERP、CRM、MES、OA、HR 及其他需要接入 EIMS 的企业系统  
更新时间：2026-08-31

## 1. 目标和原则

EIMS 作为统一身份认证中心（OAuth 2.0 + OIDC Provider），外部系统作为 OAuth2/OIDC Client。用户访问外部系统时，由外部系统把用户引导到 EIMS 登录；登录成功后，EIMS 将一次性授权码返回给外部系统，外部系统服务端再换取 Token 和用户信息，最后创建自己的本地登录会话。

接入后实现：

- 用户只需要记住 EIMS 入口，不需要在每个系统重复输入密码。
- EIMS 统一控制“用户能否看到和进入某个外部系统”。
- ERP、CRM、MES 等系统继续控制自己的角色、菜单、数据范围和 API 权限。
- EIMS 不保存外部系统密码，不共享数据库，不把 `client_secret` 放到浏览器。
- EIMS 不维护外部系统角色，不再使用或下发 `app_roles`。

### 1.1 权限边界

| 权限对象 | 负责系统 | 说明 |
| --- | --- | --- |
| EIMS 菜单、按钮、API | EIMS | 例如用户管理、物料管理、OAuth2 应用管理 |
| 外部系统入口访问权 | EIMS | EIMS 角色决定用户能否看到/启动 ERP、CRM、MES 卡片 |
| 外部系统本地角色 | 外部系统 | 例如 ERP 管理员、CRM 销售、MES 操作员 |
| 外部系统菜单、数据权限、API | 外部系统 | 必须由外部系统后端自行校验，不能只依赖 EIMS 隐藏卡片 |
| EIMS 用户与外部用户映射 | 双方配合 | EIMS 保存映射值，外部系统提供该值的含义并据此查找本地用户 |

需要特别区分：

- `allowedRoles` 是 EIMS 外部系统目录中的“允许访问该系统的 EIMS 角色编码”，不是 ERP/CRM/MES 的内部角色。
- `sub` 是 EIMS 统一用户 ID。
- `app_user_id` 是外部系统用于查找本地用户的账号标识，统一按字符串保存和返回；EIMS 会去掉录入值的首尾空白。
- `app_username` 是外部系统用户名，仅用于展示或辅助定位，不作为唯一身份依据。
- EIMS 不返回 `app_roles`。外部系统角色必须在外部系统内部配置和校验。

## 2. 接入前的总体流程

```text
用户访问外部系统
        │
        ▼
外部系统发现本地会话不存在
        │ 生成 state、code_verifier、可选 nonce
        ▼
浏览器跳转 EIMS /oauth/authorize
        │
        ▼
EIMS 登录并确认授权
        │
        ▼
浏览器回调外部系统 callback?code=...&state=...
        │
        ▼
外部系统服务端校验 state，用 code_verifier + client_secret 换 Token
        │
        ▼
外部系统服务端调用 EIMS /oauth/userinfo
        │
        ▼
按 app_user_id 查找外部系统本地用户并创建本地会话
        │
        ▼
外部系统使用自己的角色、菜单和 API 权限继续授权
```

## 3. 外部系统需要改造什么

### 3.1 增加服务端 OAuth2/OIDC 登录入口

外部系统首页或登录页发现用户未登录时，应由服务端生成以下一次性参数，并将浏览器重定向到 EIMS：

- `state`：随机字符串，用于防止 CSRF。必须保存在外部系统服务端会话中，并在回调时严格比对后立即删除。
- `code_verifier`：PKCE 原始校验值，只保存在外部系统服务端或服务端会话中。
- `code_challenge`：`BASE64URL(SHA256(code_verifier))`。
- `nonce`：使用 OIDC ID Token 时建议生成并保存，用于校验 ID Token；当前 EIMS 支持传入并写入 ID Token。

推荐授权地址：

```text
GET {EIMS_ISSUER}/oauth/authorize
  ?client_id={client_id}
  &redirect_uri={url_encode(callback_uri)}
  &response_type=code
  &scope=openid%20profile%20email
  &state={state}
  &code_challenge={code_challenge}
  &code_challenge_method=S256
  &nonce={nonce}
```

要求：

- `response_type` 固定为 `code`。
- `scope` 必须包含 `openid`；需要姓名时加 `profile`，需要邮箱时加 `email`。
- `state` 和 `code_challenge` 必填。
- `code_challenge_method` 固定为 `S256`。
- `redirect_uri` 必须与 EIMS 注册值完全一致，包括协议、域名、端口、路径和末尾斜杠。
- 不允许在前端代码、浏览器地址以外的页面脚本或移动端包中放置 `client_secret`。

### 3.2 增加 OAuth 回调接口

外部系统需要提供一个后端回调地址，例如：

```text
GET https://erp.example.com/auth/eims/callback
```

回调接口必须：

1. 读取 `state`，与本次登录开始时保存的值进行常量时间比较。
2. 校验通过后立即删除服务端保存的 `state` 和 `code_verifier`，防止重放。
3. 如果存在 `error=access_denied`，清理临时登录状态并给用户明确提示。
4. 提取 `code`，由外部系统服务端调用 EIMS Token 端点。
5. 不把 `code`、`state`、`access_token` 写入普通业务日志、埋点或 URL 跳转记录。

### 3.3 服务端用授权码换 Token

推荐使用 HTTP Basic 传递客户端身份：

```bash
curl -X POST "${EIMS_ISSUER}/oauth/token" \
  -u "${CLIENT_ID}:${CLIENT_SECRET}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=${CODE}" \
  --data-urlencode "redirect_uri=${CALLBACK_URI}" \
  --data-urlencode "code_verifier=${CODE_VERIFIER}"
```

`client_id`、`client_secret` 也可以按表单字段提交，但只能在外部系统服务端提交。Token 响应示例：

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "eyJ..."
}
```

外部系统需要：

- 只在服务端保存 Token，建议加密保存或放入服务端会话存储。
- 不把 Token 放到 URL、前端 localStorage、前端日志或错误页面。
- 校验响应中的 `token_type` 和 `expires_in`。
- `refresh_token` 刷新成功后必须替换旧值；EIMS 对刷新令牌执行轮换，旧令牌不能继续使用。

### 3.4 服务端获取用户信息

```http
GET {EIMS_ISSUER}/oauth/userinfo
Authorization: Bearer {access_token}
```

外部系统必须以 `app_user_id` 查找自己的本地账号：

1. 如果返回了 `app_user_id`，使用它匹配本地用户。
2. 如果没有返回 `app_user_id`，表示 EIMS 尚未建立该用户的绑定关系，应提示联系管理员。
3. 禁止因为没有绑定而登录到默认账号、超级管理员账号或最近一次登录账号。
4. 找到本地用户后，还要检查本地用户是否启用。
5. 创建本地会话时轮换会话 ID，防止会话固定攻击。

EIMS 不理解 `app_user_id` 的业务含义，只负责保存和返回。外部系统必须在接入资料中说明：这个值对应本系统哪个字段、数据类型是什么、是否永久稳定、示例值是什么。

例如 ERP 当前约定使用 ERP 用户的 `custom_eims_app_user_id` 字段值作为绑定值；其他系统不能直接照搬这个字段名，应按自身系统的稳定用户标识约定。

### 3.5 外部系统仍需执行自己的权限校验

SSO 只解决“你是谁”和“是否完成登录”，不替代外部系统的授权。外部系统登录后必须：

- 按本地用户状态校验是否启用。
- 按本地角色校验菜单和按钮权限。
- 按本地角色、组织和数据范围校验 API。
- 对写操作在后端再次校验权限，不能只依赖前端按钮隐藏。
- 不因为用户从 EIMS 门户进入就默认给予管理员权限。

### 3.6 增加退出登录处理

外部系统退出时先清理自己的本地会话，再跳转 EIMS 单点退出地址：

```text
GET {EIMS_ISSUER}/oauth/logout
  ?id_token_hint={id_token}
  &client_id={client_id}
  &post_logout_redirect_uri={registered_logout_uri}
  &state={logout_state}
```

要求：

- `post_logout_redirect_uri` 必须事先提交给 EIMS 并注册，EIMS 会做精确匹配。
- 外部系统需要保存 `id_token`，如果使用 OIDC 标准退出流程。
- 外部系统必须清理自己的 Cookie、服务端会话和本地缓存；EIMS 无法直接删除外部系统域名下的 Cookie。
- 退出回调仍要校验 `state`，避免开放重定向或退出请求伪造。

## 4. 外部系统需要向 EIMS 提供什么

每个接入系统应提交一份接入信息表，测试环境和生产环境分别提交，不能混用密钥和回调地址。

| 信息 | 是否必填 | 含义和要求 | 示例 |
| --- | --- | --- | --- |
| 系统名称 | 是 | EIMS 页面展示名称 | ERP 系统 |
| 系统编码 | 是 | EIMS 外部系统目录唯一编码，只使用小写字母、数字、下划线、中划线 | `erp` |
| 系统说明 | 是 | 系统用途和面向员工的简短说明 | 采购、库存和生产管理 |
| 系统入口地址 | 是 | 用户点击 EIMS 卡片后访问的地址 | `https://erp.example.com/` |
| SSO 启动地址 | OAuth2 系统建议填写 | 目标系统生成 `state`/PKCE 并开始 OAuth 登录的服务端地址；首页已经自动跳转时可留空 | `https://crm.example.com/front/sso/eims/start` |
| OAuth 回调地址 | 是 | 外部系统服务端接收 `code` 的地址，必须是完整绝对 URL | `https://erp.example.com/auth/eims/callback` |
| 单点退出回调地址 | 建议 | 退出后返回外部系统的地址；当前 EIMS 要求它也加入客户端已注册回调地址列表 | `https://erp.example.com/login` |
| 申请的 scope | 是 | 一般为 `openid profile email`，说明是否确实需要 email | `openid profile` |
| 本地账号匹配字段 | 是 | `app_user_id` 在本系统中对应的字段名、类型和语义；类型统一按字符串处理，即使原始值是数字也不能按 JSON number 传输 | `custom_eims_app_user_id`，字符串 |
| 本地账号匹配示例 | 是 | 提供至少两个测试用户的字段值和用户名；字段值可以是数字字符串、字母或混合标识符 | 用户 A：`"10001"`；用户 B：`"ERP-USER-0002"` |
| 本地用户名字段 | 建议 | 用于 EIMS 绑定页面展示或排查，不作为唯一匹配键 | `username` |
| 用户状态规则 | 是 | 说明禁用、离职、锁定账号如何处理 | `disabled=true` 禁止登录 |
| EIMS 访问范围 | 是 | 说明全员访问还是按 EIMS 角色访问 | 仅生产角色可见 |
| 目标系统内部角色 | 不需要提供 | 由目标系统自己管理，不提交给 EIMS | 不填写 |
| 技术负责人和业务负责人 | 是 | 用于联调、上线和故障处理 | 姓名、部门、电话/邮箱 |
| 使用说明地址 | 建议 | 用户如何登录、常用操作说明 | `https://erp.example.com/help/sso` |
| 问题反馈地址 | 建议 | 用户遇到问题时的工单或反馈入口 | `https://erp.example.com/support` |
| 测试账号 | 是 | 提供至少一个普通用户和一个需要区分权限的用户 | 不提供密码给 EIMS，按双方约定测试 |

外部系统不应向 EIMS 提供用户密码、数据库连接串或内部角色配置文件。

## 5. EIMS 需要配置和提供什么

对于符合本规范的标准 OAuth2/OIDC 系统，EIMS 通常不需要修改源代码，主要是注册客户端、配置门户目录和维护账号绑定。只有在需要非标准协议、额外 Claim 或特殊账号同步时才需要 EIMS 开发改造。

### 5.1 EIMS 注册 OAuth2 应用

路径：`系统管理 → OAuth2 应用管理`

| 字段 | EIMS 侧含义 | 谁提供/填写 | 示例 |
| --- | --- | --- | --- |
| 应用名称 | 管理后台展示名称 | 外部系统提供，EIMS 管理员填写 | ERP |
| 应用说明 | 应用用途和联系人提示 | 外部系统提供 | ERP 统一登录 |
| 回调地址列表 | 允许 EIMS 返回授权码的地址，精确匹配 | 外部系统提供，EIMS 管理员录入 | `https://erp.example.com/auth/eims/callback` |
| 允许 scope | 外部系统可以申请的 OIDC scope | EIMS 管理员按最小权限配置 | `openid profile email` |
| 状态 | 启用或停用客户端 | EIMS 管理员维护 | 启用 |
| `client_id` | EIMS 生成的客户端公开标识 | EIMS 生成后提供给外部系统后端 | `eims_xxx` |
| `client_secret` | 客户端认证密钥，数据库只保存哈希 | EIMS 生成后一次性安全交付 | 仅外部系统后端保存 |

安全要求：

- `client_secret` 只交给外部系统后端负责人或部署系统。
- EIMS 管理页面只在创建/重置时显示明文 Secret；丢失后只能重置，不能从数据库读取原值。
- 测试环境和生产环境分别创建 OAuth2 应用。
- 停用或重置 Secret 后，外部系统现有刷新令牌会失效，需要重新登录。

### 5.2 EIMS 配置外部系统目录

路径：`系统管理 → 外部系统目录`

| 字段 | 含义 | 配置规则 |
| --- | --- | --- |
| 系统编码 | 门户内部唯一编码 | 例如 `erp`，必须稳定，不能随意变更 |
| 系统名称 | 门户卡片标题 | 面向员工展示 |
| 系统说明 | 门户卡片副标题 | 说明系统用途 |
| 图标/颜色 | 门户展示样式 | 不影响安全 |
| 入口地址 | 直接访问地址或外部系统首页 | 必须是 `http/https`，生产使用 HTTPS |
| SSO 启动地址 | OAuth2 登录时优先使用的目标系统服务端启动地址 | 目标系统首页不能自动发起 SSO 时填写；不能填写 OAuth 回调地址 |
| 登录方式 | `link` 或 `oauth2` | 需要 EIMS SSO 时选择 `oauth2` |
| 访问策略 | `roles` 或 `all` | `roles` 表示按 EIMS 角色授权；`all` 表示所有已登录用户 |
| 允许角色 | EIMS 角色编码列表 | 只在 `roles` 模式下生效；为空表示拒绝，不表示开放全部 |
| OAuth2 应用 | 关联已注册的 `client_id` | `oauth2` 模式必须选择 |
| 分类 | 门户分组 | 例如业务系统、办公系统 |
| 使用说明地址 | 用户帮助文档 | 可选 |
| 问题反馈地址 | 工单、客服或反馈页面 | 可选 |
| 联系人 | 无链接时的反馈联系人 | 可选 |
| 排序 | 门户显示顺序 | 数值越小越靠前 |
| 状态 | 启用或停用 | 停用后门户不展示且后端拒绝启动 |

注意：这里的“允许角色”是 EIMS 角色，不是目标系统角色。例如 `R_PROD` 可以表示 EIMS 中允许进入 ERP 的生产用户，但 ERP 的“生产主管”角色仍需在 ERP 内配置。

### 5.3 EIMS 建立账号绑定

路径：`系统管理 → OAuth2 账号绑定`

| 字段 | 含义 | 来源和规则 |
| --- | --- | --- |
| SSO 用户 | EIMS 用户 | 由 EIMS 用户管理产生 |
| OAuth2 应用 | 目标系统客户端 | 选择外部系统对应的 OAuth2 应用 |
| 业务系统用户 ID | 外部系统本地账号匹配值 | 外部系统提供字段语义和具体值；EIMS 按字符串规范化保存并返回为 `app_user_id` |
| 业务系统用户名 | 外部系统用户名 | 可选，用于展示和排查；不是唯一匹配依据 |

当前不再配置“业务系统角色”。EIMS 只维护“EIMS 用户 → 外部系统用户”的映射，目标系统内部角色由目标系统自己决定。

### 5.4 EIMS 向外部系统提供的接入资料

EIMS 完成配置后应向外部系统提供一份不包含 Secret 的基础资料，以及通过安全渠道单独交付的 Secret：

```text
EIMS Issuer/Base URL: https://eims.example.com
Discovery:            https://eims.example.com/oauth/.well-known/openid-configuration
Authorization:        https://eims.example.com/oauth/authorize
Token:                https://eims.example.com/oauth/token
UserInfo:             https://eims.example.com/oauth/userinfo
Revoke:               https://eims.example.com/oauth/revoke
Logout:               https://eims.example.com/oauth/logout
JWKS:                 https://eims.example.com/oauth/jwks
client_id:            eims_xxx
client_secret:        通过安全渠道单独交付，不写入工单、邮件正文或前端代码
```

外部系统优先读取 Discovery 文档，使用其中的 `issuer`、授权端点、Token 端点、UserInfo 端点、退出端点和 JWKS 地址，不要把测试地址硬编码到生产配置。

## 6. OAuth 字段字典

### 6.1 授权请求字段

| 字段 | 必填 | 类型/示例 | 含义 |
| --- | --- | --- | --- |
| `client_id` | 是 | `eims_xxx` | EIMS 为外部系统生成的客户端标识，可以出现在浏览器地址中 |
| `redirect_uri` | 是 | 完整 URL | 授权完成后的回调地址，必须与 EIMS 注册值完全一致 |
| `response_type` | 是 | `code` | 使用授权码模式，当前 EIMS 只支持 `code` |
| `scope` | 是 | `openid profile email` | 请求的用户信息范围；`openid` 是 OIDC 登录必需项 |
| `state` | 是 | 随机字符串 | 外部系统生成并保存，用于防止 CSRF，回调时必须原样校验 |
| `code_challenge` | 是 | Base64URL 字符串 | PKCE challenge，由 `code_verifier` 的 SHA-256 计算得到 |
| `code_challenge_method` | 是 | `S256` | PKCE 算法，当前固定为 SHA-256 |
| `nonce` | 否，建议 | 随机字符串 | OIDC 防重放值；如果传入，EIMS 会写入 ID Token，外部系统应校验 |

### 6.2 回调字段

| 字段 | 成功时 | 含义 |
| --- | --- | --- |
| `code` | 有 | 一次性授权码，只能由服务端使用一次，不能当作长期 Token |
| `state` | 有 | EIMS 原样返回的状态值，必须与外部系统服务端保存的值一致 |
| `error` | 失败时有 | 例如 `access_denied`，表示用户拒绝授权或授权失败 |
| `error_description` | 可能有 | 面向日志/排查的错误说明，不应直接当作安全判断依据 |

### 6.3 Token 请求字段

| 字段 | 授权码模式 | 刷新模式 | 含义 |
| --- | --- | --- | --- |
| `grant_type` | `authorization_code` | `refresh_token` | 指定本次 Token 操作类型 |
| `code` | 必填 | 不填 | 回调拿到的一次性授权码 |
| `redirect_uri` | 必填 | 不填 | 必须与授权请求和 EIMS 注册值一致 |
| `code_verifier` | 必填 | 不填 | PKCE 原始值，不能提交 `code_challenge` 代替 |
| `refresh_token` | 不填 | 必填 | 上一次 Token 响应返回的刷新令牌 |
| `client_id` | 可用 | 可用 | 客户端标识；推荐通过 Basic 认证传递 |
| `client_secret` | 可用 | 可用 | 客户端密钥；只能在外部系统服务端使用 |

### 6.4 Token 响应字段

| 字段 | 含义 |
| --- | --- |
| `access_token` | 访问 EIMS UserInfo 等受保护接口的短期访问令牌 |
| `token_type` | 当前为 `Bearer`，调用 UserInfo 时放入 `Authorization` 头 |
| `expires_in` | Access Token 剩余有效秒数 |
| `refresh_token` | 用于服务端刷新 Access Token；刷新成功后通常会返回新的值 |
| `id_token` | 请求了 `openid` 时返回的 OIDC 身份令牌；需要校验签名和标准声明 |

### 6.5 UserInfo 字段

示例：

```json
{
  "sub": "1001",
  "name": "张三",
  "preferred_username": "zhangsan",
  "email": "zhangsan@example.com",
  "app_user_id": "8888",
  "app_username": "zhangsan"
}
```

| 字段 | 是否一定存在 | 含义和使用规则 |
| --- | --- | --- |
| `sub` | 是 | EIMS 统一用户 ID。可用于审计或跨系统关联，但不能替代外部系统本地账号映射 |
| `name` | 请求 `profile` 时 | EIMS 用户姓名，适合展示 |
| `preferred_username` | 请求 `profile` 时 | EIMS 登录用户名，不一定等于外部系统用户名 |
| `email` | 请求 `email` 且用户有邮箱时 | EIMS 用户邮箱，不能默认作为唯一账号匹配键，除非双方明确约定 |
| `given_name` | 请求 `profile` 且有姓名时 | 姓名拆分结果，适合展示 |
| `family_name` | 请求 `profile` 且有姓名时 | 姓名拆分结果，适合展示 |
| `picture` | 当前可选 | 用户头像地址，使用前应考虑外部请求和隐私策略 |
| `app_user_id` | 完成绑定时 | 外部系统本地账号匹配值，类型为字符串，由 EIMS 管理员录入并按规范化后的值返回；即使是长数字也不能转成 JSON number |
| `app_username` | 完成绑定且填写时 | 外部系统用户名，辅助展示；不作为唯一身份依据 |
| `app_roles` | 不提供 | 不再使用。外部系统角色由外部系统本地权限体系负责 |

### 6.6 单点退出字段

| 字段 | 是否建议 | 含义 |
| --- | --- | --- |
| `id_token_hint` | 建议 | 外部系统之前获得的 ID Token，用于让 EIMS 确认客户端和用户 |
| `client_id` | 建议 | 发起退出的客户端标识；如果同时提供，必须与 ID Token 中的客户端一致 |
| `post_logout_redirect_uri` | 建议 | 退出完成后返回外部系统的地址，必须是已注册地址 |
| `state` | 建议 | 外部系统生成的退出状态值，回跳后用于校验请求对应关系 |

## 7. OIDC ID Token 校验要求

如果外部系统使用 `id_token`，应通过 Discovery 中的 `jwks_uri` 获取公钥，校验：

- JWT 签名算法为 `RS256`，签名通过。
- `iss` 等于 EIMS Discovery 返回的 `issuer`。
- `aud` 包含当前 `client_id`。
- `exp` 尚未过期，必要时检查 `iat`。
- 如果授权请求传了 `nonce`，ID Token 中的 `nonce` 必须与本次请求保存的值一致。
- `sub` 作为 EIMS 用户标识保存或审计，不作为外部系统账号的唯一匹配值，除非双方明确采用该约定。

如果外部系统只使用 UserInfo 完成本地登录，也仍然必须校验 Access Token 请求结果、HTTPS 通道和 UserInfo 的 HTTP 状态码，不能信任前端自行提交的用户 ID。

## 8. EIMS 是否需要改代码

### 8.1 标准接入：通常不需要改 EIMS 源代码

只要外部系统满足以下条件，EIMS 侧只需要后台配置：

- 使用授权码模式。
- 支持 PKCE S256。
- 使用服务端保存 `client_secret`。
- 提供固定回调地址。
- 使用 `app_user_id` 作为本地账号映射值。
- 外部系统自己管理角色和 API 权限。

EIMS 管理员需要完成：

1. 注册 OAuth2 应用。
2. 录入回调地址和允许的 scope。
3. 配置外部系统目录和 EIMS 访问策略。
4. 关联 OAuth2 应用。
5. 为需要登录的 EIMS 用户建立账号绑定。
6. 将 `client_id`、Issuer、端点和 Secret 通过安全方式交付给外部系统。

### 8.2 需要 EIMS 开发改造的情况

出现以下需求时，应先由双方确认协议，再修改 EIMS：

- 需要新的用户属性或新的标准 OIDC Claim。
- 需要组织、部门、租户、数据范围等跨系统身份属性。
- 需要 SCIM 自动开户、自动离职禁用或实时用户同步。
- 需要动态注册客户端、设备码、服务账号等当前未开放的 OAuth 能力。
- 需要不同于 `app_user_id` 的复杂账号匹配规则。
- 需要把外部系统内部角色传入 EIMS；这不属于当前方案，必须另行评审，不能重新启用 `app_roles` 作为临时方案。

EIMS 改造交付物应包括：数据库迁移、接口说明、字段兼容策略、安全评审、测试用例和回滚方案。

## 9. 联调和验收清单

### 9.1 EIMS 侧验收

- [ ] Discovery 地址可访问，端点地址与当前环境一致。
- [ ] OAuth2 应用状态为启用，回调地址完全匹配。
- [ ] `client_secret` 未出现在前端代码、浏览器 Network、页面 HTML 或普通日志中。
- [ ] 外部系统目录选择了正确的登录方式和 OAuth2 应用。
- [ ] `roles` 模式已配置正确的 EIMS 角色；没有配置角色时不会意外开放。
- [ ] `all` 模式只用于确实允许所有已登录用户访问的系统。
- [ ] 每个测试用户的账号绑定值正确，且同一个外部账号没有绑定给多个 EIMS 用户。

### 9.2 外部系统侧验收

- [ ] 未登录访问会跳转 EIMS，已登录 EIMS 不需要重复输入密码。
- [ ] 回调严格校验 `state`，重复使用回调地址不能登录。
- [ ] 错误的 `code_verifier`、过期 code、错误 redirect URI 会被拒绝。
- [ ] 没有账号绑定时不会进入默认账号或超级管理员账号。
- [ ] 普通用户和管理员分别进入正确的外部系统本地角色权限。
- [ ] 外部系统后端能够阻止无权限的菜单和 API 请求。
- [ ] Access Token 过期后可以使用新的 refresh token 刷新，旧 refresh token 不能重复使用。
- [ ] 退出时外部系统自己的会话和 EIMS 会话都被清理。
- [ ] 修改或停用外部系统本地账号后，外部系统会拒绝继续使用该账号。

### 9.3 推荐测试矩阵

| 场景 | 预期结果 |
| --- | --- |
| EIMS 管理员 + 已绑定 | 可看到并进入允许的系统，外部系统使用管理员本地权限 |
| EIMS 普通用户 + 已绑定 | 只能看到 EIMS 允许的系统，外部系统使用自己的普通角色 |
| EIMS 用户 + 未绑定 | 门户可显示“账号未绑定”，启动被阻止，不允许默认账号登录 |
| EIMS 用户 + 无外部系统访问角色 | 门户不展示该系统，直接调用启动接口返回拒绝 |
| 外部系统本地角色被撤销 | SSO 仍可完成身份认证，但外部系统本地授权应拒绝相应功能 |
| 重放旧 code | Token 端点返回失败 |
| 修改 callback 中的 state | 外部系统拒绝登录 |
| 修改 redirect URI | EIMS 授权或换 Token 失败 |
| 退出后再次访问外部系统 | 需要重新完成登录/授权，不得沿用旧本地会话 |

## 10. 常见错误定位

| 错误 | 常见原因 | 处理方式 |
| --- | --- | --- |
| `invalid_client` | Secret 错误、客户端停用、Basic/Form 参数错误 | 在 EIMS 重置 Secret，更新外部系统后端配置 |
| `invalid_grant` | code 过期、重复使用、redirect URI 不一致、PKCE 错误 | 重新发起登录，检查回调地址和 `code_verifier` |
| `access_denied` | 用户拒绝授权或 EIMS 用户无权访问 | 检查 EIMS 角色和授权页面结果 |
| UserInfo 返回 401 | Access Token 无效、过期、签名/Issuer 不匹配 | 不要复用旧 Token，按刷新流程获取新 Token |
| EIMS 门户返回 403 | EIMS 角色未被允许访问该外部系统 | 修改外部系统目录的访问策略或 EIMS 角色配置 |
| 外部系统登录成功但功能返回 403 | 外部系统本地角色或 API 权限不足 | 在外部系统内配置角色和权限，EIMS 不负责此权限 |
| 登录到了错误的外部账号 | 使用了默认账号、Cookie 旧会话或错误的 `app_user_id` | 清理外部系统本地会话，按绑定值重新核对本地账号 |

## 11. 当前环境注意事项

本地测试可以使用 HTTP，例如：

```text
http://192.168.5.202:8006
```

生产环境上线前必须切换为域名和 HTTPS，并重新注册生产回调地址、配置生产 Issuer 和生产 OAuth2 Secret。生产环境不要直接复用本地客户端、回调地址或用户绑定数据。
