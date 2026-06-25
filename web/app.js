// Pé de Manga — painel do cardápio (vanilla JS).
// Carrega /api/menu, edita em memória e salva via /api/save (commit no GitHub).

const ICONS = ['appetizer','bread','salad','meat','fish','pasta','burger','dessert',
  'kids','beer','cocktail','mocktail','caipirinha','bottle','wine','soda'];

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const statusEl = $('#status');
const saveBtn = $('#save');

let menu = null;     // estado em memória
let baseSha = null;  // versão carregada (trava de concorrência)
let currentSlug = 'completo'; // cardápio selecionado
let dirty = false;
const menuTypes = {}; // slug -> type ('evento' | undefined)
let isEvento = false; // true quando o cardápio atual é de evento

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
    const r=await fetch('/api/menu?menu='+encodeURIComponent(currentSlug),{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const data=await r.json();
    menu=data.menu||data; baseSha=data.sha||null;
    isEvento=menuTypes[currentSlug]==='evento';
    $('#pdf').href=isEvento?'/output/'+currentSlug+'-geral.pdf':'/output/'+currentSlug+'.pdf';
    dirty=false;saveBtn.disabled=true;setStatus('carregado','ok');
    if(isEvento)renderEvento(); else render();
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

// ---- configurador de evento ----------------------------------------------
const itemKey=(it)=>String(it&&it.nome||'')+'|'+String(it&&it.descricao||'');
function itemLine(it){
  const nome=document.createElement('strong');nome.textContent=it.nome||'';
  const frag=document.createDocumentFragment();frag.appendChild(nome);
  if(it.descricao){const d=document.createElement('span');d.textContent=it.descricao;frag.appendChild(d);}
  return frag;
}
function evtFixedList(title,tag,items){
  const box=document.createElement('div');box.className='evt-block';
  const h=document.createElement('div');h.className='evt-block-head';
  h.innerHTML=`<span>${title}</span><em>${tag}</em>`;box.appendChild(h);
  const ul=document.createElement('ul');ul.className='evt-fixed';
  (items||[]).forEach((it)=>{
    const li=document.createElement('li');
    if(typeof it==='string')li.textContent=it; else li.appendChild(itemLine(it));
    ul.appendChild(li);
  });
  box.appendChild(ul);
  return box;
}
function renderEvento(){
  if(Array.isArray(menu.opcoes)){renderEventoOpcoes();return;}
  app.innerHTML='';
  const wrap=document.createElement('div');wrap.className='evt';

  const head=document.createElement('div');head.className='evt-head';
  head.innerHTML=`<h2>${menu.titulo||'Menu de evento'}</h2>`
    +`<p class="evt-sub">${menu.subtitulo||''} · ${menu.periodo||''}</p>`
    +`<p class="evt-hint">Monte o cardápio do evento: escolha <strong>1 salada</strong> e `
    +`<strong>3 pratos principais</strong>. Entradas, sobremesas e bebidas são fixas. `
    +`Sem preços (pacote fechado).</p>`;
  wrap.appendChild(head);

  // Entradas (fixas)
  wrap.appendChild(evtFixedList('Entradas','Completo',menu.entradas));

  // Salada (1 opção) ------------------------------------------------------
  const salBox=document.createElement('div');salBox.className='evt-block';
  salBox.innerHTML='<div class="evt-block-head"><span>Salada</span><em>escolha 1</em></div>';
  const selKey=itemKey(menu.saladaSelecionada);
  (menu.saladasDisponiveis||[]).forEach((s)=>{
    const id='sal-'+slug(s.nome+'-'+(s.descricao||''));
    const row=document.createElement('label');row.className='evt-opt';row.setAttribute('for',id);
    const rb=document.createElement('input');rb.type='radio';rb.name='evt-salada';rb.id=id;
    rb.checked=itemKey(s)===selKey;
    rb.addEventListener('change',()=>{menu.saladaSelecionada={nome:s.nome,descricao:s.descricao||''};markDirty();validateUI();});
    const txt=document.createElement('div');txt.className='evt-opt-txt';txt.appendChild(itemLine(s));
    row.appendChild(rb);row.appendChild(txt);
    salBox.appendChild(row);
  });
  wrap.appendChild(salBox);

  // Principais (3 opções) -------------------------------------------------
  const prBox=document.createElement('div');prBox.className='evt-block';
  prBox.innerHTML='<div class="evt-block-head"><span>Pratos principais</span>'
    +'<em class="evt-count">0/3</em></div>';
  const countEl=prBox.querySelector('.evt-count');
  const selSet=new Set((menu.principaisSelecionados||[]).map(itemKey));
  const boxes=[];
  function syncPratos(){
    const sel=boxes.filter((b)=>b.checked);
    countEl.textContent=sel.length+'/3';
    countEl.classList.toggle('ok',sel.length===3);
    boxes.forEach((b)=>{ b.disabled=(!b.checked && sel.length>=3); });
  }
  (menu.principaisDisponiveis||[]).forEach((p)=>{
    const id='pr-'+slug(p.nome+'-'+(p.descricao||''));
    const row=document.createElement('label');row.className='evt-opt';row.setAttribute('for',id);
    const cb=document.createElement('input');cb.type='checkbox';cb.id=id;
    cb.checked=selSet.has(itemKey(p));cb._item=p;boxes.push(cb);
    cb.addEventListener('change',()=>{
      const chosen=boxes.filter((b)=>b.checked);
      if(chosen.length>3){cb.checked=false;return;}
      menu.principaisSelecionados=boxes.filter((b)=>b.checked).map((b)=>({nome:b._item.nome,descricao:b._item.descricao||''}));
      markDirty();syncPratos();validateUI();
    });
    const txt=document.createElement('div');txt.className='evt-opt-txt';txt.appendChild(itemLine(p));
    row.appendChild(cb);row.appendChild(txt);
    prBox.appendChild(row);
  });
  wrap.appendChild(prBox);
  syncPratos();

  // Sobremesas (fixas)
  wrap.appendChild(evtFixedList('Sobremesa','Completo',menu.sobremesas));

  // Bebidas / versões (fixas) + PDFs --------------------------------------
  (menu.versoes||[]).forEach((v)=>{
    const box=evtFixedList('Bebidas — '+(v.titulo||v.id),'fixo',v.bebidas);
    const a=document.createElement('a');a.className='btn tiny evt-pdf';
    a.href='/output/'+currentSlug+'-'+v.id+'.pdf';a.target='_blank';a.textContent='Ver PDF desta versão';
    box.appendChild(a);
    wrap.appendChild(box);
  });

  app.appendChild(wrap);
  validateUI();
}

// ---- configurador de evento por OPÇÕES (Happy Hour) -----------------------
// Estrutura: { titulo, subtitulo, periodo, rodape, opcoes:[{ id, titulo,
// chamada, secoes:[{ titulo, itens:[texto] }] }] }. Pacote fechado, sem preço.
function renderEventoOpcoes(){
  app.innerHTML='';
  menu.opcoes=menu.opcoes||[];
  app.appendChild(renderOpMeta());
  menu.opcoes.forEach((op,oi)=>app.appendChild(renderOpcao(op,oi)));
  app.appendChild(renderAddOpcao());
  validateUI();
}

function renderOpMeta(){
  const box=document.createElement('div');box.className='card meta-card';
  const head=document.createElement('div');head.className='card-head';
  const strong=document.createElement('strong');strong.textContent='Cabeçalho do menu';
  head.appendChild(strong);box.appendChild(head);
  const grid=document.createElement('div');grid.className='meta-grid';
  for(const [k,label] of [['titulo','Título'],['subtitulo','Subtítulo'],['periodo','Período'],['rodape','Rodapé']]){
    const field=document.createElement('label');field.className='meta-field';
    field.appendChild(document.createTextNode(label));
    const inp=document.createElement('input');inp.value=menu[k]||'';
    inp.addEventListener('input',()=>{menu[k]=inp.value;markDirty();validateUI();});
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
  const secBox=$('.op-secoes',node);
  op.secoes=op.secoes||[];
  op.secoes.forEach((se,si)=>secBox.appendChild(renderOpSec(op,se,si)));
  node.addEventListener('click',(e)=>{
    const act=e.target.dataset.act;if(!act)return;
    if(act==='add-osec'){op.secoes.push({titulo:'',itens:['']});markDirty();renderEventoOpcoes();}
    if(act==='del-op'){if(confirm('Excluir a opção "'+(op.titulo||op.id||'')+'"?')){menu.opcoes.splice(oi,1);markDirty();renderEventoOpcoes();}}
    if(act==='op-up'&&oi>0){swap(menu.opcoes,oi,oi-1);markDirty();renderEventoOpcoes();}
    if(act==='op-down'&&oi<menu.opcoes.length-1){swap(menu.opcoes,oi,oi+1);markDirty();renderEventoOpcoes();}
  });
  return node;
}

function renderOpSec(op,se,si){
  const node=$('#tpl-op-sec').content.firstElementChild.cloneNode(true);
  node.dataset.si=si;
  const tit=$('.osec-titulo',node);
  tit.value=se.titulo||'';
  tit.addEventListener('input',()=>{se.titulo=tit.value;markDirty();validateUI();});
  const itBox=$('.osec-itens',node);
  se.itens=se.itens||[];
  se.itens.forEach((_,ii)=>itBox.appendChild(renderOpItem(se,ii)));
  $('.osec-count',node).textContent=se.itens.length+' itens';
  node.addEventListener('click',(e)=>{
    const act=e.target.dataset.act;if(!act)return;
    if(act==='add-oitem'){se.itens.push('');markDirty();renderEventoOpcoes();}
    if(act==='del-osec'){if(confirm('Excluir a seção "'+(se.titulo||'')+'"?')){op.secoes.splice(si,1);markDirty();renderEventoOpcoes();}}
    if(act==='osec-up'&&si>0){swap(op.secoes,si,si-1);markDirty();renderEventoOpcoes();}
    if(act==='osec-down'&&si<op.secoes.length-1){swap(op.secoes,si,si+1);markDirty();renderEventoOpcoes();}
  });
  return node;
}

function renderOpItem(se,ii){
  const node=$('#tpl-op-item').content.firstElementChild.cloneNode(true);
  node.dataset.ii=ii;
  const inp=$('.oitem-text',node);
  inp.value=se.itens[ii]||'';
  inp.addEventListener('input',()=>{se.itens[ii]=inp.value;markDirty();});
  inp.addEventListener('blur',validateUI);
  node.addEventListener('click',(e)=>{
    const act=e.target.dataset.act;if(!act)return;
    if(act==='del-oitem'){se.itens.splice(ii,1);markDirty();renderEventoOpcoes();}
    if(act==='oitem-up'&&ii>0){swap(se.itens,ii,ii-1);markDirty();renderEventoOpcoes();}
    if(act==='oitem-down'&&ii<se.itens.length-1){swap(se.itens,ii,ii+1);markDirty();renderEventoOpcoes();}
  });
  return node;
}

function renderAddOpcao(){
  const box=document.createElement('div');box.className='add-sec';
  const strong=document.createElement('strong');strong.textContent='Nova opção: ';
  const btn=document.createElement('button');btn.className='btn tiny';btn.textContent='+ adicionar opção';
  btn.addEventListener('click',()=>{
    menu.opcoes=menu.opcoes||[];
    const n=menu.opcoes.length+1;
    menu.opcoes.push({id:String(n),titulo:'Opção '+n,chamada:'',
      secoes:[{titulo:'Bebidas',itens:['']},{titulo:'Cozinha',itens:['']}]});
    markDirty();renderEventoOpcoes();
  });
  box.appendChild(strong);box.appendChild(btn);
  return box;
}

function validateOpcoesUI(){
  if(!String(menu.titulo||'').trim()){setStatus('título do menu vazio','err');saveBtn.disabled=true;return false;}
  if(!(menu.opcoes||[]).length){setStatus('adicione ao menos 1 opção','err');saveBtn.disabled=true;return false;}
  for(const op of menu.opcoes){
    if(!String(op.id||'').trim()||!String(op.titulo||'').trim()){setStatus('opção sem id/título','err');saveBtn.disabled=true;return false;}
    if(!/^[a-z0-9-]+$/i.test(String(op.id))){setStatus('id de opção inválido (só letras, números e hífen)','err');saveBtn.disabled=true;return false;}
    if(!(op.secoes||[]).length){setStatus('opção sem seções','err');saveBtn.disabled=true;return false;}
    for(const se of op.secoes){
      if(!String(se.titulo||'').trim()){setStatus('seção sem título','err');saveBtn.disabled=true;return false;}
      if(!(se.itens||[]).some(t=>String(t||'').trim())){setStatus('seção sem itens','err');saveBtn.disabled=true;return false;}
    }
  }
  if(dirty){setStatus('pronto para salvar','');saveBtn.disabled=false;}
  return true;
}

function prepareOpcoes(){
  const out=JSON.parse(JSON.stringify(menu));
  out.opcoes=(out.opcoes||[]).map((op)=>{
    const o={id:String(op.id||'').trim(),titulo:String(op.titulo||'').trim()};
    if(op.chamada!==undefined)o.chamada=String(op.chamada||'').trim();
    o.secoes=(op.secoes||[]).map((se)=>({
      titulo:String(se.titulo||'').trim(),
      itens:(se.itens||[]).map((t)=>String(t).trim()).filter(Boolean),
    }));
    return o;
  });
  return out;
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
  if(isEvento){
    if(Array.isArray(menu.opcoes))return validateOpcoesUI();
    const okSalada=!!(menu.saladaSelecionada&&menu.saladaSelecionada.nome);
    const okPratos=Array.isArray(menu.principaisSelecionados)&&menu.principaisSelecionados.length===3;
    if(!okSalada){setStatus('selecione 1 salada','err');saveBtn.disabled=true;return false;}
    if(!okPratos){setStatus('selecione exatamente 3 pratos principais','err');saveBtn.disabled=true;return false;}
    if(dirty){setStatus('pronto para salvar','');saveBtn.disabled=false;}
    return true;
  }
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
    const body=isEvento
      ? {password:pwd,menu:Array.isArray(menu.opcoes)?prepareOpcoes():menu,sha:baseSha,slug:currentSlug,type:'evento'}
      : {password:pwd,menu:prepare(),sha:baseSha,slug:currentSlug};
    const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      if(r.status===401)sessionStorage.removeItem('pdm_pwd');
      if(r.status===409){ setStatus('desatualizado','err'); saveBtn.disabled=false;
        if(confirm((data.error||'O cardápio mudou no servidor.')+'\n\nRecarregar agora? (suas edições não salvas serão perdidas)')) load();
        return; }
      throw new Error((data.error||'erro')+(data.detalhes?': '+data.detalhes.join('; '):''));
    }
    baseSha=data.sha||baseSha; // avança para a versão recém-gravada
    dirty=false;setStatus('salvo ✓ (PDF regenerando…)','ok');
    if(isEvento){saveBtn.disabled=true;}
    else{menu=prepare();render();} // reflete IDs/preços normalizados
  }catch(e){setStatus('falha ao salvar','err');alert('Não foi possível salvar:\n'+e.message);saveBtn.disabled=false;}
}

// ---- eventos --------------------------------------------------------------
saveBtn.addEventListener('click',save);
$('#reload').addEventListener('click',()=>{if(!dirty||confirm('Descartar alterações não salvas?'))load();});
window.addEventListener('beforeunload',(e)=>{if(dirty){e.preventDefault();e.returnValue='';}});

const sel=$('#menu-select');
sel.addEventListener('change',()=>{
  if(dirty && !confirm('Trocar de cardápio? Alterações não salvas serão perdidas.')){sel.value=currentSlug;return;}
  currentSlug=sel.value; load();
});

async function init(){
  try{
    const r=await fetch('/api/menus',{cache:'no-store'});
    const data=await r.json();
    const menus=(data.menus||[]).filter(m=>m&&m.slug);
    menus.forEach(m=>{menuTypes[m.slug]=m.type;});
    if(menus.length){
      sel.innerHTML=menus.map(m=>`<option value="${m.slug}">${m.name||m.slug}</option>`).join('');
      currentSlug=menus.some(m=>m.slug===currentSlug)?currentSlug:menus[0].slug;
      sel.value=currentSlug;
    }
  }catch(e){ /* segue com 'completo' */ }
  load();
}
init();
