// 界面提示与页面数据使用不同规则；所有规则都随单文件脚本发布。
const CONFIG = Object.freeze({
  origin: "https://platform.openai.com",
  attributes: ["aria-label", "title", "placeholder", "alt", "data-placeholder"],
  contentSelector: "script, style, noscript, pre, code, textarea, input, [contenteditable]:not([contenteditable='false']), [role='code'], [role='textbox'], [data-code], .cm-editor, .monaco-editor, [data-message-author-role], [data-message-content], [data-user-content], .prose, .markdown, .markdown-body, .tokenizer-tkn",
  ignoredSelector: "[translate='no'], [data-openai-translate='ignore']",
  resourceSelector: "[data-resource-name], [data-resource-id], [data-project-id], [data-organization-id], [data-secret-value]",
  resourceColumns: new Set([
    "name", "agent name", "template name", "project name", "file name", "filename", "role name",
    "secret", "secret key", "secret value", "description", "message", "input", "output", "value",
    "名称", "agent 名称", "模板名称", "项目名称", "文件名称", "角色名称", "密钥", "密钥值", "说明", "消息", "输入", "输出", "值"
  ]),
  resourcePath: /\/(?:prompts\/pmpt_|agents\/agent_|(?:files\/file[-_])|(?:vector[_-]stores\/vs_)|skills\/skill_|projects\/proj_)[^/]+(?:\/|$)/,
  resourceDetailPath: /\/(?:prompts\/pmpt_|agents\/agent_|(?:files\/file[-_])|(?:vector[_-]stores\/vs_)|skills\/skill_|projects\/proj_)[^/]+\/?$/,
  resourceControlLabel: /^(?:(?:select|choose|switch|current|active|search|filter|attach)(?: an?| your| existing)?\s+)?(?:projects?|organizations?|agents?|environment templates?|vector stores?|prompts?|files?|skills?|secrets?|datasets?|templates?|models?|tools?|voices?|(?:mcp\s+)?servers?)(?:\s+(?:selector|switcher|selection))?(?:\.\.\.|…)?$|^(?:(?:选择|切换|当前|筛选|搜索|关联|添加|附加)(?:一个|你的|的|现有)?\s*)?(?:项目|组织|Agent|环境模板|Vector Store|Prompt|文件|Skill|密钥|数据集|模板|模型|工具|语音|(?:MCP\s*)?服务器)(?:选择器)?(?:…)?$/i
});
const ATTRIBUTES = CONFIG.attributes;
const RESOURCE_MENU_ACTIONS = new Set([
  "Create project", "Create a new project", "Manage projects", "Organization settings", "Profile settings",
  "Create environment template", "Create agent", "New agent", "Create vector store", "Create a vector store",
  "New prompt", "Upload file", "Upload skill", "Upload a skill", "Create secret", "Create dataset"
].flatMap((value) => [value, TEXT[value]]).filter(Boolean));
const protectionContext = {
  controls: new Set(),
  popups: new Set(),
  tableHeaders: new WeakMap()
};
const dateUnits = {
  second: "秒",
  minute: "分钟",
  hour: "小时",
  day: "天",
  week: "周",
  month: "个月",
  year: "年"
};
const months = {
  Jan: "1 月", Feb: "2 月", Mar: "3 月", Apr: "4 月", May: "5 月", Jun: "6 月",
  Jul: "7 月", Aug: "8 月", Sep: "9 月", Oct: "10 月", Nov: "11 月", Dec: "12 月"
};
const voices = [
  ["Ripple", "Warm and conversational", "English", "Australian influenced", "Male"],
  ["Vesper", "Clear and direct", "English", "British influenced", "Male"],
  ["Willow", "Expressive and bright", "English", "Irish influenced", "Female"],
  ["Stone", "Calm and precise", "English", "Irish influenced", "Male"],
  ["Meridian", "Grounded and measured", "English", "North American influenced", "Male"],
  ["Gleam", "Warm and conversational", "English", "North American influenced", "Female"],
  ["Bossa", "Clear and direct", "Portuguese", "Brazilian influenced", "Female"],
  ["Tempo", "Grounded and measured", "Portuguese", "Brazilian influenced", "Male"],
  ["Cedar", "Open and upbeat", "English", "North American influenced", "Male"],
  ["Marin", "Animated and earnest", "English", "North American influenced", "Female"],
  ["Quartz", "Warm and conversational", "English", "Australian influenced", "Female"],
  ["Alloy", "Balanced and clear", "English", "North American influenced", "Male"],
  ["Ash", "Savvy and relaxed", "English", "North American influenced", "Male"],
  ["Ballad", "Cheerful and candid", "English", "North American influenced", "Male"],
  ["Coral", "Easygoing and versatile", "English", "North American influenced", "Female"],
  ["Echo", "Bright and inquisitive", "English", "North American influenced", "Male"],
  ["Sage", "Confident and optimistic", "English", "North American influenced", "Female"],
  ["Shimmer", "Composed and direct", "English", "North American influenced", "Female"],
  ["Verse", "Calm and affirming", "English", "North American influenced", "Male"],
  ["Beacon", "Clear and personable", "English", "Filipino influenced", "Male"],
  ["Delta", "Warm and easygoing", "English", "Southern U.S. influenced", "Female"],
  ["Cinder", "Steady and grounded", "English", "Southern U.S. influenced", "Male"]
];

function translate(value) {
  if (!value || !/[A-Za-z]/.test(value)) return null;
  if (Object.prototype.hasOwnProperty.call(TEXT, value)) return TEXT[value];
  const normalized = value.replace(/\s+/g, " ").trim();
  if (Object.prototype.hasOwnProperty.call(TEXT, normalized)) return TEXT[normalized];

  // 仅处理明确的界面格式；插入的名称、模型 ID 和技术单位原样保留。
  const results = normalized.match(/^([\d,]+) results?$/);
  if (results) return `${results[1]} 项结果`;
  const permissions = normalized.match(/^([\d,]+) selected permissions?$/);
  if (permissions) return `已选 ${permissions[1]} 项权限`;
  const rows = normalized.match(/^([\d,]+) rows?$/);
  if (rows) return `${rows[1]} 行`;
  const characters = normalized.match(/^(\d+)\s*\/\s*(\d+) characters$/);
  if (characters) return `${characters[1]}/${characters[2]} 个字符`;
  const step = normalized.match(/^Step (\d+)\s*(?:\/|of)\s*(\d+)$/);
  if (step) return `第 ${step[1]} 步，共 ${step[2]} 步`;
  const tier = normalized.match(/^Tier (\d+)( \(your tier\))?$/);
  if (tier) return `第 ${tier[1]} 级${tier[2] ? "（当前等级）" : ""}`;
  const servers = normalized.match(/^Recommended MCP servers:\s*(.+)$/);
  if (servers) return `推荐 MCP 服务器：${servers[1]}`;
  const details = normalized.match(/^View details for (.+)$/);
  if (details) return `查看 ${details[1]} 的详情`;
  const modelLimit = normalized.match(/^Edit ([\w.-]+) limit$/);
  if (modelLimit) return `编辑 ${modelLimit[1]} 的限制`;
  const storageHours = normalized.match(/^([\d.,]+)\s+(KB|MB|GB) hours$/);
  if (storageHours) return `${storageHours[1]} ${storageHours[2]}·小时`;
  const deletedStore = normalized.match(/^Vector store "([^"]+)" deleted$/);
  if (deletedStore) return `Vector Store "${deletedStore[1]}" 已删除`;

  for (const [name, trait, language, accent, gender] of voices) {
    if (normalized === `${name} ${trait} ${language} ${accent} ${gender}`) {
      return `${name} · ${TEXT[trait]} · ${TEXT[language]} · ${TEXT[accent]} · ${TEXT[gender]}`;
    }
  }

  const preview = normalized.match(/^Play ([\w-]+) preview$/i);
  if (preview) return `试听 ${preview[1]} 语音`;

  const relativeDate = normalized.match(/^(\d+)\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago$/i);
  if (relativeDate) {
    const unit = relativeDate[2].toLowerCase().replace(/s$/, "");
    return `${relativeDate[1]}${dateUnits[unit]}前`;
  }

  const shortDate = normalized.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/);
  if (shortDate) return `${months[shortDate[1]]}${Number(shortDate[2])} 日`;

  const monthSpend = normalized.match(/^(January|February|March|April|May|June|July|August|September|October|November|December) spend$/i);
  if (monthSpend) {
    const month = monthSpend[1][0].toUpperCase() + monthSpend[1].slice(1, 3).toLowerCase();
    return `${months[month]}支出`;
  }

  const cardAction = normalized.match(/^(.+?)\s+(top|bottom) action$/i);
  if (cardAction) {
    const subject = cardAction[1] === "Audio & Voice"
      ? "音频与语音"
      : cardAction[1] === "Image"
        ? "图像"
        : cardAction[1];
    const position = cardAction[2].toLowerCase() === "top" ? "上方" : "下方";
    return `${subject} ${position}操作`;
  }

  const updateLabel = normalized.match(/^Dismiss update:\s*(.+)$/i);
  if (updateLabel) return `关闭更新：${TEXT[updateLabel[1]] || updateLabel[1]}`;

  return null;
}

function isPlatformPage() {
  return location.origin === CONFIG.origin;
}

function elementFor(node) {
  return node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
}

function normalizeLabel(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function isResourceControl(element) {
  const labels = [element.getAttribute("aria-label"), element.getAttribute("title")];
  for (const id of (element.getAttribute("aria-labelledby") || "").split(/\s+/)) {
    if (id) labels.push(document.getElementById(id)?.textContent);
  }
  for (const label of element.labels || []) labels.push(label.textContent);
  // 没有辅助标签的默认项目切换器也必须保留其真实名称。
  if (normalizeLabel(element.textContent) === "Default project") return true;
  return labels.some((label) => CONFIG.resourceControlLabel.test(normalizeLabel(label)));
}

function refreshProtectionContext() {
  protectionContext.controls.clear();
  protectionContext.popups.clear();
  protectionContext.tableHeaders = new WeakMap();
  for (const control of document.querySelectorAll("[role='combobox'], [aria-haspopup='listbox'], [aria-haspopup='menu'], select")) {
    if (!isResourceControl(control)) continue;
    protectionContext.controls.add(control);
    for (const id of `${control.getAttribute("aria-controls") || ""} ${control.getAttribute("aria-owns") || ""}`.split(/\s+/)) {
      const popup = id && document.getElementById(id);
      if (popup) protectionContext.popups.add(popup);
    }
  }
  for (const popup of document.querySelectorAll("[role='listbox'], [role='menu']")) {
    for (const id of (popup.getAttribute("aria-labelledby") || "").split(/\s+/)) {
      if (id && protectionContext.controls.has(document.getElementById(id))) protectionContext.popups.add(popup);
    }
  }
}

function tableColumn(node) {
  const cell = elementFor(node)?.closest("td, [role='cell'], [role='gridcell']");
  const table = cell?.closest("table, [role='table'], [role='grid']");
  if (!table) return "";
  let headers = protectionContext.tableHeaders.get(table);
  if (!headers) {
    headers = [...table.querySelectorAll("thead th, [role='columnheader']")].filter((header) => header.closest("table, [role='table'], [role='grid']") === table);
    protectionContext.tableHeaders.set(table, headers);
  }
  const explicitIndex = Number(cell.getAttribute("aria-colindex"));
  const index = explicitIndex > 0 ? explicitIndex - 1 : typeof cell.cellIndex === "number"
    ? cell.cellIndex : [...cell.parentElement.children].filter((child) => child.matches("td, th, [role='cell'], [role='gridcell']")).indexOf(cell);
  return normalizeLabel(headers[index]?.textContent);
}

function isResourceElement(element) {
  if (element.closest(CONFIG.resourceSelector)) return true;
  if (CONFIG.resourceColumns.has(tableColumn(element).toLowerCase())) return true;
  const anchor = element.closest("a[href]");
  if (anchor) {
    try {
      const target = new URL(anchor.getAttribute("href"), location.href);
      if (target.origin === location.origin && CONFIG.resourcePath.test(target.pathname)) return true;
    } catch {
      // 非 URL 的 href 不参与资源识别。
    }
  }
  if (element.closest("h1") && CONFIG.resourceDetailPath.test(location.pathname)) return true;
  for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
    if (protectionContext.controls.has(ancestor)) return true;
    if (protectionContext.popups.has(ancestor)) {
      // 保留搜索框和菜单操作，仅跳过实际资源选项。
      if (element.closest("[role='option'], option")) return true;
      const item = element.closest("[role='menuitem']");
      if (item && !RESOURCE_MENU_ACTIONS.has(normalizeLabel(item.textContent))) return true;
    }
  }
  return false;
}

function shouldSkip(node) {
  const element = elementFor(node);
  return !element || element.isContentEditable || Boolean(element.closest(`${CONFIG.contentSelector}, ${CONFIG.ignoredSelector}`)) || isResourceElement(element);
}

function translateInContext(value, node) {
  if (isResourceElement(elementFor(node))) return null;
  const column = tableColumn(node);
  if (value === "Never" && ["Last used", "LAST USED", "上次使用时间"].includes(column)) return "从未";
  if (value === "Default" && elementFor(node).closest("[role='radiogroup'], [role='radio']")) return "默认";
  return translate(value);
}

function translateTextNode(node) {
  if (node.nodeType !== Node.TEXT_NODE || shouldSkip(node)) return;
  const original = node.nodeValue;
  const leading = (original.match(/^\s*/) || [""])[0];
  const trailing = (original.match(/\s*$/) || [""])[0];
  const core = original.slice(leading.length, original.length - trailing.length);
  if (!core) return;
  const translated = translateInContext(core, node);
  if (translated !== null && translated !== core) node.nodeValue = `${leading}${translated}${trailing}`;
}

function translateElementAttributes(element) {
  if (element.closest(CONFIG.ignoredSelector)) return;
  const resourceProtected = isResourceElement(element);
  const contentProtected = shouldSkip(element);
  for (const attribute of ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue;
    const original = element.getAttribute(attribute);
    const isControlHint = protectionContext.controls.has(element) && ["aria-label", "placeholder"].includes(attribute) && CONFIG.resourceControlLabel.test(normalizeLabel(original));
    if (resourceProtected && !isControlHint) continue;
    // 编辑器根节点的占位提示是 UI；编辑器内部属性和用户内容保持原样。
    const isInputHint = (element.matches("input, textarea, [contenteditable]:not([contenteditable='false']), [role='textbox'], .cm-editor[data-placeholder], .monaco-editor[data-placeholder]") && ["placeholder", "data-placeholder", "aria-label"].includes(attribute)) || (element.matches("input, textarea") && attribute === "title");
    if (contentProtected && !isControlHint && (!isInputHint || element.parentElement?.closest(`${CONFIG.contentSelector}, ${CONFIG.ignoredSelector}`))) continue;
    const translated = translate(original);
    if (translated !== null && translated !== original) element.setAttribute(attribute, translated);
  }
}

function translateTree(root) {
  if (!isPlatformPage() || !root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateElementAttributes(root);
  if (shouldSkip(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE && shouldSkip(node)) {
        translateElementAttributes(node);
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
    else translateElementAttributes(node);
  }
}

function translateTitle() {
  if (!isPlatformPage()) return;
  const translated = translate(document.title);
  if (translated !== null && translated !== document.title) document.title = translated;
}

function start() {
  if (!isPlatformPage() || !document.body) return;
  refreshProtectionContext();
  translateTree(document.body);
  translateTitle();

  const pendingRoots = new Set();
  const pendingTextNodes = new Set();
  const pendingAttributeElements = new Set();
  let flushScheduled = false;

  function flushMutations() {
    flushScheduled = false;
    if (!isPlatformPage()) {
      pendingRoots.clear();
      pendingTextNodes.clear();
      pendingAttributeElements.clear();
      return;
    }

    const roots = [...pendingRoots];
    const textNodes = [...pendingTextNodes];
    const attributeElements = [...pendingAttributeElements];
    pendingRoots.clear();
    pendingTextNodes.clear();
    pendingAttributeElements.clear();

    refreshProtectionContext();

    const elementRoots = new Set(roots.filter((node) => node.nodeType === Node.ELEMENT_NODE));
    const coveredByAddedRoot = (node) => {
      let element = node.parentElement;
      while (element) {
        if (elementRoots.has(element)) return true;
        element = element.parentElement;
      }
      return false;
    };

    for (const root of roots) {
      if (!root.isConnected || coveredByAddedRoot(root)) continue;
      if (root.nodeType === Node.TEXT_NODE) translateTextNode(root);
      else if (root.nodeType === Node.ELEMENT_NODE) translateTree(root);
    }

    for (const node of textNodes) {
      if (node.isConnected && !coveredByAddedRoot(node)) translateTextNode(node);
    }
    for (const element of attributeElements) {
      if (element.isConnected && !coveredByAddedRoot(element)) translateElementAttributes(element);
    }
    translateTitle();
  }

  function scheduleMutationFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    requestAnimationFrame(flushMutations);
  }

  const observer = new MutationObserver((records) => {
    if (!isPlatformPage()) return;
    for (const record of records) {
      if (record.type === "characterData") {
        pendingTextNodes.add(record.target);
      } else if (record.type === "childList") {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) pendingRoots.add(node);
        }
      } else if (record.type === "attributes") {
        pendingAttributeElements.add(record.target);
      }
    }
    scheduleMutationFlush();
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
