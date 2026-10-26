import assert from 'node:assert/strict';
import {defaults,calculate,validState,fleet,estimateOutings,migrateSaved,estimateScenario,vehiclePresets,calculateDaily,defaultDailyChanges,resizeDailyProfile,dailyWeights,allocateOutings} from './docs/model.mjs';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
let s=structuredClone(defaults);
assert.ok(validState(s));assert.equal(calculate(s).distance,42.5);
s.sightseeingKm=20;assert.equal(calculate(s).distance,40);s.sightseeingKm=25;assert.equal(calculate(s).distance,45);
s=structuredClone(defaults);s.rows=[{...s.rows[2],regularN:1,dasaraN:1}];
let c=calculate(s);close(c.rows[0].normalFuelPerOuting,.09);close(c.rows[0].dasaraFuelPerOuting,.36);close(c.rows[0].extraFuelPerOuting,.27);close(c.extraFuel,.27);assert.equal(c.delta,0);
for(const pollutant of ['CO2','CO','NOx','PM']){s.pollutant=pollutant;c=calculate(s);close(c.regular,42.5*s.rows[0][pollutant]/1000);assert.equal(c.regular,c.dasara);const before=c.dasara;s.dasaraWait=180;assert.equal(calculate(s).dasara,before);s.dasaraWait=40;}
s.pollutant='CO';s.rows[0].dasaraN=3;c=calculate(s);close(c.dasara,3*c.regular);close(c.normalFuel,.09);close(c.dasaraFuel,1.08);close(c.extraFuel,.81);assert.notEqual(c.extraFuel,c.dasaraFuel-c.normalFuel);
s.rows[0].idleFuelLph=null;c=calculate(s);assert.ok(c.dasara>0);assert.equal(c.dasaraFuel,null);assert.equal(c.knownDasaraFuel,0);assert.equal(c.missingFuel.length,1);
s.rows[0].dasaraN=0;c=calculate(s);assert.equal(c.dasara,0);assert.equal(c.dasaraFuel,0);s.rows[0].regularN=0;assert.equal(calculate(s).normalFuel,0);
s.rows[0].dasaraN=1;s.rows[0].idleFuelLph=.54;s.dasaraWait=5;s.regularWait=10;c=calculate(s);close(c.dasaraFuel,.045);assert.equal(c.extraFuel,0);assert.equal(c.referenceOnly,true);
s.dasaraWait=0;s.regularWait=0;s.rows[0].idleFuelLph=null;c=calculate(s);assert.equal(c.dasaraFuel,0);assert.equal(c.extraFuel,0);

assert.deepEqual(defaults.rows.map(r=>r.id),['2w','3w','4w','bus']);assert.deepEqual(Object.keys(fleet.counts),['2w','3w','4w','bus']);
assert.equal(Object.values(fleet.counts).reduce((a,n)=>a+n,0),1624214);
assert.deepEqual(estimateOutings(15),{'2w':199378,'3w':6730,'4w':35240,bus:2285});
const central=estimateScenario(vehiclePresets.central);assert.deepEqual(central.normal,{'2w':199378,'3w':6730,'4w':35240,bus:2285});assert.deepEqual(central.dasara,{'2w':279129,'3w':9422,'4w':49336,bus:3199});assert.equal(central.normalTotal,243633);assert.equal(central.dasaraTotal,341086);
for(const [scenario,total] of [['low',227389],['central',341086],['high',454780]])assert.equal(estimateScenario(vehiclePresets[scenario]).dasaraTotal,total);
assert.deepEqual(estimateScenario({...vehiclePresets.central,days:1}).dasara,central.dasara);assert.equal(estimateScenario({...vehiclePresets.central,days:1}).dasaraDaily,341086);
assert.deepEqual(estimateScenario({...vehiclePresets.central,dasaraIncrease:0}).dasara,central.normal);
for(const b of [{days:0,normalPercent:15,dasaraIncrease:40},{days:1.5,normalPercent:15,dasaraIncrease:40},{days:11,normalPercent:101,dasaraIncrease:40},{days:11,normalPercent:15,dasaraIncrease:-1}])assert.throws(()=>estimateScenario(b),RangeError);
const current=calculate(defaults);assert.equal(current.regularCount,243633);assert.equal(current.dasaraCount,341086);assert.ok(Math.abs(current.percent-40)<.01);assert.ok(current.dasaraCount<462965);
const prior=structuredClone(defaults);prior.version=6;prior.homeKm=12;prior.rows[0].CO=1.25;prior.rows[0].regularN=999;prior.rows[2].idleFuelLph=.6;prior.rows.push({id:'lcv',regularN:100,dasaraN:200});prior.selectedVehicle='lcv';const migrated=migrateSaved(prior);assert.equal(migrated.rows.length,4);assert.equal(migrated.rows[0].regularN,199378);assert.equal(migrated.rows[0].dasaraN,279129);assert.equal(migrated.rows[0].CO,1.25);assert.equal(migrated.rows[2].idleFuelLph,.6);assert.equal(migrated.homeKm,12);assert.equal(migrated.selectedVehicle,'4w');assert.deepEqual(migrated.countBasis,vehiclePresets.central);assert.ok(validState(migrated));
const custom=structuredClone(defaults);custom.rows[0].regularN=77;custom.countBasis=null;assert.equal(migrateSaved(custom).rows[0].regularN,77);assert.equal(migrateSaved(custom).countBasis,null);
const invalid=structuredClone(defaults);invalid.rows[0].idleFuelLph=-1;assert.equal(validState(invalid),false);invalid.rows[0].idleFuelLph=null;assert.equal(validState(invalid),true);invalid.rows[0].regularN=.1;assert.equal(validState(invalid),false);
console.log('PASS: four passenger classes only, reduced participation, 40% uplift by class, period averages, fuel and emission independence, legacy migration and validation');

const daily=calculateDaily(defaults),sum=(rows,key)=>rows.reduce((a,r)=>a+r[key],0);assert.equal(daily.length,11);assert.equal(sum(daily,'normalCount'),243633);assert.equal(sum(daily,'dasaraCount'),341086);assert.ok(Math.abs(sum(daily,'normalEmissions')-calculate(defaults).regular)<1e-6);assert.ok(Math.abs(sum(daily,'dasaraEmissions')-calculate(defaults).dasara)<1e-6);assert.equal(daily.reduce((a,b)=>b.dasaraEmissions>a.dasaraEmissions?b:a).day,10);for(let i=4;i<=8;i++){assert.equal(daily[i].changePercent,1);assert.ok(Math.abs((daily[i].dasaraCount/daily[i-1].dasaraCount-1)*100-1)<.02);}assert.ok(daily[10].dasaraCount<daily[9].dasaraCount);
const shifted=structuredClone(defaults);shifted.dailyChanges[9]=-10;assert.notEqual(calculateDaily(shifted)[9].dasaraCount,daily[9].dasaraCount);assert.equal(sum(calculateDaily(shifted),'dasaraCount'),341086);assert.equal(calculate(shifted).dasara,calculate(defaults).dasara);
for(const pollutant of ['CO2','CO','NOx','PM']){shifted.pollutant=pollutant;assert.ok(Math.abs(sum(calculateDaily(shifted),'dasaraEmissions')-calculate(shifted).dasara)<1e-6);}
assert.deepEqual(allocateOutings(7,[1,1,1]),[3,2,2]);assert.deepEqual(allocateOutings(null,[1,2]),[null,null]);assert.throws(()=>dailyWeights([0,-100]),RangeError);assert.throws(()=>dailyWeights([0,101]),RangeError);
for(const change of [-95,100]){const extremes=[0,...Array(365).fill(change)],weights=dailyWeights(extremes),allocation=allocateOutings(1000000000,weights);assert.equal(allocation.reduce((a,n)=>a+n,0),1000000000);assert.ok(allocation.every(Number.isSafeInteger));}
const oneDay=structuredClone(defaults);oneDay.profileDays=1;oneDay.dailyChanges=defaultDailyChanges(1);assert.equal(calculateDaily(oneDay)[0].dasaraCount,341086);assert.equal(calculateDaily(oneDay)[0].dasaraEmissions,calculate(oneDay).dasara);
const missing=structuredClone(defaults);missing.rows[0].regularN=null;assert.equal(calculateDaily(missing)[0].normalEmissions,null);assert.ok(calculateDaily(missing)[0].dasaraEmissions>0);
const v7=structuredClone(defaults);v7.version=7;v7.rows[0].regularN=77;v7.countBasis=null;delete v7.profileDays;delete v7.dailyChanges;const migrated7=migrateSaved(v7);assert.equal(migrated7.rows[0].regularN,77);assert.equal(migrated7.profileDays,11);assert.deepEqual(migrated7.dailyChanges,defaultDailyChanges(11));assert.ok(validState(migrated7));assert.deepEqual(resizeDailyProfile([0,3,4],5),[0,3,4,8,1]);
console.log('PASS: daily totals conserved, day-10 peak, day-5–9 plateau, editable distribution, all pollutants, missing data, extreme profiles, short periods and v7 migration');
