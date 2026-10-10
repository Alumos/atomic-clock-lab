const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../site/model.js');
function near(a,b,tolerance=1e-8){assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);}
test('clock bias converts to range error using vacuum light speed',()=>{
  near(M.response(1).rangeError,.299792458);
  near(M.response(1000).rangeError,299.792458);
  near(M.response(0).positionError,0);
});
test('solver recovers known planar position and receiver clock bias',()=>{
  const east=12,north=-8,bias=20;
  const ranges=M.ANGLES.map(a=>-Math.cos(a)*east-Math.sin(a)*north+bias);
  const result=M.estimate(ranges);
  near(result.east,east);near(result.north,north);near(result.receiverBias,bias);
});
test('common receiver clock bias does not become a position error',()=>{
  near(M.estimate([25,25,25,25]).positionError,0);
  near(M.estimate([25,25,25,25]).receiverBias,25);
});
test('reversing satellite clock bias reverses position offset',()=>{
  const ahead=M.response(100,'ahead'),behind=M.response(100,'behind');
  near(ahead.east,-behind.east);near(ahead.north,-behind.north);
  near(ahead.positionError,behind.positionError);
  assert(ahead.signedRangeError<0);assert(behind.signedRangeError>0);
});
test('fixed geometry preserves scaling but range and position errors differ',()=>{
  const a=M.response(10),b=M.response(100);
  near(b.positionError,a.positionError*10);
  assert(Math.abs(a.rangeError-a.positionError)>1);
});
test('invalid and out-of-range controls are bounded',()=>{
  near(M.response(NaN).positionError,0);near(M.response(-1).positionError,0);
  assert.equal(M.response(10000).ns,10000);
  assert.equal(M.response(2e9).ns,1e9);
  assert.throws(()=>M.estimate([1,2,NaN,4]),TypeError);
});
test('four equal satellite offsets bias time without moving position',()=>{
  for(const ns of [-1000,-100,100,1000]){
    const r=M.constellation([ns,ns,ns,ns]);
    near(r.positionError,0);near(r.receiverClockNs,-ns);
    near(r.rangeError,Math.abs(ns)*M.METERS_PER_NS);assert.equal(r.common,true);
  }
});
test('independent satellite offsets combine linearly and can partially cancel',()=>{
  const clocks=[100,-70,40,-90],r=M.constellation(clocks);
  const parts=clocks.map((v,i)=>M.constellation(clocks.map((_,j)=>i===j?v:0)));
  near(r.east,parts.reduce((sum,p)=>sum+p.east,0));
  near(r.north,parts.reduce((sum,p)=>sum+p.north,0));
  assert(r.positionError<parts.reduce((sum,p)=>sum+p.positionError,0));
  const offset=M.constellation(clocks.map(n=>n+200));
  near(offset.east,r.east);near(offset.north,r.north);near(offset.receiverClockNs,r.receiverClockNs-200);
});
test('all single-satellite selections agree with the pseudorange solver',()=>{
  for(let i=0;i<4;i++){
    const clocks=[0,0,0,0];clocks[i]=-350;
    const r=M.constellation(clocks),expected=M.estimate(clocks.map(n=>-n*M.METERS_PER_NS));
    near(r.east,expected.east);near(r.north,expected.north);
    assert(r.positionError>0);assert.equal(r.ns,350);
  }
});
test('six classroom time scales preserve range conversion through one second',()=>{
  for(const ns of [1,10,1000,1e6,1e8,1e9]){
    const r=M.constellation([ns,0,0,0]);
    near(r.rangeError,ns*M.METERS_PER_NS,1e-6);
    assert.equal(r.ns,ns);assert(Number.isFinite(r.positionError));
  }
  near(M.constellation([1e9,0,0,0]).rangeError,299792458,1e-6);
  assert.equal(M.constellation([2e9,-2e9,0,0]).ns,1e9);
});
