'use strict';
/* Formulas puras y actualizacion mensual */

function totalBonos(e){ return sum(e.bonos, function(b){ return b.principal; }); }

function calcular(e, eco){
  var sec = SEC(e.sector);
  var ingresos = Math.max(0, num(e.ingresos,0));
  var ub = ingresos * clamp(num(e.margenBruto,0.3),0,1);
  var gf = Math.max(0, num(e.gastosFijos,0));
  var ebitda = ub - gf;
  var bonos = totalBonos(e);
  var intBonos = sum(e.bonos, function(b){ return num(b.principal,0)*num(b.tasa,0.07); });
  var intereses = (Math.max(0,num(e.deuda,0)) * clamp(num(e.tasaDeuda,0.07),0,0.6) + intBonos) / 12;
  var dep = e.esEdificio || e.esEmpleo ? 0 : Math.max(0,num(e.activos,0)) * BAL.depreciacion;
  var divPref = num(e.preferentes && e.preferentes.monto,0) * num(e.preferentes && e.preferentes.dividendoAnual,0.08) / 12;
  var uai = ebitda - intereses - dep;
  var imp = Math.max(0, uai) * clamp(num(eco.impuestoCorporativo,0.25),0,0.6);
  var un = uai - imp - divPref;
  var equity = num(e.activos,0) - num(e.deuda,0) - bonos;
  var ingAnual = ingresos*12, ebAnual = ebitda*12;
  var ajusteTasa = clamp(Math.pow(0.05 / Math.max(0.005, num(eco.tasaInteres,0.05)), 0.5), 0.6, 1.6);
  var ajusteCrec = clamp(1 + num(e.crecimiento,0)*12, 0.7, 2.0);
  var multiplo = sec.multiploBase * ajusteTasa * ajusteCrec;
  var deudaTotal = Math.max(0,num(e.deuda,0)) + bonos;
  var val;
  if(e.esEmpleo) val = 0;
  else if(e.esEdificio) val = Math.max(0, num(e.activos,0));
  else val = Math.max(ebAnual*multiplo, Math.max(0,num(e.activos,0)), 0);
  return {
    ingresos:ingresos, utilidadBruta:ub, gastosFijos:gf, EBITDA:ebitda, intereses:intereses,
    depreciacion:dep, dividendoPreferente:divPref, utilidadAntesImpuestos:uai, impuestos:imp,
    utilidadNeta:un, equity:equity, ingresosAnuales:ingAnual, EBITDAanual:ebAnual,
    multiplo:multiplo, valoracion:val, valorParticipacion: Math.max(0, val-deudaTotal)*clamp(num(e.propiedad,1),0,1),
    deudaTotal:deudaTotal,
    apalancamiento: deudaTotal / Math.max(ebAnual, 1),
    flujoDeCaja: un + dep
  };
}

function esControlada(e){ return !e.esEmpleo && num(e.propiedad,0) > 0.5; }
function factorControl(e){
  var p = num(e.propiedad,0);
  return p > 0.5 ? 1 : (p >= 0.25 ? 0.5 : 0.2);
}
function valorStartups(S){
  return sum(S.startups, function(s){ return s.estado==='viva' ? num(s.valoracion,0)*num(s.propiedad,0) : 0; });
}
function deudaPersonal(S){ return sum(S.prestamos, function(p){ return num(p.saldo,0); }); }

function patrimonio(S){
  var v = num(S.jugador.efectivo,0) + valorStartups(S) - deudaPersonal(S), i;
  for(i=0;i<S.empresas.length;i++) v += calcular(S.empresas[i], S.economia).valorParticipacion;
  if(typeof lifestyleValor==='function') v += lifestyleValor(S);
  return num(v, 0);
}
function patrimonioEmpresas(S){
  var v=0,i; for(i=0;i<S.empresas.length;i++) v += calcular(S.empresas[i], S.economia).valorParticipacion;
  return v;
}
function participacionSector(S, sector){
  var t = 0, i, e;
  for(i=0;i<S.empresas.length;i++){
    e = S.empresas[i];
    if(e.sector===sector && esControlada(e)) t += num(e.ingresos,0)*12;
  }
  var tam = Math.max(1e6, num(S.sectores[sector] && S.sectores[sector].tam, SEC(sector).tam));
  return clamp(t/tam, 0, 1);
}
function tieneEmpleo(S){
  for(var i=0;i<S.empresas.length;i++) if(S.empresas[i].esEmpleo) return S.empresas[i];
  return null;
}
function empleadosTotales(S){
  return Math.round(sum(S.empresas, function(e){ return e.esEmpleo?0:num(e.empleados,0); }));
}
function ingresoMensualNeto(S){
  var t = 0, i, e, c;
  for(i=0;i<S.empresas.length;i++){
    e = S.empresas[i]; c = calcular(e, S.economia);
    if(e.esEmpleo) t += c.EBITDA;
    else t += Math.max(0, c.utilidadNeta) * num(e.propiedad,1);
  }
  var cv = num(S.jugador.costoDeVida,0) * (typeof tieneHogar==='function' && tieneHogar(S) ? 0.6 : 1);
  var lf = typeof lifestyleMensual==='function' ? lifestyleMensual(S) : 0;
  return t - cv - lf - sum(S.prestamos, function(p){ return num(p.pagoMensual,0); });
}
function factorRendimiento(empleados){
  return Math.max(BAL.pisoRendimiento, Math.pow(0.97, Math.max(0,num(empleados,0))/10));
}
function spreadRep(S){
  var s = Math.max(0, 50 - num(S.jugador.reputacion,50)) * 0.001;
  if(typeof spreadRiesgo==='function') s += spreadRiesgo(S) + spreadDefault(S);
  return s;
}

/* ---------- Modificadores temporales de ingresos ---------- */
function modIngresoTemporal(e, pct, meses, etiqueta){
  pct = clamp(num(pct,0), -0.9, 3);
  e.ingresos = Math.max(0, num(e.ingresos,0) * (1+pct));
  e.mods.push({pct:pct, meses:Math.max(1,Math.round(num(meses,1))), et:etiqueta||''});
}
function addBoost(e, b){ e.boosts.push(b); }

/* ---------- Economia global ---------- */
function actualizarEconomia(S){
  var eco = S.economia, mes = S.jugador.mes;
  eco.mesesEnFase++;
  eco.mesesDesdeCambioTasa++;
  var cambio = null;
  if(eco.mesesEnFase >= eco.duracionFase){
    eco.mesesEnFase = 0;
    if(eco.fase==='expansion'){ eco.fase='pico'; eco.duracionFase=ri(S,6,12); cambio='pico'; }
    else if(eco.fase==='pico'){ eco.fase='recesion'; eco.duracionFase=ri(S,9,24); cambio='recesion'; }
    else if(eco.fase==='recesion'){ eco.fase='recuperacion'; eco.duracionFase=ri(S,12,24); cambio='recuperacion'; }
    else { eco.fase='expansion'; eco.duracionFase=ri(S,36,72); cambio='expansion'; }
  }
  if(eco.fase==='expansion'){
    eco.modIngresos = 0.003;
    if(eco.mesesDesdeCambioTasa>=6 && eco.tasaInteres<0.09 && mes>eco.tasaForzadaHasta){
      eco.tasaInteres = Math.min(0.09, eco.tasaInteres+0.0025); eco.mesesDesdeCambioTasa=0; cambio = cambio||'tasa+';
    }
  } else if(eco.fase==='pico'){
    eco.modIngresos = 0;
  } else if(eco.fase==='recesion'){
    eco.modIngresos = eco.mesesEnFase<=17 ? -0.012 : 0;
    if(eco.mesesDesdeCambioTasa>=3 && eco.tasaInteres>0.01 && mes>eco.tasaForzadaHasta){
      eco.tasaInteres = Math.max(0.01, eco.tasaInteres-0.005); eco.mesesDesdeCambioTasa=0; cambio = cambio||'tasa-';
    }
  } else {
    eco.modIngresos = 0.006;
  }
  eco.tasaInteres = clamp(eco.tasaInteres, 0.005, 0.20);
  eco.indiceMercado = Math.max(50, num(eco.indiceMercado,1000) * (1 + eco.modIngresos*2 + gauss(S)*0.025));
  if(eco.impuestoHasta && mes > eco.impuestoHasta){
    eco.impuestoCorporativo = S.dificultad==='dificil' ? 0.30 : 0.25; eco.impuestoHasta = 0;
  }
  var i, s;
  for(i=0;i<LISTA_SECTORES.length;i++){
    s = S.sectores[LISTA_SECTORES[i]];
    s.tam = num(s.tam, SEC(LISTA_SECTORES[i]).tam) * 1.0025;
    if(s.modHasta && mes >= s.modHasta){ s.modSector = 0; s.modHasta = 0; }
  }
  if(eco.historial.length===0 || mes%3===0){
    eco.historial.push({m:mes, idx:Math.round(eco.indiceMercado), tasa:+(eco.tasaInteres*100).toFixed(2)});
    if(eco.historial.length>300) eco.historial.shift();
  }
  return cambio;
}

/* ---------- Empresa: mes ---------- */
function actualizarEmpresa(S, e){
  var eco = S.economia, sec = SEC(e.sector), mes = S.jugador.mes;
  var r = {dividendo:0, perdida:false, aviso:null};
  e.edadMeses++;

  if(e.esEmpleo){
    e.ingresos = Math.max(0, num(e.ingresos,0) * (1 + (typeof perk==='function'?perk(S,'salarioCrec'):0.003)));
    var cE = calcular(e, eco);
    r.dividendo = Math.max(0, cE.EBITDA);
    return r;
  }

  var i, b, crecExtra = 0, abs = 0, gfAbs = 0, empAbs = 0;
  for(i=e.boosts.length-1;i>=0;i--){
    b = e.boosts[i];
    if(b.tipo==='crec') crecExtra += num(b.valor,0);
    else if(b.tipo==='rampa'){ abs += num(b.valor,0); gfAbs += num(b.gf,0); empAbs += num(b.emp,0); }
    b.meses = num(b.meses,0) - 1;
    if(b.meses<=0) e.boosts.splice(i,1);
  }
  for(i=e.mods.length-1;i>=0;i--){
    e.mods[i].meses--;
    if(e.mods[i].meses<=0){
      e.ingresos = num(e.ingresos,0) / Math.max(0.1, 1+num(e.mods[i].pct,0));
      e.mods.splice(i,1);
    }
  }

  var sm = S.sectores[e.sector] ? num(S.sectores[e.sector].modSector,0) : 0;
  var ruido = gauss(S) * clamp(num(e.volatilidad,0.2),0,1) * 0.08;
  var penalEmpleo = (tieneEmpleo(S) && !e.ceo) ? -((typeof perk==='function'?perk(S,'penalEmpleo'):0.10))*Math.max(0,num(e.crecimiento,0)) : 0;
  var perkCrec = 0;
  if(typeof perk==='function' && !e.esEdificio){ if(esFundada(S,e)) perkCrec += perk(S,'crecFundada'); perkCrec -= Math.max(0,num(e.crecimiento,0))*(1-perk(S,'crecOperativa')); }
  var factor = 1 + num(e.crecimiento,0) + crecExtra + ruido + num(eco.modIngresos,0) + sm + penalEmpleo + perkCrec;
  factor = clamp(factor, 0.55, 1.6);
  e.ingresos = clamp(num(e.ingresos,0)*factor + abs, 0, 1e14);

  e.crecimiento = clamp(num(e.crecimiento,0)*BAL.decayCrecimiento + num(e.crecimientoBase,0.004)*(1-BAL.decayCrecimiento), -0.12, 0.25);
  /* los costos no son totalmente fijos: una parte sigue a los ingresos (se recorta en crisis) */
  var acople = 1 + BAL.acopleCostos*(factor-1);
  e.gastosFijos = Math.max(0, num(e.gastosFijos,0) * (1 + num(eco.inflacionMensual,0.002)) * acople + gfAbs);
  e.empleados = Math.max(0, num(e.empleados,0) + empAbs);

  if(e.esEdificio){
    var rev = eco.fase==='expansion'?0.004: eco.fase==='pico'?0.001: eco.fase==='recesion'?-0.012:0.003;
    e.activos = Math.max(0, num(e.activos,0)*(1+rev));
    e.ingresos = Math.max(0, num(e.activos,0)*0.06/12);
  } else {
    e.activos = Math.max(0, num(e.activos,0)*(1-BAL.depreciacion));
  }

  var c = calcular(e, eco);
  S.estadisticas.interesesPagados += c.intereses;
  S.estadisticas.impuestosPagados += c.impuestos;
  e.caja = num(e.caja,0) + c.utilidadNeta;
  if(c.EBITDA>0) e.mesesEbitdaPos++; else e.mesesEbitdaPos=0;
  if(c.EBITDA > num(e.ebitdaPico,0)) e.ebitdaPico = c.EBITDA;

  var colchon = BAL.dividendoColchon * Math.max(c.gastosFijos, 500);
  if(e.caja > colchon){
    var exc = e.caja - colchon;
    if(e.politicaDividendos==='distribuir'){
      e.caja -= exc;
      r.dividendo = exc * clamp(num(e.propiedad,1),0,1);
    } else if(e.politicaDividendos==='reinvertir'){
      e.caja -= exc;
      invertirEnEmpresa(S, e, exc, true);
    }
  }

  if(e.caja < 0){
    e.mesesCajaNeg++;
    if(c.equity < 0 && e.mesesCajaNeg >= 6){ r.perdida = true; }
    else r.aviso = 'estres';
  } else e.mesesCajaNeg = 0;

  if(e.preferentes && e.preferentes.monto>0 && c.EBITDA*12 < e.preferentes.monto*e.preferentes.dividendoAnual){
    e.mesesPrefImpago = num(e.mesesPrefImpago,0)+1;
    if(e.mesesPrefImpago>=3){ S.jugador.reputacion = clamp(S.jugador.reputacion-2,0,100); }
  } else e.mesesPrefImpago = 0;

  if(e.sorpresaEnMes && mes >= e.sorpresaEnMes){
    e.sorpresaEnMes = 0;
    if(e.deudaOculta>0){
      e.deuda += e.deudaOculta;
      registrar(S, 'Hidden debt surfaced at '+e.nombre+': '+fmt(e.deudaOculta)+'. Without due diligence, the problem is yours to inherit.', 'malo');
      e.deudaOculta = 0;
    }
    if(e.ingresosInflados>0){
      e.ingresos *= (1-e.ingresosInflados);
      registrar(S, 'Revenue at '+e.nombre+' was inflated: it drops '+pct(e.ingresosInflados,0)+'.', 'malo');
      e.ingresosInflados = 0;
    }
  }
  return r;
}
