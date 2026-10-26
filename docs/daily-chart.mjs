const format=n=>n.toLocaleString('en-GB',{maximumFractionDigits:1});
export function dailyChartSvg(data,pollutant){
 const W=940,H=350,left=85,right=30,top=38,bottom=54,width=W-left-right,height=H-top-bottom;
 const values=data.flatMap(d=>[d.normalEmissions,d.dasaraEmissions]).filter(v=>v!==null);
 const rawMax=Math.max(...values,0),magnitude=rawMax>0?10**Math.floor(Math.log10(rawMax)):1;
 const step=Math.max(magnitude/5,Math.ceil(rawMax/4/(magnitude/5))*(magnitude/5)),yMax=rawMax>0?step*4:1;
 const x=i=>data.length===1?left+width/2:left+i*width/(data.length-1),y=v=>top+height-v/yMax*height;
 const peak=data.reduce((best,d,i)=>d.dasaraEmissions!==null&&(best===null||d.dasaraEmissions>data[best].dasaraEmissions)?i:best,null);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="daily-svg-title daily-svg-desc"><title id="daily-svg-title">Daily ${pollutant} travel emissions</title><desc id="daily-svg-desc">${data.length} days. Normal traffic is spread approximately evenly. Dasara follows editable daily traffic changes. ${peak===null?'Dasara counts are incomplete.':`Peak Dasara travel emissions on day ${peak+1}.`} Unit: kg/d.</desc>`;
 if(peak!==null)svg+=`<rect x="${x(peak)-13}" y="${top}" width="26" height="${height}" fill="#f6ead8"/><text x="${x(peak)}" y="20" text-anchor="middle" fill="#9c581b" font-size="12">Peak · day ${peak+1}</text>`;
 for(let i=0;i<=4;i++){const value=yMax*i/4,yy=y(value);svg+=`<line x1="${left}" x2="${W-right}" y1="${yy}" y2="${yy}" stroke="#dfe5dc"/><text x="${left-12}" y="${yy+4}" text-anchor="end" fill="#62736b" font-size="12">${format(value)}</text>`;}
 const labelStep=Math.max(1,Math.ceil(data.length/12));for(let i=0;i<data.length;i++)if(i%labelStep===0||i===data.length-1)svg+=`<text x="${x(i)}" y="${H-bottom+24}" text-anchor="middle" fill="#62736b" font-size="12">${i+1}</text>`;
 svg+=`<text x="${left}" y="20" fill="#62736b" font-size="12">kg/d</text><text x="${left+width/2}" y="${H-4}" text-anchor="middle" fill="#62736b" font-size="12">Festival day</text>`;
 for(const [key,color,dash,name] of [['normalEmissions','#296b55','8 5','Normal'],['dasaraEmissions','#cc813b','','Dasara']]){
  const points=data.map((d,i)=>d[key]===null?null:`${x(i)},${y(d[key])}`);
  if(points.every(p=>p!==null))svg+=`<polyline data-series="${name}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" ${dash?`stroke-dasharray="${dash}"`:''} points="${points.join(' ')}"/>`;
  data.forEach((d,i)=>{if(d[key]!==null)svg+=`<circle tabindex="0" data-day="${i}" cx="${x(i)}" cy="${y(d[key])}" r="${data.length>45?2:4.5}" fill="${color}" stroke="white" stroke-width="1.5"><title>Day ${i+1} · ${name}: ${format(d[key])} kg/d</title></circle>`;});
 }
 if(!values.length)svg+=`<text x="${left+width/2}" y="${top+height/2}" text-anchor="middle" fill="#62736b" font-size="15">Enter vehicle round-trip counts to show daily emissions</text>`;
 return svg+'</svg>';
}
