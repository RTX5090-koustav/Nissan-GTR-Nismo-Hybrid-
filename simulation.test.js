const assert=require('node:assert/strict');
const {initial,step}=require('./simulation.js');
const input={throttle:.8,brake:0,handover:2500,charge:true};
function run(s,i,seconds){for(let t=0;t<seconds;t+=.02)step(s,i,.02);return s;}
let s=initial();run(s,input,3);assert.equal(s.speed,0);assert.equal(s.soc,75);assert.equal(s.h2,100);
s.on=true;run(s,input,1);assert(s.speed>0);assert(s.soc<75);assert.equal(s.h2,100);assert.equal(s.engine,false);
run(s,input,15);assert(s.engine);assert(s.blend>.95);assert(s.h2<100);assert(s.chargingKW>0);assert(s.batteryKW<0);
const before={speed:s.speed,soc:s.soc};run(s,{...input,throttle:0,brake:.6},2);assert(s.speed<before.speed);assert(s.soc>before.soc);assert(s.regenKW>0);assert.equal(s.driveKW,0);
run(s,{...input,throttle:0,brake:1},20);const stoppedSOC=s.soc;run(s,{...input,throttle:0,brake:1},3);assert.equal(s.speed,0);assert.equal(s.soc,stoppedSOC);assert.equal(s.regenKW,0);
s={...initial(),on:true,soc:100,speed:20};run(s,{...input,brake:1},1);assert.equal(s.soc,100);assert.equal(s.regenKW,0);
s={...initial(),on:true,soc:3};run(s,input,3);assert(s.engine);assert(s.speed>0);
s={...initial(),on:true,h2:0};run(s,input,10);assert(!s.engine);assert(s.speed>0);assert(s.soc<75);
s={...initial(),on:true,h2:0,soc:0};run(s,input,2);assert.equal(s.speed,0);assert.equal(s.mode,'Energy depleted');
s={...initial(),on:true};run(s,input,18);const fuel=s.h2;s.on=false;run(s,input,2);assert.equal(s.driveKW,0);assert.equal(s.h2,fuel);
const low={...initial(),on:true},high={...initial(),on:true};run(low,{...input,handover:1500},4);run(high,{...input,handover:4000},4);assert(low.engine);assert(!high.engine);
s={...initial(),on:true,speed:30,soc:85};run(s,input,2);assert.equal(s.chargingKW,0);
s={...initial(),on:true,speed:30};run(s,{...input,charge:false},2);assert.equal(s.chargingKW,0);
for(let j=0;j<50000;j++){step(s,{...input,throttle:j%100<70?.8:0,brake:j%100<70?0:.5},.02);for(const k of ['speed','rpm','soc','h2'])assert(Number.isFinite(s[k]));assert(s.soc>=0&&s.soc<=100);assert(s.h2>=0&&s.h2<=100);}
console.log('PASS: start/stop, EV launch, V8 handover, RPM setting, charging, regeneration, full/empty energy stores, and long-run bounds.');
