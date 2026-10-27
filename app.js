(function(){
  'use strict';
  const $=id=>document.getElementById(id),sim=HybridSimulation,scene=VehicleScene;
  let state=sim.initial(),last=performance.now(),uiTime=0,demoTime=null,auto=false,labels=true;
  const controls={throttle:$('throttle'),brake:$('brake'),handover:$('handover'),charge:$('charge')};
  let soundEnabled=false,engineAudio=null;
  function makeEngineAudio(){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;if(engineAudio){engineAudio.context.resume();return true;}
    const context=new Audio(),filter=context.createBiquadFilter(),master=context.createGain(),low=context.createOscillator(),high=context.createOscillator(),lowMix=context.createGain(),highMix=context.createGain();
    filter.type='lowpass';filter.frequency.value=420;master.gain.value=0;low.type='sawtooth';high.type='square';low.frequency.value=42;high.frequency.value=84;lowMix.gain.value=.75;highMix.gain.value=.12;
    low.connect(lowMix);high.connect(highMix);lowMix.connect(filter);highMix.connect(filter);filter.connect(master);master.connect(context.destination);low.start();high.start();engineAudio={context,filter,master,low,high};context.resume();return true;
  }
  function updateEngineAudio(){if(!engineAudio)return;const {context,filter,master,low,high}=engineAudio;const now=context.currentTime,rpm=state.rpm||0;low.frequency.setTargetAtTime(32+rpm/95,now,.06);high.frequency.setTargetAtTime(64+rpm/47,now,.06);filter.frequency.setTargetAtTime(260+Math.min(1,rpm/6500)*560,now,.08);master.gain.setTargetAtTime(soundEnabled&&state.on&&state.engine ? 0.07 : 0,now,.12);}
  const descriptions={
    'Ready to launch':['System ready','Start the system, then raise the accelerator.'],
    'System ready':['Ready for electric launch','The battery is available for instant torque.'],
    'Electric launch · AWD':['Battery → motor → four wheels','Electric power drives both axles before V8 handover.'],
    'Blending to V8':['Electric torque + hydrogen combustion','The V8 starts and synchronises, then progressively takes over at the selected RPM.'],
    'Hydrogen V8 · AWD':['Hydrogen → V8 → four wheels','The engine drives both axles through the transmission and transfer case.'],
    'V8 AWD + charging':['V8 → four wheels + battery','Engine output drives the vehicle and supplies a generator. Charging consumes additional hydrogen.'],
    'Regenerative braking':['Wheels → motor → battery','Deceleration recovers some kinetic energy. Friction brakes supply the remaining braking.'],
    'Friction braking':['Friction brakes engaged','No regeneration is available at rest or with a full battery.'],
    'Coasting':['Coasting','The vehicle slows through rolling resistance and aerodynamic drag.'],
    'Coasting · system off':['System off · coasting','Propulsion and charging are off. Apply the brake to stop.'],
    'Energy depleted':['No propulsion available','Reset the simulation to restore the concept battery and hydrogen tank.']
  };
  function stopDemo(){demoTime=null;$('demo').textContent='Run demo';}
  function syncInputs(){for(const key of ['throttle','brake'])$(key+'-value').textContent=controls[key].value+'%';$('handover-value').textContent=Number(controls.handover.value).toLocaleString()+' RPM';$('threshold-marker').style.left=controls.handover.value/6500*100+'%';}
  Object.values(controls).forEach(c=>c.addEventListener('input',()=>{stopDemo();syncInputs();}));
  $('start').onclick=()=>{stopDemo();state.on=!state.on;};
  $('reset').onclick=()=>{stopDemo();state=sim.initial();controls.throttle.value=0;controls.brake.value=0;syncInputs();renderUI();};
  $('demo').onclick=()=>{if(demoTime!==null){stopDemo();controls.throttle.value=0;controls.brake.value=0;}else{state=sim.initial();state.on=true;demoTime=0;$('demo').textContent='Stop demo';}syncInputs();};
  function setView(v){scene.view(v);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===v));$('view-name').textContent=v.toUpperCase();}
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{setView(b.dataset.view);scene.camera('reset');});
  $('hood-toggle').onclick=()=>{const wasPowertrain=document.querySelector('[data-view="powertrain"]').getAttribute('aria-pressed')==='true';const open=scene.hood();$('hood-toggle').textContent=open?'Close hood':'Open hood';$('hood-toggle').setAttribute('aria-pressed',String(open));if(open&&wasPowertrain){setView('cutaway');scene.camera('reset');}};
  $('sound-toggle').onclick=()=>{soundEnabled=!soundEnabled;if(soundEnabled&&!makeEngineAudio()){soundEnabled=false;$('sound-toggle').textContent='Audio unavailable';$('sound-toggle').disabled=true;return;}$('sound-toggle').textContent='Engine sound: '+(soundEnabled?'on':'off');$('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));updateEngineAudio();};
  $('labels-button').onclick=()=>{labels=!labels;scene.labels(labels);$('labels-button').setAttribute('aria-pressed',labels);};
  $('rotate').onclick=()=>{auto=!auto;scene.rotate(auto);$('rotate').setAttribute('aria-pressed',auto);};
  $('v-view').onclick=()=>{auto=false;scene.rotate(false);$('rotate').setAttribute('aria-pressed',false);setView('powertrain');scene.camera('engine');};
  $('reset-view').onclick=()=>scene.camera('reset');
  const palettes=[['Solaris Orange','#fb923c'],['Abyss Blue','#38bdf8'],['Verdant Circuit','#4ade80'],['Ultraviolet','#c084fc'],['Platinum Lab','#d8e2ec'],['Midnight Purple','#44216b'],['Metallic Teal','#007e85'],['Cherry Red','#B4142E'],['British Racing Green','#124C37']];
  function applyPalette(i){document.documentElement.style.setProperty('--accent',palettes[i][1]);scene.palette(palettes[i][1]);[...$('palettes').children].forEach((b,j)=>b.setAttribute('aria-pressed',i===j));try{localStorage.setItem('h2-sport-palette',i);}catch{}}
  palettes.forEach(([name,color],i)=>{const b=document.createElement('button');b.title=name;b.setAttribute('aria-label',name);b.style.background=color;b.onclick=()=>applyPalette(i);$('palettes').append(b);});
  let remembered=0;try{remembered=Number(localStorage.getItem('h2-sport-palette'))||0;}catch{}applyPalette(palettes[remembered]?remembered:0);
  function renderUI(){
    $('start').textContent=state.on?'Stop system':'Start system';$('speed').textContent=Math.round(state.speed*3.6);$('rpm').textContent=Math.round(state.rpm/10)*10;$('rpm-bar').style.width=state.rpm/6500*100+'%';
    $('soc').textContent=state.soc.toFixed(1)+'%';$('battery-meter').value=state.soc;$('hydrogen').textContent=state.h2.toFixed(1)+'%';$('h2-meter').value=state.h2;
    $('battery-rate').textContent=Math.abs(state.batteryKW).toFixed(1)+' kW '+(state.batteryKW<-.01?'charging':state.batteryKW>.01?'discharging':'idle');
    if($('mode').textContent!==state.mode)$('mode').textContent=state.mode;
    const description=descriptions[state.mode]||descriptions['System ready'];$('mode-detail').textContent=description[1];$('flow-title').textContent=description[0];$('flow-description').textContent=description[1];
    const flags={tank:state.engine,engine:state.engine,battery:Math.abs(state.batteryKW)>.1,motor:Math.abs(state.batteryKW)>.1,wheels:state.driveKW>1||state.regenKW>.1};Object.entries(flags).forEach(([k,v])=>$('flow-'+k).classList.toggle('active',state.on&&v));
  }
  function frame(now){
    const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;
    // Pause physics when the page is hidden; no artificial catch-up on return.
    if(!document.hidden){
      if(demoTime!==null){demoTime+=dt;controls.throttle.value=demoTime<3?30:demoTime<16?85:0;controls.brake.value=demoTime>=16&&demoTime<27?55:0;if(demoTime>=28){stopDemo();controls.throttle.value=0;controls.brake.value=0;}syncInputs();}
      sim.step(state,{throttle:controls.throttle.value/100,brake:controls.brake.value/100,handover:controls.handover.value,charge:controls.charge.checked},dt);
      scene.update(state,dt);updateEngineAudio();uiTime+=dt;if(uiTime>.12){renderUI();uiTime=0;}
    }
    requestAnimationFrame(frame);
  }
  syncInputs();renderUI();requestAnimationFrame(frame);
})();


