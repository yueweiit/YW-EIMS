# 核心数据字典

本文件解释稳定业务含义，不复制完整字段列表。类型、长度、默认值和所有索引的唯一可信入口为 [Prisma Schema](../../backend/libs/database/prisma/schema.prisma)；表的领域归属见[数据库](database.md)。以下已通过代码静态核实。

| 模型／关键字段 | 类型与约束 | 业务含义／注意事项 |
| --- | --- | --- |
| User.id / userName | Int 自增 / String 唯一 | EIMS 身份主键／本地登录名；OAuth sub 以字符串返回 |
| User.dingTalkSubject / dingTalkUserId | 可空 String，各自唯一 | 前者存钉钉 unionId 用于登录，后者存员工 userId 辅助同步，不作登录回退 |
| User.roles / buttons | String[]，默认空 | EIMS 角色编码／历史按钮编码；功能权限另由角色权限关联计算 |
| User.status / sessionVersion | String 默认 `1` / Int 默认 1 | 启用状态／当前 EIMS 会话版本；每次新登录递增使旧会话失效 |
| AuthRefreshSession | tokenHash、accessTokenHash 唯一；familyId、sessionVersion、expiresAt、revokedAt | EIMS 浏览器会话、轮换和撤销；不存刷新令牌明文 |
| AuthLoginTicket / DingTalkOAuthState | ticketHash / nonce 唯一，expiresAt、consumedAt | 登录票据和钉钉 state 的一次性消费记录 |
| Oauth2Client.clientId / clientSecret | String 唯一 / String | 客户端标识／bcrypt 密钥哈希；创建与重置时仅向授权调用方返回新密钥 |
| Oauth2Client.redirectUris / scopes / pkceRequired | String[] / String[] / Boolean 默认 true | 精确回调白名单、允许 scope、是否强制提交 S256 PKCE |
| Oauth2AuthorizationRequest | transactionId 唯一、browserNonceHash、state、nonce、expiresAt、consumedAt | 服务端授权事务，浏览器仅携带不透明事务 ID |
| Oauth2AuthorizationCode.code | String 唯一 | 短期一次性授权码；绑定客户端、用户、回调及 PKCE |
| Oauth2AccessToken / Oauth2RefreshToken | tokenHash 唯一；familyId、expiresAt、revokedAt | 外部 OAuth 令牌记录，与 EIMS AuthRefreshSession 分离 |
| Oauth2UserBinding.appUserId | String(255)，两组复合唯一键 | 外部本地用户标识，去首尾空白，不转换为数值；appUsername 仅辅助展示 |
| ExternalSystem.code / authMode | code 唯一；authMode 默认 `link` | 稳定系统编码／入口模式 `link`、`oauth2` |
| ExternalSystem.allowedRoles | String[] 默认空 | 允许的启用 EIMS 角色；空数组拒绝普通用户，R_SUPER 特例；无全员访问策略 |
| ExternalSystem.entryUrl / ssoStartUrl / oauthClientId | URL 字符串／可空 URL／可空唯一外键 | 入口、SSO 发起地址、关联客户端；地址优先级见[门户](../modules/portal/README.md) |
| SystemRole.code / builtIn | 唯一 String / Boolean | 稳定角色编码／内置标记；R_SUPER、R_ADMIN 为管理员判定编码 |
| SystemPermission.code / type / parentCode | 唯一 String / String / 可空 String | 菜单、按钮、API 目录；type 为 `menu`、`button`、`api`；parentCode 不是自关联外键 |
| Material.code / codePrefix | 可空唯一 String(50) / 可空 String(10) | 实际编码／选择的规则前缀；ERP 拉取及历史导入可没有 codePrefix |
| Material.applicant / applicationDate | String(50) / 可空 Date | 申请人显示内容（非 User 外键）／申请日期；批量生成入口不以任意传入日期替代默认行为 |
| Material.unit / unitCode | 可空 String / 可空外键 | 单位名称快照／单位字典编码，不能假设始终一致 |
| MaterialCodeRule.prefixLength | 可空 Int | 对选择前缀截取生成编码前缀；空值时使用完整前缀 |
| PhoneCodeSequence.currentValue | Int 默认 0 | id=1 的手机编码序列；相关事务使用 FOR UPDATE |
| PhoneModel.phoneCode / phoneName / phoneShortName | 前两者唯一；简称可空且不唯一 | 手机编号、全称、简称；简称匹配为 findFirst |
| MoldCode.moldCode / typeCode | 唯一 String / String | 模具前缀与材质码组合／材质业务关联 |
| Mold.itemCode | 唯一 String(50) | 大写 moldCode + phoneCode |
| ProductCode.productType | String(100)，非唯一 | 当前按显示名称选择一组产品编码；涉及业务数据多语言扩展时需兼容旧值 |
| Product.itemCode | 唯一 String(50) | 大写 productCode + phoneCode + colorCode |
| OaMapping.oaCode / instanceId | 主键 String / String | 审批业务编号到钉钉流程实例 ID 的缓存 |
| ErpTax.rateValue | 可空 Decimal(10,4) | 外部税率缓存，推单当前主要传 tax code |
| ErpNextMapping.type / sourceKey / targetValue | `(type, sourceKey)` 唯一 | `ITEM_GROUP`、`MOLD_ITEM_GROUP`、`PRODUCT_ITEM_GROUP`、`UNIT` 分类映射 |
| ErpNextSyncLog.status / retryCount | String 默认 PENDING / Int 默认 0 | 同步结果及人工重试次数，不是远端对象的版本 |
| SecurityAuditLog.event / result / detail | String / String / 可空 Json | 安全事件、success/failure/denied、脱敏详情；并非所有业务操作流水 |

## 状态编码与展示

- 用户、角色、权限、门户、OAuth 客户端常用 `1` 启用、`2` 停用，DTO／Service 校验与页面翻译共同约束，数据库通常仍为 String 而非 enum。
- 同步日志 `PENDING` 表示重试占用／处理中，`SUCCESS` 成功，`FAILED` 失败，`SKIPPED` 远端已存在而跳过；未配置 ERPNext 凭据虽然结果带 skipped 标记，但 success=false，因此日志为 FAILED。
- 门户返回 `bound`、`unbound`、`not_configured`、`not_required`，这些是计算出的接口状态，不是独立数据库列。
- OA 审批状态由钉钉提供，当前接口还包含中文键和中西混合表单标签。不要将这些显示内容扩散为新业务标识。

状态依据：[同步状态](../../backend/libs/oa/src/erpnext-sync-log/sync-log-status.ts)、[ERPNext 日志写入](../../backend/libs/oa/src/erpnext/erpnext.service.ts)、[门户服务](../../backend/libs/portal/src/external-system.service.ts)、[角色 DTO](../../backend/libs/roles/src/dto)、[审批解析](../../backend/libs/oa/src/oa-approval/oa-approval.service.ts)。界面标签应走[国际化](internationalization.md)；业务名称目前多为单字段文本，没有通用翻译表。
