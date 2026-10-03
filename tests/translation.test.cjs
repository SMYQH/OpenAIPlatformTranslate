"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { loadTranslations, mergeTranslationSources, parseTranslationJson } = require("../scripts/build.cjs");

const root = path.resolve(__dirname, "..");

function loadRuntime(initialTitle = "GPT-6 Sol release notes", origin = "https://platform.openai.com") {
  const runtime = fs.readFileSync(path.join(root, "src", "runtime.js"), "utf8");
  const writes = { title: 0 };
  let title = initialTitle;
  const document = {
    readyState: "loading",
    get title() {
      return title;
    },
    set title(value) {
      writes.title += 1;
      title = value;
    },
    addEventListener() {}
  };
  const context = {
    TEXT: Object.freeze(loadTranslations()),
    document,
    location: { origin }
  };
  const source = `${runtime}\nglobalThis.__translationTestApi = { translate, translateTitle };`;
  vm.runInNewContext(source, context, { filename: "src/runtime.js" });
  return { api: context.__translationTestApi, document, writes };
}

test("merges repeated identical mappings and rejects conflicting values", () => {
  const merged = mergeTranslationSources([
    { filename: "first.json", translations: { Search: "搜索" } },
    { filename: "second.json", translations: { Search: "搜索", Home: "首页" } }
  ]);
  assert.deepEqual(merged, { Search: "搜索", Home: "首页" });
  assert.throws(
    () => mergeTranslationSources([
      { filename: "first.json", translations: { Search: "搜索" } },
      { filename: "second.json", translations: { Search: "查找" } }
    ]),
    /Conflicting translation.*Search.*second\.json.*first\.json/u
  );
});

test("rejects duplicate JSON keys, including escaped duplicates", () => {
  assert.throws(
    () => parseTranslationJson('{"Search":"搜索","Search":"查找"}', "duplicate.json"),
    /duplicate JSON key/iu
  );
  assert.throws(
    () => parseTranslationJson('{"Search":"搜索","\\u0053earch":"查找"}', "escaped-duplicate.json"),
    /duplicate JSON key/iu
  );
});

test("rejects invalid translation dictionary shapes and values", () => {
  for (const source of ["[]", "null", "\"translations\""]) {
    assert.throws(() => parseTranslationJson(source, "invalid-shape.json"), /JSON object of translations/u);
  }
  for (const source of [
    '{"Search":""}',
    '{"Search":"   "}',
    '{"Search":null}',
    '{"Search":7}'
  ]) {
    assert.throws(() => parseTranslationJson(source, "invalid-value.json"), /non-empty strings/u);
  }
});

test("dynamic UI labels translate while unknown values remain unchanged", () => {
  const { api } = loadRuntime();
  assert.equal(api.translate("1,024 results"), "1,024 项结果");
  assert.equal(api.translate("Step 2 of 5"), "第 2 步，共 5 步");
  assert.equal(api.translate("3 days ago"), "3天前");
  assert.equal(api.translate("OCTOBER spend"), "10 月支出");
  assert.equal(api.translate("  Play Ripple preview  "), "试听 Ripple 语音");
  assert.equal(api.translate("GPT-6.1-custom"), null);
});

test("self-mapped titles are never assigned and translated titles are assigned once", () => {
  const selfMappedTitles = [
    "Agents",
    "Live",
    "Realtime",
    "Agents - OpenAI API",
    "Codex - OpenAI API",
    "Live Playground - OpenAI API",
    "Realtime Playground - OpenAI API"
  ];

  for (const title of selfMappedTitles) {
    const { api, document, writes } = loadRuntime(title);
    api.translateTitle();
    api.translateTitle();
    assert.equal(document.title, title);
    assert.equal(writes.title, 0, `${title} should not trigger a title write.`);
  }

  const { api, document, writes } = loadRuntime("Projects - OpenAI API");
  api.translateTitle();
  api.translateTitle();
  assert.equal(document.title, "项目 - OpenAI API");
  assert.equal(writes.title, 1);
});

test("title translation remains restricted to the platform origin", () => {
  const { api, document, writes } = loadRuntime("Projects - OpenAI API", "https://example.com");
  api.translateTitle();
  assert.equal(document.title, "Projects - OpenAI API");
  assert.equal(writes.title, 0);
});
