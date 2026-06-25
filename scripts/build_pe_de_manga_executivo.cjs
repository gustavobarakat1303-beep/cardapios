const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

let puppeteer = null;
let chromium = null;
try {
  puppeteer = require("puppeteer-core");
} catch {
  ({ chromium } = require("playwright"));
}

const ROOT = path.resolve(__dirname, "..");
const FINAL_DIR = path.join(ROOT, "MENU_EXECUTIVO");
const DATA_PATH = path.join(FINAL_DIR, "menu_executivo.json");
const LOGO_PATH = path.join(ROOT, "assets", "pe-de-manga-logo.png");
const FINAL_HTML_PATH = path.join(FINAL_DIR, "MENU_EXECUTIVO_PE_DE_MANGA.html");
const FINAL_PDF_PATH = path.join(FINAL_DIR, "MENU_EXECUTIVO_PE_DE_MANGA.pdf");
const FINAL_PREVIEW_PATH = path.join(FINAL_DIR, "PREVIA_MENU_EXECUTIVO.png");
const OUT_DIR = path.join(ROOT, "output", "pdf");
const EXEC_DIR = path.join(OUT_DIR, "executivo");
const RENDER_DIR = path.join(EXEC_DIR, "rendered");
const HTML_PATH = path.join(EXEC_DIR, "executivo_pe_de_manga.html");
const PDF_PATH = path.join(EXEC_DIR, "executivo_pe_de_manga.pdf");
const REPORT_PATH = path.join(EXEC_DIR, "executivo_pe_de_manga_report.json");

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

const ICONS = {
  bowl:
    '<svg viewBox="0 0 24 24"><path d="M4 10h16"/><path d="M6 10a6 6 0 0 0 12 0"/><path d="M8 6c1-2 3-2 4 0"/><path d="M12 6c1-2 3-2 4 0"/></svg>',
  food:
    '<svg viewBox="0 0 24 24"><path d="M7 2v20"/><path d="M4 2v7a3 3 0 0 0 6 0V2"/><path d="M17 2v20"/><path d="M15 2h4v10h-4z"/></svg>',
  dessert:
    '<svg viewBox="0 0 24 24"><path d="M12 3 6 12h12z"/><path d="M8 12l2 8h4l2-8"/></svg>',
  default:
    '<svg viewBox="0 0 24 24"><path d="M4 13c5-8 12-9 16-8-1 6-5 11-13 12"/><path d="M4 20c4-6 9-9 16-15"/></svg>',
};

function ensureDirs() {
  for (const dir of [FINAL_DIR, OUT_DIR, EXEC_DIR, RENDER_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadData() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  if (!Array.isArray(data.secoes) || data.secoes.length === 0) {
    throw new Error("MENU_EXECUTIVO/menu_executivo.json precisa ter ao menos uma secao em 'secoes'.");
  }
  return data;
}

function itemHtml(item) {
  const price = item.preco ? `<span class="item-price">${escapeHtml(item.preco)}</span>` : "";
  return `
    <div class="item">
      <div class="item-top">
        <span class="item-name">${escapeHtml(item.nome)}</span>
        <span class="item-dots"></span>
        ${price}
      </div>
      ${item.descricao ? `<div class="item-desc">${escapeHtml(item.descricao)}</div>` : ""}
    </div>`;
}

function sectionHtml(section) {
  const icon = ICONS[section.icone] || ICONS.default;
  const tag = section.tag ? `<span class="sh-tag">${escapeHtml(section.tag)}</span>` : "";
  return `
    <section class="section">
      <div class="sh">
        <span class="sh-icon">${icon}</span>
        <span class="sh-title">${escapeHtml(section.titulo)}</span>
        ${tag}
        <span class="sh-line"></span>
      </div>
      <div class="item-list">${section.itens.map(itemHtml).join("")}</div>
    </section>`;
}

function buildHtml(data) {
  const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pé de Manga - Menu Executivo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    :root {
      --paper: #ffffff;
      --paper2: #f7f7f7;
      --ink: #1e1e1e;
      --muted: #555555;
      --soft: #777777;
      --line: #909090;
      --dark: #111111;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      background: #eeeeee;
      color: var(--ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { font-family: "Jost", Arial, sans-serif; }
    .page {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: var(--paper);
      page-break-after: always;
      break-after: page;
    }
    .ph {
      height: 13mm;
      flex: 0 0 13mm;
      padding: 0 11mm;
      background: #ffffff;
      color: var(--dark);
      display: grid;
      grid-template-columns: 40mm 1fr;
      align-items: center;
      gap: 5mm;
      border-bottom: 0.75mm solid var(--dark);
    }
    .brand img {
      display: block;
      width: auto;
      height: 10.4mm;
      object-fit: contain;
      filter: grayscale(1) contrast(1.25);
    }
    .header-range {
      color: var(--dark);
      font-size: 5.7pt;
      font-weight: 800;
      letter-spacing: 1.3px;
      text-transform: uppercase;
      text-align: right;
      white-space: nowrap;
    }
    .pc {
      height: 276mm;
      flex: 1 1 auto;
      min-height: 0;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 7mm 11mm 6mm;
    }
    .watermark {
      position: absolute;
      width: 38mm;
      right: 10mm;
      bottom: 10mm;
      opacity: 0.045;
      filter: grayscale(1);
      pointer-events: none;
    }
    .intro {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: end;
      gap: 8mm;
      margin: 0 0 7mm;
      padding-bottom: 3mm;
      border-bottom: 0.55pt solid var(--line);
    }
    .intro-title {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 36pt;
      line-height: 0.9;
      font-weight: 700;
      letter-spacing: 0;
      color: var(--dark);
    }
    .intro-sub {
      margin-top: 2mm;
      font-size: 10.2pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--muted);
    }
    .intro-note {
      margin-top: 2.2mm;
      font-size: 10pt;
      line-height: 1.1;
      font-weight: 800;
      color: var(--dark);
    }
    .intro-period {
      font-size: 8pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: var(--dark);
      text-align: right;
      padding-bottom: 1mm;
      white-space: nowrap;
    }
    .flow {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex: 1;
      gap: 4.8mm;
    }
    .section { break-inside: avoid; }
    .sh {
      display: flex;
      align-items: center;
      gap: 2.3mm;
      margin-bottom: 2.6mm;
      min-width: 0;
    }
    .sh-icon {
      width: 6mm;
      min-width: 6mm;
      height: 6mm;
      color: var(--muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
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
      font-size: 24pt;
      line-height: 0.95;
      font-weight: 700;
      color: var(--dark);
      white-space: nowrap;
      letter-spacing: 0;
    }
    .sh-tag {
      font-size: 7.2pt;
      line-height: 1;
      font-weight: 800;
      color: var(--soft);
      letter-spacing: 1.9px;
      text-transform: uppercase;
      white-space: nowrap;
      padding-top: 1mm;
    }
    .sh-line {
      height: 0;
      flex: 1;
      min-width: 10mm;
      border-top: 0.55pt solid var(--line);
    }
    .item-list {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      row-gap: 1.1mm;
    }
    .item-list > * {
      min-width: 0;
      overflow: hidden;
    }
    .item {
      margin: 0;
      padding: 1.6mm 0 1.9mm;
      border-bottom: 0.45pt dotted #b0b0b0;
      break-inside: avoid;
    }
    .item-top {
      display: grid;
      grid-template-columns: auto minmax(8mm, 1fr) auto;
      align-items: baseline;
      column-gap: 1.4mm;
      min-width: 0;
    }
    .item-name {
      font-size: 13.4pt;
      line-height: 1.02;
      font-weight: 800;
      color: var(--ink);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .item-dots {
      border-bottom: 0.65pt dotted var(--line);
      transform: translateY(-1.2pt);
      min-width: 4mm;
    }
    .item-price {
      font-size: 12.3pt;
      line-height: 1;
      font-weight: 800;
      color: var(--ink);
      white-space: nowrap;
    }
    .item-desc {
      margin-top: 0.8mm;
      padding-right: 2mm;
      font-size: 10.3pt;
      line-height: 1.22;
      font-weight: 400;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .pf {
      height: 8mm;
      flex: 0 0 8mm;
      margin: 0 11mm;
      border-top: 0.55pt solid var(--line);
      display: grid;
      grid-template-columns: 32mm 1fr 32mm;
      align-items: center;
      color: var(--muted);
      font-size: 6.8pt;
      font-weight: 800;
      letter-spacing: 1.2px;
    }
    .footer-logo {
      height: 6mm;
      width: auto;
      display: block;
      filter: grayscale(1) contrast(1.2);
    }
    .footer-social { text-align: center; }
    .footer-page { text-align: right; color: var(--dark); }
    @media screen {
      body { padding: 16px; width: auto; }
      .page {
        margin: 0 auto 16px;
        box-shadow: 0 8px 28px rgba(0,0,0,0.18);
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="ph">
      <div class="brand"><img src="${logoDataUri}" alt="Pé de Manga" /></div>
      <div class="header-range">Bar &amp; Restaurante</div>
    </header>
    <main class="pc">
      <img class="watermark" src="${logoDataUri}" alt="" />
      <div class="intro">
        <div>
          <div class="intro-title">${escapeHtml(data.titulo)}</div>
          <div class="intro-sub">${escapeHtml(data.subtitulo)}</div>
          ${data.resumo ? `<div class="intro-note">${escapeHtml(data.resumo)}</div>` : ""}
        </div>
        <div class="intro-period">${escapeHtml(data.periodo)}</div>
      </div>
      <div class="flow">
        ${data.secoes.map(sectionHtml).join("")}
      </div>
    </main>
    <footer class="pf">
      <img class="footer-logo" src="${logoDataUri}" alt="Pé de Manga" />
      <div class="footer-social">${escapeHtml(data.rodape || "@PEDEMANGA")}</div>
      <div class="footer-page">1 / 1</div>
    </footer>
  </div>
</body>
</html>`;
}

async function measurePage(page) {
  return page.$eval(".page", (pageEl) => {
    const pc = pageEl.querySelector(".pc");
    const flow = pageEl.querySelector(".flow");
    const foot = pageEl.querySelector(".pf");
    return {
      pageHeight: pageEl.clientHeight,
      pageScrollHeight: pageEl.scrollHeight,
      pcHeight: pc.clientHeight,
      pcScrollHeight: pc.scrollHeight,
      flowBottom: Math.round(flow.getBoundingClientRect().bottom - pageEl.getBoundingClientRect().top),
      footerTop: Math.round(foot.getBoundingClientRect().top - pageEl.getBoundingClientRect().top),
      overflow: pageEl.scrollHeight > pageEl.clientHeight + 1 || pc.scrollHeight > pc.clientHeight + 1,
    };
  });
}

async function main() {
  ensureDirs();
  const data = loadData();
  const html = buildHtml(data);
  fs.writeFileSync(HTML_PATH, html, "utf8");
  fs.writeFileSync(FINAL_HTML_PATH, html, "utf8");

  const launchOptions = { headless: true };
  const chromePath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (chromePath) launchOptions.executablePath = chromePath;

  const browser = puppeteer
    ? await puppeteer.launch({ ...launchOptions, headless: "new", args: ["--no-sandbox"] })
    : await chromium.launch(launchOptions);
  const page = await browser.newPage();
  if (page.setViewport) {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
  } else {
    await page.setViewportSize({ width: 794, height: 1123 });
  }
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const metrics = await measurePage(page);
  if (metrics.overflow) {
    throw new Error(`Menu executivo com overflow: ${JSON.stringify(metrics, null, 2)}`);
  }

  await page.pdf({
    path: PDF_PATH,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });
  fs.copyFileSync(PDF_PATH, FINAL_PDF_PATH);

  await page.$eval(".page", (el) => el.scrollIntoView());
  const pageHandle = await page.$(".page");
  const previewPath = path.join(RENDER_DIR, "page-1.png");
  await pageHandle.screenshot({
    path: previewPath,
    omitBackground: false,
  });
  fs.copyFileSync(previewPath, FINAL_PREVIEW_PATH);
  await browser.close();

  const poppler = path.join(POPPLER_BIN, "pdfinfo.exe");
  const pdfInfo = fs.existsSync(poppler) ? execFileSync(poppler, [PDF_PATH], { encoding: "utf8" }) : "";
  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        html: HTML_PATH,
        pdf: PDF_PATH,
        finalHtml: FINAL_HTML_PATH,
        finalPdf: FINAL_PDF_PATH,
        finalPreview: FINAL_PREVIEW_PATH,
        metrics,
        pdfInfo,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`HTML: ${HTML_PATH}`);
  console.log(`PDF: ${PDF_PATH}`);
  console.log(`Menu Executivo: ${FINAL_PDF_PATH}`);
  console.log(`Preview: ${FINAL_PREVIEW_PATH}`);
  console.log(`OK: sem overflow. Corpo termina em ${metrics.flowBottom}px; rodape em ${metrics.footerTop}px.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
