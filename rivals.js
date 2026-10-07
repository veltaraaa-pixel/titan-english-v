'use strict';
/* Rivales y su evolucion anual */

function empresasRival(S, r){
  var n = ri(S,2,5), l = [], i, ingAnual, sec;
  var base = Math.max(1e6, num(r.influencia,1000) * 1e6 / Math.max(1,n) * 0.8);
  for(i=0;i<n;i++){
    sec = i===0 ? r.sector : pick(S, LISTA_SECTORES);
    ingAnual = base * U(S,0.5,1.5);
    l.push({
      nombre: nombreEmpresa(S, sec), sector: sec,
      ingresosAnuales: ingAnual,
      valoracion: ingAnual * U(S,0.5,1.4) * SEC(sec).multiploBase * 0.18
    });
  }
  return l;
}

function generarRivales(S){
  var i, r, inf;
  S.rivales = [];
  for(i=0;i<40;i++){
    inf = BAL.rivalBase * Math.pow(BAL.rivalRatio, i) * U(S,0.9,1.1);
    r = {
      id: 1000+i,
      nombre: pick(S,NOMBRES_PILA)+' '+pick(S,APELLIDOS),
      pais: pick(S,PAISES),
      sector: pick(S,LISTA_SECTORES),
      estilo: pick(S,ESTILOS),
      edad: ri(S,32,72),
      influencia: inf,
      influenciaPrevia: inf,
      posPrevia: i+1,
      vivo: true,
      hostilHasta: 0,
      pactoHasta: 0,
      empresas: []
    };
    r.empresas = empresasRival(S, r);
    S.rivales.push(r);
  }
  var nombres = {}, j;
  for(j=0;j<S.rivales.length;j++){
    while(nombres[S.rivales[j].nombre]) S.rivales[j].nombre = pick(S,NOMBRES_PILA)+' '+pick(S,APELLIDOS);
    nombres[S.rivales[j].nombre] = 1;
  }
}

function actualizarRivalesAnual(S){
  var i, r, mod, vol, muertes = [];
  var modCiclo = S.economia.fase==='recesion' ? -0.05 : (S.economia.fase==='expansion' ? 0.02 : 0);
  for(i=0;i<S.rivales.length;i++){
    r = S.rivales[i];
    if(!r.vivo) continue;
    r.influenciaPrevia = r.influencia;
    vol = 1; mod = 0;
    if(r.estilo==='aggressive'){ mod = 0.03; vol = 2; }
    else if(r.estilo==='conservative'){ mod = 0.01; vol = 0.5; }
    else if(r.estilo==='political'){ mod = 0.02 + (S.economia.fase==='recesion'?0.03:0); }
    else { mod = 0.02; }
    mod += 0.030;
    if(S.dificultad==='dificil') mod += 0.03;
    var d = U(S,-0.10,0.15)*vol + mod + modCiclo;
    r.influencia = Math.max(50, num(r.influencia,100) * (1 + clamp(d,-0.5,0.6)));
    r.edad++;
    if(r.edad>=75 && chance(S,0.08)){
      r.vivo = false;
      muertes.push(r);
    }
  }
  for(i=0;i<muertes.length;i++){
    r = muertes[i];
    var heredero = {
      id: uid(S)+5000,
      nombre: pick(S,NOMBRES_PILA)+' '+r.nombre.split(' ')[1],
      pais: r.pais, sector: r.sector, estilo: pick(S,ESTILOS), edad: ri(S,28,50),
      influencia: r.influencia*0.6, influenciaPrevia: r.influencia*0.6, posPrevia: 41,
      vivo:true, hostilHasta:0, pactoHasta:0, empresas: r.empresas.slice(0, Math.max(1,Math.floor(r.empresas.length/2)))
    };
    S.rivales.push(heredero);
    registrar(S, r.nombre+' has died. Their heir '+heredero.nombre+' takes 60% of the empire; the rest hits the market.', 'evento');
    S.flags.liquidacionHasta = S.jugador.mes + 3;
  }
  var vivos = [];
  for(i=0;i<S.rivales.length;i++) if(S.rivales[i].vivo) vivos.push(S.rivales[i]);
  vivos.sort(function(a,b){ return b.influencia-a.influencia; });
  if(vivos.length>40) vivos = vivos.slice(0,40);
  /* el mundo no se vacia: entran titanes nuevos por abajo */
  while(vivos.length<40){
    var ref = vivos.length ? vivos[vivos.length-1].influencia : 400;
    var nr = {id: uid(S)+7000, nombre: pick(S,NOMBRES_PILA)+' '+pick(S,APELLIDOS), pais: pick(S,PAISES),
      sector: pick(S,LISTA_SECTORES), estilo: pick(S,ESTILOS), edad: ri(S,30,55),
      influencia: Math.max(100, ref*U(S,0.7,0.98)), posPrevia:41, vivo:true, hostilHasta:0, pactoHasta:0, empresas:[]};
    nr.influenciaPrevia = nr.influencia;
    nr.empresas = empresasRival(S, nr);
    vivos.push(nr);
  }
  S.rivales = vivos;
}

function rivalPorId(S,id){ for(var i=0;i<S.rivales.length;i++) if(S.rivales[i].id===id) return S.rivales[i]; return null; }
