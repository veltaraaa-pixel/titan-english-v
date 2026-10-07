'use strict';
/* Sistema de aprendizaje: disparadores de terminos */

function terminoAprendido(S, id){ return !!S.jugador.conocimiento.terminos[id]; }
function marcarAprendido(S, id, acertoPrimera){
  var t = TERMINO(id); if(!t) return;
  if(t.grupo==='basicos'){
    for(var i=0;i<TERMINOS_BASICOS.length;i++) S.jugador.conocimiento.terminos[TERMINOS_BASICOS[i]] = {mes:S.jugador.mes};
  } else {
    S.jugador.conocimiento.terminos[id] = {mes:S.jugador.mes};
  }
  registrar(S,'You learned: '+t.nombre+'.','aprendizaje');
  if(terminosAprendidosCount(S) >= TERMINOS.length && !S.flags.glosarioCompleto){
    S.flags.glosarioCompleto = true;
    S.jugador.reputacion = clamp(S.jugador.reputacion+5,0,100);
    registrar(S,'You completed the financial glossary. Reputation +5.','aprendizaje');
  }
}
function terminosAprendidosCount(S){
  var n=0,i; for(i=0;i<TERMINOS.length;i++) if(terminoAprendido(S,TERMINOS[i].id)) n++;
  return n;
}
function contextoTermino(S, id){
  var e = empresaMayor(S);
  if(e) S.__ebitdaAnual = Math.max(10000, Math.round(calcular(e,S.economia).EBITDAanual));
  else S.__ebitdaAnual = 120000;
}
function pedirTermino(S, id){
  if(terminoAprendido(S,id)) return false;
  if(!TERMINO(id)) return false;
  if(S.auto){ marcarAprendido(S,id,true); return false; }
  return true;
}
