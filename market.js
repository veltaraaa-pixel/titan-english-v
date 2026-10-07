'use strict';
/* Mercado: empresas en venta, startups, edificios */

function etiquetaOferta(o){
  if(o.apal > 3.5) return 'Over-leveraged';
  var rel = o.multImplicito / Math.max(1,SEC(o.empresa.sector).multiploBase);
  if(rel < 0.85) return 'Cheap';
  if(rel < 1.2) return 'Fair price';
  return 'Expensive';
}

function generarEmpresaVenta(S, valObjetivo, sector){
  sector = sector || pick(S, LISTA_SECTORES);
  var sec = SEC(sector);
  var margen = clamp(sec.margen*U(S,0.8,1.2), 0.05, 0.95);
  var ebMargen = clamp(margen*U(S,0.35,0.7), 0.02, 0.8);
  var crec = clamp(sec.crecBase*U(S,0.5,2.5), -0.01, 0.06);
  var ajusteTasa = clamp(Math.pow(0.05/Math.max(0.005,S.economia.tasaInteres),0.5),0.6,1.6);
  var multiplo = sec.multiploBase * ajusteTasa * clamp(1+crec*12,0.7,2.0);
  var ebAnual = Math.max(2000, num(valObjetivo,50000) / Math.max(1,multiplo));
  var ingAnual = ebAnual / ebMargen;
  var ingresos = ingAnual/12;
  var gf = Math.max(0, ingresos*margen - ebAnual/12);
  var e = nuevaEmpresa(S, {
    nombre: nombreEmpresa(S, sector), sector: sector,
    ingresos: ingresos, margenBruto: margen, gastosFijos: gf,
    activos: Math.max(1000, ingAnual/Math.max(0.05,sec.efCap)*U(S,0.7,1.3)),
    deuda: ebAnual*U(S,0,3), tasaDeuda: clamp(S.economia.tasaInteres+U(S,0.01,0.04),0.01,0.5),
    caja: gf*U(S,1,3),
    crecimiento: crec, crecimientoBase: sec.crecBase, volatilidad: sec.vol,
    empleados: Math.round(ingresos/Math.max(1000,sec.ipe)),
    propiedad: 1
  });
  return e;
}

function generarOferta(S, valObjetivo, sector){
  var e = generarEmpresaVenta(S, valObjetivo, sector);
  var c = calcular(e, S.economia);
  var precio = Math.max(1000, (c.valoracion - c.deudaTotal) * U(S,0.8,1.3));
  var o = {
    id: uid(S), empresa: e, precioPedido: precio, meses: ri(S,1,4),
    multImplicito: (precio + c.deudaTotal)/Math.max(1,c.EBITDAanual),
    apal: c.apalancamiento, ddHecha:false, intentos:0, rechazado:false, oculto:null, descuento:0
  };
  if(chance(S,0.20)){
    if(chance(S,0.5)) o.oculto = {tipo:'deuda', valor: e.deuda*U(S,0.3,0.8)};
    else o.oculto = {tipo:'ingresos', valor: 0.15};
  }
  o.etiqueta = etiquetaOferta(o);
  return o;
}

function generarMercado(S){
  var m = S.mercado, et = S.jugador.etapa, i;
  if(m.generadoEnMes === S.jugador.mes) return;
  m.generadoEnMes = S.jugador.mes;
  var vivas = [];
  for(i=0;i<m.ofertas.length;i++){
    m.ofertas[i].meses--;
    if(m.ofertas[i].meses>0){
      var pRival = et>=3 ? 0.30 : 0.15;
      if(chance(S, pRival) && S.rivales.length){
        var rv = pick(S, S.rivales);
        if(m.ofertas[i].ddHecha || m.ofertas[i].intentos>0 || m.ofertas[i].precioAcordado)
          registrar(S, rv.nombre+' beat you to it and bought '+m.ofertas[i].empresa.nombre+'. The market waits for no one.', 'empresa');
      } else vivas.push(m.ofertas[i]);
    }
  }
  m.ofertas = vivas;
  var pat = Math.max(20000, patrimonio(S));
  var n, lo, hi, nSt=0, nEd=0;
  if(et<=1){ n=ri(S,2,3); lo=0.1; hi=1.5; }
  else if(et===2){ n=ri(S,3,4); lo=0.1; hi=2.0; nSt=ri(S,1,2); nEd=ri(S,1,2); }
  else if(et===3){ n=ri(S,4,5); lo=0.05; hi=3.0; nSt=ri(S,2,3); nEd=2; }
  else { n=ri(S,5,6); lo=0.02; hi=2.0; nSt=3; nEd=2; }
  var tier = typeof redTier==='function' ? redTier(S) : 0;
  n += Math.min(2, tier); hi *= (1 + tier*0.3);
  if(typeof perk==='function'){ if(et < perk(S,'startupsDesde')) nSt = 0; else if(nSt===0) nSt = ri(S,1,2); if(et < perk(S,'edificiosDesde')) nEd = 0; else if(nEd===0) nEd = ri(S,1,2); }
  n = Math.max(0, n - m.ofertas.length);
  var liq = S.flags.liquidacionHasta && S.jugador.mes < S.flags.liquidacionHasta;
  for(i=0;i<n;i++){
    var val = Math.max(10000, U(S,lo,hi)*pat);
    var of = generarOferta(S, val, pickW(S, LISTA_SECTORES, LISTA_SECTORES.map(function(s){ return SEC(s).tam/1e12; })));
    if(liq){ of.precioPedido *= 0.8; of.etiqueta='Cheap'; of.liquidacion=true; }
    else if(chance(S, 0.125)){
      of.precioPedido *= U(S,0.60,0.70); of.meses = 1; of.flash = true;
      var cf = calcular(of.empresa, S.economia);
      of.multImplicito = (of.precioPedido + cf.deudaTotal)/Math.max(1,cf.EBITDAanual);
      of.etiqueta = etiquetaOferta(of);
    }
    m.ofertas.push(of);
  }
  if(tier>=2 && typeof ofertaPrivada==='function' && chance(S,0.5)){ var hayPriv=false; for(i=0;i<m.ofertas.length;i++) if(m.ofertas[i].privado) hayPriv=true; if(!hayPriv) m.ofertas.push(ofertaPrivada(S)); }
  m.startups = [];
  for(i=0;i<nSt;i++){
    var secSt = pick(S, ['Technology','Healthcare','Media']);
    var prop = U(S,0.05,0.25);
    var minT = typeof perk==='function' ? perk(S,'startupMin') : 50000;
    var ticket = clamp(U(S,0.02,0.25)*pat, minT, 5000000);
    m.startups.push({id:uid(S), nombre: pick(S,NOMBRES_STARTUP)+' '+pick(S,SUF_EMP[secSt]), sector:secSt,
      propiedad:prop, ticket:ticket, valoracion: ticket/prop, meses: ri(S,36,84)});
  }
  m.edificios = [];
  for(i=0;i<nEd;i++){
    var minEd = (typeof perk==='function' && perk(S,'edificiosDesde')===0 && et<2) ? 15000 : 200000;
    var precio = clamp(U(S,0.1,1.0)*pat, minEd, 5e10);
    m.edificios.push({id:uid(S), nombre:'Tower '+pick(S,PRE_EMP), precio:precio,
      empleados: Math.ceil(precio/2000000)});
  }
}

function probAceptar(S, oferta, precio){
  var r = 10*(precio/Math.max(1,oferta.precioPedido) - 1) + (num(S.jugador.reputacion,50)-50)/50;
  return clamp(1/(1+Math.exp(-r)), 0.01, 0.99);
}
function costoDD(oferta, St){ var s = St || (typeof S!=='undefined' ? S : null); var m = (s && typeof perk==='function') ? perk(s,'dd') : 1; return Math.max(500, oferta.precioPedido*0.01*m); }
