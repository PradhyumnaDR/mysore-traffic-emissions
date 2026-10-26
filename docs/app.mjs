import {defaults,validState,calculate,calculateDaily,estimateScenario,defaultDailyChanges,resizeDailyProfile,fleet} from './model.mjs';
import {dailyChartSvg} from './daily-chart.mjs';
import {exportRows} from './export.mjs';
import {vehicleChartsHtml} from './vehicle-chart.mjs';
const $=id=>document.getElementById(id),pollutants=['CO2','CO','NOx','PM'];
const names={CO2:'CO₂',CO:'CO',NOx:'NOₓ',PM:'PM'},storageKey='mysuru-simplified-v1';
const number=(v,d=2)=>v===null?'—':v.toLocaleString('en-GB',{maximumFractionDigits:d});
const initialState=()=>({...structuredClone(defaults),manualCounts:false,normalPercent:15,dasaraIncrease:40});
let state=initialState(),chartPollutant='CO2';
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&validState(saved.state)){state=saved.state;if(pollutants.includes(saved.chartPollutant))chartPollutant=saved.chartPollutant;}}catch{}
let dailyDraft=[...state.dailyChanges],selectedDay=Math.min(9,state.profileDays-1);
const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify({state,chartPollutant}))}catch{}};
function status(id,message,kind=''){const el=$(id);el.textContent=message;el.classList.remove('pending','error');if(kind)el.classList.add(kind);}
function markPending(){status('main-status','Unapplied changes. Press “Apply changes” to update the results.','pending');}
function inputMarkup(id,value,max,step='any',required=false){return `<input id="${id}" type="number" min="0" max="${max}" step="${step}" ${required?'required':''} value="${value===null?'':value}" aria-label="${id.replaceAll('-',' ')}">`;}
function syncForm(){
 $('tripDistance').value=2*state.homeKm+state.sightseeingKm;$('regularWait').value=state.regularWait;$('dasaraWait').value=state.dasaraWait;
 $('dasaraIncrease').value=state.dasaraIncrease??state.countBasis?.dasaraIncrease??40;$('normalShare').value=state.normalPercent??state.countBasis?.normalPercent??15;$('periodDays').value=state.profileDays;$('manualCounts').checked=!!state.manualCounts;
 $('vehicle-inputs').innerHTML=state.rows.map((r,i)=>`<tr><td>${defaults.rows[i].name}</td><td>${number(fleet.counts[r.id],0)}</td><td>${inputMarkup('normal-count-'+i,r.regularN,1e9,'1',true)}</td></tr>`).join('');
 $('rate-inputs').innerHTML=state.rows.map((r,i)=>`<tr><td>${defaults.rows[i].name}</td>${pollutants.map(p=>`<td>${inputMarkup('rate-'+i+'-'+p,r[p],1e9,'any',true)}</td>`).join('')}<td>${inputMarkup('fuel-rate-'+i,r.idleFuelLph,1000)}</td></tr>`).join('');
 updateEditMode();
}
function updateEditMode(){const manual=$('manualCounts').checked;$('normalShare').disabled=manual;state.rows.forEach((_,i)=>$('normal-count-'+i).disabled=!manual);$('rate-fields').disabled=!$('editRates').checked;status('count-mode-note',manual?'Manual mode: enter normal round trips below. Dasara uses the vehicle increase above.':'Normal round trips are calculated from registered vehicles and the participation share.');}
function readNumber(id,min,max,{integer=false,nullable=false}={}){
 const el=$(id),value=el.value===''&&nullable?null:Number(el.value);
 if(value===null)return null;
 if(el.value===''||!Number.isFinite(value)||value<min||value>max||integer&&!Number.isInteger(value)){el.classList.add('invalid');el.setAttribute('aria-invalid','true');el.reportValidity?.();throw new Error('Check the highlighted input. Results still use the previous applied inputs.');}
 el.classList.remove('invalid');el.removeAttribute('aria-invalid');return value;
}
function applyMain(){
 try{
  const next=structuredClone(state),distance=readNumber('tripDistance',0,1000),days=readNumber('periodDays',1,366,{integer:true});
  next.homeKm=0;next.sightseeingKm=distance;next.regularWait=readNumber('regularWait',0,1440);next.dasaraWait=readNumber('dasaraWait',0,1440);next.profileDays=days;next.dasaraIncrease=readNumber('dasaraIncrease',0,1000);next.manualCounts=$('manualCounts').checked;
  next.normalPercent=next.manualCounts?state.normalPercent??15:readNumber('normalShare',0,100);
  if(next.manualCounts){next.countBasis=null;next.rows.forEach((r,i)=>{r.regularN=readNumber('normal-count-'+i,0,1e9,{integer:true});r.dasaraN=Math.round(r.regularN*(1+next.dasaraIncrease/100));});}
  else{next.countBasis={days,normalPercent:next.normalPercent,dasaraIncrease:next.dasaraIncrease};const counts=estimateScenario(next.countBasis);next.rows.forEach(r=>{r.regularN=counts.normal[r.id];r.dasaraN=counts.dasara[r.id];});}
  if($('editRates').checked)next.rows.forEach((r,i)=>{pollutants.forEach(p=>r[p]=readNumber('rate-'+i+'-'+p,0,1e9));r.idleFuelLph=readNumber('fuel-rate-'+i,0,1000,{nullable:true});});
  next.dailyChanges=resizeDailyProfile(state.dailyChanges,days);if(!validState(next))throw new Error('These inputs are outside the model limits. Results have not changed.');
  const changes=[];if(distance!==2*state.homeKm+state.sightseeingKm)changes.push('distance');if(next.regularWait!==state.regularWait||next.dasaraWait!==state.dasaraWait)changes.push('idling times');if(next.rows.some((r,i)=>r.regularN!==state.rows[i].regularN||r.dasaraN!==state.rows[i].dasaraN))changes.push('vehicle counts');if(days!==state.profileDays)changes.push('comparison period');if(next.rows.some((r,i)=>r.idleFuelLph!==state.rows[i].idleFuelLph||pollutants.some(p=>r[p]!==state.rows[i][p])))changes.push('reference rates');
  const periodChanged=days!==state.profileDays;state=next;if(periodChanged){dailyDraft=[...state.dailyChanges];createDailyInputs();status('daily-status','Comparison period updated. The daily editor shows the applied profile.');}
  syncForm();renderResults();renderChart();persist();status('main-status',changes.length?'Updated '+changes.join(', ')+'. Results are current.':'Inputs applied. Results are current.');
 }catch(error){status('main-status',error.message,'error');}
}
function renderResults(){
 const all=pollutants.map(p=>({p,result:calculate({...state,pollutant:p})})),base=all[0].result;
 $('vehicle-charts').innerHTML=vehicleChartsHtml(state);$('vehicle-chart-detail').textContent='Hover over, tap or focus on a coloured segment to see its contribution in kg.';
 $('period-summary').textContent='Comparison period: '+state.profileDays+' d';
 $('trip-summary').innerHTML=base.regularCount===base.dasaraCount?`<strong>${number(base.regularCount,0)}</strong> vehicle round trips · applies to both traffic conditions`:`Vehicle round trips: <strong>${number(base.regularCount,0)}</strong> normal <span aria-hidden="true">→</span> <strong>${number(base.dasaraCount,0)}</strong> Dasara`;
 const identical=state.rows.every(r=>r.regularN===r.dasaraN);
 $('emissions-head').innerHTML=identical?'<tr><th>Pollutant</th><th>Emissions (kg)</th><th>Applies to</th></tr>':'<tr><th>Pollutant</th><th>Normal (kg)</th><th>Dasara (kg)</th><th>Difference (kg)</th></tr>';
 $('emissions-results').innerHTML=all.map(({p,result:c})=>identical?`<tr><td>${names[p]}</td><td>${number(c.regular)}</td><td>Both conditions</td></tr>`:`<tr><td>${names[p]}</td><td>${number(c.regular)}</td><td>${number(c.dasara)}</td><td>${c.delta>0?'+':''}${number(c.delta)}</td></tr>`).join('');
 const fuelValue=(complete,known)=>number(complete??known)+(complete===null?' *':'');
 const fuelRows=base.normalFuel!==null&&base.normalFuel===base.dasaraFuel?[`<tr><td>Normal and Dasara</td><td>${number(base.normalFuel)}</td></tr>`]:[`<tr><td>Normal</td><td>${fuelValue(base.normalFuel,base.knownNormalFuel)}</td></tr>`,`<tr><td>Dasara</td><td>${fuelValue(base.dasaraFuel,base.knownDasaraFuel)}</td></tr>`];
 if(base.extraWait>0)fuelRows.push(`<tr class="additional"><td>Additional from longer idling</td><td>${fuelValue(base.extraFuel,base.knownExtraFuel)}</td></tr>`);$('fuel-results').innerHTML=fuelRows.join('');
 const fuelNote=base.extraWait>0?'Additional fuel holds Dasara round trips fixed and uses only the extra idling time.':'There is no additional fuel from longer Dasara idling.';
 $('fuel-note').textContent=(base.missingFuel.length?'* Known subtotal; missing fuel consumption rates for '+base.missingFuel.join(', ')+'. ':'')+fuelNote+' Litres combine the stated petrol and diesel reference measurements.';
 const distance=base.distance;$('per-vehicle-results').innerHTML=state.rows.map((r,i)=>`<tr><td>${defaults.rows[i].name}</td>${pollutants.map(p=>`<td>${number(distance*r[p]/1000,4)}</td>`).join('')}</tr>`).join('');
 const equalWait=state.regularWait===state.dasaraWait;
 $('per-fuel-head').innerHTML=equalWait?'<tr><th>Vehicle type</th><th>Fuel (L)</th><th>Applies to</th></tr>':'<tr><th>Vehicle type</th><th>Normal (L)</th><th>Dasara (L)</th><th>Additional (L)</th></tr>';
 $('per-fuel-results').innerHTML=base.rows.map((r,i)=>equalWait?`<tr><td>${defaults.rows[i].name}</td><td>${number(r.normalFuelPerOuting,3)}</td><td>Both conditions</td></tr>`:`<tr><td>${defaults.rows[i].name}</td><td>${number(r.normalFuelPerOuting,3)}</td><td>${number(r.dasaraFuelPerOuting,3)}</td><td>${number(r.extraFuelPerOuting,3)}</td></tr>`).join('');
}
function createDailyInputs(){
 $('daily-inputs').innerHTML=dailyDraft.map((value,i)=>`<tr><td>Day ${i+1}</td><td>${i===0?'Starting day':`<input id="daily-change-${i}" type="number" min="-95" max="100" step="any" value="${value}" aria-label="Day ${i+1} change from previous day, percent">`}</td><td id="daily-normal-${i}"></td><td id="daily-dasara-${i}"></td></tr>`).join('');
}
function renderDayDetail(data=calculateDaily({...state,pollutant:chartPollutant})){
 selectedDay=Math.max(0,Math.min(selectedDay,data.length-1));const d=data[selectedDay];$('chart-detail').textContent=`Day ${d.day} · ${names[chartPollutant]} emissions: normal ${number(d.normalEmissions)} kg/d; Dasara ${number(d.dasaraEmissions)} kg/d.`;
}
function renderChart(){
 const data=calculateDaily({...state,pollutant:chartPollutant});$('daily-heading').textContent='Daily '+names[chartPollutant]+' emissions';$('daily-chart').innerHTML=dailyChartSvg(data,names[chartPollutant]);
 const peak=data.filter(d=>d.dasaraEmissions!==null).reduce((best,d)=>!best||d.dasaraEmissions>best.dasaraEmissions?d:best,null);$('chart-summary').textContent=state.profileDays+' d · '+(peak?'Dasara maximum on day '+peak.day:'Vehicle round-trip counts needed');
 document.querySelectorAll('[data-pollutant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pollutant===chartPollutant)));
 data.forEach((d,i)=>{$('daily-normal-'+i).textContent=number(d.normalCount,0);$('daily-dasara-'+i).textContent=number(d.dasaraCount,0);});renderDayDetail(data);
}
function applyDaily(){try{const next=[0];for(let i=1;i<state.profileDays;i++)next.push(readNumber('daily-change-'+i,-95,100));state.dailyChanges=next;dailyDraft=[...next];renderChart();persist();status('daily-status','Daily profile applied. Period totals are unchanged.');}catch(error){status('daily-status','Check daily changes: use values from −95% to +100%. The applied profile is unchanged.','error');}}
$('main-form').addEventListener('submit',e=>{e.preventDefault();applyMain();});
$('main-form').addEventListener('input',markPending);
$('main-form').addEventListener('change',e=>{if(['manualCounts','editRates'].includes(e.target.id))updateEditMode();markPending();});
$('reset').addEventListener('click',()=>{state=initialState();chartPollutant='CO2';dailyDraft=[...state.dailyChanges];selectedDay=9;$('editRates').checked=false;syncForm();createDailyInputs();renderResults();renderChart();persist();status('main-status','Default inputs restored. Results are current.');status('daily-status','Default daily profile restored.');});
document.querySelectorAll('[data-pollutant]').forEach(b=>b.addEventListener('click',()=>{chartPollutant=b.dataset.pollutant;renderChart();persist();}));
$('daily-inputs').addEventListener('input',()=>status('daily-status','Unapplied daily changes. Press “Apply daily profile” to update the graph.','pending'));
$('applyDaily').addEventListener('click',applyDaily);
$('resetDaily').addEventListener('click',()=>{dailyDraft=defaultDailyChanges(state.profileDays);createDailyInputs();renderChart();status('daily-status','Default percentages loaded. Press “Apply daily profile” to use them.','pending');});
for(const event of ['pointermove','click','focusin'])$('daily-chart').addEventListener(event,e=>{if(e.target.dataset?.day===undefined)return;selectedDay=Number(e.target.dataset.day);renderDayDetail();});
for(const event of ['pointermove','click','focusin'])$('vehicle-charts').addEventListener(event,e=>{if(e.target.dataset?.contribution)$('vehicle-chart-detail').textContent=e.target.dataset.contribution;});
$('export').addEventListener('click',()=>{const rows=exportRows(state,chartPollutant),csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='mysuru-traffic-comparison.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
syncForm();createDailyInputs();renderResults();renderChart();
