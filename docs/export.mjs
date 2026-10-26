import {calculate,calculateDaily,fleet,defaults,fuelProxies,FACTOR_SOURCE,IDLE_SOURCE,FLEET_SOURCE,NORMAL_SOURCE} from './model.mjs';
export function exportRows(state,chartPollutant='CO2'){
 const missing=v=>v===null?'MISSING':v,c=calculate(state),distance=2*state.homeKm+state.sightseeingKm;
 const totals=['CO2','CO','NOx','PM'].map(p=>({p,c:calculate({...state,pollutant:p})}));
 const daily=Object.fromEntries(totals.map(({p})=>[p,calculateDaily({...state,pollutant:p})]));
 return [
 ['Mysuru Dasara: Traffic and Emissions'],['Scope','Applied inputs only. Travel emissions and idling fuel consumption are separate results.'],
 ['Comparison period (d)',state.profileDays],['Round-trip distance (km)',distance],['Normal idling time (min)',state.regularWait],['Dasara idling time (min)',state.dasaraWait],
 ['Dasara vehicle increase (%)',state.dasaraIncrease??state.countBasis?.dasaraIncrease??40],['Normal fleet participation (%)',state.manualCounts?'Manual round-trip counts':state.normalPercent??state.countBasis?.normalPercent??15],
 ['Count basis',state.manualCounts?'Manually entered normal round trips; Dasara applies the selected increase':'Registered fleet multiplied by assumed participation; Dasara applies the selected increase'],
 ['Status','Participation, festival increase, route, period and daily traffic profile are assumptions, not observed citywide traffic.'],[],
 ['Total travel emissions'],['Pollutant','Normal (kg)','Dasara (kg)','Difference (kg)'],...totals.map(({p,c})=>[p,missing(c.regular),missing(c.dasara),missing(c.delta)]),[],
 ['Idling fuel consumption'],['Normal (L)',missing(c.normalFuel)],['Dasara (L)',missing(c.dasaraFuel)],['Additional fuel from longer idling across Dasara round trips (L)',missing(c.extraFuel)],
 ['Known normal subtotal (L)',c.knownNormalFuel],['Known Dasara subtotal (L)',c.knownDasaraFuel],['Known additional subtotal (L)',c.knownExtraFuel],['Missing fuel-rate classes',c.missingFuel.join('; ')||'None'],[],
 ['Vehicle data — reference rates apply to one vehicle'],['Vehicle type','Registered vehicles','Normal round trips','Dasara round trips','CO2 (g/km)','CO (g/km)','NOx (g/km)','PM (g/km)','Idling fuel rate (L/h)','Reference fuel and technology'],
 ...state.rows.map((r,i)=>[defaults.rows[i].name,fleet.counts[r.id],missing(r.regularN),missing(r.dasaraN),r.CO2,r.CO,r.NOx,r.PM,missing(r.idleFuelLph),fuelProxies[r.id]]),[],
 ['Per-vehicle travel emissions — applies to both traffic conditions'],['Vehicle type','CO2 (kg/round trip)','CO (kg/round trip)','NOx (kg/round trip)','PM (kg/round trip)'],...state.rows.map((r,i)=>[defaults.rows[i].name,...['CO2','CO','NOx','PM'].map(p=>distance*r[p]/1000)]),[],
 ['Daily vehicle changes and travel emissions'],['Method','Normal round trips are distributed approximately evenly. Dasara relative daily changes are normalised to the period total. Rounding preserves each vehicle category total.'],
 ['Day','Dasara change from previous day (%)','Normal round trips','Dasara round trips','Normal CO2 (kg/d)','Dasara CO2 (kg/d)','Normal CO (kg/d)','Dasara CO (kg/d)','Normal NOx (kg/d)','Dasara NOx (kg/d)','Normal PM (kg/d)','Dasara PM (kg/d)'],
 ...daily.CO2.map((d,i)=>[d.day,i===0?'Starting day':d.changePercent,missing(d.normalCount),missing(d.dasaraCount),...totals.flatMap(({p})=>{const row=daily[p][i];return [missing(row.normalEmissions),missing(row.dasaraEmissions)]})]),[],
 ['Chart display pollutant',chartPollutant],['Travel emission factor source',FACTOR_SOURCE],['Idling fuel consumption source',IDLE_SOURCE],['Registered fleet source',FLEET_SOURCE],['Normal traffic research context',NORMAL_SOURCE],['Registered fleet date',fleet.date],
 ['Limits','Historical vehicle technologies, not a calibrated current Mysuru fleet. Normal stops are included in reference travel factors. Additional congestion emissions remain unquantified. No separate idling emissions are added. Fuel is not added to emission totals.']
 ];
}
