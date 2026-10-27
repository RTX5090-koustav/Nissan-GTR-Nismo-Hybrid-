/* Hybrid component geometry is modeled X-forward. The supplied GT-R keeps its
   glTF Z-forward axes; all conversion dimensions remain illustrative. */
(function(){
  'use strict';
  const stage=document.getElementById('stage'),canvas=document.getElementById('scene');
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});}
  catch(error){document.getElementById('webgl-error').hidden=false;window.VehicleScene={update(){},view(){},palette(){},labels(){},rotate(){},camera(){},hood(){return false;}};return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.05,100);
  scene.add(new THREE.HemisphereLight(0xffe7ce,0x181923,.65));
  [[0xffe8cf,5,8,4,1.3],[0x91c5ff,-4,4,-4,.7],[0xff9a50,-4,2,5,.4]].forEach(a=>{const l=new THREE.DirectionalLight(a[0],a[4]);l.position.set(a[1],a[2],a[3]);scene.add(l);});
  const V=(x,y,z)=>new THREE.Vector3(x,y,z),body=new THREE.Group(),drive=new THREE.Group(),vehicleRoot=new THREE.Group();scene.add(body,drive,vehicleRoot);body.visible=false;
  let vehicleReady=false,hoodOpen=false,hoodProgress=0;const shellMaterials=[],vehicleMaterials=[];let paintMaterials=[];const vehiclePaint=new THREE.Color(0xfb923c);let hoodPivot=null,hoodMesh=null,hoodMaterial=null;
  const loader=new THREE.GLTFLoader();
  const wheelAssembly=new THREE.Group(),modelWheels=[];scene.add(wheelAssembly);
  loader.load('models/nissan-gtr-r35.glb?v=bonnet-panel-4',gltf=>{
    const model=gltf.scene;vehicleRoot.add(model);
    let bounds=new THREE.Box3().setFromObject(vehicleRoot),size=bounds.getSize(new THREE.Vector3());
    const fit=4.75/Math.max(size.x,size.z);vehicleRoot.scale.setScalar(fit);
    bounds.setFromObject(vehicleRoot);const center=bounds.getCenter(new THREE.Vector3());vehicleRoot.position.set(-center.x,-bounds.min.y,-center.z);
    drive.rotation.y=-Math.PI/2;drive.scale.setScalar(.78);
    vehicleRoot.updateMatrixWorld(true);drive.updateMatrixWorld(true);

    // Use the supplied wheels in every view, with a single rotation pivot at
    // each tire's centre. Axles and suspension use these same measured centres.
    const wheelNodes=[];model.traverse(o=>{if(/^Wheel[._]?(Ft|Bk)[._]?[LR]$/i.test(o.name))wheelNodes.push(o);});
    wheelNodes.forEach(o=>{
      const b=new THREE.Box3().setFromObject(o),hub=b.getCenter(new THREE.Vector3());
      const pivot=new THREE.Group();pivot.position.copy(hub);wheelAssembly.add(pivot);pivot.attach(o);
      const local=drive.worldToLocal(hub.clone()),radius=(b.max.y-b.min.y)/2;
      modelWheels.push({pivot,radius,hub:local});
    });
    const brakes=[];model.traverse(o=>{if(/^WheelBrake/i.test(o.name))brakes.push(o);});
    brakes.forEach(o=>wheelAssembly.attach(o));
    if(modelWheels.length===4){
      wheels.forEach(w=>w.visible=false);
      fitSuspension(modelWheels.map(w=>w.hub));
    }

    model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
      const originals=Array.isArray(o.material)?o.material:[o.material];
      const clones=originals.map(m=>{const c=m.clone();c.userData.baseTransparent=c.transparent;c.userData.baseOpacity=c.opacity;vehicleMaterials.push(c);if(/carpaint|gloassywhitemat|whitemat|goldstripe|carbonfiberblack|plasticglasswhitewindshield/i.test(m.name)){paintMaterials.push(c);c.color.copy(vehiclePaint);}return c;});
      o.material=Array.isArray(o.material)?clones:clones[0];
    });
    // The bonnet is an intact authored panel, separated in the packaged GLB.
    // Attaching it preserves every vertex and its closed-position transform.
    hoodMesh=model.getObjectByName('GT-R_Bonnet')||model.getObjectByName('GT-R Bonnet');
    if(hoodMesh){
      hoodPivot.position.set(-.005,.967,.79);hoodPivot.updateMatrixWorld(true);hoodPivot.attach(hoodMesh);
      hoodMaterial=hoodMesh.material;hoodMaterial.side=THREE.DoubleSide;
    }else console.error('The GT-R bonnet panel is missing from the model.');
    vehicleReady=true;setView(view);
  },undefined,error=>{console.error('GT-R model could not be loaded',error);document.getElementById('webgl-error').hidden=false;});
  const mat=(color,metal=.5,rough=.35)=>new THREE.MeshStandardMaterial({color:new THREE.Color(color).convertSRGBToLinear(),metalness:metal,roughness:rough});
  const paint=mat(0x697572,.8,.27),dark=mat(0x101719,.35,.32),glass=mat(0x13252a,.5,.13),chrome=mat(0xb5c2c5,.9,.22),rubber=mat(0x101112,.05,.95),orange=mat(0xfb923c,.55,.3),silver=mat(0xa6b3b9,.85,.28),batteryMat=mat(0x163d45,.7,.3),electric=mat(0x65d9e9,.6,.24),red=mat(0xb73221,.6,.3);
  const bodyMaterials=[paint,dark,glass];bodyMaterials.forEach(m=>{m.transparent=true;});
  const glow=(c)=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:2,metalness:.2,roughness:.2});
  const whiteLight=glow(0xe8f4ff),tailLight=glow(0xf23124),energyMat=glow(0x65d9e9);
  function mesh(geo,m,x,y,z,parent=drive){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;}
  function box(w,h,d,m,x,y,z,p=drive){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,p);}
  function cyl(a,b,r,m,p=drive,segments=24){const d=b.clone().sub(a);const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),m,0,0,0,p);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;}
  function line(points,m,p=drive,r=.012){for(let i=1;i<points.length;i++)cyl(points[i-1],points[i],r,m,p);}
  function face(points,m,p=body){const g=new THREE.BufferGeometry(),pos=[];for(let i=1;i<points.length-1;i++)[points[0],points[i],points[i+1]].forEach(v=>pos.push(...v));g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();const o=new THREE.Mesh(g,m);o.material.side=THREE.DoubleSide;p.add(o);return o;}
  function textPlate(text,w,h,x,y,z,p,mColor='#e4e7dc',back='transparent'){
    const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');if(back!=='transparent'){ctx.fillStyle=back;ctx.fillRect(0,0,1024,128);}ctx.fillStyle=mColor;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 70px Arial';ctx.fillText(text,512,67);const map=new THREE.CanvasTexture(c);map.encoding=THREE.sRGBEncoding;const m=new THREE.MeshBasicMaterial({map,transparent:true,side:THREE.DoubleSide});return mesh(new THREE.PlaneGeometry(w,h),m,x,y,z,p);
  }
  // Sculpted shoulder, door skins and actual wheel openings.
  const side=new THREE.Shape();side.moveTo(-2.41,.51);side.lineTo(-1.95,.51);side.absarc(-1.46,.43,.49,Math.PI-.164,.164,true);side.lineTo(.97,.51);side.absarc(1.46,.43,.49,Math.PI-.164,.164,true);side.lineTo(2.4,.51);side.lineTo(2.41,1.08);side.lineTo(1.92,1.2);side.lineTo(.8,1.26);side.lineTo(-1.8,1.25);side.lineTo(-2.42,1.17);side.closePath();
  const sideGeo=new THREE.ExtrudeGeometry(side,{depth:.08,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1});
  [1,-1].forEach(sign=>{
    const panel=mesh(sideGeo,paint,0,0,sign*.9,body);if(sign<0)panel.scale.z=-1;
    // Doors, beltline, handles, fender vent and rocker trim.
    line([V(-2.35,1.22,sign*.987),V(.8,1.26,sign*.987),V(2.26,1.11,sign*.95)],chrome,body,.009);
    [-.82,.48].forEach(x=>{line([V(x,1.22,sign*.989),V(x,.72,sign*.989)],dark,body,.006);box(.17,.025,.02,chrome,x-.13,1.12,sign*.999,body);});
    box(1.9,.09,.08,dark,-.2,.53,sign*.97,body);
    box(.24,.13,.025,dark,.91,1.16,sign*.987,body);
    for(let j=0;j<3;j++)box(.2,.012,.029,chrome,.91,1.12+j*.035,sign*1.005,body);
    // Mirrors with indicator strip.
    cyl(V(.59,1.36,sign*.84),V(.66,1.36,sign*1.13),.035,dark,body);
    const mirror=box(.25,.12,.19,paint,.67,1.39,sign*1.14,body);mirror.rotation.y=sign*.1;
    box(.19,.016,.015,whiteLight,.69,1.39,sign*1.24,body);
    // Window glazing, black pillars and a floating roof.
    const zz=sign*.85;
    face([[.79,1.28,zz],[.34,1.79,sign*.73],[-.5,1.78,sign*.73],[-.5,1.28,zz]],glass);
    face([[-.55,1.28,zz],[-.55,1.78,sign*.73],[-1.38,1.74,sign*.73],[-1.6,1.28,zz]],glass);
    face([[-1.66,1.28,zz],[-1.45,1.74,sign*.73],[-1.83,1.7,sign*.74],[-2.17,1.28,zz]],glass);
    line([V(.79,1.28,zz),V(.34,1.8,sign*.75),V(-1.85,1.72,sign*.76),V(-2.2,1.27,zz)],dark,body,.036);
    cyl(V(-.53,1.28,zz),V(-.53,1.78,sign*.74),.026,dark,body);
    cyl(V(-1.64,1.28,zz),V(-1.42,1.75,sign*.74),.025,dark,body);
    // Wheel arch edging follows the cutout.
    [-1.46,1.46].forEach(x=>{const ps=[];for(let j=0;j<=32;j++){const a=.164+(Math.PI-.328)*j/32;ps.push(V(x+Math.cos(a)*.49,.43+Math.sin(a)*.49,sign*.987));}line(ps,dark,body,.022);});
  });
  // Bonnet, roof, windscreen and rear glass are separate shells for cutaway mode.
  face([[2.4,1.08,-.88],[2.4,1.08,.88],[.8,1.26,.91],[.8,1.26,-.91]],paint);
  face([[.78,1.28,-.85],[.78,1.28,.85],[.34,1.79,.73],[.34,1.79,-.73]],glass);
  face([[.34,1.82,-.75],[.34,1.82,.75],[-1.84,1.74,.76],[-1.84,1.74,-.76]],dark);
  face([[-1.85,1.71,-.74],[-1.85,1.71,.74],[-2.22,1.27,.85],[-2.22,1.27,-.85]],glass);
  box(.26,.055,1.65,dark,-1.92,1.74,0,body);
  [1,-1].forEach(sign=>{line([V(.27,1.84,sign*.63),V(-1.63,1.79,sign*.63)],chrome,body,.014);box(.45,.025,.18,dark,1.15,1.225,sign*.58,body);for(let j=0;j<4;j++)box(.013,.028,.14,chrome,1+j*.09,1.23,sign*.58,body);});
  // Front fascia with split LED signatures and mesh grille.
  box(.12,.38,1.81,paint,2.39,.87,0,body);box(.145,.23,1.02,dark,2.46,.96,0,body);
  for(let y=0;y<3;y++)for(let z=0;z<12;z++){const q=box(.015,.035,.035,chrome,2.54,.89+y*.06,-.44+z*.08,body);q.rotation.x=Math.PI/4;}
  box(.14,.21,1.25,dark,2.46,.65,0,body);box(.14,.06,1.72,chrome,2.45,.51,0,body);
  [1,-1].forEach(sign=>{
    box(.14,.17,.39,dark,2.46,1.035,sign*.71,body);
    for(let j=0;j<2;j++){const z=sign*(.61+j*.18);box(.015,.023,.14,whiteLight,2.538,1.08,z,body);box(.015,.022,.14,whiteLight,2.538,.992,z,body);box(.015,.10,.018,whiteLight,2.538,1.036,z+sign*.07,body);}
    box(.16,.16,.22,dark,2.46,.65,sign*.77,body);
    for(let j=0;j<3;j++)box(.02,.012,.19,chrome,2.548,.60+j*.045,sign*.77,body);
    box(.14,.15,.43,tailLight,-2.46,1.11,sign*.67,body);
    box(.15,.05,.3,dark,-2.47,1.11,sign*.67,body);
    box(.15,.09,.25,chrome,-2.46,.55,sign*.7,body);
  });
  box(.1,.48,1.81,paint,-2.43,.84,0,body);box(.12,.13,1.85,dark,-2.45,.55,0,body);
  const badge=textPlate('R A N G E   R O V E R',1.25,.07,2.49,1.157,0,body);badge.rotation.y=Math.PI/2;
  const rearBadge=textPlate('R A N G E   R O V E R',1.2,.065,-2.49,1.17,0,body);rearBadge.rotation.y=-Math.PI/2;
  const plate=textPlate('H2  SPORT',.52,.13,-2.491,.81,0,body,'#172018','#dee0d6');plate.rotation.y=-Math.PI/2;
  // Chassis and suspension; no prototype cart or support stand.
  box(4.65,.10,1.45,mat(0x253035),.12,.42,0);[-.65,.65].forEach(z=>box(4.65,.09,.07,silver,.12,.40,z));
  const wheels=[];
  [-1.46,1.46].forEach(x=>[1,-1].forEach(sign=>{
    const wheel=new THREE.Group();wheel.position.set(x,.43,sign*.96);drive.add(wheel);wheels.push(wheel);
    const tire=mesh(new THREE.TorusGeometry(.32,.105,16,48),rubber,0,0,0,wheel);tire.scale.z=1.3;
    mesh(new THREE.CylinderGeometry(.312,.312,.18,40),dark,0,0,0,wheel).rotation.x=Math.PI/2;
    mesh(new THREE.CylinderGeometry(.27,.27,.015,40),silver,0,0,sign*.11,wheel).rotation.x=Math.PI/2;
    mesh(new THREE.CylinderGeometry(.24,.24,.02,40),mat(0x3f484b,.8,.5),0,0,sign*.125,wheel).rotation.x=Math.PI/2;
    for(let j=0;j<10;j++){const a=j*Math.PI/5;const spoke=box(.033,.27,.04,chrome,Math.sin(a)*.16,Math.cos(a)*.16,sign*.16,wheel);spoke.rotation.z=-a;}
    mesh(new THREE.CylinderGeometry(.073,.073,.06,24),dark,0,0,sign*.18,wheel).rotation.x=Math.PI/2;
    for(let j=0;j<5;j++){const a=j*2*Math.PI/5;mesh(new THREE.SphereGeometry(.012,8,6),chrome,Math.sin(a)*.049,Math.cos(a)*.049,sign*.214,wheel);}
    for(let j=0;j<32;j++){const a=j*Math.PI/16;const groove=box(.014,.025,.17,mat(0x191b1d,.05,.95),Math.sin(a)*.419,Math.cos(a)*.419,0,wheel);groove.rotation.z=-a;}
  }));
  const suspension=new THREE.Group();drive.add(suspension);
  function fitSuspension(hubs){
    suspension.children.slice().forEach(o=>{suspension.remove(o);if(o.geometry)o.geometry.dispose();});
    const axleX=[];
    hubs.forEach(h=>{
      const sign=Math.sign(h.z),inner=h.z-sign*.20;
      cyl(V(h.x,h.y,0),V(h.x,h.y,inner),.035,silver,suspension);
      [-1,1].forEach(offset=>line([V(h.x+offset*.22,h.y-.06,sign*.65),V(h.x,h.y-.06,inner)],silver,suspension,.022));
      cyl(V(h.x,h.y+.06,inner),V(h.x-.08,h.y+.48,inner-sign*.10),.026,chrome,suspension);
      const spring=new THREE.CatmullRomCurve3(Array.from({length:70},(_,j)=>{const t=j/69;return V(h.x-.08*t+Math.cos(t*Math.PI*10)*.055,h.y+.10+t*.30,inner-sign*.10*t+Math.sin(t*Math.PI*10)*.055);}));
      mesh(new THREE.TubeGeometry(spring,70,.010,6,false),orange,0,0,0,suspension);
      if(!axleX.some(x=>Math.abs(x-h.x)<.1)){axleX.push(h.x);mesh(new THREE.SphereGeometry(.13,20,14),silver,h.x,h.y,0,suspension);}
    });
    const front=hubs.filter(h=>h.x>0),rear=hubs.filter(h=>h.x<0);
    if(front.length&&rear.length)cyl(V(rear[0].x,rear[0].y,0),V(front[0].x,front[0].y,0),.035,silver,suspension);
    routes.filter(r=>r.kind==='wheels').forEach((r,i)=>{const h=hubs[i];if(h)r.curve=new THREE.CatmullRomCurve3([V(.32,.51,0),V(h.x,h.y,0),h.clone()]);});
  }
  box(.27,.18,.22,silver,.10,.51,0);
  cyl(V(.11,.64,0),V(.55,.64,0),.16,electric);
  for(let j=0;j<8;j++){const a=j*Math.PI/4;box(.38,.022,.035,silver,.33,.64+Math.cos(a)*.163,Math.sin(a)*.163);}
  cyl(V(-.15,.52,0),V(.12,.64,0),.06,silver);
  // Traction battery beneath the cabin, with individual modules.
  box(1.32,.15,1.12,batteryMat,-.66,.62,0);
  for(let i=0;i<6;i++)for(let j=0;j<4;j++)box(.19,.025,.24,electric,-1.20+i*.215,.708,-.39+j*.26);
  [-.58,.58].forEach(z=>box(1.36,.035,.035,chrome,-.66,.72,z));
  const battLabel=textPlate('HV BATTERY',.8,.10,-.66,.733,0,drive,'#163139','#9ce5e8');battLabel.rotation.x=-Math.PI/2;
  // Rear transverse hydrogen tank with domed ends, straps and plumbing.
  const tank=mat(0x5b6b70,.7,.36);
  cyl(V(-1.8,.78,-.53),V(-1.8,.78,.53),.235,tank);
  [-.53,.53].forEach(z=>mesh(new THREE.SphereGeometry(.235,28,16),tank,-1.8,.78,z));
  [-.4,.4].forEach(z=>mesh(new THREE.TorusGeometry(.24,.025,8,32),orange,-1.8,.78,z));
  cyl(V(-1.8,.78,.74),V(-1.8,.78,.86),.04,chrome);
  line([V(-1.8,.78,.86),V(-1.8,.58,.75),V(.82,.58,.75),V(1.85,.83,.38)],orange,drive,.015);
  const tankLabel=textPlate('H₂',.23,.14,-1.8,1.017,0,drive,'#111111','#fb923c');tankLabel.rotation.x=-Math.PI/2;
  // Longitudinal 90-degree V8: eight bores, pistons, connecting rods and crank.
  const engineGroup=new THREE.Group();engineGroup.position.set(1.85,.64,0);drive.add(engineGroup);
  box(.84,.2,.4,silver,0,-.02,0,engineGroup);box(.72,.12,.30,dark,0,-.17,0,engineGroup);
  const crank=new THREE.Group();engineGroup.add(crank);cyl(V(-.48,0,0),V(.48,0,0),.045,chrome,crank);
  const pistons=[],rods=[],sparkMaterials=[];
  const boreMat=new THREE.MeshStandardMaterial({color:0xadbcc2,metalness:.7,roughness:.25,transparent:true,opacity:.24,depthWrite:false});
  [1,-1].forEach(sign=>{
    const bank=new THREE.Group();bank.rotation.x=sign*Math.PI/4;engineGroup.add(bank);
    box(.91,.07,.23,red,0,.40,0,bank);
    for(let j=0;j<8;j++)box(.012,.016,.18,chrome,-.40+j*.115,.447,0,bank);
    cyl(V(-.45,.43,sign*.145),V(.45,.43,sign*.145),.022,orange,bank);
    for(let i=0;i<4;i++){
      const x=-.315+i*.21;
      mesh(new THREE.CylinderGeometry(.087,.087,.31,24,1,true),boreMat,x,.23,0,bank);
      const piston=mesh(new THREE.CylinderGeometry(.077,.077,.07,24),silver,x,.21,0,bank);pistons.push({mesh:piston,phase:i*Math.PI/2+(sign<0?Math.PI:0)});
      for(let ring=0;ring<2;ring++)mesh(new THREE.TorusGeometry(.078,.004,5,24),dark,0,ring*.015-.018,0,piston).rotation.x=Math.PI/2;
      const rod=box(.025,.18,.025,chrome,x,.09,0,bank);rods.push({mesh:rod,phase:i*Math.PI/2+(sign<0?Math.PI:0)});
      cyl(V(x,.44,sign*.145),V(x,.40,0),.011,orange,bank);
      mesh(new THREE.CylinderGeometry(.025,.025,.07,12),dark,x,.48,0,bank);
      const spark=glow(0xffc361);sparkMaterials.push({m:spark,phase:i*Math.PI/2+(sign<0?Math.PI:0)});mesh(new THREE.SphereGeometry(.027,12,8),spark,x,.33,0,bank);
      mesh(new THREE.CylinderGeometry(.08,.08,.035,16),silver,x,0,0,crank).rotation.z=Math.PI/2;
      line([V(x,.25,-sign*.10),V(x,.1,-sign*.35),V(.5,.03,-sign*.36)],silver,bank,.018);
    }
    const b=textPlate('H₂  V8',.55,.085,0,.45,0,bank,'#f4e8db','#a52e1c');b.rotation.x=-Math.PI/2;
  });
  box(.76,.13,.16,dark,0,.22,0,engineGroup);
  for(let i=0;i<4;i++)[-1,1].forEach(sign=>cyl(V(-.3+i*.2,.24,0),V(-.3+i*.2,.31,sign*.20),.028,silver,engineGroup));
  cyl(V(.44,.04,0),V(.52,.04,0),.13,dark,engineGroup);cyl(V(-.44,0,0),V(-.51,0,0),.17,silver,engineGroup);
  // Connect the relocated V8 to the integrated motor along the centre tunnel.
  cyl(V(.55,.64,0),V(1.34,.64,0),.11,silver);
  // Radiator and intake filter ahead of the engine.
  box(.08,.44,.72,dark,2.55,.65,0);for(let j=0;j<14;j++)box(.01,.40,.012,silver,2.597,.65,-.32+j*.049);
  cyl(V(1.85,.86,.38),V(2.32,.86,.38),.07,dark);
  // Exhaust routes are physical gas paths, not fuel-cell water circuits.
  [1,-1].forEach(sign=>line([V(1.85,.59,sign*.33),V(.6,.37,sign*.46),V(-1.1,.37,sign*.65),V(-2.35,.45,sign*.7)],silver,drive,.024));
  // High-voltage cable and animated energy paths.
  line([V(-.66,.73,.59),V(.32,.73,.59),V(.32,.67,.17)],orange,drive,.018);
  const routes=[];
  function route(points,kind,color){const curve=new THREE.CatmullRomCurve3(points);const dots=[];for(let j=0;j<12;j++)dots.push(mesh(new THREE.SphereGeometry(.021,8,6),glow(color),0,0,0));routes.push({curve,dots,kind});}
  route([V(-1.8,.8,.8),V(-1.2,.58,.78),V(.6,.58,.78),V(1.85,.88,.35)],'fuel',0xfb923c);
  route([V(-.66,.76,.59),V(.32,.76,.59),V(.32,.7,0)],'electric',0x65d9e9);
  [-1.46,1.46].forEach(x=>[1,-1].forEach(sign=>route([V(.32,.51,0),V(x,.46,0),V(x,.46,sign*.93)],'wheels',0x65d9e9)));
  // The original procedural body is replaced by the supplied GT-R mesh.
  // The GLB contains the intact bonnet panel; this pivot hinges its rear edge.
  hoodPivot=new THREE.Group();vehicleRoot.add(hoodPivot);
  // Ground remains stationary; wheels move only when the simulated vehicle moves.
  const ground=mesh(new THREE.CircleGeometry(5.2,96),new THREE.MeshBasicMaterial({color:0x17110c}),0,.005,0,scene);ground.rotation.x=-Math.PI/2;
  const grid=new THREE.GridHelper(12,40,0x77512e,0x38291d);grid.position.y=.01;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const cx=shadowCanvas.getContext('2d'),gr=cx.createRadialGradient(64,64,5,64,64,64);gr.addColorStop(0,'rgba(0,0,0,.8)');gr.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=gr;cx.fillRect(0,0,128,128);const shadow=mesh(new THREE.PlaneGeometry(6.4,3.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),0,.025,0,scene);shadow.rotation.x=-Math.PI/2;
  const labels=[['HYDROGEN TANK',V(-1.8,1.10,0)],['12 kWh BATTERY*',V(-.65,.8,.65)],['H₂ V8 · 90°',V(1.85,1.22,0)],['MOTOR / GENERATOR',V(.28,.80,-.47)],['AWD TRANSFER',V(.1,.42,.72)]] .map(([name,p])=>{const el=document.createElement('span');el.className='tag';el.textContent=name;document.getElementById('labels').append(el);return{el,p};});
  let view='cutaway',showLabels=true,auto=false,theta=.85,phi=1.12,distance=8.5,target=V(0,.85,0),phase=0,time=0;
  const pointer=new Map();let pinch=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  canvas.addEventListener('pointerdown',e=>{pointer.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{const old=pointer.get(e.pointerId);if(!old)return;pointer.set(e.pointerId,[e.clientX,e.clientY]);if(pointer.size===1){theta-=(e.clientX-old[0])*.006;phi=clamp(phi-(e.clientY-old[1])*.006,.2,1.52);}else{const p=[...pointer.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(pinch&&d)distance=clamp(distance*pinch/d,2.2,14);pinch=d;}});
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>canvas.addEventListener(name,e=>{pointer.delete(e.pointerId);pinch=0;}));
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),2.2,14);},{passive:false});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')theta-=.12;if(e.key==='ArrowRight')theta+=.12;if(e.key==='ArrowUp')phi-=.08;if(e.key==='ArrowDown')phi+=.08;if(e.key==='+'||e.key==='=')distance-=.4;if(e.key==='-')distance+=.4;phi=clamp(phi,.2,1.52);distance=clamp(distance,2.2,14);}});
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(stage);resize();
  function setView(v){view=v;body.visible=false;const showCar=v!=='powertrain';vehicleRoot.visible=showCar&&vehicleReady;drive.visible=v!=='exterior'||hoodOpen;const ghost=v==='cutaway';const alpha=.30;vehicleMaterials.forEach(m=>{m.transparent=ghost||m.userData.baseTransparent;m.opacity=ghost?alpha:m.userData.baseOpacity;m.depthWrite=ghost?false:!m.userData.baseTransparent;});hoodPivot.visible=vehicleReady;if(hoodMaterial){hoodMaterial.transparent=ghost&&!hoodOpen;hoodMaterial.opacity=ghost&&!hoodOpen?alpha:1;hoodMaterial.depthWrite=!ghost||hoodOpen;}}
  setView(view);
  window.VehicleScene={
    view:setView,labels(v){showLabels=v;},rotate(v){auto=v;},
    hood(){hoodOpen=!hoodOpen;setView(view);return hoodOpen;},
    camera(v){if(v==='engine'){target.copy(drive.localToWorld(V(1.85,.85,0)));distance=2.8;theta=.9;phi=.72;}else{target.set(0,.85,0);distance=8.5;theta=.85;phi=1.12;}},
    palette(color){orange.color.set(color);red.color.set(color);vehiclePaint.set(color);paintMaterials.forEach(m=>m.color.set(vehiclePaint));if(hoodMaterial)hoodMaterial.color.set(color);},
    update(s,dt){
      time+=dt;if(auto&&!pointer.size)theta+=dt*.12;hoodProgress=THREE.MathUtils.lerp(hoodProgress,hoodOpen?1:0,Math.min(1,dt*4));hoodPivot.rotation.x=-hoodProgress*1.18;
      const fit=camera.aspect<1?1/camera.aspect*1.12:1;
      camera.position.set(target.x+Math.sin(theta)*Math.sin(phi)*distance*fit,target.y+Math.cos(phi)*distance*fit,target.z+Math.cos(theta)*Math.sin(phi)*distance*fit);camera.lookAt(target);
      phase+=s.rpm>200?dt*Math.min(12,s.rpm/180):0;
      pistons.forEach(p=>p.mesh.position.y=.22+Math.cos(phase+p.phase)*.045);
      rods.forEach(r=>{r.mesh.position.y=.10+Math.cos(phase+r.phase)*.025;r.mesh.rotation.z=Math.sin(phase+r.phase)*.12;});crank.rotation.x=phase;
      sparkMaterials.forEach(a=>a.m.emissiveIntensity=s.engine?Math.pow(Math.max(0,Math.cos(phase+a.phase)),12)*4:0);
      wheels.forEach(w=>w.rotation.z-=s.speed*dt/.425);modelWheels.forEach(w=>w.pivot.rotation.x+=s.speed*dt/w.radius);tailLight.emissiveIntensity=s.regenKW>0?3:1;
      routes.forEach(r=>{const active=s.on&&(r.kind==='fuel'?s.engine:r.kind==='electric'?Math.abs(s.batteryKW)>.1:s.driveKW>1||s.regenKW>.1);r.dots.forEach((d,j)=>{d.visible=active;let f=(time*.3+j/r.dots.length)%1;if(s.batteryKW<0&&r.kind==='electric'||s.regenKW>0&&r.kind==='wheels')f=1-f;d.position.copy(r.curve.getPoint(f));});});
      const width=stage.clientWidth,height=stage.clientHeight;
      const occupied=[];
      labels.forEach(l=>{const p=drive.localToWorld(l.p.clone()).project(camera);l.el.hidden=!showLabels||view==='exterior'||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1;let x=clamp((p.x*.5+.5)*width,75,width-80),y=clamp((-p.y*.5+.5)*height,58,height-25);for(let attempt=0;attempt<6&&occupied.some(q=>Math.abs(q.x-x)<135&&Math.abs(q.y-y)<24);attempt++)y+=25;l.el.hidden=l.el.hidden||y>height-20;if(!l.el.hidden)occupied.push({x,y});l.el.style.left=x+'px';l.el.style.top=y+'px';l.el.style.transform='translate(-50%,-50%)';});
      renderer.render(scene,camera);
    }
  };
})();












