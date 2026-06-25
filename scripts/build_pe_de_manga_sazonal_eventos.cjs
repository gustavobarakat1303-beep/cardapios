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
const FINAL_DIR = path.join(ROOT, "MENU_SAZONAL_EVENTOS");
const DATA_PATH = path.join(FINAL_DIR, "menu_sazonal_eventos.json");
const LOGO_PATH = path.join(ROOT, "assets", "pe-de-manga-logo.png");
const FINAL_HTML_PATH = path.join(FINAL_DIR, "MENU_SAZONAL_EVENTOS_10X15.html");
const FINAL_PDF_PATH = path.join(FINAL_DIR, "MENU_SAZONAL_EVENTOS_10X15.pdf");
const OUT_DIR = path.join(ROOT, "output", "pdf", "sazonal_eventos");
const RENDER_DIR = path.join(OUT_DIR, "rendered");
const HTML_PATH = path.join(OUT_DIR, "menu_sazonal_eventos_10x15.html");
const PDF_PATH = path.join(OUT_DIR, "menu_sazonal_eventos_10x15.pdf");
const REPORT_PATH = path.join(OUT_DIR, "menu_sazonal_eventos_10x15_report.json");

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
  leaf:
    '<svg viewBox="0 0 24 24"><path d="M4 13c5-8 12-9 16-8-1 6-5 11-13 12"/><path d="M4 20c4-6 9-9 16-15"/></svg>',
  food:
    '<svg viewBox="0 0 24 24"><path d="M7 2v20"/><path d="M4 2v7a3 3 0 0 0 6 0V2"/><path d="M17 2v20"/><path d="M15 2h4v10h-4z"/></svg>',
  dessert:
    '<svg viewBox="0 0 24 24"><path d="M12 3 6 12h12z"/><path d="M8 12l2 8h4l2-8"/></svg>',
  drink:
    '<svg viewBox="0 0 24 24"><path d="M7 3h10l-1 7a4 4 0 0 1-8 0z"/><path d="M12 14v7"/><path d="M9 21h6"/></svg>',
  coin:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M9.8 10.2c.5-1 3.9-1 4.4 0"/><path d="M9.8 13.8c.5 1 3.9 1 4.4 0"/></svg>',
  info:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7h.01"/></svg>',
  default:
    '<svg viewBox="0 0 24 24"><path d="M4 13c5-8 12-9 16-8-1 6-5 11-13 12"/><path d="M4 20c4-6 9-9 16-15"/></svg>',
};

function ensureDirs() {
  for (const dir of [FINAL_DIR, OUT_DIR, RENDER_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanGeneratedPreviews() {
  for (const file of fs.readdirSync(FINAL_DIR)) {
    if (/^PREVIA_PAGINA_\d+\.png$/i.test(file)) {
      fs.unlinkSync(path.join(FINAL_DIR, file));
    }
  }
  fs.rmSync(RENDER_DIR, { recursive: true, force: true });
  fs.mkdirSync(RENDER_DIR, { recursive: true });
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
  if (!Array.isArray(data.paginas) || data.paginas.length === 0) {
    throw new Error("MENU_SAZONAL_EVENTOS/menu_sazonal_eventos.json precisa ter paginas.");
  }
  return data;
}

function itemHtml(item) {
  const price = item.preco ? `<span class="item-price">${escapeHtml(item.preco)}</span>` : "";
  const desc = item.descricao ? `<div class="item-desc">${escapeHtml(item.descricao)}</div>` : "";
  return `
    <div class="item">
      <div class="item-top">
        <span class="item-name">${escapeHtml(item.nome)}</span>
        <span class="item-dots"></span>
        ${price}
      </div>
      ${desc}
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
      <div class="item-list">${(section.itens || []).map(itemHtml).join("")}</div>
    </section>`;
}

function coverHtml(page, data) {
  const highlights = (page.destaques || [])
    .map(
      (item) => `
      <div class="cover-card">
        <div class="cover-card-title">${escapeHtml(item.titulo)}</div>
        <div class="cover-card-text">${escapeHtml(item.texto)}</div>
      </div>`,
    )
    .join("");
  return `
    <main class="pc cover">
      <img class="watermark" src="{{LOGO}}" alt="" />
      <div class="cover-kicker">${escapeHtml(page.subtitulo || data.subtitulo)}</div>
      <div class="cover-title">${escapeHtml(page.titulo || data.titulo)}</div>
      <div class="cover-desc">${escapeHtml(page.descricao || "")}</div>
      <div class="cover-grid">${highlights}</div>
      <div class="cover-format">${escapeHtml(data.formato || "10x15 cm")}</div>
    </main>`;
}

function contentHtml(page) {
  return `
    <main class="pc">
      <img class="watermark" src="{{LOGO}}" alt="" />
      <div class="intro">
        <div class="intro-title">${escapeHtml(page.titulo)}</div>
        ${page.tag ? `<div class="intro-sub">${escapeHtml(page.tag)}</div>` : ""}
      </div>
      <div class="flow">${(page.secoes || []).map(sectionHtml).join("")}</div>
    </main>`;
}

function pageHtml(page, data, index, total) {
  const main = page.tipo === "capa" ? coverHtml(page, data) : contentHtml(page);
  return `
  <div class="page">
    <header class="ph">
      <div class="brand"><img src="{{LOGO}}" alt="Pé de Manga" /></div>
      <div class="header-range">Bar &amp; Restaurante</div>
    </header>
    ${main}
    <footer class="pf">
      <div class="footer-social">${escapeHtml(data.rodape || "@PEDEMANGA")}</div>
      <div class="footer-page">${index + 1} / ${total}</div>
    </footer>
  </div>`;
}

function buildHtml(data) {
  const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;
  const pages = data.paginas.map((page, index) => pageHtml(page, data, index, data.paginas.length)).join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pé de Manga - Menu Sazonal Eventos 10x15</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: 100mm 150mm; margin: 0; }
    :root {
      --paper: #ffffff;
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
      width: 100mm;
      background: #eeeeee;
      color: var(--ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { font-family: "Jost", Arial, sans-serif; }
    .page {
      width: 100mm;
      height: 150mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: var(--paper);
      page-break-after: always;
      break-after: page;
    }
    .ph {
      height: 9mm;
      flex: 0 0 9mm;
      padding: 0 6mm;
      display: grid;
      grid-template-columns: 24mm 1fr;
      align-items: center;
      gap: 3mm;
      border-bottom: 0.55mm solid var(--dark);
    }
    .brand img {
      display: block;
      width: auto;
      height: 7.2mm;
      object-fit: contain;
      filter: grayscale(1) contrast(1.22);
    }
    .header-range {
      font-size: 4.1pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      text-align: right;
      white-space: nowrap;
    }
    .pc {
      position: relative;
      z-index: 1;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      padding: 5.1mm 6mm 3.6mm;
      display: flex;
      flex-direction: column;
    }
    .watermark {
      position: absolute;
      width: 32mm;
      right: 4mm;
      bottom: 5mm;
      opacity: 0.045;
      filter: grayscale(1);
      pointer-events: none;
    }
    .intro {
      position: relative;
      z-index: 1;
      margin: 0 0 3.2mm;
      padding-bottom: 2mm;
      border-bottom: 0.45pt solid var(--line);
    }
    .intro-title {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 20pt;
      line-height: 0.9;
      font-weight: 700;
      letter-spacing: 0;
      color: var(--dark);
    }
    .intro-sub {
      margin-top: 1.4mm;
      font-size: 5.6pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--muted);
    }
    .flow {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 2.4mm;
      min-height: 0;
    }
    .section { break-inside: avoid; }
    .sh {
      display: flex;
      align-items: center;
      gap: 1.3mm;
      margin-bottom: 1mm;
      min-width: 0;
    }
    .sh-icon {
      width: 4mm;
      min-width: 4mm;
      height: 4mm;
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
      font-size: 13pt;
      line-height: 0.95;
      font-weight: 700;
      color: var(--dark);
      white-space: nowrap;
      letter-spacing: 0;
    }
    .sh-tag {
      font-size: 4.2pt;
      line-height: 1;
      font-weight: 800;
      color: var(--soft);
      letter-spacing: 1px;
      text-transform: uppercase;
      white-space: nowrap;
      padding-top: 0.7mm;
    }
    .sh-line {
      height: 0;
      flex: 1;
      min-width: 5mm;
      border-top: 0.45pt solid var(--line);
    }
    .item-list {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      row-gap: 0.65mm;
    }
    .item {
      margin: 0;
      padding: 0.65mm 0 0.85mm;
      border-bottom: 0.35pt dotted #b0b0b0;
      break-inside: avoid;
    }
    .item-top {
      display: grid;
      grid-template-columns: auto minmax(4mm, 1fr) auto;
      align-items: baseline;
      column-gap: 1mm;
      min-width: 0;
    }
    .item-name {
      font-size: 7.4pt;
      line-height: 1.04;
      font-weight: 800;
      color: var(--ink);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .item-dots {
      border-bottom: 0.45pt dotted var(--line);
      transform: translateY(-1.1pt);
      min-width: 3mm;
    }
    .item-price {
      font-size: 6.9pt;
      line-height: 1;
      font-weight: 800;
      color: var(--ink);
      white-space: nowrap;
    }
    .item-desc {
      margin-top: 0.45mm;
      padding-right: 1mm;
      font-size: 5.8pt;
      line-height: 1.13;
      font-weight: 400;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .pf {
      height: 6mm;
      flex: 0 0 6mm;
      margin: 0 6mm;
      border-top: 0.45pt solid var(--line);
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      color: var(--muted);
      font-size: 4.8pt;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .footer-page { color: var(--dark); }
    .cover {
      justify-content: flex-start;
      padding-top: 21mm;
      padding-bottom: 6mm;
    }
    .cover-kicker {
      position: relative;
      z-index: 1;
      font-size: 6pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--muted);
    }
    .cover-title {
      position: relative;
      z-index: 1;
      margin-top: 1.6mm;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 28pt;
      line-height: 0.88;
      font-weight: 700;
      letter-spacing: 0;
      color: var(--dark);
    }
    .cover-desc {
      position: relative;
      z-index: 1;
      margin-top: 2.8mm;
      font-size: 7.4pt;
      line-height: 1.18;
      font-weight: 600;
      color: var(--muted);
    }
    .cover-grid {
      position: relative;
      z-index: 1;
      margin-top: 5mm;
      display: grid;
      gap: 2.2mm;
    }
    .cover-card {
      border-top: 0.45pt solid var(--line);
      padding-top: 1.6mm;
    }
    .cover-card-title {
      font-size: 7.2pt;
      line-height: 1;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--dark);
    }
    .cover-card-text {
      margin-top: 0.9mm;
      font-size: 6.2pt;
      line-height: 1.15;
      color: var(--muted);
      font-weight: 500;
    }
    .cover-format {
      position: relative;
      z-index: 1;
      margin-top: 5mm;
      font-size: 6pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--dark);
    }
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
${pages.replaceAll("{{LOGO}}", logoDataUri)}
</body>
</html>`;
}

async function measurePages(page) {
  return page.$$eval(".page", (pages) =>
    pages.map((pageEl, index) => ({
      page: index + 1,
      pageHeight: pageEl.clientHeight,
      pageScrollHeight: pageEl.scrollHeight,
      overflow: pageEl.scrollHeight > pageEl.clientHeight + 1,
    })),
  );
}

async function main() {
  ensureDirs();
  cleanGeneratedPreviews();
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
    await page.setViewport({ width: 378, height: 567, deviceScaleFactor: 2 });
  } else {
    await page.setViewportSize({ width: 378, height: 567 });
  }
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const metrics = await measurePages(page);
  const overflowing = metrics.filter((entry) => entry.overflow);
  if (overflowing.length) {
    throw new Error(`Menu sazonal com overflow: ${JSON.stringify(overflowing, null, 2)}`);
  }

  await page.pdf({
    path: PDF_PATH,
    width: "100mm",
    height: "150mm",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });
  fs.copyFileSync(PDF_PATH, FINAL_PDF_PATH);
  await browser.close();

  const pdfinfo = path.join(POPPLER_BIN, "pdfinfo.exe");
  const pdftoppm = path.join(POPPLER_BIN, "pdftoppm.exe");
  const pdfInfo = fs.existsSync(pdfinfo) ? execFileSync(pdfinfo, [PDF_PATH], { encoding: "utf8" }) : "";
  if (fs.existsSync(pdftoppm)) {
    execFileSync(pdftoppm, ["-png", "-r", "160", PDF_PATH, path.join(RENDER_DIR, "page")]);
    for (let i = 1; i <= data.paginas.length; i += 1) {
      const rendered = path.join(RENDER_DIR, `page-${i}.png`);
      if (fs.existsSync(rendered)) {
        fs.copyFileSync(rendered, path.join(FINAL_DIR, `PREVIA_PAGINA_${String(i).padStart(2, "0")}.png`));
      }
    }
  }

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        html: HTML_PATH,
        pdf: PDF_PATH,
        finalHtml: FINAL_HTML_PATH,
        finalPdf: FINAL_PDF_PATH,
        pages: data.paginas.length,
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
  console.log(`Menu Sazonal Eventos: ${FINAL_PDF_PATH}`);
  console.log(`Paginas: ${data.paginas.length}`);
  console.log("OK: formato 10x15 cm sem overflow.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
