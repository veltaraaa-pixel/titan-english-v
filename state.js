'use strict';
/* Estado, empresa, log */

function nuevaEmpresa(S, o){
  o = o||{};
  var sec = SEC(o.sector||'Services');
  return {
    id: uid(S),
    nombre: o.nombre || 'Company',
    sector: o.sector || 'Services',
    ingresos: num(o.ingresos, 1000),
    margenBruto: clamp(num(o.margenBruto, sec.margen), 0.02, 1),
    gastosFijos: Math.max(0, num(o.gastosFijos, 0)),
    activos: Math.max(0, num(o.activos, 0)),
    deuda: Math.max(0, num(o.deuda, 0)),
    tasaDeuda: clamp(num(o.tasaDeuda, 0.07), 0, 0.6),
    caja: num(o.caja, 0),
    crecimiento: clamp(num(o.crecimiento, sec.crecBase), -0.15, 0.25),
    crecimientoBase: clamp(num(o.crecimientoBase, sec.crecBase), -0.05, 0.05),
    volatilidad: clamp(num(o.volatilidad, sec.vol), 0, 1),
    empleados: Math.max(0, Math.round(num(o.empleados, 0))),
    sucursales: Math.max(1, Math.round(num(o.sucursales, 1))),
    propiedad: clamp(num(o.propiedad, 1), 0, 1),
    politicaDividendos: o.politicaDividendos || 'distribuir',
    esEmpleo: !!o.esEmpleo,
    esEdificio: !!o.esEdificio,
    deudaOculta: num(o.deudaOculta, 0),
    ingresosInflados: num(o.ingresosInflados, 0),
    sorpresaEnMes: num(o.sorpresaEnMes, 0),
    boosts: [],
    mods: [],
    edadMeses: 0,
    mesesCajaNeg: 0,
    ebitdaPico: 0, mesesInteresImpago: 0, ultimoDistress: -99,
    mesesEbitdaPos: 0,
    costoBase: num(o.costoBase, 0),
    ceo: false,
    bonos: [],
    preferentes: {monto:0, dividendoAnual:0.08}
  };
}

function nuevoEstado(opt){
  opt = opt || {};
  var dif = opt.dificultad === 'dificil';
  var seed = num(opt.seed, 1) | 0; if(!seed) seed = 1;
  var S = {
    version: 1,
    seed: seed,
    rngState: seed,
    nextId: 1,
    dificultad: dif ? 'dificil' : 'normal',
    auto: false,
    jugador: {
      nombre: opt.nombre || 'Anonymous',
      mes: 0,
      efectivo: 5000,
      reputacion: 50,
      riesgoPolitico: 0,
      politica: 0,
      costoDeVida: dif ? BAL.costoVidaDificil : BAL.costoVida,
      etapa: 0,
      mesesEfectivoNeg: 0,
      buscandoEmpleo: 0,
      incapacitadoHasta: 0,
      conocimiento: {terminos:{}, aciertos:0, fallos:0}
    },
    empresas: [],
    startups: [],
    prestamos: [],
    economia: {
      tasaInteres: dif ? 0.06 : 0.05,
      fase: 'expansion', mesesEnFase: 0, duracionFase: 48,
      modIngresos: 0, modAcum: 0,
      indiceMercado: 1000,
      inflacionMensual: BAL.infl,
      impuestoCorporativo: dif ? 0.30 : 0.25,
      impuestoGanancias: 0.20,
      impuestoHasta: 0,
      mesesDesdeCambioTasa: 0,
      tasaForzadaHasta: 0,
      historial: []
    },
    sectores: {},
    mercado: {ofertas:[], startups:[], edificios:[], generadoEnMes:-1},
    rivales: [],
    ranking: [],
    influencia: {total:0, economica:0, laboral:0, financiera:0, politica:0, multiplicador:1, previa:0, historial:[]},
    flags: {
      holding:false, mesesEnTop1:0, mejorPosicion:9999, maxInfluencia:0, maxPatrimonio:5000,
      eventosUnicos:{}, ultimoEventoMes:-9, posicionAnual:{}, bloqueoSectores:{},
      rivalHostil:0, hostilHasta:0, alianzaHasta:0, pandemiaHecha:false,
      ultimoLobby:-99, ultimaPresion:-99, victoriaAnunciada:false, autofinanciacion:false,
      sinDespidosAnual:0, empleadosAnoAnterior:0,
      defaultHasta:0, insolvencias:0, quiebrasEmpresa:0
    },
    eventoActual: null,
    ledger: [],
    ruta: null,
    lifestyle: [],
    pendientes: [],
    log: [],
    estadisticas: {empresasCompradas:0, empresasVendidas:0, empleadosMax:0, startupsExito:0, startupsFracaso:0,
      dividendosCobrados:0, interesesPagados:0, impuestosPagados:0, despedidos:0, contratados:0},
    fin: null
  };
  var i;
  for(i=0;i<LISTA_SECTORES.length;i++){
    S.sectores[LISTA_SECTORES[i]] = {tam: SEC(LISTA_SECTORES[i]).tam, modSector:0, modHasta:0};
  }
  return S;
}

function registrar(S, texto, tipo){
  S.log.push({mes: S.jugador.mes, texto: String(texto), tipo: tipo||'info'});
  if(S.log.length > 400) S.log.splice(0, S.log.length-400);
}
function edad(S){ return 18 + Math.floor(num(S.jugador.mes,0)/12); }
function anoJuego(S){ return Math.floor(num(S.jugador.mes,0)/12) + 1; }
function mesDelAno(S){ return (num(S.jugador.mes,0) % 12) + 1; }
function empresaPorId(S, id){
  for(var i=0;i<S.empresas.length;i++) if(S.empresas[i].id===id) return S.empresas[i];
  return null;
}
function nombreEmpresa(S, sector){
  var p = pick(S, PRE_EMP), s = pick(S, (SUF_EMP[sector]||SUF_EMP['Services']));
  return p + ' ' + s;
}
