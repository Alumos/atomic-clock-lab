(function(){
  'use strict';
  var M=window.ClockLabModel,S=window.ClockLabScene;
  function $(id){return document.getElementById(id);}
  function each(selector,fn){Array.prototype.forEach.call(document.querySelectorAll(selector),fn);}
  var canvas=$('map'),ctx=canvas.getContext('2d'),satellite=null;
  var state={clocks:[1000000,0,0,0],selected:0,mode:'single',direction:'ahead',zoom:false,sound:true,motion:!window.matchMedia('(prefers-reduced-motion: reduce)').matches};
  var width=1000,height=580,time=0,last=0,dirty=true,demoStart=null,calibration=null,audio=null,lastTone=0,lastAlarm=0;
  var PRESETS=[1,10,1000,1000000,100000000,1000000000];
  function clockParts(ns){
    ns=Math.abs(Number(ns)||0);
    if(ns<1000)return {value:String(Math.round(ns)),unit:'纳秒',short:Math.round(ns)+' ns'};
    if(ns<1000000)return {value:trim(ns/1000),unit:'微秒',short:trim(ns/1000)+' μs'};
    if(ns<1000000000)return {value:trim(ns/1000000),unit:'毫秒',short:trim(ns/1000000)+' ms'};
    return {value:'1',unit:'秒',short:'1 s'};
  }
  function trim(n){return n.toFixed(n<10?3:n<100?2:1).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');}
  function fmt(n){n=Math.abs(n);if(n<.01)return '0.00';if(n<100)return n.toFixed(2);if(n<1000000)return Math.round(n).toLocaleString('en-US');return Math.round(n).toLocaleString('en-US');}
  function soundTone(notes,duration){
    if(!state.sound)return;
    try{
      var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      if(!audio)audio=new AC();if(audio.state==='suspended')audio.resume();
      var now=audio.currentTime;
      notes.forEach(function(hz,i){var osc=audio.createOscillator(),gain=audio.createGain(),start=now+i*duration*.45;osc.type='sine';osc.frequency.value=hz;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.14,start+.01);gain.gain.exponentialRampToValueAtTime(.001,start+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+duration+.02);});
    }catch(ignore){}
  }
  function alarmBeep(level){
    if(!state.sound||!audio)return;
    var hz=390+Math.round(level*520),duration=Math.max(.055,.14-level*.07);
    soundTone([hz],duration);
  }
  function alarmLevel(ns){return ns<=0?0:Math.min(1,Math.log(ns+1)/Math.log(1000000001));}
  function demoLabel(){return '▶ 混乱演示：偏差扩大 → 校准';}
  function stopDemo(){demoStart=null;$('demo-button').textContent=demoLabel();$('demo-button').setAttribute('aria-pressed','false');}
  function manual(){stopDemo();calibration=null;}
  function signed(n){return (n>0?'+':'')+(Math.abs(n)<.005?'0':n.toFixed(1));}
  function observation(r){
    var title,description,p=fmt(r.positionError),parts;
    if(r.ns===0){title='校准完成，四颗卫星恢复同步';description='本实验设置的钟差已清除，模拟定位偏差归零。现实定位还有其他误差。';}
    else if(state.mode==='mixed'){title=r.ns>=100000000?'定位已经失控：四颗卫星互相“吵架”':'四颗卫星的钟差一起影响定位';description='当前定位点偏离 '+p+' 米。不同误差会叠加或部分抵消；选择任一卫星，单独改变它的钟差。';}
    else if(r.ns<=10){title='这么小的时间差，也能改变测距';description='本例定位偏差 '+p+' 米。打开“放大看微小偏差”，观察两个位置。';}
    else if(r.ns>=1000000){title='警告：时间差已经让定位失控';description='1 号卫星的时间差是 '+clockParts(r.ns).short+'，单颗测距误差约 '+fmt(r.rangeError)+' 米；导航点已远离真实位置。';}
    else{title='你没移动，导航却把你画在了别处';description='1 号卫星距离'+(r.clocks[0]>0?'算短':'算长')+'了约 '+fmt(r.rangeError)+' 米；四星解算后的定位点偏离 '+p+' 米。';}
    if($('observation-title').textContent!==title)$('observation-title').textContent=title;
    if($('observation-text').textContent!==description)$('observation-text').textContent=description;
  }
  function render(){
    var r=M.constellation(state.clocks),current=state.clocks[state.selected],ns=Math.abs(current),parts=clockParts(r.ns),level=alarmLevel(r.ns);
    if(current!==0)state.direction=current>0?'ahead':'behind';
    $('time-label').textContent=state.mode==='single'?'1 号卫星时间偏差':'最大卫星时间偏差';
    $('time-value').textContent=parts.value;$('time-unit').textContent=parts.unit;$('slider-value').textContent=clockParts(ns).value;$('slider-value').nextElementSibling.textContent=clockParts(ns).unit;
    $('clock-slider').value=ns;$('clock-slider').setAttribute('aria-valuetext',(state.selected+1)+' 号卫星，'+(state.direction==='ahead'?'快 ':'慢 ')+clockParts(ns).short);
    $('time-detail').textContent=(r.ns/1e9).toFixed(9)+' 秒';
    $('range-value').textContent=fmt(r.rangeError);$('position-value').textContent=fmt(r.positionError);
    $('range-detail').textContent=clockParts(r.ns).short+' × 光速 ≈ '+fmt(r.rangeError)+' 米';
    $('position-detail').textContent=r.ns>=1000000?'大钟差：线性外推教学示意':'本例固定卫星分布下的模拟结果';
    $('slider-target').textContent=(state.selected+1)+' 号卫星钟差';$('clock-status').textContent=ns===0?'与参考时间同步':'比参考时间'+(state.direction==='ahead'?'快 ':'慢 ')+clockParts(ns).short;
    var panel=document.querySelector('.map-panel');panel.classList.toggle('calibrated',r.ns===0);panel.classList.toggle('common-bias',false);
    $('map-title').lastChild.textContent=r.ns===0?'原子钟同步，模拟偏差归零':level>.78?'警告：定位结果正在失控':'人没有动，导航点却偏了';
    document.body.setAttribute('data-alarm-level',String(Math.min(4,Math.ceil(level*4))));
    each('[data-ns]',function(b){var on=Number(b.dataset.ns)===ns;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    each('[data-mode]',function(b){var on=b.dataset.mode===state.mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    each('[data-direction]',function(b){var on=b.dataset.direction===state.direction;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    each('[data-satellite]',function(b){var i=Number(b.dataset.satellite),v=state.clocks[i],on=i===state.selected;b.disabled=state.mode!=='mixed';b.classList.toggle('active',on);b.classList.toggle('synced',v===0);b.setAttribute('aria-pressed',String(on));$('sat-value-'+i).textContent=v===0?'同步':(v>0?'快 ':'慢 ')+clockParts(v).short;b.setAttribute('aria-label',(i+1)+' 号卫星，'+$('sat-value-'+i).textContent+(state.mode==='mixed'?'，点击调节':''));});
    $('mode-note').textContent=state.mode==='single'?'只改变 1 号卫星，其他三颗保持同步。':'点击任一卫星，分别调节四颗的快慢与钟差，观察定位混乱。';
    $('experiment-tip').textContent=level>.78?'警报等级高：定位点会抖动，四星信息已经难以互相吻合。':'跨度从十亿分之一秒一直到整整 1 秒，感受定位如何失控。';
    observation(r);dirty=true;
  }
  function setNs(value,user){
    var ns=Math.round(Math.max(0,Math.min(1000000000,Number(value)||0))),v=state.direction==='behind'?-ns:ns;
    if(user){manual();if(Date.now()-lastTone>150){soundTone(ns===0?[523,784]:[440],.18);lastTone=Date.now();}}
    state.clocks[state.selected]=v;render();
  }
  $('clock-slider').addEventListener('input',function(){setNs(this.value,true);});$('clock-slider').addEventListener('change',function(){setNs(this.value,true);});
  each('[data-ns]',function(b){b.addEventListener('click',function(){setNs(b.dataset.ns,true);});});
  each('[data-direction]',function(b){b.addEventListener('click',function(){manual();state.direction=b.dataset.direction;setNs(Math.abs(state.clocks[state.selected]),false);soundTone([440],.12);});});
  each('[data-mode]',function(b){b.addEventListener('click',function(){manual();state.mode=b.dataset.mode;state.selected=0;state.direction='ahead';state.clocks=state.mode==='single'?[1000000,0,0,0]:[1000000,-700000,400000,-900000];stopDemo();render();soundTone([440],.12);});});
  each('[data-satellite]',function(b){b.addEventListener('click',function(){if(state.mode!=='mixed')return;manual();state.selected=Number(b.dataset.satellite);render();soundTone([440],.12);});});
  $('calibrate-button').addEventListener('click',function(){manual();if(state.motion&&M.constellation(state.clocks).ns>0)calibration={from:state.clocks.slice(),start:performance.now()};else{state.clocks=[0,0,0,0];render();soundTone([523,784],.18);}});
  $('zoom-button').addEventListener('click',function(){state.zoom=!state.zoom;this.setAttribute('aria-pressed',String(state.zoom));this.textContent=state.zoom?'收起局部放大':'放大看微小偏差';dirty=true;});
  $('motion-button').addEventListener('click',function(){state.motion=!state.motion;this.setAttribute('aria-pressed',String(state.motion));this.textContent=state.motion?'动画开':'动画关';if(!state.motion){stopDemo();if(calibration){calibration=null;state.clocks=[0,0,0,0];render();}}dirty=true;});
  $('motion-button').textContent=state.motion?'动画开':'动画关';$('motion-button').setAttribute('aria-pressed',String(state.motion));
  $('sound-button').addEventListener('click',function(){state.sound=!state.sound;this.textContent=state.sound?'音效开':'音效关';this.setAttribute('aria-pressed',String(state.sound));if(state.sound)soundTone([523,784],.18);});
  $('demo-button').addEventListener('click',function(){if(demoStart!==null){stopDemo();return;}calibration=null;state.clocks=[0,0,0,0];render();demoStart=performance.now();this.textContent='Ⅱ 停止混乱演示';this.setAttribute('aria-pressed','true');soundTone([330,440],.14);});
  $('answer-button').addEventListener('click',function(){var open=$('answer').hidden;$('answer').hidden=!open;this.setAttribute('aria-expanded',String(open));this.textContent=open?'收起解释 −':'查看解释 ＋';});
  function closeHelp(){$('help-modal').hidden=true;$('help-button').focus();}$('help-button').addEventListener('click',function(){$('help-modal').hidden=false;$('close-help').focus();});$('close-help').addEventListener('click',closeHelp);$('help-modal').addEventListener('click',function(e){if(e.target===this)closeHelp();});
  $('help-modal').addEventListener('keydown',function(e){if(e.key==='Escape'){closeHelp();return;}if(e.key==='Tab'){var nodes=this.querySelectorAll('button,a[href]'),first=nodes[0],end=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}}});
  $('fullscreen-button').addEventListener('click',function(){try{var element=document.documentElement,exit=document.exitFullscreen||document.webkitExitFullscreen,enter=element.requestFullscreen||element.webkitRequestFullscreen;var result=document.fullscreenElement||document.webkitFullscreenElement?exit.call(document):enter.call(element);if(result&&result.catch)result.catch(function(){});}catch(ignore){this.textContent='请使用浏览器全屏';}});document.addEventListener('fullscreenchange',function(){$('fullscreen-button').textContent=document.fullscreenElement?'退出全屏':'全屏';});
  function resize(){var rect=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);width=rect.width;height=rect.height;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);dirty=true;}if(window.ResizeObserver)new window.ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize);resize();
  var image=new Image();image.onload=function(){satellite=image;dirty=true;};image.src='assets/satellite.svg';
  function interpolate(a,b,u){if(a===0)return b*u;return Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*u);}
  function demoMagnitude(t){
    if(t<1)return t;
    if(t<2)return interpolate(1,10,t-1);
    if(t<3)return interpolate(10,1000,t-2);
    if(t<4)return interpolate(1000,1000000,t-3);
    if(t<5)return interpolate(1000000,100000000,t-4);
    if(t<6)return interpolate(100000000,1000000000,t-5);
    if(t<7.2)return 1000000000;
    if(t<8.8)return 1000000000*(.65+.35*Math.sin((t-7.2)*Math.PI*2));
    if(t<11)return 1000000000*(1-(t-8.8)/2.2);
    return 0;
  }
  function frame(now){
    var dt=last?Math.min((now-last)/1000,.1):0;last=now;
    if(!document.hidden){
      if(!window.ResizeObserver){var rect=canvas.getBoundingClientRect();if(rect.width!==width||rect.height!==height)resize();}
      if(state.motion)time+=dt;
      if(demoStart!==null){var t=(now-demoStart)/1000,n=demoMagnitude(t),pattern=state.mode==='single'?[Math.cos(t*2.7),0,0,0]:[Math.cos(t*2.7),-Math.cos(t*3.3),Math.sin(t*2.1),-Math.cos(t*1.9)];state.clocks=pattern.map(function(v){return Math.max(-1000000000,Math.min(1000000000,Math.round(v*n)));});render();if(t>=11){stopDemo();state.clocks=[0,0,0,0];render();soundTone([523,784],.18);}}
      if(calibration){var u=Math.min(1,(now-calibration.start)/900);state.clocks=calibration.from.map(function(v){return Math.round(v*(1-u)*(1-u));});render();if(u>=1){calibration=null;soundTone([523,784],.18);}}
      var current=M.constellation(state.clocks),level=alarmLevel(current.ns);if(state.sound&&audio&&level>.08&&now-lastAlarm>Math.max(120,1050-level*930)){alarmBeep(level);lastAlarm=now;}
      if(dirty||state.motion){S.draw(ctx,{width:width,height:height,result:current,zoom:state.zoom,motion:state.motion,time:time,satellite:satellite,alarm:level});dirty=false;}
    }
    window.requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',function(){if(document.hidden){stopDemo();if(calibration){calibration=null;state.clocks=[0,0,0,0];render();}}});
  render();window.requestAnimationFrame(frame);
})();
