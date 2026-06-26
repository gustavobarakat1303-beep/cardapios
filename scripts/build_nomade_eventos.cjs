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
const LOGO_PATH = path.join(ROOT, "assets", "nomade_logo_clean.png");
const HAPPY_DIR = path.join(ROOT, "NOMADE_MENU_HAPPY_HOUR");
const HAPPY_DATA_PATH = path.join(HAPPY_DIR, "happy_hour_opcoes.json");
const LUNCH_DIR = path.join(ROOT, "NOMADE_MENU_ALMOCO_JANTAR");
const LUNCH_DATA_PATH = path.join(LUNCH_DIR, "almoco_jantar_menus.json");
const OUT_ROOT = path.join(ROOT, "output", "pdf");
const HAPPY_OUT_DIR = path.join(OUT_ROOT, "nomade_happy_hour");
const LUNCH_OUT_DIR = path.join(OUT_ROOT, "nomade_almoco_jantar");

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

function ensureDirs(...dirs) {
  for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });
}

function cleanPreviews(dir, pattern) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (pattern.test(file)) fs.unlinkSync(path.join(dir, file));
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugNumber(id) {
  return String(id).padStart(2, "0");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function trimTrailingWhitespace(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n");
}

function itemHtml(item) {
  if (typeof item === "string") return `<li><strong>${escapeHtml(item)}</strong></li>`;
  const desc = item.descricao ? `<span>${escapeHtml(item.descricao)}</span>` : "";
  return `<li><strong>${escapeHtml(item.nome)}</strong>${desc}</li>`;
}

function sectionHtml(section) {
  const tag = section.tag ? `<em>${escapeHtml(section.tag)}</em>` : "";
  return `
    <section class="section">
      <div class="section-title">
        <span>${escapeHtml(section.titulo)}</span>
        ${tag}
        <i></i>
      </div>
      <ul>${(section.itens || []).map(itemHtml).join("")}</ul>
    </section>`;
}

function panelHtml(data, menu) {
  return `
    <article class="panel">
      <header class="panel-head">
        <img src="{{LOGO}}" alt="Nômade" />
        <div>Bar &amp; Restaurante</div>
      </header>
      <main class="panel-body">
        <div class="kicker">${escapeHtml(data.subtitulo || "Eventos Nômade")}</div>
        <h1>${escapeHtml(data.titulo)}</h1>
        <div class="option-row">
          <strong>${escapeHtml(menu.titulo)}</strong>
          <span>${escapeHtml(data.periodo || "")}</span>
        </div>
        ${menu.chamada ? `<p class="lead">${escapeHtml(menu.chamada)}</p>` : ""}
        <div class="sections">${(menu.secoes || []).map(sectionHtml).join("")}</div>
      </main>
      <footer class="panel-foot">
        <span>${escapeHtml(data.rodape || "@NO.MADEBAR")}</span>
        <span>${escapeHtml(menu.titulo)}</span>
      </footer>
    </article>`;
}

function sheetHtml(data, menu) {
  const panel = panelHtml(data, menu);
  return `
    <section class="sheet" data-menu="${escapeHtml(menu.id || menu.titulo)}">
      ${panel}
      ${panel}
      ${panel}
    </section>`;
}

function buildHtml(data, menus, title) {
  const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;
  const sheets = menus.map((menu) => sheetHtml(data, menu)).join("");
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 0; }
    :root {
      --paper: #ffffff;
      --ink: #181818;
      --muted: #565656;
      --line: #8f8f8f;
      --soft: #777777;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #eeeeee;
      color: var(--ink);
      font-family: "Jost", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 297mm;
      height: 210mm;
      overflow: hidden;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      background: var(--paper);
      break-after: page;
      page-break-after: always;
    }
    .panel {
      position: relative;
      width: 99mm;
      height: 210mm;
      overflow: hidden;
      padding: 6mm 6.2mm 5.2mm;
      display: flex;
      flex-direction: column;
      border-left: 0.35pt dashed #b6b6b6;
      text-align: center;
    }
    .panel:first-child { border-left: none; }
    .panel::after {
      content: "";
      position: absolute;
      right: 2mm;
      bottom: 14mm;
      width: 38mm;
      height: 18mm;
      background: url("{{LOGO}}") center / contain no-repeat;
      opacity: 0.035;
      filter: grayscale(1);
      pointer-events: none;
    }
    .panel-head {
      height: 16mm;
      flex: 0 0 16mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.15mm;
      border-bottom: 0.45pt solid var(--line);
      padding-bottom: 2.4mm;
    }
    .panel-head img {
      display: block;
      width: 39mm;
      height: auto;
      max-height: 9.5mm;
      object-fit: contain;
      filter: grayscale(1) contrast(1.12);
    }
    .panel-head div {
      font-size: 4.6pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.4px;
      text-align: center;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .panel-body {
      flex: 1 1 auto;
      min-height: 0;
      padding-top: 4.2mm;
      position: relative;
      z-index: 1;
    }
    .kicker {
      font-size: 5pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.3px;
      color: var(--muted);
      text-transform: uppercase;
    }
    h1 {
      margin: 1.45mm 0 1.8mm;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 24pt;
      line-height: 0.9;
      font-weight: 700;
      letter-spacing: 0;
      color: var(--ink);
    }
    .option-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1mm;
      padding: 0 0 2mm;
      border-bottom: 0;
    }
    .option-row strong {
      font-size: 8.2pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .option-row span {
      font-size: 4.6pt;
      line-height: 1;
      font-weight: 800;
      color: var(--muted);
      letter-spacing: 1px;
      white-space: nowrap;
    }
    .lead {
      margin: 0 0 2.65mm;
      padding: 1.7mm 3mm 0;
      border-top: 0.45pt solid var(--line);
      font-size: 5.8pt;
      line-height: 1.18;
      font-weight: 600;
      color: var(--muted);
    }
    .sections {
      display: flex;
      flex-direction: column;
      gap: 2.05mm;
    }
    .section {
      padding-top: 0.4mm;
      break-inside: avoid;
    }
    .section + .section {
      border-top: 0.35pt solid #d2d2d2;
      padding-top: 1.8mm;
    }
    .section-title {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.65mm;
      margin-bottom: 1mm;
    }
    .section-title span {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 13.4pt;
      line-height: 0.92;
      font-weight: 700;
      color: var(--ink);
      white-space: nowrap;
    }
    .section-title em {
      font-style: normal;
      font-size: 3.9pt;
      line-height: 1;
      font-weight: 800;
      color: var(--soft);
      letter-spacing: 1.1px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .section-title i {
      display: block;
      width: 12mm;
      height: 0;
      border-top: 0.45pt solid var(--line);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      row-gap: 0.55mm;
    }
    li {
      margin: 0;
      padding: 0;
      border-bottom: 0;
      font-size: 6.35pt;
      line-height: 1.12;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    li strong {
      display: block;
      font-size: 6.65pt;
      line-height: 1.08;
      font-weight: 700;
    }
    li span {
      display: block;
      margin-top: 0.2mm;
      color: var(--muted);
      font-size: 5.35pt;
      line-height: 1.12;
      font-weight: 500;
    }
    .panel-foot {
      height: 6.4mm;
      flex: 0 0 6.4mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 1mm;
      border-top: 0.45pt solid var(--line);
      color: var(--muted);
      font-size: 4.6pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.15px;
      text-transform: uppercase;
      position: relative;
      z-index: 1;
    }
    .panel-foot span:last-child { color: var(--ink); }
    @media screen {
      body { padding: 16px; }
      .sheet {
        margin: 0 auto 16px;
        box-shadow: 0 8px 28px rgba(0,0,0,0.18);
      }
    }
  </style>
</head>
<body>
${sheets.replaceAll("{{LOGO}}", logoDataUri)}
</body>
</html>`;
  return trimTrailingWhitespace(html);
}

async function launchBrowser() {
  const launchOptions = { headless: true };
  const chromePath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (chromePath) launchOptions.executablePath = chromePath;
  return puppeteer
    ? puppeteer.launch({ ...launchOptions, headless: "new", args: ["--no-sandbox"] })
    : chromium.launch(launchOptions);
}

async function writePdf(browser, html, pdfPath) {
  const page = await browser.newPage();
  if (page.setViewport) {
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1 });
  } else {
    await page.setViewportSize({ width: 1123, height: 794 });
  }
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const metrics = await page.$$eval(".sheet", (sheets) =>
    sheets.map((sheet, sheetIndex) => ({
      page: sheetIndex + 1,
      sheetHeight: sheet.clientHeight,
      sheetScrollHeight: sheet.scrollHeight,
      panelOverflows: Array.from(sheet.querySelectorAll(".panel")).map((panel, panelIndex) => {
        const body = panel.querySelector(".panel-body");
        return {
          panel: panelIndex + 1,
          height: panel.clientHeight,
          scrollHeight: panel.scrollHeight,
          bodyHeight: body.clientHeight,
          bodyScrollHeight: body.scrollHeight,
          overflow: panel.scrollHeight > panel.clientHeight + 1 || body.scrollHeight > body.clientHeight + 1,
        };
      }),
      overflow: sheet.scrollHeight > sheet.clientHeight + 1,
    })),
  );
  const overflowing = metrics.filter((sheet) => sheet.overflow || sheet.panelOverflows.some((panel) => panel.overflow));
  if (overflowing.length) {
    throw new Error(`Menu Nômade com overflow: ${JSON.stringify(overflowing, null, 2)}`);
  }
  await page.pdf({
    path: pdfPath,
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });
  await page.close();
  return metrics;
}

function lunchMenus(data) {
  if (!data.saladaSelecionada || !data.saladaSelecionada.nome) {
    throw new Error("Escolha exatamente 1 salada em NOMADE_MENU_ALMOCO_JANTAR/almoco_jantar_menus.json.");
  }
  if (!Array.isArray(data.principaisSelecionados) || data.principaisSelecionados.length !== 3) {
    throw new Error("Escolha exatamente 3 pratos em NOMADE_MENU_ALMOCO_JANTAR/almoco_jantar_menus.json.");
  }
  return data.versoes.map((version) => ({
    id: version.id,
    titulo: version.titulo,
    chamada: version.chamada,
    arquivo: version.arquivo,
    secoes: [
      { titulo: "Entradas", tag: "Completo", itens: data.entradas },
      { titulo: "Salada", tag: "1 opção", itens: [data.saladaSelecionada] },
      { titulo: "Principais", tag: "3 opções", itens: data.principaisSelecionados },
      { titulo: "Sobremesa", tag: "Completo", itens: data.sobremesas },
      { titulo: "Bebidas", tag: version.titulo, itens: version.bebidas },
    ],
  }));
}

function renderPdfPreviews(pdfPath, renderDir, prefix) {
  const pdftoppm = path.join(POPPLER_BIN, "pdftoppm.exe");
  if (!fs.existsSync(pdftoppm)) return;
  fs.rmSync(renderDir, { recursive: true, force: true });
  fs.mkdirSync(renderDir, { recursive: true });
  execFileSync(pdftoppm, ["-png", "-r", "120", pdfPath, path.join(renderDir, prefix)]);
}

async function buildHappy(browser) {
  ensureDirs(HAPPY_DIR, HAPPY_OUT_DIR);
  const renderDir = path.join(HAPPY_OUT_DIR, "rendered");
  cleanPreviews(HAPPY_DIR, /^PREVIA_OPCAO_\d+\.png$/i);
  const data = readJson(HAPPY_DATA_PATH);
  if (!Array.isArray(data.opcoes) || data.opcoes.length === 0) {
    throw new Error("NOMADE_MENU_HAPPY_HOUR/happy_hour_opcoes.json precisa ter opcoes.");
  }

  const combinedHtmlPath = path.join(HAPPY_DIR, "NOMADE_HAPPY_HOUR_OPCOES_A4_3_PARTES.html");
  const combinedPdfPath = path.join(HAPPY_DIR, "NOMADE_HAPPY_HOUR_OPCOES_A4_3_PARTES.pdf");
  const combinedHtml = buildHtml(data, data.opcoes, "Nômade - Happy Hour A4 3 partes");
  fs.writeFileSync(combinedHtmlPath, combinedHtml, "utf8");
  const combinedMetrics = await writePdf(browser, combinedHtml, combinedPdfPath);

  const optionOutputs = [];
  for (const option of data.opcoes) {
    const number = slugNumber(option.id);
    const htmlPath = path.join(HAPPY_DIR, `NOMADE_HAPPY_HOUR_OPCAO_${number}_A4_3_PARTES.html`);
    const pdfPath = path.join(HAPPY_DIR, `NOMADE_HAPPY_HOUR_OPCAO_${number}_A4_3_PARTES.pdf`);
    const html = buildHtml(data, [option], `Nômade - Happy Hour ${option.titulo}`);
    fs.writeFileSync(htmlPath, html, "utf8");
    const metrics = await writePdf(browser, html, pdfPath);
    optionOutputs.push({ option: option.id, html: htmlPath, pdf: pdfPath, metrics });
  }

  renderPdfPreviews(combinedPdfPath, renderDir, "opcao");
  for (const option of data.opcoes) {
    const rendered = path.join(renderDir, `opcao-${Number(option.id)}.png`);
    if (fs.existsSync(rendered)) {
      fs.copyFileSync(rendered, path.join(HAPPY_DIR, `PREVIA_OPCAO_${slugNumber(option.id)}.png`));
    }
  }

  const pdfinfo = path.join(POPPLER_BIN, "pdfinfo.exe");
  const pdfInfo = fs.existsSync(pdfinfo) ? execFileSync(pdfinfo, [combinedPdfPath], { encoding: "utf8" }) : "";
  const report = {
    generatedAt: new Date().toISOString(),
    combinedHtml: combinedHtmlPath,
    combinedPdf: combinedPdfPath,
    options: optionOutputs,
    combinedMetrics,
    pdfInfo,
  };
  fs.writeFileSync(path.join(HAPPY_OUT_DIR, "nomade_happy_hour_report.json"), JSON.stringify(report, null, 2), "utf8");
  return report;
}

async function buildLunch(browser) {
  ensureDirs(LUNCH_DIR, LUNCH_OUT_DIR);
  const renderDir = path.join(LUNCH_OUT_DIR, "rendered");
  cleanPreviews(LUNCH_DIR, /^PREVIA_(NAO_ALCOOLICAS|ALCOOLICAS)\.png$/i);
  const data = readJson(LUNCH_DATA_PATH);
  const menus = lunchMenus(data);

  const combinedHtmlPath = path.join(LUNCH_DIR, "NOMADE_ALMOCO_JANTAR_OPCOES_A4_3_PARTES.html");
  const combinedPdfPath = path.join(LUNCH_DIR, "NOMADE_ALMOCO_JANTAR_OPCOES_A4_3_PARTES.pdf");
  const combinedHtml = buildHtml(data, menus, "Nômade - Almoço ou Jantar A4 3 partes");
  fs.writeFileSync(combinedHtmlPath, combinedHtml, "utf8");
  const combinedMetrics = await writePdf(browser, combinedHtml, combinedPdfPath);

  const versionOutputs = [];
  for (const menu of menus) {
    const htmlPath = path.join(LUNCH_DIR, `${menu.arquivo}.html`);
    const pdfPath = path.join(LUNCH_DIR, `${menu.arquivo}.pdf`);
    const html = buildHtml(data, [menu], `Nômade - Almoço ou Jantar ${menu.titulo}`);
    fs.writeFileSync(htmlPath, html, "utf8");
    const metrics = await writePdf(browser, html, pdfPath);
    versionOutputs.push({ version: menu.id, html: htmlPath, pdf: pdfPath, metrics });
  }

  renderPdfPreviews(combinedPdfPath, renderDir, "versao");
  const previewNames = ["PREVIA_NAO_ALCOOLICAS.png", "PREVIA_ALCOOLICAS.png"];
  menus.forEach((menu, index) => {
    const rendered = path.join(renderDir, `versao-${index + 1}.png`);
    if (fs.existsSync(rendered)) {
      fs.copyFileSync(rendered, path.join(LUNCH_DIR, previewNames[index] || `PREVIA_${menu.id}.png`));
    }
  });

  const pdfinfo = path.join(POPPLER_BIN, "pdfinfo.exe");
  const pdfInfo = fs.existsSync(pdfinfo) ? execFileSync(pdfinfo, [combinedPdfPath], { encoding: "utf8" }) : "";
  const report = {
    generatedAt: new Date().toISOString(),
    combinedHtml: combinedHtmlPath,
    combinedPdf: combinedPdfPath,
    versions: versionOutputs,
    combinedMetrics,
    pdfInfo,
  };
  fs.writeFileSync(path.join(LUNCH_OUT_DIR, "nomade_almoco_jantar_report.json"), JSON.stringify(report, null, 2), "utf8");
  return report;
}

async function main() {
  ensureDirs(HAPPY_DIR, LUNCH_DIR, HAPPY_OUT_DIR, LUNCH_OUT_DIR);
  if (!fs.existsSync(LOGO_PATH)) throw new Error(`Logo não encontrado: ${LOGO_PATH}`);
  const browser = await launchBrowser();
  try {
    const happy = await buildHappy(browser);
    const lunch = await buildLunch(browser);
    console.log(`Happy Hour: ${happy.combinedPdf}`);
    console.log(`Almoço/Jantar: ${lunch.combinedPdf}`);
    console.log("OK: menus Nômade em A4 horizontal, 3 partes, sem preços e sem overflow.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
