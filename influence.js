'use strict';
/* Influencia, reputacion, riesgo politico, ranking */

function calcularInfluencia(S){
  var eco = S.economia, i, e, c, eco_=0, lab=0, fin=0, pol=0;
  var partCache = {};
  for(i=0;i<S.empresas.length;i++){
    e = S.empresas[i];
    if(e.esEmpleo) continue;
    c = calcular(e, eco);
    var fc = factorControl(e), sec = SEC(e.sector);
    if(partCache[e.sector]===undefined) partCache[e.sector] = participacionSector(S, e.sector);
    var p = partCache[e.sector];
    var bonus = p>=0.25 ? 1.5 : (p>=0.10 ? 1.25 : 1);
    eco_ += (c.ingresosAnuales * fc * sec.fi * bonus) / 1e6;
    lab += (num(e.empleados,0) * fc) / 10;
    if(e.sector==='Finance') fin += (num(e.activos,0) * fc) / 1e6 * 0.5;
    fin += (c.deudaTotal) / 1e6 * 0.1;
    if(e.sector==='Media' && fc>=1) pol += c.ingresosAnuales / 1e7 * 12;
  }
  pol += num(S.jugador.politica,0);
  var mult = clamp(0.5 + num(S.jugador.reputacion,50)/100, 0.5, 1.5);
  var total = Math.max(0, (eco_ + lab + fin + pol) * mult);
  var prev = num(S.influencia.total,0);
  S.influencia.previa = prev;
  S.influencia.economica = eco_;
  S.influencia.laboral = lab;
  S.influencia.financiera = fin;
  S.influencia.politica = pol;
  S.influencia.multiplicador = mult;
  S.influencia.total = total;
  if(total > num(S.flags.maxInfluencia,0)) S.flags.maxInfluencia = total;
  if(S.jugador.mes % 3 === 0){
    S.influencia.historial.push({m:S.jugador.mes, v:Math.round(total)});
    if(S.influencia.historial.length>300) S.influencia.historial.shift();
  }
  return total;
}

function actualizarReputacion(S){
  var j = S.jugador, i, e, estres=false;
  j.reputacion = clamp(num(j.reputacion,50) + (50 - num(j.reputacion,50))*0.005, 0, 100);
  for(i=0;i<S.empresas.length;i++){
    e = S.empresas[i];
    if(e.mesesCajaNeg>0 || calcular(e,S.economia).apalancamiento>6) estres=true;
  }
  if(!estres) j.reputacion = clamp(j.reputacion + 0.2, 0, 100);
  var rp = num(j.riesgoPolitico,0) - 1;
  var sectoresDom = 0;
  for(i=0;i<LISTA_SECTORES.length;i++){
    var p = participacionSector(S, LISTA_SECTORES[i]);
    if(p>0.25){ rp += 0.5; sectoresDom++; }
    if(p>0.60 && S.jugador.mes%12===0) j.reputacion = clamp(j.reputacion-5,0,100);
  }
  if(S.flags.autofinanciacion) rp += 1;
  j.riesgoPolitico = clamp(rp, 0, 100);
  j.politica = Math.max(0, num(j.politica,0) * 0.98);
}

function posicionJugador(S){
  for(var i=0;i<S.ranking.length;i++) if(S.ranking[i].esJugador) return i+1;
  return 41;
}
function posicionEstimada(S){
  var p = posicionJugador(S);
  if(p<=41 && S.ranking.length && S.ranking[S.ranking.length-1].esJugador===false) return p;
  return p;
}
function construirRanking(S){
  var l = [], i;
  for(i=0;i<S.rivales.length;i++){
    if(S.rivales[i].vivo===false) continue;
    l.push({id:S.rivales[i].id, nombre:S.rivales[i].nombre, influencia:num(S.rivales[i].influencia,0), esJugador:false, ref:S.rivales[i]});
  }
  l.push({id:0, nombre:S.jugador.nombre, influencia:num(S.influencia.total,0), esJugador:true, ref:null});
  l.sort(function(a,b){ return b.influencia - a.influencia; });
  S.ranking = l;
  var pos = posicionJugador(S);
  if(pos < num(S.flags.mejorPosicion,9999)) S.flags.mejorPosicion = pos;
  if(pos===1) S.flags.mesesEnTop1 = num(S.flags.mesesEnTop1,0)+1;
  return pos;
}
function posicionTexto(S){
  var pos = posicionJugador(S);
  var ultimo = S.ranking.length ? num(S.ranking[S.ranking.length-1].influencia,400) : 400;
  if(pos <= 40) return '#'+pos;
  var inf = Math.max(1, num(S.influencia.total,0));
  var n = 41 + Math.floor(Math.log(Math.max(1,ultimo)/inf)/Math.log(1.2));
  if(!isFinite(n) || n<41) n = 41;
  return 'Unranked (≈#'+Math.min(99999,n)+')';
}
function influenciaParaSubir(S){
  var pos = posicionJugador(S);
  if(pos<=1) return 0;
  var arriba = S.ranking[pos-2];
  return Math.max(0, num(arriba.influencia,0) - num(S.influencia.total,0)) + 1;
}
