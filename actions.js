'use strict';
/* Acciones del jugador. Todas devuelven {ok, msg} y mutan el estado. */

function R(ok,msg){ return {ok:!!ok, msg:msg||''}; }

/* Modelo unificado de capital: $1 invertido compra capacidad (activos),
   la capacidad necesita gente (capEmp) y produce retCap de EBITDA al año. */
function efectoInversion(e, monto){
  var sec = SEC(e.sector);
  monto = Math.max(0, num(monto,0));
  var emp = e.esEdificio ? monto/Math.max(1,sec.capEmp) : monto/Math.max(1,sec.capEmp);
  var gastos = emp*sec.salario;
  var ebitda = monto*sec.retCap*BAL.kCapex/12;
  var margen = clamp(num(e.margenBruto, sec.margen), 0.05, 1);
  return {ingresos:(ebitda+gastos)/margen, gastos:gastos, empleados:emp, ebitda:ebitda};
}
function capitalPorEmpleado(e){ return SEC(e.sector).capEmp; }

/* ---------- SIEMPRE ---------- */
function invertirEnEmpresa(S, e, monto, interno){
  monto = Math.floor(num(monto,0));
  if(!e || e.esEmpleo) return R(false,'You cannot invest in a job.');
  if(monto < 100) return R(false,'Minimum $100.');
  if(!interno && monto > S.jugador.efectivo) return R(false,'You do not have that much cash.');
  if(!interno) S.jugador.efectivo -= monto;
  var sec = SEC(e.sector);
  var activosPrev = Math.max(1, e.activos);
  e.activos += monto;
  var ef = efectoInversion(e, monto);
  addBoost(e, {tipo:'rampa', valor: ef.ingresos/BAL.capexRampaMeses, gf: ef.gastos/BAL.capexRampaMeses,
               emp: ef.empleados/BAL.capexRampaMeses, meses: BAL.capexRampaMeses});
  if(e.sector==='Technology' || e.sector==='Media'){
    var bump = clamp(Math.floor((monto/activosPrev)/0.10)*0.005, 0, 0.03);
    if(bump>0) addBoost(e, {tipo:'crec', valor:bump, meses:24});
  }
  if(!interno) registrar(S, 'You invested '+fmt(monto)+' in '+e.nombre+'.', 'dinero');
  return R(true,'Invested '+fmt(monto)+' in '+e.nombre+'.');
}
function invertirAumentandoPropiedad(S, e, monto){
  var c = calcular(e, S.economia);
  var val = Math.max(1, c.valoracion - c.deudaTotal);
  var r = invertirEnEmpresa(S, e, monto);
  if(!r.ok) return r;
  e.propiedad = clamp((num(e.propiedad,1)*val + monto)/(val+monto), 0, 1);
  return R(true, r.msg+' Your ownership rises to '+pct(e.propiedad,1)+'.');
}
function inyectarCapital(S, e, monto){
  monto = Math.floor(num(monto,0));
  if(monto<=0) return R(false,'Invalid amount.');
  if(monto > S.jugador.efectivo) return R(false,'You do not have that much cash.');
  S.jugador.efectivo -= monto; e.caja += monto;
  registrar(S,'You injected '+fmt(monto)+' into the cash on hand of '+e.nombre+'.','dinero');
  return R(true,'Cash on hand of '+e.nombre+': '+fmt(e.caja));
}
function capacidadPrestamoPersonal(S){
  var ing = Math.max(0, ingresoMensualNeto(S) + num(S.jugador.costoDeVida,0));
  var fc = (typeof factorCredito==='function' ? factorCredito(S) : 1) * (typeof perk==='function'?perk(S,'credito'):1);
  return Math.max(0, 12*ing*(1+num(S.jugador.reputacion,50)/100)*fc - deudaPersonal(S));
}
function cuotaAnualidad(P, rAnual, n){
  var r = num(rAnual,0.08)/12;
  if(r<=0) return P/Math.max(1,n);
  return P*r/(1-Math.pow(1+r,-n));
}
function prestamoPersonal(S, monto, meses){
  monto = Math.floor(num(monto,0)); meses = Math.round(num(meses,36));
  if(monto<=0) return R(false,'Invalid amount.');
  if(monto > capacidadPrestamoPersonal(S)) return R(false,'Exceeds your repayment capacity.');
  var tasa = clamp(S.economia.tasaInteres + 0.03 + spreadRep(S), 0.01, 0.6);
  var cuota = cuotaAnualidad(monto, tasa, meses);
  S.prestamos.push({id:uid(S), principal:monto, saldo:monto, tasa:tasa, pagoMensual:cuota, mesesRestantes:meses});
  S.jugador.efectivo += monto;
  registrar(S,'Personal loan of '+fmt(monto)+' at '+pct(tasa)+' for '+meses+' months ('+fmt(cuota)+'/mo).','dinero');
  return R(true,'You received '+fmt(monto)+'.');
}
function limitePrestamoCorporativo(S, e){
  var c = calcular(e, S.economia);
  var mult = num(S.jugador.reputacion,50) > 70 ? 4 : 3;
  /* capacidad por cobertura de intereses: el banco mira EBITDA menos lo que ya pagas */
  var libre = Math.max(0, c.EBITDAanual - c.intereses*12);
  var fc = (typeof factorCredito==='function' ? factorCredito(S) : 1) * (typeof perk==='function'?perk(S,'credito'):1);
  return Math.max(0, libre*mult*fc - c.deudaTotal);
}
function prestamoCorporativo(S, e, monto){
  monto = Math.floor(num(monto,0));
  if(e.esEmpleo) return R(false,'A job cannot take on debt.');
  if(monto<=0) return R(false,'Invalid amount.');
  var lim = limitePrestamoCorporativo(S, e);
  if(monto > lim) return R(false,'The bank will only lend up to '+fmt(lim)+'.');
  var c = calcular(e, S.economia);
  var apalRes = (c.deudaTotal+monto)/Math.max(1,c.EBITDAanual);
  var spreadApal = Math.max(0, apalRes-2)*0.0075;
  var tasa = clamp(S.economia.tasaInteres + 0.02 + spreadRep(S) + spreadApal - (S.flags.holding?0.005:0) - (S.flags.banco?0.015:0), 0.01, 0.6);
  var nueva = (num(e.deuda,0)*num(e.tasaDeuda,tasa) + monto*tasa)/Math.max(1,num(e.deuda,0)+monto);
  e.tasaDeuda = clamp(nueva, 0.005, 0.6);
  e.deuda += monto; e.caja += monto;
  registrar(S,e.nombre+' took on '+fmt(monto)+' in debt at '+pct(tasa)+'. Leverage: '+apalRes.toFixed(1)+'x.','dinero');
  return R(true,'Debt taken. Leverage '+apalRes.toFixed(1)+'x.');
}
function pagarDeudaEmpresa(S, e, monto){
  monto = Math.floor(num(monto,0));
  if(monto<=0) return R(false,'Invalid amount.');
  var fuente = Math.min(monto, Math.max(0,e.caja));
  var dePersonal = monto - fuente;
  if(dePersonal > S.jugador.efectivo) return R(false,'Cash on hand plus your cash is not enough.');
  if(monto > num(e.deuda,0)) monto = num(e.deuda,0);
  fuente = Math.min(monto, Math.max(0,e.caja)); dePersonal = monto - fuente;
  e.caja -= fuente; S.jugador.efectivo -= dePersonal;
  e.deuda = Math.max(0, e.deuda - monto);
  if(e.deuda<=0){ S.jugador.reputacion = clamp(S.jugador.reputacion+1,0,100); }
  registrar(S,'You repaid '+fmt(monto)+' of debt for '+e.nombre+'.','dinero');
  return R(true,'Remaining debt: '+fmt(e.deuda));
}
function pagarPrestamoPersonal(S, id, monto){
  var i, p=null;
  for(i=0;i<S.prestamos.length;i++) if(S.prestamos[i].id===id) p=S.prestamos[i];
  if(!p) return R(false,'Loan not found.');
  monto = Math.min(Math.floor(num(monto,0)), p.saldo, S.jugador.efectivo);
  if(monto<=0) return R(false,'Invalid amount.');
  S.jugador.efectivo -= monto; p.saldo -= monto;
  if(p.saldo<=1){
    S.prestamos.splice(S.prestamos.indexOf(p),1);
    S.jugador.reputacion = clamp(S.jugador.reputacion+1,0,100);
    registrar(S,'You paid off a personal loan. Reputation +1.','dinero');
  } else registrar(S,'You paid '+fmt(monto)+' toward your loan.','dinero');
  return R(true,'Done.');
}
function precioVenta(S, e, pctVender){
  var c = calcular(e, S.economia);
  var base = Math.max(0, c.valoracion - c.deudaTotal) * clamp(num(e.propiedad,1),0,1) * clamp(pctVender,0,1);
  var p = base * (0.85 + num(S.jugador.reputacion,50)/500);
  if(pctVender < 1) p *= 0.9;
  return Math.max(0, p);
}
function venderEmpresa(S, e, pctVender){
  pctVender = clamp(num(pctVender,1),0.05,1);
  if(e.esEmpleo) return R(false,'To leave a job, resign.');
  var bruto = precioVenta(S, e, pctVender);
  var base = num(e.costoBase,0)*pctVender;
  var imp = Math.max(0, bruto-base)*num(S.economia.impuestoGanancias,0.2);
  var neto = bruto-imp;
  S.jugador.efectivo += neto;
  S.estadisticas.empresasVendidas++;
  registrar(S,'You sold '+pct(pctVender,0)+' of '+e.nombre+' for '+fmt(bruto)+' ('+fmt(imp)+' in taxes).','dinero');
  if(pctVender>=1 || e.propiedad*(1-pctVender)<0.02){
    S.empresas.splice(S.empresas.indexOf(e),1);
  } else {
    e.propiedad = clamp(e.propiedad*(1-pctVender),0,1);
    e.costoBase = Math.max(0, num(e.costoBase,0)*(1-pctVender));
  }
  return R(true,'You received '+fmt(neto)+' net.');
}
function cambiarDividendos(S, e, politica){
  e.politicaDividendos = politica;
  return R(true,'Policy: '+({distribuir:'Distribute',reinvertir:'Reinvest',acumular:'Accumulate'}[politica]||politica));
}
function renunciarEmpleo(S){
  var e = tieneEmpleo(S);
  if(!e) return R(false,'You do not have a job.');
  S.empresas.splice(S.empresas.indexOf(e),1);
  registrar(S,'You quit your job. Your companies get 100% of your time back.','empresa');
  return R(true,'You quit.');
}
function buscarEmpleo(S){
  if(tieneEmpleo(S)) return R(false,'You already have a job.');
  if(S.jugador.buscandoEmpleo>0) return R(false,'You are already searching.');
  S.jugador.buscandoEmpleo = 2;
  registrar(S,'You started looking for a job (2 months).','empresa');
  return R(true,'Looking for a job...');
}
function crearEmpleo(S){
  var sal = 3000*(1+(edad(S)-18)*0.02)*(1+num(S.jugador.reputacion,50)/200)*(typeof perk==='function'?perk(S,'salario'):1);
  var e = nuevaEmpresa(S,{nombre:'Job', sector:'Services', esEmpleo:true, ingresos:sal,
    margenBruto:1, gastosFijos:0, crecimiento:0.003, crecimientoBase:0.003, volatilidad:0, activos:0, empleados:0});
  S.empresas.push(e);
  registrar(S,'You got a job: '+fmt(sal)+'/mo.','dinero');
}

/* ---------- ETAPA 1 ---------- */
function previewContratar(S, e, n){
  var sec = SEC(e.sector);
  var capital = n*sec.capEmp;
  var ef = efectoInversion(e, capital);
  var mult = (typeof perk==='function'?perk(S,'contratar'):1);
  return {capital:capital*mult, sueldo:n*sec.salario, costo:(capital+n*sec.salario)*mult,
          ingresoExtra:ef.ingresos, gastoExtra:ef.gastos, ebitdaExtra:ef.ebitda};
}
function contratar(S, e, n){
  n = Math.max(1, Math.round(num(n,1)));
  if(e.esEmpleo || e.esEdificio) return R(false,'Not applicable.');
  var p = previewContratar(S,e,n);
  if(p.costo > S.jugador.efectivo + Math.max(0,e.caja))
    return R(false,'Each person needs '+fmt(p.capital/n)+' in capital to produce, plus their first salary. Total: '+fmt(p.costo)+'.');
  var deCaja = Math.min(p.costo, Math.max(0,e.caja));
  e.caja -= deCaja; S.jugador.efectivo -= (p.costo-deCaja);
  e.activos += p.capital;
  addBoost(e, {tipo:'rampa', valor:p.ingresoExtra/3, gf:p.gastoExtra/3, emp:n/3, meses:3});
  S.estadisticas.contratados += n;
  S.estadisticas.empleadosMax = Math.max(S.estadisticas.empleadosMax, empleadosTotales(S));
  registrar(S,'You hired '+n+' at '+e.nombre+': '+fmt(p.capital)+' in capital, +'+fmt(p.ingresoExtra)+'/mo in revenue and +'+fmt(p.gastoExtra)+' in payroll.','empresa');
  return R(true,'Hired '+n+'.');
}
function despedir(S, e, n){
  n = Math.max(1, Math.min(Math.round(num(n,1)), num(e.empleados,0)));
  if(n<=0) return R(false,'There are no employees.');
  var sec = SEC(e.sector), indem = n*sec.salario*2;
  if(indem > S.jugador.efectivo + Math.max(0,e.caja)) return R(false,'You cannot afford the severance pay ('+fmt(indem)+').');
  var deCaja = Math.min(indem, Math.max(0,e.caja));
  e.caja -= deCaja; S.jugador.efectivo -= (indem-deCaja);
  var frac = n/Math.max(1,e.empleados);
  e.ingresos *= (1-frac);
  e.gastosFijos = Math.max(0, e.gastosFijos - n*sec.salario);
  e.activos = Math.max(0, e.activos - n*sec.capEmp);
  e.empleados -= n;
  var caida = Math.max(1, Math.round(frac/0.05));
  S.jugador.reputacion = clamp(S.jugador.reputacion - caida, 0, 100);
  if(frac > 0.30){
    S.jugador.reputacion = clamp(S.jugador.reputacion-10,0,100);
    S.flags.despidoMasivoMes = S.jugador.mes;
    registrar(S,'Mass layoff at '+e.nombre+': '+n+' people. Reputation -'+(caida+10)+'.','malo');
  } else registrar(S,'You laid off '+n+' at '+e.nombre+'. Reputation -'+caida+'.','malo');
  S.estadisticas.despedidos += n;
  return R(true,'Laid off '+n+'.');
}
function maxSucursales(S){ return 5*(num(S.jugador.etapa,0)+1); }
function abrirSucursal(S, e){
  if(e.esEmpleo||e.esEdificio) return R(false,'Not applicable.');
  if(num(e.sucursales,1) >= maxSucursales(S)) return R(false,'Branch limit reached for your stage.');
  var costo = num(e.ingresos,0)*4*(typeof perk==='function'?perk(S,'sucursal'):1);
  if(costo > S.jugador.efectivo + Math.max(0,e.caja)) return R(false,'It costs '+fmt(costo)+' and you do not have it.');
  var deCaja = Math.min(costo, Math.max(0,e.caja));
  e.caja -= deCaja; S.jugador.efectivo -= (costo-deCaja);
  var prom = num(e.ingresos,0)/Math.max(1,e.sucursales);
  var promG = num(e.gastosFijos,0)/Math.max(1,e.sucursales);
  e.sucursales++;
  e.ingresos += prom*0.6;
  e.gastosFijos += promG*0.5;
  e.empleados += Math.ceil(num(e.empleados,0)/Math.max(1,e.sucursales-1)*0.6);
  e.activos += costo*0.6;
  registrar(S,'You opened a branch of '+e.nombre+' ('+e.sucursales+' in total).','empresa');
  return R(true,'Branch opened.');
}
function costoCEO(S,e){ return Math.max(60000, calcular(e,S.economia).EBITDAanual*0.05); }
function nombrarCEO(S, e){
  if(e.ceo) return R(false,'It already has a CEO.');
  if(e.esEmpleo) return R(false,'Not applicable.');
  var c = costoCEO(S,e);
  e.ceo = true; e.gastosFijos += c/12;
  S.flags.ceo = true;
  registrar(S,'You appointed a CEO at '+e.nombre+' ('+fmt(c)+'/yr).','empresa');
  return R(true,'CEO appointed.');
}

/* ---------- COMPRAS ---------- */
function maxLBO(S, oferta, precio){
  var c = calcular(oferta.empresa, S.economia);
  if(typeof reputacionBloquea==='function' && reputacionBloquea(S)) return 0;
  var topApal = (num(S.jugador.reputacion,50)>70 ? 5 : 4) + (typeof perk==='function'?perk(S,'lboExtra'):0);
  var margen = Math.max(0, topApal*c.EBITDAanual - c.deudaTotal);
  var fc = typeof factorCredito==='function' ? factorCredito(S) : 1;
  return Math.max(0, Math.min(precio*0.6*fc, margen));
}
function comprarOferta(S, oferta, pctComprar, lbo){
  pctComprar = clamp(num(pctComprar,1), 0.1, 1);
  var precio = Math.round(num(oferta.precioAcordado, oferta.precioPedido) * pctComprar);
  lbo = clamp(Math.floor(num(lbo,0)), 0, maxLBO(S, oferta, precio));
  var efectivoNec = precio - lbo;
  if(efectivoNec > S.jugador.efectivo) return R(false,'You are short '+fmt(efectivoNec-S.jugador.efectivo)+'.');
  S.jugador.efectivo -= efectivoNec;
  var e = oferta.empresa;
  e.propiedad = pctComprar;
  e.costoBase = precio;
  if(lbo>0){
    var tasa = clamp(S.economia.tasaInteres+0.025+spreadRep(S),0.01,0.6);
    e.tasaDeuda = clamp((e.deuda*e.tasaDeuda + lbo*tasa)/Math.max(1,e.deuda+lbo),0.005,0.6);
    e.deuda += lbo;
  }
  if(oferta.oculto && !oferta.ddHecha){
    e.sorpresaEnMes = S.jugador.mes + ri(S,1,3);
    if(oferta.oculto.tipo==='deuda') e.deudaOculta = oferta.oculto.valor;
    else e.ingresosInflados = oferta.oculto.valor;
  }
  S.empresas.push(e);
  S.estadisticas.empresasCompradas++;
  var idx = S.mercado.ofertas.indexOf(oferta);
  if(idx>=0) S.mercado.ofertas.splice(idx,1);
  registrar(S,'You bought '+pct(pctComprar,0)+' of '+e.nombre+' for '+fmt(precio)+(lbo>0?' ('+fmt(lbo)+' borrowed against the company itself)':'')+'.','empresa');
  if(lbo>0 && typeof rutaState==='function') rutaState(S).lbos = num(rutaState(S).lbos,0)+1;
  if(lbo>0 && typeof prometer==='function'){
    e.ebitdaPico = Math.max(0, calcular(e,S.economia).EBITDA);
    prometer(S, {origen:'lbo', titulo:'leveraged buyout of '+e.nombre, emp:e.id, tipo:'cond', cond:'ebitdaDrop', pct:0.30, hasta:S.jugador.mes+36, evento:'distress'});
  }
  return R(true,'Acquired '+e.nombre+'.');
}
function negociar(S, oferta, precioOfrecido){
  if(typeof reputacionBloquea==='function' && reputacionBloquea(S)) return R(false,'With your reputation, the seller will not sit at the table. Take the asking price or walk.');
  oferta.intentos = num(oferta.intentos,0)+1;
  var p = probAceptar(S, oferta, precioOfrecido);
  if(chance(S,p)){
    oferta.precioAcordado = precioOfrecido;
    if(typeof rutaState==='function') rutaState(S).negociaciones = num(rutaState(S).negociaciones,0)+1;
    registrar(S,'Your offer of '+fmt(precioOfrecido)+' for '+oferta.empresa.nombre+' was accepted.','empresa');
    return R(true,'Accepted: '+fmt(precioOfrecido)+'.');
  }
  oferta.precioPedido *= 1.05;
  oferta.rechazado = true;
  registrar(S,'Your offer for '+oferta.empresa.nombre+' was rejected. The price goes up 5%.','empresa');
  return R(false,'Rejected. They now ask '+fmt(oferta.precioPedido)+'.');
}
function hacerDueDiligence(S, oferta){
  var c = costoDD(oferta);
  if(c > S.jugador.efectivo) return R(false,'It costs '+fmt(c)+'.');
  S.jugador.efectivo -= c;
  oferta.ddHecha = true;
  if(oferta.oculto){
    oferta.precioPedido *= 0.85;
    var t = oferta.oculto.tipo==='deuda'
      ? 'Hidden debt of '+fmt(oferta.oculto.valor)
      : 'Revenue inflated by '+pct(oferta.oculto.valor,0);
    oferta.oculto = null;
    registrar(S,'Due diligence on '+oferta.empresa.nombre+': '+t+'. Price renegotiated -15%.','empresa');
    return R(true, t+'. You renegotiated the price down 15%.');
  }
  registrar(S,'Due diligence on '+oferta.empresa.nombre+': clean books.','empresa');
  return R(true,'Clean books. Nothing hidden.');
}

/* ---------- ETAPA 2 ---------- */
function invertirStartup(S, of, ticket){
  ticket = Math.floor(num(ticket, of.ticket));
  if(ticket > S.jugador.efectivo) return R(false,'You do not have that much cash.');
  var minT = (typeof perk==='function'?perk(S,'startupMin'):50000);
  if(ticket < minT) return R(false,'Minimum ticket '+fmt(minT)+'.');
  if(typeof reputacionBloquea==='function' && reputacionBloquea(S)) return R(false,'Founders do not want you on their cap table with that reputation.');
  if(typeof rutaState==='function') rutaState(S).startupsInvertidas = num(rutaState(S).startupsInvertidas,0)+1;
  S.jugador.efectivo -= ticket;
  var prop = clamp(ticket/Math.max(1,of.valoracion),0.01,0.49);
  S.startups.push({id:uid(S), nombre:of.nombre, sector:of.sector, invertido:ticket,
    propiedad:prop, valoracion:of.valoracion, valoracionInicial:of.valoracion,
    meses:of.meses, mesesVividos:0, estado:'viva'});
  var i = S.mercado.startups.indexOf(of); if(i>=0) S.mercado.startups.splice(i,1);
  registrar(S,'You invested '+fmt(ticket)+' in '+of.nombre+' for a '+pct(prop,1)+' stake.','dinero');
  return R(true,'Invested.');
}
function venderStartup(S, st){
  var v = num(st.valoracion,0)*num(st.propiedad,0)*0.7;
  S.jugador.efectivo += v;
  st.estado = 'vendida';
  S.startups.splice(S.startups.indexOf(st),1);
  registrar(S,'You sold your stake in '+st.nombre+' on the secondary market for '+fmt(v)+'.','dinero');
  return R(true,'You received '+fmt(v)+'.');
}
function comprarEdificio(S, of, hipotecaPct){
  hipotecaPct = clamp(num(hipotecaPct,0),0,(typeof perk==='function'?perk(S,'ltv'):0.7));
  var hip = of.precio*hipotecaPct, efectivoNec = of.precio - hip;
  if(efectivoNec > S.jugador.efectivo) return R(false,'You are short '+fmt(efectivoNec-S.jugador.efectivo)+'.');
  S.jugador.efectivo -= efectivoNec;
  var e = nuevaEmpresa(S,{nombre:of.nombre, sector:'Real Estate', esEdificio:true,
    ingresos: of.precio*(typeof perk==='function'?perk(S,'caprate'):0.06)/12, margenBruto:0.70, gastosFijos: of.precio*0.015/12,
    activos: of.precio, deuda: hip, tasaDeuda: clamp(S.economia.tasaInteres+0.015,0.01,0.5),
    crecimiento:0.002, crecimientoBase:0.002, volatilidad:0.10,
    empleados: of.empleados, propiedad:1, caja: of.precio*0.005});
  e.costoBase = of.precio;
  S.empresas.push(e);
  var i = S.mercado.edificios.indexOf(of); if(i>=0) S.mercado.edificios.splice(i,1);
  registrar(S,'You bought '+of.nombre+' for '+fmt(of.precio)+(hip>0?' with a mortgage of '+fmt(hip):'')+'.','empresa');
  return R(true,'Building acquired.');
}
function filantropia(S, monto){
  var pat = Math.max(1, patrimonio(S));
  monto = Math.floor(num(monto,0));
  if(monto < pat*0.01) return R(false,'Must be at least 1% of your net worth ('+fmt(pat*0.01)+').');
  if(monto > S.jugador.efectivo) return R(false,'You do not have that much cash.');
  S.jugador.efectivo -= monto;
  S.jugador.reputacion = clamp(S.jugador.reputacion + Math.min(10, monto/pat*200),0,100);
  S.jugador.politica = num(S.jugador.politica,0) + monto/2e7;
  S.jugador.riesgoPolitico = clamp(S.jugador.riesgoPolitico-5,0,100);
  registrar(S,'You donated '+fmt(monto)+'. Reputation and legitimacy up.','dinero');
  return R(true,'Donation made.');
}

/* ---------- ETAPA 3 ---------- */
function fusionar(S, a, b, conDespidos){
  if(a.sector!==b.sector) return R(false,'They must be in the same sector.');
  if(a.propiedad<=0.5 || b.propiedad<=0.5) return R(false,'You need control (>50%) of both.');
  var ca = calcular(a,S.economia), cb = calcular(b,S.economia);
  var costo = (ca.ingresosAnuales+cb.ingresosAnuales)*0.10;
  var cajaDisp = Math.max(0,a.caja)+Math.max(0,b.caja);
  if(costo > cajaDisp + S.jugador.efectivo) return R(false,'Integration costs '+fmt(costo)+'.');
  var deCaja = Math.min(costo, cajaDisp);
  var ra = cajaDisp>0 ? Math.max(0,a.caja)/cajaDisp : 0;
  a.caja -= deCaja*ra; b.caja -= deCaja*(1-ra);
  S.jugador.efectivo -= (costo-deCaja);
  var vA = Math.max(1,ca.valoracion-ca.deudaTotal)*a.propiedad, vB = Math.max(1,cb.valoracion-cb.deudaTotal)*b.propiedad;
  var nuevaProp = clamp((vA+vB)/Math.max(1,(Math.max(1,ca.valoracion-ca.deudaTotal)+Math.max(1,cb.valoracion-cb.deudaTotal))),0.05,1);
  var factorG = conDespidos ? 0.82 : 0.92;
  a.ingresos = (a.ingresos + b.ingresos);
  modIngresoTemporal(a, -0.05, 12, 'integración');
  a.gastosFijos = (a.gastosFijos + b.gastosFijos)*factorG;
  a.activos += b.activos; a.deuda += b.deuda; a.caja += b.caja;
  a.empleados += b.empleados;
  a.sucursales = Math.min(maxSucursales(S), a.sucursales + b.sucursales);
  a.bonos = a.bonos.concat(b.bonos);
  a.propiedad = nuevaProp;
  a.costoBase = num(a.costoBase,0)+num(b.costoBase,0);
  a.nombre = a.nombre.split(' ')[0]+' '+b.nombre.split(' ').slice(-1)[0]+' Group';
  if(conDespidos){
    var fuera = Math.round(a.empleados*0.12);
    a.empleados -= fuera;
    S.jugador.reputacion = clamp(S.jugador.reputacion-4,0,100);
    S.estadisticas.despedidos += fuera;
  }
  S.empresas.splice(S.empresas.indexOf(b),1);
  registrar(S,'Merger completed: '+a.nombre+' is formed with '+fmt(a.ingresos*12)+' in annual revenue.','empresa');
  return R(true,'Merger completed.');
}
function limiteBonos(S, e){
  var c = calcular(e,S.economia);
  return Math.max(0, 4*c.EBITDAanual - c.deudaTotal);
}
function emitirBonos(S, e, monto, anios){
  var c = calcular(e,S.economia);
  var minB = (typeof perk==='function'?perk(S,'bonosMin'):5e6);
  if(c.EBITDAanual < minB) return R(false,'Requires annual EBITDA ≥ '+fmt(minB)+'.');
  monto = Math.floor(num(monto,0));
  if(monto<=0 || monto>limiteBonos(S,e)) return R(false,'Maximum '+fmt(limiteBonos(S,e))+'.');
  var apalRes = (c.deudaTotal+monto)/Math.max(1,c.EBITDAanual);
  var tasa = clamp(S.economia.tasaInteres + 0.01 + spreadRep(S) + Math.max(0,apalRes-2)*0.00375, 0.01, 0.5);
  e.bonos.push({id:uid(S), principal:monto, tasa:tasa, mesVencimiento:S.jugador.mes + anios*12});
  e.caja += monto;
  registrar(S,e.nombre+' issued '+fmt(monto)+' in bonds due in '+anios+' years at '+pct(tasa)+'.','dinero');
  return R(true,'Bonds issued at '+pct(tasa)+'.');
}
function ampliacionCapital(S, e, monto){
  monto = Math.floor(num(monto,0));
  if(monto<=0) return R(false,'Invalid amount.');
  var c = calcular(e,S.economia);
  var val = Math.max(1, c.valoracion - c.deudaTotal);
  var post = val + monto;
  e.propiedad = clamp(num(e.propiedad,1)*val/post, 0, 1);
  e.caja += monto;
  registrar(S,'Equity raise at '+e.nombre+': '+fmt(monto)+' comes in. Your ownership drops to '+pct(e.propiedad,1)+'.','dinero');
  return R(true,'Your ownership: '+pct(e.propiedad,1));
}
function emitirPreferentes(S, e, monto){
  monto = Math.floor(num(monto,0));
  if(monto<=0) return R(false,'Invalid amount.');
  e.preferentes.monto = num(e.preferentes.monto,0) + monto;
  e.preferentes.dividendoAnual = 0.08;
  e.caja += monto;
  registrar(S,e.nombre+' issued '+fmt(monto)+' in preferred stock at 8% ('+fmt(monto*0.08)+'/yr fixed).','dinero');
  return R(true,'Preferred stock issued.');
}
function empresaDesdeResumen(S, res, sector){
  var sec = SEC(sector||res.sector);
  var ingresos = Math.max(1000, num(res.ingresosAnuales,1e6)/12);
  var margen = sec.margen;
  var eb = ingresos*margen*U(S,0.35,0.65);
  return nuevaEmpresa(S,{
    nombre:res.nombre, sector:res.sector, ingresos:ingresos, margenBruto:margen,
    gastosFijos: Math.max(0, ingresos*margen - eb),
    activos: num(res.ingresosAnuales,1e6)/Math.max(0.05,sec.efCap),
    deuda: eb*12*U(S,0.5,2), tasaDeuda: clamp(S.economia.tasaInteres+0.02,0.01,0.5),
    caja: eb*2, crecimiento: sec.crecBase, crecimientoBase: sec.crecBase,
    volatilidad: sec.vol, empleados: Math.round(ingresos/Math.max(1000,sec.ipe)), propiedad:1
  });
}
function adquisicionHostil(S, rival, idx){
  var res = rival.empresas[idx];
  if(!res) return R(false,'Not available.');
  var precio = num(res.valoracion,1e6)*1.3;
  if(chance(S,0.40)){
    precio *= 1.15;
    if(precio > S.jugador.efectivo){
      registrar(S, rival.nombre+' counter-offered and outbid you for '+res.nombre+'.','malo');
      return R(false, rival.nombre+' counter-offered. You lost the bid.');
    }
  }
  if(precio > S.jugador.efectivo) return R(false,'You need '+fmt(precio)+'.');
  S.jugador.efectivo -= precio;
  var e = empresaDesdeResumen(S, res);
  e.costoBase = precio;
  S.empresas.push(e);
  rival.empresas.splice(idx,1);
  rival.influencia = Math.max(50, rival.influencia*0.85);
  rival.hostilHasta = S.jugador.mes + 24;
  S.jugador.reputacion = clamp(S.jugador.reputacion-8,0,100);
  S.flags.hostilHasta = S.jugador.mes+24;
  S.estadisticas.empresasCompradas++;
  registrar(S,'Hostile takeover: you seized '+res.nombre+' from '+rival.nombre+' for '+fmt(precio)+'. Reputation -8.','empresa');
  return R(true,'Acquired by force.');
}
function crearHolding(S){
  if(S.flags.holding) return R(false,'You already have a holding company.');
  S.flags.holding = true;
  registrar(S,'You created a holding company: tax consolidation, cheaper debt and a longer-lasting legacy.','empresa');
  return R(true,'Holding company created.');
}

/* ---------- ETAPA 4 ---------- */
function tieneMedios(S){
  for(var i=0;i<S.empresas.length;i++) if(S.empresas[i].sector==='Media' && esControlada(S.empresas[i])) return true;
  return false;
}
function tieneBanco(S){
  for(var i=0;i<S.empresas.length;i++){
    var e=S.empresas[i];
    if(e.sector==='Finance' && esControlada(e) && num(e.ingresos,0)*12>=5e8) return true;
  }
  return false;
}
function lobbying(S, monto){
  monto = Math.floor(num(monto,0));
  if(monto < 1e7) return R(false,'Minimum $10M.');
  if(monto > S.jugador.efectivo) return R(false,'You do not have that much cash.');
  if(S.jugador.mes - num(S.flags.ultimoLobby,-99) < 6) return R(false,'Only once every 6 months.');
  S.jugador.efectivo -= monto;
  S.flags.ultimoLobby = S.jugador.mes;
  S.jugador.politica += monto/5e6*(tieneMedios(S)?1.5:1);
  S.jugador.riesgoPolitico = clamp(S.jugador.riesgoPolitico + monto/1e8*10, 0, 100);
  registrar(S,'Lobbying for '+fmt(monto)+'. Political influence up, and so is risk.','dinero');
  return R(true,'Political influence: '+Math.round(S.jugador.politica)+' IP');
}
function presionarBancoCentral(S){
  if(num(S.jugador.politica,0) < 500) return R(false,'You need 500 political influence.');
  if(S.jugador.mes - num(S.flags.ultimaPresion,-99) < 60) return R(false,'Only once every 60 months.');
  S.flags.ultimaPresion = S.jugador.mes;
  S.economia.tasaInteres = Math.max(0.005, S.economia.tasaInteres - 0.01);
  S.economia.tasaForzadaHasta = S.jugador.mes + 24;
  S.jugador.riesgoPolitico = clamp(S.jugador.riesgoPolitico+15,0,100);
  var msg = 'The rate drops to '+pct(S.economia.tasaInteres)+' for 24 months.';
  if(chance(S,0.30)){
    S.jugador.reputacion = clamp(S.jugador.reputacion-10,0,100);
    S.jugador.politica *= 0.8;
    msg += ' It leaked to the press: reputation -10.';
  }
  registrar(S,'You pressured the central bank. '+msg,'evento');
  return R(true,msg);
}
function pactoRival(S, rival, monto){
  monto = Math.floor(num(monto,0));
  if(monto > S.jugador.efectivo) return R(false,'You do not have that much cash.');
  var p = clamp(0.5 + (num(S.jugador.reputacion,50)-50)/100, 0.05, 0.95);
  S.jugador.efectivo -= monto;
  if(chance(S,p)){
    rival.pactoHasta = S.jugador.mes + 36;
    S.jugador.riesgoPolitico = clamp(S.jugador.riesgoPolitico-10,0,100);
    registrar(S,'Deal with '+rival.nombre+': it will not compete with you for 36 months.','empresa');
    return R(true,'Deal closed.');
  }
  registrar(S, rival.nombre+' rejected your deal and kept the money from the attempt.','malo');
  return R(false, rival.nombre+' rejected the deal.');
}
