/* All constants are concept assumptions, never measured vehicle data. */
(function(root){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const CONFIG={mass:2500,batteryKWh:12,tankKg:6,motorKW:140,engineKW:300,regenKW:70,generatorKW:18};
  function initial(){return {on:false,speed:0,rpm:0,soc:75,h2:100,engine:false,blend:0,mode:'Ready to launch',batteryKW:0,engineKW:0,driveKW:0,regenKW:0,chargingKW:0,time:0};}
  function step(s,input,dt){
    dt=clamp(dt,0,.1); s.time+=dt;
    const throttle=clamp(Number(input.throttle)||0,0,1),brake=clamp(Number(input.brake)||0,0,1);
    const handover=clamp(Number(input.handover)||2500,1500,4000),demand=brake>0?0:throttle;
    const available=s.on&&s.h2>0,ev=s.on&&s.soc>5;
    const equivalentRPM=900+s.speed*115;
    // Start and synchronise near the requested crank speed; hysteresis prevents chatter.
    if(!available)s.engine=false;
    else if(s.soc<=8||(demand>0&&equivalentRPM>=handover-450))s.engine=true;
    else if(brake>0||demand===0||equivalentRPM<handover-800)s.engine=false;
    const targetRPM=s.engine?clamp(equivalentRPM,900,6500):0;
    s.rpm+=(targetRPM-s.rpm)*Math.min(1,dt*5);
    const engineTarget=s.engine&&(s.rpm>=handover||!ev||s.soc<=8)?1:0;
    s.blend=clamp(s.blend+(engineTarget-s.blend)*dt*3,0,1);
    if(!s.engine)s.blend=0;
    const motor=ev?CONFIG.motorKW*demand*(1-s.blend):0;
    const engine=s.engine?CONFIG.engineKW*demand*s.blend:0;
    const charging=s.engine&&s.soc<80&&input.charge&&brake===0?CONFIG.generatorKW:0;
    // Regeneration cannot exceed braking demand or the kinetic energy available this step.
    const brakeForce=brake*10500;
    const kinetic=.5*CONFIG.mass*s.speed*s.speed;
    const regen=s.on&&s.soc<100?Math.min(CONFIG.regenKW,brakeForce*s.speed/1000,kinetic/Math.max(dt,.001)/1000)*.72:0;
    const batteryKW=motor/.92-charging*.9-regen;
    s.soc=clamp(s.soc-batteryKW*dt/(CONFIG.batteryKWh*3600)*100,0,100);
    // 33.3 kWh/kg hydrogen LHV, assumed 38% conversion, plus idle consumption.
    const fuelKW=s.engine?(engine+charging)/.38+8:0;
    s.h2=clamp(s.h2-fuelKW*dt/(33.3*CONFIG.tankKg*3600)*100,0,100);
    const power=motor+engine;
    const driveForce=Math.min(11500,power*1000/Math.max(s.speed,3));
    const resistance=s.speed>0?340+.54*s.speed*s.speed:0;
    s.speed=clamp(s.speed+(driveForce-resistance-brakeForce)/CONFIG.mass*dt,0,70);
    s.batteryKW=batteryKW;s.engineKW=engine;s.driveKW=power;s.regenKW=regen;s.chargingKW=charging;
    if(!s.on)s.mode=s.speed>.1?'Coasting · system off':'Ready to launch';
    else if(brake>0)s.mode=regen>.05?'Regenerative braking':'Friction braking';
    else if(s.h2<=0&&s.soc<=5)s.mode='Energy depleted';
    else if(demand===0)s.mode=s.speed>.1?'Coasting':'System ready';
    else if(s.engine&&s.blend>.95)s.mode=charging>0?'V8 AWD + charging':'Hydrogen V8 · AWD';
    else if(s.engine)s.mode='Blending to V8';
    else s.mode='Electric launch · AWD';
    return s;
  }
  const api={CONFIG,initial,step};root.HybridSimulation=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
