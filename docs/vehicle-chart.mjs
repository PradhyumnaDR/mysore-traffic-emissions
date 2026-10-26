import {calculate,defaults} from './model.mjs';
export const vehicleColours=['#296b55','#cc813b','#54799c','#8a6292'];
const pollutants=[['CO2','CO₂'],['CO','CO'],['NOx','NOₓ'],['PM','PM']];
const number=n=>n.toLocaleString('en-GB',{maximumFractionDigits:2});
const axis=n=>n===0?'0':n>=1e6||n<0.01?n.toExponential(1):n.toLocaleString('en-GB',{maximumSignificantDigits:3});
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function vehicleChartData(state){return pollutants.map(([key,name])=>({key,name,...calculate({...state,pollutant:key})}));}
function pollutantSvg(c){
 const W=520,H=205,left=65,right=22,plot=W-left-right,max=Math.max(c.regular??0,c.dasara??0),scale=max||1;
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="vehicle-${c.key}-title"><title id="vehicle-${c.key}-title">${c.name} travel emissions by vehicle type, in kg</title>`;
 for(let i=0;i<=4;i++){const x=left+plot*i/4;svg+=`<line x1="${x}" x2="${x}" y1="19" y2="137" stroke="#dfe5dc"/><text x="${x}" y="158" text-anchor="middle" fill="#62736b" font-size="12">${axis(scale*i/4)}</text>`;}
 for(const [condition,key,y,total] of [['Normal','regular',30,c.regular],['Dasara','dasara',94,c.dasara]]){
  svg+=`<text x="${left-10}" y="${y+22}" text-anchor="end" fill="#183d37" font-size="13">${condition}</text>`;
  if(total===null){svg+=`<text x="${left+8}" y="${y+22}" fill="#62736b" font-size="12">Vehicle counts incomplete</text>`;continue;}
  if(total===0){svg+=`<rect x="${left}" y="${y}" width="${plot}" height="34" fill="#f4f6f1"/><text x="${left+8}" y="${y+22}" fill="#62736b" font-size="12">0 kg</text>`;continue;}
  let offset=0;
  c.rows.forEach((r,i)=>{const value=r[key],width=value/scale*plot,share=value/total*100,label=`${c.name} · ${condition} · ${defaults.rows[i].name}: ${number(value)} kg (${number(share)}% of ${condition.toLowerCase()} emissions).`;
   if(width>0)svg+=`<rect tabindex="0" role="img" aria-label="${escape(label)}" data-contribution="${escape(label)}" data-vehicle="${r.id}" data-condition="${condition}" data-value="${value}" x="${left+offset}" y="${y}" width="${width}" height="34" fill="${vehicleColours[i]}" stroke="white" stroke-width="1"><title>${escape(label)}</title></rect>`;
   offset+=width;
  });
 }
 return svg+`<text x="${left+plot/2}" y="187" text-anchor="middle" fill="#62736b" font-size="12">Travel emissions (kg)</text></svg>`;
}
export function vehicleChartsHtml(state){return vehicleChartData(state).map(c=>`<article class="vehicle-chart-card"><h4>${c.name}</h4>${pollutantSvg(c)}</article>`).join('');}
