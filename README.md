# OpenAI Platform 简体中文翻译

这是一个面向 OpenAI Platform 的 Tampermonkey 用户脚本，为平台界面提供简体中文翻译。

## 使用指南

1. 在浏览器中安装 Tampermonkey。
2. 点击 [最新的独立用户脚本](https://raw.githubusercontent.com/SMYQH/OpenAIPlatformTranslate/main/OpenAIPlatformTranslate.user.js) 。
3. 打开或刷新 [OpenAI Platform](https://platform.openai.com/)。

需要测试工作区版本时，可先运行 `npm run build`，再在 Tampermonkey 新建脚本并粘贴保存 `OpenAIPlatformTranslate.user.js` 的内容。

## 功能范围

- 将词典中收录的平台英文界面翻译为简体中文，并处理少量明确格式的计数、日期和上下文文案。
- 翻译可访问名称、提示、占位文字等界面属性，并观察动态插入或更新的页面内容。
- 按当前识别到的代码、编辑器、可编辑区域和资源上下文应用保护规则；覆盖资源名称、模型及工具名称、API 参数、URL、用户输入和密钥等已识别内容。
- 通过 `@match` 限定匹配域名，不改变平台的服务端语言或 API 行为。

这些保护依赖已知页面结构、标记和上下文规则；平台新增结构或未识别的自定义字段仍需检查，不能假设都已正确分类。OpenAI Platform 会持续更新，词条覆盖也会随页面变化。自动化检查和本地浏览器夹具用于发现回归；它们不能替代在真实平台页面中使用 Tampermonkey 的验收。

## 项目结构

| 路径 | 用途 |
| --- | --- |
| `json/*.json` | 按页面和用途组织的规范翻译词典 |
| `src/runtime.js` | DOM 翻译、上下文保护与动态更新处理逻辑 |
| `src/userscript-header.txt` | 用户脚本安装元数据 |
| `OpenAIPlatformTranslate.user.js` | 生成的单文件发行版，可直接安装 |
| `scripts/` | 构建、检查和本地测试夹具服务工具 |
| `tests/` | 词典、运行时及 DOM 行为的本地自动化检查 |
| `docs/TESTING.md` | 自动检查和 Tampermonkey 手动验收说明 |

发行文件由词典、运行时和元数据构建而成。开发时请编辑源文件，再运行构建命令；不要手工修改生成文件。

## 开发检查

需要 Node.js 22 或更高版本。

```bash
npm run build
npm run check
npm test
```

如需分别运行脚本：

```bash
node scripts/build.cjs
node scripts/build.cjs --check
node scripts/check.cjs
# npm 别名：npm run build:check 和 npm run check
```

`npm run build` 会生成单文件发行版；`npm run build:check`（或 `node scripts/build.cjs --check`）检查发行文件是否与源文件一致；`npm run check` 检查词典、生成文件、脚本元数据和语法；`npm test` 运行基于 Node.js 内置测试运行器的回归用例。更多手动验收步骤见[测试说明](docs/TESTING.md)。

## 贡献与许可

请先阅读[贡献指南](CONTRIBUTING.md)，并遵循 [AGPL-3.0 许可](LICENSE)。

本项目的词典组织和开发维护方式参考了 [maboloshi/github-chinese](https://github.com/maboloshi/github-chinese) 的公开实践（感谢 [maboloshi](https://github.com/maboloshi) 及其它的贡献者)。
