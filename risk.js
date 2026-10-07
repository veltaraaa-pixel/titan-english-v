'use strict';
/* Riesgo real, ledger de consecuencias, distress e insolvencia (Fase 1) */

/* ---------- Risk score 0-100 ---------- */
function riskScore(S){
  var j = S.jugador, eco = S.economia, reales = empresasReales(S), i, e, c;
  var partes = {leverage:0, concentracion:0, runway:0, ciclo:0, vencimientos:0, personal:0};
  var deuda = 0, ebitda = 0, pat = Math.max(1, patrimonio(S)), mayorVal = 0, ebitdaNeg = false;
  for(i=0;i<reales.length;i++){
    e = reales[i]; c = calcular(e, eco);
    if(!esControlada(e)) continue;
    deuda += c.deudaTotal; ebitda += c.EBITDAanual;
    if(c.deudaTotal>0 && c.EBITDAanual<=0) ebitdaNeg = true;
    if(c.valorParticipacion > mayorVal) mayorVal = c.valorParticipacion;
  }
  var lev = ebitda>0 ? deuda/ebitda : (deuda>0 ? 9 : 0);
  if(ebitdaNeg) lev = Math.max(lev, 7);
  partes.leverage = lev<=1 ? 0 : lev<=2 ? 8 : lev<=3 ? 16 : lev<=4 ? 26 : lev<=6 ? 38 : 48;
  if(deuda <= 0) partes.leverage = 0;
  var conc = mayorVal/pat;
  partes.concentracion = conc>0.9 ? 14 : conc>0.75 ? 9 : conc>0.5 ? 4 : 0;
  var neto = ingresoMensualNeto(S);
  if(j.efectivo < 0) partes.runway = 24;
  else if(neto < 0){
    var run = j.efectivo/Math.max(1,-neto);
    partes.runway = run<3 ? 20 : run<6 ? 12 : run<12 ? 6 : 0;
  }
  if(eco.fase==='pico') partes.ciclo = lev>2 ? 12 : 6;
  else if(eco.fase==='expansion' && eco.mesesEnFase>=36) partes.ciclo = lev>2 ? 7 : 3;
  else if(eco.fase==='recesion') partes.ciclo = lev>2 ? 12 : 4;
  var liquidez = Math.max(0,j.efectivo), venc = 0;
  for(i=0;i<reales.length;i++){ e = reales[i]; liquidez += Math.max(0,e.caja);
    for(var k=0;k<(e.bonos||[]).length;k++){ var f = num(e.bonos[k].mesVencimiento,0)-j.mes; if(f>=0 && f<=12) venc += num(e.bonos[k].principal,0); } }
  if(venc>0) partes.vencimientos = venc > liquidez ? 12 : venc > liquidez*0.5 ? 6 : 2;
  var pagos = 0; for(i=0;i<S.prestamos.length;i++) pagos += num(S.prestamos[i].pagoMensual,0);
  var ingBruto = neto + pagos + num(j.costoDeVida,0);
  if(pagos>0) partes.personal = ingBruto<=0 ? 10 : pagos/ingBruto > 0.6 ? 10 : pagos/ingBruto > 0.35 ? 5 : 0;
  var score = clamp(partes.leverage+partes.concentracion+partes.runway+partes.ciclo+partes.vencimientos+partes.personal, 0, 100);
  var nivel = score<25 ? 'low' : score<50 ? 'moderate' : score<75 ? 'high' : 'critical';
  return {score:Math.round(score), nivel:nivel, partes:partes, leverage:lev, concentracion:conc};
}
function spreadRiesgo(S){
  var r = riskScore(S);
  return Math.max(0, r.score-25)/100 * 0.04;   /* 0% a 3% extra */
}
function spreadDefault(S){
  return num(S.flags.defaultHasta,0) > S.jugador.mes ? 0.03 : 0;
}
/* factor 1..0.4 que reduce la capacidad de credito con riesgo alto */
function factorCredito(S){
  var r = riskScore(S);
  var f = 1 - Math.max(0, r.score-45)/100;
  if(num(S.flags.defaultHasta,0) > S.jugador.mes) f *= 0.6;
  return clamp(f, 0.3, 1);
}

/* ---------- Ledger de consecuencias ---------- */
function prometer(S, p){
  if(!S.ledger) S.ledger = [];
  p.id = uid(S); p.mesCreado = S.jugador.mes; p.ano = anoJuego(S);
  S.ledger.push(p);
  return p;
}
function ledgerDeEmpresa(S, empId){
  var l = [], i; if(!S.ledger) return l;
  for(i=0;i<S.ledger.length;i++) if(S.ledger[i].emp===empId) l.push(S.ledger[i]);
  return l;
}
function revisarLedger(S){
  if(!S.ledger || !S.ledger.length) return null;
  var i, p, e, c, fire = null, vivos = [];
  for(i=0;i<S.ledger.length;i++){
    p = S.ledger[i];
    if(p.hasta !== undefined && S.jugador.mes > p.hasta){
      if(p.origen==='lbo' || p.origen==='doubleDown') registrar(S, 'The risk from your '+p.titulo+' has passed without incident.', 'evento');
      continue;
    }
    e = p.emp ? empresaPorId(S, p.emp) : null;
    if(p.emp && !e) continue;                 /* la empresa ya no es tuya: la promesa muere */
    var ok = false;
    if(p.tipo==='mes') ok = S.jugador.mes >= p.mes;
    else if(p.tipo==='prob') ok = chance(S, num(p.p,0));
    else if(p.cond==='ebitdaDrop'){ c = calcular(e, S.economia); ok = num(e.ebitdaPico,0)>0 && c.EBITDA < num(e.ebitdaPico,0)*(1-num(p.pct,0.3)) && c.deudaTotal>0 && S.jugador.mes >= p.mesCreado+3; }
    else if(p.cond==='recession') ok = S.economia.fase==='recesion';
    else if(p.cond==='runway'){ var neto = ingresoMensualNeto(S); ok = S.jugador.efectivo < 0 || (neto<0 && S.jugador.efectivo/Math.max(1,-neto) < num(p.meses,3)); }
    if(ok && !fire){ fire = p; continue; }
    vivos.push(p);
  }
  S.ledger = vivos;
  if(!fire) return null;
  var params = {}, k; for(k in fire) if(fire.hasOwnProperty(k)) params[k] = fire[k];
  params.ledgerId = fire.id; params.id = fire.emp||0;
  return {id:fire.evento, params:params};
}

/* ---------- Distress organico: empresas apalancadas que no cubren intereses ---------- */
function revisarDistress(S){
  var i, e, c, l = empresasReales(S);
  for(i=0;i<l.length;i++){
    e = l[i]; c = calcular(e, S.economia);
    if(c.deudaTotal>0 && c.EBITDA < c.intereses) e.mesesInteresImpago = num(e.mesesInteresImpago,0)+1; else e.mesesInteresImpago = 0;
    if(e.mesesInteresImpago>=2 && c.apalancamiento>5 && S.jugador.mes - num(e.ultimoDistress,-99) >= 12){
      e.ultimoDistress = S.jugador.mes;
      return {id:'distress', params:{id:e.id, origen:'organic', titulo:e.nombre, ano:anoJuego(S)}};
    }
  }
  return null;
}

/* ---------- Insolvencia personal: pierdes lo endeudado y sigues ---------- */
function insolvenciaPersonal(S){
  var j = S.jugador, i, e, perdidas = [], conservadas = 0;
  for(i=S.empresas.length-1;i>=0;i--){
    e = S.empresas[i];
    if(e.esEmpleo) continue;
    if(calcular(e,S.economia).deudaTotal > 0){ perdidas.push(e.nombre); S.empresas.splice(i,1); }
    else conservadas++;
  }
  for(i=S.startups.length-1;i>=0;i--){ venderStartup(S, S.startups[i]); }
  S.prestamos = [];
  if(j.efectivo < 0) j.efectivo = 0;
  j.reputacion = clamp(j.reputacion-30, 0, 100);
  j.mesesEfectivoNeg = 0;
  S.flags.defaultHasta = j.mes + 60;
  S.flags.insolvencias = num(S.flags.insolvencias,0)+1;
  S.ledger = [];
  registrar(S, 'Personal insolvency. The banks took '+(perdidas.length?perdidas.join(', '):'nothing')+' and wrote off your personal loans. Reputation -30; credit will be scarce and expensive for 5 years. '+(conservadas?'You keep '+conservadas+' debt-free compan'+(conservadas>1?'ies':'y')+'.':'You start again from zero.'), 'malo');
  if(S.flags.insolvencias >= 3) return 'fin';
  if(!conservadas && edad(S) >= 60) return 'fin';
  return 'sigue';
}

/* ---------- Eventos de consecuencia ---------- */
function _origenTexto(p){
  var o = {lbo:'leveraged buyout', bigLine:'big credit line', doubleDown:'double-down', bribe:'payment to a regulator', organic:'leverage'}[p.origen] || 'decision';
  return 'Consequence of your '+o+(p.ano?' in year '+p.ano:'')+': ';
}

EVENTOS.push(
{id:'distress', peso:0, decision:true, cond:function(){return false;},
 gen:function(S){ var e=empresaMayor(S); return e?{id:e.id, origen:'organic', titulo:e.nombre, ano:anoJuego(S)}:null; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  var c = calcular(e,S.economia), pre = _origenTexto(p);
  var pico = Math.max(num(e.ebitdaPico,0), c.EBITDA, 1);
  var caida = clamp(1 - c.EBITDA/pico, 0, 1);
  var hueco = Math.max(0, c.intereses - c.EBITDA);
  var iny = Math.max(e.deuda*0.15, Math.max(0,-e.caja) + hueco*6, 1000);
  var venta = Math.max(0, precioVenta(S,e,1)*0.65);
  var activosVenta = e.activos*0.25, ingresoActivos = activosVenta*0.7;
  var puedeRefi = S.jugador.reputacion >= 35 && num(S.flags.defaultHasta,0) <= S.jugador.mes;
  var ops = [
    {t:'Inject '+fmt(iny)+' of your own money', bot:(caida<0.5?c.EBITDA*6:-iny), fn:function(S){
      var m = Math.min(iny, Math.max(0,S.jugador.efectivo));
      if(m < iny*0.5){ registrar(S, pre+'you could not raise '+fmt(iny)+'. Nothing changes at '+e.nombre+'.','malo'); return; }
      S.jugador.efectivo -= m; e.caja += m*0.5; e.deuda = Math.max(0, e.deuda - m*0.5); e.mesesInteresImpago = 0;
      prometer(S, {origen:'organic', titulo:e.nombre+' rescue', emp:e.id, tipo:'cond', cond:'ebitdaDrop', pct:0.25, hasta:S.jugador.mes+18, evento:'distress'});
      registrar(S, pre+'you injected '+fmt(m)+' into '+e.nombre+'. Half paid down debt. If it slips again, you will be back here.','dinero'); }},
    {t:'Cut costs 20% (lay off 15%, revenue -8%)', bot:c.gastosFijos*0.2*12, fn:function(S){
      var d = Math.round(e.empleados*0.15); e.gastosFijos *= 0.80; e.empleados = Math.max(1, e.empleados-d); e.ingresos *= 0.92;
      S.estadisticas.despedidos += d; S.jugador.reputacion = clamp(S.jugador.reputacion-4,0,100); e.mesesInteresImpago = 0;
      registrar(S, pre+'you cut '+e.nombre+' to the bone: '+d+' people out, costs -20%, revenue -8%, reputation -4.','malo'); }}
  ];
  if(puedeRefi) ops.push({t:'Refinance: +2.5% rate, '+fmt(c.intereses*6)+' of breathing room', bot:0, fn:function(S){
      e.tasaDeuda = clamp(e.tasaDeuda+0.025, 0, 0.6); e.caja += c.intereses*6; e.deuda += c.intereses*6; e.mesesInteresImpago = 0;
      registrar(S, pre+'the bank refinanced '+e.nombre+' at '+pct(e.tasaDeuda)+'. More expensive, more time.','dinero'); }});
  ops.push({t:'Sell 25% of the assets for '+fmt(ingresoActivos)+' (revenue -15%)', bot:ingresoActivos*0.3, fn:function(S){
      e.activos -= activosVenta; e.ingresos *= 0.85; var pago = Math.min(e.deuda, ingresoActivos*0.6);
      e.deuda -= pago; e.caja += ingresoActivos - pago; e.mesesInteresImpago = 0;
      registrar(S, pre+'you sold a quarter of '+e.nombre+'\'s assets at 70 cents on the dollar and paid down '+fmt(pago)+'.','dinero'); }});
  ops.push({t:'Sell the company for '+fmt(venta), bot:venta, fn:function(S){
      S.jugador.efectivo += venta; S.estadisticas.empresasVendidas++;
      var ix = S.empresas.indexOf(e); if(ix>=0) S.empresas.splice(ix,1);
      registrar(S, pre+'you sold '+e.nombre+' under pressure for '+fmt(venta)+'.','dinero'); }});
  ops.push({t:'Negotiate with lenders: 25% debt haircut for 20% of the company', bot:e.deuda*0.25-c.valorParticipacion*0.2, fn:function(S){
      e.deuda *= 0.75; e.propiedad = clamp(e.propiedad*0.80, 0, 1); e.tasaDeuda = clamp(e.tasaDeuda+0.01,0,0.6);
      S.jugador.reputacion = clamp(S.jugador.reputacion-6,0,100); e.mesesInteresImpago = 0;
      registrar(S, pre+'the lenders of '+e.nombre+' forgave 25% of the debt and took 20% of the company. Reputation -6.','malo'); }});
  ops.push({t:'Let it fail (company bankruptcy)', bot:-c.valorParticipacion, fn:function(S){
      var ix = S.empresas.indexOf(e); if(ix>=0) S.empresas.splice(ix,1);
      S.jugador.reputacion = clamp(S.jugador.reputacion-20,0,100);
      S.flags.quiebrasEmpresa = num(S.flags.quiebrasEmpresa,0)+1;
      S.flags.defaultHasta = Math.max(num(S.flags.defaultHasta,0), S.jugador.mes+36);
      registrar(S, pre+e.nombre+' went bankrupt. Limited liability: your pocket is safe, but reputation -20 and every bank remembers for 3 years.','malo'); }});
  return {titulo:'Distress at '+e.nombre,
   texto:pre.replace(/: $/,'. ')+e.nombre+' no longer covers its interest: operating profit '+fmt(c.EBITDA)+'/mo against '+fmt(c.intereses)+'/mo of interest, '+(c.EBITDAanual>0?'leverage '+c.apalancamiento.toFixed(1)+'x':'operating profit negative')+(caida>0.1?', EBITDA down '+pct(caida,0)+' from its peak':'')+'. Cash on hand '+fmt(e.caja)+'. The debt has not changed; the business has. What do you do?',
   ensena:'Debt is fixed; profits are not. Every option here costs something: the only mistake is pretending it will fix itself.',
   termino:'apalancamiento',
   opciones:ops};
 }},

{id:'bankExecutes', peso:0, decision:true, cond:function(){return false;},
 gen:function(S){ return {origen:'bigLine', ano:anoJuego(S)}; },
 build:function(S,p){
  var pre = _origenTexto(p), e = empresaMayor(S), saldo = deudaPersonal(S);
  if(saldo<=0) return null;
  var venta = e ? precioVenta(S,e,1)*0.7 : 0;
  var ops = [
    {t:'Pay half the balance now: '+fmt(saldo*0.5), bot:-saldo*0.5, fn:function(S){
      cobrar(S, saldo*0.5);
      for(var i=0;i<S.prestamos.length;i++){ S.prestamos[i].saldo *= 0.5; S.prestamos[i].pagoMensual *= 0.5; }
      registrar(S, pre+'you paid down half the credit line to calm the bank.','dinero'); }}
  ];
  if(e) ops.push({t:'The bank forces the sale of '+e.nombre+' for '+fmt(venta), bot:0, fn:function(S){
      S.jugador.efectivo += venta; S.estadisticas.empresasVendidas++;
      var ix = S.empresas.indexOf(e); if(ix>=0) S.empresas.splice(ix,1);
      var pago = Math.min(saldo, Math.max(0,S.jugador.efectivo)); cobrar(S, pago);
      for(var i=0;i<S.prestamos.length;i++){ S.prestamos[i].saldo = Math.max(0, S.prestamos[i].saldo - pago*(S.prestamos[i].saldo/Math.max(1,saldo))); }
      S.jugador.reputacion = clamp(S.jugador.reputacion-8,0,100);
      registrar(S, pre+'the bank forced the sale of '+e.nombre+' at 70% to cover the line. Reputation -8.','malo'); }});
  return {titulo:'The bank calls the line',
   texto:pre.replace(/: $/,'. ')+'You are running out of cash with '+fmt(saldo)+' outstanding on the big credit line. The bank wants comfort now: pay down half, or it liquidates your largest asset at a discount.',
   ensena:'Cheap money has a clause: when you need it most, the lender needs it back.',
   opciones:ops};
 }},

{id:'boomBust', peso:0, decision:true, cond:function(){return false;},
 gen:function(S){ var e=empresaMayor(S); return e?{id:e.id, origen:'doubleDown', ano:anoJuego(S)}:null; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  var pre = _origenTexto(p), c = calcular(e,S.economia);
  var recup = e.activos*0.5*0.6;
  return {titulo:'The boom ended: '+e.nombre,
   texto:pre.replace(/: $/,'. ')+'The recession hit while '+e.nombre+' was still digesting the capacity you financed with debt. Demand is gone, the debt ('+fmt(c.deudaTotal)+') is not. Capacity bought at the top is worth a quarter less today.',
   ensena:'Capacity built for a boom is paid for in the bust. Leverage turns a slowdown into a crisis.',
   opciones:[
    {t:'Take the hit: assets -25%, revenue -15%', bot:0, fn:function(S){ e.activos *= 0.75; e.ingresos *= 0.85; registrar(S, pre+'assets at '+e.nombre+' marked down 25%, revenue -15%.','malo'); }},
    {t:'Sell half the new capacity for '+fmt(recup)+' and pay down debt', bot:recup*0.2, fn:function(S){
      e.activos *= 0.5; e.ingresos *= 0.75; var pago = Math.min(e.deuda, recup); e.deuda -= pago; e.caja += recup-pago;
      registrar(S, pre+'you sold half the capacity at 60 cents on the dollar and paid down '+fmt(pago)+'. Revenue -25%.','malo'); }}
   ]};
 }},

{id:'bribeScandal', peso:0, decision:true, cond:function(){return false;},
 gen:function(S){ return {origen:'bribe', ano:anoJuego(S)}; },
 build:function(S,p){
  var pre = _origenTexto(p), abog = Math.max(50000, patrimonio(S)*0.05);
  return {titulo:'The payment came out',
   texto:pre.replace(/: $/,'. ')+'A journalist has the receipts. The story will run this week. You can bury it in lawyers ('+fmt(abog)+') and limit the damage, or take the full hit.',
   ensena:'Corruption is a loan against your reputation at an unknown interest rate. The payment comes when you can least afford it.',
   opciones:[
    {t:'Lawyers: '+fmt(abog)+', reputation -15', bot:-abog, fn:function(S){ cobrar(S, abog); S.jugador.reputacion = clamp(S.jugador.reputacion-15,0,100); S.jugador.politica *= 0.7; registrar(S, pre+'you contained the scandal. Reputation -15.','malo'); }},
    {t:'Take the hit: reputation -30', bot:0, fn:function(S){ S.jugador.reputacion = clamp(S.jugador.reputacion-30,0,100); S.jugador.politica *= 0.5; S.jugador.riesgoPolitico = clamp(S.jugador.riesgoPolitico+20,0,100); registrar(S, pre+'the scandal ran in full. Reputation -30.','malo'); }}
   ]};
 }}
);
