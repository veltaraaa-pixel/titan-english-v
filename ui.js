'use strict';
/* Interfaz */
var S = null, TAB = 'mes', colaUI = [], modalAbierto = false, filtroLogV = 'importante', avanzando = false;
var DEV_MODE = false; try{ DEV_MODE = /[?&]dev=1(&|$)/.test(location.search); }catch(e){}

function $(id){ return document.getElementById(id); }
function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function cls(v){ return num(v,0)>=0?'pos':'neg'; }
function sig(v){ return (num(v,0)>=0?'▲ ':'▼ '); }

/* ===================== UI v2: goals, Titan Path, cards, juice (presentation only) ===================== */
function ico(name, cls){ return '<svg class="ic-svg'+(cls?' '+cls:'')+'" aria-hidden="true"><use href="#i-'+name+'"></use></svg>'; }
var SECTOR_META = {
  'Services':{mk:'SV',c:'#7c9cff'}, 'Retail':{mk:'RT',c:'#ff9f5a'}, 'Technology':{mk:'TC',c:'#5ad1ff'}, 'Manufacturing':{mk:'MF',c:'#b0b8c4'},
  'Energy':{mk:'EN',c:'#ffd54a'}, 'Finance':{mk:'FN',c:'#4ade80'}, 'Real Estate':{mk:'RE',c:'#c084fc'}, 'Transportation':{mk:'TR',c:'#fb7185'},
  'Media':{mk:'MD',c:'#f472b6'}, 'Healthcare':{mk:'HC',c:'#34d399'}
};
function secMeta(s){ return SECTOR_META[s] || {mk:'CO', c:'#9aa3b2'}; }
function secMark(s, lg){ var m = secMeta(s); return '<span class="mk'+(lg?' lg':'')+'" style="background:'+m.c+'" title="'+esc(s)+'">'+m.mk+'</span>'; }
function secChip(s, extra){ var m = secMeta(s); return '<span class="sec">'+secMark(s)+' '+esc(s)+(extra||'')+'</span>'; }
var ORIGEN_ICON = {empleo:'briefcase', agencia:'users', ecommerce:'cart', software:'cpu', ventas:'megaphone'};

function uiState(){
  if(!S) return null;
  if(!S.ui) S.ui = {};
  if(!S.ui.goal) S.ui.goal = 'influence';
  if(!S.ui.hitos) S.ui.hitos = {};
  if(!S.ui.histPat) S.ui.histPat = [];
  return S.ui;
}

/* ---------- goals ---------- */
var GOALS = [
 {id:'influence', ic:'globe', t:'Most influential human', tag:'The classic path: climb the World Titan Ranking all the way to #1.', win:'Reach #1 and hold it for 24 months.'},
 {id:'fortune', ic:'coins', t:'Build a $100B fortune', tag:'Money is the score you chose. Compound, leverage, repeat.', win:'Net worth of $100 billion.'},
 {id:'dynasty', ic:'bank', t:'Found a dynasty', tag:'Build an empire that outlives you: a holding company, CEOs, many sectors.', win:'A legacy that lasts 30 years after you.'},
 {id:'sector', ic:'target', t:'Rule an industry', tag:'Own a quarter of an entire sector and bend it to your will.', win:'25% market share in one sector.'},
 {id:'jobs', ic:'users', t:'Employ a million', tag:'Influence through people: become the largest employer alive.', win:'1,000,000 employees on your payroll.'},
 {id:'beloved', ic:'heart', t:'Beloved titan', tag:'Power without enemies: reach the top 10 with a spotless reputation.', win:'Reputation 80+ while in the top 10.'}
];
function goalPorId(id){ for(var i=0;i<GOALS.length;i++) if(GOALS[i].id===id) return GOALS[i]; return GOALS[0]; }
function goalActual(S){ return goalPorId(S && S.ui ? S.ui.goal : 'influence'); }
var CURVAS = {
  pat:[[18,5000],[23,300000],[28,1e6],[38,3e7],[48,5e8],[58,8e9],[66,1e11],[70,2e11]],
  inf:[[24,1],[28,5],[38,150],[48,3000],[58,60000],[66,900000],[70,1e6]],
  emp:[[18,1],[23,5],[28,30],[38,500],[48,8000],[58,60000],[70,1e6]],
  share:[[25,0.0005],[30,0.003],[40,0.03],[50,0.12],[60,0.25],[70,0.4]],
  rep:[[18,50],[23,52],[30,58],[40,65],[50,72],[60,80],[70,85]],
  leg:[[35,1],[45,6],[55,14],[65,24],[70,30]]
};
function curva(a, age){
  if(age<=a[0][0]) return a[0][1];
  for(var i=1;i<a.length;i++){
    if(age<=a[i][0]){ var a0=a[i-1], a1=a[i], t=(age-a0[0])/(a1[0]-a0[0]);
      var l0=Math.log(Math.max(1e-9,a0[1])), l1=Math.log(Math.max(1e-9,a1[1])); return Math.exp(l0+(l1-l0)*t); }
  }
  return a[a.length-1][1];
}
function proximoAncla(a, age){ for(var i=0;i<a.length;i++) if(a[i][0]>age) return a[i]; return a[a.length-1]; }
function evaluarGoal(S){
  var g = goalActual(S), age = 18 + num(S.jugador.mes,0)/12, pat = patrimonio(S), pos = posicionJugador(S);
  var r = {g:g, status:'good', label:'On track', metric:'', ratio:1, done:false};
  var ratio = 1, anc, m, emp, rep, leg;
  switch(g.id){
    case 'influence':
      if(age < 24){ anc=proximoAncla(CURVAS.pat,age); ratio = pat/curva(CURVAS.pat,age);
        r.metric = 'Rank '+posicionTexto(S)+' · net worth '+fmt(pat)+' (aim '+fmt(anc[1])+' by age '+anc[0]+')'; }
      else { anc=proximoAncla(CURVAS.inf,age); ratio = num(S.influencia.total,0)/curva(CURVAS.inf,age);
        r.metric = 'Rank '+posicionTexto(S)+' · '+pi(S.influencia.total)+' (aim '+miles(anc[1])+' IP by age '+anc[0]+')'; }
      if(pos===1){ ratio = 1; r.metric = 'You are #1 · '+S.flags.mesesEnTop1+'/24 months held'; }
      r.done = num(S.flags.mesesEnTop1,0) >= 24;
      break;
    case 'fortune':
      anc=proximoAncla(CURVAS.pat,age); ratio = pat/curva(CURVAS.pat,age);
      r.metric = 'Net worth '+fmt(pat)+' · aim '+fmt(anc[1])+' by age '+anc[0]+' · finish line $100B';
      r.done = pat >= 1e11; break;
    case 'dynasty':
      leg = calcularLegado(S);
      if(age < 35){ anc=proximoAncla(CURVAS.pat,age); ratio = pat/curva(CURVAS.pat,age);
        r.metric = 'Scale first · net worth '+fmt(pat)+' (aim '+fmt(anc[1])+' by age '+anc[0]+')'; }
      else { anc=proximoAncla(CURVAS.leg,age); ratio = leg.anios/curva(CURVAS.leg,age);
        r.metric = 'Legacy lasts '+leg.anios+' yr · '+(S.flags.holding?'holding: yes':'no holding')+' · '+(S.flags.ceo?'CEO: yes':'no CEO')+' (aim '+Math.round(anc[1])+' yr by age '+anc[0]+')'; }
      r.done = leg.anios >= 30; break;
    case 'sector':
      m = sectorConMasParticipacion(S); anc=proximoAncla(CURVAS.share,age); ratio = m.part/curva(CURVAS.share,age);
      r.metric = (m.sector ? m.sector+' '+pct(m.part,2) : 'No sector yet')+' · aim '+pct(anc[1],1)+' by age '+anc[0]+' · finish line 25%';
      r.done = m.part >= 0.25; break;
    case 'jobs':
      emp = empleadosTotales(S); anc=proximoAncla(CURVAS.emp,age); ratio = emp/curva(CURVAS.emp,age);
      r.metric = miles(emp)+' employees · aim '+miles(anc[1])+' by age '+anc[0]+' · finish line 1,000,000';
      r.done = emp >= 1e6; break;
    case 'beloved':
      rep = num(S.jugador.reputacion,50); anc=proximoAncla(CURVAS.rep,age); ratio = rep/curva(CURVAS.rep,age);
      if(age > 40){ var ri2 = num(S.influencia.total,0)/curva(CURVAS.inf,age); ratio = Math.min(ratio, Math.max(0.3, ri2)); }
      r.metric = 'Reputation '+Math.round(rep)+' · aim '+Math.round(anc[1])+' by age '+anc[0]+' · rank '+posicionTexto(S);
      r.done = rep >= 80 && pos <= 10; break;
  }
  if(!isFinite(ratio)) ratio = 0;
  r.ratio = ratio;
  if(r.done){ r.status='good'; r.label='Achieved'; }
  else if(num(S.jugador.mes,0) < 6){ r.status='good'; r.label='Just started'; }
  else if(ratio >= 0.8){ r.status='good'; r.label='On track'; }
  else if(ratio >= 0.4){ r.status='warn'; r.label='Falling behind'; }
  else { r.status='bad'; r.label='Off track'; }
  return r;
}
function renderGoal(){
  var gv = evaluarGoal(S), el = $('tbGoal');
  if(!el) return;
  el.className = 'tb-goal '+gv.status;
  el.querySelector('.gi').innerHTML = ico(gv.g.ic);
  el.querySelector('.gt').textContent = gv.g.t;
  el.querySelector('.gm').textContent = gv.metric;
  el.querySelector('.gs').textContent = gv.label;
  el.title = 'Your goal. Click for details or to change it.';
}
function modalGoal(){
  var gv = evaluarGoal(S);
  var otros = GOALS.map(function(g){
    return '<button class="opcion" data-goal="'+g.id+'"'+(g.id===gv.g.id?' style="border-color:var(--oro)"':'')+'><span class="oro">'+ico(g.ic)+'</span> <b>'+esc(g.t)+'</b>'+(g.id===gv.g.id?' <span class="pill">current</span>':'')+'<br><span class="dim">'+esc(g.tag)+'</span></button>';
  }).join('');
  modal({titulo:gv.g.t, sub:'Finish line: '+gv.g.win,
    html:'<div class="prev '+(gv.status==='good'?'ok-box':gv.status==='bad'?'mal-box':'')+'"><b>'+esc(gv.label)+'</b> · '+esc(gv.metric)+'</div>'+
      '<div class="nota">The status compares where you are with where a solid run usually is at your age. Green: at pace or ahead. Amber: below pace. Red: well below pace. It never changes the simulation — it only tells you how you are doing.</div>'+
      '<h4 style="margin-top:12px">Change goal</h4><div class="opciones">'+otros+'</div>',
    botones:[{t:'Close'}],
    alMontar:function(bd, cerrarF){
      bd.addEventListener('click', function(ev){
        var t = ev.target.closest ? ev.target.closest('[data-goal]') : null;
        if(!t) return;
        uiState().goal = t.getAttribute('data-goal');
        guardar(S); cerrarF(); render();
        toast('Goal changed: '+goalActual(S).t, 'ok');
      });
    }});
}

/* ---------- Titan Path (milestones) ---------- */
var HITOS = [
 {id:'profit', ic:'check', t:'First profitable month', s:'A company of yours ends a month with positive operating profit', c:function(S){ return empresasReales(S).some(function(e){ return calcular(e,S.economia).EBITDA>0; }); }},
 {id:'hire', ic:'users', t:'First hire', s:'A company with 2 or more people', c:function(S){ return empresasReales(S).some(function(e){ return e.empleados>=2; }); }},
 {id:'cash10k', ic:'coins', t:'$10k in cash', s:'Cash in hand reaches $10,000', c:function(S){ return S.jugador.efectivo>=10000; }},
 {id:'nw100k', ic:'up', t:'Net worth $100k', s:'Everything you own, minus debts', c:function(S){ return patrimonio(S)>=1e5; }},
 {id:'stage1', ic:'building', t:'Stage 1: Entrepreneur', s:'Hiring, branches and acquisitions unlocked', c:function(S){ return S.jugador.etapa>=1; }},
 {id:'buy1', ic:'briefcase', t:'First acquisition', s:'Buy a company in the Market', c:function(S){ return num(S.estadisticas.empresasCompradas,0)>=1; }},
 {id:'nw1m', ic:'coins', t:'Millionaire', s:'Net worth $1M', c:function(S){ return patrimonio(S)>=1e6; }},
 {id:'emp100', ic:'users', t:'100 employees', s:'Across all your companies', c:function(S){ return empleadosTotales(S)>=100; }},
 {id:'know10', ic:'doc', t:'10 concepts learned', s:'Finance literacy pays rent', c:function(S){ return terminosAprendidosCount(S)>=10; }},
 {id:'stage2', ic:'chart', t:'Stage 2: Investor', s:'Startups, buildings and philanthropy unlocked', c:function(S){ return S.jugador.etapa>=2; }},
 {id:'nw10m', ic:'bank', t:'$10M net worth', s:'Serious money', c:function(S){ return patrimonio(S)>=1e7; }},
 {id:'sectors3', ic:'layers', t:'3 sectors', s:'Controlled companies in three different sectors', c:function(S){ var k={},n=0,i; for(i=0;i<S.empresas.length;i++) if(esControlada(S.empresas[i]) && !k[S.empresas[i].sector]){ k[S.empresas[i].sector]=1; n++; } return n>=3; }},
 {id:'ranked', ic:'trophy', t:'Enter the ranking', s:'Top 40 of the World Titan Ranking', c:function(S){ return posicionJugador(S)<=40 && num(S.influencia.total,0)>0; }},
 {id:'nw100m', ic:'up', t:'$100M net worth', s:'Nine figures', c:function(S){ return patrimonio(S)>=1e8; }},
 {id:'emp1k', ic:'factory', t:'1,000 employees', s:'A thousand families depend on you', c:function(S){ return empleadosTotales(S)>=1000; }},
 {id:'stage3', ic:'target', t:'Stage 3: Tycoon', s:'Mergers, bonds, equity raises and hostile takeovers', c:function(S){ return S.jugador.etapa>=3; }},
 {id:'nw1b', ic:'star', t:'Billionaire', s:'Net worth $1B', c:function(S){ return patrimonio(S)>=1e9; }},
 {id:'holding', ic:'bank', t:'Holding company', s:'The structure that outlives you', c:function(S){ return !!S.flags.holding; }},
 {id:'top10', ic:'award', t:'Top 10', s:'The table where decisions are made', c:function(S){ return posicionJugador(S)<=10 && num(S.influencia.total,0)>0; }},
 {id:'stage4', ic:'globe', t:'Stage 4: Titan', s:'Lobbying, media, banks and the central bank', c:function(S){ return S.jugador.etapa>=4; }},
 {id:'nw10b', ic:'flame', t:'$10B net worth', s:'Eleven figures', c:function(S){ return patrimonio(S)>=1e10; }},
 {id:'knowAll', ic:'doc', t:'Every concept learned', s:'The whole glossary', c:function(S){ return terminosAprendidosCount(S)>=TERMINOS.length; }},
 {id:'num1', ic:'trophy', t:'#1 in the world', s:'The most influential human alive', c:function(S){ return posicionJugador(S)===1 && num(S.influencia.total,0)>0; }},
 {id:'victory', ic:'globe', t:'Victory', s:'24 months held at #1', c:function(S){ return num(S.flags.mesesEnTop1,0)>=24; }}
];
function checkHitos(S, celebrar){
  var ui = uiState(), nuevos = [], i, h;
  if(!ui) return nuevos;
  for(i=0;i<HITOS.length;i++){
    h = HITOS[i];
    if(Object.prototype.hasOwnProperty.call(ui.hitos, h.id)) continue;
    var ok = false;
    try{ ok = !!h.c(S); }catch(e){ ok = false; }
    if(ok){ ui.hitos[h.id] = S.jugador.mes; nuevos.push(h); }
  }
  if(celebrar && nuevos.length){
    for(i=0;i<nuevos.length;i++) toastHTML(ico('trophy')+'Milestone: '+esc(nuevos[i].t), 'ok');
    confetti(nuevos.length>1 ? 90 : 45);
  }
  return nuevos;
}
function renderPath(){
  var ui = uiState(), h = '', i, done = [], todo = [];
  for(i=0;i<HITOS.length;i++){ if(Object.prototype.hasOwnProperty.call(ui.hitos, HITOS[i].id)) done.push(HITOS[i]); else todo.push(HITOS[i]); }
  h += '<div class="path">';
  if(done.length){
    var ult = done[done.length-1];
    if(done.length>1) h += '<div class="path-more">'+(done.length-1)+' milestone'+(done.length-1>1?'s':'')+' reached</div>';
    h += '<div class="hito done"><span class="ic">'+ico(ult.ic)+'</span><span>'+esc(ult.t)+'<small>Reached in year '+(Math.floor(num(ui.hitos[ult.id],0)/12)+1)+', month '+(num(ui.hitos[ult.id],0)%12+1)+'</small></span><span class="chk">'+ico('check')+'</span></div>';
  }
  for(i=0;i<Math.min(3,todo.length);i++){
    h += '<div class="hito '+(i===0?'next':'locked')+'"><span class="ic">'+ico(todo[i].ic)+'</span><span>'+esc(todo[i].t)+'<small>'+esc(todo[i].s||'')+'</small></span></div>';
  }
  if(todo.length>3) h += '<div class="path-more">+'+(todo.length-3)+' more ahead</div>';
  h += '</div>';
  /* ranking progress while unranked */
  if(posicionJugador(S) > 40){
    var ultimo = 400, k2;
    for(k2=S.ranking.length-1;k2>=0;k2--) if(!S.ranking[k2].esJugador){ ultimo = num(S.ranking[k2].influencia,400); break; }
    var falta = Math.max(1, ultimo - num(S.influencia.total,0));
    h += '<div class="nota" style="margin-top:8px"><b>Road to the top 40:</b> you need <b>+'+miles(falta)+' IP</b> ≈ '+fmt(falta*1e6)+'/yr of revenue under your control, or '+miles(falta*10)+' employees. Influence comes from companies you own more than 50% of.</div>';
  }
  return h;
}

/* ---------- animated numbers ---------- */
var UIV = {};
function setNum(id, valor, f){
  var el = $(id); if(!el) return;
  var prev = UIV[id];
  valor = num(valor,0);
  if(prev===undefined || Math.abs(prev-valor)<1e-9 || reducedMotion()){ el.textContent = f(valor); UIV[id]=valor; return; }
  var t0 = null, dur = 420, de = valor-prev, p0 = prev;
  el.classList.remove('up','down'); void el.offsetWidth;
  el.classList.add(de>0?'up':'down');
  UIV[id] = valor;
  var step = function(ts){
    if(!t0) t0 = ts;
    var k = Math.min(1,(ts-t0)/dur); k = 1-Math.pow(1-k,3);
    el.textContent = f(p0+de*k);
    if(k<1) requestAnimationFrame(step); else el.textContent = f(valor);
  };
  requestAnimationFrame(step);
}
function reducedMotion(){ try{ return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }

/* ---------- month summary ---------- */
function snapshotUI(){
  return {ef:num(S.jugador.efectivo,0), pat:patrimonio(S), inf:num(S.influencia.total,0), pos:posicionJugador(S), mes:S.jugador.mes, nlog:S.log.length, rep:num(S.jugador.reputacion,50)};
}
function mostrarResumenMes(a){
  var b = snapshotUI(), items = [], meses = b.mes-a.mes;
  if(meses<=0) return;
  var dEf = b.ef-a.ef, dPat = b.pat-a.pat, dInf = b.inf-a.inf, dPos = a.pos-b.pos, dRep = b.rep-a.rep;
  items.push('<span class="mi">Cash <b class="'+cls(dEf)+'">'+sig(dEf)+fmt(Math.abs(dEf))+'</b></span>');
  items.push('<span class="mi">Net worth <b class="'+cls(dPat)+'">'+sig(dPat)+fmt(Math.abs(dPat))+'</b></span>');
  if(Math.abs(dInf)>=1) items.push('<span class="mi">Influence <b class="'+cls(dInf)+'">'+sig(dInf)+miles(Math.abs(dInf))+' IP</b></span>');
  if(dPos!==0 && (b.pos<=40 || a.pos<=40)) items.push('<span class="mi">Rank <b class="'+cls(dPos)+'">'+(dPos>0?'▲ up '+dPos:'▼ down '+(-dPos))+'</b></span>');
  if(Math.abs(dRep)>=1) items.push('<span class="mi">Reputation <b class="'+cls(dRep)+'">'+sig(dRep)+Math.round(Math.abs(dRep))+'</b></span>');
  var malos = 0, i; for(i=a.nlog;i<S.log.length;i++) if(S.log[i].tipo==='malo') malos++;
  if(malos) items.push('<span class="mi neg">'+ico('warn')+' '+malos+' problem'+(malos>1?'s':'')+' in the log</span>');
  var el = $('msum'); if(!el) return;
  el.className = ''; el.innerHTML = '<span class="mt">'+(meses===1?'Month '+mesDelAno(S)+' · Year '+anoJuego(S):meses+' months')+'</span>'+items.join('');
  clearTimeout(el.__t1); clearTimeout(el.__t2);
  el.__t1 = setTimeout(function(){ el.className='hide'; }, 3400);
  el.__t2 = setTimeout(function(){ el.className='oculto'; }, 3900);
}

/* ---------- fx: confetti and dim ---------- */
function confetti(n){
  if(reducedMotion()) return;
  var cv = $('fx'); if(!cv || !cv.getContext) return;
  cv.width = window.innerWidth; cv.height = window.innerHeight; cv.style.display='block';
  var ctx = cv.getContext('2d'), ps = [], i, cols = ['#d4a53a','#3ccf7a','#5ad1ff','#f472b6','#ffd54a','#e6e6e6'];
  for(i=0;i<(n||60);i++) ps.push({x:cv.width/2+(Math.random()-0.5)*160, y:cv.height*0.35, vx:(Math.random()-0.5)*9, vy:-Math.random()*9-3, g:0.25, r:Math.random()*5+3, c:cols[i%cols.length], a:Math.random()*6, s:(Math.random()-0.5)*0.3});
  var t0 = null;
  var paso = function(ts){
    if(!t0) t0 = ts;
    var k = (ts-t0)/1500;
    ctx.clearRect(0,0,cv.width,cv.height);
    for(i=0;i<ps.length;i++){ var p=ps[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.a+=p.s;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.max(0,1-k); ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6); ctx.restore(); }
    if(k<1) requestAnimationFrame(paso); else { ctx.clearRect(0,0,cv.width,cv.height); cv.style.display='none'; }
  };
  requestAnimationFrame(paso);
}
function dimScreen(){
  var d = $('dimfx'); if(!d || reducedMotion()) return;
  d.style.opacity = '0.55';
  setTimeout(function(){ d.style.opacity='0'; }, 900);
}

/* ---------- events as cards ---------- */
var EVENT_META = {
  ciclo:{ic:'globe'}, tasa:{ic:'bank'},
  ofertaCompra:{ic:'briefcase',tags:['bold','safe','risky']}, empleadoClave:{ic:'door',tags:['safe','risky']}, demanda:{ic:'scale',tags:['safe','risky']},
  boomSector:{ic:'up',tags:['info']}, crisisSector:{ic:'down',tags:['safe','bold']}, antimonopolio:{ic:'bank',tags:['costly','safe','risky']},
  escandalo:{ic:'news',tags:['safe','risky']}, ciber:{ic:'lock',tags:['costly','safe']}, directivo:{ic:'star',tags:['bold','safe']},
  socioSale:{ic:'users',tags:['bold','risky']}, vencimientoBonos:{ic:'doc',tags:['safe','costly']}, covenant:{ic:'bank',tags:['costly','risky','bold']},
  suerte:{ic:'star',tags:['safe']}, enfermedad:{ic:'pulse',tags:['info']}, gobierno:{ic:'vote'}, huelga:{ic:'megaphone',tags:['safe','risky']},
  disrupcion:{ic:'bulb',tags:['bold','risky']}, fusionRival:{ic:'layers',tags:['bold','safe']}, muerteRival:{ic:'candle',tags:['info']},
  burbuja:{ic:'bubble',tags:['info']}, rescateBancario:{ic:'bank',tags:['safe','bold']}, periodista:{ic:'search',tags:['risky','safe']},
  reconocimiento:{ic:'award',tags:['safe']}, pandemia:{ic:'virus',tags:['info']}, guerraComercial:{ic:'ship',tags:['info']},
  despido:{ic:'box',tags:['safe','bold']}, alianzaTitanes:{ic:'swords',tags:['costly','risky']},
  distress:{ic:'flame'}, bankExecutes:{ic:'bank',tags:['costly','risky']}, headhunter:{ic:'briefcase',tags:['bold','safe']}, cofundador:{ic:'users',tags:['bold','risky']}, secundario:{ic:'chart',tags:['bold','safe']}, rezonificacion:{ic:'home',tags:['safe','bold']}, mandato:{ic:'doc',tags:['safe','risky']}, feeDiferido:{ic:'coins'}, inversorInstitucional:{ic:'bank',tags:['bold','safe']}, dealPrivado:{ic:'key',tags:['bold','safe']}, boomBust:{ic:'down',tags:['risky','safe']}, bribeScandal:{ic:'news',tags:['costly','risky']},
  ventaRelampago:{ic:'bolt',tags:['bold','safe']}, capitalDuro:{ic:'users',tags:['bold','risky','safe']}, rescatarOSoltar:{ic:'flame',tags:['risky','safe']},
  doblarApuesta:{ic:'flame',tags:['risky','safe']}, soborno:{ic:'key',tags:['risky','bold','safe']}, lineaGrande:{ic:'coins',tags:['risky','safe']}
};
var TAG_LABEL = {safe:'Safe', risky:'Risky', bold:'Bold', costly:'Costly', info:'Note'};
function opcionesEventoHTML(inst, id, attr){
  var meta = EVENT_META[id] || {}, tags = meta.tags || [];
  return inst.opciones.map(function(o,i){
    var tg = (tags.length===inst.opciones.length) ? tags[i] : null;
    return '<button class="opcion" '+attr+'="'+i+'">'+(tg?'<span class="optag '+tg+'">'+TAG_LABEL[tg]+'</span>':'')+esc(o.t)+'</button>';
  }).join('');
}
function eventoCardHTML(inst, id, attr){
  var meta = EVENT_META[id] || {ic:'bolt'};
  return '<div class="evcard"><div class="evic">'+ico(meta.ic||'bolt')+'</div><div class="evb"><p style="margin-top:0">'+esc(inst.texto)+'</p>'+
    '<div class="opciones">'+opcionesEventoHTML(inst, id, attr)+'</div></div></div>';
}

/* ---------- timeline log ---------- */
var LOG_ICON = {dinero:'coins', empresa:'building', evento:'bolt', malo:'warn', aprendizaje:'doc', info:'dot'};
function renderTimeline(){
  var logs = S.log, out = '', n = 0, i, anoAct = null;
  for(i=logs.length-1;i>=0 && n<40;i--){
    var l = logs[i], t = l.tipo||'info';
    if(filtroLogV==='importante'){ if(t!=='evento' && t!=='malo' && t!=='empresa' && t!=='aprendizaje') continue; }
    else if(filtroLogV!=='todo'){
      if(filtroLogV==='dinero' && t!=='dinero') continue;
      if(filtroLogV==='empresa' && t!=='empresa') continue;
      if(filtroLogV==='evento' && t!=='evento' && t!=='malo') continue;
      if(filtroLogV==='aprendizaje' && t!=='aprendizaje') continue;
    }
    var ano = Math.floor(num(l.mes,0)/12)+1;
    if(ano!==anoAct){ anoAct = ano; out += '<div class="tl-y"><span>Year '+ano+'</span><span>age '+(17+ano)+'</span></div>'; }
    var esCons = /^Consequence of /.test(l.texto);
    out += '<div class="tl '+esc(t)+(esCons?' cons':'')+'"><span class="ic">'+ico(esCons?'clock':(LOG_ICON[t]||'dot'))+'</span><span class="m">m'+(num(l.mes,0)%12+1)+'</span><span>'+esc(l.texto)+'</span></div>';
    n++;
  }
  return out || '<div class="dim" style="font-size:12px">Nothing yet — your story starts this month.</div>';
}

/* ---------- avatars ---------- */
function avatarHTML(nombre){
  var s = String(nombre||'?'), h = 0, i;
  for(i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) & 0xffff;
  var cols = ['#7c9cff','#ff9f5a','#5ad1ff','#4ade80','#c084fc','#fb7185','#f472b6','#34d399','#ffd54a','#b0b8c4'];
  var ini = s.split(/\s+/).map(function(w){ return w.charAt(0); }).join('').slice(0,2).toUpperCase();
  return '<span class="avatar" style="background:'+cols[h%cols.length]+'">'+esc(ini)+'</span>';
}

/* ---------- balance sheet as two columns ---------- */
function balanceColumnas(e, c){
  var act = Math.max(0, num(e.activos,0)), deuda = Math.max(0, num(e.deuda,0)), bonos = Math.max(0, totalBonos(e)), eq = num(c.equity,0);
  var pas = deuda + bonos, mx = Math.max(1, act, pas);
  var seg = function(cl, v, label){ var hpx = Math.max(0, v/mx*100); return '<div class="seg '+cl+'" style="height:'+hpx.toFixed(1)+'%" title="'+esc(label)+': '+fmt(v)+'">'+(hpx>12?label+' '+fmt(v):'')+'</div>'; };
  var der = seg('debt', deuda, 'Debt')+(bonos>0?seg('bonds', bonos, 'Bonds'):'');
  if(eq>=0) der += seg('eq', eq, 'Equity'); else der = seg('neg', pas, 'Debt exceeds assets');
  return '<div class="bs"><div class="colb">'+seg('assets', act, 'Assets')+'</div><div class="colb">'+der+'</div></div>'+
    '<div class="bs-l"><span>What it owns</span><span>Who it belongs to</span></div>'+
    '<div class="legend"><span><i style="background:#7c9cff"></i>Assets</span><span><i style="background:#e5533d"></i>Debt</span>'+(bonos>0?'<span><i style="background:#f2b134"></i>Bonds</span>':'')+'<span><i style="background:#3ccf7a"></i>Equity (yours)</span></div>'+
    (eq<0?'<div class="prev mal-box">Negative equity: this company owes more than it owns. Limited liability protects your pocket, but the bank can take the company.</div>':'');
}

/* ---------- due diligence report ---------- */
function modalDD(o, hallazgo, precioAntes, r){
  var e = o.empresa, c = calcular(e, S.economia);
  var fin = '<table><tbody>'+
    '<tr><td>Revenue / yr</td><td>'+fmt(c.ingresosAnuales)+'</td><td>Operating profit (EBITDA) / yr</td><td class="'+cls(c.EBITDAanual)+'">'+fmt(c.EBITDAanual)+'</td></tr>'+
    '<tr><td>Assets</td><td>'+fmt(e.activos)+'</td><td>Debt</td><td>'+fmt(c.deudaTotal)+'</td></tr>'+
    '<tr><td>Leverage</td><td>'+c.apalancamiento.toFixed(1)+'x</td><td>Price multiple</td><td>'+o.multImplicito.toFixed(1)+'x EBITDA</td></tr>'+
    '<tr><td>Employees</td><td>'+miles(e.empleados)+'</td><td>Growth</td><td>'+pct(e.crecimiento,1)+'/mo</td></tr></tbody></table>';
  var flags = '';
  if(hallazgo && hallazgo.tipo==='deuda') flags = '<div class="flag">'+ico('flag')+'<span><b>Hidden debt: '+fmt(hallazgo.valor)+'.</b> Off-balance liabilities that were not in the listing. The seller renegotiated the price down 15%.</span></div>';
  else if(hallazgo) flags = '<div class="flag">'+ico('flag')+'<span><b>Revenue inflated by '+pct(hallazgo.valor,0)+'.</b> Real sales are lower than advertised. The seller renegotiated the price down 15%.</span></div>';
  else flags = '<div class="flag okf">'+ico('check')+'<span><b>No material findings.</b> The books match the listing. The asking price stands.</span></div>';
  var html = '<div class="report"><div class="stamp '+(hallazgo?'flag':'clean')+'">'+(hallazgo?'RED FLAGS':'CLEAN')+'</div>'+
    '<div class="rh"><div><b>DUE DILIGENCE REPORT</b><small>'+esc(e.nombre)+' · '+esc(e.sector)+'</small></div><div style="text-align:right"><small>Prepared for '+esc(S.jugador.nombre)+'</small><small>Month '+mesDelAno(S)+', Year '+anoJuego(S)+' · fee '+fmt(costoDD(o))+'</small></div></div>'+
    '<h5>1. Financials reviewed</h5>'+fin+
    '<h5>2. Findings</h5>'+flags+
    '<h5>3. Price</h5><div class="kv"><span>Asking price before</span><span>'+fmt(precioAntes)+'</span></div><div class="kv"><span>Asking price now</span><span class="'+(hallazgo?'pos':'')+'">'+fmt(o.precioPedido)+'</span></div>'+
    '<h5>4. Recommendation</h5><div class="dim">'+(hallazgo?'Proceed only at the renegotiated price, and keep leverage low: surprises tend to come in pairs.':(o.etiqueta==='Cheap'?'The price looks cheap for a clean company. Move before a rival does.':o.etiqueta==='Expensive'?'Clean, but expensive. Negotiate or wait for a better multiple.':'Fair price for a clean company. Negotiate if you want an edge.'))+'</div></div>';
  modal({titulo:'Due diligence: '+e.nombre, html:html, ancho:true, botones:[{t:'Close'},{t:'Open the Market', cls:'btn-pri', cb:function(){ TAB='mercado'; render(); }}]});
}

/* ---------- net worth sparkline ---------- */
function renderSpark(){
  var ui = uiState(), d = ui.histPat, el = $('panelSpark');
  if(!el) return;
  if(!d || d.length<2){ el.innerHTML = '<div class="dim" style="font-size:11.5px">Your net worth chart appears after the first month.</div>'; return; }
  var first = d[0].pat, last = d[d.length-1].pat, dd = last-first;
  el.innerHTML = '<div class="spark-l"><span>Net worth · '+d.length+' months</span><span class="'+cls(dd)+'">'+sig(dd)+fmt(Math.abs(dd))+'</span></div><canvas id="cvSpark" class="spark" width="300" height="64"></canvas>';
  dibujarSpark($('cvSpark'), d.map(function(x){ return x.pat; }), '#d4a53a');
}
function dibujarSpark(cv, datos, color){
  if(!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d'), w = cv.width, hh = cv.height, i;
  ctx.clearRect(0,0,w,hh);
  if(!datos || datos.length<2) return;
  var mx=-Infinity, mn=Infinity;
  for(i=0;i<datos.length;i++){ var v=num(datos[i],0); if(v>mx)mx=v; if(v<mn)mn=v; }
  if(!isFinite(mx)||!isFinite(mn)) return;
  if(mx-mn<1e-9){ mx=mn+1; }
  ctx.beginPath();
  for(i=0;i<datos.length;i++){ var x=i/(datos.length-1)*(w-4)+2, y=hh-3-(num(datos[i],0)-mn)/(mx-mn)*(hh-8); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  ctx.lineTo(w-2,hh); ctx.lineTo(2,hh); ctx.closePath();
  ctx.fillStyle = 'rgba(212,165,58,.12)'; ctx.fill();
}
function registrarHistorialUI(){
  var ui = uiState(); if(!ui) return;
  ui.histPat.push({m:S.jugador.mes, pat:Math.round(patrimonio(S)), ef:Math.round(num(S.jugador.efectivo,0))});
  if(ui.histPat.length>624) ui.histPat.splice(0, ui.histPat.length-624);
}
function nombreNivel(S){
  return typeof tituloJugador==='function' ? '· '+tituloJugador(S) : ['the Hustler','the Founder','the Investor','the Tycoon','the Titan'][clamp(S.jugador.etapa,0,4)];
}
function goalResultadoHTML(){
  var gv = evaluarGoal(S);
  return '<div class="kv"><span>Your goal: '+esc(gv.g.t)+'</span><span class="'+(gv.done?'pos':'neg')+'">'+(gv.done?'Achieved':'Not achieved')+'</span></div>';
}


function toastHTML(html, tipo){
  var d = document.createElement('div');
  d.className = 'toast '+(tipo||'');
  d.innerHTML = html;
  $('toasts').appendChild(d);
  setTimeout(function(){ d.style.opacity='0'; d.style.transition='opacity .3s'; }, 2600);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 3000);
}
function toast(txt, tipo){
  var d = document.createElement('div');
  d.className = 'toast '+(tipo||'');
  d.textContent = txt;
  $('toasts').appendChild(d);
  setTimeout(function(){ d.style.opacity='0'; d.style.transition='opacity .3s'; }, 2600);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 3000);
}

/* ---------------- MODALES ---------------- */
function modal(cfg){
  modalAbierto = true;
  var cont = $('modales');
  var bd = document.createElement('div');
  bd.className = 'backdrop';
  var botones = (cfg.botones||[]).map(function(b,i){
    return '<button class="btn '+(b.cls||'btn-sec')+'" data-mb="'+i+'">'+esc(b.t)+'</button>';
  }).join('');
  bd.innerHTML = '<div class="modal'+(cfg.ancho?' ancho':'')+'" role="dialog" aria-modal="true">'+
    '<h2>'+esc(cfg.titulo||'')+'</h2>'+
    (cfg.sub?'<div class="sub">'+esc(cfg.sub)+'</div>':'')+
    '<div class="cuerpo">'+(cfg.html||'')+'</div>'+
    (botones?'<div class="modal-acc">'+botones+'</div>':'')+'</div>';
  cont.appendChild(bd);
  var cerrar = function(){
    if(bd.parentNode) bd.parentNode.removeChild(bd);
    modalAbierto = $('modales').children.length>0;
    if(!modalAbierto && cfg.alCerrar) cfg.alCerrar();
  };
  bd.addEventListener('click', function(ev){
    var t = ev.target;
    var mb = t.getAttribute && t.getAttribute('data-mb');
    if(mb!==null && mb!==undefined && mb!==''){
      var b = cfg.botones[+mb];
      if(b.cerrar!==false) cerrar();
      if(b.cb) b.cb(bd);
      return;
    }
    if(t===bd && cfg.cerrable!==false) cerrar();
  });
  if(cfg.alMontar) cfg.alMontar(bd, cerrar);
  bd.__cerrar = cerrar;
  return cerrar;
}
function cerrarUltimoModal(){
  var c = $('modales');
  if(!c.children.length) return;
  var ult = c.children[c.children.length-1];
  if(ult.__cerrar) ult.__cerrar();
}

/* ---------------- APRENDIZAJE ---------------- */
function conTermino(id, cb){
  if(!pedirTermino(S, id)){ cb(); return; }
  contextoTermino(S, id);
  var t = TERMINO(id);
  var q = t.q ? t.q(S) : null;
  if(!q){ marcarAprendido(S,id,true); cb(); return; }
  var intentos = 0;
  var pinta = function(fallo){
    var ops = q.ops.map(function(o,i){ return '<button class="opcion" data-qo="'+i+'">'+esc(o.t)+'</button>'; }).join('');
    var html = '<div class="nota"><b>'+esc(t.nombre)+'</b><br>'+esc(t.def)+'</div>'+
      (fallo?'<div class="prev mal-box"><b>That is not correct.</b><br>'+esc(q.expl)+'</div>':'')+
      '<p><b>In your situation:</b></p><p>'+esc(q.texto)+'</p><div class="opciones">'+ops+'</div>';
    var cerrar = modal({titulo:'New concept: '+t.nombre, html:html, cerrable:false,
      botones: fallo?[{t:'Try again', cls:'btn-pri', cerrar:false, cb:function(bd){ if(bd.__cerrar) bd.__cerrar(); pinta(false); }}]:[],
      alMontar:function(bd, cerrarF){
        bd.addEventListener('click', function(ev){
          var i = ev.target.getAttribute && ev.target.getAttribute('data-qo');
          if(i===null||i===undefined||i==='') return;
          intentos++;
          if(q.ops[+i].ok){
            S.jugador.conocimiento.aciertos++;
            marcarAprendido(S, id, intentos===1);
            cerrarF();
            modal({titulo:'Correct', html:'<div class="prev ok-box">'+esc(q.expl)+'</div>',
              botones:[{t:'Continue', cls:'btn-pri', cb:function(){ render(); cb(); }}], cerrable:false});
          } else {
            S.jugador.conocimiento.fallos++;
            cerrarF();
            pinta(true);
          }
        });
      }});
  };
  pinta(false);
}

/* ---------------- PENDIENTES ---------------- */
function encolar(res){
  var i;
  for(i=0;i<res.pendientes.length;i++) colaUI.push(res.pendientes[i]);
  if(res.etapa) colaUI.push({tipo:'etapa', n:res.etapa});
  if(res.anual) colaUI.push({tipo:'anual', data:res.anual});
  if(res.evento) colaUI.push({tipo:'eventoMes'});
  if(res.fin) colaUI.push({tipo:'fin'});
}
function siguientePendiente(){
  if(modalAbierto) return;
  if(!colaUI.length){ render(); return; }
  var p = colaUI.shift();
  if(p.tipo==='evento'){ S.eventoActual = p.ref; mostrarEvento(siguientePendiente); }
  else if(p.tipo==='eventoMes'){ mostrarEvento(siguientePendiente); }
  else if(p.tipo==='termino'){ conTermino(p.id, siguientePendiente); }
  else if(p.tipo==='etapa') modalEtapa(p.n, siguientePendiente);
  else if(p.tipo==='anual') modalAnual(p.data, siguientePendiente);
  else if(p.tipo==='victoria') modalVictoria(siguientePendiente);
  else if(p.tipo==='insolvencia') modalInsolvencia(siguientePendiente);
  else if(p.tipo==='nivelRuta') modalNivelRuta(p, siguientePendiente);
  else if(p.tipo==='rondaStartup') modalRonda(p, siguientePendiente);
  else if(p.tipo==='fin') pantallaFinal();
  else siguientePendiente();
}

function mostrarEvento(despues){
  var inst = construirEvento(S, S.eventoActual);
  if(!inst){ S.eventoActual=null; if(despues) despues(); return; }
  var id = S.eventoActual.id;
  var abrir = function(){
    modal({titulo:inst.titulo, html:eventoCardHTML(inst, id, 'data-eo'), cerrable:false,
      alMontar:function(bd, cerrarF){
        bd.addEventListener('click', function(ev){
          var t = ev.target.closest ? ev.target.closest('[data-eo]') : null;
          if(!t) return;
          var i = t.getAttribute('data-eo');
          if(i===null||i===undefined||i==='') return;
          cerrarF();
          resolverEvento(S, +i);
          calcularInfluencia(S); construirRanking(S); guardar(S); render(); checkHitos(S, true);
          modal({titulo:'What this teaches', html:'<div class="teach">'+esc(inst.ensena||'')+'</div>',
            botones:[{t:'Continue', cls:'btn-pri', cb:function(){ if(despues) despues(); }}], cerrable:false});
        });
      }});
  };
  if(inst.termino && pedirTermino(S, inst.termino)) conTermino(inst.termino, abrir);
  else abrir();
}
function modalEtapa(n, despues){
  var verbos = {
    1:['Hire and lay off','Open branches','Buy competitors','Appoint a CEO'],
    2:['Buy companies in any sector','Invest in startups','Buy buildings','Philanthropy','Due diligence'],
    3:['Merge your own companies','Issue corporate bonds','Equity raise (dilution)','Preferred stock','Hostile takeover','Create a holding company'],
    4:['Lobbying','Buy media outlets','Buy a bank','Pressure the central bank','Deals with rivals']
  }[n] || [];
  var titulos = {1:'You are now a Founder',2:'You are now an Investor',3:'You are now a Tycoon',4:'You are now a Titan'};
  confetti(120);
  modal({titulo:'Stage '+n+': '+NOMBRE_ETAPA[n], sub:titulos[n]||'',
    html:'<p>New actions unlocked:</p><ul>'+verbos.map(function(v){return '<li>'+esc(v)+'</li>';}).join('')+'</ul>',
    botones:[{t:'Continue', cls:'btn-pri', cb:despues}], cerrable:false});
}
function modalAnual(d, despues){
  var html = '<div class="fin">'+
   kv('Age', d.edad+' years')+
   kv('Net worth', fmt(d.pat)+' <span class="'+cls(d.dPat)+'">'+sig(d.dPat)+fmt(Math.abs(d.dPat))+'</span>')+
   kv('Influence', pi(d.inf)+' <span class="'+cls(d.dInf)+'">'+sig(d.dInf)+miles(Math.abs(d.dInf))+'</span>')+
   kv('Position', '#'+d.pos+' <span class="'+cls(d.dPos)+'">'+sig(d.dPos)+Math.abs(Math.round(d.dPos))+'</span>')+
   (d.mejor?kv('Best company', esc(d.mejor.n)+' · '+fmt(d.mejor.v)+'/mo EBITDA'):'')+
   (d.peor && d.peor.n!==(d.mejor&&d.mejor.n)?kv('Worst company', esc(d.peor.n)+' · '+fmt(d.peor.v)+'/mo EBITDA'):'')+
   kv('Economy', ({expansion:'Expansion',pico:'Peak',recesion:'Recession',recuperacion:'Recovery'}[d.fase]||d.fase)+' · rate '+pct(d.tasa))+
   '</div><div class="nota">'+esc(d.consejo)+'</div>'+(function(){ var gv=evaluarGoal(S); return '<div class="prev '+(gv.status==='good'?'ok-box':gv.status==='bad'?'mal-box':'')+'">'+ico(gv.g.ic)+' Goal · <b>'+esc(gv.label)+'</b> · '+esc(gv.metric)+'</div>'; })();
  modal({titulo:'Annual review: Year '+d.ano, html:html, botones:[{t:'Continue', cls:'btn-pri', cb:despues}], cerrable:false});
}
function kv(k,v){ return '<div class="kv"><span>'+k+'</span><span>'+v+'</span></div>'; }
function modalNivelRuta(p, despues){
  var ru = RUTAS[p.ruta], principal = rutaPrincipal(S)===p.ruta;
  if(principal) confetti(80);
  modal({titulo:(principal?'Promotion: ':'New track: ')+ru.niveles[p.nivel], sub:ru.t+' path · level '+(p.nivel+1)+' of 5',
    html:'<p>'+(principal?'You climbed your own ladder.':'You reached this level on a track you did not start on.'+(p.nivel>=2?' Its advantages now apply to you too.':''))+'</p>'+
      (p.nivel<4?'<div class="nota">Next: <b>'+esc(ru.niveles[p.nivel+1])+'</b> · '+requisitos(S,p.ruta,p.nivel+1).map(function(q){ return esc(q.t)+(q.b?'':' ≥ '+(q.f?q.f(q.m):miles(q.m))); }).join(' · ')+'</div>':'<div class="nota">Top of the ladder.</div>'),
    botones:[{t:'Continue', cls:'btn-pri', cb:despues}], cerrable:false});
}
function ladderHTML(ruta, compacta){
  var ru = RUTAS[ruta], n = nivelDe(S,ruta), h = '<div class="lad">', i;
  for(i=0;i<5;i++){
    var cls = i<n ? 'done' : i===n ? 'now' : 'locked';
    if(compacta && i>n+1 && i<4) continue;
    h += '<div class="lv '+cls+'"><span class="n">'+(i<n?ico('check'):(i+1))+'</span><b>'+esc(ru.niveles[i])+'</b>'+(i===n?'<span class="pill">you</span>':'')+'</div>';
    if(i===n && n<4){
      var rq = requisitos(S, ruta, n+1), k;
      for(k=0;k<rq.length;k++){ var q = rq[k], ok = num(q.v,0)>=q.m; h += '<div class="req'+(ok?' ok':'')+'">'+(ok?ico('check','ok'):ico('arrow'))+' '+esc(q.t)+(q.b?'':': '+(q.f?q.f(q.v):miles(q.v))+' / '+(q.f?q.f(q.m):miles(q.m)))+'</div>'; }
    }
  }
  return h+'</div>';
}
function modalRutas(){
  var h = '<div class="nota">Your path: <b>'+esc(RUTAS[rutaPrincipal(S)].t)+'</b>. The other tracks advance on their own; from their third level their advantages apply to you as well — that is how paths mix.</div>';
  var i, k;
  for(i=0;i<LISTA_RUTAS.length;i++){ k = LISTA_RUTAS[i]; h += '<h4 style="margin-top:10px">'+ico(RUTAS[k].ic)+' '+esc(RUTAS[k].t)+(k===rutaPrincipal(S)?' <span class="pill">your path</span>':'')+'</h4>'+ladderHTML(k,false); }
  modal({titulo:'Paths and ladders', html:h, ancho:true, botones:[{t:'Close'}]});
}
function modalInsolvencia(despues){
  var f = S.flags, n = num(f.insolvencias,0);
  modal({titulo:'Personal insolvency', sub:'This is not the end. It is the bottom.',
    html:'<p>Three months in the red and nothing left to sell at a fair price. The banks took every company that owed them money and wrote off your personal loans.</p>'+
      '<div class="prev mal-box">Reputation -30 · credit scarce and expensive for 5 years · '+(S.empresas.length?'you keep '+S.empresas.length+' debt-free holding'+(S.empresas.length>1?'s':''):'you start again from zero')+'</div>'+
      '<div class="teach">Limited liability protected your person, not your empire. The comeback starts with cash flow, not with leverage.'+(n>=2?' A third insolvency ends the game.':'')+'</div>',
    botones:[{t:'Start the comeback', cls:'btn-pri', cb:despues}], cerrable:false});
}
function modalVictoria(despues){
  modal({titulo:'You are the most influential human on the planet',
    html:'<p>You have held #1 in the World Titan Ranking for 24 months with '+pi(S.influencia.total)+'.</p>'+
      '<div class="nota">You can keep playing until age 70 to expand your legacy, or end your story here.</div>',
    botones:[{t:'Keep playing', cls:'btn-pri', cb:despues},
             {t:'Finish now', cb:function(){ S.fin='victoria'; pantallaFinal(); }}], cerrable:false});
}
function modalRonda(p, despues){
  var st=null,i;
  for(i=0;i<S.startups.length;i++) if(S.startups[i].id===p.id) st=S.startups[i];
  if(!st){ despues(); return; }
  var proRata = st.valoracion*st.propiedad*0.2;
  modal({titulo:'New round in '+st.nombre,
    html:'<p>'+esc(st.nombre)+' is raising capital at a valuation '+p.k.toFixed(1)+'x higher: it is now worth '+fmt(st.valoracion)+'.</p>'+
      '<div class="prev">Your '+pct(st.propiedad,1)+' is worth '+fmt(st.valoracion*st.propiedad)+'. If you do not follow on, you are diluted to '+pct(st.propiedad*0.8,1)+'.</div>',
    botones:[
      {t:'Follow on: '+fmt(proRata), cls:'btn-pri', cb:function(){
        if(proRata>S.jugador.efectivo){ toast('Not enough cash: you get diluted.','mal'); st.propiedad*=0.8; }
        else { S.jugador.efectivo-=proRata; st.invertido+=proRata; registrar(S,'You followed on in the '+st.nombre+' round.','dinero'); }
        render(); despues(); }},
      {t:'Get diluted 20%', cb:function(){ st.propiedad*=0.8; registrar(S,'You were diluted in '+st.nombre+'.','dinero'); render(); despues(); }}
    ], cerrable:false});
}

/* ---------------- TURNO ---------------- */
function puedeCerrarMes(){ return !S.fin && !S.eventoActual; }
function cerrarMesUI(){
  if(S.fin){ pantallaFinal(); return; }
  if(S.eventoActual){ toast('Resolve the monthly event first.','mal'); mostrarEvento(siguientePendiente); return; }
  if(modalAbierto) return;
  var antes = snapshotUI();
  var res = cerrarMes(S);
  registrarHistorialUI();
  if(res.cambioCiclo==='recesion') dimScreen();
  encolar(res);
  guardar(S); render();
  mostrarResumenMes(antes);
  checkHitos(S, true);
  siguientePendiente();
}
function avanzarAno(){
  if(S.fin || modalAbierto) return;
  avanzando = true;
  var i = 0, etapaIni = S.jugador.etapa, termIni = terminosAprendidosCount(S), antes = snapshotUI();
  var fin = function(){ avanzando=false; guardar(S); render(); mostrarResumenMes(antes); siguientePendiente(); };
  var paso = function(){
    if(!avanzando || i>=36){ fin(); return; }
    if(S.eventoActual){ avanzando=false; render(); mostrarResumenMes(antes); mostrarEvento(siguientePendiente); return; }
    var res = cerrarMes(S);
    i++;
    registrarHistorialUI();
    if(res.cambioCiclo==='recesion') dimScreen();
    encolar(res);
    var nuevos = checkHitos(S, true);
    var parar = res.fin || res.etapa || res.evento || S.jugador.efectivo<0 || nuevos.length>0 ||
                terminosAprendidosCount(S)!==termIni || colaUI.length>0 || S.jugador.etapa!==etapaIni;
    if(parar){ fin(); return; }
    render();
    setTimeout(paso, 16);
  };
  paso();
}

/* ---------------- RENDER ---------------- */
function render(){
  if(!S) return;
  renderTop(); renderEmpresas(); renderCentro(); renderDerecha();
  try{ document.documentElement.style.setProperty('--tbh', $('topbar').offsetHeight+'px'); }catch(e){}
}
function renderTop(){
  var j = S.jugador, pat = patrimonio(S);
  $('tbNombre').textContent = j.nombre+' '+nombreNivel(S)+' · '+edad(S);
  $('tbFecha').textContent = 'Month '+mesDelAno(S)+' · Year '+anoJuego(S)+' · Stage '+j.etapa+': '+NOMBRE_ETAPA[j.etapa];
  setNum('tbEfectivo', j.efectivo, fmt);
  $('tbEfectivo').className = 'v '+(j.efectivo<0?'neg':'')+($('tbEfectivo').classList.contains('up')?' up':$('tbEfectivo').classList.contains('down')?' down':'');
  setNum('tbPatrimonio', pat, fmt);
  $('tbRep').textContent = Math.round(j.reputacion);
  $('tbRepB').style.width = clamp(j.reputacion,0,100)+'%';
  $('tbRepBadge').title = 'Reputation '+Math.round(j.reputacion)+'/100. It sets your interest spread, sale prices and the influence multiplier (×'+S.influencia.multiplicador.toFixed(2)+'). Rises when you repay debt, hire and give; falls with layoffs, defaults and scandals.';
  var rb = $('tbRiesgoBox');
  if(j.riesgoPolitico>0){ rb.classList.remove('oculto'); $('tbRiesgo').textContent=Math.round(j.riesgoPolitico); $('tbRiesgoB').style.width=clamp(j.riesgoPolitico,0,100)+'%';
    rb.title = 'Political risk '+Math.round(j.riesgoPolitico)+'/100. Grows with lobbying, self-financing and market dominance; raises the odds of scandals and investigations. It decays 1 per month.'; }
  else rb.classList.add('oculto');
  setNum('tbInf', S.influencia.total, miles);
  var d = num(S.influencia.total,0)-num(S.influencia.previa,0);
  $('tbInfD').innerHTML = '<span class="'+cls(d)+'">'+sig(d)+miles(Math.abs(d))+' IP/mo</span>';
  $('tbPos').textContent = posicionTexto(S);
  $('btnMes').disabled = !!S.fin;
  $('btnAno').disabled = !!S.fin;
  renderGoal();
}
function estadoEmpresa(e, c){
  if(e.esEmpleo) return {t:'Job', k:''};
  if(e.caja<0) return {t:'Cash crunch', k:'estres'};
  if(c.apalancamiento>4) return {t:'Over-leveraged', k:'sobre'};
  if(e.crecimiento>0.008) return {t:'Growing', k:'creciendo'};
  return {t:'Healthy', k:''};
}
function renderEmpresas(){
  var h = '', i, e, c, st;
  $('cntEmp').textContent = S.empresas.length;
  for(i=0;i<S.empresas.length;i++){
    e = S.empresas[i]; c = calcular(e, S.economia); st = estadoEmpresa(e,c);
    var dot = st.k==='estres'?'r':st.k==='sobre'?'y':st.k==='creciendo'?'g':(e.esEmpleo?'n':'g');
    h += '<div class="emp '+st.k+'" tabindex="0" data-ac="detalle" data-id="'+e.id+'" style="border-left-color:'+secMeta(e.sector).c+'">'+
      '<div class="emp-top"><span class="emp-nom"><span class="dot '+dot+'"></span>'+esc(e.nombre)+'</span><span class="tag '+(st.k==='estres'?'mal':st.k==='creciendo'?'ok':st.k==='sobre'?'av':'')+'">'+st.t+'</span></div>'+
      '<div style="margin:2px 0 0">'+secChip(e.sector, e.esEdificio?' · building':'')+'</div>'+
      '<div class="emp-g">'+
        '<span>Revenue</span><span>'+fmt(c.ingresos)+'</span>'+
        '<span>Op. profit (EBITDA)</span><span class="'+cls(c.EBITDA)+'">'+fmt(c.EBITDA)+'</span>'+
        (e.esEmpleo?'':'<span>Cash on hand</span><span class="'+(e.caja<0?'neg':'')+'">'+fmt(e.caja)+'</span>'+
        '<span>Debt</span><span>'+fmt(c.deudaTotal)+'</span>'+
        '<span>People</span><span>'+miles(e.empleados)+'</span>'+
        '<span>Your share</span><span>'+pct(e.propiedad,0)+'</span>')+
      '</div></div>';
  }
  if(!S.empresas.length) h = '<div class="empty">You have no companies yet.<br><button class="btn btn-peq btn-pri" data-ac="tabMercado">Open the Market</button> <button class="btn btn-peq" data-ac="empleo">Find a job</button></div>';
  $('listaEmpresas').innerHTML = h;

  h = '';
  for(i=0;i<S.startups.length;i++){
    var s2 = S.startups[i];
    var val = s2.valoracion*s2.propiedad;
    h += '<div class="emp" style="border-left-color:'+secMeta(s2.sector).c+'"><div class="emp-top"><span class="emp-nom">'+esc(s2.nombre)+'</span><span class="tag">'+Math.max(0,Math.round(s2.meses))+' mo</span></div>'+
     '<div class="emp-g"><span>Your stake</span><span>'+pct(s2.propiedad,1)+'</span><span>Value</span><span>'+fmt(val)+'</span>'+
     '<span>Invested</span><span>'+fmt(s2.invertido)+'</span><span>ROI</span><span class="'+cls(val-s2.invertido)+'">'+pct(val/Math.max(1,s2.invertido)-1,0)+'</span></div>'+
     '<button class="btn btn-peq" data-ac="venderStartup" data-id="'+s2.id+'">Sell on secondary (0.7x)</button></div>';
  }
  $('listaStartups').innerHTML = h || '<div class="dim" style="font-size:12px">No startup stakes yet.</div>';

  h = '';
  for(i=0;i<S.prestamos.length;i++){
    var p = S.prestamos[i];
    h += '<div class="emp" style="border-left-color:var(--neg)"><div class="emp-top"><span class="emp-nom">Loan at '+pct(p.tasa)+'</span><span class="tag">'+Math.max(0,Math.round(p.mesesRestantes))+' mo left</span></div>'+
      '<div class="emp-g"><span>Balance</span><span>'+fmt(p.saldo)+'</span><span>Payment</span><span>'+fmt(p.pagoMensual)+'/mo</span></div>'+
      '<button class="btn btn-peq" data-ac="pagarPersonal" data-id="'+p.id+'">Pay down</button></div>';
  }
  $('listaPrestamos').innerHTML = h || '<div class="dim" style="font-size:12px">No personal debt</div>';
}
function renderDerecha(){
  var inf = S.influencia;
  var partes = [['Economic',inf.economica,'Revenue of companies you control'],['Labor',inf.laboral,'People who depend on you'],['Financial',inf.financiera,'Banks you own and debt you carry'],['Political',inf.politica,'Lobbying and media']];
  var h = '', i, mx = Math.max(1, inf.economica, inf.laboral, inf.financiera, inf.politica);
  for(i=0;i<partes.length;i++){
    h += '<div class="infb" title="'+esc(partes[i][2])+'"><div class="l"><span>'+partes[i][0]+'</span><span>'+miles(partes[i][1])+'</span></div>'+
      '<div class="b"><i style="width:'+clamp(partes[i][1]/mx*100,0,100)+'%"></i></div></div>';
  }
  h += '<div class="kv" title="0.5 + reputation/100"><span>Multiplier (reputation)</span><span class="oro">×'+inf.multiplicador.toFixed(2)+'</span></div>';
  h += '<div class="kv"><span>Total</span><span class="oro">'+pi(inf.total)+'</span></div>';
  var falta = influenciaParaSubir(S);
  if(posicionJugador(S)<=40) h += '<div class="nota">'+(posicionJugador(S)===1?'You are #1. '+S.flags.mesesEnTop1+'/24 months toward victory.':'To move up one rank you need <b>+'+miles(falta)+' IP</b>.')+'</div>';
  $('panelInfluencia').innerHTML = h;

  var j = S.jugador, pat = patrimonio(S), hito='';
  if(j.etapa===0) hito = metaBarra('Next stage: Entrepreneur', 'Net worth '+fmt(pat)+' / '+fmt(100000)+' · or a company with 2+ people and positive EBITDA for 3 months', pat/100000);
  else if(j.etapa===1) hito = metaBarra('Next stage: Investor', 'Net worth '+fmt(pat)+' / '+fmt(5e6), pat/5e6);
  else if(j.etapa===2) hito = metaBarra('Next stage: Tycoon', 'Net worth '+fmt(pat)+' / '+fmt(1e8)+' · or reach the top 40', pat/1e8);
  else if(j.etapa===3) hito = metaBarra('Next stage: Titan', 'Net worth '+fmt(pat)+' / '+fmt(1e10)+' · or top 10', pat/1e10);
  else hito = metaBarra('Victory: 24 months at #1', S.flags.mesesEnTop1+' / 24 months accumulated', S.flags.mesesEnTop1/24);
  var rp = rutaPrincipal(S);
  var lad = '<div class="panel" style="padding:9px 12px"><div style="display:flex;justify-content:space-between;align-items:center"><b>'+ico(RUTAS[rp].ic)+' '+esc(RUTAS[rp].t)+' path</b><button class="btn btn-peq" data-ac="rutas">All paths</button></div>'+ladderHTML(rp,true)+'</div>';
  $('panelHito').innerHTML = lad + hito + renderPath();
  renderSpark();
  $('panelLog').innerHTML = renderTimeline();
}
function metaBarra(t, sub, p){
  p = clamp(p,0,1);
  return '<div class="panel"><b>'+esc(t)+'</b><div class="dim" style="font-size:11.5px;margin:3px 0">'+esc(sub)+'</div>'+
    '<div class="barra" style="height:6px"><i style="width:'+(p*100).toFixed(1)+'%;background:var(--oro)"></i></div></div>';
}

/* ---------------- CENTRO ---------------- */
function renderCentro(){
  var h = '';
  if(TAB==='mes') h = tabMes();
  else if(TAB==='mercado') h = tabMercado();
  else if(TAB==='ranking') h = tabRanking();
  else if(TAB==='economia') h = tabEconomia();
  else if(TAB==='glosario') h = tabGlosario();
  else if(TAB==='lifestyle') h = tabLifestyle();
  else h = tabStats();
  $('panelTabs').innerHTML = h;
  if(TAB==='economia') pintarGraficas();
  var tabs = document.querySelectorAll('#tabs .tab'), i;
  for(i=0;i<tabs.length;i++) tabs[i].className = 'tab'+(tabs[i].getAttribute('data-tab')===TAB?' activo':'');
}

function accionesDisponibles(){
  var j = S.jugador, e = S.empresas, pat = patrimonio(S), reales = empresasReales(S);
  return [
   {g:'Operar', et:0, t:'Invest in a company', s:'Capital → capacity → revenue', ac:'invertir', ok:reales.length>0, term:'flujo'},
   {g:'Operar', et:1, t:'Hire', s:'Each person needs capital to produce', ac:'contratar', ok:reales.length>0, term:'margen'},
   {g:'Operar', et:1, t:'Lay off', s:'Cuts payroll, costs reputation', ac:'despedir', ok:reales.length>0},
   {g:'Operar', et:1, t:'Open branch', s:'Replicates the business', ac:'sucursal', ok:reales.length>0},
   {g:'Operar', et:1, t:'Appoint CEO', s:'Frees your time, protects your legacy', ac:'ceo', ok:reales.length>0},
   {g:'Operar', et:0, t:'Dividend policy', s:'Distribute, reinvest or accumulate', ac:'dividendos', ok:reales.length>0},
   {g:'Operar', et:0, t: tieneEmpleo(S)?'Quit your job':'Find a job', s: tieneEmpleo(S)?'Your companies get your time back':'Steady income in 2 months', ac:'empleo', ok:true},

   {g:'Financiar', et:0, t:'Personal loan', s:'Up to '+fmt(capacidadPrestamoPersonal(S)), ac:'prestamoP', ok:true, term:'apalancamiento'},
   {g:'Financiar', et:0, t:'Corporate loan', s:'Against company EBITDA', ac:'prestamoC', ok:reales.length>0, term:'ebitda'},
   {g:'Financiar', et:0, t:'Repay debt', s:'Raises reputation when paid off', ac:'pagarDeuda', ok:reales.length>0||S.prestamos.length>0},
   {g:'Financiar', et:0, t:'Inject capital into company cash', s:'Rescues a company in a cash crunch', ac:'inyectar', ok:reales.length>0},
   {g:'Financiar', et:3, t:'Issue bonds', s:'Interest only; principal due at maturity', ac:'bonos', ok:reales.length>0, term:'bonos'},
   {g:'Financiar', et:3, t:'Equity raise', s:'Cash comes in, your ownership drops', ac:'ampliacion', ok:reales.length>0, term:'dilucion'},
   {g:'Financiar', et:3, t:'Preferred stock', s:'Capital without dilution, fixed 8% dividend', ac:'preferentes', ok:reales.length>0, term:'preferentes'},

   {g:'Comprar', et:0, t:'View the market', s:S.mercado.ofertas.length+' companies for sale', ac:'tabMercado', ok:true, term:'valoracion'},
   {g:'Comprar', et:2, t:'Invest in a startup', s:S.mercado.startups.length+' available', ac:'tabMercado', ok:true, term:'tir'},
   {g:'Comprar', et:2, t:'Buy a building', s:S.mercado.edificios.length+' available', ac:'tabMercado', ok:true},
   {g:'Comprar', et:3, t:'Hostile takeover', s:'Take a company from a rival', ac:'hostil', ok:true},
   {g:'Comprar', et:0, t:'Sell a company', s:'Turns future cash flow into cash', ac:'vender', ok:reales.length>0},

   {g:'Estrategia', et:2, t:'Philanthropy', s:'Reputation and legitimacy', ac:'filantropia', ok:true},
   {g:'Estrategia', et:3, t:'Merge two companies', s:'Synergies and disruption', ac:'fusionar', ok:reales.length>1, term:'mya'},
   {g:'Estrategia', et:3, t:'Create holding company', s:S.flags.holding?'You already have one':'Tax consolidation and legacy', ac:'holding', ok:!S.flags.holding},
   {g:'Estrategia', et:4, t:'Lobbying', s:'Political influence, political risk', ac:'lobbying', ok:true, term:'riesgoPolitico'},
   {g:'Estrategia', et:4, t:'Pressure the central bank', s:'Lowers the rate for 24 months', ac:'bancoCentral', ok:true, term:'bancoCentral'},
   {g:'Estrategia', et:4, t:'Deal with a rival', s:'Stop competing for 36 months', ac:'pacto', ok:true},
   {g:'Estrategia', et:4, t:'Market power', s:'Your dominance by sector', ac:'poder', ok:true, term:'poderMercado'}
  ];
}
function tabMes(){
  var h = '', inst = S.eventoActual ? construirEvento(S, S.eventoActual) : null;
  if(S.fin) h += '<div class="evento"><h3>Game over</h3><p>'+esc(fraseLegado(S))+'</p><button class="btn btn-pri" data-ac="final">View summary</button></div>';
  if(inst){
    h += '<div class="evento"><h3>'+esc(inst.titulo)+'</h3>'+eventoCardHTML(inst, S.eventoActual.id, 'data-ac="evOp" data-id')+'</div>';
  } else if(!S.fin){
    h += '<div class="panel"><b>Month '+mesDelAno(S)+' of year '+anoJuego(S)+'.</b> <span class="dim">'+esc(titularMes())+'</span></div>';
  }
  if(!S.fin) h += radarHTML();
  var incap = num(S.jugador.incapacitadoHasta,0) > S.jugador.mes;
  if(incap) h += '<div class="panel" style="border-color:var(--neg)"><b class="neg">You are out of action due to health.</b> <span class="dim">You cannot act until month '+S.jugador.incapacitadoHasta+' ('+(S.jugador.incapacitadoHasta-S.jugador.mes)+' months). End months to let time pass.</span></div>';
  var acc = accionesDisponibles(), grupos = ['Operar','Financiar','Comprar','Estrategia'], i, k, proximos = {};
  for(k=0;k<grupos.length;k++){
    var items = '';
    for(i=0;i<acc.length;i++){
      var a = acc[i];
      if(a.g!==grupos[k]) continue;
      if(a.et > S.jugador.etapa){
        if(!proximos[a.et]) proximos[a.et] = [];
        proximos[a.et].push(a.t);
      } else {
        items += '<button class="acc" data-ac="'+a.ac+'"'+(a.term?' data-term="'+a.term+'"':'')+((a.ok && !incap)?'':' disabled')+'>'+esc(a.t)+'<small>'+esc(a.s)+'</small></button>';
      }
    }
    if(items) h += '<div class="grupo"><h4>'+({Operar:'Operate',Financiar:'Finance',Comprar:'Buy',Estrategia:'Strategy'}[grupos[k]]||grupos[k])+'</h4><div class="accs">'+items+'</div></div>';
  }
  var sig2 = S.jugador.etapa+1;
  if(proximos[sig2]){
    h += '<div class="unlock">'+ico('lock')+' <b>Next unlock — Stage '+sig2+' ('+NOMBRE_ETAPA[sig2]+'):</b> '+esc(proximos[sig2].join(' · '))+'</div>';
  }
  return h;
}
/* ---------- Risk radar: reads the state and names what can hurt you next ---------- */
function radarRiesgos(S){
  var sig = [], j = S.jugador, i, e, c, reales = empresasReales(S), eco = S.economia;
  var push = function(sev, ic, t, s){ sig.push({sev:sev, ic:ic, t:t, s:s}); };
  /* personal cash */
  var neto = ingresoMensualNeto(S);
  if(j.efectivo < 0){
    push('crit','coins','Your cash is negative ('+fmt(j.efectivo)+')', 'Month '+(num(j.mesesEfectivoNeg,0)+1)+' of 3 in the red. At month 3 the bank sells your assets. Sell something, borrow, or cut.');
  } else if(neto < 0){
    var run = j.efectivo/Math.max(1,-neto);
    if(run < 3) push('crit','coins','About '+Math.floor(run)+' months of cash left', 'You burn '+fmt(-neto)+'/mo. Raise cash now: sell, borrow, get a job or switch a company to distribute dividends.');
    else if(run < 6) push('high','coins','About '+Math.floor(run)+' months of runway', 'Net cash flow is '+fmt(neto)+'/mo. Fix the burn before it fixes you.');
    else if(run < 12) push('watch','coins','Runway under a year', 'You spend more than you earn ('+fmt(neto)+'/mo). Fine if revenue is ramping; dangerous if not.');
  }
  /* companies */
  for(i=0;i<reales.length;i++){
    e = reales[i]; c = calcular(e, eco);
    if(e.caja < 0){
      var m = num(e.mesesCajaNeg,0);
      push(m>=4?'crit':'high','flame',e.nombre+' is out of cash ('+fmt(e.caja)+')', (c.equity<0?'Equity is negative too: the bank takes it at month 6 (month '+m+' now). ':'')+'Inject cash, take a corporate loan, or sell before it gets worse.');
    }
    if(c.deudaTotal>0 && c.EBITDAanual<=0) push('crit','bank',e.nombre+' owes '+fmt(c.deudaTotal)+' with negative operating profit', 'Interest is paid from cash on hand, not from profits. Fix the business or restructure the debt before the cash runs out.');
    else if(c.apalancamiento > 6) push('crit','bank',e.nombre+' leverage '+c.apalancamiento.toFixed(1)+'x', 'Above 6x the bank can trigger a covenant any month: pay 20% of the debt at once or eat a +3% rate. Repay debt or grow EBITDA.');
    else if(c.apalancamiento > 4.5) push('high','bank',e.nombre+' leverage '+c.apalancamiento.toFixed(1)+'x', 'Covenant zone starts at 6x. A 20% drop in revenue would put you there. Avoid new debt here.');
    else if(c.apalancamiento > 3.5) push('watch','bank',e.nombre+' leverage '+c.apalancamiento.toFixed(1)+'x', 'Comfortable now; a recession cuts revenue up to 20% and leverage climbs with it.');
    var bonos = e.bonos||[], k;
    for(k=0;k<bonos.length;k++){
      var falta = num(bonos[k].mesVencimiento,0) - j.mes;
      if(falta <= 12 && falta >= 0) push(falta<=3?'high':'watch','doc',fmt(bonos[k].principal)+' of bonds at '+e.nombre+' mature in '+falta+' mo', 'You will have to repay or refinance at that month\'s rate (now '+pct(eco.tasaInteres)+'). Keep cash or EBITDA ready.');
    }
  }
  /* antitrust */
  var top = sectorConMasParticipacion(S);
  if(top.sector && top.part > 0.25) push('high','scale','Antitrust exposure in '+top.sector+' ('+pct(top.part,1)+')', 'Above 25% an investigation can start any month: fine, forced sale or spending political influence. Diversify or build political cover.');
  else if(top.sector && top.part > 0.18) push('watch','scale',top.sector+' share '+pct(top.part,1)+', regulators notice at 25%', 'You get a 1.25x influence bonus from 10%; the investigation risk starts at 25%. Decide how far you want to push.');
  /* cycle */
  if(eco.fase==='expansion' && eco.mesesEnFase >= 36) push('watch','clock','This expansion is '+eco.mesesEnFase+' months old', 'Expansions last 36 to 72 months, then a peak and a recession. Lock in cheap valuations now, not leverage.');
  else if(eco.fase==='pico') push('high','clock','The economy is at its peak', 'Historically the worst moment to take on debt. The next phase is a recession: revenue down up to 20% and multiples compress.');
  else if(eco.fase==='recesion') push('watch','down','Recession: month '+eco.mesesEnFase, 'Revenue is depressed and rates are falling. Those with cash buy cheap; those with debt sell cheap.');
  /* reputation & politics */
  if(j.reputacion < 35) push('high','heart','Reputation '+Math.round(j.reputacion)+': bad events are 50% more likely', 'Low reputation also raises your interest spread and cuts your influence multiplier (×'+S.influencia.multiplicador.toFixed(2)+'). Repay debt, hire, give.');
  else if(j.reputacion < 45) push('watch','heart','Reputation '+Math.round(j.reputacion)+' is slipping', 'Below 35 the market turns against you. Below 50 your debt already costs more.');
  if(j.riesgoPolitico > 50) push('high','key','Political risk '+Math.round(j.riesgoPolitico)+': journalists are looking', 'Scandals and investigations scale with this number. It decays 1 per month; philanthropy cuts it faster.');
  else if(j.riesgoPolitico > 25) push('watch','key','Political risk '+Math.round(j.riesgoPolitico), 'Lobbying and dominance leave traces. Keep an eye on it.');
  /* hostile rival */
  if(num(S.flags.hostilHasta,0) > j.mes) push('watch','swords','A rival is hostile for '+(S.flags.hostilHasta-j.mes)+' more months', 'Bad events are 50% more likely and they block some of your deals. Hostility expires; a deal ends it sooner.');
  /* job dependency */
  if(tieneEmpleo(S)){
    var frenadas = 0; for(i=0;i<reales.length;i++) if(!reales[i].ceo && reales[i].crecimiento>0) frenadas++;
    if(frenadas) push('watch','briefcase','Your job slows '+frenadas+' of your companies', 'Companies without a CEO lose 10% of their growth while you are employed. Quit or appoint CEOs when the salary stops mattering.');
  }
  /* concentration */
  var pat = patrimonio(S), mayor = empresaMayor(S);
  if(mayor && pat > 50000){
    var vp = calcular(mayor, eco).valorParticipacion;
    if(vp/pat > 0.75 && reales.length>1) push('watch','layers',pct(vp/pat,0)+' of your net worth is '+mayor.nombre, 'One lawsuit, strike or sector crisis would hit most of what you own. A second pillar is cheaper than it looks.');
  }
  var orden = {crit:0, high:1, watch:2};
  sig.sort(function(a,b){ return orden[a.sev]-orden[b.sev]; });
  return sig.slice(0,6);
}
function radarHTML(){
  var sig = radarRiesgos(S), i, max = 'calm';
  for(i=0;i<sig.length;i++){ if(sig[i].sev==='crit'){ max='crit'; break; } if(sig[i].sev==='high') max='high'; else if(max==='calm') max='watch'; }
  var rs = riskScore(S), lvl = {low:'Low',moderate:'Moderate',high:'High',critical:'Critical'}[rs.nivel];
  var lvlCls = rs.nivel==='critical'?'neg':rs.nivel==='high'?'avi':rs.nivel==='moderate'?'avi':'pos';
  if(rs.nivel==='critical') max='crit'; else if(rs.nivel==='high' && max!=='crit') max='high';
  var h = '<div class="radar '+max+'"><h4>'+ico('shield')+' Risk radar <span class="pill" title="Leverage '+rs.partes.leverage+' · concentration '+rs.partes.concentracion+' · runway '+rs.partes.runway+' · cycle '+rs.partes.ciclo+' · maturities '+rs.partes.vencimientos+' · personal debt '+rs.partes.personal+'. Above 45 the banks lend less and charge more; above 75 a bad month turns into distress.">Risk score <b class="'+lvlCls+'">'+rs.score+' · '+lvl+'</b></span><span class="cnt">'+(sig.length?sig.length+' signal'+(sig.length>1?'s':''):'')+'</span></h4>';
  if(!sig.length) h += '<div class="calm">'+ico('check')+' No threats on the radar. Enjoy it; it never lasts.</div>';
  var led = S.ledger||[], k;
  for(k=0;k<led.length;k++){
    var p = led[k], falta = p.hasta!==undefined ? (p.hasta - S.jugador.mes) : null;
    var desc = p.cond==='ebitdaDrop' ? 'If its operating profit falls '+pct(p.pct||0.3,0)+' from peak, the lenders come knocking' : p.cond==='recession' ? 'If a recession arrives, the capacity you financed loses value' : p.cond==='runway' ? 'If your cash runs below 3 months, the bank calls the line' : p.tipo==='prob' ? 'It can surface any month' : 'Scheduled';
    h += '<div class="rsig watch"><span class="ri">'+ico('clock')+'</span><span><b>Open exposure: '+esc(p.titulo)+' (year '+p.ano+')</b><small>'+desc+(falta!==null?' · '+falta+' months left':'')+'</small></span><span class="sev">Pending</span></div>';
  }
  var lab = {crit:'Critical', high:'High', watch:'Watch'};
  for(i=0;i<sig.length;i++){
    h += '<div class="rsig '+sig[i].sev+'"><span class="ri">'+ico(sig[i].ic)+'</span><span><b>'+esc(sig[i].t)+'</b><small>'+esc(sig[i].s)+'</small></span><span class="sev">'+lab[sig[i].sev]+'</span></div>';
  }
  return h+'</div>';
}
function titularMes(){
  var reales = empresasReales(S), j = S.jugador, i, c, mejor=null, mv=-Infinity;
  if(j.efectivo < 0) return 'Your cash is negative. Sell, borrow or inject before the bank steps in.';
  var neto = ingresoMensualNeto(S);
  if(neto < 0 && j.efectivo < -neto*3) return 'Cash is tight: about '+Math.max(0,Math.floor(j.efectivo/Math.max(1,-neto)))+' months of runway left.';
  for(i=0;i<reales.length;i++){ c = calcular(reales[i], S.economia); if(c.EBITDA>mv){ mv=c.EBITDA; mejor=reales[i]; } }
  if(mejor && mv>0) return mejor.nombre+' is making '+fmt(mv)+'/mo in operating profit. Reinvest it or let it pile up.';
  if(mejor && mv<=0) return mejor.nombre+' is losing '+fmt(-mv)+' a month. Growth or cuts — pick one.';
  if(tieneEmpleo(S)) return 'Steady salary coming in. The question is what you do with it.';
  return 'Nothing new. Take actions and end the month.';
}

/* ---------------- MERCADO ---------------- */
function tabMercado(){
  var h = '', i;
  var tier = redTier(S);
  h += '<div class="net">'+ico('users')+'<span>Network: <span class="tier">'+RED_NOMBRES[tier]+'</span> · '+esc(redTexto(S))+'</span><span class="dim" style="margin-left:auto;white-space:nowrap">Next tier: '+esc(redSiguiente(S))+'</span></div>'+(reputacionBloquea(S)?'<div class="prev mal-box">Reputation below 35: sellers will not negotiate, banks will not finance buyouts, founders will not take your money.</div>':'');
  h += '<h4 style="color:var(--oro)">Companies for sale</h4>';
  if(!S.mercado.ofertas.length) h += '<div class="nota">Nothing for sale this month.</div>';
  for(i=0;i<S.mercado.ofertas.length;i++){
    var o = S.mercado.ofertas[i], e = o.empresa, c = calcular(e, S.economia);
    var precio = num(o.precioAcordado, o.precioPedido);
    h += '<div class="panel'+(o.flash?' flash':'')+'"><div class="emp-top"><b>'+secMark(e.sector)+' '+esc(e.nombre)+'</b> <span>'+(o.flash?'<span class="flashtag">'+ico('bolt')+'Flash deal · gone next month</span> ':'')+(o.privado?'<span class="tag priv">Private deal · clean books</span> ':'')+'<span class="tag '+(o.etiqueta==='Cheap'?'ok':o.etiqueta==='Expensive'?'av':o.etiqueta==='Over-leveraged'?'mal':'')+'">'+esc(o.etiqueta)+'</span></span></div>'+
      '<div style="margin:2px 0 4px">'+secChip(e.sector, ' · '+o.meses+' month(s) left on the market')+'</div>'+
      '<div class="emp-g" style="grid-template-columns:1fr 1fr 1fr 1fr">'+
      '<span>Revenue/yr</span><span>'+fmt(c.ingresosAnuales)+'</span>'+
      '<span>EBITDA/yr</span><span class="'+cls(c.EBITDAanual)+'">'+fmt(c.EBITDAanual)+'</span>'+
      '<span>Assets</span><span>'+fmt(e.activos)+'</span>'+
      '<span>Debt</span><span>'+fmt(c.deudaTotal)+'</span>'+
      '<span>Employees</span><span>'+miles(e.empleados)+'</span>'+
      '<span>Growth</span><span>'+pct(e.crecimiento,1)+'/mo</span>'+
      '<span>Leverage</span><span>'+c.apalancamiento.toFixed(1)+'x</span>'+
      '<span>Price multiple</span><span>'+o.multImplicito.toFixed(1)+'x EBITDA</span>'+
      '</div>'+
      '<div class="prev">Asking price for 100%: <b>'+fmt(precio)+'</b>'+(o.precioAcordado?' <span class="pos">(agreed)</span>':'')+
      ' · Due diligence: '+fmt(costoDD(o))+(o.ddHecha?' <span class="pos">(done)</span>':'')+'</div>'+
      '<div class="row" style="margin:0;gap:6px">'+
      '<button class="btn btn-pri btn-peq" data-ac="comprar" data-id="'+o.id+'" data-term="valoracion">Buy</button>'+
      '<button class="btn btn-peq" data-ac="negociar" data-id="'+o.id+'"'+(o.rechazado&&o.intentos>1?' disabled':'')+'>Negotiate</button>'+
      '<button class="btn btn-peq" data-ac="dd" data-id="'+o.id+'"'+(o.ddHecha?' disabled':'')+' data-term="dd">Due diligence</button>'+
      '</div></div>';
  }
  if(S.jugador.etapa>=2){
    h += '<h4 style="color:var(--oro)">Startups</h4>';
    if(!S.mercado.startups.length) h += '<div class="nota">No open rounds.</div>';
    for(i=0;i<S.mercado.startups.length;i++){
      var st = S.mercado.startups[i];
      h += '<div class="panel"><b>'+esc(st.nombre)+'</b> <span class="emp-sec">'+esc(st.sector)+'</span>'+
       '<div class="emp-g"><span>Ticket</span><span>'+fmt(st.ticket)+'</span><span>Ownership</span><span>'+pct(st.propiedad,1)+'</span>'+
       '<span>Valuation</span><span>'+fmt(st.valoracion)+'</span><span>Horizon</span><span>'+Math.round(st.meses/12)+' years</span></div>'+
       '<div class="prev">50% chance of losing everything, 30% mediocre exit, 20% exit between 5x and 30x.</div>'+
       '<button class="btn btn-pri btn-peq" data-ac="startup" data-id="'+st.id+'" data-term="tir">Invest</button></div>';
    }
    h += '<h4 style="color:var(--oro)">Buildings</h4>';
    if(!S.mercado.edificios.length) h += '<div class="nota">No properties available.</div>';
    for(i=0;i<S.mercado.edificios.length;i++){
      var ed = S.mercado.edificios[i];
      h += '<div class="panel"><b>'+esc(ed.nombre)+'</b>'+
       '<div class="emp-g"><span>Price</span><span>'+fmt(ed.precio)+'</span><span>Rent/mo</span><span>'+fmt(ed.precio*0.06/12)+'</span>'+
       '<span>Expenses/mo</span><span>'+fmt(ed.precio*0.015/12)+'</span><span>Employees</span><span>'+miles(ed.empleados)+'</span></div>'+
       '<button class="btn btn-pri btn-peq" data-ac="edificio" data-id="'+ed.id+'">Buy</button></div>';
    }
  }
  return h;
}

/* ---------------- RANKING ---------------- */
function tabRanking(){
  var h = '<div class="nota">Your position: <b class="oro">'+posicionTexto(S)+'</b> with '+pi(S.influencia.total)+'. Best position reached: #'+(S.flags.mejorPosicion>=9999?'—':S.flags.mejorPosicion)+'. Months at #1: '+S.flags.mesesEnTop1+'/24.</div>';
  h += '<div class="scroll"><table><thead><tr><th>#</th><th>Titan</th><th>Country</th><th>Sector</th><th>Style</th><th>Age</th><th>Influence</th><th>Chg.</th><th></th></tr></thead><tbody>';
  var i, r, medallas = ['<span class="rank-n g">01</span>','<span class="rank-n s">02</span>','<span class="rank-n b">03</span>'];
  for(i=0;i<S.ranking.length;i++){
    r = S.ranking[i];
    var ref = r.ref;
    var vr = ref ? (num(ref.influencia,0)-num(ref.influenciaPrevia,0)) : (num(S.influencia.total,0)-num(S.flags.infAnoAnterior,0));
    var secR = ref?ref.sector:(S.empresas.length?S.empresas[0].sector:'—');
    h += '<tr'+(r.esJugador?' class="yo"':'')+'><td>'+(i<3?medallas[i]:(i+1))+'</td><td>'+avatarHTML(r.nombre)+esc(r.nombre)+(r.esJugador?' (you)':'')+'</td>'+
      '<td>'+esc(ref?ref.pais:'—')+'</td><td>'+(secR==='—'?'—':secChip(secR))+'</td>'+
      '<td>'+esc(ref?({aggressive:'Aggressive',conservative:'Conservative',political:'Political',builder:'Builder',agresivo:'Aggressive',conservador:'Conservative','político':'Political',constructor:'Builder'}[ref.estilo]||ref.estilo):'—')+'</td><td>'+(ref?ref.edad:edad(S))+'</td>'+
      '<td>'+miles(r.influencia)+'</td><td class="'+cls(vr)+'">'+sig(vr)+miles(Math.abs(vr))+'</td>'+
      (ref && S.jugador.etapa>=4 ? '<td><button class="btn btn-peq" data-ac="pactoR" data-id="'+ref.id+'">Deal</button></td>' : '<td></td>')+
      '</tr>';
  }
  h += '</tbody></table></div>';
  return h;
}

/* ---------------- ECONOMIA ---------------- */
function tabEconomia(){
  var eco = S.economia, h = '';
  h += '<div class="panel"><div class="emp-g" style="grid-template-columns:1fr 1fr 1fr 1fr">'+
    '<span>Phase</span><span class="oro">'+esc(({expansion:'Expansion',pico:'Peak',recesion:'Recession',recuperacion:'Recovery'}[eco.fase]||eco.fase))+'</span>'+
    '<span>Months in phase</span><span>'+eco.mesesEnFase+'/'+eco.duracionFase+'</span>'+
    '<span>Interest rate</span><span>'+pct(eco.tasaInteres)+'</span>'+
    '<span>Market index</span><span>'+miles(eco.indiceMercado)+'</span>'+
    '<span>Corporate tax</span><span>'+pct(eco.impuestoCorporativo,0)+'</span>'+
    '<span>Inflation</span><span>'+pct(eco.inflacionMensual,1)+'/mo</span>'+
    '</div></div>';
  h += '<h4>Market index</h4><canvas id="cvIdx" width="600" height="170"></canvas>';
  h += '<h4>Your influence</h4><canvas id="cvInf" width="600" height="170"></canvas>';
  h += '<h4>Your market share</h4><div class="scroll" style="max-height:30vh"><table><thead><tr><th>Sector</th><th>Your revenue/yr</th><th>Share</th><th>Bonus</th></tr></thead><tbody>';
  var i, s2, p, ing;
  for(i=0;i<LISTA_SECTORES.length;i++){
    s2 = LISTA_SECTORES[i]; p = participacionSector(S, s2);
    ing = 0;
    for(var k=0;k<S.empresas.length;k++) if(S.empresas[k].sector===s2 && esControlada(S.empresas[k])) ing += S.empresas[k].ingresos*12;
    if(ing<=0) continue;
    h += '<tr><td>'+esc(s2)+'</td><td>'+fmt(ing)+'</td><td>'+pct(p,2)+'</td><td>'+(p>=0.25?'×1.5':p>=0.10?'×1.25':'—')+'</td></tr>';
  }
  h += '</tbody></table></div>';
  return h;
}
function pintarGraficas(){
  dibujar($('cvIdx'), S.economia.historial.map(function(x){ return x.idx; }), '#d4a53a');
  dibujar($('cvInf'), S.influencia.historial.map(function(x){ return x.v; }), '#3ccf7a');
}
function dibujar(cv, datos, color){
  if(!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d'), w = cv.width, hh = cv.height, i;
  ctx.clearRect(0,0,w,hh);
  if(!datos || datos.length<2) return;
  var mx = -Infinity, mn = Infinity;
  for(i=0;i<datos.length;i++){ var v=num(datos[i],0); if(v>mx)mx=v; if(v<mn)mn=v; }
  if(!isFinite(mx)||!isFinite(mn)) return;
  var log = mx/Math.max(1,Math.abs(mn)) > 1000;
  var f = function(v){ return log ? Math.log(Math.max(1,num(v,0))) : num(v,0); };
  var fmx = f(mx), fmn = f(mn);
  if(fmx-fmn < 1e-9){ fmx = fmn+1; }
  ctx.strokeStyle = '#262a33'; ctx.lineWidth = 1;
  for(i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(0, hh*i/4); ctx.lineTo(w, hh*i/4); ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
  for(i=0;i<datos.length;i++){
    var x = i/(datos.length-1)*(w-6)+3;
    var y = hh-6 - (f(datos[i])-fmn)/(fmx-fmn)*(hh-14);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.fillStyle = '#9aa3b2'; ctx.font = '11px system-ui';
  ctx.fillText(miles(mx), 5, 12);
  ctx.fillText(miles(mn), 5, hh-4);
}

/* ---------------- GLOSARIO / STATS ---------------- */
function tabGlosario(){
  var h = '<div class="nota">Knowledge <b class="oro">'+terminosAprendidosCount(S)+'/'+TERMINOS.length+'</b> · correct '+S.jugador.conocimiento.aciertos+' · wrong '+S.jugador.conocimiento.fallos+'</div>', i;
  for(i=0;i<TERMINOS.length;i++){
    var t = TERMINOS[i], ap = terminoAprendido(S, t.id);
    h += '<div class="panel"><b>'+(ap?'':ico('lock','dim')+' ')+esc(t.nombre)+'</b>'+
      (ap? '<div style="font-size:12.5px;margin-top:4px">'+esc(t.def)+'</div>'
         : '<div class="dim" style="font-size:12px;margin-top:4px">Unlocks when you use the related action.</div>')+
      '</div>';
  }
  return h;
}
function tabStats(){
  var st = S.estadisticas, h = '<div class="panel fin">';
  h += kv('Net worth', fmt(patrimonio(S)));
  h += kv('Peak net worth', fmt(S.flags.maxPatrimonio));
  h += kv('Peak influence', pi(S.flags.maxInfluencia));
  h += kv('Best position', S.flags.mejorPosicion>=9999?'—':'#'+S.flags.mejorPosicion);
  h += kv('Companies controlled', String(S.empresas.length));
  h += kv('Employees', miles(empleadosTotales(S)));
  h += kv('Total debt', fmt(deudaTotalJugador(S)));
  h += kv('Annual EBITDA', fmt(ebitdaTotal(S)));
  h += kv('Companies bought', String(st.empresasCompradas));
  h += kv('Companies sold', String(st.empresasVendidas));
  h += kv('Hired / laid off', miles(st.contratados)+' / '+miles(st.despedidos));
  h += kv('Successful / failed startups', st.startupsExito+' / '+st.startupsFracaso);
  h += kv('Dividends collected', fmt(st.dividendosCobrados));
  h += kv('Interest paid', fmt(st.interesesPagados));
  h += kv('Taxes paid', fmt(st.impuestosPagados));
  h += '</div>';
  return h;
}

/* ---------------- SELECTORES Y MONTOS ---------------- */
function elegirEmpresa(titulo, filtro, cb, sub){
  var l = [], i;
  for(i=0;i<S.empresas.length;i++) if(!filtro || filtro(S.empresas[i])) l.push(S.empresas[i]);
  if(!l.length){ toast('No valid companies for this action.','mal'); return; }
  if(l.length===1){ cb(l[0]); return; }
  var html = l.map(function(e){
    var c = calcular(e,S.economia);
    return '<button class="opcion" data-sel="'+e.id+'"><b>'+esc(e.nombre)+'</b> <span class="dim">'+esc(e.sector)+'</span><br>'+
      '<span class="dim" style="font-size:11.5px">EBITDA '+fmt(c.EBITDA)+'/mo · cash '+fmt(e.caja)+' · debt '+fmt(c.deudaTotal)+' · yours '+pct(e.propiedad,0)+'</span></button>';
  }).join('');
  modal({titulo:titulo, sub:sub, html:'<div class="opciones">'+html+'</div>', botones:[{t:'Cancel'}],
    alMontar:function(bd, cerrarF){
      bd.addEventListener('click', function(ev){
        var id = ev.target.getAttribute && ev.target.getAttribute('data-sel');
        if(!id){ var pr = ev.target.closest ? ev.target.closest('[data-sel]') : null; if(pr) id = pr.getAttribute('data-sel'); }
        if(!id) return;
        cerrarF(); cb(empresaPorId(S, +id));
      });
    }});
}
function pedirMonto(cfg){
  var max = Math.max(0, Math.floor(num(cfg.max,0)));
  var min = Math.max(0, Math.floor(num(cfg.min,0)));
  if(max < min){ toast(cfg.sinEspacio||'There is no room for this operation right now.','mal'); return; }
  var val = clamp(Math.floor(num(cfg.valor, max)), min, max);
  var extra = cfg.extraHtml || '';
  modal({titulo:cfg.titulo, sub:cfg.sub,
    html:'<label>'+esc(cfg.etiqueta||'Amount')+'<input id="mInput" type="number" min="'+min+'" max="'+max+'" step="1" value="'+val+'"></label>'+
      '<input id="mRange" type="range" min="'+min+'" max="'+max+'" step="'+Math.max(1,Math.floor((max-min)/1000))+'" value="'+val+'">'+
      '<div class="dim" style="font-size:11.5px">Minimum '+fmt(min)+' · maximum '+fmt(max)+'</div>'+
      extra+'<div class="prev" id="mPrev"></div>',
    botones:[{t:'Cancel'},{t:cfg.okTxt||'Confirm', cls:'btn-pri', cb:function(bd){ cfg.onOk(leer(bd)); }}],
    alMontar:function(bd){
      var inp = bd.querySelector('#mInput'), rng = bd.querySelector('#mRange'), prev = bd.querySelector('#mPrev');
      var upd = function(src){
        var v = clamp(Math.floor(num(src.value,min)), min, max);
        inp.value = v; rng.value = v;
        prev.innerHTML = cfg.preview ? cfg.preview(v) : '';
      };
      inp.addEventListener('input', function(){ upd(inp); });
      rng.addEventListener('input', function(){ upd(rng); });
      upd(inp);
      setTimeout(function(){ inp.focus(); inp.select(); }, 30);
    }});
  function leer(bd){ var i2 = bd.querySelector('#mInput'); return clamp(Math.floor(num(i2 && i2.value, min)), min, max); }
}
function hecho(r){
  if(r && r.ok){ toast(r.msg,'ok'); }
  else if(r){ toast(r.msg,'mal'); }
  calcularInfluencia(S); construirRanking(S); guardar(S); render();
  checkHitos(S, true);
}

/* ---------------- DETALLE DE EMPRESA ---------------- */
function detalleEmpresa(e){
  if(!e) return;
  var c = calcular(e, S.economia), part = participacionSector(S, e.sector);
  var fila = function(k,v,t){ return '<div class="kv"'+(t?' title="'+esc(t)+'"':'')+'><span>'+k+'</span><span>'+v+'</span></div>'; };
  var pyg = '<h4>Income statement (monthly)</h4>'+
    fila('Revenue', fmt(c.ingresos), 'What you bill per month')+
    fila('Cost of sales', '-'+fmt(c.ingresos-c.utilidadBruta), 'Revenue × (1 − gross margin)')+
    fila('Gross profit', fmt(c.utilidadBruta), 'Revenue × gross margin')+
    fila('Fixed costs', '-'+fmt(c.gastosFijos), 'Payroll and overhead')+
    fila('<b>Operating profit (EBITDA)</b>', '<b class="'+cls(c.EBITDA)+'">'+fmt(c.EBITDA)+'</b>', 'Gross profit − fixed costs. What the business earns by operating, before financing and taxes.')+
    fila('Interest', '-'+fmt(c.intereses), '(debt × rate + bonds × rate) / 12')+
    fila('Depreciation', '-'+fmt(c.depreciacion), 'Assets × 0.4%: equipment wears out')+
    fila('Taxes', '-'+fmt(c.impuestos), 'Pre-tax profit × '+pct(S.economia.impuestoCorporativo,0))+
    (c.dividendoPreferente>0?fila('Preferred dividend','-'+fmt(c.dividendoPreferente),'Preferred × 8% / 12'):'')+
    fila('<b>Net profit</b>', '<b class="'+cls(c.utilidadNeta)+'">'+fmt(c.utilidadNeta)+'</b>', 'What is left for the owners after everything');
  var bal = '<h4>Balance sheet</h4>'+ balanceColumnas(e, c) +
    fila('Assets', fmt(e.activos), 'Productive capacity: what the company owns')+
    fila('Bank debt', fmt(e.deuda)+' @ '+pct(e.tasaDeuda), 'Loans the company owes the bank')+
    (totalBonos(e)>0?fila('Bonds', fmt(totalBonos(e)), 'Debt owed to the market'):'')+
    fila('<b>Equity</b>', '<b class="'+cls(c.equity)+'">'+fmt(c.equity)+'</b>', 'Assets − liabilities: what is truly the owners\'')+
    fila('Cash on hand', '<span class="'+(e.caja<0?'neg':'')+'">'+fmt(e.caja)+'</span>', 'Money available inside the company')+
    '<h4>Valuation</h4>'+
    fila('Enterprise value', fmt(c.valoracion), 'Annual EBITDA × multiple')+
    fila('Multiple', c.multiplo.toFixed(1)+'x', 'Sector base × adjustment for rate and growth')+
    fila('Your stake is worth', fmt(c.valorParticipacion), '(valuation − debt) × your ownership')+
    fila('Leverage', c.apalancamiento.toFixed(1)+'x', 'Debt / annual EBITDA. Above 4x the bank gets nervous.')+
    fila('Growth', pct(e.crecimiento,2)+'/mo', 'Monthly revenue growth; it decays toward the sector base')+
    fila('Employees', miles(e.empleados), '')+
    fila('Your ownership (share)', pct(e.propiedad,1), 'Above 50% you control it and it counts fully for influence')+
    fila('Sector share', pct(part,2), 'Your revenue / global sector size');
  var acciones = '<div class="row" style="margin-top:12px;gap:6px">'+
    (e.esEmpleo?'<button class="btn btn-peq" data-ac="empleo">Quit</button>':
     '<button class="btn btn-peq" data-ac="invertirE" data-id="'+e.id+'" data-term="flujo">Invest</button>'+
     (S.jugador.etapa>=1?'<button class="btn btn-peq" data-ac="contratarE" data-id="'+e.id+'" data-term="margen">Hire</button>'+
      '<button class="btn btn-peq" data-ac="despedirE" data-id="'+e.id+'">Lay off</button>'+
      '<button class="btn btn-peq" data-ac="sucursalE" data-id="'+e.id+'">Branch</button>'+
      (e.ceo?'':'<button class="btn btn-peq" data-ac="ceoE" data-id="'+e.id+'">CEO</button>'):'')+
     '<button class="btn btn-peq" data-ac="prestamoCE" data-id="'+e.id+'" data-term="ebitda">Take on debt</button>'+
     '<button class="btn btn-peq" data-ac="pagarDeudaE" data-id="'+e.id+'">Repay debt</button>'+
     '<button class="btn btn-peq" data-ac="inyectarE" data-id="'+e.id+'">Inject cash</button>'+
     '<button class="btn btn-peq" data-ac="dividendosE" data-id="'+e.id+'">Dividends: '+({distribuir:'Distribute',reinvertir:'Reinvest',acumular:'Accumulate'}[e.politicaDividendos]||e.politicaDividendos)+'</button>'+
     (S.jugador.etapa>=3?'<button class="btn btn-peq" data-ac="bonosE" data-id="'+e.id+'" data-term="bonos">Bonds</button>'+
      '<button class="btn btn-peq" data-ac="ampliacionE" data-id="'+e.id+'" data-term="dilucion">Raise equity</button>'+
      '<button class="btn btn-peq" data-ac="preferentesE" data-id="'+e.id+'" data-term="preferentes">Preferred</button>':'')+
     '<button class="btn btn-peq" data-ac="venderE" data-id="'+e.id+'">Sell</button>')+
    '</div>';
  modal({titulo:e.nombre, sub:e.sector+(e.esEdificio?' · property':'')+(e.ceo?' · with CEO':'')+' · hover any line for a plain-English explanation', ancho:true,
    html:'<div class="dos"><div>'+pyg+'</div><div>'+bal+'</div></div>'+acciones,
    botones:[{t:'Close'}]});
}

/* ---------------- ACCIONES ---------------- */
function ejecutar(ac, id){
  var e, o, i;
  switch(ac){
  case 'detalle': detalleEmpresa(empresaPorId(S,id)); break;
  case 'evOp':
    (function(){
      var inst = construirEvento(S, S.eventoActual);
      if(!inst) return;
      resolverEvento(S, id);
      hecho(null);
      modal({titulo:'What this teaches', html:'<div class="teach">'+esc(inst.ensena||'')+'</div>', botones:[{t:'Continue', cls:'btn-pri'}]});
    })();
    break;
  case 'tabMercado': TAB='mercado'; render(); break;
  case 'final': pantallaFinal(); break;

  case 'invertir': elegirEmpresa('Which company do you invest in?', function(x){ return !x.esEmpleo; }, accInvertir); break;
  case 'invertirE': accInvertir(empresaPorId(S,id)); break;
  case 'contratar': elegirEmpresa('Where do you hire?', function(x){ return !x.esEmpleo && !x.esEdificio; }, accContratar); break;
  case 'contratarE': accContratar(empresaPorId(S,id)); break;
  case 'despedir': elegirEmpresa('Where do you lay people off?', function(x){ return !x.esEmpleo && x.empleados>=1; }, accDespedir); break;
  case 'despedirE': accDespedir(empresaPorId(S,id)); break;
  case 'sucursal': elegirEmpresa('Which company do you open a branch for?', function(x){ return !x.esEmpleo && !x.esEdificio; }, accSucursal); break;
  case 'sucursalE': accSucursal(empresaPorId(S,id)); break;
  case 'ceo': elegirEmpresa('Where do you appoint a CEO?', function(x){ return !x.esEmpleo && !x.ceo; }, accCEO); break;
  case 'ceoE': accCEO(empresaPorId(S,id)); break;
  case 'dividendos': elegirEmpresa('Which company do you change the policy for?', function(x){ return !x.esEmpleo; }, accDividendos); break;
  case 'dividendosE': accDividendos(empresaPorId(S,id)); break;
  case 'empleo':
    if(tieneEmpleo(S)) hecho(renunciarEmpleo(S)); else hecho(buscarEmpleo(S));
    break;
  case 'prestamoP': accPrestamoPersonal(); break;
  case 'prestamoC': elegirEmpresa('Which company takes on the debt?', function(x){ return !x.esEmpleo; }, accPrestamoCorp); break;
  case 'prestamoCE': accPrestamoCorp(empresaPorId(S,id)); break;
  case 'pagarDeuda':
    if(S.prestamos.length && !empresasReales(S).length) accPagarPersonal(S.prestamos[0].id);
    else elegirEmpresa('Which debt do you repay?', function(x){ return !x.esEmpleo && x.deuda>0; }, accPagarDeuda, 'Your personal loans are paid down from the left column.');
    break;
  case 'pagarDeudaE': accPagarDeuda(empresaPorId(S,id)); break;
  case 'pagarPersonal': accPagarPersonal(id); break;
  case 'inyectar': elegirEmpresa('Which company do you inject cash into?', function(x){ return !x.esEmpleo; }, accInyectar); break;
  case 'inyectarE': accInyectar(empresaPorId(S,id)); break;
  case 'vender': elegirEmpresa('Which company do you sell?', function(x){ return !x.esEmpleo; }, accVender); break;
  case 'venderE': accVender(empresaPorId(S,id)); break;
  case 'venderStartup':
    for(i=0;i<S.startups.length;i++) if(S.startups[i].id===id) hecho(venderStartup(S, S.startups[i]));
    break;

  case 'comprar': accComprar(ofertaPorId(id)); break;
  case 'negociar': accNegociar(ofertaPorId(id)); break;
  case 'dd':
    o = ofertaPorId(id);
    if(o){
      var snapDD = o.oculto ? {tipo:o.oculto.tipo, valor:o.oculto.valor} : null, precioAntesDD = o.precioPedido;
      var rDD = hacerDueDiligence(S,o);
      if(rDD && rDD.ok){ calcularInfluencia(S); construirRanking(S); guardar(S); render(); checkHitos(S,true); modalDD(o, snapDD, precioAntesDD, rDD); }
      else hecho(rDD);
    }
    break;
  case 'startup': accStartup(id); break;
  case 'edificio': accEdificio(id); break;

  case 'bonos': elegirEmpresa('Which company issues bonds?', function(x){ return !x.esEmpleo; }, accBonos); break;
  case 'bonosE': accBonos(empresaPorId(S,id)); break;
  case 'ampliacion': elegirEmpresa('Which company raises equity?', function(x){ return !x.esEmpleo; }, accAmpliacion); break;
  case 'ampliacionE': accAmpliacion(empresaPorId(S,id)); break;
  case 'preferentes': elegirEmpresa('Which company issues preferred stock?', function(x){ return !x.esEmpleo; }, accPreferentes); break;
  case 'preferentesE': accPreferentes(empresaPorId(S,id)); break;
  case 'fusionar': accFusionar(); break;
  case 'holding': hecho(crearHolding(S)); break;
  case 'hostil': accHostil(); break;
  case 'filantropia': accFilantropia(); break;
  case 'lobbying': accLobbying(); break;
  case 'bancoCentral': hecho(presionarBancoCentral(S)); break;
  case 'pacto': accPacto(); break;
  case 'pactoR': accPacto(id); break;
  case 'poder': modalPoder(); break;
  case 'rutas': modalRutas(); break;
  case 'lsBuy': accLifestyle(id); break;
  case 'lsSell': hecho(venderLifestyle(S, +id)); break;
  }
}
function ofertaPorId(id){ for(var i=0;i<S.mercado.ofertas.length;i++) if(S.mercado.ofertas[i].id===id) return S.mercado.ofertas[i]; return null; }

function accInvertir(e){
  if(!e) return;
  pedirMonto({titulo:'Invest in '+e.nombre, min:100, max:Math.floor(S.jugador.efectivo), valor:Math.floor(S.jugador.efectivo*0.5),
    etiqueta:'How much do you invest?', okTxt:'Invest',
    sinEspacio:'You have no cash to invest.',
    preview:function(v){
      var ef = efectoInversion(e, v), c = calcular(e,S.economia);
      var nuevo = {ingresos:c.ingresos+ef.ingresos, gastos:c.gastosFijos+ef.gastos};
      var eb2 = nuevo.ingresos*e.margenBruto - nuevo.gastos;
      return 'In 6 months: revenue '+fmt(c.ingresos)+' → <b>'+fmt(nuevo.ingresos)+'</b>/mo · EBITDA '+fmt(c.EBITDA)+' → <b>'+fmt(eb2)+'</b>/mo<br>'+
        'Payroll +'+fmt(ef.gastos)+'/mo · people +'+miles(ef.empleados)+' · return on capital '+pct(SEC(e.sector).retCap*BAL.kCapex,0)+'/yr<br>'+
        'Cash: '+fmt(S.jugador.efectivo)+' → '+fmt(S.jugador.efectivo-v);
    },
    onOk:function(v){
      if(e.propiedad<0.999){
        modal({titulo:'You have partners in '+e.nombre, html:'<p>Your ownership is '+pct(e.propiedad,1)+'. How do you contribute?</p>',
          botones:[{t:'Contribute alone (raises my %)', cls:'btn-pri', cb:function(){ hecho(invertirAumentandoPropiedad(S,e,v)); }},
                   {t:'Contribute pro rata', cb:function(){ hecho(invertirEnEmpresa(S,e,v)); }}]});
      } else hecho(invertirEnEmpresa(S,e,v));
    }});
}
function accContratar(e){
  if(!e) return;
  var sec = SEC(e.sector);
  var porPersona = sec.capEmp + sec.salario;
  var maxN = Math.floor((S.jugador.efectivo + Math.max(0,e.caja))/porPersona);
  if(maxN<1){ toast('Each person in '+e.sector+' needs '+fmt(porPersona)+' in capital plus first salary.','mal'); return; }
  pedirMonto({titulo:'Hire at '+e.nombre, min:1, max:Math.min(maxN,5000), valor:Math.min(maxN,5),
    etiqueta:'How many people?', okTxt:'Hire',
    preview:function(n){
      var p = previewContratar(S,e,n), c = calcular(e,S.economia);
      return 'Cost today: capital '+fmt(p.capital)+' + first salary '+fmt(p.sueldo)+' = <b>'+fmt(p.costo)+'</b><br>'+
        'In 3 months: revenue +'+fmt(p.ingresoExtra)+'/mo, payroll +'+fmt(p.gastoExtra)+'/mo<br>'+
        'EBITDA '+fmt(c.EBITDA)+' → <b>'+fmt(c.EBITDA+p.ebitdaExtra)+'</b>/mo · pays for itself in '+Math.round(p.costo/Math.max(1,p.ebitdaExtra))+' months';
    },
    onOk:function(n){ hecho(contratar(S,e,n)); }});
}
function accDespedir(e){
  if(!e) return;
  var sec = SEC(e.sector);
  pedirMonto({titulo:'Lay off at '+e.nombre, min:1, max:Math.floor(e.empleados), valor:Math.max(1,Math.floor(e.empleados*0.1)),
    etiqueta:'How many people?', okTxt:'Lay off',
    preview:function(n){
      var frac = n/Math.max(1,e.empleados), c = calcular(e,S.economia);
      var ing2 = c.ingresos*(1-frac), gf2 = Math.max(0,c.gastosFijos-n*sec.salario);
      var rep = Math.max(1,Math.round(frac/0.05)) + (frac>0.30?10:0);
      return 'Severance: <b>'+fmt(n*sec.salario*2)+'</b><br>'+
        'Revenue '+fmt(c.ingresos)+' → '+fmt(ing2)+'/mo · payroll '+fmt(c.gastosFijos)+' → '+fmt(gf2)+'/mo<br>'+
        'EBITDA '+fmt(c.EBITDA)+' → <b>'+fmt(ing2*e.margenBruto-gf2)+'</b>/mo · reputation -'+rep+(frac>0.30?' (mass layoff)':'');
    },
    onOk:function(n){ hecho(despedir(S,e,n)); }});
}
function accSucursal(e){
  if(!e) return;
  var costo = e.ingresos*4, c = calcular(e,S.economia);
  var prom = e.ingresos/Math.max(1,e.sucursales), promG = e.gastosFijos/Math.max(1,e.sucursales);
  modal({titulo:'Open a branch of '+e.nombre,
    html:'<div class="prev">Cost: <b>'+fmt(costo)+'</b> (paid from cash on hand and from your cash)<br>'+
      'Revenue '+fmt(e.ingresos)+' → '+fmt(e.ingresos+prom*0.6)+'/mo<br>'+
      'Fixed costs '+fmt(e.gastosFijos)+' → '+fmt(e.gastosFijos+promG*0.5)+'/mo<br>'+
      'EBITDA '+fmt(c.EBITDA)+' → '+fmt((e.ingresos+prom*0.6)*e.margenBruto-(e.gastosFijos+promG*0.5))+'/mo<br>'+
      'Branches: '+e.sucursales+' → '+(e.sucursales+1)+' (max '+maxSucursales(S)+')</div>',
    botones:[{t:'Cancel'},{t:'Open', cls:'btn-pri', cb:function(){ hecho(abrirSucursal(S,e)); }}]});
}
function accCEO(e){
  if(!e) return;
  var c = costoCEO(S,e);
  modal({titulo:'Appoint CEO at '+e.nombre,
    html:'<div class="prev">Cost: <b>'+fmt(c)+'/yr</b> ('+fmt(c/12)+'/mo in fixed costs)<br>'+
      'The company stops losing growth when you have a job, copes better with your illness, and your legacy lasts longer.</div>',
    botones:[{t:'Cancel'},{t:'Appoint', cls:'btn-pri', cb:function(){ hecho(nombrarCEO(S,e)); }}]});
}
function accDividendos(e){
  if(!e) return;
  modal({titulo:'Dividend policy for '+e.nombre,
    html:'<div class="opciones">'+
      ['distribuir','reinvertir','acumular'].map(function(p){
        var d = {distribuir:'Excess cash goes into your pocket.', reinvertir:'Excess is automatically reinvested in the company.', acumular:'Cash stays as a cushion.'}[p];
        return '<button class="opcion" data-dp="'+p+'"><b>'+({distribuir:'Distribute',reinvertir:'Reinvest',acumular:'Accumulate'}[p]||p)+'</b><br><span class="dim">'+d+'</span></button>';
      }).join('')+'</div>',
    botones:[{t:'Cancel'}],
    alMontar:function(bd, cerrarF){
      bd.addEventListener('click', function(ev){
        var t = ev.target.closest ? ev.target.closest('[data-dp]') : null;
        if(!t) return;
        cerrarF(); hecho(cambiarDividendos(S,e,t.getAttribute('data-dp')));
      });
    }});
}
function accPrestamoPersonal(){
  var cap = Math.floor(capacidadPrestamoPersonal(S));
  var tasa = clamp(S.economia.tasaInteres+0.03+spreadRep(S),0.01,0.6);
  pedirMonto({titulo:'Personal loan', sub:'Rate '+pct(tasa)+' (global rate '+pct(S.economia.tasaInteres)+' + 3% + reputation spread)',
    min:1000, max:cap, valor:Math.floor(cap*0.5), etiqueta:'Amount', okTxt:'Take loan',
    sinEspacio:'Your repayment capacity does not allow more personal debt right now.',
    extraHtml:'<div class="row" style="gap:6px;margin:8px 0"><label>Term<select id="mPlazo"><option value="12">12 months</option><option value="36" selected>36 months</option><option value="60">60 months</option></select></label></div>',
    preview:function(v){
      var n = +(document.getElementById('mPlazo')||{value:36}).value;
      var cu = cuotaAnualidad(v, tasa, n);
      return 'Payment: <b>'+fmt(cu)+'/mo</b> for '+n+' months<br>Total interest: <b>'+fmt(cu*n-v)+'</b><br>You will repay '+fmt(cu*n)+' for '+fmt(v)+' received.';
    },
    onOk:function(v){
      var n = +(document.getElementById('mPlazo')||{value:36}).value;
      hecho(prestamoPersonal(S, v, n));
    }});
}
function accPrestamoCorp(e){
  if(!e) return;
  var lim = Math.floor(limitePrestamoCorporativo(S,e));
  var c = calcular(e,S.economia);
  pedirMonto({titulo:'Corporate debt for '+e.nombre,
    sub:'Annual EBITDA '+fmt(c.EBITDAanual)+' · current debt '+fmt(c.deudaTotal)+' · leverage '+c.apalancamiento.toFixed(1)+'x',
    min:1000, max:lim, valor:Math.floor(lim*0.5), etiqueta:'Amount', okTxt:'Take debt',
    sinEspacio:'The bank will not lend more against the EBITDA of this company.',
    preview:function(v){
      var apal = (c.deudaTotal+v)/Math.max(1,c.EBITDAanual);
      var tasa = clamp(S.economia.tasaInteres+0.02+spreadRep(S)+Math.max(0,apal-2)*0.0075-(S.flags.holding?0.005:0),0.01,0.6);
      return 'Rate: <b>'+pct(tasa)+'</b> · interest +'+fmt(v*tasa/12)+'/mo<br>'+
        'Leverage '+c.apalancamiento.toFixed(1)+'x → <b'+(apal>4?' class="neg"':'')+'>'+apal.toFixed(1)+'x</b>'+(apal>4?' — covenant zone':'')+'<br>'+
        'Monthly EBITDA '+fmt(c.EBITDA)+' vs interest '+fmt(c.intereses+v*tasa/12);
    },
    onOk:function(v){ hecho(prestamoCorporativo(S,e,v)); }});
}
function accPagarDeuda(e){
  if(!e) return;
  var max = Math.floor(Math.min(e.deuda, Math.max(0,e.caja)+Math.max(0,S.jugador.efectivo)));
  pedirMonto({titulo:'Repay debt of '+e.nombre, min:1, max:max, valor:max, etiqueta:'Amount to repay', okTxt:'Repay',
    sinEspacio:'There is no debt or you have nothing to repay it with.',
    preview:function(v){
      var tasa = e.tasaDeuda;
      return 'Debt '+fmt(e.deuda)+' → '+fmt(e.deuda-v)+'<br>You save '+fmt(v*tasa/12)+'/mo in interest'+(v>=e.deuda?'<br><b class="pos">Full payoff: reputation +1</b>':'');
    },
    onOk:function(v){ hecho(pagarDeudaEmpresa(S,e,v)); }});
}
function accPagarPersonal(id){
  var p=null,i;
  for(i=0;i<S.prestamos.length;i++) if(S.prestamos[i].id===id) p=S.prestamos[i];
  if(!p) return;
  var max = Math.floor(Math.min(p.saldo, Math.max(0,S.jugador.efectivo)));
  pedirMonto({titulo:'Pay down the loan', min:1, max:max, valor:max, etiqueta:'Amount', okTxt:'Pay down',
    sinEspacio:'You have no cash to pay down the loan.',
    preview:function(v){ return 'Balance '+fmt(p.saldo)+' → '+fmt(p.saldo-v)+(v>=p.saldo?'<br><b class="pos">You pay it off: reputation +1</b>':''); },
    onOk:function(v){ hecho(pagarPrestamoPersonal(S,id,v)); }});
}
function accInyectar(e){
  if(!e) return;
  pedirMonto({titulo:'Inject capital into '+e.nombre, sub:'Current cash on hand: '+fmt(e.caja),
    min:1, max:Math.floor(Math.max(0,S.jugador.efectivo)), valor:Math.floor(Math.max(0,-e.caja)+1), etiqueta:'Amount', okTxt:'Inject',
    sinEspacio:'You have no cash.',
    preview:function(v){ return 'Cash on hand '+fmt(e.caja)+' → <b>'+fmt(e.caja+v)+'</b><br>Cash '+fmt(S.jugador.efectivo)+' → '+fmt(S.jugador.efectivo-v); },
    onOk:function(v){ hecho(inyectarCapital(S,e,v)); }});
}
function accVender(e){
  if(!e) return;
  pedirMonto({titulo:'Sell '+e.nombre, min:5, max:100, valor:100, etiqueta:'What percentage of your stake do you sell? (%)', okTxt:'Sell',
    preview:function(v){
      var p = v/100, bruto = precioVenta(S,e,p);
      var imp = Math.max(0, bruto - num(e.costoBase,0)*p)*S.economia.impuestoGanancias;
      var c = calcular(e,S.economia);
      return 'You receive gross <b>'+fmt(bruto)+'</b> − taxes '+fmt(imp)+' = <b>'+fmt(bruto-imp)+'</b> net<br>'+
        'You lose '+fmt(c.EBITDA*p*e.propiedad)+'/mo of EBITDA and '+miles(e.empleados*p)+' employees from your influence'+
        (v>=100?'':'<br>You keep '+pct(e.propiedad*(1-p),1)+' of the company');
    },
    onOk:function(v){ hecho(venderEmpresa(S,e,v/100)); }});
}

/* --- mercado --- */
function accComprar(o){
  if(!o) return;
  var e = o.empresa, c = calcular(e, S.economia);
  var precio = num(o.precioAcordado, o.precioPedido);
  pedirMonto({titulo:'Buy '+e.nombre,
    sub:'Price for 100%: '+fmt(precio)+' · multiple '+o.multImplicito.toFixed(1)+'x EBITDA',
    min:10, max:100, valor:100, etiqueta:'What percentage do you buy? (%)', okTxt:'Next',
    preview:function(v){
      var p = precio*v/100;
      return 'You pay <b>'+fmt(p)+'</b> for '+v+'%<br>'+
        'You inherit '+fmt(c.deudaTotal*v/100)+' of debt · you receive '+fmt(c.EBITDA*v/100)+'/mo of EBITDA<br>'+
        'Your cash: '+fmt(S.jugador.efectivo)+' → '+fmt(S.jugador.efectivo-p)+
        (!o.ddHecha ? '<br><span class="avi">You have not done due diligence on this company.</span>' : '<br><span class="pos">Due diligence done.</span>');
    },
    onOk:function(v){
      var pctC = v/100, p = precio*pctC, lboMax = Math.floor(maxLBO(S,o,p));
      if(lboMax<=0){ hecho(comprarOferta(S,o,pctC,0)); return; }
      pedirMonto({titulo:'Finance with debt on the company itself? (LBO)',
        sub:'The acquired company takes on the debt; you put in less cash but it pays the interest.',
        min:0, max:lboMax, valor:0, etiqueta:'Debt on the acquired company', okTxt:'Buy',
        preview:function(d){
          var apal = (c.deudaTotal+d)/Math.max(1,c.EBITDAanual);
          return 'You put in from your pocket: <b>'+fmt(p-d)+'</b><br>'+
            'Resulting leverage: <b'+(apal>4?' class="neg"':'')+'>'+apal.toFixed(1)+'x</b><br>'+
            'Interest ≈ '+fmt((c.deudaTotal+d)*(S.economia.tasaInteres+0.025)/12)+'/mo against EBITDA of '+fmt(c.EBITDA)+'/mo';
        },
        onOk:function(d){ hecho(comprarOferta(S,o,pctC,d)); }});
    }});
}
function accNegociar(o){
  if(!o) return;
  pedirMonto({titulo:'Negotiate '+o.empresa.nombre, sub:'They are asking '+fmt(o.precioPedido),
    min:Math.floor(o.precioPedido*0.4), max:Math.floor(o.precioPedido*1.2), valor:Math.floor(o.precioPedido*0.85),
    etiqueta:'Your offer', okTxt:'Offer',
    preview:function(v){
      var p = probAceptar(S,o,v);
      return 'Chance they accept: <b>'+pct(p,0)+'</b><br>If they refuse, the price rises 5% and you only have one more attempt.';
    },
    onOk:function(v){ hecho(negociar(S,o,v)); }});
}
function accStartup(id){
  var of=null,i;
  for(i=0;i<S.mercado.startups.length;i++) if(S.mercado.startups[i].id===id) of=S.mercado.startups[i];
  if(!of) return;
  pedirMonto({titulo:'Invest in '+of.nombre, sub:'Valuation '+fmt(of.valoracion)+' · horizon '+Math.round(of.meses/12)+' years',
    min:50000, max:Math.min(5000000, Math.floor(S.jugador.efectivo)), valor:Math.floor(of.ticket), etiqueta:'Ticket', okTxt:'Invest',
    sinEspacio:'You need at least $50,000 to join a round.',
    preview:function(v){
      var prop = v/Math.max(1,of.valoracion);
      return 'You get <b>'+pct(prop,2)+'</b> of the startup<br>'+
        'Success scenario (20%): '+fmt(of.valoracion*15*prop)+' · mediocre (30%): '+fmt(of.valoracion*1.2*prop)+' · failure (50%): $0<br>'+
        'Expected value ≈ '+fmt(of.valoracion*prop*(0.2*15+0.3*1.2));
    },
    onOk:function(v){ hecho(invertirStartup(S,of,v)); }});
}
function accEdificio(id){
  var of=null,i;
  for(i=0;i<S.mercado.edificios.length;i++) if(S.mercado.edificios[i].id===id) of=S.mercado.edificios[i];
  if(!of) return;
  pedirMonto({titulo:'Buy '+of.nombre, sub:'Price '+fmt(of.precio),
    min:0, max:70, valor:0, etiqueta:'What % do you finance with a mortgage?', okTxt:'Buy',
    preview:function(v){
      var hip = of.precio*v/100, ef = of.precio-hip;
      var tasa = S.economia.tasaInteres+0.015;
      return 'You put in '+fmt(ef)+' in cash'+(hip>0?' and owe '+fmt(hip)+' at '+pct(tasa):'')+'<br>'+
        'Rent '+fmt(of.precio*0.06/12)+'/mo − expenses '+fmt(of.precio*0.015/12)+' − interest '+fmt(hip*tasa/12)+' = <b>'+fmt(of.precio*0.045/12-hip*tasa/12)+'</b>/mo';
    },
    onOk:function(v){ hecho(comprarEdificio(S,of,v/100)); }});
}

/* --- etapa 3/4 --- */
function accBonos(e){
  if(!e) return;
  var lim = Math.floor(limiteBonos(S,e)), c = calcular(e,S.economia);
  if(c.EBITDAanual < 5000000){ toast('Requires annual EBITDA ≥ $5M. Now: '+fmt(c.EBITDAanual),'mal'); return; }
  pedirMonto({titulo:'Issue bonds for '+e.nombre, min:100000, max:lim, valor:Math.floor(lim*0.5), etiqueta:'Amount', okTxt:'Next',
    sinEspacio:'There is no room to issue with the current EBITDA.',
    preview:function(v){
      var apal=(c.deudaTotal+v)/Math.max(1,c.EBITDAanual);
      var tasa = clamp(S.economia.tasaInteres+0.01+spreadRep(S)+Math.max(0,apal-2)*0.00375,0.01,0.5);
      return 'Rate '+pct(tasa)+' · interest '+fmt(v*tasa/12)+'/mo<br>Leverage → '+apal.toFixed(1)+'x<br>The principal of '+fmt(v)+' is due in full at the end.';
    },
    onOk:function(v){
      modal({titulo:'Bond term', html:'<p>At maturity you will have to repay '+fmt(v)+' or refinance at whatever rate applies that day.</p>',
        botones:[{t:'5 years', cls:'btn-pri', cb:function(){ hecho(emitirBonos(S,e,v,5)); }},
                 {t:'10 years', cb:function(){ hecho(emitirBonos(S,e,v,10)); }}]});
    }});
}
function accAmpliacion(e){
  if(!e) return;
  var c = calcular(e,S.economia), val = Math.max(1,c.valoracion-c.deudaTotal);
  pedirMonto({titulo:'Equity raise at '+e.nombre, sub:'Current valuation: '+fmt(val),
    min:1000, max:Math.floor(val*5), valor:Math.floor(val*0.25), etiqueta:'Money coming in', okTxt:'Raise',
    preview:function(v){
      var nueva = e.propiedad*val/(val+v);
      return 'Post-money valuation: '+fmt(val+v)+'<br>Your ownership '+pct(e.propiedad,1)+' → <b'+(nueva<=0.5?' class="neg"':'')+'>'+pct(nueva,1)+'</b>'+
        (nueva<=0.5?'<br><b class="neg">You lose control: your influence factor for this company drops by half and you will not be able to merge it.</b>':'')+
        '<br>'+fmt(v)+' goes into the cash on hand of the company.';
    },
    onOk:function(v){ hecho(ampliacionCapital(S,e,v)); }});
}
function accPreferentes(e){
  if(!e) return;
  var c = calcular(e,S.economia);
  pedirMonto({titulo:'Issue preferred stock for '+e.nombre, min:10000, max:Math.max(10000,Math.floor(c.EBITDAanual*8)), valor:Math.floor(Math.max(10000,c.EBITDAanual*2)),
    etiqueta:'Amount', okTxt:'Issue',
    preview:function(v){
      var div = v*0.08;
      return 'You receive '+fmt(v)+' in cash on hand without diluting your ownership<br>You pay <b>'+fmt(div)+'/yr</b> ('+fmt(div/12)+'/mo) in priority fixed dividends<br>'+
        'Your annual EBITDA is '+fmt(c.EBITDAanual)+(div>c.EBITDAanual*0.5?'<br><b class="neg">The dividend eats more than half of your EBITDA.</b>':'');
    },
    onOk:function(v){ hecho(emitirPreferentes(S,e,v)); }});
}
function accFusionar(){
  elegirEmpresa('First company to merge', function(x){ return !x.esEmpleo && x.propiedad>0.5; }, function(a){
    elegirEmpresa('Merge '+a.nombre+' with...', function(x){ return !x.esEmpleo && x.propiedad>0.5 && x.id!==a.id && x.sector===a.sector; }, function(b){
      var ca = calcular(a,S.economia), cb = calcular(b,S.economia);
      var costo = (ca.ingresosAnuales+cb.ingresosAnuales)*0.10;
      modal({titulo:'Merge '+a.nombre+' + '+b.nombre,
        html:'<div class="prev">Integration cost: <b>'+fmt(costo)+'</b><br>'+
          'Combined revenue: '+fmt(ca.ingresos+cb.ingresos)+'/mo (−5% for 12 months due to disruption)<br>'+
          'Combined fixed costs: '+fmt(ca.gastosFijos+cb.gastosFijos)+'/mo</div>'+
          '<div class="prev">No layoffs: costs ×0.92 → '+fmt((ca.gastosFijos+cb.gastosFijos)*0.92)+'/mo<br>'+
          'With layoffs: costs ×0.82 → '+fmt((ca.gastosFijos+cb.gastosFijos)*0.82)+'/mo, −12% headcount and reputation −4</div>',
        botones:[{t:'Cancel'},
          {t:'No layoffs', cls:'btn-pri', cb:function(){ hecho(fusionar(S,a,b,false)); }},
          {t:'With layoffs', cb:function(){ hecho(fusionar(S,a,b,true)); }}]});
    }, 'Must be in the same sector and under your control.');
  });
}
function accHostil(){
  var l = [], i, j;
  for(i=0;i<S.rivales.length && l.length<14;i++){
    for(j=0;j<S.rivales[i].empresas.length;j++){
      if(S.rivales[i].pactoHasta>S.jugador.mes) continue;
      if(S.flags.alianzaHasta>S.jugador.mes && i<5) continue;
      l.push({r:S.rivales[i], j:j, e:S.rivales[i].empresas[j]});
    }
  }
  if(!l.length){ toast('No targets available.','mal'); return; }
  l.sort(function(a,b){ return a.e.valoracion-b.e.valoracion; });
  l = l.slice(0,12);
  modal({titulo:'Hostile takeover', sub:'You pay a 30% premium. Reputation −8 and the rival will hate you for 24 months.', ancho:true,
    html:'<div class="opciones">'+l.map(function(x,k){
      return '<button class="opcion" data-ho="'+k+'"><b>'+esc(x.e.nombre)+'</b> <span class="dim">'+esc(x.e.sector)+' · from '+esc(x.r.nombre)+'</span><br>'+
        '<span class="dim" style="font-size:11.5px">Revenue '+fmt(x.e.ingresosAnuales)+'/yr · price '+fmt(x.e.valoracion*1.3)+'</span></button>';
    }).join('')+'</div>', botones:[{t:'Cancel'}],
    alMontar:function(bd, cerrarF){
      bd.addEventListener('click', function(ev){
        var t = ev.target.closest ? ev.target.closest('[data-ho]') : null;
        if(!t) return;
        var x = l[+t.getAttribute('data-ho')];
        cerrarF(); hecho(adquisicionHostil(S, x.r, x.j));
      });
    }});
}
function accFilantropia(){
  var pat = Math.max(1, patrimonio(S));
  pedirMonto({titulo:'Philanthropy', sub:'Minimum 1% of your net worth: '+fmt(pat*0.01),
    min:Math.ceil(pat*0.01), max:Math.floor(Math.max(0,S.jugador.efectivo)), valor:Math.ceil(pat*0.01), etiqueta:'Donation', okTxt:'Donate',
    sinEspacio:'You do not have enough cash for a meaningful donation.',
    preview:function(v){
      return 'Reputation +'+Math.min(10, v/pat*200).toFixed(1)+' (now '+Math.round(S.jugador.reputacion)+')<br>'+
        'Political influence +'+(v/2e7).toFixed(1)+' IP · political risk −5';
    },
    onOk:function(v){ hecho(filantropia(S,v)); }});
}
function accLobbying(){
  pedirMonto({titulo:'Lobbying', sub:'Minimum $10M. Once every 6 months.',
    min:10000000, max:Math.floor(Math.max(0,S.jugador.efectivo)), valor:10000000, etiqueta:'Budget', okTxt:'Spend',
    sinEspacio:'You need at least $10M in cash.',
    preview:function(v){
      return 'Political influence +'+(v/5e6*(tieneMedios(S)?1.5:1)).toFixed(0)+' IP'+(tieneMedios(S)?' (×1.5 from your media holdings)':'')+'<br>'+
        'Political risk +'+(v/1e8*10).toFixed(1)+' (now '+Math.round(S.jugador.riesgoPolitico)+'/100)';
    },
    onOk:function(v){ hecho(lobbying(S,v)); }});
}
function accPacto(rid){
  var l = S.rivales.slice(0,20), i;
  if(rid){
    var r = rivalPorId(S,rid);
    if(!r) return;
    pedirMonto({titulo:'Deal with '+r.nombre, sub:'Chance of acceptance: '+pct(clamp(0.5+(S.jugador.reputacion-50)/100,0.05,0.95),0),
      min:1000, max:Math.floor(Math.max(1000,S.jugador.efectivo)), valor:Math.floor(Math.max(1000,S.jugador.efectivo*0.05)),
      etiqueta:'Offer', okTxt:'Propose',
      preview:function(v){ return 'If accepted: they will not compete with you for 36 months and your political risk drops by 10.<br>If they refuse, you lose the money you offered.'; },
      onOk:function(v){ hecho(pactoRival(S,r,v)); }});
    return;
  }
  modal({titulo:'Deal with a rival', html:'<div class="opciones">'+l.map(function(r){
      return '<button class="opcion" data-pa="'+r.id+'"><b>'+esc(r.nombre)+'</b> <span class="dim">'+esc(r.sector)+' · '+miles(r.influencia)+' IP</span></button>';
    }).join('')+'</div>', botones:[{t:'Cancel'}],
    alMontar:function(bd, cerrarF){
      bd.addEventListener('click', function(ev){
        var t = ev.target.closest ? ev.target.closest('[data-pa]') : null;
        if(!t) return;
        cerrarF(); accPacto(+t.getAttribute('data-pa'));
      });
    }});
}
function modalPoder(){
  var h = '', i, p;
  for(i=0;i<LISTA_SECTORES.length;i++){
    p = participacionSector(S, LISTA_SECTORES[i]);
    if(p<=0) continue;
    h += kv(LISTA_SECTORES[i], pct(p,2)+' → '+(p>=0.25?'bonus ×1.5':p>=0.10?'bonus ×1.25':'no bonus')+(p>0.25?' <span class="neg">· antitrust risk</span>':''));
  }
  modal({titulo:'Market power', html:'<div class="fin">'+(h||'<div class="dim">You do not have a measurable presence in any sector yet.</div>')+'</div>'+
    '<div class="nota">With ≥10% of a sector, your economic influence from that sector is multiplied by 1.25; with ≥25%, by 1.5. But above 25% the regulator steps in.</div>',
    botones:[{t:'Close'}]});
}

/* ---------------- FIN DE PARTIDA ---------------- */
function pantallaFinal(){
  if(!S.fin) S.fin = S.jugador.mes>=624 ? 'vejez' : 'quiebra';
  var leg = calcularLegado(S), pos = posNumerica(S);
  var titulo = S.fin==='victoria' ? 'Victory: the most influential human' : S.fin==='quiebra' ? 'Personal bankruptcy' : 'End of life';
  var sectores = {}, i, n=0, k;
  for(i=0;i<S.empresas.length;i++) if(esControlada(S.empresas[i])) sectores[S.empresas[i].sector]=1;
  var dom = [];
  for(i=0;i<LISTA_SECTORES.length;i++) if(participacionSector(S,LISTA_SECTORES[i])>=0.10) dom.push(LISTA_SECTORES[i]);
  for(k in sectores) if(sectores.hasOwnProperty(k)) n++;
  var claves = S.log.filter(function(l){ return l.tipo==='empresa'||l.tipo==='evento'; }).slice(-5);
  var html = '<div class="fin">'+
    goalResultadoHTML()+
    kv('Final position', posicionTexto(S))+
    kv('Best position', S.flags.mejorPosicion>=9999?'unranked':'#'+S.flags.mejorPosicion)+
    kv('Months at #1', String(S.flags.mesesEnTop1))+
    kv('Peak influence', pi(S.flags.maxInfluencia))+
    kv('Peak net worth', fmt(S.flags.maxPatrimonio))+
    kv('Companies controlled', String(S.empresas.length))+
    kv('Employees', miles(empleadosTotales(S)))+
    kv('Sectors with ≥10%', dom.length?dom.join(', '):'none')+
    kv('Knowledge', terminosAprendidosCount(S)+'/'+TERMINOS.length+' terms')+
    '</div>'+
    '<h4>Influence over your lifetime</h4><canvas id="cvFin" width="600" height="170"></canvas>'+
    '<h4>Key decisions</h4><div>'+claves.map(function(l){ return '<div class="log '+l.tipo+'"><span class="m">m'+l.mes+'</span>'+esc(l.texto)+'</div>'; }).join('')+'</div>'+
    '<div class="nota"><b>'+esc(fraseLegado(S))+'</b></div>'+
    '<div class="prev"><b>Legacy: '+esc(leg.titulo)+'</b><br>Your empire stays among the 40 most influential for <b>'+leg.anios+' year(s)</b> after your death '+
      '(it loses '+pct(leg.tasa,0)+' of influence per year'+(S.flags.holding?', cushioned by your holding company':', with no holding company to sustain it')+').</div>';
  modal({titulo:titulo, html:html, ancho:true, cerrable:false,
    botones:[
      {t:'Play again', cls:'btn-pri', cb:function(){ borrarSave(); location.reload(); }},
      {t:'Replay with the same seed', cb:function(){ var s=S.seed, nm=S.jugador.nombre, d=S.dificultad; borrarSave();
        try{ localStorage.setItem('tc_repetir', JSON.stringify({seed:s,nombre:nm,dificultad:d})); }catch(e){}
        location.reload(); }},
      {t:'Export game', cerrar:false, cb:function(){ modalExportar(); }}
    ],
    alMontar:function(){ if(S.fin==='victoria') confetti(160); setTimeout(function(){ dibujar($('cvFin'), S.influencia.historial.map(function(x){return x.v;}), '#d4a53a'); },30); }});
}

/* ---------------- DEPURACION ---------------- */
function panelDebug(){
  if(!DEV_MODE) return;
  var ids = EVENTOS.map(function(e){ return '<option value="'+e.id+'">'+e.id+'</option>'; }).join('');
  modal({titulo:'Debug', sub:'Seed '+S.seed+' · month '+S.jugador.mes, ancho:true,
    html:'<div class="row" style="gap:6px;flex-wrap:wrap">'+
      '<button class="btn btn-peq" data-db="m">+$1M</button>'+
      '<button class="btn btn-peq" data-db="b">+$1B</button>'+
      '<button class="btn btn-peq" data-db="y">+12 months</button>'+
      '<button class="btn btn-peq" data-db="r+">Reputation +10</button>'+
      '<button class="btn btn-peq" data-db="r-">Reputation −10</button>'+
      '<button class="btn btn-peq" data-db="et">Raise stage</button>'+
      '<button class="btn btn-peq" data-db="sim">simular(20)</button>'+
      '</div><label style="margin-top:10px">Force event<select id="dbEv">'+ids+'</select></label>'+
      '<button class="btn btn-peq" data-db="ev" style="margin-top:6px">Trigger event</button>'+
      '<div class="prev" id="dbOut">Browser console: simular(20), simularPartida(seed)</div>',
    botones:[{t:'Close'}],
    alMontar:function(bd, cerrarF){
      bd.addEventListener('click', function(ev){
        var d = ev.target.getAttribute && ev.target.getAttribute('data-db');
        if(!d) return;
        var out = bd.querySelector('#dbOut');
        if(d==='m') S.jugador.efectivo += 1e6;
        else if(d==='b') S.jugador.efectivo += 1e9;
        else if(d==='y'){ cerrarF(); avanzarAno(); return; }
        else if(d==='r+') S.jugador.reputacion = clamp(S.jugador.reputacion+10,0,100);
        else if(d==='r-') S.jugador.reputacion = clamp(S.jugador.reputacion-10,0,100);
        else if(d==='et'){ S.jugador.etapa = Math.min(4, S.jugador.etapa+1); }
        else if(d==='ev'){
          var id = bd.querySelector('#dbEv').value;
          var ref = generarEvento(S, id);
          if(ref){ S.eventoActual = ref; cerrarF(); mostrarEvento(siguientePendiente); return; }
          out.textContent = 'That event does not meet its conditions right now.';
          return;
        } else if(d==='sim'){
          out.textContent = 'Simulating 20 games...';
          setTimeout(function(){
            var r = simular(20);
            out.innerHTML = r.tabla.map(function(t){
              return 'Year '+t.ano+': median '+fmt(t.patMed)+' (p25 '+fmt(t.patP25)+' / p75 '+fmt(t.patP75)+') · position '+t.posMed;
            }).join('<br>')+'<br><b>Victories '+pct(r.pctVictoria,0)+' · bankruptcies '+pct(r.pctQuiebra,0)+'</b>';
          }, 20);
          return;
        }
        hecho(null);
        out.textContent = 'Done. Cash '+fmt(S.jugador.efectivo)+' · reputation '+Math.round(S.jugador.reputacion)+' · stage '+S.jugador.etapa;
      });
    }});
}

/* ---------------- EXPORTAR / IMPORTAR ---------------- */
function puedeDescargar(){
  try{ return location.protocol === 'file:' || window.top === window.self; }catch(e){ return false; }
}
function modalExportar(){
  var txt = '';
  try{ txt = JSON.stringify(S); }catch(e){ txt = ''; }
  var bts = [{t:'Close'}];
  if(puedeDescargar()) bts.push({t:'Download file', cerrar:false, cb:function(){ exportarPartida(S); }});
  modal({titulo:'Export game', sub:'Copy this text and save it wherever you like. To come back, paste it into Import.',
    html:'<textarea id="expTxt" readonly rows="7" style="width:100%;background:#10131a;color:#9aa3b2;border:1px solid var(--borde);border-radius:6px;padding:8px;font-size:11px;font-family:ui-monospace,monospace"></textarea>',
    botones: bts.concat([
      {t:'Copy', cls:'btn-pri', cerrar:false, cb:function(bd){
        var ta = bd.querySelector('#expTxt');
        ta.focus(); ta.select();
        var ok = false;
        try{ ok = document.execCommand('copy'); }catch(e){}
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(ta.value).then(function(){ toast('Game copied to clipboard','ok'); },
            function(){ if(!ok) toast('Select the text and copy with Ctrl+C','mal'); });
        } else toast(ok?'Game copied to clipboard':'Select the text and copy with Ctrl+C', ok?'ok':'mal');
      }}]),
    alMontar:function(bd){ bd.querySelector('#expTxt').value = txt; }});
}
function modalImportar(){
  modal({titulo:'Import game', sub:'Paste the text you exported here, or load a .json file.',
    html:'<textarea id="impTxt" rows="7" placeholder=\'{"version":1,...}\' style="width:100%;background:#10131a;color:var(--txt);border:1px solid var(--borde);border-radius:6px;padding:8px;font-size:11px;font-family:ui-monospace,monospace"></textarea>'+
      '<div class="nota">The current game will be replaced.</div>',
    botones:[{t:'Cancel'},
      {t:'Load file', cerrar:false, cb:function(){ $('fileImport').click(); }},
      {t:'Import', cls:'btn-pri', cerrar:false, cb:function(bd){
        var v = bd.querySelector('#impTxt').value;
        if(aplicarImportado(v) && bd.__cerrar) bd.__cerrar();
      }}]});
}
function aplicarImportado(texto){
  try{
    var obj = JSON.parse(texto);
    if(!obj || obj.version!==1 || !obj.jugador) throw new Error('formato');
    var est = sanear(obj);
    guardar(est);
    colaUI = [];
    iniciarUI(est);
    toast('Game imported: month '+est.jugador.mes,'ok');
    return true;
  }catch(e){ toast('That text is not a valid game save.','mal'); return false; }
}

/* ---------------- WIRING ---------------- */
function iniciarUI(estado){
  S = estado;
  uiState();
  $('inicio').classList.add('oculto');
  $('juego').classList.remove('oculto');
  calcularInfluencia(S); construirRanking(S);
  checkHitos(S, false);
  if(!S.ui.histPat.length) registrarHistorialUI();
  render();
  if(S.eventoActual) mostrarEvento(siguientePendiente);
}
function wire(){
  document.addEventListener('click', function(ev){
    var t = ev.target;
    if(!t || !t.closest) return;
    var tab = t.closest('[data-tab]');
    if(tab && tab.classList.contains('tab')){ TAB = tab.getAttribute('data-tab'); render(); return; }
    var a = t.closest('[data-ac]');
    if(!a || a.disabled) return;
    var ac = a.getAttribute('data-ac'), id = a.getAttribute('data-id');
    var term = a.getAttribute('data-term');
    id = id===null ? null : (isNaN(+id)?id:+id);
    var run = function(){ ejecutar(ac, id); };
    if(term && S && pedirTermino(S, term)) conTermino(term, run);
    else run();
  });
  $('btnMes').addEventListener('click', cerrarMesUI);
  $('btnAno').addEventListener('click', avanzarAno);
  $('tbGoal').addEventListener('click', function(){ if(S && !modalAbierto) modalGoal(); });
  $('filtroLog').addEventListener('change', function(){ filtroLogV = this.value; renderDerecha(); });
  $('btnMenu').addEventListener('click', function(){
    modal({titulo:'Menu', html:'<div class="opciones">'+
      '<button class="opcion" data-mn="goal">Change goal</button>'+
      '<button class="opcion" data-mn="guardar">Save now</button>'+
      '<button class="opcion" data-mn="exportar">Export game (JSON)</button>'+
      '<button class="opcion" data-mn="importar">Import game</button>'+
      (DEV_MODE?'<button class="opcion" data-mn="debug">Debug panel (Ctrl+Shift+D)</button>':'')+
      '<button class="opcion" data-mn="nueva">New game</button></div>',
      botones:[{t:'Close'}],
      alMontar:function(bd, cerrarF){
        bd.addEventListener('click', function(ev){
          var t2 = ev.target.closest ? ev.target.closest('[data-mn]') : null;
          if(!t2) return;
          var m = t2.getAttribute('data-mn');
          cerrarF();
          if(m==='goal'){ modalGoal(); }
          else if(m==='guardar'){ guardar(S); toast('Game saved','ok'); }
          else if(m==='exportar') modalExportar();
          else if(m==='importar') modalImportar();
          else if(m==='debug'){ if(DEV_MODE) panelDebug(); }
          else if(m==='nueva'){ if(confirm('Start over? The saved game will be deleted.')){ borrarSave(); location.reload(); } }
        });
      }});
  });
  document.addEventListener('keydown', function(ev){
    if(ev.key==='Escape'){ cerrarUltimoModal(); return; }
    var tag = (ev.target && ev.target.tagName)||'';
    if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA') return;
    if(modalAbierto) return;
    if((ev.key===' '||ev.key==='Enter') && S && !S.fin){ ev.preventDefault(); cerrarMesUI(); }
    if(DEV_MODE && ev.ctrlKey && ev.shiftKey && (ev.key==='D'||ev.key==='d')){ ev.preventDefault(); if(S) panelDebug(); }
  });
}

/* ---------------- LIFESTYLE ---------------- */
function tabLifestyle(){
  var h = '', i, own = lifestyleState(S), pat = patrimonio(S), ef = S.jugador.efectivo;
  h += '<div class="nota"><b>Wealth is not cash.</b> Net worth '+fmt(pat)+' · cash '+fmt(ef)+' · lifestyle costs '+fmt(lifestyleMensual(S))+'/mo on top of '+fmt(S.jugador.costoDeVida*(tieneHogar(S)?0.6:1))+' of living costs. Everything here is paid in cash, costs money every month, and most of it loses value. Status adds a little political influence.</div>';
  if(own.length){
    h += '<h4>What you own</h4><div class="ls-grid">';
    for(i=0;i<own.length;i++){
      var it = own[i], base = lifestyleItem(it.id)||{};
      h += '<div class="ls">'+ico(base.ic||'home')+'<h4>'+esc(it.nombre)+'</h4><div class="num"><span>Value</span><span class="'+cls(it.valor-it.precio)+'">'+fmt(it.valor)+'</span></div><div class="num"><span>Paid</span><span>'+fmt(it.precio)+'</span></div><div class="num"><span>Monthly</span><span class="neg">-'+fmt(it.mensual)+'</span></div>'+
        '<button class="btn btn-peq" data-ac="lsSell" data-id="'+i+'">Sell (~'+fmt(it.valor*(it.tipo==='car'||it.tipo==='toy'?0.8:0.92))+')</button></div>';
    }
    h += '</div>';
  }
  h += '<h4 style="margin-top:12px">Available</h4><div class="ls-grid">';
  for(i=0;i<LIFESTYLE.length;i++){
    var l = LIFESTYLE[i]; if(!visibleLifestyle(S,l)) continue;
    var tiene = false, k; for(k=0;k<own.length;k++) if(own[k].id===l.id) tiene = true;
    var oc = costoOportunidad(S, l.precio);
    h += '<div class="ls">'+ico(l.ic)+'<h4>'+esc(l.nombre)+'</h4><div class="p">'+esc(l.desc)+'</div>'+
      '<div class="num"><span>Price</span><span>'+fmt(l.precio)+'</span></div>'+(l.mensual?'<div class="num"><span>Upkeep</span><span class="neg">-'+fmt(l.mensual)+'/mo</span></div>':'')+(l.dep?'<div class="num"><span>Value / mo</span><span class="'+(l.dep>0?'pos':'neg')+'">'+(l.dep>0?'+':'')+pct(l.dep,1)+'</span></div>':'')+
      '<div class="oc">Opportunity cost: invested at '+pct(oc.tasa,0)+'/yr this is '+fmt(oc.valor)+' in 10 years.</div>'+
      '<button class="btn btn-peq '+(tiene?'':'btn-pri')+'" data-ac="lsBuy" data-id="'+l.id+'" style="margin-top:8px"'+(tiene||l.precio>ef?' disabled':'')+'>'+(tiene?'Owned':l.precio>ef?'Not enough cash':'Buy')+'</button></div>';
  }
  return h+'</div>';
}
function accLifestyle(id){
  var it = lifestyleItem(id); if(!it) return;
  var oc = costoOportunidad(S, it.precio);
  modal({titulo:'Buy '+it.nombre.toLowerCase()+'?', sub:fmt(it.precio)+' in cash'+(it.mensual?' · '+fmt(it.mensual)+'/mo upkeep':''),
    html:'<div class="prev">Cash '+fmt(S.jugador.efectivo)+' → <b>'+fmt(S.jugador.efectivo-it.precio)+'</b>'+(it.mensual?'<br>Net monthly cash flow '+fmt(ingresoMensualNeto(S))+' → <b>'+fmt(ingresoMensualNeto(S)-it.mensual)+'</b>':'')+
      (it.dep<0?'<br>In 3 years it will be worth about '+fmt(it.precio*Math.pow(1+it.dep,36)):it.dep>0?'<br>In 3 years it should be worth about '+fmt(it.precio*Math.pow(1+it.dep,36)):'')+'</div>'+
      '<div class="teach">The same '+fmt(it.precio)+' compounding at '+pct(oc.tasa,0)+'/yr (your best available return) would be '+fmt(oc.valor)+' in 10 years. That is the price you are really paying.</div>',
    botones:[{t:'Keep the money'},{t:'Buy', cls:'btn-pri', cb:function(){ hecho(comprarLifestyle(S,id)); }}]});
}
