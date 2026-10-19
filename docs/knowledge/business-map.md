# 业务功能地图

“使用角色”描述代码授权范围；实际岗位和角色分配由部署数据决定，待验证。

| 领域 | 实际功能／对象 | 使用权限 | 依赖与文档 |
| --- | --- | --- | --- |
| 物料 | Material、Unit、MaterialCodeRule；编号预览、导入、ERP 回查 | `eims:material:*` 对应具体菜单／操作键 | 单位／规则 → 物料 → ERPNext；[模块](../modules/material/README.md) |
| 模具产品 | 手机型号、颜色、材质、模具编码、模具、产品编码、产品 | `eims:mold:*` 具体权限键 | 基础字典 → 编码 → Item；[模块](../modules/mold-product/README.md) |
| OA 审批 | 审批号查详情、时间线、基础资料匹配、用友采购推单 | `eims:oa:approval`、推送权限 | 钉钉 API + 本地缓存 + 用友；[模块](../modules/oa/README.md) |
| ERPNext 运维 | 映射维护、同步日志、失败重试 | 映射 `eims:mold:erpnext-mapping`；日志 `eims:system:erpnext-sync-log` 及操作键 | 物料／模具／产品共用；[模块](../modules/oa/README.md) |
| 身份与访问 | 本地／钉钉登录、用户、角色、功能权限、安全审计 | 登录用户；管理入口同时受管理员和功能权限限制 | 用户同步依赖 OA 快照；[模块](../modules/identity/README.md) |
| OAuth2 | 客户端、账号绑定、授权码、令牌、UserInfo、退出 | 协议自校验；管理 API 用管理员与功能权限 | 外部系统负责本地会话和数据权限；[模块](../modules/oauth2/README.md) |
| 门户 | 首页系统卡片、可访问系统清单、启动、目录管理 | 启用角色与 allowedRoles；R_SUPER 特例 | OAuth2 模式额外检查绑定；[模块](../modules/portal/README.md) |
| 箱贴 | Excel／CSV 导入、手工编辑、PDF 导出 | 前端 `eims:oa:box-label` | 无专属 Controller／表；[模块](../modules/box-label/README.md) |

权限通配写法仅用于分类，不是运行时可直接授予的权限键；只有角色服务返回的 `*` 具有超级管理员含义。具体键以各 Controller 的 `@RequirePermission()` 为准。

## 核心业务链路

1. 基础资料：单位／编码规则 → 申请物料 → 生成编码并保存 → best-effort 创建 ERPNext Item。
2. 模具：材质 → 模具编码；模具编码 + 手机型号 → 模具 Item。
3. 产品：颜色 + 产品编码 → 按产品类型选择多条编码；每条编码 + 手机型号 + 颜色生成产品 Item。
4. 审批：审批号 → 本地实例映射／外部查找 → 钉钉详情 → 用户确认匹配信息 → 用友采购单请求。审批决策本身在钉钉执行。
5. 身份：钉钉员工快照 → EIMS 用户绑定；登录 → EIMS 会话 → 权限计算 → 门户启动 → 外部系统 OAuth 回调及本地登录。

来源：[物料服务](../../backend/libs/material/src/materials/materials.service.ts)、[模具服务](../../backend/libs/mold-product/src/molds/molds.service.ts)、[产品服务](../../backend/libs/mold-product/src/products/products.service.ts)、[审批服务](../../backend/libs/oa/src/oa-approval/oa-approval.service.ts)、[员工同步](../../backend/libs/oa/src/dingtalk-sync/dingtalk-sync.service.ts)。各流程的失败和事务边界详见对应模块，不能依据业务链路推断尚未实现的补偿或审批状态机。
