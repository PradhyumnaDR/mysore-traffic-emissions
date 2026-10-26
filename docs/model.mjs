export const FACTOR_SOURCE='https://www.discoveryjournals.org/climate_change/current_issue/v4/n16/A6.pdf';
export const IDLE_SOURCE='https://www.researchgate.net/publication/318788877_Evaluation_of_Idling_Fuel_Consumption_of_Vehicles_Across_Different_Cities';
export const FLEET_SOURCE='https://timesofindia.indiatimes.com/city/mysuru/mysuru-adds-1-7l-vehicles-in-2-years-traffic-woes-deepen/articleshow/129410092.cms';
export const fleet={date:'31 March 2025',reportedTotal:1624214,counts:{'2w':1329184,'3w':44866,'4w':234931,bus:15233}};
export const vehiclePresets={low:{days:11,normalPercent:10,dasaraIncrease:40},central:{days:11,normalPercent:15,dasaraIncrease:40},high:{days:11,normalPercent:20,dasaraIncrease:40}};
export function estimateScenario({days,normalPercent,dasaraIncrease}){
 if(!Number.isInteger(days)||days<1||days>366)throw new RangeError('Days must be an integer from 1 to 366');
 if(!Number.isFinite(dasaraIncrease)||dasaraIncrease<0||dasaraIncrease>1000)throw new RangeError('Dasara increase must be between 0 and 1000 percent');
 const normal=estimateOutings(normalPercent);
 const dasara=Object.fromEntries(Object.entries(normal).map(([id,count])=>[id,Math.round(count*(1+dasaraIncrease/100))]));
 const normalTotal=Object.values(normal).reduce((a,n)=>a+n,0),dasaraTotal=Object.values(dasara).reduce((a,n)=>a+n,0);
 return {normal,dasara,normalTotal,dasaraTotal,normalDaily:normalTotal/days,dasaraDaily:dasaraTotal/days};
}
export const NORMAL_SOURCE='https://www.ijera.com/papers/vol10no6/Series-1/B1006011222.pdf';
export const fuelProxies={
 '2w':'Petrol · four-stroke motorcycle',
 '3w':'Petrol · two-stroke three-wheeler (historical proxy)',
 '4w':'Petrol · MPFI car (proxy for mixed car fleet)',
 bus:'Diesel · direct-injection bus'
};
export function defaultDailyChanges(days=11){
 const profile=[0,8,8,8,1,1,1,1,1,15,-20];
 return Array.from({length:days},(_,i)=>profile[i]??0);
}
export function resizeDailyProfile(changes,days){return defaultDailyChanges(days).map((fallback,i)=>i===0?0:changes?.[i]??fallback);}
export function dailyWeights(changes){
 if(!Array.isArray(changes)||changes.length<1||changes.length>366||changes[0]!==0||changes.some(v=>!Number.isFinite(v)||v< -95||v>100))throw new RangeError('Daily changes must be from -95 to 100 percent, with day 1 fixed at zero');
 const logs=[0];for(let i=1;i<changes.length;i++)logs.push(logs[i-1]+Math.log1p(changes[i]/100));
 const max=Math.max(...logs);return logs.map(v=>Math.exp(v-max));
}
export function allocateOutings(total,weights){
 if(total===null)return weights.map(()=>null);
 if(!Number.isSafeInteger(total)||total<0)throw new RangeError('Outings must be a nonnegative integer');
 const sum=weights.reduce((a,w)=>a+w,0);if(!Number.isFinite(sum)||sum<=0||weights.some(w=>!Number.isFinite(w)||w<0))throw new RangeError('Invalid daily weights');
 const quotas=weights.map(w=>total*w/sum),counts=quotas.map(Math.floor);
 const order=quotas.map((q,i)=>({i,fraction:q-counts[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
 const remainder=total-counts.reduce((a,n)=>a+n,0);for(let i=0;i<remainder;i++)counts[order[i%order.length].i]++;
 return counts;
}
export function calculateDaily(s){
 const days=s.profileDays??s.countBasis?.days??11,changes=resizeDailyProfile(s.dailyChanges,days);
 const weights=dailyWeights(changes),uniform=Array(days).fill(1),distance=2*s.homeKm+s.sightseeingKm;
 const allocated=s.rows.map(r=>({normal:allocateOutings(r.regularN,uniform),dasara:allocateOutings(r.dasaraN,weights),factor:distance*r[s.pollutant]/1000}));
 const sum=(type,index,emissions=false)=>allocated.some(r=>r[type][index]===null)?null:allocated.reduce((a,r)=>a+r[type][index]*(emissions?r.factor:1),0);
 return Array.from({length:days},(_,i)=>({day:i+1,changePercent:changes[i],normalCount:sum('normal',i),dasaraCount:sum('dasara',i),normalEmissions:sum('normal',i,true),dasaraEmissions:sum('dasara',i,true)}));
}
const central=estimateScenario(vehiclePresets.central);
export const defaults={version:8,profileDays:11,dailyChanges:defaultDailyChanges(11),countBasis:{...vehiclePresets.central},homeKm:10,sightseeingKm:22.5,regularWait:10,dasaraWait:40,pollutant:'CO2',selectedVehicle:'4w',rows:[
 {id:'2w',name:'Two-wheelers',regularN:central.normal['2w'],dasaraN:central.dasara['2w'],CO2:27.849,CO:2.822,NOx:0.137,PM:0.033,idleFuelLph:0.144},
 {id:'3w',name:'Autos / three-wheelers',regularN:central.normal['3w'],dasaraN:central.dasara['3w'],CO2:84.534,CO:2.890,NOx:0.393,PM:0.157,idleFuelLph:0.240},
 {id:'4w',name:'Cars / four-wheelers',regularN:central.normal['4w'],dasaraN:central.dasara['4w'],CO2:139.383,CO:1.601,NOx:0.431,PM:0.042,idleFuelLph:0.540},
 {id:'bus',name:'Buses',regularN:central.normal.bus,dasaraN:central.dasara.bus,CO2:776.462,CO:5.830,NOx:9.2,PM:0.929,idleFuelLph:0.900},
]};
export function calculate(s){
 const distance=2*s.homeKm+s.sightseeingKm;
 const extraWait=Math.max(0,s.dasaraWait-s.regularWait),extraHours=extraWait/60;
 const fuelPerOuting=(rate,minutes)=>minutes===0?0:rate==null?null:rate*minutes/60;
 const scale=(n,value)=>n===null?null:n===0?0:value===null?null:n*value;
 const rows=s.rows.map(r=>{
  const perDistance=distance*r[s.pollutant]/1000;
  const normalFuelPerOuting=fuelPerOuting(r.idleFuelLph,s.regularWait);
  const dasaraFuelPerOuting=fuelPerOuting(r.idleFuelLph,s.dasaraWait);
  const extraFuelPerOuting=fuelPerOuting(r.idleFuelLph,extraWait);
  return {...r,perDistance,regular:scale(r.regularN,perDistance),dasara:scale(r.dasaraN,perDistance),normalFuelPerOuting,dasaraFuelPerOuting,extraFuelPerOuting,normalFuel:scale(r.regularN,normalFuelPerOuting),dasaraFuel:scale(r.dasaraN,dasaraFuelPerOuting),extraFuel:scale(r.dasaraN,extraFuelPerOuting)};
 });
 const total=key=>rows.every(r=>r[key]!==null)?rows.reduce((a,r)=>a+r[key],0):null;
 const known=key=>rows.reduce((a,r)=>a+(r[key]??0),0);
 const regular=total('regular'),dasara=total('dasara');
 const regularCount=total('regularN'),dasaraCount=total('dasaraN');
 const comparisonComplete=regular!==null&&dasara!==null;
 return {rows,distance,extraWait,extraHours,regular,dasara,regularCount,dasaraCount,comparisonComplete,
 delta:comparisonComplete?dasara-regular:null,percent:comparisonComplete&&regular>0?(dasara/regular-1)*100:null,
 missingRegularCounts:rows.filter(r=>r.regularN===null).map(r=>r.name),missingDasaraCounts:rows.filter(r=>r.dasaraN===null).map(r=>r.name),
 normalFuel:total('normalFuel'),dasaraFuel:total('dasaraFuel'),extraFuel:total('extraFuel'),
 knownNormalFuel:known('normalFuel'),knownDasaraFuel:known('dasaraFuel'),knownExtraFuel:known('extraFuel'),
 missingFuel:rows.filter(r=>r.idleFuelLph==null&&((r.regularN!==0&&s.regularWait>0)||(r.dasaraN!==0&&s.dasaraWait>0))).map(r=>r.name),
 referenceOnly:s.dasaraWait<s.regularWait};
}
function validCountBasis(b){try{estimateScenario(b);return true}catch{return false}}
export function validState(s){
 const n=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 return s?.version===8&&Number.isInteger(s.profileDays)&&n(s.profileDays,1,366)&&Array.isArray(s.dailyChanges)&&s.dailyChanges.length===s.profileDays&&s.dailyChanges[0]===0&&s.dailyChanges.every(v=>n(v,-95,100))&&(s.countBasis==null||validCountBasis(s.countBasis))&&n(s.homeKm,0,1000)&&n(s.sightseeingKm,0,1000)&&n(s.regularWait,0,1440)&&n(s.dasaraWait,0,1440)&&['CO2','CO','NOx','PM'].includes(s.pollutant)&&defaults.rows.some(r=>r.id===s.selectedVehicle)&&Array.isArray(s.rows)&&s.rows.length===defaults.rows.length&&s.rows.every((r,i)=>r.id===defaults.rows[i].id&&['regularN','dasaraN'].every(k=>r[k]===null||Number.isInteger(r[k])&&n(r[k],0,1e9))&&['CO2','CO','NOx','PM'].every(k=>n(r[k],0,1e9))&&(r.idleFuelLph===null||n(r.idleFuelLph,0,1000)));
}
export function estimateOutings(percent){
 if(!Number.isFinite(percent)||percent<0||percent>100)throw new RangeError('Participation must be between 0 and 100 percent');
 return Object.fromEntries(Object.entries(fleet.counts).map(([id,count])=>[id,count===null?null:Math.round(count*percent/100)]));
}
export function migrateSaved(old){
 const s=structuredClone(defaults);if(!old)return s;
 for(const k of ['homeKm','sightseeingKm','regularWait','dasaraWait','pollutant','selectedVehicle'])if(old[k]!==undefined)s[k]=old[k];
 if(!defaults.rows.some(r=>r.id===s.selectedVehicle))s.selectedVehicle='4w';
 for(const r of s.rows){const prev=old.rows?.find(x=>x.id===r.id);if(!prev)continue;
  for(const k of ['CO2','CO','NOx','PM'])if(Number.isFinite(prev[k])&&prev[k]>=0)r[k]=prev[k];
  if([6,7,8].includes(old.version)&&(prev.idleFuelLph===null||Number.isFinite(prev.idleFuelLph)&&prev.idleFuelLph>=0))r.idleFuelLph=prev.idleFuelLph;
  // Preserve the current four-class scenario; earlier versions use the reduced baseline.
  if([7,8].includes(old.version))for(const k of ['regularN','dasaraN'])if(prev[k]!==undefined)r[k]=prev[k];
 }
 if([7,8].includes(old.version))s.countBasis=old.countBasis??null;
 s.profileDays=old.profileDays??s.countBasis?.days??11;
 s.dailyChanges=resizeDailyProfile(old.version===8?old.dailyChanges:null,s.profileDays);
 return validState(s)?s:structuredClone(defaults);
}
