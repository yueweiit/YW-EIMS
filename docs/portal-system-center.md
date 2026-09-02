# EIMS 统一系统门户

## 目标

用户登录 EIMS 后，只看到自己有权限使用的 ERP、CRM、MES 等系统，并可从首页直接进入。系统卡片同时展示用途、账号绑定状态、使用说明和问题反馈入口，减少记网址和找系统的成本。

## 管理流程

1. 在“系统管理 → OAuth2 应用管理”注册目标系统客户端。
2. 在“系统管理 → 外部系统目录”新增系统，填写入口、可选 SSO 启动地址、访问策略、允许角色、说明和反馈地址。OAuth2 系统如果首页不会自动跳转，应填写目标系统的服务端 SSO 启动地址；DeepLinkERP 使用 `https://deeplinkerp.com/api/method/custom_filters.overrides.oauth.login_via_eims`。这里不能填写 ERP 首页，也不能填写 OAuth 回调地址。访问策略为“按角色授权”时，允许角色为空表示拒绝；选择“所有已登录用户”才会开放给全部已登录用户。
3. 需要账号映射的系统，将登录方式设置为“OAuth2 绑定”，选择对应 OAuth2 应用。
4. 在“系统管理 → OAuth2 账号绑定”给 EIMS 用户绑定目标系统账号，只维护目标系统用户 ID 和用户名，不维护目标系统角色。
5. 目标系统后端使用 EIMS `userinfo` 中的 `app_user_id`、`app_username` 建立登录会话，并由目标系统自行执行本系统的角色、菜单和 API 权限校验。

## 接口

```text
GET  /api/portal/systems
POST /api/portal/systems/:code/launch
GET  /api/portal/me/permissions
GET  /api/portal/admin/systems
POST /api/portal/admin/systems
PUT  /api/portal/admin/systems/:id
DELETE /api/portal/admin/systems/:id
```

`/api/portal/systems` 不返回入口地址和任何 OAuth 密钥；前端必须通过启动接口获取经过后端授权的入口。OAuth2 系统启动时，EIMS 后端优先返回目录中配置的 SSO 启动地址，未配置时回退到入口地址。OAuth `client_secret` 只存在目标系统后端和 EIMS 服务端配置中。

## 权限边界

- EIMS 负责门户可见性、系统状态、访问策略和账号绑定前置检查，并记录系统启动审计。
- ERP、CRM、MES 负责自己的角色、菜单和 API 权限，不能把“门户隐藏卡片”当成安全控制。
- 没有业务账号绑定时，门户显示“账号未绑定”并阻止 OAuth2 系统启动，不应回退到默认账号或超级管理员账号。
