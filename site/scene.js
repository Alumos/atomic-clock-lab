(function(root){
  'use strict';
  var FONT='"PingFang SC","Microsoft YaHei",Arial,sans-serif';
  function line(c,x,y,x2,y2,color,w){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=w||1;c.stroke();}
  function round(c,x,y,w,h,r,fill,stroke){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function text(c,s,x,y,size,color,align,weight){c.font=(weight||400)+' '+size+'px '+FONT;c.fillStyle=color||'#526c80';c.textAlign=align||'left';c.textBaseline='middle';c.fillText(s,x,y);}
  function tag(c,s,x,y,color){c.font='600 12px '+FONT;var w=c.measureText(s).width+14;var max=c.canvas.clientWidth||c.canvas.width;x=Math.max(w/2+4,Math.min(max-w/2-4,x));round(c,x-w/2,y-11,w,22,5,'rgba(255,255,255,.96)','#cfdee8');text(c,s,x,y,12,color,'center',600);}
  function pin(c,x,y,color,filled){c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fillStyle=filled?color:'#fff';c.fill();c.strokeStyle=color;c.lineWidth=2;c.stroke();c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fillStyle=filled?'#fff':color;c.fill();}
  function arrow(c,x,y,x2,y2,color){line(c,x,y,x2,y2,color,2);var a=Math.atan2(y2-y,x2-x);c.save();c.translate(x2,y2);c.rotate(a);c.beginPath();c.moveTo(0,0);c.lineTo(-7,-4);c.lineTo(-7,4);c.closePath();c.fillStyle=color;c.fill();c.restore();}
  function draw(c,o){
    var W=o.width,H=o.height,compact=H<240,top=compact?43:65,mapH=H-top,ox=W/2,oy=top+mapH/2;
    var ppm=Math.max(.025,Math.min((mapH-58)/900,(W-100)/850)),alarm=o.alarm||0,shake=o.motion&&alarm>.45?Math.min(9,alarm*8):0;
    function X(m){return ox+m*ppm;}function Y(m){return oy-m*ppm;}
    c.clearRect(0,0,W,H);c.fillStyle='#f2f7f8';c.fillRect(0,0,W,H);c.save();c.translate(shake*Math.sin(o.time*58),shake*.7*Math.cos(o.time*43));
    c.save();c.beginPath();c.rect(0,top,W,mapH);c.clip();
    var step=50*ppm;for(var x=ox%step;x<W;x+=step)line(c,x,top,x,H,'#dce8ee');for(var y=oy%step;y<H;y+=step)if(y>=top)line(c,0,y,W,y,'#dce8ee');
    c.fillStyle='#dce7ee';c.fillRect(0,Y(28),W,56*ppm);c.fillRect(X(-44),top,40*ppm,mapH);c.save();c.setLineDash([8,8]);line(c,0,oy,W,oy,'#fff',1.5);line(c,X(-24),top,X(-24),H,'#fff',1.5);c.restore();
    function building(mx,my,mw,mh,name){var bx=X(mx),by=Y(my),bw=mw*ppm,bh=mh*ppm;round(c,bx,by,bw,bh,5,'#d6e7f0','#adc9da');if(bh>32){c.fillStyle='#ebf4f9';c.fillRect(bx+5,by+5,bw-10,7);}text(c,name,bx+bw/2,by+bh/2+(bh>32?4:0),compact?10:13,'#55788d','center');}
    if(!compact){building(-470,350,275,150,'教学楼');building(-460,140,240,95,'图书馆');round(c,X(-450),Y(-130),230*ppm,160*ppm,14,'#d7eaf2','#b8d5e1');text(c,'校园湖',X(-335),Y(-210),12,'#60899c','center');}else building(-480,310,290,190,'教学楼');
    round(c,X(160),Y(320),300*ppm,220*ppm,35*ppm,'#eed6c4','#d5b99f');round(c,X(180),Y(300),260*ppm,180*ppm,30*ppm,'#d9e8cf','#fff');text(c,'操场',X(310),Y(210),compact?10:13,'#6f825b','center');
    round(c,X(170),Y(-130),310*ppm,170*ppm,12,'#e1edda','#c5d7bb');if(!compact){for(var j=0;j<5;j++){c.beginPath();c.arc(X(205+j*52),Y(-170-j%2*30),8,0,Math.PI*2);c.fillStyle='#bfd6b1';c.fill();}}text(c,'校园绿地',X(325),Y(-265),compact?10:12,'#6b825c','center');c.restore();
    c.fillStyle='#eaf4fb';c.fillRect(0,0,W,top);var starts=[W*.125,W*.375,W*.625,W*.875],satY=compact?14:23;
    for(var i=0;i<4;i++){var sx=starts[i],n=o.result.clocks[i],color=n===0?'#39809f':'#b4681d';c.save();c.globalAlpha=.18;line(c,sx,top,ox,oy,color,1);c.restore();if(o.motion){for(var k=0;k<2;k++){var phase=(o.time*.25+i*.17+k*.5)%1;c.beginPath();c.arc(sx+(ox-sx)*phase,top+(oy-top)*phase,2.6,0,Math.PI*2);c.fillStyle=color;c.fill();}}if(o.satellite)c.drawImage(o.satellite,sx-(compact?18:27),satY-(compact?12:19),compact?36:54,compact?25:38);else round(c,sx-12,satY-8,24,16,3,'#b99a56');text(c,(i+1)+'号 '+(n===0?'同步':(n>0?'快':'慢')+shortClock(n)),sx,top-9,compact?10:13,color,'center',600);}
    var error=o.result.positionError,maxM=Math.max(1,(Math.min(W-54,mapH-38)/2)/ppm),displayScale=error>maxM?maxM/error:1,ex=X(o.result.east*displayScale),ey=Y(o.result.north*displayScale),shownError=error*displayScale;
    c.beginPath();c.arc(ox,oy,12,0,Math.PI*2);c.strokeStyle='rgba(22,133,104,.22)';c.lineWidth=6;c.stroke();if(error>0){c.save();c.setLineDash([5,4]);arrow(c,ox,oy,ex,ey,'#b4681d');c.restore();}pin(c,ox,oy,'#168568',true);if(shownError*ppm>9)pin(c,ex,ey,'#b4681d',false);else if(error>0){c.beginPath();c.arc(ex,ey,9,0,Math.PI*2);c.strokeStyle='#b4681d';c.lineWidth=2;c.stroke();}
    tag(c,'真实位置',ox,oy+23,'#147b5c');tag(c,error===0?(o.result.ns===0?'校准后重合':'位置偏差 0 米'):(displayScale<1?'导航估计位置（超出范围）':'导航估计位置'),ex,Math.max(top+12,ey-22),error===0?'#147b5c':'#aa5d17');if(shownError*ppm>48)tag(c,displayScale<1?'偏差 '+formatDistance(error)+'（已压缩显示）':'偏差 '+formatDistance(error),(ox+ex)/2+48,(oy+ey)/2+12,'#a05c1c');
    text(c,'N',W-16,top+14,11,'#527489','center',600);arrow(c,W-16,top+39,W-16,top+23,'#527489');var sy=H-9;line(c,14,sy,14+50*ppm,sy,'#506d83',2);line(c,14,sy-3,14,sy+3,'#506d83',2);line(c,14+50*ppm,sy-3,14+50*ppm,sy+3,'#506d83',2);text(c,'50 米',14,sy-12,10,'#506d83');
    if(o.zoom){var iw=Math.min(238,W-16),ih=Math.min(154,H-12),ix=8,iy=6;round(c,ix,iy,iw,ih,9,'rgba(255,255,255,.98)','#92bed2');text(c,'局部放大 · 两点的距离',ix+12,iy+18,12,'#245a78','left',600);var mult=Math.min(65,(ih-52)/2)/Math.max(error,.3),px=ix+iw/2,py=iy+ih/2+5,zx=px+o.result.east*mult,zy=py-o.result.north*mult;line(c,ix+12,py,ix+iw-12,py,'#e0eaf0');arrow(c,px,py,zx,zy,'#b4681d');pin(c,px,py,'#168568',true);if(error>0)pin(c,zx,zy,'#b4681d',false);text(c,error===0?(o.result.ns===0?'已校准 · 偏差 0 米':'位置偏差 0 米，钟差仍存在'):'两点相距 '+formatDistance(error),ix+iw/2,iy+ih-16,12,error===0?'#147b5c':'#aa5d17','center',600);}
    c.restore();
  }
  function shortClock(ns){var n=Math.abs(ns);if(n<1000)return Math.round(n)+'ns';if(n<1e6)return trim(n/1000)+'μs';if(n<1e9)return trim(n/1e6)+'ms';return '1s';}
  function trim(n){return n.toFixed(n<10?2:1).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');}
  function formatDistance(m){if(m<1000)return m.toFixed(1)+' 米';if(m<1e6)return (m/1000).toFixed(1)+' 千米';return (m/1e6).toFixed(1)+' 百万米';}
  root.ClockLabScene={draw:draw};
})(window);
