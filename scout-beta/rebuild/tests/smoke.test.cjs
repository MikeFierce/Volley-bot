const assert=require('node:assert/strict');const E=require('../engine.js');const M=require('../match.js');
const rosters={a:[],b:[]};const lineups={a:{},b:{}};for(const side of ['a','b'])for(let i=1;i<=6;i++){const id=side+i;rosters[side].push({id,number:String(i),name:'Player '+id,role:'field'});lineups[side][String(i)]=id}
function check(name,fn){fn();console.log('PASS',name)}
check('initial match and set',()=>{const m=M.startSet(M.newMatch({rosters,bestOf:5}),{lineups,firstServer:'a'});const d=M.derive(m);assert.equal(d.sets.length,1);assert.equal(d.sets[0].score.a,0)});
check('rally scoring and undo',()=>{const start=E.newMatch({lineups,rosters,firstServer:'a'});const one=E.appendRally(start,{id:'r1',winner:'a'});assert.equal(E.derive(one).score.a,1);const undone=E.removeRally(one,'r1');assert.equal(E.derive(undone).score.a,0);assert.equal(E.derive(start).score.a,0)});
check('edit rally winner recalculates score',()=>{let m=E.newMatch({lineups,rosters,firstServer:'a'});m=E.appendRally(m,{id:'r1',winner:'a'});m=E.editRally(m,'r1',{winner:'b'});assert.equal(E.derive(m).score.b,1);assert.equal(E.derive(m).score.a,0)});
check('duplicate rally id rejected',()=>{let m=E.newMatch({lineups,rosters,firstServer:'a'});m=E.appendRally(m,{id:'r1',winner:'a'});assert.throws(()=>E.appendRally(m,{id:'r1',winner:'b'}))});
check('duplicate player lineup rejected',()=>{const bad=structuredClone(lineups);bad.a['2']=bad.a['1'];assert.throws(()=>E.newMatch({lineups:bad,rosters}))});
check('JSON restore keeps match score',()=>{let m=M.startSet(M.newMatch({rosters,bestOf:5}),{lineups,firstServer:'a'});m=M.appendRally(m,{id:'r1',winner:'a'});const restored=JSON.parse(JSON.stringify(m));assert.equal(M.derive(restored).sets[0].score.a,1)});
