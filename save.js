'use strict';
var CLAVE_SAVE = 'titan_capital_en_v1';

function guardar(S){
  try{
    if(typeof localStorage==='undefined') return false;
    localStorage.setItem(CLAVE_SAVE, JSON.stringify(S));
    return true;
  }catch(e){ return false; }
}
function cargar(){
  try{
    if(typeof localStorage==='undefined') return null;
    var t = localStorage.getItem(CLAVE_SAVE);
    if(!t) return null;
    var S = JSON.parse(t);
    if(!S || S.version!==1 || !S.jugador) return null;
    return sanear(S);
  }catch(e){ return null; }
}
function borrarSave(){ try{ localStorage.removeItem(CLAVE_SAVE); }catch(e){} }
function sanear(S){
  var base = nuevoEstado({seed:S.seed||1});
  var k;
  for(k in base) if(base.hasOwnProperty(k) && S[k]===undefined) S[k]=base[k];
  for(k in base.jugador) if(base.jugador.hasOwnProperty(k) && S.jugador[k]===undefined) S.jugador[k]=base.jugador[k];
  for(k in base.flags) if(base.flags.hasOwnProperty(k) && S.flags[k]===undefined) S.flags[k]=base.flags[k];
  for(k in base.economia) if(base.economia.hasOwnProperty(k) && S.economia[k]===undefined) S.economia[k]=base.economia[k];
  for(k in base.estadisticas) if(base.estadisticas.hasOwnProperty(k) && S.estadisticas[k]===undefined) S.estadisticas[k]=base.estadisticas[k];
  var i;
  for(i=0;i<S.empresas.length;i++){
    var e = S.empresas[i], eb = nuevaEmpresa(S,{});
    for(k in eb) if(eb.hasOwnProperty(k) && e[k]===undefined) e[k]=eb[k];
  }
  S.auto = false;
  return S;
}
function exportarPartida(S){
  try{
    var blob = new Blob([JSON.stringify(S,null,1)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'titan-capital-'+(S.jugador.nombre||'game').replace(/\s+/g,'-')+'-month'+S.jugador.mes+'.json';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    return true;
  }catch(e){ return false; }
}
