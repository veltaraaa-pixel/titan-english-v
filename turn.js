'use strict';
/* Cierre de mes, etapas, fin de partida, legado */

function posNumerica(S){
  var p = posicionJugador(S);
  if(p<=40) return p;
  var ultimo = 400, i;
  for(i=0;i<S.ranking.length;i++) if(!S.ranking[i].esJugador) ultimo = num(S.ranking[i].influencia,400);
  var inf = Math.max(1, num(S.influencia.total,0));
  if(inf >= ultimo) return 41;
  var n = 41 + Math.floor(Math.log(ultimo/inf)/Math.log(1.2));
  return clamp(isFinite(n)?n:9999, 41, 99999);
}

function cubrirDeficit(S){
  var i, e, t;
  for(i=0;i<S.empresas.length && S.jugador.efectivo<0;i++){
    e = S.empresas[i];
    if(e.esEmpleo) continue;
    if(e.caja > 0 && num(e.propiedad,1) > 0.5){
      t = Math.min(e.caja, -S.jugador.efectivo);
      e.caja -= t; S.jugador.efectivo += t;
    }
  }
}

function cobrarMensualidades(S){
  var j = S.jugador, i, p;
  j.costoDeVida = num(j.costoDeVida, 1200) * (1 + num(S.economia.inflacionMensual,0.002));
  j.efectivo -= j.costoDeVida * (typeof tieneHogar==='function' && tieneHogar(S) ? 0.6 : 1);
  if(typeof actualizarLifestyle==='function') actualizarLifestyle(S);
  for(i=S.prestamos.length-1;i>=0;i--){
    p = S.prestamos[i];
    var interes = num(p.saldo,0)*num(p.tasa,0.1)/12;
    var pago = Math.min(num(p.pagoMensual,0), num(p.saldo,0)+interes);
    j.efectivo -= pago;
    p.saldo = Math.max(0, num(p.saldo,0) + interes - pago);
    p.mesesRestantes = num(p.mesesRestantes,0)-1;
    S.estadisticas.interesesPagados += interes;
    if(p.saldo<=1 || p.mesesRestantes<=0){
      if(p.saldo>1){ j.efectivo -= p.saldo; }
      S.prestamos.splice(i,1);
      j.reputacion = clamp(j.reputacion+1,0,100);
      registrar(S,'You finished paying off a personal loan. Reputation +1.','dinero');
    }
  }
  if(j.buscandoEmpleo>0){
    j.buscandoEmpleo--;
    if(j.buscandoEmpleo===0 && !tieneEmpleo(S)) crearEmpleo(S);
  }
}

function actualizarStartups(S){
  var i, st, pend = [];
  for(i=S.startups.length-1;i>=0;i--){
    st = S.startups[i];
    st.mesesVividos = num(st.mesesVividos,0)+1;
    st.meses = num(st.meses,0)-1;
    var volS = SEC(st.sector).vol;
    if(chance(S, 0.015*(1+volS))){
      S.startups.splice(i,1);
      S.estadisticas.startupsFracaso++;
      registrar(S, st.nombre+' went bankrupt. You lost '+fmt(st.invertido)+'. This is how venture works: most startups die.','malo');
      continue;
    }
    if(chance(S,0.01)){
      var k = U(S,2,4);
      st.valoracion = num(st.valoracion,0)*k;
      pend.push({tipo:'rondaStartup', id:st.id, k:k});
      continue;
    }
    if(st.meses<=0){
      var r = rnd(S), mult;
      if(r<0.50) mult = 0;
      else if(r<0.80) mult = U(S,0.5,2);
      else mult = U(S,5,30);
      var salida = num(st.valoracionInicial,st.valoracion)*mult*num(st.propiedad,0);
      S.jugador.efectivo += salida;
      if(mult>=2) S.estadisticas.startupsExito++; else S.estadisticas.startupsFracaso++;
      var anios = Math.max(1, st.mesesVividos/12);
      var tir = salida>0 ? (Math.pow(salida/Math.max(1,st.invertido), 1/anios)-1) : -1;
      registrar(S,'Exit from '+st.nombre+': you receive '+fmt(salida)+' on '+fmt(st.invertido)+' invested. ROI '+pct(salida/Math.max(1,st.invertido)-1,0)+', IRR '+pct(tir,0)+'.', salida>st.invertido?'dinero':'malo');
      S.startups.splice(i,1);
    }
  }
  return pend;
}

function revisarBonos(S){
  var i, j, e, b;
  for(i=0;i<S.empresas.length;i++){
    e = S.empresas[i];
    for(j=0;j<e.bonos.length;j++){
      b = e.bonos[j];
      if(S.jugador.mes >= num(b.mesVencimiento,1e9) && !b.avisado){
        b.avisado = true;
        return {id:'vencimientoBonos', params:{id:e.id, bono:b.id}};
      }
    }
  }
  return null;
}

function revisarEtapa(S){
  /* para etapas usamos la posicion REAL (estar dentro de los 40); la estimada solo es informativa */
  var j = S.jugador, pat = patrimonio(S), pos = posicionJugador(S)<=40 ? posicionJugador(S) : 9999, i, e, nueva = j.etapa;
  if(j.etapa < 1){
    var ok = pat >= 100000;
    for(i=0;i<S.empresas.length && !ok;i++){
      e = S.empresas[i];
      if(!e.esEmpleo && e.empleados>=2 && e.mesesEbitdaPos>=3) ok = true;
    }
    if(ok) nueva = 1;
  }
  if(nueva<2 && pat >= 5000000) nueva = 2;
  if(nueva<3 && (pos <= 100 || pat >= 100000000)) nueva = 3;
  if(nueva<4 && (pos <= 10 || pat >= 10000000000)) nueva = 4;
  if(nueva > j.etapa){
    j.etapa = nueva;
    registrar(S,'New stage: '+NOMBRE_ETAPA[nueva]+'.','evento');
    return nueva;
  }
  return 0;
}
var NOMBRE_ETAPA = ['Survival','Entrepreneur','Investor','Tycoon','Titan'];

/* Al tercer mes en rojo: el banco liquida lo necesario. Solo si no alcanza, hay quiebra. */
function liquidacionForzosa(S){
  var cap = capacidadPrestamoPersonal(S), guard = 0;
  if(cap > -S.jugador.efectivo){
    prestamoPersonal(S, Math.min(cap, Math.ceil(-S.jugador.efectivo*1.5)+1000), 60);
    if(S.jugador.efectivo >= 0){ registrar(S,'You refinanced your overdraft with a personal loan.','dinero'); return; }
  }
  while(S.jugador.efectivo < 0 && guard++ < 40){
    var peor = null, pv = -1, i, v;
    for(i=0;i<S.empresas.length;i++){
      if(S.empresas[i].esEmpleo) continue;
      v = precioVenta(S, S.empresas[i], 1);
      if(v > pv){ pv = v; peor = S.empresas[i]; }
    }
    if(!peor) break;
    registrar(S,'Forced liquidation: the bank forces you to sell '+peor.nombre+'.','malo');
    venderEmpresa(S, peor, 1);
    S.jugador.reputacion = clamp(S.jugador.reputacion-3,0,100);
    if(pv<=0) break;
  }
  for(var j=0;j<S.startups.length && S.jugador.efectivo<0;){
    registrar(S,'Forced liquidation: you sell your stake in '+S.startups[j].nombre+' on the secondary market.','malo');
    venderStartup(S, S.startups[j]);
  }
}

function cerrarMes(S){
  if(S.fin) return {fin:true};
  var res = {pendientes:[], evento:null, anual:null, etapa:0, fin:null, cambioCiclo:null};
  var i, e, r;

  var cambio = actualizarEconomia(S);
  if(cambio==='pico'||cambio==='recesion'||cambio==='recuperacion'||cambio==='expansion'){
    res.pendientes.push({tipo:'evento', ref:{id:'ciclo', params:{fase:S.economia.fase}}});
    res.cambioCiclo = S.economia.fase;
  } else if(cambio==='tasa+'||cambio==='tasa-'){
    res.pendientes.push({tipo:'evento', ref:{id:'tasa', params:{tasa:S.economia.tasaInteres}}});
  }

  var dividendos = 0, perdidas = [];
  for(i=S.empresas.length-1;i>=0;i--){
    e = S.empresas[i];
    r = actualizarEmpresa(S, e);
    dividendos += num(r.dividendo,0);
    if(r.perdida) perdidas.push(e);
  }
  S.jugador.efectivo += dividendos;
  S.estadisticas.dividendosCobrados += dividendos;
  for(i=0;i<perdidas.length;i++){
    e = perdidas[i];
    S.empresas.splice(S.empresas.indexOf(e),1);
    S.jugador.reputacion = clamp(S.jugador.reputacion-20,0,100);
    registrar(S,'The bank took over '+e.nombre+' (negative equity and no cash for 6 months). Limited liability: your personal money is intact, your reputation is not.','malo');
    if(!terminoAprendido(S,'respLimitada')) res.pendientes.push({tipo:'termino', id:'respLimitada'});
  }

  cobrarMensualidades(S);
  cubrirDeficit(S);
  res.pendientes = res.pendientes.concat(actualizarStartups(S));

  var bon = revisarBonos(S);
  if(bon) res.pendientes.push({tipo:'evento', ref:bon});

  S.jugador.mes++;

  if(S.jugador.mes % 12 === 0){
    actualizarRivalesAnual(S);
  }
  generarMercado(S);

  actualizarReputacion(S);
  calcularInfluencia(S);
  var pos = construirRanking(S);
  var pat = patrimonio(S);
  if(pat > num(S.flags.maxPatrimonio,0)) S.flags.maxPatrimonio = pat;

  res.etapa = revisarEtapa(S);
  if(typeof revisarRutas==='function'){ var subs = revisarRutas(S); for(i=0;i<subs.length;i++) res.pendientes.push({tipo:'nivelRuta', ruta:subs[i].ruta, nivel:subs[i].nivel}); }

  if(S.jugador.efectivo < 0){
    S.jugador.mesesEfectivoNeg = num(S.jugador.mesesEfectivoNeg,0)+1;
    if(S.jugador.mesesEfectivoNeg>=3){
      liquidacionForzosa(S);
      if(S.jugador.efectivo < 0){
        var ins = insolvenciaPersonal(S);
        if(ins==='fin'){ S.fin = 'quiebra'; res.fin = 'quiebra'; }
        else { res.pendientes.push({tipo:'insolvencia'}); if(!terminoAprendido(S,'respLimitada')) res.pendientes.push({tipo:'termino', id:'respLimitada'}); }
      }
      else { S.jugador.mesesEfectivoNeg = 0; res.pendientes.push({tipo:'termino', id:'flujo'}); }
    } else {
      registrar(S,'Warning '+S.jugador.mesesEfectivoNeg+'/3: your personal cash is negative ('+fmt(S.jugador.efectivo)+'). Sell, borrow, inject capital or lay off staff. In the third month the bank liquidates your holdings.','malo');
    }
  } else S.jugador.mesesEfectivoNeg = 0;

  if(!S.fin && S.flags.mesesEnTop1 >= BAL.mesesParaVictoria && !S.flags.victoriaAnunciada){
    S.flags.victoriaAnunciada = true;
    res.pendientes.push({tipo:'victoria'});
  }

  if(!S.fin && S.jugador.mes >= 624){
    S.fin = 'vejez';
    res.fin = 'vejez';
  }

  if(!S.fin){
    /* consecuencias programadas y distress tienen prioridad sobre el azar */
    if(!S.eventoActual && S.jugador.incapacitadoHasta<=S.jugador.mes){
      var cons = revisarLedger(S) || revisarDistress(S);
      if(cons){ S.eventoActual = cons; S.flags.ultimoEventoMes = S.jugador.mes; res.evento = cons; res.consecuencia = true; }
    }
    if(!S.eventoActual && S.jugador.mes > num(S.flags.ultimoEventoMes,-9)+1 && S.jugador.incapacitadoHasta<=S.jugador.mes){
      var prob = typeof probEventoMes==='function' ? probEventoMes(S) : BAL.probEvento + num(S.jugador.riesgoPolitico,0)/400;
      if(chance(S, clamp(prob,0,0.65))){
        var ev = generarEvento(S);
        if(ev){ S.eventoActual = ev; S.flags.ultimoEventoMes = S.jugador.mes; res.evento = ev; }
      }
    }
    if(S.jugador.mes % 12 === 0){
      res.anual = resumenAnual(S);
      S.flags.posicionAnual[anoJuego(S)] = pos;
    }
  }
  if(S.jugador.mes === 1 && !terminoAprendido(S,'equity')){
    res.pendientes.push({tipo:'termino', id:'equity'});
  }
  return res;
}

function resumenAnual(S){
  var pat = patrimonio(S), pos = posNumerica(S);
  var prevPat = num(S.flags.patAnoAnterior, 5000), prevInf = num(S.flags.infAnoAnterior, 0), prevPos = num(S.flags.posAnoAnterior, 9999);
  S.flags.patAnoAnterior = pat; S.flags.infAnoAnterior = S.influencia.total; S.flags.posAnoAnterior = pos;
  var l = empresasReales(S), mejor=null, peor=null, i, c, v;
  for(i=0;i<l.length;i++){
    c = calcular(l[i], S.economia); v = c.EBITDA;
    if(!mejor || v>mejor.v) mejor = {n:l[i].nombre, v:v};
    if(!peor || v<peor.v) peor = {n:l[i].nombre, v:v};
  }
  var consejo = 'Reinvest: time is your only resource you cannot get back.';
  if(S.jugador.reputacion<40) consejo = 'Your reputation is low: it makes your debt more expensive and lowers your influence multiplier.';
  else if(deudaTotalJugador(S)/Math.max(1,ebitdaTotal(S)) > 4) consejo = 'You are heavily leveraged. A recession with this much debt could cost you companies.';
  else if(empleadosTotales(S)<10 && anoJuego(S)>5) consejo = 'Few employees: workforce influence and revenue scale by hiring.';
  else if(sectorConMasParticipacion(S).part>0.25) consejo = 'You dominate a sector: prepare for antitrust or diversify.';
  else if(S.jugador.etapa>=2 && S.empresas.length<3) consejo = 'Diversify: a single sector is a bet, not an empire.';
  return {ano:anoJuego(S)-1, edad:edad(S), pat:pat, dPat:pat-prevPat, inf:S.influencia.total, dInf:S.influencia.total-prevInf,
    pos:pos, dPos:prevPos-pos, mejor:mejor, peor:peor, fase:S.economia.fase, tasa:S.economia.tasaInteres, consejo:consejo};
}
function deudaTotalJugador(S){
  return sum(S.empresas, function(e){ return calcular(e,S.economia).deudaTotal; }) + deudaPersonal(S);
}
function ebitdaTotal(S){
  return sum(S.empresas, function(e){ return calcular(e,S.economia).EBITDAanual; });
}

/* ---------- LEGADO ---------- */
function calcularLegado(S){
  var inf = Math.max(1, num(S.influencia.total,0));
  var umbral = 400, i, p;
  for(i=0;i<S.ranking.length;i++) if(!S.ranking[i].esJugador) umbral = num(S.ranking[i].influencia,400);
  var sectores = {}, n=0;
  for(i=0;i<S.empresas.length;i++) if(esControlada(S.empresas[i])) sectores[S.empresas[i].sector]=1;
  for(p in sectores) if(sectores.hasOwnProperty(p)) n++;
  var tasa = S.flags.holding ? 0.05 : 0.12;
  if(!S.flags.ceo) tasa += 0.05;
  if(S.jugador.reputacion < 40) tasa += 0.05;
  if(sectorConMasParticipacion(S).part > 0.5) tasa += 0.04;
  if(n >= 4) tasa -= 0.03;
  tasa = clamp(tasa, 0.01, 0.4);
  var anios = 0;
  for(i=1;i<=30;i++){
    inf *= (1-tasa);
    umbral *= 1.02;
    if(inf >= umbral) anios = i; else break;
  }
  var titulo = anios<2?'Flash in the pan': anios<10?'One-generation tycoon': anios<20?'Dynasty': anios<30?'Institution':'Titan of the century';
  return {anios:anios, titulo:titulo, tasa:tasa};
}
function fraseLegado(S){
  var p = posNumerica(S);
  if(S.fin==='quiebra') return 'You built fast on foundations you never checked. The market always collects.';
  if(p===1) return 'You died as the most influential human on the planet. Nobody remembers how much money you had.';
  if(p<=10) return 'You reached the table where decisions are made. You never got to chair it.';
  if(p<=40) return 'You made the list. Millions tried and did not.';
  return 'You lived well. The world kept turning without noticing.';
}
