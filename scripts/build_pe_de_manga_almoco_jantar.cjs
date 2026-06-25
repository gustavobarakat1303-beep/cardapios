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
const FINAL_DIR = path.join(ROOT, "MENU_ALMOCO_JANTAR");
const DATA_PATH = path.join(FINAL_DIR, "almoco_jantar_menus.json");
const LOGO_PATH = path.join(ROOT, "assets", "pe-de-manga-logo.png");
const OUT_DIR = path.join(ROOT, "output", "pdf", "almoco_jantar");
const RENDER_DIR = path.join(OUT_DIR, "rendered");
const COMBINED_HTML_PATH = path.join(FINAL_DIR, "ALMOCO_JANTAR_OPCOES_A4_3_PARTES.html");
const COMBINED_PDF_PATH = path.join(FINAL_DIR, "ALMOCO_JANTAR_OPCOES_A4_3_PARTES.pdf");
const REPORT_PATH = path.join(OUT_DIR, "almoco_jantar_report.json");

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

function ensureDirs() {
  for (const dir of [FINAL_DIR, OUT_DIR, RENDER_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanGenerated() {
  for (const file of fs.readdirSync(FINAL_DIR)) {
    if (/^PREVIA_(NAO_ALCOOLICAS|ALCOOLICAS)\.png$/i.test(file)) fs.unlinkSync(path.join(FINAL_DIR, file));
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
  if (!data.saladaSelecionada || !data.saladaSelecionada.nome) {
    throw new Error("Escolha exatamente 1 salada em saladaSelecionada.");
  }
  if (!Array.isArray(data.principaisSelecionados) || data.principaisSelecionados.length !== 3) {
    throw new Error("Escolha exatamente 3 pratos em principaisSelecionados.");
  }
  if (!Array.isArray(data.versoes) || data.versoes.length === 0) {
    throw new Error("Cadastre ao menos uma versao de bebidas.");
  }
  return data;
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

function sectionsForVersion(data, version) {
  return [
    { titulo: "Entradas", tag: "Completo", itens: data.entradas },
    { titulo: "Salada", tag: "1 opção", itens: [data.saladaSelecionada] },
    { titulo: "Principais", tag: "3 opções", itens: data.principaisSelecionados },
    { titulo: "Sobremesa", tag: "Completo", itens: data.sobremesas },
    { titulo: "Bebidas", tag: version.titulo, itens: version.bebidas },
  ];
}

function panelHtml(data, version) {
  return `
    <article class="panel">
      <header class="panel-head">
        <img src="{{LOGO}}" alt="Pé de Manga" />
        <div>Bar &amp; Restaurante</div>
      </header>
      <main class="panel-body">
        <div class="kicker">${escapeHtml(data.subtitulo || "Eventos Pé de Manga")}</div>
        <h1>${escapeHtml(data.titulo || "Almoço ou Jantar")}</h1>
        <div class="option-row">
          <strong>${escapeHtml(version.titulo)}</strong>
          <span>${escapeHtml(data.periodo || "")}</span>
        </div>
        ${version.chamada ? `<p class="lead">${escapeHtml(version.chamada)}</p>` : ""}
        <div class="sections">${sectionsForVersion(data, version).map(sectionHtml).join("")}</div>
      </main>
      <footer class="panel-foot">
        <span>${escapeHtml(data.rodape || "@PEDEMANGA")}</span>
        <span>${escapeHtml(version.titulo)}</span>
      </footer>
    </article>`;
}

function sheetHtml(data, version) {
  const panel = panelHtml(data, version);
  return `
    <section class="sheet" data-version="${escapeHtml(version.id)}">
      ${panel}
      ${panel}
      ${panel}
    </section>`;
}

function buildHtml(data, versions) {
  const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;
  const sheets = versions.map((version) => sheetHtml(data, version)).join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pé de Manga - Almoço ou Jantar A4 3 partes</title>
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
      right: 4.5mm;
      bottom: 14mm;
      width: 30mm;
      height: 30mm;
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
      width: auto;
      height: 9.2mm;
      filter: grayscale(1) contrast(1.25);
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
      padding-top: 4mm;
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
      margin: 0 0 2.5mm;
      padding: 1.7mm 3mm 0;
      border-top: 0.45pt solid var(--line);
      font-size: 5.5pt;
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
      font-size: 12.9pt;
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
      font-size: 6.05pt;
      line-height: 1.1;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    li strong {
      display: block;
      font-size: 6.35pt;
      line-height: 1.08;
      font-weight: 800;
    }
    li span {
      display: block;
      margin-top: 0.2mm;
      color: var(--muted);
      font-size: 5.1pt;
      line-height: 1.1;
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
    throw new Error(`Almoco/Jantar com overflow: ${JSON.stringify(overflowing, null, 2)}`);
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

async function main() {
  ensureDirs();
  cleanGenerated();
  const data = loadData();
  const browser = await launchBrowser();
  const combinedHtml = buildHtml(data, data.versoes);
  fs.writeFileSync(COMBINED_HTML_PATH, combinedHtml, "utf8");
  const combinedMetrics = await writePdf(browser, combinedHtml, COMBINED_PDF_PATH);

  const versionOutputs = [];
  for (const version of data.versoes) {
    const htmlPath = path.join(FINAL_DIR, `${version.arquivo}.html`);
    const pdfPath = path.join(FINAL_DIR, `${version.arquivo}.pdf`);
    const html = buildHtml(data, [version]);
    fs.writeFileSync(htmlPath, html, "utf8");
    const metrics = await writePdf(browser, html, pdfPath);
    versionOutputs.push({ version: version.id, html: htmlPath, pdf: pdfPath, metrics });
  }
  await browser.close();

  const pdfinfo = path.join(POPPLER_BIN, "pdfinfo.exe");
  const pdftoppm = path.join(POPPLER_BIN, "pdftoppm.exe");
  const pdfInfo = fs.existsSync(pdfinfo) ? execFileSync(pdfinfo, [COMBINED_PDF_PATH], { encoding: "utf8" }) : "";
  if (fs.existsSync(pdftoppm)) {
    execFileSync(pdftoppm, ["-png", "-r", "120", COMBINED_PDF_PATH, path.join(RENDER_DIR, "versao")]);
    const previewNames = ["PREVIA_NAO_ALCOOLICAS.png", "PREVIA_ALCOOLICAS.png"];
    data.versoes.forEach((version, index) => {
      const rendered = path.join(RENDER_DIR, `versao-${index + 1}.png`);
      if (fs.existsSync(rendered)) {
        fs.copyFileSync(rendered, path.join(FINAL_DIR, previewNames[index] || `PREVIA_${version.id}.png`));
      }
    });
  }

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        combinedHtml: COMBINED_HTML_PATH,
        combinedPdf: COMBINED_PDF_PATH,
        versions: versionOutputs,
        combinedMetrics,
        pdfInfo,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`PDF geral: ${COMBINED_PDF_PATH}`);
  console.log(`Versoes: ${data.versoes.length}`);
  console.log("OK: A4 horizontal dividido em 3 partes, sem precos e sem overflow.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
