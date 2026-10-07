'use strict';
/* RNG determinista (mulberry32) con estado dentro del save + utilidades numericas seguras */

function clamp(x,a,b){ x=+x; if(!isFinite(x)) x=a; return x<a?a:(x>b?b:x); }
function num(x,d){ x=+x; return isFinite(x)?x:(d===undefined?0:d); }
function sum(arr,f){ var t=0,i; for(i=0;i<arr.length;i++) t+=num(f?f(arr[i],i):arr[i],0); return t; }

function rnd(S){
  S.rngState = (num(S.rngState,1) + 0x6D2B79F5)|0;
  var t = S.rngState;
  t = Math.imul(t ^ (t>>>15), t|1);
  t ^= t + Math.imul(t ^ (t>>>7), t|61);
  return ((t ^ (t>>>14))>>>0)/4294967296;
}
function U(S,a,b){ return a+(b-a)*rnd(S); }
function ri(S,a,b){ return Math.floor(a+(b-a+1)*rnd(S)); }
function pick(S,a){ return a[Math.min(a.length-1,Math.floor(rnd(S)*a.length))]; }
function chance(S,p){ return rnd(S) < p; }
function gauss(S){
  var u=1-rnd(S), v=rnd(S);
  return clamp(Math.sqrt(-2*Math.log(u||1e-9))*Math.cos(2*Math.PI*v), -3, 3);
}
function pickW(S,arr,pesos){
  var t=sum(pesos), r=rnd(S)*t, i;
  if(t<=0) return arr[0];
  for(i=0;i<arr.length;i++){ r-=num(pesos[i],0); if(r<=0) return arr[i]; }
  return arr[arr.length-1];
}
function uid(S){ S.nextId=num(S.nextId,1)+1; return S.nextId; }
function semillaDeTexto(t){
  var h=2166136261, i;
  t=String(t||'');
  for(i=0;i<t.length;i++){ h^=t.charCodeAt(i); h=Math.imul(h,16777619); }
  return (h>>>0)||1;
}
