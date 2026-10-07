'use strict';
/* Lifestyle: costo de oportunidad, inflacion del estilo de vida, riqueza vs caja (Fase 4) */

var LIFESTYLE = [
  {id:'apt', nombre:'Apartment', tipo:'home', ic:'home', precio:60000, mensual:250, dep:0.002, status:2, desc:'A place of your own. Ends the rent you pay inside your cost of living (-40%).'},
  {id:'house', nombre:'House', tipo:'home', ic:'home', precio:400000, mensual:1200, dep:0.0025, status:6, desc:'Appreciates slowly, costs steadily. Ends your rent.'},
  {id:'mansion', nombre:'Luxury home', tipo:'home', ic:'home', precio:4000000, mensual:12000, dep:0.003, status:20, desc:'Where titans receive guests. Serious upkeep.'},
  {id:'car', nombre:'Car', tipo:'car', ic:'truck', precio:45000, mensual:400, dep:-0.012, status:2, desc:'Loses 1.2% of its value every month. Convenient, not an investment.'},
  {id:'sport', nombre:'Sports car', tipo:'car', ic:'truck', precio:250000, mensual:1500, dep:-0.012, status:6, desc:'Turns heads and burns money.'},
  {id:'trip', nombre:'World trip', tipo:'exp', ic:'globe', precio:30000, mensual:0, dep:0, status:0, consumible:true, desc:'A month away. Reputation +2, political influence +3. No asset remains.'},
  {id:'club', nombre:'Private club', tipo:'club', ic:'key', precio:150000, mensual:3000, dep:0, status:8, desc:'Membership. Raises your network tier by one while you keep paying.'},
  {id:'yacht', nombre:'Yacht', tipo:'toy', ic:'ship', precio:6000000, mensual:40000, dep:-0.01, status:25, desc:'A hole in the water you pour money into. Everyone will know your name.'},
  {id:'jet', nombre:'Private jet', tipo:'toy', ic:'bolt', precio:45000000, mensual:300000, dep:-0.01, status:60, desc:'Time is the only thing you cannot buy. This is the closest thing.'}
];
function lifestyleItem(id){ for(var i=0;i<LIFESTYLE.length;i++) if(LIFESTYLE[i].id===id) return LIFESTYLE[i]; return null; }
function lifestyleState(S){ if(!S.lifestyle) S.lifestyle = []; return S.lifestyle; }
function tieneHogar(S){ var l = lifestyleState(S), i; for(i=0;i<l.length;i++) if(l[i].tipo==='home') return true; return false; }
function lifestyleBonusRed(S){ var l = lifestyleState(S), i; for(i=0;i<l.length;i++) if(l[i].tipo==='club') return 1; return 0; }
function lifestyleValor(S){ var l = lifestyleState(S), v=0, i; for(i=0;i<l.length;i++) v += num(l[i].valor,0); return v; }
function lifestyleMensual(S){ var l = lifestyleState(S), v=0, i; for(i=0;i<l.length;i++) v += num(l[i].mensual,0); return v; }
function lifestyleStatus(S){ var l = lifestyleState(S), v=0, i; for(i=0;i<l.length;i++) v += num(l[i].status,0); return v; }
function visibleLifestyle(S, it){
  var pat = patrimonio(S);
  return it.precio <= Math.max(5000, pat*1.2) || it.precio <= S.jugador.efectivo;
}
/* costo de oportunidad: ese dinero a tu mejor retorno disponible durante 10 anos */
function costoOportunidad(S, monto){
  var l = empresasReales(S), r = 0.08, i, c;
  for(i=0;i<l.length;i++){ c = calcular(l[i],S.economia); if(c.valoracion>0 && c.EBITDAanual>0){ var ret = c.EBITDAanual*0.75/Math.max(1,c.valoracion); if(ret>r) r = Math.min(0.35, ret); } }
  return {tasa:r, valor:monto*Math.pow(1+r,10)};
}
function comprarLifestyle(S, id){
  var it = lifestyleItem(id); if(!it) return R(false,'Not available.');
  if(it.precio > S.jugador.efectivo) return R(false,'You need '+fmt(it.precio)+' in cash. Wealth is not cash.');
  var l = lifestyleState(S), i;
  if(!it.consumible) for(i=0;i<l.length;i++) if(l[i].id===id) return R(false,'You already own one.');
  S.jugador.efectivo -= it.precio;
  if(it.consumible){
    S.jugador.reputacion = clamp(S.jugador.reputacion+2,0,100); S.jugador.politica = num(S.jugador.politica,0)+3;
    registrar(S,'You took a month off and traveled the world. Reputation +2, influence +3, '+fmt(it.precio)+' gone.','dinero');
    return R(true,'Worth it. Probably.');
  }
  l.push({id:it.id, nombre:it.nombre, tipo:it.tipo, valor:it.precio, precio:it.precio, mensual:it.mensual, dep:it.dep, status:it.status, mes:S.jugador.mes});
  registrar(S,'You bought a '+it.nombre.toLowerCase()+' for '+fmt(it.precio)+'. It costs '+fmt(it.mensual)+'/mo to keep.','dinero');
  return R(true,it.nombre+' acquired. Monthly cost +'+fmt(it.mensual)+'.');
}
function venderLifestyle(S, idx){
  var l = lifestyleState(S), it = l[idx]; if(!it) return R(false,'Nothing to sell.');
  var precio = Math.round(num(it.valor,0) * (it.tipo==='car'||it.tipo==='toy' ? 0.80 : 0.92));
  l.splice(idx,1); S.jugador.efectivo += precio;
  registrar(S,'You sold your '+it.nombre.toLowerCase()+' for '+fmt(precio)+' (bought for '+fmt(it.precio)+').', precio>=it.precio?'dinero':'malo');
  return R(true,'Sold for '+fmt(precio)+'.');
}
/* mes a mes: gasto, depreciacion/apreciacion, status -> influencia politica */
function actualizarLifestyle(S){
  var l = lifestyleState(S), i, it, gasto = 0, st = 0;
  for(i=0;i<l.length;i++){
    it = l[i];
    it.valor = Math.max(0, num(it.valor,0) * (1 + num(it.dep,0) + (it.tipo==='home' ? (S.economia.fase==='recesion' ? -0.006 : S.economia.fase==='expansion' ? 0.002 : 0) : 0)));
    gasto += num(it.mensual,0) * (1 + num(S.economia.inflacionMensual,0.002));
    it.mensual = num(it.mensual,0) * (1 + num(S.economia.inflacionMensual,0.002));
    st += num(it.status,0);
  }
  S.jugador.efectivo -= gasto;
  if(st>0) S.jugador.politica = num(S.jugador.politica,0) + st*0.03;
  return gasto;
}
