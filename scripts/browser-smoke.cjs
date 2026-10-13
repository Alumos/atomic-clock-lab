const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const baseURL=process.env.CLOCK_TEST_URL||'http://127.0.0.1:18085/';
(async()=>{
 fs.mkdirSync('artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CLOCK_CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 const errors=[];
 try{
  for(const legacy of [false,true]){
   const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
   if(!legacy)await context.addInitScript(()=>{window.clockTestTones=[];const create=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){const osc=create.call(this),start=osc.start;osc.start=function(){window.clockTestTones.push(osc.frequency.value);return start.apply(this,arguments);};return osc;};});
   if(legacy)await context.addInitScript(()=>{window.ResizeObserver=undefined;window.PointerEvent=undefined;CanvasRenderingContext2D.prototype.roundRect=undefined;window.AudioContext=undefined;window.webkitAudioContext=undefined;});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
   await page.goto(baseURL);assert.equal(await page.title(),'任务二：原子钟揭秘');assert.equal(await page.locator('#sound-button').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-mode], [data-satellite]').count(),0);assert.equal(await page.locator('[data-ns]').count(),6);
   assert.equal(await page.locator('#time-value').textContent(),'0');assert.equal(await page.locator('body').getAttribute('data-alarm-level'),'0');
   if(!legacy)await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
   await page.locator('[data-ns="1"]').click();assert.equal(await page.locator('#time-value').textContent(),'1');assert(Number(await page.locator('#position-value').textContent())>0);
   if(!legacy){assert((await page.evaluate(()=>window.clockTestTones)).includes(440));await page.locator('#sound-button').click();const count=await page.evaluate(()=>window.clockTestTones.length);await page.locator('[data-ns="1000000"]').click();assert.equal(await page.evaluate(()=>window.clockTestTones.length),count);await page.locator('#sound-button').click();}
   await page.locator('[data-ns="1000"]').click();assert(Number((await page.locator('#position-value').textContent()).replace(/,/g,''))>100);
   await page.locator('[data-ns="1000000"]').click();assert(Number((await page.locator('#position-value').textContent()).replace(/,/g,''))>100000);
   await page.locator('[data-ns="1000000000"]').click();assert.equal(await page.locator('#time-unit').textContent(),'秒');assert.equal(await page.locator('body').getAttribute('data-alarm-level'),'4');assert((await page.locator('#observation-title').textContent()).includes('失控'));
   if(!legacy)await page.screenshot({path:'artifacts/one-second-alarm.png',fullPage:true});
   if(!legacy){
    await page.locator('[data-ns="1"]').click();await page.waitForTimeout(250);let start=await page.evaluate(()=>window.clockTestTones.length);await page.waitForTimeout(1200);const slow=(await page.evaluate(()=>window.clockTestTones.length))-start;
    await page.locator('[data-ns="1000000000"]').click();await page.waitForTimeout(250);start=await page.evaluate(()=>window.clockTestTones.length);await page.waitForTimeout(1200);const fast=(await page.evaluate(()=>window.clockTestTones.length))-start;assert(fast>slow+3,'large clock error speeds up alarm');
    await page.locator('#sound-button').click();start=await page.evaluate(()=>window.clockTestTones.length);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.clockTestTones.length),start,'mute stops alarm');await page.locator('#sound-button').click();
   }
   await page.locator('[data-direction="behind"]').click();await page.locator('[data-ns="100000000"]').click();assert((await page.locator('#clock-status').textContent()).includes('慢'));
   await page.locator('#calibrate-button').click();await page.waitForFunction(()=>document.getElementById('time-value').textContent==='0');assert.equal(await page.locator('#position-value').textContent(),'0.00');
   await page.locator('#demo-button').click();await page.waitForFunction(()=>document.body.getAttribute('data-alarm-level')==='4',{timeout:7000});assert.equal(await page.locator('#demo-button').getAttribute('aria-pressed'),'true');
   await page.waitForFunction(()=>document.getElementById('demo-button').getAttribute('aria-pressed')==='false',{timeout:15000});assert.equal(await page.locator('#time-value').textContent(),'0');
   await page.locator('#demo-button').click();await page.locator('[data-ns="10"]').click();assert.equal(await page.locator('#demo-button').getAttribute('aria-pressed'),'false');
   for(const [width,height] of [[1366,768],[1280,720],[1024,768],[1920,1080]]){await page.setViewportSize({width,height});await page.evaluate(()=>window.scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false,'no vertical scrolling at '+width+'x'+height);for(const selector of ['#calibrate-button','#demo-button','[data-ns="1"]','#clock-slider']){const box=await page.locator(selector).boundingBox();assert(box.y>=0&&box.y+box.height<=height,'control visible '+selector);}}
   await context.close();console.log('PASS',legacy?'legacy API fallback':'six scales, alarm, single satellite, demo and one-screen layout');
  }
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(baseURL);assert.equal(await page.locator('#motion-button').textContent(),'动画关');await page.locator('[data-ns="1000000000"]').tap();assert.equal(await page.locator('#time-unit').textContent(),'秒');await page.locator('#calibrate-button').tap();assert.equal(await page.locator('#time-value').textContent(),'0');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false,'mobile page fits one screen');await page.screenshot({path:'artifacts/mobile.png',fullPage:true});await context.close();assert.deepEqual(errors,[]);console.log('PASS mobile, reduced motion, no errors or missing resources');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
