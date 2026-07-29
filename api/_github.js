// Helpers compartilhados das funções serverless (Vercel) — acesso ao GitHub.
// Configurado por variáveis de ambiente (definidas no painel da Vercel):
//   GITHUB_TOKEN   token com permissão de escrita no repositório (obrigatório)
//   GITHUB_REPO    "owner/repo" (ex.: gustavobarakat1303-beep/cardapios)
//   GITHUB_BRANCH  branch alvo (ex.: claude/bold-dijkstra-6wj1a5 ou main)
//   ADMIN_PASSWORD senha simples para liberar o salvamento (obrigatório)

const API = 'https://api.github.com';
const SAFE = /^[a-z0-9-]{1,40}$/;
const fileFor = (slug) => {
  if (!SAFE.test(String(slug))) throw new Error('cardápio inválido.');
  return `data/${slug}.json`;
};

const FALLBACK_BRANCH = 'main';

export function env() {
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, ADMIN_PASSWORD } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) throw new Error('configuração ausente: GITHUB_TOKEN / GITHUB_REPO');
  return { token: GITHUB_TOKEN, repo: GITHUB_REPO, branch: GITHUB_BRANCH || FALLBACK_BRANCH, password: ADMIN_PASSWORD };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'pe-de-manga-painel',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Branch EFETIVO (auto-cura): se o GITHUB_BRANCH configurado não tiver mais o
// registro data/menus.json (ex.: aponta para um branch antigo/removido depois
// da migração para a main), usa 'main'. Assim o painel não quebra com HTTP 500
// por causa de uma variável de ambiente desatualizada, e leituras E gravações
// passam a operar no branch que realmente tem os dados. Resolvido uma vez por
// instância (cache no módulo).
let _branchCache;
async function branchFor({ token, repo, branch }) {
  if (branch === FALLBACK_BRANCH) return FALLBACK_BRANCH;
  if (_branchCache && _branchCache.key === `${repo}@${branch}`) return _branchCache.value;
  let value = FALLBACK_BRANCH;
  try {
    const url = `${API}/repos/${repo}/contents/data/menus.json?ref=${encodeURIComponent(branch)}`;
    const r = await fetch(url, { headers: headers(token) });
    if (r.ok) value = branch;
  } catch { /* mantém o fallback 'main' */ }
  _branchCache = { key: `${repo}@${branch}`, value };
  return value;
}

// Lê o arquivo de um cardápio (data/<slug>.json) e devolve { json, sha }.
export async function getMenu(cfg, slug = 'completo') {
  const branch = await branchFor(cfg);
  const url = `${API}/repos/${cfg.repo}/contents/${fileFor(slug)}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: headers(cfg.token) });
  if (!r.ok) throw new Error(`GitHub GET ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { json: JSON.parse(content), sha: data.sha };
}

// Lê o registro data/menus.json e devolve a lista de cardápios.
export async function getRegistry(cfg) {
  const branch = await branchFor(cfg);
  const url = `${API}/repos/${cfg.repo}/contents/data/menus.json?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: headers(cfg.token) });
  if (!r.ok) throw new Error(`GitHub GET ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')).menus || [];
}

// Grava o cardápio (commit). `baseSha` = sha que o cliente carregou; se for
// passado e estiver desatualizado, o GitHub rejeita com 409 (trava de concorrência).
export async function putMenu(cfg, slug, menu, message, baseSha) {
  const branch = await branchFor(cfg);
  let sha = baseSha;
  if (!sha) { sha = (await getMenu(cfg, slug).catch(() => ({ sha: undefined }))).sha; }
  const body = {
    message: message || `painel: atualiza cardápio (${slug})`,
    content: Buffer.from(JSON.stringify(menu, null, 2) + '\n', 'utf8').toString('base64'),
    branch,
    sha,
  };
  const url = `${API}/repos/${cfg.repo}/contents/${fileFor(slug)}`;
  const r = await fetch(url, { method: 'PUT', headers: headers(cfg.token), body: JSON.stringify(body) });
  if (r.status === 409) { const e = new Error('stale'); e.code = 409; throw e; }
  if (!r.ok) throw new Error(`GitHub PUT ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { commit: data.commit?.html_url || null, sha: data.content?.sha || null };
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
