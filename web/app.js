// Pé de Manga — painel do cardápio (vanilla JS).
// Carrega /api/menu[?menu=chave], edita em memória e salva via /api/save
// (commit no GitHub). Suporta dois tipos de cardápio:
//   - 'sections' : seções/itens com preço (cardápio principal)
//   - 'pacote'   : evento por opção, sem preço (Happy Hour, Almoço/Jantar)

const ICONS = ['appetizer','bread','salad','meat','fish','pasta','burger','dessert',
  'kids','beer','cocktail','mocktail','caipirinha','bottle','wine','soda'];

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const statusEl = $('#status');
const saveBtn = $('#save');
const menuPick = $('#menu-pick');
const pdfLink = $('#pdf');

let current = null;  // { key, type, label, pdf }
let data = null;     // conteúdo do cardápio em memória
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
function swap(arr,a,b){[arr[a],arr[b]]=[arr[b],arr[a]];}

// ---- carga ----------------------------------------------------------------
async function load(key){
  setStatus('carregando…');
  app.innerHTML='<p class="loading">Carregando cardápio…</p>';
  try{
    const r=await fetch('/api/menu'+(key?('?menu='+encodeURIComponent(key)):''),{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const payload=await r.json();
    current={key:payload.key,type:payload.type,label:payload.label,pdf:payload.pdf};
    data=payload.menu;
    populateMenuPick(payload.menus||[],payload.key);
    if(pdfLink&&current.pdf)pdfLink.href='../'+current.pdf;
    dirty=false;saveBtn.disabled=true;setStatus('carregado','ok');
    render();
  }catch(e){
    app.innerHTML='<div class="banner err">Não consegui carregar o cardápio de <code>/api/menu</code>.'
      +' Verifique se o painel está publicado na Vercel com as variáveis de ambiente configuradas.<br>'
      +'<small>'+e.message+'</small></div>';
    setStatus('erro','err');
  }
}

function populateMenuPick(menus,activeKey){
  if(!menuPick)return;
  menuPick.innerHTML=menus.map(m=>`<option value="${m.key}">${m.label}</option>`).join('');
  menuPick.value=activeKey;
}

// ---- render (dispatcher) --------------------------------------------------
function render(){
  app.innerHTML='';
  if(current.type==='pacote'){renderPacote();return;}
  (data.sections||[]).forEach((sec,si)=>app.appendChild(renderSection(sec,si)));
  app.appendChild(renderAddSection());
  validateUI();
}

// ===== Editor de seções/preços (cardápio principal) ========================
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
    if(act==='sec-up'&&si>0){swap(data.sections,si,si-1);markDirty();render();}
    if(act==='sec-down'&&si<data.sections.length-1){swap(data.sections,si,si+1);markDirty();render();}
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
    let id=slug(title);const ex=new Set(data.sections.map(s=>s.id));
    if(ex.has(id)){let k=2;while(ex.has(id+'-'+k))k++;id=id+'-'+k;}
    const sec={id,title,kind,icon,items:[]};
    data.sections.push(sec);
    if(kind==='drink'){ // garante que aparece numa página de bebidas
      data.layout=data.layout||{};data.layout.drinkPages=data.layout.drinkPages||[[]];
      data.layout.drinkPages[data.layout.drinkPages.length-1].push(id);
    }
    markDirty();render();
  });
  return box;
}

function removeSection(si){
  const sec=data.sections[si];
  data.sections.splice(si,1);
  if(data.layout?.drinkPages){
    data.layout.drinkPages=data.layout.drinkPages.map(p=>p.filter(id=>id!==sec.id)).filter(p=>p.length);
  }
  if(data.layout?.foodBreaks){data.layout.foodBreaks=data.layout.foodBreaks.filter(id=>id!==sec.id);}
  markDirty();render();
}

function updateCounts(){document.querySelectorAll('.card[data-si]').forEach((c)=>{
  const si=+c.dataset.si;const cnt=$('.count',c);if(cnt&&data.sections[si])cnt.textContent=data.sections[si].items.length+' itens';});}

function flagPrice(input,val){input.classList.toggle('invalid',!PRICE_RE.test(normPrice(val)||''));}
function validateSectionsUI(){
  let problems=0;
  (data.sections||[]).forEach(sec=>sec.items.forEach(it=>{if(!PRICE_RE.test(normPrice(it.p)||'')||!String(it.n||'').trim())problems++;}));
  return problems;
}

function prepareSections(){
  const out=JSON.parse(JSON.stringify(data));
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

// ===== Editor de pacote (Happy Hour / Almoço-Jantar) =======================
function renderPacote(){
  app.appendChild(renderPacoteMeta());
  data.opcoes=data.opcoes||[];
  data.opcoes.forEach((op,oi)=>app.appendChild(renderOpcao(op,oi)));
  app.appendChild(renderAddOpcao());
  validateUI();
}

function renderPacoteMeta(){
  const box=document.createElement('div');box.className='card meta-card';
  const head=document.createElement('div');head.className='card-head';
  const strong=document.createElement('strong');strong.textContent='Cabeçalho do menu';
  head.appendChild(strong);box.appendChild(head);
  const grid=document.createElement('div');grid.className='meta-grid';
  for(const [k,label] of [['titulo','Título'],['subtitulo','Subtítulo'],['periodo','Período'],['rodape','Rodapé']]){
    const field=document.createElement('label');field.className='meta-field';
    field.appendChild(document.createTextNode(label));
    const inp=document.createElement('input');inp.value=data[k]||'';
    inp.addEventListener('input',()=>{data[k]=inp.value;markDirty();validateUI();});
    field.appendChild(inp);grid.appendChild(field);
  }
  box.appendChild(grid);return box;
}

function renderOpcao(op,oi){
  const node=$('#tpl-opcao').content.firstElementChild.cloneNode(true);
  node.dataset.oi=oi;
  const id=$('.op-id',node),tit=$('.op-titulo',node),cha=$('.op-chamada',node);
  id.value=op.id||'';tit.value=op.titulo||'';cha.value=op.chamada||'';
  id.addEventListener('input',()=>{op.id=id.value;markDirty();});
  tit.addEventListener('input',()=>{op.titulo=tit.value;markDirty();validateUI();});
  cha.addEventListener('input',()=>{op.chamada=cha.value;markDirty();});
  const secBox=$('.secoes',node);
  op.secoes=op.secoes||[];
  op.secoes.forEach((se,si)=>secBox.appendChild(renderPacSec(op,se,si)));
  node.addEventListener('click',(e)=>{
    const act=e.target.dataset.act;if(!act)return;
    if(act==='add-sec'){op.secoes.push({titulo:'',itens:['']});markDirty();render();}
    if(act==='del-op'){if(confirm('Excluir a opção "'+(op.titulo||op.id||'')+'"?')){data.opcoes.splice(oi,1);markDirty();render();}}
    if(act==='op-up'&&oi>0){swap(data.opcoes,oi,oi-1);markDirty();render();}
    if(act==='op-down'&&oi<data.opcoes.length-1){swap(data.opcoes,oi,oi+1);markDirty();render();}
  });
  return node;
}

function renderPacSec(op,se,si){
  const node=$('#tpl-pac-sec').content.firstElementChild.cloneNode(true);
  node.dataset.si=si;
  const tit=$('.ps-titulo',node);
  tit.value=se.titulo||'';
  tit.addEventListener('input',()=>{se.titulo=tit.value;markDirty();validateUI();});
  const itBox=$('.pac-itens',node);
  se.itens=se.itens||[];
  se.itens.forEach((_,ii)=>itBox.appendChild(renderPacItem(se,ii)));
  $('.ps-count',node).textContent=se.itens.length+' itens';
  node.addEventListener('click',(e)=>{
    const act=e.target.dataset.act;if(!act)return;
    if(act==='add-pitem'){se.itens.push('');markDirty();render();}
    if(act==='del-psec'){if(confirm('Excluir a seção "'+(se.titulo||'')+'"?')){op.secoes.splice(si,1);markDirty();render();}}
    if(act==='psec-up'&&si>0){swap(op.secoes,si,si-1);markDirty();render();}
    if(act==='psec-down'&&si<op.secoes.length-1){swap(op.secoes,si,si+1);markDirty();render();}
  });
  return node;
}

function renderPacItem(se,ii){
  const node=$('#tpl-pac-item').content.firstElementChild.cloneNode(true);
  node.dataset.ii=ii;
  const inp=$('.pi-text',node);
  inp.value=se.itens[ii]||'';
  inp.addEventListener('input',()=>{se.itens[ii]=inp.value;markDirty();});
  inp.addEventListener('blur',validateUI);
  node.addEventListener('click',(e)=>{
    const act=e.target.dataset.act;if(!act)return;
    if(act==='del-pitem'){se.itens.splice(ii,1);markDirty();render();}
    if(act==='pi-up'&&ii>0){swap(se.itens,ii,ii-1);markDirty();render();}
    if(act==='pi-down'&&ii<se.itens.length-1){swap(se.itens,ii,ii+1);markDirty();render();}
  });
  return node;
}

function renderAddOpcao(){
  const box=document.createElement('div');box.className='add-sec';
  const strong=document.createElement('strong');strong.textContent='Nova opção: ';
  const btn=document.createElement('button');btn.className='btn tiny';btn.textContent='+ adicionar opção';
  btn.addEventListener('click',()=>{
    data.opcoes=data.opcoes||[];
    const n=data.opcoes.length+1;
    data.opcoes.push({id:String(n),titulo:'Opção '+n,chamada:'',
      secoes:[{titulo:'Bebidas',itens:['']},{titulo:'Cozinha',itens:['']}]});
    markDirty();render();
  });
  box.appendChild(strong);box.appendChild(btn);
  return box;
}

function validatePacoteUI(){
  let problems=0;
  if(!String(data.titulo||'').trim())problems++;
  if(!(data.opcoes||[]).length)problems++;
  (data.opcoes||[]).forEach(op=>{
    if(!String(op.id||'').trim())problems++;
    if(!String(op.titulo||'').trim())problems++;
    if(!(op.secoes||[]).length)problems++;
    (op.secoes||[]).forEach(se=>{
      if(!String(se.titulo||'').trim())problems++;
      if(!(se.itens||[]).some(t=>String(t||'').trim()))problems++;
    });
  });
  return problems;
}

function preparePacote(){
  const out=JSON.parse(JSON.stringify(data));
  out.opcoes=(out.opcoes||[]).map(op=>{
    const o={id:String(op.id||'').trim(),titulo:String(op.titulo||'').trim()};
    if(op.chamada!==undefined)o.chamada=String(op.chamada||'').trim();
    o.secoes=(op.secoes||[]).map(se=>({
      titulo:String(se.titulo||'').trim(),
      itens:(se.itens||[]).map(t=>String(t).trim()).filter(Boolean),
    }));
    return o;
  });
  return out;
}

// ---- validação + salvamento (comum) ---------------------------------------
function validateUI(){
  const problems=current.type==='pacote'?validatePacoteUI():validateSectionsUI();
  if(problems){setStatus(problems+' campo(s) a corrigir','err');saveBtn.disabled=true;}
  else if(dirty){setStatus('pronto para salvar','');saveBtn.disabled=false;}
  else{saveBtn.disabled=true;}
  return problems===0;
}

async function save(){
  if(!validateUI()){alert('Corrija os campos destacados antes de salvar.');return;}
  let pwd=sessionStorage.getItem('pdm_pwd');
  if(!pwd){pwd=prompt('Senha do painel:');if(!pwd)return;sessionStorage.setItem('pdm_pwd',pwd);}
  const payload=current.type==='pacote'?preparePacote():prepareSections();
  setStatus('salvando…');saveBtn.disabled=true;
  try{
    const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:pwd,key:current.key,menu:payload})});
    const resp=await r.json();
    if(!r.ok){
      if(r.status===401)sessionStorage.removeItem('pdm_pwd');
      throw new Error((resp.error||'erro')+(resp.detalhes?': '+resp.detalhes.join('; '):''));
    }
    dirty=false;setStatus('salvo ✓ (PDF regenerando…)','ok');
    data=payload; // reflete IDs/preços/normalizações
    render();
  }catch(e){setStatus('falha ao salvar','err');alert('Não foi possível salvar:\n'+e.message);saveBtn.disabled=false;}
}

// ---- eventos --------------------------------------------------------------
saveBtn.addEventListener('click',save);
$('#reload').addEventListener('click',()=>{if(!dirty||confirm('Descartar alterações não salvas?'))load(current?.key);});
if(menuPick)menuPick.addEventListener('change',()=>{
  const key=menuPick.value;
  if(dirty&&!confirm('Descartar alterações não salvas e trocar de cardápio?')){menuPick.value=current.key;return;}
  load(key);
});
window.addEventListener('beforeunload',(e)=>{if(dirty){e.preventDefault();e.returnValue='';}});

load();
