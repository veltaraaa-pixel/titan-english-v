'use strict';
/* Caminos: rutas con ventajas, desventajas, escaleras y eventos propios (Fase 3) */

var RUTAS = {
  corporate: {t:'Corporate', ic:'briefcase', inicio:'A real job with real promotions.',
    tag:'Climb the ladder. Steady salary, promotions, slow equity.',
    pros:['Salary 15% higher and promotions that raise it', 'Your job slows your own companies only half as much'],
    cons:['Banks see an employee, not a founder: branches cost 25% more'],
    niveles:['Employee','Manager','Director','Executive','CEO']},
  entrepreneur: {t:'Entrepreneur', ic:'users', inicio:'Pick the business you found.',
    tag:'Build from zero. Cheap to grow, expensive to borrow.',
    pros:['Hiring and branches cost 20% less', 'Companies you founded grow faster'],
    cons:['Banks lend founders 10% less'],
    niveles:['Founder','Successful Founder','Serial Entrepreneur','Holding Company','Business Empire']},
  investor: {t:'Investor', ic:'chart', inicio:'A day job and a taste for startups.',
    tag:'Put money to work, not hours. Startups from day one.',
    pros:['Startup rounds open from the start, tickets from $1,000', 'Startups you back fail 20% less often'],
    cons:['Companies you run yourself grow 5% slower'],
    niveles:['Retail Investor','Angel Investor','Professional Investor','Fund Manager','Institutional Investor']},
  realestate: {t:'Real Estate', ic:'home', inicio:'A day job and your first small property.',
    tag:'Bricks and mortgages. Slow, steady, leveraged.',
    pros:['Mortgages up to 80% and properties from day one', 'Your buildings yield 7% instead of 6%'],
    cons:['Hiring in other sectors costs 10% more'],
    niveles:['Property Owner','Landlord','Developer','Real Estate Company','Real Estate Empire']},
  finance: {t:'Finance', ic:'bank', inicio:'Analyst desk, high salary, long hours.',
    tag:'Other people\'s money. Deals, leverage, fees.',
    pros:['Due diligence at half price, banks lend 25% more, one extra turn of LBO leverage', 'Bonds from $2M of EBITDA'],
    cons:['Scandals find you 30% more often'],
    niveles:['Analyst','Investment Banking','Private Equity','PE Partner','Fund Founder']}
};
var LISTA_RUTAS = ['corporate','entrepreneur','investor','realestate','finance'];

function rutaState(S){
  if(!S.ruta) S.ruta = {id:'entrepreneur', niveles:{corporate:0,entrepreneur:0,investor:0,realestate:0,finance:0}, mesesEmpleado:0, lbos:0, negociaciones:0, startupsInvertidas:0, fundadas:[]};
  var k; for(k in RUTAS) if(S.ruta.niveles[k]===undefined) S.ruta.niveles[k]=0;
  if(!S.ruta.fundadas) S.ruta.fundadas = [];
  return S.ruta;
}
function rutaPrincipal(S){ return rutaState(S).id; }
/* una ruta "activa" da sus ventajas: la principal siempre; una secundaria desde su tercer nivel (mezcla de caminos) */
function rutaActiva(S, id){ var r = rutaState(S); return r.id===id || num(r.niveles[id],0) >= 2; }
function nivelDe(S, id){ return num(rutaState(S).niveles[id],0); }
function tituloJugador(S){
  var r = rutaState(S), mejor = r.id, n = num(r.niveles[r.id],0), k;
  for(k in r.niveles) if(num(r.niveles[k],0) > n){ n = r.niveles[k]; mejor = k; }
  return RUTAS[mejor].niveles[clamp(n,0,4)];
}

/* ---------- perks: multiplicadores que consultan las acciones ---------- */
function perk(S, key){
  var corp = rutaActiva(S,'corporate'), ent = rutaActiva(S,'entrepreneur'), inv = rutaActiva(S,'investor'), re = rutaActiva(S,'realestate'), fin = rutaActiva(S,'finance');
  var nc = nivelDe(S,'corporate');
  switch(key){
    case 'salario': return (corp ? 1.15*(1+0.15*nc) : 1) * (rutaPrincipal(S)==='finance' ? 1.25 : 1);
    case 'salarioCrec': return corp ? 0.006 : 0.003;
    case 'penalEmpleo': return corp ? 0.05 : 0.10;
    case 'contratar': return (ent ? 0.8 : 1) * (re && !ent ? 1.1 : 1);
    case 'contratarRE': return re ? 1 : 1;
    case 'sucursal': return (ent ? 0.8 : 1) * (rutaPrincipal(S)==='corporate' ? 1.25 : 1);
    case 'crecFundada': return ent ? 0.002 : 0;
    case 'crecOperativa': return (rutaPrincipal(S)==='investor') ? 0.95 : 1;
    case 'credito': return (fin ? 1.25 : 1) * (rutaPrincipal(S)==='entrepreneur' ? 0.9 : 1);
    case 'lboExtra': return fin ? 1 : 0;
    case 'dd': return fin ? 0.5 : 1;
    case 'startupMin': return inv ? 1000 : 50000;
    case 'startupFallo': return inv ? 0.8 : 1;
    case 'startupsDesde': return inv ? 0 : 2;
    case 'ltv': return re ? 0.8 : 0.7;
    case 'caprate': return re ? 0.07 : 0.06;
    case 'edificiosDesde': return re ? 0 : 2;
    case 'bonosMin': return fin ? 2e6 : 5e6;
    case 'escandalo': return rutaPrincipal(S)==='finance' ? 1.3 : 1;
  }
  return 1;
}
function esFundada(S, e){ var f = rutaState(S).fundadas; return f.indexOf(e.id) >= 0; }

/* ---------- escaleras: requisitos reales ---------- */
function cuentaEdificios(S){ var n=0,i; for(i=0;i<S.empresas.length;i++) if(S.empresas[i].esEdificio && esControlada(S.empresas[i])) n++; return n; }
function cuentaControladas(S){ var n=0,i; for(i=0;i<S.empresas.length;i++) if(esControlada(S.empresas[i])) n++; return n; }
function cuentaSectores(S){ var k={},n=0,i; for(i=0;i<S.empresas.length;i++) if(esControlada(S.empresas[i]) && !k[S.empresas[i].sector]){ k[S.empresas[i].sector]=1; n++; } return n; }
function salarioActual(S){ var e = tieneEmpleo(S); return e ? num(e.ingresos,0) : 0; }
function fundadaExitosa(S){ var i,e; for(i=0;i<S.empresas.length;i++){ e=S.empresas[i]; if(esFundada(S,e) && num(e.mesesEbitdaPos,0)>=12 && e.empleados>=5) return true; } return false; }
function tieneCEO(S){ for(var i=0;i<S.empresas.length;i++) if(S.empresas[i].ceo) return true; return false; }

/* cada requisito: {t: texto, v: valor actual, m: meta} ; cumplido si v>=m */
function requisitos(S, ruta, nivel){
  var r = rutaState(S), pat = patrimonio(S), pos = posicionJugador(S);
  var top40 = (pos<=40 && num(S.influencia.total,0)>0) ? 1 : 0;
  var R = {
    corporate: [
      [{t:'Months employed', v:r.mesesEmpleado, m:12}, {t:'Reputation', v:S.jugador.reputacion, m:52}],
      [{t:'Months employed', v:r.mesesEmpleado, m:36}, {t:'Salary / mo', v:salarioActual(S), m:5000, f:fmt}],
      [{t:'Months employed', v:r.mesesEmpleado, m:60}, {t:'Net worth', v:pat, m:500000, f:fmt}],
      [{t:'Net worth', v:pat, m:5e6, f:fmt}, {t:'100 employees or a CEO appointed', v:(empleadosTotales(S)>=100||tieneCEO(S))?1:0, m:1, b:true}]
    ],
    entrepreneur: [
      [{t:'A company you founded: 12 profitable months and 5+ people', v:fundadaExitosa(S)?1:0, m:1, b:true}],
      [{t:'Companies controlled', v:cuentaControladas(S), m:3}, {t:'Net worth', v:pat, m:1e6, f:fmt}],
      [{t:'Holding company created', v:S.flags.holding?1:0, m:1, b:true}, {t:'Companies controlled', v:cuentaControladas(S), m:5}],
      [{t:'Net worth', v:pat, m:1e9, f:fmt}, {t:'Employees', v:empleadosTotales(S), m:1000, f:miles}]
    ],
    investor: [
      [{t:'Startup rounds joined', v:r.startupsInvertidas, m:3}],
      [{t:'Net worth', v:pat, m:5e6, f:fmt}, {t:'Companies and startups bought', v:num(S.estadisticas.empresasCompradas,0)+r.startupsInvertidas, m:5}],
      [{t:'Net worth', v:pat, m:1e8, f:fmt}, {t:'Sectors controlled', v:cuentaSectores(S), m:3}],
      [{t:'Net worth', v:pat, m:5e9, f:fmt}, {t:'Top 40 of the ranking', v:top40, m:1, b:true}]
    ],
    finance: [
      [{t:'Months employed', v:r.mesesEmpleado, m:24}, {t:'A leveraged deal or a negotiated price', v:(r.lbos+r.negociaciones)>0?1:0, m:1, b:true}],
      [{t:'Leveraged buyouts closed', v:r.lbos, m:2}, {t:'Net worth', v:pat, m:2e6, f:fmt}],
      [{t:'Net worth', v:pat, m:5e7, f:fmt}, {t:'Acquisitions', v:num(S.estadisticas.empresasCompradas,0), m:5}],
      [{t:'Net worth', v:pat, m:1e9, f:fmt}, {t:'A holding company or a bank', v:(S.flags.holding||tieneBanco(S))?1:0, m:1, b:true}]
    ],
    realestate: [
      [{t:'Buildings owned', v:cuentaEdificios(S), m:2}],
      [{t:'Buildings owned', v:cuentaEdificios(S), m:5}, {t:'Net worth', v:pat, m:5e6, f:fmt}],
      [{t:'10 buildings or 1% of the sector', v:(cuentaEdificios(S)>=10||participacionSector(S,'Real Estate')>=0.01)?1:0, m:1, b:true}, {t:'Net worth', v:pat, m:1e8, f:fmt}],
      [{t:'Net worth', v:pat, m:5e9, f:fmt}, {t:'Real Estate sector share', v:participacionSector(S,'Real Estate'), m:0.05, f:function(x){return pct(x,1);}}]
    ]
  };
  return (R[ruta]||[])[nivel-1] || [];
}
function cumple(reqs){ for(var i=0;i<reqs.length;i++) if(num(reqs[i].v,0) < reqs[i].m) return false; return true; }
function revisarRutas(S){
  var r = rutaState(S), subidas = [], k, n, i;
  if(tieneEmpleo(S)) r.mesesEmpleado = num(r.mesesEmpleado,0)+1;
  for(i=0;i<LISTA_RUTAS.length;i++){
    k = LISTA_RUTAS[i]; n = num(r.niveles[k],0);
    while(n < 4 && cumple(requisitos(S, k, n+1))) n++;
    if(n > num(r.niveles[k],0)){
      r.niveles[k] = n;
      subidas.push({ruta:k, nivel:n});
      var titulo = RUTAS[k].niveles[n];
      if(k===r.id){
        S.jugador.reputacion = clamp(S.jugador.reputacion+3,0,100);
        S.jugador.politica = num(S.jugador.politica,0) + 5*n;
        if(k==='corporate'){ var e = tieneEmpleo(S); if(e){ e.ingresos *= 1.2; registrar(S,'Promoted to '+titulo+'. Salary now '+fmt(e.ingresos)+'/mo.','dinero'); } }
        registrar(S,'Path: you are now '+titulo+' ('+RUTAS[k].t+'). Reputation +3.','evento');
      } else {
        registrar(S,'Path: you reached '+titulo+' on the '+RUTAS[k].t+' track'+(n>=2?' — its advantages are now yours too.':'.'),'evento');
      }
    }
  }
  return subidas;
}

/* ---------- eventos propios de cada ruta ---------- */
EVENTOS.push(
{id:'headhunter', peso:5, decision:true,
 cond:function(S){ return rutaPrincipal(S)==='corporate' && !!tieneEmpleo(S) && S.jugador.mes>12; },
 gen:function(S){ return {k:U(S,1.3,1.5)}; },
 build:function(S,p){
  var e = tieneEmpleo(S); if(!e) return null;
  var nuevo = e.ingresos*p.k;
  return {titulo:'A headhunter calls',
   texto:'A competitor offers you '+fmt(nuevo)+'/mo ('+pct(p.k-1,0)+' more) to jump ship. Your own companies would lose your attention for a year (growth -10%), and your current employer will not forget it.',
   ensena:'Salary is the only income you can raise with one phone call. Everything else takes years.',
   opciones:[
    {t:'Take it: '+fmt(nuevo)+'/mo', bot:nuevo*12, fn:function(S){ e.ingresos = nuevo; var l=empresasReales(S),i; for(i=0;i<l.length;i++) addBoost(l[i],{tipo:'crec',valor:-0.005,meses:12}); registrar(S,'You jumped to a new employer at '+fmt(nuevo)+'/mo.','dinero'); }},
    {t:'Stay loyal (reputation +2)', bot:0, fn:function(S){ S.jugador.reputacion = clamp(S.jugador.reputacion+2,0,100); registrar(S,'You stayed. Loyalty noticed: reputation +2.','evento'); }}
   ]};
 }},
{id:'cofundador', peso:5, decision:true,
 cond:function(S){ var i,e; for(i=0;i<S.empresas.length;i++){ e=S.empresas[i]; if(esFundada(S,e) && e.empleados>=3 && e.propiedad>=0.9) return true; } return false; },
 gen:function(S){ var i,e,l=[]; for(i=0;i<S.empresas.length;i++){ e=S.empresas[i]; if(esFundada(S,e) && e.empleados>=3 && e.propiedad>=0.9) l.push(e.id); } return {id:pick(S,l)}; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  return {titulo:'Your first hire wants equity',
   texto:'The person who built '+e.nombre+' with you wants 10% of the company or they walk. Without them revenue drops 15% for six months; with them, they push growth for two years.',
   ensena:'Equity given early is the most expensive money you will ever spend, and sometimes the best.',
   termino:'dilucion',
   opciones:[
    {t:'Give 10% (growth +0.5%/mo for 24 months)', bot:0, fn:function(S){ e.propiedad = clamp(e.propiedad-0.10,0,1); addBoost(e,{tipo:'crec',valor:0.005,meses:24}); registrar(S,'You gave 10% of '+e.nombre+' to your co-founder.','empresa'); }},
    {t:'Let them walk (revenue -15% for 6 months)', bot:0, fn:function(S){ modIngresoTemporal(e,-0.15,6,'fuga'); registrar(S,'Your co-founder left '+e.nombre+'.','malo'); }}
   ]};
 }},
{id:'secundario', peso:5, decision:true,
 cond:function(S){ return rutaActiva(S,'investor') && S.startups.length>0 && S.jugador.efectivo > 2000; },
 gen:function(S){ var st = pick(S,S.startups); return {id:st.id, k:U(S,0.5,0.7)}; },
 build:function(S,p){
  var st=null,i; for(i=0;i<S.startups.length;i++) if(S.startups[i].id===p.id) st=S.startups[i];
  if(!st) return null;
  var stake = 0.05, precio = Math.round(st.valoracion*stake*p.k);
  return {titulo:'A secondary stake in '+st.nombre,
   texto:'An early investor in '+st.nombre+' needs liquidity and offers you 5% at '+pct(1-p.k,0)+' below the last valuation: '+fmt(precio)+'. Your stake would go from '+pct(st.propiedad,1)+' to '+pct(st.propiedad+stake,1)+'.',
   ensena:'Secondaries are where patient investors buy from impatient ones.',
   opciones:[
    {t:'Buy 5% for '+fmt(precio), bot:(S.jugador.efectivo>=precio?precio*0.3:-1), fn:function(S){ if(S.jugador.efectivo<precio){ registrar(S,'You could not afford the secondary.','malo'); return; } S.jugador.efectivo -= precio; st.invertido += precio; st.propiedad = clamp(st.propiedad+stake,0,0.6); registrar(S,'You bought 5% more of '+st.nombre+' on the secondary market.','dinero'); }},
    {t:'Pass', bot:0, fn:function(S){}}
   ]};
 }},
{id:'rezonificacion', peso:5, decision:true,
 cond:function(S){ return rutaActiva(S,'realestate') && cuentaEdificios(S)>0; },
 gen:function(S){ var l=[],i; for(i=0;i<S.empresas.length;i++) if(S.empresas[i].esEdificio) l.push(S.empresas[i].id); return {id:pick(S,l)}; },
 build:function(S,p){
  var e = empresaPorId(S,p.id); if(!e) return null;
  var venta = e.activos*1.3 - e.deuda;
  return {titulo:'Rezoning around '+e.nombre,
   texto:'The city rezoned the block. A developer offers '+fmt(e.activos*1.3)+' for '+e.nombre+' (30% above book, '+fmt(venta)+' net of the mortgage). Or you keep it: the value rises 30% and rents 15%, but the property tax rises too (+40% expenses).',
   ensena:'Real estate makes money twice: from rent and from what the neighbors do.',
   opciones:[
    {t:'Sell for '+fmt(venta)+' net', bot:venta, fn:function(S){ S.jugador.efectivo += venta; S.estadisticas.empresasVendidas++; var ix=S.empresas.indexOf(e); if(ix>=0) S.empresas.splice(ix,1); registrar(S,'You sold '+e.nombre+' to a developer after the rezoning.','dinero'); }},
    {t:'Keep it: value +30%, rent +15%, expenses +40%', bot:e.activos*0.3, fn:function(S){ e.activos *= 1.3; e.ingresos *= 1.15; e.gastosFijos *= 1.4; registrar(S,e.nombre+' was rezoned: worth 30% more.','empresa'); }}
   ]};
 }},
{id:'mandato', peso:5, decision:true,
 cond:function(S){ return rutaActiva(S,'finance') && S.jugador.reputacion>=50 && S.jugador.mes>6; },
 gen:function(S){ return {k:U(S,0.3,1.2)}; },
 build:function(S,p){
  var base = Math.max(5000, patrimonio(S)*0.05*p.k), tarde = base*1.6;
  return {titulo:'An advisory mandate',
   texto:'A client wants you to run the sale of their company. You can take a flat fee of '+fmt(base)+' now, or a success fee of '+fmt(tarde)+' in 12 months, paid only if the deal closes (about 3 in 4 do).',
   ensena:'Money now is worth more than money later, unless later pays enough for the wait and the risk.',
   termino:'tir',
   opciones:[
    {t:'Flat fee now: '+fmt(base), bot:base, fn:function(S){ S.jugador.efectivo += base; registrar(S,'Advisory fee collected: '+fmt(base)+'.','dinero'); }},
    {t:'Success fee in 12 months: '+fmt(tarde)+' (75%)', bot:tarde*0.75*0.95, fn:function(S){ prometer(S, {origen:'mandate', titulo:'advisory mandate', tipo:'mes', mes:S.jugador.mes+12, evento:'feeDiferido', monto:tarde, cerro:chance(S,0.75)}); registrar(S,'You took the success fee: '+fmt(tarde)+' if the deal closes in 12 months.','evento'); }}
   ]};
 }},
{id:'feeDiferido', peso:0, decision:true, cond:function(){return false;},
 gen:function(S){ return {monto:10000}; },
 build:function(S,p){
  var monto = num(p.monto, 0) || 10000;
  var cerro = !!p.cerro;
  return {titulo:cerro?'The deal closed':'The deal fell through',
   texto:cerro?'Your client sold. The success fee of '+fmt(monto)+' is yours.':'The buyer walked at the last minute. No deal, no fee. That is the price of the upside.',
   ensena:'Deferred, contingent income has a discount rate. Now you know yours.',
   opciones:[{t:cerro?'Collect '+fmt(monto):'Move on', bot:cerro?monto:0, fn:function(S){ if(cerro){ S.jugador.efectivo += monto; registrar(S,'Success fee collected: '+fmt(monto)+'.','dinero'); } else registrar(S,'The advisory deal fell through.','malo'); }}]};
 }}
);
