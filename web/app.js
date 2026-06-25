// Pé de Manga — painel do cardápio (vanilla JS).
// Carrega /api/menu, edita em memória e salva via /api/save (commit no GitHub).

const ICONS = ['appetizer','bread','salad','meat','fish','pasta','burger','dessert',
  'kids','beer','cocktail','mocktail','caipirinha','bottle','wine','soda'];

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const statusEl = $('#status');
const saveBtn = $('#save');

let menu = null;     // estado em memória
let dirty = false;

// ---- utilidades -----------------------------------------------------------
function slug(s){return (String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40))||'item';}
function normPrice(raw){
  if(raw==null||raw==='')return '';
  let s=String(raw).trim().replace(/\s|R\$/gi,'');
  if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
  const n=Number(s);
  if(!Number.isFinite(n)||n<0)return null;
  return n.toFixed(2).replace('.',',');
}
const PRICE_RE=/^\d{1,4},\d{2}$/;
function setStatus(msg,cls){statusEl.textContent=msg||'';statusEl.className='status'+(cls?' '+cls:'');}
function markDirty(){dirty=true;saveBtn.disabled=false;setStatus('alterações não salvas','');}

// ---- carga ----------------------------------------------------------------
async function load(){
  setStatus('carregando…');
  app.innerHTML='<p class="loading">Carregando cardápio…</p>';
  try{
    const r=await fetch('/api/menu',{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    menu=await r.json();
    dirty=false;saveBtn.disabled=true;setStatus('carregado','ok');
    render();
  }catch(e){
    app.innerHTML='<div class="banner err">Não consegui carregar o cardápio de <code>/api/menu</code>.'
      +' Verifique se o painel está publicado na Vercel com as variáveis de ambiente configuradas.<br>'
      +'<small>'+e.message+'</small></div>';
    setStatus('erro','err');
  }
}

// ---- render ---------------------------------------------------------------
function render(){
  app.innerHTML='';
  menu.sections.forEach((sec,si)=>app.appendChild(renderSection(sec,si)));
  app.appendChild(renderAddSection());
  validateUI();
}

function renderSection(sec,si){
  const node=$('#tpl-section').content.firstElementChild.cloneNode(true);
  node.dataset.si=si;
  const title=$('.sec-title',node);
  title.value=sec.title||'';
  title.addEventListener('input',()=>{sec.title=title.value;markDirty();updateCounts();});
  const kind=$('.kind',node);kind.textContent=sec.kind==='drink'?'bebida':'comida';
  kind.classList.add(sec.kind==='drink'?'drink':'food');
  const itemsBox=$('.items',node);
  sec.items.forEach((it,ii)=>itemsBox.appendChild(renderItem(sec,si,it,ii)));
  $('.count',node).textContent=sec.items.length+' itens';
  node.addEventListener('click',(e)=>{
    const act=e.target.dataset.act;if(!act)return;
    if(act==='add-item'){sec.items.push({id:'',n:'',p:'',_new:true});markDirty();render();}
    if(act==='del-sec'){if(confirm('Excluir a seção "'+(sec.title||sec.id)+'" e todos os itens?')){removeSection(si);}}
    if(act==='sec-up'&&si>0){swap(menu.sections,si,si-1);markDirty();render();}
    if(act==='sec-down'&&si<menu.sections.length-1){swap(menu.sections,si,si+1);markDirty();render();}
  });
  return node;
}

function renderItem(sec,si,it,ii){
  const node=$('#tpl-item').content.firstElementChild.cloneNode(true);
  node.dataset.ii=ii;
  const nome=$('.i-nome',node),tam=$('.i-tam',node),preco=$('.i-preco',node),desc=$('.i-desc',node);
  nome.value=it.n||'';tam.value=it.sz||'';preco.value=it.p||'';desc.value=it.d||'';
  nome.addEventListener('input',()=>{it.n=nome.value;markDirty();});
  tam.addEventListener('input',()=>{it.sz=tam.value;markDirty();});
  desc.addEventListener('input',()=>{it.d=desc.value;markDirty();});
  preco.addEventListener('input',()=>{it.p=preco.value;markDirty();flagPrice(preco,it.p);});
  preco.addEventListener('blur',()=>{const n=normPrice(preco.value);if(n){it.p=n;preco.value=n;}flagPrice(preco,it.p);validateUI();});
  node.addEventListener('click',(e)=>{
    const act=e.target.dataset.act;if(!act)return;
    if(act==='del-item'){sec.items.splice(ii,1);markDirty();render();}
    if(act==='item-up'&&ii>0){swap(sec.items,ii,ii-1);markDirty();render();}
    if(act==='item-down'&&ii<sec.items.length-1){swap(sec.items,ii,ii+1);markDirty();render();}
  });
  return node;
}

function renderAddSection(){
  const box=document.createElement('div');box.className='add-sec';
  box.innerHTML=`<strong>Nova seção:</strong>
    <input id="ns-title" placeholder="Título (ex.: Vinhos do Mês)" />
    <select id="ns-kind"><option value="food">comida</option><option value="drink">bebida</option></select>
    <select id="ns-icon">${ICONS.map(i=>`<option value="${i}">${i}</option>`).join('')}</select>
    <button class="btn tiny" id="ns-add">+ adicionar seção</button>`;
  box.querySelector('#ns-add').addEventListener('click',()=>{
    const title=box.querySelector('#ns-title').value.trim();
    if(!title){alert('Informe um título.');return;}
    const kind=box.querySelector('#ns-kind').value;
    const icon=box.querySelector('#ns-icon').value;
    let id=slug(title);const ex=new Set(menu.sections.map(s=>s.id));
    if(ex.has(id)){let k=2;while(ex.has(id+'-'+k))k++;id=id+'-'+k;}
    const sec={id,title,kind,icon,items:[]};
    menu.sections.push(sec);
    if(kind==='drink'){ // garante que aparece numa página de bebidas
      menu.layout=menu.layout||{};menu.layout.drinkPages=menu.layout.drinkPages||[[]];
      menu.layout.drinkPages[menu.layout.drinkPages.length-1].push(id);
    }
    markDirty();render();
  });
  return box;
}

// ---- operações de estrutura ----------------------------------------------
function swap(arr,a,b){[arr[a],arr[b]]=[arr[b],arr[a]];}
function removeSection(si){
  const sec=menu.sections[si];
  menu.sections.splice(si,1);
  // remove referências em layout
  if(menu.layout?.drinkPages){
    menu.layout.drinkPages=menu.layout.drinkPages.map(p=>p.filter(id=>id!==sec.id)).filter(p=>p.length);
  }
  if(menu.layout?.foodBreaks){menu.layout.foodBreaks=menu.layout.foodBreaks.filter(id=>id!==sec.id);}
  markDirty();render();
}

function updateCounts(){document.querySelectorAll('.card').forEach((c)=>{
  const si=+c.dataset.si;$('.count',c).textContent=menu.sections[si].items.length+' itens';});}

// ---- validação visual -----------------------------------------------------
function flagPrice(input,val){input.classList.toggle('invalid',!PRICE_RE.test(normPrice(val)||''));}
function validateUI(){
  let problems=0;
  menu.sections.forEach(sec=>sec.items.forEach(it=>{if(!PRICE_RE.test(normPrice(it.p)||'')||!String(it.n||'').trim())problems++;}));
  if(problems){setStatus(problems+' campo(s) a corrigir','err');saveBtn.disabled=true;}
  else if(dirty){setStatus('pronto para salvar','');saveBtn.disabled=false;}
  return problems===0;
}

// ---- preparação + salvamento ---------------------------------------------
function prepare(){
  // gera IDs estáveis e normaliza preços; remove campos transitórios/vazios
  const out=JSON.parse(JSON.stringify(menu));
  for(const sec of out.sections){
    if(!sec.id)sec.id=slug(sec.title);
    const used=new Set();
    for(const it of sec.items){
      it.p=normPrice(it.p)||it.p;
      if(!it.id||it._new){let base=slug(it.n);let id=base,k=2;while(used.has(id))id=base+'-'+(k++);it.id=id;}
      used.add(it.id);
      delete it._new;
      if(!it.sz)delete it.sz;
      if(!it.d)delete it.d;
    }
  }
  return out;
}

async function save(){
  if(!validateUI()){alert('Corrija os campos destacados antes de salvar.');return;}
  let pwd=sessionStorage.getItem('pdm_pwd');
  if(!pwd){pwd=prompt('Senha do painel:');if(!pwd)return;sessionStorage.setItem('pdm_pwd',pwd);}
  setStatus('salvando…');saveBtn.disabled=true;
  try{
    const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:pwd,menu:prepare()})});
    const data=await r.json();
    if(!r.ok){
      if(r.status===401)sessionStorage.removeItem('pdm_pwd');
      throw new Error((data.error||'erro')+(data.detalhes?': '+data.detalhes.join('; '):''));
    }
    dirty=false;setStatus('salvo ✓ (PDF regenerando…)','ok');
    menu=prepare(); // reflete IDs/preços normalizados
    render();
  }catch(e){setStatus('falha ao salvar','err');alert('Não foi possível salvar:\n'+e.message);saveBtn.disabled=false;}
}

// ---- eventos --------------------------------------------------------------
saveBtn.addEventListener('click',save);
$('#reload').addEventListener('click',()=>{if(!dirty||confirm('Descartar alterações não salvas?'))load();});
window.addEventListener('beforeunload',(e)=>{if(dirty){e.preventDefault();e.returnValue='';}});

load();
