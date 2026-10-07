'use strict';
/* Simulacion sin interfaz con bot codicioso: balance y depuracion */

function iniciarPartida(S, origenId, rutaId){
  var o = null, i;
  rutaId = rutaId || 'entrepreneur';
  var r = rutaState(S); r.id = RUTAS[rutaId] ? rutaId : 'entrepreneur';
  if(r.id==='corporate' || r.id==='investor' || r.id==='realestate') origenId = 'empleo';
  if(r.id==='finance') origenId = 'empleo';
  for(i=0;i<ORIGENES.length;i++) if(ORIGENES[i].id===origenId) o = ORIGENES[i];
  if(!o) o = ORIGENES[1];
  if(r.id==='entrepreneur' && o.esEmpleo) o = ORIGENES[1];
  if(o.inv > S.jugador.efectivo) o = ORIGENES[0];
  S.jugador.efectivo -= o.inv;
  var e = nuevaEmpresa(S, {
    nombre: o.esEmpleo ? 'Job' : nombreEmpresa(S, o.sector),
    sector: o.sector, esEmpleo: !!o.esEmpleo,
    ingresos: o.ingresos, margenBruto: o.margen, gastosFijos: o.gastos,
    activos: o.activos, crecimiento: o.crec, crecimientoBase: o.crecBase,
    volatilidad: o.vol, empleados: o.empleados, propiedad: 1, caja: 0
  });
  e.costoBase = o.inv;
  if(e.esEmpleo){ e.ingresos *= perk(S,'salario'); if(r.id==='finance') e.nombre = 'Analyst desk'; if(r.id==='corporate') e.nombre = 'Corporate job'; }
  else r.fundadas.push(e.id);
  S.empresas.push(e);
  if(r.id==='realestate'){
    var casa = nuevaEmpresa(S,{nombre:'Studio '+pick(S,PRE_EMP), sector:'Real Estate', esEdificio:true,
      ingresos: 20000*perk(S,'caprate')/12, margenBruto:0.70, gastosFijos: 20000*0.015/12, activos:20000, deuda:16000,
      tasaDeuda: clamp(S.economia.tasaInteres+0.015,0.01,0.5), crecimiento:0.002, crecimientoBase:0.002, volatilidad:0.10, empleados:1, propiedad:1, caja:100});
    casa.costoBase = 20000; S.jugador.efectivo -= 4000; S.empresas.push(casa);
  }
  generarRivales(S);
  generarMercado(S);
  calcularInfluencia(S);
  construirRanking(S);
  registrar(S, 'You start at 18 on the '+RUTAS[r.id].t+' path with '+fmt(S.jugador.efectivo)+' and '+(o.esEmpleo?'a job':'"'+e.nombre+'"')+(r.id==='realestate'?' and a small studio with a mortgage':'')+'. '+o.ensena, 'evento');
  return S;
}

function botAcciones(S){
  if(S.jugador.incapacitadoHasta > S.jugador.mes) return;
  var i, e, c, sec;

  if(!tieneEmpleo(S) && S.jugador.buscandoEmpleo<=0 && ingresoMensualNeto(S) < 0 && S.jugador.etapa===0) buscarEmpleo(S);

  /* rescate: si el efectivo personal es negativo, refinancia o vende lo mas pequeno */
  if(S.jugador.efectivo < 0){
    var cap = capacidadPrestamoPersonal(S);
    if(cap > -S.jugador.efectivo*1.5) prestamoPersonal(S, Math.min(cap, -S.jugador.efectivo*3+10000), 36);
    if(S.jugador.efectivo < 0){
      var peque=null, pv=1e18;
      for(i=0;i<S.empresas.length;i++){
        e=S.empresas[i]; if(e.esEmpleo) continue;
        var vv = precioVenta(S,e,1);
        if(vv>0 && vv<pv){ pv=vv; peque=e; }
      }
      if(peque) venderEmpresa(S, peque, 1);
    }
  }
  var emp = tieneEmpleo(S);
  if(emp){
    var otros = 0;
    for(i=0;i<S.empresas.length;i++) if(!S.empresas[i].esEmpleo) otros += calcular(S.empresas[i],S.economia).EBITDA;
    if(otros > calcular(emp,S.economia).EBITDA*3) renunciarEmpleo(S);
  }

  /* comprar la oferta mas barata por multiplo */
  if(S.mercado.ofertas.length){
    var mejor=null, mv=1e18;
    for(i=0;i<S.mercado.ofertas.length;i++){
      var of = S.mercado.ofertas[i];
      if(of.multImplicito < mv && of.multImplicito>0){ mv=of.multImplicito; mejor=of; }
    }
    if(mejor){
      var precio = num(mejor.precioAcordado, mejor.precioPedido);
      if(S.jugador.efectivo >= precio*0.6){
        var lbo = Math.min(maxLBO(S, mejor, precio), Math.max(0, precio - S.jugador.efectivo*0.9));
        comprarOferta(S, mejor, 1, lbo);
      }
    }
  }

  /* deuda corporativa hasta apalancamiento 2.5 y reinvertirla */
  for(i=0;i<S.empresas.length;i++){
    e = S.empresas[i];
    if(e.esEmpleo) continue;
    c = calcular(e, S.economia);
    if(c.EBITDAanual<=0) continue;
    var objetivo = c.EBITDAanual*2.5 - c.deudaTotal;
    if(objetivo > c.EBITDAanual*0.5){
      var lim = Math.min(objetivo, limitePrestamoCorporativo(S,e));
      if(lim > 1000 && prestamoCorporativo(S,e,Math.floor(lim)).ok){
        var usar = Math.max(0, e.caja - c.gastosFijos*2);
        if(usar>100) { e.caja -= usar; invertirEnEmpresa(S, e, usar, true); }
      }
    }
  }

  /* invertir el 70% del efectivo en la mejor empresa */
  var cash = S.jugador.efectivo - S.jugador.costoDeVida*6;
  if(cash > 200){
    var best=null, bs=-1;
    for(i=0;i<S.empresas.length;i++){
      e = S.empresas[i];
      if(e.esEmpleo||e.esEdificio) continue;
      sec = SEC(e.sector);
      var score = sec.retCap;
      if(score>bs){ bs=score; best=e; }
    }
    if(best) invertirEnEmpresa(S, best, Math.floor(cash*0.7));
  }
}

function resolverPendientesAuto(S, pend){
  var i, p, inst;
  for(i=0;i<pend.length;i++){
    p = pend[i];
    if(p.tipo==='evento'){
      S.eventoActual = p.ref;
      inst = construirEvento(S, p.ref);
      if(inst) resolverEvento(S, mejorOpcionBot(inst)); else S.eventoActual=null;
    } else if(p.tipo==='rondaStartup'){
      var st=null, j;
      for(j=0;j<S.startups.length;j++) if(S.startups[j].id===p.id) st=S.startups[j];
      if(st) st.propiedad = clamp(st.propiedad*0.8,0,1);
    } else if(p.tipo==='termino'){
      marcarAprendido(S, p.id, true);
    }
  }
}

function pasoBot(S){
  if(S.eventoActual){
    var inst = construirEvento(S, S.eventoActual);
    if(inst) resolverEvento(S, mejorOpcionBot(inst)); else S.eventoActual=null;
  }
  botAcciones(S);
  var res = cerrarMes(S);
  resolverPendientesAuto(S, res.pendientes);
  return res;
}

function simularPartida(seed, origenId, dificultad){
  var S = nuevoEstado({seed:seed, nombre:'Bot', dificultad:dificultad||'normal'});
  S.auto = true;
  iniciarPartida(S, origenId||'ecommerce');
  var hitos = {60:null,120:null,240:null,360:null,480:null,624:null};
  var mejorPos = 99999, guard=0;
  while(!S.fin && S.jugador.mes < 624 && guard++ < 700){
    pasoBot(S);
    var p = posNumerica(S);
    if(p < mejorPos) mejorPos = p;
    if(hitos[S.jugador.mes] === null) hitos[S.jugador.mes] = {pat:patrimonio(S), inf:S.influencia.total, pos:p};
  }
  return {hitos:hitos, mejorPos:mejorPos, fin:S.fin||'vejez', mesesTop1:S.flags.mesesEnTop1,
    maxInf:S.flags.maxInfluencia, meses:S.jugador.mes, empresas:S.empresas.length, S:S};
}

function percentil(arr, p){
  if(!arr.length) return 0;
  var a = arr.slice().sort(function(x,y){ return x-y; });
  var i = clamp(Math.floor(p*(a.length-1)), 0, a.length-1);
  return a[i];
}
function simular(n, origenId, dificultad){
  n = Math.max(1, num(n,10));
  var runs=[], i;
  for(i=0;i<n;i++) runs.push(simularPartida(1000+i*7919, origenId, dificultad));
  var anios=[5,10,20,30,40,52], mesesH=[60,120,240,360,480,624];
  var tabla=[], k;
  for(k=0;k<anios.length;k++){
    var pats=[], poss=[], infs=[];
    for(i=0;i<runs.length;i++){
      var h = runs[i].hitos[mesesH[k]];
      if(h){ pats.push(h.pat); poss.push(h.pos); infs.push(h.inf); }
    }
    tabla.push({ano:anios[k], edad:18+anios[k], n:pats.length,
      patP25:percentil(pats,0.25), patMed:percentil(pats,0.5), patP75:percentil(pats,0.75),
      infMed:percentil(infs,0.5), posMed:percentil(poss,0.5), posP25:percentil(poss,0.25)});
  }
  var mejores=[], gana=0, quiebras=0;
  for(i=0;i<runs.length;i++){
    mejores.push(runs[i].mejorPos);
    if(runs[i].mesesTop1>=24) gana++;
    if(runs[i].fin==='quiebra') quiebras++;
  }
  var out = {tabla:tabla, mejorPosMediana:percentil(mejores,0.5), mejorPosMin:percentil(mejores,0),
    pctVictoria:gana/runs.length, pctQuiebra:quiebras/runs.length, n:runs.length};
  if(typeof console!=='undefined'){
    console.log('--- simular('+n+') background='+(origenId||'ecommerce')+' diff='+(dificultad||'normal')+' ---');
    for(k=0;k<tabla.length;k++){
      var t=tabla[k];
      console.log('Year '+t.ano+' (age '+t.edad+'): net worth p25 '+fmt(t.patP25)+' | median '+fmt(t.patMed)+' | p75 '+fmt(t.patP75)+'  · influence '+miles(t.infMed)+' IP · median position '+t.posMed);
    }
    console.log('Median best position: #'+out.mejorPosMediana+' · best overall #'+out.mejorPosMin+' · victories '+pct(out.pctVictoria,0)+' · bankruptcies '+pct(out.pctQuiebra,0));
  }
  return out;
}
