'use strict';
/* Arranque: pantalla de inicio, origenes, continuar, importar */

function pintarOrigenes(){
  var h = '', i;
  var subs = ['agencia','ecommerce','software'];
  for(i=0;i<ORIGENES.length;i++){
    var o = ORIGENES[i], eb = o.ingresos*o.margen - o.gastos;
    if(subs.indexOf(o.id)<0) continue;
    h += '<button class="card'+(o.id==='agencia'?' sel':'')+'" data-or="'+o.id+'">'+
      '<div class="oi">'+ico(ORIGEN_ICON[o.id]||'building')+'</div>'+
      '<h4>'+o.nombre+'</h4>'+
      '<div>'+secChip(o.sector)+'</div>'+
      '<div style="font-size:12px;color:#c3cad6;margin-top:6px">'+o.desc+'</div>'+
      '<div class="two"><span>Starts at <b class="'+(eb>=0?'pos':'neg')+'">'+fmt(eb)+'/mo</b></span><span>Costs <b>'+fmt(o.inv)+'</b> to start</span></div>'+
      '<details><summary>Full numbers</summary>'+
        '<div class="kv"><span>Revenue</span><span>'+fmt(o.ingresos)+'/mo</span></div>'+
        '<div class="kv"><span>Gross margin</span><span>'+pct(o.margen,0)+'</span></div>'+
        '<div class="kv"><span>Fixed costs</span><span>'+fmt(o.gastos)+'/mo</span></div>'+
        '<div class="kv"><span>Growth</span><span>'+pct(o.crec,1)+'/mo</span></div>'+
        '<div class="kv"><span>Volatility</span><span>'+pct(o.vol,0)+'</span></div>'+
      '</details>'+
      '<div class="ens">Teaches: '+o.ensena+'</div>'+
    '</button>';
  }
  document.getElementById('origenes').innerHTML = h;
  var r = '', k;
  for(i=0;i<LISTA_RUTAS.length;i++){
    k = LISTA_RUTAS[i]; var ru = RUTAS[k];
    r += '<button class="goal ruta'+(k==='entrepreneur'?' sel':'')+'" data-ruta="'+k+'"><div class="gi">'+ico(ru.ic)+'</div><h4>'+esc(ru.t)+'</h4><p>'+esc(ru.tag)+'</p>'+
      '<div class="ladder">'+ru.niveles.map(function(n,ix){ return '<span'+(ix===0?' class="now"':'')+'>'+esc(n)+'</span>'; }).join('<i></i>')+'</div>'+
      '<div class="pc"><div class="pro">'+ru.pros.map(function(x){ return '<div>'+ico('check')+' '+esc(x)+'</div>'; }).join('')+'</div><div class="con">'+ru.cons.map(function(x){ return '<div>'+ico('x')+' '+esc(x)+'</div>'; }).join('')+'</div></div>'+
      '<div class="win">Start: '+esc(ru.inicio)+'</div></button>';
  }
  var rc = document.getElementById('rutas');
  rc.innerHTML = r;
  var sub = document.getElementById('subOrigen');
  sub.classList.remove('oculto');
  rc.addEventListener('click', function(ev){
    var b = ev.target.closest ? ev.target.closest('[data-ruta]') : null;
    if(!b) return;
    var all = rc.querySelectorAll('.goal'), j;
    for(j=0;j<all.length;j++) all[j].classList.remove('sel');
    b.classList.add('sel');
    if(b.getAttribute('data-ruta')==='entrepreneur') sub.classList.remove('oculto'); else sub.classList.add('oculto');
  });
  document.getElementById('origenes').addEventListener('click', function(ev){
    var c = ev.target.closest ? ev.target.closest('[data-or]') : null;
    if(!c) return;
    var all = document.querySelectorAll('#origenes .card'), j;
    for(j=0;j<all.length;j++) all[j].classList.remove('sel');
    c.classList.add('sel');
  });
  var g = '';
  for(i=0;i<GOALS.length;i++){
    g += '<button class="goal'+(i===0?' sel':'')+'" data-goal="'+GOALS[i].id+'"><div class="gi">'+ico(GOALS[i].ic)+'</div><h4>'+esc(GOALS[i].t)+'</h4><p>'+esc(GOALS[i].tag)+'</p><div class="win">Finish line: '+esc(GOALS[i].win)+'</div></button>';
  }
  var gc = document.getElementById('goals');
  if(gc){
    gc.innerHTML = g;
    gc.addEventListener('click', function(ev){
      var b = ev.target.closest ? ev.target.closest('[data-goal]') : null;
      if(!b) return;
      var all = gc.querySelectorAll('.goal'), k2;
      for(k2=0;k2<all.length;k2++) all[k2].classList.remove('sel');
      b.classList.add('sel');
    });
  }
}

function arrancar(){
  var nombre = (document.getElementById('inNombre').value||'').trim() || 'Anonymous';
  var dif = document.getElementById('inDif').value;
  var semTxt = (document.getElementById('inSeed').value||'').trim();
  var seed = semTxt ? semillaDeTexto(semTxt) : (Math.floor(Math.random()*4294967295)>>>0 || 1);
  var rutaSel = document.querySelector('#rutas .goal.sel'), ruta = rutaSel ? rutaSel.getAttribute('data-ruta') : 'entrepreneur';
  var orSel = document.querySelector('#origenes .card.sel'), origenId = orSel ? orSel.getAttribute('data-or') : 'agencia';
  var est = nuevoEstado({seed:seed, nombre:nombre, dificultad:dif});
  iniciarPartida(est, origenId, ruta);
  var sel = document.querySelector('#goals .goal.sel');
  est.ui = {goal: sel ? sel.getAttribute('data-goal') : 'influence', hitos:{}, histPat:[]};
  guardar(est);
  iniciarUI(est);
  toast('Goal set: '+goalActual(est).t+' · Path: '+RUTAS[ruta].t, 'ok');
  if(!terminoAprendido(est,'equity')) setTimeout(function(){ conTermino('equity', function(){ render(); }); }, 400);
}


(function(){
  pintarOrigenes();
  wire();
  var guardada = cargar();
  if(guardada){
    var b = document.getElementById('btnContinuar');
    b.classList.remove('oculto');
    b.addEventListener('click', function(){ iniciarUI(guardada); });
  }
  var rep = null;
  try{ rep = JSON.parse(localStorage.getItem('tc_repetir')||'null'); localStorage.removeItem('tc_repetir'); }catch(e){}
  if(rep){
    document.getElementById('inNombre').value = rep.nombre||'';
    document.getElementById('inDif').value = rep.dificultad||'normal';
    document.getElementById('inSeed').value = String(rep.seed);
  }
  document.getElementById('btnEmpezar').addEventListener('click', function(){ arrancar(); });
  document.getElementById('btnImportarInicio').addEventListener('click', function(){
    if(typeof modalImportar==='function') modalImportar(); else document.getElementById('fileImport').click();
  });
  document.getElementById('fileImport').addEventListener('change', function(){
    var f = this.files && this.files[0];
    if(!f) return;
    var fr = new FileReader();
    fr.onload = function(){
      try{
        var obj = JSON.parse(fr.result);
        if(!obj || obj.version!==1 || !obj.jugador) throw new Error('formato');
        var est = sanear(obj);
        guardar(est);
        colaUI = [];
        iniciarUI(est);
      }catch(e){ alert('Invalid save file.'); }
    };
    fr.readAsText(f);
  });
})();
