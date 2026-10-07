'use strict';
/* Eventos: gen() prerollea datos serializables; build() reconstruye el evento */

function empresasReales(S){
  var l=[],i; for(i=0;i<S.empresas.length;i++) if(!S.empresas[i].esEmpleo) l.push(S.empresas[i]);
  return l;
}
function empresaMayor(S){
  var l = empresasReales(S), mejor=null, v=-1, i, c;
  for(i=0;i<l.length;i++){ c=calcular(l[i],S.economia); if(c.valoracion>v){v=c.valoracion;mejor=l[i];} }
  return mejor;
}
function sectorConMasParticipacion(S){
  var mejor=null, v=0, i, p;
  for(i=0;i<LISTA_SECTORES.length;i++){ p=participacionSector(S,LISTA_SECTORES[i]); if(p>v){v=p;mejor=LISTA_SECTORES[i];} }
  return {sector:mejor, part:v};
}
function ingresosAnualesTotales(S){
  return sum(empresasReales(S), function(e){ return num(e.ingresos,0)*12; });
}
/* Cobra un monto al jugador: efectivo -> cajas -> venta forzada de participaciones */
function cobrar(S, monto){
  monto = Math.max(0, num(monto,0));
  var i, e, t, guard=0;
  S.jugador.efectivo -= monto;
  for(i=0;i<S.empresas.length && S.jugador.efectivo<0;i++){
    e = S.empresas[i];
    if(e.caja>0){ t=Math.min(e.caja, -S.jugador.efectivo); e.caja-=t; S.jugador.efectivo+=t; }
  }
  while(S.jugador.efectivo < 0 && guard++ < 40){
    var peque=null, pv=Infinity;
    for(i=0;i<S.empresas.length;i++){
      e=S.empresas[i]; if(e.esEmpleo) continue;
      var v = precioVenta(S,e,1);
      if(v < pv){ pv=v; peque=e; }
    }
    if(!peque) break;
    registrar(S,'Forced sale of '+peque.nombre+' to cover the obligation.','malo');
    venderEmpresa(S, peque, 1);
    if(pv<=0) { if(S.empresas.length===0) break; }
  }
}
function aplicarATodas(S, pctCambio, meses, filtro){
  var l = empresasReales(S), i;
  for(i=0;i<l.length;i++) if(!filtro || filtro(l[i])) modIngresoTemporal(l[i], pctCambio, meses, 'evento');
}

var EVENTOS = [
/* ---------- Dilemas: eventos donde las dos opciones cuestan algo ---------- */
{id:'ventaRelampago', peso:4, decision:true,
 cond:function(S){ return S.jugador.etapa>=1 && patrimonio(S)>50000 && S.rivales.length>0; },
 gen:function(S){
   var e = generarEmpresaVenta(S, Math.max(20000, patrimonio(S)*U(S,0.5,1.4)), pick(S,LISTA_SECTORES));
   var rv = pick(S, S.rivales);
   return {empresa:e, rivalId:rv.id, k:U(S,0.5,0.6)};
 },
 build:function(S,p){
  var e = p.empresa; if(!e) return null;
  var c = calcular(e, S.economia);
  var valor = Math.max(1000, c.valoracion - c.deudaTotal);
  var precio = Math.round(valor * p.k);
  var rv = null, i; for(i=0;i<S.rivales.length;i++) if(S.rivales[i].id===p.rivalId) rv=S.rivales[i];
  return {titulo:'Fire sale: '+e.nombre,
   texto:'A competitor is going under and must sell '+e.nombre+' today. Asking '+fmt(precio)+' for 100%, cash only, no financing: that is '+pct(p.k,0)+' of what it is worth ('+fmt(valor)+'). It bills '+fmt(c.ingresos)+'/mo with '+fmt(c.EBITDA)+' in operating profit and carries '+fmt(c.deudaTotal)+' of debt.'+(rv?' '+rv.nombre+' is circling.':''),
   ensena:'Distress creates the best prices and the worst timing. Cash you keep idle is the price of being able to say yes.',
   opciones:[
    {t:'Buy it now for '+fmt(precio)+' (cash only)', bot:(S.jugador.efectivo>=precio?valor-precio:-1), fn:function(S){
      if(S.jugador.efectivo < precio){ registrar(S,'You could not raise '+fmt(precio)+' in cash. '+(rv?rv.nombre+' took '+e.nombre+'.':e.nombre+' went to someone else.'),'malo'); if(rv) rv.influencia*=1.03; return; }
      S.jugador.efectivo -= precio; e.propiedad = 1; e.costoBase = precio; S.empresas.push(e); S.estadisticas.empresasCompradas++;
      registrar(S,'Fire sale: you bought '+e.nombre+' for '+fmt(precio)+', '+pct(1-p.k,0)+' below value.','empresa'); }},
    {t:'Let it go', bot:0, fn:function(S){
      if(rv){ rv.influencia*=1.05; registrar(S,rv.nombre+' bought '+e.nombre+' for '+fmt(precio)+'. You had '+fmt(S.jugador.efectivo)+' in cash.','evento'); }
      else registrar(S,'Someone else bought '+e.nombre+'.','evento'); }}
   ]};
 }},

{id:'capitalDuro', peso:4, decision:true,
 cond:function(S){ var e=empresaMayor(S); return S.jugador.etapa>=2 && e && e.propiedad>=0.9 && calcular(e,S.economia).EBITDAanual>100000 && S.rivales.length>0; },
 gen:function(S){ var e=empresaMayor(S); var rv=pick(S,S.rivales); return {id:e.id, rivalId:rv.id, k:U(S,1.3,1.5)}; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  var c = calcular(e,S.economia), rv=null, i;
  for(i=0;i<S.rivales.length;i++) if(S.rivales[i].id===p.rivalId) rv=S.rivales[i];
  var valor = Math.max(1000, c.valoracion - c.deudaTotal);
  var monto = Math.round(valor*0.30*p.k);
  var apal = (c.deudaTotal+monto)/Math.max(1,c.EBITDAanual);
  return {titulo:(rv?rv.nombre:'A rival')+' wants into '+e.nombre,
   texto:(rv?rv.nombre:'A rival')+' offers '+fmt(monto)+' for 30% of '+e.nombre+', a '+pct(p.k-1,0)+' premium over its value. You keep control but share the upside, and a rival learns your numbers. The alternative: borrow the same '+fmt(monto)+' against the company, which takes its leverage to '+apal.toFixed(1)+'x.',
   ensena:'Equity is expensive when the business is good; debt is dangerous when it stops being good. There is no free capital.',
   opciones:[
    {t:'Sell 30% for '+fmt(monto), bot:monto*0.4, fn:function(S){
      e.propiedad = clamp(e.propiedad-0.30, 0, 1); S.jugador.efectivo += monto;
      if(rv) rv.influencia *= 1.04;
      registrar(S,'You sold 30% of '+e.nombre+' to '+(rv?rv.nombre:'a rival')+' for '+fmt(monto)+'. Your share: '+pct(e.propiedad,0)+'.','dinero'); }},
    {t:'Borrow '+fmt(monto)+' instead (leverage '+apal.toFixed(1)+'x)', bot:(apal>4?-monto*0.2:monto*0.3), fn:function(S){
      var tasa = clamp(S.economia.tasaInteres+0.02+spreadRep(S)+Math.max(0,apal-2)*0.0075,0.01,0.6);
      e.tasaDeuda = clamp((e.deuda*e.tasaDeuda + monto*tasa)/Math.max(1,e.deuda+monto),0.005,0.6);
      e.deuda += monto; e.caja += monto;
      registrar(S,e.nombre+' borrowed '+fmt(monto)+' at '+pct(tasa)+'. Leverage '+apal.toFixed(1)+'x.','dinero'); }},
    {t:'Neither: keep it as it is', bot:0, fn:function(S){ registrar(S,'You turned down '+(rv?rv.nombre:'the rival')+'. '+e.nombre+' stays 100% yours.','evento'); }}
   ]};
 }},

{id:'rescatarOSoltar', peso:9, decision:true,
 cond:function(S){ var l=empresasReales(S),i; for(i=0;i<l.length;i++) if(l[i].caja<0 && num(l[i].mesesCajaNeg,0)>=2) return true; return false; },
 gen:function(S){ var l=[],i; for(i=0;i<S.empresas.length;i++){ var e=S.empresas[i]; if(!e.esEmpleo && e.caja<0 && num(e.mesesCajaNeg,0)>=2) l.push(e.id); } return l.length?{id:pick(S,l)}:null; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  var c = calcular(e,S.economia);
  var hueco = Math.max(0,-e.caja), iny = Math.max(hueco*1.5, S.jugador.efectivo*0.2);
  var venta = precioVenta(S,e,1)*0.6;
  return {titulo:'Save it or let it go: '+e.nombre,
   texto:e.nombre+' has been out of cash for '+num(e.mesesCajaNeg,0)+' months ('+fmt(e.caja)+'). Operating profit is '+fmt(c.EBITDA)+'/mo and equity is '+fmt(c.equity)+'. Plug the hole with '+fmt(iny)+' of your own cash and hope it turns, or sell it today for '+fmt(venta)+' (60% of what you would normally get). If you do nothing, the bank takes it at month 6.',
   ensena:'Throwing good money after bad is the most common mistake in business. Sometimes the right move is to take the loss early.',
   opciones:[
    {t:'Inject '+fmt(iny), bot:(c.EBITDA>0?c.EBITDA*12:-iny), fn:function(S){
      var m = Math.min(iny, Math.max(0,S.jugador.efectivo));
      if(m<=0){ registrar(S,'You had no cash to inject into '+e.nombre+'.','malo'); return; }
      S.jugador.efectivo -= m; e.caja += m; if(e.caja>=0) e.mesesCajaNeg = 0;
      registrar(S,'You injected '+fmt(m)+' into '+e.nombre+'.','dinero'); }},
    {t:'Sell it today for '+fmt(venta), bot:venta, fn:function(S){
      S.jugador.efectivo += venta; S.estadisticas.empresasVendidas++;
      var ix = S.empresas.indexOf(e); if(ix>=0) S.empresas.splice(ix,1);
      registrar(S,'You cut your losses and sold '+e.nombre+' for '+fmt(venta)+'.','dinero'); }}
   ]};
 }},

{id:'doblarApuesta', peso:5, decision:true,
 cond:function(S){ var i,s2; for(i=0;i<LISTA_SECTORES.length;i++){ s2=S.sectores[LISTA_SECTORES[i]]; if(s2 && s2.modSector>0 && s2.modHasta>S.jugador.mes+3){ var l=empresasReales(S),k; for(k=0;k<l.length;k++) if(l[k].sector===LISTA_SECTORES[i] && esControlada(l[k]) && calcular(l[k],S.economia).EBITDAanual>0 && limitePrestamoCorporativo(S,l[k])>10000) return true; } } return false; },
 gen:function(S){ var i,s2,l=empresasReales(S),k,c=[]; for(i=0;i<LISTA_SECTORES.length;i++){ s2=S.sectores[LISTA_SECTORES[i]]; if(s2 && s2.modSector>0 && s2.modHasta>S.jugador.mes+3) for(k=0;k<l.length;k++) if(l[k].sector===LISTA_SECTORES[i] && esControlada(l[k]) && calcular(l[k],S.economia).EBITDAanual>0 && limitePrestamoCorporativo(S,l[k])>10000) c.push(l[k].id); } return c.length?{id:pick(S,c)}:null; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  var c = calcular(e,S.economia), s2 = S.sectores[e.sector]||{};
  var meses = Math.max(1, num(s2.modHasta,0)-S.jugador.mes);
  var monto = Math.floor(Math.min(limitePrestamoCorporativo(S,e), c.EBITDAanual*3));
  if(monto<10000) return null;
  var apal = (c.deudaTotal+monto)/Math.max(1,c.EBITDAanual);
  return {titulo:'Double down on the '+e.sector+' boom?',
   texto:'The '+e.sector+' boom has about '+meses+' months left. The bank will lend '+e.nombre+' up to '+fmt(monto)+' right now. Pour it into capacity and growth jumps +3%/mo while the boom lasts, but leverage goes to '+apal.toFixed(1)+'x and the debt stays after the boom ends. Booms are usually followed by a peak and a recession.',
   ensena:'Leverage in a boom is how fortunes are made and how they are lost. The debt does not know the boom ended.',
   opciones:[
    {t:'Double down: borrow '+fmt(monto)+' and invest it', bot:(apal<=3?monto*0.3:-monto*0.2), fn:function(S){
      var tasa = clamp(S.economia.tasaInteres+0.02+spreadRep(S)+Math.max(0,apal-2)*0.0075,0.01,0.6);
      e.tasaDeuda = clamp((e.deuda*e.tasaDeuda + monto*tasa)/Math.max(1,e.deuda+monto),0.005,0.6);
      e.deuda += monto;
      invertirEnEmpresa(S, e, monto, true);
      addBoost(e,{tipo:'crec',valor:0.03,meses:meses});
      prometer(S, {origen:'doubleDown', titulo:'double-down at '+e.nombre, emp:e.id, tipo:'cond', cond:'recession', hasta:S.jugador.mes+12, evento:'boomBust'});
      registrar(S,'You doubled down at '+e.nombre+': '+fmt(monto)+' of new debt into capacity. Leverage '+apal.toFixed(1)+'x.','dinero'); }},
    {t:'Ride the boom without new debt', bot:0, fn:function(S){ registrar(S,'You rode the '+e.sector+' boom without adding debt.','evento'); }}
   ]};
 }},

{id:'soborno', peso:4, decision:true,
 cond:function(S){ var m=sectorConMasParticipacion(S); return S.jugador.etapa>=3 && m.sector && m.part>0.02; },
 gen:function(S){ var m=sectorConMasParticipacion(S); return {sector:m.sector}; },
 build:function(S,p){
  var pago = Math.max(50000, patrimonio(S)*0.02);
  var l = empresasReales(S), tuyas=[], i;
  for(i=0;i<l.length;i++) if(l[i].sector===p.sector && esControlada(l[i])) tuyas.push(l[i]);
  if(!tuyas.length) return null;
  return {titulo:'An official makes an offer',
   texto:'A regulator in '+p.sector+' hints that, for '+fmt(pago)+' in "consulting fees", a competitor\'s license could be delayed for a year. Your companies in the sector would pick up the slack: about +15% revenue, permanently. If it ever comes out, the scandal would be the worst of your career.',
   ensena:'Corruption is a loan against your reputation at an unknown interest rate. The payment comes when you can least afford it.',
   opciones:[
    {t:'Pay the '+fmt(pago), bot:-pago, fn:function(S){
      cobrar(S, pago);
      for(var k=0;k<tuyas.length;k++) tuyas[k].ingresos *= 1.15;
      S.jugador.riesgoPolitico = clamp(S.jugador.riesgoPolitico+25,0,100);
      S.flags.sobornos = num(S.flags.sobornos,0)+1;
      prometer(S, {origen:'bribe', titulo:'payment to a regulator', tipo:'prob', p:1-Math.pow(0.8,1/24), hasta:S.jugador.mes+24, evento:'bribeScandal'});
      registrar(S,'You paid '+fmt(pago)+' to a regulator. Revenue in '+p.sector+' +15%. Political risk +25.','dinero'); }},
    {t:'Report it', bot:0, fn:function(S){
      S.jugador.reputacion = clamp(S.jugador.reputacion+5,0,100);
      S.jugador.riesgoPolitico = clamp(S.jugador.riesgoPolitico+10,0,100);
      S.jugador.politica = num(S.jugador.politica,0)*1.05 + 5;
      registrar(S,'You reported the official. Reputation +5; some people in '+p.sector+' now hold a grudge.','evento'); }},
    {t:'Walk away quietly', bot:0, fn:function(S){ registrar(S,'You declined and said nothing.','evento'); }}
   ]};
 }},

{id:'lineaGrande', peso:4, decision:true,
 cond:function(S){ return S.jugador.etapa>=2 && ebitdaTotal(S)>0 && patrimonio(S)>500000 && S.economia.fase!=='recesion'; },
 gen:function(S){ return {k:U(S,1.2,1.8)}; },
 build:function(S,p){
  var monto = Math.round(patrimonio(S)*p.k);
  var tasa = clamp(S.economia.tasaInteres+0.015+spreadRep(S),0.01,0.6);
  var cuota = cuotaAnualidad(monto, tasa, 60);
  var neto = ingresoMensualNeto(S);
  return {titulo:'The bank opens the vault',
   texto:'A bank offers you a personal line of '+fmt(monto)+' ('+pct(p.k,0)+' of your net worth) at a fixed '+pct(tasa)+' for 5 years, far beyond your normal capacity. The payment would be '+fmt(cuota)+'/mo for 60 months, against your current net cash flow of '+fmt(neto)+'/mo. With that much capital you can buy almost anything on the market. Miss the payments and the bank forces sales.',
   ensena:'Cheap money is only cheap if you can carry the payments through a bad year. Fixed obligations do not shrink when revenue does.',
   termino:'apalancamiento',
   opciones:[
    {t:'Take the '+fmt(monto), bot:(neto>cuota*2?monto*0.15:-cuota*12), fn:function(S){
      S.prestamos.push({id:uid(S), principal:monto, saldo:monto, tasa:tasa, pagoMensual:cuota, mesesRestantes:60});
      S.jugador.efectivo += monto;
      prometer(S, {origen:'bigLine', titulo:'big credit line', tipo:'cond', cond:'runway', meses:3, hasta:S.jugador.mes+60, evento:'bankExecutes'});
      registrar(S,'You took a '+fmt(monto)+' line at '+pct(tasa)+'. '+fmt(cuota)+'/mo for 5 years.','dinero'); }},
    {t:'Decline', bot:0, fn:function(S){ registrar(S,'You declined the big credit line.','evento'); }}
   ]};
 }},

{id:'ciclo', peso:0, decision:false, cond:function(){return false;},
 gen:function(S){ return {fase:S.economia.fase}; },
 build:function(S,p){
  var t = {expansion:'The expansion begins', pico:'The economy hits its ceiling', recesion:'The recession arrives', recuperacion:'The recovery begins'}[p.fase]||'Cycle change';
  var d = {expansion:'Revenue grows, credit flows and multiples expand. It is the time to invest... and also when everything costs the most.',
   pico:'Everything looks perfect. Historically, it is the worst time to take on leverage.',
   recesion:'Revenue falls by up to 20%, multiples compress and the debt you took on stays intact. Those who survive, buy cheap.',
   recuperacion:'Revenue starts rising again and interest rates stay low. The best window to buy.'}[p.fase]||'';
  return {titulo:t, texto:d, ensena:'The economic cycle does not change your debt: it changes your ability to pay it.',
   opciones:[{t:'Got it', bot:0, fn:function(){}}]};
 }},

{id:'tasa', peso:0, decision:false, cond:function(){return false;},
 gen:function(S){ return {tasa:S.economia.tasaInteres}; },
 build:function(S,p){
  return {titulo:'The central bank moves the rate', texto:'The benchmark rate settles at '+pct(p.tasa)+'. All new debt will cost more (or less) and valuation multiples adjust accordingly.',
   ensena:'The rate is the price of money: it moves your cost of debt and the value of your empire at the same time.',
   termino:'bancoCentral', opciones:[{t:'Got it', bot:0, fn:function(){}}]};
 }},

{id:'ofertaCompra', peso:9, decision:true,
 cond:function(S){ var e=empresaMayor(S); return e && calcular(e,S.economia).valoracion>=50000; },
 gen:function(S){ var e=empresaMayor(S); return {id:e.id, k:U(S,1.1,1.6), r:rnd(S)}; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  var c = calcular(e,S.economia);
  var precio = Math.max(0,c.valoracion-c.deudaTotal)*e.propiedad*p.k;
  return {titulo:'They want to buy '+e.nombre+' from you',
   texto:'An investor group offers '+fmt(precio)+' for your stake in '+e.nombre+' ('+pct(e.propiedad,0)+'). Today that stake is worth '+fmt(Math.max(0,c.valoracion-c.deudaTotal)*e.propiedad)+' and generates '+fmt(c.EBITDA)+' in EBITDA per month.',
   ensena:'Selling turns future cash flow into cash today. Influence comes from recurring revenue, not from idle cash.',
   opciones:[
    {t:'Accept and sell for '+fmt(precio), bot:precio, fn:function(S){
      S.jugador.efectivo += precio; S.estadisticas.empresasVendidas++;
      S.empresas.splice(S.empresas.indexOf(e),1);
      registrar(S,'You sold '+e.nombre+' for '+fmt(precio)+'.','dinero'); }},
    {t:'Decline and keep operating', bot:0, fn:function(S){ registrar(S,'You declined the offer for '+e.nombre+'.','evento'); }},
    {t:'Counteroffer +15% ('+Math.round(clamp(0.35+0.30*(S.jugador.reputacion-30)/50,0.35,0.65)*100)+'% chance, it depends on your reputation)', bot:precio*0.6, fn:function(S){
      if(chance(S, clamp(0.35+0.30*(S.jugador.reputacion-30)/50,0.35,0.65))){ var pr=precio*1.15; S.jugador.efectivo+=pr; S.estadisticas.empresasVendidas++;
        S.empresas.splice(S.empresas.indexOf(e),1);
        registrar(S,'Counteroffer accepted: you sold '+e.nombre+' for '+fmt(pr)+'.','dinero');
      } else registrar(S,'They walked away from the table. '+e.nombre+' is still yours.','evento'); }}
   ]};
 }},

{id:'empleadoClave', peso:8, decision:true,
 cond:function(S){ var l=empresasReales(S),i; for(i=0;i<l.length;i++) if(l[i].empleados>=3) return true; return false; },
 gen:function(S){ var l=[],i; for(i=0;i<S.empresas.length;i++) if(S.empresas[i].empleados>=3) l.push(S.empresas[i].id); return {id:pick(S,l)}; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  return {titulo:'Your best person wants to leave',
   texto:'The person who keeps '+e.nombre+' running has another offer. Retaining them raises your payroll by 8% ('+fmt(e.gastosFijos*0.08)+'/mo). Letting them go costs 10% of revenue for 6 months.',
   ensena:'Talent does not show up on the balance sheet, but it holds up revenue.',
   opciones:[
    {t:'Raise salaries: +'+fmt(e.gastosFijos*0.08)+'/mo', bot:-e.gastosFijos*0.08, fn:function(S){ e.gastosFijos*=1.08; registrar(S,'You retained the key team at '+e.nombre+'.','empresa'); }},
    {t:'Let them go: -10% revenue for 6 months', bot:0, fn:function(S){ modIngresoTemporal(e,-0.10,6,'fuga'); registrar(S,'Your key people at '+e.nombre+' left.','malo'); }}
   ]};
 }},

{id:'demanda', peso:7, decision:true,
 cond:function(S){ return empresasReales(S).length>0 && ingresosAnualesTotales(S)>50000; },
 gen:function(S){ return {r:rnd(S)}; },
 build:function(S,p){
  var ia = ingresosAnualesTotales(S);
  return {titulo:'Lawsuit',
   texto:'A supplier is suing you. The out-of-court settlement costs '+fmt(ia*0.03)+' (3% of your annual revenue). Going to trial: 45% you win and collect '+fmt(ia*0.02)+' in damages plus reputation; 55% you lose, pay '+fmt(ia*0.08)+' and take a reputation hit.',
   ensena:'Legal risk is an expected cost: compare the sure payment against the average outcome of the gamble.',
   opciones:[
    {t:'Settle: '+fmt(ia*0.03), bot:-ia*0.03, fn:function(S){ cobrar(S, ia*0.03); registrar(S,'Legal settlement for '+fmt(ia*0.03)+'.','dinero'); }},
    {t:'Go to trial (45% win, 55% lose)', bot:-ia*0.035, fn:function(S){
      if(chance(S,0.45)){ S.jugador.efectivo += ia*0.02; S.jugador.reputacion=clamp(S.jugador.reputacion+2,0,100); registrar(S,'You won the case and collected '+fmt(ia*0.02)+' in damages. Reputation +2.','dinero'); }
      else { cobrar(S, ia*0.08); S.jugador.reputacion=clamp(S.jugador.reputacion-5,0,100);
             registrar(S,'You lost the case: '+fmt(ia*0.08)+' and reputation -5.','malo'); } }}
   ]};
 }},

{id:'boomSector', peso:6, decision:true,
 cond:function(S){ return true; },
 gen:function(S){ return {sector:pick(S,LISTA_SECTORES)}; },
 build:function(S,p){
  var tuyas = 0, i;
  for(i=0;i<S.empresas.length;i++) if(S.empresas[i].sector===p.sector) tuyas++;
  return {titulo:'Boom in '+p.sector,
   texto:'Capital is pouring into '+p.sector+': +2% monthly growth for 12 months across the whole sector. You have '+tuyas+' company(ies) there.',
   ensena:'Booms lift all the boats in a sector, your rivals included.',
   opciones:[
    {t:'Ride the tailwind', bot:0, fn:function(S){
      S.sectores[p.sector].modSector = 0.02; S.sectores[p.sector].modHasta = S.jugador.mes+12;
      for(var i=0;i<S.rivales.length;i++) if(S.rivales[i].sector===p.sector) S.rivales[i].influencia*=1.05;
      registrar(S,'Boom in '+p.sector+' for 12 months.','evento'); }}
   ]};
 }},

{id:'crisisSector', peso:6, decision:true,
 cond:function(S){ return empresasReales(S).length>0; },
 gen:function(S){ var l=empresasReales(S); return {sector: pick(S,l).sector}; },
 build:function(S,p){
  return {titulo:'Crisis in '+p.sector,
   texto:'The '+p.sector+' sector collapses: revenue -25% at once and -1% monthly growth for 12 months.',
   ensena:'Concentrating in one sector multiplies your influence and your exposure too.',
   opciones:[
    {t:'Weather the blow', bot:0, fn:function(S){
      aplicarATodas(S,-0.25,12,function(e){return e.sector===p.sector;});
      S.sectores[p.sector].modSector = -0.01; S.sectores[p.sector].modHasta = S.jugador.mes+12;
      registrar(S,'Crisis in '+p.sector+': revenue -25%.','malo'); }},
    {t:'Cut costs 15% in that sector', bot:0, fn:function(S){
      aplicarATodas(S,-0.25,12,function(e){return e.sector===p.sector;});
      S.sectores[p.sector].modSector = -0.01; S.sectores[p.sector].modHasta = S.jugador.mes+12;
      var l=empresasReales(S),i,d=0;
      for(i=0;i<l.length;i++) if(l[i].sector===p.sector){ l[i].gastosFijos*=0.85; d+=Math.round(l[i].empleados*0.10); l[i].empleados-=Math.round(l[i].empleados*0.10); }
      S.jugador.reputacion=clamp(S.jugador.reputacion-3,0,100); S.estadisticas.despedidos+=d;
      registrar(S,'Crisis in '+p.sector+': you cut costs and headcount.','malo'); }}
   ]};
 }},

{id:'antimonopolio', peso:10, decision:true,
 cond:function(S){ return sectorConMasParticipacion(S).part > 0.25; },
 gen:function(S){ return {sector: sectorConMasParticipacion(S).sector}; },
 build:function(S,p){
  var part = participacionSector(S,p.sector);
  var ia = 0, i;
  for(i=0;i<S.empresas.length;i++) if(S.empresas[i].sector===p.sector) ia += S.empresas[i].ingresos*12;
  var multa = ia*0.10;
  var ops = [
   {t:'Pay the fine: '+fmt(multa), bot:-multa, fn:function(S){
     cobrar(S,multa); S.jugador.reputacion=clamp(S.jugador.reputacion-3,0,100);
     registrar(S,'Antitrust fine of '+fmt(multa)+' in '+p.sector+'.','malo'); }},
   {t:'Forced sale down to 20%', bot:0, fn:function(S){
     var guard=0;
     while(participacionSector(S,p.sector)>0.20 && guard++<20){
       var l=[],j; for(j=0;j<S.empresas.length;j++) if(S.empresas[j].sector===p.sector) l.push(S.empresas[j]);
       if(!l.length) break;
       var e=l[0], c=calcular(e,S.economia);
       S.jugador.efectivo += Math.max(0,c.valoracion-c.deudaTotal)*e.propiedad*0.9;
       S.empresas.splice(S.empresas.indexOf(e),1);
     }
     registrar(S,'Forced sale in '+p.sector+' at 0.9x valuation.','malo'); }}
  ];
  if(num(S.jugador.politica,0)>=200){
    ops.push({t:'Use your political influence (spends 200 IP, 60% success)', bot:0, fn:function(S){
      S.jugador.politica-=200; S.jugador.riesgoPolitico=clamp(S.jugador.riesgoPolitico+20,0,100);
      if(chance(S,0.6)) registrar(S,'Your contacts buried the antitrust investigation.','evento');
      else { cobrar(S,multa*2); S.jugador.reputacion=clamp(S.jugador.reputacion-15,0,100);
             registrar(S,'Your attempt to influence the outcome came to light: double fine and reputation -15.','malo'); } }});
  }
  return {titulo:'Antitrust investigation in '+p.sector,
   texto:'You control '+pct(part,1)+' of the '+p.sector+' sector with '+fmt(ia)+' in annual revenue. The regulator opens a case.',
   ensena:'Above 25% of a sector, the State becomes your main competitor.',
   termino:'antimonopolio', opciones:ops};
 }},

{id:'escandalo', peso:6, decision:true,
 cond:function(S){ return S.jugador.riesgoPolitico>10 || patrimonio(S)>1e7; },
 gen:function(S){ return {r:rnd(S)}; },
 build:function(S,p){
  var medios = tieneMedios(S), base = medios?7:15;
  return {titulo:'Press scandal',
   texto:'A report on your practices is published. The hit to your reputation would be '+base+' points'+(medios?' (your media outlets cushion half of it)':'')+'. You currently have '+Math.round(S.jugador.reputacion)+'.',
   ensena:'Reputation is your cost of capital: every point lost makes your debt more expensive and shrinks your influence.',
   termino:'costoCapital',
   opciones:[
    {t:'Public apology (-'+Math.round(base*0.66)+' reputation)', bot:0, fn:function(S){
      S.jugador.reputacion=clamp(S.jugador.reputacion-base*0.66,0,100); S.jugador.politica*=0.9;
      registrar(S,'You apologized publicly. Reputation -'+Math.round(base*0.66)+'.','malo'); }},
    {t:'Deny everything (50%: +3 / 50%: -25)', bot:0, fn:function(S){
      if(chance(S,0.5)){ S.jugador.reputacion=clamp(S.jugador.reputacion+3,0,100); registrar(S,'Your version prevailed and the story died. Reputation +3.','evento'); }
      else { S.jugador.reputacion=clamp(S.jugador.reputacion-25,0,100); registrar(S,'Evidence came out. Reputation -25.','malo'); } }}
   ]};
 }},

{id:'ciber', peso:5, decision:true,
 cond:function(S){ var l=empresasReales(S),i; for(i=0;i<l.length;i++) if(l[i].sector==='Technology'||l[i].sector==='Finance') return true; return false; },
 gen:function(S){ var l=[],i; for(i=0;i<S.empresas.length;i++) if(S.empresas[i].sector==='Technology'||S.empresas[i].sector==='Finance') l.push(S.empresas[i].id);
   if(!l.length){ var r=empresasReales(S); if(!r.length) return null; l=[pick(S,r).id]; } return {id:pick(S,l)}; },
 build:function(S,p){
  var e=empresaPorId(S,p.id); if(!e) return null;
  var rescate = e.activos*0.02;
  return {titulo:'Cyberattack at '+e.nombre,
   texto:'Your systems were hijacked. The ransom is '+fmt(rescate)+' (2% of assets). Rebuilding from scratch costs 8% of revenue for 3 months.',
   ensena:'Intangible assets can be lost too.',
   opciones:[
    {t:'Pay the ransom: '+fmt(rescate), bot:-rescate, fn:function(S){ cobrar(S,rescate); S.jugador.reputacion=clamp(S.jugador.reputacion-5,0,100); registrar(S,'You paid the ransom at '+e.nombre+'.','malo'); }},
    {t:'Rebuild', bot:0, fn:function(S){ modIngresoTemporal(e,-0.08,3,'ciber'); registrar(S,'You rebuilt the systems at '+e.nombre+'.','evento'); }}
   ]};
 }},

{id:'directivo', peso:5, decision:true,
 cond:function(S){ return S.jugador.reputacion>65 && empresasReales(S).length>0; },
 gen:function(S){ var l=empresasReales(S); return {id:pick(S,l).id}; },
 build:function(S,p){
  var e=empresaPorId(S,p.id); if(!e) return null;
  var c=calcular(e,S.economia), costo=Math.max(50000,c.EBITDAanual*0.02);
  return {titulo:'A star executive is available',
   texto:'You can sign them for '+e.nombre+' at '+fmt(costo)+' a year ('+fmt(costo/12)+'/mo). They would add +1% monthly growth for 24 months.',
   ensena:'Expensive talent pays for itself only if the extra growth exceeds its cost.',
   opciones:[
    {t:'Sign them', bot:-costo/12, fn:function(S){ e.gastosFijos += costo/12; addBoost(e,{tipo:'crec',valor:0.01,meses:24}); registrar(S,'You signed a star executive for '+e.nombre+'.','empresa'); }},
    {t:'Pass', bot:0, fn:function(S){}}
   ]};
 }},

{id:'socioSale', peso:5, decision:true,
 cond:function(S){ var l=empresasReales(S),i; for(i=0;i<l.length;i++) if(l[i].propiedad<0.99) return true; return false; },
 gen:function(S){ var l=[],i; for(i=0;i<S.empresas.length;i++) if(!S.empresas[i].esEmpleo && S.empresas[i].propiedad<0.99) l.push(S.empresas[i].id);
   if(!l.length){ var r=empresasReales(S); if(!r.length) return null; l=[pick(S,r).id]; } return {id:pick(S,l)}; },
 build:function(S,p){
  var e=empresaPorId(S,p.id); if(!e) return null;
  var c=calcular(e,S.economia);
  var fraccion = (1-num(e.propiedad,1)) || 0.15;
  var parteSocio = Math.max(0,c.valoracion-c.deudaTotal)*fraccion;
  var precio = parteSocio*0.85;
  return {titulo:'Your partner wants out of '+e.nombre,
   texto:'Their '+pct(fraccion,1)+' is worth '+fmt(parteSocio)+' and they offer it to you at a 15% discount: '+fmt(precio)+'. If you do not buy, they will sell to a rival.',
   ensena:'Control (>50%) multiplies your influence by 1; below that, it gets divided.',
   opciones:[
    {t:'Buy their share: '+fmt(precio), bot:-precio, fn:function(S){
      if(precio>S.jugador.efectivo){ registrar(S,'You had no cash: the partner sold to a rival.','malo'); e.propiedad=clamp(e.propiedad*0.9,0,1); return; }
      S.jugador.efectivo-=precio; e.propiedad=1; registrar(S,'You bought your partner\'s share in '+e.nombre+'.','empresa'); }},
    {t:'Let them sell to a rival', bot:0, fn:function(S){
      e.propiedad = clamp(e.propiedad*0.85,0,1);
      if(S.rivales.length){ var r=pick(S,S.rivales); r.influencia += parteSocio/1e6; registrar(S, r.nombre+' took a stake in '+e.nombre+'.','malo'); } }}
   ]};
 }},

{id:'vencimientoBonos', peso:0, decision:true, cond:function(){return false;},
 gen:function(S){
   var i, e, r = empresasReales(S);
   for(i=0;i<r.length;i++) if(r[i].bonos.length) return {id:r[i].id, bono:r[i].bonos[0].id};
   if(!r.length) return null;
   e = r[0];
   var b = {id:uid(S), principal:Math.max(100000, calcular(e,S.economia).EBITDAanual), tasa:clamp(S.economia.tasaInteres+0.02,0.01,0.5), mesVencimiento:S.jugador.mes, avisado:true};
   e.bonos.push(b);
   return {id:e.id, bono:b.id}; },
 build:function(S,p){
  var e=empresaPorId(S,p.id), b=null, i;
  if(!e) return null;
  for(i=0;i<e.bonos.length;i++) if(e.bonos[i].id===p.bono) b=e.bonos[i];
  if(!b) return null;
  var nuevaTasa = clamp(S.economia.tasaInteres+0.015+spreadRep(S),0.01,0.5);
  return {titulo:'Bonds mature at '+e.nombre,
   texto:'You must repay '+fmt(b.principal)+' today, or refinance for 5 more years at '+pct(nuevaTasa)+' (you issued at '+pct(b.tasa)+').',
   ensena:'Refinancing risk: debt is not repaid, it is renewed... at whatever rate exists that day.',
   termino:'bonos',
   opciones:[
    {t:'Refinance at '+pct(nuevaTasa), bot:0, fn:function(S){ b.tasa=nuevaTasa; b.mesVencimiento=S.jugador.mes+60; registrar(S,'You refinanced '+fmt(b.principal)+' at '+pct(nuevaTasa)+'.','dinero'); }},
    {t:'Repay the principal: '+fmt(b.principal), bot:-b.principal, fn:function(S){
      var falta = b.principal - Math.max(0,e.caja);
      e.caja -= Math.min(b.principal, Math.max(0,e.caja));
      if(falta>0){ cobrar(S, falta); }
      e.bonos.splice(e.bonos.indexOf(b),1);
      S.jugador.reputacion=clamp(S.jugador.reputacion+1,0,100);
      registrar(S,'You repaid '+fmt(b.principal)+' in bonds at '+e.nombre+'.','dinero'); }}
   ]};
 }},

{id:'covenant', peso:8, decision:true,
 cond:function(S){ var l=empresasReales(S),i; for(i=0;i<l.length;i++) if(calcular(l[i],S.economia).apalancamiento>6) return true; return false; },
 gen:function(S){ var l=[],i; for(i=0;i<S.empresas.length;i++) if(!S.empresas[i].esEmpleo && calcular(S.empresas[i],S.economia).apalancamiento>6) l.push(S.empresas[i].id);
   if(!l.length){ var r=empresasReales(S); if(!r.length) return null; l=[pick(S,r).id]; } return {id:pick(S,l)}; },
 build:function(S,p){
  var e=empresaPorId(S,p.id); if(!e) return null;
  var c=calcular(e,S.economia);
  return {titulo:'The bank triggers a covenant at '+e.nombre,
   texto:'Leverage '+c.apalancamiento.toFixed(1)+'x. The bank demands you pay down 20% of the debt ('+fmt(e.deuda*0.2)+') or it raises your rate by 3 points.',
   ensena:'Covenants turn a bad year into a liquidity crisis.',
   termino:'apalancamiento',
   opciones:[
    {t:'Pay the 20%: '+fmt(e.deuda*0.2), bot:-e.deuda*0.2, fn:function(S){
      var m=e.deuda*0.2, deCaja=Math.min(m,Math.max(0,e.caja));
      e.caja-=deCaja; cobrar(S, m-deCaja); e.deuda-=m;
      registrar(S,'You paid down '+fmt(m)+' at '+e.nombre+'.','dinero'); }},
    {t:'Accept a +3% rate', bot:0, fn:function(S){ e.tasaDeuda=clamp(e.tasaDeuda+0.03,0,0.6); registrar(S,'The rate at '+e.nombre+' rises to '+pct(e.tasaDeuda)+'.','malo'); }},
    {t:'Hand the bank 10% of the company (debt-for-equity)', bot:-c.valorParticipacion*0.1, fn:function(S){
      e.propiedad = clamp(e.propiedad*0.90, 0, 1); e.deuda = Math.max(0, e.deuda*0.85);
      registrar(S,'The bank took 10% of '+e.nombre+' and forgave 15% of its debt. Your share: '+pct(e.propiedad,1)+'.','malo'); }}
   ]};
 }},

{id:'suerte', peso:3, decision:true,
 cond:function(S){ return empresasReales(S).length>0; },
 gen:function(S){ return {}; },
 build:function(S,p){
  var e=empresaMayor(S); if(!e) return null;
  var monto = e.ingresos*2;
  return {titulo:'Unexpected contract',
   texto:'A big client suddenly signs with '+e.nombre+': '+fmt(monto)+' in cash.',
   ensena:'Luck exists. It is not a strategy.',
   opciones:[{t:'Collect '+fmt(monto), bot:monto, fn:function(S){ S.jugador.efectivo+=monto; registrar(S,'Unexpected contract: +'+fmt(monto)+'.','dinero'); }}]};
 }},

{id:'enfermedad', peso:4, decision:true,
 cond:function(S){ return edad(S)>50; },
 gen:function(S){ return {}; },
 build:function(S,p){
  var meses = (S.flags.holding||S.flags.ceo) ? 2 : 6;
  return {titulo:'Health problem',
   texto:'Doctors order you to stop for '+meses+' months. '+(meses===2?'Your structure (CEO/holding company) keeps operations running.':'Without a CEO or holding company, nobody decides for you.'),
   ensena:'An organization that depends on you is not an empire, it is an expensive job.',
   opciones:[{t:'Accept the rest', bot:0, fn:function(S){
     S.jugador.incapacitadoHasta = S.jugador.mes + meses;
     registrar(S,'You will be out of the game for '+meses+' months.','malo'); }}]};
 }},

{id:'gobierno', peso:5, decision:true,
 cond:function(S){ return true; },
 gen:function(S){ return {sube: chance(S,0.5)}; },
 build:function(S,p){
  var ops = [];
  if(num(S.jugador.politica,0)>=300){
    ops.push({t:'Use your influence: 20% tax (political risk +10)', bot:0, fn:function(S){
      S.economia.impuestoCorporativo=0.20; S.economia.impuestoHasta=S.jugador.mes+144;
      S.jugador.riesgoPolitico=clamp(S.jugador.riesgoPolitico+10,0,100);
      registrar(S,'You pulled strings: corporate tax at 20% for 12 years.','evento'); }});
  }
  ops.push({t:'Accept whatever the new government decides', bot:0, fn:function(S){
    S.economia.impuestoCorporativo = p.sube?0.30:0.20; S.economia.impuestoHasta=S.jugador.mes+144;
    registrar(S,'New government: corporate tax at '+pct(S.economia.impuestoCorporativo,0)+' for 12 years.','evento'); }});
  return {titulo:'Change of government',
   texto:'A tax reform is announced: corporate tax would go from '+pct(S.economia.impuestoCorporativo,0)+' to '+(p.sube?'30%':'20%')+' for 12 years.',
   ensena:'Tax takes the same share of every dollar of profit, forever.',
   opciones:ops};
 }},

{id:'huelga', peso:6, decision:true,
 cond:function(S){ return (empleadosTotales(S)>500 && S.jugador.reputacion<40) || (S.jugador.mes - num(S.flags.despidoMasivoMes,-99) < 3); },
 gen:function(S){ var l=empresasReales(S); return {id: l.length?pick(S,l).id:0}; },
 build:function(S,p){
  var e=empresaPorId(S,p.id); if(!e) return null;
  return {titulo:'Strike at '+e.nombre,
   texto:'The workforce halts production: -15% revenue until resolved. Raising salaries by 10% costs '+fmt(e.gastosFijos*0.10)+'/mo forever.',
   ensena:'Your reputation with your employees is also a financial cost.',
   opciones:[
    {t:'Raise salaries 10%', bot:-e.gastosFijos*0.1, fn:function(S){ e.gastosFijos*=1.10; S.jugador.reputacion=clamp(S.jugador.reputacion+2,0,100); registrar(S,'Agreement with the workforce at '+e.nombre+'.','empresa'); }},
    {t:(S.jugador.reputacion>60?'Hold out (your reputation should break it in a month)':'Hold out for 3 months'), bot:0, fn:function(S){
      if(S.jugador.reputacion>60){ modIngresoTemporal(e,-0.15,1,'huelga'); S.jugador.reputacion=clamp(S.jugador.reputacion-2,0,100); registrar(S,'The strike at '+e.nombre+' collapsed after a month: the workforce trusted you more than the union.','evento'); }
      else { modIngresoTemporal(e,-0.15,3,'huelga'); S.jugador.reputacion=clamp(S.jugador.reputacion-5,0,100); registrar(S,'You held out through the strike at '+e.nombre+'.','malo'); } }}
   ]};
 }},

{id:'disrupcion', peso:5, decision:true,
 cond:function(S){ var l=empresasReales(S),i; for(i=0;i<l.length;i++) if(l[i].sector!=='Technology') return true; return false; },
 gen:function(S){ return {}; },
 build:function(S,p){
  var l=empresasReales(S), afect=[], i, costo=0;
  for(i=0;i<l.length;i++) if(l[i].sector!=='Technology'){ afect.push(l[i]); costo += l[i].activos*0.05; }
  return {titulo:'Disruptive innovation',
   texto:'A new technology threatens your '+afect.length+' non-technology company(ies): -1% monthly growth for 24 months, unless you invest '+fmt(costo)+' now to modernize them.',
   ensena:'Not investing is also a decision, and it has a price.',
   opciones:[
    {t:'Invest '+fmt(costo)+' in modernizing', bot:-costo, fn:function(S){
      if(costo>S.jugador.efectivo){ for(var j=0;j<afect.length;j++) addBoost(afect[j],{tipo:'crec',valor:-0.01,meses:24}); registrar(S,'You had no cash to modernize.','malo'); return; }
      S.jugador.efectivo-=costo;
      for(var k=0;k<afect.length;k++){ afect[k].activos += afect[k].activos*0.05; }
      registrar(S,'You modernized your operations for '+fmt(costo)+'.','empresa'); }},
    {t:'Do not invest', bot:0, fn:function(S){
      for(var j=0;j<afect.length;j++) addBoost(afect[j],{tipo:'crec',valor:-0.01,meses:24});
      registrar(S,'Your traditional companies lose momentum for 24 months.','malo'); }}
   ]};
 }},

{id:'fusionRival', peso:3, decision:true,
 cond:function(S){
   if(S.jugador.etapa<3) return false;
   for(var i=0;i<S.rivales.length;i++) if(S.rivales[i].influencia < Math.max(1,S.influencia.total)*3) return true;
   return false; },
 gen:function(S){ var l=[],i; for(i=0;i<S.rivales.length;i++) if(S.rivales[i].influencia < Math.max(1,S.influencia.total)*3) l.push(S.rivales[i].id); return {rid:pick(S,l)}; },
 build:function(S,p){
  var r = rivalPorId(S,p.rid); if(!r) return null;
  var miInf = Math.max(1,S.influencia.total);
  var prop = miInf/(miInf+r.influencia);
  return {titulo:r.nombre+' proposes merging empires',
   texto:'Your influence is '+pi(miInf)+' and theirs is '+pi(r.influencia)+'. In the resulting group you would keep '+pct(prop,1)+'.'+(prop<0.5?' You would fall below 50%: you would lose control of everything.':''),
   ensena:'Merging with someone bigger adds size and subtracts control. Control is what turns revenue into influence.',
   termino:'mya',
   opciones:[
    {t:'Accept the merger', bot:0, fn:function(S){
      var i;
      if(prop<0.5){ for(i=0;i<S.empresas.length;i++) if(!S.empresas[i].esEmpleo) S.empresas[i].propiedad=clamp(S.empresas[i].propiedad*0.49/Math.max(0.5,S.empresas[i].propiedad),0.3,0.5); }
      S.jugador.politica += r.influencia*(prop>=0.5?0.25:0.15);
      r.vivo=false;
      registrar(S,'You merged your empire with that of '+r.nombre+'.','empresa'); }},
    {t:'Decline', bot:0, fn:function(S){ r.hostilHasta=S.jugador.mes+24; registrar(S,'You declined '+r.nombre+'. They now consider you an enemy.','evento'); }}
   ]};
 }},

{id:'muerteRival', peso:4, decision:true,
 cond:function(S){ return S.rivales.length>3; },
 gen:function(S){ var i=ri(S,0,S.rivales.length-1); return {rid:S.rivales[i].id}; },
 build:function(S,p){
  var r=rivalPorId(S,p.rid); if(!r) return null;
  return {titulo:r.nombre+' has died',
   texto:'The titan of '+r.pais+' ('+r.sector+') has died. Their companies hit the market at a 20% discount for 3 months.',
   ensena:'Death redistributes empires. Yours will be carved up someday too.',
   opciones:[{t:'Get the checkbook ready', bot:0, fn:function(S){
     r.vivo=false; S.flags.liquidacionHasta = S.jugador.mes+3; S.mercado.generadoEnMes=-1;
     registrar(S,'The empire of '+r.nombre+' hits the market at a discount.','evento'); }}]};
 }},

{id:'burbuja', peso:5, decision:true,
 cond:function(S){ var l=empresasReales(S),i; for(i=0;i<l.length;i++) if(l[i].esEdificio) return true; return false; },
 gen:function(S){ return {}; },
 build:function(S,p){
  var l=empresasReales(S), n=0, i;
  for(i=0;i<l.length;i++) if(l[i].esEdificio) n++;
  return {titulo:'The real estate bubble bursts',
   texto:'Your '+n+' propert(y/ies) lose 30% of their value at once. Mortgages do not go down.',
   ensena:'The asset can fall; the debt against that asset never does.',
   opciones:[{t:'Take the loss', bot:0, fn:function(S){
     var l2=empresasReales(S),j;
     for(j=0;j<l2.length;j++) if(l2[j].esEdificio) l2[j].activos*=0.7;
     registrar(S,'The real estate bubble took 30% of the value of your buildings.','malo'); }}]};
 }},

{id:'rescateBancario', peso:5, decision:true,
 cond:function(S){ return tieneBanco(S) && S.economia.fase==='recesion'; },
 gen:function(S){ return {}; },
 build:function(S,p){
  var e=null,i;
  for(i=0;i<S.empresas.length;i++) if(S.empresas[i].sector==='Finance' && esControlada(S.empresas[i])) e=S.empresas[i];
  if(!e) e = empresaMayor(S);
  if(!e) return null;
  return {titulo:'Your bank needs capital',
   texto:'The recession blew a hole in the balance sheet of '+e.nombre+'. The State offers a bailout of '+fmt(e.activos*0.2)+' in exchange for you giving up politics, or you put in '+fmt(e.activos*0.1)+' out of your own pocket.',
   ensena:'Being "too big to fail" saves you and subjugates you at the same time.',
   opciones:[
    {t:'Accept the public bailout', bot:e.activos*0.2, fn:function(S){
      e.caja += e.activos*0.2; S.jugador.politica*=0.7; S.jugador.reputacion=clamp(S.jugador.reputacion+5,0,100);
      S.jugador.riesgoPolitico=0; registrar(S,'You accepted the public bailout of '+e.nombre+'.','evento'); }},
    {t:'Your own capital: '+fmt(e.activos*0.1), bot:-e.activos*0.1, fn:function(S){
      cobrar(S, e.activos*0.1); e.caja += e.activos*0.1; S.jugador.reputacion=clamp(S.jugador.reputacion+3,0,100);
      registrar(S,'You recapitalized '+e.nombre+' with your own money.','dinero'); }}
   ]};
 }},

{id:'periodista', peso:6, decision:true,
 cond:function(S){ return S.jugador.riesgoPolitico>50; },
 gen:function(S){ return {}; },
 build:function(S,p){
  return {titulo:'A journalist is investigating your lobbying',
   texto:'She has documents on your political spending ('+Math.round(S.jugador.politica)+' IP accumulated) and your political risk is at '+Math.round(S.jugador.riesgoPolitico)+'/100.',
   ensena:'Power accumulated in the shadows is paid back with interest when it comes to light.',
   termino:'riesgoPolitico',
   opciones:[
    {t:'Buy her silence', bot:0, fn:function(S){
      S.jugador.riesgoPolitico=clamp(S.jugador.riesgoPolitico+10,0,100);
      if(chance(S,0.4)){ S.jugador.reputacion=clamp(S.jugador.reputacion-20,0,100); registrar(S,'It came out that you bought silence: reputation -20.','malo'); }
      else registrar(S,'The story was never published.','evento'); }},
    {t:'Total transparency', bot:0, fn:function(S){
      S.jugador.politica*=0.75; S.jugador.reputacion=clamp(S.jugador.reputacion+5,0,100);
      S.jugador.riesgoPolitico=clamp(S.jugador.riesgoPolitico-20,0,100);
      registrar(S,'You opened your political books. You lose power, you gain legitimacy.','evento'); }}
   ]};
 }},

{id:'reconocimiento', peso:4, decision:true,
 cond:function(S){ return S.jugador.reputacion>80; },
 gen:function(S){ return {}; },
 build:function(S,p){
  return {titulo:'Public recognition',
   texto:'You are named Entrepreneur of the Year. Your reputation ('+Math.round(S.jugador.reputacion)+') opens doors that money cannot.',
   ensena:'High reputation is the only asset that appreciates on its own.',
   opciones:[{t:'Accept the award', bot:0, fn:function(S){
     S.jugador.politica*=1.10; S.jugador.reputacion=clamp(S.jugador.reputacion+2,0,100);
     registrar(S,'Entrepreneur of the Year. Reputation +2.','evento'); }}]};
 }},

{id:'pandemia', peso:7, decision:true,
 cond:function(S){ var a=anoJuego(S); return !S.flags.pandemiaHecha && a>=10 && a<=45; },
 gen:function(S){ return {}; },
 build:function(S,p){
  return {titulo:'Global pandemic',
   texto:'The world grinds to a halt. All your companies fall 30% for 6 months, except Healthcare and Technology, which rise 20%. The economy enters a recession.',
   ensena:'Diversifying across sectors does not avoid the blow: it spreads it out.',
   opciones:[{t:'Face it', bot:0, fn:function(S){
     S.flags.pandemiaHecha=true;
     aplicarATodas(S,-0.30,6,function(e){ return e.sector!=='Healthcare'&&e.sector!=='Technology'; });
     aplicarATodas(S, 0.20,6,function(e){ return e.sector==='Healthcare'||e.sector==='Technology'; });
     S.economia.fase='recesion'; S.economia.mesesEnFase=0; S.economia.duracionFase=ri(S,9,18);
     registrar(S,'Global pandemic. Forced recession.','malo'); }}]};
 }},

{id:'guerraComercial', peso:5, decision:true,
 cond:function(S){ return true; },
 gen:function(S){ return {}; },
 build:function(S,p){
  return {titulo:'Trade war',
   texto:'Tariffs everywhere: Manufacturing and Transportation -15%, Energy +20%, for 12 months.',
   ensena:'Geopolitics hands out winners and losers inside your own portfolio.',
   opciones:[{t:'Reshuffle the portfolio', bot:0, fn:function(S){
     aplicarATodas(S,-0.15,12,function(e){ return e.sector==='Manufacturing'||e.sector==='Transportation'; });
     aplicarATodas(S, 0.20,12,function(e){ return e.sector==='Energy'; });
     registrar(S,'Trade war: Manufacturing and Transportation fall, Energy rises.','evento'); }}]};
 }},

{id:'despido', peso:6, decision:true,
 cond:function(S){ return !!tieneEmpleo(S) && S.economia.fase==='recesion'; },
 gen:function(S){ return {}; },
 build:function(S,p){
  return {titulo:'You got fired',
   texto:'The recession took your job. You are left without that steady income.',
   ensena:'A job is a single client that can fire you. Diversifying income is diversifying risk.',
   opciones:[
    {t:'Look for another job (2 months without income)', bot:0, fn:function(S){
      var e=tieneEmpleo(S); if(e) S.empresas.splice(S.empresas.indexOf(e),1);
      S.jugador.buscandoEmpleo=2; registrar(S,'You lost your job. Looking for another one.','malo'); }},
    {t:'Run your businesses full time', bot:0, fn:function(S){
      var e=tieneEmpleo(S); if(e) S.empresas.splice(S.empresas.indexOf(e),1);
      S.jugador.efectivo += 1500;
      registrar(S,'You lost your job and decided to focus on your own ventures. Your companies get your full-time attention.','evento'); }}
   ]};
 }},

{id:'alianzaTitanes', peso:6, decision:true,
 cond:function(S){ return S.jugador.etapa>=4 && posicionJugador(S)<=5; },
 gen:function(S){ return {rid: S.rivales.length?S.rivales[0].id:0}; },
 build:function(S,p){
  var r = rivalPorId(S,p.rid);
  var costo = patrimonio(S)*0.02;
  return {titulo:'Titan alliance against you',
   texto:'The top five in the ranking agree to block you: you will not be able to buy in their sectors for 24 months and your political risk rises by 15.',
   ensena:'At the top, your competitors stop competing with each other and start competing against you.',
   opciones:[
    {t:'Deal with one: '+fmt(costo), bot:-costo, fn:function(S){
      cobrar(S,costo); if(r) r.pactoHasta=S.jugador.mes+36;
      registrar(S,'You broke up the alliance by paying '+fmt(costo)+'.','evento'); }},
    {t:'Resist', bot:0, fn:function(S){
      S.flags.alianzaHasta = S.jugador.mes+24;
      S.jugador.riesgoPolitico=clamp(S.jugador.riesgoPolitico+15,0,100);
      S.jugador.politica*=0.8;
      registrar(S,'You resisted the titan alliance. 24 months of blockade.','malo'); }}
   ]};
 }}
];

function eventoPorId(id){ for(var i=0;i<EVENTOS.length;i++) if(EVENTOS[i].id===id) return EVENTOS[i]; return null; }

function generarEvento(S, forzarId){
  var cand = [], pesos = [], i, ev;
  for(i=0;i<EVENTOS.length;i++){
    ev = EVENTOS[i];
    if(forzarId){ if(ev.id===forzarId){ cand=[ev]; pesos=[1]; break; } continue; }
    if(ev.peso<=0) continue;
    var ok = true;
    try { ok = ev.cond(S); } catch(e){ ok = false; }
    if(!ok) continue;
    var w = ev.peso;
    var malo = ['escandalo','demanda','huelga','antimonopolio','periodista','ciber','crisisSector','covenant','disrupcion','despido'].indexOf(ev.id)>=0;
    if(malo && S.jugador.reputacion<35) w*=1.5;
    if(!malo && S.jugador.reputacion>70) w*=1.5;
    if(ev.id==='escandalo'||ev.id==='periodista'||ev.id==='antimonopolio') w *= (1+num(S.jugador.riesgoPolitico,0)/40);
    if(ev.id==='escandalo' && typeof perk==='function') w *= perk(S,'escandalo');
    if(S.flags.hostilHasta>S.jugador.mes && malo) w*=1.5;
    cand.push(ev); pesos.push(w);
  }
  if(!cand.length) return null;
  ev = pickW(S, cand, pesos);
  var params;
  try { params = ev.gen(S); } catch(e){ return null; }
  if(params===null || params===undefined) return null;
  var inst;
  try { inst = ev.build(S, params); } catch(e){ return null; }
  if(!inst) return null;
  return {id:ev.id, params:params};
}
function construirEvento(S, ref){
  if(!ref) return null;
  var ev = eventoPorId(ref.id);
  if(!ev) return null;
  var inst;
  try { inst = ev.build(S, ref.params||{}); } catch(e){ return null; }
  return inst;
}
function resolverEvento(S, idx){
  var inst = construirEvento(S, S.eventoActual);
  if(!inst){ S.eventoActual=null; return null; }
  var op = inst.opciones[clamp(idx,0,inst.opciones.length-1)];
  try { op.fn(S); } catch(e){ }
  S.eventoActual = null;
  return inst;
}
function mejorOpcionBot(inst){
  var mejor=0, v=-Infinity, i;
  for(i=0;i<inst.opciones.length;i++){
    var b = num(inst.opciones[i].bot,0);
    if(b>v){ v=b; mejor=i; }
  }
  return mejor;
}
