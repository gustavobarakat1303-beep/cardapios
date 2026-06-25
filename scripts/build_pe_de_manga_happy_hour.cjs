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
const FINAL_DIR = path.join(ROOT, "MENU_HAPPY_HOUR");
const DATA_PATH = path.join(FINAL_DIR, "happy_hour_opcoes.json");
const LOGO_PATH = path.join(ROOT, "assets", "pe-de-manga-logo.png");
const OUT_DIR = path.join(ROOT, "output", "pdf", "happy_hour");
const RENDER_DIR = path.join(OUT_DIR, "rendered");
const COMBINED_HTML_PATH = path.join(FINAL_DIR, "HAPPY_HOUR_OPCOES_A4_3_PARTES.html");
const COMBINED_PDF_PATH = path.join(FINAL_DIR, "HAPPY_HOUR_OPCOES_A4_3_PARTES.pdf");
const REPORT_PATH = path.join(OUT_DIR, "happy_hour_opcoes_report.json");

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
  // Só limpa o diretório de render temporário. As prévias PREVIA_OPCAO_*.png
  // são sobrescritas quando o poppler está disponível; quando não está, são
  // preservadas (evita apagá-las em ambientes sem poppler, como a Action).
  fs.rmSync(RENDER_DIR, { recursive: true, force: true });
  fs.mkdirSync(RENDER_DIR, { recursive: true });
}

// Resolve um binário do poppler: caminho explícito no Windows, PATH no resto.
function popplerBin(name) {
  const win = path.join(POPPLER_BIN, `${name}.exe`);
  if (fs.existsSync(win)) return win;
  return name; // poppler-utils no PATH (Linux/mac)
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugOption(id) {
  return String(id).padStart(2, "0");
}

function loadData() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  if (!Array.isArray(data.opcoes) || data.opcoes.length === 0) {
    throw new Error("MENU_HAPPY_HOUR/happy_hour_opcoes.json precisa ter opcoes.");
  }
  return data;
}

function itemHtml(item) {
  return `<li>${escapeHtml(item)}</li>`;
}

function sectionHtml(section) {
  return `
    <section class="section">
      <div class="section-title">
        <span>${escapeHtml(section.titulo)}</span>
        <i></i>
      </div>
      <ul>${(section.itens || []).map(itemHtml).join("")}</ul>
    </section>`;
}

function panelHtml(data, option) {
  return `
    <article class="panel">
      <header class="panel-head">
        <img src="{{LOGO}}" alt="Pé de Manga" />
        <div>Bar &amp; Restaurante</div>
      </header>
      <main class="panel-body">
        <div class="kicker">${escapeHtml(data.subtitulo || "Eventos Pé de Manga")}</div>
        <h1>${escapeHtml(data.titulo || "Happy Hour")}</h1>
        <div class="option-row">
          <strong>${escapeHtml(option.titulo)}</strong>
          <span>${escapeHtml(data.periodo || "")}</span>
        </div>
        ${option.chamada ? `<p class="lead">${escapeHtml(option.chamada)}</p>` : ""}
        <div class="sections">${(option.secoes || []).map(sectionHtml).join("")}</div>
      </main>
      <footer class="panel-foot">
        <span>${escapeHtml(data.rodape || "@PEDEMANGA")}</span>
        <span>${escapeHtml(option.titulo)}</span>
      </footer>
    </article>`;
}

function sheetHtml(data, option) {
  const panel = panelHtml(data, option);
  return `
    <section class="sheet" data-option="${escapeHtml(option.id)}">
      ${panel}
      ${panel}
      ${panel}
    </section>`;
}

function buildHtml(data, options) {
  const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;
  const sheets = options.map((option) => sheetHtml(data, option)).join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pé de Manga - Happy Hour A4 3 partes</title>
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
      padding: 5.4mm 5.1mm 4.8mm;
      display: flex;
      flex-direction: column;
      border-left: 0.35pt dashed #b6b6b6;
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
      height: 10.6mm;
      flex: 0 0 10.6mm;
      display: grid;
      grid-template-columns: 22mm 1fr;
      align-items: center;
      gap: 3mm;
      border-bottom: 0.55mm solid var(--ink);
      padding-bottom: 2mm;
    }
    .panel-head img {
      display: block;
      width: auto;
      height: 8.4mm;
      filter: grayscale(1) contrast(1.25);
    }
    .panel-head div {
      font-size: 4.2pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.1px;
      text-align: right;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .panel-body {
      flex: 1 1 auto;
      min-height: 0;
      padding-top: 3.7mm;
      position: relative;
      z-index: 1;
    }
    .kicker {
      font-size: 5.2pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1.2px;
      color: var(--muted);
      text-transform: uppercase;
    }
    h1 {
      margin: 1.2mm 0 1.7mm;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 23.5pt;
      line-height: 0.88;
      font-weight: 700;
      letter-spacing: 0;
      color: var(--ink);
    }
    .option-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: end;
      gap: 2mm;
      padding: 0 0 1.7mm;
      border-bottom: 0.45pt solid var(--line);
    }
    .option-row strong {
      font-size: 9.4pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .option-row span {
      font-size: 5pt;
      line-height: 1;
      font-weight: 800;
      color: var(--muted);
      letter-spacing: 1px;
      white-space: nowrap;
    }
    .lead {
      margin: 1.6mm 0 2.4mm;
      font-size: 6.55pt;
      line-height: 1.18;
      font-weight: 600;
      color: var(--muted);
    }
    .sections {
      display: flex;
      flex-direction: column;
      gap: 2.25mm;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 1.7mm;
      margin-bottom: 0.9mm;
    }
    .section-title span {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 13.5pt;
      line-height: 0.9;
      font-weight: 700;
      color: var(--ink);
      white-space: nowrap;
    }
    .section-title i {
      height: 0;
      flex: 1;
      border-top: 0.45pt solid var(--line);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      row-gap: 0.45mm;
    }
    li {
      margin: 0;
      padding: 0.42mm 0 0.55mm;
      border-bottom: 0.35pt dotted #b4b4b4;
      font-size: 6.75pt;
      line-height: 1.07;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .panel-foot {
      height: 6.3mm;
      flex: 0 0 6.3mm;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: end;
      gap: 3mm;
      border-top: 0.45pt solid var(--line);
      color: var(--muted);
      font-size: 5pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 1px;
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
  // puppeteer usa "networkidle0"; playwright usa "networkidle".
  await page.setContent(html, { waitUntil: puppeteer ? "networkidle0" : "networkidle" });
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
    throw new Error(`Happy Hour com overflow: ${JSON.stringify(overflowing, null, 2)}`);
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
  const combinedHtml = buildHtml(data, data.opcoes);
  fs.writeFileSync(COMBINED_HTML_PATH, combinedHtml, "utf8");
  const combinedMetrics = await writePdf(browser, combinedHtml, COMBINED_PDF_PATH);

  const optionOutputs = [];
  for (const option of data.opcoes) {
    const number = slugOption(option.id);
    const htmlPath = path.join(FINAL_DIR, `HAPPY_HOUR_OPCAO_${number}_A4_3_PARTES.html`);
    const pdfPath = path.join(FINAL_DIR, `HAPPY_HOUR_OPCAO_${number}_A4_3_PARTES.pdf`);
    const html = buildHtml(data, [option]);
    fs.writeFileSync(htmlPath, html, "utf8");
    const metrics = await writePdf(browser, html, pdfPath);
    optionOutputs.push({ option: option.id, html: htmlPath, pdf: pdfPath, metrics });
  }
  await browser.close();

  let pdfInfo = "";
  try {
    pdfInfo = execFileSync(popplerBin("pdfinfo"), [COMBINED_PDF_PATH], { encoding: "utf8" });
  } catch { /* pdfinfo opcional */ }
  try {
    execFileSync(popplerBin("pdftoppm"), ["-png", "-r", "120", COMBINED_PDF_PATH, path.join(RENDER_DIR, "opcao")]);
    for (const option of data.opcoes) {
      const rendered = path.join(RENDER_DIR, `opcao-${Number(option.id)}.png`);
      if (fs.existsSync(rendered)) {
        fs.copyFileSync(rendered, path.join(FINAL_DIR, `PREVIA_OPCAO_${slugOption(option.id)}.png`));
      }
    }
  } catch (e) {
    console.warn(`Aviso: poppler (pdftoppm) indisponível — prévias PNG não regeneradas: ${e.message}`);
  }

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        combinedHtml: COMBINED_HTML_PATH,
        combinedPdf: COMBINED_PDF_PATH,
        options: optionOutputs,
        combinedMetrics,
        pdfInfo,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`PDF geral: ${COMBINED_PDF_PATH}`);
  console.log(`Opcoes: ${data.opcoes.length}`);
  console.log("OK: A4 horizontal dividido em 3 partes, sem precos e sem overflow.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
