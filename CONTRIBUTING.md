# 贡献指南

感谢你帮助改进 OpenAI Platform 简体中文翻译。提交修改前，请先确认变更对应当前平台界面，并保持翻译范围清楚、可复核。

## 添加或修改词条

- 在 `json/` 中选择与页面或用途匹配的 JSON 文件。它们是运行时词典的规范来源。
- 键应忠实对应页面上观察到的英文文案；值使用简体中文，并延续项目既有术语，例如统一使用“API 请求”。
- 翻译时保留插值内容、数字、标点含义和技术标识。不要翻译模型、工具、资源名称、API 参数、URL、用户输入或密钥。
- 如果相同文案在不同页面含义不同，先检查运行时上下文规则，避免加入会误译其他页面的全局映射。
- 报告新词条时，请给出页面或菜单位置、原始英文和期望译文；截图应遮盖账号信息、令牌和其他敏感数据。

## 修改运行时

编辑 `src/runtime.js` 中的逻辑，并为可复现的 DOM 行为回归添加针对性覆盖。生成文件 `OpenAIPlatformTranslate.user.js` 由构建命令生成，不要直接编辑。元数据的权威来源是 `src/userscript-header.txt`。

请保持脚本限定在 OpenAI Platform 页面，保留 `@grant none`。翻译内容节点和界面属性时，应一并考虑代码块、可编辑区域、用户提供的数据和带有敏感内容的区域。

### 扩展保护规则

保护规则集中在 `src/runtime.js` 的 `CONFIG` 中，应依据实际页面 DOM 和回归夹具谨慎扩展：

- `contentSelector` 标识代码和编辑区域；`ignoredSelector` 支持 `translate="no"` 与 `data-openai-translate="ignore"` 两种显式跳过标记。需要明确保留某个元素时，可使用这些标记。
- `resourceSelector` 和 `resourceColumns` 识别带有资源标记或位于特定表格列中的值；`resourcePath` 与 `resourceDetailPath` 识别带有资源 ID 的页面路径。`resourceControlLabel` 只应列出已观察到的项目或组织切换、选择控件标签。
- 项目和组织控件会依据 `aria-label`、`title`、`aria-labelledby` 或原生 `<label>` 进行识别；关联弹出菜单通过控件的 `aria-controls`、`aria-owns` 和弹出菜单的 `aria-labelledby` 建立关联。
- 输入框、文本域或编辑器根节点上的界面占位提示仍可翻译；编辑器内部的用户内容及其属性继续受保护。

这些规则只覆盖当前识别出的标记、列名、控件标签与路径。平台的新结构和未识别的自定义字段不能被视为已受保护；扩展规则时要同时检查界面提示仍能翻译，并确认目标资源或用户内容未被改写。

## 本地验证

修改后运行：

```bash
npm run build
npm run check
npm test
```

提交前确认生成文件与源文件同步，并检查改动只包含相关源码、词典、测试和文档。自动化夹具不等于真实平台验收；涉及页面交互或导航的改动，应按[测试说明](docs/TESTING.md)在 Tampermonkey 中检查。

## 提交与问题反馈

提交标题和拉取请求标题、说明请使用中文，并采用 Conventional Commit 前缀，例如：`fix: 修复动态标题重复翻译`。说明受影响的页面、行为变化和本地验证结果。视觉变更可以附上脱敏后的前后截图。

请勿提交账号数据、密钥、`.env` 文件或其他私密信息。本项目依照仓库中的 [AGPL-3.0 许可](LICENSE) 发布；词典组织与项目维护方式参考 [maboloshi/github-chinese](https://github.com/maboloshi/github-chinese)，本项目的许可由本仓库 `LICENSE` 文件确定。
