'use strict';
/* Red de contactos (deal flow por Influencia y Reputacion) y control de ritmo (Fase 2) */

var RED_NOMBRES = ['Local','Regional','National','Global','Inner circle'];
function redTier(S){
  var inf = num(S.influencia.total,0), rep = num(S.jugador.reputacion,50), pos = posicionJugador(S), t = 0;
  if(S.jugador.etapa>=2 || inf>=20) t = 1;
  if(inf>=600 && rep>=45) t = 2;
  if(pos<=40 && inf>0 && rep>=55) t = 3;
  if(pos<=10 && inf>0 && rep>=65) t = 4;
  if(typeof lifestyleBonusRed==='function') t = Math.min(4, t + lifestyleBonusRed(S));
  return t;
}
function redSiguiente(S){
  var t = redTier(S);
  if(t>=4) return 'You are in the inner circle: nothing is out of reach.';
  return ['Reach Stage 2 or 20 IP', '600 IP and reputation 45+', 'Top 40 and reputation 55+', 'Top 10 and reputation 65+'][t];
}
function redTexto(S){
  var t = redTier(S);
  return ['You see what everyone sees: small local businesses.', 'Regional deal flow: more offers, slightly bigger.', 'National network: private deals before they hit the market, institutional investors call.', 'Global network: titans sell to you directly.', 'The inner circle: the best deals never reach the market, they reach you.'][t];
}
/* reputacion como puerta: por debajo de 35 el mercado se cierra */
function reputacionBloquea(S){ return num(S.jugador.reputacion,50) < 35; }

/* ---------- ritmo: meses tranquilos y meses intensos ---------- */
function probEventoMes(S){
  var quiet = S.jugador.mes - num(S.flags.ultimoEventoMes,-9);
  var base = quiet<=2 ? 0.04 : quiet<=4 ? 0.16 : quiet<=8 ? 0.30 : 0.50;
  base += num(S.jugador.riesgoPolitico,0)/400;
  if(typeof riskScore==='function'){ var r = riskScore(S); if(r.nivel==='high') base += 0.08; else if(r.nivel==='critical') base += 0.15; }
  return clamp(base, 0, 0.65);
}

/* ---------- oferta privada: solo con red ---------- */
function ofertaPrivada(S){
  var pat = Math.max(20000, patrimonio(S)), t = redTier(S);
  var of = generarOferta(S, Math.max(20000, U(S,0.3,1.5)*pat*(1+t*0.4)), pickW(S, LISTA_SECTORES, LISTA_SECTORES.map(function(s){ return SEC(s).tam/1e12; })));
  var c = calcular(of.empresa, S.economia);
  of.precioPedido = Math.max(1000, (c.valoracion - c.deudaTotal) * U(S,0.72,0.9));
  of.oculto = null; of.ddHecha = true; of.privado = true; of.meses = 2;
  of.multImplicito = (of.precioPedido + c.deudaTotal)/Math.max(1,c.EBITDAanual);
  of.etiqueta = etiquetaOferta(of);
  return of;
}

/* ---------- eventos de red ---------- */
EVENTOS.push(
{id:'inversorInstitucional', peso:5, decision:true,
 cond:function(S){ if(redTier(S)<2 || reputacionBloquea(S)) return false; var l=empresasReales(S),i; for(i=0;i<l.length;i++) if(esControlada(l[i]) && calcular(l[i],S.economia).EBITDAanual>=1e6) return true; return false; },
 gen:function(S){ var l=empresasReales(S),c=[],i; for(i=0;i<l.length;i++) if(esControlada(l[i]) && calcular(l[i],S.economia).EBITDAanual>=1e6) c.push(l[i].id); return {id:pick(S,c), k:U(S,1.3,1.6)}; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  var c = calcular(e,S.economia), val = Math.max(1, c.valoracion - c.deudaTotal), pre = val*p.k;
  var monto = Math.round(pre*0.25/0.75);   /* compra 25% post-money */
  var propNueva = e.propiedad * pre/(pre+monto);
  return {titulo:'An institutional investor wants in',
   texto:'A pension fund your network introduced offers to invest '+fmt(monto)+' in '+e.nombre+' at a valuation of '+fmt(pre)+' ('+pct(p.k-1,0)+' above market). The money goes into the company. Your stake would drop from '+pct(e.propiedad,1)+' to '+pct(propNueva,1)+'. They expect growth.',
   ensena:'A premium valuation makes dilution cheap. The network is what gets you the premium.',
   termino:'dilucion',
   opciones:[
    {t:'Take the money: '+fmt(monto)+' into the company', bot:monto*0.4, fn:function(S){ e.propiedad = clamp(propNueva,0,1); e.caja += monto; addBoost(e,{tipo:'crec',valor:0.004,meses:24}); registrar(S,'Institutional round at '+e.nombre+': '+fmt(monto)+' at a premium. Your stake: '+pct(e.propiedad,1)+'.','dinero'); }},
    {t:'Decline: keep 100% of the upside', bot:0, fn:function(S){ registrar(S,'You turned down the institutional investor.','evento'); }}
   ]};
 }},
{id:'dealPrivado', peso:6, decision:true,
 cond:function(S){ return redTier(S)>=3 && !reputacionBloquea(S) && S.rivales.length>0; },
 gen:function(S){ var rv = pick(S,S.rivales); if(!rv.empresas||!rv.empresas.length) return null; var ix = ri(S,0,rv.empresas.length-1); return {rivalId:rv.id, ix:ix, k:U(S,0.7,0.85)}; },
 build:function(S,p){
  var rv=null,i; for(i=0;i<S.rivales.length;i++) if(S.rivales[i].id===p.rivalId) rv=S.rivales[i];
  if(!rv || !rv.empresas[p.ix]) return null;
  var res = rv.empresas[p.ix], precio = Math.round(num(res.valoracion,1e6)*p.k);
  return {titulo:rv.nombre+' offers you a company, privately',
   texto:rv.nombre+' is rebalancing and offers you '+res.nombre+' ('+res.sector+', '+fmt(res.ingresosAnuales)+'/yr in revenue) for '+fmt(precio)+', '+pct(1-p.k,0)+' below its value, cash only, before anyone else hears about it.',
   ensena:'The best deals are never listed. They move between people who trust each other.',
   opciones:[
    {t:'Buy for '+fmt(precio), bot:(S.jugador.efectivo>=precio?num(res.valoracion,0)-precio:-1), fn:function(S){
      if(S.jugador.efectivo < precio){ registrar(S,'You could not raise '+fmt(precio)+' for '+res.nombre+'.','malo'); return; }
      S.jugador.efectivo -= precio; var e = empresaDesdeResumen(S, res); e.costoBase = precio; S.empresas.push(e);
      rv.empresas.splice(p.ix,1); S.estadisticas.empresasCompradas++; S.jugador.reputacion = clamp(S.jugador.reputacion+2,0,100);
      registrar(S,'Private deal: you bought '+res.nombre+' from '+rv.nombre+' for '+fmt(precio)+'.','empresa'); }},
    {t:'Pass', bot:0, fn:function(S){ registrar(S,'You passed on '+rv.nombre+'\'s private offer.','evento'); }}
   ]};
 }}
);
