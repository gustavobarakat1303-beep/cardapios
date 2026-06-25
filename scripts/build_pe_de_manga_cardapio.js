const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "data", "cardapio_pe_de_manga.txt");
const LOGO_PATH = path.join(ROOT, "assets", "pe-de-manga-logo.png");
const OUT_DIR = path.join(ROOT, "output", "pdf");
const SCREEN_DIR = path.join(OUT_DIR, "screenshots");
const RENDER_DIR = path.join(OUT_DIR, "rendered");
const HTML_PATH = path.join(OUT_DIR, "pe_de_manga_cardapio_6p.html");
const PDF_PATH = path.join(OUT_DIR, "pe_de_manga_cardapio_6p.pdf");
const REPORT_PATH = path.join(OUT_DIR, "pe_de_manga_cardapio_6p_report.json");

const POPPLER_BIN =
  process.env.POPPLER_BIN ||
  "C:\\Users\\gusta\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\poppler\\Library\\bin";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const PAGE_PLAN = [
  ["Petiscos", "Porções", "Bruschettas", "Saladas", "Entradas Frias"],
  [
    "Pratos · Carnes",
    "Pratos · Mar",
    "Massas, Veganos e Vegetarianos",
    "Hambúrguer",
    "Sobremesa",
    "Menu Kids",
  ],
  ["Chopp", "Cervejas", "Carta de Drinks · Autorais", "Clássicos", "Outros Coquetéis"],
  ["Sugestões", "Moquetel", "Caipirinhas & Caipiroskas", "Doses"],
  ["Whisky", "Cachaças", "Licores", "Diversos", "Sangria e Clericot"],
  [
    "Carta de Vinhos · Tintos",
    "Carta de Vinhos · Brancos",
    "Carta de Vinhos · Rosé",
    "Carta de Vinhos · Taças",
  ],
];

const ITEM_DESCRIPTION_FIXES = new Map([
  ["Bolinho de Bacalhau", "Bacalhau desfiado com batata, alho, cebola e salsinha"],
  ["Pastel de Queijo", "Massa crocante de pastel com recheio de queijo derretido"],
  ["Casquinha de Siri", "Carne de siri temperada, cremosa e gratinada com queijo"],
  ["Coxinha de Bobó de Camarão", "Coxinha recheada com bobó de camarão, mandioca, leite de coco e toque de dendê"],
  ["Filé Aperitivo Queijo", "Iscas de filé mignon ao molho cremoso de queijos"],
  ["Polvo à Provençal", "Polvo macio grelhado no azeite com alho, salsinha e ervas"],
  ["Burrata", "Burrata cremosa com pesto de manjericão, tomate cereja e torradas"],
  ["Canapés de Carpaccio", "Canapés de carpaccio com mostarda, alcaparras e parmesão"],
]);

const ITEM_NAME_FIXES = new Map([
  ["Freixenet Spain Rosado", "Freixenet Italian Rosado"],
]);

const DIVERSOS_ORDER = [
  { name: "Sucos Naturais", from: "Sucos Naturais", desc: "Abacaxi, melancia, abacaxi com hortelã, laranja e limão-taiti" },
  { name: "Suco de Tomate Temperado", from: "Suco de Tomate Temperado", desc: "" },
  { name: "Pepsi", from: "Pepsi", desc: "" },
  { name: "Pepsi Black", from: "Pepsi Zero", desc: "" },
  { name: "Pepsi Twist", from: "Pepsi Twist", desc: "" },
  { name: "Guaraná Antarctica", from: "Guaraná Antarctica", desc: "" },
  { name: "Guaraná Antarctica Zero", from: "Guaraná Zero", desc: "" },
  { name: "Soda Limonada", from: "Soda Limonada", desc: "" },
  { name: "Soda Limonada Zero", from: "Soda Zero", desc: "" },
  { name: "Sukita", price: "10,00", desc: "" },
  { name: "Tônica", price: "10,00", desc: "" },
  { name: "Tônica Zero", price: "10,00", desc: "" },
  { name: "H2O Limão", from: "H2O Limão", desc: "" },
];

const ICONS = {
  default:
    '<svg viewBox="0 0 24 24"><path d="M4 13c5-8 12-9 16-8-1 6-5 11-13 12"/><path d="M4 20c4-6 9-9 16-15"/></svg>',
  food:
    '<svg viewBox="0 0 24 24"><path d="M7 2v20"/><path d="M4 2v7a3 3 0 0 0 6 0V2"/><path d="M17 2v20"/><path d="M15 2h4v10h-4z"/></svg>',
  bowl:
    '<svg viewBox="0 0 24 24"><path d="M4 10h16"/><path d="M6 10a6 6 0 0 0 12 0"/><path d="M8 6c1-2 3-2 4 0"/><path d="M12 6c1-2 3-2 4 0"/></svg>',
  meat:
    '<svg viewBox="0 0 24 24"><path d="M6 15c-3-3-1-8 3-8 2-4 9-3 10 2s-3 9-8 8c-1 3-4 3-5 1"/><path d="M8 16 4 20"/></svg>',
  fish:
    '<svg viewBox="0 0 24 24"><path d="M3 12s4-6 10-6 8 6 8 6-2 6-8 6-10-6-10-6z"/><path d="M3 12 1 9v6z"/><circle cx="15" cy="11" r="1"/></svg>',
  burger:
    '<svg viewBox="0 0 24 24"><path d="M4 11c1-5 15-5 16 0"/><path d="M4 13h16"/><path d="M5 17h14"/><path d="M7 20h10"/></svg>',
  drink:
    '<svg viewBox="0 0 24 24"><path d="M6 3h12l-5 7v8l4 2H7l4-2v-8z"/></svg>',
  beer:
    '<svg viewBox="0 0 24 24"><path d="M5 5h10v14H5z"/><path d="M15 8h2a3 3 0 0 1 0 6h-2"/><path d="M8 8v8"/></svg>',
  bottle:
    '<svg viewBox="0 0 24 24"><path d="M10 2h4v5l2 3v11H8V10l2-3z"/><path d="M10 7h4"/></svg>',
  wine:
    '<svg viewBox="0 0 24 24"><path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M12 13v8"/><path d="M8 21h8"/></svg>',
  glass:
    '<svg viewBox="0 0 24 24"><path d="M7 4h10l-1 15H8z"/><path d="M8 9h8"/></svg>',
  dessert:
    '<svg viewBox="0 0 24 24"><path d="M12 3 6 12h12z"/><path d="M8 12l2 8h4l2-8"/></svg>',
  star:
    '<svg viewBox="0 0 24 24"><path d="m12 3 3 6 6 1-4.5 4.5L17.5 21 12 18l-5.5 3 1-6.5L3 10l6-1z"/></svg>',
};

const SECTION_ICONS = {
  Petiscos: "food",
  Porções: "food",
  Bruschettas: "default",
  Saladas: "bowl",
  "Entradas Frias": "bowl",
  "Pratos · Carnes": "meat",
  "Pratos · Mar": "fish",
  "Massas, Veganos e Vegetarianos": "food",
  Hambúrguer: "burger",
  Sobremesa: "dessert",
  "Menu Kids": "star",
  Chopp: "beer",
  Cervejas: "beer",
  "Carta de Drinks · Autorais": "drink",
  Clássicos: "drink",
  "Outros Coquetéis": "drink",
  Sugestões: "drink",
  Moquetel: "glass",
  "Caipirinhas & Caipiroskas": "glass",
  Doses: "bottle",
  Whisky: "bottle",
  Cachaças: "bottle",
  Licores: "bottle",
  Diversos: "glass",
  "Sangria e Clericot": "drink",
  "Carta de Vinhos · Tintos": "wine",
  "Carta de Vinhos · Brancos": "wine",
  "Carta de Vinhos · Rosé": "wine",
  "Carta de Vinhos · Taças": "wine",
};

const SMALL_WORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "à",
  "às",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "com",
  "c/",
]);

function ensureDirs() {
  for (const dir of [OUT_DIR, SCREEN_DIR, RENDER_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeDash(value) {
  return value.replace(/[\u2010-\u2015\u2212]/g, "-");
}

function normalizeSpaces(value) {
  return value
    .replace(/\u00a0|\u202f/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(value) {
  return normalizeSpaces(normalizeDash(value));
}

function isDash(char) {
  return /[\u2010-\u2015-]/.test(char);
}

function splitTopLevelDashes(value) {
  const parts = [];
  let start = 0;
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    const previous = value[index - 1] || "";
    const next = value[index + 1] || "";
    if (depth === 0 && isDash(char) && /\s/.test(previous) && /\s/.test(next)) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
      while (value[start] && /\s/.test(value[start])) start += 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts.filter(Boolean).map(clean);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function smartTitle(value) {
  const preserve = new Map([
    ["ipa", "IPA"],
    ["h2o", "H2O"],
    ["red", "Red"],
    ["black", "Black"],
    ["johnnie", "Johnnie"],
    ["walker", "Walker"],
    ["bulleit", "Bulleit"],
    ["tanqueray", "Tanqueray"],
    ["absolut", "Absolut"],
    ["ciroc", "Ciroc"],
    ["licor", "Licor"],
  ]);

  return normalizeSpaces(value)
    .replace(/^Epírito\b/i, "Espírito")
    .split(" ")
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("pt-BR");
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      if (preserve.has(lower)) return preserve.get(lower);
      if (/^[A-Z0-9%]+$/.test(word) && word.length > 1) return word;
      return lower.replace(/^\p{L}/u, (char) => char.toLocaleUpperCase("pt-BR"));
    })
    .join(" ")
    .replace(/\bC\/\b/g, "c/");
}

function compactUnit(value) {
  return clean(value)
    .replace(/\b(\d+)\s*unidades?\b/gi, "$1 un.")
    .replace(/\b(\d+)\s*ml\b/gi, "$1 ml")
    .replace(/\b(\d+)\s*g\b/gi, "$1g")
    .replace(/\bvegana\s*-\s*/i, "vegana · ");
}

function extractNameDetails(name, desc) {
  let workingName = clean(name);
  let workingDesc = clean(desc || "");
  const subs = [];

  while (/\(([^()]+)\)\s*$/.test(workingName)) {
    const match = workingName.match(/\(([^()]+)\)\s*$/);
    const inside = compactUnit(match[1]);
    workingName = normalizeSpaces(workingName.slice(0, match.index));

    if (inside.length > 26 || inside.includes(",") || /sorvete|bolacha|chocolate/i.test(inside)) {
      workingDesc = workingDesc ? `${inside}. ${workingDesc}` : inside;
    } else {
      subs.unshift(inside);
    }
  }

  const trailingUnit = workingName.match(/\b(\d+(?:,\d+)?)\s*(ml|g)\s*$/i);
  if (trailingUnit) {
    subs.push(`${trailingUnit[1]} ${trailingUnit[2].toLowerCase()}`.replace(/\s+g$/, "g"));
    workingName = normalizeSpaces(workingName.slice(0, trailingUnit.index));
  }

  return {
    name: smartTitle(workingName),
    sub: subs.join(" · "),
    desc: workingDesc,
  };
}

function splitImplicitDescription(name, desc, sectionTitle) {
  const shouldSplit =
    sectionTitle.startsWith("Pratos") ||
    sectionTitle === "Massas, Veganos e Vegetarianos" ||
    sectionTitle === "Hambúrguer" ||
    sectionTitle === "Sobremesa" ||
    sectionTitle === "Menu Kids";

  if (!shouldSplit) return { name, desc };
  if (name.includes("(")) return { name, desc };

  const comma = name.match(/^(.{8,50}?),\s*(.+)$/);
  if (comma) {
    return {
      name: comma[1],
      desc: desc ? `${comma[2]}. ${desc}` : comma[2],
    };
  }

  if (desc) return { name, desc };

  const pattern = /^(.{8,46}?)\s+(ao|aos|à|às|com|c\/|no|na|servido|servida)\s+(.+)$/i;
  const match = name.match(pattern);
  if (!match) return { name, desc };

  return {
    name: match[1],
    desc: `${match[2]} ${match[3]}`.replace(/^c\//i, "c/"),
  };
}

function parseHeading(rawLine, state, sections) {
  const line = clean(rawLine);
  if (/^Pratos\b/i.test(line)) {
    state.context = "pratos";
    return;
  }
  if (/^Carta de Vinhos\b/i.test(line)) {
    state.context = "vinhos";
    return;
  }

  const heading = headingParts(line);
  if (state.context === "pratos") {
    if (/^Carnes$/i.test(heading.title)) {
      startSection(sections, "Pratos · Carnes", "Main Course · Meat");
      return;
    }
    if (/^Mar$/i.test(heading.title)) {
      startSection(sections, "Pratos · Mar", "Main Course · Seafood");
      return;
    }
    state.context = null;
  }

  if (state.context === "vinhos") {
    if (/^(Tintos|Brancos|Rosé|Taças)$/i.test(heading.title)) {
      startSection(sections, `Carta de Vinhos · ${heading.title}`, heading.tag);
      return;
    }
    state.context = null;
  }

  if (/^Carta de Drinks\s*-\s*Autori?ais$/i.test(line)) {
    startSection(sections, "Carta de Drinks · Autorais", "");
    state.context = null;
    return;
  }

  startSection(sections, heading.title, heading.tag);
  state.context = null;
}

function headingParts(line) {
  const parens = line.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (parens) {
    return { title: clean(parens[1]), tag: clean(parens[2]) };
  }

  const slash = line.match(/^(.*?)\s*\/\s*(.+)$/);
  if (slash) {
    return { title: clean(slash[1]), tag: clean(slash[2]) };
  }

  return { title: clean(line), tag: "" };
}

function startSection(sections, title, tag) {
  sections.push({
    title,
    tag: title === "Caipirinhas & Caipiroskas" ? "" : tag ? clean(tag) : "",
    icon: SECTION_ICONS[title] || "default",
    style: /Autorais|Sangria/i.test(title) ? "featured" : "standard",
    items: [],
  });
}

function applyItemFixes(item, subText) {
  if (ITEM_NAME_FIXES.has(item.name)) {
    item.name = ITEM_NAME_FIXES.get(item.name);
  }

  if (ITEM_DESCRIPTION_FIXES.has(item.name)) {
    const replacement = ITEM_DESCRIPTION_FIXES.get(item.name);
    item.desc = [subText, replacement].filter(Boolean).join(" · ");
  }

  return item;
}

function parseItemLine(rawLine, sectionTitle) {
  const priceMatch = rawLine.match(/^(.*?)[\s\u00a0]*[\u2010-\u2015-]\s*(\d{1,3},\d{2})\s*$/);
  if (!priceMatch) return null;

  const beforePrice = normalizeSpaces(priceMatch[1]);
  const price = priceMatch[2];
  const parts = splitTopLevelDashes(beforePrice);

  let name = parts[0] || "";
  let desc = parts.slice(1).join(" - ");

  if (parts.length >= 3 && /^Licor 43$/i.test(parts[0]) && parts[1].length <= 20) {
    name = `${parts[0]} · ${parts[1]}`;
    desc = parts.slice(2).join(" - ");
  }

  const implicit = splitImplicitDescription(name, desc, sectionTitle);
  const details = extractNameDetails(implicit.name, implicit.desc);

  const descPieces = [];
  const subText = details.sub ? compactUnit(details.sub) : "";
  const descText = details.desc ? clean(details.desc) : "";
  const descIsDuplicate =
    subText && descText && compactUnit(descText).toLocaleLowerCase("pt-BR") === subText.toLocaleLowerCase("pt-BR");
  if (subText) descPieces.push(subText);
  if (descText && !descIsDuplicate) descPieces.push(descText);

  return applyItemFixes({
    name: details.name,
    price,
    desc: descPieces.join(" · "),
  }, subText);
}

function applySectionFixes(sections) {
  for (const section of sections) {
    if (section.title === "Carta de Drinks · Autorais") {
      section.items = section.items.filter((item) => item.name !== "Forest");
    }

    if (section.title === "Diversos") {
      const existing = new Map(section.items.map((item) => [item.name, item]));
      section.items = DIVERSOS_ORDER.map((entry) => {
        const source = entry.from ? existing.get(entry.from) : null;
        return {
          name: entry.name,
          price: entry.price || source?.price || "10,00",
          desc: entry.desc,
        };
      });
    }
  }

  return sections;
}

function parseMenu() {
  const source = fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r/g, "");
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^dguests\.com\.br$/i.test(line));

  const sections = [];
  const state = { context: null };

  for (const line of lines) {
    if (/[\u2010-\u2015-]\s*\d{1,3},\d{2}\s*$/.test(line)) {
      if (!sections.length) startSection(sections, "Cardápio", "");
      const current = sections[sections.length - 1];
      const item = parseItemLine(line, current.title);
      if (item) current.items.push(item);
    } else {
      parseHeading(line, state, sections);
    }
  }

  return applySectionFixes(sections).filter((section) => section.items.length);
}

function sectionByTitle(sections) {
  return new Map(sections.map((section) => [section.title, section]));
}

function sectionHtml(section) {
  const itemClass = section.style === "featured" ? "item featured-item" : "item";
  const icon = ICONS[section.icon] || ICONS.default;
  const tag = section.tag ? `<span class="sh-tag">${escapeHtml(section.tag)}</span>` : "";
  const items = section.items
    .map(
      (item) => `
        <div class="${itemClass}">
          <div class="item-top">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-dots"></span>
            <span class="item-price">${escapeHtml(item.price)}</span>
          </div>
          ${item.desc ? `<div class="item-desc">${escapeHtml(item.desc)}</div>` : ""}
        </div>`,
    )
    .join("");

  return `
    <section class="section ${section.style}">
      <div class="sh">
        <span class="sh-icon">${icon}</span>
        <span class="sh-title">${escapeHtml(section.title)}</span>
        ${tag}
        <span class="sh-line"></span>
      </div>
      <div class="g2">${items}</div>
    </section>`;
}

function pageHtml(pageSections, pageNumber, logoDataUri, scale) {
  return `
    <div class="page" data-page="${pageNumber}" style="--s:${scale.toFixed(4)}">
      <header class="ph">
        <div class="brand">
          <img src="${logoDataUri}" alt="Pé de Manga" />
        </div>
        <div class="header-range">Bar &amp; Restaurante</div>
      </header>
      <main class="pc">
        <img class="watermark" src="${logoDataUri}" alt="" />
        <div class="flow">
          ${pageSections.map(sectionHtml).join("")}
        </div>
      </main>
      <footer class="pf">
        <img class="footer-logo" src="${logoDataUri}" alt="Pé de Manga" />
        <div class="footer-social">@PEDEMANGA</div>
        <div class="footer-page">${pageNumber} / 6</div>
      </footer>
    </div>`;
}

function buildHtml(scales) {
  const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;
  const sections = parseMenu();
  const byTitle = sectionByTitle(sections);
  const pages = PAGE_PLAN.map((titles) =>
    titles.map((title) => {
      const section = byTitle.get(title);
      if (!section) throw new Error(`Missing section: ${title}`);
      return section;
    }),
  );

  const pageMarkup = pages
    .map((pageSections, index) => pageHtml(pageSections, index + 1, logoDataUri, scales[index]))
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pé de Manga</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    :root {
      --black: #14100d;
      --paper: #f7f3eb;
      --paper2: #fbf8f1;
      --ink: #251f19;
      --muted: #706158;
      --green: #17672c;
      --green2: #0f4e22;
      --ochre: #c58a31;
      --line: rgba(95, 79, 64, 0.48);
      --rule: rgba(197, 138, 49, 0.78);
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      background: #ece7dd;
      color: var(--ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: "Jost", Arial, sans-serif;
    }
    .page {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background:
        linear-gradient(90deg, rgba(23,103,44,0.035), transparent 19mm, transparent calc(100% - 19mm), rgba(197,138,49,0.04)),
        var(--paper);
      page-break-after: always;
      break-after: page;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .ph {
      height: 13mm;
      flex: 0 0 13mm;
      padding: 0 11mm;
      background: var(--black);
      color: #fffaf0;
      display: grid;
      grid-template-columns: 40mm 1fr;
      align-items: center;
      gap: 5mm;
      border-bottom: 0.75mm solid var(--green);
    }
    .brand img {
      display: block;
      width: auto;
      height: 10.4mm;
      object-fit: contain;
    }
    .header-range {
      color: #d9c7a4;
      font-size: 5.7pt;
      font-weight: 700;
      letter-spacing: 1.3px;
      text-transform: uppercase;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pc {
      height: 276mm;
      flex: 1 1 auto;
      min-height: 0;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: calc(6.6mm * var(--s)) 11mm calc(5.2mm * var(--s));
    }
    .flow {
      min-height: 100%;
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      row-gap: calc(4.5mm * var(--s));
    }
    .watermark {
      position: absolute;
      z-index: 0;
      width: 38mm;
      right: 10mm;
      bottom: 10mm;
      opacity: 0.07;
      pointer-events: none;
    }
    .pf {
      height: 8mm;
      flex: 0 0 8mm;
      margin: 0 11mm;
      border-top: 0.55pt solid var(--rule);
      display: grid;
      grid-template-columns: 32mm 1fr 32mm;
      align-items: center;
      color: #6f5b51;
      font-size: 6.8pt;
      font-weight: 800;
      letter-spacing: 1.2px;
    }
    .footer-logo {
      height: 6mm;
      width: auto;
      display: block;
    }
    .footer-social {
      text-align: center;
    }
    .footer-page {
      text-align: right;
      color: var(--green);
    }
    .section {
      break-inside: avoid;
      min-width: 0;
    }
    .sh {
      display: flex;
      align-items: center;
      gap: calc(2.3mm * var(--s));
      margin-bottom: calc(2.0mm * var(--s));
      min-width: 0;
    }
    .sh-icon {
      width: calc(5.8mm * var(--s));
      min-width: calc(5.8mm * var(--s));
      height: calc(5.8mm * var(--s));
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #6e5145;
    }
    .sh-icon svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .sh-title {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: calc(15.2pt * var(--s));
      line-height: 0.95;
      font-weight: 700;
      color: var(--green2);
      white-space: nowrap;
      letter-spacing: 0;
    }
    .sh-tag {
      font-size: calc(5.4pt * var(--s));
      line-height: 1;
      font-weight: 700;
      color: var(--ochre);
      letter-spacing: 1.8px;
      text-transform: uppercase;
      white-space: nowrap;
      padding-top: calc(1mm * var(--s));
    }
    .sh-line {
      height: 0;
      flex: 1;
      min-width: 10mm;
      border-top: 0.55pt solid var(--rule);
    }
    .g2 {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      column-gap: calc(8mm * var(--s));
      row-gap: 0;
    }
    .g2 > * {
      min-width: 0;
      overflow: hidden;
    }
    .item {
      margin: 0 0 calc(2.75mm * var(--s));
      break-inside: avoid;
    }
    .item-top {
      display: grid;
      grid-template-columns: auto minmax(8mm, 1fr) auto;
      align-items: baseline;
      column-gap: calc(1.4mm * var(--s));
      min-width: 0;
    }
    .item-name {
      font-size: calc(7.35pt * var(--s));
      line-height: 1.02;
      font-weight: 800;
      color: #272119;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .item-dots {
      border-bottom: 0.65pt dotted var(--line);
      transform: translateY(calc(-1.2pt * var(--s)));
      min-width: 3mm;
    }
    .item-price {
      font-size: calc(7.15pt * var(--s));
      line-height: 1;
      font-weight: 800;
      color: var(--green);
      white-space: nowrap;
    }
    .item-desc {
      margin-top: calc(0.38mm * var(--s));
      padding-right: calc(2mm * var(--s));
      font-size: calc(5.55pt * var(--s));
      line-height: 1.22;
      font-weight: 400;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .featured .g2 {
      column-gap: calc(5mm * var(--s));
    }
    .featured-item {
      border: 0.55pt solid rgba(197, 138, 49, 0.74);
      border-radius: calc(3mm * var(--s));
      padding: calc(2.0mm * var(--s)) calc(2.5mm * var(--s));
      background: rgba(255, 247, 225, 0.72);
      margin-bottom: calc(2.65mm * var(--s));
    }
    .featured-item .item-desc {
      padding-right: 0;
    }
    .featured-item .item-price {
      color: var(--ochre);
    }
    @media screen {
      body {
        padding: 16px;
        width: auto;
      }
      .page {
        margin: 0 auto 16px;
        box-shadow: 0 8px 28px rgba(0,0,0,0.18);
      }
    }
  </style>
</head>
<body>
${pageMarkup}
</body>
</html>`;
}

async function measurePages(page) {
  return page.$$eval(".page", (pages) =>
    pages.map((pageEl, index) => {
      const pc = pageEl.querySelector(".pc");
      const flow = pageEl.querySelector(".flow");
      const pcStyle = getComputedStyle(pc);
      const flowRect = flow.getBoundingClientRect();
      const clone = flow.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.visibility = "hidden";
      clone.style.pointerEvents = "none";
      clone.style.left = "-10000px";
      clone.style.top = "0";
      clone.style.width = `${flowRect.width}px`;
      clone.style.height = "auto";
      clone.style.minHeight = "0";
      clone.style.justifyContent = "flex-start";
      pc.appendChild(clone);
      const contentHeight = clone.getBoundingClientRect().height;
      clone.remove();

      const paddingTop = parseFloat(pcStyle.paddingTop);
      const paddingBottom = parseFloat(pcStyle.paddingBottom);
      const pcHeight = pc.clientHeight;
      const total = contentHeight + paddingTop + paddingBottom;
      const flowScroll = flow.scrollHeight;
      return {
        page: index + 1,
        pcHeight,
        contentHeight: Number(contentHeight.toFixed(2)),
        paddingTop: Number(paddingTop.toFixed(2)),
        paddingBottom: Number(paddingBottom.toFixed(2)),
        total: Number(total.toFixed(2)),
        fill: Number((total / pcHeight).toFixed(4)),
        overflow: Number(Math.max(0, total - pcHeight).toFixed(2)),
        flowScroll,
      };
    }),
  );
}

async function loadHtml(page) {
  const html = fs.readFileSync(HTML_PATH, "utf8");
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

function writeReport(metrics, scales, pdfInfo) {
  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pdf: PDF_PATH,
        html: HTML_PATH,
        scales: scales.map((value) => Number(value.toFixed(4))),
        metrics,
        pdfInfo,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function pdfInfo() {
  const exe = path.join(POPPLER_BIN, "pdfinfo.exe");
  if (!fs.existsSync(exe)) return "pdfinfo.exe not found";
  return execFileSync(exe, [PDF_PATH], { encoding: "utf8" });
}

function renderPdf() {
  const exe = path.join(POPPLER_BIN, "pdftoppm.exe");
  if (!fs.existsSync(exe)) return false;
  for (const file of fs.readdirSync(RENDER_DIR)) {
    fs.rmSync(path.join(RENDER_DIR, file), { force: true });
  }
  execFileSync(exe, ["-r", "150", "-png", PDF_PATH, path.join(RENDER_DIR, "page")], {
    stdio: "inherit",
  });
  return true;
}

async function main() {
  ensureDirs();
  let scales = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
  let metrics = [];

  const launchOptions = { headless: true };
  const chromePath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (chromePath) launchOptions.executablePath = chromePath;
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });

  for (let attempt = 0; attempt < 9; attempt += 1) {
    fs.writeFileSync(HTML_PATH, buildHtml(scales), "utf8");
    await loadHtml(page);
    metrics = await measurePages(page);

    let changed = false;
    scales = scales.map((scale, index) => {
      const metric = metrics[index];
      const target = 0.93;
      if (metric.overflow > 0 || metric.fill > 0.98 || metric.fill < 0.88) {
        const factor = Math.max(0.86, Math.min(1.08, target / metric.fill));
        const next = Math.max(0.62, Math.min(1.16, scale * factor));
        changed = changed || Math.abs(next - scale) > 0.002;
        return next;
      }
      return scale;
    });

    if (!changed) break;
  }

  fs.writeFileSync(HTML_PATH, buildHtml(scales), "utf8");
  await loadHtml(page);
  metrics = await measurePages(page);

  const bad = metrics.filter((metric) => metric.overflow > 0.5 || metric.fill > 0.985);
  if (bad.length) {
    throw new Error(`Overflow after scaling: ${JSON.stringify(bad, null, 2)}`);
  }

  for (const file of fs.readdirSync(SCREEN_DIR)) {
    fs.rmSync(path.join(SCREEN_DIR, file), { force: true });
  }
  const pageEls = await page.$$(".page");
  for (let index = 0; index < pageEls.length; index += 1) {
    await pageEls[index].screenshot({
      path: path.join(SCREEN_DIR, `page${String(index + 1).padStart(2, "0")}.png`),
      omitBackground: false,
    });
  }

  await page.pdf({
    path: PDF_PATH,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });

  await browser.close();

  const rendered = renderPdf();
  const info = pdfInfo();
  writeReport(metrics, scales, info);

  console.log(`HTML: ${HTML_PATH}`);
  console.log(`PDF: ${PDF_PATH}`);
  console.log(`Screenshots: ${SCREEN_DIR}`);
  console.log(`Rendered PDF pages: ${rendered ? RENDER_DIR : "not rendered"}`);
  console.log("Metrics:");
  for (const metric of metrics) {
    console.log(
      `  p${metric.page}: fill ${(metric.fill * 100).toFixed(1)}%, total ${metric.total}px / ${metric.pcHeight}px`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
