# 国际化与多语言扩展

## 已实现机制

| 内容 | 当前实现／证据 |
| --- | --- |
| 框架与语言 | vue-i18n；[locale.ts](../../frontend/src/locales/locale.ts) 注册 `zh-CN`、`en-US`、`es-MX` |
| 翻译资源 | [langs](../../frontend/src/locales/langs)：zh-cn.ts、en-us.ts、es-mx.ts；`App.I18n.Schema`／LangType 在 [app.d.ts](../../frontend/src/typings/app.d.ts) |
| 初始化与回退 | [index.ts](../../frontend/src/locales/index.ts) 读取 localStg.lang，默认 zh-CN；fallbackLocale 当前写为 `en`，资源注册键是 en-US，实际缺键回退效果待验证 |
| 切换与偏好 | [app store](../../frontend/src/store/modules/app/index.ts) 的 changeLocale 更新 i18n／html lang／localStorage；watch 更新标题、菜单、标签页和 Day.js |
| UI 组件 | [naive.ts](../../frontend/src/locales/naive.ts) 映射中英；es-MX 借用 Naive UI esAR／dateEsAR，不能宣称地区格式完全等价 |
| 日期库 | [dayjs.ts](../../frontend/src/locales/dayjs.ts) 注册 zh-cn、en、es-mx |
| 翻译调用 | `import { $t } from '@/locales'`；模板和脚本 `$t('common.confirm')`；业务常用 `page.ui.*`，路由用 `route.*` |

本轮核实注册和典型调用，没有执行三语言浏览器切换，也未逐条评价翻译质量。

## 界面翻译与业务数据

当前 [Schema](../../backend/libs/database/prisma/schema.prisma) 中物料、产品、颜色、角色、门户名称和描述多为单一 String，没有通用 locale 翻译子表。箱贴有独立 spanishName 输入，ERP 单位／Item Group 还包含中西混合值，这些不等于所有业务对象具备多语言数据模型。

后端异常多为中文或英文文本，统一过滤器仅提供有限业务码，前端常直接展示 msg。OA 解析还依赖中文／西语表单标签，产品选择依赖 productType 显示文本。未来多语言数据扩展应先确认稳定 ID／编码，再设计兼容映射，不能直接翻译已有判断值或批量改历史数据。

依据：[异常过滤](../../backend/libs/common/src/filters/all-exception.filter.ts)、[审批解析](../../backend/libs/oa/src/oa-approval/oa-approval.service.ts)、[产品创建](../../backend/libs/mold-product/src/products/products.service.ts)。

## 导出、打印与区域化

- [excel-crud.ts](../../frontend/src/utils/excel-crud.ts) 翻译模板提示、文件后缀及错误；列标签由调用页面提供，导入接受 label、内部 key 和 aliases。新增翻译时应保留历史表头别名。
- [excel-workbook.ts](../../frontend/src/utils/excel-workbook.ts) 是通用读写入口；浏览器处理全部数据，导出语言取决于调用时构造的列标签，不存在统一后端 language 参数。
- [箱贴 PDF](../../frontend/src/views/oa/box-label/modules/pdf-generator.ts) 使用固定中／英／西语标签与固定进口商信息，不随界面语言完全变化；模板是否应固定属于业务要求，待确认，不能擅自全部翻译。
- Day.js 语言映射已存在，但日期格式、金额、数字、币种不是全局统一策略；Excel 文件名用 ISO 日期，OA 推单币种固定 CNY、汇率 1、金额为 number。跨时区和多币种能力待单独设计。
- 当前应用装配未见邮件／通知发送服务，不能声称已有多语言通知能力。

## 新增功能约定

1. 使用现有 `$t`、路由 i18nKey 和 App.I18n.Schema，同步三份资源；不引入第二套 i18n 框架。
2. 菜单、按钮、表单、校验、状态、空态、导出表头和提示均检查翻译。无法确认的正式译文标记待翻译并在交付中说明。
3. 需要随语言变化的表格列、选项等放入 computed 或现有响应式机制；一次性求值可能导致切换后仍显示旧语言。
4. 内部字段、状态、权限编码保持语言中立，展示才翻译；不使用译文判断业务逻辑。
5. 新后端异常优先稳定错误码／结构化参数，保持现有 code/msg/data 兼容；不在局部任务中重构所有旧消息。
6. 用户维护的名称翻译与界面翻译分开评估；新增多语言字段须核对 API、导入导出、搜索、唯一键和外部同步。
7. 涉及金额／日期时复用适合该业务的现有格式化入口；若缺统一策略，先明确语言、时区、币种及精度，不默认采用浏览器或服务器本地值。

已确认的国际化技术债汇总于[可靠性清单](reliability.md)，本轮没有修改资源或业务代码。
