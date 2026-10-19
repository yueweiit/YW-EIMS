# 可靠性、扩展边界与待验证事项

本清单记录静态代码依据和后续验证方向，不是已复现故障、漏洞评估或生产验收报告。初始化阶段仅记录，不修复业务代码、不访问数据库或外部系统。

## 已有保障

| 能力 | 已确认实现 | 实际边界 |
| --- | --- | --- |
| 数据唯一性 | Schema 的物料／Item／账号绑定等唯一键 | 前置查重不等于并发互斥；应用需正确解释唯一键失败 |
| 本地事务 | 规则说明更新、单次模具／产品创建、角色授权、会话版本递增 | 不涵盖所有批量预处理、令牌签发或外部请求 |
| 一次性消费 | state、登录票据、授权事务、授权码使用条件更新 | 后续步骤失败通常需重新发起，不等于整个链路原子完成 |
| 会话撤销 | EIMS sessionVersion／会话哈希，OAuth 撤销记录与刷新族轮换 | 外部系统独立 Cookie 不受直接控制 |
| 重试占用 | ERPNext 日志 updateMany 抢占 PENDING | 仅保护该记录的一部分竞争情形，无持久队列或超时自动恢复 |
| 限流和审计 | PostgreSQL 共享限流桶、安全事件和管理写操作日志 | 非全业务限流／非全量业务审计，审计写失败不回滚主流程 |

依据：[Schema](../../backend/libs/database/prisma/schema.prisma)、[认证](authentication.md)、[模块索引](README.md)。

## 需要关注的具体事项

| 编号／领域 | 已确认的代码现状与影响 | 依据 | 后续建议／验证状态 |
| --- | --- | --- | --- |
| R01 物料编码 | startsWith + 字符串倒序 + parseInt，无锁；并发可能选同一下一号，混合后缀或宽度变化会影响最大值判断；预览不占号 | [MaterialsService.generateCode](../../backend/libs/material/src/materials/materials.service.ts) | 静态确认；并发、历史异常码、六位溢出待隔离库验证，先确认编号契约再选择序列／锁策略 |
| R02 手机序列 | helper 接收 null 时使用普通 Prisma client，FOR UPDATE、读改写不在显式同一事务；模具批量预处理使用该路径 | [PhoneModelsService](../../backend/libs/mold-product/src/phone-models/phone-models.service.ts)、[MoldsService.batchCreate](../../backend/libs/mold-product/src/molds/molds.service.ts) | 静态确认；并发安全不能由注释认定，后续验证事务边界及重复 phoneName 场景 |
| R03 导入口径 | 物料未知单位可创建却记 errors；模具预处理创建手机独立于最终写入；产品逐行展开多条且事务独立 | [物料](../modules/material/README.md)、[模具产品](../modules/mold-product/README.md) | 静态确认；UI 成功／失败统计和部分成功恢复需按接口分别验收 |
| R04 OA 状态与幂等 | 推单信任请求中的 oa_details，只排除撤销／拒绝文本；未见重新查询权威状态、完成同意白名单或推单唯一流水 | [OaApprovalService.syncToErp](../../backend/libs/oa/src/oa-approval/oa-approval.service.ts) | 静态确认；是否允许进行中审批、远端防重复能力待业务／对方确认；优先考虑服务端复核和幂等契约 |
| R05 金额与本地化 | parseFloat 失败归零、number 计算、币种 CNY／汇率 1、组织和明细匹配依赖中文名称 | [OaApprovalService](../../backend/libs/oa/src/oa-approval/oa-approval.service.ts) | 静态确认；金额精度、税额、币种和跨语言模板变化待业务验收，不直接迁移历史字段 |
| R06 DTO 边界 | import-existing 为 interface 数组；sync-erp 为内联对象；全局 ValidationPipe 无法据此获得完整嵌套类验证 | [MaterialsController](../../backend/libs/material/src/materials/materials.controller.ts)、[OaApprovalController](../../backend/libs/oa/src/oa-approval/oa-approval.controller.ts) | 静态确认；后续补强前先确定旧调用格式、行数上限与错误契约 |
| R07 同步完整性 | 本地创建后 fire-and-forget；日志失败只打错误；update／delete 不同步远端；产品 batchCreate 还重复触发同步 | [ProductsService](../../backend/libs/mold-product/src/products/products.service.ts)、[ErpNextService](../../backend/libs/oa/src/erpnext/erpnext.service.ts) | 静态确认；进程退出丢任务、远端已存在但内容不同、重复日志待验证；根据需求评估可靠任务和对账 |
| R08 重试恢复 | 日志先读状态，再以 status != PENDING 抢占；没有过期占用恢复，异常中断可能停在 PENDING；条件也未限定原 FAILED 状态 | [ErpNextSyncLogService.retry](../../backend/libs/oa/src/erpnext-sync-log/erpnext-sync-log.service.ts) | 静态确认；并发请求跨越已完成更新时的重复执行及故障恢复待验证；先查远端事实再设计重试 |
| R09 关联完整性 | 模具产品多为无外键快照字段；颜色更新检查两类引用，但删除只检查 Product；名称变更不级联刷新 | [Schema](../../backend/libs/database/prisma/schema.prisma)、[ColorsService](../../backend/libs/mold-product/src/colors/colors.service.ts) | 静态确认；孤立编码／历史快照是否允许待业务确认；引用保护应分析上下游一致性 |
| R10 定时任务扩展 | isSyncing 仅进程内；OA 外库全量查询；ERPNext 映射缓存重载仅当前实例；部分外部失败变成空列表 | [同步与缓存](integrations.md) | 静态确认；多实例重入、缓存一致性、数据规模与错误可观测性待验证；不预先引入复杂队列 |
| R11 审批回退 | 全流程搜索依赖旧 EIMS-System 路径的 all_forms_list.txt，源码树未提供 | [loadProcessCodes](../../backend/libs/oa/src/oa-approval/oa-approval.service.ts) | 静态确认；部署是否另挂该文件待验证，缓存未命中不保证可搜索 |
| R12 国际化 | fallbackLocale=en 与 en-US 注册不同，es-MX 使用 Naive esAR；后端消息／OA 标签／PDF 固定文案未完全国际化 | [国际化](internationalization.md) | 静态确认；缺键回退、切换响应、字体和所有译文质量待浏览器验证 |
| R13 会话与外部权限 | 密码更新后独立撤销 EIMS 会话；绑定修改不通知外部系统；认证票据消费与令牌生成分步执行 | [UserService](../../backend/libs/user/src/user.service.ts)、[AuthService](../../backend/libs/auth/src/auth.service.ts)、[绑定服务](../../backend/libs/oauth2-provider/src/oauth2-binding.service.ts) | 静态确认；失败注入、多标签刷新、旧外部会话撤销时效需针对实际客户端验收 |
| R14 授权并发 | 角色 updateAccess 在事务中读取门户 allowedRoles 数组后写回，没有显式行锁／版本条件 | [RoleService.updateAccess](../../backend/libs/roles/src/role.service.ts) | 静态确认；不同角色并发授权同一系统的丢更新风险待真实数据库验证 |
| R15 匹配回退 | OA 物料／供应商／单位／税码未匹配时可回退固定代码，推单不必然因匹配失败中止 | [MaterialMatcher](../../backend/libs/oa/src/helpers/material-matcher.ts) | 静态确认；固定代码的业务适用范围、人工确认要求及误归类影响待确认，不把回退当作准确匹配 |

## 验证范围与未覆盖内容

当前已覆盖运行入口、全部注册业务域、主 Schema、主要路由／权限、主流程和外部调用。没有逐行安全审计全部辅助函数，没有审阅参考模板所有演示页，没有运行测试或量化覆盖率。现有 spec 只表示可复用测试入口，不证明以上风险已受回归保障。

仍待验证：生产迁移历史和真实约束、实际角色／用户分配、业务状态规则、外部 API 契约与可用性、跨系统退出、多实例任务、真实数据规模、三语言切换及 PDF 实际输出、备份恢复与外层 HTTPS。未确认的事项不能写成已经上线或已通过。
