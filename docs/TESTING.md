# 测试与验收

本项目包含本地自动化检查和真实页面手动验收。自动检查可覆盖受控词典与 DOM 夹具中的回归，但不能证明脚本已通过 Tampermonkey 在 OpenAI Platform 的所有页面和账户状态中验收。

## 本地自动化检查

需要 Node.js 22 或更高版本（见 `package.json` 的 `engines` 字段）；项目脚本只使用 Node.js 内置功能，无需安装第三方 npm 依赖。在仓库根目录运行：

```bash
npm run build
npm run check
npm test
```

构建检查可单独运行：

```bash
node scripts/build.cjs --check
```

`npm run check` 验证合并后的词典、重复或冲突条目、发行文件、受保护的脚本元数据、运行时域名和 JavaScript 语法。`npm test` 使用 Node.js 内置测试运行器，覆盖词典合并和校验、动态文案翻译、标题写入次数与域名限制；它不会启动浏览器，也不会执行 `tests/browser.html` 中的 DOM 断言。两者不启动真实平台。仅修改文档时，可用 `npm run build:check` 只读检查发行文件一致性。需要在浏览器中调试 DOM 夹具时，运行：

```bash
node scripts/serve-tests.cjs
```

然后打开终端输出的夹具地址（默认形如 `http://127.0.0.1:4173/prompts/pmpt_test`）。端口被占用时，可运行 `node scripts/serve-tests.cjs --port 4174`，或使用 `--port 0` 让系统分配可用端口，以终端实际输出的地址为准。页面会显示翻译结果、受保护内容和动态 DOM 更新的断言结果。服务仅在内存中替换所提供脚本的运行时域名，以便本地执行，不改写发行文件。夹具不连接 OpenAI Platform，也不代替真实页面验收。

## 持续集成范围

`.github/workflows/check.yml` 在推送和拉取请求时运行 `npm run check`、`npm test` 以及 Python JSON 解析检查。CI 直接检查现有发行文件，不会重新构建；修改词典、运行时或元数据后，应在本地构建并一并提交生成文件。CI 不启动 DOM 浏览器夹具，也不执行 Tampermonkey 真实页面验收，这两项需要单独记录结果。

## Tampermonkey 手动验收

在测试浏览器配置中安装本地生成的 `OpenAIPlatformTranslate.user.js`，打开或刷新 `https://platform.openai.com/`。覆盖本次改动触及的页面、菜单、对话框和表单；对于异步区域，等待数据加载并检查更新后的内容。通过站内导航前往其他页面，再返回或重复操作，确认单页导航与重复 DOM 更新仍正常。

重点检查以下行为：

- 可见界面文案、页面标题以及 `aria-label`、`title`、`placeholder`、`alt` 等界面属性是否正确翻译。
- 动态插入的文本和属性是否会更新；重复观察或标题变化不会造成持续的 DOM 修改循环。
- 已识别的代码块、代码编辑器、可编辑区域、用户消息和输入内容保持原样。
- 已识别上下文中的模型和工具名称、资源名称、API 参数、URL、用户创建的名称以及密钥保持原样。
- 页面导航、搜索、输入、复制和其他受影响的交互仍可使用。

保护规则依赖当前的 DOM 标记、列名、控件关联和路径模式；平台新结构或自定义字段需要单独检查，不能从已覆盖样例推断为全部受保护。报告问题时请附上浏览器与页面位置、复现步骤、实际结果和预期结果。分享截图或页面片段前，请删除个人资料、请求内容、API 密钥和其他敏感数据。分别记录自动化结果与真实页面验收结果。

## 发布前记录

如需向贡献者或用户说明验收状态，请清楚区分本地 Node.js 检查、本地 DOM 夹具和 Tampermonkey 真实页面检查；只报告实际完成的检查。
