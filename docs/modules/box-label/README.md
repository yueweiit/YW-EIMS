# 箱贴 Excel 与 PDF

[返回知识库](../../knowledge/README.md)。这是纯前端工具，位于 OA 菜单，但没有对应 Nest Controller、Prisma 模型或持久化箱贴记录。路由 `/oa/box-label` 使用 `eims:oa:box-label` 权限控制前端入口。

## 代码与业务流程

| 代码 | 职责 |
| --- | --- |
| [index.vue](../../../frontend/src/views/oa/box-label/index.vue) | 维护产品卡片列表、选择文件、替换导入结果、触发 PDF |
| [ProductCard.vue](../../../frontend/src/views/oa/box-label/modules/ProductCard.vue) | 单张卡片字段编辑 |
| [excel-importer.ts](../../../frontend/src/views/oa/box-label/modules/excel-importer.ts) | 识别中英文表头别名、忽略空行、返回 products／matchedColumns／skippedRows；下载模板 |
| [pdf-generator.ts](../../../frontend/src/views/oa/box-label/modules/pdf-generator.ts) | pdfmake 文档、字体／图片加载、二维码、逐产品分页导出 |
| [excel-workbook.ts](../../../frontend/src/utils/excel-workbook.ts) | 复用 ExcelJS／CSV 读取和下载 |

用户手动填写或导入 `.xlsx/.csv` → 更新内存列表 → 生成 PDF 下载。卡片至少保留一条；字段为日期／批次／英文名称、型号编码、规格／颜色、西语名称、箱号、数量、重量。空字段打印为 `-`，并不是后端强制完整性验证。

## 输出与扩展边界

- PDF 加载 `/fonts/SimHei.ttf` 和 `/images/THIS-SIDE-UP.png`，本地字体／图片缺失会影响导出；资源是否可从部署站点读取待运行验证。
- 每项独立分页，二维码内容为 modelCode；固定进口商、产地和中／英／西语标签在生成器中，不按 UI 语言完全变化。
- 数量和重量以输入文本处理，无数据库数值精度约束；该工具不是装箱单或库存扣减凭证。
- 当前没有后端 language 参数、保存草稿、历史打印或邮件通知链路。新增这些能力应单独分析权限、数据模型和审计，不把前端入口权限当成 API 保护。
- 界面提示使用 `$t`，新增表头和字段要同步三语言与导入别名。固定贸易标签是否允许翻译应先确认业务要求。

本轮未实际导入样本或渲染 PDF；格式、字体字形、页面溢出和大文件性能待后续授权验证。
