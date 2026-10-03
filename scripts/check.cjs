"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { OUTPUT_PATH, checkGeneratedOutput, loadTranslations } = require("./build.cjs");

const PROTECTED_METADATA = {
  namespace: "platform.openai.com",
  match: "https://platform.openai.com/*",
  "run-at": "document-idle",
  grant: "none"
};

function metadataValues(source, name) {
  return [...source.matchAll(new RegExp(`^\\s*//\\s*@${name}\\s+(.+?)\\s*$`, "gm"))]
    .map((match) => match[1]);
}

function validateMetadata(source, label) {
  assert.ok(source.startsWith("// ==UserScript==\n"), `${label} must begin with a userscript metadata block.`);
  assert.ok(/^\/\/ ==\/UserScript==\s*$/m.test(source), `${label} must close its userscript metadata block.`);

  for (const [name, expected] of Object.entries(PROTECTED_METADATA)) {
    assert.deepEqual(metadataValues(source, name), [expected], `${label} must preserve @${name} ${expected}.`);
  }

  assert.deepEqual(metadataValues(source, "match"), [PROTECTED_METADATA.match], `${label} must target only the original platform origin.`);
  assert.equal(metadataValues(source, "include").length, 0, `${label} must not add broad @include rules.`);
  assert.equal(metadataValues(source, "exclude-match").length, 0, `${label} must not add scope-changing @exclude-match rules.`);
}

function readRuntimeConfig() {
  const runtime = fs.readFileSync(path.join(__dirname, "..", "src", "runtime.js"), "utf8");
  const context = {
    TEXT: Object.freeze(loadTranslations()),
    document: { readyState: "loading", addEventListener() {} },
    location: { origin: PROTECTED_METADATA.match.replace(/\/\*$/, "") }
  };
  vm.runInNewContext(`${runtime}\nglobalThis.__runtimeConfig = CONFIG;`, context, { filename: "src/runtime.js" });
  return context.__runtimeConfig;
}

function readGeneratedDictionary(source) {
  const start = source.indexOf("const TEXT = Object.freeze(");
  const endMarker = source.indexOf("// END GENERATED TRANSLATIONS", start);
  assert.notEqual(start, -1, "Generated userscript must contain its embedded TEXT dictionary.");
  assert.notEqual(endMarker, -1, "Generated userscript must close the generated dictionary section.");

  const jsonStart = start + "const TEXT = Object.freeze(".length;
  const close = source.lastIndexOf(");", endMarker);
  assert.ok(close >= jsonStart, "Generated userscript must contain valid dictionary JSON.");
  return JSON.parse(source.slice(jsonStart, close));
}

function runCheck() {
  const translations = loadTranslations();
  const output = fs.readFileSync(OUTPUT_PATH, "utf8").replace(/\r\n?/g, "\n");
  const headerEnd = output.indexOf("\n(function () {");
  assert.notEqual(headerEnd, -1, "Generated userscript must have a metadata header followed by its runtime.");
  validateMetadata(output.slice(0, headerEnd + 1), "Generated userscript");
  validateMetadata(fs.readFileSync(path.join(__dirname, "..", "src", "userscript-header.txt"), "utf8").replace(/\r\n?/g, "\n"), "Source header");
  assert.equal(readRuntimeConfig().origin, PROTECTED_METADATA.match.replace(/\/\*$/, ""), "Runtime CONFIG.origin must agree with the protected @match origin.");

  assert.deepEqual(readGeneratedDictionary(output), translations, "Embedded TEXT dictionary must match the merged JSON mappings.");
  checkGeneratedOutput();

  const syntax = spawnSync(process.execPath, ["--check", OUTPUT_PATH], { encoding: "utf8" });
  if (syntax.error) throw syntax.error;
  assert.equal(syntax.status, 0, `Generated userscript syntax check failed:\n${syntax.stderr || syntax.stdout}`);

  console.log(`Checks passed: ${Object.keys(translations).length} translations, protected metadata, dictionary consistency, and JavaScript syntax.`);
}

try {
  runCheck();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
