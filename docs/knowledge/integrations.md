# 系统集成关系

## 责任系统与方向

| 集成 | 来源 → 目标与用途 | 认证／入口 | 一致性与失败边界 |
| --- | --- | --- | --- |
| 钉钉网页登录 | 钉钉身份 → EIMS 用户会话 | DINGTALK_OAUTH_*；[OAuth 登录服务](../../backend/libs/auth/src/dingtalk-oauth.service.ts) | signed state + 数据库一次性消费；按 unionId 绑定，失败不创建默认管理员 |
| 钉钉 OA 快照库 | 外部快照 → EIMS 员工／部门／审批映射及自动账号 | DINGTALK_OA_DB_URL；[数据库适配](../../backend/libs/oa/src/dingtalk-oa-db/dingtalk-oa-db.service.ts) | 当前代码只读外库；本地 upsert；外库表结构由来源系统负责 |
| 钉钉审批 API | 实例详情 → EIMS 审批展示与字段解析 | DINGTALK_APP_KEY、DINGTALK_APP_SECRET；[DingTalkService](../../backend/libs/oa/src/dingtalk/dingtalk.service.ts) | 进程内 token 缓存；异常可能返回 null／空集合；不可把空结果当作业务不存在的确证 |
| 用友 YonBIP | 用友字典 → EIMS 缓存；EIMS OA 内容 → 用友采购单 | ERP_APP_KEY、ERP_APP_SECRET，HMAC 换访问令牌；[ErpService](../../backend/libs/oa/src/erp/erp.service.ts) | 外部接口路径在代码中；无跨库事务，本地未见推单幂等流水 |
| ERPNext／DeepLinkERP | EIMS 物料／模具／产品 → Item；Item → EIMS 查找／导入 | ERPNEXT_AUTH_TOKEN、ERPNEXT_ITEM_API_URL；[ErpNextService](../../backend/libs/oa/src/erpnext/erpnext.service.ts) | 创建后异步同步，30 秒请求超时，日志 + 手工重试；重复 Item 视为跳过，不自动比较或更新字段 |
| 外部 OAuth 客户端 | EIMS 身份／账号绑定 → 外部系统会话 | 客户端密钥、授权码、PKCE、RS256；[OAuth2 模块](../modules/oauth2/README.md) | EIMS 负责身份和入口权限，外部系统负责本地用户状态／权限／会话清理 |

本仓库的“用友采购推单”和“ERPNext Item 同步”是两套集成，凭据、数据模型、返回码与日志机制不能混用。门户中预置系统编码只代表可配置入口，不是所有外部系统已经接通的证据。

## 后台同步与缓存

- [DingtalkSyncService](../../backend/libs/oa/src/dingtalk-sync/dingtalk-sync.service.ts)：启动触发一次、每 30 分钟同步员工、部门、审批映射。员工源过滤 is_current=true、fetch_status=success；部门来自审批发起部门去重，不是当前完整组织树。缺 unionId 跳过自动建号；快照消失不会自动禁用旧账号。
- [ErpSyncService](../../backend/libs/oa/src/erp-sync/erp-sync.service.ts)：每 4 小时同步供应商／物料、每 12 小时同步单位／税率；分页拉取后逐条 upsert，页间延迟；失败返回空列表时可能提前结束本次扫描。
- ERPNext 映射在启动加载，管理修改后重载当前进程内缓存；多实例之间没有缓存失效广播。批量 Item 同步在进程中执行，没有持久化任务队列。
- 外部 OA 查询未分页获取全部当前员工／未删除审批；增长后的内存、查询和同步时间待压测。

## 对接维护

外部 OAuth 接入复用[交付规范](../eims-sso-integration-guide.md)、[接口参考](../oauth2-sso-integration.md)、[CRM 方案](../crm-sso-integration.md)。配置项用途见[部署](deployment.md)，数据语义见[字典](data-dictionary.md)。

本轮未读取真实凭据、未访问外部数据库／API，也未验证外部服务权限、回调地址、状态同步或账户映射。不能把源码调用链描述为生产接入已验收。
