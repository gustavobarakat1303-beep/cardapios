// Helpers compartilhados das funções serverless (Vercel) — acesso ao GitHub.
// Configurado por variáveis de ambiente (definidas no painel da Vercel):
//   GITHUB_TOKEN   token com permissão de escrita no repositório (obrigatório)
//   GITHUB_REPO    "owner/repo" (ex.: gustavobarakat1303-beep/cardapios)
//   GITHUB_BRANCH  branch alvo (ex.: claude/bold-dijkstra-6wj1a5 ou main)
//   ADMIN_PASSWORD senha simples para liberar o salvamento (obrigatório)

const API = 'https://api.github.com';
const FILE = 'data/menu.json';

export function env() {
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, ADMIN_PASSWORD } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) throw new Error('configuração ausente: GITHUB_TOKEN / GITHUB_REPO');
  return { token: GITHUB_TOKEN, repo: GITHUB_REPO, branch: GITHUB_BRANCH || 'main', password: ADMIN_PASSWORD };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'pe-de-manga-painel',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Lê o menu.json atual e devolve { json, sha }.
export async function getMenu({ token, repo, branch }) {
  const url = `${API}/repos/${repo}/contents/${FILE}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: headers(token) });
  if (!r.ok) throw new Error(`GitHub GET ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { json: JSON.parse(content), sha: data.sha };
}

// Grava o menu.json (commit). `menu` é objeto; serializa com 2 espaços.
export async function putMenu({ token, repo, branch }, menu, message) {
  const cur = await getMenu({ token, repo, branch }).catch(() => ({ sha: undefined }));
  const body = {
    message: message || 'painel: atualiza cardápio',
    content: Buffer.from(JSON.stringify(menu, null, 2) + '\n', 'utf8').toString('base64'),
    branch,
    sha: cur.sha,
  };
  const url = `${API}/repos/${repo}/contents/${FILE}`;
  const r = await fetch(url, { method: 'PUT', headers: headers(token), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`GitHub PUT ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { commit: data.commit?.html_url || null };
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
