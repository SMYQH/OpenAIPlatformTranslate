# Repository Guidelines

## Project Overview and Structure

This repository provides a Tampermonkey userscript that translates observed OpenAI Platform interface text from English into Simplified Chinese. It changes browser UI text, not platform API behavior or server-side language settings.

- `json/*.json`: canonical translation dictionaries grouped by page or purpose. The build merges them in filename order; identical mappings across files are allowed, conflicting values and duplicate keys within a file are rejected.
- `src/runtime.js`: translation rules, contextual protection, DOM traversal, title translation, and batched mutation handling. The build supplies `TEXT`; do not define the dictionary here.
- `src/userscript-header.txt`: canonical userscript installation metadata.
- `OpenAIPlatformTranslate.user.js`: generated, installable release bundle. Edit sources and rebuild; never edit this file directly.
- `scripts/build.cjs`, `scripts/check.cjs`: dependency-free build and consistency checks.
- `scripts/serve-tests.cjs`, `tests/browser.html`: local browser DOM regression fixture.
- `tests/translation.test.cjs`: Node.js dictionary and translation/title regression tests.
- `.github/workflows/check.yml`: CI checks on pushes and pull requests.
- `README.md`, `CONTRIBUTING.md`, `docs/TESTING.md`, `CHANGELOG.md`: installation, contribution, validation, and release documentation.

## Everyday Workflow

Start with `git status --short` and inspect relevant diffs, including staged changes and untracked files. Preserve existing user changes and keep edits scoped to the request. Use `rg --files` to locate files and `rg -n` to trace symbols, callers, and tests. Read applicable `AGENTS.md` files before editing.

For translation changes, trace the dictionary entry through `translate`, contextual protection, text/attribute updates, and affected fixtures. Reuse existing rules and helpers. Make reasonable, reversible implementation choices; ask for clarification only when missing information materially changes behavior or scope.

## Build and Validation Commands

Use Node.js 22 or newer, as specified in `package.json`. Project scripts use only Node.js built-ins; no third-party npm dependencies need installation. Run commands from the repository root:

```sh
npm run build
npm run check
npm test
```

- `npm run build`: regenerate the release bundle after dictionary, runtime, or metadata changes.
- `npm run build:check`: verify the bundle matches sources without writing files; equivalent to `node scripts/build.cjs --check`.
- `npm run check`: validate dictionaries, embedded mappings, bundle freshness, protected metadata, runtime origin, and generated JavaScript syntax.
- `npm test`: run the Node.js regression suite; it does not launch a browser or execute the browser DOM fixture.
- `node scripts/serve-tests.cjs`: serve the browser fixture on loopback. Open the printed `/prompts/pmpt_test` URL; the default port is 4173. Use `--port 4174` for another port or `--port 0` for an available port.

CI runs `npm run check`, `npm test`, and a Python JSON parsing check. It checks the existing bundle rather than rebuilding it, so include the rebuilt bundle with source changes. CI does not run browser or Tampermonkey acceptance.

For documentation-only changes, use the read-only consistency check when validating the bundle. Before handing off, inspect `git diff --check`, the final diff, and `git status --short`; review edited untracked files separately because ordinary Git diffs omit them. Report actual validation results and any blockers.

## Coding and Translation Conventions

Follow `.editorconfig`: UTF-8, LF line endings, two-space indentation, and a final newline. JavaScript uses double quotes, semicolons, and strict mode; the generated bundle wraps the runtime in an IIFE. Prefer `const`, use `let` only for reassignment, camelCase for functions and variables, and uppercase names for shared constants such as `TEXT`, `CONFIG`, and `ATTRIBUTES`. There is no configured formatter or linter.

Translation keys must match observed English UI text; values use Simplified Chinese. Use “API 请求” consistently, including sentence-level, plural, and capitalization variants. Preserve interpolation values, technical identifiers, numbers, and meaning. Check contextual rules before adding a global mapping for text whose meaning varies by page.

Preserve model and tool names, API parameters, URLs, code, user input/messages, resource names, and secrets. Protection depends on recognized DOM markers, table columns, control/popup associations, and resource paths; new platform structures need explicit verification. Extend `CONFIG` based on observed DOM and focused regression fixtures. Respect `translate="no"` and `data-openai-translate="ignore"`; keep UI hints translatable while protecting editor contents.

Keep `CONFIG.origin` aligned with the sole `@match https://platform.openai.com/*`. Preserve `@namespace platform.openai.com`, `@run-at document-idle`, and `@grant none`; do not add broader include rules or scope-changing exclusions. Never commit credentials, `.env` files, or private account data.

## Browser and Real-Page Acceptance

Add focused regression coverage for reproducible runtime behavior changes. Use the browser fixture to check text/attribute translation, protected content, dynamic insertion, and mutation convergence. Its server changes only the served bundle's origin in memory to enable local testing; it does not modify the release file or connect to OpenAI Platform.

For real-page acceptance, install the locally generated bundle in Tampermonkey and refresh `https://platform.openai.com/`. Check affected pages, menus, dropdowns, dialogs, placeholders, tooltips, and asynchronously inserted labels. Repeat interactions and in-app navigation; verify protected content remains unchanged and DOM updates settle. Follow `docs/TESTING.md` and report Node.js checks, browser fixture results, and real-page acceptance separately. Passing local checks does not establish Tampermonkey acceptance; report inaccessible or untested flows explicitly.

## Documentation, Commits, and Pull Requests

Keep this agent guide in English. Maintain other Markdown documentation in Chinese unless the user requests another language; translation dictionaries retain English source keys and Simplified Chinese values.

Update documentation alongside behavior changes: `README.md` for installation, features, and commands; `CONTRIBUTING.md` for contributor rules; `docs/TESTING.md` for check coverage and acceptance steps; and `CHANGELOG.md` for user-facing release changes. Keep paths, commands, and validation claims aligned with the implementation. When changing a release version, keep `package.json`, the source header, and the release notes consistent, then rebuild.

Use Chinese Conventional Commit subjects and Chinese pull request titles/descriptions, for example `fix: 修复设置页面翻译`. Describe affected pages, behavior changes, related issues, and checks actually performed. Include redacted before/after screenshots for visible translation changes. Do not include account information, request contents, or secrets in screenshots or reports.

## Current Library Documentation

Use Context7 for library, framework, SDK, API, CLI, or cloud-service questions involving syntax, configuration, migrations, setup, or library-specific debugging. It is unnecessary for repository inventory, code review, business-logic debugging, or refactoring that does not require library documentation.

Prefer the `ctx7` CLI: first run `npx ctx7@latest library <name> "<focused question>"`, choose the most relevant official match by name, reputation, snippet coverage, and benchmark score, then run `npx ctx7@latest docs <libraryId> "<focused question>"`. Skip resolution only when an exact `/org/project` ID is supplied; use a returned version-specific ID when needed. Limit requests to three commands per question, keep distinct concepts focused, and never include sensitive data in queries.

Context7 MCP is an alternative: call `resolve-library-id` before `query-docs`. Run CLI requests with network access under the active execution policy. If quota limits block lookup, report them and suggest `npx ctx7@latest login` or `CONTEXT7_API_KEY`. If Context7 is unavailable, say so and use official documentation; do not silently substitute remembered API details.
