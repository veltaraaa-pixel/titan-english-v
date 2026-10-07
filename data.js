'use strict';
/* Datos estaticos: formato, sectores, nombres, origenes, terminos */

function fmt(n){
  n = num(n,0);
  var s = n<0?'-':'', a = Math.abs(n);
  if(a>=1e12) return s+'$'+(a/1e12).toFixed(1)+'T';
  if(a>=1e9)  return s+'$'+(a/1e9).toFixed(1)+'B';
  if(a>=1e6)  return s+'$'+(a/1e6).toFixed(1)+'M';
  if(a>=1e3)  return s+'$'+(a/1e3).toFixed(1)+'k';
  return s+'$'+a.toFixed(0);
}
function pct(x,d){ return (num(x,0)*100).toFixed(d===undefined?1:d)+'%'; }
function miles(n){
  n = Math.round(num(n,0));
  var s = n<0?'-':'', a=String(Math.abs(n)), o='', i, c=0;
  for(i=a.length-1;i>=0;i--){ o=a[i]+o; if(++c%3===0 && i>0) o=','+o; }
  return s+o;
}
function pi(n){ return miles(n)+' IP'; }

/* multiploBase, margen, crecBase, vol, ipe(ingreso/empleado/mes), salario, efCap, tam, fi(factorInfluencia) */
var SECTORES = {
  'Services':     {multiploBase:5,  margen:0.60, crecBase:0.005, vol:0.15, ipe:6000,  salario:3500, efCap:1.5,  tam:3e12, fi:1.0, retCap:0.22},
  'Retail':      {multiploBase:6,  margen:0.35, crecBase:0.006, vol:0.30, ipe:10000, salario:2500, efCap:2.5,  tam:5e12, fi:1.0, retCap:0.2},
  'Technology':    {multiploBase:14, margen:0.80, crecBase:0.009, vol:0.35, ipe:19000, salario:8000, efCap:1.0,  tam:4e12, fi:1.2, retCap:0.26},
  'Manufacturing':     {multiploBase:7,  margen:0.30, crecBase:0.004, vol:0.20, ipe:12000, salario:3500, efCap:0.8,  tam:4e12, fi:1.1, retCap:0.14},
  'Energy':       {multiploBase:8,  margen:0.40, crecBase:0.003, vol:0.25, ipe:28000, salario:6000, efCap:0.4,  tam:6e12, fi:1.4, retCap:0.12},
  'Finance':      {multiploBase:10, margen:0.50, crecBase:0.006, vol:0.30, ipe:26000, salario:7000, efCap:0.6,  tam:5e12, fi:1.2, retCap:0.18},
  'Real Estate': {multiploBase:12, margen:0.70, crecBase:0.002, vol:0.15, ipe:11000, salario:4000, efCap:0.07, tam:3e12, fi:1.0, retCap:0.09},
  'Transportation':    {multiploBase:7,  margen:0.25, crecBase:0.004, vol:0.25, ipe:14000, salario:3000, efCap:0.7,  tam:2e12, fi:1.3, retCap:0.13},
  'Media':        {multiploBase:9,  margen:0.55, crecBase:0.005, vol:0.35, ipe:15000, salario:5000, efCap:1.0,  tam:1e12, fi:1.0, retCap:0.2},
  'Healthcare':         {multiploBase:11, margen:0.45, crecBase:0.005, vol:0.15, ipe:14000, salario:5500, efCap:0.9,  tam:4e12, fi:1.1, retCap:0.16}
};
var LISTA_SECTORES = Object.keys(SECTORES);
(function(){ var i,k,s2; for(i=0;i<LISTA_SECTORES.length;i++){ k=LISTA_SECTORES[i]; s2=SECTORES[k];
  s2.capEmp = s2.ipe*12/s2.efCap; } })();
function SEC(n){ return SECTORES[n] || SECTORES['Services']; }

/* Constantes de balance (ajustables; ver NOTAS.md) */
var BAL = {
  costoVida: 1200, costoVidaDificil: 2000,
  capexRampaMeses: 6, kCapex: 1.04,
  depreciacion: 0.004,
  decayCrecimiento: 0.985,
  pisoRendimiento: 0.5,
  dividendoColchon: 1, acopleCostos: 0.35,
  infl: 0.002,
  probEvento: 0.25,
  rivalBase: 900000, rivalRatio: 0.82,
  mesesParaVictoria: 24
};

var NOMBRES_PILA = ['Helena','Dmitri','Amara','Kenji','Sofia','Lars','Nadia','Omar','Ingrid','Rafael','Mei','Tariq','Beatriz','Soren','Yara','Giancarlo','Priya','Viktor','Camila','Hiroshi','Zola','Anders','Leyla','Mateo','Fiona','Ravi','Astrid','Emeka','Lucia','Johan','Noor','Caio','Elif','Bjorn','Rania','Tomas','Ayesha','Gustav','Ximena','Kwame'];
var APELLIDOS = ['Varga','Oyelaran','Krauss','Tanaka','Delgado','Nystrom','Petrov','Haddad','Lindqvist','Moreira','Chen','Benali','Ferreira','Dahl','Okonkwo','Rossi','Nair','Volkov','Araya','Yamada','Mbeki','Holm','Demir','Salazar','Gallagher','Iyer','Berg','Adeyemi','Prieto','Vos','Rahman','Mendes','Yilmaz','Eriksen','Aziz','Novak','Khan','Weber','Cordero','Asante'];
var PAISES = ['Mexico','Brazil','USA','Germany','Japan','India','Nigeria','Sweden','Russia','Spain','China','UAE','France','Norway','Korea','Italy','Canada','Turkey','Argentina','South Africa','United Kingdom','Netherlands','Indonesia','Chile','Egypt','Poland','Vietnam','Colombia','Australia','Kenya'];
var ESTILOS = ['aggressive','conservative','political','builder'];

var PRE_EMP = ['North','Vega','Arc','Lumen','Prisma','Delta','Orb','Cedar','Beacon','Kairos','Nexo','Copper','Atlas','Zafiro','Meridian','Harbor','Aurora','Solstice','Granite','Vertex','Lynx','Agora','Breeze','Span','Quark'];
var SUF_EMP = {
  'Services':['Consulting','Partners','Group','Services','Advisors'],
  'Retail':['Retail','Market','Commerce','Stores','Trading'],
  'Technology':['Labs','Systems','Software','Tech','Data'],
  'Manufacturing':['Industrial','Manufacturing','Works','Factories','Metal'],
  'Energy':['Energy','Power','Petro','Renewables','Grid'],
  'Finance':['Capital','Bank','Financial','Insurance','Credit'],
  'Real Estate':['Properties','Realty','Developments','Estates','Towers'],
  'Transportation':['Logistics','Cargo','Transport','Fleet','Routes'],
  'Media':['Media','Press','Broadcast','Editorial','Studios'],
  'Healthcare':['Healthcare','Clinics','Pharma','BioMed','Hospitals']
};
var NOMBRES_STARTUP = ['Zenith','Flux','Nimbus','Quanta','Orbital','Helix','Pulse','Vortex','Stratos','Cygnus','Aether','Lumina','Kestrel','Tesela','Argos'];

var ORIGENES = [
  {id:'empleo', nombre:'Job', sector:'Services', esEmpleo:true, inv:0,
   ingresos:3000, margen:1.0, gastos:0, crec:0.003, crecBase:0.003, vol:0, activos:0, empleados:0,
   ensena:'Steady income with no scale: time does not multiply.',
   desc:'You collect a salary. Zero risk, zero leverage. It gives you cash to start something.'},
  {id:'agencia', nombre:'Agency', sector:'Services', inv:2000,
   ingresos:2500, margen:0.70, gastos:800, crec:0.014, crecBase:0.005, vol:0.20, activos:2000, empleados:1,
   ensena:'You sell hours: you scale by hiring, not by reinvesting.',
   desc:'High margin, little capital. It grows with every person you hire.'},
  {id:'ecommerce', nombre:'E-commerce', sector:'Retail', inv:4000,
   ingresos:4000, margen:0.35, gastos:600, crec:0.020, crecBase:0.006, vol:0.35, activos:4000, empleados:1,
   ensena:'Inventory is assets: low margin, high turnover.',
   desc:'Every dollar invested turns into sales fast, but the margin is unforgiving.'},
  {id:'software', nombre:'Software', sector:'Technology', inv:2000,
   ingresos:600, margen:0.90, gastos:1000, crec:0.038, crecBase:0.009, vol:0.30, activos:2000, empleados:1,
   ensena:'High fixed cost, zero marginal cost: you lose money until you compound.',
   desc:'It starts at a loss. It pays to take a job while it grows.'},
  {id:'ventas', nombre:'Commission sales', sector:'Services', inv:0,
   ingresos:3500, margen:0.95, gastos:300, crec:0.010, crecBase:0.005, vol:0.60, activos:0, empleados:1,
   ensena:'Income without assets: volatility is the price.',
   desc:'Great months and terrible months. No capital to back you up.'}
];

/* ---------------- TERMINOS ---------------- */
/* q(S) devuelve {texto, ops:[{t,ok}], expl} con numeros reales */
var TERMINOS = [
 {id:'ingresos', nombre:'Revenue', grupo:'basicos', def:'All the money that comes in from selling. It is not what you earn: it is what you bill before paying anything.'},
 {id:'utilidad', nombre:'Profit', grupo:'basicos', def:'What is left of revenue after subtracting all costs, interest and taxes.'},
 {id:'activos', nombre:'Assets', grupo:'basicos', def:'What the company owns and uses to produce: inventory, equipment, buildings, cash.'},
 {id:'pasivos', nombre:'Liabilities', grupo:'basicos', def:'What the company owes: bank debt, bonds, obligations.'},
 {id:'equity', nombre:'Equity', grupo:'basicos', def:'Assets minus liabilities. What is truly yours if everything were liquidated today.',
   q:function(S){
     var nice = function(x){ var p = Math.pow(10, Math.floor(Math.log(Math.max(1,x))/Math.LN10)-1); return Math.max(1000, Math.round(x/p)*p); };
     var base = (S && typeof patrimonio==='function') ? Math.max(20000, patrimonio(S)*3) : 2e7;
     var p = nice(base), a = nice(p*2.5), d = nice(a*0.7), eq = a-d;
     return {texto:'A company your size is for sale for '+fmt(p)+'. It has assets of '+fmt(a)+' and debts of '+fmt(d)+'. What is its equity?',
     ops:[{t:fmt(a)},{t:fmt(eq),ok:1},{t:fmt(p)}],
     expl:'Equity = assets − liabilities = '+fmt(a)+' − '+fmt(d)+' = '+fmt(eq)+'. The price ('+fmt(p)+') and the assets ('+fmt(a)+') are not the equity.'};}},
 {id:'margen', nombre:'Gross margin', def:'Percentage of every dollar sold that survives the cost of sales. It defines how much growing pays off.',
   q:function(S){
     var a=5000, b=5000;
     return {texto:'Two companies bill '+fmt(a*12)+' a year. A has a 35% gross margin, B has 80%. If both add '+fmt(b)+' of sales a month by hiring someone who costs '+fmt(2500)+'/mo, which one makes money from that hire?',
       ops:[{t:'Only B (80%): leaves '+fmt(b*0.8-2500)+'/mo',ok:1},{t:'Both the same, they sell the same'},{t:'Only A, because it sells cheaper'}],
       expl:'A: '+fmt(b)+' × 35% = '+fmt(b*0.35)+' < '+fmt(2500)+' of salary → loses. B: '+fmt(b)+' × 80% = '+fmt(b*0.8)+' > '+fmt(2500)+' → wins. Margin decides whether growing makes you rich or ruins you.'};}},
 {id:'ebitda', nombre:'EBITDA', def:'Gross profit minus fixed costs: what the business generates by operating, before interest, taxes and depreciation.',
   q:function(S){
     var e = S.__ebitdaAnual || 120000;
     return {texto:'Your company generates an annual EBITDA of '+fmt(e)+'. The bank lends at most 3 times annual EBITDA. How much debt would it give you?',
       ops:[{t:fmt(e*3), ok:1},{t:fmt(e/3)},{t:fmt(e*12)}],
       expl:'3 × annual EBITDA = 3 × '+fmt(e)+' = '+fmt(e*3)+'. The bank lends against your ability to generate cash, not against your revenue.'};}},
 {id:'flujo', nombre:'Cash flow', def:'The money that actually comes in and goes out each month. A profitable company can die if it runs out of cash.',
   q:function(S){
     return {texto:'You have '+fmt(12000)+'. You invest '+fmt(10000)+' in inventory that will raise your revenue in 6 months, but your payroll is '+fmt(4000)+'/mo. What happens next month?',
       ops:[{t:'Nothing, the investment was profitable'},{t:'You run out of cash even though the company is profitable',ok:1},{t:'The bank lends to you automatically'}],
       expl:'You are left with '+fmt(2000)+' and must pay '+fmt(4000)+' of payroll. Profitable ≠ liquid: cash runs out before the return arrives.'};}},
 {id:'apalancamiento', nombre:'Debt and leverage', def:'Leverage = debt / annual EBITDA. It multiplies gains and losses equally; above 4 is the danger zone.',
   q:function(S){
     var e=S.__ebitdaAnual||200000;
     return {texto:'Your company generates '+fmt(e)+' of annual EBITDA and owes '+fmt(e*5)+'. A recession hits and EBITDA falls 30%. What happens to your leverage?',
       ops:[{t:'It rises from 5x to 7.1x and the bank gets nervous',ok:1},{t:'It falls, because the debt did not change'},{t:'It stays at 5x'}],
       expl:'Debt '+fmt(e*5)+' / EBITDA '+fmt(e*0.7)+' = 7.1x. Debt is fixed; EBITDA is not. That is why debt kills in a recession.'};}},
 {id:'respLimitada', nombre:'Limited liability', def:'The debts of a company belong to the company. If it goes bankrupt you lose what you invested, not your personal net worth.',
   q:function(){ return {texto:'One of your companies has negative equity and cannot pay the bank. Do you have to pay its debts with your personal money?',
     ops:[{t:'Yes, all of them'},{t:'No: you lose the company, not your pocket',ok:1},{t:'Yes, half'}],
     expl:'The bank takes the company. You lose the invested capital and reputation, but your personal cash is protected. That is why businesses are set up as corporations.'};}},
 {id:'valoracion', nombre:'Valuation and multiples', def:'A company is worth its annual EBITDA × a sector multiple. The multiple rises if it grows and falls if rates rise.',
   q:function(){ return {texto:'Two companies cost $10M. A generates $2M of annual EBITDA; B generates $1M. Which one has the lower multiple (is cheaper)?',
     ops:[{t:'A: 5x EBITDA',ok:1},{t:'B: 10x EBITDA'},{t:'Both the same, they cost the same'}],
     expl:'A: 10/2 = 5x. B: 10/1 = 10x. The price says nothing without the EBITDA behind it.'};}},
 {id:'roi', nombre:'ROI', def:'Return on investment: (what you receive − what you put in) / what you put in. It ignores time.',
   q:function(){ return {texto:'You invest $200k and get back $500k. What is your ROI?',
     ops:[{t:'150%',ok:1},{t:'250%'},{t:'50%'}],
     expl:'(500 − 200)/200 = 1.5 = 150%. You get back 2.5 times what you invested, but the gain is 1.5 times.'};}},
 {id:'tir', nombre:'IRR', def:'The annual rate at which your money grows. At the same multiple, the faster it arrives, the higher the IRR.',
   q:function(){ return {texto:'Startup A: $100k → $300k in 3 years. Startup B: $100k → $400k in 6 years. Which one has the higher IRR?',
     ops:[{t:'A (≈44% per year)',ok:1},{t:'B (makes more money)'},{t:'Equal'}],
     expl:'A: 3^(1/3)−1 = 44% per year. B: 4^(1/6)−1 = 26% per year. B returns more money, but A frees up your capital in half the time.'};}},
 {id:'dd', nombre:'Due diligence', def:'Reviewing the numbers of a company before buying it. It costs little; skipping it costs everything.',
   q:function(){ return {texto:'You are about to pay $1M for a company. The audit costs $10k (1%) and in 1 of every 5 cases it uncovers hidden debt of hundreds of thousands. Is it worth it?',
     ops:[{t:'Yes: 1% as insurance against a 20% disaster',ok:1},{t:'No, it makes the purchase more expensive'},{t:'Only if the seller asks for it'}],
     expl:'You pay 1% to avoid a much larger expected loss. It also gives you leverage to renegotiate the price.'};}},
 {id:'dilucion', nombre:'Dilution', def:'When you sell a new stake, your percentage drops. It is only worth it if the pie grows more than your slice shrinks.',
   q:function(){ return {texto:'Your company is worth $8M and you own 100% today. You raise $2M from investors. What percentage do you keep?',
     ops:[{t:'80%',ok:1},{t:'75%'},{t:'100%'}],
     expl:'Post-money valuation = 8 + 2 = $10M. Your share = 8/10 = 80%. 80% of a company with $2M in cash can be worth more than 100% without it.'};}},
 {id:'preferentes', nombre:'Preferred stock', def:'Capital that earns a priority fixed dividend but has no vote. It gives you money without losing control, in exchange for a fixed cost.',
   q:function(){ return {texto:'You issue $10M in preferred stock at 8% a year. Your annual EBITDA is $1M. What risk do you take on?',
     ops:[{t:'You owe a fixed $800k/yr against $1M of EBITDA: almost everything is committed',ok:1},{t:'None, it is not debt'},{t:'You lose control of the company'}],
     expl:'It does not dilute or vote, but the dividend is priority and fixed. With EBITDA of $1M, $800k a year leaves you gasping at any downturn.'};}},
 {id:'bonos', nombre:'Debt issuance (bonds)', def:'You borrow from the market: you only pay interest and the principal comes due in full at the end.',
   q:function(){ return {texto:'You issue $50M for 10 years at 7%. For 10 years you pay $3.5M/yr. What happens in year 10?',
     ops:[{t:'You must repay the full $50M or refinance at the rate of that moment',ok:1},{t:'Nothing, you already paid interest'},{t:'It converts into shares'}],
     expl:'That is refinancing risk: if rates are at 12% in year 10, refinancing costs you $6M/yr instead of $3.5M.'};}},
 {id:'mya', nombre:'M&A and synergies', def:'When you merge two companies you add revenue and cut duplicated costs. The synergy is real; the integration costs too.',
   q:function(){ return {texto:'You merge two companies with $10M of combined fixed costs. Without layoffs the savings are 8%; with layoffs 18% but you lose reputation. What do you buy with the layoffs?',
     ops:[{t:'$1M/yr of extra EBITDA in exchange for reputation and strike risk',ok:1},{t:'Nothing, it is the same'},{t:'More revenue'}],
     expl:'18% − 8% = 10% of $10M = $1M/yr. Reputation is paid for later in rates, purchase prices and influence multiplier.'};}},
 {id:'antimonopolio', nombre:'Monopoly and antitrust', def:'Dominating a sector multiplies your influence, but above 25% market share the State steps in.',
   q:function(){ return {texto:'You control 42% of a sector. An investigation arrives. Which option keeps more influence in the long run?',
     ops:[{t:'Pay the fine and keep operating',ok:1},{t:'Forced sale of companies at 0.9x valuation'},{t:'Deny everything publicly'}],
     expl:'The fine is a one-time hit to cash; the forced sale destroys recurring revenue, which is where your economic influence comes from.'};}},
 {id:'poderMercado', nombre:'Market power', def:'With ≥10% of a sector your economic influence gets a 1.25x bonus, and 1.5x with ≥25%.',
   q:function(){ return {texto:'You can have $1B in revenue spread across 10 sectors, or $1B concentrated in a single one where you would hold 12%. Which gives more influence?',
     ops:[{t:'Concentrated: it triggers the 1.25x dominance bonus',ok:1},{t:'Diversified, always'},{t:'It is identical'}],
     expl:'Concentrating multiplies influence, but it also attracts antitrust and leaves you exposed to a crisis in that sector. It is a trade-off, not an obvious answer.'};}},
 {id:'bancoCentral', nombre:'Central bank and interest rate', def:'The rate is the price of money: it raises the cost of your debt and lowers the multiple at which all companies are valued.',
   q:function(){ return {texto:'The rate goes from 5% to 9%. You have variable-rate debt and want to sell a company. What happens?',
     ops:[{t:'You pay more interest and you also get paid less for it',ok:1},{t:'Only the interest changes'},{t:'Your company is worth more because there is inflation'}],
     expl:'Double hit: the cost of debt rises and valuation multiples compress. High rates transfer value from the owner to the lender.'};}},
 {id:'riesgoPolitico', nombre:'Political risk', def:'The more you use power (lobbying, media, your own banks), the more likely the system is to react against you.',
   q:function(){ return {texto:'You spend $100M on lobbying. You gain immediate political influence. What is the hidden cost?',
     ops:[{t:'Political risk rises: scandals and investigations become likely',ok:1},{t:'None if you have a good reputation'},{t:'Only the money spent'}],
     expl:'Political risk feeds negative events every month. It is offset with philanthropy, transparency and time.'};}},
 {id:'costoCapital', nombre:'Cost of capital (reputation)', def:'Your reputation is a financial number: it defines the spread on your loans, the price at which people sell to you and your influence multiplier.',
   q:function(){ return {texto:'With reputation 30 you pay 2 points more in interest than with reputation 70. On $100M of debt, how much does that bad reputation cost per year?',
     ops:[{t:'$2M a year',ok:1},{t:'Nothing measurable'},{t:'$200k a year'}],
     expl:'2% × $100M = $2M/yr, every year. And your influence is also multiplied by 0.8 instead of 1.2. Reputation is money.'};}}
];
function TERMINO(id){ for(var i=0;i<TERMINOS.length;i++) if(TERMINOS[i].id===id) return TERMINOS[i]; return null; }
var TERMINOS_BASICOS = ['ingresos','utilidad','activos','pasivos','equity'];
