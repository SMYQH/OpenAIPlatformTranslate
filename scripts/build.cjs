"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const JSON_DIR = path.join(ROOT, "json");
const HEADER_PATH = path.join(ROOT, "src", "userscript-header.txt");
const RUNTIME_PATH = path.join(ROOT, "src", "runtime.js");
const OUTPUT_PATH = path.join(ROOT, "OpenAIPlatformTranslate.user.js");
const DICTIONARY_START = "  // BEGIN GENERATED TRANSLATIONS";
const DICTIONARY_END = "  // END GENERATED TRANSLATIONS";

function normalizeLf(value) {
  return value.replace(/\r\n?/g, "\n");
}

function parseTranslationJson(text, filename) {
  const source = text.replace(/^\uFEFF/, "");
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filename}: ${error.message}`);
  }

  assertNoDuplicateJsonKeys(source, filename);

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${filename} must contain a JSON object of translations.`);
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (!key.trim()) throw new Error(`${filename} contains an empty translation key.`);
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`${filename} has an invalid value for ${JSON.stringify(key)}; translations must be non-empty strings.`);
    }
  }

  return parsed;
}

function assertNoDuplicateJsonKeys(source, filename) {
  let index = 0;

  function skipWhitespace() {
    while (/\s/.test(source[index] || "")) index += 1;
  }

  function readString() {
    const start = index;
    index += 1;
    while (index < source.length) {
      if (source[index] === "\\") {
        index += 2;
      } else if (source[index] === "\"") {
        index += 1;
        return JSON.parse(source.slice(start, index));
      } else {
        index += 1;
      }
    }
    throw new Error(`Invalid JSON string in ${filename}.`);
  }

  function parseValue(location) {
    skipWhitespace();
    const token = source[index];

    if (token === "{") {
      index += 1;
      skipWhitespace();
      const keys = new Set();
      if (source[index] === "}") {
        index += 1;
        return;
      }

      while (index < source.length) {
        skipWhitespace();
        const key = readString();
        if (keys.has(key)) {
          throw new Error(`${filename} contains duplicate JSON key ${JSON.stringify(key)} at ${location}.`);
        }
        keys.add(key);
        skipWhitespace();
        index += 1; // colon; JSON.parse above already validated the syntax.
        parseValue(`${location}.${key}`);
        skipWhitespace();
        if (source[index] === "}") {
          index += 1;
          return;
        }
        index += 1; // comma
      }
      return;
    }

    if (token === "[") {
      index += 1;
      skipWhitespace();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      let item = 0;
      while (index < source.length) {
        parseValue(`${location}[${item}]`);
        item += 1;
        skipWhitespace();
        if (source[index] === "]") {
          index += 1;
          return;
        }
        index += 1; // comma
      }
      return;
    }

    if (token === "\"") {
      readString();
      return;
    }

    while (index < source.length && !/[\s,\]}]/.test(source[index])) index += 1;
  }

  parseValue("$");
}

function loadTranslations() {
  const files = fs.readdirSync(JSON_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  if (files.length === 0) throw new Error("No translation JSON files were found in json/.");

  return mergeTranslationSources(files.map((filename) => ({
    filename,
    translations: parseTranslationJson(
      fs.readFileSync(path.join(JSON_DIR, filename), "utf8"),
      `json/${filename}`
    )
  })));
}

function mergeTranslationSources(sources) {
  const translations = new Map();
  const origins = new Map();
  for (const { filename, translations: fileTranslations } of sources) {
    for (const [key, value] of Object.entries(fileTranslations)) {
      if (translations.has(key)) {
        const previous = translations.get(key);
        if (previous !== value) {
          throw new Error(
            `Conflicting translation for ${JSON.stringify(key)} in ${filename} and ${origins.get(key)}.`
          );
        }
        continue;
      }
      translations.set(key, value);
      origins.set(key, filename);
    }
  }

  return Object.fromEntries(translations);
}

function readHeader() {
  const header = normalizeLf(fs.readFileSync(HEADER_PATH, "utf8")).trimEnd();
  return `${header}\n`;
}

function readRuntime() {
  const runtime = normalizeLf(fs.readFileSync(RUNTIME_PATH, "utf8")).trim();
  if (/\b(?:const|let|var)\s+TEXT\b/.test(runtime)) {
    throw new Error("src/runtime.js must not define TEXT; the dictionary is generated from json/*.json.");
  }
  if (!/\bfunction\s+translate\s*\(/.test(runtime)) {
    throw new Error("src/runtime.js is missing the translate(value) engine function.");
  }
  return runtime;
}

function indentBlock(value, spaces) {
  const prefix = " ".repeat(spaces);
  return value.split("\n").map((line) => line ? `${prefix}${line}` : "").join("\n");
}

function renderUserscript(translations = loadTranslations()) {
  const header = readHeader();
  const runtime = readRuntime();
  const dictionary = JSON.stringify(translations, null, 2).replace(/\n/g, "\n  ");

  return [
    header.trimEnd(),
    "",
    "(function () {",
    "  \"use strict\";",
    "",
    DICTIONARY_START,
    `  const TEXT = Object.freeze(${dictionary});`,
    DICTIONARY_END,
    "",
    indentBlock(runtime, 2),
    "})();",
    ""
  ].join("\n");
}

function checkGeneratedOutput() {
  const expected = renderUserscript();
  let actual;
  try {
    actual = normalizeLf(fs.readFileSync(OUTPUT_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Generated userscript is missing; run `npm run build`.");
    }
    throw error;
  }

  if (actual !== expected) {
    throw new Error("Generated userscript is stale; run `npm run build` and review the result.");
  }
}

function build({ check = false } = {}) {
  const translations = loadTranslations();
  const output = renderUserscript(translations);
  if (check) {
    let actual;
    try {
      actual = normalizeLf(fs.readFileSync(OUTPUT_PATH, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("Generated userscript is missing; run `npm run build`.");
      }
      throw error;
    }
    if (actual !== output) throw new Error("Generated userscript is stale; run `npm run build`.");
    console.log("Generated userscript is up to date.");
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(`Built ${path.relative(ROOT, OUTPUT_PATH)} from ${Object.keys(translations).length} translations.`);
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.some((arg) => arg !== "--check")) {
      throw new Error("Usage: node scripts/build.cjs [--check]");
    }
    build({ check: args.includes("--check") });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  OUTPUT_PATH,
  assertNoDuplicateJsonKeys,
  checkGeneratedOutput,
  loadTranslations,
  mergeTranslationSources,
  parseTranslationJson,
  renderUserscript
};
